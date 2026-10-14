'use client';

/**
 * O editor de pecas ("Criar seu design"): ferramentas a esquerda (texto, formas, imagem, QR
 * e os modelos prontos do catalogo), tela em mm no meio (com a previa 3D ao vivo no canto,
 * trocavel por "Visao 3D"), camadas e as configuracoes do modelo selecionado a direita.
 * Tudo se arrasta, gira e escala na mesma tela. Usado em /design (/design?modelo=<id> abre
 * com aquele modelo) e numa janela a partir dos campos de desenho ("Usar no modelo").
 */
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';
import {
  Botao, BotaoIcone, CampoNumero, IconeBaixar, IconeAbrir, IconeCamadas, IconeDesfazer, IconeDuplicar, IconeEspelhar, IconeExcluir,
  IconeFormas, IconeGrade, IconeImagem, IconeMais, IconeNovo, IconeOculto, IconeQr, IconeRefazer, IconeTexto, IconeTravado, IconeDestravado,
  IconeVisivel, IconeAtencao, IconeOk, IconeModelos, Alerta, cx,
} from '@/components/ui';
import { FONTES_WEB } from '@/lib/text/fontes';
import { translateRegion, unionRegion, type Region } from '@/lib/geom/region';
import { svgParaRegiao } from '@/lib/import/svg';
import { imagemParaRegiao } from '@/lib/import/imagem';
import { validarRegion } from '@/lib/geom/validacaoRegion';
import { ajustarLargura } from '@/lib/gerador/formas';
import { nomeSeguro } from '@/lib/gerador/exportar';
import type { Desenho, ManipuladorModelo, Resultado, Valores } from '@/lib/gerador/tipos';
import { receitaPorId } from '@/lib/gerador/receitas';
import { prepararModelo } from '@/lib/gerador/exemplo';
import { configDoFragmento, decodificarSnapshotModelo, fragmentoAposHandoff, modeloDaRotaEditor } from '@/lib/gerador/handoff';
import { corDe } from '@/lib/gerador/malha';
import { fatiasDaPlanta } from '@/lib/gerador/planta';
import { CamposDoModelo } from '@/features/gerador/CamposDoModelo';
import { lembrarValores, valoresDoModelo } from '@/features/gerador/valoresSalvos';
import { baixar } from '@/features/acoes/exportar';
import { PreviaGerador } from '@/features/gerador/PreviaGerador';
import { useGeracao, type Geracao } from '@/features/gerador/useGeracao';
import { DESIGN_LIVRE } from '@/lib/gerador/receitas/designLivre';
import { FORMAS, camadaDesenhadaPadrao, camadaNova, camadasPadrao, designNovo, fontesDaComposicao, lerDesign, novoId, type CamadaDesign, type Design, type Elemento, type FormaId } from '@/lib/design/documento';
import { finosDasCamadas, regioesDasCamadas } from '@/lib/design/geometria';
import { centroDoResultado, designParaDesenho } from '@/lib/design/saida';
import { chaveModeloPronto, type ModeloPronto } from '@/lib/design/modelosProntos';
import { atualizarPosicaoManipulador } from '@/lib/gerador/manipuladores';
import { criarDesignIsolado, useDesign } from './estado';
import { useFontes } from './fontes';
import { VistaDupla } from '@/features/visor/VistaDupla';
import { BotoesExportar, Casca, ListaModelos, nomeDoModelo, VoltarCatalogo } from './Casca';
import { Tela, type VistaModelo } from './Tela';

const ESPERA_3D = 300; // ms parado antes de regerar o 3D

/** Empilha as camadas: cada uma comeca onde a de baixo termina, mantendo a espessura. */
function empilhar(camadas: CamadaDesign[]): CamadaDesign[] {
  let z = 0;
  return camadas.map((c) => {
    const esp = Math.max(0.2, +(c.z1 - c.z0).toFixed(2));
    const nova = { ...c, z0: +z.toFixed(2), z1: +(z + esp).toFixed(2) };
    z += esp;
    return nova;
  });
}

/** Cor da camada sem campo controlado (o seletor nativo dispara input a cada movimento). */
function CorCamada({ cor, set, rotulo }: { cor: string; set: (v: string) => void; rotulo: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const quadro = useRef(0);
  useEffect(() => { if (ref.current && ref.current.value !== cor) ref.current.value = cor; }, [cor]);
  useEffect(() => () => cancelAnimationFrame(quadro.current), []);
  return (
    <input ref={ref} type="color" defaultValue={cor} aria-label={rotulo} className="size-7 shrink-0 cursor-pointer rounded border border-borda bg-transparent p-0.5"
      onInput={(e) => { const v = e.currentTarget.value; cancelAnimationFrame(quadro.current); quadro.current = requestAnimationFrame(() => set(v)); }} />
  );
}

type ElementoModelo = Extract<Elemento, { tipo: 'modelo' }>;
const prepararExistente = (id: string, valores: Valores) => receitaPorId(id)
  ? prepararModelo(id, { base: 'padrao', extras: valores })
  : { valores, idsFonte: [] as string[] };

/** Gera um modelo da tela no worker (para desenhar a vista de cima dele no 2D). */
function GeraModelo({ el, tentativa, onPronto }: { el: ElementoModelo; tentativa: number; onPronto: (id: string, r: Geracao) => void }) {
  const preparado = useMemo(() => prepararExistente(el.receita, el.valores), [el.receita, el.valores]);
  const geracao = useGeracao(el.receita, preparado.valores, preparado.idsFonte, tentativa, { modo: 'resultado' });
  useEffect(() => {
    const chave = chaveModeloPronto(el.receita, preparado.valores, preparado.idsFonte, tentativa);
    onPronto(el.id, { ...geracao, chaveAtual: chave, chaveResultado: geracao.chaveResultado === geracao.chaveAtual ? chave : geracao.chaveResultado, chaveErro: geracao.chaveErro === geracao.chaveAtual ? chave : geracao.chaveErro });
  }, [el.id, el.receita, preparado, tentativa, geracao, onPronto]);
  return null;
}

function elementosVisiveis(d: Design): Elemento[] {
  const camadas = new Set(d.camadas.filter((c) => !c.oculta).map((c) => c.id));
  return d.elementos.filter((e) => !e.oculto && camadas.has(e.camadaId));
}
const fontesVisiveis = fontesDaComposicao;

/** Vista de cima de um modelo, centrada em (0, 0) como o 3D do design o posiciona. */
function vistaDoModelo(receita: string, r: Resultado): VistaModelo {
  const { fatias, limites } = fatiasDaPlanta(r);
  const centro = centroDoResultado(r);
  return {
    nome: nomeDoModelo(receita),
    minX: limites.minX - centro.x,
    minY: limites.minY - centro.y,
    w: limites.w,
    h: limites.h,
    pronta: false,
    fatias: fatias.map((f) => ({ regiao: translateRegion(f.regiao, -centro.x, -centro.y), cor: corDe(r, f.cor) })),
    manipuladores: (r.manipuladores ?? []).map((m) => ({ ...m, ponto: { x: m.ponto.x - centro.x, y: m.ponto.y - centro.y } })),
  };
}

function Ferramenta({ icone: I, rotulo, onClick, ativo }: { icone: typeof IconeTexto; rotulo: string; onClick: () => void; ativo?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={ativo} className={cx('flex w-full flex-col items-center gap-1 rounded-md px-1 py-2 text-micro text-texto-2 hover:bg-superficie-3 hover:text-texto', ativo && 'bg-superficie-3 text-acento')}>
      <I className="size-5" aria-hidden />
      {rotulo}
    </button>
  );
}

export function ModoLivre({ janela, onUsar, onFechar }: { janela?: boolean; onUsar?: (d: Desenho) => void; onFechar?: () => void }) {
  const [storeJanela] = useState(criarDesignIsolado);
  const store = janela ? storeJanela : useDesign;
  const { design, selecao, passado, futuro, alterar, alterarElementos, iniciarGesto, selecionar, desfazer, refazer, carregar } = useStore(store);
  const [grade, setGrade] = useState(true);
  const [mostrarFinos, setMostrarFinos] = useState(true);
  const [formasAbertas, setFormasAbertas] = useState(false);
  const [modelosAbertos, setModelosAbertos] = useState(false);
  const [geradosModelo, setGeradosModelo] = useState<Record<string, Geracao>>({});
  const [tentativasModelo, setTentativasModelo] = useState<Record<string, number>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const arquivoImagem = useRef<HTMLInputElement>(null);
  const arquivoProjeto = useRef<HTMLInputElement>(null);

  const selecionados = design.elementos.filter((e) => selecao.includes(e.id));
  const unico = selecionados.length === 1 ? selecionados[0]! : null;
  const { fontes, versao, erroFonte: erroFonteLocal } = useFontes([...fontesVisiveis(design), ...(unico?.tipo === 'texto' ? [unico.fonte] : [])], tentativa);

  // Camadas de contorno e trechos finos: calculados atras do gesto (nao travam o arrastar).
  const adiado = useDeferredValue(design);
  const regioes = useMemo(() => regioesDasCamadas(adiado, fontes), [adiado, fontes, versao]); // eslint-disable-line react-hooks/exhaustive-deps
  const finosPorCamada = useMemo(() => { const m = finosDasCamadas(adiado, fontes); return adiado.camadas.filter((c) => m.has(c.id)).map((c) => ({ c, finos: m.get(c.id)! })); }, [adiado, fontes, versao]); // eslint-disable-line react-hooks/exhaustive-deps
  const finos: Region = useMemo(() => (mostrarFinos ? finosPorCamada.reduce<Region>((r, x) => unionRegion(r, x.finos), []) : []), [finosPorCamada, mostrarFinos]);

  // 3D ao vivo: o mesmo design no worker, depois de uma pausa.
  const chaveDesign = JSON.stringify(design);
  const [pedido3d, setPedido3d] = useState(() => ({ json: JSON.stringify(design), chave: JSON.stringify(design) }));
  useEffect(() => { const t = setTimeout(() => setPedido3d({ json: chaveDesign, chave: chaveDesign }), ESPERA_3D); return () => clearTimeout(t); }, [chaveDesign]);
  const { json: json3d } = pedido3d;
  const valores3d = useMemo(() => ({ design: json3d }), [json3d]);
  const design3d = useMemo(() => { try { return lerDesign(JSON.parse(json3d)); } catch { return null; } }, [json3d]);
  const elementos3d = useMemo(() => design3d ? elementosVisiveis(design3d) : [], [design3d]);
  const fontes3d = useMemo(() => design3d ? fontesVisiveis(design3d) : [], [design3d]);
  const modelos3d = useMemo(() => elementos3d.filter((e): e is ElementoModelo => e.tipo === 'modelo'), [elementos3d]);
  const modelosProntos = useMemo(() => modelos3d.flatMap((e): ModeloPronto[] => {
    const tentativaModelo = tentativasModelo[e.id] ?? 0;
    const preparado = prepararExistente(e.receita, e.valores);
    const g = geradosModelo[e.id];
    const chave = chaveModeloPronto(e.receita, preparado.valores, preparado.idsFonte, tentativaModelo);
    if (!g?.resultado || g.chaveAtual !== chave || g.chaveResultado !== chave || g.gerando || g.erro || g.erroFonte) return [];
    return [{ elementoId: e.id, chave, receita: e.receita, valores: preparado.valores, idsFonte: preparado.idsFonte, tentativa: tentativaModelo, resultado: g.resultado }];
  }), [modelos3d, geradosModelo, tentativasModelo]);
  const modelosProntosTodos = modelosProntos.length === modelos3d.length;
  const erroModeloAtual = modelos3d.some((e) => { const g = geradosModelo[e.id]; return !!g && g.chaveErro === g.chaveAtual && !!(g.erro || g.erroFonte); });
  const modelosComErro = modelos3d.filter((e) => { const g = geradosModelo[e.id]; return !!g && g.chaveErro === g.chaveAtual && !!(g.erro || g.erroFonte); });
  const geracao = useGeracao(DESIGN_LIVRE, valores3d, fontes3d, tentativa, { modo: 'malhas', modelosProntos, habilitado: !!design3d && modelosProntosTodos && !erroModeloAtual });
  const { resultado, malhas, gerando } = geracao;
  const resultadoAtual = pedido3d.chave === chaveDesign && modelosProntosTodos && !erroModeloAtual && geracao.chaveResultado === geracao.chaveAtual && !gerando && !geracao.erro && !geracao.erroFonte;
  const atualizando3d = pedido3d.chave !== chaveDesign || gerando || (!modelosProntosTodos && !erroModeloAtual);
  const fontesProntas = !erroFonteLocal && fontesVisiveis(design).every((id) => !!fontes(id));
  const desenhoUsavel = useMemo(() => { try { return designParaDesenho(design, fontes).regiao.length > 0; } catch { return false; } }, [design, fontes, versao]);
  const temPecas = !!resultado?.itens.length;
  const podeUsarResultado = resultadoAtual && temPecas;

  const adicionar = (parcial: Omit<Elemento, 'id' | 'camadaId' | 'x' | 'y' | 'giro' | 'escalaX' | 'escalaY'> & Partial<Elemento>) => {
    const camadaId = camadaDesenhadaPadrao(design);
    const n = design.elementos.filter((e) => Math.abs(e.x) < 30 && Math.abs(e.y) < 30).length;
    const el = { id: novoId(), camadaId, x: (n % 5) * 6, y: -(n % 5) * 6, giro: 0, escalaX: 1, escalaY: 1, ...parcial } as Elemento;
    alterar((d) => ({ ...d, elementos: [...d.elementos, el] }));
    selecionar([el.id]);
  };

  const apagar = (ids = selecao) => {
    if (!ids.length) return;
    alterar((d) => ({ ...d, elementos: d.elementos.filter((e) => !ids.includes(e.id)) }));
    selecionar([]);
  };
  const duplicar = () => {
    if (!selecionados.length) return;
    const copias = selecionados.map((e) => ({ ...e, id: novoId(), x: e.x + 5, y: e.y - 5 }));
    alterar((d) => ({ ...d, elementos: [...d.elementos, ...copias] }));
    selecionar(copias.map((c) => c.id));
  };
  const mudarCamadas = (fn: (cs: CamadaDesign[]) => CamadaDesign[]) => alterar((d) => ({ ...d, camadas: empilhar(fn(d.camadas)) }));
  const mudarCamada = (id: string, mud: Partial<CamadaDesign>) => mudarCamadas((cs) => cs.map((c) => (c.id === id ? { ...c, ...mud } : c)));

  const lerImagem = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    try {
      const ehSvg = arquivo.type === 'image/svg+xml' || /\.svg$/i.test(arquivo.name);
      const regiao = ehSvg ? svgParaRegiao(await arquivo.text()) : (await imagemParaRegiao(arquivo)).regiao;
      if (!validarRegion(regiao)) throw new Error('O desenho importado tem uma região inválida.');
      if (!regiao.length) throw new Error('Não achei nenhuma área preenchida nessa imagem.');
      // centrada e com 60 mm de largura; depois a pessoa ajusta pelas alcas
      adicionar({ tipo: 'desenho', nome: arquivo.name, regiao: ajustarLargura(regiao, 60) });
      setErro(null);
    } catch (e) {
      setErro((e as Error).message);
    }
  };

  const abrirProjeto = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    try {
      carregar(lerDesign(JSON.parse(await arquivo.text())));
      setErro(null);
    } catch (e) {
      setErro((e as Error).message || 'Não foi possível abrir este arquivo.');
    }
  };

  const engrossarFinos = () => {
    const camadas = new Set(finosPorCamada.map((x) => x.c.id));
    alterar((d) => ({ ...d, elementos: d.elementos.map((e) => (camadas.has(e.camadaId) ? { ...e, engrossar: +((e.engrossar ?? 0) + 0.2).toFixed(2) } : e)) }));
  };

  // Teclado: apagar, desfazer/refazer, duplicar e mover de 1 mm (Shift: 10 mm).
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (!janela && document.querySelector('[data-editor-modal="true"]')) return;
      const alvo = ev.target as HTMLElement | null;
      if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable)) return;
      if (alvo?.closest('[data-manipulador="true"]')) return;
      const mod = ev.ctrlKey || ev.metaKey;
      if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); if (ev.shiftKey) refazer(); else desfazer(); return; }
      if (mod && ev.key.toLowerCase() === 'y') { ev.preventDefault(); refazer(); return; }
      if (mod && ev.key.toLowerCase() === 'd') { ev.preventDefault(); duplicar(); return; }
      if ((ev.key === 'Delete' || ev.key === 'Backspace') && selecao.length) { ev.preventDefault(); apagar(); return; }
      const passo = ev.shiftKey ? 10 : 1;
      const d = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, passo], ArrowDown: [0, -passo] }[ev.key];
      if (d && selecao.length) { ev.preventDefault(); alterarElementos(selecao, (e) => ({ ...e, x: +(e.x + d[0]!).toFixed(2), y: +(e.y + d[1]!).toFixed(2) })); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  const nomeArquivo = nomeSeguro(design.nome || 'design');
  const pronto = podeUsarResultado && fontesProntas && !resultado!.avisos.length && finosPorCamada.length === 0;

  // Modelos prontos na tela: cada um gera no worker e vira a vista de cima dele.
  const elementosModelo = elementosVisiveis(design).filter((e): e is ElementoModelo => e.tipo === 'modelo');
  const aoGerarModelo = useCallback((id: string, r: Geracao) => setGeradosModelo((s) => {
    const anterior = s[id];
    if (anterior && anterior.resultado === r.resultado && anterior.malhas === r.malhas && anterior.erro === r.erro && anterior.erroFonte === r.erroFonte && anterior.gerando === r.gerando && anterior.chaveAtual === r.chaveAtual && anterior.chaveResultado === r.chaveResultado && anterior.chaveErro === r.chaveErro) return s;
    return { ...s, [id]: r };
  }), []);
  const vistas = useMemo(() => {
    const m = new Map<string, VistaModelo>();
    for (const e of elementosModelo) {
      const g = geradosModelo[e.id];
      if (g?.resultado?.itens.length) {
        const preparado = prepararExistente(e.receita, e.valores);
        const chaveEsperada = chaveModeloPronto(e.receita, preparado.valores, preparado.idsFonte, tentativasModelo[e.id] ?? 0);
        const pronta = g.chaveResultado === chaveEsperada && g.chaveAtual === chaveEsperada && !g.gerando && !g.erro && !g.erroFonte;
        m.set(e.id, { ...vistaDoModelo(e.receita, g.resultado), pronta });
      }
    }
    return m;
  }, [geradosModelo, elementosModelo.map((e) => `${e.id}:${e.receita}:${JSON.stringify(e.valores)}:${tentativasModelo[e.id] ?? 0}`).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const colocarModelo = (id: string) => {
    setModelosAbertos(false);
    adicionar({ tipo: 'modelo', receita: id, valores: valoresDoModelo(id) });
  };
  const mudarModelo = (el: ElementoModelo, pid: string, v: string | number | boolean) => {
    const valores = { ...el.valores, [pid]: v };
    lembrarValores(el.receita, valores);
    alterarElementos([el.id], (e) => ({ ...e, valores }) as Elemento);
  };
  const mudarManipulador = (el: ElementoModelo, m: ManipuladorModelo, valor: { x: number; y: number }, historico = true) => {
    const atual = store.getState().design.elementos.find((e) => e.id === el.id);
    if (atual?.tipo !== 'modelo') return;
    const valores = atualizarPosicaoManipulador(atual.valores, m, valor);
    if (valores[m.parametro] === atual.valores[m.parametro]) return;
    lembrarValores(atual.receita, valores);
    alterarElementos([atual.id], (e) => ({ ...e, valores }) as Elemento, { historico });
  };

  // Links da loja e rotas antigas abrem um modelo; só substitui o rascunho depois de validar tudo.
  useEffect(() => {
    if (janela) return;
    const url = new URL(window.location.href);
    const parametros = url.searchParams;
    const ids = parametros.getAll('modelo');
    const idRota = modeloDaRotaEditor(url.pathname, process.env.NEXT_PUBLIC_BASE ?? '');
    if (parametros.has('config')) {
      setErro('A configuração deste link precisa estar no fragmento da URL.');
      return;
    }
    let config: ReturnType<typeof configDoFragmento>;
    try {
      config = configDoFragmento(url.hash);
    } catch (e) {
      setErro((e as Error).message || 'O link contém uma configuração inválida.');
      return;
    }
    const configuracaoPresente = config.presente;
    const falhar = (mensagem: string) => setErro(mensagem);
    if (ids.length > 1 || (ids[0] && idRota && ids[0] !== idRota)) {
      falhar('O link contém geradores incompatíveis.');
      return;
    }
    const id = ids[0] || idRota;
    if (!id) {
      if (configuracaoPresente) falhar('O link contém uma configuração sem gerador.');
      return;
    }
    if (!receitaPorId(id)) {
      if (configuracaoPresente) falhar('O gerador desta configuração não existe.');
      return;
    }
    try {
      let valores: Valores;
      if (configuracaoPresente) {
        const schema = prepararModelo(id, { base: 'padrao' }).receita;
        const snapshot = decodificarSnapshotModelo(config.codificado, id, schema);
        if (!snapshot) throw new Error('O link não contém uma configuração válida.');
        valores = prepararModelo(id, { base: 'padrao', extras: snapshot.valores }).valores;
      } else valores = valoresDoModelo(id);
      const el = { id: novoId(), camadaId: 'topo', x: 0, y: 0, giro: 0, escalaX: 1, escalaY: 1, tipo: 'modelo', receita: id, valores } as Elemento;
      carregar({ ...designNovo(), nome: nomeDoModelo(id), camadas: camadasPadrao(), elementos: [el] });
      selecionar([el.id]);
      parametros.delete('modelo');
      const base = (process.env.NEXT_PUBLIC_BASE ?? '').replace(/\/+$/, '');
      const busca = parametros.toString();
      const fragmento = configuracaoPresente ? fragmentoAposHandoff(url.hash) : url.hash;
      window.history.replaceState(window.history.state, '', `${base}/design${busca ? `?${busca}` : ''}${fragmento}`);
      window.scrollTo(0, 0);
      setErro(null);
    } catch (e) {
      falhar((e as Error).message || 'Não foi possível abrir esta configuração.');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const camadasDesenhadas = design.camadas.filter((c) => c.origem === 'desenhada');
  const linha = (rotulo: string, filho: ReactNode) => (
    <label className="flex items-center gap-2 text-mini text-texto-2">{rotulo}{filho}</label>
  );
  const campo = 'h-8 rounded-md border border-borda bg-superficie-2 px-2 text-mini text-texto outline-none focus:border-acento';

  return (
    <Casca
      janela={janela}
      colunas="lg:grid-cols-[76px_minmax(0,1fr)_340px]"
      cabecalho={
        <>
          {!janela && <VoltarCatalogo />}
          <input value={design.nome} onChange={(e) => alterar((d) => ({ ...d, nome: e.target.value }), { historico: false })} aria-label="Nome do design" className={cx(campo, 'w-44 font-semibold')} />
          <BotaoIcone icone={IconeDesfazer} rotulo="Desfazer" atalho="Ctrl+Z" disabled={!passado.length} onClick={desfazer} />
          <BotaoIcone icone={IconeRefazer} rotulo="Refazer" atalho="Ctrl+Y" disabled={!futuro.length} onClick={refazer} />
          <BotaoIcone icone={IconeNovo} rotulo="Novo design" onClick={() => carregar(designNovo())} />
          <BotaoIcone icone={IconeAbrir} rotulo="Abrir projeto (.json)" onClick={() => arquivoProjeto.current?.click()} />
          <BotaoIcone icone={IconeBaixar} rotulo="Baixar projeto (.json)" onClick={() => baixar(`${nomeArquivo}.design.json`, new Blob([JSON.stringify(design)], { type: 'application/json' }))} />
          <input ref={arquivoProjeto} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { void abrirProjeto(e.target.files?.[0]); e.target.value = ''; }} />
        </>
      }
      acoes={
        janela ? (
          <>
            <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
            <Botao variante="primario" disabled={!podeUsarResultado || !fontesProntas || !desenhoUsavel} onClick={() => onUsar?.(designParaDesenho(design, fontes))}>Usar no modelo</Botao>
          </>
        ) : (
          <BotoesExportar resultado={resultado} nome={nomeArquivo} pode={podeUsarResultado && fontesProntas} />
        )
      }
      contexto={
        <>
          {!selecionados.length && <p className="m-0 text-mini text-texto-3">Selecione um elemento para editar, ou adicione um pela barra à esquerda. Arraste o vazio para mover a tela; a roda dá zoom.</p>}
          {unico?.tipo === 'texto' && (
            <>
              <textarea value={unico.texto} rows={1} onChange={(e) => alterarElementos([unico.id], (x) => ({ ...x, texto: e.target.value }) as Elemento)} aria-label="Texto" className={cx(campo, 'h-8 w-48 resize-y py-1.5')} />
              {linha('Fonte', <select value={unico.fonte} onChange={(e) => alterarElementos([unico.id], (x) => ({ ...x, fonte: e.target.value }) as Elemento)} className={campo}>{FONTES_WEB.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select>)}
              <div className="w-36"><CampoNumero rotulo="Altura" layout="linha" unidade="mm" min={3} max={300} passo={0.5} valor={unico.altura} set={(v) => alterarElementos([unico.id], (x) => ({ ...x, altura: v }) as Elemento)} /></div>
              <div className="w-40"><CampoNumero rotulo="Espaço" layout="linha" unidade="%" min={50} max={250} passo={1} valor={Math.round((unico.espacamento ?? 1) * 100)} set={(v) => alterarElementos([unico.id], (x) => ({ ...x, espacamento: v / 100 }) as Elemento)} /></div>
            </>
          )}
          {unico?.tipo === 'forma' && (
            <>
              {linha('Forma', <select value={unico.forma} onChange={(e) => alterarElementos([unico.id], (x) => ({ ...x, forma: e.target.value as FormaId }) as Elemento)} className={campo}>{Object.entries(FORMAS).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select>)}
            </>
          )}
          {unico?.tipo === 'qr' && (
            <input value={unico.conteudo} onChange={(e) => alterarElementos([unico.id], (x) => ({ ...x, conteudo: e.target.value }) as Elemento)} placeholder="Link ou texto do QR" aria-label="Conteúdo do QR" className={cx(campo, 'w-64')} />
          )}
          {unico?.tipo === 'modelo' && <p className="m-0 text-mini font-semibold text-texto">{nomeDoModelo(unico.receita)} <span className="font-normal text-texto-3">· configurações à direita</span></p>}
          {unico && (
            <>
              {unico.tipo !== 'modelo' && <div className="w-40"><CampoNumero rotulo="Engrossar" layout="linha" unidade="mm" min={0} max={5} passo={0.1} valor={unico.engrossar ?? 0} set={(v) => alterarElementos([unico.id], (x) => ({ ...x, engrossar: v }))} /></div>}
              <div className="w-32"><CampoNumero rotulo="Giro" layout="linha" unidade="°" min={-180} max={180} passo={1} valor={unico.giro} set={(v) => alterarElementos([unico.id], (x) => ({ ...x, giro: v }))} /></div>
              <BotaoIcone icone={IconeEspelhar} rotulo="Espelhar" ativo={!!unico.espelhar} onClick={() => alterarElementos([unico.id], (x) => ({ ...x, espelhar: !x.espelhar }))} />
              <BotaoIcone icone={unico.travado ? IconeTravado : IconeDestravado} rotulo={unico.travado ? 'Destravar' : 'Travar'} onClick={() => alterarElementos([unico.id], (x) => ({ ...x, travado: !x.travado }))} />
            </>
          )}
          {selecionados.length > 0 && (
            <>
              {selecionados.every((e) => e.tipo !== 'modelo') && linha('Camada', <select value={selecionados.every((e) => e.camadaId === selecionados[0]!.camadaId) ? selecionados[0]!.camadaId : ''} onChange={(e) => alterarElementos(selecao, (x) => ({ ...x, camadaId: e.target.value }))} className={campo}>
                <option value="" disabled>várias</option>
                {[...design.camadas].reverse().map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>)}
              <BotaoIcone icone={IconeDuplicar} rotulo="Duplicar" atalho="Ctrl+D" onClick={duplicar} />
              <BotaoIcone icone={IconeExcluir} rotulo="Apagar" atalho="Delete" onClick={() => apagar()} />
            </>
          )}
        </>
      }
    >
        {/* ferramentas */}
        <nav aria-label="Adicionar" className="relative flex gap-1 overflow-x-auto border-b border-borda bg-superficie p-1.5 lg:flex-col lg:border-r lg:border-b-0">
          <Ferramenta icone={IconeTexto} rotulo="Texto" onClick={() => adicionar({ tipo: 'texto', texto: 'Seu texto', fonte: design.elementos.find((e) => e.tipo === 'texto')?.tipo === 'texto' ? (design.elementos.find((e) => e.tipo === 'texto') as Extract<Elemento, { tipo: 'texto' }>).fonte : 'pacifico', altura: 15 })} />
          <Ferramenta icone={IconeFormas} rotulo="Formas" ativo={formasAbertas} onClick={() => setFormasAbertas((v) => !v)} />
          <Ferramenta icone={IconeImagem} rotulo="Imagem" onClick={() => arquivoImagem.current?.click()} />
          <Ferramenta icone={IconeQr} rotulo="QR Code" onClick={() => adicionar({ tipo: 'qr', conteudo: 'https://', largura: 35 })} />
          {!janela && <Ferramenta icone={IconeModelos} rotulo="Modelos" ativo={modelosAbertos} onClick={() => setModelosAbertos((v) => !v)} />}
          <span className="mx-1 w-px shrink-0 bg-borda lg:my-1 lg:h-px lg:w-auto" aria-hidden />
          <Ferramenta icone={IconeGrade} rotulo="Grade" ativo={grade} onClick={() => setGrade((v) => !v)} />
          <Ferramenta icone={IconeAtencao} rotulo="Finos" ativo={mostrarFinos} onClick={() => setMostrarFinos((v) => !v)} />
          <input ref={arquivoImagem} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" className="hidden" onChange={(e) => { void lerImagem(e.target.files?.[0]); e.target.value = ''; }} />
          {modelosAbertos && <ListaModelos onEscolher={colocarModelo} onFechar={() => setModelosAbertos(false)} />}
          {elementosModelo.map((e) => <GeraModelo key={e.id} el={e} tentativa={tentativasModelo[e.id] ?? 0} onPronto={aoGerarModelo} />)}
          {formasAbertas && (
            <div className="fixed inset-x-3 top-36 z-40 grid grid-cols-2 gap-1 rounded-lg border border-borda bg-flutuante p-2 shadow-flutuante sm:inset-x-auto sm:left-24 sm:w-64 lg:top-32">
              {Object.entries(FORMAS).map(([id, nome]) => (
                <button key={id} type="button" onClick={() => { adicionar({ tipo: 'forma', forma: id as FormaId, largura: 40 }); setFormasAbertas(false); }} className="rounded-md px-2 py-1.5 text-left text-mini text-texto-2 hover:bg-superficie-3 hover:text-texto">{nome}</button>
              ))}
            </div>
          )}
        </nav>

        {/* tela */}
        <div className="relative h-[62vh] min-h-80 lg:h-auto">
          <VistaDupla
            dois={(compacto, reserva) => (
              <Tela design={design} regioes={regioes} fontes={fontes} selecao={selecao} grade={grade} finos={finos} compacto={compacto} reserva={reserva} modelos={vistas}
                onAlterarManipulador={(id, m, valor) => { const el = elementosModelo.find((x) => x.id === id); if (el) mudarManipulador(el, m, valor, false); }}
                onSelecionar={selecionar} onIniciarGesto={iniciarGesto} onAlterar={(ids, fn) => alterarElementos(ids, fn, { historico: false })} />
            )}
            tres={() => (
              <div className="relative size-full bg-superficie-2">
                {resultado && temPecas ? <PreviaGerador resultado={resultado} malhas={malhas} /> : <p className="m-0 grid h-full place-items-center p-4 text-center text-mini text-texto-3">{atualizando3d ? 'Montando o 3D…' : erroModeloAtual ? 'Corrija ou tente novamente o modelo para atualizar o 3D.' : 'Adicione algo na tela para ver em 3D.'}</p>}
                {atualizando3d && temPecas && <span className="absolute top-2 left-2 rounded bg-superficie px-2 py-0.5 text-micro text-texto-3">atualizando…</span>}
              </div>
            )}
          />
          <div className="pointer-events-none absolute top-3 left-3 z-20 flex max-w-[calc(100%-10.5rem)] items-center gap-2 sm:max-w-[calc(100%-18.5rem)]">
            {finosPorCamada.length ? (
              <span className="pointer-events-auto flex items-center gap-2 rounded-full border border-atencao/40 bg-superficie px-3 py-1 text-mini text-atencao shadow-flutuante">
                <IconeAtencao className="size-3.5" aria-hidden /> Trechos mais finos que 0,4 mm
                <button type="button" onClick={engrossarFinos} className="rounded-full bg-atencao/15 px-2 py-0.5 font-semibold hover:bg-atencao/25">Engrossar</button>
              </span>
            ) : pronto ? (
              <span className="flex items-center gap-1.5 rounded-full border border-sucesso/40 bg-superficie px-3 py-1 text-mini text-sucesso shadow-flutuante"><IconeOk className="size-3.5" aria-hidden /> Pronto para imprimir</span>
            ) : null}
          </div>
          {erro && <p role="alert" className="absolute bottom-3 left-1/2 z-20 m-0 max-w-sm -translate-x-1/2 rounded-md border border-perigo/40 bg-superficie px-3 py-2 text-mini text-perigo">{erro}</p>}
          {!!modelosComErro.length && <div role="alert" className="absolute right-3 bottom-3 z-20 max-w-sm rounded-md border border-perigo/40 bg-superficie px-3 py-2 text-mini text-perigo"><p className="m-0">Falha ao gerar {nomeDoModelo(modelosComErro[0]!.receita)}; a composição 3D não foi atualizada.</p><button type="button" className="mt-1 underline" onClick={() => setTentativasModelo((s) => ({ ...s, [modelosComErro[0]!.id]: (s[modelosComErro[0]!.id] ?? 0) + 1 }))}>Tentar novamente</button></div>}
          {(erroFonteLocal || geracao.chaveErro === geracao.chaveAtual && (geracao.erro || geracao.erroFonte)) && <div role="alert" className="absolute right-3 bottom-3 z-20 max-w-sm rounded-md border border-perigo/40 bg-superficie px-3 py-2 text-mini text-perigo"><p className="m-0">{erroFonteLocal ? `Falha ao carregar fonte: ${erroFonteLocal}` : geracao.erroFonte ? `Falha ao carregar fonte: ${geracao.erroFonte}` : geracao.erro}</p><button type="button" className="mt-1 underline" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button></div>}
          {resultadoAtual && !!resultado?.avisos.length && <div className="absolute right-3 top-12 z-20 flex max-w-sm flex-col gap-1 rounded-md border border-atencao/40 bg-superficie px-3 py-2 text-mini text-atencao">{[...new Set(resultado.avisos)].map((a) => <p key={a} className="m-0">{a}</p>)}</div>}
        </div>

        {/* camadas */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-t border-borda bg-superficie p-3 lg:border-t-0 lg:border-l">
          {unico?.tipo === 'modelo' && (() => {
            const r = receitaPorId(unico.receita);
            const gerado = geradosModelo[unico.id];
            const vista = vistas.get(unico.id);
            const camada = design.camadas.find((c) => c.id === unico.camadaId);
            const podeEditarArgola = !unico.travado && !unico.oculto && !camada?.travada && !camada?.oculta;
            if (!r) return null;
            return (
              <section aria-label={`Configurações: ${r.nome}`} className="flex flex-col gap-3 rounded-lg border border-acento/40 bg-superficie-2 p-3">
                <h2 className="m-0 flex items-center gap-1.5 text-mini font-semibold text-texto"><IconeModelos className="size-4 text-acento" aria-hidden /> {r.nome}</h2>
                {!!vista?.manipuladores.length && (
                  <section aria-labelledby="titulo-argolas" className="space-y-3 border-t border-borda pt-3">
                    <h3 id="titulo-argolas" className="m-0 text-mini font-semibold text-texto">Posição da argola</h3>
                    <p className="m-0 text-micro text-texto-3">Arraste os pontos no 2D ou ajuste o deslocamento em milímetros.</p>
                    {!podeEditarArgola && <p className="m-0 text-micro text-texto-3">Desbloqueie o modelo e mostre a camada para editar.</p>}
                    {podeEditarArgola && !vista.pronta && <p className="m-0 text-micro text-texto-3">Aguardando o modelo atualizado para editar.</p>}
                    {vista.manipuladores.map((m, i) => {
                      const original = gerado?.resultado?.manipuladores?.find((x) => x.id === m.id);
                      if (!original) return null;
                      const atual = original.valor;
                      const nomeItem = gerado?.resultado?.itens[m.item]?.nome ?? `${m.rotulo} ${i + 1}`;
                      const mudarEixo = (eixo: 'x' | 'y', v: number) => mudarManipulador(unico, original, { ...atual, [eixo]: v });
                      return (
                        <fieldset key={`${m.id}-${i}`} className="space-y-1 rounded-md border border-borda bg-superficie-2 p-2" disabled={!podeEditarArgola || !vista.pronta}>
                          <legend className="px-1 text-micro font-medium text-texto-2">{nomeItem}</legend>
                          <div className="grid grid-cols-2 gap-2">
                            <CampoNumero rotulo={<>X<span className="sr-only"> · {nomeItem}</span></>} layout="linha" unidade="mm" min={-500} max={500} tetoFixo passo={0.1} valor={atual.x} set={(v) => mudarEixo('x', v)} desabilitado={!podeEditarArgola || !vista.pronta} />
                            <CampoNumero rotulo={<>Y<span className="sr-only"> · {nomeItem}</span></>} layout="linha" unidade="mm" min={-500} max={500} tetoFixo passo={0.1} valor={atual.y} set={(v) => mudarEixo('y', v)} desabilitado={!podeEditarArgola || !vista.pronta} />
                          </div>
                          <Botao variante="fantasma" className="min-h-11" disabled={!podeEditarArgola || !vista.pronta || (!atual.x && !atual.y)} onClick={() => mudarManipulador(unico, original, { x: 0, y: 0 })}>Voltar à posição padrão</Botao>
                        </fieldset>
                      );
                    })}
                  </section>
                )}
                <CamposDoModelo receita={r} valores={unico.valores} mudar={(pid, v) => mudarModelo(unico, pid, v)} />
                {gerado && gerado.chaveResultado === gerado.chaveAtual && gerado.resultado?.notas?.map((n) => <Alerta key={n} tom="neutro">{n}</Alerta>)}
                {gerado && gerado.chaveResultado === gerado.chaveAtual && gerado.resultado?.avisos.map((a) => <Alerta key={a} tom="atencao">{a}</Alerta>)}
                {gerado && gerado.chaveErro === gerado.chaveAtual && (gerado.erro || gerado.erroFonte) && <Alerta tom="perigo">{gerado.erroFonte ? `Falha ao carregar fonte: ${gerado.erroFonte}` : gerado.erro}<button type="button" className="ml-2 underline" onClick={() => setTentativasModelo((s) => ({ ...s, [unico.id]: (s[unico.id] ?? 0) + 1 }))}>Tentar novamente</button></Alerta>}
              </section>
            );
          })()}
          <section aria-labelledby="titulo-camadas" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 id="titulo-camadas" className="m-0 flex items-center gap-1.5 text-mini font-semibold text-texto-2"><IconeCamadas className="size-4" aria-hidden /> Camadas (de cima para baixo)</h2>
              <BotaoIcone icone={IconeMais} rotulo="Nova camada desenhada em cima" tamanho="sm" onClick={() => mudarCamadas((cs) => [...cs, camadaNova(cs.length + 1)])} />
            </div>
            {[...design.camadas].reverse().map((c) => {
              const itens = design.elementos.filter((e) => e.camadaId === c.id);
              const outras = design.camadas.filter((o) => o.id !== c.id);
              return (
                <div key={c.id} className={cx('flex flex-col gap-2 rounded-lg border border-borda bg-superficie-2 p-2', c.oculta && 'opacity-60')}>
                  <div className="flex items-center gap-2">
                    <CorCamada cor={c.cor} rotulo={`Cor da camada ${c.nome}`} set={(v) => mudarCamada(c.id, { cor: v })} />
                    <input value={c.nome} onChange={(e) => mudarCamada(c.id, { nome: e.target.value })} aria-label="Nome da camada" className={cx(campo, 'h-7 min-w-0 flex-1')} />
                    <BotaoIcone icone={c.oculta ? IconeOculto : IconeVisivel} rotulo={c.oculta ? 'Mostrar' : 'Esconder'} tamanho="sm" onClick={() => mudarCamada(c.id, { oculta: !c.oculta })} />
                    <BotaoIcone icone={c.travada ? IconeTravado : IconeDestravado} rotulo={c.travada ? 'Destravar' : 'Travar'} tamanho="sm" onClick={() => mudarCamada(c.id, { travada: !c.travada })} />
                    {design.camadas.length > 1 && (
                      <BotaoIcone icone={IconeExcluir} rotulo="Apagar camada" tamanho="sm" onClick={() => alterar((d) => {
                        const destino = camadaDesenhadaPadrao({ ...d, camadas: d.camadas.filter((x) => x.id !== c.id) });
                        return { ...d, camadas: empilhar(d.camadas.filter((x) => x.id !== c.id).map((x) => (x.origem !== 'desenhada' && x.origem.contornoDe === c.id ? { ...x, origem: 'desenhada' as const } : x))), elementos: d.elementos.map((e) => (e.camadaId === c.id ? { ...e, camadaId: destino } : e)) };
                      })} />
                    )}
                  </div>
                  <select value={c.origem === 'desenhada' ? 'desenhada' : c.origem.contornoDe} onChange={(e) => mudarCamada(c.id, { origem: e.target.value === 'desenhada' ? 'desenhada' : { contornoDe: e.target.value, folgaMm: c.origem !== 'desenhada' ? c.origem.folgaMm : 2 } })} aria-label="Como a camada é feita" className={cx(campo, 'h-7 w-full')}>
                    <option value="desenhada">Desenhada (elementos próprios)</option>
                    {outras.map((o) => <option key={o.id} value={o.id}>Contorno de {o.nome}</option>)}
                  </select>
                  <div className="grid gap-2">
                    {c.origem !== 'desenhada' && (
                      <CampoNumero rotulo="Folga" layout="linha" unidade="mm" min={0} max={30} passo={0.5} valor={c.origem.folgaMm} set={(v) => mudarCamada(c.id, { origem: { contornoDe: (c.origem as { contornoDe: string }).contornoDe, folgaMm: v } })} />
                    )}
                    <CampoNumero rotulo="Espessura" layout="linha" unidade="mm" min={0.2} max={20} passo={0.2} valor={+(c.z1 - c.z0).toFixed(2)} set={(v) => mudarCamada(c.id, { z1: c.z0 + v })} />
                  </div>
                  {c.origem === 'desenhada' && (
                    <p className="m-0 text-micro text-texto-3">{itens.length ? `${itens.length} ${itens.length === 1 ? 'elemento' : 'elementos'}` : 'Sem elementos'}{selecionados.length > 0 && selecionados.some((e) => e.camadaId !== c.id) && (
                      <button type="button" className="ml-2 text-acento hover:underline" onClick={() => alterarElementos(selecao, (e) => ({ ...e, camadaId: c.id }))}>trazer a seleção para cá</button>
                    )}</p>
                  )}
                </div>
              );
            })}
            {!camadasDesenhadas.length && <p className="m-0 text-micro text-atencao">Nenhuma camada desenhada: os elementos novos não têm onde entrar.</p>}
          </section>
        </aside>
    </Casca>
  );
}
