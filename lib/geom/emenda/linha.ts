/** A linha de um corte qualquer (reto, inclinado, esboco) na caixa da peca, e medidas sobre ela. */
import { buildRegion, regionBounds, signedArea, strokeToRegion, type Pt, type Region } from '../region';
import type { Part } from '../modes';
import { caixaDaMalha, malhaVazia } from '../../malha/tipos';
import { ehAltura, ehEsboco, type Caixa, type Corte, type CorteDesenhado, type CorteReto } from './tipos';
import { distancia, escalar, mais, menos, unitario } from './geometria';

const SOBRA_CAIXA = 60;

/** A caixa da peca (solido, chapa e extras), com sobra. */
export function caixaDe(part: Part): Caixa {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const junta = (x0: number, y0: number, x1: number, y1: number) => {
    minX = Math.min(minX, x0);
    minY = Math.min(minY, y0);
    maxX = Math.max(maxX, x1);
    maxY = Math.max(maxY, y1);
  };
  for (const malha of [part.malha, ...part.extras.flatMap((e) => (e.kind === 'stl' ? [e.malha] : []))]) {
    if (malhaVazia(malha)) continue;
    const c = caixaDaMalha(malha);
    junta(c.min[0], c.min[1], c.max[0], c.max[1]);
  }
  for (const e of part.extras) {
    if (e.kind !== 'cut' || !e.region.length) continue;
    const b = regionBounds(e.region);
    junta(b.minX, b.minY, b.maxX, b.maxY);
  }
  return { minX: minX - SOBRA_CAIXA, minY: minY - SOBRA_CAIXA, maxX: maxX + SOBRA_CAIXA, maxY: maxY + SOBRA_CAIXA };
}

/** O meio da peca: onde o corte reto inclinado gira. */
export function centroDaPeca(part: Part): Pt {
  const b = regionBounds(part.contorno);
  return { x: b.minX + b.w / 2, y: b.minY + b.h / 2 };
}

/** Direcao do corte reto, ja inclinado. O lado de antes fica a esquerda dela. */
export function direcaoDaReta(c: CorteReto): Pt {
  const a = ((c.angulo ?? 0) * Math.PI) / 180;
  const b = c.eixo === 'x' ? { x: 0, y: 1 } : { x: -1, y: 0 };
  return { x: b.x * Math.cos(a) - b.y * Math.sin(a), y: b.x * Math.sin(a) + b.y * Math.cos(a) };
}

/** Onde a semirreta p + t*d (t > 0) sai da caixa. */
function saidaDaCaixa(p: Pt, d: Pt, cx: Caixa): Pt {
  let t = Infinity;
  if (d.x > 1e-12) t = Math.min(t, (cx.maxX - p.x) / d.x);
  if (d.x < -1e-12) t = Math.min(t, (cx.minX - p.x) / d.x);
  if (d.y > 1e-12) t = Math.min(t, (cx.maxY - p.y) / d.y);
  if (d.y < -1e-12) t = Math.min(t, (cx.minY - p.y) / d.y);
  return mais(p, d, t);
}

/**
 * A linha do corte de borda a borda da caixa, orientada: o lado de antes fica a esquerda (x < pos
 * no corte vertical, y < pos no horizontal). O esboco se estende pelas pontas. Null se a linha
 * nao passa pela caixa.
 */
/** Os pontos do esboco presos dentro da caixa, um para cada ponto do corte (o indice e o mesmo). */
export const pontosDoEsboco = (c: CorteDesenhado, cx: Caixa): Pt[] =>
  c.pontos.map((p) => ({ x: Math.min(cx.maxX - 1, Math.max(cx.minX + 1, p.x)), y: Math.min(cx.maxY - 1, Math.max(cx.minY + 1, p.y)) }));

export function linhaDoCorte(c: Corte, cx: Caixa, centro: Pt): Pt[] | null {
  if (ehAltura(c)) return null;
  if (ehEsboco(c)) {
    const ps: Pt[] = [];
    for (const p of pontosDoEsboco(c, cx)) if (!ps.length || distancia(p, ps[ps.length - 1]!) > 0.5) ps.push(p);
    if (ps.length < 2) return null;
    const n = ps.length;
    return [saidaDaCaixa(ps[0]!, unitario(menos(ps[0]!, ps[1]!)), cx), ...ps, saidaDaCaixa(ps[n - 1]!, unitario(menos(ps[n - 1]!, ps[n - 2]!)), cx)];
  }
  const d = direcaoDaReta(c);
  const p = c.eixo === 'x' ? { x: c.pos, y: centro.y } : { x: centro.x, y: c.pos };
  if (p.x <= cx.minX || p.x >= cx.maxX || p.y <= cx.minY || p.y >= cx.maxY) return null;
  return [saidaDaCaixa(p, { x: -d.x, y: -d.y }, cx), saidaDaCaixa(p, d, cx)];
}

/** Onde fica um ponto da borda da caixa, andando no sentido anti-horario desde o canto de baixo a esquerda. */
function naBorda(p: Pt, cx: Caixa): number {
  const w = cx.maxX - cx.minX, h = cx.maxY - cx.minY, e = 1e-6;
  if (Math.abs(p.y - cx.minY) < e) return p.x - cx.minX;
  if (Math.abs(p.x - cx.maxX) < e) return w + (p.y - cx.minY);
  if (Math.abs(p.y - cx.maxY) < e) return w + h + (cx.maxX - p.x);
  return 2 * w + h + (cx.maxY - p.y);
}

/** O lado de antes (a esquerda) da linha: fecha pela borda da caixa, da saida ate a entrada. */
export function ladoAntes(linha: Pt[], cx: Caixa): Region {
  const w = cx.maxX - cx.minX, h = cx.maxY - cx.minY, volta = 2 * (w + h);
  const s0 = naBorda(linha[0]!, cx), s1 = naBorda(linha[linha.length - 1]!, cx);
  const ate = s0 > s1 ? s0 : s0 + volta;
  const cantos: [number, Pt][] = [
    [0, { x: cx.minX, y: cx.minY }],
    [w, { x: cx.maxX, y: cx.minY }],
    [w + h, { x: cx.maxX, y: cx.maxY }],
    [2 * w + h, { x: cx.minX, y: cx.maxY }],
  ];
  const passa = [0, volta]
    .flatMap((k) => cantos.map(([s, p]): [number, Pt] => [s + k, p]))
    .filter(([s]) => s > s1 && s < ate)
    .sort((a, b) => a[0] - b[0]);
  return buildRegion([[...linha, ...passa.map(([, p]) => p)]]);
}

/** Um segmento da linha: origem, direcao (t) e frente (n, para o lado de depois). */
export interface Segmento {
  o: Pt;
  t: Pt;
  n: Pt;
  comp: number;
}

export function segmentosDe(linha: Pt[]): Segmento[] {
  const out: Segmento[] = [];
  for (let i = 0; i + 1 < linha.length; i++) {
    const v = menos(linha[i + 1]!, linha[i]!);
    const comp = Math.hypot(v.x, v.y);
    if (comp < 1e-9) continue;
    const t = { x: v.x / comp, y: v.y / comp };
    out.push({ o: linha[i]!, t, n: { x: t.y, y: -t.x }, comp });
  }
  return out;
}

/** Trechos de material ao longo de um segmento (par-impar), em mm desde a origem dele. */
function trechosNoSegmento(r: Region, s: Segmento): [number, number][] {
  const vals: number[] = [];
  for (const p of r) for (const anel of [p.outer, ...p.holes]) for (let i = 0; i < anel.length; i++) {
    const a = anel[i]!, b = anel[(i + 1) % anel.length]!;
    const ua = (a.x - s.o.x) * s.n.x + (a.y - s.o.y) * s.n.y, ub = (b.x - s.o.x) * s.n.x + (b.y - s.o.y) * s.n.y;
    if ((ua <= 0) === (ub <= 0)) continue;
    const wa = (a.x - s.o.x) * s.t.x + (a.y - s.o.y) * s.t.y, wb = (b.x - s.o.x) * s.t.x + (b.y - s.o.y) * s.t.y;
    vals.push(wa + ((0 - ua) * (wb - wa)) / (ub - ua));
  }
  vals.sort((p, q) => p - q);
  const out: [number, number][] = [];
  for (let k = 0; k + 1 < vals.length; k += 2) {
    const a = Math.max(0, vals[k]!), b = Math.min(s.comp, vals[k + 1]!);
    if (b - a > 0.02) out.push([a, b]);
  }
  return out;
}

/** Um trecho de material que a linha cruza: no segmento `s`, de `a` ate `b` mm. */
interface TrechoDaLinha {
  s: Segmento;
  a: number;
  b: number;
}

export const trechosNosSegmentos = (r: Region, segs: Segmento[]): TrechoDaLinha[] => segs.flatMap((s) => trechosNoSegmento(r, s).map(([a, b]) => ({ s, a, b })));

export const trechosDaLinha = (r: Region, linha: Pt[]) => trechosNosSegmentos(r, segmentosDe(linha));

/** Os pedacos da linha que passam sobre o desenho: e o que a tela desenha do corte. */
export function tracosDoCorte(r: Region, linha: Pt[]): [Pt, Pt][] {
  return trechosDaLinha(r, linha).map(({ s, a, b }): [Pt, Pt] => [mais(s.o, s.t, a), mais(s.o, s.t, b)]);
}

/** Faixa de `d` mm para cada lado da linha. */
export const faixaDaLinha = (linha: Pt[], d: number): Region => strokeToRegion([{ pts: linha, closed: false }], 2 * d, false, 'miter');

/** O ponto da linha mais perto de `p`: o segmento e quantos mm desde a origem dele. */
export function projetar(p: Pt, segs: Segmento[]): { s: Segmento; w: number; d: number } | null {
  let melhor: { s: Segmento; w: number; d: number } | null = null;
  for (const s of segs) {
    const w = Math.max(0, Math.min(s.comp, escalar(menos(p, s.o), s.t)));
    const d = distancia(p, mais(s.o, s.t, w));
    if (!melhor || d < melhor.d) melhor = { s, w, d };
  }
  return melhor;
}

/** Distancia de um ponto ate a linha de um corte, mm. */
export const distanciaALinha = (p: Pt, linha: Pt[]) => projetar(p, segmentosDe(linha))?.d ?? Infinity;

/** Poligono no referencial do segmento (u ao longo, v para a frente), posto no ponto `w` dele. */
export function noDesenho(pts: [number, number][], s: Segmento, w: number): Region {
  const o = mais(s.o, s.t, w);
  const outer = pts.map(([u, v]) => ({ x: o.x + s.t.x * u + s.n.x * v, y: o.y + s.t.y * u + s.n.y * v }));
  return [{ outer: signedArea(outer) < 0 ? outer.reverse() : outer, holes: [] }];
}
