'use client';

/**
 * Blocos de vitrine da loja (padrao Mercado Livre / Magalu): a prateleira (titulo + fileira
 * de pecas com "Ver todos") e os atalhos de categoria (imagem + nome, todos iguais).
 */
import Link from 'next/link';
import { useRef } from 'react';
import { BotaoIconeMarca } from '@/components/marca';
import { SECOES, type Produto, type Secao } from '@/lib/marketplace/tipos';
import { CardProduto, ImagemProduto } from './CardProduto';
import { IconeAnterior, IconeProximo } from './icones';
import { Modulo } from './Modulo';
import { GorroNoel } from '@/features/marketplace/Natal';

const idDe = (t: string) => `bloco-${t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export function Prateleira({ titulo, verTodos, produtos, secao, tema, id }: { titulo: string; verTodos?: { href: string; rotulo: string }; produtos: Produto[]; secao?: Secao; tema?: string; id?: string }) {
  const trilho = useRef<HTMLUListElement>(null);
  const rolar = (dir: 1 | -1) => trilho.current?.scrollBy({ left: dir * trilho.current.clientWidth * 0.9, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  if (!produtos.length) return null;
  const setas = (
    <span className="flex gap-1 max-md:hidden">
      <BotaoIconeMarca onClick={() => rolar(-1)} rotulo={`Rolar ${titulo} para trás`} className="border border-marca-linha text-marca-navy"><IconeAnterior className="size-4" aria-hidden /></BotaoIconeMarca>
      <BotaoIconeMarca onClick={() => rolar(1)} rotulo={`Rolar ${titulo} para frente`} className="border border-marca-linha text-marca-navy"><IconeProximo className="size-4" aria-hidden /></BotaoIconeMarca>
    </span>
  );
  return (
    <Modulo id={id ?? idDe(titulo)} titulo={titulo} verTodos={verTodos} secao={secao} acoes={produtos.length > 4 ? setas : undefined}>
      <ul ref={trilho} className="m-0 grid list-none auto-cols-[minmax(150px,44%)] grid-flow-col gap-4 overflow-x-auto p-0 pb-1 [scrollbar-width:none]! snap-x snap-mandatory sm:auto-cols-[200px] lg:auto-cols-[calc((100%-4*1rem)/5)] 2xl:auto-cols-[calc((100%-5*1rem)/6)] [&::-webkit-scrollbar]:hidden">
        {produtos.map((p) => <li key={p.slug} className="snap-start"><CardProduto produto={p} tema={tema} /></li>)}
      </ul>
    </Modulo>
  );
}

/** Atalhos de categoria: a peca que representa cada secao + o nome, todos do mesmo tamanho. */
/** `natal`: com a campanha ligada, cada circulo ganha um gorro de Papai Noel. */
export function AtalhosCategoria({ itens, natal }: { itens: { secao: Secao; total: number; produto?: Produto }[]; natal?: boolean }) {
  return (
    <nav aria-label="Categorias">
      <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0 sm:grid-cols-5">
        {itens.map(({ secao, total, produto }) => (
          <li key={secao} data-secao={secao}>
            <Link href={`/secao/${secao}`} className="group relative flex flex-col items-center gap-2 text-center no-underline">
              <span className="relative block aspect-square w-full max-w-36 overflow-hidden rounded-full bg-secao-suave ring-1 ring-marca-linha transition-shadow group-hover:ring-2 group-hover:ring-secao [&_.miniatura]:p-[4%]!">
                {produto ? <ImagemProduto produto={produto} /> : <span className="grid size-full place-items-center text-apoio text-secao-forte">Em breve</span>}
              </span>
              {natal && <GorroNoel className="absolute -top-2 left-[calc(50%+min(18%,2.25rem))] w-[min(34%,3rem)] rotate-12" />}
              <span className="text-item text-marca-navy group-hover:underline">{SECOES[secao].nome}</span>
              {total > 0 && <span className="-mt-1.5 text-apoio text-marca-texto-2">{total} {total === 1 ? 'peça' : 'peças'}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
