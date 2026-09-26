'use client';

import { useMemo } from 'react';
import { orcarPeca, orcarPlaca, type Orcamento } from '@/lib/cost/calc';
import { useProjeto } from '@/store/projeto';
import { useInterface } from '@/store/interface';
import { useModelo } from '@/modelo/Modelo';

export interface CustoPlaca {
  /** Posicao na lista de placas (Placa 1 = 0). */
  indice: number;
  qtd: number;
  /** A placa leva STL: entra no custo da impressao, nao no preco do letreiro. */
  temStl: boolean;
  orc: Orcamento;
}

export interface Custos {
  porPeca: Map<string, Orcamento>;
  /** So as placas com peca. Vazio antes de arrumar. */
  porPlaca: CustoPlaca[];
}

/** Custo de cada peca (sem o preparo da maquina) e de cada placa (com um preparo). */
export function useCustos(): Custos {
  const m = useModelo();
  const cfg = useProjeto((s) => s.cfg);
  const placas = useInterface((s) => s.placas);

  return useMemo(() => {
    const porPeca = new Map([...m.insumos].map(([k, ins]) => [k, orcarPeca(ins, cfg)]));
    const porPlaca = placas.flatMap((p, indice) => {
      const chaves = [...p.keys()].filter((k) => m.insumos.has(k));
      if (!chaves.length) return [];
      return [
        {
          indice,
          qtd: chaves.length,
          temStl: chaves.some((k) => k.startsWith('stl:')),
          orc: orcarPlaca(chaves.map((k) => m.insumos.get(k)!), cfg),
        },
      ];
    });
    return { porPeca, porPlaca };
  }, [m.insumos, cfg, placas]);
}
