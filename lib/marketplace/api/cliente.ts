/**
 * Lado do navegador da API da loja (contrato.ts): um GET por recurso por pagina, com cache.
 * `NEXT_PUBLIC_API` aponta para o servidor de verdade quando houver banco; sem ela, os JSON
 * estaticos do build em `<site>/api/`.
 */
import { useEffect, useState } from 'react';
import type { ListaDeProdutos, ProdutoResumido } from './contrato';

const BASE = (process.env.NEXT_PUBLIC_API ?? `${process.env.NEXT_PUBLIC_BASE ?? ''}/api`).replace(/\/+$/, '');

export const urlDaApi = (caminho: string) => `${BASE}/${caminho.replace(/^\/+/, '')}`;

const pedidos = new Map<string, Promise<unknown>>();

/** GET de um JSON da API; pedidos iguais dividem a mesma resposta. Erro libera nova tentativa. */
export function buscarJson<T>(caminho: string): Promise<T> {
  let pedido = pedidos.get(caminho);
  if (!pedido) {
    pedido = fetch(urlDaApi(caminho)).then((r) => {
      if (!r.ok) throw new Error(`GET ${caminho}: ${r.status}`);
      return r.json();
    });
    pedido.catch(() => pedidos.delete(caminho));
    pedidos.set(caminho, pedido);
  }
  return pedido as Promise<T>;
}

/** Lista de pecas por GET. `caminho` nulo nao busca nada (a pagina pede so quando precisa). */
export function useLista(caminho: string | null, tentativa = 0): { itens: ProdutoResumido[] | null; erro: boolean } {
  const [resposta, setResposta] = useState<{ chave: string; itens: ProdutoResumido[] | null; erro: boolean } | null>(null);
  const chave = caminho ? `${caminho}#${tentativa}` : null;
  useEffect(() => {
    if (!caminho || !chave) return;
    let vivo = true;
    buscarJson<ListaDeProdutos>(caminho).then(
      (r) => { if (vivo) setResposta({ chave, itens: r.itens, erro: false }); },
      () => { if (vivo) setResposta({ chave, itens: null, erro: true }); },
    );
    return () => { vivo = false; };
  }, [caminho, chave]);
  return resposta && resposta.chave === chave ? { itens: resposta.itens, erro: resposta.erro } : { itens: null, erro: false };
}
