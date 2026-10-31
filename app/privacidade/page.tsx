import type { Metadata } from 'next';
import { PaginaPolitica, Topico } from '@/components/loja/Politica';
import { CONTATO, EMPRESA, MENSAGENS, identificacaoEmpresa, linkWhatsapp } from '@/lib/marketplace/contato';
import { tagsDoGoogle } from '@/lib/medicao';
import { metadadosPagina } from '@/lib/seo';

const DESCRICAO = 'Como a Scarprint trata os seus dados: sem cadastro, orçamento guardado só no seu navegador, pedido pelo WhatsApp e medição dos anúncios.';

export const metadata: Metadata = metadadosPagina({ titulo: 'Política de privacidade', descricao: DESCRICAO, caminho: '/privacidade' });

export default function PrivacidadePage() {
  const whatsapp = linkWhatsapp(MENSAGENS.dados());
  const empresa = identificacaoEmpresa();
  const email = EMPRESA.email.trim();
  return (
    <PaginaPolitica titulo="Política de privacidade" descricao={DESCRICAO} atualizada="30 de outubro de 2026">
      <Topico titulo="Quem cuida dos seus dados">
        <p>A Scarprint{empresa && ` (${empresa})`}, loja de peças impressas em 3D sob medida. Seguimos a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
      </Topico>
      <Topico titulo="O que fica no seu navegador">
        <p>O site não tem cadastro nem login. As peças do orçamento, os favoritos e o que você monta nos geradores ficam guardados só no seu navegador e não chegam até nós. Imagens e arquivos abertos nos geradores são processados no seu aparelho. Para apagar tudo, limpe os dados deste site no navegador.</p>
        <p>Algumas fontes de letra dos geradores são baixadas de um serviço público de fontes (jsDelivr), que recebe o endereço de internet do seu aparelho como em qualquer acesso.</p>
      </Topico>
      <Topico titulo="Quando você pede pelo WhatsApp">
        <p>A lista do orçamento vai pelo WhatsApp, e recebemos o seu nome, o seu telefone e o que você escrever. Usamos esses dados só para orçar, produzir e entregar o pedido e para falar com você sobre ele. Não vendemos nem repassamos os seus dados, a não ser para a entrega (transportadora ou Correios) e quando a lei exigir.</p>
      </Topico>
      <Topico titulo="Anúncios e estatísticas">
        {tagsDoGoogle().length ? (
          <>
            <p>Usamos ferramentas do Google (Google Ads e Google Analytics) para saber quantas pessoas chegam pelos nossos anúncios e quantas pedem orçamento. Para isso o Google grava cookies no seu navegador e recebe dados de navegação, como as páginas vistas e os cliques no botão do WhatsApp.</p>
            <p>Veja <a href="https://policies.google.com/technologies/partner-sites?hl=pt-BR" target="_blank" rel="noopener noreferrer">como o Google usa esses dados</a> e desative anúncios personalizados na <a href="https://myadcenter.google.com/?hl=pt-BR" target="_blank" rel="noopener noreferrer">Minha Central de Anúncios</a>. Bloquear cookies de terceiros no navegador também interrompe a medição, e o site continua funcionando igual.</p>
          </>
        ) : (
          <p>Hoje o site não usa cookies de anúncio nem de estatística. Se isso mudar, esta página explica o que for usado antes de entrar no ar.</p>
        )}
      </Topico>
      <Topico titulo="Os seus direitos">
        <p>
          Você pode pedir para saber quais dados seus temos, corrigir, apagar ou deixar de receber mensagens, pelo{' '}
          {whatsapp ? <a href={whatsapp} data-medir="nao" target="_blank" rel="noopener noreferrer">WhatsApp {CONTATO.whatsappTexto}</a> : 'WhatsApp'}
          {email && <> ou pelo e-mail <a href={`mailto:${email}`}>{email}</a></>}.
        </p>
      </Topico>
    </PaginaPolitica>
  );
}
