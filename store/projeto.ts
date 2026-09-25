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

export interface EstadoProjeto {
  // --- origem ---
  texto: string;
  fonte: Font | null;
  fonteNome: string;
  fontesSistema: ResultadoFontesSistema;
  carregando: boolean;
  erro: string | null;
  nomeTrabalho: string;

  imp: Importado | null;
  impModo: ModoSeparacao;
  impAltura: number;
  impFundir: number;
  impTracos: ModoTraco;
  impDesativadas: Set<string>;

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
  alternarPecaImportada: (nome: string) => void;
  /** Guarda o resultado de um import novo e zera o que dependia do anterior. */
  receberImport: (imp: Importado, tracos: TracoResolvido) => void;
  guardarFonteTexto: (chave: string, fonte: Font) => void;
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

  imp: null,
  impModo: 'forma',
  impAltura: 300,
  impFundir: 0,
  impTracos: 'auto',
  impDesativadas: new Set(),

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

  alternarPecaImportada: (nome) =>
    set((s) => {
      const n = new Set(s.impDesativadas);
      if (n.has(nome)) n.delete(nome);
      else n.add(nome);
      return { impDesativadas: n };
    }),

  receberImport: (imp, tracos) =>
    set({
      imp,
      impDesativadas: new Set(),
      impAltura: Math.max(1, Math.round(imp.conteudoMm.h)),
      impModo: 'forma',
      // Mostra no painel a escolha que o 'auto' fez, para o usuario poder discordar.
      impTracos: tracos,
      // As chaves das pecas mudam com o arquivo: edicao antiga apontaria para o nada.
      edicoes: new Map(),
      erro: null,
    }),

  fecharImport: () => set({ imp: null, edicoes: new Map(), erro: null }),

  guardarFonteTexto: (chave, fonte) =>
    set((s) => {
      const n = new Map(s.fontesTexto);
      n.set(chave, fonte);
      // As letras novas entram na numeracao das pecas (esquerda para a direita), entao
      // os nomes mudam: edicao ou peca desligada antiga grudaria na peca errada.
      return { fontesTexto: n, edicoes: new Map(), impDesativadas: new Set() };
    }),
}));
