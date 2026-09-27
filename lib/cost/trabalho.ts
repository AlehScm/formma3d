import { gramasEstimadas, orcar, somarInsumos, type CustoCfg, type Insumos, type Orcamento, PADRAO } from './calc';

/** O que o fatiador (ou a impressao de verdade) disse de uma placa. */
export interface DadoReal {
  gramas: number;
  horas: number;
}

export interface CustoPlaca {
  /** Posicao na lista de placas (Placa 1 = 0). */
  indice: number;
  chaves: string[];
  /** A placa leva STL: entra no custo da impressao, nao no preco do letreiro. */
  temStl: boolean;
  /** Sem dado real: gramas e tempo vieram da estimativa. */
  estimado: boolean;
  orc: Orcamento;
}

export interface Custos {
  porPeca: Map<string, Orcamento>;
  porPlaca: CustoPlaca[];
  /** O letreiro: so as letras (sem STL), um preparo por placa que tem letra. */
  total: Orcamento | null;
  /** Alguma placa do letreiro ainda esta na estimativa. */
  estimado: boolean;
}

export interface ArgsTrabalho {
  insumos: ReadonlyMap<string, Insumos>;
  /** Chaves de cada placa. Sem arranjo, o trabalho inteiro conta como uma placa. */
  placas: string[][];
  reais: readonly (DadoReal | null | undefined)[];
  /** Pecas do letreiro (as outras sao STL). */
  ehLetra: (chave: string) => boolean;
  cfg?: CustoCfg;
}

/**
 * Custo por peca, por placa e do letreiro. Placa com dado real usa os gramas e o
 * tempo dela; as pecas dividem esse total na proporcao do que se estimava para
 * cada uma. Tudo sai de `orcar`, que e linear: a soma das pecas mais um preparo por
 * placa fecha com o total.
 */
export function custosDoTrabalho({ insumos, placas, reais, ehLetra, cfg = PADRAO }: ArgsTrabalho): Custos {
  const vazao = Math.max(0.1, cfg.vazao || 12);
  const gramas = new Map<string, number>();
  const horas = new Map<string, number>();

  // Primeiro a estimativa de todas; depois, onde ha dado real, a placa manda.
  for (const [k, ins] of insumos) {
    const g = gramasEstimadas(ins.volumeMm3, cfg);
    gramas.set(k, g);
    horas.set(k, g / vazao);
  }
  const listas = placas.map((p) => p.filter((k) => insumos.has(k)));
  listas.forEach((chaves, i) => {
    const r = reais[i];
    if (!r || !chaves.length) return;
    const est = chaves.reduce((a, k) => a + gramas.get(k)!, 0);
    for (const k of chaves) {
      const parte = est > 0 ? gramas.get(k)! / est : 1 / chaves.length;
      gramas.set(k, r.gramas * parte);
      horas.set(k, r.horas * parte);
    }
  });

  const porPeca = new Map(
    [...insumos].map(([k, ins]) => [k, orcar({ ...ins, qtdLetras: 1, impressoes: 0, gramasReais: gramas.get(k), horasReais: horas.get(k), cfg })])
  );

  const soma = (chaves: string[], m: Map<string, number>) => chaves.reduce((a, k) => a + m.get(k)!, 0);
  const porPlaca = listas.flatMap((chaves, indice) =>
    chaves.length
      ? [
          {
            indice,
            chaves,
            temStl: chaves.some((k) => !ehLetra(k)),
            estimado: !reais[indice],
            orc: orcar({
              ...somarInsumos(chaves.map((k) => insumos.get(k)!)),
              qtdLetras: chaves.length,
              impressoes: 1,
              gramasReais: soma(chaves, gramas),
              horasReais: soma(chaves, horas),
              cfg,
            }),
          },
        ]
      : []
  );

  const letras = [...insumos.keys()].filter(ehLetra);
  const total = letras.length
    ? orcar({
        ...somarInsumos(letras.map((k) => insumos.get(k)!)),
        qtdLetras: letras.length,
        impressoes: Math.max(1, listas.filter((p) => p.some(ehLetra)).length),
        gramasReais: soma(letras, gramas),
        horasReais: soma(letras, horas),
        cfg,
      })
    : null;

  // Peca fora de toda placa (maior que a mesa) nunca tem dado real.
  const emPlacaReal = new Set(listas.flatMap((p, i) => (reais[i] ? p : [])));
  return { porPeca, porPlaca, total, estimado: letras.some((k) => !emPlacaReal.has(k)) };
}
