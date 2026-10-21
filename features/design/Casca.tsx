'use client';

/**
 * A casca do editor: cabecalho (voltar, acoes e exportacao), barra de contexto e o corpo
 * em colunas; e a lista de modelos prontos que entram na tela.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Botao, IconeBaixar, IconeImprimir, cx } from '@/components/ui';
import { blob3mfMontado, blob3mfSoltas, zipStl } from '@/lib/gerador/exportar';
import { FICHAS } from '@/lib/gerador/receitas/fichas';
import type { Resultado } from '@/lib/gerador/tipos';
import { baixar } from '@/features/acoes/exportar';
import { familias } from '@/features/catalogo/catalogo';
import { enviarAoEditor } from '@/features/gerador/enviarAoEditor';

export function Casca({ janela, cabecalho, acoes, contexto, colunas, children }: {
  janela?: boolean;
  cabecalho: ReactNode;
  acoes: ReactNode;
  contexto?: ReactNode;
  /** Classes de grid-cols do corpo (desktop). */
  colunas: string;
  children: ReactNode;
}) {
  return (
    <div className={cx('flex flex-col bg-fundo text-texto', janela ? 'h-full' : 'min-h-[100dvh] lg:h-[100dvh]')}>
      <header className="flex flex-wrap items-center gap-2 border-b border-borda bg-superficie px-3 py-2">
        {cabecalho}
        <div className="ml-auto flex flex-wrap gap-2">{acoes}</div>
      </header>
      {contexto && <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-borda bg-superficie px-3 py-1.5">{contexto}</div>}
      <div className={cx('grid min-h-0 flex-1 grid-cols-1', colunas)}>{children}</div>
    </div>
  );
}

/** Volta para a peca da loja quando o modelo veio de uma; senao, para o catalogo. */
export const VoltarCatalogo = ({ href = '/criar', rotulo = 'Monte a sua peça' }: { href?: string; rotulo?: string }) => (
  <Link href={href} className="rounded-md px-2 py-1 text-mini font-medium text-texto-2 hover:bg-superficie-3">← {rotulo}</Link>
);

/** 3MF multicor, 3MF em pecas, STL e "Abrir no editor": os mesmos para qualquer modelo.
 *  `primario`: falso quando "Adicionar ao orcamento" e a acao principal da tela. */
export function BotoesExportar({ resultado, nome, pode, primario = true }: { resultado: Resultado | null | undefined; nome: string; pode: boolean; primario?: boolean }) {
  const router = useRouter();
  const ok = pode && !!resultado;
  return (
    <>
      <Botao variante={primario ? 'primario' : 'secundario'} icone={IconeBaixar} disabled={!ok} onClick={async () => ok && baixar(`${nome}.3mf`, await blob3mfMontado(resultado!))}>3MF multicor</Botao>
      <Botao icone={IconeBaixar} disabled={!ok} onClick={async () => ok && baixar(`${nome}-pecas.3mf`, await blob3mfSoltas(resultado!))}>3MF peças separadas</Botao>
      <Botao icone={IconeBaixar} disabled={!ok} onClick={async () => ok && baixar(`${nome}-stl.zip`, await zipStl(resultado!))}>STL (zip)</Botao>
      <Botao variante="fantasma" icone={IconeImprimir} disabled={!ok} onClick={() => ok && enviarAoEditor(resultado!, (r) => router.push(r))}>Abrir no editor</Botao>
    </>
  );
}

/** Modelos que entram na tela (as fichas do catalogo), por familia. */
const GRUPOS = Object.entries(familias)
  .map(([fam, nome]) => ({ nome, itens: FICHAS.filter((f) => f.familia === fam).map((f) => ({ id: f.id, nome: f.nome })) }))
  .filter((g) => g.itens.length);

export const nomeDoModelo = (id: string) => FICHAS.find((f) => f.id === id)?.nome ?? id;

/** Lista dos modelos prontos para colocar na tela (popover da ferramenta "Modelos"). */
export function ListaModelos({ onEscolher, onFechar }: { onEscolher: (id: string) => void; onFechar: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onFechar]);
  return (
    <>
      <button type="button" aria-label="Fechar" className="fixed inset-0 z-40 cursor-default" onClick={onFechar} />
      <div role="dialog" aria-label="Colocar um modelo pronto" className="fixed inset-x-3 top-36 z-50 max-h-[70vh] overflow-y-auto rounded-lg border border-borda bg-flutuante p-2 shadow-flutuante sm:inset-x-auto sm:left-24 sm:w-80 lg:top-24">
        <p className="m-0 px-2.5 pt-1 pb-2 text-micro text-texto-3">O modelo entra na tela: arraste, gire e mude as configurações dele ao lado.</p>
        {GRUPOS.map((g) => (
          <section key={g.nome} className="mt-1">
            <h3 className="m-0 px-2.5 pb-1 text-micro font-semibold uppercase tracking-wider text-texto-3">{g.nome}</h3>
            {g.itens.map((i) => (
              <button key={i.id} type="button" onClick={() => onEscolher(i.id)} className="block w-full rounded-md px-2.5 py-1.5 text-left text-mini text-texto-2 hover:bg-superficie-3 hover:text-texto">{i.nome}</button>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
