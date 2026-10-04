import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { Listagem } from '@/components/loja/Listagem';
import { ehSecao, porSecao } from '@/lib/marketplace/consultas';
import { ORDEM_SECOES, SECOES } from '@/lib/marketplace/tipos';

// Uma pagina por secao (export estatico), mesmo as que ainda nao tem pecas publicas.
export const dynamicParams = false;

export function generateStaticParams() {
  return ORDEM_SECOES.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return ehSecao(slug) ? { title: `${SECOES[slug].nome} | Scarprint`, description: SECOES[slug].resumo } : {};
}

export default async function SecaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!ehSecao(slug)) notFound();
  const s = SECOES[slug];
  const produtos = porSecao(slug);
  return (
    <PaginaLoja secaoAtual={slug}>
      <section data-secao={slug} aria-labelledby="secao-titulo" className="border-b border-marca-linha border-l-4 border-l-secao py-4 pl-5 text-marca-navy md:pl-6">
        <div className="flex min-w-0 flex-col gap-2">
          <nav aria-label="Você está em" className="flex gap-2 text-sm text-secao-forte">
            <Link href="/" className="text-inherit underline-offset-2 hover:underline">Início</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{s.nome}</span>
          </nav>
          <h1 id="secao-titulo" className="m-0 font-display text-[clamp(27px,3.5vw,46px)] leading-tight font-semibold">{s.nome}</h1>
          <p className="m-0 max-w-[65ch] text-sm leading-relaxed text-marca-texto-2 md:text-base">{s.resumo}</p>
        </div>
      </section>
      {produtos.length ? (
        <Listagem key={slug} produtos={produtos} />
      ) : (
        <div className="rounded-2xl bg-marca-branco p-10 text-center shadow-marca-1">
          <p className="m-0 text-lg font-semibold text-marca-navy">{s.nome} chegando em breve.</p>
          <p className="mt-1 mb-4 text-marca-texto-2">Enquanto isso, veja as outras seções.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {ORDEM_SECOES.filter((x) => x !== slug && porSecao(x).length).map((x) => (
              <Link key={x} href={`/secao/${x}`} className="rounded-full border border-marca-linha px-4 py-2 text-sm font-medium text-marca-navy no-underline hover:bg-marca-gelo">{SECOES[x].nome}</Link>
            ))}
          </div>
        </div>
      )}
    </PaginaLoja>
  );
}
