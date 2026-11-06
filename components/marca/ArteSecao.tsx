/**
 * Ilustracao por secao (desenho nosso, em SVG), tingida pela cor filha da secao
 * (`--secao`, `--secao-2`). Fica no card e na pagina do produto enquanto nao ha foto,
 * e nos blocos de secao da home. Decorativa: aria-hidden.
 */
import { cx } from '@/components/ui/cx';
import type { Secao } from '@/lib/marketplace/tipos';

const c1 = 'fill-secao';
const c2 = 'fill-secao-2';
const tinta = 'fill-secao-forte';
const branco = 'fill-white';
const sombra = 'fill-secao-forte opacity-[0.12]';

function Desenho({ secao }: { secao: Secao }) {
  switch (secao) {
    case 'decoracao':
      return (
        <g>
          <ellipse cx="120" cy="164" rx="70" ry="8" className={sombra} />
          {/* vaso com folhas */}
          <path d="M92 104 h44 l-6 58 h-32 z" className={c1} />
          <rect x="88" y="98" width="52" height="10" rx="4" className={tinta} opacity=".85" />
          <path d="M114 98 C 100 70, 78 66, 70 46 C 92 48, 110 64, 114 98 Z" className={c1} opacity=".7" />
          <path d="M114 98 C 122 66, 142 52, 160 48 C 152 70, 134 84, 114 98 Z" className={c1} />
          <path d="M114 98 C 112 74, 116 58, 122 40" className="stroke-secao-forte" strokeWidth="3" fill="none" opacity=".5" />
          {/* porta-retrato */}
          <rect x="150" y="96" width="44" height="58" rx="5" className={c2} />
          <rect x="157" y="104" width="30" height="34" rx="2" className={branco} />
          <circle cx="172" cy="118" r="7" className={c1} opacity=".6" />
        </g>
      );
    case 'natal':
      return (
        <g>
          <ellipse cx="120" cy="166" rx="66" ry="7" className={sombra} />
          {/* arvore em camadas com estrela */}
          <path d="M120 40 L160 96 H80 Z" className={c1} />
          <path d="M120 70 L170 128 H70 Z" className={c1} />
          <path d="M120 100 L178 158 H62 Z" className={c2} />
          <rect x="112" y="156" width="16" height="10" className={tinta} />
          <path d="M120 22 l5 11 l12 1 l-9 8 l3 12 l-11 -7 l-11 7 l3 -12 l-9 -8 l12 -1 z" className={branco} />
          {[[100, 112], [140, 120], [118, 140], [92, 146], [150, 148]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="5" className={branco} opacity=".9" />)}
        </g>
      );
    case 'cozinha':
      return (
        <g>
          <ellipse cx="120" cy="166" rx="72" ry="7" className={sombra} />
          {/* caneca com vapor */}
          <rect x="62" y="96" width="62" height="64" rx="10" className={c1} />
          <path d="M124 110 h12 a14 14 0 0 1 0 28 h-12" fill="none" className="stroke-secao" strokeWidth="9" />
          <path d="M80 86 c-8 -12 8 -18 0 -30 M100 86 c-8 -12 8 -18 0 -30" fill="none" className="stroke-secao-forte" strokeOpacity=".35" strokeWidth="4" strokeLinecap="round" />
          {/* colher e espatula num suporte */}
          <rect x="150" y="112" width="40" height="48" rx="6" className={c2} />
          <path d="M162 112 V58" className="stroke-secao-forte" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="162" cy="52" rx="8" ry="11" className={tinta} />
          <path d="M178 112 V64" className="stroke-secao-forte" strokeWidth="5" strokeLinecap="round" />
          <rect x="170" y="44" width="16" height="22" rx="3" className={tinta} />
        </g>
      );
    case 'organizacao':
      return (
        <g>
          <ellipse cx="120" cy="166" rx="74" ry="7" className={sombra} />
          {/* gaveteiro com divisorias */}
          <rect x="58" y="70" width="124" height="90" rx="8" className={c1} />
          <rect x="66" y="80" width="108" height="34" rx="4" className={branco} opacity=".9" />
          <rect x="66" y="118" width="108" height="34" rx="4" className={branco} opacity=".9" />
          <path d="M102 80 V114 M138 80 V114 M120 118 V152" className="stroke-secao" strokeWidth="4" />
          <rect x="112" y="96" width="16" height="5" rx="2" className={tinta} />
          <rect x="112" y="134" width="16" height="5" rx="2" className={tinta} />
          {/* potes em cima */}
          <rect x="72" y="46" width="26" height="24" rx="4" className={c2} />
          <rect x="106" y="40" width="22" height="30" rx="4" className={c2} opacity=".8" />
          <rect x="136" y="50" width="30" height="20" rx="4" className={c2} />
        </g>
      );
    case 'escritorio':
      return (
        <g>
          <ellipse cx="120" cy="166" rx="74" ry="7" className={sombra} />
          {/* suporte de celular */}
          <path d="M60 160 L84 92 H100 L86 160 Z" className={c2} />
          <rect x="74" y="54" width="40" height="72" rx="7" transform="rotate(-14 94 90)" className={tinta} />
          <rect x="79" y="60" width="30" height="58" rx="3" transform="rotate(-14 94 90)" className={c1} opacity=".55" />
          {/* controle de video game */}
          <path d="M130 112 c0 -16 10 -22 24 -22 h22 c14 0 24 6 24 22 c0 22 -6 40 -18 40 c-10 0 -12 -14 -22 -14 c-10 0 -12 14 -22 14 c-12 0 -18 -18 -18 -40 Z" className={c1} />
          <path d="M150 108 v16 M142 116 h16" className="stroke-secao-forte" strokeWidth="5" strokeLinecap="round" />
          <circle cx="182" cy="110" r="5" className={branco} />
          <circle cx="192" cy="120" r="5" className={branco} />
        </g>
      );
    case 'infantil':
      return (
        <g>
          <ellipse cx="120" cy="166" rx="66" ry="7" className={sombra} />
          {/* mobile de bebe: lua, nuvem e estrelas */}
          <path d="M60 34 H180" className="stroke-secao-forte" strokeOpacity=".4" strokeWidth="4" strokeLinecap="round" />
          <path d="M80 34 V70 M120 34 V96 M160 34 V62" className="stroke-secao-forte" strokeOpacity=".3" strokeWidth="2" />
          <path d="M70 70 a22 22 0 1 0 22 26 a16 16 0 1 1 -22 -26 Z" className={c1} />
          <path d="M96 118 a16 16 0 0 1 24 -14 a18 18 0 0 1 32 8 a14 14 0 0 1 -2 28 h-50 a12 12 0 0 1 -4 -22 Z" className={branco} />
          <path d="M160 62 l5 10 l11 1 l-8 7 l3 11 l-11 -6 l-10 6 l3 -11 l-8 -7 l11 -1 z" className={c2} />
          {/* bloquinho */}
          <rect x="72" y="134" width="30" height="30" rx="5" className={c2} />
          <rect x="146" y="140" width="24" height="24" rx="5" className={c1} />
        </g>
      );
    case 'empresa':
      return (
        <g>
          <ellipse cx="120" cy="166" rx="74" ry="7" className={sombra} />
          {/* letra caixa com profundidade */}
          <path d="M60 150 L88 62 L116 150 M70 122 H106" fill="none" className="stroke-secao-forte" strokeOpacity=".25" strokeWidth="20" strokeLinejoin="round" transform="translate(6 6)" />
          <path d="M60 150 L88 62 L116 150 M70 122 H106" fill="none" className="stroke-secao" strokeWidth="20" strokeLinejoin="round" />
          {/* placa com QR */}
          <rect x="132" y="74" width="64" height="80" rx="8" className="fill-white stroke-secao-borda" strokeWidth="2" />
          {[[140, 82], [174, 82], [140, 116]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="16" height="16" rx="2" fill="none" className="stroke-secao" strokeWidth="4" />)}
          {[[176, 118], [186, 128], [176, 138], [160, 140], [186, 108]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="7" height="7" className={c1} />)}
        </g>
      );
    case 'presentes':
      return (
        <g>
          <ellipse cx="120" cy="166" rx="70" ry="7" className={sombra} />
          {/* caixa de presente com laco */}
          <rect x="74" y="92" width="92" height="70" rx="6" className={c1} />
          <rect x="68" y="78" width="104" height="20" rx="5" className={c1} />
          <rect x="112" y="78" width="16" height="84" className={c2} />
          <path d="M120 78 C 100 50, 76 58, 92 76 Z" className={c2} />
          <path d="M120 78 C 140 50, 164 58, 148 76 Z" className={c2} />
          {/* etiqueta */}
          <path d="M168 104 l20 -6 l8 28 l-20 6 z" className="fill-white stroke-secao-forte" strokeOpacity=".3" strokeWidth="2" />
          <circle cx="180" cy="106" r="2.5" className={tinta} />
          <circle cx="58" cy="60" r="4" className={c2} />
          <circle cx="186" cy="56" r="5" className={c1} opacity=".6" />
        </g>
      );
    case 'sensoriais':
      return (
        <g>
          <ellipse cx="120" cy="166" rx="72" ry="7" className={sombra} />
          {/* segmentos articulados em arco */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = Math.PI * (1.05 - i * 0.2), x = 120 + 62 * Math.cos(a), y = 132 - 62 * Math.sin(a);
            return <rect key={i} x={x - 15} y={y - 15} width="30" height="30" rx="10" className={i % 2 ? c2 : c1} transform={`rotate(${(-a * 180) / Math.PI + 90} ${x} ${y})`} />;
          })}
          {/* peca de girar */}
          <circle cx="120" cy="126" r="22" className="fill-white stroke-secao-borda" strokeWidth="3" />
          <circle cx="120" cy="126" r="9" className={c1} />
        </g>
      );
  }
}

export function ArteSecao({ secao, className }: { secao: Secao; className?: string }) {
  return (
    <svg viewBox="0 0 240 200" className={cx('block size-full bg-secao-fundo', className)} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice" >
      <Desenho secao={secao} />
    </svg>
  );
}
