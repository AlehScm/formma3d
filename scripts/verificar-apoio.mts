/**
 * Verificacao dos tres apoios da chapa.
 *   npx tsx scripts/verificar-apoio.mts
 */
import fs from 'fs';
import { parseFont, textToLetters, normalizeLetters } from '../lib/text/glyphs';
import { colisoesPorBorda, avisoColisao } from '../lib/geom/letreiro';
import { buildPart, alturaArte, type Apoio } from '../lib/geom/modes';
import { partToGeometry } from '../lib/geom/extrude';
import { geometryToSTL } from '../lib/export/stl';
import { regionArea, regionBounds, minThickness } from '../lib/geom/region';

let falhas = 0;
let total = 0;
function ok(nome: string, cond: boolean, detalhe = ''): void {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
}
const perto = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

/** Volume pelo teorema da divergencia: so bate com o analitico se a malha for fechada. */
function volumeDaMalha(buf: ArrayBuffer): number {
  const dv = new DataView(buf);
  const tris = dv.getUint32(80, true);
  let vol = 0;
  let off = 84;
  for (let t = 0; t < tris; t++) {
    off += 12;
    const p: number[][] = [];
    for (let v = 0; v < 3; v++) {
      p.push([dv.getFloat32(off, true), dv.getFloat32(off + 4, true), dv.getFloat32(off + 8, true)]);
      off += 12;
    }
    const [a, c, d] = p as [number[], number[], number[]];
    vol += (a[0]! * (c[1]! * d[2]! - c[2]! * d[1]!) - a[1]! * (c[0]! * d[2]! - c[2]! * d[0]!) + a[2]! * (c[0]! * d[1]! - c[1]! * d[0]!)) / 6;
    off += 2;
  }
  return Math.abs(vol);
}

const b = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
const font = parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
const O = textToLetters(font, 'O', { altura: 150 })[0]!; // tem contra-forma
const base = { modo: 'moldura_acm' as const, profundidade: 40, parede: 2.4, acmEsp: 3, batente: 2.5, borda: 3, bico: 0.4 };
const espO = minThickness(O.region);

console.log('\n== malha fechada nos tres apoios ==');
const dados: Record<Apoio, { chapa: number; pecaW: number; vol: number }> = {} as never;
for (const apoio of ['dentro', 'fora', 'canaleta'] as Apoio[]) {
  const part = buildPart(O.region, { ...base, apoio }, espO);
  const geo = partToGeometry(part)!;
  const vm = volumeDaMalha(geometryToSTL(geo, 'O'));
  const erro = (Math.abs(vm - part.volume) / part.volume) * 100;
  const chapa = part.extras.find((e) => e.kind === 'cut');
  const pecaB = regionBounds(part.layers.flatMap((l) => l.region));
  dados[apoio] = {
    chapa: chapa?.kind === 'cut' ? regionArea(chapa.region) : 0,
    pecaW: pecaB.w,
    vol: part.volume,
  };
  ok(
    `${apoio.padEnd(9)} malha fechada`,
    erro < 0.001,
    `erro ${erro.toFixed(4)}% | roles: ${[...new Set(part.layers.map((l) => l.role))].join('+')}`
  );
}

console.log('\n== a bordinha muda a peca e a chapa ==');
const letraW = O.bounds.w;
ok('apoio "dentro" nao passa do contorno da letra', perto(dados.dentro.pecaW, letraW, 0.1), `${dados.dentro.pecaW.toFixed(1)} vs letra ${letraW.toFixed(1)}mm`);
ok('apoio "fora" alarga a peca em 2x a borda', perto(dados.fora.pecaW, letraW + 2 * base.borda, 0.3), `${dados.fora.pecaW.toFixed(1)} vs esperado ${(letraW + 6).toFixed(1)}mm`);
ok('apoio "canaleta" tambem alarga', perto(dados.canaleta.pecaW, letraW + 2 * base.borda, 0.3), `${dados.canaleta.pecaW.toFixed(1)}mm`);
ok('chapa do "fora" e maior que a do "dentro"', dados.fora.chapa > dados.dentro.chapa, `${dados.fora.chapa.toFixed(0)} vs ${dados.dentro.chapa.toFixed(0)} mm2`);
ok('canaleta corta a mesma chapa que "fora"', perto(dados.canaleta.chapa, dados.fora.chapa, 1), `${dados.canaleta.chapa.toFixed(0)} vs ${dados.fora.chapa.toFixed(0)} mm2 (mesmo DXF)`);

{
  // Com borda = parede + folga, a chapa sai exatamente no contorno da arte original:
  // e o ajuste que faz o corte bater com o desenho que o cliente aprovou.
  const b2 = { ...base, apoio: 'fora' as Apoio, borda: base.parede + 0.3, acmFolga: 0.3 };
  const p = buildPart(O.region, b2, espO);
  const chapa = p.extras.find((e) => e.kind === 'cut');
  const areaChapa = chapa?.kind === 'cut' ? regionArea(chapa.region) : 0;
  const areaArte = regionArea(O.region);
  ok('borda = parede + folga faz a chapa sair no contorno da arte', perto(areaChapa, areaArte, areaArte * 0.01),
     `${areaChapa.toFixed(0)} vs arte ${areaArte.toFixed(0)} mm2`);
}

{
  // Regressao: 'dentro' tem que continuar identico ao que o app ja produzia.
  const a = buildPart(O.region, { ...base, apoio: 'dentro' }, espO);
  ok('"dentro" nao dilata o contorno', perto(regionArea(a.contorno), regionArea(O.region), 0.01),
     `contorno ${regionArea(a.contorno).toFixed(0)} = arte ${regionArea(O.region).toFixed(0)}`);
  const f = buildPart(O.region, { ...base, apoio: 'fora' }, espO);
  ok('"fora" expoe o contorno dilatado em Part.contorno', regionArea(f.contorno) > regionArea(O.region),
     `${regionArea(f.contorno).toFixed(0)} > ${regionArea(O.region).toFixed(0)} mm2`);
}

console.log('\n== a borda aparece como camada propria ==');
for (const apoio of ['fora', 'canaleta'] as Apoio[]) {
  const part = buildPart(O.region, { ...base, apoio }, espO);
  const temBorda = part.layers.some((l) => l.role === 'borda');
  ok(`${apoio.padEnd(9)} gera camada 'borda'`, temBorda);
}
const semBorda = buildPart(O.region, { ...base, apoio: 'dentro' }, espO);
ok('"dentro" nao gera borda', !semBorda.layers.some((l) => l.role === 'borda'));

console.log('\n== avisos nos casos-limite ==');
{
  // Miolo pequeno: o 'e' minusculo tem contra-forma estreita e fecharia ao dilatar.
  const e8 = textToLetters(font, 'e', { altura: 40 })[0]!;
  const espE = minThickness(e8.region);
  const buracosArte = e8.region.reduce((a, p) => a + p.holes.length, 0);
  const p = buildPart(e8.region, { ...base, apoio: 'fora', borda: 6 }, espE);
  const buracosPeca = p.contorno.reduce((a, x) => a + x.holes.length, 0);
  ok('miolo que fecharia e preservado', p.avisos.some((a) => a.includes('fechariam com borda')),
     p.avisos.find((a) => a.includes('fechariam')) ?? 'SEM AVISO');
  ok('a letra continua com o vazado aberto', buracosPeca >= buracosArte, `${buracosPeca} vazados (arte tem ${buracosArte})`);

  const fina = buildPart(O.region, { ...base, apoio: 'fora', borda: 0.2, bico: 0.4 }, espO);
  ok('borda menor que uma linha do bico avisa', fina.avisos.some((a) => a.includes('Borda de')),
     fina.avisos.find((a) => a.includes('Borda')) ?? 'SEM AVISO');

  const semBatente = buildPart(O.region, { ...base, apoio: 'fora', batente: 0.5, bico: 0.4 }, espO);
  ok('batente fino demais avisa que a chapa apoia no ar', semBatente.avisos.some((a) => a.includes('apoiar no ar')));

  const rasa = buildPart(O.region, { ...base, apoio: 'fora', profundidade: 2 }, espO);
  ok('profundidade menor que a chapa avisa', rasa.avisos.some((a) => a.includes('Profundidade menor')));

  const I = textToLetters(font, 'I', { altura: 40 })[0]!;
  const estreita = buildPart(I.region, { ...base, apoio: 'dentro', parede: 2.4, batente: 4 }, minThickness(I.region));
  ok('letra sem espaco para batente avisa e vira macica', estreita.avisos.some((a) => a.includes('Sem espaco para batente')));
  // O ganho colateral da borda: a mesma letra que nao cabia passa a caber.
  const comBorda = buildPart(I.region, { ...base, apoio: 'fora', borda: 5, parede: 2.4, batente: 4 }, minThickness(I.region));
  ok('a borda salva letra fina que viraria macica', !comBorda.avisos.some((a) => a.includes('saiu macica')),
     comBorda.layers.map((l) => l.role).join('+'));
}

console.log('\n== colisao entre letras vizinhas ==');
{
  // 'HH' tem hastes retas e paralelas: o vao entre as formas e o vao entre as caixas.
  const hh = normalizeLetters(textToLetters(font, 'HH', { altura: 100 }));
  const pecas = hh.map((l) => ({ nome: l.nome, region: l.region, bounds: l.bounds }));
  const vao = hh[1]!.bounds.minX - hh[0]!.bounds.maxX;

  ok('borda pequena nao encosta', colisoesPorBorda(pecas, 2).length === 0, `vao real ${vao.toFixed(1)}mm`);

  const grande = colisoesPorBorda(pecas, 20);
  ok('borda maior que metade do vao encosta', grande.length === 1, `${grande.length} par(es)`);
  if (grande[0]) {
    // Duas formas se tocam ao dilatar por d quando 2d alcanca o vao: bordaMax deve ser vao/2.
    ok('a borda maxima e exatamente metade do vao', perto(grande[0].bordaMax, vao / 2, 0.2),
       `bordaMax ${grande[0].bordaMax.toFixed(2)} vs vao/2 ${(vao / 2).toFixed(2)}mm`);
    ok('usando a borda sugerida, para de encostar', colisoesPorBorda(pecas, grande[0].bordaMax * 0.95).length === 0);
    console.log('        aviso: ' + avisoColisao(grande[0], 20));
  }

  // O par 'AV' mostra por que a checagem tem que ser por forma, e nao por caixa:
  // as caixas quase se tocam, mas as formas estao longe (o A abre embaixo, o V e
  // estreito ali). Testar por caixa daria falso positivo.
  const av = normalizeLetters(textToLetters(font, 'AV', { altura: 100 }));
  const pecasAV = av.map((l) => ({ nome: l.nome, region: l.region, bounds: l.bounds }));
  const vaoCaixaAV = av[1]!.bounds.minX - av[0]!.bounds.maxX;
  ok('caixas quase encostadas nao viram falso positivo', colisoesPorBorda(pecasAV, 10).length === 0,
     `vao de caixa ${vaoCaixaAV.toFixed(1)}mm, mas as formas estao longe`);

  ok('letra sozinha nunca colide', colisoesPorBorda([pecas[0]!], 20).length === 0);
}

console.log('\n== compensacao da medida ==');
{
  ok('sem compensar, a arte fica na medida pedida', alturaArte(150, 'fora', 3, false) === 150);
  ok('compensando, a arte encolhe 2x a borda', alturaArte(150, 'fora', 3, true) === 144, `${alturaArte(150, 'fora', 3, true)}mm`);
  ok('no apoio "dentro" a compensacao nao muda nada', alturaArte(150, 'dentro', 3, true) === 150);
}

console.log('\n== frontlit tambem aceita os tres apoios ==');
for (const apoio of ['dentro', 'fora', 'canaleta'] as Apoio[]) {
  const part = buildPart(O.region, { ...base, modo: 'frontlit', apoio }, espO);
  const face = part.extras.find((e) => e.kind === 'stl');
  ok(`frontlit ${apoio.padEnd(9)} gera face translucida`, !!face, face ? `${part.layers.length} camadas` : 'SEM FACE');
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
