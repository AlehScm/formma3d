'use client';

import type { ComponentProps, ReactNode } from 'react';
import { cx } from './cx';
import type { Icone } from './icones';

/**
 * Botao do sistema.
 *
 * Regra: UMA acao `primario` por tela (hoje, Exportar). O resto e `secundario`
 * ou `fantasma`. `perigo` so para o que apaga ou desfaz trabalho.
 */
export type VarianteBotao = 'primario' | 'secundario' | 'fantasma' | 'perigo';
export type TamanhoBotao = 'sm' | 'md';

const VARIANTES: Record<VarianteBotao, string> = {
  primario: 'bg-acento text-white hover:bg-acento-forte border-transparent',
  secundario: 'bg-superficie-2 text-texto hover:bg-superficie-3 border-borda hover:border-borda-forte',
  fantasma: 'bg-transparent text-texto-2 hover:bg-superficie-3 hover:text-texto border-transparent',
  perigo: 'bg-perigo/10 text-perigo hover:bg-perigo/20 border-perigo/30',
};

const TAMANHOS: Record<TamanhoBotao, string> = {
  sm: 'h-7 gap-1.5 px-2.5 text-mini',
  md: 'h-8 gap-2 px-3 text-base',
};

export function classeBotao(variante: VarianteBotao = 'secundario', tamanho: TamanhoBotao = 'md', largura = false) {
  return cx(
    'inline-flex shrink-0 select-none items-center justify-center rounded-md border font-medium',
    'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40',
    VARIANTES[variante],
    TAMANHOS[tamanho],
    largura && 'w-full'
  );
}

export interface BotaoProps extends Omit<ComponentProps<'button'>, 'children'> {
  children?: ReactNode;
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  icone?: Icone;
  /** Ocupa a largura toda do pai. */
  largura?: boolean;
}

export function Botao({
  children,
  variante = 'secundario',
  tamanho = 'md',
  icone: I,
  largura,
  className,
  type = 'button',
  ...resto
}: BotaoProps) {
  return (
    <button type={type} className={cx(classeBotao(variante, tamanho, largura), className)} {...resto}>
      {I && <I className={tamanho === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={1.8} aria-hidden />}
      {children}
    </button>
  );
}
