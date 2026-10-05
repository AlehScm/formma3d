import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { Listagem } from '@/components/loja/Listagem';
import { TituloPagina } from '@/components/loja/Modulo';
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
      <TituloPagina titulo={s.nome} descricao={`${s.resumo} Preços sob consulta.`} trilha={[{ href: '/', rotulo: 'Início' }, { href: '/pecas', rotulo: 'Todas as peças' }]} />
      {produtos.length ? (
        <Listagem key={slug} produtos={produtos} />
      ) : (
        <div className="rounded-marca-lg bg-marca-branco p-10 text-center">
          <p className="m-0 font-display text-modulo text-marca-navy">{s.nome} chegando em breve.</p>
          <p className="mt-1 mb-4 text-corpo text-marca-texto-2">Enquanto isso, veja as outras seções.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {ORDEM_SECOES.filter((x) => x !== slug && porSecao(x).length).map((x) => (
              <Link key={x} href={`/secao/${x}`} className="rounded-full border border-marca-linha px-4 py-2 text-item text-marca-navy no-underline hover:bg-marca-gelo">{SECOES[x].nome}</Link>
            ))}
          </div>
        </div>
      )}
    </PaginaLoja>
  );
}
