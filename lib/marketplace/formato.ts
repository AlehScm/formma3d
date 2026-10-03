/**
 * Formatacao para a tela, sem importar o cadastro (pode ir para o navegador sem levar os
 * produtos ocultos junto).
 */
import type { Produto } from './tipos';

/** Texto do preco para a tela. */
export const textoDoPreco = (p: Produto) => (p.preco.status === 'validacao' ? 'Preço em validação' : p.preco.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

/** Endereco de uma foto (`marketplace/<slug>/x.jpg`) com o prefixo do site (GitHub Pages usa /formma3d). */
export const urlDaMidia = (m: string) => `${process.env.NEXT_PUBLIC_BASE ?? ''}/${m.replace(/^\//, '').split('/').map(encodeURIComponent).join('/')}`;
