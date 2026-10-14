import assert from 'node:assert/strict';
import { validarRegion } from '../lib/geom/validacaoRegion';
import { analisarDesenho, validarCamposDesenho, validarDesenho } from '../lib/gerador/validacaoDesenho';
import { desenho, type Valores } from '../lib/gerador/tipos';
import { camadasPadrao, lerDesign, type Design } from '../lib/design/documento';
import { criarDesignIsolado } from '../features/design/estado';
import { receitaPorId } from '../lib/gerador/receitas';
import type { PedidoGeracao, RespostaGeracao } from '../features/gerador/gerador.worker';

let total = 0;
const conferir = (condicao: boolean, mensagem: string) => { total++; assert.ok(condicao, mensagem); };
const ponto = (x: number, y: number) => ({ x, y });
const aberta = [ponto(0, 0), ponto(-4, 0), ponto(-4, 3)];
const hole = [ponto(1, 1), ponto(2, 1), ponto(1, 2)];
const poligono = { outer: aberta, holes: [hole] };
const region = [poligono, { outer: [ponto(5, 5), ponto(6, 5), ponto(5, 6)], holes: [] }];

conferir(validarRegion([]), 'Region vazia é válida');
conferir(validarRegion(region), 'múltiplos polígonos, hole, winding e anel aberto são aceitos sem normalização');
conferir(validarRegion([{ outer: [ponto(0, 0), ponto(0, 1), ponto(1, 0), ponto(0, 0)], holes: [] }]), 'anel fechado e winding invertido são aceitos');
const original = JSON.stringify(region);
conferir(validarRegion(region) && JSON.stringify(region) === original && region[0] === poligono && poligono.outer === aberta, 'validação preserva identidade, ordem e geometria');
for (const invalida of [null, 'region', {}, [{}], [null], [{ outer: aberta }], [{ outer: [ponto(0, 0), ponto(1, 0)], holes: [] }],
  [{ outer: [ponto(0, 0), ponto(1, 0), ponto(Number.NaN, 1)], holes: [] }], [{ outer: [ponto(0, 0), ponto(1, 0), ponto(0, Infinity)], holes: [] }],
  [{ outer: [ponto(0, 0), ponto(1, 0), { x: '2', y: 0 }], holes: [] }], [{ outer: [ponto(0, 0), ponto(1, 0), null], holes: [] }],
  [{ outer: new Array(3), holes: [] }], [{ outer: [ponto(0, 0), ponto(1, 0), ponto(0, 1)], holes: [[]] }],
  [{ outer: [ponto(0, 0), ponto(1, 0), ponto(0, 1)], holes: [new Array(3)] }],
  [new Array(2)], [new Array(1)],
]) conferir(!validarRegion(invalida), `Region inválida rejeitada: ${String(invalida)}`);
const poligonoArray = Object.assign([], { outer: aberta, holes: [] });
conferir(!validarRegion([poligonoArray]), 'array não substitui o objeto de polígono');
const pontoArray = Object.assign([], { x: 0, y: 0 });
conferir(!validarRegion([{ outer: [pontoArray, ponto(1, 0), ponto(0, 1)], holes: [] }]), 'array não substitui ponto objeto');

const desenhoValido = { nome: 'Ícone', regiao: region, cores: [{ regiao: [], hex: '#aAbBcC' }] };
conferir(analisarDesenho('').estado === 'ausente', 'campo vazio é ausente');
conferir(analisarDesenho('{').estado === 'invalido', 'JSON malformado é inválido sem throw');
conferir(analisarDesenho(JSON.stringify(desenhoValido)).estado === 'valido', 'desenho multicor válido é analisado');
conferir(analisarDesenho(JSON.stringify({ nome: 'Vazio', regiao: [] })).estado === 'valido', 'desenho sem áreas preenchidas é válido no decoder');
conferir(validarDesenho({ nome: 'vazio', regiao: [], cores: [] }), 'objeto Desenho com todas as regiões vazias é válido');
for (const invalido of [null, [], { nome: 4, regiao: [] }, { nome: 'x', regiao: [{}] },
  { nome: 'x', regiao: [], cores: [{ regiao: [], hex: 'red' }] }, { nome: 'x', regiao: [], cores: [new Array(2)] },
  { nome: 'x', regiao: [], cores: new Array(1) }, { nome: 'x', regiao: [], cores: [{ regiao: [{}], hex: '#ffffff' }] }]) {
  conferir(analisarDesenho(JSON.stringify(invalido)).estado === 'invalido', `decoder rejeita desenho inválido: ${JSON.stringify(invalido)}`);
}
conferir(!validarDesenho({ nome: 'n', regiao: [{ outer: [ponto(0, 0), ponto(1, 0), ponto(0, 1)], holes: [] }], cores: [new Array(1)] }), 'validador direto detecta cor esparsa antes da serialização');
conferir(analisarDesenho('null').estado === 'invalido' && analisarDesenho('"x"').estado === 'invalido', 'decoder rejeita primitivos JSON');
conferir(desenho({ d: '' }, 'd') === null && desenho({ d: JSON.stringify({ nome: 'Vazio', regiao: [] }) }, 'd') === null && desenho({ d: '[{}]' }, 'd') === null,
  'leitor de campo preserva compatibilidade: ausente, vazio ou inválido retorna null');

const base: Design = { versao: 1, nome: 'teste', larguraMm: 100, alturaMm: 80, camadas: camadasPadrao(), elementos: [] };
const jsonDesenho = (regiaoD: unknown): Design => ({ ...base, elementos: [{ id: 'importado-X', tipo: 'desenho', camadaId: 'topo', x: 0, y: 0, giro: 0, escalaX: 1, escalaY: 1, nome: 'X', regiao: regiaoD } as Design['elementos'][number]] });
assert.throws(() => lerDesign(jsonDesenho([{}])), /importado-X.*região inválida/);
conferir(lerDesign(jsonDesenho(region)).elementos.length === 1, 'lerDesign preserva desenho válido importado');
conferir(lerDesign(jsonDesenho([])).elementos.length === 1, 'lerDesign preserva região vazia legítima');

const originalSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
const mensagens: RespostaGeracao[] = [];
const falsoSelf: { onmessage?: (e: MessageEvent<PedidoGeracao>) => void; postMessage: (resposta: RespostaGeracao, transferir?: Transferable[]) => void } = { postMessage: (resposta) => { mensagens.push(resposta); } };
Object.defineProperty(globalThis, 'self', { configurable: true, value: falsoSelf });
const receitaAlvo = receitaPorId('chaveiro-desenho')!;
const gerarOriginal = receitaAlvo.gerar;
const designLivre = receitaPorId('design-livre')!;
const gerarLivreOriginal = designLivre.gerar;
const fetchOriginal = globalThis.fetch;
const storeIsolada = criarDesignIsolado();
const estadoAntes = storeIsolada.getState();
const executar = async (pedido: PedidoGeracao) => {
  mensagens.length = 0;
  await falsoSelf.onmessage!({ data: pedido } as MessageEvent<PedidoGeracao>);
  return mensagens.at(-1)!;
};
try {
  await import('../features/gerador/gerador.worker');
  const parametro = receitaAlvo.parametros.find((p) => p.tipo === 'svg')!;
  const valores: Valores = { [parametro.id]: JSON.stringify({ nome: 'bad', regiao: [{}] }) };
  let chamadas = 0;
  receitaAlvo.gerar = (...args) => { chamadas++; return gerarOriginal(...args); };
  globalThis.fetch = async () => { throw new Error('fonte não deveria ser consultada'); };
  const respostaInvalida = await executar({ pedido: 1, receitaId: receitaAlvo.id, valores, idsFonte: ['pacifico'], modo: 'resultado' });
  conferir('erro' in respostaInvalida && respostaInvalida.erro.includes(parametro.rotulo), 'preflight real do worker identifica campo SVG inválido antes de carregar fontes');
  conferir(chamadas === 0, 'preflight não chama geração da receita em entrada inválida');

  let chamadasLivre = 0;
  designLivre.gerar = (...args) => { chamadasLivre++; return gerarLivreOriginal(...args); };
  const respostaLivreInvalida = await executar({ pedido: 2, receitaId: 'design-livre', valores: { design: JSON.stringify(jsonDesenho([{}])) }, idsFonte: [], modo: 'resultado' });
  conferir('erro' in respostaLivreInvalida && respostaLivreInvalida.erro.includes('Design') && chamadasLivre === 0, 'design-livre usa lerDesign e rejeita Region inválida sem decoder de Desenho');
  const respostaLivreValida = await executar({ pedido: 3, receitaId: 'design-livre', valores: { design: JSON.stringify(base) }, idsFonte: [], modo: 'resultado' });
  conferir(!('erro' in respostaLivreValida) && chamadasLivre === 1, 'design-livre aceita payload de projeto válido');
  const modeloAninhado: Design = { ...base, elementos: [{ id: 'modelo-importado', tipo: 'modelo', receita: receitaAlvo.id, camadaId: 'topo', x: 0, y: 0, giro: 0, escalaX: 1, escalaY: 1, valores: { [parametro.id]: JSON.stringify({ nome: 'bad', regiao: [{}] }) } }] };
  chamadasLivre = 0;
  const respostaAninhadaInvalida = await executar({ pedido: 4, receitaId: 'design-livre', valores: { design: JSON.stringify(modeloAninhado) }, idsFonte: [], modo: 'resultado' });
  conferir('erro' in respostaAninhadaInvalida && respostaAninhadaInvalida.erro.includes(parametro.rotulo) && chamadasLivre === 0, 'preflight rejeita campo SVG inválido de modelo visível embutido');
  const modeloAninhadoOculto: Design = { ...modeloAninhado, elementos: modeloAninhado.elementos.map((e) => ({ ...e, oculto: true })) };
  const respostaOculta = await executar({ pedido: 5, receitaId: 'design-livre', valores: { design: JSON.stringify(modeloAninhadoOculto) }, idsFonte: [], modo: 'resultado' });
  conferir(!('erro' in respostaOculta), 'campo SVG inválido em modelo oculto não bloqueia a composição');
  const respostaVazio = await executar({ pedido: 6, receitaId: receitaAlvo.id, valores: { [parametro.id]: JSON.stringify({ nome: 'vazio', regiao: [] }) }, idsFonte: [], modo: 'resultado' });
  conferir(!('erro' in respostaVazio), 'campo SVG com região vazia segue válido para a receita');
  assert.throws(() => storeIsolada.getState().carregar(lerDesign(jsonDesenho([{}]))), /importado-X.*região inválida/);
  conferir(storeIsolada.getState().design === estadoAntes.design && storeIsolada.getState().passado === estadoAntes.passado && storeIsolada.getState().futuro === estadoAntes.futuro,
    'falha de lerDesign acontece antes de carregar e não altera design nem histórico');
} finally {
  receitaAlvo.gerar = gerarOriginal;
  designLivre.gerar = gerarLivreOriginal;
  globalThis.fetch = fetchOriginal;
  if (originalSelf) Object.defineProperty(globalThis, 'self', originalSelf);
  else Reflect.deleteProperty(globalThis, 'self');
}

console.log(`${total}/${total} verificações de desenho importado passaram`);
