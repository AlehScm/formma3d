'use client';

import { Tabs } from 'radix-ui';
import { cx } from './cx';
import { Dica } from './Dica';
import type { Icone } from './icones';

/**
 * Abas de navegacao entre areas. So a lista de abas: o conteudo de cada area e
 * decidido fora, para o canvas 3D nao ser desmontado ao trocar de aba (recriar o
 * contexto WebGL a cada troca custaria caro e piscaria a tela).
 */
export interface Aba<T extends string> {
  valor: T;
  nome: string;
  icone?: Icone;
  dica?: string;
  atalho?: string;
}

export function Abas<T extends string>({
  valor,
  set,
  abas,
  rotulo,
}: {
  valor: T;
  set: (v: T) => void;
  abas: Aba<T>[];
  rotulo: string;
}) {
  return (
    <Tabs.Root value={valor} onValueChange={(v) => set(v as T)}>
      <Tabs.List aria-label={rotulo} className="flex items-center gap-0.5 rounded-lg border border-borda bg-fundo p-0.5">
        {abas.map((a) => {
          const I = a.icone;
          return (
            <Dica key={a.valor} conteudo={a.dica} atalho={a.atalho} lado="bottom">
              <Tabs.Trigger
                value={a.valor}
                className={cx(
                  'inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-mini font-medium outline-none transition-colors duration-150',
                  'text-texto-2 hover:bg-superficie-2 hover:text-texto',
                  // aria-selected, nao data-state: a Dica sobrescreve data-state.
                  'aria-selected:bg-superficie-3 aria-selected:text-texto aria-selected:shadow-[inset_0_-2px_0_var(--color-acento)]'
                )}
              >
                {I && <I className="size-3.5" strokeWidth={1.8} aria-hidden />}
                {a.nome}
              </Tabs.Trigger>
            </Dica>
          );
        })}
      </Tabs.List>
    </Tabs.Root>
  );
}
