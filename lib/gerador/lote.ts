/** Varios nomes numa geracao so: cada nome vira um item, em grade, prontos para uma mesa. */
import { translateRegion } from '../geom/region';
import { caixaDoItem } from './malha';
import type { Item } from './tipos';

/** Ate quantos nomes um lote aceita. */
export const LOTE_MAX = 9;

/** "Ana, Pedro" -> ["Ana", "Pedro"]: virgula separa nomes; vazios saem. */
export function nomesDoLote(texto: string): string[] {
  return texto.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Itens lado a lado em `colunas`, com `folga` mm entre eles; o primeiro em cima a esquerda. */
export function emGrade(itens: Item[], colunas = 3, folga = 5): Item[] {
  const caixas = itens.map(caixaDoItem);
  const largura = Math.max(...caixas.map((c) => c.maxX - c.minX));
  const altura = Math.max(...caixas.map((c) => c.maxY - c.minY));
  return itens.map((it, i) => {
    const c = caixas[i]!;
    const col = i % colunas, lin = Math.floor(i / colunas);
    const dx = col * (largura + folga) - (c.minX + c.maxX) / 2;
    const dy = -lin * (altura + folga) - (c.minY + c.maxY) / 2;
    return {
      nome: it.nome,
      pecas: it.pecas.map((p) => ({ ...p, camadas: p.camadas.map((k) => ({ ...k, region: translateRegion(k.region, dx, dy) })) })),
    };
  });
}
