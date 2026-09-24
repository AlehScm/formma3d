import type { Pt } from './region';

// Achatamento de bezier compartilhado entre o caminho de fonte (opentype) e o de
// arquivo importado (PDF/AI). Tolerancia em mm, menor que a resolucao de qualquer FDM.
export const FLAT_TOL = 0.05;

export function segmentsFor(chordLen: number): number {
  return Math.max(3, Math.min(64, Math.ceil(Math.sqrt(chordLen / FLAT_TOL))));
}

/**
 * Bezier quadratica p0->p1 com controle c. Empurra os pontos de i=1..n em `out`,
 * sem reemitir p0 -- o chamador ja tem o ponto corrente na lista.
 */
export function flattenQuad(p0: Pt, c: Pt, p1: Pt, out: Pt[]): void {
  const n = segmentsFor(Math.hypot(p1.x - p0.x, p1.y - p0.y) + Math.hypot(c.x - p0.x, c.y - p0.y));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({
      x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
      y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
    });
  }
}

/** Bezier cubica p0->p1 com controles c1 e c2. Mesma convencao de `flattenQuad`. */
export function flattenCubic(p0: Pt, c1: Pt, c2: Pt, p1: Pt, out: Pt[]): void {
  const n = segmentsFor(
    Math.hypot(c1.x - p0.x, c1.y - p0.y) + Math.hypot(c2.x - c1.x, c2.y - c1.y) + Math.hypot(p1.x - c2.x, p1.y - c2.y)
  );
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
    });
  }
}
