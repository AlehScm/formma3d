/**
 * Relevo em volta de cilindro, em camadas (como a impressora deposita): um desenho no
 * plano desenrolado -- u = comprimento em volta (0 a 2*pi*R), z = altura -- vira, em cada
 * camada, um contorno que sai `h` mm para fora (h > 0) ou entra (h < 0) onde o desenho
 * passa. Tambem rosca: o raio de cada camada varia com o angulo.
 */
import { buildRegion, diffRegion, type Pt, type Region } from '../geom/region';
import { circulo } from './formas';
import type { Camada } from './tipos';

/** Trechos de u em que a linha z = `z` cruza o desenho (par-impar). */
function trechos(desenho: Region, z: number): [number, number][] {
  const xs: number[] = [];
  for (const p of desenho) {
    for (const anel of [p.outer, ...p.holes]) {
      for (let i = 0; i < anel.length; i++) {
        const a = anel[i]!, b = anel[(i + 1) % anel.length]!;
        if ((a.y <= z) !== (b.y <= z)) xs.push(a.x + ((z - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
    }
  }
  xs.sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (let k = 0; k + 1 < xs.length; k += 2) if (xs[k + 1]! - xs[k]! > 1e-4) out.push([xs[k]!, xs[k + 1]!]);
  return out;
}

/**
 * Contorno de uma camada: circulo de raio R, com o raio R + h nos angulos dos `trechos`
 * (em u). Os degraus sao radiais, nas bordas exatas do desenho.
 */
function anelComRelevo(R: number, h: number, tr: [number, number][], lados: number): Pt[] {
  // Trechos em angulo, dentro de [0, 2*pi), juntando os que se tocam.
  const ang: [number, number][] = [];
  for (const [u0, u1] of tr) {
    let a0 = u0 / R, a1 = u1 / R;
    if (a1 - a0 >= 2 * Math.PI - 1e-9) { ang.length = 0; ang.push([0, 2 * Math.PI]); break; }
    a0 = ((a0 % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    a1 = a0 + (u1 - u0) / R;
    if (a1 > 2 * Math.PI) { ang.push([a0, 2 * Math.PI], [0, a1 - 2 * Math.PI]); } else ang.push([a0, a1]);
  }
  ang.sort((a, b) => a[0] - b[0]);
  const juntos: [number, number][] = [];
  for (const t of ang) {
    const u = juntos.at(-1);
    if (u && t[0] <= u[1] + 1e-9) u[1] = Math.max(u[1], t[1]);
    else juntos.push([t[0], t[1]]);
  }
  const dentro = (a: number) => juntos.some(([x, y]) => a > x && a < y);
  // Angulos: a grade regular + as bordas dos trechos (com o degrau radial).
  const marcas = new Set<number>();
  for (let i = 0; i < lados; i++) marcas.add((2 * Math.PI * i) / lados);
  for (const [x, y] of juntos) { marcas.add(x % (2 * Math.PI)); marcas.add(y % (2 * Math.PI)); }
  const lista = [...marcas].sort((a, b) => a - b);
  const pts: Pt[] = [];
  // Raio do poligono regular de `lados` (o mesmo do `circulo`) no angulo a: os pontos no
  // raio R caem na corda, e o cilindro liso casa com este contorno sem frestas.
  const passoA = (2 * Math.PI) / lados;
  const naCorda = (a: number, r: number) => (r * Math.cos(passoA / 2)) / Math.cos((((a % passoA) + passoA) % passoA) - passoA / 2);
  const ponto = (a: number, r: number) => {
    const rr = r === R ? naCorda(a, R) : r;
    pts.push({ x: rr * Math.cos(a), y: rr * Math.sin(a) });
  };
  for (const a of lista) {
    const antes = dentro(a - 1e-7), depois = dentro(a + 1e-7);
    if (antes !== depois) {
      ponto(a, antes ? R + h : R);
      ponto(a, depois ? R + h : R);
    } else ponto(a, antes ? R + h : R);
  }
  return pts;
}

export interface OpcoesRelevo {
  /** Raio do cilindro liso. */
  R: number;
  /** Desenho no plano desenrolado (u, z). */
  desenho: Region;
  /** Relevo: > 0 para fora, < 0 para dentro. */
  h: number;
  z0: number;
  z1: number;
  /** Furo no meio (regiao tirada de toda camada). */
  furo?: Region;
  passo?: number;
  lados?: number;
}

/** Camadas de um cilindro com relevo. Camadas seguidas iguais (sem desenho) se juntam. */
export function cilindroComRelevo(o: OpcoesRelevo): Camada[] {
  const passo = o.passo ?? 0.2, lados = o.lados ?? 180;
  const n = Math.max(1, Math.round((o.z1 - o.z0) / passo));
  const camadas: Camada[] = [];
  let ultima = '';
  for (let i = 0; i < n; i++) {
    const a = o.z0 + ((o.z1 - o.z0) * i) / n, b = o.z0 + ((o.z1 - o.z0) * (i + 1)) / n;
    const tr = trechos(o.desenho, (a + b) / 2);
    const chave = tr.map(([x, y]) => `${x.toFixed(3)}:${y.toFixed(3)}`).join('|');
    if (chave === ultima && camadas.length) { camadas.at(-1)!.z1 = b; continue; }
    ultima = chave;
    let regiao: Region = tr.length ? buildRegion([anelComRelevo(o.R, o.h, tr, lados)]) : circulo(0, 0, o.R, lados);
    if (o.furo?.length) regiao = diffRegion(regiao, o.furo);
    camadas.push({ region: regiao, z0: a, z1: b });
  }
  return camadas;
}

/**
 * Rosca (externa ou interna) de passo `passo`: em cada camada, o raio varia com o angulo
 * num perfil trapezoidal de altura `prof`. `externa`: o raio de base e o menor (corpo);
 * interna: e o furo da tampa (com a folga ja somada pelo chamador).
 */
export function perfilDeRosca(rBase: number, prof: number, passoRosca: number, z: number, lados = 120): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < lados; i++) {
    const a = (2 * Math.PI * i) / lados;
    // Fase da helice neste angulo e altura: 0..1 ao longo de um passo.
    const f = (((z / passoRosca - a / (2 * Math.PI)) % 1) + 1) % 1;
    // Trapezio: sobe 40%, plato 10%, desce 40%, vale 10%. Com profundidade de ate 40% do
    // passo, os flancos ficam em 45 graus ou menos (imprime sem suporte).
    const t = f < 0.4 ? f / 0.4 : f < 0.5 ? 1 : f < 0.9 ? 1 - (f - 0.5) / 0.4 : 0;
    const r = rBase + prof * t;
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  return pts;
}

/** Camadas de um trecho com rosca externa (cheio por dentro ate `furo`). */
export function roscaExterna(rBase: number, prof: number, passoRosca: number, z0: number, z1: number, furo: Region = [], passo = 0.2): Camada[] {
  const n = Math.max(1, Math.round((z1 - z0) / passo)), out: Camada[] = [];
  for (let i = 0; i < n; i++) {
    const a = z0 + ((z1 - z0) * i) / n, b = z0 + ((z1 - z0) * (i + 1)) / n;
    const r = buildRegion([perfilDeRosca(rBase, prof, passoRosca, (a + b) / 2)]);
    out.push({ region: furo.length ? diffRegion(r, furo) : r, z0: a, z1: b });
  }
  return out;
}

/** Camadas de um trecho com rosca interna: anel de raio externo `rFora` com o furo roscado. */
export function roscaInterna(rFora: number, rBase: number, prof: number, passoRosca: number, z0: number, z1: number, passo = 0.2): Camada[] {
  const n = Math.max(1, Math.round((z1 - z0) / passo)), out: Camada[] = [];
  for (let i = 0; i < n; i++) {
    const a = z0 + ((z1 - z0) * i) / n, b = z0 + ((z1 - z0) * (i + 1)) / n;
    out.push({ region: diffRegion(circulo(0, 0, rFora, 120), buildRegion([perfilDeRosca(rBase, prof, passoRosca, (a + b) / 2)])), z0: a, z1: b });
  }
  return out;
}
