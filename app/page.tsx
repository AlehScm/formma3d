import type { Metadata } from 'next';
import { MarketplaceHome } from '@/features/marketplace/MarketplaceHome';

export const metadata: Metadata = {
  title: 'Scarprint | Loja de impressão 3D',
  description: 'Peças impressas em 3D para casa, coleção, empresa e festas. Escolha a seção e encontre a peça.',
};

export default function Page() {
  return <MarketplaceHome />;
}
