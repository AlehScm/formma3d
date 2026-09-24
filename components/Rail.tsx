'use client';

import type { ReactNode } from 'react';

export type SecaoId = 'arquivo' | 'estilo' | 'parametros' | 'camadas' | 'custos';

export interface SecaoInfo {
  id: SecaoId;
  nome: string;
  icone: ReactNode;
}

// Icones inline em SVG: nenhuma dependencia nova e nenhum download em runtime.
const ico = (d: ReactNode) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="size-5">
    {d}
  </svg>
);

export const SECOES: SecaoInfo[] = [
  {
    id: 'arquivo',
    nome: 'Arquivo e texto',
    icone: ico(
      <>
        <path d="M4 3h8l4 4v10H4z" />
        <path d="M12 3v4h4" />
      </>
    ),
  },
  {
    id: 'estilo',
    nome: 'Estilo da letra',
    icone: ico(
      <>
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="11" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="11" width="6" height="6" rx="1" />
        <rect x="11" y="11" width="6" height="6" rx="1" />
      </>
    ),
  },
  {
    id: 'parametros',
    nome: 'Medidas e encaixe',
    icone: ico(
      <>
        <path d="M3 6h14M3 10h14M3 14h14" />
        <circle cx="7" cy="6" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="13" cy="10" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="9" cy="14" r="1.8" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    id: 'camadas',
    nome: 'Camadas e pecas',
    icone: ico(
      <>
        <path d="M10 2.5 17.5 6 10 9.5 2.5 6z" />
        <path d="M2.5 10 10 13.5 17.5 10" />
        <path d="M2.5 14 10 17.5 17.5 14" />
      </>
    ),
  },
  {
    id: 'custos',
    nome: 'Custo e preco',
    icone: ico(
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="M10 6v8M12.5 8H9a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H7.5" />
      </>
    ),
  },
];

export function Rail({
  ativa,
  setAtiva,
  alertas,
}: {
  ativa: SecaoId;
  setAtiva: (s: SecaoId) => void;
  /** Quantidade de avisos por secao, para marcar onde o usuario precisa olhar. */
  alertas?: Partial<Record<SecaoId, number>>;
}) {
  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-linha bg-painel py-3">
      {SECOES.map((s) => {
        const on = s.id === ativa;
        const n = alertas?.[s.id] ?? 0;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => setAtiva(s.id)}
            title={s.nome}
            aria-label={s.nome}
            aria-current={on ? 'page' : undefined}
            className={`relative flex size-10 items-center justify-center rounded-lg transition ${
              on ? 'bg-acento/15 text-acento-forte' : 'text-tinta-fraca hover:bg-elevado hover:text-tinta-media'
            }`}
          >
            {s.icone}
            {n > 0 && (
              <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-alerta text-[9px] font-bold text-fundo">
                {n > 9 ? '9+' : n}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
