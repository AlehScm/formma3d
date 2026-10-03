/**
 * Universo Casa: areia, cobre e cafe, com a voz geometrica fina (font-fina) em caixa alta.
 * Topo com o texto da secao e um mosaico de tres pecas reais (render do gerador) sobre
 * blocos de cor cheia; e o bloco "Monte a sua" que fecha a grade de produtos.
 */
import Link from 'next/link';
import { ArteSecao } from '@/components/marca/ArteSecao';
import { cx } from '@/components/ui/cx';
import { Miniatura } from '@/features/catalogo/Miniaturas';
import { geradorDe } from '@/lib/marketplace/formato';
import { PALETAS_CASA, VITRINE_CASA } from '@/lib/marketplace/universos';
import { SECOES, type Produto } from '@/lib/marketplace/tipos';

/** Coracao facetado em duas metades (cobre e cobre escuro), entre dois filetes. */
function Divisor({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cx('flex items-center gap-3', className)}>
      <span className="h-px w-14 bg-secao" />
      <svg viewBox="0 0 24 22" className="size-4">
        <path d="M12 21 3 12V7l4-3 5 4z" className="fill-secao" />
        <path d="M12 21l9-9V7l-4-3-5 4z" className="fill-secao-forte" />
      </svg>
      <span className="h-px w-14 bg-secao" />
    </div>
  );
}

const BLOCOS = [
  { fundo: 'bg-secao', classe: 'row-span-2', paleta: PALETAS_CASA.sobreCobre },
  { fundo: 'bg-secao-2', classe: '', paleta: PALETAS_CASA.sobreCafe },
  { fundo: 'bg-secao-suave', classe: '', paleta: PALETAS_CASA.sobreLinho },
];

function Bloco({ produto: p, fundo, paleta, className }: { produto: Produto; fundo: string; paleta: string[]; className?: string }) {
  const gerador = geradorDe(p)!;
  return (
    <Link href={`/produto/${p.slug}`} className={cx('group relative flex min-h-52 overflow-hidden rounded-3xl no-underline', fundo, className)}>
      <div className="absolute inset-0 p-[3%] pt-10 transition-transform duration-500 group-hover:scale-105 [&_.miniatura]:size-full [&_.miniatura]:object-contain [&_.miniatura]:drop-shadow-[0_18px_20px_rgb(40_24_14/0.35)] [&_.miniatura-reserva]:size-full">
        <Miniatura id={gerador} alt={p.nome} paleta={paleta} reserva={<ArteSecao secao={p.secao} />} />
      </div>
      <span className="absolute top-3 left-3 inline-flex rounded-full bg-secao-superficie px-3 py-1.5 text-xs font-semibold text-secao-tinta shadow-marca-1">{p.nome}</span>
    </Link>
  );
}

export function PortalCasa({ produtos }: { produtos: Produto[] }) {
  const s = SECOES.casa;
  const comRender = produtos.filter((p) => geradorDe(p));
  const vitrine = [...comRender.filter((p) => VITRINE_CASA.includes(p.slug)).sort((a, b) => VITRINE_CASA.indexOf(a.slug) - VITRINE_CASA.indexOf(b.slug)), ...comRender.filter((p) => !VITRINE_CASA.includes(p.slug))].slice(0, BLOCOS.length);
  const tipos = [...new Set(produtos.map((p) => p.tipo))];
  return (
    <section aria-labelledby="secao-titulo" className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex flex-col justify-center gap-6 rounded-3xl bg-secao-superficie px-6 py-10 md:px-12 md:py-14">
        <nav aria-label="Você está em" className="flex gap-2 text-sm text-secao-tinta-2">
          <Link href="/" className="text-inherit underline-offset-2 hover:underline">Início</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{s.nome}</span>
        </nav>
        <div className="flex flex-col gap-4">
          <h1 id="secao-titulo" className="m-0 font-fina text-[clamp(64px,9vw,128px)] leading-[0.9] font-light tracking-[0.12em] text-secao-tinta uppercase">{s.nome}</h1>
          <p className="m-0 font-fina text-sm tracking-[0.18em] text-secao-tinta-2 uppercase">{tipos.slice(0, 3).join(' • ')}</p>
          <Divisor />
        </div>
        <p className="m-0 max-w-[40ch] text-lg leading-relaxed text-secao-tinta-2">{s.chamada}: {s.resumo.charAt(0).toLowerCase() + s.resumo.slice(1)}</p>
        <div className="flex flex-wrap gap-3">
          <a href="#pecas" className="inline-flex min-h-12 items-center rounded-full bg-secao-botao px-6 font-semibold text-secao-botao-texto no-underline hover:bg-secao-botao-forte">Ver as {produtos.length} peças</a>
          <Link href="/criar" className="inline-flex min-h-12 items-center rounded-full border border-secao-tinta px-6 font-semibold text-secao-tinta no-underline hover:bg-secao-pagina">Monte a sua peça</Link>
        </div>
      </div>
      <div className="grid min-h-[440px] grid-cols-2 grid-rows-2 gap-4 lg:min-h-[520px]">
        {vitrine.map((p, i) => <Bloco key={p.slug} produto={p} fundo={BLOCOS[i]!.fundo} paleta={BLOCOS[i]!.paleta} className={BLOCOS[i]!.classe} />)}
      </div>
    </section>
  );
}

/** Ultimo bloco da grade: quem nao achou a peca monta a propria. */
export function MonteCasa() {
  return (
    <div className="flex h-full min-h-72 flex-col justify-between gap-4 rounded-xl bg-secao-2 p-6 text-secao-superficie">
      <Divisor />
      <div className="flex flex-col gap-2">
        <p className="m-0 font-fina text-2xl leading-tight font-light tracking-[0.08em] uppercase">Do seu jeito</p>
        <p className="m-0 text-sm opacity-85">Não achou a peça? Escolha o modelo, o tamanho e o texto e veja em 3D antes de pedir.</p>
      </div>
      <Link href="/criar" className="inline-flex min-h-11 items-center justify-center rounded-full bg-secao-superficie px-5 text-sm font-semibold text-secao-2 no-underline hover:bg-secao-suave">Monte a sua peça</Link>
    </div>
  );
}
