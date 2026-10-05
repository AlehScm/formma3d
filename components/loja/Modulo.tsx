/**
 * Bloco padrao da loja (como as vitrines do Mercado Livre e da Magalu): painel branco com
 * um unico titulo de bloco a esquerda e "Ver todos" a direita. Toda secao da loja usa este
 * mesmo bloco, para o olho aprender o padrao e nao ter que ler cada caixa.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cx } from '@/components/ui/cx';

export function TituloModulo({ id, titulo, subtitulo, verTodos, acoes }: { id: string; titulo: string; subtitulo?: string; verTodos?: { href: string; rotulo: string }; acoes?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 id={id} className="m-0 font-display text-modulo text-marca-navy">{titulo}</h2>
        {subtitulo && <p className="m-0 mt-1 text-apoio text-marca-texto-2">{subtitulo}</p>}
      </div>
      <div className="flex items-center gap-2">
        {verTodos && <Link href={verTodos.href} className="text-item font-semibold text-marca-azul no-underline hover:underline">{verTodos.rotulo}</Link>}
        {acoes}
      </div>
    </div>
  );
}

export function Modulo({ id, titulo, subtitulo, verTodos, acoes, secao, className, children }: { id: string; titulo: string; subtitulo?: string; verTodos?: { href: string; rotulo: string }; acoes?: ReactNode; secao?: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} data-secao={secao} className={cx('rounded-marca-lg bg-marca-branco p-5 md:p-6', className)}>
      <TituloModulo id={id} titulo={titulo} subtitulo={subtitulo} verTodos={verTodos} acoes={acoes} />
      {children}
    </section>
  );
}

/** Cabecalho de pagina interna: trilha, titulo da pagina e uma linha de descricao. */
export function TituloPagina({ titulo, descricao, trilha }: { titulo: string; descricao?: ReactNode; trilha?: { href: string; rotulo: string }[] }) {
  return (
    <header className="flex flex-col gap-2">
      {trilha && (
        <nav aria-label="Você está em" className="flex flex-wrap gap-2 text-apoio text-marca-texto-2">
          {trilha.map((t, i) => (
            <span key={t.href} className="flex gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              <Link href={t.href} className="text-marca-azul no-underline hover:underline">{t.rotulo}</Link>
            </span>
          ))}
        </nav>
      )}
      <h1 className="m-0 font-display text-titulo text-marca-navy">{titulo}</h1>
      {descricao && <p className="m-0 max-w-[70ch] text-corpo text-marca-texto-2">{descricao}</p>}
    </header>
  );
}
