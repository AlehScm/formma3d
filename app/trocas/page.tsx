import type { Metadata } from 'next';
import { PaginaPolitica, Topico } from '@/components/loja/Politica';
import { CONTATO, MENSAGENS, linkWhatsapp } from '@/lib/marketplace/contato';
import { metadadosPagina } from '@/lib/seo';

const DESCRICAO = 'Trocas e devoluções da Scarprint: peça com defeito ou diferente do combinado é refeita, e você pode desistir em até 7 dias do recebimento.';

export const metadata: Metadata = metadadosPagina({ titulo: 'Trocas e devoluções', descricao: DESCRICAO, caminho: '/trocas' });

export default function TrocasPage() {
  const whatsapp = linkWhatsapp(MENSAGENS.troca());
  return (
    <PaginaPolitica titulo="Trocas e devoluções" descricao={DESCRICAO} atualizada="30 de outubro de 2026">
      <Topico titulo="Peça feita sob encomenda">
        <p>Cada peça é impressa depois do pedido. Antes de imprimir, combinamos pelo WhatsApp medidas, cores, texto e prazo, e só começamos com a sua aprovação. Até a impressão começar, você pode cancelar sem custo.</p>
      </Topico>
      <Topico titulo="Defeito ou diferente do combinado">
        <p>Se a peça chegar quebrada, com defeito de impressão ou diferente do que foi aprovado, avise em até 90 dias do recebimento. Refazemos a peça sem custo e, se não der para refazer, devolvemos o valor pago. O frete de ida e volta fica por nossa conta.</p>
      </Topico>
      <Topico titulo="Desistência em até 7 dias">
        <p>Como a compra é feita a distância (pelo site e pelo WhatsApp), você pode desistir em até 7 dias depois de receber, como garante o Código de Defesa do Consumidor (art. 49). Devolvemos o valor pago, inclusive o frete.</p>
      </Topico>
      <Topico titulo="Como pedir">
        <p>
          Mande o seu nome e fotos da peça pelo{' '}
          {whatsapp ? <a href={whatsapp} data-medir="nao" target="_blank" rel="noopener noreferrer">WhatsApp {CONTATO.whatsappTexto}</a> : 'WhatsApp'}.
          Explicamos como enviar a peça de volta e em quanto tempo o valor é devolvido.
        </p>
      </Topico>
    </PaginaPolitica>
  );
}
