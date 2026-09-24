import opentype, { type Font, type Path as OTPath } from 'opentype.js';
import { buildRegion, regionBounds, translateRegion, type Pt, type Region, type Bounds } from '../geom/region';
import { flattenQuad, flattenCubic } from '../geom/flatten';

/** Path do opentype -> contornos fechados em mm, com Y para cima. */
export function pathToContours(path: OTPath): Pt[][] {
  const contours: Pt[][] = [];
  let cur: Pt[] | null = null;
  let pos: Pt = { x: 0, y: 0 };
  const flip = (x: number, y: number): Pt => ({ x, y: -y }); // opentype cresce para baixo

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        if (cur && cur.length >= 3) contours.push(cur);
        pos = flip(cmd.x, cmd.y);
        cur = [pos];
        break;
      case 'L':
        if (!cur) break;
        pos = flip(cmd.x, cmd.y);
        cur.push(pos);
        break;
      case 'Q': {
        if (!cur) break;
        const c = flip(cmd.x1, cmd.y1);
        const p1 = flip(cmd.x, cmd.y);
        flattenQuad(pos, c, p1, cur);
        pos = p1;
        break;
      }
      case 'C': {
        if (!cur) break;
        const c1 = flip(cmd.x1, cmd.y1);
        const c2 = flip(cmd.x2, cmd.y2);
        const p1 = flip(cmd.x, cmd.y);
        flattenCubic(pos, c1, c2, p1, cur);
        pos = p1;
        break;
      }
      case 'Z':
        if (cur && cur.length >= 3) contours.push(cur);
        cur = null;
        break;
    }
  }
  if (cur && cur.length >= 3) contours.push(cur);
  return contours;
}

export function parseFont(buffer: ArrayBuffer): Font {
  return opentype.parse(buffer);
}

export interface Letra {
  /** Rotulo da peca: a letra, quando vem de texto; o numero/camada, quando vem de arquivo. */
  nome: string;
  region: Region;
  bounds: Bounds;
}

export interface LayoutOpts {
  /** Altura das maiusculas (cap height) em mm: a medida que o cliente pede. */
  altura?: number;
  /** Espacamento extra entre letras, em mm. */
  tracking?: number;
  kerning?: boolean;
}

/**
 * Texto -> uma Region por letra, posicionada pelo avanco e kerning da fonte.
 * Cada letra e uma peca independente, que e como letra caixa se fabrica e se vende.
 */
export function textToLetters(font: Font, text: string, opts: LayoutOpts = {}): Letra[] {
  const { altura = 100, tracking = 0, kerning = true } = opts;
  const capHeight = font.tables?.os2?.sCapHeight || font.unitsPerEm * 0.7;
  const fontSize = (altura * font.unitsPerEm) / capHeight;
  const scale = fontSize / font.unitsPerEm;

  const glyphs = font.stringToGlyphs(text);
  const letters: Letra[] = [];
  let penX = 0;

  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i]!;
    const char = text[i] ?? '';
    const contours = pathToContours(glyph.getPath(penX, 0, fontSize));
    const region = contours.length ? buildRegion(contours, 'nonzero') : [];

    if (region.length) letters.push({ nome: char, region, bounds: regionBounds(region) });

    penX += (glyph.advanceWidth ?? 0) * scale + tracking;
    const next = glyphs[i + 1];
    if (kerning && next) penX += font.getKerningValue(glyph, next) * scale;
  }

  return letters;
}

/** Move o conjunto para que o canto inferior esquerdo fique em (0,0). */
export function normalizeLetters(letters: Letra[]): Letra[] {
  if (!letters.length) return letters;
  let minX = Infinity;
  let minY = Infinity;
  for (const l of letters) {
    minX = Math.min(minX, l.bounds.minX);
    minY = Math.min(minY, l.bounds.minY);
  }
  return letters.map((l) => {
    const region = translateRegion(l.region, -minX, -minY);
    return { ...l, region, bounds: regionBounds(region) };
  });
}
