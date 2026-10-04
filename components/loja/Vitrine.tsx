'use client';

/**
 * Pecas da home de marketplace: banner rotativo, prateleira com setas e os circulos de
 * categoria. Recebem so produtos publicos.
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArteSecao } from '@/components/marca/ArteSecao';
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
      onBlurCapture={() => setPausado(false)}
      className="relative"
    >
      <div data-secao={s.secao} className="grid min-h-[320px] grid-cols-1 items-center overflow-hidden rounded-2xl bg-universo text-secao-universo-texto md:grid-cols-2" aria-live={pausado || pausaManual ? 'polite' : 'off'}>
        <div className="order-2 px-8 pb-16 md:order-none md:pt-10 md:pl-14">
          <p className="m-0 mb-3 inline-flex items-center gap-2 rounded-full border border-current/20 px-3 py-1 text-xs font-semibold"><span aria-hidden="true" className="size-2 rounded-full bg-secao-2" />{SECOES[s.secao].universo}</p>
          <h2 className="m-0 font-display text-[clamp(28px,3.2vw,44px)] leading-[1.02] font-extrabold tracking-[-0.03em]">{s.titulo}</h2>
          <p className="mt-3 mb-6 max-w-[42ch] text-base opacity-85">{s.texto}</p>
          <Link href={s.href} className="inline-flex min-h-12 items-center rounded-lg bg-secao-acao px-6 font-semibold text-secao-acao-texto no-underline hover:brightness-110">{s.acao}</Link>
        </div>
        <div className="relative order-1 h-[220px] md:order-none md:h-[320px]">
          {s.produto ? <ImagemProduto key={s.produto.slug} produto={s.produto} className="[&_.miniatura]:scale-[1.35]" /> : <ArteSecao secao={s.secao} />}
        </div>
      </div>
      {slides.length > 1 && (
        <>
          <BotaoIconeMarca onClick={() => ir(i - 1)} rotulo="Destaque anterior" className="absolute top-[110px] left-3 -translate-y-1/2 bg-marca-branco text-marca-navy shadow-marca-1 md:top-1/2"><IconeAnterior className="size-5" aria-hidden /></BotaoIconeMarca>
          <BotaoIconeMarca onClick={() => ir(i + 1)} rotulo="Próximo destaque" className="absolute top-[110px] right-3 -translate-y-1/2 bg-marca-branco text-marca-navy shadow-marca-1 md:top-1/2"><IconeProximo className="size-5" aria-hidden /></BotaoIconeMarca>
          <div data-secao={s.secao} className="absolute bottom-2 left-1/2 flex -translate-x-1/2">
            {slides.map((sl, n) => (
              <button key={sl.titulo} type="button" onClick={() => ir(n)} aria-label={`Destaque ${n + 1} de ${slides.length}: ${sl.titulo}`} aria-current={n === i ? 'true' : undefined} className={cx('grid size-11 place-items-center rounded-marca-sm', FOCO_MARCA)}><span className={cx('h-2 rounded-full', n === i ? 'w-6 bg-secao-universo-texto' : 'w-2 bg-secao-universo-texto/35')} /></button>
            ))}
          </div>
          <button type="button" onClick={() => setPausaManual((p) => !p)} aria-pressed={pausaManual} aria-label={pausaManual ? 'Retomar rotação dos destaques' : 'Pausar rotação dos destaques'} className={cx('absolute right-3 bottom-2 min-h-11 rounded-marca-sm bg-marca-vidro px-3 text-xs font-semibold text-marca-navy', FOCO_MARCA)}>{pausaManual ? 'Retomar' : 'Pausar'}</button>
        </>
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
          {secao && <span className="rounded-full bg-secao-suave px-2.5 py-0.5 font-marca text-xs font-semibold text-secao-forte">{SECOES[secao].universo}</span>}
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
    <section aria-labelledby="categorias-titulo" className="rounded-2xl bg-marca-branco p-4 shadow-marca-1 md:p-6">
      <h2 id="categorias-titulo" className="mt-0 mb-4 font-display text-[22px] leading-tight font-bold text-marca-navy">Compre por categoria</h2>
      <ul className="m-0 grid list-none grid-cols-3 gap-4 p-0 sm:grid-cols-5">
        {itens.map((c) => (
          <li key={c.secao} data-secao={c.secao}>
            <Link href={`/secao/${c.secao}`} className="group flex flex-col items-center gap-2 text-center no-underline">
              <span className="relative block aspect-square w-full max-w-[140px] overflow-hidden rounded-full bg-universo ring-[3px] ring-secao/25 transition group-hover:ring-secao [&_.miniatura]:size-full [&_.miniatura]:object-contain [&_.miniatura]:p-[14%] [&_.miniatura-reserva]:size-full">
                {c.gerador ? <Miniatura id={c.gerador} alt="" reserva={<ArteSecao secao={c.secao} />} /> : <ArteSecao secao={c.secao} />}
              </span>
              <span className="text-sm font-semibold text-secao-forte">{c.nome}</span>
              <span className="-mt-1.5 text-xs text-marca-texto-3">{c.total ? `${c.total} ${c.total === 1 ? 'peça' : 'peças'}` : 'Em breve'}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
