/**
 * Moldura das paginas da loja (cabecalho, conteudo, rodape) e a faixa de vantagens.
 * Componentes de servidor.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ESCOPO_MARCA, Wordmark } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { MENSAGENS, linkWhatsapp } from '@/lib/marketplace/contato';
import { VANTAGENS } from '@/lib/marketplace/loja';
import { ORDEM_SECOES, SECOES, type Secao } from '@/lib/marketplace/tipos';
import { CabecalhoLoja } from './Cabecalho';
import { IconeConversa, IconeImpressora, IconeMedida, IconePersonalizar } from './icones';

const ICONES = { medida: IconeMedida, personalizar: IconePersonalizar, impressora: IconeImpressora, conversa: IconeConversa };

export function FaixaVantagens() {
  return (
    <section aria-label="Por que pedir na Scarprint" className="grid grid-cols-2 gap-3 rounded-2xl bg-marca-branco p-4 shadow-marca-1 lg:grid-cols-4">
      {VANTAGENS.map((v) => {
        const Icone = ICONES[v.icone];
        return (
          <div key={v.titulo} className="flex items-start gap-3 p-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-gelo text-marca-azul"><Icone className="size-5" aria-hidden /></span>
            <div>
              <p className="m-0 text-sm font-semibold text-marca-navy">{v.titulo}</p>
              <p className="m-0 text-xs text-marca-texto-2">{v.texto}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

const LINK_RODAPE = 'text-sm text-white/75 no-underline hover:text-white hover:underline';

export function RodapeLoja() {
  const whatsapp = linkWhatsapp(MENSAGENS.geral());
  return (
    <footer className="mt-12 bg-marca-navy px-margem pt-12 pb-8 text-white">
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        <div>
          <h2 className="mt-0 mb-3 text-sm font-semibold">Seções</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">{ORDEM_SECOES.map((s) => <li key={s}><Link href={`/secao/${s}`} className={LINK_RODAPE}>{SECOES[s].nome}</Link></li>)}</ul>
        </div>
        <div>
          <h2 className="mt-0 mb-3 text-sm font-semibold">Monte a sua</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            <li><Link href="/criar" className={LINK_RODAPE}>Geradores de peças</Link></li>
            <li><Link href="/editor" className={LINK_RODAPE}>Editor de letreiros</Link></li>
            <li><Link href="/placas" className={LINK_RODAPE}>Editor de placas</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mt-0 mb-3 text-sm font-semibold">Como pedir</h2>
          <ol className="m-0 flex flex-col gap-2 pl-4 text-sm text-white/75">
            <li>Escolha as peças e adicione ao orçamento.</li>
            <li>Diga cor, quantidade e o que quiser mudar.</li>
            <li>Envie a lista: respondemos com preço e prazo.</li>
          </ol>
        </div>
        <div>
          <h2 className="mt-0 mb-3 text-sm font-semibold">Atendimento</h2>
          {whatsapp ? <a href={whatsapp} className={LINK_RODAPE} target="_blank" rel="noopener noreferrer">Falar pelo WhatsApp</a> : <p className="m-0 text-sm text-white/75">WhatsApp em breve.</p>}
        </div>
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-6 text-xs text-white/60">
        <span className="[&_b]:text-white [&_small]:text-white/60"><Wordmark tamanho={18} subtitulo={null} href={null} /></span>
        <span>Peças impressas em 3D sob medida. Preços sob consulta.</span>
      </div>
    </footer>
  );
}

/** `cru`: o conteudo cuida do proprio espacamento (paginas que nao sao da loja, como o catalogo). */
export function PaginaLoja({ secaoAtual, children, className, cru }: { secaoAtual?: Secao; children: ReactNode; className?: string; cru?: boolean }) {
  return (
    <div className={cx(ESCOPO_MARCA, 'flex min-h-screen flex-col')}>
      <a className="absolute -left-[9999px] top-2 z-50 rounded-md bg-marca-navy px-3.5 py-2.5 font-bold text-white focus:left-2" href="#conteudo">Pular para o conteúdo</a>
      <CabecalhoLoja secaoAtual={secaoAtual} />
      <main id="conteudo" className={cru ? className : cx('flex w-full flex-col gap-6 px-margem pt-6', className)}>{children}</main>
      <RodapeLoja />
    </div>
  );
}
