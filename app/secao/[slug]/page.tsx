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
      <div data-secao={slug} className="flex flex-col gap-2 rounded-2xl bg-secao-fundo px-6 py-6 md:px-8">
        <nav aria-label="Você está em" className="flex gap-2 text-sm text-marca-texto-2">
          <Link href="/" className="text-marca-azul no-underline hover:underline">Início</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{s.nome}</span>
        </nav>
        <h1 className="m-0 font-display text-[clamp(28px,3vw,40px)] leading-tight font-extrabold text-marca-navy">{s.nome}</h1>
        <p className="m-0 max-w-[70ch] text-marca-texto-2">{s.resumo}</p>
      </div>
      {produtos.length ? (
        <Listagem produtos={produtos} />
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
