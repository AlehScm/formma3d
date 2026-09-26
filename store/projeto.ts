'use client';

import { create } from 'zustand';
import type { Font } from 'opentype.js';
import { PRESETS, type Apoio, type ChapaModo, type Fechamento, type PresetId } from '@/lib/geom/modes';
import { PADRAO, type CustoCfg } from '@/lib/cost/calc';
import type { ResultadoFontesSistema } from '@/lib/text/fontes';
import type { ModoSeparacao, ModoTraco, TracoResolvido } from '@/lib/import/pecas';
import type { Aviso, DesenhoBruto } from '@/lib/import/pdf-ops';
import { IMPRESSORAS, acharImpressora } from '@/lib/print/impressoras';
import { SEM_EDICAO, type Edicao } from '@/lib/geom/pecaEditada';

/**
 * Estado do PROJETO: tudo que define o letreiro e o que ele custa.
 *
 * Separado do estado de interface (`store/interface.ts`) de proposito: o que esta
 * aqui muda o produto; o que esta la so muda o que se ve. Salvar/abrir um projeto
 * um dia vai persistir esta store e nenhuma linha da outra.
 *
 * Componentes leem com seletor (`useProjeto((s) => s.altura)`), para mexer num
 * campo re-renderizar so quem usa aquele campo.
 */

export interface Importado {
  desenho: DesenhoBruto;
  nomeArquivo: string;
  paginas: number;
  pagina: number;
  avisos: Aviso[];
  conteudoMm: { w: number; h: number };
  buf: ArrayBuffer;
}

/**
 * Um arquivo .ai/.pdf do letreiro, com os ajustes DELE: cada arquivo tem a sua
 * altura e o seu jeito de separar pecas. Estilo, profundidade e chapa sao do
 * letreiro inteiro.
 */
export interface ArquivoImportado extends Importado {
  id: string;
  modo: ModoSeparacao;
  altura: number;
  fundir: number;
  tracos: ModoTraco;
  /** Pecas desligadas, pelo nome nativo ('01', '02'...). */
  desativadas: Set<string>;
}

/**
 * Objeto 3D pronto (STL): nao vira letra caixa e nao entra no orcamento do letreiro.
 * So divide a placa -- arranjo, veredito de mesa e arquivo da placa.
 */
export interface Objeto3d {
  id: string;
  nome: string;
  /** Sopa de triangulos em mm, centrada em XY e assentada em Z=0. */
  posicoes: Float32Array;
  alturaZ: number;
}

/** Chave de peca: `arquivo:nome` (importada), `stl:id` (objeto 3D) ou `nome#pos` (texto). */
export { chavePecaArquivo } from '@/lib/import/fila';
export const chaveObjeto3d = (id: string) => `stl:${id}`;
export function lerChave(chave: string): { tipo: 'stl'; id: string } | { tipo: 'arquivo'; arquivo: string; nome: string } | { tipo: 'texto' } {
  if (chave.startsWith('stl:')) return { tipo: 'stl', id: chave.slice(4) };
  const i = chave.indexOf(':');
  if (i > 0) return { tipo: 'arquivo', arquivo: chave.slice(0, i), nome: chave.slice(i + 1) };
  return { tipo: 'texto' };
}

let proximoId = 1;
const novoId = () => (proximoId++).toString(36);

export interface EstadoProjeto {
  // --- origem ---
  texto: string;
  fonte: Font | null;
  fonteNome: string;
  fontesSistema: ResultadoFontesSistema;
  carregando: boolean;
  erro: string | null;
  nomeTrabalho: string;

  /** Arquivos do letreiro. Vazio = o letreiro vem do texto. */
  arquivos: ArquivoImportado[];
  /** Qual arquivo tem os ajustes abertos em Origem. */
  arquivoAtivo: string | null;
  objetos3d: Objeto3d[];

  // --- medidas ---
  altura: number;
  tracking: number;
  profundidade: number;
  parede: number;

  // --- construcao ---
  presetAtivo: PresetId | null;
  macica: boolean;
  frente: Fechamento;
  frenteEsp: number;
  traseira: Fechamento;
  traseiraEsp: number;
  chapaModo: ChapaModo;
  folga: number;
  apoio: Apoio;
  borda: number;
  batente: number;
  labio: number;
  bordaCompensa: boolean;
  comLed: boolean;
  furoFio: number;
  espacadores: number;
  biselAtivo: boolean;
  biselTam: number;

  // --- impressao ---
  virar: boolean;
  bico: number;
  impressoraId: string;
  mesaX: number;
  mesaY: number;
  mesaZ: number;

  /** Edicao por peca (mover/girar/tamanho). Muda o produto. Chave = `LetraComPeca.chave`. */
  edicoes: Map<string, Edicao>;

  /**
   * Fontes para desenhar o texto vivo do arquivo importado, por `chaveFonte(nome)`.
   * O arquivo diz qual fonte usa; o usuario da a fonte (do computador ou .ttf).
   */
  fontesTexto: Map<string, Font>;

  /**
   * Letras do TEXTO que o usuario excluiu, por chave. Peca de arquivo usa o
   * `desativadas` do proprio arquivo (os quadradinhos de Origem).
   */
  removidas: Set<string>;

  cfg: CustoCfg;
}

type Campo = keyof EstadoProjeto;

export interface AcoesProjeto {
  /** Setter generico. `definir('altura', 150)`. */
  definir: <K extends Campo>(k: K, v: EstadoProjeto[K]) => void;
  definirCusto: <K extends keyof CustoCfg>(k: K, v: CustoCfg[K]) => void;
  /** Preenche os controles com um estilo pronto, sem travar nenhum. */
  aplicarPreset: (id: PresetId) => void;
  escolherImpressora: (id: string) => void;
  editarPeca: (chave: string, mudanca: Partial<Edicao>) => void;
  resetarPeca: (chave: string) => void;
  /** Liga/desliga uma peca de arquivo, pela chave `arquivo:nome`. */
  alternarPecaImportada: (chave: string) => void;
  /** Exclui a peca: letra do texto, peca de arquivo ou objeto STL. */
  removerPeca: (chave: string) => void;
  /** Traz de volta tudo o que foi excluido (texto e arquivos). */
  restaurarPecas: () => void;
  /**
   * Troca o texto. Zera edicoes e exclusoes: a chave da letra e a posicao dela, e
   * com outro texto a edicao de uma letra passaria para a vizinha.
   */
  definirTexto: (texto: string) => void;
  /**
   * Arquivo novo. `substituir` fecha os outros (Abrir desenho); sem ele, entra ao
   * lado dos que ja estao (Adicionar arquivo).
   */
  adicionarArquivo: (imp: Importado, tracos: TracoResolvido, substituir: boolean) => void;
  ajustarArquivo: (id: string, mudanca: Partial<Omit<ArquivoImportado, 'id'>>) => void;
  removerArquivo: (id: string) => void;
  adicionarObjeto3d: (o: Omit<Objeto3d, 'id'>) => void;
  guardarFonteTexto: (chave: string, fonte: Font) => void;
  /** Fecha todos os arquivos e volta para o texto. */
  fecharImport: () => void;
}

const MAQUINA = IMPRESSORAS[0]!;

export const useProjeto = create<EstadoProjeto & AcoesProjeto>()((set) => ({
  texto: 'LETRA',
  fonte: null,
  fonteNome: 'Anton',
  fontesSistema: { suportado: true, fontes: [] },
  carregando: true,
  erro: null,
  nomeTrabalho: '',

  arquivos: [],
  arquivoAtivo: null,
  objetos3d: [],

  altura: 150,
  tracking: 0,
  profundidade: 40,
  parede: 2.4,

  presetAtivo: 'moldura_acm',
  macica: false,
  frente: 'chapa',
  frenteEsp: 3,
  traseira: 'impressa',
  traseiraEsp: 2,
  chapaModo: 'cortar',
  folga: 0.3,
  apoio: 'dentro',
  borda: 3,
  batente: 2.5,
  labio: 1,
  bordaCompensa: true,
  comLed: false,
  furoFio: 6,
  espacadores: 0,
  biselAtivo: false,
  biselTam: 1.5,

  virar: false,
  bico: 0.4,
  impressoraId: MAQUINA.id,
  mesaX: MAQUINA.x,
  mesaY: MAQUINA.y,
  mesaZ: MAQUINA.z,

  edicoes: new Map(),
  fontesTexto: new Map(),
  removidas: new Set(),
  cfg: PADRAO,

  definir: (k, v) => set({ [k]: v } as Partial<EstadoProjeto>),
  definirCusto: (k, v) => set((s) => ({ cfg: { ...s.cfg, [k]: v } })),

  aplicarPreset: (id) =>
    set(() => {
      const q = PRESETS[id].params;
      const m: Partial<EstadoProjeto> = { presetAtivo: id };
      if (q.macica !== undefined) m.macica = q.macica;
      if (q.frente) m.frente = q.frente;
      if (q.frenteEsp !== undefined) m.frenteEsp = q.frenteEsp;
      if (q.traseira) m.traseira = q.traseira;
      if (q.traseiraEsp !== undefined) m.traseiraEsp = q.traseiraEsp;
      if (q.chapaModo) m.chapaModo = q.chapaModo;
      if (q.apoio) m.apoio = q.apoio;
      if (q.batente !== undefined) m.batente = q.batente;
      if (q.parede !== undefined) m.parede = q.parede;
      if (q.profundidade !== undefined) m.profundidade = q.profundidade;
      m.comLed = q.comLed ?? false;
      m.furoFio = q.furoFio ?? 6;
      m.espacadores = q.espacadores ?? 0;
      return m;
    }),

  escolherImpressora: (id) =>
    set(() => {
      // A mesa ativa e sempre mesaX/Y/Z; escolher uma maquina so preenche esses
      // numeros, e o modo manual parte do que estava.
      const m = acharImpressora(id);
      return m ? { impressoraId: id, mesaX: m.x, mesaY: m.y, mesaZ: m.z } : { impressoraId: id };
    }),

  editarPeca: (chave, mudanca) =>
    set((s) => {
      const n = new Map(s.edicoes);
      n.set(chave, { ...(n.get(chave) ?? SEM_EDICAO), ...mudanca });
      return { edicoes: n };
    }),

  resetarPeca: (chave) =>
    set((s) => {
      const n = new Map(s.edicoes);
      n.delete(chave);
      return { edicoes: n };
    }),

  removerPeca: (chave) =>
    set((s) => {
      const c = lerChave(chave);
      if (c.tipo === 'stl') return { objetos3d: s.objetos3d.filter((o) => o.id !== c.id) };
      if (c.tipo === 'arquivo') {
        // Mesmo lugar dos quadradinhos de Origem: excluir aqui aparece desligado la.
        return {
          arquivos: s.arquivos.map((a) => (a.id === c.arquivo ? { ...a, desativadas: new Set(a.desativadas).add(c.nome) } : a)),
        };
      }
      return { removidas: new Set(s.removidas).add(chave) };
    }),

  restaurarPecas: () =>
    set((s) => ({ removidas: new Set(), arquivos: s.arquivos.map((a) => ({ ...a, desativadas: new Set<string>() })) })),

  definirTexto: (texto) =>
    set((s) => (texto === s.texto ? {} : { texto, removidas: new Set(), edicoes: new Map() })),

  alternarPecaImportada: (chave) =>
    set((s) => {
      const c = lerChave(chave);
      if (c.tipo !== 'arquivo') return {};
      return {
        arquivos: s.arquivos.map((a) => {
          if (a.id !== c.arquivo) return a;
          const n = new Set(a.desativadas);
          if (n.has(c.nome)) n.delete(c.nome);
          else n.add(c.nome);
          return { ...a, desativadas: n };
        }),
      };
    }),

  adicionarArquivo: (imp, tracos, substituir) =>
    set((s) => {
      const a: ArquivoImportado = {
        ...imp,
        id: novoId(),
        modo: 'forma',
        altura: Math.max(1, Math.round(imp.conteudoMm.h)),
        fundir: 0,
        // Mostra no painel a escolha que o 'auto' fez, para o usuario poder discordar.
        tracos,
        desativadas: new Set(),
      };
      return {
        arquivos: substituir ? [a] : [...s.arquivos, a],
        arquivoAtivo: a.id,
        // Substituir troca as pecas: edicao antiga apontaria para o nada.
        ...(substituir ? { edicoes: new Map() } : {}),
        erro: null,
      };
    }),

  ajustarArquivo: (id, mudanca) =>
    set((s) => ({ arquivos: s.arquivos.map((a) => (a.id === id ? { ...a, ...mudanca } : a)) })),

  removerArquivo: (id) =>
    set((s) => {
      const arquivos = s.arquivos.filter((a) => a.id !== id);
      // Edicoes das pecas desse arquivo vao junto.
      const edicoes = new Map([...s.edicoes].filter(([k]) => !k.startsWith(`${id}:`)));
      return { arquivos, edicoes, arquivoAtivo: s.arquivoAtivo === id ? (arquivos[0]?.id ?? null) : s.arquivoAtivo };
    }),

  adicionarObjeto3d: (o) => set((s) => ({ objetos3d: [...s.objetos3d, { ...o, id: novoId() }], erro: null })),

  fecharImport: () => set({ arquivos: [], arquivoAtivo: null, edicoes: new Map(), erro: null }),

  guardarFonteTexto: (chave, fonte) =>
    set((s) => {
      const n = new Map(s.fontesTexto);
      n.set(chave, fonte);
      // As letras novas entram na numeracao das pecas (esquerda para a direita), entao
      // os nomes mudam: edicao ou peca desligada antiga grudaria na peca errada.
      return {
        fontesTexto: n,
        edicoes: new Map(),
        arquivos: s.arquivos.map((a) => (a.desenho.textos?.length ? { ...a, desativadas: new Set<string>() } : a)),
      };
    }),
}));
