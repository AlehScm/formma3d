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
    resumo: 'Seu logo ou desenho (SVG, PNG ou JPG) em 2 ou 3 camadas de cor sobre uma base plana.',
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
    destaques: ['Floco ou o seu desenho', 'Nome no centro', 'Até 9 por vez'],
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
  {
    id: 'colorir', nome: 'Página de colorir', familia: 'multicor', tipo: 'Colorir',
    resumo: 'Seu desenho de linhas vira uma página de pintar: linhas em relevo, encaixadas ou afundadas.',
    destaques: ['Do seu desenho', 'Relevo, 2 partes ou afundado', 'Contorno, círculo ou quadrado'],
    exemplo: { tamanho: 120, corBase: '#ffffff', corLinhas: '#111111' },
  },
  {
    id: 'chaveiro-resina', nome: 'Chaveiro para resina', familia: 'chaveiros', tipo: 'Resina',
    resumo: 'Desenho com bordas altas para segurar a resina epóxi, na peça toda ou só no desenho.',
    destaques: ['Do seu desenho', 'Borda interna ou externa', 'Argola', '3 cores'],
    exemplo: { bordaExterna: true, corBase: '#4a1f2e', corBorda: '#ffffff', corDesenho: '#f5c518' },
  },
  {
    id: 'imagem-multipartes', nome: 'Imagem em várias peças', familia: 'multicor', tipo: 'Multipartes',
    resumo: 'As linhas viram paredes numa base e cada área vira uma peça para encaixar, de outra cor.',
    destaques: ['Do seu desenho', 'Peças com folga', 'Para imprimir de face para baixo'],
    exemplo: { tamanho: 120, corBase: '#1f2937', corPecas: '#f59e0b' },
  },
  {
    id: 'quebra-cabeca', nome: 'Quebra-cabeça de imagem', familia: 'parametricos', tipo: 'Brinquedo',
    resumo: 'Quebra-cabeça quadrado com a sua imagem no topo, verso de outra cor e moldura.',
    destaques: ['2 a 16 peças por lado', 'Imagem afundada', 'Moldura'],
    exemplo: { lado: 120, pecas: 4, corVerso: '#1e88e5', corFundo: '#ffffff', corDesenho: '#1f2937' },
  },
  {
    id: 'chaveiro-nfc', nome: 'Chaveiro NFC', familia: 'chaveiros', tipo: 'NFC',
    resumo: 'Chaveiro com etiqueta NFC embutida, seu desenho em cima e o símbolo de NFC embaixo.',
    destaques: ['6 formatos', 'NFC embutido', 'Borda para resina', 'Argola no canto'],
    exemplo: { corBase: '#4a1f2e', corBorda: '#ffffff', corDesenho: '#ffffff' },
  },
  {
    id: 'chaveiro-carretel', nome: 'Chaveiro carretel de filamento', familia: 'chaveiros', tipo: 'NFC',
    resumo: 'Mini carretel com o filamento enrolado, tampa de encaixe e NFC escondido na aba.',
    destaques: ['Fio enrolado em relevo', 'NFC opcional', 'Tampa de encaixe'],
    exemplo: { corBase: '#222222', corFilamento: '#ff69b4' },
  },
  {
    id: 'abridor-latas', nome: 'Abridor de latas', familia: 'chaveiros', tipo: 'Utilidade',
    resumo: 'Chaveiro com o seu desenho e um túnel que abre a lata pela aba; NFC opcional.',
    destaques: ['Do seu desenho', 'Abre lata', 'NFC opcional'],
    exemplo: { corBase: '#b91c1c', corDesenho: '#ffffff' },
  },
  {
    id: 'chaveiro-espelho', nome: 'Chaveiro com espelho e frase', familia: 'chaveiros', tipo: 'Presente',
    resumo: 'Disco com rebaixo para colar um espelho redondo e a frase em volta.',
    destaques: ['Frase em arco', 'Rebaixo para espelho', 'Emoji embaixo'],
    exemplo: { texto: 'MELHOR MÃE ♥', alturaLetra: 4.5, corTexto: '#ffffff', corBase: '#4a1f2e' },
  },
  {
    id: 'rosa-texto', nome: 'Rosa com frase', familia: 'chaveiros', tipo: 'Presente',
    resumo: 'Rosa com folhas e a frase em volta, como chaveiro ou enfeite de scrunchie.',
    destaques: ['Frase em arco', 'Chaveiro ou scrunchie', '4 cores'],
    exemplo: { corBase: '#111111', corRosa: '#f472b6', corFolhas: '#2e7d32', corTexto: '#fbcfe8' },
  },
  {
    id: 'placa-com-base', nome: 'Placa de line art com base', familia: 'placas', tipo: 'Decoração',
    resumo: 'Seu desenho em pe (line art ou placa de listras) encaixado numa base com nome na frente.',
    destaques: ['Line art ou listras', 'Base com chanfro', 'Nome na base'],
    exemplo: { modo: 'listras', tamanho: 90, larguraBase: 140, textoBase: 'PAI', corBase: '#fcd7b6', corDesenho: '#111111', corTexto: '#001b5e' },
  },
  {
    id: 'trofeu', nome: 'Troféu imagem + texto', familia: 'placas', tipo: 'Troféu',
    resumo: 'Imagem e palavra grossas em pé numa base com texto na frente e placa atrás.',
    destaques: ['Imagem + palavra', 'Peças grossas de encaixe', 'Placa atrás'],
    exemplo: { fundoImagem: true, corBase: '#333333', corImagem: '#ffd700', corTexto: '#ffd700' },
  },
  {
    id: 'rolo-textura', nome: 'Rolo de textura', familia: 'parametricos', tipo: 'Ferramenta',
    resumo: 'Rolo com a sua imagem em relevo em volta, repetida em mosaico ou grande, para massa e argila.',
    destaques: ['Mosaico ou imagem grande', 'Relevo para fora ou para dentro', 'Furo para o cabo'],
    exemplo: { corRolo: '#6b2c42', corTextura: '#f5d0a9' },
  },
  {
    id: 'estojo-batom', nome: 'Estojo de batom', familia: 'chaveiros', tipo: 'Beleza',
    resumo: 'Chaveiro que guarda o batom, com nome, mosaico ou imagem em relevo em volta.',
    destaques: ['Nome ou textura em volta', 'Argola em cima', 'Na medida do batom'],
    exemplo: { nome: 'Bia', corCilindro: '#9d174d', corTextura: '#fde68a' },
  },
  {
    id: 'ejetor-cupula', nome: 'Ejetor de cúpula', familia: 'cortadores', tipo: 'Confeitaria',
    resumo: 'Casca e êmbolo com o topo em cúpula: o doce sai abaulado, na forma do seu desenho.',
    destaques: ['Do seu desenho', 'Cúpula por escala ou recuo', 'Casca suavizada'],
    exemplo: { corBase: '#a85f78', corTopo: '#fbcfe8' },
  },
  {
    id: 'cumbuca', nome: 'Cumbuca a partir de imagem', familia: 'parametricos', tipo: 'Casa',
    resumo: 'A forma da sua imagem vira a boca de uma cumbuca, com o desenho em relevo no fundo.',
    destaques: ['Do seu desenho', 'Parede curva sem suporte', 'Desenho no fundo'],
    exemplo: { tamanho: 120, altura: 35, corCumbuca: '#c8a2c8', corDesenho: '#ffffff' },
  },
  {
    id: 'suporte-bolo', nome: 'Suporte de bolo', familia: 'parametricos', tipo: 'Festa',
    resumo: 'Prato com borda ondulada e nome em arco, e pé em sino que imprime sem suporte.',
    destaques: ['Borda em ondas', 'Nome no prato', 'Pé oco em sino'],
    exemplo: { corTopo: '#ffffff', corBase: '#f9a8d4' },
  },
  {
    id: 'chaveiro-cenoura', nome: 'Chaveiro cenoura', familia: 'chaveiros', tipo: 'Páscoa',
    resumo: 'Cenoura com folhas e o nome atravessado; até 9 nomes numa impressão.',
    destaques: ['Até 9 por vez', '4 cores', 'Desenho próprio'],
    exemplo: { nomes: 'Enzo, Ana' },
  },
  {
    id: 'chaveiro-coelho', nome: 'Chaveiro coelho', familia: 'chaveiros', tipo: 'Páscoa',
    resumo: 'Coelho com orelhas e o nome com contorno; até 9 nomes numa impressão.',
    destaques: ['Até 9 por vez', '4 cores', 'Desenho próprio'],
    exemplo: { nomes: 'Clara, Leo' },
  },
  {
    id: 'rosa-nome', nome: 'Rosa com nome', familia: 'chaveiros', tipo: 'Presente',
    resumo: 'Rosa de uma cor só, com o nome formando o cabo; até 9 nomes.',
    destaques: ['Uma cor', 'Nome no cabo', 'Até 9 por vez'],
    exemplo: { nomes: 'Aline, Mãe' },
  },
  {
    id: 'string-art', nome: 'String art impresso', familia: 'placas', tipo: 'Decoração',
    resumo: 'Texto ou desenho flutuando numa moldura, preso por fios finos impressos em outra cor.',
    destaques: ['Coração, retângulo ou @', 'Fios verticais ou radiais', '2 cores'],
    exemplo: { corBorda: '#a85f78', corFio: '#ffffff' },
  },
  {
    id: 'letra-grande', nome: 'Letra grande com nome', familia: 'texto', tipo: 'Letra grande',
    resumo: 'Uma letra grande com o nome em cima, em sete acabamentos: encaixado, afundado, resina, textura, floral, EVA ou glitter.',
    destaques: ['7 acabamentos', 'Nome com enfeite', 'Pé cortado para ficar em pé'],
    exemplo: { letra: 'M', nome: 'Mom', altura: 140, corLetra: '#4a1f2e', corNome: '#f5d0a9' },
  },
  {
    id: 'luminaria-letra', nome: 'Luminária letra grande', familia: 'texto', tipo: 'Luminária',
    resumo: 'Letra oca com parede para fita de LED, frente translúcida de encaixe e o nome por cima.',
    destaques: ['Fita de LED', 'Frente translúcida', 'Saída do cabo'],
    exemplo: { letra: 'A', nome: 'Ana', altura: 140, corLetra: '#e91e8c', corNome: '#1f2937' },
  },
  {
    id: 'luminaria-social', nome: 'Luminária @social', familia: 'multicor', tipo: 'Luminária',
    resumo: 'O seu @ iluminado: caixa com LED, letras em cor na frente translúcida e faixa na lateral.',
    destaques: ['Fita de LED', 'Contorno ou retângulo', 'Furo do cabo'],
    exemplo: { usuario: '@formma3d', largura: 200, corBase: '#1f2937', corTexto: '#f472b6' },
  },
];

export function ficha(id: string): Ficha {
  const f = FICHAS.find((x) => x.id === id);
  if (!f) throw new Error('Ficha de gerador desconhecida: ' + id);
  return f;
}
