import { createRequire } from 'node:module';
import { chaveModeloPronto } from '../lib/design/modelosProntos';
import { camadasPadrao, type Design } from '../lib/design/documento';
import { designParaResultado } from '../lib/design/saida';
import { receitaPorId } from '../lib/gerador/receitas';
import { valoresPadrao, type Resultado, type Valores } from '../lib/gerador/tipos';
import { fontesDoModelo } from '../lib/design/documento';
import type { PedidoGeracao, RespostaGeracao } from '../features/gerador/gerador.worker';

let total = 0;
const THREE = createRequire(import.meta.url)('three') as typeof import('three');
const conferir = (condicao: boolean, mensagem: string) => {
  total++;
  if (!condicao) throw new Error(`Falhou: ${mensagem}`);
};
const iguais = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const originalSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
const mensagens: { resposta: RespostaGeracao; transferir: Transferable[] }[] = [];
const falsoSelf: { onmessage?: (e: MessageEvent<PedidoGeracao>) => void; postMessage: (r: RespostaGeracao, t?: Transferable[]) => void } = {
  postMessage: (resposta, transferir = []) => mensagens.push({ resposta, transferir }),
};
Object.defineProperty(globalThis, 'self', { configurable: true, value: falsoSelf });

const receita = receitaPorId('porta-canetas-grade');
if (!receita) throw new Error('Receita porta-canetas-grade não encontrada');
const valores: Valores = { ...valoresPadrao(receita), colunas: 2, linhas: 2, altura: 16 };
const idsFonte: string[] = [];
const design = (x = 0, y = 0, giro = 0, escalaX = 1, escalaY = 1): Design => ({
  versao: 1,
  nome: 'Reuso de modelo',
  larguraMm: 100,
  alturaMm: 100,
  camadas: camadasPadrao(),
  elementos: [{ id: 'modelo-1', tipo: 'modelo', receita: receita.id, valores, camadaId: 'topo', x, y, giro, escalaX, escalaY }],
});
const pedido = (pedidoId: number, d: Design, modelosProntos?: PedidoGeracao['modelosProntos'], modo: PedidoGeracao['modo'] = 'resultado'): PedidoGeracao => ({
  pedido: pedidoId,
  receitaId: 'design-livre',
  valores: { design: JSON.stringify(d) },
  idsFonte: [],
  modo,
  ...(modelosProntos !== undefined ? { modelosProntos } : {}),
});
const executar = async (p: PedidoGeracao): Promise<RespostaGeracao> => {
  mensagens.length = 0;
  await falsoSelf.onmessage!({ data: p } as MessageEvent<PedidoGeracao>);
  const ultima = mensagens.at(-1)?.resposta;
  if (!ultima) throw new Error(`Worker não respondeu ao pedido ${p.pedido}`);
  return ultima;
};

const gerarOriginal = receita.gerar;
const computeNormalsOriginal = THREE.BufferGeometry.prototype.computeVertexNormals;
const fetchOriginal = globalThis.fetch;
let geracoes = 0;
let normais = 0;
try {
  await import('../features/gerador/gerador.worker');

  // Baseline legado independente da instrumentação: composição deve manter a mesma geometria.
  const baseInicial = design();
  const resultadoLegado = designParaResultado(baseInicial, () => undefined);
  const baseMovida = design(18, -9, 37, 1.25, 0.8);
  const resultadoLegadoMovido = designParaResultado(baseMovida, () => undefined);

  receita.gerar = (...args) => { geracoes++; return gerarOriginal(...args); };
  THREE.BufferGeometry.prototype.computeVertexNormals = function (...args) {
    normais++;
    return computeNormalsOriginal.apply(this, args);
  };

  const respostaResultado = await executar({ pedido: 1, receitaId: receita.id, valores, idsFonte, modo: 'resultado' });
  if ('erro' in respostaResultado) throw new Error(respostaResultado.erro);
  conferir(geracoes === 1, 'modo resultado executa a receita exatamente uma vez');
  conferir(respostaResultado.malhas.length === 0 && normais === 0, 'modo resultado não constrói malhas nem calcula normais');
  conferir(mensagens.at(-1)!.transferir.length === 0, 'modo resultado não transfere buffers');

  const idsFonteModelo = fontesDoModelo(receita.id, valores);
  const modeloPronto = {
    elementoId: 'modelo-1',
    chave: chaveModeloPronto(receita.id, valores, idsFonteModelo, 0),
    receita: receita.id,
    valores,
    idsFonte: idsFonteModelo,
    tentativa: 0,
    resultado: respostaResultado.resultado,
  };
  const pacote = [modeloPronto];

  const respostaComposta = await executar(pedido(2, baseInicial, pacote, 'malhas'));
  if ('erro' in respostaComposta) throw new Error(respostaComposta.erro);
  conferir(geracoes === 1, 'composição usa modelo pronto sem regenerar a receita');
  conferir(respostaComposta.malhas.flat().length > 0 && mensagens.at(-1)!.transferir.length > 0, 'composição monta e transfere suas malhas');
  conferir(iguais(respostaComposta.resultado, resultadoLegado), 'modelo pronto compõe resultado equivalente ao caminho legado');

  const normaisAntesMovimento = normais;
  const respostaMovida = await executar(pedido(3, baseMovida, pacote, 'malhas'));
  if ('erro' in respostaMovida) throw new Error(respostaMovida.erro);
  conferir(geracoes === 1, 'mudar posição, giro e escala continua sem regenerar a receita');
  conferir(normais > normaisAntesMovimento, `composição transformada calcula normais (${normaisAntesMovimento} → ${normais})`);
  conferir(iguais(respostaMovida.resultado, resultadoLegadoMovido), 'transformação com modelo pronto mantém a geometria do caminho legado');

  const respostaAusente = await executar(pedido(4, baseInicial, [], 'resultado'));
  conferir('erro' in respostaAusente && respostaAusente.erro.includes('Resultado pronto ausente'), 'pacote presente sem modelo falha sem caminho de fallback');
  conferir(geracoes === 1, 'pacote ausente não regenera a receita');

  const respostaDesatualizada = await executar(pedido(5, baseInicial, [{ ...modeloPronto, chave: 'chave-obsoleta' }], 'resultado'));
  conferir('erro' in respostaDesatualizada && respostaDesatualizada.erro.includes('incompatível'), 'chave desatualizada é rejeitada');
  conferir(geracoes === 1, 'pacote desatualizado não regenera a receita');

  const vazio: Design = { ...baseInicial, elementos: [] };
  const respostaVazia = await executar(pedido(6, vazio, [], 'resultado'));
  conferir(!('erro' in respostaVazia) && respostaVazia.resultado.itens.length === 0, 'pacote vazio permite design sem modelos');

  const normaisAntesLegado = normais;
  const respostaLegada = await executar({ pedido: 7, receitaId: receita.id, valores, idsFonte: [] });
  if ('erro' in respostaLegada) throw new Error(respostaLegada.erro);
  conferir(geracoes === 2, 'worker sem modo explícito preserva geração independente');
  conferir(respostaLegada.malhas.flat().length > 0 && normais > normaisAntesLegado, 'modo padrão devolve resultado e malhas');
  conferir(mensagens.at(-1)!.transferir.length > 0, 'modo padrão transfere buffers das malhas');

  const respostaReceitaInvalida = await executar({ pedido: 8, receitaId: 'receita-inexistente-worker-test', valores: {}, idsFonte: [], modo: 'resultado' });
  conferir('erro' in respostaReceitaInvalida && respostaReceitaInvalida.erro.includes('Gerador desconhecido'), 'erro da receita desconhecida é retornado');

  globalThis.fetch = async () => new Response('', { status: 503 });
  const respostaFonte = await executar({ pedido: 9, receitaId: receita.id, valores, idsFonte: ['anton'], modo: 'resultado' });
  conferir('erro' in respostaFonte && respostaFonte.erroFonte === true, 'falha de carregamento de fonte mantém o sinalizador de erro');
} finally {
  receita.gerar = gerarOriginal;
  THREE.BufferGeometry.prototype.computeVertexNormals = computeNormalsOriginal;
  globalThis.fetch = fetchOriginal;
  if (originalSelf) Object.defineProperty(globalThis, 'self', originalSelf);
  else Reflect.deleteProperty(globalThis, 'self');
}

console.log(`${total}/${total} verificações de reuso do worker passaram`);
