/**
 * Cores com que as pecas sao fotografadas dentro de um universo (as miniaturas 3D saem
 * pintadas no tema, nao nas cores do exemplo do gerador). Os mesmos tons dos tokens da
 * secao em styles/marca.css -- o teste confere que nao se separam.
 */
export const CASA = { creme: '#f7f8fa', linho: '#f3eee6', cobre: '#c8b79e', cafe: '#8e7b66', texto: '#3f3933' } as const;

/** Paleta de cada bloco do topo da Casa: nunca a mesma cor do fundo do bloco. */
export const PALETAS_CASA = {
  sobreCobre: [CASA.creme, CASA.texto, CASA.cafe],
  sobreCafe: [CASA.creme, CASA.cobre, CASA.texto],
  sobreLinho: [CASA.cobre, CASA.texto, CASA.cafe],
};

/** Pecas do mosaico do topo da Casa (as que leem bem em bloco); se sair do ar, entra a proxima. */
export const VITRINE_CASA = ['luminaria-letra', 'suporte-foto-nome', 'cumbuca'];
