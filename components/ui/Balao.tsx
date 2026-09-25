'use client';

import type { ReactNode } from 'react';
import { Popover } from 'radix-ui';
import { cx } from './cx';

/** Painel que abre ancorado num gatilho (popover). */
export function Balao({
  gatilho,
  children,
  lado = 'top',
  alinhar = 'center',
  largura = 'w-72',
  aberto,
  setAberto,
}: {
  /** Precisa ser um unico elemento que aceite ref (um botao). */
  gatilho: ReactNode;
  children: ReactNode;
  lado?: 'top' | 'right' | 'bottom' | 'left';
  alinhar?: 'start' | 'center' | 'end';
  largura?: string;
  aberto?: boolean;
  setAberto?: (v: boolean) => void;
}) {
  return (
    <Popover.Root open={aberto} onOpenChange={setAberto}>
      <Popover.Trigger asChild>{gatilho}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={lado}
          align={alinhar}
          sideOffset={8}
          collisionPadding={12}
          className={cx(
            'z-[var(--z-popover)] max-h-[70vh] overflow-y-auto rounded-lg border border-borda bg-flutuante p-3 text-base text-texto shadow-flutuante',
            largura
          )}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
