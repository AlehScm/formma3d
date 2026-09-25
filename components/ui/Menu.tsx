'use client';

import type { ReactNode } from 'react';
import { DropdownMenu } from 'radix-ui';
import { cx } from './cx';
import type { Icone } from './icones';

/** Menu suspenso: acoes agrupadas atras de um botao (Exportar, Arquivo). */
export function Menu({
  gatilho,
  children,
  alinhar = 'end',
}: {
  gatilho: ReactNode;
  children: ReactNode;
  alinhar?: 'start' | 'center' | 'end';
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{gatilho}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={alinhar}
          sideOffset={6}
          collisionPadding={8}
          className="z-[var(--z-popover)] min-w-56 rounded-lg border border-borda bg-flutuante p-1 text-base text-texto shadow-flutuante"
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function MenuItem({
  children,
  icone: I,
  detalhe,
  onSelect,
  disabled,
}: {
  children: ReactNode;
  icone?: Icone;
  /** Texto fraco a direita: extensao do arquivo, atalho. */
  detalhe?: string;
  onSelect?: () => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cx(
        'flex h-8 cursor-default select-none items-center gap-2.5 rounded-md px-2 outline-none',
        'data-[highlighted]:bg-superficie-3 data-[disabled]:opacity-40'
      )}
    >
      {I && <I className="size-4 text-texto-2" strokeWidth={1.8} aria-hidden />}
      <span className="flex-1">{children}</span>
      {detalhe && <span className="font-mono text-micro text-texto-3">{detalhe}</span>}
    </DropdownMenu.Item>
  );
}

export function MenuSeparador() {
  return <DropdownMenu.Separator className="my-1 h-px bg-borda" />;
}

export function MenuRotulo({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu.Label className="px-2 pb-1 pt-2 text-micro font-semibold uppercase tracking-wider text-texto-3">
      {children}
    </DropdownMenu.Label>
  );
}
