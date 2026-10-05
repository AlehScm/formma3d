import Link from 'next/link';
import { classeBotaoMarca } from '@/components/marca';
import { ImagemProduto } from '@/components/loja/CardProduto';
import { IconeBusca, IconeConversa, IconeTridimensional } from '@/components/loja/icones';
import { FaixaVantagens, PaginaLoja } from '@/components/loja/Estrutura';
import { Listagem } from '@/components/loja/Listagem';
import { pecaDaSecao, porSlug, produtosPublicos, secoesComContagem } from '@/lib/marketplace/consultas';
import { COMO_FUNCIONA, PERGUNTAS } from '@/lib/marketplace/loja';
import { SECOES } from '@/lib/marketplace/tipos';
import { TopoPersonalize } from './TopoPersonalize';

const ICONES_PASSOS = [IconeBusca, IconeTridimensional, IconeConversa];

export function MarketplaceHome() {
  const publicos = produtosPublicos();
  // Cada categoria mostra a peca que a representa (so publica); sem peca, fica "Em breve".
  const categorias = secoesComContagem().map((c) => {
    const peca = pecaDaSecao(c.secao);
    return { ...c, produto: peca ? porSlug(peca.slug) : undefined };
  });
  const produtos = [...publicos].sort((a, b) => Number(!!b.destaque) - Number(!!a.destaque));

  return (
    <PaginaLoja>
      <TopoPersonalize />

      <nav aria-labelledby="categorias-titulo">
        <h2 id="categorias-titulo" className="mt-0 mb-3 font-display text-lg font-semibold">O que você procura?</h2>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-5">
          {categorias.map(({ secao, total, produto }) => (
            <li key={secao} data-secao={secao}>
              <Link href={`/secao/${secao}`} className="group flex h-full flex-col overflow-hidden rounded-marca-lg border border-marca-linha bg-marca-branco text-marca-navy no-underline transition-shadow hover:shadow-marca-2">
                <div className="relative aspect-[4/3] overflow-hidden bg-secao-suave">
                  {produto ? (
                    <ImagemProduto produto={produto} className="transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none" />
                  ) : (
                    <span className="grid size-full place-items-center text-sm font-semibold text-secao-forte">Em breve</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 border-t-4 border-secao px-4 py-3">
                  <span className="font-display text-sm font-semibold">{SECOES[secao].nome}</span>
                  <span className="text-xs text-marca-texto-2 tabular-nums">{total ? `${total} ${total === 1 ? 'peça' : 'peças'}` : 'Em breve'}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="como-titulo" className="rounded-marca-lg bg-marca-branco p-5 md:p-6">
        <h2 id="como-titulo" className="mt-0 mb-4 font-display text-lg font-semibold">Como funciona</h2>
        <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
          {COMO_FUNCIONA.map((passo, i) => {
            const Icone = ICONES_PASSOS[i]!;
            return (
              <li key={passo.titulo} className="flex items-start gap-3">
                <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-marca-gelo text-marca-azul">
                  <Icone className="size-5" aria-hidden />
                  <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-marca-azul text-[11px] font-bold text-white">{i + 1}</span>
                </span>
                <div>
                  <p className="m-0 font-display text-[15px] font-semibold text-marca-navy">{passo.titulo}</p>
                  <p className="m-0 mt-1 text-sm leading-relaxed text-marca-texto-2">{passo.texto}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section id="produtos" aria-labelledby="produtos-titulo" className="scroll-mt-64 md:scroll-mt-44">
        <h2 id="produtos-titulo" className="mt-3 mb-5 font-display text-2xl font-semibold">Encontre a sua próxima peça</h2>
        <Listagem produtos={produtos} />
      </section>
      <FaixaVantagens />

      <section aria-labelledby="perguntas-titulo" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <h2 id="perguntas-titulo" className="m-0 font-display text-[clamp(22px,2.3vw,30px)] leading-tight font-bold text-marca-navy">Perguntas frequentes</h2>
        <div className="divide-y divide-marca-linha rounded-marca-lg border border-marca-linha bg-marca-branco">
          {PERGUNTAS.map((q) => (
            <details key={q.pergunta} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-marca-navy">
                {q.pergunta}
                <span aria-hidden="true" className="text-xl leading-none text-marca-azul transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
              </summary>
              <p className="m-0 mt-2 max-w-[70ch] text-sm leading-relaxed text-marca-texto-2">{q.resposta}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="monte-titulo" className="grid grid-cols-1 gap-6 rounded-2xl border border-marca-linha bg-marca-branco p-6 text-marca-navy md:grid-cols-[1fr_auto] md:items-center md:p-8">
        <div>
          <h2 id="monte-titulo" className="m-0 font-display text-[clamp(22px,2.3vw,30px)] leading-tight font-bold">Tem uma ideia própria?</h2>
          <p className="mt-2 mb-0 max-w-[60ch] text-marca-texto-2">Crie sua peça nos editores 3D. Ajuste texto, cores e tamanho e baixe o arquivo ou adicione ao orçamento.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/criar" className={classeBotaoMarca('contorno', false, 'controle')}>Crie sua peça</Link>
          <Link href="/editor" className={classeBotaoMarca('fantasma', false, 'controle')}>Editor de letreiros</Link>
        </div>
      </section>

      <section id="apoiador" aria-labelledby="apoiador-titulo" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-marca-branco p-6 shadow-marca-1">
        <div>
          <h2 id="apoiador-titulo" className="m-0 text-lg font-bold text-marca-navy">Seja apoiador</h2>
          <p className="m-0 mt-1 text-sm text-marca-texto-2">Apoiadores vão poder usar os geradores para imprimir os próprios modelos. Condições em definição.</p>
        </div>
        <Link href="/criar" className="text-sm font-semibold text-marca-azul no-underline hover:underline">Conhecer os geradores</Link>
      </section>
    </PaginaLoja>
  );
}
