/**
 * Divide a malha em retalhos lisos separados por vinco (aresta onde a superficie dobra
 * forte). Letra gravada ou em relevo encontra a face num vinco de ~90 graus; a
 * tesselacao de uma superficie lisa, mesmo grossa, dobra bem menos que isso.
 *
 * Com o vinco abaixo de 45 graus, triangulo lasca (normal torta ou nula) nunca e liso
 * com a face E com a parede da letra ao mesmo tempo -- nao liga uma na outra. No pior
 * caso vira um retalho sozinho, sem altura, que o remendo descarta.
 */
import type { Malha } from './relevo';

export const ANGULO_VINCO = 35; // graus
export const COS_VINCO = Math.cos((ANGULO_VINCO * Math.PI) / 180);

export interface Segmentos {
  /** Normal por triangulo (nula se a area e zero). */
  n: Float64Array;
  area: Float64Array;
  /** Centro por triangulo. */
  c: Float64Array;
  /** Vizinho pela aresta e (t[e] -> t[e+1]); -1 = aresta aberta ou com mais de 2 triangulos. */
  viz: Int32Array;
  retalho: Int32Array;
  areaRetalho: number[];
  vizRetalho: Set<number>[];
}

const cache = new WeakMap<Malha, Segmentos>();
const chave = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);

export function segmentar(m: Malha): Segmentos {
  const pronto = cache.get(m);
  if (pronto) return pronto;
  const nt = m.t.length / 3;
  const n = new Float64Array(nt * 3), area = new Float64Array(nt), c = new Float64Array(nt * 3);
  const viz = new Int32Array(nt * 3).fill(-1);
  for (let f = 0; f < nt; f++) {
    const [a, b, d] = [0, 1, 2].map((e) => m.t[f * 3 + e]! * 3) as [number, number, number];
    const p = [a, b, d].map((k) => [m.v[k]!, m.v[k + 1]!, m.v[k + 2]!]) as [number, number, number][];
    for (let k = 0; k < 3; k++) c[f * 3 + k] = (p[0]![k]! + p[1]![k]! + p[2]![k]!) / 3;
    const u = [0, 1, 2].map((k) => p[1]![k]! - p[0]![k]!), w = [0, 1, 2].map((k) => p[2]![k]! - p[0]![k]!);
    const x = u[1]! * w[2]! - u[2]! * w[1]!, y = u[2]! * w[0]! - u[0]! * w[2]!, z = u[0]! * w[1]! - u[1]! * w[0]!;
    const L = Math.hypot(x, y, z);
    area[f] = L / 2;
    if (L > 0) [n[f * 3], n[f * 3 + 1], n[f * 3 + 2]] = [x / L, y / L, z / L];
    for (let e = 0; e < 3; e++) {
      const lista = m.arestas.get(chave(m.t[f * 3 + e]!, m.t[f * 3 + ((e + 1) % 3)]!));
      if (lista?.length === 2) viz[f * 3 + e] = lista[0] === f ? lista[1]! : lista[0]!;
    }
  }
  const liso = (f: number, g: number) => n[f * 3]! * n[g * 3]! + n[f * 3 + 1]! * n[g * 3 + 1]! + n[f * 3 + 2]! * n[g * 3 + 2]! >= COS_VINCO;
  const retalho = new Int32Array(nt).fill(-1);
  const areaRetalho: number[] = [];
  for (let s = 0; s < nt; s++) {
    if (retalho[s]! >= 0) continue;
    const id = areaRetalho.length;
    let soma = 0;
    const pilha = [s];
    retalho[s] = id;
    while (pilha.length) {
      const f = pilha.pop()!;
      soma += area[f]!;
      for (let e = 0; e < 3; e++) {
        const g = viz[f * 3 + e]!;
        if (g >= 0 && retalho[g]! < 0 && liso(f, g)) {
          retalho[g] = id;
          pilha.push(g);
        }
      }
    }
    areaRetalho.push(soma);
  }
  const vizRetalho = areaRetalho.map(() => new Set<number>());
  for (let f = 0; f < nt; f++) {
    for (let e = 0; e < 3; e++) {
      const g = viz[f * 3 + e]!;
      if (g >= 0 && retalho[g] !== retalho[f]) vizRetalho[retalho[f]!]!.add(retalho[g]!);
    }
  }
  const s: Segmentos = { n, area, c, viz, retalho, areaRetalho, vizRetalho };
  cache.set(m, s);
  return s;
}
