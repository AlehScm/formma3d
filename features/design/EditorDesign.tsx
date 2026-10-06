'use client';

/**
 * Editor 2D livre ("Criar seu design"): ferramentas a esquerda, tela em mm no meio,
 * camadas e a previa 3D ao vivo a direita, barra de contexto do elemento no alto. Usado na
 * pagina /design (exporta 3MF/STL) e numa janela a partir dos geradores com campo de
 * desenho ("Usar no modelo" devolve o desenho com uma cor por camada).
 */
import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Botao, BotaoIcone, CampoNumero, IconeBaixar, IconeAbrir, IconeCamadas, IconeDesfazer, IconeDuplicar, IconeEspelhar, IconeExcluir,
  IconeFormas, IconeGrade, IconeImagem, IconeMais, IconeNovo, IconeOculto, IconeQr, IconeRefazer, IconeTexto, IconeTravado, IconeDestravado,
  IconeVisivel, IconeAtencao, IconeOk, cx,
} from '@/components/ui';
import { FONTES_WEB } from '@/lib/text/fontes';
import { unionRegion, type Region } from '@/lib/geom/region';
import { svgParaRegiao } from '@/lib/import/svg';
import { imagemParaRegiao } from '@/lib/import/imagem';
import { ajustarLargura } from '@/lib/gerador/formas';
import { blob3mfMontado, blob3mfSoltas, nomeSeguro, zipStl } from '@/lib/gerador/exportar';
import type { Desenho } from '@/lib/gerador/tipos';
import { baixar } from '@/features/acoes/exportar';
import { PreviaGerador } from '@/features/gerador/PreviaGerador';
import { useGeracao } from '@/features/gerador/useGeracao';
import { DESIGN_LIVRE } from '@/lib/gerador/receitas/designLivre';
import { FORMAS, camadaDesenhadaPadrao, camadaNova, designNovo, fontesDoDesign, lerDesign, novoId, type CamadaDesign, type Design, type Elemento, type FormaId } from '@/lib/design/documento';
import { regioesDasCamadas, trechosFinos } from '@/lib/design/geometria';
import { designParaDesenho } from '@/lib/design/saida';
import { useDesign } from './estado';
import { useFontes } from './fontes';
import { Tela } from './Tela';

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

function Ferramenta({ icone: I, rotulo, onClick, ativo }: { icone: typeof IconeTexto; rotulo: string; onClick: () => void; ativo?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={ativo} className={cx('flex w-full flex-col items-center gap-1 rounded-md px-1 py-2 text-micro text-texto-2 hover:bg-superficie-3 hover:text-texto', ativo && 'bg-superficie-3 text-acento')}>
      <I className="size-5" aria-hidden />
      {rotulo}
    </button>
  );
}

export function EditorDesign({ janela, onUsar, onFechar }: { janela?: boolean; onUsar?: (d: Desenho) => void; onFechar?: () => void }) {
  const { design, selecao, passado, futuro, alterar, alterarElementos, iniciarGesto, selecionar, desfazer, refazer, carregar } = useDesign();
  const [grade, setGrade] = useState(true);
  const [mostrarFinos, setMostrarFinos] = useState(true);
  const [formasAbertas, setFormasAbertas] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const arquivoImagem = useRef<HTMLInputElement>(null);
  const arquivoProjeto = useRef<HTMLInputElement>(null);

  const selecionados = design.elementos.filter((e) => selecao.includes(e.id));
  const unico = selecionados.length === 1 ? selecionados[0]! : null;
  const { fontes, versao } = useFontes([...fontesDoDesign(design), ...(unico?.tipo === 'texto' ? [unico.fonte] : [])]);

  // Camadas de contorno e trechos finos: calculados atras do gesto (nao travam o arrastar).
  const adiado = useDeferredValue(design);
  const regioes = useMemo(() => regioesDasCamadas(adiado, fontes), [adiado, fontes, versao]); // eslint-disable-line react-hooks/exhaustive-deps
  const finosPorCamada = useMemo(() => adiado.camadas.filter((c) => !c.oculta).map((c) => ({ c, finos: trechosFinos(regioes.get(c.id) ?? []) })).filter((x) => x.finos.length), [adiado, regioes]);
  const finos: Region = useMemo(() => (mostrarFinos ? finosPorCamada.reduce<Region>((r, x) => unionRegion(r, x.finos), []) : []), [finosPorCamada, mostrarFinos]);

  // 3D ao vivo: o mesmo design no worker, depois de uma pausa.
  const [json3d, setJson3d] = useState(() => JSON.stringify(design));
  useEffect(() => { const t = setTimeout(() => setJson3d(JSON.stringify(design)), ESPERA_3D); return () => clearTimeout(t); }, [design]);
  const valores3d = useMemo(() => ({ design: json3d }), [json3d]);
  const fontes3d = useMemo(() => { try { return fontesDoDesign(lerDesign(JSON.parse(json3d))); } catch { return []; } }, [json3d]);
  const { resultado, malhas, gerando } = useGeracao(DESIGN_LIVRE, valores3d, fontes3d, 0);
  const temPecas = !!resultado?.itens.length;

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
      const alvo = ev.target as HTMLElement | null;
      if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable)) return;
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
  const exportar = async (tipo: '3mf' | 'pecas' | 'stl') => {
    if (!resultado || !temPecas) return;
    if (tipo === '3mf') baixar(`${nomeArquivo}.3mf`, await blob3mfMontado(resultado));
    else if (tipo === 'pecas') baixar(`${nomeArquivo}-pecas.3mf`, await blob3mfSoltas(resultado));
    else baixar(`${nomeArquivo}-stl.zip`, await zipStl(resultado));
  };

  const camadasDesenhadas = design.camadas.filter((c) => c.origem === 'desenhada');
  const linha = (rotulo: string, filho: ReactNode) => (
    <label className="flex items-center gap-2 text-mini text-texto-2">{rotulo}{filho}</label>
  );
  const campo = 'h-8 rounded-md border border-borda bg-superficie-2 px-2 text-mini text-texto outline-none focus:border-acento';

  return (
    <div className={cx('flex flex-col bg-fundo text-texto', janela ? 'h-full' : 'min-h-[100dvh] lg:h-[100dvh]')}>
      <header className="flex flex-wrap items-center gap-2 border-b border-borda bg-superficie px-3 py-2">
        {!janela && <Link href="/criar" className="rounded-md px-2 py-1 text-mini font-medium text-texto-2 hover:bg-superficie-3">← Monte a sua peça</Link>}
        <input value={design.nome} onChange={(e) => alterar((d) => ({ ...d, nome: e.target.value }), { historico: false })} aria-label="Nome do design" className={cx(campo, 'w-44 font-semibold')} />
        <BotaoIcone icone={IconeDesfazer} rotulo="Desfazer" atalho="Ctrl+Z" disabled={!passado.length} onClick={desfazer} />
        <BotaoIcone icone={IconeRefazer} rotulo="Refazer" atalho="Ctrl+Y" disabled={!futuro.length} onClick={refazer} />
        <BotaoIcone icone={IconeNovo} rotulo="Novo design" onClick={() => carregar(designNovo())} />
        <BotaoIcone icone={IconeAbrir} rotulo="Abrir projeto (.json)" onClick={() => arquivoProjeto.current?.click()} />
        <BotaoIcone icone={IconeBaixar} rotulo="Baixar projeto (.json)" onClick={() => baixar(`${nomeArquivo}.design.json`, new Blob([JSON.stringify(design)], { type: 'application/json' }))} />
        <input ref={arquivoProjeto} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { void abrirProjeto(e.target.files?.[0]); e.target.value = ''; }} />
        <div className="ml-auto flex flex-wrap gap-2">
          {janela ? (
            <>
              <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
              <Botao variante="primario" disabled={!temPecas} onClick={() => onUsar?.(designParaDesenho(design, fontes))}>Usar no modelo</Botao>
            </>
          ) : (
            <>
              <Botao variante="primario" icone={IconeBaixar} disabled={!temPecas || gerando} onClick={() => void exportar('3mf')}>3MF multicor</Botao>
              <Botao icone={IconeBaixar} disabled={!temPecas || gerando} onClick={() => void exportar('pecas')}>3MF peças separadas</Botao>
              <Botao icone={IconeBaixar} disabled={!temPecas || gerando} onClick={() => void exportar('stl')}>STL (zip)</Botao>
            </>
          )}
        </div>
      </header>

      {/* barra de contexto do que esta selecionado */}
      <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-borda bg-superficie px-3 py-1.5">
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
        {unico && (
          <>
            <div className="w-40"><CampoNumero rotulo="Engrossar" layout="linha" unidade="mm" min={0} max={5} passo={0.1} valor={unico.engrossar ?? 0} set={(v) => alterarElementos([unico.id], (x) => ({ ...x, engrossar: v }))} /></div>
            <div className="w-32"><CampoNumero rotulo="Giro" layout="linha" unidade="°" min={-180} max={180} passo={1} valor={unico.giro} set={(v) => alterarElementos([unico.id], (x) => ({ ...x, giro: v }))} /></div>
            <BotaoIcone icone={IconeEspelhar} rotulo="Espelhar" ativo={!!unico.espelhar} onClick={() => alterarElementos([unico.id], (x) => ({ ...x, espelhar: !x.espelhar }))} />
            <BotaoIcone icone={unico.travado ? IconeTravado : IconeDestravado} rotulo={unico.travado ? 'Destravar' : 'Travar'} onClick={() => alterarElementos([unico.id], (x) => ({ ...x, travado: !x.travado }))} />
          </>
        )}
        {selecionados.length > 0 && (
          <>
            {linha('Camada', <select value={selecionados.every((e) => e.camadaId === selecionados[0]!.camadaId) ? selecionados[0]!.camadaId : ''} onChange={(e) => alterarElementos(selecao, (x) => ({ ...x, camadaId: e.target.value }))} className={campo}>
              <option value="" disabled>várias</option>
              {[...design.camadas].reverse().map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>)}
            <BotaoIcone icone={IconeDuplicar} rotulo="Duplicar" atalho="Ctrl+D" onClick={duplicar} />
            <BotaoIcone icone={IconeExcluir} rotulo="Apagar" atalho="Delete" onClick={() => apagar()} />
          </>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[76px_minmax(0,1fr)_340px]">
        {/* ferramentas */}
        <nav aria-label="Adicionar" className="relative flex gap-1 overflow-x-auto border-b border-borda bg-superficie p-1.5 lg:flex-col lg:border-r lg:border-b-0">
          <Ferramenta icone={IconeTexto} rotulo="Texto" onClick={() => adicionar({ tipo: 'texto', texto: 'Seu texto', fonte: design.elementos.find((e) => e.tipo === 'texto')?.tipo === 'texto' ? (design.elementos.find((e) => e.tipo === 'texto') as Extract<Elemento, { tipo: 'texto' }>).fonte : 'pacifico', altura: 15 })} />
          <Ferramenta icone={IconeFormas} rotulo="Formas" ativo={formasAbertas} onClick={() => setFormasAbertas((v) => !v)} />
          <Ferramenta icone={IconeImagem} rotulo="Imagem" onClick={() => arquivoImagem.current?.click()} />
          <Ferramenta icone={IconeQr} rotulo="QR Code" onClick={() => adicionar({ tipo: 'qr', conteudo: 'https://', largura: 35 })} />
          <span className="mx-1 w-px shrink-0 bg-borda lg:my-1 lg:h-px lg:w-auto" aria-hidden />
          <Ferramenta icone={IconeGrade} rotulo="Grade" ativo={grade} onClick={() => setGrade((v) => !v)} />
          <Ferramenta icone={IconeAtencao} rotulo="Finos" ativo={mostrarFinos} onClick={() => setMostrarFinos((v) => !v)} />
          <input ref={arquivoImagem} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" className="hidden" onChange={(e) => { void lerImagem(e.target.files?.[0]); e.target.value = ''; }} />
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
          <Tela design={design} regioes={regioes} fontes={fontes} selecao={selecao} grade={grade} finos={finos}
            onSelecionar={selecionar} onIniciarGesto={iniciarGesto} onAlterar={(ids, fn) => alterarElementos(ids, fn, { historico: false })} />
          <div className="pointer-events-none absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {finosPorCamada.length ? (
              <span className="pointer-events-auto flex items-center gap-2 rounded-full border border-atencao/40 bg-superficie px-3 py-1 text-mini text-atencao shadow-flutuante">
                <IconeAtencao className="size-3.5" aria-hidden /> Trechos mais finos que 0,4 mm
                <button type="button" onClick={engrossarFinos} className="rounded-full bg-atencao/15 px-2 py-0.5 font-semibold hover:bg-atencao/25">Engrossar</button>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-sucesso/40 bg-superficie px-3 py-1 text-mini text-sucesso shadow-flutuante"><IconeOk className="size-3.5" aria-hidden /> Pronto para imprimir</span>
            )}
          </div>
          {erro && <p role="alert" className="absolute right-3 bottom-3 m-0 max-w-sm rounded-md border border-perigo/40 bg-superficie px-3 py-2 text-mini text-perigo">{erro}</p>}
        </div>

        {/* camadas + 3D */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-t border-borda bg-superficie p-3 lg:border-t-0 lg:border-l">
          <section aria-label="Prévia 3D" className="relative aspect-square overflow-hidden rounded-lg border border-borda bg-superficie-2">
            {resultado && temPecas ? <PreviaGerador resultado={resultado} malhas={malhas} /> : <p className="grid h-full place-items-center p-4 text-center text-mini text-texto-3">{gerando ? 'Montando o 3D…' : 'Adicione algo na tela para ver em 3D.'}</p>}
            {gerando && temPecas && <span className="absolute top-2 left-2 rounded bg-superficie px-2 py-0.5 text-micro text-texto-3">atualizando…</span>}
          </section>
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
      </div>
    </div>
  );
}
