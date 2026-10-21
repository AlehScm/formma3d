/**
 * Produtos da loja, lidos do banco mockado (`data/produtos.json`, ver banco.ts). Os nossos vem
 * do que ja imprimimos e dos geradores; os de terceiros ficam ocultos ate a licenca de venda
 * ser confirmada. Nada e anunciado como brinquedo (restricao legal).
 */
import { lerBanco } from './banco';
import type { Produto } from './tipos';

export const PRODUTOS: Produto[] = lerBanco();
