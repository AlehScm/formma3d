import type { Metadata } from 'next';
import { AppShell } from '@/components/casca/AppShell';
import { metadadosPagina } from '@/lib/seo';

const TITULO = 'Editor de letreiros em letra caixa 3D';

export const metadata: Metadata = metadadosPagina({
  titulo: TITULO,
  descricao: 'Digite o letreiro, escolha a fonte e veja as letras caixa em 3D, com o recorte da chapa de ACM e a exportação em STL, DXF e PDF.',
  caminho: '/editor',
});

export default function EditorPage() {
  // h1 so para leitor de tela e buscador: a tela e o editor inteiro, sem titulo visivel.
  return (
    <>
      <h1 className="sr-only">{TITULO}</h1>
      <AppShell />
    </>
  );
}
