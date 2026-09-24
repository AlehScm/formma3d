/**
 * Teste de ponta a ponta com o pdf.js REAL, em Node.
 * Confirma que o formato do buffer de path que assumimos bate com o que a
 * biblioteca realmente emite -- o unico ponto que nenhum teste sintetico cobre.
 *
 *   npx tsx scripts/verificar-pdf.ts
 */
import fs from 'fs';
import { pdfMinimo, re } from './mkpdf.mjs';
import { opListToDrawing, type OpsMap } from '../lib/import/pdf-ops';
import { desenhoParaPecas } from '../lib/import/pecas';
import { regionArea, regionBounds, buildRegion, type Region } from '../lib/geom/region';
import { parseFont, textToLetters } from '../lib/text/glyphs';

const MM = 25.4 / 72;
let falhas = 0;
let total = 0;

function ok(nome: string, cond: boolean, detalhe = ''): void {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
}
const perto = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

async function extrair(bytes: Uint8Array) {
  const task = pdfjs.getDocument({ data: bytes, disableFontFace: true, useSystemFonts: false, stopAtErrors: false });
  const doc = await task.promise;
  const page = await doc.getPage(1);
  const opList = await page.getOperatorList();
  const desenho = opListToDrawing(opList, pdfjs.OPS as unknown as OpsMap, {
    view: page.view as [number, number, number, number],
    rotate: page.rotate,
  });
  await task.destroy();
  return desenho;
}

const regiaoDe = (d: Awaited<ReturnType<typeof extrair>>): Region =>
  buildRegion(
    d.objetos.flatMap((o) => o.contours.filter((c) => c.pts.length >= 3).map((c) => c.pts)),
    d.objetos[0]?.fillRule ?? 'nonzero'
  );

console.log('\n== operadores reais do pdf.js ==');
{
  const d = await extrair(pdfMinimo(`${re(0, 0, 72, 72)} f`));
  ok('quadrado de 72pt e extraido', d.objetos.length === 1, `${d.objetos.length} objetos`);
  const b = regionBounds(regiaoDe(d));
  ok('mede 25.4 x 25.4 mm', perto(b.w, 25.4) && perto(b.h, 25.4), `${b.w.toFixed(2)}x${b.h.toFixed(2)}`);
  ok('nao esta flipado em Y', perto(b.minY, 0), `minY=${b.minY.toFixed(2)}`);
}

console.log('\n== nonzero x evenodd em arquivo real ==');
{
  const dois = `${re(0, 0, 100, 100)} ${re(25, 25, 50, 50)}`;
  const nz = regiaoDe(await extrair(pdfMinimo(`${dois} f`)));
  const eo = regiaoDe(await extrair(pdfMinimo(`${dois} f*`)));
  ok('f preenche tudo (sem buraco)', nz[0]?.holes.length === 0, `${nz[0]?.holes.length} buracos`);
  ok('f* abre o buraco', eo[0]?.holes.length === 1, `${eo[0]?.holes.length} buracos`);
  ok('area de f* desconta o miolo', perto(regionArea(eo), (100 * 100 - 50 * 50) * MM * MM, 0.5), `${regionArea(eo).toFixed(1)}mm2`);
}

console.log('\n== CTM aninhada (q/cm/Q) ==');
{
  const d = await extrair(pdfMinimo(`q 2 0 0 2 144 0 cm ${re(0, 0, 72, 72)} f Q ${re(0, 0, 72, 72)} f`));
  ok('dois objetos', d.objetos.length === 2, `${d.objetos.length}`);
  const a = d.objetos.find((o) => o.bounds.w > 30);
  const b = d.objetos.find((o) => o.bounds.w < 30);
  ok('cm dobra o tamanho', !!a && perto(a.bounds.w, 50.8), `${a?.bounds.w.toFixed(2)}mm`);
  ok('cm desloca 144pt', !!a && perto(a.bounds.minX, 144 * MM), `${a?.bounds.minX.toFixed(2)}mm`);
  ok('Q restaura', !!b && perto(b.bounds.minX, 0), `${b?.bounds.minX.toFixed(2)}mm`);
}

console.log('\n== curva cubica ==');
{
  const d = await extrair(pdfMinimo(`0 0 m 100 0 l 100 100 0 100 0 0 c h f`));
  ok('curva vira polilinha', (d.objetos[0]?.contours[0]?.pts.length ?? 0) > 8, `${d.objetos[0]?.contours[0]?.pts.length} pontos`);
}

console.log('\n== recorte (W n) ==');
{
  const d = await extrair(pdfMinimo(`q ${re(0, 0, 72, 72)} W n ${re(0, 0, 288, 288)} f Q`));
  const obj = d.objetos[0];
  ok('objeto sai recortado', !!obj?.clip, obj?.clip ? 'com clip' : 'SEM CLIP');
  const pecas = desenhoParaPecas(d, { modo: 'forma', incluirTracos: false, fundirProximos: 0, areaMinima: 0.1 });
  const area = pecas.reduce((s, p) => s + regionArea(p.region), 0);
  ok('area limitada ao recorte', perto(area, 25.4 * 25.4, 1), `${area.toFixed(1)}mm2 (esperado 645)`);
}

console.log('\n== Form XObject com matriz propria ==');
{
  const bytes = pdfMinimo('q /X0 Do Q', {
    xobjects: { X0: { matriz: [2, 0, 0, 2, 0, 0], bbox: [0, 0, 1000, 1000], stream: `${re(0, 0, 72, 72)} f` } },
  });
  const d = await extrair(bytes);
  ok('conteudo do XObject e extraido', d.objetos.length === 1, `${d.objetos.length} objetos`);
  ok('matriz do XObject aplicada', perto(d.objetos[0]?.bounds.w ?? 0, 50.8), `${d.objetos[0]?.bounds.w.toFixed(2)}mm (esperado 50.8)`);
}

console.log('\n== MediaBox deslocada e /Rotate ==');
{
  const d = await extrair(pdfMinimo(`${re(20, 30, 72, 72)} f`, { mediaBox: [20, 30, 400, 500] }));
  const b = regionBounds(regiaoDe(d));
  ok('origem da MediaBox normalizada', perto(b.minX, 0) && perto(b.minY, 0), `${b.minX.toFixed(2)},${b.minY.toFixed(2)}`);

  const r = await extrair(pdfMinimo(`${re(0, 0, 100, 50)} f`, { mediaBox: [0, 0, 400, 200], rotate: 90 }));
  const rb = regionBounds(regiaoDe(r));
  ok('Rotate 90 gira o desenho', perto(rb.w, 50 * MM) && perto(rb.h, 100 * MM), `${rb.w.toFixed(2)}x${rb.h.toFixed(2)}mm`);
}

console.log('\n== separacao em pecas ==');
{
  const d = await extrair(pdfMinimo(`${re(0, 0, 72, 72)} ${re(200, 0, 72, 72)} f`));
  const forma = desenhoParaPecas(d, { modo: 'forma', incluirTracos: false, fundirProximos: 0, areaMinima: 1 });
  ok('duas formas separadas = 2 pecas', forma.length === 2, `${forma.length} pecas`);
  ok('pecas numeradas da esquerda p/ direita', forma[0]?.nome === '01' && forma[1]?.nome === '02', forma.map((p) => p.nome).join(','));

  const objeto = desenhoParaPecas(d, { modo: 'objeto', incluirTracos: false, fundirProximos: 0, areaMinima: 1 });
  ok('modo objeto respeita o arquivo (1 operacao de fill)', objeto.length === 1, `${objeto.length} peca`);

  const encostadas = await extrair(pdfMinimo(`${re(0, 0, 72, 72)} ${re(72, 0, 72, 72)} f`));
  const fundidas = desenhoParaPecas(encostadas, { modo: 'forma', incluirTracos: false, fundirProximos: 0, areaMinima: 1 });
  ok('formas que se encostam viram 1 peca', fundidas.length === 1, `${fundidas.length} peca`);

  const prox = desenhoParaPecas(await extrair(pdfMinimo(`${re(0, 0, 72, 72)} ${re(80, 0, 72, 72)} f`)), {
    modo: 'forma', incluirTracos: false, fundirProximos: 5, areaMinima: 1,
  });
  ok('fundirProximos une o que esta perto (acento)', prox.length === 1, `${prox.length} peca`);
}

console.log('\n== escala por altura ==');
{
  const d = await extrair(pdfMinimo(`${re(0, 0, 72, 144)} f`));
  const p = desenhoParaPecas(d, { modo: 'forma', incluirTracos: false, fundirProximos: 0, areaMinima: 1, altura: 200 });
  const b = regionBounds(p[0]!.region);
  ok('altura vira exatamente a pedida', perto(b.h, 200), `${b.h.toFixed(2)}mm`);
  ok('proporcao preservada', perto(b.w, 100), `${b.w.toFixed(2)}mm (esperado 100)`);
}

console.log('\n== traco sem preenchimento ==');
{
  const d = await extrair(pdfMinimo(`4 w 0 0 m 288 0 l S`));
  ok('aviso de so-tracos', d.avisos.some((a) => a.codigo === 'so-tracos'));
  const p = desenhoParaPecas(d, { modo: 'forma', incluirTracos: false, fundirProximos: 0, areaMinima: 0.1 });
  const esperado = 288 * MM * (4 * MM);
  ok('traco engrossado vira area', p.length === 1 && perto(regionArea(p[0]!.region), esperado, 1),
     `${p[0] ? regionArea(p[0].region).toFixed(1) : 0}mm2 (esperado ${esperado.toFixed(1)})`);
}

console.log('\n== golden: glifo -> PDF -> volta ==');
{
  // Fecha o ciclo com o proprio motor de fontes do app: se area e bounds voltarem
  // iguais, entao CTM, unidades, origem e fillRule estao corretos ponta a ponta.
  const b = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
  const font = parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  const letra = textToLetters(font, 'B', { altura: 50 })[0]!; // em mm
  const areaOrig = regionArea(letra.region);
  const bOrig = regionBounds(letra.region);

  // mm -> pt ao escrever os operadores
  const K = 72 / 25.4;
  const ops: string[] = [];
  for (const poly of letra.region) {
    for (const ring of [poly.outer, ...poly.holes]) {
      ops.push(`${(ring[0]!.x * K).toFixed(4)} ${(ring[0]!.y * K).toFixed(4)} m`);
      for (const p of ring.slice(1)) ops.push(`${(p.x * K).toFixed(4)} ${(p.y * K).toFixed(4)} l`);
      ops.push('h');
    }
  }
  const d = await extrair(pdfMinimo(`${ops.join('\n')}\nf*`));
  const volta = regiaoDe(d);
  const areaVolta = regionArea(volta);
  const bVolta = regionBounds(volta);

  ok('letra B tem 2 buracos na volta', volta[0]?.holes.length === 2, `${volta[0]?.holes.length}`);
  ok('area preservada', perto(areaVolta, areaOrig, areaOrig * 0.001), `${areaVolta.toFixed(2)} vs ${areaOrig.toFixed(2)} mm2`);
  ok('largura preservada', perto(bVolta.w, bOrig.w, 0.02), `${bVolta.w.toFixed(3)} vs ${bOrig.w.toFixed(3)} mm`);
  ok('altura preservada', perto(bVolta.h, bOrig.h, 0.02), `${bVolta.h.toFixed(3)} vs ${bOrig.h.toFixed(3)} mm`);
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
