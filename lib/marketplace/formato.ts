/**
 * Formatacao para a tela, sem importar o cadastro (pode ir para o navegador sem levar os
 * produtos ocultos junto).
 */
import type { Produto } from './tipos';

/** Texto do preco para a tela. */
export const textoDoPreco = (p: Produto, rotuloValidacao = 'Preço em validação') => (p.preco.status === 'validacao' ? rotuloValidacao : p.preco.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

/** Rotulo usado na loja. */
export const rotuloPreco = (p: Produto) => textoDoPreco(p, 'Preço sob consulta');

/** Endereco de uma foto (`marketplace/<slug>/x.jpg`) com o prefixo do site (vazio no dominio proprio). */
export const urlDaMidia = (m: string) => `${process.env.NEXT_PUBLIC_BASE ?? ''}/${m.replace(/^\//, '').split('/').map(encodeURIComponent).join('/')}`;

/** Com foto ou gerador o card mostra a peca; sem nenhum dos dois, "Imagem em preparacao". */
export const temImagem = (p: Produto) => p.midias.length > 0 || !!geradorDe(p);

/** Pecas com imagem antes, sem mudar a ordem dentro de cada grupo. */
export const comImagemPrimeiro = (ps: Produto[]): Produto[] => [...ps.filter(temImagem), ...ps.filter((p) => !temImagem(p))];

/** Gerador da peca: so com a tag `gerador` (o banco garante o id junto). */
export const geradorDe = (p: Produto): string | undefined => (p.tags.includes('gerador') ? p.gerador : undefined);

/** O gerador completo da peca, onde ficam as configuracoes que a pagina nao mostra. */
export const hrefDoGerador = (gerador: string, slug: string) => `/design?modelo=${gerador}&produto=${slug}`;
