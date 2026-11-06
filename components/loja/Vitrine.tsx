'use client';

/**
 * Blocos de vitrine da loja (padrao Mercado Livre / Magalu): a prateleira (titulo + fileira
 * de pecas com "Ver todos") e a prateleira que busca as pecas por GET.
 */
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BotaoIconeMarca } from '@/components/marca';
import { useLista } from '@/lib/marketplace/api/cliente';
import type { ProdutoResumido } from '@/lib/marketplace/api/contrato';
import { comImagemPrimeiro } from '@/lib/marketplace/formato';
import { SECOES, hrefDaSecao, type Secao } from '@/lib/marketplace/tipos';
import { CardProduto, ImagemProduto } from './CardProduto';
import { IconeAnterior, IconeProximo } from './icones';
import { Modulo } from './Modulo';

const idDe = (t: string) => `bloco-${t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/** Cards que a prateleira monta por vez; chegando ao fim do trilho, monta mais. */
const PASSO_PRATELEIRA = 12;
const COLUNAS_TRILHO = 'auto-cols-[minmax(150px,44%)] grid-flow-col gap-4 sm:auto-cols-[200px] lg:auto-cols-[calc((100%-4*1rem)/5)] 2xl:auto-cols-[calc((100%-5*1rem)/6)]';

type PropsPrateleira = { titulo: string; verTodos?: { href: string; rotulo: string }; secao?: Secao; tema?: string; id?: string };

export function Prateleira({ titulo, verTodos, produtos, secao, tema, id }: PropsPrateleira & { produtos: ProdutoResumido[] }) {
  const trilho = useRef<HTMLUListElement>(null);
  const [montados, setMontados] = useState(PASSO_PRATELEIRA);
  const rolar = (dir: 1 | -1) => trilho.current?.scrollBy({ left: dir * trilho.current.clientWidth * 0.9, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  // Faltando uma tela para o fim do trilho, entram os proximos cards.
  const aoRolar = () => {
    const t = trilho.current;
    if (t && montados < produtos.length && t.scrollLeft + 2 * t.clientWidth >= t.scrollWidth) setMontados((m) => m + PASSO_PRATELEIRA);
  };
  if (!produtos.length) return null;
  const setas = (
    <span className="flex gap-1 max-md:hidden">
      <BotaoIconeMarca onClick={() => rolar(-1)} rotulo={`Rolar ${titulo} para trás`} className="border border-marca-linha text-marca-navy"><IconeAnterior className="size-4" aria-hidden /></BotaoIconeMarca>
      <BotaoIconeMarca onClick={() => rolar(1)} rotulo={`Rolar ${titulo} para frente`} className="border border-marca-linha text-marca-navy"><IconeProximo className="size-4" aria-hidden /></BotaoIconeMarca>
    </span>
  );
  return (
    <Modulo id={id ?? idDe(titulo)} titulo={titulo} verTodos={verTodos} secao={secao} acoes={produtos.length > 4 ? setas : undefined}>
      <ul ref={trilho} onScroll={aoRolar} className={`m-0 grid list-none ${COLUNAS_TRILHO} overflow-x-auto p-0 pb-1 [scrollbar-width:none]! snap-x snap-mandatory [&::-webkit-scrollbar]:hidden`}>
        {produtos.slice(0, montados).map((p) => <li key={p.slug} className="snap-start"><CardProduto produto={p} tema={tema} /></li>)}
      </ul>
    </Modulo>
  );
}

/**
 * Prateleira que busca as pecas por GET (`fonte`, um caminho da API) so quando chega perto
 * da tela: a pagina nao leva a lista no HTML. `excluir` tira pecas (a da pagina, ou as que
 * a home ja mostrou acima), `primeiroTipo` poe as do mesmo tipo na frente e `fotoPrimeiro`
 * as com foto. Sem pecas ou com erro, some.
 */
export function PrateleiraRemota({ fonte, excluir = [], primeiroTipo, fotoPrimeiro, ...props }: PropsPrateleira & { fonte: string; excluir?: string[]; primeiroTipo?: string; fotoPrimeiro?: boolean }) {
  const ancora = useRef<HTMLDivElement>(null);
  const [perto, setPerto] = useState(false);
  useEffect(() => {
    const el = ancora.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setPerto(true); obs.disconnect(); } }, { rootMargin: '600px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const { itens, erro } = useLista(perto ? fonte : null);
  const produtos = useMemo(() => {
    if (!itens) return null;
    const fora = new Set(excluir);
    const outros = itens.filter((p) => !fora.has(p.slug));
    const doTipo = primeiroTipo ? [...outros.filter((p) => p.tipo === primeiroTipo), ...outros.filter((p) => p.tipo !== primeiroTipo)] : outros;
    return fotoPrimeiro ? comImagemPrimeiro(doTipo) : doTipo;
  }, [itens, excluir, primeiroTipo, fotoPrimeiro]);
  if (erro || produtos?.length === 0) return null;
  return (
    <div ref={ancora}>
      {produtos ? <Prateleira {...props} produtos={produtos} /> : (
        <Modulo id={props.id ?? idDe(props.titulo)} titulo={props.titulo} verTodos={props.verTodos} secao={props.secao}>
          <ul aria-busy="true" aria-label={`Carregando ${props.titulo}`} className={`m-0 grid list-none ${COLUNAS_TRILHO} overflow-hidden p-0`}>
            {Array.from({ length: 6 }, (_, i) => <li key={i} className="aspect-square rounded-marca-md bg-secao-suave" />)}
          </ul>
        </Modulo>
      )}
    </div>
  );
}
