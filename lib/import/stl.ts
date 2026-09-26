/**
 * Leitura de STL (binario e ASCII) para objeto de placa.
 *
 * O STL nao vira letra caixa: e um objeto pronto que so divide a mesa com as
 * pecas do letreiro. Por isso o resultado e uma "sopa de triangulos" (Float32Array,
 * 9 numeros por triangulo), o formato que `lib/export/stl.ts` escreve e que o
 * three.js desenha direto.
 *
 * Unidade assumida: mm (e o que Bambu Studio, Prusa e Cura usam).
 */

export interface MalhaStl {
  /** x,y,z de cada vertice, 3 vertices por triangulo. */
  posicoes: Float32Array;
  triangulos: number;
  min: [number, number, number];
  max: [number, number, number];
}

function limites(p: Float32Array): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = p[i + k]!;
      if (v < min[k]!) min[k] = v;
      if (v > max[k]!) max[k] = v;
    }
  }
  return { min, max };
}

/**
 * Binario ou ASCII? O cabecalho binario pode comecar com "solid" (varios
 * exportadores fazem isso), entao a prova e o tamanho: 84 + 50 bytes por triangulo.
 */
function ehBinario(buf: ArrayBuffer): boolean {
  if (buf.byteLength >= 84 && 84 + new DataView(buf).getUint32(80, true) * 50 === buf.byteLength) return true;
  const inicio = new TextDecoder('latin1').decode(new Uint8Array(buf, 0, Math.min(2048, buf.byteLength)));
  return !(/^\s*solid\b/.test(inicio) && /facet/.test(inicio));
}

function lerBinario(buf: ArrayBuffer): Float32Array {
  const v = new DataView(buf);
  const n = v.getUint32(80, true);
  const out = new Float32Array(n * 9);
  let o = 84;
  for (let t = 0; t < n; t++) {
    o += 12; // normal: recalculada por quem precisar
    for (let k = 0; k < 9; k++) {
      out[t * 9 + k] = v.getFloat32(o, true);
      o += 4;
    }
    o += 2; // atributo
  }
  return out;
}

function lerAscii(buf: ArrayBuffer): Float32Array {
  const txt = new TextDecoder('latin1').decode(buf);
  const nums: number[] = [];
  const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(txt))) nums.push(Number(m[1]), Number(m[2]), Number(m[3]));
  // Descarta vertice solto de triangulo incompleto (arquivo cortado).
  return new Float32Array(nums.slice(0, nums.length - (nums.length % 9)));
}

/**
 * Le o STL e assenta na mesa: menor Z vai para 0, e o centro em XY vai para a
 * origem -- a posicao do arquivo nao significa nada na placa, quem decide e o arranjo.
 */
export function lerStl(buf: ArrayBuffer): MalhaStl {
  const p = ehBinario(buf) ? lerBinario(buf) : lerAscii(buf);
  if (!p.length || p.some((x) => !Number.isFinite(x))) throw new Error('STL vazio ou corrompido.');
  const { min, max } = limites(p);
  const cx = (min[0] + max[0]) / 2;
  const cy = (min[1] + max[1]) / 2;
  const z0 = min[2];
  for (let i = 0; i < p.length; i += 3) {
    p[i] = p[i]! - cx;
    p[i + 1] = p[i + 1]! - cy;
    p[i + 2] = p[i + 2]! - z0;
  }
  const l = limites(p);
  return { posicoes: p, triangulos: p.length / 9, min: l.min, max: l.max };
}

/** Volume da malha fechada (teorema da divergencia), em mm3. Serve para gramas e teste. */
export function volumeMalha(p: Float32Array): number {
  let v = 0;
  for (let i = 0; i < p.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = [p[i]!, p[i + 1]!, p[i + 2]!, p[i + 3]!, p[i + 4]!, p[i + 5]!, p[i + 6]!, p[i + 7]!, p[i + 8]!];
    v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return Math.abs(v) / 6;
}
