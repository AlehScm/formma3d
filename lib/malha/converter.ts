/**
 * Ponte entre o mundo 2D (Region, clipper), o motor de malha (Manifold, CrossSection) e a
 * tela/arquivo (THREE.BufferGeometry, Malha). Tudo que recebe o motor so roda em comEscopo.
 */
import * as THREE from 'three';
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import { buildRegion, type Region } from '../geom/region';
import type { Motor } from './nucleo';
import { posicoesDaMalha, type Malha } from './tipos';

/** Region -> CrossSection. Par-impar: vale qualquer que seja o sentido dos contornos (espelhada inclusive). */
export function paraCrossSection(m: Motor, r: Region): CrossSection {
  const contornos: Vec2[][] = [];
  for (const p of r) {
    if (p.outer.length >= 3) contornos.push(p.outer.map((q): Vec2 => [q.x, q.y]));
    for (const h of p.holes) if (h.length >= 3) contornos.push(h.map((q): Vec2 => [q.x, q.y]));
  }
  // O construtor nao aceita lista vazia.
  return contornos.length ? new m.CrossSection(contornos, 'EvenOdd') : m.CrossSection.square([0, 0]);
}

/** CrossSection -> Region, com a hierarquia externo/furo refeita pelo clipper. */
export function paraRegion(cs: CrossSection): Region {
  return buildRegion(cs.toPolygons().map((c) => c.map(([x, y]) => ({ x, y }))), 'evenodd');
}

export function paraMalha(s: Manifold): Malha {
  const g = s.getMesh();
  const n = g.numProp;
  let pos = g.vertProperties;
  if (n !== 3) {
    pos = new Float32Array((g.vertProperties.length / n) * 3);
    for (let v = 0, k = 0; v < g.vertProperties.length; v += n, k += 3) pos.set(g.vertProperties.subarray(v, v + 3), k);
  }
  return { pos, tri: g.triVerts, runIndex: g.runIndex, runOriginalID: g.runOriginalID };
}

/** Malha -> Manifold. Os runs (de qual solido veio cada face) seguem junto. */
export function doMalha(m: Motor, malha: Malha): Manifold {
  return m.Manifold.ofMesh(
    new m.Mesh({ numProp: 3, vertProperties: malha.pos, triVerts: malha.tri, runIndex: malha.runIndex, runOriginalID: malha.runOriginalID })
  );
}

/**
 * Malha -> geometria da tela, sem indice (cada triangulo com sua normal: aresta viva, como
 * peca impressa). `grupoDe` da o material de cada solido de origem; runs vizinhos com o mesmo
 * material viram um grupo so.
 */
export function paraGeometria(malha: Malha, grupoDe: (originalID: number) => number = () => 0): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(posicoesDaMalha(malha), 3));
  g.computeVertexNormals();
  const grupos: { de: number; ate: number; grupo: number }[] = [];
  for (let i = 0; i < malha.runOriginalID.length; i++) {
    const de = malha.runIndex[i]!;
    const ate = malha.runIndex[i + 1] ?? malha.tri.length;
    const grupo = grupoDe(malha.runOriginalID[i]!);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.grupo === grupo && ultimo.ate === de) ultimo.ate = ate;
    else grupos.push({ de, ate, grupo });
  }
  for (const x of grupos) g.addGroup(x.de, x.ate - x.de, x.grupo);
  return g;
}
