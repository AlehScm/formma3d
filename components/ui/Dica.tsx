'use client';

import type { ReactNode } from 'react';
import { Tooltip } from 'radix-ui';
import { Tecla } from './Tecla';

/**
 * Dica ao passar o mouse.
 *
 * Regra do sistema: explicacao vai em Dica, nao em texto fixo no painel. Texto
 * sempre visivel so quando ele impede um erro.
 */
export function ProvedorDicas({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={350} skipDelayDuration={150}>
      {children}
    </Tooltip.Provider>
  );
}

export function Dica({
  conteudo,
  atalho,
  lado = 'top',
  children,
}: {
  conteudo: ReactNode;
  /** Tecla de atalho mostrada ao lado do texto. */
  atalho?: string;
  lado?: 'top' | 'right' | 'bottom' | 'left';
  children: ReactNode;
}) {
  if (!conteudo) return <>{children}</>;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={lado}
          sideOffset={6}
          collisionPadding={8}
          className="z-[var(--z-popover)] flex max-w-64 items-center gap-2 rounded-md border border-borda bg-flutuante px-2.5 py-1.5 text-mini leading-snug text-texto shadow-flutuante"
        >
          <span>{conteudo}</span>
          {atalho && <Tecla>{atalho}</Tecla>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
