'use client';

import { useState, type ReactNode } from 'react';
import { Collapsible } from 'radix-ui';
import { cx } from './cx';
import { IconeDireita } from './icones';

/** "Mais opcoes": o que o usuario raramente mexe, fechado por padrao. */
export function MaisOpcoes({ children, rotulo = 'Mais opções' }: { children: ReactNode; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <Collapsible.Root open={aberto} onOpenChange={setAberto}>
      <Collapsible.Trigger className="flex items-center gap-1 text-mini text-texto-3 outline-none hover:text-texto-2">
        <IconeDireita className={cx('size-3 transition-transform duration-150', aberto && 'rotate-90')} strokeWidth={2} aria-hidden />
        {rotulo}
      </Collapsible.Trigger>
      <Collapsible.Content className="mt-3 space-y-3.5 border-l border-borda pl-3">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}

/** Cabecalho de painel: titulo fixo no topo de uma barra lateral. */
export function CabecalhoPainel({ titulo, subtitulo, acao }: { titulo: ReactNode; subtitulo?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-borda px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-medio font-semibold text-texto">{titulo}</h2>
        {subtitulo && <p className="truncate text-mini text-texto-3">{subtitulo}</p>}
      </div>
      {acao}
    </div>
  );
}
