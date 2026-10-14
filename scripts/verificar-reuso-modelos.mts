import assert from 'node:assert/strict';
import { parseFont } from '../lib/text/glyphs';
import fs from 'node:fs';
import { designNovo, fontesDaComposicao, type Design } from '../lib/design/documento';
import { designParaResultado } from '../lib/design/saida';
import { regioesDasCamadas } from '../lib/design/geometria';
import { chaveModeloPronto, resolverModeloPronto, type ModeloPronto } from '../lib/design/modelosProntos';
import { prepararModelo } from '../lib/gerador/exemplo';
import { receitaPorId } from '../lib/gerador/receitas';
import { atualizarPosicaoManipulador } from '../lib/gerador/manipuladores';
import { empacotar3mf } from '../lib/export/tresmf';
import { lerTresMf } from '../lib/import/tresmf';
import { xml3mfMontado } from '../lib/gerador/exportar';

const bytes = fs.readFileSync('public/fontes/archivo-black.ttf');
const font = parseFont(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
const fonte = () => font;
const base = designNovo();
const modelo = (id: string, x: number, giro: number, escala: number, cor: string) => ({
  id, tipo: 'modelo' as const, camadaId: 'topo', x, y: 8, giro, escalaX: escala, escalaY: escala,
  receita: 'chaveiro-nome', valores: { nomes: 'Ada', corBase: cor, corMeio: '#445566', corTopo: '#778899' },
});
const design: Design = { ...base, elementos: [
  { id: 'forma', tipo: 'forma', camadaId: 'topo', x: 0, y: 0, giro: 0, escalaX: 1, escalaY: 1, forma: 'circulo', largura: 35 },
  modelo('m1', -40, 12, 1, '#112233'),
  modelo('m2', 45, -8, 1.4, '#aa2211'),
] };

const prontos: ModeloPronto[] = design.elementos.flatMap((el) => {
  if (el.tipo !== 'modelo') return [];
  const preparado = prepararModelo(el.receita, { base: 'padrao', extras: el.valores });
  const receita = receitaPorId(el.receita)!;
  const resultado = receita.gerar(preparado.valores, { fonte });
  return [{ elementoId: el.id, receita: el.receita, valores: preparado.valores, idsFonte: preparado.idsFonte, tentativa: 0,
    chave: chaveModeloPronto(el.receita, preparado.valores, preparado.idsFonte, 0), resultado }];
});
const original = structuredClone(prontos);
const legado = designParaResultado(design, fonte);
const reutilizado = designParaResultado(design, fonte, { fonte, resultadoModelo: resolverModeloPronto(prontos) });
assert.deepEqual(reutilizado, legado, 'composição por reuso preserva o resultado legado');
assert.deepEqual(prontos, original, 'a composição não muta resultados fornecidos');

const transformado: Design = { ...design, elementos: design.elementos.map((el) => el.tipo === 'modelo' ? { ...el, x: el.x + 12, giro: el.giro + 20, escalaX: el.escalaX * 2, escalaY: el.escalaY * 2, espelhar: true } : el) };
const legadoTransformado = designParaResultado(transformado, fonte);
const reusoTransformado = designParaResultado(transformado, fonte, { fonte, resultadoModelo: resolverModeloPronto(prontos) });
assert.deepEqual(reusoTransformado, legadoTransformado, 'transformações são aplicadas na composição sem regenerar');
const pacoteMisto = await empacotar3mf(xml3mfMontado(reutilizado));
const voltaMista = await lerTresMf(await pacoteMisto.arrayBuffer(), 'reuso-misto.3mf');
assert.equal(voltaMista.length, reutilizado.itens.length, '3MF do resultado reutilizado preserva todos os itens compostos');
assert.ok(voltaMista.every((obj) => obj.malha.posicoes.length > 0 && [...obj.malha.posicoes].every(Number.isFinite)), '3MF reutilizado contém malhas válidas');

const receitaArgola = receitaPorId('chaveiro-retangular')!;
const valoresArgola = prepararModelo(receitaArgola.id, { base: 'padrao', extras: { nomes: 'Ada' } }).valores;
const inicialArgola = receitaArgola.gerar(valoresArgola, { fonte });
const manipulador = inicialArgola.manipuladores?.[0];
assert.ok(manipulador, 'a receita de teste expõe manipulador da argola');
const valoresEditados = atualizarPosicaoManipulador(valoresArgola, manipulador, { x: 3, y: -2 });
const argolaDesign: Design = { ...base, elementos: [{ ...modelo('argola', 18, 31, 1.4, '#112233'), receita: receitaArgola.id, valores: valoresEditados, escalaY: 0.8, espelhar: true }] };
const preparoArgola = prepararModelo(receitaArgola.id, { base: 'padrao', extras: valoresEditados });
const resultadoArgola = receitaArgola.gerar(preparoArgola.valores, { fonte });
const pacoteArgola: ModeloPronto = { elementoId: 'argola', receita: receitaArgola.id, valores: preparoArgola.valores, idsFonte: preparoArgola.idsFonte, tentativa: 0, chave: chaveModeloPronto(receitaArgola.id, preparoArgola.valores, preparoArgola.idsFonte, 0), resultado: resultadoArgola };
assert.deepEqual(designParaResultado(argolaDesign, fonte, { fonte, resultadoModelo: resolverModeloPronto([pacoteArgola]) }), designParaResultado(argolaDesign, fonte), 'argola editada, espelho, giro e escala preservam paridade');
const pacoteArgola3mf = await empacotar3mf(xml3mfMontado(designParaResultado(argolaDesign, fonte, { fonte, resultadoModelo: resolverModeloPronto([pacoteArgola]) })));
const voltaArgola = await lerTresMf(await pacoteArgola3mf.arrayBuffer(), 'argola-reuso.3mf');
assert.ok(voltaArgola.length === 1 && [...voltaArgola[0]!.malha.posicoes].every(Number.isFinite), '3MF com argola reutilizada contém malha válida');

const incompleto = resolverModeloPronto(prontos.slice(1));
assert.throws(() => designParaResultado(design, fonte, { fonte, resultadoModelo: incompleto }), /ausente/);
const incompatíveis = structuredClone(prontos);
incompatíveis[0]!.valores.nomes = 'Grace';
assert.throws(() => resolverModeloPronto(incompatíveis), /incompatível/);
assert.notEqual(chaveModeloPronto('chaveiro-nome', prontos[0]!.valores, prontos[0]!.idsFonte, 0), chaveModeloPronto('chaveiro-nome', prontos[0]!.valores, prontos[0]!.idsFonte, 1), 'tentativa invalida a chave');
assert.equal(chaveModeloPronto('chaveiro-nome', prontos[0]!.valores, ['pacifico', 'archivo-black', 'pacifico'], 0), chaveModeloPronto('chaveiro-nome', prontos[0]!.valores, ['archivo-black', 'pacifico'], 0), 'fontes são ordenadas e deduplicadas');
assert.notEqual(chaveModeloPronto('chaveiro-nome', prontos[0]!.valores, ['archivo-black'], 0), chaveModeloPronto('chaveiro-nome', prontos[0]!.valores, ['lobster'], 0), 'mudança de fonte invalida a chave');

const dependente: Design = { ...base, camadas: base.camadas.map((c) => c.id === 'topo' ? { ...c, oculta: true } : c), elementos: [
  { id: 'texto-fonte', tipo: 'texto', camadaId: 'topo', x: 0, y: 0, giro: 0, escalaX: 1, escalaY: 1, texto: 'Ada', fonte: 'archivo-black', altura: 18 },
] };
assert.ok(fontesDaComposicao(dependente).includes('archivo-black'), 'helper de composição mantém fonte de texto em origem oculta de contorno visível');
const textoEscondido: Design = { ...dependente, elementos: [...dependente.elementos, { id: 'texto-oculto', tipo: 'texto', camadaId: 'topo', x: 0, y: 0, giro: 0, escalaX: 1, escalaY: 1, texto: 'X', fonte: 'pacifico', altura: 18, oculto: true }] };
assert.ok(!fontesDaComposicao(textoEscondido).includes('pacifico'), 'texto explicitamente oculto não carrega fonte');
const modeloOculto: Design = { ...base, elementos: [modelo('m-oculto', 0, 0, 1, '#112233')], camadas: base.camadas.map((c) => c.id === 'topo' ? { ...c, oculta: true } : c) };
assert.deepEqual(fontesDaComposicao(modeloOculto), [], 'modelo em camada oculta não bloqueia prontidão de composição');
assert.ok((regioesDasCamadas(dependente, fonte).get('meio')?.length ?? 0) > 0, 'contorno visível continua usando texto em sua camada de origem oculta');
assert.deepEqual(designParaResultado(dependente, fonte), designParaResultado(dependente, fonte, { fonte, resultadoModelo: resolverModeloPronto([]) }), 'reuso vazio mantém paridade de contorno com fonte em camada oculta');
const onlyModel: Design = { ...base, elementos: [modelo('empty', 0, 0, 1, '#112233')] };
const vazioResolvido = prepararModelo('chaveiro-nome', { base: 'padrao', extras: (onlyModel.elementos[0] as Extract<Design['elementos'][number], { tipo: 'modelo' }>).valores });
const vazioPronto: ModeloPronto = { elementoId: 'empty', receita: 'chaveiro-nome', valores: vazioResolvido.valores, idsFonte: vazioResolvido.idsFonte, tentativa: 0, chave: chaveModeloPronto('chaveiro-nome', vazioResolvido.valores, vazioResolvido.idsFonte, 0), resultado: { itens: [], cores: [], avisos: ['Resultado vazio intencional'], notas: ['Nota preservada'] } };
const vazioComposicao = designParaResultado(onlyModel, fonte, { fonte, resultadoModelo: resolverModeloPronto([vazioPronto]) });
assert.ok(vazioComposicao.avisos.some((a) => a.endsWith(': Resultado vazio intencional')), 'resultado vazio mantém avisos do modelo e conclui a composição');
assert.ok(vazioComposicao.notas?.some((n) => n.endsWith(': Nota preservada')), 'resultado vazio mantém notas do modelo');
assert.deepEqual(designParaResultado(modeloOculto, fonte), designParaResultado(modeloOculto, fonte, { fonte, resultadoModelo: resolverModeloPronto([]) }), 'modelo oculto é ignorado sem entrada pronta');
console.log('reuso de modelos: composição, transformações, imutabilidade e falhas explícitas passaram');
