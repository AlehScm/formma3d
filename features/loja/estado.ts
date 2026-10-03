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
  slug: string;
  quantidade: number;
  cor?: string;
  observacao?: string;
}

interface Orcamento {
  itens: ItemOrcamento[];
  adicionar: (slug: string, extra?: Partial<Omit<ItemOrcamento, 'slug'>>) => void;
  alterar: (slug: string, mudanca: Partial<Omit<ItemOrcamento, 'slug'>>) => void;
  remover: (slug: string) => void;
  limpar: () => void;
}

const QTD_MAX = 999;
const limitar = (n: number) => Math.min(QTD_MAX, Math.max(1, Math.round(n) || 1));

export const useOrcamento = create<Orcamento>()(
  persist(
    (set) => ({
      itens: [],
      // Mesma peca de novo soma na quantidade (e atualiza cor/observacao se vierem).
      adicionar: (slug, extra = {}) =>
        set((s) => {
          const ja = s.itens.find((i) => i.slug === slug);
          if (ja) return { itens: s.itens.map((i) => (i.slug === slug ? { ...i, ...extra, quantidade: limitar(i.quantidade + (extra.quantidade ?? 1)) } : i)) };
          return { itens: [...s.itens, { slug, ...extra, quantidade: limitar(extra.quantidade ?? 1) }] };
        }),
      alterar: (slug, mudanca) =>
        set((s) => ({ itens: s.itens.map((i) => (i.slug === slug ? { ...i, ...mudanca, quantidade: limitar(mudanca.quantidade ?? i.quantidade) } : i)) })),
      remover: (slug) => set((s) => ({ itens: s.itens.filter((i) => i.slug !== slug) })),
      limpar: () => set({ itens: [] }),
    }),
    { name: 'scarprint:orcamento:v1', storage: createJSONStorage(() => armazenamento) },
  ),
);

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
