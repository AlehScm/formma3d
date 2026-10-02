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

/**
 * Textura que cobre a caixa `b`: listras diagonais, pontos alternados ou curva de
 * Hilbert (linha continua que enche o plano), com passo ~`passo` mm.
 */
export function textura(tipo: string, b: { minX: number; minY: number; maxX: number; maxY: number }, passo = 3, linha = 1): Region {
  const w = b.maxX - b.minX, h = b.maxY - b.minY, L = Math.max(w, h);
  if (tipo === 'pontos') {
    const pts: Region[] = [];
    for (let j = 0, y = b.minY; y <= b.maxY + passo; y += passo * 0.87, j++) {
      for (let x = b.minX + (j % 2 ? passo / 2 : 0); x <= b.maxX + passo; x += passo) pts.push(circulo(x, y, linha * 0.8, 16));
    }
    return unir(pts);
  }
  if (tipo === 'hilbert') {
    // Ordem que deixa o passo da curva perto de `passo`.
    const ordem = Math.max(1, Math.min(7, Math.round(Math.log2(L / passo))));
    const n = 2 ** ordem, d = L / n;
    const pts: Pt[] = [];
    for (let i = 0; i < n * n; i++) {
      let [x, y] = [0, 0], t = i;
      for (let s = 1; s < n; s *= 2) {
        const rx = 1 & (t / 2), ry = 1 & (t ^ rx);
        if (!ry) { if (rx) { x = s - 1 - x; y = s - 1 - y; } [x, y] = [y, x]; }
        x += s * rx; y += s * ry; t = Math.floor(t / 4);
      }
      pts.push({ x: b.minX + (x + 0.5) * d, y: b.minY + (y + 0.5) * d });
    }
    return strokeToRegion([{ pts, closed: false }], Math.min(linha, d * 0.45), false, 'miter');
  }
  // Listras diagonais.
  const faixas: { pts: Pt[]; closed: boolean }[] = [];
  for (let c = -h; c <= w + h; c += passo) faixas.push({ pts: [{ x: b.minX + c, y: b.minY }, { x: b.minX + c + h, y: b.maxY }], closed: false });
  return strokeToRegion(faixas, linha, false);
}

/**
 * Arabesco (desenho nosso): onda suave de largura `w` com uma espiral enrolada em cada
 * ponta, traco de espessura `e`. Centrado.
 */
export function arabesco(w: number, e: number): Region {
  const h = w * 0.16, pts: Pt[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120, x = -w * 0.36 + w * 0.72 * t;
    pts.push({ x, y: h * 0.5 * Math.sin(2 * Math.PI * t) });
  }
  const espiral = (cx: number, lado: number): Pt[] => {
    const r0 = w * 0.045, q: Pt[] = [];
    for (let i = 0; i <= 80; i++) {
      const t = i / 80, a = Math.PI * 1.75 * t * 2, r = r0 * (1 - 0.78 * t);
      q.push({ x: cx + lado * (r0 - r * Math.cos(a)), y: r * Math.sin(a) * -lado });
    }
    return q;
  };
  const curvas = [{ pts, closed: false }, { pts: espiral(w * 0.36, 1), closed: false }, { pts: espiral(-w * 0.36, -1), closed: false }];
  const r = strokeToRegion(curvas, e, true);
  const b = regionBounds(r);
  return translateRegion(r, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2);
}
