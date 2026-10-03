/**
 * Peca real para a vitrine 3D da loja: gera o exemplo da ficha do gerador no worker e
 * devolve a malha da peca principal (item 0), as cores e as medidas em mm. Carregado
 * sob demanda (puxa as receitas), como as miniaturas do catalogo; cada peca uma vez.
 */
import { receitaPorId } from '@/lib/gerador/receitas';
import { ficha } from '@/lib/gerador/receitas/fichas';
import { valoresPadrao } from '@/lib/gerador/tipos';
import { caixaDoItem, corDe } from '@/lib/gerador/malha';
import { gerarNoWorker } from '@/features/gerador/clienteWorker';

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
  const receita = receitaPorId(id);
  if (!receita) throw new Error('Gerador desconhecido: ' + id);
  const v = { ...valoresPadrao(receita), ...(ficha(id).exemplo ?? {}) };
  const fontes = new Set([
    ...receita.parametros.filter((p) => p.tipo === 'fonte' && (!p.visivel || p.visivel(v))).map((p) => String(v[p.id])),
    ...(receita.fontes?.(v) ?? []),
  ]);
  const { resultado, malhas } = await gerarNoWorker(id, v, [...fontes]);
  const item = resultado.itens[0];
  if (!item) throw new Error('O gerador não devolveu peça.');
  const c = caixaDoItem(item);
  const partes = item.pecas.map((p, j) => ({ posicoes: malhas[0]![j]!.posicoes, normais: malhas[0]![j]!.normais, cor: corDe(resultado, p.cor) }));
  return {
    partes,
    medidas: [Math.round(c.maxX - c.minX), Math.round(c.maxY - c.minY), Math.round(c.z1 * 10) / 10],
    cores: new Set(item.pecas.map((p) => p.cor)).size,
  };
}
