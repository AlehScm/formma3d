'use client';

/**
 * Planta 2D do gerador: a peca vista de cima, na mesma tela em mm do editor livre (grade,
 * zoom na roda, arrastar para mover a vista), com as cotas de largura e altura e, ao passar
 * o mouse numa peca, o nome e a medida dela.
 */
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as EventoPonteiro } from 'react';
import { formatarNumero } from '@/components/ui';
import { corDe } from '@/lib/gerador/malha';
import { fatiasDaPlanta, limitesDaPeca } from '@/lib/gerador/planta';
import type { Resultado } from '@/lib/gerador/tipos';
import { caminho } from '@/features/visor/caminho';
import { ControlesZoom } from '@/features/visor/ControlesZoom';
import { useVista, type Reserva } from '@/features/visor/useVista';

const mm = (v: number) => `${formatarNumero(v, 1)} mm`;

/**
 * Peca alta (pote, caixa, porta-canetas): visto de cima, fundo e parede tem a mesma cor e a
 * parede some. O que esta mais fundo escurece um pouco, como sombra. Peca baixa (chaveiro,
 * placa) fica na cor exata da legenda.
 */
const ALTURA_COM_SOMBRA = 10;
const sombraDe = (z1: number, zMax: number) => (zMax > ALTURA_COM_SOMBRA ? 0.35 * (1 - z1 / zMax) : 0);

export function Planta({ resultado, compacto, reserva }: { resultado: Resultado; compacto?: boolean; reserva?: Reserva }) {
  const { fatias, limites } = useMemo(() => fatiasDaPlanta(resultado), [resultado]);
  const zMax = fatias.at(-1)?.z1 ?? 0;
  // Enquadra a peca (com px livres para as cotas); a grade cobre a area toda.
  const { caixa, tam, vista, z, naTela, transformacao, enquadrar, ajustar } = useVista(limites, { folga: 1.04, borda: 44, compacto, reserva });
  const folha = { minX: vista.cx - tam.w / (2 * z) - 10, minY: vista.cy - tam.h / (2 * z) - 10, w: tam.w / z + 20, h: tam.h / z + 20 };
  const grade = useId();
  const [sobre, setSobre] = useState<{ item: number; peca: number } | null>(null);
  const arrasto = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  // Reenquadra quando o tamanho muda bastante (nao a cada letra digitada), como a previa 3D.
  const enquadrada = useRef({ w: 0, h: 0 });
  useEffect(() => {
    const e = enquadrada.current;
    const muda = (a: number, b: number) => !b || a / b > 1.3 || a / b < 0.77;
    if (!muda(limites.w, e.w) && !muda(limites.h, e.h)) return;
    enquadrada.current = { w: limites.w, h: limites.h };
    if (e.w) enquadrar();
  }, [limites.w, limites.h, enquadrar]);

  const apertar = (ev: EventoPonteiro) => {
    if (ev.button !== 0 && ev.button !== 1) return;
    arrasto.current = { x: ev.clientX, y: ev.clientY, cx: vista.cx, cy: vista.cy };
    try {
      caixa.current?.setPointerCapture(ev.pointerId);
    } catch {
      // ponteiro ja solto: segue pelos eventos da caixa
    }
  };
  const mover = (ev: EventoPonteiro) => {
    const a = arrasto.current;
    if (a) ajustar((v) => ({ ...v, cx: a.cx - (ev.clientX - a.x) / z, cy: a.cy + (ev.clientY - a.y) / z }));
  };
  const soltar = (ev: EventoPonteiro) => {
    arrasto.current = null;
    if (caixa.current?.hasPointerCapture(ev.pointerId)) caixa.current.releasePointerCapture(ev.pointerId);
  };

  // Cotas em pixels, fora da escala do desenho (linha fina e texto no tamanho de sempre).
  const a = naTela(limites.minX, limites.minY), b = naTela(limites.maxX, limites.maxY);
  const baixo = a.y + 16, esquerda = a.x - 16;
  const peca = sobre ? resultado.itens[sobre.item]?.pecas[sobre.peca] : null;
  const medidaPeca = sobre ? limitesDaPeca(resultado, sobre.item, sobre.peca) : null;

  return (
    <div ref={caixa} className="relative size-full cursor-grab touch-none overflow-hidden bg-prancheta select-none active:cursor-grabbing" onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
      <svg className="absolute inset-0 size-full" onPointerDown={apertar} role="img" aria-label={`Peça vista de cima: ${mm(limites.w)} de largura por ${mm(limites.h)} de altura`}>
        <defs>
          <pattern id={grade} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" className="stroke-texto-3" strokeWidth="0.12" strokeOpacity="0.35" />
          </pattern>
        </defs>
        <g transform={transformacao}>
          <rect x={folha.minX} y={folha.minY} width={folha.w} height={folha.h} fill={`url(#${grade})`} />
          {fatias.map((f, i) => {
            const sombra = sombraDe(f.z1, zMax);
            return (
              <g key={i} onPointerEnter={compacto ? undefined : () => setSobre({ item: f.item, peca: f.peca })} onPointerLeave={compacto ? undefined : () => setSobre(null)}>
                <path d={caminho(f.regiao)} fill={corDe(resultado, f.cor)} fillRule="evenodd" className="stroke-texto-3" strokeOpacity="0.45" strokeWidth="0.75" vectorEffect="non-scaling-stroke" />
                {sombra > 0.01 && <path d={caminho(f.regiao)} fillRule="evenodd" className="fill-black" fillOpacity={sombra} />}
              </g>
            );
          })}
        </g>
        {!compacto && limites.w > 0 && (
          <g className="pointer-events-none stroke-texto-3" strokeWidth="1">
            <line x1={a.x} x2={b.x} y1={baixo} y2={baixo} />
            <line x1={a.x} x2={a.x} y1={baixo - 5} y2={baixo + 5} />
            <line x1={b.x} x2={b.x} y1={baixo - 5} y2={baixo + 5} />
            <line x1={esquerda} x2={esquerda} y1={a.y} y2={b.y} />
            <line x1={esquerda - 5} x2={esquerda + 5} y1={a.y} y2={a.y} />
            <line x1={esquerda - 5} x2={esquerda + 5} y1={b.y} y2={b.y} />
          </g>
        )}
      </svg>
      {!compacto && limites.w > 0 && (
        <>
          <span className="pointer-events-none absolute -translate-x-1/2 rounded bg-superficie px-1.5 text-micro font-semibold tabular-nums whitespace-nowrap text-texto-2" style={{ left: (a.x + b.x) / 2, top: baixo + 4 }}>{mm(limites.w)}</span>
          <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 -rotate-90 rounded bg-superficie px-1.5 text-micro font-semibold tabular-nums whitespace-nowrap text-texto-2" style={{ left: esquerda - 12, top: (a.y + b.y) / 2 }}>{mm(limites.h)}</span>
        </>
      )}
      {!compacto && peca && medidaPeca && (
        <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-acento px-2 py-0.5 text-mini font-semibold whitespace-nowrap text-white" role="status">
          {resultado.itens.length > 1 ? `${resultado.itens[sobre!.item]!.nome} · ` : ''}{peca.nome} · {formatarNumero(medidaPeca.w, 1)} × {mm(medidaPeca.h)}
        </span>
      )}
      {!compacto && <ControlesZoom z={z} ajustar={ajustar} enquadrar={enquadrar} />}
    </div>
  );
}
