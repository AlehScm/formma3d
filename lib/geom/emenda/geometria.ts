/** Utilitarios 2D e do solido usados por toda a divisao. */
import { diffRegion, offsetRegion, pointInContour, unionRegion, type Pt, type Region } from '../region';
import type { Manifold } from 'manifold-3d';
import type { Params, Part } from '../modes';
import { comEscopo } from '../../malha/nucleo';
import { doMalha } from '../../malha/converter';
import { fatia, projecao } from '../../malha/solidos';
import type { Reta } from './tipos';

export const retangulo = (x0: number, y0: number, x1: number, y1: number): Region => [
  { outer: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], holes: [] },
];

export function circulo(cx: number, cy: number, r: number, lados = 40): Region {
  const outer: Pt[] = [];
  for (let i = 0; i < lados; i++) {
    const a = (i / lados) * Math.PI * 2;
    outer.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return [{ outer, holes: [] }];
}

export const unir = (rs: Region[]): Region => rs.reduce<Region>((acc, r) => (r.length ? (acc.length ? unionRegion(acc, r) : r) : acc), []);

export const dentroDa = (r: Region, q: Pt) => r.some((p) => pointInContour(p.outer, q) && !p.holes.some((h) => pointInContour(h, q)));

export const zBase = (s: Manifold) => s.boundingBox().min[2];

export const zTopo = (s: Manifold) => s.boundingBox().max[2];

/**
 * Trechos de material na linha de corte (par-impar), medidos ao longo da linha: para x = pos,
 * intervalos em y; para y = pos, intervalos em x.
 */
export function trechosNaLinha(r: Region, c: Reta): [number, number][] {
  const vals: number[] = [];
  for (const p of r) for (const anel of [p.outer, ...p.holes]) for (let i = 0; i < anel.length; i++) {
    const a = anel[i]!, b = anel[(i + 1) % anel.length]!;
    const [ua, ub, va, vb] = c.eixo === 'x' ? [a.x, b.x, a.y, b.y] : [a.y, b.y, a.x, b.x];
    if ((ua <= c.pos) !== (ub <= c.pos)) vals.push(va + ((c.pos - ua) * (vb - va)) / (ub - ua));
  }
  vals.sort((p, q) => p - q);
  const out: [number, number][] = [];
  for (let k = 0; k + 1 < vals.length; k += 2) if (vals[k + 1]! - vals[k]! > 0.02) out.push([vals[k]!, vals[k + 1]!]);
  return out;
}

export const somaTrechos = (t: [number, number][]) => t.reduce((s, [a, b]) => s + (b - a), 0);

/** A silhueta impressa da peca: a sombra do solido vista de cima (o furo do fio fica). */
export const silhueta = (part: Part): Region => comEscopo((m) => projecao(doMalha(m, part.malha)));

/** Peca solida: maciça, ou sem cavidade (a receita marca `meta.solida` quando o traco e fino demais para o vao). */
export const ehSolida = (part: Part, cfg: Pick<Params, 'macica'>): boolean => cfg.macica || part.meta.solida;

export const mais = (a: Pt, d: Pt, k = 1): Pt => ({ x: a.x + d.x * k, y: a.y + d.y * k });

export const menos = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });

export const escalar = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;

export const distancia = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export const unitario = (v: Pt): Pt => {
  const n = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / n, y: v.y / n };
};

/** O material na altura z. */
export const secaoEm = (s: Manifold, z: number): Region => fatia(s, z);

/** As alturas em que o solido muda: as dos vertices (todo solido aqui e feito de prismas retos). */
export function niveis(s: Manifold): number[] {
  const g = s.getMesh();
  const zs = new Set<number>();
  for (let i = 2; i < g.vertProperties.length; i += g.numProp) zs.add(g.vertProperties[i]!);
  return [...zs].sort((a, b) => a - b);
}

/** Espessura da parede na peca oca: a parede mais o batente, quando ha chapa ou batente. */
export const espessuraDaParede = (part: Part, cfg: Params) => cfg.parede + (part.meta.comBatente ? cfg.batente : 0);

/** Na oca, onde nao ha vao por dentro (traco fino demais para a cavidade): ali a emenda leva dente. */
export function zonaMacica(part: Part, espParede: number): Region {
  const cavidade = offsetRegion(part.contorno, espParede);
  return cavidade.length ? diffRegion(part.contorno, offsetRegion(cavidade, -(espParede + 2))) : part.contorno;
}
