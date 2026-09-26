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

  /** Cada placa (uma impressao) com as pecas dela, na ordem do encaixe. */
  placas: Map<string, Colocada>[];
  /** A placa que a cena mostra e que os botoes de baixar usam. */
  placaVista: number;
  /** Pecas que nao entraram em placa nenhuma: ficam em fila ao lado da mesa. */
  sobraram: string[];
  infoArranjo: InfoArranjo | null;
  folgaPecas: number;

  /**
   * Abre o seletor de arquivo. Os <input type=file> vivem na casca (trocar de
   * area desmontaria o input no meio do dialogo), e registram aqui como abri-los.
   */
  /**
   * Abre o seletor de arquivo (.ai, .pdf, .stl; varios de uma vez). `substituir`
   * troca os arquivos do letreiro (Abrir desenho); sem ele, adiciona ao lado.
   */
  abrirDesenho: (substituir?: boolean) => void;
  abrirFonte: () => void;
  /** Abre o seletor de .ttf para desenhar o texto vivo que pede a fonte `nome`. */
  abrirFonteTexto: (nome: string) => void;

  setEspaco: (e: Espaco) => void;
  selecionar: (chave: string | null) => void;
  setFerramenta: (f: Ferramenta) => void;
  setExplode: (v: number) => void;
  setCamadas: (c: CamadasVisiveis) => void;
  setInspetorAberto: (v: boolean) => void;
  setCategoria: (espaco: Espaco, id: string) => void;
  setFolgaPecas: (v: number) => void;
  definirArranjo: (placas: Colocada[][], sobraram: string[], info: InfoArranjo) => void;
  verPlaca: (i: number) => void;
  /**
   * Posicao absoluta na placa vista (coordenadas do `arrumar`). Arrastar uma peca
   * de outra placa ou da fila para esta a tira de onde estava.
   */
  posicionarNoArranjo: (c: Colocada) => void;
  limparArranjo: () => void;
  registrarSeletores: (desenho: (substituir?: boolean) => void, fonte: () => void, fonteTexto: (nome: string) => void) => void;
}

/** Em qual placa a peca esta, ou -1. */
export const placaDe = (placas: readonly ReadonlyMap<string, unknown>[], chave: string): number =>
  placas.findIndex((p) => p.has(chave));

export const useInterface = create<EstadoInterface>()((set) => ({
  espaco: 'desenhar',
  selecionada: null,
  ferramenta: 'selecionar',
  explode: 0,
  camadas: { corpo: true, chapa: true, traseira: true },
  inspetorAberto: true,
  categoria: { desenhar: 'origem', imprimir: 'maquina', orcamento: 'material' },

  placas: [],
  placaVista: 0,
  sobraram: [],
  infoArranjo: null,
  folgaPecas: 3,

  abrirDesenho: () => {},
  abrirFonte: () => {},
  abrirFonteTexto: () => {},

  setEspaco: (espaco) =>
    set((s) => ({
      espaco,
      // "Tamanho" muda o produto e so existe em Desenhar. Em Imprimir o gizmo so
      // acomoda; cair para "mover" evita uma ferramenta ativa que nao faz nada.
      ferramenta: espaco !== 'desenhar' && s.ferramenta === 'tamanho' ? 'mover' : s.ferramenta,
    })),
  // Selecionar uma peca que esta em outra placa leva a cena ate ela.
  selecionar: (selecionada) =>
    set((s) => {
      const i = selecionada ? placaDe(s.placas, selecionada) : -1;
      return i >= 0 ? { selecionada, placaVista: i } : { selecionada };
    }),
  setFerramenta: (ferramenta) => set({ ferramenta }),
  setExplode: (explode) => set({ explode }),
  setCamadas: (camadas) => set({ camadas }),
  setInspetorAberto: (inspetorAberto) => set({ inspetorAberto }),
  setCategoria: (espaco, id) => set((s) => ({ categoria: { ...s.categoria, [espaco]: id } })),
  setFolgaPecas: (folgaPecas) => set({ folgaPecas }),
  definirArranjo: (placas, sobraram, infoArranjo) =>
    set({ placas: placas.map((p) => new Map(p.map((c) => [c.nome, c]))), placaVista: 0, sobraram, infoArranjo }),
  verPlaca: (i) => set((s) => ({ placaVista: Math.max(0, Math.min(i, s.placas.length - 1)) })),
  posicionarNoArranjo: (c) =>
    set((s) => {
      const placas = s.placas.map((p, i) => {
        if (i !== s.placaVista && !p.has(c.nome)) return p;
        const n = new Map(p);
        n.delete(c.nome);
        if (i === s.placaVista) n.set(c.nome, c);
        return n;
      });
      if (!placas.length) placas.push(new Map([[c.nome, c]]));
      return { placas, sobraram: s.sobraram.filter((k) => k !== c.nome) };
    }),
  limparArranjo: () => set({ placas: [], placaVista: 0, sobraram: [], infoArranjo: null }),
  registrarSeletores: (abrirDesenho, abrirFonte, abrirFonteTexto) => set({ abrirDesenho, abrirFonte, abrirFonteTexto }),
}));
