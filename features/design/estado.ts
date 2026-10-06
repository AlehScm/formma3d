'use client';

/**
 * Estado do editor 2D: o design, a selecao e o historico (desfazer/refazer, 100 passos).
 * O design se salva sozinho no navegador e volta na proxima visita; se o armazenamento
 * falhar, o editor funciona igual, so nao lembra.
 */
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { designNovo, lerDesign, type Design, type Elemento } from '@/lib/design/documento';

const armazenamento: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento: so nao lembra */ } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* idem */ } },
};

const PASSOS = 100;

interface EstadoDesign {
  design: Design;
  selecao: string[];
  passado: Design[];
  futuro: Design[];
  /** Muda o design; `historico: false` durante um gesto (o gesto abre o passo com `iniciarGesto`). */
  alterar: (fn: (d: Design) => Design, opcoes?: { historico?: boolean }) => void;
  iniciarGesto: () => void;
  alterarElementos: (ids: string[], fn: (e: Elemento) => Elemento, opcoes?: { historico?: boolean }) => void;
  selecionar: (ids: string[]) => void;
  desfazer: () => void;
  refazer: () => void;
  carregar: (d: Design) => void;
}

export const useDesign = create<EstadoDesign>()(
  persist(
    (set, get) => ({
      design: designNovo(),
      selecao: [],
      passado: [],
      futuro: [],
      alterar: (fn, { historico = true } = {}) =>
        set((s) => {
          const novo = fn(s.design);
          if (novo === s.design) return s;
          return historico ? { design: novo, passado: [...s.passado, s.design].slice(-PASSOS), futuro: [] } : { design: novo };
        }),
      iniciarGesto: () => set((s) => ({ passado: [...s.passado, s.design].slice(-PASSOS), futuro: [] })),
      alterarElementos: (ids, fn, opcoes) =>
        get().alterar((d) => ({ ...d, elementos: d.elementos.map((e) => (ids.includes(e.id) ? fn(e) : e)) }), opcoes),
      selecionar: (ids) => set({ selecao: ids }),
      desfazer: () =>
        set((s) => {
          const anterior = s.passado.at(-1);
          if (!anterior) return s;
          return { design: anterior, passado: s.passado.slice(0, -1), futuro: [s.design, ...s.futuro].slice(0, PASSOS), selecao: s.selecao.filter((id) => anterior.elementos.some((e) => e.id === id)) };
        }),
      refazer: () =>
        set((s) => {
          const proximo = s.futuro[0];
          if (!proximo) return s;
          return { design: proximo, futuro: s.futuro.slice(1), passado: [...s.passado, s.design].slice(-PASSOS), selecao: s.selecao.filter((id) => proximo.elementos.some((e) => e.id === id)) };
        }),
      carregar: (d) => set((s) => ({ design: d, selecao: [], passado: [...s.passado, s.design].slice(-PASSOS), futuro: [] })),
    }),
    {
      name: 'scarprint:design:v1',
      storage: createJSONStorage(() => armazenamento),
      partialize: (s) => ({ design: s.design }),
      merge: (salvo, atual) => {
        try {
          const d = (salvo as { design?: unknown } | undefined)?.design;
          return d ? { ...atual, design: lerDesign(d) } : atual;
        } catch {
          return atual;
        }
      },
    },
  ),
);
