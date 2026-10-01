/**
 * Pecas de receita -> malhas: sopa de triangulos por peca, volume analitico, e o
 * arranjo das pecas soltas para imprimir cada uma deitada.
 */
import { layerToGeometry } from '../geom/extrude';
import { regionArea, regionBounds } from '../geom/region';
import { posicoesDaGeometria } from '../export/stl';
import type { Camada, Item, Peca, Resultado } from './tipos';

/** Cor de previa por indice (Base, Meio, Topo, ...). */
export const CORES_PREVIA = ['#3b3f46', '#e9e6df', '#e0533d', '#2f7dd1', '#f2c230', '#3aa66b'];

export function posicoesDaPeca(p: Peca): Float32Array {
  const partes: Float32Array[] = [];
  for (const c of p.camadas) {
    const geo = layerToGeometry(c);
    if (!geo) continue;
    partes.push(posicoesDaGeometria(geo));
    geo.dispose();
  }
  const out = new Float32Array(partes.reduce((s, x) => s + x.length, 0));
  let i = 0;
  for (const x of partes) {
    out.set(x, i);
    i += x.length;
  }
  return out;
}

export const volumeDaPeca = (p: Peca) => p.camadas.reduce((s, c) => s + regionArea(c.region) * (c.z1 - c.z0), 0);

export interface Caixa { minX: number; minY: number; maxX: number; maxY: number; z0: number; z1: number }

export function caixaDe(camadas: Camada[]): Caixa {
  const c: Caixa = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, z0: Infinity, z1: -Infinity };
  for (const k of camadas) {
    if (!k.region.length) continue;
    const b = regionBounds(k.region);
    c.minX = Math.min(c.minX, b.minX);
    c.minY = Math.min(c.minY, b.minY);
    c.maxX = Math.max(c.maxX, b.maxX);
    c.maxY = Math.max(c.maxY, b.maxY);
    c.z0 = Math.min(c.z0, k.z0);
    c.z1 = Math.max(c.z1, k.z1);
  }
  return c;
}

export const caixaDoItem = (it: Item) => caixaDe(it.pecas.flatMap((p) => p.camadas));

/** Move as posicoes (sopa) por (dx, dy, dz). */
export function mover(pos: Float32Array, dx: number, dy: number, dz: number): Float32Array {
  const out = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    out[i] = pos[i]! + dx;
    out[i + 1] = pos[i + 1]! + dy;
    out[i + 2] = pos[i + 2]! + dz;
  }
  return out;
}

export interface PecaSolta {
  nome: string;
  cor: number;
  /** Deitada na mesa (Z=0) e ja no lugar do arranjo. */
  posicoes: Float32Array;
}

/**
 * Pecas soltas: cada uma desce para Z=0 e vai para uma prateleira de largura
 * `largura` (mm), com `folga` entre elas -- o que sai do 3MF "pecas separadas".
 */
export function pecasSoltas(r: Resultado, largura = 240, folga = 5): PecaSolta[] {
  const out: PecaSolta[] = [];
  let x = 0, y = 0, alturaFila = 0;
  for (const it of r.itens) {
    for (const p of it.pecas) {
      const c = caixaDe(p.camadas);
      if (!Number.isFinite(c.minX)) continue;
      const w = c.maxX - c.minX, h = c.maxY - c.minY;
      if (x > 0 && x + w > largura) {
        x = 0;
        y += alturaFila + folga;
        alturaFila = 0;
      }
      const nome = r.itens.length > 1 ? `${it.nome} - ${p.nome}` : p.nome;
      out.push({ nome, cor: p.cor, posicoes: mover(posicoesDaPeca(p), x - c.minX, y - c.minY, -c.z0) });
      x += w + folga;
      alturaFila = Math.max(alturaFila, h);
    }
  }
  return out;
}

/** Nome da peca com a cor, sem repetir quando a peca ja se chama pela cor ("Base"). */
export function nomeComCor(nome: string, cor: string | undefined): string {
  return !cor || nome.toLowerCase().includes(cor.toLowerCase()) ? nome : `${nome} (${cor})`;
}

/** Sopa centrada em XY e assentada em Z=0 (o que o Imprimir espera de um objeto 3D). */
export function centrada(pos: Float32Array): Float32Array {
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    minX = Math.min(minX, pos[i]!);
    maxX = Math.max(maxX, pos[i]!);
    minY = Math.min(minY, pos[i + 1]!);
    maxY = Math.max(maxY, pos[i + 1]!);
    minZ = Math.min(minZ, pos[i + 2]!);
  }
  return mover(pos, -(minX + maxX) / 2, -(minY + maxY) / 2, -minZ);
}
