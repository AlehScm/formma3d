'use client';

/**
 * Listagem de produtos com filtros (tipo, personalizavel, ja feito) e ordenacao, usada na
 * pagina de secao e na busca. Recebe so produtos publicos. `filtrosEmLinha` troca a lateral
 * por chips acima da grade; `extra` entra como ultimo bloco da grade.
 */
import { useMemo, useState } from 'react';
import { Dialog } from 'radix-ui';
import { BotaoMarca, CAMPO_MARCA, classeBotaoMarca, FOCO_MARCA, ICONE_MARCA } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { geradorDe } from '@/lib/marketplace/formato';
import type { Produto } from '@/lib/marketplace/tipos';
import { CardProduto } from './CardProduto';
import { IconeFechar, IconeFiltros } from './icones';

type Ordem = 'relevancia' | 'nome' | 'personalizaveis';
const personalizavel = (p: Produto) => !!geradorDe(p) || !!p.personalizar;

const GRADE_PADRAO = 'grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]';

export function Listagem({ produtos, vazio, filtrosEmLinha, extra, grade = GRADE_PADRAO }: { produtos: Produto[]; vazio?: React.ReactNode; filtrosEmLinha?: boolean; extra?: React.ReactNode; grade?: string }) {
  const tipos = useMemo(() => [...new Set(produtos.map((p) => p.tipo))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [produtos]);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [soPersonalizaveis, setSoPersonalizaveis] = useState(false);
  const [soJaFeitos, setSoJaFeitos] = useState(false);
  const [ordem, setOrdem] = useState<Ordem>('relevancia');
  const [aberto, setAberto] = useState(false);

  const lista = useMemo(() => {
    const l = produtos.filter((p) => (!marcados.length || marcados.includes(p.tipo)) && (!soPersonalizaveis || personalizavel(p)) && (!soJaFeitos || p.jaImpresso));
    if (ordem === 'nome') return [...l].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (ordem === 'personalizaveis') return [...l].sort((a, b) => Number(personalizavel(b)) - Number(personalizavel(a)));
    return l;
  }, [produtos, marcados, soPersonalizaveis, soJaFeitos, ordem]);
  const filtrando = marcados.length > 0 || soPersonalizaveis || soJaFeitos;
  const limpar = () => { setMarcados([]); setSoPersonalizaveis(false); setSoJaFeitos(false); };

  const caixa = 'size-4 accent-secao-botao';
  const chip = (ativo: boolean) => cx('inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-marca-pilula border px-4 text-sm font-medium whitespace-nowrap transition-colors motion-reduce:transition-none', FOCO_MARCA, ativo ? 'border-secao-tinta bg-secao-tinta text-secao-superficie' : 'border-secao-linha bg-secao-superficie text-secao-tinta hover:border-secao-tinta');
  const filtros = (
    <div className="flex flex-col gap-6">
      {tipos.length > 1 && (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold text-secao-tinta">Tipo de peça</legend>
          <div className="flex flex-col gap-2">
            {tipos.map((t) => (
              <label key={t} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-secao-tinta">
                <input type="checkbox" className={caixa} checked={marcados.includes(t)} onChange={() => setMarcados((m) => (m.includes(t) ? m.filter((x) => x !== t) : [...m, t]))} />
                {t}
                <span className="ml-auto text-xs text-marca-texto-3 tabular-nums">{produtos.filter((p) => p.tipo === t).length}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold text-secao-tinta">Mostrar só</legend>
        <div className="flex flex-col gap-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-secao-tinta"><input type="checkbox" className={caixa} checked={soPersonalizaveis} onChange={(e) => setSoPersonalizaveis(e.target.checked)} />Personalizáveis em 3D</label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-secao-tinta"><input type="checkbox" className={caixa} checked={soJaFeitos} onChange={(e) => setSoJaFeitos(e.target.checked)} />Já feitos para clientes</label>
        </div>
      </fieldset>
      {filtrando && <BotaoMarca onClick={limpar} formato="controle" variante="fantasma" pequeno className="self-start">Limpar filtros</BotaoMarca>}
    </div>
  );

  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
    <div className={cx('grid grid-cols-1 gap-6', !filtrosEmLinha && 'lg:grid-cols-[240px_minmax(0,1fr)]')}>
      {!filtrosEmLinha && (
        <aside aria-label="Filtros" className="hidden self-start rounded-2xl bg-secao-superficie p-5 shadow-marca-1 lg:sticky lg:top-40 lg:block">
          <h2 className="mt-0 mb-4 text-base font-bold text-secao-tinta">Filtrar</h2>
          {filtros}
        </aside>
      )}

      <div className="flex flex-col gap-4">
        {filtrosEmLinha && (
          <div role="group" aria-label="Filtrar por tipo" className="-mx-margem flex gap-2 overflow-x-auto px-margem pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
            <button type="button" aria-pressed={!filtrando} onClick={limpar} className={chip(!filtrando)}>Todas <span className="tabular-nums opacity-70">{produtos.length}</span></button>
            {tipos.map((t) => (
              <button key={t} type="button" aria-pressed={marcados.includes(t)} onClick={() => setMarcados((m) => (m.includes(t) ? m.filter((x) => x !== t) : [...m, t]))} className={chip(marcados.includes(t))}>
                {t} <span className="tabular-nums opacity-70">{produtos.filter((p) => p.tipo === t).length}</span>
              </button>
            ))}
            <span aria-hidden="true" className="mx-1 w-px shrink-0 self-stretch bg-secao-linha" />
            <button type="button" aria-pressed={soPersonalizaveis} onClick={() => setSoPersonalizaveis((v) => !v)} className={chip(soPersonalizaveis)}>Personalizáveis em 3D</button>
            {produtos.some((p) => p.jaImpresso) && <button type="button" aria-pressed={soJaFeitos} onClick={() => setSoJaFeitos((v) => !v)} className={chip(soJaFeitos)}>Já feitos para clientes</button>}
          </div>
        )}
        <div className={cx('flex flex-wrap items-center justify-between gap-3', filtrosEmLinha ? 'border-b border-secao-linha pb-3' : 'rounded-2xl bg-secao-superficie px-4 py-3 shadow-marca-1')}>
          <p role="status" className="m-0 text-sm text-secao-tinta-2"><b className="text-secao-tinta tabular-nums">{lista.length}</b> {lista.length === 1 ? 'produto' : 'produtos'}</p>
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:gap-3">
            {!filtrosEmLinha && <Dialog.Trigger className={cx(classeBotaoMarca('contorno', true, 'controle'), 'lg:hidden')}>
              <IconeFiltros className="size-4" aria-hidden />Filtrar{filtrando ? ' (ativo)' : ''}
            </Dialog.Trigger>}
            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-secao-tinta-2">
              <span className="whitespace-nowrap max-sm:sr-only">Ordenar por</span>
              <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className={cx(CAMPO_MARCA, 'min-w-0 max-w-full')}>
                <option value="relevancia">Relevância</option>
                <option value="nome">Nome (A–Z)</option>
                <option value="personalizaveis">Personalizáveis primeiro</option>
              </select>
            </label>
          </div>
        </div>

        {lista.length ? (
          <ul className={cx('m-0 grid list-none gap-3 p-0', grade)}>
            {lista.map((p) => <li key={p.slug}><CardProduto produto={p} nivel="h2" /></li>)}
            {extra && <li>{extra}</li>}
          </ul>
        ) : (
          vazio ?? (
            <div className="rounded-2xl bg-secao-superficie p-8 text-center shadow-marca-1">
              <p className="m-0 font-semibold text-secao-tinta">Nenhum produto com esses filtros.</p>
              <BotaoMarca onClick={limpar} formato="controle" variante="fantasma" pequeno className="mt-3">Limpar filtros</BotaoMarca>
            </div>
          )
        )}
      </div>

      <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-marca-navy/40" />
          <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 right-0 z-50 flex w-[min(320px,88vw)] flex-col gap-4 overflow-y-auto bg-marca-branco p-5 font-marca text-marca-texto [&_:focus-visible]:outline-none [&_:focus-visible]:shadow-marca-foco">
            <div className="flex items-center justify-between">
              <Dialog.Title className="m-0 text-base font-bold text-marca-navy">Filtrar</Dialog.Title>
              <Dialog.Close aria-label="Fechar filtros" className={ICONE_MARCA}><IconeFechar className="size-5" aria-hidden /></Dialog.Close>
            </div>
            {filtros}
            <BotaoMarca onClick={() => setAberto(false)} formato="controle" variante="secao" className="mt-auto">Ver {lista.length} {lista.length === 1 ? 'produto' : 'produtos'}</BotaoMarca>
          </Dialog.Content>
      </Dialog.Portal>
    </div>
    </Dialog.Root>
  );
}
