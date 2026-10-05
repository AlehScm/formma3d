'use client';

/**
 * Pecas do card de produto (imagem, favorito, botao de orcamento) e o card enxuto das
 * vitrines e grades: foto, nome e uma linha de apoio.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BotaoIconeMarca, BotaoMarca } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { Miniatura } from '@/features/catalogo/Miniaturas';
import { useFavoritos, useMontado, useOrcamento } from '@/features/loja/estado';
import { geradorDe, urlDaMidia } from '@/lib/marketplace/formato';
import type { Produto } from '@/lib/marketplace/tipos';
import { IconeCarrinho, IconeFavorito, IconeImpressora, IconeOk } from './icones';

export function ReservaProduto({ produto: p }: { produto: Produto }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1 bg-secao-suave p-2 text-center text-secao-forte">
      <IconeImpressora className="size-6 shrink-0 opacity-60" aria-hidden />
      <span className="text-apoio font-medium">{p.tipo}</span>
      <span className="text-apoio">Imagem em preparação</span>
    </div>
  );
}

/** Foto, render 3D real do gerador ou a arte da secao. */
export function ImagemProduto({ produto: p, className }: { produto: Produto; className?: string }) {
  const gerador = geradorDe(p);
  return (
    <div className={cx('size-full [&_.miniatura]:block [&_.miniatura]:size-full [&_.miniatura]:object-contain [&_.miniatura]:p-[8%] [&_.miniatura-reserva]:size-full', className)}>
      {p.midias[0] ? (
        // eslint-disable-next-line @next/next/no-img-element -- export estatico sem otimizador de imagem
        <img src={urlDaMidia(p.midias[0])} alt="" loading="lazy" className="size-full object-cover" />
      ) : gerador ? (
        <Miniatura id={gerador} alt={p.nome} reserva={<ReservaProduto produto={p} />} />
      ) : (
        <ReservaProduto produto={p} />
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
    <BotaoIconeMarca
      onClick={() => alternar(slug)}
      aria-pressed={ativo}
      rotulo={ativo ? `Tirar ${nome} dos favoritos` : `Favoritar ${nome}`}
      className={cx('bg-marca-branco shadow-marca-1 hover:text-secao-forte', ativo ? 'text-secao-forte' : 'text-marca-texto-2', className)}
    >
      <IconeFavorito className={cx('size-[18px]', ativo && 'fill-current')} aria-hidden />
    </BotaoIconeMarca>
  );
}

/** Botao de adicionar ao orcamento, com retorno "Adicionado" por um instante. */
export function BotaoAdicionar({ slug, extra, grande, className }: { slug: string; extra?: { quantidade?: number; cor?: string; observacao?: string; personalizacao?: string; valores?: Record<string, string | number | boolean> }; grande?: boolean; className?: string }) {
  const adicionar = useOrcamento((s) => s.adicionar);
  const [feito, setFeito] = useState(false);
  useEffect(() => {
    if (!feito) return;
    const t = setTimeout(() => setFeito(false), 1800);
    return () => clearTimeout(t);
  }, [feito]);
  return (
    <BotaoMarca
      formato="controle"
      rotulo={feito ? 'Adicionado ao orçamento' : 'Adicionar ao orçamento'}
      variante={feito ? 'sucesso' : 'secao'}
      pequeno={!grande}
      onClick={() => { adicionar(slug, extra); setFeito(true); }}
      className={cx('w-full [&_svg]:shrink-0', className)}
    >
      {feito ? <IconeOk className="size-4" aria-hidden /> : <IconeCarrinho className="size-4" aria-hidden />}
      <span role="status">{feito ? 'Adicionado' : grande ? 'Adicionar ao orçamento' : 'Adicionar'}</span>
    </BotaoMarca>
  );
}

/** Card no padrao das grandes lojas: foto grande, nome e uma linha de apoio. O card inteiro
 *  leva a peca; adicionar ao orcamento fica na pagina do produto. */
export function CardProduto({ produto: p, nivel = 'h3' }: { produto: Produto; nivel?: 'h2' | 'h3' }) {
  const Titulo = nivel;
  return (
    <article data-secao={p.secao} className="group relative flex h-full min-w-0 flex-col">
      <div className="relative aspect-square overflow-hidden rounded-marca-md bg-secao-suave">
        <ImagemProduto produto={p} className="transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none" />
        <BotaoFavorito slug={p.slug} nome={p.nome} className="absolute top-2 right-2 z-10" />
      </div>
      <div className="flex flex-col gap-0.5 pt-2.5">
        <Titulo className="m-0 line-clamp-2 text-item text-marca-navy">
          <Link href={`/produto/${p.slug}`} className="text-inherit no-underline after:absolute after:inset-0 after:content-[''] group-hover:underline">{p.nome}</Link>
        </Titulo>
        <p className="m-0 text-apoio text-marca-texto-2">{p.tipo}</p>
        {p.jaImpresso && <p className="m-0 text-apoio font-semibold text-secao-forte">Já feito para clientes</p>}
      </div>
    </article>
  );
}
