/**
 * Verificacao do extrator de operadores, sem pdfjs e sem arquivo.
 * `opListToDrawing` e pura e recebe o mapa OPS por injecao, entao da para montar
 * operator lists a mao e checar CTM, fillRule, recorte e Form XObject.
 *
 *   npx tsx scripts/verificar-ops.ts
 */
import { decodeDrawOps, opListToDrawing, type OpsMap, type OpListLike } from '../lib/import/pdf-ops';
import { apply, baseCTM, mul, IDENT, PT_TO_MM, type Mat } from '../lib/import/matrix';
import { buildRegion, regionArea, regionBounds, scaleRegion, regionIsRect, strokeToRegion } from '../lib/geom/region';

let falhas = 0;
let total = 0;

function ok(nome: string, cond: boolean, detalhe = ''): void {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
}

function perto(a: number, b: number, tol = 1e-3): boolean {
  return Math.abs(a - b) <= tol;
}

// OPS falso: os valores nao importam, so precisam ser distintos.
const O: OpsMap = {
  save: 1, restore: 2, transform: 3, constructPath: 4, clip: 5, eoClip: 6, endPath: 7,
  fill: 10, eoFill: 11, stroke: 12, closeStroke: 13, fillStroke: 14, eoFillStroke: 15,
  closeFillStroke: 16, closeEOFillStroke: 17, setLineWidth: 20, setLineCap: 21, setLineJoin: 22,
  setGState: 23, paintFormXObjectBegin: 30, paintFormXObjectEnd: 31,
  beginMarkedContentProps: 40, endMarkedContent: 41, showText: 50,
  paintImageXObject: 60, paintJpegXObject: 61, paintInlineImage: 62, paintImageMaskXObject: 63,
};

const D = { moveTo: 0, lineTo: 1, curveTo: 2, quad: 3, close: 4 };
const A4: readonly [number, number, number, number] = [0, 0, 595, 842];

/** Retangulo como o pdf.js expande o operador `re`. */
function ret(x: number, y: number, w: number, h: number): number[] {
  return [D.moveTo, x, y, D.lineTo, x + w, y, D.lineTo, x + w, y + h, D.lineTo, x, y + h, D.close];
}

function lista(...pares: [number, unknown][]): OpListLike {
  return { fnArray: pares.map((p) => p[0]), argsArray: pares.map((p) => p[1]) };
}

const pintar = (flat: number[], op: number): [number, unknown] => [O.constructPath, [op, [flat], null]];

console.log('\n== matriz ==');
{
  const m: Mat = [2, 0, 0, 3, 10, 20];
  ok('mul com identidade nao altera', JSON.stringify(mul(m, IDENT)) === JSON.stringify(m));
  const A: Mat = [2, 0, 0, 2, 0, 0];
  const B: Mat = [1, 0, 0, 1, 5, 7];
  // A ordem importa: mul(A,B) deve aplicar B primeiro.
  const viaComposta = apply(mul(A, B), 1, 1);
  const viaAninhada = apply(A, apply(B, 1, 1).x, apply(B, 1, 1).y);
  ok('mul(A,B) == aplicar B depois A', perto(viaComposta.x, viaAninhada.x) && perto(viaComposta.y, viaAninhada.y),
     `${viaComposta.x},${viaComposta.y} vs ${viaAninhada.x},${viaAninhada.y}`);

  const base = baseCTM([0, 0, 72, 72], 0);
  const p = apply(base, 72, 72);
  ok('72pt = 25.4mm', perto(p.x, 25.4) && perto(p.y, 25.4), `${p.x.toFixed(3)},${p.y.toFixed(3)}`);
  const origem = apply(baseCTM([20, 30, 200, 400], 0), 20, 30);
  ok('origem da MediaBox vai para (0,0)', perto(origem.x, 0) && perto(origem.y, 0), `${origem.x},${origem.y}`);

  // Rotate 90: a pagina deitada; o canto (x1,y0) deve ir para a origem.
  const r90 = baseCTM([0, 0, 200, 100], 90);
  const c = apply(r90, 200, 0);
  ok('Rotate 90 reposiciona o canto', perto(c.x, 0) && perto(c.y, 0), `${c.x.toFixed(2)},${c.y.toFixed(2)}`);
}

console.log('\n== decodificador do buffer flat ==');
{
  const base = baseCTM(A4, 0);
  const cs = decodeDrawOps(ret(0, 0, 72, 72), base);
  ok('retangulo vira 1 contorno fechado', cs.length === 1 && cs[0]!.closed === true, `${cs.length} contornos`);
  const b = regionBounds(buildRegion(cs.map((c) => c.pts), 'nonzero'));
  ok('lado do retangulo = 25.4mm', perto(b.w, 25.4) && perto(b.h, 25.4), `${b.w.toFixed(3)}x${b.h.toFixed(3)}`);

  const curva = decodeDrawOps([D.moveTo, 0, 0, D.curveTo, 0, 40, 40, 40, 40, 0, D.close], base);
  ok('curva cubica achatada em varios pontos', (curva[0]?.pts.length ?? 0) > 5, `${curva[0]?.pts.length} pontos`);

  const semClose = decodeDrawOps([D.moveTo, 0, 0, D.lineTo, 72, 0, D.lineTo, 72, 72], base);
  ok('subpath sem closePath ainda e emitido', semClose.length === 1 && semClose[0]!.pts.length === 3,
     'preenchimento fecha implicitamente');

  const f32 = decodeDrawOps(new Float32Array(ret(0, 0, 72, 72)), base);
  ok('aceita Float32Array', f32.length === 1);

  let lancou = false;
  try { decodeDrawOps([99, 1, 2], base); } catch { lancou = true; }
  ok('opcode desconhecido lanca (nao devolve lixo)', lancou);
}

console.log('\n== CTM na operator list ==');
{
  const d = opListToDrawing(
    lista(
      [O.save, null],
      [O.transform, [2, 0, 0, 2, 144, 0]],
      pintar(ret(0, 0, 72, 72), O.fill),
      [O.restore, null],
      pintar(ret(0, 0, 72, 72), O.fill)
    ),
    O,
    { view: A4 }
  );
  ok('dois objetos', d.objetos.length === 2, `${d.objetos.length}`);
  const [a, b] = d.objetos;
  ok('objeto dentro de q/cm dobra de tamanho', perto(a!.bounds.w, 50.8), `${a!.bounds.w.toFixed(2)}mm`);
  ok('objeto dentro de q/cm desloca 144pt', perto(a!.bounds.minX, 144 * PT_TO_MM), `${a!.bounds.minX.toFixed(2)}mm`);
  ok('restore desfaz a transformacao', perto(b!.bounds.w, 25.4) && perto(b!.bounds.minX, 0), `${b!.bounds.w.toFixed(2)}mm`);
}

console.log('\n== fillRule por objeto ==');
{
  const concentricos = [...ret(0, 0, 100, 100), ...ret(25, 25, 50, 50)];
  const nz = opListToDrawing(lista(pintar(concentricos, O.fill)), O, { view: A4 });
  const eo = opListToDrawing(lista(pintar(concentricos, O.eoFill)), O, { view: A4 });
  const rNz = buildRegion(nz.objetos[0]!.contours.map((c) => c.pts), nz.objetos[0]!.fillRule);
  const rEo = buildRegion(eo.objetos[0]!.contours.map((c) => c.pts), eo.objetos[0]!.fillRule);
  ok('fill -> nonzero, sem buraco', rNz[0]?.holes.length === 0, `${rNz[0]?.holes.length} buracos`);
  ok('eoFill -> evenodd, com buraco', rEo[0]?.holes.length === 1, `${rEo[0]?.holes.length} buracos`);
  const areaEsperada = (100 * 100 - 50 * 50) * PT_TO_MM * PT_TO_MM;
  ok('area do evenodd desconta o buraco', perto(regionArea(rEo), areaEsperada, 0.5),
     `${regionArea(rEo).toFixed(1)} vs ${areaEsperada.toFixed(1)}`);
}

console.log('\n== recorte (mascara do Illustrator) ==');
{
  const d = opListToDrawing(
    lista(
      [O.save, null],
      [O.constructPath, [0, [ret(0, 0, 72, 72)], null]],
      [O.clip, null],
      [O.endPath, null],
      pintar(ret(0, 0, 288, 288), O.fill),
      [O.restore, null]
    ),
    O,
    { view: A4 }
  );
  const obj = d.objetos[0];
  ok('objeto recortado guarda o clip', !!obj?.clip, obj?.clip ? 'sim' : 'nao');
  ok('clip reconhecido como retangulo', obj?.clip?.isRect === true);
  ok('area do clip = 25.4mm2', perto(obj!.clip!.bounds.w, 25.4), `${obj!.clip!.bounds.w.toFixed(2)}mm`);
}

console.log('\n== Form XObject (simbolo/grupo do Illustrator) ==');
{
  const d = opListToDrawing(
    lista(
      [O.paintFormXObjectBegin, [[2, 0, 0, 2, 0, 0], [0, 0, 1000, 1000]]],
      pintar(ret(0, 0, 72, 72), O.fill),
      [O.paintFormXObjectEnd, null],
      pintar(ret(0, 0, 72, 72), O.fill)
    ),
    O,
    { view: A4 }
  );
  ok('XObject aplica a matriz propria', perto(d.objetos[0]!.bounds.w, 50.8), `${d.objetos[0]!.bounds.w.toFixed(2)}mm`);
  ok('XObject end restaura a CTM', perto(d.objetos[1]!.bounds.w, 25.4), `${d.objetos[1]!.bounds.w.toFixed(2)}mm`);
}

console.log('\n== robustez ==');
{
  const d = opListToDrawing(lista([O.restore, null], pintar(ret(0, 0, 72, 72), O.fill)), O, { view: A4 });
  ok('Q sem q nao quebra', d.objetos.length === 1);

  const t = opListToDrawing(lista([O.showText, null], pintar(ret(0, 0, 72, 72), O.fill)), O, { view: A4 });
  ok('texto vivo gera aviso', t.avisos.some((a) => a.codigo === 'texto-vivo'));

  const s = opListToDrawing(lista([O.setLineWidth, [4]], pintar([D.moveTo, 0, 0, D.lineTo, 100, 0], O.stroke)), O, { view: A4 });
  ok('traco sem preenchimento gera aviso', s.avisos.some((a) => a.codigo === 'so-tracos'));
  ok('largura do traco convertida para mm', perto(s.objetos[0]!.larguraMm, 4 * PT_TO_MM), `${s.objetos[0]!.larguraMm.toFixed(3)}mm`);

  const oculta = opListToDrawing(
    lista([O.beginMarkedContentProps, ['OC', 'oc1']], pintar(ret(0, 0, 72, 72), O.fill), [O.endMarkedContent, null]),
    O,
    { view: A4, camadaVisivel: () => false }
  );
  ok('camada oculta e ignorada', oculta.objetos.length === 0, `${oculta.objetos.length} objetos`);

  const nomeada = opListToDrawing(
    lista([O.beginMarkedContentProps, ['OC', 'oc1']], pintar(ret(0, 0, 72, 72), O.fill), [O.endMarkedContent, null]),
    O,
    { view: A4, nomeCamada: () => 'Logotipo' }
  );
  ok('nome da camada e preservado', nomeada.objetos[0]?.camada === 'Logotipo', nomeada.objetos[0]?.camada ?? 'null');
}

console.log('\n== primitivas novas de region ==');
{
  const q = buildRegion([[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]], 'evenodd');
  ok('scaleRegion x2 quadruplica a area', perto(regionArea(scaleRegion(q, 2)), 400, 0.01), `${regionArea(scaleRegion(q, 2))}`);
  ok('espelhar preserva a area', perto(regionArea(scaleRegion(q, -1, 1)), 100, 0.01));
  ok('regionIsRect reconhece retangulo', regionIsRect(q) === true);
  const tri = buildRegion([[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 9 }]], 'evenodd');
  ok('regionIsRect rejeita triangulo', regionIsRect(tri) === false);
  const traco = strokeToRegion([{ pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }], closed: false }], 2);
  ok('strokeToRegion engrossa a linha', perto(regionArea(traco), 200, 1), `${regionArea(traco).toFixed(1)}mm2 (esperado ~200)`);
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
