'use client';

/**
 * Pecas da home de marketplace: banner rotativo, prateleira e categorias.
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BotaoIconeMarca, FOCO_MARCA } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { Miniatura } from '@/features/catalogo/Miniaturas';
import { SECOES, type Produto, type Secao } from '@/lib/marketplace/tipos';
import { CardProduto, ImagemProduto } from './CardProduto';
import { IconeAnterior, IconeProximo } from './icones';

export interface Slide { secao: Secao; titulo: string; texto: string; acao: string; href: string; produto: Produto | null }

export function BannerRotativo({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [pausaManual, setPausaManual] = useState(false);
  const ir = useCallback((n: number) => setI((n + slides.length) % slides.length), [slides.length]);
  useEffect(() => {
    if (pausado || pausaManual || slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => ir(i + 1), 6000);
    return () => clearTimeout(t);
  }, [i, pausado, pausaManual, ir, slides.length]);
  const s = slides[i]!;
  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setPausado(false); }}
      className="overflow-hidden rounded-2xl border border-marca-linha bg-marca-branco"
    >
      <div data-secao={s.secao} className="grid min-h-[252px] grid-cols-[minmax(0,1fr)_minmax(96px,32%)] items-center overflow-hidden bg-universo text-secao-universo-texto md:h-[236px] md:min-h-0 md:grid-cols-[minmax(0,1fr)_minmax(180px,35%)]" aria-live={pausado || pausaManual ? 'polite' : 'off'}>
        <div className="min-w-0 px-4 py-5 sm:px-7 md:px-10">
          <p className="m-0 mb-2 font-display text-xs font-semibold text-secao-forte">{SECOES[s.secao].nome}</p>
          <h2 className="m-0 font-display text-[clamp(23px,2.6vw,35px)] leading-[1.08] font-bold tracking-[-0.025em]">{s.titulo}</h2>
          <p className="mt-2 mb-4 max-w-[44ch] text-sm leading-snug text-secao-universo-texto md:text-base">{s.texto}</p>
          <Link href={s.href} className="inline-flex min-h-11 items-center rounded-lg bg-secao-acao px-4 font-display text-sm font-semibold text-secao-acao-texto no-underline hover:bg-marca-azul-forte">{s.acao}</Link>
        </div>
        <div className="relative h-full min-h-[180px] overflow-hidden bg-secao-suave">
          {s.produto ? <ImagemProduto key={s.produto.slug} produto={s.produto} className="absolute inset-0 [&_img]:object-contain" /> : <div className="grid size-full place-items-center p-3 text-center text-xs text-secao-forte">Imagem em preparação</div>}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-marca-linha px-3 py-1 md:px-6">
          <div data-secao={s.secao} className="flex items-center">
            {slides.map((sl, n) => (
              <button key={sl.titulo} type="button" onClick={() => ir(n)} aria-label={`Destaque ${n + 1} de ${slides.length}: ${sl.titulo}`} aria-current={n === i ? 'true' : undefined} className={cx('grid size-11 place-items-center rounded-marca-sm', FOCO_MARCA)}><span className={cx('h-2 rounded-full', n === i ? 'w-6 bg-secao-forte' : 'w-2 bg-marca-linha')} /></button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPausaManual((p) => !p)} aria-pressed={pausaManual} aria-label={pausaManual ? 'Retomar rotação dos destaques' : 'Pausar rotação dos destaques'} className={cx('min-h-11 rounded-marca-sm px-3 text-xs font-semibold text-marca-navy', FOCO_MARCA)}>{pausaManual ? 'Retomar' : 'Pausar'}</button>
            <BotaoIconeMarca onClick={() => ir(i - 1)} rotulo="Destaque anterior" className="border border-marca-linha text-marca-navy"><IconeAnterior className="size-4" aria-hidden /></BotaoIconeMarca>
            <BotaoIconeMarca onClick={() => ir(i + 1)} rotulo="Próximo destaque" className="border border-marca-linha text-marca-navy"><IconeProximo className="size-4" aria-hidden /></BotaoIconeMarca>
          </div>
        </div>
      )}
    </section>
  );
}

export function Prateleira({ titulo, verTodos, produtos, secao }: { titulo: string; verTodos?: { href: string; rotulo: string }; produtos: Produto[]; secao?: Secao }) {
  const trilho = useRef<HTMLUListElement>(null);
  const rolar = (dir: 1 | -1) => trilho.current?.scrollBy({ left: dir * trilho.current.clientWidth * 0.9, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  if (!produtos.length) return null;
  const id = `prateleira-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section aria-labelledby={id} data-secao={secao} className={cx('rounded-2xl bg-marca-branco p-4 shadow-marca-1 md:p-6', secao && 'border-t-[3px] border-secao')}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 id={id} className="m-0 flex min-w-0 flex-wrap items-center gap-2.5 font-display text-[22px] leading-tight font-bold text-marca-navy">
          {secao && <span aria-hidden="true" className="size-2.5 rounded-full bg-secao" />}
          {titulo}
        </h2>
        <div className="flex items-center gap-2">
          {verTodos && <Link href={verTodos.href} className="text-sm font-semibold text-marca-azul no-underline hover:underline">{verTodos.rotulo}</Link>}
          <BotaoIconeMarca onClick={() => rolar(-1)} rotulo={`Rolar ${titulo} para trás`} className="border border-marca-linha text-marca-navy max-md:hidden"><IconeAnterior className="size-4" aria-hidden /></BotaoIconeMarca>
          <BotaoIconeMarca onClick={() => rolar(1)} rotulo={`Rolar ${titulo} para frente`} className="border border-marca-linha text-marca-navy max-md:hidden"><IconeProximo className="size-4" aria-hidden /></BotaoIconeMarca>
        </div>
      </div>
      <ul ref={trilho} className="m-0 grid list-none auto-cols-[minmax(170px,1fr)] grid-flow-col gap-3 overflow-x-auto p-0 pb-1 [scrollbar-width:thin] snap-x snap-mandatory sm:auto-cols-[210px] lg:auto-cols-[calc((100%-3*0.75rem)/4)] xl:auto-cols-[calc((100%-4*0.75rem)/5)]">
        {produtos.map((p) => <li key={p.slug} className="snap-start"><CardProduto produto={p} /></li>)}
      </ul>
    </section>
  );
}

export function CategoriasCirculos({ itens }: { itens: { secao: Secao; nome: string; total: number; gerador: string | null }[] }) {
  return (
    <section aria-labelledby="categorias-titulo" className="rounded-2xl bg-marca-branco p-4 shadow-marca-1 md:p-5">
      <h2 id="categorias-titulo" className="mt-0 mb-3 font-display text-lg leading-tight font-bold text-marca-navy">Compre por categoria</h2>
      <ul className="-mx-4 m-0 flex list-none gap-2 overflow-x-auto px-4 pb-1 snap-x snap-mandatory [scrollbar-width:thin] md:-mx-5 md:px-5 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {itens.map((c) => (
          <li key={c.secao} data-secao={c.secao} className="w-44 shrink-0 snap-start lg:w-auto">
            <Link href={`/secao/${c.secao}`} className="group flex min-h-16 items-center gap-3 rounded-marca-md border border-secao-borda bg-secao-suave px-3 no-underline hover:border-secao-forte">
              <span aria-hidden="true" className="hidden size-11 shrink-0 overflow-hidden rounded-md bg-secao-fundo sm:block [&_.miniatura]:size-full [&_.miniatura]:object-contain [&_.miniatura-reserva]:size-full">
                {c.gerador ? <Miniatura id={c.gerador} alt="" reserva={<span className="block size-full bg-secao-suave" />} /> : <span className="grid size-full place-items-center"><span className="size-3 rounded-full bg-secao" /></span>}
              </span>
              <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-secao sm:hidden" />
              <span className="min-w-0">
                <span className="block font-display text-sm font-semibold leading-tight text-secao-forte">{c.nome}</span>
                <span className="block text-xs text-marca-texto-2">{c.total ? `${c.total} ${c.total === 1 ? 'peça' : 'peças'}` : 'Em breve'}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
