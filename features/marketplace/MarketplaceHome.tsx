import Link from 'next/link';
import { classeBotaoMarca } from '@/components/marca';
import { ImagemProduto } from '@/components/loja/CardProduto';
import { FaixaVantagens, PaginaLoja } from '@/components/loja/Estrutura';
import { Listagem } from '@/components/loja/Listagem';
import { porSlug, produtosPublicos, secoesComContagem } from '@/lib/marketplace/consultas';
import { SECOES } from '@/lib/marketplace/tipos';

export function MarketplaceHome() {
  const publicos = produtosPublicos();
  const destaques = ['luminaria-letra', 'placa-line-art', 'chaveiro-nome'].flatMap((slug) => {
    const produto = porSlug(slug);
    return produto ? [produto] : [];
  });
  const categorias = secoesComContagem();
  const produtos = [...publicos].sort((a, b) => Number(!!b.destaque) - Number(!!a.destaque));

  return (
    <PaginaLoja>
      <section aria-labelledby="loja-titulo" className="grid items-center gap-6 border-b border-marca-linha py-4 pb-8 md:grid-cols-[minmax(0,1fr)_minmax(280px,38%)] md:gap-12 2xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="max-w-[620px]">
          <h1 id="loja-titulo" className="m-0 font-display text-[clamp(30px,3.4vw,48px)] leading-tight font-semibold tracking-tight text-marca-navy">Peças que fazem parte do seu dia.</h1>
          <p className="mt-4 mb-5 max-w-[52ch] text-base leading-relaxed text-marca-texto-2">Para organizar a casa, presentear ou dar forma à sua marca. Escolha uma peça impressa em 3D e peça do seu jeito.</p>
          <a href="#produtos" className={classeBotaoMarca('primario', false, 'controle')}>Explorar produtos</a>
        </div>
        <div className="grid min-w-0 gap-4 2xl:grid-cols-3">
        {destaques.map((destaque, i) => (
          <Link key={destaque.slug} href={`/produto/${destaque.slug}`} data-secao={destaque.secao} className={`${i ? 'hidden 2xl:flex' : 'flex'} group min-w-0 items-center gap-4 rounded-marca-lg bg-secao-suave p-4 text-secao-forte no-underline hover:shadow-marca-1 2xl:flex-col min-[137.5rem]:flex-row`}>
            <div className="relative size-32 shrink-0 sm:size-40"><ImagemProduto produto={destaque} className="absolute inset-0" /></div>
            <div className="min-w-0">
              <p className="m-0 font-display text-lg font-semibold leading-tight">{destaque.nome}</p>
              <p className="mt-2 mb-3 text-sm leading-relaxed">{SECOES[destaque.secao].nome}</p>
              <span className="text-sm font-semibold underline underline-offset-4">Conhecer a peça</span>
            </div>
          </Link>
        ))}
        </div>
      </section>

      <nav aria-label="Explorar por categoria">
        <h2 className="mt-0 mb-3 font-display text-lg font-semibold">O que você procura?</h2>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-5">
          {categorias.map(({ secao, total }) => (
            <li key={secao} data-secao={secao}>
              <Link href={`/secao/${secao}`} className="flex h-full min-h-20 flex-col justify-center gap-1 border-l-4 border-secao bg-marca-branco px-4 py-3 text-marca-navy no-underline hover:bg-secao-suave">
                <span className="font-display text-sm font-semibold">{SECOES[secao].nome}</span>
                <span className="text-xs text-marca-texto-2">{total ? `${total} peças` : 'Em breve'}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section id="produtos" aria-labelledby="produtos-titulo" className="scroll-mt-64 md:scroll-mt-44">
        <h2 id="produtos-titulo" className="mt-3 mb-5 font-display text-2xl font-semibold">Encontre a sua próxima peça</h2>
        <Listagem produtos={produtos} />
      </section>
      <FaixaVantagens />

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
