'use client';

import type { ReactNode } from 'react';
import { ContextMenu } from 'radix-ui';
import { cx } from './cx';
import type { Icone } from './icones';

const CONTEUDO = 'z-[var(--z-popover)] min-w-56 rounded-lg border border-borda bg-flutuante p-1 text-base text-texto shadow-flutuante';
const ITEM = cx(
  'flex h-8 cursor-default select-none items-center gap-2.5 rounded-md px-2 outline-none',
  'data-[highlighted]:bg-superficie-3 data-[disabled]:opacity-40'
);

/** Menu do botao direito sobre `children` (o 3D, uma linha do painel). */
export function MenuContexto({
  children,
  itens,
  onAbrir,
}: {
  children: ReactNode;
  itens: ReactNode;
  /** Antes de abrir: e onde o botao direito numa peca fora da selecao a marca. */
  onAbrir?: () => void;
}) {
  return (
    <ContextMenu.Root onOpenChange={(aberto) => aberto && onAbrir?.()}>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content collisionPadding={8} className={CONTEUDO}>
          {itens}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export function ItemContexto({
  children,
  icone: I,
  atalho,
  onSelect,
  disabled,
  perigo,
}: {
  children: ReactNode;
  icone?: Icone;
  atalho?: string;
  onSelect?: () => void;
  disabled?: boolean;
  perigo?: boolean;
}) {
  return (
    <ContextMenu.Item disabled={disabled} onSelect={onSelect} className={cx(ITEM, perigo && 'text-perigo')}>
      {I && <I className={cx('size-4', perigo ? 'text-perigo' : 'text-texto-2')} strokeWidth={1.8} aria-hidden />}
      <span className="flex-1">{children}</span>
      {atalho && <span className="font-mono text-micro text-texto-3">{atalho}</span>}
    </ContextMenu.Item>
  );
}

export function SubmenuContexto({ rotulo, icone: I, children, disabled }: { rotulo: ReactNode; icone?: Icone; children: ReactNode; disabled?: boolean }) {
  return (
    <ContextMenu.Sub>
      <ContextMenu.SubTrigger disabled={disabled} className={cx(ITEM, 'data-[state=open]:bg-superficie-3')}>
        {I && <I className="size-4 text-texto-2" strokeWidth={1.8} aria-hidden />}
        <span className="flex-1">{rotulo}</span>
        <span className="text-texto-3" aria-hidden>
          ›
        </span>
      </ContextMenu.SubTrigger>
      <ContextMenu.Portal>
        <ContextMenu.SubContent sideOffset={4} collisionPadding={8} className={CONTEUDO}>
          {children}
        </ContextMenu.SubContent>
      </ContextMenu.Portal>
    </ContextMenu.Sub>
  );
}

export function SeparadorContexto() {
  return <ContextMenu.Separator className="my-1 h-px bg-borda" />;
}

export function RotuloContexto({ children }: { children: ReactNode }) {
  return <ContextMenu.Label className="px-2 pb-1 pt-2 text-micro font-semibold uppercase tracking-wider text-texto-3">{children}</ContextMenu.Label>;
}
