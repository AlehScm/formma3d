'use client';

/**
 * Grade de uma secao com busca. Recebe so os produtos publicos da secao (a pagina de
 * servidor filtra), entao nada oculto vai para o navegador.
 */
import { useMemo, useState } from 'react';
import { BotaoMarca } from '@/components/marca';
import { filtrarPorTexto } from '@/lib/marketplace/busca';
import type { Produto } from '@/lib/marketplace/tipos';
import { CardProduto, GRADE_PRODUTOS, VAZIO } from './Loja';

export function VitrineSecao({ produtos, nomeSecao }: { produtos: Produto[]; nomeSecao: string }) {
  const [termo, setTermo] = useState('');
  const lista = useMemo(() => filtrarPorTexto(produtos, termo), [produtos, termo]);
  return (
    <div className="flex flex-col gap-[clamp(18px,2.4vw,28px)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="m-0 font-display text-marca-titulo-3 font-black tracking-[-0.03em] text-marca-navy">Peças de {nomeSecao}</h2>
        <label className="flex h-12 w-full max-w-[520px] items-center gap-2.5 rounded-marca-pilula border border-marca-linha bg-marca-branco px-4 focus-within:border-secao focus-within:ring-4 focus-within:ring-secao-suave">
          <span aria-hidden="true">⌕</span>
          <input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder={`Buscar em ${nomeSecao}`} aria-label={`Buscar em ${nomeSecao}`} className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-medium text-marca-texto outline-none" />
        </label>
      </div>
      <p role="status" className="m-0 text-[13px] text-marca-texto-3">
        {lista.length} {lista.length === 1 ? 'peça' : 'peças'}{termo.trim() ? ` para “${termo.trim()}”` : ''}
      </p>
      {lista.length ? (
        <div className={GRADE_PRODUTOS}>{lista.map((p) => <CardProduto key={p.slug} produto={p} />)}</div>
      ) : (
        <div className={VAZIO}>
          <strong className="text-lg text-secao-forte">Nada com “{termo.trim()}” por aqui.</strong>
          <BotaoMarca variante="contorno" pequeno onClick={() => setTermo('')}>Limpar a busca</BotaoMarca>
        </div>
      )}
    </div>
  );
}
