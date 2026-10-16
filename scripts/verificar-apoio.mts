/**
 * Verificacao dos dois batentes da chapa: de dentro e de fora.
 *   npx tsx scripts/verificar-apoio.mts
 */
import fs from 'fs';
import { parseFont, textToLetters } from '../lib/text/glyphs';
import { buildPart, descreverPeca, PARAMS_PADRAO, type Apoio, type ExtraCut, type Layer, type Part } from '../lib/geom/modes';
import { partToGeometry } from '../lib/geom/extrude';
import { geometryToSTL } from '../lib/export/stl';
import { diffRegion, intersectRegion, minThickness, offsetRegion, regionArea, regionBounds, shrinkRegion, unionRegion, type Region } from '../lib/geom/region';

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

const volumeDe = (layers: Layer[]) => layers.reduce((t, l) => t + regionArea(l.region) * (l.z1 - l.z0), 0);
function erroMalha(layers: Layer[]): number {
  const vm = volumeDaMalha(geometryToSTL(partToGeometry({ layers })!, 'x'));
  const va = volumeDe(layers);
  return (Math.abs(vm - va) / va) * 100;
}

/**
 * Pior area impressa no ar: cada camada que nao comeca na mesa tem de caber no que
 * termina logo abaixo dela, dilatado pela propria altura (45 graus).
 */
function piorBalanco(layers: Layer[]): number {
  let pior = 0;
  for (const l of layers) {
    if (l.z0 <= 1e-6) continue;
    const apoio = layers.filter((x) => perto(x.z1, l.z0, 1e-6)).reduce<Region>((u, x) => unionRegion(u, x.region), []);
    const noAr = regionArea(diffRegion(l.region, offsetRegion(apoio, -(l.z1 - l.z0) * 1.02)));
    pior = Math.max(pior, noAr);
  }
  return pior;
}

const chapaDe = (p: Part) => p.extras.find((e): e is ExtraCut => e.kind === 'cut');
const mesmaRegiao = (a: Region, b: Region) => regionArea(diffRegion(a, b)) + regionArea(diffRegion(b, a));

const b = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
const font = parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
const O = textToLetters(font, 'O', { altura: 150 })[0]!; // tem contra-forma
const base = {
  macica: false,
  frente: 'chapa' as const,
  frenteEsp: 3,
  traseira: 'impressa' as const,
  traseiraEsp: 2,
  profundidade: 40,
  parede: 2.4,
  batente: 2.5,
  bico: 0.4,
};
const espO = minThickness(O.region);
const letraB = regionBounds(O.region);

console.log('\n== malha fechada nos dois batentes ==');
for (const apoio of ['dentro', 'fora'] as Apoio[]) {
  for (const batenteModo of ['parede', 'aba'] as const) {
    const part = buildPart(O.region, { ...base, apoio, batenteModo }, espO);
    ok(`${apoio.padEnd(6)} ${batenteModo.padEnd(6)} peca fechada`, erroMalha(part.layers) < 0.001, `roles: ${[...new Set(part.layers.map((l) => l.role))].join('+')}`);
  }
}

console.log('\n== batente de dentro continua como era ==');
{
  const a = buildPart(O.region, { ...base, apoio: 'dentro' }, espO);
  ok('nao passa do contorno da letra', perto(regionBounds(a.layers.flatMap((l) => l.region)).w, letraB.w, 0.1));
  ok('contorno = arte', perto(regionArea(a.contorno), regionArea(O.region), 0.01));
  const chapa = chapaDe(a);
  ok('a chapa sai menor que a letra: parede + folga por lado', !!chapa && perto(regionBounds(chapa.region).w, letraB.w - 2 * (base.parede + PARAMS_PADRAO.folga), 0.1));
  ok('chapa montada no topo, dentro do bolsao', !!chapa && perto(chapa.montagem.z, base.profundidade - base.frenteEsp, 1e-6) && chapa.montagem.ordem === 1);
  const impressa = buildPart(O.region, { ...base, apoio: 'dentro', chapaModo: 'imprimir' }, espO);
  ok('chapa impressa sai como STL a parte, em translucido', impressa.extras.some((e) => e.kind === 'stl' && e.name === 'chapa-frente' && e.material === 'translucido'));
}

console.log('\n== batente de fora: o de dentro ao contrario, o batente sobe e passa da parede de fora ==');
{
  const T = base.profundidade;
  const zTopo = T - base.frenteEsp; // onde a parede de fora para
  const p = buildPart(O.region, { ...base, apoio: 'fora' }, espO);
  ok('sem chapa', p.extras.length === 0, `extras: ${p.extras.map((x) => x.name).join(', ')}`);

  const pecaB = regionBounds(p.layers.flatMap((l) => l.region));
  ok('a letra nao muda de formato nem de tamanho', perto(pecaB.w, letraB.w, 0.1) && perto(pecaB.h, letraB.h, 0.1) && perto(regionArea(p.contorno), regionArea(O.region), 0.01), `${pecaB.w.toFixed(1)} x ${pecaB.h.toFixed(1)} vs ${letraB.w.toFixed(1)} x ${letraB.h.toFixed(1)}`);
  ok('a altura total continua a profundidade', perto(p.alturaZ, T, 1e-6), `alturaZ ${p.alturaZ}`);

  const acima = p.layers.filter((l) => l.z0 >= zTopo - 1e-6);
  const anel = diffRegion(shrinkRegion(O.region, base.parede), shrinkRegion(O.region, base.parede + base.batente));
  ok('acima da parede de fora so fica o batente', acima.length === 1 && acima[0]!.role === 'batente' && mesmaRegiao(acima[0]!.region, anel) < 0.5 && perto(acima[0]!.z1, T, 1e-6), acima.map((l) => l.role).join('+'));
  const paredeFora = diffRegion(O.region, shrinkRegion(O.region, base.parede));
  ok('a parede de fora para antes do topo', regionArea(intersectRegion(acima[0]!.region, paredeFora)) < 0.01);
  const logoAbaixo = p.layers.filter((l) => l.z0 < zTopo - 0.1 && l.z1 >= zTopo - 1e-6).reduce<Region>((u, l) => unionRegion(u, l.region), []);
  ok('o degrau fica virado para fora: embaixo dele a parede e inteira', regionArea(diffRegion(paredeFora, logoAbaixo)) < 0.5);
  ok('o batente sobe a mesma altura do degrau do de dentro', perto(T - zTopo, base.frenteEsp, 1e-6));

  const dentro = buildPart(O.region, { ...base, apoio: 'dentro' }, espO);
  const cerca = dentro.layers.find((l) => l.role === 'bolsao')!;
  ok('e o de dentro ao contrario: la quem sobe e a parede de fora', perto(cerca.z0, zTopo, 1e-6) && mesmaRegiao(cerca.region, paredeFora) < 0.5);

  ok('nada no ar', piorBalanco(p.layers) < 0.5, `${piorBalanco(p.layers).toFixed(2)} mm2`);
  const aba = buildPart(O.region, { ...base, apoio: 'fora', batenteModo: 'aba' }, espO);
  ok('so a aba: peca fechada e sem nada no ar', erroMalha(aba.layers) < 0.001 && piorBalanco(aba.layers) < 0.5, `${piorBalanco(aba.layers).toFixed(2)} mm2`);
  ok('so a aba gasta menos', aba.volume < p.volume, `${(p.volume / 1000).toFixed(0)} -> ${(aba.volume / 1000).toFixed(0)} cm3`);
  ok('com a chapa marcada como impressa, tambem sem chapa', buildPart(O.region, { ...base, apoio: 'fora', chapaModo: 'imprimir' }, espO).extras.length === 0);

  ok('nome do arquivo marca o batente de fora', descreverPeca({ ...PARAMS_PADRAO, ...base, apoio: 'fora' }).endsWith('_batente-fora'));
}

console.log('\n== batente de fora: casos-limite ==');
{
  const atras = buildPart(O.region, { ...base, apoio: 'fora', frente: 'impressa', traseira: 'chapa' }, espO);
  ok('batente atras: sobe no lado de cima da impressao', atras.extras.length === 0 && atras.layers.some((l) => l.role === 'batente' && perto(l.z1, base.profundidade, 1e-6)) && piorBalanco(atras.layers) < 0.5);

  const duas = buildPart(O.region, { ...base, apoio: 'fora', traseira: 'chapa' }, espO);
  ok('nos dois lados: o de baixo avisa que a parede de fora fica no ar', duas.avisos.some((a) => a.includes('parede de fora fica em balanço')) && erroMalha(duas.layers) < 0.001, duas.avisos.join(' | '));

  const sem = buildPart(O.region, { ...base, apoio: 'fora', frente: 'aberta' }, espO);
  ok('sem chapa nao ha batente nenhum', !sem.layers.some((l) => l.role === 'batente'));
}

console.log('\n== batente: parede inteira x so a aba (de dentro) ==');
{
  const parede = buildPart(O.region, { ...base, apoio: 'dentro' }, espO);
  const aba = buildPart(O.region, { ...base, apoio: 'dentro', batenteModo: 'aba', batenteAltura: 3 }, espO);
  const economia = 1 - aba.volume / parede.volume;
  ok('so a aba gasta menos filamento', aba.volume < parede.volume, `${(economia * 100).toFixed(0)}% a menos (${(parede.volume / 1000).toFixed(0)} -> ${(aba.volume / 1000).toFixed(0)} cm3)`);
  const chapaDe = (pt: typeof aba) => pt.extras.find((e) => e.kind === 'cut');
  const ca = chapaDe(aba), cp = chapaDe(parede);
  ok('a chapa e o contorno nao mudam', !!ca && !!cp && ca.kind === 'cut' && cp.kind === 'cut' && perto(regionArea(ca.region), regionArea(cp.region), 0.01) && perto(regionArea(aba.contorno), regionArea(parede.contorno), 0.01));

  // Secao em uma altura: a camada que cobre z.
  const secao = (pt: typeof aba, z: number) => pt.layers.filter((l) => l.z0 <= z && z < l.z1 && l.role !== 'face').reduce((t, l) => t + regionArea(l.region), 0);
  const corpoP = parede.layers.filter((l) => l.role === 'corpo');
  const zChapa = Math.max(...corpoP.map((l) => l.z1)); // onde a chapa assenta
  ok('logo abaixo da chapa a aba tem a mesma largura da parede inteira', perto(secao(aba, zChapa - 0.5), secao(parede, zChapa - 0.5), 1), `${secao(aba, zChapa - 0.5).toFixed(0)} vs ${secao(parede, zChapa - 0.5).toFixed(0)} mm2`);
  const zMeio = (Math.min(...corpoP.map((l) => l.z0)) + zChapa - 3 - base.batente) / 2;
  ok('no meio do corpo a aba fica so com a parede fina', secao(aba, zMeio) < secao(parede, zMeio) * 0.7, `${secao(aba, zMeio).toFixed(0)} vs ${secao(parede, zMeio).toFixed(0)} mm2`);
  ok('rampa de 45 graus: nada em balanco', piorBalanco(aba.layers.filter((l) => l.role !== 'face')) < 0.5, `area no ar ${piorBalanco(aba.layers).toFixed(2)} mm2`);

  const curta = buildPart(O.region, { ...base, apoio: 'dentro', batenteModo: 'aba', batenteAltura: 3, profundidade: 9 }, espO);
  const curtaP = buildPart(O.region, { ...base, apoio: 'dentro', profundidade: 9 }, espO);
  ok('profundidade curta demais volta para a parede inteira e avisa', curta.avisos.some((x) => /parede inteira/.test(x)) && perto(curta.volume, curtaP.volume, 1e-6));

  const dois = buildPart(O.region, { ...base, apoio: 'dentro', traseira: 'chapa', batenteModo: 'aba' }, espO);
  const retas = dois.layers.filter((l) => l.role === 'batente' && perto(l.z1 - l.z0, 3, 0.01));
  ok('chapa nos dois lados: duas abas', retas.length === 2, `${retas.length} abas retas`);
  const dP = buildPart(O.region, { ...base, apoio: 'dentro', traseira: 'chapa' }, espO);
  ok('e continua mais barato', dois.volume < dP.volume, `${(dP.volume / 1000).toFixed(0)} -> ${(dois.volume / 1000).toFixed(0)} cm3`);
  const embaixo = dois.extras.find((e) => e.kind === 'cut' && e.lado === 'traseira');
  ok('a chapa de baixo fica na mesa e se afasta para baixo', embaixo?.kind === 'cut' && embaixo.montagem.z === 0 && embaixo.montagem.ordem === -1);

  const semMiolo = buildPart(textToLetters(font, 'I', { altura: 40 })[0]!.region, { ...base, apoio: 'dentro', parede: 2.4, batente: 4 });
  ok('letra sem espaco para batente avisa e vira macica', semMiolo.avisos.some((a) => /maciça/i.test(a)));
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
