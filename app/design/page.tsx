import type { Metadata } from 'next';
import { EditorDesign } from '@/features/design/EditorDesign';
import { geradorDe, produtosPublicos } from '@/lib/marketplace/consultas';
import { metadadosPagina } from '@/lib/seo';

export const metadata: Metadata = metadadosPagina({
  titulo: 'Editor 3D de peças online',
  descricao: 'Personalize modelos prontos ou crie uma peça com texto, formas, imagens e QR Code em um só editor, com prévia 3D ao vivo.',
  caminho: '/design',
});

export default function DesignPage() {
  // Peca da loja -> gerador: o "Adicionar ao orcamento" e o "Voltar a peca" do editor.
  const pecas = Object.fromEntries(produtosPublicos().flatMap((p) => { const g = geradorDe(p); return g ? [[p.slug, g]] : []; }));
  return <EditorDesign pecas={pecas} />;
}
