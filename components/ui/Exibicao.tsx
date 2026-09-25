import type { ReactNode } from 'react';
import { cx } from './cx';
import { IconeAtencao, IconeInfo, IconeOk, IconePerigo, type Icone } from './icones';

/**
 * Componentes de leitura: nada aqui recebe input.
 *
 * Tom = significado, nunca enfeite:
 *   neutro  -> informacao sem juizo
 *   acento  -> selecao, o que esta ativo
 *   sucesso -> dinheiro, "cabe", pronto
 *   atencao -> confira antes de imprimir
 *   perigo  -> impede imprimir
 */
export type Tom = 'neutro' | 'acento' | 'sucesso' | 'atencao' | 'perigo';

const TEXTO: Record<Tom, string> = {
  neutro: 'text-texto',
  acento: 'text-acento-forte',
  sucesso: 'text-sucesso',
  atencao: 'text-atencao',
  perigo: 'text-perigo',
};

const CAIXA: Record<Tom, string> = {
  neutro: 'border-borda bg-superficie-2 text-texto-2',
  acento: 'border-acento/30 bg-acento/10 text-acento-forte',
  sucesso: 'border-sucesso/30 bg-sucesso/10 text-sucesso',
  atencao: 'border-atencao/30 bg-atencao/10 text-atencao',
  perigo: 'border-perigo/30 bg-perigo/10 text-perigo',
};

const ICONE: Record<Tom, Icone> = {
  neutro: IconeInfo,
  acento: IconeInfo,
  sucesso: IconeOk,
  atencao: IconeAtencao,
  perigo: IconePerigo,
};

export const corDoTom = (t: Tom) => TEXTO[t];

/** Mensagem em bloco. Para o que o usuario precisa ler antes de continuar. */
export function Alerta({
  tom = 'atencao',
  titulo,
  children,
  acao,
}: {
  tom?: Tom;
  titulo?: ReactNode;
  children?: ReactNode;
  acao?: ReactNode;
}) {
  const I = ICONE[tom];
  return (
    <div role={tom === 'perigo' ? 'alert' : undefined} className={cx('flex gap-2.5 rounded-md border px-3 py-2.5', CAIXA[tom])}>
      <I className="mt-px size-4 shrink-0" strokeWidth={1.8} aria-hidden />
      <div className="min-w-0 flex-1 space-y-1 text-mini leading-relaxed">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={titulo ? 'text-texto-2' : undefined}>{children}</div>}
        {acao && <div className="pt-1">{acao}</div>}
      </div>
    </div>
  );
}

/** Rotulo curto de estado: "cabe", "2 furos", "girada 45°". */
export function Selo({ tom = 'neutro', children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span className={cx('inline-flex h-5 shrink-0 items-center rounded-sm border px-1.5 text-micro font-medium', CAIXA[tom])}>
      {children}
    </span>
  );
}

/** Numero de destaque com rotulo: preco, peso, dimensao. */
export function Metrica({
  rotulo,
  valor,
  unidade,
  tom = 'neutro',
  tamanho = 'md',
  detalhe,
}: {
  rotulo: ReactNode;
  valor: ReactNode;
  unidade?: string;
  tom?: Tom;
  tamanho?: 'sm' | 'md' | 'lg';
  detalhe?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-micro font-medium uppercase tracking-wider text-texto-3">{rotulo}</div>
      <div
        className={cx(
          'tabular mt-1 flex items-baseline gap-1 font-mono font-semibold leading-none',
          tamanho === 'lg' ? 'text-numero' : tamanho === 'md' ? 'text-grande' : 'text-base',
          TEXTO[tom]
        )}
      >
        <span className="truncate">{valor}</span>
        {unidade && <span className="text-mini font-normal text-texto-3">{unidade}</span>}
      </div>
      {detalhe && <div className="mt-1 text-mini text-texto-3">{detalhe}</div>}
    </div>
  );
}

/** Lista chave-valor: resumo, orcamento, propriedades. */
export function ListaValores({
  itens,
  densa,
}: {
  itens: { rotulo: ReactNode; valor: ReactNode; detalhe?: ReactNode; tom?: Tom; forte?: boolean }[];
  densa?: boolean;
}) {
  return (
    <dl className={cx('divide-y divide-borda/60', densa ? 'text-mini' : 'text-base')}>
      {itens.map((i, k) => (
        <div key={k} className={cx('flex items-baseline gap-3', densa ? 'py-1.5' : 'py-2')}>
          <dt className={cx('min-w-0 flex-1 truncate', i.forte ? 'font-semibold text-texto' : 'text-texto-2')}>{i.rotulo}</dt>
          {i.detalhe && <dd className="tabular shrink-0 font-mono text-micro text-texto-3">{i.detalhe}</dd>}
          <dd className={cx('tabular shrink-0 text-right font-mono', i.forte && 'font-semibold', TEXTO[i.tom ?? 'neutro'])}>{i.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Estado vazio: o que aparece quando ainda nao ha o que mostrar. */
export function Vazio({ icone: I, titulo, children, acao }: { icone?: Icone; titulo: ReactNode; children?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {I && <I className="mb-1 size-8 text-texto-3" strokeWidth={1.4} aria-hidden />}
      <p className="text-medio font-medium text-texto">{titulo}</p>
      {children && <p className="max-w-72 text-base text-texto-3">{children}</p>}
      {acao && <div className="pt-2">{acao}</div>}
    </div>
  );
}

/** Container flutuante sobre o viewport. */
export function BarraFerramentas({ children, rotulo }: { children: ReactNode; rotulo: string }) {
  return (
    <div
      role="toolbar"
      aria-label={rotulo}
      className="flex items-center gap-0.5 rounded-lg border border-borda bg-flutuante/95 p-1 shadow-flutuante backdrop-blur"
    >
      {children}
    </div>
  );
}

export function Separador({ vertical = true }: { vertical?: boolean }) {
  return <div aria-hidden className={vertical ? 'mx-1 h-5 w-px bg-borda' : 'my-2 h-px w-full bg-borda'} />;
}
