import type { Metadata } from 'next';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { Listagem } from '@/components/loja/Listagem';
import { TituloPagina } from '@/components/loja/Modulo';
import { ENDPOINTS, paginaInicial } from '@/lib/marketplace/api/contrato';
import { produtosPublicos } from '@/lib/marketplace/consultas';
import { metadadosPagina } from '@/lib/seo';

export const metadata: Metadata = metadadosPagina({
  titulo: 'Todas as peças impressas em 3D',
  descricao: 'Todas as peças impressas em 3D da Scarprint: decoração, colecionáveis, letreiros e placas para empresas, presentes e lembrancinhas personalizadas.',
  caminho: '/pecas',
});

/** Catalogo completo com filtros (a home mostra so as vitrines): a primeira pagina no HTML, o resto por GET. */
export default function PecasPage() {
  return (
    <PaginaLoja todas>
      <TituloPagina titulo="Todas as peças" descricao="Preços sob consulta: escolha as peças, monte o orçamento e a gente responde com o valor." trilha={[{ href: '/', rotulo: 'Início' }]} />
      <Listagem pagina={paginaInicial(produtosPublicos(), 'secao')} fonte={ENDPOINTS.produtos} />
    </PaginaLoja>
  );
}
