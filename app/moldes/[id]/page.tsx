import { notFound } from 'next/navigation';
import { MoldeAtivo } from '@/components/catalogo/MoldeAtivo';
import { moldes, type MoldeId } from '@/features/catalogo/catalogo';

export const dynamicParams = false;

export function generateStaticParams() {
  return moldes.map(({ id }) => ({ id }));
}

export default async function MoldePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const molde = moldes.find((item) => item.id === id);
  if (!molde) notFound();
  return <MoldeAtivo key={molde.id} id={molde.id as MoldeId} />;
}
