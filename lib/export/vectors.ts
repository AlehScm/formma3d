import { regionBounds, type Pt, type Region } from '../geom/region';
import type { Letra } from '../text/glyphs';

// Saidas 2D para corte da chapa. Y e invertido porque SVG e o fluxo de
// plotter/router usam Y crescendo para baixo.

export interface SvgOpts {
  margem?: number;
  titulo?: string;
}

/** Region -> SVG em milimetros reais, pronto para abrir no Corel e mandar cortar. */
export function regionToSVG(region: Region, { margem = 5, titulo = 'chapa' }: SvgOpts = {}): string {
  const b = regionBounds(region);
  const w = b.w + margem * 2;
  const h = b.h + margem * 2;
  const tx = (p: Pt) => (p.x - b.minX + margem).toFixed(3);
  const ty = (p: Pt) => (b.maxY - p.y + margem).toFixed(3);

  const paths: string[] = [];
  for (const poly of region) {
    const sub: string[] = [];
    const walk = (pts: Pt[]) => {
      sub.push('M ' + pts.map((p) => `${tx(p)} ${ty(p)}`).join(' L ') + ' Z');
    };
    walk(poly.outer);
    for (const hole of poly.holes) walk(hole);
    paths.push(sub.join(' '));
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(3)}mm" height="${h.toFixed(3)}mm" viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}">`,
    `<title>${titulo}</title>`,
    '<g fill="none" stroke="#000" stroke-width="0.1" fill-rule="evenodd">',
    ...paths.map((d) => `<path d="${d}"/>`),
    '</g></svg>',
  ].join('\n');
}

function dxfPolyline(pts: Pt[]): string[] {
  const out = ['0', 'LWPOLYLINE', '8', 'CORTE', '100', 'AcDbEntity', '100', 'AcDbPolyline', '90', String(pts.length), '70', '1'];
  for (const p of pts) {
    out.push('10', p.x.toFixed(4), '20', p.y.toFixed(4));
  }
  return out;
}

/** Region -> DXF com uma LWPOLYLINE fechada por contorno, em mm. Aceito por router CNC e plotter. */
export function regionToDXF(region: Region): string {
  const b = regionBounds(region);
  const out = ['0', 'SECTION', '2', 'ENTITIES'];
  for (const poly of region) {
    out.push(...dxfPolyline(poly.outer.map((p) => ({ x: p.x - b.minX, y: p.y - b.minY }))));
    for (const hole of poly.holes) {
      out.push(...dxfPolyline(hole.map((p) => ({ x: p.x - b.minX, y: p.y - b.minY }))));
    }
  }
  out.push('0', 'ENDSEC', '0', 'EOF');
  return out.join('\r\n');
}

/**
 * Gabarito de instalacao 1:1: a silhueta de cada letra na posicao real do letreiro,
 * com linha de base e marcas de centro, para imprimir, colar na parede e furar certo.
 */
export function gabaritoSVG(letters: Letra[], { margem = 20 }: { margem?: number } = {}): string {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const l of letters) {
    minX = Math.min(minX, l.bounds.minX);
    minY = Math.min(minY, l.bounds.minY);
    maxX = Math.max(maxX, l.bounds.maxX);
    maxY = Math.max(maxY, l.bounds.maxY);
  }
  if (!Number.isFinite(minX)) return '';

  const w = maxX - minX + margem * 2;
  const h = maxY - minY + margem * 2;
  const tx = (p: Pt) => (p.x - minX + margem).toFixed(2);
  const ty = (p: Pt) => (maxY - p.y + margem).toFixed(2);

  const shapes: string[] = [];
  const marcas: string[] = [];
  for (const l of letters) {
    for (const poly of l.region) {
      const sub = ['M ' + poly.outer.map((p) => `${tx(p)} ${ty(p)}`).join(' L ') + ' Z'];
      for (const hole of poly.holes) sub.push('M ' + hole.map((p) => `${tx(p)} ${ty(p)}`).join(' L ') + ' Z');
      shapes.push(`<path d="${sub.join(' ')}"/>`);
    }
    const cx = (l.bounds.minX + l.bounds.maxX) / 2 - minX + margem;
    const cy = maxY - (l.bounds.minY + l.bounds.maxY) / 2 + margem;
    marcas.push(
      `<path d="M ${(cx - 4).toFixed(2)} ${cy.toFixed(2)} L ${(cx + 4).toFixed(2)} ${cy.toFixed(2)} M ${cx.toFixed(2)} ${(cy - 4).toFixed(2)} L ${cx.toFixed(2)} ${(cy + 4).toFixed(2)}" stroke="#c00" stroke-width="0.4"/>`
    );
  }

  const baseY = (maxY + margem).toFixed(2);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(2)}mm" height="${h.toFixed(2)}mm" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}">`,
    '<title>Gabarito de instalacao 1:1</title>',
    `<rect width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="#fff"/>`,
    `<g fill="none" stroke="#000" stroke-width="0.3" fill-rule="evenodd">${shapes.join('')}</g>`,
    `<line x1="0" y1="${baseY}" x2="${w.toFixed(2)}" y2="${baseY}" stroke="#06c" stroke-width="0.4" stroke-dasharray="4 2"/>`,
    `<g fill="none">${marcas.join('')}</g>`,
    `<text x="${margem}" y="${(h - 6).toFixed(2)}" font-family="sans-serif" font-size="5" fill="#666">Gabarito 1:1 - imprima em escala 100% (sem "ajustar a pagina"). Largura total ${(maxX - minX).toFixed(0)}mm.</text>`,
    '</svg>',
  ].join('\n');
}
