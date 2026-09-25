'use client';

import { createContext, useContext, useDeferredValue, useMemo, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { textToLetters, normalizeLetters, type Letra } from '@/lib/text/glyphs';
import { buildPart, alturaArte, orientar, descreverPeca, type Params, type Part, type Role } from '@/lib/geom/modes';
import { regionArea, regionPerimeter, minThickness, regionBounds, scaleRegion, translateRegion } from '@/lib/geom/region';
import { colisoesPorBorda, avisoColisao } from '@/lib/geom/letreiro';
import { orcar, type Orcamento } from '@/lib/cost/calc';
import { desenhoParaPecas, resolverTracos } from '@/lib/import/pecas';
import { chaveFonte, textoEmObjetos } from '@/lib/import/texto-em-curvas';
import { MANUAL, acharImpressora, caberNaMesa, descreverVeredito, type Impressora, type Veredito } from '@/lib/print/impressoras';
import { aplicarEdicao, edicaoVazia, escalaUniforme } from '@/lib/geom/pecaEditada';
import { useProjeto } from '@/store/projeto';

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
};

export interface Modelo {
  letras: LetraComPeca[];
  bounds: { w: number; h: number; maiorLetra: { w: number; h: number; nome: string } } | null;
  totais: { volume: number; areaChapa: number; perimetroLed: number; qtd: number } | null;
  avisos: string[];
  mesa: Impressora;
  vereditos: Map<string, Veredito>;
  naoCabem: Set<string>;
  params: Params;
  /** Pecas do arquivo importado antes de escalar, para o painel de origem. */
  nomesImportados: string[];
  nomeProjeto: string;
  /** Descricao curta da construcao, usada nos nomes de arquivo. */
  desc: string;
  orientacao: ReturnType<typeof orientar>;
  temChapa: boolean;
  temCorte: boolean;
  rolesUsados: Set<Role>;
}

const ContextoModelo = createContext<Modelo | null>(null);
const ContextoOrcamento = createContext<Orcamento | null>(null);

export function useModelo(): Modelo {
  const m = useContext(ContextoModelo);
  if (!m) throw new Error('useModelo fora do ProvedorModelo');
  return m;
}

export function useOrcamento(): Orcamento | null {
  return useContext(ContextoOrcamento);
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
      borda: s.borda,
      batente: s.batente,
      labio: s.labio,
      bordaCompensa: s.bordaCompensa,
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
      imp: s.imp,
      impModo: s.impModo,
      impTracos: s.impTracos,
      impFundir: s.impFundir,
      impDesativadas: s.impDesativadas,
      impAltura: s.impAltura,
      fonte: s.fonte,
      texto: s.texto,
      altura: s.altura,
      tracking: s.tracking,
      edicoes: s.edicoes,
      fontesTexto: s.fontesTexto,
      removidas: s.removidas,
      nomeTrabalho: s.nomeTrabalho,
      presetAtivo: s.presetAtivo,
    }))
  );
  const maquina = useProjeto(
    useShallow((s) => ({ impressoraId: s.impressoraId, mesaX: s.mesaX, mesaY: s.mesaY, mesaZ: s.mesaZ }))
  );
  const cfg = useProjeto((s) => s.cfg);

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
      borda: p.borda,
      batente: p.batente,
      labio: p.labio,
      bordaCompensa: p.bordaCompensa,
      comLed: p.comLed,
      furoFio: p.furoFio,
      espacadores: p.espacadores,
      virar: p.virar,
      bico: p.bico,
      chanfro: { ativo: p.biselAtivo && p.macica, tamanho: p.biselTam, altura: p.biselTam, passos: 6 },
    }),
    [p]
  );

  const { imp, impModo, impTracos, impFundir, impDesativadas, impAltura, fonte, texto, altura, tracking, edicoes, fontesTexto, removidas } = origem;
  const { apoio, borda, bordaCompensa } = p;

  // Pecas do arquivo importado, na escala nativa. Separado da escala para que
  // arrastar a altura nao refaca a separacao nem remeca a espessura.
  const pecasNativas = useMemo(() => {
    if (!imp) return null;
    const d = imp.desenho;
    // Texto vivo cuja fonte o usuario ja deu: vira contorno como o resto do desenho.
    const letrasTexto = (d.textos ?? []).flatMap((t) => {
      const f = fontesTexto.get(chaveFonte(t.fonte));
      return f ? textoEmObjetos(t, f, d.objetos.length) : [];
    });
    const completo = letrasTexto.length ? { ...d, objetos: [...d.objetos, ...letrasTexto], temFill: true } : d;
    // O que fazer com traco se decide olhando o desenho ORIGINAL: as letras do texto
    // sao preenchimento e mudariam sozinhas essa escolha.
    const tracos = resolverTracos(d, impTracos);
    return desenhoParaPecas(completo, { modo: impModo, tracos, fundirProximos: impFundir, areaMinima: 1 }).map(
      (x) => ({ ...x, bounds: regionBounds(x.region), espessuraNativa: minThickness(x.region) })
    );
  }, [imp, impModo, impTracos, impFundir, fontesTexto]);

  // Etapa cara (contornos + espessura): so depende do texto, do tamanho e das edicoes.
  const letrasBase = useMemo(() => {
    type Base = Letra & { espessuraMin: number; chave: string; baseW: number; baseH: number };

    // A edicao entra AQUI, antes do buildPart: e o que faz a chapa, o gabarito, a
    // colisao e o preco acompanharem. Com escala nao uniforme a espessura minima
    // nao escala linearmente e a peca editada e remedida.
    const editar = (b: Base): Base => {
      const e = edicoes.get(b.chave);
      if (!e || edicaoVazia(e)) return b;
      const region = aplicarEdicao(b.region, e);
      return {
        ...b,
        region,
        bounds: regionBounds(region),
        espessuraMin: escalaUniforme(e) ? b.espessuraMin * Math.abs(e.ex) : minThickness(region),
      };
    };

    if (pecasNativas) {
      const ativas = pecasNativas.filter((x) => !impDesativadas.has(x.nome));
      if (!ativas.length) return [] as Base[];
      const b = regionBounds(ativas.flatMap((x) => x.region));
      const alvo = alturaArte(impAltura, apoio, borda, bordaCompensa);
      const s = b.h > 0 ? alvo / b.h : 1;
      return ativas.map((x) => {
        const region = translateRegion(scaleRegion(x.region, s), -b.minX * s, -b.minY * s);
        const bb = regionBounds(region);
        return editar({ nome: x.nome, chave: x.nome, region, bounds: bb, espessuraMin: x.espessuraNativa * s, baseW: bb.w, baseH: bb.h });
      });
    }
    if (!fonte || !texto.trim()) return [] as Base[];
    const alvo = alturaArte(altura, apoio, borda, bordaCompensa);
    // A chave usa a posicao ANTES de filtrar: excluir uma letra nao pode renomear as outras.
    return normalizeLetters(textToLetters(fonte, texto, { altura: alvo, tracking }))
      .map((l, i) => ({ l, chave: `${l.nome}#${i}` }))
      .filter(({ chave }) => !removidas.has(chave))
      .map(({ l, chave }) =>
        editar({ ...l, chave, espessuraMin: minThickness(l.region), baseW: l.bounds.w, baseH: l.bounds.h })
      );
  }, [pecasNativas, impDesativadas, impAltura, fonte, texto, altura, tracking, apoio, borda, bordaCompensa, edicoes, removidas]);

  // Enquanto o slider se move, o React mantem o quadro anterior em vez de travar.
  // So primitivos ou valores estaveis: objeto novo a cada render anularia o efeito.
  const paramsDiferidos = useDeferredValue(params);
  const mesaXD = useDeferredValue(maquina.mesaX);
  const mesaYD = useDeferredValue(maquina.mesaY);
  const mesaZD = useDeferredValue(maquina.mesaZ);
  const impressoraD = useDeferredValue(maquina.impressoraId);

  const geo = useMemo(() => {
    const escolhida = acharImpressora(impressoraD);
    const mesa: Impressora = escolhida
      ? { ...escolhida, x: mesaXD, y: mesaYD, z: mesaZD }
      : { id: MANUAL, nome: 'Mesa manual', x: mesaXD, y: mesaYD, z: mesaZD, bicos: 1 };
    if (!letrasBase.length) {
      return { letras: [] as LetraComPeca[], bounds: null, totais: null, avisos: [] as string[], mesa, vereditos: new Map<string, Veredito>() };
    }
    const letras: LetraComPeca[] = letrasBase.map((l) => ({ ...l, part: buildPart(l.region, paramsDiferidos, l.espessuraMin) }));

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

    for (const l of letras) {
      // O footprint REAL (`part.contorno`) e o que conta para a mesa e o letreiro.
      const bp = regionBounds(l.part.contorno);
      minX = Math.min(minX, bp.minX);
      minY = Math.min(minY, bp.minY);
      maxX = Math.max(maxX, bp.maxX);
      maxY = Math.max(maxY, bp.maxY);
      volume += l.part.volume;
      for (const e of l.part.extras) {
        if (e.kind === 'cut') areaChapa += regionArea(e.region);
        else volume += e.layers.reduce((a, x) => a + regionArea(x.region) * (x.z1 - x.z0), 0);
      }
      if (paramsDiferidos.comLed) perimetroLed += regionPerimeter(l.region) / 2;
      if (bp.w > maiorLetra.w) maiorLetra = { w: bp.w, h: bp.h, nome: l.nome };
      for (const a of l.part.avisos) avisos.add(a);

      const v = caberNaMesa(l.part.contorno, l.part.alturaZ, mesa);
      vereditos.set(l.chave, v);
      if (!v.cabe) avisos.add(`A peça "${l.nome}" (${bp.w.toFixed(0)}×${bp.h.toFixed(0)} mm) ${descreverVeredito(v, mesa)} na ${mesa.nome}.`);
    }

    const e = paramsDiferidos.apoio === 'dentro' ? 0 : paramsDiferidos.borda;
    if (e > 0 && letras.length > 1) for (const c of colisoesPorBorda(letras, e)) avisos.add(avisoColisao(c, e));

    const alturaZ = letras[0]?.part.alturaZ ?? paramsDiferidos.profundidade;
    if (alturaZ > mesa.z) {
      avisos.add(`A peça tem ${alturaZ.toFixed(0)} mm de altura em Z e a ${mesa.nome} vai até ${mesa.z} mm. Deite a peça ou reduza a profundidade.`);
    }

    return {
      letras,
      bounds: { w: maxX - minX, h: maxY - minY, maiorLetra },
      totais: { volume, areaChapa, perimetroLed, qtd: letras.length },
      avisos: [...avisos],
      mesa,
      vereditos,
    };
  }, [letrasBase, paramsDiferidos, mesaXD, mesaYD, mesaZD, impressoraD]);

  const modelo = useMemo<Modelo>(() => {
    const naoCabem = new Set([...geo.vereditos].filter(([, v]) => !v.cabe).map(([k]) => k));
    return {
      ...geo,
      naoCabem,
      params,
      nomesImportados: pecasNativas?.map((x) => x.nome) ?? [],
      // Nomeia STL, zip e orcamento: arquivo importado, nome dado a mao, ou o texto.
      nomeProjeto: imp ? imp.nomeArquivo.replace(/\.[^.]+$/, '') : origem.nomeTrabalho || texto,
      desc: origem.presetAtivo ?? descreverPeca(params),
      orientacao: orientar(params),
      temChapa: params.frente === 'chapa' || params.traseira === 'chapa',
      temCorte: geo.letras.some((l) => l.part.extras.some((x) => x.kind === 'cut')),
      rolesUsados: new Set<Role>(geo.letras.flatMap((l) => l.part.layers.map((x) => x.role))),
    };
  }, [geo, params, pecasNativas, imp, origem.nomeTrabalho, origem.presetAtivo, texto]);

  const orcamento = useMemo(
    () =>
      geo.totais
        ? orcar({
            volumeMm3: geo.totais.volume,
            areaChapaMm2: geo.totais.areaChapa,
            perimetroLedMm: geo.totais.perimetroLed,
            qtdLetras: geo.totais.qtd,
            cfg,
          })
        : null,
    [geo.totais, cfg]
  );

  return (
    <ContextoModelo.Provider value={modelo}>
      <ContextoOrcamento.Provider value={orcamento}>{children}</ContextoOrcamento.Provider>
    </ContextoModelo.Provider>
  );
}
