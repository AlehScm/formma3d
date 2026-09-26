import type * as THREE from 'three';

// STL binario escrito direto das posicoes: 1/5 do tamanho do STL texto
// e sem perda de precisao por formatacao decimal.

const HEADER = 80;
const TRI = 50; // 12 floats + 2 bytes de atributo

/**
 * Sopa de triangulos (9 numeros por triangulo) -> STL binario. Sem three.js, para
 * a placa montada (`lib/print/placa.ts`) poder ser exportada e testada em Node.
 */
export function posicoesParaSTL(pos: ArrayLike<number>, nome = 'letra3d'): ArrayBuffer {
  const triangles = Math.floor(pos.length / 9);
  const buffer = new ArrayBuffer(HEADER + 4 + triangles * TRI);
  const view = new DataView(buffer);

  const header = 'Gerado por formma3d - ' + nome;
  for (let i = 0; i < Math.min(header.length, HEADER); i++) view.setUint8(i, header.charCodeAt(i) & 0x7f);
  view.setUint32(HEADER, triangles, true);

  let off = HEADER + 4;
  for (let t = 0; t < triangles; t++) {
    const b = t * 9;
    // Normal pela regra da mao direita: o fatiador usa a normal para saber dentro/fora.
    const ux = pos[b + 3]! - pos[b]!;
    const uy = pos[b + 4]! - pos[b + 1]!;
    const uz = pos[b + 5]! - pos[b + 2]!;
    const vx = pos[b + 6]! - pos[b]!;
    const vy = pos[b + 7]! - pos[b + 1]!;
    const vz = pos[b + 8]! - pos[b + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;

    view.setFloat32(off, nx / len, true);
    view.setFloat32(off + 4, ny / len, true);
    view.setFloat32(off + 8, nz / len, true);
    off += 12;
    for (let k = 0; k < 9; k++) {
      view.setFloat32(off, pos[b + k]!, true);
      off += 4;
    }
    view.setUint16(off, 0, true);
    off += 2;
  }
  return buffer;
}

/** Posicoes de uma BufferGeometry como sopa de triangulos (desindexa se preciso). */
export function posicoesDaGeometria(geometry: THREE.BufferGeometry): Float32Array {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.attributes.position;
  if (!pos) throw new Error('Geometria sem atributo de posicao');
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    out[i * 3] = pos.getX(i);
    out[i * 3 + 1] = pos.getY(i);
    out[i * 3 + 2] = pos.getZ(i);
  }
  if (geo !== geometry) geo.dispose();
  return out;
}

export function geometryToSTL(geometry: THREE.BufferGeometry, nome = 'letra3d'): ArrayBuffer {
  return posicoesParaSTL(posicoesDaGeometria(geometry), nome);
}
