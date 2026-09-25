import { PT_TO_MM } from './matrix';

/**
 * Texto vivo guardado dentro do .ai (Illustrator CS em diante, e o que o CorelDRAW
 * exporta).
 *
 * O texto NAO vira `m/l/c` no desenho: o corpo so tem `/AI11Text : 0/FrameIndex`,
 * apontando para um bloco `/AI11TextDocument` no Setup, em ASCII85. La dentro fica
 * o documento do motor de texto da Adobe: um dicionario no estilo PostScript, com
 * chaves numericas, onde moram o texto (em UTF-16), as fontes, as folhas de estilo e
 * os quadros com a posicao.
 *
 * Mapa das chaves usadas (verificado no arquivo real barber ai.ai):
 *   doc /0 /1 /0            lista de fontes    -> [{/0 {/99 /CoolTypeFont /0 {/0 (nome)}}}]
 *   doc /0 /5 /0            estilos de letra   -> [{/0 {/0 (nome) /5 pai /6 {propriedades}}}]
 *   doc /0 /6 /0            estilos de paragrafo -> idem, propriedades em /5
 *   doc /0 /8 /0            quadros            -> [{/0 {/1 {/0 [pontos]} /2 {...}}}]
 *   doc /1 /1               objetos de texto   -> [{/0 {/0 (texto) /5 paragrafos /6 estilos} /1 {/0 [{/0 quadro}]}}]
 * Propriedades de letra: /0 fonte (indice) /1 corpo (pt) /5 entrelinha /6 escala
 * horizontal /8 tracking (milesimos de eme). De paragrafo: /0 alinhamento
 * (0 esquerda, 1 direita, 2 centro).
 *
 * Posicao: o motor de texto usa a tela interna do Illustrator (`%%Canvassize`,
 * 16383 pt), Y para baixo, com o centro da prancheta (`%AI3_TemplateBox`) no centro
 * da tela. Conferido no arquivo real: o BARBER cai centrado, a 1,5 pt, na altura
 * das barras entre as quais ele foi desenhado.
 */

export type Alinhamento = 'esquerda' | 'centro' | 'direita';

export interface TextoVivo {
  /** Linhas separadas por \n. */
  texto: string;
  /** Nome PostScript da fonte, como o arquivo guarda (ex.: HarmonyOS_Sans_SC). */
  fonte: string;
  tamanhoMm: number;
  escalaH: number;
  /** Tracking em milesimos de eme. */
  tracking: number;
  entrelinhaMm: number;
  alinhamento: Alinhamento;
  /** Origem da primeira linha de base, em mm, no espaco do desenho (Y para cima). */
  x: number;
  y: number;
}

export interface LeituraTextos {
  textos: TextoVivo[];
  /** Quadros que existem mas nao sabemos desenhar (texto em caixa, em caminho). */
  naoSuportados: number;
}

/* ------------------------------------------------------------ ASCII85 */

function ascii85(s: string): Uint8Array {
  const limpo = s.replace(/\s/g, '').replace(/^<~/, '');
  const fim = limpo.indexOf('~>');
  const c = fim >= 0 ? limpo.slice(0, fim) : limpo;
  const out: number[] = [];
  let t = 0;
  let n = 0;
  for (const ch of c) {
    if (ch === 'z' && n === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    t = t * 85 + (ch.charCodeAt(0) - 33);
    if (++n === 5) {
      out.push((t >>> 24) & 255, (t >>> 16) & 255, (t >>> 8) & 255, t & 255);
      t = 0;
      n = 0;
    }
  }
  if (n > 0) {
    for (let i = n; i < 5; i++) t = t * 85 + 84;
    const b = [(t >>> 24) & 255, (t >>> 16) & 255, (t >>> 8) & 255, t & 255];
    out.push(...b.slice(0, n - 1));
  }
  return new Uint8Array(out);
}

/* ---------------------------------------------------- dicionario do motor */

export type Valor = number | string | boolean | null | Valor[] | { [k: string]: Valor };

/**
 * Le o dicionario do motor de texto. `bytes` em latin1 (um char = um byte), porque
 * as strings podem ser UTF-16 e so sao decodificadas depois dos escapes.
 */
export function lerDicionario(bytes: string): Valor {
  let i = 0;
  const n = bytes.length;
  const espaco = () => {
    while (i < n && /\s/.test(bytes[i]!)) i++;
  };

  const lerString = (): string => {
    // Parenteses balanceados e escapes no nivel do BYTE: um "(" dentro do texto
    // UTF-16 aparece como \( e so vira caractere depois.
    i++;
    let prof = 1;
    const b: number[] = [];
    while (i < n && prof > 0) {
      const c = bytes[i]!;
      if (c === '\\') {
        const p = bytes[i + 1] ?? '';
        const esc: Record<string, number> = { n: 10, r: 13, t: 9, b: 8, f: 12 };
        if (p in esc) {
          b.push(esc[p]!);
          i += 2;
        } else if (/[0-7]/.test(p)) {
          let oct = '';
          let j = i + 1;
          while (j < n && oct.length < 3 && /[0-7]/.test(bytes[j]!)) oct += bytes[j++]!;
          b.push(parseInt(oct, 8) & 255);
          i = j;
        } else {
          b.push(p.charCodeAt(0) & 255);
          i += 2;
        }
        continue;
      }
      if (c === '(') prof++;
      if (c === ')' && --prof === 0) {
        i++;
        break;
      }
      b.push(c.charCodeAt(0) & 255);
      i++;
    }
    if (b[0] === 0xfe && b[1] === 0xff) {
      let s = '';
      for (let k = 2; k + 1 < b.length; k += 2) s += String.fromCharCode((b[k]! << 8) | b[k + 1]!);
      return s;
    }
    return String.fromCharCode(...b);
  };

  const valor = (): Valor => {
    espaco();
    const c = bytes[i];
    if (c === undefined) return null;
    if (c === '<' && bytes[i + 1] === '<') {
      i += 2;
      const d: { [k: string]: Valor } = {};
      for (;;) {
        espaco();
        if (i >= n) break;
        if (bytes[i] === '>' && bytes[i + 1] === '>') {
          i += 2;
          break;
        }
        const k = valor();
        const v = valor();
        if (typeof k === 'string') d[k] = v;
      }
      return d;
    }
    if (c === '[') {
      i++;
      const a: Valor[] = [];
      for (;;) {
        espaco();
        if (i >= n) break;
        if (bytes[i] === ']') {
          i++;
          break;
        }
        a.push(valor());
      }
      return a;
    }
    if (c === '(') return lerString();
    if (c === '/') {
      let j = i + 1;
      while (j < n && !/[\s/<>[\]()]/.test(bytes[j]!)) j++;
      const nome = bytes.slice(i + 1, j);
      i = j;
      return nome;
    }
    let j = i;
    while (j < n && !/[\s/<>[\]()]/.test(bytes[j]!)) j++;
    const bruto = bytes.slice(i, j);
    i = j === i ? i + 1 : j;
    if (bruto === 'true') return true;
    if (bruto === 'false') return false;
    const v = Number(bruto);
    return Number.isFinite(v) ? v : bruto;
  };

  // O documento e uma sequencia de pares chave/valor soltos no topo.
  const topo: { [k: string]: Valor } = {};
  for (;;) {
    espaco();
    if (i >= n) break;
    const k = valor();
    if (i >= n) break;
    const v = valor();
    if (typeof k === 'string') topo[k] = v;
  }
  return topo;
}

/* --------------------------------------------------------- navegacao */

type Dic = { [k: string]: Valor };
const dic = (v: Valor | undefined): Dic => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const lista = (v: Valor | undefined): Valor[] => (Array.isArray(v) ? v : []);
const num = (v: Valor | undefined): number | undefined => (typeof v === 'number' ? v : undefined);
const caminho = (v: Valor | undefined, ...ks: string[]): Valor | undefined => {
  let a: Valor | undefined = v;
  for (const k of ks) a = dic(a)[k];
  return a;
};

/* ------------------------------------------------------------ extracao */

/** Acha o bloco `/AI11TextDocument` no PostScript e devolve os bytes decodificados. */
function blocoTexto(ps: string): string | null {
  const ini = ps.indexOf('/AI11TextDocument');
  if (ini < 0) return null;
  const linhas = ps.slice(ini).split(/\r\n|\r|\n/).slice(1);
  let a85 = '';
  for (const l of linhas) {
    const t = l.trim();
    if (t === ';' || t.startsWith('/')) break;
    a85 += t.replace(/^%/, '');
    if (t.includes('~>')) break;
  }
  if (!a85) return null;
  const b = ascii85(a85);
  let s = '';
  for (let k = 0; k < b.length; k++) s += String.fromCharCode(b[k]!);
  // Documento em texto comeca com "/0 <<". Se vier comprimido, nao sabemos ler aqui.
  return /^\s*\/\d/.test(s) ? s : null;
}

function cabecalho(ps: string): { canvas: number; cx: number; cy: number } {
  const canvas = Number(ps.match(/%%Canvassize:\s*([\d.]+)/)?.[1] ?? 16383);
  const tb = ps.match(/%AI3_TemplateBox:\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/);
  const cx = tb ? (Number(tb[1]) + Number(tb[3])) / 2 : 0;
  const cy = tb ? (Number(tb[2]) + Number(tb[4])) / 2 : 0;
  return { canvas, cx, cy };
}

/** Propriedades efetivas de um estilo: normal <- pai <- sobreposicoes. */
function estilo(folhas: Valor[], pai: number | undefined, sobre: Dic): Dic {
  const base = dic(caminho(folhas[0], '0', '6'));
  const doPai = pai !== undefined ? dic(caminho(folhas[pai], '0', '6')) : {};
  return { ...base, ...doPai, ...sobre };
}

export function extrairTextosVivos(ps: string): LeituraTextos {
  const bruto = blocoTexto(ps);
  if (!bruto) return { textos: [], naoSuportados: 0 };

  const doc = lerDicionario(bruto);
  const recursos = caminho(doc, '0');
  const fontes = lista(caminho(recursos, '1', '0')).map((f) => String(caminho(f, '0', '0', '0') ?? ''));
  const folhasLetra = lista(caminho(recursos, '5', '0'));
  const folhasPar = lista(caminho(recursos, '6', '0'));
  const quadros = lista(caminho(recursos, '8', '0'));
  const objetos = lista(caminho(doc, '1', '1'));
  const { canvas, cx, cy } = cabecalho(ps);

  const textos: TextoVivo[] = [];
  let naoSuportados = 0;

  for (const obj of objetos) {
    const historia = dic(caminho(obj, '0'));
    const texto = String(historia['0'] ?? '')
      .replace(/\r\n?/g, '\n')
      .replace(/\n+$/, '');
    if (!texto.trim()) continue;

    const idxQuadro = num(caminho(lista(caminho(obj, '1', '0'))[0], '0')) ?? 0;
    const pontos = lista(caminho(quadros[idxQuadro], '0', '1', '0')).map((v) => num(v) ?? NaN);

    // Texto de ponto: o "caminho" do quadro e um ponto repetido. Caixa ou caminho
    // de verdade tem pontos diferentes -- nao sabemos quebrar linha dentro deles.
    const pontoUnico =
      pontos.length >= 2 &&
      pontos.every((v, k) => Number.isFinite(v) && Math.abs(v - pontos[k % 2]!) < 1e-6);
    const runsLetra = lista(caminho(historia, '6', '0'));
    const runsPar = lista(caminho(historia, '5', '0'));
    if (!pontoUnico || runsLetra.length > 1) {
      naoSuportados++;
      continue;
    }

    const rl = dic(caminho(runsLetra[0], '0', '0'));
    const e = estilo(folhasLetra, num(rl['5']), dic(rl['6']));
    // Paragrafo: as propriedades ficam em /5 (nao em /6, como nas de letra).
    const rp = dic(caminho(runsPar[0], '0', '0'));
    const propsPar = {
      ...dic(caminho(folhasPar[0], '0', '5')),
      ...dic(caminho(folhasPar[num(rp['6']) ?? 0], '0', '5')),
      ...dic(rp['5']),
    };

    const tamanhoPt = num(e['1']) ?? 12;
    const just = num(propsPar['0']) ?? 0;
    const X = pontos[0]!;
    const Y = pontos[1]!;

    textos.push({
      texto,
      fonte: fontes[num(e['0']) ?? 0] ?? '',
      tamanhoMm: tamanhoPt * PT_TO_MM,
      escalaH: num(e['6']) ?? 1,
      tracking: num(e['8']) ?? 0,
      entrelinhaMm: (num(e['5']) ?? tamanhoPt * 1.2) * PT_TO_MM,
      alinhamento: just === 2 ? 'centro' : just === 1 ? 'direita' : 'esquerda',
      x: (X - canvas / 2 + cx) * PT_TO_MM,
      y: (canvas / 2 + cy - Y) * PT_TO_MM,
    });
  }

  return { textos, naoSuportados };
}
