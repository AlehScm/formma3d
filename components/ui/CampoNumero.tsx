'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Slider } from 'radix-ui';
import { cx } from './cx';
import { Campo } from './Campo';
import { casasDoPasso, formatarNumero, lerNumero } from './formato';

/**
 * Numero com unidade: o controle mais usado do app.
 *
 * - Aceita "1,5" e "1.5". Enquanto o campo esta em edicao o valor e rascunho; so
 *   vale ao sair ou dar Enter -- digitar "1" a caminho de "150" nao pode
 *   reconstruir o letreiro com 1mm no meio do caminho.
 * - Setas mudam um passo; Shift+seta, dez.
 * - O deslizante fica limitado a min..max; o campo digitado nao, porque medida de
 *   cliente as vezes passa do que o deslizante previu.
 */
export interface CampoNumeroProps {
  rotulo: ReactNode;
  valor: number;
  set: (v: number) => void;
  min?: number;
  max?: number;
  passo?: number;
  unidade?: string;
  dica?: ReactNode;
  /** `bloco`: deslizante + campo. `linha`: so o campo, ao lado do rotulo. */
  layout?: 'bloco' | 'linha';
  semDeslizante?: boolean;
  desabilitado?: boolean;
}

export function EntradaNumero({
  valor,
  set,
  min = -Infinity,
  max = Infinity,
  passo = 1,
  unidade,
  id,
  desabilitado,
  largura,
  rotuloAcessivel,
}: {
  valor: number;
  set: (v: number) => void;
  min?: number;
  max?: number;
  passo?: number;
  unidade?: string;
  id?: string;
  desabilitado?: boolean;
  largura?: string;
  rotuloAcessivel?: string;
}) {
  const casas = casasDoPasso(passo);
  // Unidade longa ("R$/kWh") come o espaco do numero: o campo cresce com ela.
  const w = largura ?? ((unidade?.length ?? 0) > 3 ? 'w-28' : 'w-20');
  const [rascunho, setRascunho] = useState<string | null>(null);

  const confirmar = (texto: string) => {
    const v = lerNumero(texto);
    setRascunho(null);
    if (v === null) return;
    // So o piso e travado ao digitar: o teto do deslizante nao vale aqui.
    set(Math.max(min, v));
  };

  const teclado = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      confirmar(e.currentTarget.value);
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setRascunho(null);
      e.currentTarget.blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const d = passo * (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
      const base = lerNumero(e.currentTarget.value) ?? valor;
      const novo = Math.min(max, Math.max(min, Number((base + d).toFixed(6))));
      setRascunho(null);
      set(novo);
    }
  };

  return (
    <div
      className={cx(
        'flex h-8 items-center rounded-md border border-borda bg-superficie-2 transition-colors duration-150',
        'focus-within:border-acento hover:border-borda-forte',
        desabilitado && 'opacity-40',
        w
      )}
    >
      <input
        id={id}
        type="text"
        inputMode="decimal"
        aria-label={rotuloAcessivel}
        disabled={desabilitado}
        value={rascunho ?? formatarNumero(valor, casas)}
        onFocus={(e) => {
          setRascunho(formatarNumero(valor, casas));
          e.currentTarget.select();
        }}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={(e) => confirmar(e.currentTarget.value)}
        onKeyDown={teclado}
        className="tabular min-w-0 flex-1 bg-transparent pl-2 text-right font-mono text-mini text-texto outline-none"
      />
      {unidade && <span className="shrink-0 pl-1 pr-2 font-mono text-micro text-texto-3">{unidade}</span>}
      {!unidade && <span className="pr-2" />}
    </div>
  );
}

export function CampoNumero({
  rotulo,
  valor,
  set,
  min = 0,
  max = 500,
  passo = 0.1,
  unidade = 'mm',
  dica,
  layout = 'bloco',
  semDeslizante,
  desabilitado,
}: CampoNumeroProps) {
  const id = useId();

  if (layout === 'linha' || semDeslizante) {
    return (
      <Campo rotulo={rotulo} dica={dica} layout="linha" htmlFor={id}>
        <EntradaNumero id={id} valor={valor} set={set} min={min} max={max} passo={passo} unidade={unidade} desabilitado={desabilitado} />
      </Campo>
    );
  }

  return (
    <Campo rotulo={rotulo} dica={dica} htmlFor={id}>
      <div className="flex items-center gap-3">
        <Slider.Root
          value={[Math.min(max, Math.max(min, valor))]}
          min={min}
          max={max}
          step={passo}
          disabled={desabilitado}
          onValueChange={([v]) => v !== undefined && set(v)}
          className="relative flex h-5 flex-1 cursor-pointer touch-none select-none items-center data-[disabled]:opacity-40"
          aria-label={typeof rotulo === 'string' ? rotulo : undefined}
        >
          <Slider.Track className="relative h-1 grow rounded-full bg-borda-forte">
            <Slider.Range className="absolute h-full rounded-full bg-acento/70" />
          </Slider.Track>
          <Slider.Thumb className="block size-3.5 rounded-full border-2 border-superficie bg-acento shadow transition-colors hover:bg-acento-forte" />
        </Slider.Root>
        <EntradaNumero id={id} valor={valor} set={set} min={min} max={max} passo={passo} unidade={unidade} desabilitado={desabilitado} />
      </div>
    </Campo>
  );
}
