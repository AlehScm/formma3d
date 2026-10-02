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
  /** Etiqueta do card ("Festa", "Pet"...); sem ela, a da familia. */
  tipo?: string;
  /** O que a pessoa recebe, em poucas palavras (etiquetas do card). */
  destaques: string[];
  /** Valores da miniatura do catalogo (por cima dos padroes; o gerador abre com os padroes). */
  exemplo?: Valores;
}

export const FICHAS: Ficha[] = [
  {
    id: 'palavra-camadas', nome: 'Palavra em camadas', familia: 'multicor',
    resumo: 'Uma ou duas linhas de texto em 2 ou 3 cores: base com contorno, meio e letras.',
    destaques: ['2 ou 3 cores', '1 ou 2 linhas', 'Emoji, coração ou imagem ao lado', 'Peça única ou encaixe'],
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
  {
    id: 'logo-camadas', nome: 'Placa a partir de imagem', familia: 'multicor', tipo: 'Placa',
    resumo: 'Seu logo ou desenho (SVG, PNG ou JPG) em 2 ou 3 camadas de cor, com base para ficar em pé.',
    destaques: ['Do seu SVG, PNG ou JPG', '2 ou 3 cores', 'Base em contorno ou retângulo', 'Peça única ou encaixe'],
    exemplo: { corBase: '#0f172a', corMeio: '#fde68a', corTopo: '#2563eb', espBase: 8 },
  },
  {
    id: 'chaveiro-desenho', nome: 'Chaveiro a partir de desenho', familia: 'chaveiros',
    resumo: 'Qualquer desenho (SVG, PNG ou JPG) vira chaveiro: em relevo ou encaixado na base, com borda e argola.',
    destaques: ['Do seu SVG, PNG ou JPG', 'Relevo ou encaixado', 'Borda e argola'],
    exemplo: { corBase: '#7c3aed', corDesenho: '#fde047', corBorda: '#ffffff' },
  },
  {
    id: 'chaveiro-logo-nome', nome: 'Chaveiro com logo e nome', familia: 'chaveiros',
    resumo: 'Logo ao lado do nome, com borda e anel; até 9 nomes numa impressão.',
    destaques: ['Logo + nome', 'Até 9 por vez', 'Até 4 cores'],
    exemplo: { nomes: 'ALINE, BRUNA, LAURA, CECI' },
  },
  {
    id: 'plaquinha-pet', nome: 'Plaquinha de pet', familia: 'chaveiros', tipo: 'Pet',
    resumo: 'Nome na frente e contato no verso; oval, ondulada, peixe, osso ou o seu formato.',
    destaques: ['5 formatos ou a sua imagem', 'Frente e verso', 'Argola, furo ou NFC', 'Até 9 por vez'],
    exemplo: { nomes: 'Luna, Thor, Mel, Bob', forma: 'osso', corPlaca: '#f97316', corDetalhe: '#ffffff' },
  },
  {
    id: 'pingente-familia', nome: 'Pingente da família', familia: 'chaveiros', tipo: 'Pingente',
    resumo: 'Uma peça por pessoa ou pet, com ícone, ligadas por um cordão.',
    destaques: ['Pessoas, cães e gatos', 'Ícone por tipo', 'Peças conectáveis'],
  },
  {
    id: 'letreiro-sobreposto', nome: 'Letreiro com nome por cima', familia: 'multicor', tipo: 'Letreiro',
    resumo: 'Uma palavra grande e um nome em outra cor encaixado por cima dela.',
    destaques: ['Palavra grande + nome', 'Encaixe com folga', 'Peça de ficar em pé'],
    exemplo: { largura: 200, espPalavra: 14 },
  },
  {
    id: 'topo-bolo', nome: 'Topo de bolo', familia: 'multicor', tipo: 'Festa',
    resumo: 'Texto em 2 ou 3 cores com hastes para espetar no bolo.',
    destaques: ['1 ou 2 linhas', 'Hastes ajustáveis', 'Coração, estrela ou imagem'],
  },
  {
    id: 'topo-bolo-circular', nome: 'Topo de bolo com glitter', familia: 'multicor', tipo: 'Festa',
    resumo: 'Círculo com janela para glitter entre duas lâminas de acetato, nome e número.',
    destaques: ['Janela para glitter', 'Nome + número', 'Haste'],
  },
  {
    id: 'marcador-pagina', nome: 'Marcador de página com nome', familia: 'texto', tipo: 'Papelaria',
    resumo: 'Aba fina que entra no livro com o nome para fora, na borda das páginas.',
    destaques: ['Nome na borda do livro', 'Grade, geométrico ou floral', 'Seu desenho na aba'],
  },
  {
    id: 'contador-raspadinha', nome: 'Contador raspadinha', familia: 'parametricos', tipo: 'Papelaria',
    resumo: 'Placa com números em grade para raspar a cada meta cumprida.',
    destaques: ['Até 400 números', 'Passo e regressivo', 'Título'],
    exemplo: { contador: 50, colunas: 10, maxH: 160 },
  },
  {
    id: 'texto-com-guia', nome: 'Letras de parede com guia', familia: 'texto', tipo: 'Letras de parede',
    resumo: 'Texto grande em letras soltas e uma guia vazada, em pedaços que cabem na mesa.',
    destaques: ['Até 3 m', 'Guia com encaixe', 'Uma peça por letra'],
    exemplo: { texto: 'CASA', tamanho: 500 },
  },
  {
    id: 'suporte-foto', nome: 'Suporte de foto com nome', familia: 'parametricos', tipo: 'Decoração',
    resumo: 'Base no contorno do nome com fenda para a foto em pé.',
    destaques: ['Fenda para foto', 'Letras para colar', 'Base em pé'],
  },
  {
    id: 'suporte-palitos', nome: 'Suporte de palitos', familia: 'parametricos', tipo: 'Utilidade',
    resumo: 'Disco com tubo central e aletas, para palito, pincel ou vareta.',
    destaques: ['Furo de 2 a 10 mm', '3 a 10 aletas', 'Sem suporte de impressão'],
  },
  {
    id: 'porta-canetas-grade', nome: 'Porta-canetas em grade', familia: 'parametricos', tipo: 'Organização',
    resumo: 'Grade de células quadradas na medida, com furo de drenagem.',
    destaques: ['Até 20 × 20 células', 'Paredes na medida', 'Furo no fundo'],
    exemplo: { colunas: 4, linhas: 3, altura: 90 },
  },
  {
    id: 'floco-neve', nome: 'Enfeite floco de neve', familia: 'multicor', tipo: 'Enfeite',
    resumo: 'Floco de neve com nome no centro e argola; até 9 nomes.',
    destaques: ['Desenho próprio', 'Nome no centro', 'Até 9 por vez'],
    exemplo: { nomes: 'Ana' },
  },
  {
    id: 'cortador-biscoito', nome: 'Cortador de biscoito', familia: 'cortadores', tipo: 'Cortador',
    resumo: 'Cortador no contorno do seu desenho, ou em forma pronta, com carimbo que marca o desenho e pegador.',
    destaques: ['Do seu SVG, PNG ou JPG', 'Cortador + carimbo', 'Lâmina fina', 'Marca atrás'],
    exemplo: { tamanho: 70, corBase: '#e2557a', corTopo: '#ffffff' },
  },
  {
    id: 'ejetor-brigadeiro', nome: 'Ejetor de brigadeiro', familia: 'cortadores', tipo: 'Confeitaria',
    resumo: 'Cortador alto com êmbolo: marca o desenho no doce e empurra para fora. Cantos retos ou arredondados.',
    destaques: ['Do seu desenho', 'Cortador + êmbolo', 'Cantos arredondados'],
    exemplo: { arredondar: 2, corBase: '#7c3aed', corTopo: '#fef3c7' },
  },
  {
    id: 'cortadores-grade', nome: 'Cortadores de retângulos em grade', familia: 'cortadores', tipo: 'Cortador',
    resumo: 'Vários retângulos de uma vez, com a sua marca nas abas laterais.',
    destaques: ['Linhas e colunas', 'Saia para firmar', 'Marca nas abas'],
    exemplo: { largura: 40, altura: 25, linhas: 3, colunas: 3, corBase: '#0f766e', corTopo: '#ffffff' },
  },
  {
    id: 'carimbo-molde', nome: 'Carimbo de molde', familia: 'carimbos', tipo: 'Carimbo',
    resumo: 'Texto ou imagem em relevo num bloco com apoio para o polegar, para massa, argila e biscuit.',
    destaques: ['Texto ou imagem', 'Normal ou invertido', 'Apoio do polegar'],
    exemplo: { texto: 'Doces da Lu', fonte: 'pacifico', tamanho: 80, deslocamento: 5, corBase: '#1d4ed8', corTopo: '#ffffff' },
  },
  {
    id: 'carimbo-circular', nome: 'Carimbo circular de imagem', familia: 'carimbos', tipo: 'Carimbo',
    resumo: 'Carimbo redondo com a sua imagem em cima, borda e a marca embutida embaixo.',
    destaques: ['Do seu desenho', 'Borda opcional', 'Marca embaixo', '3 cores'],
    exemplo: { corBase: '#e2557a', corTopo: '#ffffff' },
  },
  {
    id: 'carimbo-letras', nome: 'Carimbo de letras e números', familia: 'carimbos', tipo: 'Confeitaria',
    resumo: 'Carimbos de doce, um por letra ou número; até 9 numa impressão.',
    destaques: ['Até 9 por vez', 'Fontes à escolha', 'Marca embaixo'],
    exemplo: { textos: 'L, U, 2, 5', corBase: '#be185d', corTopo: '#fde68a' },
  },
  {
    id: 'carimbo-imagem', nome: 'Carimbo de doce com imagem', familia: 'carimbos', tipo: 'Confeitaria',
    resumo: 'Carimbos de brigadeiro com as suas imagens: até 4 desenhos diferentes por vez.',
    destaques: ['Até 4 imagens', 'Só a silhueta, se quiser', 'Marca embaixo'],
    exemplo: { corBase: '#92400e', corTopo: '#fef3c7' },
  },
];

export function ficha(id: string): Ficha {
  const f = FICHAS.find((x) => x.id === id);
  if (!f) throw new Error('Ficha de gerador desconhecida: ' + id);
  return f;
}
