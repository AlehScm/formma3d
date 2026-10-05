/**
 * Peca de um gerador com valores trocados (o nome que a pessoa digita no topo da loja):
 * o exemplo da ficha + `extras`, gerado no worker. Mesmo formato da peca viva; guarda as
 * ultimas geracoes para quem apaga e digita de novo nao esperar.
 */
import { prepararExemplo } from '@/lib/gerador/exemplo';
import type { Valores } from '@/lib/gerador/tipos';
import { caixaDoItem, corDe } from '@/lib/gerador/malha';
import { gerarNoWorker } from '@/features/gerador/clienteWorker';
import type { PecaCarregada } from './carregarPeca';

const LIMITE = 12;
const cache = new Map<string, Promise<PecaCarregada>>();

export function carregarPecaCom(id: string, extras: Valores): Promise<PecaCarregada> {
  const k = `${id}|${JSON.stringify(extras)}`;
  let p = cache.get(k);
  if (!p) {
    p = gerar(id, extras);
    p.catch(() => cache.delete(k));
    cache.set(k, p);
    if (cache.size > LIMITE) cache.delete(cache.keys().next().value!);
  }
  return p;
}

async function gerar(id: string, extras: Valores): Promise<PecaCarregada> {
  const { receita, valores } = prepararExemplo(id);
  const v = { ...valores, ...extras };
  const fontes = new Set([
    ...receita.parametros.filter((p) => p.tipo === 'fonte' && (!p.visivel || p.visivel(v))).map((p) => String(v[p.id])),
    ...(receita.fontes?.(v) ?? []),
  ]);
  const { resultado, malhas } = await gerarNoWorker(id, v, [...fontes]);
  const item = resultado.itens[0];
  if (!item) throw new Error('O gerador não devolveu peça.');
  const c = caixaDoItem(item);
  return {
    partes: item.pecas.map((p, j) => ({ posicoes: malhas[0]![j]!.posicoes, normais: malhas[0]![j]!.normais, cor: corDe(resultado, p.cor) })),
    medidas: [Math.round(c.maxX - c.minX), Math.round(c.maxY - c.minY), Math.round(c.z1 * 10) / 10],
    cores: new Set(item.pecas.map((p) => p.cor)).size,
  };
}
