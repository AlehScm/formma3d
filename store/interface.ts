'use client';

import { create } from 'zustand';
import type { Colocada } from '@/lib/print/arranjo';
import type { DadoReal } from '@/lib/cost/trabalho';
import { clicar, type Modificadores } from '@/lib/cena/selecao';
import type { Relevo } from '@/lib/mesh/relevo';
import { useProjeto } from '@/store/projeto';

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
  /** Tudo que esta marcado. A ultima e a principal (inspetor e gizmo olham para ela). */
  selecao: string[];
  /** A principal: `selecao` no fim, ou null. Mantida junto para quem so le uma. */
  selecionada: string | null;
  /** So da tela: ocultar e travar nao mudam produto, custo nem exportacao. */
  ocultas: Set<string>;
  travadas: Set<string>;
  /** Suavizar relevo: objeto STL em que o clique procura a marca (null = desligado). */
  ferramentaRelevo: string | null;
  opcoesRelevo: { alturaMax: number; raio: number };
  /** Ultimo clique e o que ele achou: a previa em vermelho. */
  relevo: { objeto: string; tri: number; ponto: [number, number, number]; resultado: Relevo } | null;
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
  /**
   * Gramas e tempo que o fatiador deu para cada placa (mesma posicao de `placas`;
   * sem arranjo, a posicao 0 e o trabalho inteiro). Rearrumar apaga: a placa mudou.
   */
  reais: (DadoReal | null)[];
  /** Placas tiradas do orcamento (posicao em `placas`). Rearrumar devolve todas. */
  excluidas: Set<number>;
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
  /** Troca a selecao inteira (Ctrl+A, menu, painel). */
  definirSelecao: (chaves: string[]) => void;
  /** Clique numa peca, no 3D ou no painel, com Ctrl/Shift. `ordem` e a do painel. */
  clicarObjeto: (chave: string, mods: Modificadores, ordem: readonly string[]) => void;
  alternarOcultas: (chaves: readonly string[]) => void;
  definirFerramentaRelevo: (chave: string | null) => void;
  definirOpcoesRelevo: (o: Partial<{ alturaMax: number; raio: number }>) => void;
  definirRelevo: (r: EstadoInterface['relevo']) => void;
  alternarTravadas: (chaves: readonly string[]) => void;
  setFerramenta: (f: Ferramenta) => void;
  setExplode: (v: number) => void;
  setCamadas: (c: CamadasVisiveis) => void;
  setInspetorAberto: (v: boolean) => void;
  setCategoria: (espaco: Espaco, id: string) => void;
  setFolgaPecas: (v: number) => void;
  definirArranjo: (placas: Colocada[][], sobraram: string[], info: InfoArranjo) => void;
  verPlaca: (i: number) => void;
  definirReal: (i: number, r: DadoReal | null) => void;
  alternarExcluida: (i: number) => void;
  /**
   * Posicao absoluta na placa vista (coordenadas do `arrumar`). Arrastar uma peca
   * de outra placa ou da fila para esta a tira de onde estava.
   */
  posicionarNoArranjo: (c: Colocada) => void;
  limparArranjo: () => void;
  registrarSeletores: (desenho: (substituir?: boolean) => void, fonte: () => void, fonteTexto: (nome: string) => void) => void;
}

/**
 * Nova selecao + a principal. Selecionar uma peca que esta em outra placa leva a
 * cena ate ela.
 */
function comSelecao(s: EstadoInterface, selecao: string[]): Partial<EstadoInterface> {
  const selecionada = selecao[selecao.length - 1] ?? null;
  const i = selecionada ? placaDe(s.placas, selecionada) : -1;
  // O Suavizar vale para UMA peca: marcou outra coisa (ou nada), ele desliga sozinho.
  const semRelevo = s.ferramentaRelevo && !(selecao.length === 1 && selecao[0] === s.ferramentaRelevo);
  return {
    selecao,
    selecionada,
    ...(i >= 0 ? { placaVista: i } : {}),
    ...(semRelevo ? { ferramentaRelevo: null, relevo: null } : {}),
  };
}

/** Liga todas se alguma estava desligada; senao desliga todas (como o olho do Photoshop). */
function alternar(atual: ReadonlySet<string>, chaves: readonly string[]): Set<string> {
  const n = new Set(atual);
  const todas = chaves.every((k) => n.has(k));
  for (const k of chaves) {
    if (todas) n.delete(k);
    else n.add(k);
  }
  return n;
}

/** Em qual placa a peca esta, ou -1. */
export const placaDe = (placas: readonly ReadonlyMap<string, unknown>[], chave: string): number =>
  placas.findIndex((p) => p.has(chave));

export const useInterface = create<EstadoInterface>()((set) => ({
  espaco: 'desenhar',
  selecao: [],
  selecionada: null,
  ocultas: new Set(),
  travadas: new Set(),
  ferramentaRelevo: null,
  opcoesRelevo: { alturaMax: 2, raio: 40 },
  relevo: null,
  ferramenta: 'selecionar',
  explode: 0,
  camadas: { corpo: true, chapa: true, traseira: true },
  inspetorAberto: true,
  categoria: { desenhar: 'origem', imprimir: 'maquina', orcamento: 'material' },

  placas: [],
  placaVista: 0,
  sobraram: [],
  reais: [],
  excluidas: new Set(),
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
      // O Suavizar so existe em Imprimir: sair de la desliga.
      ...(espaco !== 'imprimir' ? { ferramentaRelevo: null, relevo: null } : {}),
    })),
  selecionar: (chave) => set((s) => comSelecao(s, chave ? [chave] : [])),
  definirSelecao: (chaves) => set((s) => comSelecao(s, chaves)),
  clicarObjeto: (chave, mods, ordem) =>
    set((s) => comSelecao(s, clicar(s.selecao, chave, mods, useProjeto.getState().grupos, ordem))),
  alternarOcultas: (chaves) => set((s) => ({ ocultas: alternar(s.ocultas, chaves) })),
  definirFerramentaRelevo: (ferramentaRelevo) => set({ ferramentaRelevo, relevo: null }),
  definirOpcoesRelevo: (o) => set((s) => ({ opcoesRelevo: { ...s.opcoesRelevo, ...o } })),
  definirRelevo: (relevo) => set({ relevo }),
  alternarTravadas: (chaves) => set((s) => ({ travadas: alternar(s.travadas, chaves) })),
  setFerramenta: (ferramenta) => set({ ferramenta }),
  setExplode: (explode) => set({ explode }),
  setCamadas: (camadas) => set({ camadas }),
  setInspetorAberto: (inspetorAberto) => set({ inspetorAberto }),
  setCategoria: (espaco, id) => set((s) => ({ categoria: { ...s.categoria, [espaco]: id } })),
  setFolgaPecas: (folgaPecas) => set({ folgaPecas }),
  definirArranjo: (placas, sobraram, infoArranjo) =>
    set({ placas: placas.map((p) => new Map(p.map((c) => [c.nome, c]))), placaVista: 0, sobraram, infoArranjo, reais: [], excluidas: new Set() }),
  alternarExcluida: (i) =>
    set((s) => {
      const excluidas = new Set(s.excluidas);
      if (!excluidas.delete(i)) excluidas.add(i);
      return { excluidas };
    }),
  definirReal: (i, r) =>
    set((s) => {
      const reais = [...s.reais];
      while (reais.length <= i) reais.push(null);
      reais[i] = r;
      return { reais };
    }),
  verPlaca: (i) => set((s) => ({ placaVista: Math.max(0, Math.min(i, s.placas.length - 1)) })),
  posicionarNoArranjo: (c) =>
    set((s) => {
      // Placa que ganhou ou perdeu peca nao e mais a que foi fatiada.
      const reais = s.reais.map((r, i) => (i === s.placaVista || s.placas[i]?.has(c.nome) ? null : r));
      const placas = s.placas.map((p, i) => {
        if (i !== s.placaVista && !p.has(c.nome)) return p;
        const n = new Map(p);
        n.delete(c.nome);
        if (i === s.placaVista) n.set(c.nome, c);
        return n;
      });
      if (!placas.length) placas.push(new Map([[c.nome, c]]));
      return { placas, reais, sobraram: s.sobraram.filter((k) => k !== c.nome) };
    }),
  limparArranjo: () => set({ placas: [], placaVista: 0, sobraram: [], infoArranjo: null, reais: [], excluidas: new Set() }),
  registrarSeletores: (abrirDesenho, abrirFonte, abrirFonteTexto) => set({ abrirDesenho, abrirFonte, abrirFonteTexto }),
}));
