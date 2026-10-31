/**
 * Paginas de politica da loja (trocas, privacidade): titulo, data da ultima revisao e topicos.
 * Componentes de servidor.
 */
import type { ReactNode } from 'react';
import { PaginaLoja } from './Estrutura';
import { TituloPagina } from './Modulo';

export function PaginaPolitica({ titulo, descricao, atualizada, children }: { titulo: string; descricao: string; atualizada: string; children: ReactNode }) {
  return (
    <PaginaLoja>
      <TituloPagina titulo={titulo} descricao={descricao} trilha={[{ href: '/', rotulo: 'Início' }]} />
      <div className="grid gap-x-12 gap-y-6 pb-4 lg:grid-cols-2">
        {children}
        <p className="m-0 text-apoio text-marca-texto-2 lg:col-span-2">Atualizada em {atualizada}.</p>
      </div>
    </PaginaLoja>
  );
}

export function Topico({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-item font-semibold text-marca-navy">{titulo}</h2>
      <div className="flex flex-col gap-2 text-corpo text-marca-texto-2 [&_a]:text-marca-azul [&_p]:m-0">{children}</div>
    </section>
  );
}
