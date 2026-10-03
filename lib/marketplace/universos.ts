/**
 * Cores com que as pecas sao fotografadas dentro de um universo (as miniaturas 3D saem
 * pintadas no tema, nao nas cores do exemplo do gerador). Os mesmos tons dos tokens da
 * secao em styles/marca.css -- o teste confere que nao se separam.
 */
export const CASA = { creme: '#fbf6f0', linho: '#efe3d5', cobre: '#c27a57', cafe: '#3b2a22' } as const;

/** Paleta de cada bloco do topo da Casa: nunca a mesma cor do fundo do bloco. */
export const PALETAS_CASA = {
  sobreCobre: [CASA.creme, CASA.cafe, CASA.linho],
  sobreCafe: [CASA.creme, CASA.cobre, CASA.linho],
  sobreLinho: [CASA.cobre, CASA.cafe, CASA.creme],
};

/** Pecas do mosaico do topo da Casa (as que leem bem em bloco); se sair do ar, entra a proxima. */
export const VITRINE_CASA = ['luminaria-letra', 'suporte-foto-nome', 'cumbuca'];
