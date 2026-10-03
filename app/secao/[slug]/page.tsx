import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { Listagem } from '@/components/loja/Listagem';
import { MonteCasa, PortalCasa } from '@/components/loja/universos/Casa';
import { ehSecao, pecaDaSecao, porSecao } from '@/lib/marketplace/consultas';
import { ArteSecao } from '@/components/marca/ArteSecao';
import { ComPaleta, Miniatura } from '@/features/catalogo/Miniaturas';
import { ORDEM_SECOES, SECOES } from '@/lib/marketplace/tipos';
import { PALETAS_CASA } from '@/lib/marketplace/universos';

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
  const peca = pecaDaSecao(slug);
  if (slug === 'casa') {
    return (
      <PaginaLoja secaoAtual={slug}>
        <PortalCasa produtos={produtos} />
        <div id="pecas" className="scroll-mt-40">
          <ComPaleta cores={PALETAS_CASA.sobreLinho}>
            <Listagem produtos={produtos} filtrosEmLinha extra={<MonteCasa />} grade="grid-cols-2 lg:grid-cols-4" />
          </ComPaleta>
        </div>
      </PaginaLoja>
    );
  }
  return (
    <PaginaLoja secaoAtual={slug}>
      <section data-secao={slug} aria-labelledby="secao-titulo" className="grid min-h-[260px] grid-cols-1 items-center gap-6 overflow-hidden rounded-2xl bg-universo px-6 py-8 text-secao-universo-texto md:grid-cols-[minmax(0,1fr)_minmax(0,380px)] md:px-10">
        <div className="flex flex-col gap-3">
          <nav aria-label="Você está em" className="flex gap-2 text-sm opacity-80">
            <Link href="/" className="text-inherit underline-offset-2 hover:underline">Início</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{s.nome}</span>
          </nav>
          <p className="m-0 inline-flex w-fit items-center gap-2 rounded-full border border-current/20 px-3 py-1 text-xs font-semibold"><span aria-hidden="true" className="size-2 rounded-full bg-secao-2" />Universo {s.universo}</p>
          <h1 id="secao-titulo" className="m-0 font-display text-[clamp(32px,4vw,52px)] leading-[1.02] font-extrabold tracking-[-0.03em]">{s.nome}</h1>
          <p className="m-0 max-w-[60ch] opacity-85">{s.chamada}. {s.resumo}</p>
          <p className="m-0 text-sm font-semibold opacity-80">{produtos.length ? `${produtos.length} ${produtos.length === 1 ? 'peça' : 'peças'}` : 'Chegando em breve'}</p>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-[300px] [&_.miniatura]:size-full [&_.miniatura]:object-contain [&_.miniatura]:drop-shadow-[0_18px_24px_rgb(0_0_0/0.25)] [&_.miniatura-reserva]:size-full">
          {peca ? <Miniatura id={peca.gerador} alt={peca.nome} reserva={<ArteSecao secao={slug} />} /> : <ArteSecao secao={slug} className="rounded-2xl" />}
        </div>
      </section>
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
