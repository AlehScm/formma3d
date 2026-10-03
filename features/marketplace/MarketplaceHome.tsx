/**
 * Home da loja Scarprint, no padrao de marketplace: banner rotativo, vantagens,
 * categorias, prateleiras de produtos por secao e, no fim, monte a sua peca e apoiador.
 * Componente de servidor: so produtos publicos chegam ao HTML.
 */
import Link from 'next/link';
import { FaixaVantagens, PaginaLoja } from '@/components/loja/Estrutura';
import { BannerRotativo, CategoriasCirculos, Prateleira, type Slide } from '@/components/loja/Vitrine';
import { pecaDaSecao, porSecao, porSlug, produtosPublicos, secoesComContagem } from '@/lib/marketplace/consultas';
import { BANNERS } from '@/lib/marketplace/loja';
import { ORDEM_SECOES, SECOES } from '@/lib/marketplace/tipos';

export function MarketplaceHome() {
  const publicos = produtosPublicos();
  const slides: Slide[] = BANNERS.map((b) => ({ ...b, produto: porSlug(b.produto) ?? null }));
  const categorias = secoesComContagem().map(({ secao, total }) => ({ secao, nome: SECOES[secao].nome, total, gerador: pecaDaSecao(secao)?.gerador ?? null }));
  // Destaques: o que ja fizemos para clientes e os marcados como destaque, de todas as secoes.
  const destaques = [...publicos.filter((p) => p.jaImpresso), ...publicos.filter((p) => p.destaque && !p.jaImpresso)].slice(0, 12);

  return (
    <PaginaLoja>
      <BannerRotativo slides={slides} />
      <FaixaVantagens />
      <CategoriasCirculos itens={categorias} />
      <Prateleira titulo="Destaques" produtos={destaques} />
      {ORDEM_SECOES.map((s) => {
        const ps = porSecao(s);
        return <Prateleira key={s} secao={s} titulo={SECOES[s].nome} produtos={ps} verTodos={{ href: `/secao/${s}`, rotulo: `Ver todos (${ps.length})` }} />;
      })}

      <section aria-labelledby="monte-titulo" className="grid grid-cols-1 gap-6 rounded-2xl bg-marca-navy p-6 text-white md:grid-cols-[1fr_auto] md:items-center md:p-10">
        <div>
          <h2 id="monte-titulo" className="m-0 font-display text-[clamp(24px,2.6vw,34px)] leading-tight font-extrabold">Não achou o que queria? Monte a sua peça.</h2>
          <p className="mt-2 mb-0 max-w-[60ch] text-white/80">Nos geradores você muda texto, cores e tamanho, vê a peça em 3D e baixa o arquivo, ou adiciona ao orçamento.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/criar" className="inline-flex min-h-12 items-center rounded-lg bg-marca-branco px-6 font-semibold text-marca-navy no-underline hover:bg-marca-gelo">Abrir os geradores</Link>
          <Link href="/editor" className="inline-flex min-h-12 items-center rounded-lg border border-white/40 px-6 font-semibold text-white no-underline hover:bg-white/10">Editor de letreiros</Link>
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
