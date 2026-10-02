import QRCode from 'qrcode';
import { buildRegion, type Region } from '../geom/region';

export interface QRGeometria {
  regiao: Region;
  modulos: number;
  moduloMm: number;
  margem: number;
  larguraTotal: number;
}

/** `nivel`: correcao de erro do QR ('H' aguenta ~30% coberto, para logo no meio). */
export function qrParaRegiao(payload: string, larguraTotal: number, moduloMinimo = 0.8, nivel: 'L' | 'M' | 'Q' | 'H' = 'M'): QRGeometria {
  if (!payload.trim()) throw new Error('O conteúdo do QR Code está vazio.');
  if (!(larguraTotal > 0) || !(moduloMinimo > 0)) throw new RangeError('As dimensões do QR Code devem ser positivas.');
  const qr = QRCode.create(payload, { errorCorrectionLevel: nivel });
  const n = qr.modules.size;
  const margem = 4;
  const moduloMm = larguraTotal / (n + margem * 2);
  if (moduloMm < moduloMinimo) throw new RangeError(`O QR Code teria módulos de ${moduloMm.toFixed(2)} mm; aumente a placa ou reduza o conteúdo (mínimo ${moduloMinimo} mm).`);

  const paths: { x: number; y: number }[][] = [];
  const minX = -larguraTotal / 2;
  const maxY = larguraTotal / 2;
  const escuros = (x: number, y: number) => x >= 0 && x < n && y >= 0 && y < n && !!qr.modules.data[y * n + x];
  const corte = 0.02;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!qr.modules.data[y * n + x]) continue;
      const x0 = minX + (x + margem) * moduloMm;
      const y1 = maxY - (y + margem) * moduloMm;
      const x1 = x0 + moduloMm;
      const y0 = y1 - moduloMm;
      const corta = (dx: -1 | 1, dy: -1 | 1) => escuros(x + dx, y + dy) && !escuros(x + dx, y) && !escuros(x, y + dy);
      const sw = corta(-1, 1), se = corta(1, 1), ne = corta(1, -1), nw = corta(-1, -1);
      const pts = [{ x: x0 + (sw ? corte : 0), y: y0 }];
      if (se) pts.push({ x: x1 - corte, y: y0 }, { x: x1, y: y0 + corte });
      else pts.push({ x: x1, y: y0 });
      if (ne) pts.push({ x: x1, y: y1 - corte }, { x: x1 - corte, y: y1 });
      else pts.push({ x: x1, y: y1 });
      if (nw) pts.push({ x: x0 + corte, y: y1 }, { x: x0, y: y1 - corte });
      else pts.push({ x: x0, y: y1 });
      if (sw) pts.push({ x: x0, y: y0 + corte });
      paths.push(pts);
    }
  }
  return { regiao: buildRegion(paths, 'nonzero'), modulos: n, moduloMm, margem, larguraTotal };
}
