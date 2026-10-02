/**
 * Figuras desenhadas por formula (nada de arte de terceiros): contornos de plaquinha,
 * icones simples e enfeites. Todas centradas em (0, 0); `ajustarLargura` muda o tamanho.
 */
import { buildRegion, diffRegion, regionBounds, scaleRegion, strokeToRegion, translateRegion, type Pt, type Region } from '../geom/region';
import { circulo, retanguloArredondado, unir } from './formas';

const poligono = (pts: Pt[]): Region => buildRegion([pts]);

/** Elipse de largura `w` e altura `h`. */
export function elipse(w: number, h: number, lados = 96): Region {
  const pts: Pt[] = [];
  for (let i = 0; i < lados; i++) {
    const a = (2 * Math.PI * i) / lados;
    pts.push({ x: (w / 2) * Math.cos(a), y: (h / 2) * Math.sin(a) });
  }
  return poligono(pts);
}

/** Elipse com a borda em ondas (`ondas` cristas de amplitude `amp`). */
export function ovalOndulada(w: number, h: number, ondas = 14, amp = 0.045, lados = 240): Region {
  const pts: Pt[] = [];
  for (let i = 0; i < lados; i++) {
    const a = (2 * Math.PI * i) / lados;
    const k = 1 + amp * Math.cos(ondas * a);
    pts.push({ x: (w / 2) * k * Math.cos(a), y: (h / 2) * k * Math.sin(a) });
  }
  return poligono(pts);
}

/** Peixe de largura `w`: corpo oval, rabo em leque a direita. */
export function peixe(w: number): Region {
  const corpo = elipse(w * 0.72, w * 0.46);
  const rabo = poligono([
    { x: w * 0.18, y: 0 },
    { x: w * 0.5, y: w * 0.2 },
    { x: w * 0.44, y: 0 },
    { x: w * 0.5, y: -w * 0.2 },
  ]);
  const r = unir([translateRegion(corpo, -w * 0.12, 0), rabo]);
  const b = regionBounds(r);
  return translateRegion(r, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2);
}

/** Osso de largura `w`: haste com duas bolinhas em cada ponta. */
export function osso(w: number): Region {
  const h = w * 0.42, r = h * 0.3;
  const haste = retanguloArredondado(0, 0, w - 2 * r, h * 0.55, h * 0.1);
  const bolas = [-1, 1].flatMap((sx) => [-1, 1].map((sy) => circulo(sx * (w / 2 - r), sy * (h / 2 - r), r, 48)));
  return unir([haste, ...bolas]);
}

/** Pata (almofada + 4 dedos), largura `w`. */
export function pata(w: number): Region {
  const s = w / 2;
  const r = unir([
    translateRegion(elipse(s * 1.15, s * 0.95, 48), 0, -s * 0.25),
    circulo(-s * 0.62, s * 0.55, s * 0.24, 32),
    circulo(-s * 0.22, s * 0.88, s * 0.25, 32),
    circulo(s * 0.22, s * 0.88, s * 0.25, 32),
    circulo(s * 0.62, s * 0.55, s * 0.24, 32),
  ]);
  const b = regionBounds(r);
  return translateRegion(r, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2);
}

/** Cabeca de gato (circulo + duas orelhas), largura `w`. */
export function gato(w: number): Region {
  const r = w * 0.4;
  const orelha = (sx: number) => poligono([
    { x: sx * r * 0.95, y: r * 0.2 },
    { x: sx * r * 0.85, y: r * 1.25 },
    { x: sx * r * 0.2, y: r * 0.75 },
  ]);
  const g = unir([circulo(0, 0, r, 64), orelha(-1), orelha(1)]);
  const b = regionBounds(g);
  return translateRegion(g, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2);
}

/** Poligono regular de `n` lados inscrito em largura `w`. */
export function regular(n: number, w: number, giro = Math.PI / 2): Region {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = giro + (2 * Math.PI * i) / n;
    pts.push({ x: (w / 2) * Math.cos(a), y: (w / 2) * Math.sin(a) });
  }
  return poligono(pts);
}

/** Trapezio: base de cima `w1`, de baixo `w2`, altura `h`, centrado. */
export function trapezio(w1: number, w2: number, h: number): Region {
  return poligono([
    { x: -w2 / 2, y: -h / 2 },
    { x: w2 / 2, y: -h / 2 },
    { x: w1 / 2, y: h / 2 },
    { x: -w1 / 2, y: h / 2 },
  ]);
}

/**
 * Floco de neve de 6 bracos, largura `w`, linhas de espessura `e`: cada braco tem um
 * par de galhos em V; `ramos` muda quantos pares (1 a 3).
 */
export function floco(w: number, e: number, ramos = 2): Region {
  const R = w / 2 - e / 2;
  const linhas: { pts: Pt[]; closed: boolean }[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k + Math.PI / 2;
    const u = { x: Math.cos(a), y: Math.sin(a) };
    linhas.push({ pts: [{ x: 0, y: 0 }, { x: R * u.x, y: R * u.y }], closed: false });
    for (let j = 1; j <= ramos; j++) {
      const t = 0.3 + (0.55 * j) / (ramos + 1);
      const base = { x: R * t * u.x, y: R * t * u.y };
      const comp = R * 0.32 * (1 - t * 0.5);
      for (const s of [-1, 1]) {
        const b = a + (s * Math.PI) / 4;
        linhas.push({ pts: [base, { x: base.x + comp * Math.cos(b), y: base.y + comp * Math.sin(b) }], closed: false });
      }
    }
  }
  return unir([strokeToRegion(linhas, e, true), circulo(0, 0, e * 1.6, 32)]);
}

/** Espelha em X (texto do verso, que se le olhando por baixo). */
export const espelharX = (r: Region): Region => scaleRegion(r, -1, 1);

/** Furo redondo em (x, y). */
export const furo = (r: Region, x: number, y: number, d: number): Region => diffRegion(r, circulo(x, y, d / 2, 40));
