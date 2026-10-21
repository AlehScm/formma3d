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

/** Gerador da peca (`/design?modelo=<id>`), mantendo os enderecos antigos internos. */
export const geradorDe = (p: Produto): string | undefined => {
  const href = p.personalizar?.href;
  if (!href || !href.startsWith('/') || href.startsWith('//')) return undefined;
  const url = new URL(href, 'https://scarprint.invalid');
  if (url.origin !== 'https://scarprint.invalid') return undefined;
  const legado = url.pathname.match(/^\/(?:design|moldes)\/([a-z0-9-]+)$/)?.[1];
  if (legado) return legado;
  if (url.pathname !== '/design') return undefined;
  const modelos = url.searchParams.getAll('modelo');
  return modelos.length === 1 && /^[a-z0-9-]+$/.test(modelos[0]!) ? modelos[0] : undefined;
};
