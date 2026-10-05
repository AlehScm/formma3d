/**
 * Formatacao para a tela, sem importar o cadastro (pode ir para o navegador sem levar os
 * produtos ocultos junto).
 */
import type { Produto } from './tipos';

/** Texto do preco para a tela. */
export const textoDoPreco = (p: Produto, rotuloValidacao = 'Preço em validação') => (p.preco.status === 'validacao' ? rotuloValidacao : p.preco.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

/** Rotulo usado na loja. */
export const rotuloPreco = (p: Produto) => textoDoPreco(p, 'Preço sob consulta');

/** Endereco de uma foto (`marketplace/<slug>/x.jpg`) com o prefixo do site (GitHub Pages usa /formma3d). */
export const urlDaMidia = (m: string) => `${process.env.NEXT_PUBLIC_BASE ?? ''}/${m.replace(/^\//, '').split('/').map(encodeURIComponent).join('/')}`;

/** Gerador da peca (`/moldes/<id>`), se houver: e dele que sai a previa 3D real. */
export const geradorDe = (p: Produto): string | undefined => p.personalizar?.href.match(/^\/moldes\/([a-z0-9-]+)$/)?.[1];
