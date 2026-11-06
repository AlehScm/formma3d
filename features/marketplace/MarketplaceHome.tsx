import { IconeBusca, IconeConversa, IconeTridimensional } from '@/components/loja/icones';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { Modulo } from '@/components/loja/Modulo';
import { Prateleira, PrateleiraRemota } from '@/components/loja/Vitrine';
import { ENDPOINTS, paraResumo } from '@/lib/marketplace/api/contrato';
import { comImagemPrimeiro, geradores, porSecao, produtosPublicos, secoesComPecas, semRepetir } from '@/lib/marketplace/consultas';
import { PALETA_NATAL, campanhaAtiva } from '@/lib/marketplace/campanhas';
import { ComPaleta } from '@/features/catalogo/Miniaturas';
import { COMO_FUNCIONA, PERGUNTAS } from '@/lib/marketplace/loja';
import { maisRecentes } from '@/lib/marketplace/ordem';
import { NOSSOS_GERADORES, SECOES, hrefDaSecao, type Produto, type Secao } from '@/lib/marketplace/tipos';
import { TopoNatal } from './Natal';
import { TopoPersonalize } from './TopoAoVivo';
import { FaixaVantagens, GradeCategorias, TopoLoja } from './TopoLoja';

const ICONES_PASSOS = [IconeBusca, IconeTridimensional, IconeConversa];
/** Pecas por prateleira da home (o "Ver todos" leva a lista inteira). */
const POR_PRATELEIRA = 12;
const resumos = (ps: Produto[]) => comImagemPrimeiro(ps.map(paraResumo)).slice(0, POR_PRATELEIRA);

/**
 * Home no padrao das grandes lojas: topo com fotos (Natal na campanha), vantagens, categorias
 * com foto e as prateleiras (Natal, novidades, o enfeite ao vivo com Nossos geradores, mais
 * pedidas e uma por categoria), com como funciona e perguntas no fim. Nenhuma peca aparece
 * em duas prateleiras; as com foto vem antes. O catalogo completo com filtros fica em /pecas.
 */
export function MarketplaceHome() {
  const natal = campanhaAtiva('natal');
  const secoes = secoesComPecas();
  const categorias: Secao[] = secoes.filter((s) => s !== 'natal');
  const publicos = produtosPublicos();
  // As de cima vem no HTML; as das categorias, por GET quando chegam perto da tela, sem repetir o que ja apareceu.
  const [doNatal = [], novidades = [], maisPedidas = [], nossos = []] = semRepetir([
    natal ? resumos(porSecao('natal')) : [],
    resumos(maisRecentes(publicos.filter((p) => p.secao !== 'natal'))),
    resumos(publicos.filter((p) => p.destaque)),
    geradores().map(paraResumo).slice(0, POR_PRATELEIRA),
  ]);
  const jaMostradas = [...doNatal, ...novidades, ...nossos, ...maisPedidas].map((p) => p.slug);

  return (
    <PaginaLoja>
      <TopoLoja natal={natal} />
      <FaixaVantagens />
      <GradeCategorias secoes={secoes} />

      {natal && doNatal.length > 0 && (
        <ComPaleta cores={PALETA_NATAL}>
          <Prateleira titulo="Coleção de Natal" secao="natal" produtos={doNatal} tema="natal" verTodos={{ href: hrefDaSecao('natal'), rotulo: 'Ver toda a coleção' }} />
        </ComPaleta>
      )}
      <Prateleira titulo="Novidades" produtos={novidades} verTodos={{ href: '/pecas', rotulo: 'Ver todas as peças' }} />
      <Prateleira titulo="Mais pedidas" produtos={maisPedidas} verTodos={{ href: '/pecas', rotulo: 'Ver todas as peças' }} />

      {/* Personalizar ao vivo: o enfeite (ou chaveiro) com nome em 3D e, logo abaixo, tudo que da para personalizar. */}
      {natal ? <div data-campanha="natal"><TopoNatal nivel="h2" /></div> : <TopoPersonalize nivel="h2" />}
      <Prateleira titulo={NOSSOS_GERADORES.nome} produtos={nossos} verTodos={{ href: NOSSOS_GERADORES.href, rotulo: 'Ver todos' }} />
      {categorias.map((secao) => (
        <PrateleiraRemota key={secao} titulo={SECOES[secao].nome} secao={secao} fonte={ENDPOINTS.secao(secao)} excluir={jaMostradas} fotoPrimeiro verTodos={{ href: hrefDaSecao(secao), rotulo: 'Ver todos' }} />
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
