'use client';

/**
 * Grade de uma secao com busca. Recebe so os produtos publicos da secao (a pagina de
 * servidor filtra), entao nada oculto vai para o navegador.
 */
import { useMemo, useState } from 'react';
import { BotaoMarca } from '@/components/marca';
import { filtrarPorTexto } from '@/lib/marketplace/busca';
import type { Produto } from '@/lib/marketplace/tipos';
import { CardProduto } from './Loja';

export function VitrineSecao({ produtos, nomeSecao }: { produtos: Produto[]; nomeSecao: string }) {
  const [termo, setTermo] = useState('');
  const lista = useMemo(() => filtrarPorTexto(produtos, termo), [produtos, termo]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(18px, 2.4vw, 28px)' }}>
      <label className="l-busca">
        <span aria-hidden="true">⌕</span>
        <input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder={`Buscar em ${nomeSecao}`} aria-label={`Buscar em ${nomeSecao}`} />
      </label>
      <p role="status" style={{ margin: 0, color: 'var(--marca-texto-3)', fontSize: 13 }}>
        {lista.length} {lista.length === 1 ? 'peça' : 'peças'}{termo.trim() ? ` para “${termo.trim()}”` : ''}
      </p>
      {lista.length ? (
        <div className="l-grade">{lista.map((p) => <CardProduto key={p.slug} produto={p} />)}</div>
      ) : (
        <div className="l-vazio">
          <strong>Nada com “{termo.trim()}” por aqui.</strong>
          <BotaoMarca variante="contorno" pequeno onClick={() => setTermo('')}>Limpar a busca</BotaoMarca>
        </div>
      )}
    </div>
  );
}
