import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { Font } from 'opentype.js';
import { parseFont } from '../lib/text/glyphs';
import { circulo, retanguloArredondado } from '../lib/gerador/formas';
import { comArgola, comArgolaDeslocada, emGrade, loteDeNomes, avisarArgolaDesconectada } from '../lib/gerador/lote';
import { atualizarPosicaoManipulador, alvoDeNome, furarSeSobrepoe } from '../lib/gerador/manipuladores';
import { intersectRegion, regionArea, regionBounds } from '../lib/geom/region';
import { localDoElemento, mundoDoElemento } from '../lib/design/manipuladores';
import type { ManipuladorModelo, Valores } from '../lib/gerador/tipos';
import { valoresPadrao } from '../lib/gerador/tipos';
import { receitaPorId } from '../lib/gerador/receitas';

const base = circulo(0, 0, 10);
const zero = comArgolaDeslocada(base, 'esquerda', 3, 2, { x: 0, y: 0 });
assert.deepEqual(zero.regiao, comArgola(base, 'esquerda', 3, 2));
const movida = comArgolaDeslocada(base, 'esquerda', 3, 2, { x: 4, y: 2 });
assert.notDeepEqual(movida.regiao, zero.regiao);
assert.equal(avisarArgolaDesconectada(base, movida.regiao).length, 0);
const quadrado = retanguloArredondado(0, 0, 20, 20, 0);
assert.equal(furarSeSobrepoe(quadrado, circulo(30, 0, 2)), quadrado, 'furo externo preserva geometria sem operação booleana');
assert.ok(furarSeSobrepoe(quadrado, circulo(0, 0, 2))[0]?.holes.length === 1, 'o furo atravessa corpo quando cai sobre ele');

const m: ManipuladorModelo = { id: 'a', rotulo: 'Argola', item: 0, ponto: { x: 0, y: 0 }, parametro: 'posicoesArgola', alvo: 'ana#0', valor: { x: 0, y: 0 } };
let v: Valores = { posicoesArgola: '{invalid', outro: 7 };
v = atualizarPosicaoManipulador(v, m, { x: 650, y: NaN });
assert.equal(v.outro, 7);
assert.deepEqual(JSON.parse(String(v.posicoesArgola))['ana#0'], { x: 500, y: 0 });
v = atualizarPosicaoManipulador(v, { ...m, alvo: 'bia#0' }, { x: 1, y: 2 });
assert.deepEqual(Object.keys(JSON.parse(String(v.posicoesArgola))).sort(), ['ana#0', 'bia#0']);
assert.equal(alvoDeNome(' Ana  Silva ', 1), alvoDeNome('ana Silva', 1));
assert.notEqual(alvoDeNome('Ana', 0), alvoDeNome('Ana', 1));

const el = { x: 12, y: -3, giro: 37, escalaX: 1.8, escalaY: 0.7, espelhar: true };
const p = { x: 4.2, y: -8.1 };
const volta = localDoElemento(el, mundoDoElemento(el, p));
assert.ok(Math.abs(volta.x - p.x) < 1e-9 && Math.abs(volta.y - p.y) < 1e-9);

const item = (nome: string, x: number) => ({ nome, pecas: [{ nome, cor: 0, camadas: [{ region: circulo(x, 0, 2), z0: 0, z1: 1 }] }], alvoArgola: nome, pontoArgola: { x, y: 0 }, offsetArgola: { x: 0, y: 0 } });
const grade = emGrade([item('ana', 0), item('bia', 20)]);
assert.deepEqual(grade.map((i) => i.alvoArgola), ['ana', 'bia']);
assert.ok(grade[0]?.pontoArgola && grade[1]?.pontoArgola && grade[0].pontoArgola.x !== grade[1].pontoArgola.x);
const alvos: string[] = [];
loteDeNomes({ nomes: 'Ana, ANA, Bia' }, (_, nome, alvo) => {
  alvos.push(alvo);
  return { item: nome === 'Ana' ? null : item(nome, 0), avisos: [] };
});
assert.deepEqual(alvos, ['ana#0', 'ana#1', 'bia#0'], 'alvos de nomes repetidos permanecem distintos mesmo se um item anterior não gerar');

const buf = fs.readFileSync('public/fontes/archivo-black.ttf');
const fonte: Font = parseFont(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
const ctx = { fonte: () => fonte };
for (const id of ['chaveiro-nome', 'chaveiro-retangular', 'chaveiro-desenho', 'chaveiro-logo-nome']) {
  const receita = receitaPorId(id)!;
  const padrao: Valores = { ...valoresPadrao(receita), ...(id === 'chaveiro-nome' ? { contornoBase: 0.5, contornoMeio: 1.8, contornoTopo: 2 } : {}) };
  const antes = receita.gerar(padrao, ctx);
  const alvo = antes.manipuladores?.[0]?.alvo;
  assert.ok(alvo, `${id} expõe alvo de argola`);
  const zeroReceita = receita.gerar({ ...padrao, posicoesArgola: JSON.stringify({ [alvo]: { x: 0, y: 0 } }) }, ctx);
  assert.deepEqual(zeroReceita.itens, antes.itens, `${id}: offset zero preserva a geometria padrão`);
  const depois = receita.gerar({ ...padrao, posicoesArgola: JSON.stringify({ [alvo]: { x: 100, y: 100 } }) }, ctx);
  assert.deepEqual(depois.referenciaXY, antes.referenciaXY, `${id}: referência mantém bbox padrão ao mover 100 mm`);
  assert.ok(depois.avisos.some((a) => a.includes('argola ficou desconectada')), `${id}: avisa quando a argola fica desconectada`);
  const editado = antes.manipuladores![0]!.item;
  for (let i = 0; i < antes.itens.length; i++) {
    const p0 = antes.itens[i]!;
    const p1 = depois.itens[i]!;
    if (i !== editado) assert.deepEqual(p1, p0, `${id}: itens vizinhos permanecem imóveis`);
    else {
      const labelCorpo = id === 'chaveiro-retangular' ? ['Contorno', 'Nome'] : id === 'chaveiro-desenho' ? ['Desenho', 'Borda'] : id === 'chaveiro-logo-nome' ? ['Borda', 'Logo', 'Nome'] : ['Meio', 'Topo'];
      for (const nome of labelCorpo) {
        const a = p0.pecas.find((p) => p.nome === nome), b = p1.pecas.find((p) => p.nome === nome);
        if (a && b) assert.deepEqual(b.camadas, a.camadas, `${id}: camada ${nome} não se move`);
      }
    }
  }

  const itemBase = antes.itens[antes.manipuladores![0]!.item]!;
  const pecasCorpo = itemBase.pecas.filter((p) => !['Base', 'Placa'].includes(p.nome));
  const regiaoCorpo = pecasCorpo.flatMap((p) => p.camadas.flatMap((c) => c.region));
  const b = regionBounds(regiaoCorpo);
  const diametro = Number(padrao.furo);
  let pontoTexto: { x: number; y: number } | undefined;
  for (let iy = 0; iy <= 30 && !pontoTexto; iy++) for (let ix = 0; ix <= 30 && !pontoTexto; ix++) {
    const q = { x: b.minX + b.w * ix / 30, y: b.minY + b.h * iy / 30 };
    const disco = circulo(q.x, q.y, diametro / 2, 48);
    if (regionArea(intersectRegion(regiaoCorpo, disco)) > 0.1) pontoTexto = q;
  }
  assert.ok(pontoTexto, `${id}: encontra trecho sólido do texto/arte para perfurar`);
  const manipulador = antes.manipuladores![0]!;
  const delta = { x: pontoTexto!.x - manipulador.ponto.x, y: pontoTexto!.y - manipulador.ponto.y };
  const furado = receita.gerar({ ...padrao, posicoesArgola: JSON.stringify({ [alvo]: delta }) }, ctx);
  const centroFuro = furado.manipuladores!.find((m) => m.alvo === alvo)!.ponto;
  const discoFuro = circulo(centroFuro.x, centroFuro.y, diametro / 2, 48);
  const camadas = furado.itens[manipulador.item]!.pecas.flatMap((p) => p.camadas);
  assert.ok(camadas.every((c) => regionArea(intersectRegion(c.region, discoFuro)) < 0.01), `${id}: furo atravessa toda camada sob o texto`);
  assert.deepEqual(furado.referenciaXY, antes.referenciaXY, `${id}: referência estável com furo sobre texto e contorno não padrão`);
}

const desenho = receitaPorId('chaveiro-desenho')!;
const valoresDesenho = valoresPadrao(desenho);
const baixo = desenho.gerar({ ...valoresDesenho, origem: 'texto', texto: 'I', face: 'baixo', estilo: 'relevo' }, ctx);
const baixoMovido = desenho.gerar({ ...valoresDesenho, origem: 'texto', texto: 'I', face: 'baixo', estilo: 'relevo', posicoesArgola: JSON.stringify({ single: { x: 8, y: 0 } }) }, ctx);
assert.ok(baixoMovido.manipuladores![0]!.ponto.x < baixo.manipuladores![0]!.ponto.x, 'face para baixo: delta X local positivo move ponto espelhado para X negativo');
const sobrepostoBaixo = desenho.gerar({ ...valoresDesenho, estilo: 'sobreposto', face: 'baixo' }, ctx);
const sobrepostoCima = desenho.gerar({ ...valoresDesenho, estilo: 'sobreposto', face: 'cima' }, ctx);
assert.ok(sobrepostoBaixo.itens[0]?.pecas.some((p) => p.nome === 'Borda'), 'sobreposto com valor oculto face=baixo mantém borda');
assert.deepEqual(sobrepostoBaixo.itens[0]?.pecas, sobrepostoCima.itens[0]?.pecas, 'face oculto não espelha estilo sobreposto');
const assimetrico = JSON.stringify({ nome: 'assimetrico', regiao: [{ outer: [{ x: 0, y: 0 }, { x: 24, y: 0 }, { x: 20, y: 11 }, { x: 7, y: 18 }, { x: 0, y: 9 }], holes: [] }] });
const faceBaixoAssimetrico = desenho.gerar({ ...valoresDesenho, desenho: assimetrico, origem: 'imagem', estilo: 'relevo', face: 'baixo' }, ctx);
assert.ok(faceBaixoAssimetrico.itens[0]?.pecas.find((p) => p.nome === 'Borda')?.camadas[0]?.region.length, 'face para baixo espelha consistentemente arte e anel assimétricos');
const arteBaixo = faceBaixoAssimetrico.itens[0]!.pecas.find((p) => p.nome === 'Desenho')!.camadas[0]!.region;
const bordaBaixo = faceBaixoAssimetrico.itens[0]!.pecas.find((p) => p.nome === 'Borda')!.camadas[0]!.region;
assert.ok(regionArea(intersectRegion(arteBaixo, bordaBaixo)) < 0.01, 'face para baixo não sobrepõe a arte assimétrica e a borda');
console.log('verificar-manipuladores: passou');
