'use client';

/**
 * Arte de reserva por categoria (desenho nosso, em SVG), para o card ou a pagina do
 * produto enquanto nao ha foto. Decorativa: aria-hidden.
 */
import { useId } from 'react';
import type { Categoria } from '@/lib/marketplace/tipos';

const FUNDO: Record<Categoria, [string, string]> = {
  letreiros: ['#e8f6ff', '#cfe9ff'],
  placas: ['#eef4ff', '#d9e6ff'],
  personalizados: ['#eafaf6', '#cdf1e6'],
  decoracao: ['#fff4e8', '#ffe3c4'],
  cozinha: ['#fff0f3', '#ffd6df'],
  brinquedos: ['#f4efff', '#e2d6ff'],
  utilidades: ['#eef2f6', '#dde5ee'],
};

function Desenho({ categoria, grad }: { categoria: Categoria; grad: string }) {
  const a = `url(#${grad})`, s = '#091a34';
  switch (categoria) {
    case 'letreiros':
      return (
        <g>
          <rect x="54" y="44" width="132" height="116" rx="10" fill="#fff" stroke={s} strokeOpacity=".1" strokeWidth="2" />
          <path d="M84 146 L120 58 L156 146 M97 116 H143" fill="none" stroke={s} strokeOpacity=".22" strokeWidth="24" strokeLinejoin="round" transform="translate(7 7)" />
          <path d="M84 146 L120 58 L156 146 M97 116 H143" fill="none" stroke={a} strokeWidth="24" strokeLinejoin="round" />
          <circle cx="66" cy="56" r="3.5" fill={s} fillOpacity=".25" />
          <circle cx="174" cy="56" r="3.5" fill={s} fillOpacity=".25" />
        </g>
      );
    case 'placas':
      return (
        <g>
          <rect x="58" y="52" width="124" height="104" rx="14" fill="#fff" stroke={s} strokeOpacity=".12" strokeWidth="2" />
          {[[78, 70], [130, 70], [78, 116]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="26" height="26" rx="3" fill="none" stroke={a} strokeWidth="7" />)}
          {[[130, 118], [148, 118], [130, 136], [156, 136], [148, 100]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="10" height="10" fill={a} />)}
        </g>
      );
    case 'personalizados':
      return (
        <g>
          <circle cx="76" cy="78" r="16" fill="none" stroke={s} strokeOpacity=".35" strokeWidth="6" />
          <rect x="70" y="86" width="116" height="56" rx="28" fill={a} transform="rotate(-8 128 114)" />
          <text x="128" y="124" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontSize="26" fontWeight="900" fill="#fff" transform="rotate(-8 128 114)">ANA</text>
        </g>
      );
    case 'decoracao':
      return (
        <g>
          <path d="M120 48 l16 34 37 5 -27 26 7 37 -33 -18 -33 18 7 -37 -27 -26 37 -5z" fill={a} />
          <circle cx="68" cy="140" r="8" fill={s} fillOpacity=".2" />
          <circle cx="176" cy="60" r="6" fill={s} fillOpacity=".2" />
        </g>
      );
    case 'cozinha':
      return (
        <g>
          <path d="M120 152 C 60 112, 64 64, 98 62 C 110 61, 118 70, 120 78 C 122 70, 130 61, 142 62 C 176 64, 180 112, 120 152 Z" fill="none" stroke={a} strokeWidth="12" strokeLinejoin="round" />
          <path d="M120 136 C 82 108, 86 80, 104 80 C 112 80, 118 88, 120 94 C 122 88, 128 80, 136 80 C 154 80, 158 108, 120 136 Z" fill={s} fillOpacity=".1" />
        </g>
      );
    case 'brinquedos':
      return (
        <g>
          {[0, 60, 120, 180, 240, 300].map((r) => <ellipse key={r} cx="120" cy="70" rx="14" ry="26" fill={a} transform={`rotate(${r} 120 104)`} />)}
          <circle cx="120" cy="104" r="16" fill="#fff" stroke={s} strokeOpacity=".2" strokeWidth="3" />
        </g>
      );
    case 'utilidades':
      return (
        <g>
          <path d="M82 150 H158 L146 120 H94 Z" fill={s} fillOpacity=".15" />
          <rect x="108" y="56" width="24" height="70" rx="6" fill={a} />
          <rect x="78" y="64" width="22" height="58" rx="6" fill={a} opacity=".7" />
          <rect x="140" y="72" width="22" height="50" rx="6" fill={a} opacity=".5" />
        </g>
      );
  }
}

export function ArteCategoria({ categoria, className }: { categoria: Categoria; className?: string }) {
  const [c1, c2] = FUNDO[categoria];
  const id = useId().replace(/:/g, ''), grad = `g${id}`, fundo = `f${id}`;
  return (
    <svg viewBox="0 0 240 200" className={className} role="presentation" aria-hidden="true" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00a8f7" />
          <stop offset=".5" stopColor="#0877f4" />
          <stop offset="1" stopColor="#103cba" />
        </linearGradient>
        <linearGradient id={fundo} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="240" height="200" fill={`url(#${fundo})`} />
      <Desenho categoria={categoria} grad={grad} />
    </svg>
  );
}
