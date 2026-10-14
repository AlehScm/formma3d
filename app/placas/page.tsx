import type { Metadata } from 'next';
import { EditorPlacas } from '@/features/placas/EditorPlacas';
import { metadadosPagina } from '@/lib/seo';

export const metadata: Metadata = metadadosPagina({
  titulo: 'Editor de placas personalizadas em 3D',
  descricao: 'Monte a sua placa: adicione palavras, edite as letras e organize a composição em milímetros, com a prévia em 3D para imprimir.',
  caminho: '/placas',
});

export default function PlacasPage() {
  return <EditorPlacas />;
}
