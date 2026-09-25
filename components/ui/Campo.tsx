'use client';

import type { ReactNode } from 'react';
import { cx } from './cx';
import { Dica } from './Dica';
import { IconeInfo } from './icones';

/**
 * Moldura de campo: rotulo, dica e erro.
 *
 * `linha` poe rotulo e controle lado a lado (inspetor, listas densas); `bloco`
 * empilha (barra lateral, onde o controle precisa de largura).
 */
export function Campo({
  rotulo,
  dica,
  erro,
  valor,
  layout = 'bloco',
  children,
  htmlFor,
}: {
  rotulo: ReactNode;
  dica?: ReactNode;
  erro?: ReactNode;
  /** Leitura do valor, a direita do rotulo (so no layout bloco). */
  valor?: ReactNode;
  layout?: 'bloco' | 'linha';
  children: ReactNode;
  htmlFor?: string;
}) {
  const cabecalho = (
    <span className="flex min-w-0 items-center gap-1.5">
      <label htmlFor={htmlFor} className="truncate text-base text-texto-2">
        {rotulo}
      </label>
      {dica && (
        <Dica conteudo={dica}>
          <button type="button" aria-label="Sobre este campo" className="text-texto-3 hover:text-texto-2">
            <IconeInfo className="size-3.5" strokeWidth={1.8} aria-hidden />
          </button>
        </Dica>
      )}
    </span>
  );

  if (layout === 'linha') {
    return (
      <div>
        <div className="flex min-h-8 items-center justify-between gap-3">
          {cabecalho}
          <div className="shrink-0">{children}</div>
        </div>
        {erro && <p className="mt-1 text-mini text-perigo">{erro}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className={cx('mb-1.5 flex items-baseline justify-between gap-2')}>
        {cabecalho}
        {valor}
      </div>
      {children}
      {erro && <p className="mt-1 text-mini text-perigo">{erro}</p>}
    </div>
  );
}
