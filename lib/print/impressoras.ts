import { regionBounds, type Pt, type Region } from '../geom/region';

/**
 * Mesas das impressoras.
 *
 * As medidas NAO sao estimadas: vieram dos perfis do proprio Bambu Studio, em
 * `%APPDATA%\BambuStudio\system\BBL\machine\Bambu Lab <modelo> 0.4 nozzle.json`,
 * resolvendo a cadeia `inherits` ate `fdm_machine_common`:
 *
 *   X2D  printable_area 0x0 256x0 256x256 0x256   printable_height 261   2 bicos
 *   A2L  printable_area 0x0 330x0 330x320 0x320   printable_height 325   1 bico
 *
 * Iguais nos bicos 0.2 / 0.4 / 0.6 / 0.8, e `bed_exclude_area` vazio nas duas --
 * por isso a mesa e um retangulo cheio, sem cantos proibidos.
 */
export interface Impressora {
  id: string;
  nome: string;
  /** Mesa em mm. */
  x: number;
  y: number;
  /** Altura util em mm (`printable_height`). */
  z: number;
  bicos: number;
}

export const IMPRESSORAS: Impressora[] = [
  { id: 'x2d', nome: 'Bambu Lab X2D', x: 256, y: 256, z: 261, bicos: 2 },
  { id: 'a2l', nome: 'Bambu Lab A2L', x: 330, y: 320, z: 325, bicos: 1 },
];

export const MANUAL = 'manual';

export function acharImpressora(id: string): Impressora | null {
  return IMPRESSORAS.find((m) => m.id === id) ?? null;
}

export interface Veredito {
  cabe: boolean;
  /** Giro em graus que faz caber. 0 quando cabe reto. */
  giro: number;
  /** Sobra em cada eixo no melhor giro, em mm. Negativo = quanto passou. */
  sobraX: number;
  sobraY: number;
  /** Quanto a altura em Z passa do limite da maquina, em mm. 0 quando cabe. */
  excedeZ: number;
  /** Footprint da peca sem girar, para mostrar a medida que o usuario reconhece. */
  w: number;
  h: number;
}

/**
 * Casco convexo (Andrew monotone chain), em sentido anti-horario.
 *
 * Para saber se a peca cabe girada, so a casca importa: qualquer ponto interno
 * esta dentro do casco, e girar o casco da o mesmo bounding box que girar a peca
 * inteira. Com isso a varredura de angulo fica barata mesmo numa letra com
 * milhares de pontos.
 */
export function cascoConvexo(pts: Pt[]): Pt[] {
  if (pts.length < 3) return [...pts];
  const p = [...pts].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cruz = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const meia = (entrada: Pt[]): Pt[] => {
    const fora: Pt[] = [];
    for (const q of entrada) {
      while (fora.length >= 2 && cruz(fora[fora.length - 2]!, fora[fora.length - 1]!, q) <= 0) fora.pop();
      fora.push(q);
    }
    fora.pop(); // o ultimo repete no outro lado
    return fora;
  };

  return [...meia(p), ...meia(p.reverse())];
}

/** Bounding box do casco girado por `rad`. */
function caixaGirada(casco: Pt[], rad: number): { w: number; h: number } {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of casco) {
    const x = p.x * c - p.y * s;
    const y = p.x * s + p.y * c;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { w: maxX - minX, h: maxY - minY };
}

/** Tolerancia de 0.01mm: a geometria vem de curva achatada, nao de numero exato. */
const TOL = 0.01;

/**
 * A peca cabe na mesa desta maquina?
 *
 * Testa girando. Nao e luxo: uma peca de 300x40mm nao cabe reta numa mesa de
 * 256x256, mas cabe na diagonal (que mede 362mm) -- e o Bambu Studio deixa girar
 * na placa, entao recusar seria recusar um trabalho que da.
 *
 * A ordem de preferencia e deitada, depois 90 graus, e so entao um angulo
 * qualquer. Escolher sempre a maior folga daria conselho inutil: mandar girar uma
 * peca que ja cabe do jeito que esta.
 */
export function caberNaMesa(contorno: Region, alturaZ: number, m: Impressora): Veredito {
  const b = regionBounds(contorno);
  const excedeZ = Math.max(0, alturaZ - m.z);
  const base = { w: b.w, h: b.h, excedeZ };

  const pts = contorno.flatMap((p) => p.outer);
  if (!pts.length) return { ...base, cabe: excedeZ === 0, giro: 0, sobraX: m.x, sobraY: m.y };

  const casco = cascoConvexo(pts);

  const tentar = (g: number) => {
    const cx = caixaGirada(casco, (g * Math.PI) / 180);
    return { giro: ((g % 180) + 180) % 180, sobraX: m.x - cx.w, sobraY: m.y - cx.h };
  };
  const serve = (t: { sobraX: number; sobraY: number }) =>
    t.sobraX >= -TOL && t.sobraY >= -TOL && excedeZ === 0;

  // Deitada como esta, e depois de lado: giro de 90 graus e trivial no fatiador.
  for (const g of [0, 90]) {
    const t = tentar(g);
    if (serve(t)) return { ...base, cabe: true, ...t };
  }

  // Precisa de angulo. Candidatos: varredura de 1 grau mais as arestas do casco,
  // onde ficam os otimos de area.
  const angulos = new Set<number>();
  for (let g = 1; g < 180; g++) angulos.add(g);
  for (let i = 0; i < casco.length; i++) {
    const a = casco[i]!;
    const c = casco[(i + 1) % casco.length]!;
    const g = (Math.atan2(c.y - a.y, c.x - a.x) * 180) / Math.PI;
    angulos.add(((-g % 180) + 180) % 180);
  }

  // Entre os que servem, o de maior folga: peca colada na borda nao adere bem, e
  // sobra maior ainda deixa espaco para brim e skirt.
  let melhor: { giro: number; sobraX: number; sobraY: number } | null = null;
  for (const g of angulos) {
    const t = tentar(g);
    if (!serve(t)) continue;
    if (!melhor || Math.min(t.sobraX, t.sobraY) > Math.min(melhor.sobraX, melhor.sobraY)) melhor = t;
  }
  if (melhor) return { ...base, cabe: true, ...melhor };

  // Nao cabe de jeito nenhum: o excesso e reportado SEM girar, que e o que casa
  // com a medida da peca mostrada ao lado.
  return { ...base, cabe: false, ...tentar(0) };
}

/** Frase curta para o painel e para os avisos. */
export function descreverVeredito(v: Veredito, m: Impressora): string {
  if (v.excedeZ > 0) {
    return `altura de ${(v.excedeZ + m.z).toFixed(0)} mm passa ${v.excedeZ.toFixed(0)} mm do limite de ${m.z} mm`;
  }
  if (!v.cabe) {
    const faltas: string[] = [];
    if (v.sobraX < 0) faltas.push(`${(-v.sobraX).toFixed(0)} mm em X`);
    if (v.sobraY < 0) faltas.push(`${(-v.sobraY).toFixed(0)} mm em Y`);
    return `não cabe: passou ${faltas.join(' e ')}`;
  }
  const folga = `sobra ${v.sobraX.toFixed(0)} × ${v.sobraY.toFixed(0)} mm`;
  return v.giro === 0 ? `cabe, ${folga}` : `cabe girada ${v.giro.toFixed(0)}°, ${folga}`;
}
