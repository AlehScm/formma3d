/**
 * Solidos a partir do 2D e medidas do solido de volta em 2D. Rodam dentro de comEscopo.
 */
import type { Manifold } from 'manifold-3d';
import type { Region } from '../geom/region';
import type { Motor } from './nucleo';
import { paraCrossSection, paraRegion } from './converter';

/** Prisma reto: a regiao extrudada de z0 a z1. */
export function prisma(m: Motor, r: Region, z0: number, z1: number): Manifold {
  return paraCrossSection(m, r).extrude(z1 - z0).translate([0, 0, z0]);
}

/** Secao do solido na altura z. */
export const fatia = (s: Manifold, z: number): Region => paraRegion(s.slice(z));

/** Sombra do solido vista de cima (o footprint na mesa). */
export const projecao = (s: Manifold): Region => paraRegion(s.project());
