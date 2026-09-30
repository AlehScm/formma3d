/**
 * Tira um pedaco da malha (a marca) e fecha o buraco com uma superficie lisa que
 * continua a face em volta. A forma do remendo sai so da borda: a altura de cada ponto
 * minimiza a "dobra" (bilaplaciano) com a borda e o anel de triangulos em volta fixos.
 * Face plana da plano exato; face curva (parede redonda, esfera, sela) continua curva.
 */
import { ShapeUtils, Vector2 } from 'three';
import type { Malha } from './relevo';
import type { Segmentos } from './segmentar';

/** 'fora': a borda e a de fora da face -- o pedaco e o resto da peca, nao marca. */
export type Motivo = 'aberta' | 'fora' | 'borda' | 'curva' | 'alto' | 'raso';
export interface Remendo {
  /** Sopa de triangulos que entra no lugar do pedaco. */
  remendo: Float32Array;
  /** Area do remendo, mm2. */
  area: number;
  /** Quanto o pedaco se afasta do remendo (altura ou fundura da marca), mm. */
  altura: number;
}

/** Abaixo disto o pedaco nao muda a peca impressa. */
const ALTURA_IMPRESSA_MIN = 0.01; // mm
/**
 * Limite de triangulos do remendo (desempenho: a altura sai de um sistema resolvido
 * direto). Buraco grande ganha pontos mais espacados em vez de mais pontos.
 */
const TRIANGULOS_MAX = 800;

interface No { u: number; v: number; h: number; vid: number; fixo: boolean }

export function remendar(m: Malha, s: Segmentos, faces: readonly number[], alturaMax: number): Remendo | { motivo: Motivo } {
  const nt = m.t.length / 3;
  const dentro = new Uint8Array(nt);
  for (const f of faces) dentro[f] = 1;

  // Borda: arestas do pedaco que encostam no resto, no sentido dos triangulos do pedaco.
  const prox = new Map<number, number>();
  const anel = new Set<number>();
  for (const f of faces) {
    for (let e = 0; e < 3; e++) {
      const g = s.viz[f * 3 + e]!;
      if (g < 0) return { motivo: 'aberta' };
      if (dentro[g]) continue;
      const a = m.t[f * 3 + e]!;
      if (prox.has(a)) return { motivo: 'borda' }; // borda que se toca num ponto
      prox.set(a, m.t[f * 3 + ((e + 1) % 3)]!);
      anel.add(g);
    }
  }
  if (!prox.size) return { motivo: 'aberta' };
  const lacos: number[][] = [];
  const usado = new Set<number>();
  for (const a0 of prox.keys()) {
    if (usado.has(a0)) continue;
    const laco: number[] = [];
    let a = a0;
    while (!usado.has(a)) {
      usado.add(a);
      laco.push(a);
      const b = prox.get(a);
      if (b === undefined) return { motivo: 'aberta' };
      a = b;
    }
    if (a !== a0) return { motivo: 'borda' };
    lacos.push(laco);
  }

  // Referencial: a normal media da face em volta da borda.
  const N = [0, 0, 0];
  for (const g of anel) for (let k = 0; k < 3; k++) N[k]! += s.n[g * 3 + k]! * s.area[g]!;
  const lN = Math.hypot(N[0]!, N[1]!, N[2]!);
  if (!(lN > 0)) return { motivo: 'curva' };
  const n: [number, number, number] = [N[0]! / lN, N[1]! / lN, N[2]! / lN];
  const aux = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const t1 = normalizar(cruz(n, aux));
  const t2 = cruz(n, t1);
  const o = [0, 0, 0];
  let cont = 0;
  for (const l of lacos) for (const vi of l) { for (let k = 0; k < 3; k++) o[k]! += m.v[vi * 3 + k]!; cont++; }
  for (let k = 0; k < 3; k++) o[k]! /= cont;
  const proj = (vi: number): [number, number, number] => {
    const x = m.v[vi * 3]! - o[0]!, y = m.v[vi * 3 + 1]! - o[1]!, z = m.v[vi * 3 + 2]! - o[2]!;
    return [x * t1[0] + y * t1[1] + z * t1[2], x * t2[0] + y * t2[1] + z * t2[2], x * n[0] + y * n[1] + z * n[2]];
  };

  // Laco no sentido anti-horario contorna o buraco; horario e miolo (ilha) dentro dele.
  // Laco horario sem ninguem em volta: a borda e a de FORA da face -- o pedaco e o resto
  // da peca, nao uma marca no meio dela.
  const planos = lacos.map((l) => l.map((vi) => proj(vi)));
  const areas = planos.map(areaAssinada);
  const externos = areas.map((a, i) => (a > 0 ? i : -1)).filter((i) => i >= 0);
  if (!externos.length) return { motivo: 'fora' };
  const furosDe = new Map<number, number[]>(externos.map((i) => [i, []]));
  for (let i = 0; i < lacos.length; i++) {
    if (areas[i]! > 0) continue;
    const q = planos[i]![0]!;
    const dono = externos.filter((e) => dentroPoligono(q, planos[e]!)).sort((a, b) => areas[a]! - areas[b]!)[0];
    if (dono === undefined) return { motivo: 'fora' };
    furosDe.get(dono)!.push(i);
  }
  // Face em volta dobrando para tras do referencial: a marca da a volta na curva.
  for (const g of anel) if (s.area[g]! > 0 && s.n[g * 3]! * n[0] + s.n[g * 3 + 1]! * n[1] + s.n[g * 3 + 2]! * n[2] <= 0) return { motivo: 'curva' };
  if (cruzam(planos)) return { motivo: 'curva' };

  // Altura maxima grosseira antes do trabalho caro (o resto de uma peca grossa sai aqui).
  let hMinL = Infinity, hMaxL = -Infinity;
  for (const pl of planos) for (const q of pl) { hMinL = Math.min(hMinL, q[2]); hMaxL = Math.max(hMaxL, q[2]); }
  const vertsPedaco = new Set<number>();
  for (const f of faces) for (let e = 0; e < 3; e++) vertsPedaco.add(m.t[f * 3 + e]!);
  for (const vi of vertsPedaco) {
    const h = proj(vi)[2];
    if (h - hMaxL > alturaMax + (hMaxL - hMinL) || hMinL - h > alturaMax + (hMaxL - hMinL)) return { motivo: 'alto' };
  }

  // Triangula o buraco no plano do referencial.
  const nos: No[] = [];
  const noDe = new Map<number, number>();
  const noFixo = (vi: number) => {
    let k = noDe.get(vi);
    if (k === undefined) {
      const [u, v, h] = proj(vi);
      k = nos.length;
      nos.push({ u, v, h, vid: vi, fixo: true });
      noDe.set(vi, k);
    }
    return k;
  };
  let tris: number[] = [];
  for (const [e, furos] of furosDe) {
    const partes = [e, ...furos];
    const ids = partes.flatMap((i) => lacos[i]!.map(noFixo));
    const vec = (i: number) => planos[i]!.map((q) => new Vector2(q[0], q[1]));
    for (const [a, b, c] of ShapeUtils.triangulateShape(vec(e), furos.map(vec))) {
      const t = [ids[a!]!, ids[b!]!, ids[c!]!];
      if (orient(nos[t[0]!]!, nos[t[1]!]!, nos[t[2]!]!) < 0) [t[1], t[2]] = [t[2]!, t[1]!];
      tris.push(...t);
    }
  }
  if (!tris.length) return { motivo: 'curva' };

  // Refina (pontos por dentro para o remendo poder curvar) com a densidade da borda:
  // a escala de cada ponto da borda e a media das arestas dela ao lado dele.
  let area2d = 0;
  for (let i = 0; i < tris.length; i += 3) area2d += orient(nos[tris[i]!]!, nos[tris[i + 1]!]!, nos[tris[i + 2]!]!) / 2;
  const escalaMin = Math.sqrt(area2d / (0.433 * TRIANGULOS_MAX));
  const escala: number[] = [];
  lacos.forEach((l, i) => l.forEach((vi, j) => {
    const pl = planos[i]!, n = l.length;
    escala[noDe.get(vi)!] = Math.max(escalaMin, (dist2d(pl[j]!, pl[(j + 1) % n]!) + dist2d(pl[j]!, pl[(j + n - 1) % n]!)) / 2);
  }));
  tris = refinar(nos, tris, escala);

  // Altura dos pontos novos: bilaplaciano com borda e anel da face fixos.
  suavizar(m, nos, tris, noFixo, dentro, noDe);

  // Cada aresta da borda tem que estar no remendo, no sentido certo (malha fechada).
  const arestasRemendo = new Set<string>();
  for (let i = 0; i < tris.length; i += 3) for (let e = 0; e < 3; e++) arestasRemendo.add(`${tris[i + e]},${tris[i + ((e + 1) % 3)]}`);
  for (const [a, b] of prox) if (!arestasRemendo.has(`${noDe.get(a)},${noDe.get(b)}`)) return { motivo: 'curva' };

  // Quanto o pedaco se afasta do remendo.
  let altura = 0;
  for (const vi of vertsPedaco) {
    if (noDe.has(vi)) continue;
    const [u, v, h] = proj(vi);
    altura = Math.max(altura, Math.abs(h - alturaNoRemendo(nos, tris, u, v)));
  }
  if (altura > alturaMax + 1e-9) return { motivo: 'alto' };
  if (altura < ALTURA_IMPRESSA_MIN) return { motivo: 'raso' };

  const saida = new Float32Array(tris.length * 3);
  let area = 0;
  for (let i = 0; i < tris.length; i += 3) {
    const p = [0, 1, 2].map((e) => ponto3(m, nos[tris[i + e]!]!, o, t1, t2, n));
    p.forEach((q, e) => saida.set(q, (i + e) * 3));
    const x = cruz([p[1]![0]! - p[0]![0]!, p[1]![1]! - p[0]![1]!, p[1]![2]! - p[0]![2]!], [p[2]![0]! - p[0]![0]!, p[2]![1]! - p[0]![1]!, p[2]![2]! - p[0]![2]!]);
    area += Math.hypot(...x) / 2;
  }
  return { remendo: saida, area, altura };
}

// ---------- geometria 2D ----------

type P2 = readonly [number, number, ...number[]];
const orient = (a: { u: number; v: number }, b: { u: number; v: number }, c: { u: number; v: number }) => (b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u);
const dist2d = (a: P2, b: P2) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function areaAssinada(r: readonly P2[]): number {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i]!, q = r[(i + 1) % r.length]!;
    s += p[0] * q[1] - q[0] * p[1];
  }
  return s / 2;
}
function dentroPoligono(q: P2, r: readonly P2[]): boolean {
  let d = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i]!, b = r[j]!;
    if (a[1] > q[1] !== b[1] > q[1] && q[0] < ((b[0] - a[0]) * (q[1] - a[1])) / (b[1] - a[1]) + a[0]) d = !d;
  }
  return d;
}
/** Algum segmento dos lacos cruza outro (projecao nao e plana o bastante)? */
function cruzam(lacos: readonly (readonly P2[])[]): boolean {
  const seg: { a: P2; b: P2; l: number; i: number; n: number; x0: number; x1: number }[] = [];
  lacos.forEach((r, l) => r.forEach((a, i) => {
    const b = r[(i + 1) % r.length]!;
    seg.push({ a, b, l, i, n: r.length, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]) });
  }));
  seg.sort((p, q) => p.x0 - q.x0);
  const lado = (p: P2, q: P2, r: P2) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  for (let x = 0; x < seg.length; x++) {
    const s = seg[x]!;
    for (let y = x + 1; y < seg.length && seg[y]!.x0 <= s.x1; y++) {
      const t = seg[y]!;
      if (s.l === t.l && (Math.abs(s.i - t.i) === 1 || Math.abs(s.i - t.i) === s.n - 1)) continue; // vizinhos
      if (Math.max(s.a[1], s.b[1]) < Math.min(t.a[1], t.b[1]) || Math.max(t.a[1], t.b[1]) < Math.min(s.a[1], s.b[1])) continue;
      if (lado(s.a, s.b, t.a) * lado(s.a, s.b, t.b) < 0 && lado(t.a, t.b, s.a) * lado(t.a, t.b, s.b) < 0) return true;
    }
  }
  return false;
}

// ---------- refino ----------

/**
 * Refino de Liepa (2003): poe um ponto no centro do triangulo que esta grande para a
 * escala dos seus cantos, e troca diagonais ate ficar de Delaunay. A borda nao muda (e
 * compartilhada com a face em volta); a densidade de dentro acompanha a dela.
 */
const BASE = 1 << 20; // chave numerica da aresta (a * BASE + b)
function refinar(nos: No[], tris: number[], escala: number[]): number[] {
  const arestas = () => {
    const mapa = new Map<number, number[]>();
    for (let i = 0; i < tris.length; i += 3) {
      for (let e = 0; e < 3; e++) {
        const a = tris[i + e]!, b = tris[i + ((e + 1) % 3)]!;
        const k = a < b ? a * BASE + b : b * BASE + a;
        const l = mapa.get(k);
        if (l) l.push(i);
        else mapa.set(k, [i]);
      }
    }
    return mapa;
  };
  /** Terceiro vertice do triangulo i (fora da aresta a-b). */
  const oposto = (i: number, a: number, b: number) => [tris[i]!, tris[i + 1]!, tris[i + 2]!].find((x) => x !== a && x !== b)!;
  const delaunay = () => {
    for (let volta = 0; volta < 50; volta++) {
      let trocou = false;
      const sujo = new Set<number>();
      for (const [k, l] of arestas()) {
        if (l.length !== 2 || sujo.has(l[0]!) || sujo.has(l[1]!)) continue;
        const a = Math.floor(k / BASE), b = k % BASE;
        const [i, j] = l as [number, number];
        const c = oposto(i, a, b), d = oposto(j, a, b);
        // Em i, a aresta e a->b ou b->a; ajeita para (p, q, c) anti-horario com d do outro lado.
        const [p, q] = orient(nos[a]!, nos[b]!, nos[c]!) > 0 ? [a, b] : [b, a];
        if (!noCirculo(nos[p]!, nos[q]!, nos[c]!, nos[d]!)) continue;
        if (orient(nos[p]!, nos[d]!, nos[c]!) <= 0 || orient(nos[d]!, nos[q]!, nos[c]!) <= 0) continue; // quadrilatero concavo
        tris.splice(i, 3, p, d, c);
        tris.splice(j, 3, d, q, c);
        sujo.add(i).add(j);
        trocou = true;
      }
      if (!trocou) return;
    }
  };
  delaunay();
  const A = Math.SQRT2;
  for (let volta = 0; volta < 60 && tris.length / 3 < TRIANGULOS_MAX; volta++) {
    const novos: number[] = [];
    const n0 = tris.length;
    for (let i = 0; i < n0; i += 3) {
      const t = [tris[i]!, tris[i + 1]!, tris[i + 2]!] as const;
      const u = (nos[t[0]]!.u + nos[t[1]]!.u + nos[t[2]]!.u) / 3, v = (nos[t[0]]!.v + nos[t[1]]!.v + nos[t[2]]!.v) / 3;
      const sc = (escala[t[0]]! + escala[t[1]]! + escala[t[2]]!) / 3;
      if (!t.every((k) => { const d = A * Math.hypot(nos[k]!.u - u, nos[k]!.v - v); return d > sc && d > escala[k]!; })) continue;
      const c = nos.length;
      nos.push({ u, v, h: (nos[t[0]]!.h + nos[t[1]]!.h + nos[t[2]]!.h) / 3, vid: -1, fixo: false });
      escala[c] = sc;
      tris.splice(i, 3, t[0], t[1], c);
      novos.push(t[1], t[2], c, t[2], t[0], c);
    }
    if (!novos.length) break;
    tris.push(...novos);
    delaunay();
  }
  return tris;
}
function noCirculo(a: No, b: No, c: No, d: No): boolean {
  const ax = a.u - d.u, ay = a.v - d.v, bx = b.u - d.u, by = b.v - d.v, cx = c.u - d.u, cy = c.v - d.v;
  return (ax * ax + ay * ay) * (bx * cy - cx * by) - (bx * bx + by * by) * (ax * cy - cx * ay) + (cx * cx + cy * cy) * (ax * by - bx * ay) > 1e-12;
}

// ---------- altura por bilaplaciano ----------

/**
 * Minimiza a soma de (Laplaciano de h)^2 nos pontos da borda e de dentro, com a borda
 * e o anel de triangulos da face em volta fixos (sistema resolvido direto). Pesos de valor
 * medio: positivos e exatos para h linear, entao face plana fica plana.
 */
function suavizar(m: Malha, nos: No[], tris: number[], noFixo: (vi: number) => number, dentro: Uint8Array, noDe: Map<number, number>) {
  // Em ordem ao longo do eixo mais comprido: a matriz fica em faixa (Cholesky barato).
  let du = 0, dv = 0;
  for (const x of nos) { du = Math.max(du, Math.abs(x.u)); dv = Math.max(dv, Math.abs(x.v)); }
  const livres = nos.map((x, i) => (x.fixo ? -1 : i)).filter((i) => i >= 0).sort((a, b) => (du >= dv ? nos[a]!.u - nos[b]!.u : nos[a]!.v - nos[b]!.v));
  if (!livres.length) return;
  const borda = [...noDe.values()];
  // Triangulos em volta de cada no: os do remendo e, na borda, os da face ao lado.
  const estrela = new Map<number, number[][]>();
  const add = (t: number[]) => { for (const k of t) { const l = estrela.get(k); if (l) l.push(t); else estrela.set(k, [t]); } };
  for (let i = 0; i < tris.length; i += 3) add([tris[i]!, tris[i + 1]!, tris[i + 2]!]);
  const eBorda = new Set(borda.map((k) => nos[k]!.vid));
  const nt = m.t.length / 3;
  const daFace: number[][] = [];
  for (let f = 0; f < nt; f++) {
    if (dentro[f]) continue;
    const vs = [m.t[f * 3]!, m.t[f * 3 + 1]!, m.t[f * 3 + 2]!];
    if (vs.some((x) => eBorda.has(x))) daFace.push(vs);
  }
  for (const vs of daFace) {
    const t = vs.map(noFixo);
    for (const k of t) if (eBorda.has(nos[k]!.vid)) { const l = estrela.get(k); if (l) l.push(t); else estrela.set(k, [t]); }
  }
  // Linhas do operador: L_k h = sum_j w_kj (h_j - h_k) / sum_j w_kj.
  const linhas: { j: number[]; w: number[] }[] = [];
  for (const k of [...livres, ...borda]) {
    const pesos = new Map<number, number>();
    for (const t of estrela.get(k) ?? []) {
      const [j, l] = t.filter((x) => x !== k);
      if (j === undefined || l === undefined) continue; // triangulo com ponto repetido
      const a = nos[k]!, b = nos[j]!, c = nos[l]!;
      const ub = b.u - a.u, vb = b.v - a.v, uc = c.u - a.u, vc = c.v - a.v;
      const rb = Math.hypot(ub, vb), rc = Math.hypot(uc, vc);
      if (!(rb > 0 && rc > 0)) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, (ub * uc + vb * vc) / (rb * rc))));
      const tg = Math.tan(ang / 2);
      pesos.set(j, (pesos.get(j) ?? 0) + tg / rb);
      pesos.set(l, (pesos.get(l) ?? 0) + tg / rc);
    }
    const W = [...pesos.values()].reduce((x, y) => x + y, 0);
    if (!(W > 0)) continue;
    linhas.push({ j: [k, ...pesos.keys()], w: [-1, ...[...pesos.values()].map((x) => x / W)] });
  }
  // A x = b (x = alturas livres), em minimos quadrados: (A^T A) x = A^T b, por Cholesky.
  const col = new Int32Array(nos.length).fill(-1);
  livres.forEach((k, i) => (col[k] = i));
  const N = livres.length;
  const M = new Float64Array(N * N);
  const rhs = new Float64Array(N);
  for (const r of linhas) {
    let b = 0;
    const cs: number[] = [], ws: number[] = [];
    r.j.forEach((j, i) => {
      if (col[j]! >= 0) { cs.push(col[j]!); ws.push(r.w[i]!); }
      else b -= r.w[i]! * nos[j]!.h;
    });
    for (let x = 0; x < cs.length; x++) {
      rhs[cs[x]!]! += ws[x]! * b;
      for (let y = 0; y < cs.length; y++) M[cs[x]! * N + cs[y]!]! += ws[x]! * ws[y]!;
    }
  }
  const h = cholesky(M, rhs, N);
  if (h) livres.forEach((k, i) => (nos[k]!.h = h[i]!));
}

/**
 * Resolve M x = b com M simetrica positiva (N x N, por linhas). Null se nao for. So
 * percorre o envelope (da primeira coluna nao nula de cada linha ate a diagonal): o
 * fator de Cholesky nao sai dele.
 */
function cholesky(M: Float64Array, b: Float64Array, N: number): Float64Array | null {
  const ini = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    let k = 0;
    while (k < i && M[i * N + k] === 0) k++;
    ini[i] = k;
  }
  for (let i = 0; i < N; i++) {
    for (let j = ini[i]!; j <= i; j++) {
      let s = M[i * N + j]!;
      for (let k = Math.max(ini[i]!, ini[j]!); k < j; k++) s -= M[i * N + k]! * M[j * N + k]!;
      if (j < i) M[i * N + j] = s / M[j * N + j]!;
      else {
        if (!(s > 0)) return null;
        M[i * N + i] = Math.sqrt(s);
      }
    }
  }
  const y = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let s = b[i]!;
    for (let k = ini[i]!; k < i; k++) s -= M[i * N + k]! * y[k]!;
    y[i] = s / M[i * N + i]!;
  }
  for (let i = N - 1; i >= 0; i--) {
    y[i] = y[i]! / M[i * N + i]!;
    for (let k = ini[i]!; k < i; k++) y[k] = y[k]! - M[i * N + k]! * y[i]!;
  }
  return y;
}

function alturaNoRemendo(nos: No[], tris: number[], u: number, v: number): number {
  let melhor = -Infinity, h = 0;
  const q = { u, v };
  for (let i = 0; i < tris.length; i += 3) {
    const a = nos[tris[i]!]!, b = nos[tris[i + 1]!]!, c = nos[tris[i + 2]!]!;
    const A = orient(a, b, c);
    if (!(A > 0)) continue;
    const la = orient(q, b, c) / A, lb = orient(a, q, c) / A, lc = 1 - la - lb;
    const pior = Math.min(la, lb, lc);
    if (pior > melhor) [melhor, h] = [pior, la * a.h + lb * b.h + lc * c.h];
    if (pior >= 0) break;
  }
  return h;
}

// ---------- 3D ----------

function ponto3(m: Malha, x: No, o: number[], t1: number[], t2: number[], n: number[]): number[] {
  if (x.vid >= 0) return [m.v[x.vid * 3]!, m.v[x.vid * 3 + 1]!, m.v[x.vid * 3 + 2]!];
  return [0, 1, 2].map((k) => o[k]! + x.u * t1[k]! + x.v * t2[k]! + x.h * n[k]!);
}
function cruz(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
}
function normalizar(v: [number, number, number]): [number, number, number] {
  const L = Math.hypot(...v) || 1;
  return [v[0] / L, v[1] / L, v[2] / L];
}
