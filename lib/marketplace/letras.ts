import { porSlug } from './consultas';
import type { Produto } from './tipos';

/** Pecas de letra em 3D, na ordem da vitrine. Os ocultos ficam fora: porSlug so devolve o publico. */
export const SLUGS_LETRAS: string[] = [
  'letra-grande-nome',
  'letreiro-nome-camadas',
  'letras-separadas',
  'letreiro-sobreposto',
  'luminaria-letra',
  'arroba-social',
  'luminaria-social',
  'texto-com-guia',
];

export function produtosLetras(): Produto[] {
  return SLUGS_LETRAS.map((slug) => porSlug(slug)).filter((p): p is Produto => p !== undefined);
}
