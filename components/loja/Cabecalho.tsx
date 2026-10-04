'use client';

/**
 * Cabecalho da loja (padrao marketplace): faixa fina, logo, busca grande, favoritos e o
 * carrinho de orcamento com contador, e a barra de categorias (as secoes).
 */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { ICONE_MARCA, Wordmark } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { useFavoritos, useMontado, useOrcamento } from '@/features/loja/estado';
import { ORDEM_SECOES, SECOES, type Secao } from '@/lib/marketplace/tipos';
import { IconeBusca, IconeCarrinho, IconeFavorito } from './icones';

function Contador({ n }: { n: number }) {
  if (!n) return null;
  return <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-marca-azul px-1 text-[11px] font-bold leading-none text-white tabular-nums">{n > 99 ? '99+' : n}</span>;
}

function Busca() {
  const router = useRouter();
  const inicial = useSearchParams()?.get('q') ?? '';
  const [q, setQ] = useState(inicial);
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    router.push(`/busca?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <form role="search" onSubmit={enviar} className="flex h-11 w-full items-center overflow-hidden rounded-full border-2 border-marca-azul bg-marca-branco focus-within:shadow-marca-foco">
      <label htmlFor="busca-loja" className="sr-only">Buscar peças</label>
      <input
        id="busca-loja"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar peças: chaveiro, letreiro, placa com QR..."
        className="h-full min-w-0 flex-1 border-0 bg-transparent px-5 text-base text-marca-texto outline-none placeholder:text-marca-texto-3"
      />
      <button type="submit" className="grid h-full w-14 place-items-center bg-marca-azul text-white hover:bg-marca-azul-forte" aria-label="Buscar">
        <IconeBusca className="size-5" aria-hidden />
      </button>
    </form>
  );
}

export function CabecalhoLoja({ secaoAtual }: { secaoAtual?: Secao }) {
  const montado = useMontado();
  const qtdOrcamento = useOrcamento((s) => s.itens.reduce((t, i) => t + i.quantidade, 0));
  const qtdFavoritos = useFavoritos((s) => s.slugs.length);
  const icone = cx(ICONE_MARCA, 'relative text-marca-navy no-underline');
  return (
    <header className="sticky top-0 z-30 bg-marca-branco shadow-marca-1">
      <div className="bg-marca-navy px-margem py-1.5 text-center text-xs text-white/90">
        Peças impressas em 3D sob medida. <Link href="/criar" className="font-semibold text-white underline underline-offset-2">Monte a sua peça</Link>
      </div>
      <div className="conteiner-loja flex flex-wrap items-center gap-x-6 gap-y-3 px-margem py-3 md:flex-nowrap">
        <Wordmark />
        <div className="order-3 w-full md:order-none md:max-w-[680px] md:flex-1">
          <Suspense fallback={<div className="h-11 w-full rounded-full border-2 border-marca-azul" />}>
            <Busca />
          </Suspense>
        </div>
        <nav aria-label="Sua conta" className="ml-auto flex items-center gap-1">
          <Link href="/busca?favoritos=1" className={icone} aria-label={`Favoritos${montado && qtdFavoritos ? ` (${qtdFavoritos})` : ''}`}>
            <IconeFavorito className="size-6" aria-hidden />
            {montado && <Contador n={qtdFavoritos} />}
          </Link>
          <Link href="/orcamento" className={cx(icone, 'w-auto gap-2 px-3 sm:flex')} aria-label={`Orçamento${montado && qtdOrcamento ? ` (${qtdOrcamento} peças)` : ''}`}>
            <span className="relative">
              <IconeCarrinho className="size-6" aria-hidden />
              {montado && <Contador n={qtdOrcamento} />}
            </span>
            <span className="hidden text-sm font-semibold sm:inline">Orçamento</span>
          </Link>
        </nav>
      </div>
      <nav aria-label="Categorias" className="border-t border-marca-linha">
        <ul className="conteiner-loja my-0 flex list-none gap-1 overflow-x-auto px-margem py-1 [scrollbar-width:none] max-md:[mask-image:linear-gradient(to_right,black_88%,transparent)] [&::-webkit-scrollbar]:hidden">
          {ORDEM_SECOES.map((s) => (
            <li key={s} data-secao={s} className="shrink-0">
              <Link
                href={`/secao/${s}`}
                aria-current={s === secaoAtual ? 'page' : undefined}
                className="inline-flex min-h-11 items-center gap-2 rounded-marca-sm px-3 py-2 text-sm font-medium whitespace-nowrap text-marca-texto no-underline before:size-2 before:rounded-full before:bg-secao before:content-[''] hover:bg-secao-suave hover:text-secao-forte aria-[current=page]:bg-secao-suave aria-[current=page]:font-semibold aria-[current=page]:text-secao-forte aria-[current=page]:shadow-[inset_0_-2px_0_var(--secao)]"
              >
                {SECOES[s].nome}
              </Link>
            </li>
          ))}
          <li className="ml-auto shrink-0">
            <Link href="/criar" className="inline-flex min-h-11 items-center rounded-marca-sm px-3 py-2 text-sm font-semibold whitespace-nowrap text-marca-azul no-underline hover:bg-marca-gelo">Monte a sua peça</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
