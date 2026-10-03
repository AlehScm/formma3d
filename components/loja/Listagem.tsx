'use client';

/**
 * Listagem de produtos com filtros na lateral (tipo, personalizavel, ja feito) e
 * ordenacao, usada na pagina de secao e na busca. Recebe so produtos publicos.
 */
import { useMemo, useState } from 'react';
import { cx } from '@/components/ui/cx';
import { geradorDe } from '@/lib/marketplace/formato';
import type { Produto } from '@/lib/marketplace/tipos';
import { CardProduto } from './CardProduto';
import { IconeFechar, IconeFiltros } from './icones';

type Ordem = 'relevancia' | 'nome' | 'personalizaveis';
const personalizavel = (p: Produto) => !!geradorDe(p) || !!p.personalizar;

export function Listagem({ produtos, vazio }: { produtos: Produto[]; vazio?: React.ReactNode }) {
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

  const caixa = 'size-4 accent-marca-azul';
  const filtros = (
    <div className="flex flex-col gap-6">
      {tipos.length > 1 && (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold text-marca-navy">Tipo de peça</legend>
          <div className="flex flex-col gap-2">
            {tipos.map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2 text-sm text-marca-texto">
                <input type="checkbox" className={caixa} checked={marcados.includes(t)} onChange={() => setMarcados((m) => (m.includes(t) ? m.filter((x) => x !== t) : [...m, t]))} />
                {t}
                <span className="ml-auto text-xs text-marca-texto-3 tabular-nums">{produtos.filter((p) => p.tipo === t).length}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold text-marca-navy">Mostrar só</legend>
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-marca-texto"><input type="checkbox" className={caixa} checked={soPersonalizaveis} onChange={(e) => setSoPersonalizaveis(e.target.checked)} />Personalizáveis em 3D</label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-marca-texto"><input type="checkbox" className={caixa} checked={soJaFeitos} onChange={(e) => setSoJaFeitos(e.target.checked)} />Já feitos para clientes</label>
        </div>
      </fieldset>
      {filtrando && <button type="button" onClick={limpar} className="self-start text-sm font-semibold text-marca-azul hover:underline">Limpar filtros</button>}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside aria-label="Filtros" className="hidden self-start rounded-2xl bg-marca-branco p-5 shadow-marca-1 lg:sticky lg:top-40 lg:block">
        <h2 className="mt-0 mb-4 text-base font-bold text-marca-navy">Filtrar</h2>
        {filtros}
      </aside>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-marca-branco px-4 py-3 shadow-marca-1">
          <p role="status" className="m-0 text-sm text-marca-texto-2"><b className="text-marca-navy tabular-nums">{lista.length}</b> {lista.length === 1 ? 'produto' : 'produtos'}</p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => setAberto(true)} className="inline-flex items-center gap-2 rounded-lg border border-marca-linha px-3 py-2 text-sm font-semibold text-marca-navy lg:hidden">
              <IconeFiltros className="size-4" aria-hidden />Filtrar{filtrando ? ' (ativo)' : ''}
            </button>
            <label className="flex min-w-0 items-center gap-2 text-sm text-marca-texto-2">
              <span className="max-sm:sr-only">Ordenar por</span>
              <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="max-w-full min-w-0 rounded-lg border border-marca-linha bg-marca-branco px-3 py-2 text-sm font-medium text-marca-navy">
                <option value="relevancia">Relevância</option>
                <option value="nome">Nome (A–Z)</option>
                <option value="personalizaveis">Personalizáveis primeiro</option>
              </select>
            </label>
          </div>
        </div>

        {lista.length ? (
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {lista.map((p) => <li key={p.slug}><CardProduto produto={p} nivel="h2" /></li>)}
          </ul>
        ) : (
          vazio ?? (
            <div className="rounded-2xl bg-marca-branco p-8 text-center shadow-marca-1">
              <p className="m-0 font-semibold text-marca-navy">Nenhum produto com esses filtros.</p>
              <button type="button" onClick={limpar} className="mt-3 text-sm font-semibold text-marca-azul hover:underline">Limpar filtros</button>
            </div>
          )
        )}
      </div>

      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
          <button type="button" aria-label="Fechar filtros" onClick={() => setAberto(false)} className="absolute inset-0 bg-marca-navy/40" />
          <div className="absolute inset-y-0 right-0 flex w-[min(320px,88vw)] flex-col gap-4 overflow-y-auto bg-marca-branco p-5">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-base font-bold text-marca-navy">Filtrar</h2>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="grid size-9 place-items-center rounded-full hover:bg-marca-gelo"><IconeFechar className="size-5" aria-hidden /></button>
            </div>
            {filtros}
            <button type="button" onClick={() => setAberto(false)} className={cx('mt-auto min-h-12 rounded-lg bg-marca-azul font-semibold text-white')}>Ver {lista.length} {lista.length === 1 ? 'produto' : 'produtos'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
