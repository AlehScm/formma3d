/**
 * Pecas da loja compartilhadas pela home, pela pagina de secao e pela de produto:
 * cabecalho (secoes + extras), rodape, card de produto e bloco de secao. Cada card e
 * bloco leva `data-secao`, entao a cor filha tinge so os acentos dele. So Tailwind.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArteSecao } from '@/components/marca/ArteSecao';
import { BotaoMarca, BotaoWhatsapp, CARTAO, CARTAO_INTERATIVO, ChipSecao, ESCOPO_MARCA, SeloMarca, Wordmark } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { Miniatura } from '@/features/catalogo/Miniaturas';
import { ORDEM_SECOES, SECOES, type Produto, type Secao } from '@/lib/marketplace/tipos';
import { textoDoPreco, urlDaMidia } from '@/lib/marketplace/formato';
import { MENSAGENS, linkWhatsapp } from '@/lib/marketplace/contato';

/** Ha canal de atendimento (numero de WhatsApp configurado)? Sem ele, nada promete resposta. */
export const temCanal = () => linkWhatsapp(MENSAGENS.geral()) !== null;

/** Link de texto na cor forte da secao. */
export const LINK_SECAO = 'font-extrabold whitespace-nowrap text-secao-forte no-underline hover:underline underline-offset-4';
/** Titulo de bloco/vitrine (display). */
export const TITULO_2 = 'm-0 font-display text-marca-titulo-2 leading-[1.05] font-black tracking-[-0.05em] text-marca-navy';

export function CabecalhoLoja({ secaoAtual }: { secaoAtual?: Secao }) {
  return (
    <header className="sticky top-0 z-20 border-b border-marca-linha bg-marca-vidro backdrop-blur-md">
      <div className="flex min-h-[72px] flex-wrap items-center gap-x-[clamp(14px,2.4vw,36px)] gap-y-2 px-margem py-2.5 md:flex-nowrap">
        <Wordmark />
        <nav
          aria-label="Seções da loja"
          className="order-3 flex w-full snap-x snap-proximity gap-1 overflow-x-auto [scrollbar-width:none] max-md:[mask-image:linear-gradient(to_right,black_85%,transparent)] md:order-none md:ml-auto md:w-auto [&::-webkit-scrollbar]:hidden"
        >
          {ORDEM_SECOES.map((s) => (
            <Link
              key={s}
              href={`/secao/${s}`}
              data-secao={s}
              aria-current={s === secaoAtual ? 'page' : undefined}
              className="inline-flex snap-start items-center gap-2 rounded-marca-pilula px-2.5 py-2 text-xs font-bold whitespace-nowrap text-marca-profundo no-underline before:size-[9px] before:rounded-full before:bg-secao before:content-[''] hover:bg-secao-suave hover:text-secao-forte aria-[current=page]:bg-secao-suave aria-[current=page]:text-secao-forte md:px-3 md:text-marca-pequeno"
            >
              {SECOES[s].nome}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2.5 md:ml-0">
          <Link href="/criar" className="text-marca-pequeno font-extrabold whitespace-nowrap text-marca-azul no-underline hover:underline underline-offset-4">Personalize o seu</Link>
          {temCanal() && <BotaoWhatsapp mensagem={MENSAGENS.geral()} pequeno>WhatsApp</BotaoWhatsapp>}
        </div>
      </div>
    </header>
  );
}

const LINK_RODAPE = 'font-bold text-marca-texto-2 no-underline hover:text-marca-azul';

export function RodapeLoja() {
  return (
    <footer className="mt-auto flex flex-wrap items-start justify-between gap-x-10 gap-y-5 border-t border-marca-linha bg-marca-branco px-margem py-8 text-[13px] text-marca-texto-3">
      <div>
        <Wordmark tamanho={20} subtitulo={null} />
        <p className="mt-2.5 mb-0 max-w-[360px]">Peças impressas em 3D, sob medida. Preços em validação.</p>
      </div>
      <nav aria-label="Seções" className="flex flex-wrap gap-x-5 gap-y-2">
        {ORDEM_SECOES.map((s) => <Link key={s} href={`/secao/${s}`} className={LINK_RODAPE}>{SECOES[s].nome}</Link>)}
      </nav>
      <nav aria-label="Faça você mesmo" className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/criar" className={LINK_RODAPE}>Personalize o seu</Link>
        <Link href="/editor" className={LINK_RODAPE}>Editor de letreiros</Link>
        <Link href="/placas" className={LINK_RODAPE}>Editor de placas</Link>
      </nav>
    </footer>
  );
}

export function PaginaLoja({ secaoAtual, children }: { secaoAtual?: Secao; children: ReactNode }) {
  return (
    <div className={cx(ESCOPO_MARCA, 'flex min-h-screen flex-col')} data-secao={secaoAtual}>
      <a className="absolute -left-[9999px] top-2 z-50 rounded-marca-sm bg-marca-navy px-3.5 py-2.5 font-bold text-white focus:left-2" href="#conteudo">Pular para o conteúdo</a>
      <CabecalhoLoja secaoAtual={secaoAtual} />
      <main id="conteudo">{children}</main>
      <RodapeLoja />
    </div>
  );
}

/** Gerador da peca (`/moldes/<id>`), se houver: o card mostra a previa 3D real dele. */
const geradorDe = (p: Produto) => p.personalizar?.href.match(/^\/moldes\/([a-z0-9-]+)$/)?.[1];

/** Enquanto a previa carrega: so o tipo da peca, sem desenhar um objeto que pode nao ser ela. */
function ReservaNeutra({ texto }: { texto: string }) {
  return <div className="grid size-full place-items-center bg-secao-fundo text-marca-pequeno font-bold text-secao-forte opacity-70">{texto}</div>;
}

export function CardProduto({ produto: p, nivel = 'h3' }: { produto: Produto; nivel?: 'h2' | 'h3' }) {
  const gerador = geradorDe(p);
  const Titulo = nivel;
  return (
    <article className={cx(CARTAO, CARTAO_INTERATIVO, 'relative')} data-secao={p.secao}>
      <div className="relative aspect-[6/5] overflow-hidden bg-secao-fundo [&_.miniatura]:block [&_.miniatura]:size-full [&_.miniatura]:object-contain [&_.miniatura]:p-[6%] [&_.miniatura-reserva]:size-full">
        {p.midias[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- export estatico sem otimizador de imagem
          <img src={urlDaMidia(p.midias[0])} alt="" loading="lazy" className="size-full object-cover" />
        ) : gerador ? (
          <>
            <Miniatura id={gerador} alt={`Prévia 3D: ${p.nome}`} reserva={<ReservaNeutra texto={p.tipo} />} />
            {/* so aparece quando a imagem real chegou (irma da img.miniatura) */}
            <span className="absolute top-2.5 left-2.5 hidden rounded-marca-pilula bg-marca-vidro px-2 py-1 text-[11px] font-extrabold tracking-[0.02em] text-secao-forte [.miniatura+&]:inline-flex">Prévia 3D</span>
          </>
        ) : (
          <ArteSecao secao={p.secao} />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pt-3.5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <ChipSecao>{p.tipo}</ChipSecao>
          <SeloMarca tom="validacao">{textoDoPreco(p)}</SeloMarca>
        </div>
        <Titulo className="mt-0.5 mb-0 text-[17px] leading-tight font-extrabold text-marca-navy">
          <Link href={`/produto/${p.slug}`} className="text-inherit no-underline after:absolute after:inset-0 after:content-['']">{p.nome}</Link>
        </Titulo>
        <p className="m-0 text-sm leading-normal text-marca-texto-2">{p.resumo}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className={LINK_SECAO} aria-hidden="true">Ver peça →</span>
          {p.personalizar && <BotaoMarca variante="contorno" pequeno href={p.personalizar.href} className="relative z-[1]">Personalizar</BotaoMarca>}
        </div>
      </div>
    </article>
  );
}

export function BlocoSecao({ secao, total }: { secao: Secao; total: number }) {
  const s = SECOES[secao];
  return (
    <Link
      href={`/secao/${secao}`}
      data-secao={secao}
      className="relative flex min-h-[300px] flex-col overflow-hidden rounded-marca-lg border border-secao-borda bg-secao-fundo text-marca-navy no-underline transition-[transform,box-shadow] duration-150 hover:-translate-y-[3px] hover:shadow-marca-2 sm:max-lg:[&:last-child:nth-child(odd)]:col-span-2 lg:col-span-2 lg:[&:nth-child(-n+2)]:col-span-3"
    >
      <div className="min-h-[170px] flex-1"><ArteSecao secao={secao} /></div>
      <div className="flex flex-col gap-1.5 bg-marca-vidro px-5 pt-[18px] pb-5">
        <strong className="font-display text-[clamp(22px,2.2vw,30px)] leading-[1.05] font-black tracking-[-0.04em]">{s.nome}</strong>
        <span className="text-sm text-marca-texto-2">{s.chamada}</span>
        <em className="inline-flex items-center gap-1.5 text-[13px] font-extrabold not-italic text-secao-forte">{total ? `${total} ${total === 1 ? 'peça' : 'peças'} →` : 'Chegando em breve →'}</em>
      </div>
    </Link>
  );
}

/** Grade dos blocos de secao: 2 grandes + 3 menores no desktop, 2 colunas no tablet, 1 no celular. */
export const GRADE_BLOCOS = 'grid gap-vao grid-cols-1 sm:grid-cols-2 lg:grid-cols-6';
/** Grade de cards de produto. */
export const GRADE_PRODUTOS = 'grid gap-vao grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))]';
/** Trilha "Loja / Secao / Peca". */
export const TRILHA = 'flex flex-wrap gap-2 text-marca-pequeno text-marca-texto-3 [&_a]:font-bold [&_a]:text-marca-azul [&_a]:no-underline';
/** Caixa de estado vazio, na cor da secao. */
export const VAZIO = 'flex flex-col items-start gap-3 rounded-marca-lg border border-dashed border-secao-borda bg-secao-suave p-8';
