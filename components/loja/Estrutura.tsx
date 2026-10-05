/**
 * Moldura das paginas da loja (cabecalho, conteudo, rodape).
 * Componentes de servidor.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ESCOPO_MARCA, Wordmark } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { MENSAGENS, linkWhatsapp } from '@/lib/marketplace/contato';
import { ORDEM_SECOES, SECOES, type Secao } from '@/lib/marketplace/tipos';
import { CabecalhoLoja } from './Cabecalho';

const LINK_RODAPE = 'text-apoio text-marca-texto-2 no-underline hover:text-marca-azul hover:underline';

export function RodapeLoja() {
  const whatsapp = linkWhatsapp(MENSAGENS.geral());
  return (
    <footer className="mt-12 border-t border-marca-linha bg-marca-branco pt-12 pb-8 text-marca-navy">
      <div className="conteiner-loja grid grid-cols-2 gap-8 px-margem md:grid-cols-4">
        <div>
          <h2 className="mt-0 mb-3 text-item font-semibold">Seções</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">{ORDEM_SECOES.map((s) => <li key={s}><Link href={`/secao/${s}`} className={LINK_RODAPE}>{SECOES[s].nome}</Link></li>)}</ul>
        </div>
        <div>
          <h2 className="mt-0 mb-3 text-item font-semibold">Monte a sua</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            <li><Link href="/criar" className={LINK_RODAPE}>Geradores de peças</Link></li>
            <li><Link href="/editor" className={LINK_RODAPE}>Editor de letreiros</Link></li>
            <li><Link href="/placas" className={LINK_RODAPE}>Editor de placas</Link></li>
            <li><Link href="/criar" className={LINK_RODAPE}>Seja apoiador (em breve)</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mt-0 mb-3 text-item font-semibold">Como pedir</h2>
          <ol className="m-0 flex flex-col gap-2 pl-4 text-apoio text-marca-texto-2">
            <li>Escolha as peças e adicione ao orçamento.</li>
            <li>Diga cor, quantidade e o que quiser mudar.</li>
            <li>Envie a lista: respondemos com preço e prazo.</li>
          </ol>
        </div>
        <div>
          <h2 className="mt-0 mb-3 text-item font-semibold">Atendimento</h2>
          {whatsapp ? <a href={whatsapp} className={LINK_RODAPE} target="_blank" rel="noopener noreferrer">Falar pelo WhatsApp</a> : <p className="m-0 text-apoio text-marca-texto-2">WhatsApp em breve.</p>}
        </div>
      </div>
      <div className="conteiner-loja mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-marca-linha px-margem pt-6 text-apoio text-marca-texto-2">
        <Wordmark tamanho={22} subtitulo={null} href={null} />
        <span>Peças impressas em 3D sob medida. Preços sob consulta.</span>
      </div>
    </footer>
  );
}

/** `cru`: o conteudo cuida do proprio espacamento (paginas que nao sao da loja, como o catalogo). */
export function PaginaLoja({ secaoAtual, todas, children, className, cru }: { secaoAtual?: Secao; todas?: boolean; children: ReactNode; className?: string; cru?: boolean }) {
  return (
    // scheme-light: o :root do app e escuro (editor); sem isto checkbox e select da loja saem pretos.
    <div data-secao={secaoAtual} className={cx(ESCOPO_MARCA, 'flex min-h-screen flex-col scheme-light')}>
      <a className="absolute -left-[9999px] top-2 z-50 rounded-md bg-marca-navy px-3.5 py-2.5 font-bold text-white focus:left-2" href="#conteudo">Pular para o conteúdo</a>
      <CabecalhoLoja secaoAtual={secaoAtual} todas={todas} />
      <main id="conteudo" className={cru ? className : cx('conteiner-loja flex min-w-0 flex-1 flex-col gap-8 px-margem pt-6', className)}>{children}</main>
      <RodapeLoja />
    </div>
  );
}
