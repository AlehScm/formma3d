'use client';

import type { ReactNode } from 'react';

/** Bloco de campos com titulo. Sem <details>: o painel ja e contextual. */
export function Grupo({ titulo, children, dica }: { titulo?: string; children: ReactNode; dica?: string }) {
  return (
    <section className="border-b border-linha px-4 py-3.5 last:border-b-0">
      {titulo && (
        <h3 className="mb-0.5 text-micro font-semibold uppercase tracking-wider text-tinta-fraca" title={dica}>
          {titulo}
        </h3>
      )}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Num({
  label,
  valor,
  set,
  min = 0,
  max = 500,
  step = 0.1,
  sufixo = 'mm',
  dica,
  destaque,
}: {
  label: string;
  valor: number;
  set: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  sufixo?: string;
  dica?: string;
  /** Realca o campo quando ele e o que o usuario acabou de escolher mexer. */
  destaque?: boolean;
}) {
  const casas = step < 1 ? 1 : 0;
  return (
    <label className="block" title={dica}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className={`text-base ${destaque ? 'text-tinta' : 'text-tinta-media'}`}>{label}</span>
        <span className="tabular font-mono text-mini text-tinta-fraca">
          {valor.toFixed(casas)}
          {sufixo}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <input type="range" min={min} max={max} step={step} value={valor} onChange={(e) => set(parseFloat(e.target.value))} className="flex-1" />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={valor}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            set(Number.isFinite(v) ? v : min);
          }}
          className="tabular w-16 rounded-md border border-linha bg-fundo px-2 py-1.5 font-mono text-mini text-tinta outline-none transition focus:border-acento"
        />
      </div>
    </label>
  );
}

export function Check({ label, valor, set, dica }: { label: string; valor: boolean; set: (v: boolean) => void; dica?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 py-0.5" title={dica}>
      <input type="checkbox" checked={valor} onChange={(e) => set(e.target.checked)} className="mt-0.5 size-4 accent-acento" />
      <span className="text-base leading-snug text-tinta-media">{label}</span>
    </label>
  );
}

export interface Opcao<T extends string> {
  valor: T;
  nome: string;
}

export function Sel<T extends string>({
  label,
  valor,
  set,
  opcoes,
}: {
  label?: string;
  valor: T | '';
  set: (v: T) => void;
  opcoes: Opcao<T | ''>[];
}) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-base text-tinta-media">{label}</span>}
      <select
        value={valor}
        onChange={(e) => set(e.target.value as T)}
        className="w-full rounded-md border border-linha bg-fundo px-2.5 py-2 text-base text-tinta outline-none transition focus:border-acento"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.nome}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Escolha entre poucas opcoes, mostradas lado a lado: mais rapido que um dropdown. */
export function Segmentado<T extends string>({
  label,
  valor,
  set,
  opcoes,
}: {
  label?: string;
  valor: T;
  set: (v: T) => void;
  opcoes: { valor: T; nome: string; dica?: string }[];
}) {
  return (
    <div>
      {label && <span className="mb-1.5 block text-base text-tinta-media">{label}</span>}
      <div className="flex gap-1 rounded-lg bg-fundo p-1">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            title={o.dica}
            onClick={() => set(o.valor)}
            className={`flex-1 rounded-md px-2 py-1.5 text-mini font-medium transition ${
              valor === o.valor ? 'bg-acento text-white shadow-sm' : 'text-tinta-fraca hover:bg-elevado hover:text-tinta-media'
            }`}
          >
            {o.nome}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Botao({
  children,
  onClick,
  variante = 'normal',
  disabled,
  title,
  largura,
}: {
  children: ReactNode;
  onClick?: () => void;
  variante?: 'normal' | 'primario' | 'fantasma';
  disabled?: boolean;
  title?: string;
  largura?: boolean;
}) {
  const estilos = {
    normal: 'bg-elevado hover:bg-linha text-tinta border-linha',
    primario: 'bg-acento hover:bg-acento-forte text-white border-transparent',
    fantasma: 'bg-transparent hover:bg-elevado text-tinta-media border-transparent',
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-md border px-3 py-1.5 text-mini font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        largura ? 'w-full' : ''
      } ${estilos[variante]}`}
    >
      {children}
    </button>
  );
}

/** Linha de aviso. `tom` separa o que impede de imprimir do que e so informacao. */
export function Aviso({ children, tom = 'atencao' }: { children: ReactNode; tom?: 'atencao' | 'info' }) {
  const cor = tom === 'atencao' ? 'border-alerta/30 bg-alerta/10 text-alerta' : 'border-acento/30 bg-acento/10 text-acento-forte';
  return <p className={`rounded-md border px-2.5 py-2 text-mini leading-relaxed ${cor}`}>{children}</p>;
}
