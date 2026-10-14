import type { Metadata } from 'next';
import { EditorDesign } from '@/features/design/EditorDesign';
import { metadadosPagina } from '@/lib/seo';

export const metadata: Metadata = metadadosPagina({
  titulo: 'Editor 3D de peças online',
  descricao: 'Personalize modelos prontos ou crie uma peça com texto, formas, imagens e QR Code em um só editor, com prévia 3D ao vivo.',
  caminho: '/design',
});

export default function DesignPage() {
  return <EditorDesign />;
}
