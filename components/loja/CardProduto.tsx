'use client';

/**
 * Card de produto no padrao de marketplace: imagem quadrada com favorito e selo, nome em
 * duas linhas, preco, "Personalize em 3D" e o botao de adicionar ao orcamento.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArteSecao } from '@/components/marca/ArteSecao';
import { cx } from '@/components/ui/cx';
import { Miniatura } from '@/features/catalogo/Miniaturas';
import { useFavoritos, useMontado, useOrcamento } from '@/features/loja/estado';
import { geradorDe, urlDaMidia } from '@/lib/marketplace/formato';
import { SECOES, type Produto } from '@/lib/marketplace/tipos';
import { IconeCarrinho, IconeFavorito, IconeOk } from './icones';

/** Preco no card: enquanto o valor esta em validacao, "sob consulta". */
export const rotuloPreco = (p: Produto) => (p.preco.status === 'validacao' ? 'Preço sob consulta' : p.preco.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

/** Foto, render 3D real do gerador ou a arte da secao. */
export function ImagemProduto({ produto: p, className }: { produto: Produto; className?: string }) {
  const gerador = geradorDe(p);
  return (
    <div className={cx('size-full [&_.miniatura]:block [&_.miniatura]:size-full [&_.miniatura]:object-contain [&_.miniatura]:p-[8%] [&_.miniatura-reserva]:size-full', className)}>
      {p.midias[0] ? (
        // eslint-disable-next-line @next/next/no-img-element -- export estatico sem otimizador de imagem
        <img src={urlDaMidia(p.midias[0])} alt="" loading="lazy" className="size-full object-cover" />
      ) : gerador ? (
        <Miniatura id={gerador} alt={p.nome} reserva={<div className="grid size-full place-items-center text-xs font-medium text-secao-forte/70">{p.tipo}</div>} />
      ) : (
        <ArteSecao secao={p.secao} />
      )}
    </div>
  );
}

export function BotaoFavorito({ slug, nome, className }: { slug: string; nome: string; className?: string }) {
  const montado = useMontado();
  const favorito = useFavoritos((s) => s.slugs.includes(slug));
  const alternar = useFavoritos((s) => s.alternar);
  const ativo = montado && favorito;
  return (
    <button
      type="button"
      onClick={() => alternar(slug)}
      aria-pressed={ativo}
      aria-label={ativo ? `Tirar ${nome} dos favoritos` : `Favoritar ${nome}`}
      className={cx('grid size-9 place-items-center rounded-full bg-marca-branco text-marca-texto-2 shadow-marca-1 transition-colors hover:text-secao-forte', ativo && 'text-secao-forte', className)}
    >
      <IconeFavorito className={cx('size-[18px]', ativo && 'fill-current')} aria-hidden />
    </button>
  );
}

/** Botao de adicionar ao orcamento, com retorno "Adicionado" por um instante. */
export function BotaoAdicionar({ slug, extra, grande, className }: { slug: string; extra?: { quantidade?: number; cor?: string; observacao?: string }; grande?: boolean; className?: string }) {
  const adicionar = useOrcamento((s) => s.adicionar);
  const [feito, setFeito] = useState(false);
  useEffect(() => {
    if (!feito) return;
    const t = setTimeout(() => setFeito(false), 1800);
    return () => clearTimeout(t);
  }, [feito]);
  return (
    <button
      type="button"
      onClick={() => { adicionar(slug, extra); setFeito(true); }}
      className={cx(
        'inline-flex w-full items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
        grande ? 'min-h-12 px-5 text-base' : 'min-h-10 px-3 text-sm',
        feito ? 'bg-marca-sucesso text-white' : 'bg-secao-botao text-secao-botao-texto hover:bg-secao-botao-forte',
        className,
      )}
    >
      {feito ? <IconeOk className="size-4" aria-hidden /> : <IconeCarrinho className="size-4" aria-hidden />}
      <span role="status">{feito ? 'Adicionado ao orçamento' : 'Adicionar ao orçamento'}</span>
    </button>
  );
}

export function CardProduto({ produto: p, nivel = 'h3' }: { produto: Produto; nivel?: 'h2' | 'h3' }) {
  const Titulo = nivel;
  const personalizavel = !!geradorDe(p) || !!p.personalizar;
  return (
    <article data-secao={p.secao} className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-secao-linha bg-secao-superficie transition-shadow hover:shadow-marca-2 focus-within:shadow-marca-2">
      <div className="relative aspect-square overflow-hidden bg-secao-suave">
        <ImagemProduto produto={p} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        {p.jaImpresso ? (
          <span className="absolute top-2 left-2 rounded-md bg-secao-tinta px-2 py-1 text-[11px] font-semibold text-secao-superficie">Já feito para clientes</span>
        ) : personalizavel ? (
          <span className="absolute top-2 left-2 rounded-md bg-secao-superficie px-2 py-1 text-[11px] font-semibold text-secao-forte shadow-marca-1">Personalizável</span>
        ) : null}
        <BotaoFavorito slug={p.slug} nome={p.nome} className="absolute top-2 right-2 z-10" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-xs text-secao-tinta-2">{SECOES[p.secao].nome}</span>
        <Titulo className="m-0 line-clamp-2 min-h-[2.5em] text-sm leading-tight font-semibold text-secao-tinta">
          <Link href={`/produto/${p.slug}`} className="text-inherit no-underline after:absolute after:inset-0 after:content-[''] hover:underline">{p.nome}</Link>
        </Titulo>
        <p className="m-0 mt-1 text-base font-bold text-secao-tinta">{rotuloPreco(p)}</p>
        {personalizavel && <p className="m-0 text-xs font-medium text-secao-nota">Personalize em 3D antes de pedir</p>}
        <div className="relative z-10 mt-auto pt-2"><BotaoAdicionar slug={p.slug} /></div>
      </div>
    </article>
  );
}
