import type { Metadata } from 'next';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { Listagem } from '@/components/loja/Listagem';
import { TituloPagina } from '@/components/loja/Modulo';
import { paraResumo } from '@/lib/marketplace/api/contrato';
import { produtosLetras } from '@/lib/marketplace/letras';
import { metadadosPagina } from '@/lib/seo';

export const metadata: Metadata = metadadosPagina({
  titulo: 'Letras em 3D: nome, camadas, parede e luminária',
  descricao: 'Letras para decoração de casa, festa e presente: com nome, em camadas, de parede e luminárias, impressas em 3D. Peça orçamento.',
  caminho: '/letras',
});

export default function LetrasPage() {
  return (
    <PaginaLoja>
      <TituloPagina titulo="Letras em 3D" descricao="Letras para decoração de quarto, sala, festa e presente, e também para a sua loja: com nome, em camadas, de parede e luminárias." trilha={[{ href: '/', rotulo: 'Início' }]} />
      <Listagem produtos={produtosLetras().map(paraResumo)} />
    </PaginaLoja>
  );
}
