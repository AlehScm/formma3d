/**
 * Malha solida em dados puros (sem objeto WASM): cabe em useMemo, worker e teste. So posicao
 * (3 numeros por vertice), triangulos por indice e os trechos (runs) de triangulos que vieram
 * de cada solido de origem (`runOriginalID`), que e o que guarda o papel de cada face.
 */
export interface Malha {
  pos: Float32Array;
  tri: Uint32Array;
  /** Run i: triangulos de tri[runIndex[i]] a tri[runIndex[i+1]] (indices de tri, multiplos de 3). */
  runIndex: Uint32Array;
  runOriginalID: Uint32Array;
}

export interface Caixa3 {
  min: [number, number, number];
  max: [number, number, number];
}

export const MALHA_VAZIA: Malha = { pos: new Float32Array(0), tri: new Uint32Array(0), runIndex: new Uint32Array([0]), runOriginalID: new Uint32Array(0) };

export const malhaVazia = (m: Malha) => m.tri.length === 0;

/**
 * Os ids de origem dos trechos que tem triangulo. Depois de uma booleana, a manifold deixa um
 * trecho para cada solido de entrada, mesmo o que ficou vazio naquele pedaco.
 */
export function idsComFaces(m: Malha): number[] {
  const out: number[] = [];
  for (let i = 0; i < m.runOriginalID.length; i++) if ((m.runIndex[i + 1] ?? m.tri.length) > m.runIndex[i]!) out.push(m.runOriginalID[i]!);
  return out;
}

/** Varias malhas numa so, cada uma uma casca separada (sem vertice em comum); os trechos de cada uma seguem. */
export function juntarMalhas(ms: Malha[]): Malha {
  const pos = new Float32Array(ms.reduce((s, m) => s + m.pos.length, 0));
  const tri = new Uint32Array(ms.reduce((s, m) => s + m.tri.length, 0));
  const runs = ms.reduce((s, m) => s + m.runOriginalID.length, 0);
  const runIndex = new Uint32Array(runs + 1), runOriginalID = new Uint32Array(runs);
  let p = 0, t = 0, r = 0;
  for (const m of ms) {
    pos.set(m.pos, p);
    for (let i = 0; i < m.tri.length; i++) tri[t + i] = m.tri[i]! + p / 3;
    for (let i = 0; i < m.runOriginalID.length; i++) {
      runIndex[r + i] = m.runIndex[i]! + t;
      runOriginalID[r + i] = m.runOriginalID[i]!;
    }
    p += m.pos.length;
    t += m.tri.length;
    r += m.runOriginalID.length;
  }
  runIndex[runs] = t;
  return { pos, tri, runIndex, runOriginalID };
}

export function caixaDaMalha(m: Malha): Caixa3 {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m.pos.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = m.pos[i + k]!;
      if (v < min[k]!) min[k] = v;
      if (v > max[k]!) max[k] = v;
    }
  }
  return { min, max };
}

/** Volume pelo teorema da divergencia: vale porque a malha e fechada. */
export function volumeDaMalha(m: Malha): number {
  const p = m.pos;
  let v = 0;
  for (let t = 0; t < m.tri.length; t += 3) {
    const a = m.tri[t]! * 3, b = m.tri[t + 1]! * 3, c = m.tri[t + 2]! * 3;
    v += p[a]! * (p[b + 1]! * p[c + 2]! - p[b + 2]! * p[c + 1]!)
      - p[a + 1]! * (p[b]! * p[c + 2]! - p[b + 2]! * p[c]!)
      + p[a + 2]! * (p[b]! * p[c + 1]! - p[b + 1]! * p[c]!);
  }
  return v / 6;
}

/** Sopa de triangulos (9 numeros por triangulo): o formato do STL e do 3MF. */
export function posicoesDaMalha(m: Malha): Float32Array {
  const out = new Float32Array(m.tri.length * 3);
  for (let i = 0; i < m.tri.length; i++) {
    const v = m.tri[i]! * 3;
    out[i * 3] = m.pos[v]!;
    out[i * 3 + 1] = m.pos[v + 1]!;
    out[i * 3 + 2] = m.pos[v + 2]!;
  }
  return out;
}
