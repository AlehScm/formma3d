import { IconeBusca, IconeConversa, IconeTridimensional } from '@/components/loja/icones';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { Modulo } from '@/components/loja/Modulo';
import { AtalhosCategoria, Prateleira } from '@/components/loja/Vitrine';
import { destaquesPorSecao, pecaDaSecao, porSlug, produtosPublicos, secoesComContagem } from '@/lib/marketplace/consultas';
import { CAMPANHAS, PALETA_NATAL, SLUGS_NATAL, campanhaAtiva } from '@/lib/marketplace/campanhas';
import { ComPaleta } from '@/features/catalogo/Miniaturas';
import { COMO_FUNCIONA, PERGUNTAS } from '@/lib/marketplace/loja';
import { SECOES, type Produto, type Secao } from '@/lib/marketplace/tipos';
import { TopoNatal } from './Natal';
import { TopoPersonalize } from './TopoAoVivo';

const ICONES_PASSOS = [IconeBusca, IconeTridimensional, IconeConversa];
/** Ordem das vitrines na home: o que mais sai primeiro. */
const ORDEM_VITRINES: Secao[] = ['presentes', 'empresa', 'casa', 'colecionaveis', 'sensoriais'];

/**
 * Home no padrao das grandes lojas: topo, atalhos de categoria e o mesmo bloco de vitrine
 * repetido (mais pedidas e uma por secao), depois como funciona e perguntas. O catalogo
 * completo com filtros fica em /pecas.
 */
export function MarketplaceHome() {
  const categorias = secoesComContagem().map((c) => {
    const peca = pecaDaSecao(c.secao);
    return { ...c, produto: peca ? porSlug(peca.slug) : undefined };
  });
  const maisPedidas = produtosPublicos().filter((p) => p.destaque).slice(0, 12);
  const porSecao = destaquesPorSecao(12);
  // Com a campanha de Natal ligada, a home abre no Natal: topo do enfeite e a vitrine de presentes.
  const natal = campanhaAtiva('natal');
  const presentesNatal = natal ? SLUGS_NATAL.map((s) => porSlug(s)).filter((p): p is Produto => !!p) : [];
  const vitrines = ORDEM_VITRINES.map((s) => porSecao.find((d) => d.secao === s)!).filter((d) => d.produtos.length);

  return (
    <PaginaLoja>
      {natal ? <div data-campanha="natal"><TopoNatal /></div> : <TopoPersonalize />}
      <AtalhosCategoria itens={categorias} natal={natal} />
      {natal && (
        <ComPaleta cores={PALETA_NATAL}>
          <Prateleira titulo="Presentes de Natal" produtos={presentesNatal} tema="natal" verTodos={{ href: CAMPANHAS.natal.href, rotulo: 'Ver o especial de Natal' }} />
        </ComPaleta>
      )}

      <Prateleira titulo="Mais pedidas" produtos={maisPedidas} verTodos={{ href: '/pecas', rotulo: 'Ver todas as peças' }} />
      {vitrines.map(({ secao, produtos }) => (
        <Prateleira key={secao} titulo={SECOES[secao].nome} secao={secao} produtos={produtos} verTodos={{ href: `/secao/${secao}`, rotulo: 'Ver todos' }} />
      ))}

      <Modulo id="como-titulo" titulo="Como funciona" subtitulo="Preços sob consulta: você monta o orçamento e a gente responde com o valor.">
        <ol className="m-0 grid list-none gap-5 p-0 md:grid-cols-3">
          {COMO_FUNCIONA.map((passo, i) => {
            const Icone = ICONES_PASSOS[i]!;
            return (
              <li key={passo.titulo} className="flex items-start gap-3">
                <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-marca-gelo text-marca-azul">
                  <Icone className="size-5" aria-hidden />
                  <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-marca-azul text-apoio font-bold text-white">{i + 1}</span>
                </span>
                <div>
                  <h3 className="m-0 text-item font-semibold text-marca-navy">{passo.titulo}</h3>
                  <p className="m-0 mt-1 text-apoio text-marca-texto-2">{passo.texto}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Modulo>

      <Modulo id="perguntas-titulo" titulo="Perguntas frequentes">
        <div className="divide-y divide-marca-linha border-y border-marca-linha">
          {PERGUNTAS.map((q) => (
            <details key={q.pergunta} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-item font-semibold text-marca-navy">
                {q.pergunta}
                <span aria-hidden="true" className="text-modulo leading-none text-marca-azul transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
              </summary>
              <p className="m-0 mt-2 max-w-[70ch] text-corpo text-marca-texto-2">{q.resposta}</p>
            </details>
          ))}
        </div>
      </Modulo>
    </PaginaLoja>
  );
}
