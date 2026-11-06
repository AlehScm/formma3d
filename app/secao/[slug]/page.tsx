import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { Listagem } from '@/components/loja/Listagem';
import { TituloPagina } from '@/components/loja/Modulo';
import { JsonLd } from '@/components/seo/JsonLd';
import { Redirecionar } from '@/components/ui/Redirecionar';
import { ldTrilha, metadadosPagina, naoIndexar } from '@/lib/seo';
import { ENDPOINTS, paginaInicial } from '@/lib/marketplace/api/contrato';
import { ehSecao, porSecao } from '@/lib/marketplace/consultas';
import { ORDEM_SECOES, SECOES, SECOES_ANTIGAS, hrefDaSecao } from '@/lib/marketplace/tipos';

// Uma pagina por secao (export estatico), mesmo as que ainda nao tem pecas publicas. Os
// enderecos antigos (Casa, Colecionaveis) e o de Natal (que mora em /natal) so encaminham.
export const dynamicParams = false;

export function generateStaticParams() {
  return [...ORDEM_SECOES, ...Object.keys(SECOES_ANTIGAS)].map((slug) => ({ slug }));
}

/** Para onde a pagina so encaminha (endereco antigo ou categoria com pagina propria). */
const destinoDe = (slug: string): string | null => SECOES_ANTIGAS[slug] ?? (ehSecao(slug) && hrefDaSecao(slug) !== `/secao/${slug}` ? hrefDaSecao(slug) : null);

// Secao sem peca publica ainda ("em breve") fica fora do Google ate ter conteudo.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (destinoDe(slug)) return naoIndexar('Abrindo a categoria');
  if (!ehSecao(slug)) return {};
  const s = SECOES[slug];
  return metadadosPagina({ titulo: `${s.nome}: peças impressas em 3D`, descricao: `${s.chamada}. ${s.resumo} Personalizadas e impressas em 3D sob medida.`, caminho: `/secao/${slug}`, indexar: porSecao(slug).length > 0 });
}

export default async function SecaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destino = destinoDe(slug);
  if (destino) return <Redirecionar para={destino} rotulo="Abrir a categoria" />;
  if (!ehSecao(slug)) notFound();
  const s = SECOES[slug];
  const produtos = porSecao(slug);
  return (
    <PaginaLoja secaoAtual={slug}>
      {produtos.length > 0 && <JsonLd dados={ldTrilha([{ nome: 'Início', caminho: '/' }, { nome: 'Todas as peças', caminho: '/pecas' }, { nome: s.nome, caminho: `/secao/${slug}` }])} />}
      <TituloPagina titulo={s.nome} descricao={`${s.resumo} Preços sob consulta.`} trilha={[{ href: '/', rotulo: 'Início' }, { href: '/pecas', rotulo: 'Todas as peças' }]} />
      {produtos.length ? (
        <Listagem key={slug} pagina={paginaInicial(produtos)} fonte={ENDPOINTS.secao(slug)} />
      ) : (
        <div className="rounded-marca-lg bg-marca-branco p-10 text-center">
          <p className="m-0 font-display text-modulo text-marca-navy">{s.nome} chegando em breve.</p>
          <p className="mt-1 mb-4 text-corpo text-marca-texto-2">Enquanto isso, veja as outras seções.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {ORDEM_SECOES.filter((x) => x !== slug && porSecao(x).length).map((x) => (
              <Link key={x} href={hrefDaSecao(x)} className="rounded-full border border-marca-linha px-4 py-2 text-item text-marca-navy no-underline hover:bg-marca-gelo">{SECOES[x].nome}</Link>
            ))}
          </div>
        </div>
      )}
    </PaginaLoja>
  );
}
