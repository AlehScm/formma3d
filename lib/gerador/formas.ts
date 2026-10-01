/** Formas e operacoes 2D que as receitas repetem (sobre lib/geom/region). */
import type { Font } from 'opentype.js';
import { textToLetters, type Letra } from '../text/glyphs';
import { buildRegion, offsetRegion, regionBounds, translateRegion, unionRegion, type Bounds, type Pt, type Region } from '../geom/region';

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
      const letras = textToLetters(l.fonte, l.texto, { altura: l.altura, tracking: l.tracking ?? 0 });
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
