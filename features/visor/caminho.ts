import type { Region } from '@/lib/geom/region';

// As formas vem de cache (mesmo objeto enquanto nao mudam): o texto do path tambem.
const CAMINHOS = new WeakMap<Region, string>();

/** Region (mm, Y para cima) para o `d` de um <path>. */
export function caminho(r: Region): string {
  const pronto = CAMINHOS.get(r);
  if (pronto !== undefined) return pronto;
  const anel = (pts: { x: number; y: number }[]) => (pts.length ? `M${pts.map((p) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join('L')}Z` : '');
  const d = r.map((p) => anel(p.outer) + p.holes.map(anel).join('')).join('');
  CAMINHOS.set(r, d);
  return d;
}
