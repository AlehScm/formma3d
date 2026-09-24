'use client';

import { useState } from 'react';
import { Botao } from './Campos';

export interface MedidaHeader {
  label: string;
  valor: number;
  set: (v: number) => void;
  min: number;
  max: number;
  sufixo?: string;
}

/** Campo numerico compacto para o header: so o numero, sem slider. */
function Medida({ m }: { m: MedidaHeader }) {
  return (
    <label className="flex items-center gap-1.5" title={m.label}>
      <span className="text-micro uppercase tracking-wide text-tinta-fraca">{m.label}</span>
      <input
        type="number"
        min={m.min}
        max={m.max}
        value={m.valor}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          m.set(Number.isFinite(v) ? v : m.min);
        }}
        className="tabular w-16 rounded-md border border-linha bg-fundo px-2 py-1 font-mono text-mini text-tinta outline-none transition focus:border-acento"
      />
      <span className="text-micro text-tinta-fraca">{m.sufixo ?? 'mm'}</span>
    </label>
  );
}

export function Header({
  nomeProjeto,
  setNomeProjeto,
  podeRenomear,
  medidas,
  gramas,
  preco,
  onAbrir,
  onNovo,
  onExportar,
  exportarAtivo,
}: {
  nomeProjeto: string;
  setNomeProjeto: (v: string) => void;
  podeRenomear: boolean;
  medidas: MedidaHeader[];
  gramas: number | null;
  preco: string | null;
  onAbrir: () => void;
  onNovo: () => void;
  onExportar: () => void;
  exportarAtivo: boolean;
}) {
  const [editando, setEditando] = useState(false);

  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-linha bg-painel px-4 py-2.5">
      <span className="select-none text-medio font-semibold tracking-tight">
        formma<span className="text-acento">3d</span>
      </span>

      <div className="h-5 w-px bg-linha" />

      {/* Nome do projeto: e o que nomeia os STL, o zip e o orcamento. */}
      {editando && podeRenomear ? (
        <input
          autoFocus
          value={nomeProjeto}
          onChange={(e) => setNomeProjeto(e.target.value)}
          onBlur={() => setEditando(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') setEditando(false);
          }}
          className="w-44 rounded-md border border-acento bg-fundo px-2 py-1 text-base text-tinta outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => podeRenomear && setEditando(true)}
          title={podeRenomear ? 'Clique para renomear o trabalho' : 'O nome vem do arquivo importado'}
          className={`max-w-44 truncate rounded-md px-2 py-1 text-base text-tinta ${podeRenomear ? 'hover:bg-elevado' : 'cursor-default'}`}
        >
          {nomeProjeto || 'sem nome'}
        </button>
      )}

      <div className="flex items-center gap-1.5">
        <Botao onClick={onAbrir} variante="normal" title="Abrir um desenho .ai ou .pdf do Corel/Illustrator">
          Abrir
        </Botao>
        <Botao onClick={onNovo} variante="fantasma" title="Comecar do zero com texto digitado">
          Novo
        </Botao>
      </div>

      {/* As medidas que mais se mexe, sempre alcancaveis sem abrir painel. */}
      <div className="ml-2 hidden items-center gap-4 lg:flex">
        {medidas.map((m) => (
          <Medida key={m.label} m={m} />
        ))}
      </div>

      <div className="ml-auto flex items-center gap-4">
        {gramas !== null && (
          <div className="hidden text-right sm:block">
            <div className="tabular font-mono text-mini text-tinta-media">
              {gramas >= 1000 ? `${(gramas / 1000).toFixed(2)} kg` : `${gramas.toFixed(0)} g`}
            </div>
            <div className="text-micro text-tinta-fraca">filamento</div>
          </div>
        )}
        {preco && (
          <div className="text-right">
            <div className="tabular font-mono text-medio font-semibold text-lucro">{preco}</div>
            <div className="text-micro text-tinta-fraca">preco sugerido</div>
          </div>
        )}
        <Botao onClick={onExportar} variante="primario" disabled={!exportarAtivo} title="Baixar STL, chapa e orcamento num zip">
          Exportar
        </Botao>
      </div>
    </header>
  );
}
