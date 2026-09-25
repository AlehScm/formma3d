'use client';

import { useState, type ReactNode } from 'react';
import { Collapsible } from 'radix-ui';
import { cx } from './cx';
import { IconeDireita } from './icones';

/**
 * Secao recolhivel da barra lateral.
 *
 * Regra de revelacao progressiva: recolhida, a secao mostra um `resumo` de uma
 * linha ("3mm, apoio por dentro"). O usuario ve o estado de tudo sem abrir nada,
 * e so abre o que vai mexer.
 */
export function Secao({
  titulo,
  resumo,
  aberta,
  setAberta,
  padraoAberta = false,
  acao,
  children,
}: {
  titulo: ReactNode;
  resumo?: ReactNode;
  aberta?: boolean;
  setAberta?: (v: boolean) => void;
  padraoAberta?: boolean;
  /** Controle a direita do titulo (um selo, um botao pequeno). */
  acao?: ReactNode;
  children: ReactNode;
}) {
  const [interno, setInterno] = useState(padraoAberta);
  const aberto = aberta ?? interno;
  const set = setAberta ?? setInterno;

  return (
    <Collapsible.Root open={aberto} onOpenChange={set} className="border-b border-borda last:border-b-0">
      <div className="flex items-center gap-2 pr-3">
        <Collapsible.Trigger className="group flex min-w-0 flex-1 items-center gap-2 py-3 pl-3 text-left outline-none">
          <IconeDireita
            className={cx('size-3.5 shrink-0 text-texto-3 transition-transform duration-150', aberto && 'rotate-90')}
            strokeWidth={2}
            aria-hidden
          />
          <span className="shrink-0 text-mini font-semibold uppercase tracking-wider text-texto-2 group-hover:text-texto">
            {titulo}
          </span>
          {!aberto && resumo && <span className="min-w-0 truncate text-mini text-texto-3">{resumo}</span>}
        </Collapsible.Trigger>
        {acao}
      </div>
      <Collapsible.Content className="space-y-3.5 px-4 pb-4">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}

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
