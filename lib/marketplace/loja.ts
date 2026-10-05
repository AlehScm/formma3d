/**
 * Textos comerciais da loja. So o que e verdade hoje: nada de frete, prazo, pagamento ou
 * avaliacao ate o usuario confirmar (o teste verificar-marketplace barra isso aqui).
 */
import type { Secao } from './tipos';

export const VANTAGENS: { icone: 'medida' | 'personalizar' | 'impressora' | 'conversa'; titulo: string; texto: string }[] = [
  { icone: 'medida', titulo: 'Feito sob medida', texto: 'Tamanho, cores e texto do seu jeito.' },
  { icone: 'personalizar', titulo: 'Veja antes de pedir', texto: 'Monte a peça e confira em 3D.' },
  { icone: 'impressora', titulo: 'Impressão 3D própria', texto: 'Cada peça sai da nossa impressora.' },
  { icone: 'conversa', titulo: 'Orçamento sem compromisso', texto: 'Monte a lista e peça o orçamento.' },
];

/** Slides do banner: secao (cor), titulo, frase, peca de onde sai a imagem e para onde vai o botao. */
export const BANNERS: { secao: Secao; titulo: string; texto: string; produto: string; acao: string; href: string }[] = [
  { secao: 'empresa', titulo: 'A sua marca em 3D', texto: 'Letreiros, placas com QR code, Pix e avaliação no Google para o seu negócio.', produto: 'arroba-social', acao: 'Ver peças para empresas', href: '/secao/empresa' },
  { secao: 'presentes', titulo: 'Presentes com nome', texto: 'Chaveiros, topos de bolo e lembrancinhas personalizadas para festas.', produto: 'chaveiro-nome', acao: 'Ver presentes', href: '/secao/presentes' },
  { secao: 'casa', titulo: 'Decoração para a sua casa', texto: 'Luminárias de letra, porta-retratos e organizadores sob medida.', produto: 'luminaria-letra', acao: 'Ver peças para casa', href: '/secao/casa' },
];

/** Como pedir, na ordem real do pedido (por isso numerado na home). */
export const COMO_FUNCIONA: { titulo: string; texto: string }[] = [
  { titulo: 'Escolha a peça', texto: 'Navegue pelas seções ou busque pelo que você precisa.' },
  { titulo: 'Personalize e veja em 3D', texto: 'Nas peças personalizáveis, ajuste nome, cores e tamanho e confira a peça girando na tela.' },
  { titulo: 'Peça o orçamento', texto: 'Adicione ao orçamento e envie a lista. Combinamos valor e detalhes com você antes de imprimir.' },
];

/** Perguntas frequentes: so fatos de hoje (o teste barra frete, pagamento, prazo e avaliacao). */
export const PERGUNTAS: { pergunta: string; resposta: string }[] = [
  { pergunta: 'Quanto custa uma peça?', resposta: 'O valor depende do tamanho, das cores e da quantidade. Adicione as peças ao orçamento e envie a lista: respondemos com o valor de cada uma.' },
  { pergunta: 'Posso escolher as cores?', resposta: 'Sim. Diga as cores no orçamento ou, nas peças personalizáveis, escolha as cores e veja o resultado em 3D.' },
  { pergunta: 'Dá para mudar o texto e o tamanho?', resposta: 'Sim. Cada peça é impressa sob medida: nome, frase e tamanho saem do seu jeito.' },
  { pergunta: 'Não achei a peça que eu queria. E agora?', resposta: 'Monte a sua nos geradores de peças ou descreva a ideia no orçamento. A gente avalia e responde.' },
];
