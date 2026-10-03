'use client';

/**
 * Carrinho de orcamento: as pecas escolhidas com quantidade, cor e observacao. No fim,
 * a lista vai pelo WhatsApp (ou "Copiar a lista", sem numero configurado).
 */
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMontado, useOrcamento } from '@/features/loja/estado';
import { MENSAGENS, linkWhatsapp } from '@/lib/marketplace/contato';
import type { Produto } from '@/lib/marketplace/tipos';
import { ImagemProduto, rotuloPreco } from './CardProduto';
import { IconeCarrinho, IconeCopiar, IconeMais, IconeMenos, IconeOk, IconeRemover } from './icones';

export function Orcamento({ produtos }: { produtos: Produto[] }) {
  const montado = useMontado();
  const { itens, alterar, remover, limpar } = useOrcamento();
  const [copiado, setCopiado] = useState(false);
  const porSlug = useMemo(() => new Map(produtos.map((p) => [p.slug, p])), [produtos]);
  // Peca que saiu da loja (ficou oculta) nao entra na lista.
  const linhas = montado ? itens.flatMap((i) => { const p = porSlug.get(i.slug); return p ? [{ item: i, produto: p }] : []; }) : [];
  const mensagem = MENSAGENS.orcamento(linhas.map(({ item, produto }) => ({ nome: produto.nome, quantidade: item.quantidade, cor: item.cor, observacao: item.observacao })));
  const whatsapp = linkWhatsapp(mensagem);
  const total = linhas.reduce((t, l) => t + l.item.quantidade, 0);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  if (!montado) return <div className="h-64 rounded-2xl bg-marca-branco shadow-marca-1" aria-busy="true" />;
  if (!linhas.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-marca-branco p-12 text-center shadow-marca-1">
        <IconeCarrinho className="size-10 text-marca-texto-3" aria-hidden />
        <p className="m-0 text-lg font-semibold text-marca-navy">Seu orçamento está vazio.</p>
        <p className="m-0 text-marca-texto-2">Escolha as peças e use "Adicionar ao orçamento".</p>
        <Link href="/" className="mt-2 inline-flex min-h-11 items-center rounded-lg bg-marca-azul px-6 font-semibold text-white no-underline hover:bg-marca-azul-forte">Ver as peças</Link>
      </div>
    );
  }

  const campo = 'w-full rounded-lg border border-marca-linha bg-marca-branco px-3 py-2 text-sm text-marca-texto focus:border-marca-azul focus:outline-none';
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {linhas.map(({ item, produto: p }) => (
          <li key={p.slug} data-secao={p.secao} className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 rounded-2xl bg-marca-branco p-4 shadow-marca-1 sm:grid-cols-[120px_minmax(0,1fr)]">
            <Link href={`/produto/${p.slug}`} className="block aspect-square overflow-hidden rounded-xl bg-secao-suave" aria-label={p.nome}><ImagemProduto produto={p} /></Link>
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/produto/${p.slug}`} className="font-semibold text-marca-navy no-underline hover:underline">{p.nome}</Link>
                  <p className="m-0 text-sm text-marca-texto-2">{rotuloPreco(p)}</p>
                </div>
                <button type="button" onClick={() => remover(p.slug)} aria-label={`Remover ${p.nome}`} className="grid size-9 shrink-0 place-items-center rounded-full text-marca-texto-3 hover:bg-marca-gelo hover:text-marca-navy"><IconeRemover className="size-4" aria-hidden /></button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
                <div className="flex h-10 w-fit items-center rounded-lg border border-marca-linha" role="group" aria-label={`Quantidade de ${p.nome}`}>
                  <button type="button" onClick={() => alterar(p.slug, { quantidade: item.quantidade - 1 })} aria-label="Menos uma" className="grid h-full w-9 place-items-center hover:bg-marca-gelo"><IconeMenos className="size-4" aria-hidden /></button>
                  <span className="w-10 text-center font-semibold tabular-nums">{item.quantidade}</span>
                  <button type="button" onClick={() => alterar(p.slug, { quantidade: item.quantidade + 1 })} aria-label="Mais uma" className="grid h-full w-9 place-items-center hover:bg-marca-gelo"><IconeMais className="size-4" aria-hidden /></button>
                </div>
                <input aria-label={`Cor de ${p.nome}`} placeholder="Cor desejada" value={item.cor ?? ''} onChange={(e) => alterar(p.slug, { cor: e.target.value })} className={campo} />
              </div>
              <textarea aria-label={`Observação para ${p.nome}`} placeholder="Observação (texto, tamanho, prazo...)" rows={2} value={item.observacao ?? ''} onChange={(e) => alterar(p.slug, { observacao: e.target.value })} className={campo} />
            </div>
          </li>
        ))}
      </ul>

      <aside className="flex flex-col gap-4 rounded-2xl bg-marca-branco p-5 shadow-marca-1 lg:sticky lg:top-40">
        <h2 className="m-0 text-lg font-bold text-marca-navy">Resumo</h2>
        <dl className="m-0 flex flex-col gap-2 text-sm">
          <div className="flex justify-between"><dt className="text-marca-texto-2">Peças diferentes</dt><dd className="m-0 font-semibold tabular-nums">{linhas.length}</dd></div>
          <div className="flex justify-between"><dt className="text-marca-texto-2">Unidades</dt><dd className="m-0 font-semibold tabular-nums">{total}</dd></div>
          <div className="flex justify-between border-t border-marca-linha pt-2"><dt className="text-marca-texto-2">Preço</dt><dd className="m-0 font-semibold">a combinar</dd></div>
        </dl>
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-marca-whatsapp px-5 font-semibold text-white no-underline hover:bg-marca-whatsapp-forte">Pedir orçamento pelo WhatsApp</a>
        ) : (
          <p className="m-0 rounded-lg bg-marca-atencao-fundo px-3 py-2 text-sm text-marca-atencao">O envio pelo WhatsApp abre em breve. Copie a lista e mande pelo canal que preferir.</p>
        )}
        <button type="button" onClick={copiar} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-marca-azul px-5 font-semibold text-marca-azul hover:bg-marca-gelo">
          {copiado ? <IconeOk className="size-4" aria-hidden /> : <IconeCopiar className="size-4" aria-hidden />}
          <span role="status">{copiado ? 'Lista copiada' : 'Copiar a lista'}</span>
        </button>
        <details className="text-sm text-marca-texto-2">
          <summary className="cursor-pointer font-semibold text-marca-navy">Ver a mensagem</summary>
          <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-marca-palido p-3 text-xs whitespace-pre-wrap">{mensagem}</pre>
        </details>
        <button type="button" onClick={limpar} className="self-start text-sm text-marca-texto-3 hover:text-marca-navy hover:underline">Esvaziar o orçamento</button>
      </aside>
    </div>
  );
}
