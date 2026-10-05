import { gerarNoWorker } from '../features/gerador/clienteWorker';
import { criarFilaSerial } from '../features/catalogo/filaSerial';

let total = 0;
let falhas = 0;
const ok = (nome: string, condicao: boolean) => { total++; if (!condicao) falhas++; console.log(`${condicao ? 'ok' : 'FALHA'} ${nome}`); };
const fila = criarFilaSerial();
const iniciados: string[] = [];
let liberarPrimeiro!: () => void;
const primeiroDaFila = fila(async () => { iniciados.push('primeiro'); await new Promise<void>((resolve) => { liberarPrimeiro = resolve; }); return 1; });
const cancelado = fila(async () => { iniciados.push('cancelado'); return 2; });
const canceladoNoInicio = cancelado.promessa.then(() => false, () => true);
cancelado.cancelar();
const terceiroDaFila = fila(async () => { iniciados.push('terceiro'); return 3; });
await Promise.resolve();
await Promise.resolve();
ok('fila inicia um trabalho por vez e remove o cancelado', iniciados.join(',') === 'primeiro');
liberarPrimeiro();
ok('cancelamento e ordem da fila', await canceladoNoInicio && await primeiroDaFila.promessa === 1 && await terceiroDaFila.promessa === 3 && iniciados.join(',') === 'primeiro,terceiro');
const filaComErroSincrono = criarFilaSerial();
const erroSincrono = filaComErroSincrono(() => { throw new Error('erro sincrono'); }).promessa.then(() => false, () => true);
const depoisErro = filaComErroSincrono(async () => 'ok');
ok('lançamento síncrono não trava a fila', await erroSincrono && await depoisErro.promessa === 'ok');
const filaAntesDaExecucao = criarFilaSerial();
let executouCancelado = false;
const antesDaExecucao = filaAntesDaExecucao(async () => { executouCancelado = true; });
const rejeitouCancelado = antesDaExecucao.promessa.then(() => false, () => true);
await Promise.resolve();
antesDaExecucao.cancelar();
const depoisDoCancelamento = filaAntesDaExecucao(async () => 'ok');
ok('cancelar apos reservar a fila nao inicia o trabalho', await rejeitouCancelado && await depoisDoCancelamento.promessa === 'ok' && !executouCancelado);

type Handler = ((evento: any) => void) | null;
class WorkerFalso {
  static instancias: WorkerFalso[] = [];
  onmessage: Handler = null;
  onerror: Handler = null;
  onmessageerror: Handler = null;
  terminado = false;
  falharPost = false;
  pedidos: any[] = [];
  constructor() { WorkerFalso.instancias.push(this); }
  postMessage(p: any) { if (this.falharPost) throw new Error('postMessage'); this.pedidos.push(p); }
  responder(p: any, erro = false) { this.onmessage?.({ data: erro ? { pedido: p.pedido, erro: 'erro de receita' } : { pedido: p.pedido, resultado: { id: p.receitaId }, malhas: [] } }); }
  terminate() { this.terminado = true; }
}
const original = globalThis.Worker;
(globalThis as any).Worker = WorkerFalso;
try {
  const primeiro = gerarNoWorker('a', {}, []);
  const w0 = WorkerFalso.instancias.at(-1)!;
  const segundo = gerarNoWorker('b', {}, []);
  w0.responder(w0.pedidos[1]);
  w0.responder(w0.pedidos[0]);
  const [a, b] = await Promise.all([primeiro, segundo]);
  ok('respostas casadas por pedido', a.resultado.id === 'a' && b.resultado.id === 'b');

  WorkerFalso.instancias.at(-1)!.falharPost = true;
  ok('falha de postMessage rejeita', await gerarNoWorker('c', {}, []).then(() => false, () => true));
  ok('worker encerrado após falha de postMessage', WorkerFalso.instancias.at(-1)!.terminado);
  const d = gerarNoWorker('d', {}, []);
  const wd = WorkerFalso.instancias.at(-1)!;
  wd.responder(wd.pedidos[0]);
  await d;
  ok('worker recriado após falha', WorkerFalso.instancias.length === 2);

  const w = WorkerFalso.instancias.at(-1)!;
  const pendente = gerarNoWorker('g', {}, []).then(() => false, () => true);
  const pendente2 = gerarNoWorker('gg', {}, []).then(() => false, () => true);
  w.onerror?.({ preventDefault() {} });
  ok('erro global rejeita todos os pedidos pendentes', await pendente && await pendente2);
  ok('erro global encerra worker', w.terminado);
  const h = gerarNoWorker('h', {}, []);
  const wh = WorkerFalso.instancias.at(-1)!;
  w.onerror?.({ preventDefault() {} });
  wh.responder(wh.pedidos[0]);
  await h;
  ok('erro atrasado de worker antigo não encerra o novo', !wh.terminado);
  wh.onmessageerror?.({});
  ok('messageerror encerra worker', wh.terminado);
  const antes = WorkerFalso.instancias.length;
  (globalThis as any).Worker = class extends WorkerFalso { constructor() { throw new Error('construtor'); } };
  ok('falha ao criar worker rejeita', await gerarNoWorker('e', {}, []).then(() => false, () => true));
  (globalThis as any).Worker = WorkerFalso;
  const recuperado = gerarNoWorker('f', {}, []);
  const wRecuperado = WorkerFalso.instancias.at(-1)!;
  wRecuperado.responder(wRecuperado.pedidos[0]);
  await recuperado;
  ok('worker recriado após falha de criação', WorkerFalso.instancias.length === antes + 1);

  const erroPedido = gerarNoWorker('i', {}, []).then(() => false, () => true);
  const pedidoPreservado = gerarNoWorker('ii', {}, []);
  const wErroPedido = WorkerFalso.instancias.at(-1)!;
  wErroPedido.responder(wErroPedido.pedidos.at(-2), true);
  wErroPedido.responder(wErroPedido.pedidos.at(-1));
  ok('erro de receita rejeita somente seu pedido', await erroPedido && (await pedidoPreservado).resultado.id === 'ii');

  const timers = new Map<number, () => void>();
  let timerId = 0;
  const setTimeoutOriginal = globalThis.setTimeout;
  const clearTimeoutOriginal = globalThis.clearTimeout;
  (globalThis as any).setTimeout = (fn: () => void) => { const id = ++timerId; timers.set(id, fn); return id; };
  (globalThis as any).clearTimeout = (id: number) => { timers.delete(id); };
  const timeoutWorker = WorkerFalso.instancias.at(-1)!;
  const comPrazo = gerarNoWorker('j', {}, []).then(() => false, () => true);
  const callbacks = [...timers.values()];
  callbacks[0]?.();
  (globalThis as any).setTimeout = setTimeoutOriginal;
  (globalThis as any).clearTimeout = clearTimeoutOriginal;
  ok('prazo rejeita e encerra worker', await comPrazo && timeoutWorker.terminado);
  const recuperacaoPrazo = gerarNoWorker('k', {}, []);
  const wPrazoRecuperado = WorkerFalso.instancias.at(-1)!;
  wPrazoRecuperado.responder(wPrazoRecuperado.pedidos[0]);
  await recuperacaoPrazo;
  ok('worker recriado após prazo', WorkerFalso.instancias.at(-1) !== timeoutWorker);
} finally { globalThis.Worker = original; }
console.log(`${total - falhas}/${total} verificações`);
if (falhas) process.exitCode = 1;
