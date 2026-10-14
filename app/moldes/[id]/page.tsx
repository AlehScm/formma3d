import type { Metadata } from 'next';
import { Redirecionar } from '@/components/ui/Redirecionar';
import { destinoDoMoldeAntigo, moldes } from '@/features/catalogo/catalogo';
import { receitaPorId } from '@/lib/gerador/receitas';
import { FICHAS } from '@/lib/gerador/receitas/fichas';
import { naoIndexar } from '@/lib/seo';

export const dynamicParams = false;

export const metadata: Metadata = naoIndexar('Abrindo no editor');

export function generateStaticParams() {
  return [...new Set([...FICHAS, ...moldes].map(({ id }) => id))].map((id) => ({ id }));
}

// Endereco antigo: os modelos abrem no editor (/design?modelo=<id>), texto e placas nas
// ferramentas deles; aqui so encaminha.
export default async function MoldeAntigo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Redirecionar para={destinoDoMoldeAntigo(id, (r) => !!receitaPorId(r))} />;
}
