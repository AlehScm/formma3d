'use client';

import { createContext, useContext, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { textToLetters, normalizeLetters, type Letra } from '@/lib/text/glyphs';
import { buildPart, orientar, descreverPeca, type Params, type Part, type Role } from '@/lib/geom/modes';
import type { Font } from 'opentype.js';
import { regionArea, regionPerimeter, minThickness, regionBounds, unionRegion, type Region } from '@/lib/geom/region';
import { dividirPeca, ehTala, juntarPedacos, pecaDaTala, planejarCortes, type Corte, type PedacoDePeca } from '@/lib/geom/emenda';
import { carregarFonteWeb } from '@/lib/text/fontes';
import type { Insumos, Orcamento } from '@/lib/cost/calc';
import { custosDoTrabalho, type Custos } from '@/lib/cost/trabalho';
import { volumeMalha } from '@/lib/import/stl';
import { useInterface } from '@/store/interface';
import { desenhoParaPecas, resolverTracos } from '@/lib/import/pecas';
import { chaveFonte, textoEmObjetos } from '@/lib/import/texto-em-curvas';
import { MANUAL, acharImpressora, caberNaMesa, cascoConvexo, descreverVeredito, type Impressora, type Veredito } from '@/lib/print/impressoras';
import { aplicarEdicao, edicaoVazia, escalaUniforme } from '@/lib/geom/pecaEditada';
import { useProjeto, chaveCopia, chaveObjeto3d, type ArquivoImportado } from '@/store/projeto';
import { enfileirarArquivos } from '@/lib/import/fila';

/**
 * O modelo derivado: letras prontas, vereditos de mesa, avisos e orcamento.
 *
 * Calculado UMA vez, aqui, e distribuido por contexto. Se cada componente chamasse
 * um hook com estes useMemo, a etapa cara (contornos + espessura minima) rodaria
 * uma vez por componente.
 *
 * Dois contextos: geometria e orcamento. Mexer num custo muda so o orcamento, e o
 * viewport -- que le so a geometria -- nao re-renderiza.
 */

/**
 * `chave` identifica a peca de forma unica; `nome` e o rotulo que o usuario le.
 * Em texto os dois diferem: "BARBER" tem dois "B".
 */
export type LetraComPeca = Letra & {
  part: Part;
  chave: string;
  espessuraMin: number;
  /** Medida da letra ANTES da edicao da peca (a que veio do arquivo ou do texto), em mm. */
  baseW: number;
  baseH: number;
  /**
   * Ponto em torno do qual a edicao gira e escala a peca: o centro original dela
   * mais o deslocamento. E o que o gizmo de varias pecas faz orbitar.
   */
  ancora: { x: number; y: number };
  /** Dividida para caber na mesa: `part` passa a ser os pedacos juntos, na posicao do letreiro. */
  divisao?: DivisaoDaLetra;
};

/** A divisao de uma letra maior que a mesa (lib/geom/emenda.ts). */
export interface DivisaoDaLetra {
  /** Cortes automaticos (acompanham a peca e a mesa) ou dados a mao. */
  auto: boolean;
  /** Em mm a partir do canto da peca inteira (esquerda, baixo). */
  cortes: Corte[];
  inteira: Part;
  pedacos: PedacoDePeca[];
  emendas: number;
  parafusos: number;
}

/**
 * O que vai para a impressora, um item por arquivo: a letra inteira ou, dividida, cada
 * pedaco e cada tala. E isso que entra na mesa, no arranjo, no custo e na exportacao.
 */
export interface PecaImpressa {
  chave: string;
  nome: string;
  /** Chave da letra de onde veio. */
  letra: string;
  tipo: 'letra' | 'pedaco' | 'tala';
  part: Part;
}

/** Pedaco e tala tem chave propria, sem ':' (que `lerChave` le como peca de arquivo). */
export const chavePedaco = (letra: string, i: number) => `${letra}~${i}`;
export const chaveTala = (letra: string, i: number) => `${letra}~t${i}`;
/** A letra de onde veio um item da placa (o proprio, se nao for pedaco nem tala). */
export const letraDoItem = (chave: string) => chave.replace(/~t?\d+$/, '');

export interface ObjetoModelo {
  chave: string;
  nome: string;
  posicoes: Float32Array;
  /** Casco convexo em XY: conservador, nunca colide. */
  contorno: Region;
  alturaZ: number;
  volume: number;
}

/**
 * Separacao em pecas + espessura minima: a etapa cara, que so depende do desenho
 * e do jeito de separar -- nao da altura. Guardada por desenho para arrastar a
 * altura de um arquivo nao refazer o calculo de todos.
 */
type Nativas = { nome: string; region: Region; bounds: ReturnType<typeof regionBounds>; espessuraNativa: number }[];
const cacheNativas = new WeakMap<object, { chave: string; fontes: Map<string, unknown>; r: Nativas }>();

function nativasDoArquivo(a: ArquivoImportado, fontesTexto: Map<string, Font>): Nativas {
  const d = a.desenho;
  const chave = `${a.modo}|${a.tracos}|${a.fundir}`;
  const c = cacheNativas.get(d);
  if (c && c.chave === chave && c.fontes === fontesTexto) return c.r;
  // Texto vivo cuja fonte o usuario ja deu: vira contorno como o resto do desenho.
  const letrasTexto = (d.textos ?? []).flatMap((t) => {
    const f = fontesTexto.get(chaveFonte(t.fonte));
    return f ? textoEmObjetos(t, f, d.objetos.length) : [];
  });
  const completo = letrasTexto.length ? { ...d, objetos: [...d.objetos, ...letrasTexto], temFill: true } : d;
  // O que fazer com traco se decide olhando o desenho ORIGINAL: as letras do texto
  // sao preenchimento e mudariam sozinhas essa escolha.
  const tracos = resolverTracos(d, a.tracos);
  const r = desenhoParaPecas(completo, { modo: a.modo, tracos, fundirProximos: a.fundir, areaMinima: 1 }).map((x) => ({
    ...x,
    bounds: regionBounds(x.region),
    espessuraNativa: minThickness(x.region),
  }));
  cacheNativas.set(d, { chave, fontes: fontesTexto, r });
  return r;
}


export interface Modelo {
  letras: LetraComPeca[];
  /** O que vai para a impressora (ver `PecaImpressa`). Sem divisao, uma por letra. */
  impressas: PecaImpressa[];
  /** Letras (e objetos STL) com alguma peca maior que a mesa: o que o viewport pinta. */
  letrasForaDaMesa: Set<string>;
  bounds: { w: number; h: number; maiorLetra: { w: number; h: number; nome: string } } | null;
  totais: { volume: number; areaChapa: number; perimetroLed: number; qtd: number } | null;
  avisos: string[];
  mesa: Impressora;
  vereditos: Map<string, Veredito>;
  naoCabem: Set<string>;
  params: Params;
  /** Nomes nativos das pecas de cada arquivo ('01', '02'...), para os quadradinhos de Origem. */
  pecasPorArquivo: Map<string, string[]>;
  /** Objetos STL prontos, ja com footprint para o arranjo. So existem na placa. */
  objetos: ObjetoModelo[];
  /** O que cada peca consome (letras e STL), para o custo por peca e por placa. */
  insumos: Map<string, Insumos>;
  nomeProjeto: string;
  /** Descricao curta da construcao, usada nos nomes de arquivo. */
  desc: string;
  orientacao: ReturnType<typeof orientar>;
  temChapa: boolean;
  temCorte: boolean;
  rolesUsados: Set<Role>;
}

/** Fonte do numero de montagem gravado nos pedacos: so carrega quando alguma peca e dividida. */
function useFonteNumero(precisa: boolean): Font | null {
  const [fonte, setFonte] = useState<Font | null>(null);
  useEffect(() => {
    if (!precisa || fonte) return;
    let vivo = true;
    carregarFonteWeb('arimo-700').then((f) => vivo && setFonte(f), () => {});
    return () => {
      vivo = false;
    };
  }, [precisa, fonte]);
  return fonte;
}

const textoDoNumero = (fonte: Font) => (t: string, altura: number): Region =>
  textToLetters(fonte, t, { altura }).reduce<Region>((acc, l) => (acc.length ? unionRegion(acc, l.region) : l.region), []);

/** Pedacos e talas da letra dividida; a letra inteira se nao for dividida. */
function impressasDa(l: LetraComPeca): PecaImpressa[] {
  const d = l.divisao;
  if (!d || d.pedacos.length < 2) return [{ chave: l.chave, nome: l.nome, letra: l.chave, tipo: 'letra', part: d ? d.inteira : l.part }];
  const total = d.pedacos.length;
  let t = 0;
  return d.pedacos.flatMap(({ indice, part }): PecaImpressa[] => [
    { chave: chavePedaco(l.chave, indice), nome: `${l.nome}-${indice} de ${total}`, letra: l.chave, tipo: 'pedaco', part: { ...part, extras: part.extras.filter((e) => !ehTala(e)) } },
    ...part.extras.filter(ehTala).map((e): PecaImpressa => {
      t++;
      return { chave: chaveTala(l.chave, t), nome: `${l.nome}-tala${t}`, letra: l.chave, tipo: 'tala', part: pecaDaTala(e, part) };
    }),
  ]);
}

const ContextoModelo = createContext<Modelo | null>(null);
const ContextoOrcamento = createContext<Orcamento | null>(null);
const ContextoCustos = createContext<Custos | null>(null);

export function useModelo(): Modelo {
  const m = useContext(ContextoModelo);
  if (!m) throw new Error('useModelo fora do ProvedorModelo');
  return m;
}

export function useOrcamento(): Orcamento | null {
  return useContext(ContextoOrcamento);
}

/** Custo de cada peca (sem preparo) e de cada placa (com um preparo). */
export function useCustos(): Custos {
  const c = useContext(ContextoCustos);
  if (!c) throw new Error('useCustos fora do ProvedorModelo');
  return c;
}

export function ProvedorModelo({ children }: { children: ReactNode }) {
  const p = useProjeto(
    useShallow((s) => ({
      macica: s.macica,
      profundidade: s.profundidade,
      parede: s.parede,
      frente: s.frente,
      frenteEsp: s.frenteEsp,
      traseira: s.traseira,
      traseiraEsp: s.traseiraEsp,
      chapaModo: s.chapaModo,
      folga: s.folga,
      apoio: s.apoio,
      batente: s.batente,
      batenteModo: s.batenteModo,
      batenteAltura: s.batenteAltura,
      comLed: s.comLed,
      furoFio: s.furoFio,
      espacadores: s.espacadores,
      virar: s.virar,
      bico: s.bico,
      biselAtivo: s.biselAtivo,
      biselTam: s.biselTam,
    }))
  );
  const origem = useProjeto(
    useShallow((s) => ({
      arquivos: s.arquivos,
      objetos3d: s.objetos3d,
      fonte: s.fonte,
      texto: s.texto,
      altura: s.altura,
      tracking: s.tracking,
      edicoes: s.edicoes,
      fontesTexto: s.fontesTexto,
      removidas: s.removidas,
      copias: s.copias,
      nomeTrabalho: s.nomeTrabalho,
      presetAtivo: s.presetAtivo,
    }))
  );
  const maquina = useProjeto(
    useShallow((s) => ({ impressoraId: s.impressoraId, mesaX: s.mesaX, mesaY: s.mesaY, mesaZ: s.mesaZ }))
  );
  const cfg = useProjeto((s) => s.cfg);
  const divisoes = useProjeto((s) => s.divisoes);
  const emenda = useProjeto((s) => s.emenda);
  const fonteNumero = useFonteNumero(divisoes.size > 0);

  const params = useMemo<Params>(
    () => ({
      macica: p.macica,
      profundidade: p.profundidade,
      parede: p.parede,
      frente: p.frente,
      frenteEsp: p.frenteEsp,
      traseira: p.traseira,
      traseiraEsp: p.traseiraEsp,
      chapaModo: p.chapaModo,
      folga: p.folga,
      apoio: p.apoio,
      batente: p.batente,
      batenteModo: p.batenteModo,
      batenteAltura: p.batenteAltura,
      comLed: p.comLed,
      furoFio: p.furoFio,
      espacadores: p.espacadores,
      virar: p.virar,
      bico: p.bico,
      chanfro: { ativo: p.biselAtivo && p.macica, tamanho: p.biselTam, altura: p.biselTam, passos: 6 },
    }),
    [p]
  );

  const { arquivos, objetos3d, fonte, texto, altura, tracking, edicoes, fontesTexto, removidas, copias } = origem;

  // Pecas de cada arquivo, na escala nativa (ver `nativasDoArquivo`).
  const pecasNativas = useMemo(
    () => (arquivos.length ? arquivos.map((a) => ({ a, pecas: nativasDoArquivo(a, fontesTexto) })) : null),
    [arquivos, fontesTexto]
  );

  // Objetos STL: footprint pelo casco convexo dos vertices em XY.
  const objetos = useMemo<ObjetoModelo[]>(
    () =>
      objetos3d.map((o) => {
        const pts = [];
        for (let i = 0; i < o.posicoes.length; i += 3) pts.push({ x: o.posicoes[i]!, y: o.posicoes[i + 1]! });
        return {
          chave: chaveObjeto3d(o.id),
          nome: o.nome,
          posicoes: o.posicoes,
          alturaZ: o.alturaZ,
          contorno: [{ outer: cascoConvexo(pts), holes: [] }],
          volume: volumeMalha(o.posicoes),
        };
      }),
    [objetos3d]
  );

  // Etapa cara (contornos + espessura): so depende do texto, do tamanho e das edicoes.
  const letrasBase = useMemo(() => {
    type Base = Letra & { espessuraMin: number; chave: string; baseW: number; baseH: number; ancora: { x: number; y: number } };

    // A edicao entra AQUI, antes do buildPart: e o que faz a chapa, o gabarito, a
    // colisao e o preco acompanharem. Com escala nao uniforme a espessura minima
    // nao escala linearmente e a peca editada e remedida.
    const editar = (b0: Omit<Base, 'ancora'>): Base => {
      const bb = regionBounds(b0.region);
      const b: Base = { ...b0, ancora: { x: bb.minX + bb.w / 2, y: bb.minY + bb.h / 2 } };
      const e = edicoes.get(b.chave);
      if (!e || edicaoVazia(e)) return b;
      const region = aplicarEdicao(b.region, e);
      return {
        ...b,
        ancora: { x: b.ancora.x + e.dx, y: b.ancora.y + e.dy },
        region,
        bounds: regionBounds(region),
        espessuraMin: escalaUniforme(e) ? b.espessuraMin * Math.abs(e.ex) : minThickness(region),
      };
    };

    // Todas as pecas de origem, inclusive as excluidas: a copia (Ctrl+V) guarda de qual
    // original veio e continua existindo se ele for excluido.
    type Crua = Omit<Base, 'ancora'>;
    let todas: Crua[] = [];
    let vivas: (chave: string) => boolean = () => true;
    if (pecasNativas) {
      const fila = (comDesligadas: boolean) =>
        enfileirarArquivos(
          pecasNativas.map(({ a, pecas }) => ({ id: a.id, alvo: a.altura, desativadas: comDesligadas ? new Set<string>() : a.desativadas, pecas }))
        ).map((x) => {
          const bb = regionBounds(x.region);
          return { ...x, bounds: bb, baseW: bb.w, baseH: bb.h };
        });
      // As vivas na posicao de sempre (arquivo todo desligado nao ocupa espaco); a
      // fila completa so serve de origem para copia de peca que foi excluida.
      const vivasLista = fila(false);
      const chavesVivas = new Set(vivasLista.map((x) => x.chave));
      todas = [...vivasLista, ...fila(true).filter((x) => !chavesVivas.has(x.chave))];
      vivas = (k) => chavesVivas.has(k);
    } else if (fonte && texto.trim()) {
      // A chave usa a posicao ANTES de filtrar: excluir uma letra nao pode renomear as outras.
      todas = normalizeLetters(textToLetters(fonte, texto, { altura, tracking })).map((l, i) => ({
        ...l,
        chave: `${l.nome}#${i}`,
        espessuraMin: minThickness(l.region),
        baseW: l.bounds.w,
        baseH: l.bounds.h,
      }));
      vivas = (k) => !removidas.has(k);
    }
    const porChave = new Map(todas.map((b) => [b.chave, b]));
    const duplicadas = copias.flatMap((c) => {
      const b = porChave.get(c.origem);
      return b ? [{ ...b, chave: chaveCopia(c.id), nome: c.nome }] : [];
    });
    return [...todas.filter((b) => vivas(b.chave)), ...duplicadas].map(editar);
  }, [pecasNativas, fonte, texto, altura, tracking, edicoes, removidas, copias]);

  // Enquanto o slider se move, o React mantem o quadro anterior em vez de travar.
  // So primitivos ou valores estaveis: objeto novo a cada render anularia o efeito.
  const paramsDiferidos = useDeferredValue(params);
  const mesaXD = useDeferredValue(maquina.mesaX);
  const mesaYD = useDeferredValue(maquina.mesaY);
  const mesaZD = useDeferredValue(maquina.mesaZ);
  const impressoraD = useDeferredValue(maquina.impressoraId);

  const mesa = useMemo<Impressora>(() => {
    const escolhida = acharImpressora(impressoraD);
    return escolhida
      ? { ...escolhida, x: mesaXD, y: mesaYD, z: mesaZD }
      : { id: MANUAL, nome: 'Mesa manual', x: mesaXD, y: mesaYD, z: mesaZD, bicos: 1 };
  }, [impressoraD, mesaXD, mesaYD, mesaZD]);

  const inteiras = useMemo<LetraComPeca[]>(
    () => letrasBase.map((l) => ({ ...l, part: buildPart(l.region, paramsDiferidos, l.espessuraMin) })),
    [letrasBase, paramsDiferidos]
  );

  // Divisao depois do buildPart: a edicao e a copia continuam na letra inteira.
  const divididas = useMemo<LetraComPeca[]>(() => {
    if (!divisoes.size) return inteiras;
    const texto = fonteNumero ? textoDoNumero(fonteNumero) : undefined;
    return inteiras.map((l) => {
      const d = divisoes.get(l.chave);
      if (!d) return l;
      const bb = regionBounds(l.part.contorno);
      const origem = (c: Corte) => (c.eixo === 'x' ? bb.minX : bb.minY);
      const cortes = d === 'auto' ? planejarCortes(l.part, paramsDiferidos, mesa, emenda) : d.map((c) => ({ ...c, pos: c.pos + origem(c) }));
      const div = dividirPeca(l.part, paramsDiferidos, cortes, emenda, l.nome.replace(/[^A-Za-z0-9]/g, '').slice(0, 4), texto);
      return {
        ...l,
        part: juntarPedacos(l.part, div),
        divisao: {
          auto: d === 'auto',
          cortes: cortes.map((c) => ({ ...c, pos: Math.round((c.pos - origem(c)) * 10) / 10 })),
          inteira: l.part,
          pedacos: div.pedacos,
          emendas: div.emendas,
          parafusos: div.parafusos,
        },
      };
    });
  }, [inteiras, divisoes, emenda, mesa, paramsDiferidos, fonteNumero]);

  const geo = useMemo(() => {
    if (!divididas.length) {
      return { letras: [] as LetraComPeca[], impressas: [] as PecaImpressa[], bounds: null, totais: null, avisos: [] as string[], mesa, vereditos: new Map<string, Veredito>(), letrasForaDaMesa: new Set<string>(), insumos: new Map<string, Insumos>() };
    }
    const letras = divididas;
    const impressas = letras.flatMap(impressasDa);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let volume = 0;
    let areaChapa = 0;
    let perimetroLed = 0;
    let maiorLetra = { w: 0, h: 0, nome: '' };
    const avisos = new Set<string>();
    const vereditos = new Map<string, Veredito>();
    const letrasForaDaMesa = new Set<string>();
    const insumos = new Map<string, Insumos>();

    for (const l of letras) {
      // O footprint REAL (`part.contorno`) e o que conta para o letreiro.
      const bp = regionBounds(l.part.contorno);
      minX = Math.min(minX, bp.minX);
      minY = Math.min(minY, bp.minY);
      maxX = Math.max(maxX, bp.maxX);
      maxY = Math.max(maxY, bp.maxY);
      if (bp.w > maiorLetra.w) maiorLetra = { w: bp.w, h: bp.h, nome: l.nome };
      for (const a of l.part.avisos) avisos.add(a);
    }

    // Mesa e custo por item impresso. A letra dividida leva LED, emendas e parafusos no 1o pedaco.
    const porChave = new Map(letras.map((l) => [l.chave, l]));
    const primeiro = new Set<string>();
    for (const i of impressas) {
      const ins: Insumos = { volumeMm3: i.part.volume, areaChapaMm2: 0, perimetroLedMm: 0 };
      for (const e of i.part.extras) {
        if (e.kind === 'cut') ins.areaChapaMm2 += regionArea(e.region);
        else ins.volumeMm3 += e.layers.reduce((a, x) => a + regionArea(x.region) * (x.z1 - x.z0), 0);
      }
      const l = porChave.get(i.letra)!;
      if (!primeiro.has(i.letra)) {
        primeiro.add(i.letra);
        if (paramsDiferidos.comLed) ins.perimetroLedMm = regionPerimeter(l.region) / 2;
        if (l.divisao && l.divisao.pedacos.length > 1) {
          ins.emendas = l.divisao.emendas;
          ins.parafusos = l.divisao.parafusos;
        }
      }
      insumos.set(i.chave, ins);
      volume += ins.volumeMm3;
      areaChapa += ins.areaChapaMm2;
      perimetroLed += ins.perimetroLedMm;

      const v = caberNaMesa(i.part.contorno, i.part.alturaZ, mesa);
      vereditos.set(i.chave, v);
      if (!v.cabe) {
        letrasForaDaMesa.add(i.letra);
        const bi = regionBounds(i.part.contorno);
        avisos.add(`A peça "${i.nome}" (${bi.w.toFixed(0)}×${bi.h.toFixed(0)} mm) ${descreverVeredito(v, mesa)} na ${mesa.nome}.`);
      }
    }

    const alturaZ = letras[0]?.part.alturaZ ?? paramsDiferidos.profundidade;
    if (alturaZ > mesa.z) {
      avisos.add(`A peça tem ${alturaZ.toFixed(0)} mm de altura em Z e a ${mesa.nome} vai até ${mesa.z} mm. Deite a peça ou reduza a profundidade.`);
    }

    return {
      letras,
      impressas,
      bounds: { w: maxX - minX, h: maxY - minY, maiorLetra },
      totais: { volume, areaChapa, perimetroLed, qtd: letras.length },
      avisos: [...avisos],
      mesa,
      vereditos,
      letrasForaDaMesa,
      insumos,
    };
  }, [divididas, paramsDiferidos, mesa]);

  const modelo = useMemo<Modelo>(() => {
    // Os STL entram no veredito de mesa junto com as letras: dividem a mesma placa.
    const vereditos = new Map(geo.vereditos);
    const letrasForaDaMesa = new Set(geo.letrasForaDaMesa);
    for (const o of objetos) {
      const v = caberNaMesa(o.contorno, o.alturaZ, geo.mesa);
      vereditos.set(o.chave, v);
      if (!v.cabe) letrasForaDaMesa.add(o.chave);
    }
    const naoCabem = new Set([...vereditos].filter(([, v]) => !v.cabe).map(([k]) => k));
    const primeiro = arquivos[0];
    const insumos = new Map(geo.insumos);
    for (const o of objetos) insumos.set(o.chave, { volumeMm3: o.volume, areaChapaMm2: 0, perimetroLedMm: 0 });
    return {
      ...geo,
      vereditos,
      naoCabem,
      letrasForaDaMesa,
      insumos,
      params,
      objetos,
      pecasPorArquivo: new Map((pecasNativas ?? []).map(({ a, pecas }) => [a.id, pecas.map((x) => x.nome)])),
      // Nomeia STL, zip e orcamento: arquivo importado, nome dado a mao, ou o texto.
      nomeProjeto: primeiro
        ? primeiro.nomeArquivo.replace(/\.[^.]+$/, '') + (arquivos.length > 1 ? ` + ${arquivos.length - 1}` : '')
        : origem.nomeTrabalho || texto || (objetos[0]?.nome ?? ''),
      desc: origem.presetAtivo ?? descreverPeca(params),
      orientacao: orientar(params),
      temChapa: params.frente === 'chapa' || params.traseira === 'chapa',
      temCorte: geo.letras.some((l) => l.part.extras.some((x) => x.kind === 'cut')),
      rolesUsados: new Set<Role>(geo.letras.flatMap((l) => l.part.layers.map((x) => x.role))),
    };
  }, [geo, params, pecasNativas, objetos, arquivos, origem.nomeTrabalho, origem.presetAtivo, texto]);

  // Custo por peca, por placa e do letreiro, com os gramas e o tempo reais que o
  // usuario deu por placa. Sem arranjo, o trabalho inteiro conta como uma placa.
  const placas = useInterface((s) => s.placas);
  const reais = useInterface((s) => s.reais);
  const excluidas = useInterface((s) => s.excluidas);
  const avulsasTodas = useProjeto((s) => s.avulsas);
  const custos = useMemo(
    () =>
      custosDoTrabalho({
        insumos: modelo.insumos,
        placas: placas.length ? placas.map((p) => [...p.keys()]) : [[...modelo.insumos.keys()]],
        reais,
        ehLetra: (k) => geo.insumos.has(k),
        excluidas,
        // Avulsa sem gramas ou tempo ainda esta sendo preenchida: nao conta.
        avulsas: avulsasTodas.filter((a) => a.gramas > 0 && a.horas > 0),
        cfg,
      }),
    [modelo.insumos, geo.insumos, placas, reais, excluidas, avulsasTodas, cfg]
  );

  return (
    <ContextoModelo.Provider value={modelo}>
      <ContextoCustos.Provider value={custos}>
        <ContextoOrcamento.Provider value={custos.total}>{children}</ContextoOrcamento.Provider>
      </ContextoCustos.Provider>
    </ContextoModelo.Provider>
  );
}
