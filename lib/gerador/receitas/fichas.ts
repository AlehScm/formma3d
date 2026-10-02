/**
 * Vitrine dos geradores (id, nome, familia, resumo, destaques, exemplo), sem geometria:
 * o catalogo le daqui sem carregar three/clipper. Cada receita pega a sua ficha por
 * `ficha(id)`.
 */
import type { Valores } from '../tipos';

export interface Ficha {
  id: string;
  nome: string;
  /** Chave de `familias` em features/catalogo/catalogo.ts. */
  familia: 'texto' | 'placas' | 'chaveiros' | 'qr' | 'cortadores' | 'carimbos' | 'multicor' | 'parametricos';
  resumo: string;
  /** O que a pessoa recebe, em poucas palavras (etiquetas do card). */
  destaques: string[];
  /** Valores da miniatura do catalogo (por cima dos padroes; o gerador abre com os padroes). */
  exemplo?: Valores;
}

export const FICHAS: Ficha[] = [
  {
    id: 'palavra-camadas', nome: 'Palavra em camadas', familia: 'multicor',
    resumo: 'Uma ou duas linhas de texto em 2 ou 3 cores: base com contorno, meio e letras.',
    destaques: ['2 ou 3 cores', '1 ou 2 linhas', 'Emoji, coração ou SVG ao lado', 'Peça única ou encaixe'],
    exemplo: { linha1: 'Bolos', linha2: 'da Vovó', fonte1: 'luckiest-guy', fonte2: 'pacifico', razaoLinha2: 70, largura: 170, corBase: '#3a2338', corMeio: '#f6e7cf', corTopo: '#e2557a' },
  },
  {
    id: 'social-camadas', nome: '@ de rede social', familia: 'multicor',
    resumo: 'O seu @ em 2 ou 3 cores, para mesa, balcão ou parede.',
    destaques: ['Seu @ em 2 ou 3 cores', 'Coração, estrela ou logo', 'Base em contorno ou retângulo'],
    exemplo: { usuario: 'formma3d', adorno: 'coracao', larguraAdorno: 28, cores: '2', corBase: '#1d4ed8', corTopo: '#ffffff' },
  },
  {
    id: 'letras-separadas', nome: 'Letras separadas em camadas', familia: 'multicor',
    resumo: 'Cada letra é uma peça própria em 2 ou 3 cores, para montar a palavra na parede.',
    destaques: ['Uma peça por letra', '2 ou 3 cores', 'Até 50 cm de largura'],
    exemplo: { linha1: 'CASA', corBase: '#14532d', corMeio: '#f5f5f4', corTopo: '#f59e0b' },
  },
  {
    id: 'chaveiro-nome', nome: 'Chaveiro de nome em camadas', familia: 'chaveiros',
    resumo: 'Nome em 2 ou 3 cores com argola; até 9 nomes numa impressão.',
    destaques: ['Até 9 nomes por vez', '2 ou 3 cores', 'Argola e emoji'],
    exemplo: { nomes: 'Ana♥, Lu, Pedro, Bia', corBase: '#f5f5f4', corMeio: '#8a2346', corTopo: '#ffffff' },
  },
  {
    id: 'chaveiro-retangular', nome: 'Chaveiro retangular com nome', familia: 'chaveiros',
    resumo: 'Placa retangular com o nome ajustado à largura; nome completo ou até 9 nomes.',
    destaques: ['Nome completo em 2 linhas', 'Borda e contorno em 3 cores', 'Até 9 por vez'],
    exemplo: { nomes: 'Maria+Eduarda Silva', corPlaca: '#0f766e', corContorno: '#ffffff', corNome: '#0f172a' },
  },
];

export function ficha(id: string): Ficha {
  const f = FICHAS.find((x) => x.id === id);
  if (!f) throw new Error('Ficha de gerador desconhecida: ' + id);
  return f;
}
