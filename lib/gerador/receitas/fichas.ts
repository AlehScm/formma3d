/**
 * Vitrine dos geradores (id, nome, familia, resumo), sem geometria: o catalogo le daqui
 * sem carregar three/clipper. Cada receita pega a sua ficha por `ficha(id)`.
 */
export interface Ficha {
  id: string;
  nome: string;
  /** Chave de `familias` em features/catalogo/catalogo.ts. */
  familia: 'texto' | 'placas' | 'chaveiros' | 'qr' | 'cortadores' | 'carimbos' | 'multicor' | 'parametricos';
  resumo: string;
}

export const FICHAS: Ficha[] = [
  { id: 'palavra-camadas', nome: 'Palavra em camadas', familia: 'multicor', resumo: 'Uma ou duas linhas de texto em 2 ou 3 cores: base com contorno, meio e letras.' },
  { id: 'social-camadas', nome: '@ de rede social', familia: 'multicor', resumo: 'O seu @ em 2 ou 3 cores, para mesa, balcão ou parede.' },
  { id: 'letras-separadas', nome: 'Letras separadas em camadas', familia: 'multicor', resumo: 'Cada letra é uma peça própria em 2 ou 3 cores, para montar a palavra na parede.' },
  { id: 'chaveiro-nome', nome: 'Chaveiro de nome em camadas', familia: 'chaveiros', resumo: 'Nome em 2 ou 3 cores com argola; até 9 nomes numa impressão.' },
  { id: 'chaveiro-retangular', nome: 'Chaveiro retangular com nome', familia: 'chaveiros', resumo: 'Placa retangular com o nome ajustado à largura; nome completo ou até 9 nomes.' },
];

export function ficha(id: string): Ficha {
  const f = FICHAS.find((x) => x.id === id);
  if (!f) throw new Error('Ficha de gerador desconhecida: ' + id);
  return f;
}
