import { regionBounds, type Bounds, type Contorno, type Pt } from '../geom/region';
import { flattenCubic } from '../geom/flatten';
import { PT_TO_MM } from './matrix';
import type { Aviso, DesenhoBruto, ObjetoBruto } from './pdf-ops';

/**
 * Le o PostScript do Illustrator (o formato guardado dentro do .ai).
 *
 * Mais simples que o content stream do PDF: uma instrucao por linha, coordenadas
 * ABSOLUTAS em pontos e nenhuma matriz de transformacao -- por isso aqui nao ha
 * pilha de CTM como em `pdf-ops.ts`.
 *
 * Operadores de caminho (a caixa alta so marca "ponto de canto" para a edicao no
 * Illustrator; a geometria e a mesma):
 *   x y m           abre subpath
 *   x y l | L       reta
 *   x1 y1 x2 y2 x3 y3 c | C     cubica completa
 *   x2 y2 x3 y3 v | V           cubica com o 1o controle = ponto atual
 *   x1 y1 x3 y3 y | Y           cubica com o 2o controle = ponto final
 * Pintura: f F (preenche) · s S (fecha e contorna) · b B (fecha, preenche e
 * contorna) · n N (descarta, usado para recorte) · h H (fecha o subpath)
 * Agrupamento: *u ... *U  junta subpaths num objeto so -- e assim que o miolo
 * do "O" e do "A" chega, como buraco e nao como peca separada.
 */

const PINTA_PREENCHE = new Set(['f', 'F', 'b', 'B']);
const PINTA_CONTORNA = new Set(['s', 'S', 'b', 'B']);
const FECHA = new Set(['s', 'S', 'b', 'B', 'h', 'H']);

interface Estado {
  pos: Pt;
  inicio: Pt;
  atual: Pt[] | null;
  /** Subpaths acumulados do objeto corrente. */
  contornos: Contorno[];
  /** Dentro de `*u ... *U`: tudo vira um objeto so. */
  composto: boolean;
  larguraTraco: number;
}

export interface OpcoesAiPs {
  /** Comprimento de cada linha de curva achatada. Default: a mesma do resto do app. */
  curvaTol?: number;
}

export function aiPostScriptParaDesenho(texto: string, _opts: OpcoesAiPs = {}): DesenhoBruto {
  const objetos: ObjetoBruto[] = [];
  const avisos: Aviso[] = [];
  const camadas = new Set<string>();
  const desconhecidos = new Set<string>();

  let temFill = false;
  let temStroke = false;
  let temTextoVivo = false;
  let temImagem = false;
  let camadaAtual: string | null = null;

  const e: Estado = {
    pos: { x: 0, y: 0 },
    inicio: { x: 0, y: 0 },
    atual: null,
    contornos: [],
    composto: false,
    larguraTraco: 1,
  };

  // Pontos -> mm ja na leitura, para o resto do pipeline receber mm como sempre.
  const P = (x: number, y: number): Pt => ({ x: x * PT_TO_MM, y: y * PT_TO_MM });

  const fecharSub = (fechado: boolean): void => {
    if (e.atual && e.atual.length >= 2) e.contornos.push({ pts: e.atual, closed: fechado });
    e.atual = null;
  };

  const garantir = (): Pt[] => {
    if (!e.atual) {
      e.atual = [e.pos];
      e.inicio = e.pos;
    }
    return e.atual;
  };

  const emitir = (preenche: boolean, contorna: boolean): void => {
    if (!e.contornos.length) return;
    const fechados = e.contornos.filter((c) => c.pts.length >= 3);
    const bounds = boundsDe(e.contornos);
    objetos.push({
      id: objetos.length,
      contours: e.contornos,
      paint: preenche ? 'fill' : 'stroke',
      // O AI usa preenchimento non-zero; num caminho composto os subpaths de
      // sentido contrario viram buraco, que e o comportamento desejado.
      fillRule: 'nonzero',
      larguraMm: Math.max(e.larguraTraco * PT_TO_MM, 0.2),
      capRound: false,
      clip: null,
      camada: camadaAtual,
      bounds,
    });
    if (preenche) temFill = true;
    if (contorna && !preenche) temStroke = true;
    void fechados;
    e.contornos = [];
  };

  const linhas = texto.split(/\r\n|\r|\n/);
  let pulandoDados = false;

  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (!linha) continue;

    // O thumbnail vem em hex dentro de %%BeginData/%%EndData e confundiria o
    // parser: os bytes parecem numeros soltos.
    if (pulandoDados) {
      if (linha.startsWith('%%EndData')) pulandoDados = false;
      continue;
    }
    if (linha.startsWith('%%BeginData')) {
      pulandoDados = true;
      continue;
    }

    if (linha.startsWith('%')) {
      if (linha.startsWith('%AI5_BeginLayer')) camadaAtual = null;
      else if (linha.startsWith('%AI5_EndLayer')) camadaAtual = null;
      else if (/^%_?(Tx|TX)/.test(linha) || linha.startsWith('%AI5_BeginText')) temTextoVivo = true;
      else if (linha.startsWith('%AI5_BeginRaster') || linha.startsWith('%AI5_BeginPalette')) temImagem = true;
      else {
        const nome = linha.match(/^%AI\d*_?BeginLayer.*\((.+?)\)/);
        if (nome?.[1]) {
          camadaAtual = nome[1];
          camadas.add(nome[1]);
        }
      }
      continue;
    }

    // `numeros... operador` -- o operador e sempre o ultimo campo.
    const campos = linha.split(/\s+/);
    const op = campos[campos.length - 1]!;
    const n: number[] = [];
    for (let i = 0; i < campos.length - 1; i++) {
      const v = parseFloat(campos[i]!);
      if (Number.isFinite(v)) n.push(v);
    }

    switch (op) {
      case 'm': {
        fecharSub(false);
        if (n.length >= 2) {
          e.pos = P(n[n.length - 2]!, n[n.length - 1]!);
          e.inicio = e.pos;
          e.atual = [e.pos];
        }
        break;
      }
      case 'l':
      case 'L': {
        if (n.length >= 2) {
          const p = P(n[n.length - 2]!, n[n.length - 1]!);
          garantir().push(p);
          e.pos = p;
        }
        break;
      }
      case 'c':
      case 'C': {
        if (n.length >= 6) {
          const [x1, y1, x2, y2, x3, y3] = n.slice(-6) as [number, number, number, number, number, number];
          const p = P(x3, y3);
          flattenCubic(e.pos, P(x1, y1), P(x2, y2), p, garantir());
          e.pos = p;
        }
        break;
      }
      case 'v':
      case 'V': {
        // primeiro controle = ponto atual
        if (n.length >= 4) {
          const [x2, y2, x3, y3] = n.slice(-4) as [number, number, number, number];
          const p = P(x3, y3);
          flattenCubic(e.pos, e.pos, P(x2, y2), p, garantir());
          e.pos = p;
        }
        break;
      }
      case 'y':
      case 'Y': {
        // segundo controle = ponto final
        if (n.length >= 4) {
          const [x1, y1, x3, y3] = n.slice(-4) as [number, number, number, number];
          const p = P(x3, y3);
          flattenCubic(e.pos, P(x1, y1), p, p, garantir());
          e.pos = p;
        }
        break;
      }
      case 'w': {
        if (n.length) e.larguraTraco = n[n.length - 1]!;
        break;
      }
      case '*u': {
        e.composto = true;
        break;
      }
      case '*U': {
        e.composto = false;
        break;
      }
      default: {
        if (PINTA_PREENCHE.has(op) || PINTA_CONTORNA.has(op) || op === 'n' || op === 'N' || FECHA.has(op)) {
          fecharSub(FECHA.has(op) || PINTA_PREENCHE.has(op));
          if (op === 'h' || op === 'H') break; // so fecha, nao pinta
          if (op === 'n' || op === 'N') {
            e.contornos = []; // caminho de recorte: descartado
            break;
          }
          // Dentro de *u...*U os subpaths se acumulam ate o *U, para virarem um
          // objeto so -- senao o miolo da letra sairia como peca separada.
          if (!e.composto) emitir(PINTA_PREENCHE.has(op), PINTA_CONTORNA.has(op));
          else if (PINTA_PREENCHE.has(op)) temFill = true;
        } else if (/^[a-zA-Z*]{1,3}$/.test(op)) {
          desconhecidos.add(op);
        }
        break;
      }
    }

    // Ao fechar o composto, emite tudo que se acumulou como um objeto unico.
    if (op === '*U' && e.contornos.length) emitir(temFill || true, false);
  }

  fecharSub(false);
  if (e.contornos.length) emitir(true, false);

  if (temTextoVivo) {
    avisos.push({
      codigo: 'texto-vivo',
      msg: 'O arquivo tem texto que nao foi convertido em contornos e nao pode ser importado. No Illustrator ou Corel, converta o texto em curvas antes de salvar.',
    });
  }
  if (desconhecidos.size) {
    // Informativo: a geometria nao depende de estado grafico (cor, traco, etc).
    void desconhecidos;
  }

  const b = regionBounds(objetos.flatMap((o) => o.contours.map((c) => ({ outer: c.pts, holes: [] }))));
  return {
    objetos,
    paginaMm: { w: b.w, h: b.h },
    camadas: [...camadas],
    avisos,
    temFill,
    temStroke,
    temTextoVivo,
    temImagem,
  };
}

function boundsDe(cs: Contorno[]): Bounds {
  return regionBounds(cs.map((c) => ({ outer: c.pts, holes: [] })));
}
