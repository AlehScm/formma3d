'use client';

import type { Apoio } from '@/lib/geom/modes';

/**
 * Desenho em corte do encaixe da chapa. A diferenca entre os tres apoios e quase
 * toda interna -- vista de fora a peca fica do mesmo tamanho -- entao sem este
 * desenho o usuario troca a opcao e parece que nada aconteceu.
 *
 * Corte lateral, metade da letra: a esquerda e o lado de fora da peca.
 */
export function CorteApoio({ apoio, comLabio }: { apoio: Apoio; comLabio: boolean }) {
  const W = 260;
  const H = 120;

  // Fatia vertical da parede, em coordenadas do desenho
  const xExt = 40; // face externa da peca
  const xInt = 120; // face interna (vao)
  const yTopo = 18;
  const yBase = 96;
  const yChapa = 42; // onde a chapa comeca

  const borda = 18; // largura da aba, exagerada de proposito para dar para ver
  const temBorda = apoio === 'fora' || apoio === 'dois';
  const temDegrau = apoio === 'dentro' || apoio === 'dois';
  const labio = comLabio && apoio === 'dois' ? 10 : 0;

  const xParede = temBorda ? xExt - borda : xExt;
  const xDegrau = temDegrau ? xInt + 14 : xInt;
  const xChapaIni = temDegrau ? xInt : xParede + 8;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Corte do apoio ${apoio}`}>
        {/* traseira */}
        <rect x={xParede} y={yBase} width={W - xParede - 20} height={10} fill="var(--color-peca-corpo)" opacity="0.5" />

        {/* parede / corpo */}
        <rect x={xParede} y={yChapa} width={xDegrau - xParede} height={yBase - yChapa} fill="var(--color-peca-corpo)" />

        {/* aba externa: o que o apoio 'fora' e 'canaleta' acrescentam */}
        {temBorda && (
          <rect x={xParede} y={yTopo + labio} width={borda} height={yChapa - yTopo - labio + 2} fill="var(--color-peca-borda)" />
        )}
        {/* labio: sobe acima da chapa e trava ela pela frente */}
        {labio > 0 && <rect x={xParede} y={yTopo} width={borda} height={labio} fill="var(--color-peca-borda)" opacity="0.65" />}

        {/* parede fina que cerca a chapa, quando nao ha aba */}
        {!temBorda && <rect x={xParede} y={yTopo} width={xChapaIni - xParede} height={yChapa - yTopo} fill="var(--color-peca-bolsao)" />}

        {/* a chapa */}
        <rect
          x={xChapaIni}
          y={yTopo + labio}
          width={W - 20 - xChapaIni}
          height={yChapa - yTopo - labio}
          fill="#7fb4ff"
          opacity="0.85"
        />
        <text x={W - 24} y={yTopo + labio + (yChapa - yTopo - labio) / 2 + 3} textAnchor="end" fontSize="9" fill="#0b2545" fontWeight="600">
          chapa
        </text>

        {/* degrau onde a chapa apoia */}
        {temDegrau && (
          <>
            <rect x={xInt} y={yChapa} width={xDegrau - xInt} height={6} fill="var(--color-peca-bolsao)" />
            <text x={xDegrau + 6} y={yChapa + 16} fontSize="8.5" fill="currentColor" opacity="0.6">
              apoia aqui
            </text>
          </>
        )}

        {/* indicacao do lado de fora */}
        <line x1={xParede} y1={yTopo - 8} x2={xParede} y2={yBase + 14} stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.35" />
        <text x={xParede - 4} y={yBase + 12} textAnchor="end" fontSize="8.5" fill="currentColor" opacity="0.55">
          fora
        </text>

        {/* medida da borda */}
        {temBorda && (
          <>
            <line x1={xParede} y1={H - 12} x2={xExt} y2={H - 12} stroke="var(--color-peca-borda)" strokeWidth="1.5" />
            <text x={(xParede + xExt) / 2} y={H - 3} textAnchor="middle" fontSize="8.5" fill="var(--color-peca-borda)" fontWeight="600">
              borda
            </text>
          </>
        )}
      </svg>
    </figure>
  );
}
