import { produtosPublicos } from './consultas';
import type { Produto } from './tipos';

/**
 * Geradores que fazem qualquer letra ou palavra (a peca e feita das letras digitadas), na ordem
 * da vitrine. Todo produto publico de um deles entra; os ocultos ficam fora.
 */
export const GERADORES_DE_LETRA: string[] = [
  'letra-grande',
  'luminaria-letra',
  'cofrinho-nome',
  'palavra-camadas',
  'letras-separadas',
  'letreiro-sobreposto',
  'texto-com-guia',
  'social-camadas',
  'luminaria-social',
  'social-com-qr',
  'chaveiro-nome',
  'ima-nome',
  'etiqueta-planta',
  'marcador-taca',
  'tiara-nome',
  'arte-parede',
  'placa-nome',
  'etiqueta-cabo',
  'porta-canetas-nome',
  'porta-retrato-palavra',
  'nome-articulado',
  'chaveiro-logo-nome',
  'topo-bolo',
  'suporte-foto',
  'marcador-pagina',
  'carimbo-letras',
  'rosa-nome',
  'string-art',
];

const ordem = (p: Produto) => GERADORES_DE_LETRA.indexOf(p.gerador ?? '');

export function produtosLetras(): Produto[] {
  return produtosPublicos()
    .filter((p) => ordem(p) >= 0)
    .sort((a, b) => ordem(a) - ordem(b));
}
