/**
 * Pecas de pe e furos deitados em fatias de Z (a impressora ja deposita em camadas): a silhueta
 * de frente de uma palavra de pe vira, em cada fatia, retangulos na profundidade; um furo
 * horizontal vira, em cada fatia, uma faixa da largura do furo naquela altura.
 */
import { regionBounds, type Region } from '../geom/region';
import { unir } from './formas';
import type { Camada } from './tipos';

export const ret = (x0: number, y0: number, x1: number, y1: number): Region =>
  [{ outer: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], holes: [] }];

/** Trechos de x dentro da regiao na altura y (par-impar). */
export function trechos(r: Region, y: number): [number, number][] {
  const xs: number[] = [];
  for (const p of r) for (const anel of [p.outer, ...p.holes]) for (let i = 0; i < anel.length; i++) {
    const a = anel[i]!, b = anel[(i + 1) % anel.length]!;
    if ((a.y <= y) !== (b.y <= y)) xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
  }
  xs.sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (let k = 0; k + 1 < xs.length; k += 2) if (xs[k + 1]! - xs[k]! > 0.02) out.push([xs[k]! + 0.01, xs[k + 1]! - 0.01]);
  return out;
}

/**
 * Meia largura, na altura z, de um furo deitado de raio r com o centro em zc: circulo embaixo e
 * telhado em gota de 45 graus em cima (imprime sem suporte).
 */
export function furoDeitado(r: number, zc: number, z: number): number {
  const d = z - zc;
  if (d < -r) return 0;
  if (d <= r / Math.SQRT2) return Math.sqrt(Math.max(0, r * r - d * d));
  return Math.max(0, r * Math.SQRT2 - d);
}

export interface OpcoesFatias {
  /** Altura de cada fatia, mm. */
  passo?: number;
  /** Alturas onde sempre começa uma fatia (troca de cor, borda de junta). */
  cortes?: number[];
}

const chave = (r: Region) => r.map((p) => [p.outer, ...p.holes].map((a) => a.map((q) => `${q.x.toFixed(3)},${q.y.toFixed(3)}`).join(' ')).join('|')).join('/');

/**
 * Camadas de z0 a z1 em fatias de `passo`, com a regiao que `fatia(meio)` der no meio de cada uma;
 * fatias seguidas iguais viram uma camada so.
 */
export function fatiar(z0: number, z1: number, fatia: (z: number) => Region, o: OpcoesFatias = {}): Camada[] {
  const passo = o.passo ?? 0.2, n = Math.max(1, Math.round((z1 - z0) / passo));
  const zs = [...new Set([...Array.from({ length: n + 1 }, (_, i) => z0 + ((z1 - z0) * i) / n), ...(o.cortes ?? []).filter((z) => z > z0 && z < z1)].map((z) => Math.round(z * 1e4) / 1e4))].sort((a, b) => a - b);
  const camadas: Camada[] = [];
  let ultima = '';
  for (let i = 0; i + 1 < zs.length; i++) {
    const a = zs[i]!, b = zs[i + 1]!, region = fatia((a + b) / 2);
    const k = chave(region);
    if (k === ultima && camadas.length) camadas.at(-1)!.z1 = b;
    else if (region.length) camadas.push({ region, z0: a, z1: b });
    ultima = region.length ? k : '';
  }
  return camadas;
}

/**
 * A silhueta de frente (x, e a altura no y da regiao) de pe, de y0 a y1 de profundidade: em cada
 * fatia, os trechos da silhueta naquela altura viram retangulos. `ajustar` soma ou tira o que
 * muda com a altura (canal, juntas).
 */
export function emPe(silhueta: Region, y0: number, y1: number, o: OpcoesFatias & { ajustar?: (r: Region, z: number) => Region } = {}): Camada[] {
  const b = regionBounds(silhueta);
  return fatiar(b.minY, b.maxY, (z) => {
    const r = unir(trechos(silhueta, z).map(([x0, x1]) => ret(x0, y0, x1, y1)));
    return o.ajustar ? o.ajustar(r, z) : r;
  }, o);
}

/** As camadas abaixo e acima de z (a troca de cor por altura). */
export function cortarNaAltura(camadas: Camada[], z: number): [Camada[], Camada[]] {
  const baixo: Camada[] = [], cima: Camada[] = [];
  for (const c of camadas) {
    if (c.z1 <= z) baixo.push(c);
    else if (c.z0 >= z) cima.push(c);
    else baixo.push({ ...c, z1: z }), cima.push({ ...c, z0: z });
  }
  return [baixo, cima];
}
