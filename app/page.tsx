import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { MarketplaceHome } from '@/features/marketplace/MarketplaceHome';
import { DESCRICAO_SITE, NOME, ldLoja, metadadosPagina } from '@/lib/seo';

export const metadata: Metadata = metadadosPagina({
  titulo: `${NOME} | Peças personalizadas impressas em 3D`,
  tituloAbsoluto: true,
  descricao: DESCRICAO_SITE,
  caminho: '/',
});

export default function Page() {
  return (
    <>
      <JsonLd dados={ldLoja()} />
      <MarketplaceHome />
    </>
  );
}
