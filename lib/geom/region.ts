import ClipperLib, { type IntPoint, type PolyNode } from 'clipper-lib';

// Clipper trabalha com inteiros. Tudo em mm; SCALE define a precisao (0.001 mm).
const SCALE = 1000;
const ARC_TOL = 0.1 * SCALE; // ainda metade de uma camada tipica de 0.2mm
const MITER = 2;

const PT = ClipperLib.PolyType;
const CT = ClipperLib.ClipType;
const FT = ClipperLib.PolyFillType;
const JT = ClipperLib.JoinType;
const ET = ClipperLib.EndType;

/** Ponto em milimetros, com Y crescendo para cima. */
export interface Pt {
  x: number;
  y: number;
}

/** Contorno externo com seus buracos diretos. */
export interface Poly {
  outer: Pt[];
  holes: Pt[][];
}

/**
 * Area 2D preenchida, em mm. Estrutura unica que atravessa todo o pipeline:
 * glifo -> modo de fabricacao -> extrusao -> STL/DXF/SVG.
 */
export type Region = Poly[];

/**
 * nonzero: correto para glifos de fonte, onde o buraco vem com winding oposto.
 * evenodd: para SVG/DXF importado, onde o winding costuma vir inconsistente e
 * qualquer contorno contido em outro deve ser tratado como buraco.
 */
export type FillRule = 'nonzero' | 'evenodd';

/** round preserva curvas; miter preserva cantos vivos (necessario em medicao). */
export type JoinStyle = 'round' | 'miter';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

type ClipperPath = IntPoint[];

function toClipper(pts: Pt[]): ClipperPath {
  return pts.map((p) => ({ X: Math.round(p.x * SCALE), Y: Math.round(p.y * SCALE) }));
}

function fromClipper(path: ClipperPath): Pt[] {
  return path.map((p) => ({ x: p.X / SCALE, y: p.Y / SCALE }));
}

function regionToClipper(region: Region): ClipperPath[] {
  const paths: ClipperPath[] = [];
  for (const poly of region) {
    paths.push(toClipper(poly.outer));
    for (const h of poly.holes) paths.push(toClipper(h));
  }
  return paths;
}

export function signedArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % n]!;
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

function orient(pts: Pt[], ccw: boolean): Pt[] {
  return signedArea(pts) < 0 === ccw ? pts.slice().reverse() : pts;
}

function nodeToPolys(node: PolyNode, out: Region): Region {
  for (const child of node.Childs()) {
    // Um filho de nivel par e contorno externo; seus filhos diretos sao buracos.
    const outer = fromClipper(child.Contour());
    const holes: Pt[][] = [];
    for (const h of child.Childs()) {
      holes.push(fromClipper(h.Contour()));
      // Ilhas dentro de buracos voltam a ser contornos externos.
      nodeToPolys(h, out);
    }
    if (outer.length >= 3) {
      out.push({
        outer: orient(outer, true),
        holes: holes.filter((h) => h.length >= 3).map((h) => orient(h, false)),
      });
    }
  }
  return out;
}

function executeToRegion(clipType: number, subject: ClipperPath[], clip: ClipperPath[] | null, fillType: number): Region {
  const cpr = new ClipperLib.Clipper();
  if (subject.length) cpr.AddPaths(subject, PT.ptSubject, true);
  if (clip && clip.length) cpr.AddPaths(clip, PT.ptClip, true);
  const tree = new ClipperLib.PolyTree();
  cpr.Execute(clipType, tree, fillType, fillType);
  return nodeToPolys(tree, []);
}

/** Contornos crus -> Region com a hierarquia externo/buraco resolvida. */
export function buildRegion(rawPaths: Pt[][], fillRule: FillRule = 'nonzero'): Region {
  const paths = rawPaths.filter((p) => p.length >= 3).map(toClipper);
  if (!paths.length) return [];
  return executeToRegion(CT.ctUnion, paths, null, fillRule === 'evenodd' ? FT.pftEvenOdd : FT.pftNonZero);
}

/** d > 0 encolhe para dentro, d < 0 dilata. Buracos se comportam de forma coerente. */
export function offsetRegion(region: Region, d: number, joinType: JoinStyle = 'round'): Region {
  if (!region.length) return [];
  if (Math.abs(d) < 1e-6) return region;
  const co = new ClipperLib.ClipperOffset(MITER, ARC_TOL);
  co.AddPaths(regionToClipper(region), joinType === 'miter' ? JT.jtMiter : JT.jtRound, ET.etClosedPolygon);
  const sol: ClipperPath[] = [];
  co.Execute(sol, -d * SCALE);
  if (!sol.length) return [];
  return executeToRegion(CT.ctUnion, sol, null, FT.pftNonZero);
}

export const shrinkRegion = (region: Region, d: number, joinType?: JoinStyle): Region => offsetRegion(region, d, joinType);

export function diffRegion(a: Region, b: Region): Region {
  if (!a.length) return [];
  if (!b.length) return a;
  return executeToRegion(CT.ctDifference, regionToClipper(a), regionToClipper(b), FT.pftNonZero);
}

export function unionRegion(a: Region, b: Region): Region {
  if (!a.length) return b;
  if (!b.length) return a;
  return executeToRegion(CT.ctUnion, regionToClipper(a), regionToClipper(b), FT.pftNonZero);
}

/** Area liquida em mm2 (externos menos buracos). Base do volume e do custo. */
export function regionArea(region: Region): number {
  let a = 0;
  for (const poly of region) {
    a += Math.abs(signedArea(poly.outer));
    for (const h of poly.holes) a -= Math.abs(signedArea(h));
  }
  return Math.max(0, a);
}

/** Perimetro total em mm: comprimento de corte da chapa e de fita LED. */
export function regionPerimeter(region: Region): number {
  let len = 0;
  const walk = (pts: Pt[]) => {
    for (let i = 0, n = pts.length; i < n; i++) {
      const p = pts[i]!;
      const q = pts[(i + 1) % n]!;
      len += Math.hypot(q.x - p.x, q.y - p.y);
    }
  };
  for (const poly of region) {
    walk(poly.outer);
    for (const h of poly.holes) walk(h);
  }
  return len;
}

export function regionBounds(region: Region): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of region) {
    for (const p of poly.outer) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 };
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

export function translateRegion(region: Region, dx: number, dy: number): Region {
  return region.map((poly) => ({
    outer: poly.outer.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    holes: poly.holes.map((h) => h.map((p) => ({ x: p.x + dx, y: p.y + dy }))),
  }));
}

/**
 * Menor espessura de material presente na regiao, em mm.
 * Usa abertura morfologica (erode r, dilata r) com juncao miter: o que nao volta
 * apos a abertura era mais fino que 2r. Busca binaria no menor r que perde area.
 * Serve para avisar, antes de imprimir, que um trecho e mais fino que o bico.
 */
export function minThickness(region: Region, limit = 25): number {
  const total = regionArea(region);
  if (total <= 0) return 0;
  const survives = (r: number) => {
    const opened = offsetRegion(offsetRegion(region, r, 'miter'), -r, 'miter');
    return regionArea(opened) >= total * 0.995;
  };
  if (survives(limit)) return limit * 2;
  let lo = 0;
  let hi = limit;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (survives(mid)) lo = mid;
    else hi = mid;
  }
  return lo * 2;
}

/**
 * Escala a regiao. sx*sy < 0 espelha, o que inverte o winding de todos os
 * contornos -- reorientamos para manter a convencao externo CCW / buraco CW.
 */
export function scaleRegion(region: Region, sx: number, sy: number = sx): Region {
  const espelha = sx * sy < 0;
  const map = (pts: Pt[], ccw: boolean): Pt[] => {
    const s = pts.map((p) => ({ x: p.x * sx, y: p.y * sy }));
    return espelha ? orient(s, ccw) : s;
  };
  return region.map((poly) => ({
    outer: map(poly.outer, true),
    holes: poly.holes.map((h) => map(h, false)),
  }));
}

/**
 * Gira a regiao em torno de (cx, cy).
 *
 * O centro importa: girar na origem do letreiro jogaria a letra para longe, porque
 * as Region carregam a posicao absoluta no letreiro, nao coordenada local.
 * O sentido dos aneis nao muda numa rotacao, entao nao ha o que reorientar.
 */
export function rotateRegion(region: Region, graus: number, cx = 0, cy = 0): Region {
  const rad = (graus * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const map = (pts: Pt[]): Pt[] =>
    pts.map((p) => {
      const x = p.x - cx;
      const y = p.y - cy;
      return { x: cx + x * c - y * s, y: cy + x * s + y * c };
    });
  return region.map((poly) => ({ outer: map(poly.outer), holes: poly.holes.map(map) }));
}

export function intersectRegion(a: Region, b: Region): Region {
  if (!a.length || !b.length) return [];
  return executeToRegion(CT.ctIntersection, regionToClipper(a), regionToClipper(b), FT.pftNonZero);
}

/** Ray casting simples. Usado para agrupar poligonos por proximidade. */
export function pointInContour(poly: Pt[], pt: Pt): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * A regiao e um unico retangulo eixo-alinhado? O recorte de prancheta e o de
 * BBox de XObject quase sempre sao, e nesse caso da para pular a intersecao.
 */
export function regionIsRect(region: Region, tol = 0.01): boolean {
  if (region.length !== 1) return false;
  const poly = region[0]!;
  if (poly.holes.length) return false;
  const pts = poly.outer;
  if (pts.length < 4 || pts.length > 5) return false;
  const n = pts.length === 5 && Math.hypot(pts[4]!.x - pts[0]!.x, pts[4]!.y - pts[0]!.y) < tol ? 4 : pts.length;
  if (n !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % 4]!;
    if (Math.abs(a.x - b.x) > tol && Math.abs(a.y - b.y) > tol) return false;
  }
  return true;
}

/** `inner` cabe inteiro dentro de `outer`? */
export function boundsDentro(inner: Bounds, outer: Bounds, tol = 0.01): boolean {
  return (
    inner.minX >= outer.minX - tol &&
    inner.minY >= outer.minY - tol &&
    inner.maxX <= outer.maxX + tol &&
    inner.maxY <= outer.maxY + tol
  );
}

export interface Contorno {
  pts: Pt[];
  closed: boolean;
}

/**
 * Engrossa tracos em area preenchida, pela largura da linha.
 * Um desenho so com tracos (sem preenchimento) nao tem area para extrudar; isto
 * converte a linha em contorno, como o "Expandir" do Illustrator faria.
 */
export function strokeToRegion(contours: Contorno[], largura: number, capRound = false, join: JoinStyle = 'round'): Region {
  const fechados = contours.filter((c) => c.closed && c.pts.length >= 3).map((c) => c.pts);
  const abertos = contours.filter((c) => !c.closed && c.pts.length >= 2).map((c) => c.pts);
  if (!fechados.length && !abertos.length) return [];

  const delta = (Math.max(largura, 0.01) / 2) * SCALE;
  const jt = join === 'miter' ? JT.jtMiter : JT.jtRound;
  const sol: ClipperPath[] = [];

  if (fechados.length) {
    const co = new ClipperLib.ClipperOffset(MITER, ARC_TOL);
    co.AddPaths(fechados.map(toClipper), jt, ET.etClosedLine);
    const r: ClipperPath[] = [];
    co.Execute(r, delta);
    sol.push(...r);
  }
  if (abertos.length) {
    const co = new ClipperLib.ClipperOffset(MITER, ARC_TOL);
    co.AddPaths(abertos.map(toClipper), jt, capRound ? ET.etOpenRound : ET.etOpenButt);
    const r: ClipperPath[] = [];
    co.Execute(r, delta);
    sol.push(...r);
  }
  if (!sol.length) return [];
  return executeToRegion(CT.ctUnion, sol, null, FT.pftNonZero);
}

/**
 * Agrupa poligonos que estao a menos de `folga` mm um do outro.
 * Resolve o pingo do i, o til do A e acentos soltos, que senao viram pecas avulsas.
 */
export function agruparPorProximidade(region: Region, folga: number): Region[] {
  if (folga <= 0 || region.length <= 1) return region.map((p) => [p]);
  const inflada = offsetRegion(region, -folga / 2);
  const grupos: Region[] = [];
  const usados = new Set<number>();
  for (const cluster of inflada) {
    const grupo: Region = [];
    region.forEach((poly, i) => {
      const p0 = poly.outer[0];
      if (!usados.has(i) && p0 && pointInContour(cluster.outer, p0)) {
        grupo.push(poly);
        usados.add(i);
      }
    });
    if (grupo.length) grupos.push(grupo);
  }
  region.forEach((poly, i) => {
    if (!usados.has(i)) grupos.push([poly]);
  });
  return grupos;
}
