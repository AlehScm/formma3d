import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { CompraProduto, GaleriaProduto } from '@/components/loja/Produto';
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
      <nav aria-label="Você está em" className="flex flex-wrap gap-2 text-sm text-marca-texto-2">
        <Link href="/" className="text-marca-azul no-underline hover:underline">Início</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/secao/${p.secao}`} className="text-marca-azul no-underline hover:underline">{secao.nome}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{p.nome}</span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <GaleriaProduto produto={p} />
        <div className="flex flex-col gap-4 lg:sticky lg:top-40">
          <div>
            <p className="m-0 text-sm text-marca-texto-3">{secao.nome} / {p.tipo}</p>
            <h1 className="mt-1 mb-2 font-display text-[clamp(26px,2.8vw,36px)] leading-tight font-extrabold text-marca-navy">{p.nome}</h1>
            <p className="m-0 text-marca-texto-2">{p.resumo}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              {p.origem === 'nosso' && <span className="rounded-md bg-marca-sucesso-fundo px-2 py-1 text-marca-sucesso">Projeto Scarprint</span>}
              {p.personalizar && <span className="rounded-md bg-marca-gelo px-2 py-1 text-marca-azul-forte">Personalizável em 3D</span>}
              {p.jaImpresso && <span className="rounded-md bg-marca-navy px-2 py-1 text-white">Já feito para clientes</span>}
            </div>
          </div>
          <CompraProduto produto={p} />
        </div>
      </div>

      <section aria-labelledby="descricao-titulo" className="grid grid-cols-1 gap-6 rounded-2xl bg-marca-branco p-6 shadow-marca-1 md:grid-cols-2">
        <div>
          <h2 id="descricao-titulo" className="mt-0 mb-2 text-lg font-bold text-marca-navy">Descrição</h2>
          <p className="m-0 leading-relaxed text-marca-texto-2">{p.descricao}</p>
        </div>
        {p.personalizavel.length > 0 && (
          <div>
            <h2 className="mt-0 mb-2 text-lg font-bold text-marca-navy">Você escolhe</h2>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {p.personalizavel.map((o) => <li key={o} className="rounded-full border border-marca-linha px-3 py-1.5 text-sm text-marca-texto">{o}</li>)}
            </ul>
          </div>
        )}
      </section>

      <Prateleira titulo="Você também pode gostar" secao={p.secao} produtos={relacionados} verTodos={{ href: `/secao/${p.secao}`, rotulo: `Ver ${secao.nome}` }} />
    </PaginaLoja>
  );
}
