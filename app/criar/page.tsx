import type { Metadata } from 'next';
import { CatalogoScarprint } from '@/components/catalogo/CatalogoScarprint';
import { geradorDe, produtosPublicos } from '@/lib/marketplace/consultas';
import { metadadosPagina } from '@/lib/seo';

export const metadata: Metadata = metadadosPagina({
  titulo: 'Geradores de modelos 3D personalizados (STL e 3MF)',
  descricao: 'Letreiros, chaveiros e placas que você ajusta com o seu texto, as suas cores e o seu tamanho, e baixa pronto para a impressora: 3MF multicor ou STL.',
  caminho: '/criar',
});

export default function Page() {
  // Gerador -> peca publica da loja feita com ele: o card abre a pagina da peca.
  const naLoja = Object.fromEntries(produtosPublicos().flatMap((p) => { const g = geradorDe(p); return g ? [[g, p.slug]] : []; }));
  return <CatalogoScarprint naLoja={naLoja} />;
}
