import Link from 'next/link';
import { ImagemProduto } from '@/components/loja/CardProduto';
import { geradorDe } from '@/lib/marketplace/formato';
import { VITRINE_CASA } from '@/lib/marketplace/universos';
import { SECOES, type Produto } from '@/lib/marketplace/tipos';

function Bloco({ produto: p }: { produto: Produto }) {
  return (
    <Link href={`/produto/${p.slug}`} className="group relative flex min-h-40 min-w-0 flex-col overflow-hidden rounded-marca-md border border-secao-linha bg-secao-superficie no-underline hover:border-secao-forte">
      <div className="min-h-0 flex-1 bg-secao-suave"><ImagemProduto produto={p} className="transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none" /></div>
      <span className="line-clamp-2 px-2 py-2 font-display text-xs font-semibold leading-tight text-secao-tinta sm:text-sm">{p.nome}</span>
    </Link>
  );
}

export function PortalCasa({ produtos }: { produtos: Produto[] }) {
  const s = SECOES.casa;
  const comRender = produtos.filter((p) => geradorDe(p));
  const vitrine = [...comRender.filter((p) => VITRINE_CASA.includes(p.slug)).sort((a, b) => VITRINE_CASA.indexOf(a.slug) - VITRINE_CASA.indexOf(b.slug)), ...comRender.filter((p) => !VITRINE_CASA.includes(p.slug))].slice(0, 3);
  return (
    <section aria-labelledby="secao-titulo" className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex flex-col justify-center gap-3 rounded-marca-lg border border-secao-linha bg-secao-superficie px-5 py-6 md:px-8">
        <nav aria-label="Você está em" className="flex gap-2 text-sm text-secao-tinta-2">
          <Link href="/" className="text-inherit underline-offset-2 hover:underline">Início</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{s.nome}</span>
        </nav>
        <h1 id="secao-titulo" className="m-0 font-display text-[clamp(36px,5vw,62px)] leading-tight font-semibold text-secao-tinta">{s.nome}</h1>
        <p className="m-0 max-w-[52ch] text-sm leading-relaxed text-secao-tinta-2 md:text-base">{s.chamada}. {s.resumo}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <a href="#pecas" className="inline-flex min-h-11 items-center rounded-marca-md bg-secao-botao px-5 font-display text-sm font-semibold text-secao-botao-texto no-underline hover:bg-secao-botao-forte">Ver as {produtos.length} peças</a>
          <Link href="/criar" className="inline-flex min-h-11 items-center rounded-marca-md border border-secao-linha px-5 font-display text-sm font-semibold text-secao-tinta no-underline hover:bg-secao-pagina">Monte a sua peça</Link>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {vitrine.map((p) => <Bloco key={p.slug} produto={p} />)}
      </div>
    </section>
  );
}

export function MonteCasa() {
  return (
    <div className="flex h-full min-h-64 flex-col justify-between gap-4 rounded-marca-md border border-secao-linha bg-secao-superficie p-5 text-secao-tinta">
      <div className="flex flex-col gap-2">
        <p className="m-0 font-display text-xl font-semibold leading-tight">Do seu jeito</p>
        <p className="m-0 text-sm leading-relaxed text-secao-tinta-2">Não achou a peça? Escolha o modelo, o tamanho e o texto e veja em 3D antes de pedir.</p>
      </div>
      <Link href="/criar" className="inline-flex min-h-11 items-center justify-center rounded-marca-md bg-secao-botao px-5 font-display text-sm font-semibold text-secao-botao-texto no-underline hover:bg-secao-botao-forte">Monte a sua peça</Link>
    </div>
  );
}
