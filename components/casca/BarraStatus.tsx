'use client';

import { Alerta, Balao, IconeAtencao, IconeOk, cx, formatarNumero, formatarPeso, formatarTexto } from '@/components/ui';
import { useModelo, useOrcamento } from '@/modelo/Modelo';
import { useProjeto } from '@/store/projeto';

/**
 * Barra de baixo: medidas do letreiro e os problemas.
 *
 * Os avisos moravam num botao flutuante no canto do 3D -- em cima da barra de
 * ferramentas, literalmente. Aqui eles tem lugar fixo e nao cobrem o desenho.
 */
export function BarraStatus() {
  const m = useModelo();
  const o = useOrcamento();
  const carregando = useProjeto((s) => s.carregando);
  const profundidade = useProjeto((s) => s.profundidade);
  const n = m.avisos.length;
  const z = m.letras[0]?.part.alturaZ ?? profundidade;

  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-borda bg-superficie px-3 text-mini text-texto-3">
      {m.bounds ? (
        <span className="tabular flex items-center gap-2.5 font-mono">
          <span className="text-eixo-x">X {formatarNumero(m.bounds.w, 1)}</span>
          <span className="text-eixo-y">Y {formatarNumero(m.bounds.h, 1)}</span>
          <span className="text-eixo-z">Z {formatarNumero(z, 1)}</span>
          <span>mm</span>
        </span>
      ) : (
        <span>Sem peças</span>
      )}

      {m.letras.length > 0 && (
        <>
          <span aria-hidden>·</span>
          <span>
            {m.letras.length} {m.letras.length === 1 ? 'peça' : 'peças'}
          </span>
        </>
      )}
      {o && (
        <>
          <span aria-hidden>·</span>
          <span className="tabular font-mono">{formatarPeso(o.gramas)}</span>
        </>
      )}
      {carregando && <span className="text-acento-forte">carregando…</span>}

      <div className="ml-auto">
        {n === 0 ? (
          m.letras.length > 0 && (
            <span className="flex items-center gap-1.5 text-sucesso">
              <IconeOk className="size-3.5" strokeWidth={2} aria-hidden />
              Pronto para imprimir
            </span>
          )
        ) : (
          <Balao
            lado="top"
            alinhar="end"
            largura="w-96"
            gatilho={
              <button
                type="button"
                className={cx('flex h-6 items-center gap-1.5 rounded-sm px-2 font-medium text-atencao hover:bg-atencao/10')}
              >
                <IconeAtencao className="size-3.5" strokeWidth={2} aria-hidden />
                {n} {n === 1 ? 'problema' : 'problemas'}
              </button>
            }
          >
            <p className="mb-2 text-mini font-semibold uppercase tracking-wider text-texto-2">Antes de imprimir</p>
            <div className="space-y-2">
              {m.avisos.map((a) => (
                <Alerta key={a}>{formatarTexto(a)}</Alerta>
              ))}
            </div>
          </Balao>
        )}
      </div>
    </footer>
  );
}
