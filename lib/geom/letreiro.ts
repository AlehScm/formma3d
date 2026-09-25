import { offsetRegion, intersectRegion, regionArea, type Bounds, type Region } from './region';

// Checagens que valem para o letreiro inteiro, nao para uma letra isolada.
// `buildPart` roda uma letra por vez e nao conhece as vizinhas, entao nada disto
// pode morar la dentro.

export interface PecaDoLetreiro {
  nome: string;
  region: Region;
  bounds: Bounds;
}

export interface ColisaoVizinhos {
  a: string;
  b: string;
  /** Maior borda que ainda nao faz as duas se tocarem, em mm. */
  bordaMax: number;
}

/**
 * Com borda, cada letra cresce para os lados e duas vizinhas apertadas podem passar
 * a se sobrepor -- na montagem as chapas colidem e o letreiro nao fecha.
 *
 * O numero util nao e "colidiu ou nao", e a **maior borda que ainda cabe**: e o que
 * permite dizer ao usuario o que fazer. Duas letras se sobrepoem ao dilatar por `e`
 * exatamente quando a distancia entre elas e menor que `2e`, entao basta procurar
 * esse limite por bisseccao.
 */
export function colisoesPorBorda(pecas: PecaDoLetreiro[], bordaPedida: number): ColisaoVizinhos[] {
  if (bordaPedida <= 0 || pecas.length < 2) return [];
  const out: ColisaoVizinhos[] = [];
  const margem = bordaPedida * 2 + 0.01;

  for (let i = 0; i < pecas.length; i++) {
    for (let j = i + 1; j < pecas.length; j++) {
      const A = pecas[i]!;
      const B = pecas[j]!;
      // Descarte barato por caixa: letras longe nunca precisam do Clipper.
      if (
        A.bounds.maxX + margem < B.bounds.minX ||
        B.bounds.maxX + margem < A.bounds.minX ||
        A.bounds.maxY + margem < B.bounds.minY ||
        B.bounds.maxY + margem < A.bounds.minY
      ) {
        continue;
      }
      const colide = (d: number): boolean =>
        regionArea(intersectRegion(offsetRegion(A.region, -d), offsetRegion(B.region, -d))) > 0.01;

      if (!colide(bordaPedida)) continue;

      let lo = 0;
      let hi = bordaPedida;
      for (let k = 0; k < 8; k++) {
        const mid = (lo + hi) / 2;
        if (colide(mid)) hi = mid;
        else lo = mid;
      }
      out.push({ a: A.nome, b: B.nome, bordaMax: lo });
    }
  }
  return out;
}

/** Aviso em linguagem de oficina, com as saidas reais para o problema. */
export function avisoColisao(c: ColisaoVizinhos, bordaPedida: number): string {
  const folgaFaltando = (bordaPedida - c.bordaMax) * 2;
  return (
    `"${c.a}" e "${c.b}" se encostam com borda de ${bordaPedida}mm: ` +
    `use borda de ate ${c.bordaMax.toFixed(1)}mm, aumente o espacamento em ${folgaFaltando.toFixed(1)}mm, ` +
    `ou imprima as duas como uma peça só.`
  );
}
