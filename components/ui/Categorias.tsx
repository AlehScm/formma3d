'use client';

import type { ReactNode } from 'react';
import { Tabs } from 'radix-ui';
import { cx } from './cx';
import { Dica } from './Dica';
import { CabecalhoPainel } from './Secao';
import type { Icone } from './icones';

/**
 * Barra lateral em abas verticais: uma coluna de icones (80px, cabe "Acabamento"
 * inteiro em 11px) a esquerda, a categoria
 * escolhida inteira a direita.
 *
 * Substitui a pilha de secoes recolhiveis, em que chegar numa categoria obrigava
 * a fechar as de cima ou rolar ate ela. Aqui e um clique, e setas cima/baixo
 * trocam de aba pelo teclado.
 *
 * O resumo de uma linha de cada categoria aparece na dica da aba (ver o estado sem
 * abrir) e no cabecalho da categoria aberta.
 */
export interface Categoria {
  id: string;
  nome: string;
  icone: Icone;
  resumo?: string;
  /** Ponto na aba quando ha algo la dentro para ver. */
  alerta?: 'atencao' | 'perigo';
  conteudo: ReactNode;
}

export function Categorias({
  rotulo,
  categorias,
  ativa,
  setAtiva,
}: {
  rotulo: string;
  categorias: Categoria[];
  ativa: string;
  setAtiva: (id: string) => void;
}) {
  // A categoria ativa pode sumir (Chapa ACM some quando nao ha chapa): cai na primeira.
  const atual = categorias.find((c) => c.id === ativa) ?? categorias[0];
  if (!atual) return null;

  return (
    <Tabs.Root
      orientation="vertical"
      value={atual.id}
      onValueChange={setAtiva}
      className="flex h-full min-h-0"
    >
      <Tabs.List
        aria-label={rotulo}
        className="flex w-20 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-borda bg-fundo/40 py-2"
      >
        {categorias.map((c) => {
          const I = c.icone;
          return (
            <Dica
              key={c.id}
              lado="right"
              conteudo={
                <span>
                  <span className="font-medium">{c.nome}</span>
                  {c.resumo && <span className="block text-texto-2">{c.resumo}</span>}
                </span>
              }
            >
              <Tabs.Trigger
                value={c.id}
                className={cx(
                  'relative mx-1 flex flex-col items-center gap-1 rounded-md px-0.5 py-2 outline-none transition-colors duration-150',
                  'text-texto-3 hover:bg-superficie-2 hover:text-texto-2',
                  // aria-selected e nao data-state: a Dica sobrescreve data-state.
                  'aria-selected:bg-superficie-3 aria-selected:text-texto',
                  'before:absolute before:-left-1 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-transparent',
                  'aria-selected:before:bg-acento'
                )}
              >
                <I className="size-4.5" strokeWidth={1.7} aria-hidden />
                <span className="w-full text-center text-micro leading-tight">{c.nome}</span>
                {c.alerta && (
                  <span
                    aria-label={c.alerta === 'perigo' ? 'tem problema' : 'tem aviso'}
                    className={cx(
                      'absolute right-1.5 top-1.5 size-1.5 rounded-full',
                      c.alerta === 'perigo' ? 'bg-perigo' : 'bg-atencao'
                    )}
                  />
                )}
              </Tabs.Trigger>
            </Dica>
          );
        })}
      </Tabs.List>

      {categorias.map((c) => (
        <Tabs.Content key={c.id} value={c.id} className="flex min-w-0 flex-1 flex-col outline-none">
          <CabecalhoPainel titulo={c.nome} subtitulo={c.resumo} />
          <div className="flex-1 space-y-4 overflow-y-auto p-4">{c.conteudo}</div>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
