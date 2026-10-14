/** Debounce isolado por receita, leitura dos defaults e flush antes de sair. */
import { receitaPorId } from '../lib/gerador/receitas';
import { valoresPadrao, type Parametro, type Valores } from '../lib/gerador/tipos';

const falhar = (mensagem: string): never => { throw new Error(mensagem); };
const conferir = (condicao: boolean, mensagem: string) => { if (!condicao) falhar(mensagem); };
const iguais = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const salvo = new Map<string, string>();
const timers = new Map<number, () => void>();
const eventos = new Map<string, EventListener>();
let proximoTimer = 0;

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (chave: string) => salvo.get(chave) ?? null,
    setItem: (chave: string, valor: string) => { salvo.set(chave, valor); },
  },
});
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { addEventListener: (tipo: string, callback: EventListener) => eventos.set(tipo, callback) },
});
globalThis.setTimeout = ((callback: TimerHandler) => {
  const id = ++proximoTimer;
  timers.set(id, () => { if (typeof callback === 'function') callback(); });
  return id as ReturnType<typeof setTimeout>;
}) as typeof setTimeout;
globalThis.clearTimeout = ((id: ReturnType<typeof setTimeout>) => { timers.delete(id as number); }) as typeof clearTimeout;

const valoresSalvos = await import('../features/gerador/valoresSalvos');
const receitaA = receitaPorId('chaveiro-nome');
const receitaB = receitaPorId('porta-retrato');
conferir(!!receitaA && !!receitaB, 'receitas de teste precisam existir');

const padraoA = valoresPadrao(receitaA);
conferir(iguais(valoresSalvos.valoresDoModelo(receitaA.id), padraoA), 'modelo sem gravação deve iniciar com os defaults');
const edicaoA = { ...padraoA, nomes: 'Lia', altura: 'inválida' };
salvo.set(`formma3d:gerador:${receitaA.id}`, JSON.stringify(edicaoA));
conferir(valoresSalvos.valoresDoModelo(receitaA.id).nomes === 'Lia', 'modelo deve carregar a edição salva');
conferir(valoresSalvos.valoresDoModelo(receitaA.id).altura === padraoA.altura, 'campo salvo com tipo inválido deve manter o default');

const valorDeTeste = (p: Parametro, sufixo: string): Valores[string] => {
  if (p.tipo === 'numero') return p.padrao + 1;
  if (p.tipo === 'liga') return !p.padrao;
  return `${p.padrao}-${sufixo}`;
};
const edicao = (id: string, sufixo: string): Valores => {
  const receita = receitaPorId(id)!;
  const campo = receita.parametros[0]!;
  return { [campo.id]: valorDeTeste(campo, sufixo) };
};

const a1 = edicao(receitaA.id, 'a1');
const b1 = edicao(receitaB.id, 'b1');
const a2 = edicao(receitaA.id, 'a2');
valoresSalvos.lembrarValores(receitaA.id, a1);
const timerA1 = proximoTimer;
valoresSalvos.lembrarValores(receitaB.id, b1);
const timerB1 = proximoTimer;
valoresSalvos.lembrarValores(receitaA.id, a2);
const timerA2 = proximoTimer;
conferir(!timers.has(timerA1) && timers.has(timerB1) && timers.has(timerA2), 'debounce de uma receita não deve cancelar o timer da outra');

const executarTimerB = timers.get(timerB1)!;
timers.delete(timerB1);
executarTimerB();
conferir(iguais(JSON.parse(salvo.get(`formma3d:gerador:${receitaB.id}`)!), b1), 'timer da receita B deve salvar somente seus valores');
conferir(!iguais(JSON.parse(salvo.get(`formma3d:gerador:${receitaA.id}`)!), a2), 'timer da receita A deve continuar pendente');

const a3 = edicao(receitaA.id, 'a3');
const b2 = edicao(receitaB.id, 'b2');
valoresSalvos.lembrarValores(receitaA.id, a3);
valoresSalvos.lembrarValores(receitaB.id, b2);
const pagehide = eventos.get('pagehide');
conferir(!!pagehide, 'pagehide deve ter um listener de flush');
pagehide!(new Event('pagehide'));
conferir(iguais(JSON.parse(salvo.get(`formma3d:gerador:${receitaA.id}`)!), a3), 'pagehide deve gravar a última edição da receita A');
conferir(iguais(JSON.parse(salvo.get(`formma3d:gerador:${receitaB.id}`)!), b2), 'pagehide deve gravar a última edição da receita B');
conferir(timers.size === 0, 'pagehide deve cancelar todos os timers pendentes');

console.log('valores do modelo: leitura, debounce por receita e flush no pagehide passaram');
