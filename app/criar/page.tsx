import type { Metadata } from 'next';
import { CatalogoScarprint } from '@/components/catalogo/CatalogoScarprint';
import { metadadosPagina } from '@/lib/seo';

export const metadata: Metadata = metadadosPagina({
  titulo: 'Geradores de modelos 3D personalizados (STL e 3MF)',
  descricao: 'Letreiros, chaveiros e placas que você ajusta com o seu texto, as suas cores e o seu tamanho, e baixa pronto para a impressora: 3MF multicor ou STL.',
  caminho: '/criar',
});

export default function Page() {
  return <CatalogoScarprint />;
}
