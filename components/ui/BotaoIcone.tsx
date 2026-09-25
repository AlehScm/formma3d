'use client';

import type { ComponentProps } from 'react';
import { cx } from './cx';
import { Dica } from './Dica';
import type { Icone } from './icones';

/**
 * Botao so com icone. `rotulo` e obrigatorio: vira a dica e o nome para leitor de
 * tela -- botao de icone sem nome e um botao que ninguem sabe o que faz.
 */
export interface BotaoIconeProps extends Omit<ComponentProps<'button'>, 'children'> {
  icone: Icone;
  rotulo: string;
  atalho?: string;
  /** Estado ligado (ferramenta ativa, painel aberto). */
  ativo?: boolean;
  tamanho?: 'sm' | 'md';
  ladoDica?: 'top' | 'right' | 'bottom' | 'left';
}

export function BotaoIcone({
  icone: I,
  rotulo,
  atalho,
  ativo,
  tamanho = 'md',
  ladoDica = 'top',
  className,
  type = 'button',
  ...resto
}: BotaoIconeProps) {
  return (
    <Dica conteudo={rotulo} atalho={atalho} lado={ladoDica}>
      <button
        type={type}
        aria-label={rotulo}
        aria-pressed={ativo}
        className={cx(
          'inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-150',
          'disabled:pointer-events-none disabled:opacity-35',
          tamanho === 'sm' ? 'size-7' : 'size-8',
          ativo ? 'bg-acento text-white' : 'text-texto-2 hover:bg-superficie-3 hover:text-texto',
          className
        )}
        {...resto}
      >
        <I className="size-4" strokeWidth={1.8} aria-hidden />
      </button>
    </Dica>
  );
}
