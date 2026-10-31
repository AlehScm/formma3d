import type { Metadata } from 'next';
import Link from 'next/link';
import { BotaoMarca, SecaoMarca } from '@/components/marca';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { TopoLetras } from '@/features/letras/TopoLetras';
import { EsteiraLetras } from '@/features/letras/EsteiraLetras';
import { ChamadaWhatsApp } from '@/features/letras/ChamadaWhatsApp';
import { produtosLetras } from '@/lib/marketplace/letras';
import { MENSAGENS, linkWhatsapp } from '@/lib/marketplace/contato';
import { metadadosPagina } from '@/lib/seo';

export const metadata: Metadata = metadadosPagina({
  titulo: 'Letra caixa e letras personalizadas em 3D',
  descricao: 'Letra caixa e letreiro 3D para recepção, loja e parede, e letras personalizadas para decoração, impressas em 3D. Orçamento pelo WhatsApp.',
  caminho: '/letra-caixa',
});

const PASSOS = [
  { titulo: 'Mande o pedido', texto: 'Mande pelo WhatsApp o texto ou o logo, a fonte e o tamanho.' },
  { titulo: 'Veja a prévia', texto: 'Mostramos a prévia em 3D e combinamos cores, preço e prazo.' },
  { titulo: 'Receba a peça', texto: 'Imprimimos a sua peça e combinamos a entrega.' },
];

const LINK_SAIDA = 'flex min-h-[260px] flex-col gap-4 rounded-marca-lg p-6 no-underline shadow-marca-1 md:p-8';

/** O card inteiro e o link; a pilula so diz o que acontece ao clicar. */
const ACAO_SAIDA = 'mt-auto inline-flex min-h-11 w-fit items-center rounded-marca-pilula bg-white px-5 font-bold text-marca-navy';

export default function LetraCaixaPage() {
  const whatsapp = linkWhatsapp(MENSAGENS.letraCaixa());
  return (
    <PaginaLoja cru>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopoLetras />
        <EsteiraLetras produtos={produtosLetras()} />
        <SecaoMarca id="letra-caixa-saidas" titulo="Escolha por onde começar" className="pt-0">
          <div className="grid gap-vao md:grid-cols-2">
            <Link href="/editor" className={`${LINK_SAIDA} bg-marca-navy text-white focus-visible:outline-none focus-visible:shadow-marca-foco`}>
              <h3 className="m-0 text-titulo font-semibold">Editor profissional</h3>
              <p className="m-0 text-corpo text-marca-escura-texto">Digite o letreiro, escolha a fonte e veja cada letra caixa em 3D, com as medidas.</p>
              <span className={ACAO_SAIDA}>Abrir o editor</span>
            </Link>
            <Link href="/letras" className={`${LINK_SAIDA} bg-marca-azul text-white focus-visible:outline-none focus-visible:shadow-marca-foco`}>
              <h3 className="m-0 text-titulo font-semibold">Vitrine de letras</h3>
              <p className="m-0 text-corpo text-white">Letras para decoração de casa, festa e presente: com nome, em camadas, de parede e luminárias, prontas para personalizar.</p>
              <span className={ACAO_SAIDA}>Ver as letras</span>
            </Link>
          </div>
        </SecaoMarca>
        <SecaoMarca id="letra-caixa-como" fundo="gelo" titulo="Como funciona" className="pt-0">
          <ol className="m-0 grid list-none gap-vao p-0 md:grid-cols-3">
            {PASSOS.map((passo, i) => (
              <li key={passo.titulo} className="flex flex-col gap-2">
                <span className="font-display text-marca-titulo-2 leading-none font-black text-marca-azul">{i + 1}</span>
                <h3 className="m-0 text-modulo text-marca-navy">{passo.titulo}</h3>
                <p className="m-0 text-corpo text-marca-texto-2">{passo.texto}</p>
              </li>
            ))}
          </ol>
          <div className="mt-[clamp(24px,3vw,40px)] flex flex-wrap items-center gap-4">
            {whatsapp ? (
              <span data-cta-whatsapp className="inline-flex">
                <BotaoMarca variante="whatsapp" href={whatsapp}>Pedir orçamento pelo WhatsApp</BotaoMarca>
              </span>
            ) : (
              <BotaoMarca href="/pecas">Ver as peças</BotaoMarca>
            )}
          </div>
        </SecaoMarca>
      </div>
      <ChamadaWhatsApp />
    </PaginaLoja>
  );
}
