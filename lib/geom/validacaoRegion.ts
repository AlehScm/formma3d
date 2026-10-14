import type { Region } from './region';

const pontoValido = (p: unknown): boolean => !!p && typeof p === 'object' &&
  !Array.isArray(p) &&
  typeof (p as { x?: unknown }).x === 'number' && Number.isFinite((p as { x: number }).x) &&
  typeof (p as { y?: unknown }).y === 'number' && Number.isFinite((p as { y: number }).y);

const anelValido = (anel: unknown): boolean => {
  if (!Array.isArray(anel) || anel.length < 3) return false;
  for (const ponto of anel) if (!pontoValido(ponto)) return false;
  return true;
};

export function validarRegion(valor: unknown): valor is Region {
  if (!Array.isArray(valor)) return false;
  for (const poligono of valor) {
    if (!poligono || typeof poligono !== 'object' || Array.isArray(poligono)) return false;
    const p = poligono as { outer?: unknown; holes?: unknown };
    if (!anelValido(p.outer) || !Array.isArray(p.holes)) return false;
    for (const hole of p.holes) if (!anelValido(hole)) return false;
  }
  return true;
}
