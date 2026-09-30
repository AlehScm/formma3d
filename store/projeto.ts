'use client';

import { create } from 'zustand';
import type { Font } from 'opentype.js';
import { PRESETS, type Apoio, type BatenteModo, type ChapaModo, type Fechamento, type PresetId } from '@/lib/geom/modes';
import { PADRAO, type CustoCfg } from '@/lib/cost/calc';
import { lerSalvo, paraSalvar } from '@/lib/cost/salvar';
import type { PlacaAvulsa } from '@/lib/cost/trabalho';
import type { ResultadoFontesSistema } from '@/lib/text/fontes';
import type { ModoSeparacao, ModoTraco, TracoResolvido } from '@/lib/import/pecas';
import type { Aviso, DesenhoBruto } from '@/lib/import/pdf-ops';
import { IMPRESSORAS, acharImpressora } from '@/lib/print/impressoras';
import { SEM_EDICAO, type Edicao } from '@/lib/geom/pecaEditada';
import { agrupar, desagrupar, type Grupo } from '@/lib/cena/grupo';

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
  /** A malha como veio do arquivo, guardada na primeira edicao (Suavizar relevo). */
  original?: Float32Array;
}

/** Chave de peca: `arquivo:nome` (importada), `stl:id` (objeto 3D) ou `nome#pos` (texto). */
export { chavePecaArquivo } from '@/lib/import/fila';
export const chaveObjeto3d = (id: string) => `stl:${id}`;
export const chaveCopia = (id: string) => `copia:${id}`;

/**
 * Peca do letreiro duplicada (Ctrl+V / Ctrl+D). Guarda de qual peca ORIGINAL (texto
 * ou arquivo) ela vem: o modelo pega aquele contorno e aplica a edicao da propria
 * copia. Excluir o original nao leva a copia junto.
 */
export interface Copia {
  id: string;
  origem: string;
  nome: string;
}

function alturaDe(pos: Float32Array): number {
  let z = 0;
  for (let i = 2; i < pos.length; i += 3) z = Math.max(z, pos[i]!);
  return z;
}
export function lerChave(
  chave: string
): { tipo: 'stl'; id: string } | { tipo: 'copia'; id: string } | { tipo: 'arquivo'; arquivo: string; nome: string } | { tipo: 'texto' } {
  if (chave.startsWith('stl:')) return { tipo: 'stl', id: chave.slice(4) };
  if (chave.startsWith('copia:')) return { tipo: 'copia', id: chave.slice(6) };
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
  batenteModo: BatenteModo;
  batenteAltura: number;
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
  /** Impressoes feitas fora do app que entram no orcamento. */
  avulsas: PlacaAvulsa[];
  /** Grupos de pecas (continuam pecas separadas). Valem em Desenhar e Imprimir. */
  grupos: Grupo[];
  copias: Copia[];
  /**
   * O dono da maquina recebe antes a maquina e a luz. Fora do `cfg` de proposito:
   * nao e salvo e volta desligado a cada abertura, para ser escolhido por orcamento.
   */
  pagarMaquina: boolean;
}

type Campo = keyof EstadoProjeto;

export interface AcoesProjeto {
  /** Setter generico. `definir('altura', 150)`. */
  definir: <K extends Campo>(k: K, v: EstadoProjeto[K]) => void;
  definirCusto: <K extends keyof CustoCfg>(k: K, v: CustoCfg[K]) => void;
  adicionarAvulsa: () => void;
  ajustarAvulsa: (id: string, mudanca: Partial<Omit<PlacaAvulsa, 'id'>>) => void;
  removerAvulsa: (id: string) => void;
  /** Preenche os controles com um estilo pronto, sem travar nenhum. */
  aplicarPreset: (id: PresetId) => void;
  escolherImpressora: (id: string) => void;
  editarPeca: (chave: string, mudanca: Partial<Edicao>) => void;
  /** O gizmo de varias pecas: soma o delta de cada uma numa atualizacao so. */
  somarEdicoes: (deltas: ReadonlyMap<string, Edicao>) => void;
  resetarPeca: (chave: string) => void;
  /** Liga/desliga uma peca de arquivo, pela chave `arquivo:nome`. */
  alternarPecaImportada: (chave: string) => void;
  /** Exclui a peca: letra do texto, peca de arquivo ou objeto STL. */
  removerPeca: (chaves: string | readonly string[]) => void;
  agruparPecas: (chaves: readonly string[]) => void;
  /**
   * Cola copias das pecas (letreiro ou STL), `dx` mm para o lado, e devolve as chaves
   * novas. Copia de copia volta para o mesmo original.
   */
  colarPecas: (itens: readonly { chave: string; nome: string }[], dx: number) => string[];
  desagruparPecas: (chaves: readonly string[]) => void;
  renomearGrupo: (id: string, nome: string) => void;
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
  /** Troca a malha de um objeto STL (guardando a original para desfazer). */
  editarMalhaObjeto: (id: string, posicoes: Float32Array) => void;
  restaurarObjeto: (id: string) => void;
  guardarFonteTexto: (chave: string, fonte: Font) => void;
  /** Fecha todos os arquivos e volta para o texto. */
  fecharImport: () => void;
  /** Abrir arquivo: tira letreiro importado, objetos STL/3MF, grupos, edicoes e avulsas. */
  limparProjeto: () => void;
}

const MAQUINA = IMPRESSORAS[0]!;

export const useProjeto = create<EstadoProjeto & AcoesProjeto>()((set, get) => ({
  // Comeca vazio: o letreiro de texto so existe quando o usuario digita. Um "LETRA" de
  // exemplo aqui voltava sozinho a cada projeto novo e aparecia junto de todo import.
  texto: '',
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
  batenteModo: 'parede',
  batenteAltura: 3,
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
  avulsas: [],
  grupos: [],
  copias: [],
  pagarMaquina: false,

  definir: (k, v) => set({ [k]: v } as Partial<EstadoProjeto>),
  definirCusto: (k, v) => set((s) => ({ cfg: { ...s.cfg, [k]: v } })),
  adicionarAvulsa: () =>
    set((s) => ({ avulsas: [...s.avulsas, { id: novoId(), nome: `Avulsa ${s.avulsas.length + 1}`, pecas: 1, gramas: 0, horas: 0 }] })),
  ajustarAvulsa: (id, mudanca) => set((s) => ({ avulsas: s.avulsas.map((a) => (a.id === id ? { ...a, ...mudanca } : a)) })),
  removerAvulsa: (id) => set((s) => ({ avulsas: s.avulsas.filter((a) => a.id !== id) })),

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

  somarEdicoes: (deltas) =>
    set((s) => {
      const n = new Map(s.edicoes);
      for (const [chave, t] of deltas) {
        const a = n.get(chave) ?? SEM_EDICAO;
        n.set(chave, { dx: a.dx + t.dx, dy: a.dy + t.dy, giro: a.giro + t.giro, ex: a.ex * t.ex, ey: a.ey * t.ey });
      }
      return { edicoes: n };
    }),

  resetarPeca: (chave) =>
    set((s) => {
      const n = new Map(s.edicoes);
      n.delete(chave);
      return { edicoes: n };
    }),

  removerPeca: (chaves) =>
    set((s) => {
      const lista = typeof chaves === 'string' ? [chaves] : [...chaves];
      let objetos3d = s.objetos3d;
      let copias = s.copias;
      let arquivos = s.arquivos;
      const removidas = new Set(s.removidas);
      for (const chave of lista) {
        const c = lerChave(chave);
        if (c.tipo === 'stl') objetos3d = objetos3d.filter((o) => o.id !== c.id);
        // Mesmo lugar dos quadradinhos de Origem: excluir aqui aparece desligado la.
        else if (c.tipo === 'arquivo')
          arquivos = arquivos.map((a) => (a.id === c.arquivo ? { ...a, desativadas: new Set(a.desativadas).add(c.nome) } : a));
        else if (c.tipo === 'copia') copias = copias.filter((x) => x.id !== c.id);
        else removidas.add(chave);
      }
      // Quem saiu sai tambem do grupo; grupo que ficar com 1 se desfaz.
      const grupos = s.grupos
        .map((g) => ({ ...g, membros: g.membros.filter((k) => !lista.includes(k)) }))
        .filter((g) => g.membros.length >= 2);
      return { objetos3d, arquivos, removidas, grupos, copias };
    }),

  colarPecas: (itens, dx) => {
    const s = get();
    const novas: string[] = [];
    const objetos3d = [...s.objetos3d];
    const copias = [...s.copias];
    const edicoes = new Map(s.edicoes);
    // "L (2)", "L (3)"...: conta quantas pecas com aquele nome ja existem.
    const nomeNovo = (nome: string, jaTem: (n: string) => boolean) => {
      const base = nome.replace(/ \(\d+\)$/, '');
      let n = 2;
      while (jaTem(`${base} (${n})`)) n++;
      return `${base} (${n})`;
    };
    for (const { chave, nome } of itens) {
      const c = lerChave(chave);
      if (c.tipo === 'stl') {
        const o = objetos3d.find((x) => x.id === c.id);
        if (!o) continue;
        const id = novoId();
        objetos3d.push({ ...o, id, nome: nomeNovo(o.nome, (n) => objetos3d.some((x) => x.nome === n)), original: undefined });
        novas.push(chaveObjeto3d(id));
        continue;
      }
      // Letreiro: copia de copia aponta para o mesmo original.
      const origem = c.tipo === 'copia' ? copias.find((x) => x.id === c.id)?.origem : chave;
      if (!origem) continue;
      const id = novoId();
      copias.push({ id, origem, nome: nomeNovo(nome, (n) => copias.some((x) => x.nome === n)) });
      const e = edicoes.get(chave) ?? SEM_EDICAO;
      edicoes.set(chaveCopia(id), { ...e, dx: e.dx + dx });
      novas.push(chaveCopia(id));
    }
    set({ objetos3d, copias, edicoes });
    return novas;
  },

  agruparPecas: (chaves) =>
    set((s) => ({ grupos: agrupar(s.grupos, chaves, novoId(), `Grupo ${s.grupos.length + 1}`) })),
  desagruparPecas: (chaves) => set((s) => ({ grupos: desagrupar(s.grupos, chaves) })),
  renomearGrupo: (id, nome) =>
    set((s) => ({ grupos: s.grupos.map((g) => (g.id === id ? { ...g, nome: nome.trim() || g.nome } : g)) })),

  restaurarPecas: () =>
    set((s) => ({ removidas: new Set(), arquivos: s.arquivos.map((a) => ({ ...a, desativadas: new Set<string>() })) })),

  definirTexto: (texto) =>
    set((s) => (texto === s.texto ? {} : { texto, removidas: new Set(), edicoes: new Map(), grupos: [], copias: [] })),

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
        ...(substituir ? { edicoes: new Map(), grupos: [], copias: [] } : {}),
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
  editarMalhaObjeto: (id, posicoes) =>
    set((s) => ({
      objetos3d: s.objetos3d.map((o) =>
        o.id === id ? { ...o, posicoes, alturaZ: alturaDe(posicoes), original: o.original ?? o.posicoes } : o
      ),
    })),
  restaurarObjeto: (id) =>
    set((s) => ({
      objetos3d: s.objetos3d.map((o) =>
        o.id === id && o.original ? { ...o, posicoes: o.original, alturaZ: alturaDe(o.original), original: undefined } : o
      ),
    })),

  // Letreiro de texto novo: vazio, pronto para digitar -- nao ressuscita texto antigo.
  fecharImport: () =>
    set({ arquivos: [], arquivoAtivo: null, texto: '', removidas: new Set(), edicoes: new Map(), grupos: [], copias: [], erro: null }),
  limparProjeto: () =>
    set({
      arquivos: [],
      arquivoAtivo: null,
      texto: '',
      nomeTrabalho: '',
      objetos3d: [],
      edicoes: new Map(),
      grupos: [],
      copias: [],
      removidas: new Set(),
      avulsas: [],
      erro: null,
    }),

  guardarFonteTexto: (chave, fonte) =>
    set((s) => {
      const n = new Map(s.fontesTexto);
      n.set(chave, fonte);
      // As letras novas entram na numeracao das pecas (esquerda para a direita), entao
      // os nomes mudam: edicao ou peca desligada antiga grudaria na peca errada.
      return {
        fontesTexto: n,
        edicoes: new Map(),
        grupos: [],
        copias: [],
        arquivos: s.arquivos.map((a) => (a.desenho.textos?.length ? { ...a, desativadas: new Set<string>() } : a)),
      };
    }),
}));

const CHAVE_CUSTOS = 'formma3d:custos';

/**
 * Os custos da oficina (preco do rolo, mao de obra, o que a estimativa aprendeu)
 * valem para todos os trabalhos: ficam no navegador. Devolve o cancelamento.
 */
export function lembrarCustos(): () => void {
  try {
    const salvo = lerSalvo(JSON.parse(localStorage.getItem(CHAVE_CUSTOS) ?? 'null'));
    // Por cima do padrao ATUAL: o que o usuario nao mudou acompanha o padrao.
    useProjeto.setState({ cfg: { ...PADRAO, ...salvo } });
    // Regrava ja no formato novo (so o que mudou), consertando o que foi salvo inteiro.
    localStorage.setItem(CHAVE_CUSTOS, JSON.stringify(paraSalvar(useProjeto.getState().cfg)));
  } catch {
    // Sem armazenamento (aba anonima, bloqueado): segue com o padrao.
  }
  return useProjeto.subscribe((s, antes) => {
    if (s.cfg === antes.cfg) return;
    try {
      localStorage.setItem(CHAVE_CUSTOS, JSON.stringify(paraSalvar(s.cfg)));
    } catch {
      // Idem: nao salvar nao pode travar o app.
    }
  });
}
