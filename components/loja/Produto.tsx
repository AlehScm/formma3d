'use client';

/**
 * Partes interativas da pagina de produto: galeria com abas Foto / Ver em 3D e o bloco
 * de compra (cor, quantidade, observacao, adicionar ao orcamento).
 */
import Link from 'next/link';
import { useState } from 'react';
import { BotaoIconeMarca, BotaoMarca, CAMPO_MARCA } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { PecaViva } from '@/features/marketplace/PecaViva';
import { MENSAGENS, linkWhatsapp } from '@/lib/marketplace/contato';
import { geradorDe, urlDaMidia } from '@/lib/marketplace/formato';
import type { Produto } from '@/lib/marketplace/tipos';
import { BotaoAdicionar, BotaoFavorito, ImagemProduto, ReservaProduto, rotuloPreco } from './CardProduto';
import { IconeMais, IconeMenos } from './icones';

export function GaleriaProduto({ produto: p }: { produto: Produto }) {
  const gerador = geradorDe(p);
  const temFoto = p.midias.length > 0;
  const [aba, setAba] = useState<'foto' | '3d'>(temFoto || !gerador ? 'foto' : '3d');
  const [foto, setFoto] = useState(0);
  const aba3d = aba === '3d' && gerador;
  return (
    <div className="flex flex-col gap-3">
      <div data-secao={p.secao} className={cx('relative aspect-square overflow-hidden rounded-2xl', aba3d ? 'bg-universo' : 'bg-secao-suave')}>
        {aba3d ? (
          <>
            <div className="absolute inset-0"><PecaViva id={gerador} nome="Modelo 3D" interativo reserva={<ReservaProduto produto={p} />} /></div>
            <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-marca-branco px-2 py-1 text-xs font-semibold text-marca-texto-2 shadow-marca-1">Arraste para girar</span>
          </>
        ) : temFoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- export estatico sem otimizador de imagem
          <img src={urlDaMidia(p.midias[foto]!)} alt={p.nome} className="size-full object-cover" />
        ) : (
          <ImagemProduto produto={p} />
        )}
        <BotaoFavorito slug={p.slug} nome={p.nome} className="absolute top-3 right-3 z-10" />
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Ver o produto">
        {temFoto && p.midias.map((m, i) => (
          <button key={m} type="button" role="tab" aria-selected={aba === 'foto' && foto === i} onClick={() => { setAba('foto'); setFoto(i); }} className={cx('size-16 overflow-hidden rounded-lg border-2 bg-marca-branco', aba === 'foto' && foto === i ? 'border-marca-azul' : 'border-marca-linha')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlDaMidia(m)} alt={`Foto ${i + 1}`} className="size-full object-cover" />
          </button>
        ))}
        {!temFoto && (
          <button type="button" role="tab" aria-selected={aba === 'foto'} onClick={() => setAba('foto')} className={cx('min-h-11 rounded-marca-sm border-2 px-4 py-2 text-sm font-semibold', aba === 'foto' ? 'border-marca-azul text-marca-azul' : 'border-marca-linha text-marca-texto-2')}>Imagem</button>
        )}
        {gerador && (
          <button type="button" role="tab" aria-selected={aba === '3d'} onClick={() => setAba('3d')} className={cx('min-h-11 rounded-marca-sm border-2 px-4 py-2 text-sm font-semibold', aba === '3d' ? 'border-marca-azul text-marca-azul' : 'border-marca-linha text-marca-texto-2')}>Ver em 3D</button>
        )}
      </div>
    </div>
  );
}

export function CompraProduto({ produto: p }: { produto: Produto }) {
  const [quantidade, setQuantidade] = useState(1);
  const [cor, setCor] = useState('');
  const [observacao, setObservacao] = useState('');
  const whatsapp = linkWhatsapp(MENSAGENS.orcamento([{ nome: p.nome, quantidade, cor, observacao }]));
  const campo = CAMPO_MARCA;
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-marca-branco p-5 shadow-marca-1">
      <div>
        <p className="m-0 text-2xl font-bold text-marca-navy">{rotuloPreco(p)}</p>
        {p.preco.status === 'validacao' && <p className="m-0 mt-1 text-sm text-marca-texto-2">O valor depende do tamanho, das cores e da quantidade. Adicione ao orçamento e envie a lista.</p>}
      </div>
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div>
          <span id="qtd-rotulo" className="mb-1 block text-sm font-semibold text-marca-navy">Quantidade</span>
          <div className="flex w-fit items-center rounded-marca-sm border border-marca-linha" role="group" aria-labelledby="qtd-rotulo">
            <BotaoIconeMarca onClick={() => setQuantidade((q) => Math.max(1, q - 1))} disabled={quantidade <= 1} rotulo="Menos uma"><IconeMenos className="size-4" aria-hidden /></BotaoIconeMarca>
            <span className="w-10 text-center font-semibold tabular-nums" aria-live="polite">{quantidade}</span>
            <BotaoIconeMarca onClick={() => setQuantidade((q) => Math.min(999, q + 1))} disabled={quantidade >= 999} rotulo="Mais uma"><IconeMais className="size-4" aria-hidden /></BotaoIconeMarca>
          </div>
        </div>
        <div>
          <label htmlFor="cor-produto" className="mb-1 block text-sm font-semibold text-marca-navy">Cor desejada</label>
          <input id="cor-produto" value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Ex.: azul e branco" className={cx(campo, 'h-11')} />
        </div>
      </div>
      <div>
        <label htmlFor="obs-produto" className="mb-1 block text-sm font-semibold text-marca-navy">Observação (texto, tamanho, prazo...)</label>
        <textarea id="obs-produto" value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} className={campo} />
      </div>
      <BotaoAdicionar slug={p.slug} extra={{ quantidade, cor, observacao }} grande />
      {p.personalizar && (
        <BotaoMarca href={p.personalizar.href} formato="controle" variante="contorno">
          {p.personalizar.rotulo}
        </BotaoMarca>
      )}
      {whatsapp ? (
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-center text-sm font-semibold text-marca-whatsapp no-underline hover:underline">Pedir só esta peça pelo WhatsApp</a>
      ) : (
        <Link href="/orcamento" className="text-center text-sm font-semibold text-marca-azul no-underline hover:underline">Ver o meu orçamento</Link>
      )}
    </div>
  );
}
