'use client';

/**
 * Listagem de produtos com filtros (tipo ou categoria, personalizavel) e ordenacao, usada nas
 * paginas de secao, todas as pecas, letras e na busca. Recebe so produtos publicos, de um
 * de dois jeitos: `produtos` (a lista inteira, ja na mao) ou `pagina` + `fonte` (a primeira
 * pagina vem no HTML; filtrar, ordenar ou "Carregar mais" faz um GET de `fonte` na API).
 * Mostra `POR_PAGINA` por vez. `filtrosEmLinha`: chips acima da grade, so os `CHIPS_A_VISTA`
 * valores com mais pecas (e os marcados); o resto fica em "Mais filtros", o painel lateral.
 * Sem ele, a lateral fixa no computador. `extra` entra como ultimo bloco da grade.
 */
import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { BotaoMarca, CAMPO_MARCA, classeBotaoMarca, FOCO_MARCA, ICONE_MARCA } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { useLista } from '@/lib/marketplace/api/cliente';
import { contarPor, POR_PAGINA, type PaginaInicial, type ProdutoResumido } from '@/lib/marketplace/api/contrato';
import { SECOES, type Secao } from '@/lib/marketplace/tipos';
import { maisRecentes } from '@/lib/marketplace/ordem';
import { CardProduto } from './CardProduto';
import { IconeFechar, IconeFiltros } from './icones';

/** `relevancia`: a ordem da loja, como vem (destaques, depois as mais novas; ver ordem.ts). */
type Ordem = 'relevancia' | 'recentes' | 'nome' | 'personalizaveis';

const GRADE_PADRAO = 'grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]';
/** Quantos valores do filtro aparecem como chip; os outros ficam em "Mais filtros". */
const CHIPS_A_VISTA = 6;

type Origem = { produtos: ProdutoResumido[] } | { pagina: PaginaInicial; fonte: string };
type Props = Origem & { vazio?: React.ReactNode; filtrosEmLinha?: boolean; extra?: React.ReactNode; grade?: string };

/** A lista inteira ja na mao vira o mesmo resumo que o servidor manda junto da primeira pagina. */
const resumoDe = (ps: ProdutoResumido[]): PaginaInicial => ({ inicial: ps.slice(0, POR_PAGINA), total: ps.length, filtro: 'tipo', filtros: contarPor(ps) });

export function Listagem({ vazio, filtrosEmLinha = true, extra, grade = GRADE_PADRAO, ...origem }: Props) {
  const [marcados, setMarcados] = useState<string[]>([]);
  const [soPersonalizaveis, setSoPersonalizaveis] = useState(false);
  const [ordem, setOrdem] = useState<Ordem>('relevancia');
  const [aberto, setAberto] = useState(false);
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [pediu, setPediu] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const pagina = 'produtos' in origem ? resumoDe(origem.produtos) : origem.pagina;
  // A lista inteira: a recebida, a primeira pagina quando ja e tudo, ou a da API depois que a pessoa pede mais.
  const naMao = 'produtos' in origem ? origem.produtos : pagina.total <= pagina.inicial.length ? pagina.inicial : null;
  const remota = useLista(!naMao && 'fonte' in origem && pediu ? origem.fonte : null, tentativa);
  const todos = naMao ?? remota.itens;

  // Chips pelo tipo (dentro de uma categoria) ou pela categoria (lista que cruza categorias).
  const valorDe = (p: ProdutoResumido) => (pagina.filtro === 'secao' ? p.secao : p.tipo);
  const rotuloDe = (v: string) => (pagina.filtro === 'secao' ? SECOES[v as Secao].nome : v);
  const filtrando = marcados.length > 0 || soPersonalizaveis;
  // Chips a vista: os valores com mais pecas, mais os que a pessoa marcou no painel (na ordem do filtro).
  const maiores = new Set([...pagina.filtros].sort((a, b) => b.total - a.total).slice(0, CHIPS_A_VISTA).map((f) => f.valor));
  const aVista = pagina.filtros.filter((f) => maiores.has(f.valor) || marcados.includes(f.valor));
  const noPainel = pagina.filtros.length - aVista.length;
  const filtrada = todos?.filter((p) => (!marcados.length || marcados.includes(valorDe(p))) && (!soPersonalizaveis || p.personalizavel));
  const lista = !filtrada ? null
    : ordem === 'recentes' ? maisRecentes(filtrada)
    : ordem === 'nome' ? [...filtrada].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    : ordem === 'personalizaveis' ? [...filtrada].sort((a, b) => Number(b.personalizavel) - Number(a.personalizavel))
    : filtrada;
  // Ate a lista inteira chegar, a grade e a primeira pagina; com filtro ou ordem pedidos, fica esmaecida.
  const esperando = !lista && (filtrando || ordem !== 'relevancia') && !remota.erro;
  const visiveis = lista ? lista.slice(0, mostrar) : pagina.inicial;
  const quantos = lista ? lista.length : pagina.total;
  const temMais = quantos > visiveis.length;
  // Mudar filtro ou ordem volta para a primeira pagina e pede a lista inteira.
  const mudou = () => { setMostrar(POR_PAGINA); setPediu(true); };
  const limpar = () => { setMarcados([]); setSoPersonalizaveis(false); setMostrar(POR_PAGINA); };
  const marcarTipo = (t: string) => { setMarcados((m) => (m.includes(t) ? m.filter((x) => x !== t) : [...m, t])); mudou(); };

  const caixa = 'size-4 accent-secao-botao';
  const chip = (ativo: boolean) => cx('inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-marca-pilula border px-4 text-item whitespace-nowrap transition-colors motion-reduce:transition-none', FOCO_MARCA, ativo ? 'border-secao-tinta bg-secao-tinta text-secao-superficie' : 'border-secao-linha bg-secao-superficie text-secao-tinta hover:border-secao-tinta');
  const filtros = (
    <div className="flex flex-col gap-6">
      {pagina.filtros.length > 1 && (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 text-item font-semibold text-secao-tinta">{pagina.filtro === 'secao' ? 'Categoria' : 'Tipo de peça'}</legend>
          <div className="flex flex-col gap-2">
            {pagina.filtros.map(({ valor: t, total: n }) => (
              <label key={t} className="flex min-h-11 cursor-pointer items-center gap-2 text-item text-secao-tinta">
                <input type="checkbox" className={caixa} checked={marcados.includes(t)} onChange={() => marcarTipo(t)} />
                {rotuloDe(t)}
                <span className="ml-auto text-apoio text-marca-texto-3 tabular-nums">{n}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-item font-semibold text-secao-tinta">Mostrar só</legend>
        <div className="flex flex-col gap-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-item text-secao-tinta"><input type="checkbox" className={caixa} checked={soPersonalizaveis} onChange={(e) => { setSoPersonalizaveis(e.target.checked); mudou(); }} />Personalizáveis em 3D</label>
        </div>
      </fieldset>
      {filtrando && <BotaoMarca onClick={limpar} formato="controle" variante="fantasma" pequeno className="self-start">Limpar filtros</BotaoMarca>}
    </div>
  );

  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
    <div className={cx('grid grid-cols-1 gap-6', !filtrosEmLinha && 'lg:grid-cols-[240px_minmax(0,1fr)]')}>
      {!filtrosEmLinha && (
        <aside aria-label="Filtros" className="hidden self-start rounded-2xl bg-secao-superficie p-5 shadow-marca-1 lg:sticky lg:top-28 lg:block">
          <h2 className="mt-0 mb-4 font-display text-modulo text-secao-tinta">Filtrar</h2>
          {filtros}
        </aside>
      )}

      <div className="flex flex-col gap-4">
        {filtrosEmLinha && (
          <div role="group" aria-label={pagina.filtro === 'secao' ? 'Filtrar por categoria' : 'Filtrar por tipo'} className="-mx-margem flex gap-2 overflow-x-auto px-margem pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
            <button type="button" aria-pressed={!filtrando} onClick={limpar} className={chip(!filtrando)}>Todas <span className="tabular-nums opacity-70">{pagina.total}</span></button>
            {aVista.map(({ valor: t, total: n }) => (
              <button key={t} type="button" aria-pressed={marcados.includes(t)} onClick={() => marcarTipo(t)} className={chip(marcados.includes(t))}>
                {rotuloDe(t)} <span className="tabular-nums opacity-70">{n}</span>
              </button>
            ))}
            <Dialog.Trigger className={chip(soPersonalizaveis)}>
              <IconeFiltros className="size-4" aria-hidden />Mais filtros{noPainel > 0 ? ` (${noPainel})` : ''}
            </Dialog.Trigger>
          </div>
        )}
        <div className={cx('flex flex-wrap items-center justify-between gap-3', filtrosEmLinha ? 'border-b border-secao-linha pb-3' : 'rounded-2xl bg-secao-superficie px-4 py-3 shadow-marca-1')}>
          <p role="status" className="m-0 text-apoio text-secao-tinta-2">{esperando ? 'Carregando as peças…' : <><b className="text-secao-tinta tabular-nums">{quantos}</b> {quantos === 1 ? 'produto' : 'produtos'}</>}</p>
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:gap-3">
            {!filtrosEmLinha && <Dialog.Trigger className={cx(classeBotaoMarca('contorno', true, 'controle'), 'lg:hidden')}>
              <IconeFiltros className="size-4" aria-hidden />Filtrar{filtrando ? ' (ativo)' : ''}
            </Dialog.Trigger>}
            <label className="flex min-w-0 flex-1 items-center gap-2 text-apoio text-secao-tinta-2">
              <span className="whitespace-nowrap max-sm:sr-only">Ordenar por</span>
              <select value={ordem} onChange={(e) => { setOrdem(e.target.value as Ordem); mudou(); }} className={cx(CAMPO_MARCA, 'min-w-0 max-w-full')}>
                <option value="relevancia">Relevância</option>
                <option value="recentes">Mais recentes</option>
                <option value="nome">Nome (A–Z)</option>
                <option value="personalizaveis">Personalizáveis primeiro</option>
              </select>
            </label>
          </div>
        </div>

        {remota.erro && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-marca-atencao-fundo px-4 py-3 text-apoio text-marca-atencao">
            Não deu para carregar as outras peças.
            <BotaoMarca onClick={() => setTentativa((n) => n + 1)} formato="controle" variante="contorno" pequeno>Tentar de novo</BotaoMarca>
          </div>
        )}
        {visiveis.length ? (
          <>
            <ul aria-busy={esperando} className={cx('m-0 grid list-none gap-x-4 gap-y-7 p-0', grade, esperando && 'opacity-60')}>
              {visiveis.map((p) => <li key={p.slug}><CardProduto produto={p} nivel="h2" /></li>)}
              {extra && !temMais && <li>{extra}</li>}
            </ul>
            {temMais && (
              <BotaoMarca onClick={() => { setPediu(true); setMostrar((n) => n + POR_PAGINA); }} formato="controle" variante="contorno" className="self-center">
                Carregar mais ({quantos - visiveis.length} {quantos - visiveis.length === 1 ? 'peça' : 'peças'})
              </BotaoMarca>
            )}
          </>
        ) : (
          vazio ?? (
            <div className="rounded-2xl bg-secao-superficie p-8 text-center shadow-marca-1">
              <p className="m-0 text-item font-semibold text-secao-tinta">Nenhum produto com esses filtros.</p>
              <BotaoMarca onClick={limpar} formato="controle" variante="fantasma" pequeno className="mt-3">Limpar filtros</BotaoMarca>
            </div>
          )
        )}
      </div>

      <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-marca-navy/40" />
          <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 right-0 z-50 flex w-[min(320px,88vw)] flex-col gap-4 overflow-y-auto bg-marca-branco p-5 font-marca text-marca-texto [&_:focus-visible]:outline-none [&_:focus-visible]:shadow-marca-foco">
            <div className="flex items-center justify-between">
              <Dialog.Title className="m-0 font-display text-modulo text-marca-navy">Filtrar</Dialog.Title>
              <Dialog.Close aria-label="Fechar filtros" className={ICONE_MARCA}><IconeFechar className="size-5" aria-hidden /></Dialog.Close>
            </div>
            {filtros}
            <BotaoMarca onClick={() => setAberto(false)} formato="controle" variante="secao" className="mt-auto">Ver {quantos} {quantos === 1 ? 'produto' : 'produtos'}</BotaoMarca>
          </Dialog.Content>
      </Dialog.Portal>
    </div>
    </Dialog.Root>
  );
}
