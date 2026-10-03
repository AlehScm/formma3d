'use client';

/**
 * Pecas da home de marketplace: banner rotativo, prateleira com setas e os circulos de
 * categoria. Recebem so produtos publicos.
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArteSecao } from '@/components/marca/ArteSecao';
import { cx } from '@/components/ui/cx';
import { Miniatura } from '@/features/catalogo/Miniaturas';
import type { Produto, Secao } from '@/lib/marketplace/tipos';
import { CardProduto, ImagemProduto } from './CardProduto';
import { IconeAnterior, IconeProximo } from './icones';

export interface Slide { secao: Secao; titulo: string; texto: string; acao: string; href: string; produto: Produto | null }

export function BannerRotativo({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const ir = useCallback((n: number) => setI((n + slides.length) % slides.length), [slides.length]);
  useEffect(() => {
    if (pausado || slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => ir(i + 1), 6000);
    return () => clearTimeout(t);
  }, [i, pausado, ir, slides.length]);
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
      <div data-secao={s.secao} className="grid min-h-[300px] grid-cols-1 items-center overflow-hidden rounded-2xl bg-secao-fundo md:grid-cols-2" aria-live="polite">
        <div className="order-2 px-8 pb-8 md:order-none md:py-10 md:pl-14">
          <h2 className="m-0 font-display text-[clamp(28px,3.2vw,44px)] leading-[1.02] font-extrabold tracking-[-0.03em] text-marca-navy">{s.titulo}</h2>
          <p className="mt-3 mb-6 max-w-[42ch] text-base text-marca-texto-2">{s.texto}</p>
          <Link href={s.href} className="inline-flex min-h-12 items-center rounded-lg bg-marca-azul px-6 font-semibold text-white no-underline hover:bg-marca-azul-forte">{s.acao}</Link>
        </div>
        <div className="relative order-1 h-[220px] md:order-none md:h-[320px]">
          {s.produto ? <ImagemProduto key={s.produto.slug} produto={s.produto} className="[&_.miniatura]:scale-[1.35]" /> : <ArteSecao secao={s.secao} />}
        </div>
      </div>
      {slides.length > 1 && (
        <>
          <button type="button" onClick={() => ir(i - 1)} aria-label="Destaque anterior" className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-marca-branco text-marca-navy shadow-marca-1 hover:bg-marca-gelo"><IconeAnterior className="size-5" aria-hidden /></button>
          <button type="button" onClick={() => ir(i + 1)} aria-label="Próximo destaque" className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-marca-branco text-marca-navy shadow-marca-1 hover:bg-marca-gelo"><IconeProximo className="size-5" aria-hidden /></button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((sl, n) => (
              <button key={sl.titulo} type="button" onClick={() => ir(n)} aria-label={`Destaque ${n + 1} de ${slides.length}: ${sl.titulo}`} aria-current={n === i ? 'true' : undefined} className={cx('h-2 rounded-full transition-all', n === i ? 'w-6 bg-marca-navy' : 'w-2 bg-marca-navy/30')} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function Prateleira({ titulo, verTodos, produtos, secao }: { titulo: string; verTodos?: { href: string; rotulo: string }; produtos: Produto[]; secao?: Secao }) {
  const trilho = useRef<HTMLUListElement>(null);
  const rolar = (dir: 1 | -1) => trilho.current?.scrollBy({ left: dir * trilho.current.clientWidth * 0.9, behavior: 'smooth' });
  if (!produtos.length) return null;
  const id = `prateleira-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section aria-labelledby={id} data-secao={secao} className="rounded-2xl bg-marca-branco p-4 shadow-marca-1 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id={id} className="m-0 flex items-center gap-2.5 font-display text-[22px] leading-tight font-bold text-marca-navy">
          {secao && <span aria-hidden="true" className="size-2.5 rounded-full bg-secao" />}
          {titulo}
        </h2>
        <div className="flex items-center gap-2">
          {verTodos && <Link href={verTodos.href} className="text-sm font-semibold text-marca-azul no-underline hover:underline">{verTodos.rotulo}</Link>}
          <button type="button" onClick={() => rolar(-1)} aria-label={`Rolar ${titulo} para trás`} className="hidden size-9 place-items-center rounded-full border border-marca-linha text-marca-navy hover:bg-marca-gelo md:grid"><IconeAnterior className="size-4" aria-hidden /></button>
          <button type="button" onClick={() => rolar(1)} aria-label={`Rolar ${titulo} para frente`} className="hidden size-9 place-items-center rounded-full border border-marca-linha text-marca-navy hover:bg-marca-gelo md:grid"><IconeProximo className="size-4" aria-hidden /></button>
        </div>
      </div>
      <ul ref={trilho} className="m-0 grid list-none auto-cols-[minmax(170px,1fr)] grid-flow-col gap-3 overflow-x-auto p-0 pb-1 [scrollbar-width:thin] snap-x snap-mandatory sm:auto-cols-[210px] md:auto-cols-[calc((100%-4*0.75rem)/5)]">
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
              <span className="relative block aspect-square w-full max-w-[140px] overflow-hidden rounded-full bg-secao-suave ring-2 ring-transparent transition group-hover:ring-secao [&_.miniatura]:size-full [&_.miniatura]:object-contain [&_.miniatura]:p-[14%] [&_.miniatura-reserva]:size-full">
                {c.gerador ? <Miniatura id={c.gerador} alt="" reserva={<ArteSecao secao={c.secao} />} /> : <ArteSecao secao={c.secao} />}
              </span>
              <span className="text-sm font-semibold text-marca-navy group-hover:text-secao-forte">{c.nome}</span>
              <span className="-mt-1.5 text-xs text-marca-texto-3">{c.total ? `${c.total} ${c.total === 1 ? 'peça' : 'peças'}` : 'Em breve'}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
