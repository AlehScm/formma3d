'use client';

import type { Apoio } from '@/lib/geom/modes';

const X_EXT = 40;
const X_CHAPA = 120;
const X_DEGRAU = X_CHAPA + 14;
const Y_TOPO = 18;
const Y_CHAPA = 42;
const Y_BASE = 96;

/**
 * Desenho em corte do batente. Um e o outro ao contrario: no de dentro a parede de fora
 * sobe mais e a chapa entra na letra; no de fora o batente sobe e passa da parede de fora.
 *
 * Corte lateral, metade da letra: a esquerda e o lado de fora da peca.
 */
export function CorteApoio({ apoio }: { apoio: Apoio }) {
  return (
    <figure className="m-0">
      <svg viewBox="0 0 260 124" className="w-full" role="img" aria-label={`Corte do batente ${apoio === 'fora' ? 'de fora' : 'de dentro'}`}>
        {apoio === 'fora' ? <BatenteFora /> : <BatenteDentro />}
        {/* contorno da arte: igual nos dois */}
        <line x1={X_EXT} y1={6} x2={X_EXT} y2={116} stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.35" />
        <text x={36} y={114} textAnchor="end" fontSize="8.5" fill="currentColor" opacity="0.55">
          fora
        </text>
      </svg>
    </figure>
  );
}

function Rotulo({ x, y, children, fim = false }: { x: number; y: number; children: string; fim?: boolean }) {
  return (
    <text x={x} y={y} textAnchor={fim ? 'end' : 'start'} fontSize="8.5" fill="currentColor" opacity="0.6">
      {children}
    </text>
  );
}

/** A parede de fora sobe mais; a chapa entra na letra e apoia no degrau de dentro. */
function BatenteDentro() {
  return (
    <>
      <rect x={X_EXT} y={Y_BASE} width={200} height={10} fill="var(--color-peca-traseira)" />
      <rect x={X_EXT} y={Y_CHAPA} width={X_DEGRAU - X_EXT} height={Y_BASE - Y_CHAPA} fill="var(--color-peca-corpo)" />
      <rect x={X_EXT} y={Y_TOPO} width={X_CHAPA - X_EXT} height={Y_CHAPA - Y_TOPO} fill="var(--color-peca-bolsao)" />
      <rect x={X_CHAPA} y={Y_TOPO} width={120} height={Y_CHAPA - Y_TOPO} fill="var(--color-peca-chapa)" opacity="0.85" />
      <text x={236} y={Y_TOPO + 15} textAnchor="end" fontSize="9" fill="var(--color-peca-chapa-texto)" fontWeight="600">
        chapa
      </text>
      <rect x={X_CHAPA} y={Y_CHAPA} width={X_DEGRAU - X_CHAPA} height={6} fill="var(--color-peca-batente)" />
      <Rotulo x={X_DEGRAU + 6} y={Y_CHAPA + 16}>
        apoia aqui
      </Rotulo>
    </>
  );
}

/** O de dentro ao contrario: o batente sobe e passa da parede de fora. */
function BatenteFora() {
  return (
    <>
      <rect x={X_EXT} y={Y_BASE} width={200} height={10} fill="var(--color-peca-traseira)" />
      <rect x={X_EXT} y={Y_CHAPA} width={X_DEGRAU - X_EXT} height={Y_BASE - Y_CHAPA} fill="var(--color-peca-corpo)" />
      <rect x={X_CHAPA} y={Y_TOPO} width={X_DEGRAU - X_CHAPA} height={Y_CHAPA - Y_TOPO} fill="var(--color-peca-batente)" />
      <Rotulo x={X_DEGRAU + 6} y={Y_TOPO + 10}>
        batente sobe
      </Rotulo>
      <Rotulo x={X_CHAPA - 4} y={Y_CHAPA - 6} fim>
        degrau virado para fora
      </Rotulo>
    </>
  );
}
