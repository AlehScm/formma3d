'use client';

/**
 * Duas vistas da mesma peca: uma ocupa a area e a outra fica num cartao no canto. Clicar
 * no cartao (ou no botao "Visao 3D"/"Visao 2D" dele) troca as duas. As duas ficam sempre
 * montadas (so mudam de lugar): o 3D nao recria o WebGL e o 2D nao perde o zoom.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconeCaixa, IconeGrade, cx } from '@/components/ui';
import type { Reserva } from './useVista';

type Qual = '2d' | '3d';

interface Props {
  /**
   * Cada vista recebe `compacto` quando esta no canto (esconde controles, enquadra sozinha)
   * e, quando e a principal, o canto que o cartao ocupa (para enquadrar sem ficar embaixo dele).
   */
  dois: (compacto: boolean, reserva?: Reserva) => ReactNode;
  tres: (compacto: boolean, reserva?: Reserva) => ReactNode;
}

// O cartao fica a 12 px da borda (top-3/right-3); mais 8 px de respiro ate a peca.
const MARGEM = 12 + 8;

export function VistaDupla({ dois, tres }: Props) {
  const [principal, setPrincipal] = useState<Qual>('2d');
  const quadros = useRef<Record<Qual, HTMLDivElement | null>>({ '2d': null, '3d': null });
  const [reserva, setReserva] = useState<Reserva>();
  useEffect(() => {
    const cartao = quadros.current[principal === '2d' ? '3d' : '2d'];
    if (!cartao) return;
    const ro = new ResizeObserver(() => setReserva({ w: cartao.offsetWidth + MARGEM, h: cartao.offsetHeight + MARGEM }));
    ro.observe(cartao);
    return () => ro.disconnect();
  }, [principal]);
  const quadro = (qual: Qual, conteudo: (compacto: boolean, reserva?: Reserva) => ReactNode) => {
    const noCanto = principal !== qual;
    const Icone = qual === '3d' ? IconeCaixa : IconeGrade;
    const rotulo = qual === '3d' ? 'Visão 3D' : 'Visão 2D';
    return (
      <div ref={(el) => { quadros.current[qual] = el; }} className={cx('absolute overflow-hidden', noCanto ? 'top-3 right-3 z-10 h-28 w-36 rounded-lg border border-borda-forte bg-superficie-2 shadow-flutuante sm:h-48 sm:w-64' : 'inset-0')}>
        {conteudo(noCanto, noCanto ? undefined : reserva)}
        {noCanto && (
          <button type="button" onClick={() => setPrincipal(qual)} aria-label={`${rotulo}: abrir em tela cheia`} className="group absolute inset-0 flex cursor-pointer items-end rounded-lg outline-none focus-visible:shadow-foco">
            <span className="flex h-9 w-full items-center justify-center gap-1.5 border-t border-borda bg-superficie/95 text-mini font-semibold text-texto group-hover:text-acento group-focus-visible:text-acento">
              <Icone className="size-4" aria-hidden /> {rotulo}
            </span>
          </button>
        )}
      </div>
    );
  };
  return (
    <div className="absolute inset-0">
      {quadro('2d', dois)}
      {quadro('3d', tres)}
    </div>
  );
}
