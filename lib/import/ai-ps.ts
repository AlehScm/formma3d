import { regionBounds, type Bounds, type Contorno, type FillRule, type Pt } from '../geom/region';
import { flattenCubic } from '../geom/flatten';
import { PT_TO_MM } from './matrix';
import type { Aviso, DesenhoBruto, ObjetoBruto } from './pdf-ops';

/**
 * Le o PostScript do Illustrator (o formato guardado dentro do .ai).
 *
 * Coordenadas ABSOLUTAS em pontos, sem matriz de transformacao -- por isso aqui
 * nao ha pilha de CTM como em `pdf-ops.ts`.
 *
 * Operadores de caminho (a caixa alta so marca "ponto de canto" para a edicao no
 * Illustrator; a geometria e a mesma):
 *   x y m           abre subpath
 *   x y l | L       reta
 *   x1 y1 x2 y2 x3 y3 c | C     cubica completa
 *   x2 y2 x3 y3 v | V           cubica com o 1o controle = ponto atual
 *   x1 y1 x3 y3 y | Y           cubica com o 2o controle = ponto final
 * Pintura: f F (preenche) - s S (fecha e contorna) - b B (fecha, preenche e
 * contorna) - n N (descarta, usado para recorte) - h H (fecha o subpath)
 * Agrupamento: *u ... *U junta subpaths num objeto so -- e assim que o miolo do
 * "O" e do "A" chega, como buraco e nao como peca separada.
 *
 * Cuidados que o formato exige, todos verificados em arquivo real:
 *  - Varios operadores podem vir na MESMA linha ("0 J 0 j 1 w 4 M []0 d"). O
 *    Illustrator empacota; o CorelDRAW escreve um por linha. Por isso a leitura e
 *    por token, nao por linha.
 *  - XR escolhe a regra de preenchimento (0 nonzero, 1 even-odd) e vale para as
 *    pinturas seguintes. Ignorar isso enche o miolo da letra em silencio.
 *  - %%BeginProlog e %%BeginSetup contem arte de verdade (azulejo de padrao,
 *    amostra de gradiente, fonte embutida). Colher caminhos ali importa azulejo
 *    como se fosse letra.
 *  - M e setmiterlimit, nao um moveto em caixa alta. Idem A (trava) e D (sentido
 *    do contorno): sao dicas de estado, nao geometria.
 */

const PINTA_PREENCHE = new Set(['f', 'F', 'b', 'B']);
const PINTA_CONTORNA = new Set(['s', 'S', 'b', 'B']);
const PINTA = new Set(['f', 'F', 's', 'S', 'b', 'B', 'n', 'N']);
/** Operadores de pintura que fecham o subpath antes de pintar. */
const FECHA_AO_PINTAR = new Set(['f', 's', 'b', 'n']);

/** Delimitadores de token do PostScript. */
const DELIM = new Set([' ', '\t', '\r', '\n', '\f', '\0', '%', '(', ')', '<', '>', '[', ']', '{', '}', '/']);

type Tok =
  | { t: 'n'; v: number }
  | { t: 'op'; v: string }
  | { t: 'str'; v: string }
  | { t: 'sec'; v: string };

/**
 * Quebra o PostScript em tokens.
 *
 * Trata string "( ... )" com parenteses balanceados: um % dentro de string NAO
 * abre comentario, e cortar de % ate o fim da linha destruiria o conteudo.
 */
function tokenizar(s: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const n = s.length;

  const restoDaLinha = (de: number): { txt: string; fim: number } => {
    let j = de;
    while (j < n && s[j] !== '\n' && s[j] !== '\r') j++;
    return { txt: s.slice(de, j), fim: j };
  };

  while (i < n) {
    const ch = s[i]!;

    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === '\f' || ch === '\0') {
      i++;
      continue;
    }

    // Comentarios e marcadores de secao.
    if (ch === '%') {
      const { txt, fim } = restoDaLinha(i);
      i = fim;

      // O thumbnail e a fonte embutida vem em hex/ASCII85 aqui dentro, e seus
      // bytes parecem numeros e operadores soltos para o parser.
      if (txt.startsWith('%%BeginData')) {
        while (i < n) {
          const l = restoDaLinha(i);
          const t = l.txt.trim();
          i = l.fim;
          if (t.startsWith('%%EndData') || t.startsWith('%_%%EndData')) break;
          if (i < n) i++;
        }
        continue;
      }
      const marca = txt.trim();
      if (/^%%(BeginProlog|EndProlog|BeginSetup|EndSetup)/.test(marca)) {
        toks.push({ t: 'sec', v: marca.slice(2).split(/[\s:]/)[0]! });
      } else if (/^%(AI\d+_(Begin|End)TextDocument|%IncludeFont)/.test(marca)) {
        toks.push({ t: 'sec', v: 'Texto' });
      } else if (/^%AI\d*_Begin(Raster|Palette)/.test(marca)) {
        toks.push({ t: 'sec', v: 'Imagem' });
      } else {
        const nome = marca.match(/^%AI\d*_BeginLayer.*\((.+?)\)/);
        if (nome?.[1]) toks.push({ t: 'sec', v: 'Camada:' + nome[1] });
      }
      continue;
    }

    if (ch === '(') {
      let prof = 1;
      let j = i + 1;
      let txt = '';
      while (j < n && prof > 0) {
        const c = s[j]!;
        if (c === '\\') {
          txt += s[j + 1] ?? '';
          j += 2;
          continue;
        }
        if (c === '(') prof++;
        else if (c === ')') {
          prof--;
          if (prof === 0) break;
        }
        txt += c;
        j++;
      }
      i = j + 1;
      toks.push({ t: 'str', v: txt });
      continue;
    }

    // Dicionarios << >>, strings hex <...>, arrays [ ] e procedimentos { } nao
    // carregam geometria: os delimitadores passam batido e o conteudo numerico
    // interno e descartado junto com a pilha no proximo operador.
    if (ch === '<' || ch === '>') {
      if (s[i + 1] === ch) {
        i += 2;
        continue;
      }
      if (ch === '<') {
        const f = s.indexOf('>', i);
        i = f < 0 ? n : f + 1;
        continue;
      }
      i++;
      continue;
    }
    if (ch === '[' || ch === ']' || ch === '{' || ch === '}') {
      i++;
      continue;
    }
    if (ch === '/') {
      let j = i + 1;
      while (j < n && !DELIM.has(s[j]!)) j++;
      i = j;
      continue;
    }

    let j = i;
    while (j < n && !DELIM.has(s[j]!)) j++;
    const bruto = s.slice(i, j);
    i = j === i ? i + 1 : j;
    if (!bruto) continue;

    // ".5", "-3", "1e3" sao numeros; o resto e operador.
    if (/^[-+.\d]/.test(bruto)) {
      const v = Number(bruto);
      if (Number.isFinite(v)) {
        toks.push({ t: 'n', v });
        continue;
      }
    }
    toks.push({ t: 'op', v: bruto });
  }

  return toks;
}

export interface OpcoesAiPs {
  /** Comprimento de cada linha de curva achatada. Default: a mesma do resto do app. */
  curvaTol?: number;
}

export function aiPostScriptParaDesenho(texto: string, _opts: OpcoesAiPs = {}): DesenhoBruto {
  const objetos: ObjetoBruto[] = [];
  const avisos: Aviso[] = [];
  const camadas = new Set<string>();

  let temFill = false;
  let temStroke = false;
  let temTextoVivo = false;
  let temImagem = false;
  let camadaAtual: string | null = null;

  /** Prolog e Setup guardam azulejo de padrao e fonte embutida, nao o desenho. */
  let emPreambulo = false;
  /** Guia ("(N) *"): nao imprime, nao e peca. */
  let emGuia = false;
  let composto = false;
  let regra: FillRule = 'nonzero';
  let larguraTraco = 1;

  let pos: Pt = { x: 0, y: 0 };
  let atual: Pt[] | null = null;
  let contornos: Contorno[] = [];
  /** Pintura vista dentro do *u ... *U corrente. */
  let compPreenche = false;
  let compContorna = false;

  const P = (x: number, y: number): Pt => ({ x: x * PT_TO_MM, y: y * PT_TO_MM });

  const fecharSub = (fechado: boolean): void => {
    if (atual && atual.length >= 2) contornos.push({ pts: atual, closed: fechado });
    atual = null;
  };

  const garantir = (): Pt[] => {
    if (!atual) atual = [pos];
    return atual;
  };

  const emitir = (preenche: boolean, contorna: boolean): void => {
    if (!contornos.length) return;
    if (emGuia || emPreambulo) {
      contornos = [];
      return;
    }
    objetos.push({
      id: objetos.length,
      contours: contornos,
      paint: preenche ? 'fill' : 'stroke',
      // XR manda: 1 = even-odd. O arquivo do CorelDRAW usa even-odd, e assumir
      // nonzero fecharia o miolo das letras em silencio.
      fillRule: regra,
      larguraMm: Math.max(larguraTraco * PT_TO_MM, 0.2),
      capRound: false,
      clip: null,
      camada: camadaAtual,
      bounds: boundsDe(contornos),
    });
    if (preenche) temFill = true;
    if (contorna && !preenche) temStroke = true;
    contornos = [];
  };

  const toks = tokenizar(texto);
  const pilha: number[] = [];
  let ultimaStr: string | null = null;

  for (const tk of toks) {
    if (tk.t === 'n') {
      pilha.push(tk.v);
      continue;
    }
    if (tk.t === 'str') {
      ultimaStr = tk.v;
      continue;
    }
    if (tk.t === 'sec') {
      if (tk.v === 'BeginProlog' || tk.v === 'BeginSetup') emPreambulo = true;
      else if (tk.v === 'EndProlog' || tk.v === 'EndSetup') emPreambulo = false;
      else if (tk.v === 'Texto') temTextoVivo = true;
      else if (tk.v === 'Imagem') temImagem = true;
      else if (tk.v.startsWith('Camada:')) {
        camadaAtual = tk.v.slice(7);
        camadas.add(camadaAtual);
      }
      continue;
    }

    const op = tk.v;
    const n = pilha;

    switch (op) {
      case 'm': {
        fecharSub(false);
        if (n.length >= 2) {
          pos = P(n[n.length - 2]!, n[n.length - 1]!);
          atual = [pos];
        }
        break;
      }
      case 'l':
      case 'L': {
        if (n.length >= 2) {
          const p = P(n[n.length - 2]!, n[n.length - 1]!);
          garantir().push(p);
          pos = p;
        }
        break;
      }
      case 'c':
      case 'C': {
        if (n.length >= 6) {
          const [x1, y1, x2, y2, x3, y3] = n.slice(-6) as [number, number, number, number, number, number];
          const p = P(x3, y3);
          flattenCubic(pos, P(x1, y1), P(x2, y2), p, garantir());
          pos = p;
        }
        break;
      }
      case 'v':
      case 'V': {
        // primeiro controle = ponto atual
        if (n.length >= 4) {
          const [x2, y2, x3, y3] = n.slice(-4) as [number, number, number, number];
          const p = P(x3, y3);
          flattenCubic(pos, pos, P(x2, y2), p, garantir());
          pos = p;
        }
        break;
      }
      case 'y':
      case 'Y': {
        // segundo controle = ponto final
        if (n.length >= 4) {
          const [x1, y1, x3, y3] = n.slice(-4) as [number, number, number, number];
          const p = P(x3, y3);
          flattenCubic(pos, P(x1, y1), p, p, garantir());
          pos = p;
        }
        break;
      }
      case 'w': {
        if (n.length) larguraTraco = n[n.length - 1]!;
        break;
      }
      case 'XR': {
        if (n.length) regra = n[n.length - 1] === 1 ? 'evenodd' : 'nonzero';
        break;
      }
      case '*u': {
        composto = true;
        compPreenche = false;
        compContorna = false;
        break;
      }
      case '*U': {
        composto = false;
        fecharSub(false);
        if (contornos.length) emitir(compPreenche, compContorna);
        break;
      }
      case '*': {
        // "(N) *" abre e fecha um grupo de guias.
        if (ultimaStr === 'N') emGuia = !emGuia;
        break;
      }
      case 'h':
      case 'H': {
        fecharSub(true);
        break;
      }
      // Marcadores de texto vivo: os caracteres nao existem como contorno.
      case 'To':
      case 'TO':
      case 'Tx':
      case 'Tj':
      case 'TX':
      case 'Tf': {
        if (!emPreambulo) temTextoVivo = true;
        break;
      }
      case 'XI': {
        if (!emPreambulo) temImagem = true;
        break;
      }
      default: {
        if (PINTA.has(op)) {
          fecharSub(FECHA_AO_PINTAR.has(op) || PINTA_PREENCHE.has(op));
          if (op === 'n' || op === 'N') {
            contornos = []; // caminho de recorte: descartado
          } else if (composto) {
            // Dentro de *u...*U os subpaths se acumulam ate o *U, para virarem um
            // objeto so -- senao o miolo da letra sairia como peca separada.
            if (PINTA_PREENCHE.has(op)) compPreenche = true;
            if (PINTA_CONTORNA.has(op)) compContorna = true;
          } else {
            emitir(PINTA_PREENCHE.has(op), PINTA_CONTORNA.has(op));
          }
        }
        break;
      }
    }

    // Operandos valem so para o operador que acabou de vir. Limpar sempre -- e o
    // que torna seguro encontrar um operador desconhecido (Xy, Xk, XW): os
    // numeros dele nao vazam para o proximo caminho.
    pilha.length = 0;
    if (op !== '*') ultimaStr = null;
  }

  fecharSub(false);
  if (contornos.length) emitir(true, false);

  if (temTextoVivo) {
    avisos.push({
      codigo: 'texto-vivo',
      msg:
        'O arquivo tem texto que não foi convertido em contornos: essa parte do desenho não vira peça. ' +
        'No CorelDRAW use Objeto > Converter em curvas (Ctrl+Q); no Illustrator, Texto > Criar contornos ' +
        '(Ctrl+Shift+O). Depois salve de novo.',
    });
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
