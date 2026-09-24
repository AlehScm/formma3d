import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import type { Region } from './region';
import type { Layer, Part, Role } from './modes';

/** Region -> THREE.Shape[], com buracos como Path internos. */
export function regionToShapes(region: Region): THREE.Shape[] {
  const shapes: THREE.Shape[] = [];
  for (const poly of region) {
    if (poly.outer.length < 3) continue;
    const shape = new THREE.Shape(poly.outer.map((p) => new THREE.Vector2(p.x, p.y)));
    for (const h of poly.holes) {
      if (h.length < 3) continue;
      shape.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p.x, p.y))));
    }
    shapes.push(shape);
  }
  return shapes;
}

/** Uma camada (Region + faixa de Z) -> prisma reto. */
export function layerToGeometry(layer: Pick<Layer, 'region' | 'z0' | 'z1'>): THREE.BufferGeometry | null {
  const shapes = regionToShapes(layer.region);
  if (!shapes.length) return null;
  const depth = layer.z1 - layer.z0;
  if (depth <= 0) return null;
  const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geo.translate(0, 0, layer.z0);
  return geo;
}

/**
 * Agrupa as camadas por papel (face, parede, bolsao...) para o preview colorir cada
 * funcao com cor propria: e o que faz o corte da peca ficar obvio de relance.
 */
export function partToGeometriesByRole(part: Pick<Part, 'layers'>): Map<Role, THREE.BufferGeometry> {
  const byRole = new Map<Role, THREE.BufferGeometry[]>();
  for (const layer of part.layers) {
    const geo = layerToGeometry(layer);
    if (!geo) continue;
    const lista = byRole.get(layer.role);
    if (lista) lista.push(geo);
    else byRole.set(layer.role, [geo]);
  }
  const out = new Map<Role, THREE.BufferGeometry>();
  for (const [role, geos] of byRole) {
    out.set(role, geos.length === 1 ? geos[0]! : BufferGeometryUtils.mergeGeometries(geos, false));
  }
  return out;
}

/** Malha unica da peca, para exportar STL. */
export function partToGeometry(part: Pick<Part, 'layers'>): THREE.BufferGeometry | null {
  const geos: THREE.BufferGeometry[] = [];
  for (const layer of part.layers) {
    const geo = layerToGeometry(layer);
    if (geo) geos.push(geo);
  }
  if (!geos.length) return null;
  return geos.length === 1 ? geos[0]! : BufferGeometryUtils.mergeGeometries(geos, false);
}
