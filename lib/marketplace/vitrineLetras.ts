/**
 * Slides do topo da landing de letras (/letra-caixa): o texto, as cores do fundo e a receita da
 * peca 3D de cada um. O script gerar-vitrine-letras le as receitas e gera as malhas no build
 * (public/vitrine-letras); o topo le o resto. Mudou uma peca aqui: rode o script.
 */
import type { Valores } from '../gerador/tipos';

/** Letra caixa: geometria do editor (lib/geom), face e lateral em materiais diferentes. */
export interface PecaLetraCaixa { tipo: 'letra-caixa'; texto: string; fonte: string; altura: number; profundidade: number; face: string; lateral: string }
/** Peca de um gerador da loja, montada (como fica pronta), com o exemplo da ficha + `valores`. */
export interface PecaGerador { tipo: 'gerador'; gerador: string; valores: Valores; difusor?: string[] }
export type PecaVitrine = PecaLetraCaixa | PecaGerador;

export interface SlideLetras {
  /** Nome dos arquivos em public/vitrine-letras. */
  id: string;
  titulo: string;
  apoio: string;
  alt: string;
  fundo: string;
  tinta: string;
  botao: string;
  botaoTexto: string;
  peca: PecaVitrine;
}

export const SLIDES_LETRAS: SlideLetras[] = [
  {
    id: 'letra-caixa', titulo: 'Letra caixa', alt: 'Letra caixa CAFÉ impressa em 3D, face branca e lateral azul-marinho',
    apoio: 'Letras em 3D para recepção, loja, quarto ou sala, na fonte e no tamanho que você quiser.',
    fundo: '#2760A2', tinta: '#FFFFFF', botao: '#FFFFFF', botaoTexto: '#14213D',
    peca: { tipo: 'letra-caixa', texto: 'CAFÉ', fonte: 'anton', altura: 100, profundidade: 24, face: '#F6F4EE', lateral: '#14213D' },
  },
  {
    id: 'camadas', titulo: 'Letreiro em camadas', alt: 'Letreiro Luna em três camadas de cor impresso em 3D',
    apoio: 'O nome em camadas de cor, para quarto, parede, balcão ou festa.',
    fundo: '#0F5257', tinta: '#FFFFFF', botao: '#FFFFFF', botaoTexto: '#14213D',
    peca: { tipo: 'gerador', gerador: 'palavra-camadas', valores: { linha1: 'Luna', fonte1: 'pacifico', linha2: '', corBase: '#F2B705', corMeio: '#FFFFFF', corTopo: '#14213D' } },
  },
  {
    id: 'letra-nome', titulo: 'Letra grande com nome', alt: 'Letra L com o nome Luna encaixado, impressa em 3D',
    apoio: 'A inicial em destaque com o nome encaixado nela.',
    fundo: '#6B1E2E', tinta: '#FFFFFF', botao: '#FFFFFF', botaoTexto: '#14213D',
    peca: { tipo: 'gerador', gerador: 'letra-grande', valores: { letra: 'L', nome: 'Luna', corLetra: '#F6F1E7', corNome: '#E9B949' } },
  },
  {
    id: 'luminaria', titulo: 'Luminária de letra', alt: 'Luminária da letra A acesa, com o nome Alice na frente',
    apoio: 'A letra que acende, com o nome na frente. Para quarto, loja ou evento.',
    fundo: '#14213D', tinta: '#FFFFFF', botao: '#FFFFFF', botaoTexto: '#14213D',
    peca: { tipo: 'gerador', gerador: 'luminaria-letra', valores: { letra: 'A', nome: 'Alice', corLetra: '#F2B705', corTampa: '#FFF6DE', corNome: '#14213D' }, difusor: ['Frente'] },
  },
  {
    id: 'separadas', titulo: 'Letras separadas', alt: 'Letras CASA separadas, em camadas de cor, impressas em 3D',
    apoio: 'Cada letra solta, para montar na parede do seu jeito.',
    fundo: '#F2B705', tinta: '#14213D', botao: '#14213D', botaoTexto: '#FFFFFF',
    peca: { tipo: 'gerador', gerador: 'letras-separadas', valores: { linha1: 'CASA', corBase: '#14213D', corMeio: '#FFFFFF', corTopo: '#2760A2' } },
  },
];

/** O que cada arquivo .json de public/vitrine-letras descreve (o .bin ao lado tem os numeros). */
export interface MalhaVitrine {
  versao: 1;
  /** Caixa da peca inteira, em mm, ja centrada na origem (X direita, Y para cima, Z para quem olha). */
  min: [number, number, number];
  max: [number, number, number];
  partes: {
    nome: string;
    /** face/lateral: letra caixa; difusor: frente de luminaria (acende); peca: o resto. */
    papel: 'face' | 'lateral' | 'difusor' | 'peca';
    cor: string;
    vertices: number;
    indices: number;
    /** Bytes no .bin: posicoes Int16 (3 por vertice), normais Int8 (3 por vertice), indices Uint16/Uint32. */
    posicoes: number;
    normais: number;
    triangulos: number;
    indice32: boolean;
  }[];
}

export const PASTA_VITRINE = 'vitrine-letras';

/** Arquivo da peca de um produto de letra (cards da esteira). */
export const idDoProduto = (slug: string) => `produto-${slug}`;

/** Nos cards a peca balanca ate este angulo (rad) para cada lado: mostra a profundidade sem virar de costas (texto espelhado). */
export const BALANCO_CARDS = 0.6;
