import { regionBounds, rotateRegion, translateRegion, type Pt, type Region } from '../geom/region';
import { contornar, retanguloArredondado, unir } from './formas';

function projetar(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

export function nomeConectado(nome: Region, contorno: number): Region {
  let placa = contornar(nome, contorno);
  const raio = Math.max(0.4, Math.min(1, contorno / 2));
  while (placa.length > 1) {
    let distancia = Infinity;
    let par: [Pt, Pt] | undefined;
    for (let i = 0; i < placa.length; i++) {
      for (let j = i + 1; j < placa.length; j++) {
        const a = placa[i]!.outer, b = placa[j]!.outer;
        const ba = regionBounds([placa[i]!]), bb = regionBounds([placa[j]!]);
        if (Math.hypot(Math.max(0, ba.minX - bb.maxX, bb.minX - ba.maxX), Math.max(0, ba.minY - bb.maxY, bb.minY - ba.maxY)) > distancia) continue;
        for (const [origem, destino] of [[a, b], [b, a]]) {
          for (const p of origem!) {
            for (let k = 0; k < destino!.length; k++) {
              const q = projetar(p, destino![k]!, destino![(k + 1) % destino!.length]!);
              const d = Math.hypot(q.x - p.x, q.y - p.y);
              if (d < distancia) { distancia = d; par = [p, q]; }
            }
          }
        }
      }
    }
    if (!par) break;
    const [a, b] = par;
    const ponte = translateRegion(rotateRegion(retanguloArredondado(0, 0, distancia + 2 * raio, 2 * raio, raio), Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI), (a.x + b.x) / 2, (a.y + b.y) / 2);
    const ligada = unir([placa, ponte]);
    if (ligada.length >= placa.length) break;
    placa = ligada;
  }
  return placa;
}
