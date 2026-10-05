'use client';

/**
 * Carrinho de orcamento e favoritos da loja, guardados no navegador de quem visita (so
 * conveniencia: se o armazenamento falhar, a loja funciona igual, so nao lembra).
 */
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

const armazenamento: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento: so nao lembra */ } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* idem */ } },
};

export interface ItemOrcamento {
  id: string;
  slug: string;
  quantidade: number;
  cor?: string;
  observacao?: string;
  /** Resumo legivel do que a pessoa montou na pagina do produto ("Nomes: Ana; Fonte: Lobster"). */
  personalizacao?: string;
  /** Valores do gerador por tras do resumo (para reabrir a peca depois). */
  valores?: Record<string, string | number | boolean>;
}

interface Orcamento {
  itens: ItemOrcamento[];
  adicionar: (slug: string, extra?: Partial<Pick<ItemOrcamento, 'quantidade' | 'cor' | 'observacao' | 'personalizacao' | 'valores'>>) => void;
  alterar: (id: string, mudanca: Partial<Omit<ItemOrcamento, 'id' | 'slug'>>) => void;
  remover: (id: string) => void;
  limpar: () => void;
}

const QTD_MAX = 999;
const limitar = (n: number) => Math.min(QTD_MAX, Math.max(1, Math.round(n) || 1));
const normalizarOpcao = (valor?: string) => valor?.trim() || '';
let sequenciaId = 0;
const novoId = () => {
  sequenciaId++;
  return globalThis.crypto?.randomUUID?.() ?? `linha-${Date.now().toString(36)}-${sequenciaId.toString(36)}`;
};

export function migrarOrcamento(estado: unknown): Pick<Orcamento, 'itens'> {
  const dados = estado && typeof estado === 'object' ? estado as { itens?: unknown } : {};
  const itens = Array.isArray(dados.itens) ? dados.itens : [];
  const ids = new Set<string>();
  return {
    itens: itens.flatMap((valor, indice) => {
      if (!valor || typeof valor !== 'object') return [];
      const item = valor as Partial<ItemOrcamento>;
      if (typeof item.slug !== 'string' || !item.slug) return [];
      let id = typeof item.id === 'string' && item.id ? item.id : `migrado-${indice}-${item.slug}`;
      while (ids.has(id)) id = `${id}-${indice}`;
      ids.add(id);
      return [{
        id, slug: item.slug, quantidade: limitar(Number(item.quantidade) || 1), cor: typeof item.cor === 'string' ? item.cor : '', observacao: typeof item.observacao === 'string' ? item.observacao : '',
        ...(typeof item.personalizacao === 'string' && item.personalizacao ? { personalizacao: item.personalizacao } : {}),
        ...(item.valores && typeof item.valores === 'object' ? { valores: item.valores } : {}),
      }];
    }),
  };
}

export const VERSAO_ORCAMENTO = 1;

export function criarStoreOrcamento(storage: StateStorage = armazenamento) {
  return create<Orcamento>()(
  persist(
    (set) => ({
      itens: [],
      // Mesma configuracao soma; cor, observacao ou personalizacao diferente fica em outra linha.
      adicionar: (slug, extra = {}) =>
        set((s) => {
          const cor = normalizarOpcao(extra.cor);
          const observacao = normalizarOpcao(extra.observacao);
          const quantidadeNova = limitar(extra.quantidade ?? 1);
          const personalizacao = normalizarOpcao(extra.personalizacao);
          const ja = s.itens.find((i) => i.slug === slug && normalizarOpcao(i.cor) === cor && normalizarOpcao(i.observacao) === observacao && normalizarOpcao(i.personalizacao) === personalizacao);
          if (ja) return { itens: s.itens.map((i) => (i.id === ja.id ? { ...i, quantidade: limitar(i.quantidade + quantidadeNova) } : i)) };
          const novo: ItemOrcamento = { id: novoId(), slug, quantidade: quantidadeNova, cor, observacao, ...(personalizacao ? { personalizacao, valores: extra.valores } : {}) };
          return { itens: [...s.itens, novo] };
        }),
      alterar: (id, mudanca) =>
        set((s) => ({ itens: s.itens.map((i) => (i.id === id ? { ...i, ...mudanca, quantidade: limitar(mudanca.quantidade ?? i.quantidade) } : i)) })),
      remover: (id) => set((s) => ({ itens: s.itens.filter((i) => i.id !== id) })),
      limpar: () => set({ itens: [] }),
    }),
    { name: 'scarprint:orcamento:v1', storage: createJSONStorage(() => storage), version: VERSAO_ORCAMENTO, migrate: (estado) => migrarOrcamento(estado) },
  ),
  );
}

export const useOrcamento = criarStoreOrcamento();

interface Favoritos {
  slugs: string[];
  alternar: (slug: string) => void;
}

export const useFavoritos = create<Favoritos>()(
  persist(
    (set) => ({
      slugs: [],
      alternar: (slug) => set((s) => ({ slugs: s.slugs.includes(slug) ? s.slugs.filter((x) => x !== slug) : [...s.slugs, slug] })),
    }),
    { name: 'scarprint:favoritos:v1', storage: createJSONStorage(() => armazenamento) },
  ),
);

/** Verdadeiro so depois de montar no navegador: contadores nao divergem do HTML do servidor. */
export function useMontado(): boolean {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  return montado;
}
