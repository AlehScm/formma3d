import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DetalheProduto } from '@/components/marketplace/DetalheProduto';
import { porSlug, produtosPublicos } from '@/lib/marketplace/consultas';

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
  const relacionados = produtosPublicos().filter((r) => r.categoria === p.categoria && r.slug !== p.slug).slice(0, 4);
  return <DetalheProduto produto={p} relacionados={relacionados} />;
}
