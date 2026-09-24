import type { Pt } from '../geom/region';

// Matriz do PDF: [a, b, c, d, e, f] equivale a [[a b 0], [c d 0], [e f 1]],
// com o ponto tratado como vetor-linha.

export type Mat = readonly [number, number, number, number, number, number];

export const IDENT: Mat = [1, 0, 0, 1, 0, 0];

/** Pontos (1/72") -> milimetros. */
export const PT_TO_MM = 25.4 / 72;

/**
 * Compoe duas matrizes: aplica `inner` PRIMEIRO, depois `outer`.
 * O operador `cm` do PDF concatena assim -- `ctm = mul(ctm, novaMatriz)` --
 * e inverter essa ordem desloca todo o desenho sem gerar erro nenhum.
 */
export function mul(outer: Mat, inner: Mat): Mat {
  const [a1, b1, c1, d1, e1, f1] = outer;
  const [a2, b2, c2, d2, e2, f2] = inner;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export function apply(m: Mat, x: number, y: number): Pt {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}

/** Fator de escala isotropico equivalente: converte largura de traco para mm. */
export function scaleOf(m: Mat): number {
  return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
}

/**
 * Matriz base da pagina: leva o espaco de usuario do PDF (pontos, origem no canto
 * da caixa da pagina) para milimetros com origem em (0,0).
 *
 * O Y do PDF ja cresce para cima, igual ao nosso Pt -- nao ha flip aqui, ao
 * contrario do caminho de fonte. `getOperatorList` tambem nao aplica /Rotate,
 * entao uma prancheta girada traria o desenho deitado se nao tratassemos aqui.
 */
export function baseCTM(view: readonly [number, number, number, number], rotate = 0): Mat {
  const [x0, y0, x1, y1] = view;
  const k = PT_TO_MM;
  const base: Mat = [k, 0, 0, k, -k * x0, -k * y0];
  const w = (x1 - x0) * k;
  const h = (y1 - y0) * k;
  const r = ((rotate % 360) + 360) % 360;
  if (r === 90) return mul([0, -1, 1, 0, 0, w], base);
  if (r === 180) return mul([-1, 0, 0, -1, w, h], base);
  if (r === 270) return mul([0, 1, -1, 0, h, 0], base);
  return base;
}
