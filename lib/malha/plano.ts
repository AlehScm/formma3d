/**
 * Plano de corte inclinado: a rotacao que o deita em z = 0 (normal para +Z) e a volta.
 * Matrizes 4x4 afins em coluna-maior, como a manifold (Manifold.transform) e o THREE.Matrix4.
 */
import type { Malha } from './tipos';

export type Matriz = number[];
type V3 = [number, number, number];

/** A normal do plano: inclinado `inclinacao` graus a partir de +Z, descendo para o lado `direcao` (graus a partir de +X). */
export function normalDoPlano(inclinacao: number, direcao: number): V3 {
  const i = (inclinacao * Math.PI) / 180, d = (direcao * Math.PI) / 180;
  return [Math.sin(i) * Math.cos(d), Math.sin(i) * Math.sin(d), Math.cos(i)];
}

/** Matriz afim de rotacao `r` (linhas) e translacao `t`, em coluna-maior. */
const afim = (r: number[][], t: V3): Matriz => [
  r[0]![0]!, r[1]![0]!, r[2]![0]!, 0,
  r[0]![1]!, r[1]![1]!, r[2]![1]!, 0,
  r[0]![2]!, r[1]![2]!, r[2]![2]!, 0,
  t[0], t[1], t[2], 1,
];

/**
 * `ida` leva o plano (pelo ponto `p`, normal `n`) para z = 0 com a normal para +Z; `volta` desfaz.
 * A rotacao gira em torno de n x Z (Rodrigues), entao o que esta em cima do plano fica em cima.
 */
export function deitarPlano(n: V3, p: V3): { ida: Matriz; volta: Matriz } {
  const len = Math.hypot(...n);
  const u: V3 = [n[0] / len, n[1] / len, n[2] / len];
  const c = u[2]; // cos do angulo entre n e Z
  const kx = u[1], ky = -u[0]; // n x Z, sem normalizar (|k| = sen)
  const s = Math.hypot(kx, ky);
  let r: number[][];
  if (s < 1e-12) {
    r = c > 0 ? [[1, 0, 0], [0, 1, 0], [0, 0, 1]] : [[1, 0, 0], [0, -1, 0], [0, 0, -1]];
  } else {
    const ax = kx / s, ay = ky / s; // eixo unitario (az = 0)
    const t = 1 - c;
    r = [
      [c + ax * ax * t, ax * ay * t, ay * s],
      [ax * ay * t, c + ay * ay * t, -ax * s],
      [-ay * s, ax * s, c],
    ];
  }
  const rp: V3 = [0, 1, 2].map((i) => -(r[i]![0]! * p[0] + r[i]![1]! * p[1] + r[i]![2]! * p[2])) as V3;
  const rt = [0, 1, 2].map((i) => [r[0]![i]!, r[1]![i]!, r[2]![i]!]);
  return { ida: afim(r, rp), volta: afim(rt, p) };
}

/** a * b (aplica b, depois a). */
export function compor(a: Matriz, b: Matriz): Matriz {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++) for (let lin = 0; lin < 4; lin++) for (let k = 0; k < 4; k++) out[col * 4 + lin]! += a[k * 4 + lin]! * b[col * 4 + k]!;
  return out;
}

export const transladar = (x: number, y: number, z: number): Matriz => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];

export const aplicar = (m: Matriz, x: number, y: number, z: number): V3 => [
  m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
  m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
  m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
];

/** A malha com os vertices transformados (rotacao + translacao: o sentido das faces nao muda). */
export function transformarMalha(malha: Malha, m: Matriz): Malha {
  const pos = new Float32Array(malha.pos.length);
  for (let i = 0; i < pos.length; i += 3) pos.set(aplicar(m, malha.pos[i]!, malha.pos[i + 1]!, malha.pos[i + 2]!), i);
  return { ...malha, pos };
}

/** A inversa de uma rotacao + translacao: a rotacao transposta, e a translacao desfeita. */
export function inverterRigida(m: Matriz): Matriz {
  const r = [0, 1, 2].map((lin) => [m[lin]!, m[4 + lin]!, m[8 + lin]!]);
  const rt = [0, 1, 2].map((i) => [r[0]![i]!, r[1]![i]!, r[2]![i]!]);
  const t: [number, number, number] = [m[12]!, m[13]!, m[14]!];
  const novaT = [0, 1, 2].map((i) => -(rt[i]![0]! * t[0] + rt[i]![1]! * t[1] + rt[i]![2]! * t[2])) as [number, number, number];
  return [rt[0]![0]!, rt[1]![0]!, rt[2]![0]!, 0, rt[0]![1]!, rt[1]![1]!, rt[2]![1]!, 0, rt[0]![2]!, rt[1]![2]!, rt[2]![2]!, 0, novaT[0], novaT[1], novaT[2], 1];
}
