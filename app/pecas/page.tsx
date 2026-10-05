import type { Metadata } from 'next';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { Listagem } from '@/components/loja/Listagem';
import { TituloPagina } from '@/components/loja/Modulo';
import { produtosPublicos } from '@/lib/marketplace/consultas';

export const metadata: Metadata = { title: 'Todas as peças | Scarprint', description: 'Todas as peças impressas em 3D da Scarprint, com filtros por tipo.' };

/** Catalogo completo com filtros (a home mostra so as vitrines). */
export default function PecasPage() {
  const produtos = [...produtosPublicos()].sort((a, b) => Number(!!b.destaque) - Number(!!a.destaque));
  return (
    <PaginaLoja todas>
      <TituloPagina titulo="Todas as peças" descricao="Preços sob consulta: escolha as peças, monte o orçamento e a gente responde com o valor." trilha={[{ href: '/', rotulo: 'Início' }]} />
      <Listagem produtos={produtos} />
    </PaginaLoja>
  );
}
