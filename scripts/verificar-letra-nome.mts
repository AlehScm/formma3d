import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseFont } from '../lib/text/glyphs';
import { diffRegion, regionArea, regionBounds, type Region } from '../lib/geom/region';
import { circulo, contornar, unir } from '../lib/gerador/formas';
import { nomeConectado } from '../lib/gerador/nome-conectado';
import { receitaPorId } from '../lib/gerador/receitas';
import { valoresPadrao } from '../lib/gerador/tipos';
import { posicoesDaPeca } from '../lib/gerador/malha';
import { malhaFechada } from '../lib/mesh/relevo';
import { areaDoDesign } from '../lib/design/enquadramento';
import { designNovo, type Elemento } from '../lib/design/documento';
import { mundoDoElemento } from '../lib/design/manipuladores';

const anel = (x: number, y: number) => diffRegion(circulo(x, y, 10), circulo(x, y, 6));
const separados = unir([anel(-16, 0), anel(16, 0), anel(2, 28)]);
const ligados = nomeConectado(separados, 1);
assert.equal(ligados.length, 1, 'conecta todas as ilhas');
assert.equal(ligados[0]!.holes.length, 3, 'preserva os miolos em vez de tapar as letras');
assert.ok(regionArea(ligados) - regionArea(contornar(separados, 1)) < 25, 'acrescenta pontes locais, nao uma faixa pela palavra');
assert.equal(nomeConectado([], 1).length, 0);
assert.deepEqual(nomeConectado(anel(0, 0), 1), contornar(anel(0, 0), 1), 'nao altera nome ja conectado');

const fontes = new Map<string, ReturnType<typeof parseFont>>();
const ctx = { fonte: (id: string) => {
  if (!fontes.has(id)) {
    const b = fs.readFileSync(`public/fontes/${id}.ttf`);
    fontes.set(id, parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer));
  }
  return fontes.get(id)!;
} };
for (const id of ['letra-grande', 'luminaria-letra']) {
  const receita = receitaPorId(id)!;
  assert.ok(receita, id);
  for (const nome of ['Mom', 'João', 'Ana Maria', 'Bia+Lu']) {
    const resultado = receita.gerar({ ...valoresPadrao(receita), nome }, ctx);
    const item = resultado.itens.find((i) => i.nome === 'Nome')!;
    assert.ok(item, `${id}/${nome}: tem nome`);
    for (const peca of item.pecas) {
      assert.ok(peca.camadas.every((c) => c.region.length === 1), `${id}/${nome}: nome conectado`);
      assert.ok(malhaFechada(posicoesDaPeca(peca)), `${id}/${nome}: malha fechada`);
    }
  }
}

const d = designNovo();
const e: Elemento = { id: 'molde', camadaId: d.camadas[0]!.id, tipo: 'modelo', receita: 'letra-grande', valores: {}, x: 30, y: -20, giro: 37, escalaX: 1.3, escalaY: 0.8, espelhar: true };
const b = { minX: -193.75, minY: -80, w: 387.5, h: 160 };
d.elementos = [e];
const antes = JSON.stringify(d);
const a = areaDoDesign(d, new Map(), new Map([[e.id, b]]));
for (const x of [b.minX, b.minX + b.w]) for (const y of [b.minY, b.minY + b.h]) {
  const p = mundoDoElemento(e, { x, y });
  assert.ok(p.x >= a.minX + 9.99 && p.x <= a.minX + a.w - 9.99 && p.y >= a.minY + 9.99 && p.y <= a.minY + a.h - 9.99, 'inclui modelo girado, escalado e espelhado com margem');
}
assert.equal(JSON.stringify(d), antes, 'enquadramento nao altera dimensoes fisicas nem projeto');
const minimo = { minX: -100, minY: -70, w: 200, h: 140 };
assert.deepEqual(areaDoDesign({ ...d, elementos: [{ ...e, oculto: true }] }, new Map(), new Map([[e.id, b]])), minimo);
assert.deepEqual(areaDoDesign({ ...d, camadas: d.camadas.map((c) => ({ ...c, oculta: true })) }, new Map(), new Map([[e.id, b]])), minimo);
const desenho: Region = circulo(300, 200, 25);
const areaDesenho = areaDoDesign({ ...d, elementos: [] }, new Map([[e.camadaId, desenho]]));
const bd = regionBounds(desenho);
assert.ok(areaDesenho.minX + areaDesenho.w >= bd.maxX + 10 && areaDesenho.minY + areaDesenho.h >= bd.maxY + 10, 'inclui desenhos e suas camadas');
console.log('Letra/nome: conexoes locais, miolos, fontes reais, malhas e enquadramento passaram.');
