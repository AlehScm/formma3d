/**
 * Cliente simples do worker dos geradores, por promessa: um worker para quem pedir
 * (fotos do catalogo), respostas casadas pelo numero do pedido.
 */
import type { Resultado, Valores } from '@/lib/gerador/tipos';
import type { MalhaPronta, PedidoGeracao, RespostaGeracao } from './gerador.worker';

let worker: Worker | null = null;
let contador = 0;
const esperando = new Map<number, { ok: (r: { resultado: Resultado; malhas: MalhaPronta[][] }) => void; falha: (e: Error) => void }>();

function oWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./gerador.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<RespostaGeracao>) => {
    const r = e.data, p = esperando.get(r.pedido);
    if (!p) return;
    esperando.delete(r.pedido);
    if ('erro' in r) p.falha(new Error(r.erro));
    else p.ok({ resultado: r.resultado, malhas: r.malhas });
  };
  return worker;
}

/** Gera a receita no worker e devolve o resultado com a malha de cada peca pronta. */
export function gerarNoWorker(receitaId: string, valores: Valores, idsFonte: string[]): Promise<{ resultado: Resultado; malhas: MalhaPronta[][] }> {
  const pedido: PedidoGeracao = { pedido: ++contador, receitaId, valores, idsFonte };
  return new Promise((ok, falha) => {
    esperando.set(pedido.pedido, { ok, falha });
    oWorker().postMessage(pedido);
  });
}
