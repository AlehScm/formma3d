import type { Metadata } from 'next';
import { EditorDesign } from '@/features/design/EditorDesign';
import { geradorDe, produtosPublicos } from '@/lib/marketplace/consultas';
import { metadadosPagina } from '@/lib/seo';

const TITULO = 'Editor 3D de peças online';

export const metadata: Metadata = metadadosPagina({
  titulo: TITULO,
  descricao: 'Personalize modelos prontos ou crie uma peça com texto, formas, imagens e QR Code em um só editor, com prévia 3D ao vivo.',
  caminho: '/design',
});

export default function DesignPage() {
  // Peca da loja -> gerador: o "Adicionar ao orcamento" e o "Voltar a peca" do editor.
  const pecas = Object.fromEntries(produtosPublicos().flatMap((p) => { const g = geradorDe(p); return g ? [[p.slug, g]] : []; }));
  // h1 so para leitor de tela e buscador: a tela e o editor inteiro, sem titulo visivel.
  return (
    <>
      <h1 className="sr-only">{TITULO}</h1>
      <EditorDesign pecas={pecas} />
    </>
  );
}
