import type { Metadata } from 'next';
import { MarketplaceHome } from '@/features/marketplace/MarketplaceHome';

export const metadata: Metadata = {
  title: 'Scarprint | Peças personalizadas e criação 3D',
  description: 'Explore peças 3D personalizáveis, crie seus moldes e prepare arquivos para impressão na Scarprint.',
};

export default function Page() {
  return <MarketplaceHome />;
}
