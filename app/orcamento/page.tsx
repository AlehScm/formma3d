import type { Metadata } from 'next';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { TituloPagina } from '@/components/loja/Modulo';
import { Orcamento } from '@/components/loja/Orcamento';
import { produtosPublicos } from '@/lib/marketplace/consultas';
import { naoIndexar } from '@/lib/seo';

export const metadata: Metadata = naoIndexar('Meu orçamento', 'As peças que você escolheu para pedir orçamento.');

export default function OrcamentoPage() {
  return (
    <PaginaLoja>
      <TituloPagina titulo="Meu orçamento" descricao="Ajuste quantidade, cor e observação. Depois envie a lista: respondemos com preço e prazo." />
      <Orcamento produtos={produtosPublicos()} />
    </PaginaLoja>
  );
}
