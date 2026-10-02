/** Formas e operacoes 2D que as receitas repetem (sobre lib/geom/region). */
import type { Font } from 'opentype.js';
import { textToLetters, type Letra } from '../text/glyphs';
import { buildRegion, offsetRegion, regionBounds, scaleRegion, translateRegion, unionRegion, type Bounds, type Pt, type Region } from '../geom/region';

export function circulo(cx: number, cy: number, r: number, lados = 64): Region {
  const pts: Pt[] = [];
  for (let i = 0; i < lados; i++) {
    const a = (2 * Math.PI * i) / lados;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return buildRegion([pts]);
}

/** Retangulo centrado em (cx, cy), cantos com raio `r`. */
export function retanguloArredondado(cx: number, cy: number, w: number, h: number, r: number): Region {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (r === 0) {
    const x0 = cx - w / 2, y0 = cy - h / 2;
    return buildRegion([[{ x: x0, y: y0 }, { x: x0 + w, y: y0 }, { x: x0 + w, y: y0 + h }, { x: x0, y: y0 + h }]]);
  }
  const pts: Pt[] = [];
  const cantos: [number, number, number][] = [
    [cx + w / 2 - r, cy - h / 2 + r, -90],
    [cx + w / 2 - r, cy + h / 2 - r, 0],
    [cx - w / 2 + r, cy + h / 2 - r, 90],
    [cx - w / 2 + r, cy - h / 2 + r, 180],
  ];
  for (const [x, y, a0] of cantos) {
    for (let i = 0; i <= 12; i++) {
      const a = ((a0 + (90 * i) / 12) * Math.PI) / 180;
      pts.push({ x: x + r * Math.cos(a), y: y + r * Math.sin(a) });
    }
  }
  return buildRegion([pts]);
}

/** Contorno que dilata `d` mm (o offset do app encolhe com d > 0). */
export const contornar = (r: Region, d: number) => offsetRegion(r, -d);

/** So os contornos de fora: tapa o miolo das letras (O, A, B...). */
export const semBuracos = (r: Region): Region => unir(r.map((p) => [{ outer: p.outer, holes: [] }]));

export function unir(rs: Region[]): Region {
  return rs.reduce<Region>((acc, r) => (acc.length ? unionRegion(acc, r) : r), []);
}

export function limites(r: Region): Bounds {
  return regionBounds(r);
}

export interface Linha {
  texto: string;
  fonte: Font;
  /** Altura das maiusculas, mm. */
  altura: number;
  /** Espaco extra entre letras, mm. */
  tracking?: number;
  /** Espacamento como fracao do avanco da fonte (1 = normal, 1,05 = 5% mais aberto). */
  espacamento?: number;
  /** Fonte para o que `fonte` nao tem (emoji). */
  reserva?: Font;
}

/** Tem emoji/simbolo que fonte de texto costuma nao ter? */
export const temEmoji = (s: string) => /\p{Extended_Pictographic}/u.test(s);

// Seletor de variacao e "zero width joiner": modificam o emoji anterior, nao tem desenho.
const INVISIVEL = /[\u200d\ufe0e\ufe0f]/u;

const escalaDe = (f: Font, altura: number) => altura / (f.tables?.os2?.sCapHeight || f.unitsPerEm * 0.7);

/**
 * As letras de uma linha. Sem reserva e com espacamento normal, e o `textToLetters` (com
 * ligaduras). Senao, caractere a caractere: o que a fonte nao tem vai na reserva (na
 * mesma altura de maiuscula) e o avanco de cada glifo e multiplicado pelo espacamento.
 */
function letrasDaLinha(l: Linha): Letra[] {
  const tracking = l.tracking ?? 0, fator = l.espacamento ?? 1;
  if (!l.reserva && fator === 1) return textToLetters(l.fonte, l.texto, { altura: l.altura, tracking });
  const chars = [...l.texto].filter((c) => !INVISIVEL.test(c)).map((c) => ({
    c,
    fonte: l.reserva && l.fonte.charToGlyph(c).index === 0 && l.reserva.charToGlyph(c).index !== 0 ? l.reserva : l.fonte,
  }));
  const out: Letra[] = [];
  let x = 0;
  chars.forEach(({ c, fonte }, i) => {
    for (const letra of textToLetters(fonte, c, { altura: l.altura })) {
      const region = translateRegion(letra.region, x, 0);
      out.push({ nome: letra.nome, region, bounds: regionBounds(region) });
    }
    const k = escalaDe(fonte, l.altura);
    const g = fonte.charToGlyph(c);
    x += (g.advanceWidth ?? 0) * k * fator + tracking;
    const prox = chars[i + 1];
    if (prox && prox.fonte === fonte) x += fonte.getKerningValue(g, fonte.charToGlyph(prox.c)) * k;
  });
  return out;
}

export interface TextoComposto {
  letras: Letra[];
  regiao: Region;
  bounds: Bounds;
}

/**
 * Linhas de texto centralizadas em x = 0, a primeira em cima, `entrelinha` mm entre
 * elas; o conjunto termina centrado em (0, 0).
 */
export function comporLinhas(linhas: Linha[], entrelinha: number): TextoComposto {
  const porLinha = linhas
    .filter((l) => l.texto.trim())
    .map((l) => {
      const letras = letrasDaLinha(l);
      const b = letras.length ? regionBounds(letras.flatMap((x) => x.region)) : null;
      return { letras, b };
    })
    .filter((x) => x.b);
  const letras: Letra[] = [];
  let topo = 0;
  for (const { letras: ls, b } of porLinha) {
    const dx = -(b!.minX + b!.maxX) / 2, dy = topo - b!.maxY;
    for (const l of ls) {
      const region = translateRegion(l.region, dx, dy);
      letras.push({ nome: l.nome, region, bounds: regionBounds(region) });
    }
    topo += -b!.h - entrelinha;
  }
  if (!letras.length) return { letras, regiao: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 } };
  const b = regionBounds(letras.flatMap((l) => l.region));
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const centradas = letras.map((l) => {
    const region = translateRegion(l.region, -cx, -cy);
    return { nome: l.nome, region, bounds: regionBounds(region) };
  });
  const regiao = unir(centradas.map((l) => l.region));
  return { letras: centradas, regiao, bounds: regionBounds(regiao) };
}

/**
 * Acha a escala que deixa a largura medida por `largura(k)` igual a `alvo`. A largura
 * e afim na escala (tracking e contorno nao escalam), entao duas medidas resolvem.
 */
export function escalaParaLargura(largura: (k: number) => number, alvo: number): number {
  const w1 = largura(1), w2 = largura(2);
  const a = w2 - w1, b = w1 - a; // w(k) = a k + b
  if (!(a > 0)) return 1;
  return Math.max(0.01, (alvo - b) / a);
}

/** Coracao (curva classica em seno/cosseno), largura `w`, centrado em (0, 0). */
export function coracao(w: number, lados = 120): Region {
  const pts: Pt[] = [];
  for (let i = 0; i < lados; i++) {
    const t = (2 * Math.PI * i) / lados;
    pts.push({ x: 16 * Math.sin(t) ** 3, y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) });
  }
  return ajustarLargura(buildRegion([pts]), w);
}

/** Estrela de 5 pontas com as pontas arredondadas, largura `w`, centrada em (0, 0). */
export function estrela(w: number): Region {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / 5;
    const r = i % 2 ? 0.45 : 1;
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  return ajustarLargura(contornar(offsetRegion(buildRegion([pts]), 0.08), 0.08), w);
}

/** A regiao escalada para largura `w` e centrada em (0, 0). */
export function ajustarLargura(r: Region, w: number): Region {
  const b = regionBounds(r);
  if (!(b.w > 0)) return [];
  const k = w / b.w;
  return scaleRegion(translateRegion(r, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2), k);
}

export interface OpcoesCaixa {
  fonte: Font;
  /** Largura e altura maximas do bloco de texto, mm. */
  maxW: number;
  maxH: number;
  entrelinha?: number;
  /** Fator do avanco (1 = normal). */
  espacamento?: number;
  reserva?: Font;
  /** Altura relativa de cada linha (1 = igual a primeira). */
  razoes?: number[];
}

/** Linhas de texto no maior tamanho que cabe em `maxW` x `maxH`, centradas em (0, 0). */
export function textoNaCaixa(linhas: string[], o: OpcoesCaixa): TextoComposto {
  const compor = (k: number) =>
    comporLinhas(linhas.map((texto, i) => ({ texto, fonte: o.fonte, reserva: o.reserva, espacamento: o.espacamento, altura: 10 * k * (o.razoes?.[i] ?? 1) })), o.entrelinha ?? 0);
  const kw = escalaParaLargura((k) => compor(k).bounds.w, o.maxW);
  const kh = escalaParaLargura((k) => compor(k).bounds.h, o.maxH);
  return compor(Math.min(kw, kh));
}

