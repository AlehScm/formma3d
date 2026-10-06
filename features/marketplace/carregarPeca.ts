/**
 * Peca real para a vitrine 3D da loja: gera o exemplo da ficha do gerador no worker e
 * devolve as malhas de todas as pecas (a letra e o nome que encaixa nela, por exemplo), as
 * cores e as medidas em mm da peca principal. Carregado sob demanda (puxa as receitas),
 * como as miniaturas do catalogo; cada peca uma vez.
 */
import { prepararExemplo } from '@/lib/gerador/exemplo';
import { caixaDoItem, corDe } from '@/lib/gerador/malha';
import { gerarNoWorker } from '@/features/gerador/clienteWorker';
import type { Resultado } from '@/lib/gerador/tipos';

export interface PecaCarregada {
  partes: { posicoes: Float32Array; normais: Float32Array; cor: string }[];
  /** Largura x profundidade x altura da peca principal, em mm. */
  medidas: [number, number, number];
  /** Quantas cores (filamentos) a peca usa. */
  cores: number;
}

const cache = new Map<string, Promise<PecaCarregada>>();

export function carregarPeca(id: string): Promise<PecaCarregada> {
  let p = cache.get(id);
  if (!p) {
    p = gerar(id);
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

async function gerar(id: string): Promise<PecaCarregada> {
  const { valores, idsFonte } = prepararExemplo(id);
  const { resultado, malhas } = await gerarNoWorker(id, valores, idsFonte);
  return montarPeca(resultado, malhas);
}

/**
 * Junta o que o gerador devolveu: todas as pecas de todos os itens, na posicao em que o
 * gerador as arrumou (como na miniatura do card). So o primeiro item mostrava a letra sem o
 * nome que encaixa nela. As medidas sao as da peca principal (item 0).
 */
export function montarPeca(resultado: Resultado, malhas: { posicoes: Float32Array; normais: Float32Array }[][]): PecaCarregada {
  const principal = resultado.itens[0];
  if (!principal) throw new Error('O gerador não devolveu peça.');
  const c = caixaDoItem(principal);
  return {
    partes: resultado.itens.flatMap((item, i) => item.pecas.map((p, j) => ({ posicoes: malhas[i]![j]!.posicoes, normais: malhas[i]![j]!.normais, cor: corDe(resultado, p.cor) }))),
    medidas: [Math.round(c.maxX - c.minX), Math.round(c.maxY - c.minY), Math.round(c.z1 * 10) / 10],
    cores: new Set(resultado.itens.flatMap((item) => item.pecas.map((p) => p.cor))).size,
  };
}
