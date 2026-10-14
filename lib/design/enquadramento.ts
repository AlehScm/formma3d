import { regionBounds, type Region } from '../geom/region';
import type { Design } from './documento';
import { mundoDoElemento } from './manipuladores';

interface Caixa { minX: number; minY: number; w: number; h: number }

export function areaDoDesign(design: Design, regioes: Map<string, Region>, modelos: Map<string, Caixa> = new Map()): Caixa {
  let minX = -design.larguraMm / 2, maxX = design.larguraMm / 2;
  let minY = -design.alturaMm / 2, maxY = design.alturaMm / 2;
  const incluir = (x: number, y: number) => {
    minX = Math.min(minX, x - 10); maxX = Math.max(maxX, x + 10);
    minY = Math.min(minY, y - 10); maxY = Math.max(maxY, y + 10);
  };
  const visiveis = new Set(design.camadas.filter((c) => !c.oculta).map((c) => c.id));
  for (const [id, regiao] of regioes) {
    if (!visiveis.has(id) || !regiao.length) continue;
    const b = regionBounds(regiao);
    incluir(b.minX, b.minY); incluir(b.maxX, b.maxY);
  }
  for (const e of design.elementos) {
    if (e.tipo !== 'modelo' || e.oculto || !visiveis.has(e.camadaId)) continue;
    const b = modelos.get(e.id);
    if (!b) continue;
    for (const x of [b.minX, b.minX + b.w]) for (const y of [b.minY, b.minY + b.h]) {
      const p = mundoDoElemento(e, { x, y });
      incluir(p.x, p.y);
    }
  }
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}
