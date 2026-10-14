/** Isolamento entre a store persistente e stores descartaveis das janelas do editor. */
const persistidos = new Map<string, string>();
const timers = new Map<number, () => void>();
let proximoTimer = 0;
let gravacoes = 0;

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (chave: string) => persistidos.get(chave) ?? null,
    setItem: (chave: string, valor: string) => { gravacoes++; persistidos.set(chave, valor); },
    removeItem: (chave: string) => { persistidos.delete(chave); },
  },
});
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { addEventListener: () => undefined },
});
globalThis.setTimeout = ((callback: TimerHandler) => {
  const id = ++proximoTimer;
  timers.set(id, () => { if (typeof callback === 'function') callback(); });
  return id as ReturnType<typeof setTimeout>;
}) as typeof setTimeout;
globalThis.clearTimeout = ((id: ReturnType<typeof setTimeout>) => { timers.delete(id as number); }) as typeof clearTimeout;

const { criarDesignIsolado, useDesign } = await import('../features/design/estado');
const { designNovo, lerDesign } = await import('../lib/design/documento');
const { atualizarPosicaoManipulador } = await import('../lib/gerador/manipuladores');
const conferir = (condicao: boolean, mensagem: string) => { if (!condicao) throw new Error(mensagem); };
const executarTimers = () => {
  while (timers.size) {
    const [id, executar] = timers.entries().next().value!;
    timers.delete(id);
    executar();
  }
};

const principal = useDesign;
principal.getState().alterar((d) => ({ ...d, nome: 'Principal' }));
executarTimers();
const chave = 'scarprint:design:v1';
const salvoAntes = persistidos.get(chave);
const gravacoesAntes = gravacoes;
const designPai = principal.getState().design;

const janelaA = criarDesignIsolado();
const janelaB = criarDesignIsolado();
janelaA.getState().alterar((d) => ({ ...d, nome: 'Rascunho A' }));
janelaA.getState().desfazer();
janelaA.getState().carregar({ ...designNovo(), nome: 'Confirmado A' });
janelaB.getState().alterar((d) => ({ ...d, nome: 'Rascunho B' }));
executarTimers();

conferir(principal.getState().design === designPai && principal.getState().design.nome === 'Principal', 'editar, desfazer ou carregar na janela nao pode alterar o editor principal');
conferir(janelaA.getState().design.nome === 'Confirmado A', 'carregar na janela A deve atualizar apenas a janela A');
conferir(janelaB.getState().design.nome === 'Rascunho B', 'editar na janela B deve atualizar apenas a janela B');
conferir(persistidos.get(chave) === salvoAntes && gravacoes === gravacoesAntes, 'stores isoladas nao podem gravar o rascunho persistente');

const manipulador = { id: 'argola:ana#0', rotulo: 'Argola', item: 0, ponto: { x: -20, y: 0 }, parametro: 'posicoesArgola', alvo: 'ana#0', valor: { x: 0, y: 0 } };
principal.getState().carregar({ ...designNovo(), elementos: [{ id: 'chaveiro-teste', tipo: 'modelo', receita: 'chaveiro-nome', valores: { nomes: 'Ana' }, camadaId: 'topo', x: 10, y: 20, giro: 30, escalaX: 2, escalaY: 1, espelhar: true }] });
const antesDoGesto = principal.getState().design;
const passosAntes = principal.getState().passado.length;
principal.getState().iniciarGesto();
for (const x of [1, 2, 3]) {
  principal.getState().alterarElementos(['chaveiro-teste'], (e) => e.tipo === 'modelo' ? { ...e, valores: atualizarPosicaoManipulador(e.valores, manipulador, { x, y: -2 }) } : e, { historico: false });
}
const depoisDoGesto = principal.getState().design;
const modelo = depoisDoGesto.elementos[0]!;
conferir(principal.getState().passado.length === passosAntes + 1, 'varios movimentos internos devem criar apenas um passo de desfazer');
conferir(modelo.x === 10 && modelo.y === 20 && modelo.giro === 30 && modelo.escalaX === 2 && modelo.espelhar === true, 'mover a argola nao pode alterar a transformacao do modelo');
conferir(modelo.tipo === 'modelo' && JSON.parse(String(modelo.valores.posicoesArgola))['ana#0'].x === 3, 'o ultimo movimento deve ser salvo nos parametros do modelo');
principal.getState().desfazer();
conferir(principal.getState().design === antesDoGesto, 'desfazer deve restaurar a posicao inicial da argola');
principal.getState().refazer();
conferir(principal.getState().design === depoisDoGesto, 'refazer deve restaurar a posicao final da argola');
executarTimers();
const reaberto = lerDesign(JSON.parse(persistidos.get(chave)!).state.design);
conferir(JSON.stringify(reaberto.elementos) === JSON.stringify(depoisDoGesto.elementos), 'salvar/reabrir deve preservar parametros internos e transformacao');

console.log('estado do design: isolamento, gesto interno, desfazer/refazer e persistencia passaram');
