'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import JSZip from 'jszip';
import type { Font } from 'opentype.js';

import { textToLetters, normalizeLetters, type Letra } from '@/lib/text/glyphs';
import {
  FONTES_WEB,
  carregarFonteWeb,
  carregarFonteArquivo,
  listarFontesSistema,
  carregarFonteSistema,
  type ResultadoFontesSistema,
} from '@/lib/text/fontes';
import {
  APOIOS,
  PRESETS,
  buildPart,
  alturaArte,
  orientar,
  descreverPeca,
  type Params,
  type Part,
  type Role,
  type Apoio,
  type Fechamento,
  type ChapaModo,
  type PresetId,
} from '@/lib/geom/modes';
import {
  regionArea,
  regionPerimeter,
  minThickness,
  regionBounds,
  scaleRegion,
  translateRegion,
  type Region,
} from '@/lib/geom/region';
import { colisoesPorBorda, avisoColisao } from '@/lib/geom/letreiro';
import { partToGeometry } from '@/lib/geom/extrude';
import { geometryToSTL } from '@/lib/export/stl';
import { regionToSVG, regionToDXF, gabaritoSVG } from '@/lib/export/vectors';
import { FILAMENTOS, PADRAO, orcar, brl, type CustoCfg, type FilamentoId } from '@/lib/cost/calc';
import { Header } from '@/components/Header';
import { Rail, type SecaoId } from '@/components/Rail';
import { Paineis } from '@/components/Paineis';
import { CAMADAS_TODAS, type Camadas } from '@/components/Viewer3D';
import { importarArquivo, importarPdf, ErroImport } from '@/lib/import/pdf';
import { desenhoParaPecas, type ModoSeparacao, type ModoTraco } from '@/lib/import/pecas';
import { IMPRESSORAS, MANUAL, acharImpressora, caberNaMesa, descreverVeredito, type Impressora, type Veredito } from '@/lib/print/impressoras';
import { arrumar, type Colocada } from '@/lib/print/arranjo';
import { aplicarEdicao, edicaoVazia, escalaUniforme, SEM_EDICAO, type Edicao } from '@/lib/geom/pecaEditada';
import type { DesenhoBruto, Aviso } from '@/lib/import/pdf-ops';

// O canvas WebGL nao pode ser renderizado no servidor.
const Viewer3D = dynamic(() => import('@/components/Viewer3D'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-500">carregando 3D...</div>,
});

/**
 * `chave` identifica a peca de forma unica; `nome` e o rotulo que o usuario le.
 * Para texto os dois diferem: em "BARBER" ha dois "B", e uma edicao pelo nome
 * mexeria nos dois de uma vez.
 */
type LetraComPeca = Letra & { part: Part; chave: string };

function baixar(nome: string, data: BlobPart, tipo?: string): void {
  const blob = data instanceof Blob ? data : new Blob([data], tipo ? { type: tipo } : undefined);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const seguro = (s: string): string => (s || 'letra').replace(/[^a-zA-Z0-9]/g, '_');

export default function Page() {
  const [texto, setTexto] = useState('LETRA');
  const [font, setFont] = useState<Font | null>(null);
  const [fonteNome, setFonteNome] = useState('Anton');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sistema, setSistema] = useState<ResultadoFontesSistema>({ suportado: true, fontes: [] });
  const arquivoRef = useRef<HTMLInputElement>(null);
  const desenhoRef = useRef<HTMLInputElement>(null);

  // Desenho importado de .ai/.pdf. Quando presente, substitui o texto como fonte das pecas.
  const [imp, setImp] = useState<{
    desenho: DesenhoBruto;
    nomeArquivo: string;
    paginas: number;
    pagina: number;
    avisos: Aviso[];
    conteudoMm: { w: number; h: number };
    buf: ArrayBuffer;
  } | null>(null);
  const [impModo, setImpModo] = useState<ModoSeparacao>('forma');
  const [impAltura, setImpAltura] = useState(300);
  const [impFundir, setImpFundir] = useState(0);
  const [impTracos, setImpTracos] = useState<ModoTraco>('auto');
  const [impDesativadas, setImpDesativadas] = useState<Set<string>>(new Set());

  const [altura, setAltura] = useState(150);
  const [tracking, setTracking] = useState(0);
  const [profundidade, setProfundidade] = useState(40);
  const [parede, setParede] = useState(2.4);

  // As seis escolhas soltas. Nao ha mais "modo": os antigos viraram atalhos que
  // preenchem estes controles, e qualquer combinacao continua alcancavel.
  const [macica, setMacica] = useState(false);
  const [frente, setFrente] = useState<Fechamento>('chapa');
  const [frenteEsp, setFrenteEsp] = useState(3);
  const [traseira, setTraseira] = useState<Fechamento>('impressa');
  const [traseiraEsp, setTraseiraEsp] = useState(2);
  const [chapaModo, setChapaModo] = useState<ChapaModo>('cortar');
  const [folga, setFolga] = useState(0.3);
  const [apoio, setApoio] = useState<Apoio>('dentro');
  const [borda, setBorda] = useState(3);
  const [batente, setBatente] = useState(2.5);
  const [labio, setLabio] = useState(1);
  const [bordaCompensa, setBordaCompensa] = useState(true);
  const [comLed, setComLed] = useState(false);
  const [furoFio, setFuroFio] = useState(6);
  const [espacadores, setEspacadores] = useState(0);
  const [virar, setVirar] = useState(false);
  const [presetAtivo, setPresetAtivo] = useState<PresetId | null>('moldura_acm');
  const [bico, setBico] = useState(0.4);
  const [biselAtivo, setBiselAtivo] = useState(false);
  const [biselTam, setBiselTam] = useState(1.5);
  // A mesa ativa e sempre mesaX/Y/Z; escolher uma impressora so preenche esses
  // numeros. Assim ha uma fonte de verdade so, e o modo manual parte do que estava.
  const [impressoraId, setImpressoraId] = useState(IMPRESSORAS[0]!.id);
  // Edicao muda o PRODUTO (chapa, gabarito, preco); arranjo so acomoda na mesa.
  const [edicoes, setEdicoes] = useState<Map<string, Edicao>>(new Map());
  const [arranjo, setArranjo] = useState<Map<string, Colocada>>(new Map());
  const [arranjoInfo, setArranjoInfo] = useState<{ dentro: number; fora: number; impossiveis: number; placas: number } | null>(null);
  const [folgaPecas, setFolgaPecas] = useState(3);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [arranjoSobras, setArranjoSobras] = useState<string[]>([]);
  const [ferramenta, setFerramenta] = useState<'nenhuma' | 'mover' | 'girar' | 'escalar'>('nenhuma');
  const [vista, setVista] = useState<'letreiro' | 'placa'>('letreiro');
  const [mesaX, setMesaX] = useState(IMPRESSORAS[0]!.x);
  const [mesaY, setMesaY] = useState(IMPRESSORAS[0]!.y);
  const [mesaZ, setMesaZ] = useState(IMPRESSORAS[0]!.z);
  const [cfg, setCfg] = useState<CustoCfg>(PADRAO);

  // Estado so da interface.
  const [secao, setSecao] = useState<SecaoId>('arquivo');
  const [explode, setExplode] = useState(0);
  const [camadas, setCamadas] = useState<Camadas>(CAMADAS_TODAS);
  const [nomeTrabalho, setNomeTrabalho] = useState('');

  const setC = <K extends keyof CustoCfg>(k: K) => (v: CustoCfg[K]) => setCfg((c) => ({ ...c, [k]: v }));

  useEffect(() => {
    carregarFonteWeb('anton')
      .then(setFont)
      .catch((e: unknown) =>
        setErro(
          'Nao consegui baixar a fonte inicial (' +
            (e instanceof Error ? e.message : String(e)) +
            '). Carregue um .ttf do seu computador.'
        )
      )
      .finally(() => setCarregando(false));
  }, []);

  const trocarFonteWeb = async (id: string) => {
    if (!id) return;
    setCarregando(true);
    setErro(null);
    try {
      setFont(await carregarFonteWeb(id));
      setFonteNome(FONTES_WEB.find((f) => f.id === id)?.nome ?? id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  };

  const abrirDesenho = async (file: File, pagina = 1) => {
    setCarregando(true);
    setErro(null);
    try {
      const r = await importarArquivo(file, { modo: 'forma', tracos: 'auto', fundirProximos: 0, areaMinima: 1 }, pagina);
      if (!r.pecas.length) {
        setErro(r.avisos[0]?.msg ?? 'Nao encontrei contornos neste arquivo.');
        setCarregando(false);
        return;
      }
      setImp({
        desenho: r.desenho,
        nomeArquivo: file.name,
        paginas: r.paginas,
        pagina: r.pagina,
        avisos: r.avisos,
        conteudoMm: r.conteudoMm,
        buf: await file.arrayBuffer(),
      });
      setImpDesativadas(new Set());
      setImpAltura(Math.max(1, Math.round(r.conteudoMm.h)));
      setImpModo('forma');
      // Mostra no painel a escolha que o 'auto' fez, para o usuario poder discordar.
      setImpTracos(r.tracos);
    } catch (e) {
      setErro(e instanceof ErroImport ? e.message : 'Nao consegui abrir este arquivo: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setCarregando(false);
    }
  };

  const trocarPagina = async (n: number) => {
    if (!imp) return;
    setCarregando(true);
    try {
      const r = await importarPdf(imp.buf, { modo: impModo, tracos: impTracos, fundirProximos: impFundir, areaMinima: 1 }, n, 'pdf');
      setImp({ ...imp, desenho: r.desenho, pagina: r.pagina, avisos: r.avisos, conteudoMm: r.conteudoMm });
      setImpAltura(Math.max(1, Math.round(r.conteudoMm.h)));
      setImpDesativadas(new Set());
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  };

  const abrirFontesSistema = async () => {
    const r = await listarFontesSistema();
    setSistema(r);
    if (!r.suportado) setErro('Este navegador nao expoe as fontes do sistema. Use Chrome ou Edge, ou carregue o .ttf.');
    else if (r.erro) setErro('Permissao de fontes negada: ' + r.erro);
    else setErro(null);
  };

  const params = useMemo<Params>(
    () => ({
      macica,
      profundidade,
      parede,
      frente,
      frenteEsp,
      traseira,
      traseiraEsp,
      chapaModo,
      folga,
      apoio,
      borda,
      batente,
      labio,
      bordaCompensa,
      comLed,
      furoFio,
      espacadores,
      virar,
      bico,
      chanfro: { ativo: biselAtivo && macica, tamanho: biselTam, altura: biselTam, passos: 6 },
    }),
    [macica, profundidade, parede, frente, frenteEsp, traseira, traseiraEsp, chapaModo, folga, apoio, borda, batente, labio, bordaCompensa, comLed, furoFio, espacadores, virar, bico, biselAtivo, biselTam]
  );

  /** Aplica um atalho: preenche os controles, sem travar nenhum. */
  const aplicarPreset = (id: PresetId) => {
    const q = PRESETS[id].params;
    if (q.macica !== undefined) setMacica(q.macica);
    if (q.frente) setFrente(q.frente);
    if (q.frenteEsp !== undefined) setFrenteEsp(q.frenteEsp);
    if (q.traseira) setTraseira(q.traseira);
    if (q.traseiraEsp !== undefined) setTraseiraEsp(q.traseiraEsp);
    if (q.chapaModo) setChapaModo(q.chapaModo);
    if (q.apoio) setApoio(q.apoio);
    if (q.batente !== undefined) setBatente(q.batente);
    if (q.parede !== undefined) setParede(q.parede);
    if (q.profundidade !== undefined) setProfundidade(q.profundidade);
    setComLed(q.comLed ?? false);
    setFuroFio(q.furoFio ?? 6);
    setEspacadores(q.espacadores ?? 0);
    setPresetAtivo(id);
  };

  // Pecas do arquivo importado, na escala nativa. Separado da escala para que
  // arrastar a altura nao refaca a separacao nem remeça a espessura.
  const pecasNativas = useMemo(() => {
    if (!imp) return null;
    return desenhoParaPecas(imp.desenho, {
      modo: impModo,
      tracos: impTracos,
      fundirProximos: impFundir,
      areaMinima: 1,
    }).map((p) => ({ ...p, bounds: regionBounds(p.region), espessuraNativa: minThickness(p.region) }));
  }, [imp, impModo, impTracos, impFundir]);

  // Etapa cara (contornos + medicao de espessura): so depende do texto e do tamanho.
  // Fica fora do caminho dos sliders de fabricacao, que sao os que se arrastam.
  const letrasBase = useMemo(() => {
    type Base = Letra & { espessuraMin: number; chave: string };

    /**
     * Aplica a edicao do usuario a uma peca, AQUI e nao na hora de desenhar: e o
     * que faz a chapa de ACM, o gabarito, a colisao e o preco acompanharem.
     *
     * A espessura minima e reaproveitada da escala global para o slider de altura
     * nao travar. Com escala nao uniforme essa conta deixa de valer (esticar em X
     * nao afina a barra horizontal), e so a peca editada e remedida.
     */
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
      const ativas = pecasNativas.filter((p) => !impDesativadas.has(p.nome));
      if (!ativas.length) return [] as Base[];
      const b = regionBounds(ativas.flatMap((p) => p.region));
      const alvo = alturaArte(impAltura, apoio, borda, bordaCompensa);
      const s = b.h > 0 ? alvo / b.h : 1;
      return ativas.map((p) => {
        const region = translateRegion(scaleRegion(p.region, s), -b.minX * s, -b.minY * s);
        return editar({
          nome: p.nome,
          // Peca importada ja tem nome unico ('01', '02', ...).
          chave: p.nome,
          region,
          bounds: regionBounds(region),
          espessuraMin: p.espessuraNativa * s,
        });
      });
    }
    if (!font || !texto.trim()) return [] as Base[];
    // Com borda a peca fica maior que a arte, entao a arte encolhe para a peca
    // bater a medida pedida. Ver `alturaArte`.
    const alvo = alturaArte(altura, apoio, borda, bordaCompensa);
    return normalizeLetters(textToLetters(font, texto, { altura: alvo, tracking })).map((l, i) =>
      editar({
        ...l,
        // `nome` e o caractere, e repete em "BARBER": a posicao desempata.
        chave: `${l.nome}#${i}`,
        espessuraMin: minThickness(l.region),
      })
    );
  }, [pecasNativas, impDesativadas, impAltura, font, texto, altura, tracking, apoio, borda, bordaCompensa, edicoes]);

  // Enquanto o slider se move, o React mantem o quadro anterior em vez de travar a UI.
  const paramsDiferidos = useDeferredValue(params);
  const mesaXDiferida = useDeferredValue(mesaX);
  const mesaYDiferida = useDeferredValue(mesaY);
  const mesaZDiferida = useDeferredValue(mesaZ);
  const impressoraDiferida = useDeferredValue(impressoraId);

  // Etapa barata: aplica o modo de fabricacao aos contornos ja prontos.
  const { letras, bounds, totais, avisos, mesa, vereditos } = useMemo(() => {
    // Montada aqui a partir de primitivos: um objeto criado no corpo do componente
    // seria novo a cada render e anularia o useDeferredValue.
    const escolhida = acharImpressora(impressoraDiferida);
    const mesa: Impressora = escolhida
      ? { ...escolhida, x: mesaXDiferida, y: mesaYDiferida, z: mesaZDiferida }
      : { id: MANUAL, nome: 'Mesa manual', x: mesaXDiferida, y: mesaYDiferida, z: mesaZDiferida, bicos: 1 };
    if (!letrasBase.length) {
      return {
        letras: [] as LetraComPeca[], bounds: null, totais: null, avisos: [] as string[],
        mesa, vereditos: new Map<string, Veredito>(),
      };
    }
    const letras: LetraComPeca[] = letrasBase.map((l) => ({
      ...l,
      part: buildPart(l.region, paramsDiferidos, l.espessuraMin),
    }));

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
      // O que importa para a mesa e para o letreiro montado e o footprint REAL da
      // peca (`part.contorno`), que com borda e maior que a letra.
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

      // Cabe na mesa? O teste considera girar: uma peca longa e fina cabe na
      // diagonal, e o Bambu Studio deixa girar na placa.
      const v = caberNaMesa(l.part.contorno, l.part.alturaZ, mesa);
      vereditos.set(l.chave, v);
      if (!v.cabe) {
        avisos.add(`A peca "${l.nome}" (${bp.w.toFixed(0)}x${bp.h.toFixed(0)}mm) ${descreverVeredito(v, mesa)} na ${mesa.nome}.`);
      }
    }

    // Com borda, letras vizinhas apertadas passam a se sobrepor e as chapas colidem
    // na montagem. So da para ver isto olhando o letreiro inteiro.
    const e = paramsDiferidos.apoio === 'dentro' ? 0 : paramsDiferidos.borda;
    if (e > 0 && letras.length > 1) {
      for (const c of colisoesPorBorda(letras, e)) avisos.add(avisoColisao(c, e));
    }

    // O limite de Z vem da maquina. Antes era 300mm fixo no codigo, que esta errado
    // nas duas: a X2D vai a 261mm e a A2L a 325mm.
    const alturaZ = letras[0]?.part.alturaZ ?? paramsDiferidos.profundidade;
    if (alturaZ > mesa.z) {
      avisos.add(`A peca tem ${alturaZ.toFixed(0)}mm de altura em Z e a ${mesa.nome} vai ate ${mesa.z}mm. Deite a peca ou reduza a profundidade.`);
    }

    return {
      letras,
      bounds: { w: maxX - minX, h: maxY - minY, maiorLetra },
      totais: { volume, areaChapa, perimetroLed, qtd: letras.length },
      avisos: [...avisos],
      mesa,
      vereditos,
    };
  }, [letrasBase, paramsDiferidos, mesaXDiferida, mesaYDiferida, mesaZDiferida, impressoraDiferida]);

  const naoCabem = useMemo(
    () => new Set([...vereditos].filter(([, v]) => !v.cabe).map(([chave]) => chave)),
    [vereditos]
  );

  /**
   * Encaixa as pecas na mesa. So no clique do botao: refazer a cada tique de slider
   * jogaria fora o ajuste manual que o usuario fez em cima do resultado.
   *
   * O footprint usado e `part.contorno`, que com borda de apoio e maior que a arte
   * -- e o que de fato ocupa a mesa.
   */
  const arrumarNaPlaca = useCallback(() => {
    if (!letras.length) return;
    const r = arrumar(
      letras.map((l) => ({
        nome: l.chave,
        region: l.part.contorno,
        giroQueCabe: caberNaMesa(l.part.contorno, l.part.alturaZ, mesa).giro,
      })),
      mesa,
      folgaPecas
    );
    setArranjo(new Map(r.colocadas.map((c) => [c.nome, c])));
    setArranjoSobras(r.sobraram);
    // Sobrar por falta de espaco nesta placa e nao caber na maquina sao problemas
    // diferentes: o primeiro se resolve com outra levada, o segundo nao se resolve.
    const impossiveis = r.sobraram.filter((chave) => {
      const l = letras.find((x) => x.chave === chave);
      return l ? !caberNaMesa(l.part.contorno, l.part.alturaZ, mesa).cabe : false;
    }).length;
    setArranjoInfo({
      dentro: r.colocadas.length,
      fora: r.sobraram.length - impossiveis,
      impossiveis,
      placas: r.placas,
    });
    setVista('placa');
  }, [letras, mesa, folgaPecas]);

  const limparArranjo = useCallback(() => {
    setArranjo(new Map());
    setArranjoSobras([]);
    setArranjoInfo(null);
    setVista('letreiro');
  }, []);

  const editarPeca = useCallback((chave: string, mudanca: Partial<Edicao>) => {
    setEdicoes((m) => {
      const n = new Map(m);
      n.set(chave, { ...(n.get(chave) ?? SEM_EDICAO), ...mudanca });
      return n;
    });
  }, []);

  const resetarPeca = useCallback((chave: string) => {
    setEdicoes((m) => {
      const n = new Map(m);
      n.delete(chave);
      return n;
    });
  }, []);

  const orcamento = useMemo(
    () =>
      totais
        ? orcar({
            volumeMm3: totais.volume,
            areaChapaMm2: totais.areaChapa,
            perimetroLedMm: totais.perimetroLed,
            qtdLetras: totais.qtd,
            cfg,
          })
        : null,
    [totais, cfg]
  );

  // Nomeia STL, zip e orcamento. Vem do arquivo importado, do nome dado a mao,
  // ou do proprio texto -- nessa ordem.
  const nomeProjeto = imp ? imp.nomeArquivo.replace(/\.[^.]+$/, '') : nomeTrabalho || texto;
  const temChapa = frente === 'chapa' || traseira === 'chapa';
  const desc = presetAtivo ? presetAtivo : descreverPeca(params);
  const orientacao = orientar(params);

  const regioesDeCorte = useCallback(
    (): Region => letras.flatMap((l) => l.part.extras.flatMap((e) => (e.kind === 'cut' ? e.region : []))),
    [letras]
  );

  const baixarSTL = useCallback(
    (letra: LetraComPeca) => {
      const geo = partToGeometry(letra.part);
      if (!geo) return;
      baixar(`${seguro(nomeProjeto)}_${seguro(letra.nome)}_${desc}.stl`, geometryToSTL(geo, letra.nome), 'model/stl');
      geo.dispose();
    },
    [nomeProjeto, desc]
  );

  const baixarTudo = useCallback(async () => {
    if (!orcamento || !bounds) return;
    const zip = new JSZip();
    const pasta = zip.folder(seguro(nomeProjeto) + '_' + desc);
    if (!pasta) return;

    letras.forEach((l, i) => {
      const n = String(i + 1).padStart(2, '0');
      const geo = partToGeometry(l.part);
      if (geo) {
        pasta.file(`${n}_${seguro(l.nome)}.stl`, geometryToSTL(geo, l.nome));
        geo.dispose();
      }
      for (const e of l.part.extras) {
        if (e.kind !== 'stl') continue;
        const g2 = partToGeometry({ layers: e.layers });
        if (g2) {
          pasta.file(`${n}_${seguro(l.nome)}_${e.name}.stl`, geometryToSTL(g2, e.name));
          g2.dispose();
        }
      }
    });

    // Chapas de corte: um SVG e um DXF com todas as letras na posicao do letreiro,
    // para o corte sair nesteado do jeito que ja esta montado.
    const chapas = regioesDeCorte();
    if (chapas.length) {
      pasta.file('chapa_acm_todas.svg', regionToSVG(chapas, { titulo: nomeProjeto }));
      pasta.file('chapa_acm_todas.dxf', regionToDXF(chapas));
    }
    pasta.file('gabarito_instalacao_1a1.svg', gabaritoSVG(letras));

    const resumo = [
      `Letreiro: ${nomeProjeto}`,
      `Peca: ${presetAtivo ? PRESETS[presetAtivo].nome : desc}`,
      `Orientacao de impressao: ${orientacao.texto}`,
      imp ? `Altura total: ${impAltura}mm | Profundidade: ${profundidade}mm` : `Altura das maiusculas: ${altura}mm | Profundidade: ${profundidade}mm`,
      `Largura total montado: ${bounds.w.toFixed(0)}mm`,
      `Parede: ${parede}mm | Bico: ${bico}mm`,
      ...(temChapa ? [`Chapa: ${frente === 'chapa' ? frenteEsp : traseiraEsp}mm, folga ${folga}mm, batente ${batente}mm, apoio ${APOIOS[apoio].curto}`] : []),
      '',
      `Filamento: ${cfg.filamento} - ${orcamento.gramas.toFixed(0)}g (${orcamento.rolos.toFixed(2)} rolo)`,
      `Tempo estimado: ${orcamento.horas.toFixed(1)}h`,
      '',
      ...orcamento.itens.map((i) => `${i.rotulo.padEnd(18)} ${brl(i.valor).padStart(12)}  ${i.detalhe}`),
      `${'CUSTO'.padEnd(18)} ${brl(orcamento.custo).padStart(12)}`,
      `${'PRECO SUGERIDO'.padEnd(18)} ${brl(orcamento.preco).padStart(12)}  (margem ${cfg.margem}%)`,
      ...(avisos.length ? ['', 'AVISOS:', ...avisos.map((a) => '- ' + a)] : []),
    ].join('\r\n');
    pasta.file('orcamento.txt', resumo);

    baixar(`${seguro(nomeProjeto)}_${desc}.zip`, await zip.generateAsync({ type: 'blob' }));
  }, [letras, nomeProjeto, desc, presetAtivo, orientacao, altura, impAltura, imp, profundidade, parede, bico, temChapa, frente, frenteEsp, traseiraEsp, folga, batente, apoio, cfg, orcamento, avisos, bounds, regioesDeCorte]);

  const temCorte = letras.some((l) => l.part.extras.some((e) => e.kind === 'cut'));
  const rolesUsados = new Set<Role>(letras.flatMap((l) => l.part.layers.map((x) => x.role)));
  const fonteWebAtual = FONTES_WEB.find((f) => f.nome === fonteNome);


  const gramasTotais = orcamento ? orcamento.gramas : null;
  const bordaAtiva = apoio === 'dentro' ? 0 : borda;
  const alturaArteAtual = alturaArte(imp ? impAltura : altura, apoio, borda, bordaCompensa);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-fundo">
      <Header
        nomeProjeto={nomeProjeto}
        setNomeProjeto={setNomeTrabalho}
        podeRenomear={!imp}
        medidas={[
          imp
            ? { label: 'Altura', valor: impAltura, set: setImpAltura, min: 10, max: 3000 }
            : { label: 'Altura', valor: altura, set: setAltura, min: 10, max: 600 },
          { label: 'Profund.', valor: profundidade, set: setProfundidade, min: 2, max: 150 },
          ...(bordaAtiva > 0 ? [{ label: 'Borda', valor: borda, set: setBorda, min: 0.4, max: 30 }] : []),
        ]}
        gramas={gramasTotais}
        preco={orcamento ? brl(orcamento.preco) : null}
        onAbrir={() => desenhoRef.current?.click()}
        onNovo={() => {
          setImp(null);
          setErro(null);
        }}
        onExportar={baixarTudo}
        exportarAtivo={letras.length > 0}
      />

      {/*
        Os dois seletores de arquivo. Ficam escondidos e sao acionados pelos botoes
        ("Abrir" no header, "Abrir .ttf" no painel), porque o input nativo nao da
        para estilizar. Precisam viver aqui, fora dos paineis, senao trocar de secao
        desmonta o input no meio do dialogo de escolher arquivo.
      */}
      <input
        ref={desenhoRef}
        type="file"
        accept=".ai,.pdf,application/pdf,application/postscript"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void abrirDesenho(f);
        }}
      />
      <input
        ref={arquivoRef}
        type="file"
        accept=".ttf,.otf,.woff"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            setFont(await carregarFonteArquivo(f));
            setFonteNome(f.name);
            setErro(null);
          } catch (err) {
            setErro('Nao consegui ler essa fonte: ' + (err instanceof Error ? err.message : String(err)));
          }
        }}
      />

      <div className="flex min-h-0 flex-1">
        <Rail ativa={secao} setAtiva={setSecao} alertas={{ camadas: avisos.length }} />

        <aside className="w-[310px] shrink-0 overflow-y-auto border-r border-linha bg-painel">
          <Paineis
            secao={secao}
            imp={
              imp && pecasNativas
                ? {
                    nomeArquivo: imp.nomeArquivo,
                    paginaMm: imp.conteudoMm,
                    paginas: imp.paginas,
                    pagina: imp.pagina,
                    avisos: imp.avisos,
                    camadas: imp.desenho.camadas,
                    temFill: imp.desenho.temFill,
                    temStroke: imp.desenho.temStroke,
                    nomesPecas: pecasNativas.map((x) => x.nome),
                  }
                : null
            }
            texto={texto}
            setTexto={setTexto}
            fonteNome={fonteNome}
            trocarFonteWeb={trocarFonteWeb}
            carregando={carregando}
            erro={erro}
            arquivoRef={arquivoRef}
            abrirFontesSistema={abrirFontesSistema}
            sistema={sistema}
            carregarSistema={async (f) => {
              try {
                setFont(await carregarFonteSistema(f));
                setFonteNome(f.nome);
                setErro(null);
              } catch (err) {
                setErro('Essa fonte do sistema nao pode ser lida: ' + (err instanceof Error ? err.message : String(err)));
              }
            }}
            impModo={impModo}
            setImpModo={setImpModo}
            impAltura={impAltura}
            setImpAltura={setImpAltura}
            impFundir={impFundir}
            setImpFundir={setImpFundir}
            impTracos={impTracos}
            setImpTracos={setImpTracos}
            impDesativadas={impDesativadas}
            alternarPeca={(nome) =>
              setImpDesativadas((d) => {
                const n = new Set(d);
                if (n.has(nome)) n.delete(nome);
                else n.add(nome);
                return n;
              })
            }
            setPagina={(n) => void trocarPagina(n)}
            fecharImport={() => setImp(null)}
            macica={macica}
            setMacica={setMacica}
            frente={frente}
            setFrente={setFrente}
            frenteEsp={frenteEsp}
            setFrenteEsp={setFrenteEsp}
            traseira={traseira}
            setTraseira={setTraseira}
            traseiraEsp={traseiraEsp}
            setTraseiraEsp={setTraseiraEsp}
            chapaModo={chapaModo}
            setChapaModo={setChapaModo}
            apoio={apoio}
            setApoio={setApoio}
            comLed={comLed}
            setComLed={setComLed}
            espacadores={espacadores}
            setEspacadores={setEspacadores}
            virar={virar}
            setVirar={setVirar}
            orientacao={orientacao.texto}
            podeVirar={orientacao.podeVirar}
            presetAtivo={presetAtivo}
            aplicarPreset={aplicarPreset}
            altura={altura}
            setAltura={setAltura}
            tracking={tracking}
            setTracking={setTracking}
            profundidade={profundidade}
            setProfundidade={setProfundidade}
            parede={parede}
            setParede={setParede}
            batente={batente}
            setBatente={setBatente}
            borda={borda}
            setBorda={setBorda}
            folga={folga}
            setFolga={setFolga}
            labio={labio}
            setLabio={setLabio}
            bordaCompensa={bordaCompensa}
            setBordaCompensa={setBordaCompensa}
            furoFio={furoFio}
            setFuroFio={setFuroFio}
            biselAtivo={biselAtivo}
            setBiselAtivo={setBiselAtivo}
            biselTam={biselTam}
            setBiselTam={setBiselTam}
            bico={bico}
            setBico={setBico}
            mesaX={mesaX}
            setMesaX={setMesaX}
            mesaY={mesaY}
            setMesaY={setMesaY}
            mesaZ={mesaZ}
            setMesaZ={setMesaZ}
            folgaPecas={folgaPecas}
            setFolgaPecas={setFolgaPecas}
            arrumarNaPlaca={arrumarNaPlaca}
            limparArranjo={limparArranjo}
            arranjoInfo={arranjoInfo}
            selecionada={
              selecionada
                ? {
                    chave: selecionada,
                    nome: letras.find((l) => l.chave === selecionada)?.nome ?? selecionada,
                    edicao: edicoes.get(selecionada) ?? SEM_EDICAO,
                  }
                : null
            }
            editarPeca={editarPeca}
            resetarPeca={resetarPeca}
            impressoraId={impressoraId}
            escolherImpressora={(id) => {
              setImpressoraId(id);
              const m = acharImpressora(id);
              if (m) {
                setMesaX(m.x);
                setMesaY(m.y);
                setMesaZ(m.z);
              }
            }}
            camadas={camadas}
            setCamadas={setCamadas}
            areaChapa={totais?.areaChapa ?? 0}
            rolesUsados={rolesUsados}
            temChapa={temCorte}
            pecas={letras.map((l) => {
              const b = regionBounds(l.part.contorno);
              return {
                nome: l.nome,
                w: b.w,
                h: b.h,
                gramas: (l.part.volume / 1000) * FILAMENTOS[cfg.filamento].densidade,
                // Veredito nas duas maquinas dele: o que decide e "qual serve",
                // nao so "cabe ou nao" na que esta selecionada.
                mesas: IMPRESSORAS.map((m) => {
                  const v = caberNaMesa(l.part.contorno, l.part.alturaZ, m);
                  return { id: m.id, nome: m.nome, cabe: v.cabe, texto: descreverVeredito(v, m) };
                }),
              };
            })}
            baixarSTL={(i) => {
              const l = letras[i];
              if (l) baixarSTL(l);
            }}
            avisos={avisos}
            cfg={cfg}
            setCfg={setC}
            orcamento={orcamento}
            temLed={comLed}
            baixarChapaSVG={() =>
              baixar(seguro(nomeProjeto) + '_chapa_acm.svg', regionToSVG(regioesDeCorte(), { titulo: nomeProjeto }), 'image/svg+xml')
            }
            baixarChapaDXF={() => baixar(seguro(nomeProjeto) + '_chapa_acm.dxf', regionToDXF(regioesDeCorte()), 'image/vnd.dxf')}
            baixarGabarito={() => baixar(seguro(nomeProjeto) + '_gabarito.svg', gabaritoSVG(letras), 'image/svg+xml')}
          />
        </aside>

        <main className="relative min-w-0 flex-1">
          {letras.length && bounds && totais ? (
            <Viewer3D
              letras={letras}
              largura={bounds.w}
              altura={bounds.h}
              profundidade={profundidade}
              centro={[bounds.w / 2, bounds.h / 2]}
              explode={explode}
              camadas={camadas}
              mesa={vista === 'placa' ? { x: mesa.x, y: mesa.y } : null}
              naoCabem={naoCabem}
              arranjo={vista === 'placa' ? arranjo : new Map()}
              sobraram={vista === 'placa' ? arranjoSobras : []}
              selecionada={selecionada}
              onSelecionar={setSelecionada}
              ferramenta={selecionada ? ferramenta : 'nenhuma'}
              onTransformar={(chave, t) => {
                if (vista === 'placa') {
                  // Na placa a transformacao e so acomodacao: nao toca no produto.
                  setArranjo((m) => {
                    const n = new Map(m);
                    const a = n.get(chave) ?? { nome: chave, dx: 0, dy: 0, giro: 0 };
                    n.set(chave, { ...a, dx: a.dx + t.dx, dy: a.dy + t.dy, giro: a.giro + t.giro });
                    return n;
                  });
                  return;
                }
                // No letreiro a transformacao entra na Region e muda chapa, gabarito e preco.
                const atual = edicoes.get(chave) ?? SEM_EDICAO;
                editarPeca(chave, {
                  dx: atual.dx + t.dx,
                  dy: atual.dy + t.dy,
                  giro: atual.giro + t.giro,
                  ex: atual.ex * t.ex,
                  ey: atual.ey * t.ey,
                });
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-base text-tinta-fraca">
              {carregando ? 'carregando...' : imp ? 'nenhuma peca ativa' : 'digite um texto ou abra um .ai'}
            </div>
          )}

          {/* Vista e ferramenta. No letreiro a transformacao muda o produto; na placa,
              so acomoda para imprimir -- por isso escalar nao existe la. */}
          {letras.length > 0 && (
            <div className="absolute right-4 top-4 space-y-2">
              <div className="flex overflow-hidden rounded-lg border border-linha bg-painel/90 backdrop-blur">
                {(['letreiro', 'placa'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setVista(v);
                      if (v === 'placa' && ferramenta === 'escalar') setFerramenta('mover');
                    }}
                    title={v === 'letreiro' ? 'Como o letreiro fica montado na parede' : 'Como as pecas se acomodam na mesa da impressora'}
                    className={`px-3 py-1.5 text-mini font-medium transition ${
                      vista === v ? 'bg-acento text-white' : 'text-tinta-fraca hover:bg-elevado hover:text-tinta-media'
                    }`}
                  >
                    {v === 'letreiro' ? 'Letreiro' : 'Placa'}
                  </button>
                ))}
              </div>

              <div className="flex overflow-hidden rounded-lg border border-linha bg-painel/90 backdrop-blur">
                {(
                  [
                    ['nenhuma', 'selecionar', 'So seleciona, sem mover'],
                    ['mover', 'mover', 'Arrasta no plano da mesa'],
                    ['girar', 'girar', 'Gira em torno do centro da peca'],
                    ...(vista === 'letreiro'
                      ? ([['escalar', 'tamanho', 'Muda o tamanho DESTA peca: chapa, gabarito e preco acompanham']] as const)
                      : []),
                  ] as const
                ).map(([id, rotulo, dica]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFerramenta(id as typeof ferramenta)}
                    title={dica}
                    disabled={!selecionada && id !== 'nenhuma'}
                    className={`px-2.5 py-1.5 text-mini font-medium transition disabled:opacity-40 ${
                      ferramenta === id ? 'bg-acento text-white' : 'text-tinta-fraca hover:bg-elevado hover:text-tinta-media'
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>

              {selecionada && (
                <div className="rounded-lg border border-linha bg-painel/90 px-3 py-1.5 text-mini text-tinta-media backdrop-blur">
                  peca <span className="font-mono text-tinta">{letras.find((l) => l.chave === selecionada)?.nome ?? '?'}</span>
                  {vista === 'letreiro' && !edicaoVazia(edicoes.get(selecionada)) && (
                    <button
                      type="button"
                      onClick={() => resetarPeca(selecionada)}
                      className="ml-2 text-tinta-fraca underline hover:text-tinta"
                      title="Desfaz mover, girar e tamanho desta peca"
                    >
                      voltar ao original
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Montagem: afasta a chapa do corpo para dar para conferir o encaixe. */}
          {letras.length > 0 && (
            <div className="absolute left-4 top-4 flex items-center gap-3 rounded-lg border border-linha bg-painel/90 px-3 py-2 backdrop-blur">
              <span className="text-micro uppercase tracking-wide text-tinta-fraca">Montagem</span>
              <input
                type="range"
                min={0}
                max={Math.max(40, profundidade * 2)}
                step={1}
                value={explode}
                onChange={(e) => setExplode(parseFloat(e.target.value))}
                className="w-28"
                title="Afasta a chapa do corpo para conferir o encaixe"
              />
              <span className="tabular w-11 font-mono text-micro text-tinta-fraca">{explode.toFixed(0)}mm</span>
            </div>
          )}

          {/* Dimensoes da peca. As cores batem com os eixos do grid. */}
          {bounds && totais && (
            <div className="pointer-events-none absolute bottom-4 left-4 space-y-1 rounded-lg border border-linha bg-painel/90 px-3 py-2.5 backdrop-blur">
              <div className="text-micro font-semibold uppercase tracking-wider text-tinta-fraca">Peca montada</div>
              <div className="tabular flex gap-3 font-mono text-mini">
                <span className="text-[#e06c6c]">X {bounds.w.toFixed(1)}</span>
                <span className="text-[#6cc26c]">Y {bounds.h.toFixed(1)}</span>
                <span className="text-[#6c9ce0]">Z {(letras[0]?.part.alturaZ ?? profundidade).toFixed(1)}</span>
                <span className="text-tinta-fraca">mm</span>
              </div>
              {bordaAtiva > 0 && (
                <div className="text-micro text-tinta-fraca">
                  arte {alturaArteAtual.toFixed(0)}mm + borda {bordaAtiva}mm de cada lado
                </div>
              )}
              <div className="text-micro text-tinta-fraca">
                {totais.qtd} {totais.qtd === 1 ? 'peca' : 'pecas'} · maior {bounds.maiorLetra.w.toFixed(0)}x
                {bounds.maiorLetra.h.toFixed(0)}mm
              </div>
            </div>
          )}

          {avisos.length > 0 && (
            <button
              type="button"
              onClick={() => setSecao('camadas')}
              className="absolute right-4 top-4 rounded-lg border border-alerta/40 bg-alerta/15 px-3 py-2 text-mini text-alerta backdrop-blur transition hover:bg-alerta/25"
            >
              {avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'} antes de imprimir
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
