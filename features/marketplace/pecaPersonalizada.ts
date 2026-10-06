/**
 * Peca de um gerador com valores trocados (o nome que a pessoa digita no topo da loja):
 * o exemplo da ficha + `extras`, gerado no worker. Mesmo formato da peca viva; guarda as
 * ultimas geracoes para quem apaga e digita de novo nao esperar.
 */
import { prepararExemplo } from '@/lib/gerador/exemplo';
import type { Valores } from '@/lib/gerador/tipos';
import { gerarNoWorker } from '@/features/gerador/clienteWorker';
import { montarPeca, type PecaCarregada } from './carregarPeca';

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
  return montarPeca(resultado, malhas);
}
