/**
 * Ilustracao por secao (desenho nosso, em SVG), tingida pela cor filha da secao
 * (`--secao`, `--secao-2`). Fica no card e na pagina do produto enquanto nao ha foto,
 * e nos blocos de secao da home. Decorativa: aria-hidden.
 */
import type { CSSProperties } from 'react';
import type { Secao } from '@/lib/marketplace/tipos';

const c1: CSSProperties = { fill: 'var(--secao)' };
const c2: CSSProperties = { fill: 'var(--secao-2)' };
const tinta: CSSProperties = { fill: 'var(--secao-forte)' };
const branco: CSSProperties = { fill: '#ffffff' };
const sombra: CSSProperties = { fill: 'var(--secao-forte)', opacity: 0.12 };

function Desenho({ secao }: { secao: Secao }) {
  switch (secao) {
    case 'casa':
      return (
        <g>
          <ellipse cx="120" cy="164" rx="70" ry="8" style={sombra} />
          {/* vaso com folhas */}
          <path d="M92 104 h44 l-6 58 h-32 z" style={c1} />
          <rect x="88" y="98" width="52" height="10" rx="4" style={tinta} opacity=".85" />
          <path d="M114 98 C 100 70, 78 66, 70 46 C 92 48, 110 64, 114 98 Z" style={c1} opacity=".7" />
          <path d="M114 98 C 122 66, 142 52, 160 48 C 152 70, 134 84, 114 98 Z" style={c1} />
          <path d="M114 98 C 112 74, 116 58, 122 40" stroke="var(--secao-forte)" strokeWidth="3" fill="none" opacity=".5" />
          {/* porta-retrato */}
          <rect x="150" y="96" width="44" height="58" rx="5" style={c2} />
          <rect x="157" y="104" width="30" height="34" rx="2" style={branco} />
          <circle cx="172" cy="118" r="7" style={c1} opacity=".6" />
        </g>
      );
    case 'colecionaveis':
      return (
        <g>
          <ellipse cx="120" cy="168" rx="72" ry="7" style={sombra} />
          <path d="M120 22 L170 160 H70 Z" style={c2} opacity=".18" />
          {/* pedestal em degraus */}
          <rect x="70" y="146" width="100" height="16" rx="3" style={tinta} />
          <rect x="82" y="132" width="76" height="16" rx="3" style={c1} />
          {/* peca de colecao: gema facetada */}
          <path d="M120 60 L148 84 L120 128 L92 84 Z" style={c1} />
          <path d="M120 60 L148 84 H92 Z" style={c2} />
          <path d="M120 60 L106 84 L120 128 Z" style={branco} opacity=".25" />
          <circle cx="160" cy="58" r="4" style={c2} />
          <circle cx="78" cy="70" r="3" style={c2} />
        </g>
      );
    case 'empresa':
      return (
        <g>
          <ellipse cx="120" cy="166" rx="74" ry="7" style={sombra} />
          {/* letra caixa com profundidade */}
          <path d="M60 150 L88 62 L116 150 M70 122 H106" fill="none" stroke="var(--secao-forte)" strokeOpacity=".25" strokeWidth="20" strokeLinejoin="round" transform="translate(6 6)" />
          <path d="M60 150 L88 62 L116 150 M70 122 H106" fill="none" stroke="var(--secao)" strokeWidth="20" strokeLinejoin="round" />
          {/* placa com QR */}
          <rect x="132" y="74" width="64" height="80" rx="8" style={branco} stroke="var(--secao-borda)" strokeWidth="2" />
          {[[140, 82], [174, 82], [140, 116]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="16" height="16" rx="2" fill="none" stroke="var(--secao)" strokeWidth="4" />)}
          {[[176, 118], [186, 128], [176, 138], [160, 140], [186, 108]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="7" height="7" style={c1} />)}
        </g>
      );
    case 'presentes':
      return (
        <g>
          <ellipse cx="120" cy="166" rx="70" ry="7" style={sombra} />
          {/* caixa de presente com laco */}
          <rect x="74" y="92" width="92" height="70" rx="6" style={c1} />
          <rect x="68" y="78" width="104" height="20" rx="5" style={c1} />
          <rect x="112" y="78" width="16" height="84" style={c2} />
          <path d="M120 78 C 100 50, 76 58, 92 76 Z" style={c2} />
          <path d="M120 78 C 140 50, 164 58, 148 76 Z" style={c2} />
          {/* etiqueta */}
          <path d="M168 104 l20 -6 l8 28 l-20 6 z" style={branco} stroke="var(--secao-forte)" strokeOpacity=".3" strokeWidth="2" />
          <circle cx="180" cy="106" r="2.5" style={tinta} />
          <circle cx="58" cy="60" r="4" style={c2} />
          <circle cx="186" cy="56" r="5" style={c1} opacity=".6" />
        </g>
      );
    case 'sensoriais':
      return (
        <g>
          <ellipse cx="120" cy="166" rx="72" ry="7" style={sombra} />
          {/* segmentos articulados em arco */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = Math.PI * (1.05 - i * 0.2), x = 120 + 62 * Math.cos(a), y = 132 - 62 * Math.sin(a);
            return <rect key={i} x={x - 15} y={y - 15} width="30" height="30" rx="10" style={i % 2 ? c2 : c1} transform={`rotate(${(-a * 180) / Math.PI + 90} ${x} ${y})`} />;
          })}
          {/* peca de girar */}
          <circle cx="120" cy="126" r="22" style={branco} stroke="var(--secao-borda)" strokeWidth="3" />
          <circle cx="120" cy="126" r="9" style={c1} />
        </g>
      );
  }
}

export function ArteSecao({ secao, className }: { secao: Secao; className?: string }) {
  return (
    <svg viewBox="0 0 240 200" className={className} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', width: '100%', height: '100%', background: 'var(--secao-fundo)' }}>
      <Desenho secao={secao} />
    </svg>
  );
}
