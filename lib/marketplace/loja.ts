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
