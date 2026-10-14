import type { Metadata } from 'next';
import { AppShell } from '@/components/casca/AppShell';
import { metadadosPagina } from '@/lib/seo';

export const metadata: Metadata = metadadosPagina({
  titulo: 'Editor de letreiros em letra caixa 3D',
  descricao: 'Digite o letreiro, escolha a fonte e veja as letras caixa em 3D, com o recorte da chapa de ACM e a exportação em STL, DXF e PDF.',
  caminho: '/editor',
});

export default function EditorPage() {
  return <AppShell />;
}
