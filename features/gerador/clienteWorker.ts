/**
 * Cliente simples do worker dos geradores, por promessa: um worker para quem pedir
 * (fotos do catalogo), respostas casadas pelo numero do pedido.
 */
import type { Resultado, Valores } from '@/lib/gerador/tipos';
import type { MalhaPronta, PedidoGeracao, RespostaGeracao } from './gerador.worker';

let worker: Worker | null = null;
let contador = 0;
const PRAZO = 20000;
const esperando = new Map<number, { ok: (r: { resultado: Resultado; malhas: MalhaPronta[][] }) => void; falha: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();

function encerrar(e: Error, origem?: Worker): void {
  if (origem && worker !== origem) return;
  const encerrado = worker;
  encerrado?.terminate();
  worker = null;
  for (const [id, p] of esperando) {
    clearTimeout(p.timer);
    esperando.delete(id);
    p.falha(e);
  }
}

function oWorker(): Worker {
  if (worker) return worker;
  const atual = new Worker(new URL('./gerador.worker.ts', import.meta.url), { type: 'module' });
  worker = atual;
  atual.onmessage = (e: MessageEvent<RespostaGeracao>) => {
    if (worker !== atual) return;
    const r = e.data, p = esperando.get(r.pedido);
    if (!p) return;
    esperando.delete(r.pedido);
    clearTimeout(p.timer);
    if ('erro' in r) p.falha(new Error(r.erro));
    else p.ok({ resultado: r.resultado, malhas: r.malhas });
  };
  atual.onerror = (e) => { e.preventDefault(); encerrar(new Error('Falha no worker de geração.'), atual); };
  atual.onmessageerror = () => encerrar(new Error('Resposta inválida do worker de geração.'), atual);
  return atual;
}

/** Gera a receita no worker e devolve o resultado com a malha de cada peca pronta. */
export function gerarNoWorker(receitaId: string, valores: Valores, idsFonte: string[], prazo = PRAZO): Promise<{ resultado: Resultado; malhas: MalhaPronta[][] }> {
  const pedido: PedidoGeracao = { pedido: ++contador, receitaId, valores, idsFonte };
  return new Promise((ok, falha) => {
    try {
      const timer = setTimeout(() => encerrar(new Error('A geração demorou demais.')), prazo);
      esperando.set(pedido.pedido, { ok, falha, timer });
      const atual = oWorker();
      atual.postMessage(pedido);
    } catch (e) {
      encerrar(new Error(e instanceof Error ? e.message : 'Não foi possível iniciar o worker.'));
    }
  });
}
