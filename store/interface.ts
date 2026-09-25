'use client';

import { create } from 'zustand';
import type { Colocada } from '@/lib/print/arranjo';

/**
 * Estado da INTERFACE: o que se ve, nao o que se fabrica.
 *
 * Nada aqui entra no calculo do produto. O arranjo na placa mora aqui (e nao no
 * projeto) justamente porque so acomoda a peca para imprimir -- o letreiro, a
 * chapa e o preco nao mudam.
 */

/** As tres areas de trabalho, na ordem em que a oficina trabalha. */
export type Espaco = 'desenhar' | 'imprimir' | 'orcamento';
export type Ferramenta = 'selecionar' | 'mover' | 'girar' | 'tamanho';

export interface CamadasVisiveis {
  corpo: boolean;
  chapa: boolean;
  traseira: boolean;
}

export interface InfoArranjo {
  dentro: number;
  /** Sobraram por falta de espaco: resolve com outra levada. */
  fora: number;
  /** Nao cabem nesta maquina de jeito nenhum: nao resolve com outra levada. */
  impossiveis: number;
  placas: number;
}

interface EstadoInterface {
  espaco: Espaco;
  selecionada: string | null;
  ferramenta: Ferramenta;
  explode: number;
  camadas: CamadasVisiveis;
  inspetorAberto: boolean;
  /** Categoria aberta na barra lateral, por area: voltar a uma area reabre onde estava. */
  categoria: Record<Espaco, string>;

  arranjo: Map<string, Colocada>;
  sobraram: string[];
  infoArranjo: InfoArranjo | null;
  folgaPecas: number;

  /**
   * Abre o seletor de arquivo. Os <input type=file> vivem na casca (trocar de
   * area desmontaria o input no meio do dialogo), e registram aqui como abri-los.
   */
  abrirDesenho: () => void;
  abrirFonte: () => void;

  setEspaco: (e: Espaco) => void;
  selecionar: (chave: string | null) => void;
  setFerramenta: (f: Ferramenta) => void;
  setExplode: (v: number) => void;
  setCamadas: (c: CamadasVisiveis) => void;
  setInspetorAberto: (v: boolean) => void;
  setCategoria: (espaco: Espaco, id: string) => void;
  setFolgaPecas: (v: number) => void;
  definirArranjo: (colocadas: Colocada[], sobraram: string[], info: InfoArranjo) => void;
  /** Posicao absoluta na placa (coordenadas do `arrumar`). Tira a peca da lista de sobras. */
  posicionarNoArranjo: (c: Colocada) => void;
  limparArranjo: () => void;
  registrarSeletores: (desenho: () => void, fonte: () => void) => void;
}

export const useInterface = create<EstadoInterface>()((set) => ({
  espaco: 'desenhar',
  selecionada: null,
  ferramenta: 'selecionar',
  explode: 0,
  camadas: { corpo: true, chapa: true, traseira: true },
  inspetorAberto: true,
  categoria: { desenhar: 'origem', imprimir: 'maquina', orcamento: 'material' },

  arranjo: new Map(),
  sobraram: [],
  infoArranjo: null,
  folgaPecas: 3,

  abrirDesenho: () => {},
  abrirFonte: () => {},

  setEspaco: (espaco) =>
    set((s) => ({
      espaco,
      // "Tamanho" muda o produto e so existe em Desenhar. Em Imprimir o gizmo so
      // acomoda; cair para "mover" evita uma ferramenta ativa que nao faz nada.
      ferramenta: espaco !== 'desenhar' && s.ferramenta === 'tamanho' ? 'mover' : s.ferramenta,
    })),
  selecionar: (selecionada) => set({ selecionada }),
  setFerramenta: (ferramenta) => set({ ferramenta }),
  setExplode: (explode) => set({ explode }),
  setCamadas: (camadas) => set({ camadas }),
  setInspetorAberto: (inspetorAberto) => set({ inspetorAberto }),
  setCategoria: (espaco, id) => set((s) => ({ categoria: { ...s.categoria, [espaco]: id } })),
  setFolgaPecas: (folgaPecas) => set({ folgaPecas }),
  definirArranjo: (colocadas, sobraram, infoArranjo) =>
    set({ arranjo: new Map(colocadas.map((c) => [c.nome, c])), sobraram, infoArranjo }),
  posicionarNoArranjo: (c) =>
    set((s) => {
      const n = new Map(s.arranjo);
      n.set(c.nome, c);
      return { arranjo: n, sobraram: s.sobraram.filter((k) => k !== c.nome) };
    }),
  limparArranjo: () => set({ arranjo: new Map(), sobraram: [], infoArranjo: null }),
  registrarSeletores: (abrirDesenho, abrirFonte) => set({ abrirDesenho, abrirFonte }),
}));
