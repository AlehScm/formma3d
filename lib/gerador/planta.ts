/**
 * Planta: o resultado visto de cima. Cada camada de cada peca vira uma fatia na cor da
 * peca; pintadas da mais baixa para a mais alta, a de cima cobre a de baixo como na peca
 * impressa.
 */
import { regionBounds, type Bounds, type Region } from '@/lib/geom/region';
import type { Resultado } from './tipos';

export interface Fatia {
  regiao: Region;
  /** Indice em `Resultado.cores`. */
  cor: number;
  z1: number;
  item: number;
  peca: number;
}

export function fatiasDaPlanta(r: Resultado): { fatias: Fatia[]; limites: Bounds } {
  const fatias: Fatia[] = [];
  r.itens.forEach((it, item) =>
    it.pecas.forEach((p, peca) => {
      for (const c of p.camadas) if (c.region.length) fatias.push({ regiao: c.region, cor: p.cor, z1: c.z1, item, peca });
    })
  );
  // Ordem estavel: no mesmo Z fica a ordem do resultado.
  fatias.sort((a, b) => a.z1 - b.z1);
  return { fatias, limites: regionBounds(fatias.flatMap((f) => f.regiao)) };
}

/** Limites de cada peca vista de cima (para a etiqueta "nome · L × A mm"). */
export function limitesDaPeca(r: Resultado, item: number, peca: number): Bounds {
  return regionBounds(r.itens[item]?.pecas[peca]?.camadas.flatMap((c) => c.region) ?? []);
}
