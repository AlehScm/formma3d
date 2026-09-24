import type * as THREE from 'three';

// STL binario escrito direto da BufferGeometry: 1/5 do tamanho do STL texto
// e sem perda de precisao por formatacao decimal.

const HEADER = 80;
const TRI = 50; // 12 floats + 2 bytes de atributo

export function geometryToSTL(geometry: THREE.BufferGeometry, nome = 'letra3d'): ArrayBuffer {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.attributes.position;
  if (!pos) throw new Error('Geometria sem atributo de posicao');

  const triangles = Math.floor(pos.count / 3);
  const buffer = new ArrayBuffer(HEADER + 4 + triangles * TRI);
  const view = new DataView(buffer);

  const header = 'Gerado por letra3d - ' + nome;
  for (let i = 0; i < Math.min(header.length, HEADER); i++) view.setUint8(i, header.charCodeAt(i) & 0x7f);
  view.setUint32(HEADER, triangles, true);

  let off = HEADER + 4;
  const ax = [0, 0, 0];
  const ay = [0, 0, 0];
  const az = [0, 0, 0];

  for (let t = 0; t < triangles; t++) {
    for (let v = 0; v < 3; v++) {
      const i = t * 3 + v;
      ax[v] = pos.getX(i);
      ay[v] = pos.getY(i);
      az[v] = pos.getZ(i);
    }
    // Normal pela regra da mao direita: o fatiador usa a normal para saber dentro/fora.
    const ux = ax[1]! - ax[0]!;
    const uy = ay[1]! - ay[0]!;
    const uz = az[1]! - az[0]!;
    const vx = ax[2]! - ax[0]!;
    const vy = ay[2]! - ay[0]!;
    const vz = az[2]! - az[0]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;

    view.setFloat32(off, nx / len, true);
    view.setFloat32(off + 4, ny / len, true);
    view.setFloat32(off + 8, nz / len, true);
    off += 12;
    for (let v = 0; v < 3; v++) {
      view.setFloat32(off, ax[v]!, true);
      view.setFloat32(off + 4, ay[v]!, true);
      view.setFloat32(off + 8, az[v]!, true);
      off += 12;
    }
    view.setUint16(off, 0, true);
    off += 2;
  }

  if (geo !== geometry) geo.dispose();
  return buffer;
}
