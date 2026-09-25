'use client';

import { useId, type ReactNode } from 'react';
import { Switch, ToggleGroup } from 'radix-ui';
import { cx } from './cx';
import { Campo } from './Campo';
import { Dica } from './Dica';
import { IconeAbaixo, type Icone } from './icones';

/**
 * Controles de escolha.
 *
 * Qual usar: 2 a 4 opcoes curtas -> Segmentado (tudo a vista, um clique).
 * 5 ou mais, ou nomes longos -> Selecao. Liga/desliga -> Interruptor.
 */

export interface OpcaoEscolha<T extends string> {
  valor: T;
  nome: string;
  dica?: string;
  icone?: Icone;
}

export function Segmentado<T extends string>({
  rotulo,
  dica,
  valor,
  set,
  opcoes,
  tamanho = 'md',
}: {
  rotulo?: ReactNode;
  dica?: ReactNode;
  valor: T;
  set: (v: T) => void;
  opcoes: OpcaoEscolha<T>[];
  tamanho?: 'sm' | 'md';
}) {
  const grupo = (
    <ToggleGroup.Root
      type="single"
      value={valor}
      // Radix permite desmarcar clicando no ativo; aqui sempre ha uma escolha.
      onValueChange={(v) => v && set(v as T)}
      className="flex gap-0.5 rounded-md border border-borda bg-superficie-2 p-0.5"
      aria-label={typeof rotulo === 'string' ? rotulo : undefined}
    >
      {opcoes.map((o) => {
        const I = o.icone;
        const botao = (
          <ToggleGroup.Item
            key={o.valor}
            value={o.valor}
            className={cx(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 font-medium transition-colors duration-150',
              tamanho === 'sm' ? 'h-6 text-micro' : 'h-7 text-mini',
              'text-texto-2 hover:bg-superficie-3 hover:text-texto',
              // Selecionado = acento: "azul e o que esta escolhido". Estiliza por
              // aria-checked e NAO por data-state: a Dica envolve o botao e o Tooltip
              // sobrescreve data-state com o estado dele ("closed").
              'aria-checked:bg-acento/20 aria-checked:text-acento-forte aria-checked:shadow-[inset_0_0_0_1px_rgb(76_139_245/0.45)]'
            )}
          >
            {I && <I className="size-3.5" strokeWidth={1.8} aria-hidden />}
            {o.nome}
          </ToggleGroup.Item>
        );
        return o.dica ? (
          <Dica key={o.valor} conteudo={o.dica}>
            {botao}
          </Dica>
        ) : (
          botao
        );
      })}
    </ToggleGroup.Root>
  );
  if (!rotulo) return grupo;
  return (
    <Campo rotulo={rotulo} dica={dica}>
      {grupo}
    </Campo>
  );
}

export function Selecao<T extends string>({
  rotulo,
  dica,
  valor,
  set,
  opcoes,
  vazio,
}: {
  rotulo?: ReactNode;
  dica?: ReactNode;
  valor: T | '';
  set: (v: T) => void;
  opcoes: { valor: T; nome: string }[];
  /** Texto da opcao vazia, quando ainda nao ha escolha. */
  vazio?: string;
}) {
  const id = useId();
  const campo = (
    <div className="relative">
      <select
        id={id}
        value={valor}
        onChange={(e) => e.target.value && set(e.target.value as T)}
        className="h-8 w-full appearance-none rounded-md border border-borda bg-superficie-2 pl-2.5 pr-8 text-base text-texto outline-none transition-colors duration-150 hover:border-borda-forte focus:border-acento"
      >
        {vazio !== undefined && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.nome}
          </option>
        ))}
      </select>
      <IconeAbaixo className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-texto-3" aria-hidden />
    </div>
  );
  if (!rotulo) return campo;
  return (
    <Campo rotulo={rotulo} dica={dica} htmlFor={id}>
      {campo}
    </Campo>
  );
}

export function Interruptor({
  rotulo,
  dica,
  valor,
  set,
  desabilitado,
}: {
  rotulo: ReactNode;
  dica?: ReactNode;
  valor: boolean;
  set: (v: boolean) => void;
  desabilitado?: boolean;
}) {
  const id = useId();
  return (
    <Campo rotulo={rotulo} dica={dica} layout="linha" htmlFor={id}>
      <Switch.Root
        id={id}
        checked={valor}
        onCheckedChange={set}
        disabled={desabilitado}
        className="relative h-5 w-9 shrink-0 cursor-pointer rounded-full border border-borda-forte bg-superficie-3 transition-colors duration-150 data-[state=checked]:border-acento data-[state=checked]:bg-acento disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Switch.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-texto shadow transition-transform duration-150 data-[state=checked]:translate-x-[1.125rem]" />
      </Switch.Root>
    </Campo>
  );
}
