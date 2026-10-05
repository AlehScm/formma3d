import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { ProdutoInterativo } from '@/components/loja/Produto';
import { Modulo } from '@/components/loja/Modulo';
import { Prateleira } from '@/components/loja/Vitrine';
import { porSecao, porSlug, produtosPublicos } from '@/lib/marketplace/consultas';
import { SECOES } from '@/lib/marketplace/tipos';

// So os publicos viram pagina (export estatico); oculto nao tem rota.
export const dynamicParams = false;

export function generateStaticParams() {
  return produtosPublicos().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = porSlug((await params).slug);
  return p ? { title: `${p.nome} | Scarprint`, description: p.resumo } : {};
}

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = porSlug((await params).slug);
  if (!p) notFound();
  const secao = SECOES[p.secao];
  const relacionados = porSecao(p.secao).filter((r) => r.slug !== p.slug);
  return (
    <PaginaLoja secaoAtual={p.secao}>
      <nav aria-label="Você está em" className="flex flex-wrap gap-2 text-apoio text-marca-texto-2">
        <Link href="/" className="text-marca-azul no-underline hover:underline">Início</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/secao/${p.secao}`} className="text-marca-azul no-underline hover:underline">{secao.nome}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{p.nome}</span>
      </nav>

      <ProdutoInterativo
        produto={p}
        cabecalho={
          <div className="flex flex-col gap-2">
            <p className="m-0 text-apoio text-marca-texto-2">{secao.nome}, {p.tipo}</p>
            <h1 className="m-0 font-display text-titulo text-marca-navy">{p.nome}</h1>
            <p className="m-0 text-corpo text-marca-texto-2">{p.resumo}</p>
            {p.jaImpresso && <p className="m-0 text-apoio font-semibold text-secao-forte">Já feito para clientes</p>}
          </div>
        }
      />

      <Modulo id="descricao-titulo" titulo="Sobre a peça">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <p className="m-0 max-w-[70ch] text-corpo text-marca-texto-2">{p.descricao}</p>
          {p.personalizavel.length > 0 && (
            <div>
              <h3 className="mt-0 mb-2 text-item font-semibold text-marca-navy">Você escolhe</h3>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {p.personalizavel.map((o) => <li key={o} className="rounded-marca-pilula border border-marca-linha px-3 py-1.5 text-apoio text-marca-texto">{o}</li>)}
              </ul>
            </div>
          )}
        </div>
      </Modulo>

      <Prateleira titulo="Você também pode gostar" secao={p.secao} produtos={relacionados} verTodos={{ href: `/secao/${p.secao}`, rotulo: 'Ver todos' }} />
    </PaginaLoja>
  );
}
