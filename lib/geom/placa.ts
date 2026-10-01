import { layerToGeometry } from './extrude';
import { regionArea, regionBounds, type Bounds, type Pt, type Region } from './region';
import type { Layer } from './modes';
import type * as THREE from 'three';

export interface ParametrosPlaca {
  largura: number;
  altura: number;
  espessura: number;
  raio: number;
  margem: number;
}

export interface Placa3D {
  region: Region;
  layer: Layer;
  geometry: THREE.BufferGeometry;
  bounds: Bounds;
  area: number;
  volume: number;
  /** Retangulo interno contido na placa, considerando os cantos arredondados. */
  areaUtil: Bounds;
}

function validar(p: ParametrosPlaca): void {
  for (const nome of ['largura', 'altura', 'espessura', 'raio', 'margem'] as const) {
    const valor = p[nome];
    if (typeof valor !== 'number' || !Number.isFinite(valor)) throw new RangeError(`${nome} deve ser um numero finito`);
  }
  if (p.largura <= 0 || p.altura <= 0 || p.espessura <= 0) throw new RangeError('Largura, altura e espessura devem ser maiores que zero');
  if (p.raio < 0 || p.raio > Math.min(p.largura, p.altura) / 2) throw new RangeError('Raio deve estar entre zero e metade da menor dimensao');
  if (p.margem < 0 || p.margem * 2 >= Math.min(p.largura, p.altura)) throw new RangeError('Margem deve ser nao negativa e menor que metade da menor dimensao');
}

function contornoArredondado(largura: number, altura: number, raio: number): Pt[] {
  const x0 = -largura / 2;
  const x1 = largura / 2;
  const y0 = -altura / 2;
  const y1 = altura / 2;
  if (raio === 0) return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  const pts: Pt[] = [];
  const cantos = [
    { x: x1 - raio, y: y0 + raio, inicio: -90 },
    { x: x1 - raio, y: y1 - raio, inicio: 0 },
    { x: x0 + raio, y: y1 - raio, inicio: 90 },
    { x: x0 + raio, y: y0 + raio, inicio: 180 },
  ];
  for (const canto of cantos) {
    for (let i = 0; i <= 12; i++) {
      const a = ((canto.inicio + (i / 12) * 90) * Math.PI) / 180;
      pts.push({ x: canto.x + raio * Math.cos(a), y: canto.y + raio * Math.sin(a) });
    }
  }
  return pts;
}

/** Gera a base plana de uma placa, centrada em XY e apoiada em Z=0. */
export function criarPlaca3D(parametros: ParametrosPlaca): Placa3D {
  validar(parametros);
  const { largura, altura, espessura, raio, margem } = parametros;
  const outer = contornoArredondado(largura, altura, raio);
  const region: Region = [{ outer, holes: [] }];
  const layer: Layer = { region, z0: 0, z1: espessura, role: 'corpo' };
  const geometry = layerToGeometry(layer);
  if (!geometry) throw new Error('Falha ao gerar a malha da placa');
  const area = regionArea(region);
  const bounds = regionBounds(region);
  const insetUtil = margem + Math.max(raio - margem, 0) * (1 - 1 / Math.SQRT2);
  const areaUtil: Bounds = {
    minX: bounds.minX + insetUtil,
    minY: bounds.minY + insetUtil,
    maxX: bounds.maxX - insetUtil,
    maxY: bounds.maxY - insetUtil,
    w: largura - insetUtil * 2,
    h: altura - insetUtil * 2,
  };
  return { region, layer, geometry, bounds, area, volume: area * espessura, areaUtil };
}
