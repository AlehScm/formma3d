import type { Metadata } from 'next';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { Listagem } from '@/components/loja/Listagem';
import { TituloPagina } from '@/components/loja/Modulo';
import { ENDPOINTS, paginaInicial } from '@/lib/marketplace/api/contrato';
import { geradores } from '@/lib/marketplace/consultas';
import { NOSSOS_GERADORES } from '@/lib/marketplace/tipos';
import { metadadosPagina } from '@/lib/seo';

export const metadata: Metadata = metadadosPagina({
  titulo: `${NOSSOS_GERADORES.nome}: peças que você personaliza em 3D`,
  descricao: `${NOSSOS_GERADORES.resumo} Veja ao vivo como fica e peça o orçamento.`,
  caminho: '/geradores',
});

/** Tudo que a gente criou e da para personalizar ao vivo (cada peca tambem fica na categoria dela). */
export default function GeradoresPage() {
  return (
    <PaginaLoja geradores>
      <TituloPagina titulo={NOSSOS_GERADORES.nome} descricao={`${NOSSOS_GERADORES.resumo} Preços sob consulta.`} trilha={[{ href: '/', rotulo: 'Início' }, { href: '/pecas', rotulo: 'Todas as peças' }]} />
      <Listagem pagina={paginaInicial(geradores(), 'secao')} fonte={ENDPOINTS.geradores} />
    </PaginaLoja>
  );
}
