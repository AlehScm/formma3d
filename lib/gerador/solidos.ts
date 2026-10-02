/**
 * Solidos feitos de camadas (prismas empilhados): corpo torneado em degraus e uma
 * regiao com vazios em faixas de Z (furo cego, bolsao, gravacao embutida).
 */
import { diffRegion, regionArea, type Region } from '../geom/region';
import { circulo } from './formas';
import type { Camada } from './tipos';

/**
 * Corpo redondo com raio `raio(z)` entre `z0` e `z1`, em degraus de `passo` (a impressora
 * ja deposita em camadas). Degraus seguidos de mesmo raio viram uma camada so.
 */
export function torneado(raio: (z: number) => number, z0: number, z1: number, passo = 0.3, lados = 72, cx = 0, cy = 0): Camada[] {
  const n = Math.max(1, Math.round((z1 - z0) / passo));
  const camadas: Camada[] = [];
  let r0 = -1;
  for (let i = 0; i < n; i++) {
    const a = z0 + ((z1 - z0) * i) / n, b = z0 + ((z1 - z0) * (i + 1)) / n;
    const r = Math.round(raio((a + b) / 2) * 1000) / 1000;
    if (r === r0) camadas.at(-1)!.z1 = b;
    else camadas.push({ region: circulo(cx, cy, r, lados), z0: a, z1: b });
    r0 = r;
  }
  return camadas;
}

export interface Vazio {
  regiao: Region;
  z0: number;
  z1: number;
}

/**
 * `base` entre `z0` e `z1` menos os `vazios` (cada um so na sua faixa de Z): corta nas
 * bordas de todas as faixas e subtrai em cada pedaco o que vale ali.
 */
export function comVazios(base: Region, z0: number, z1: number, vazios: Vazio[]): Camada[] {
  const cortes = [...new Set([z0, z1, ...vazios.flatMap((v) => [v.z0, v.z1]).filter((z) => z > z0 && z < z1)])].sort((a, b) => a - b);
  const camadas: Camada[] = [];
  for (let i = 0; i + 1 < cortes.length; i++) {
    const a = cortes[i]!, b = cortes[i + 1]!, meio = (a + b) / 2;
    let r = base;
    for (const v of vazios) if (v.z0 < meio && meio < v.z1 && v.regiao.length) r = diffRegion(r, v.regiao);
    if (regionArea(r) > 1e-6) camadas.push({ region: r, z0: a, z1: b });
  }
  return camadas;
}
