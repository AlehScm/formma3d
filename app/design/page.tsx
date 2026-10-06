import type { Metadata } from 'next';
import { EditorDesign } from '@/features/design/EditorDesign';

export const metadata: Metadata = { title: 'Crie do zero | Scarprint', description: 'Monte a sua peça livremente: texto, formas, imagem e QR em camadas, com o 3D ao vivo.' };

export default function DesignPage() {
  return <EditorDesign />;
}
