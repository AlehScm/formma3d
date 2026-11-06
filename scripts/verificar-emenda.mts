/**
 * Divisao de peca grande com emenda (lib/geom/emenda.ts), em todas as configuracoes da letra
 * caixa: presets, aba, apoio de fora, chapa cortada e impressa, LED com furo, espacadores e
 * solida com e sem chanfro.
 *   npx tsx scripts/verificar-emenda.mts
 */
import fs from 'fs';
import { parseFont, textToLetters } from '../lib/text/glyphs';
import { buildPart, PRESETS, PARAMS_PADRAO, type Params, type Part } from '../lib/geom/modes';
import { dividirPeca, planejarCortes, trechosNaLinha, type Corte } from '../lib/geom/emenda';
import { partToGeometry } from '../lib/geom/extrude';
import { geometryToSTL } from '../lib/export/stl';
import { diffRegion, intersectRegion, offsetRegion, regionArea, regionBounds, unionRegion, type Region } from '../lib/geom/region';
import { caberNaMesa, IMPRESSORAS } from '../lib/print/impressoras';
import { arrumar, prepararParaArranjo } from '../lib/print/arranjo';
import { orcar, somarInsumos, PADRAO } from '../lib/cost/calc';

let falhas = 0;
let total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
};

/** Volume pela malha: so bate com o analitico se a peca for um solido fechado. */
function volumeDaMalha(buf: ArrayBuffer): number {
  const dv = new DataView(buf);
  const tris = dv.getUint32(80, true);
  let vol = 0, off = 84;
  for (let t = 0; t < tris; t++) {
    off += 12;
    const p: number[][] = [];
    for (let v = 0; v < 3; v++) { p.push([dv.getFloat32(off, true), dv.getFloat32(off + 4, true), dv.getFloat32(off + 8, true)]); off += 12; }
    const [a, c, d] = p as [number[], number[], number[]];
    vol += (a[0]! * (c[1]! * d[2]! - c[2]! * d[1]!) - a[1]! * (c[0]! * d[2]! - c[2]! * d[0]!) + a[2]! * (c[0]! * d[1]! - c[1]! * d[0]!)) / 6;
    off += 2;
  }
  return Math.abs(vol);
}

const b = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
const font = parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
const letra = (t: string, altura: number) => textToLetters(font, t, { altura })[0]!;
/** O numero de montagem desenhado com a mesma fonte. */
const texto = (t: string, altura: number): Region => textToLetters(font, t, { altura }).reduce<Region>((acc, l) => (acc.length ? unionRegion(acc, l.region) : l.region), []);

const unir = (rs: Region[]) => rs.reduce<Region>((acc, r) => (acc.length ? unionRegion(acc, r) : r), []);
const silhueta = (p: Part) => unir(p.layers.map((l) => l.region));
/** Area total das camadas que passam numa altura z. */
const areaEm = (layers: Part['layers'], z: number) => layers.filter((l) => l.z0 < z && z < l.z1).reduce((s, l) => s + regionArea(l.region), 0);
const malhaFecha = (p: Part) => {
  const vm = volumeDaMalha(geometryToSTL(partToGeometry({ layers: p.layers }), true));
  return Math.abs(vm - p.volume) / Math.max(p.volume, 1) < 1e-4;
};
const x2d = IMPRESSORAS.find((m) => m.id === 'x2d')!, a2l = IMPRESSORAS.find((m) => m.id === 'a2l')!;

type Caso = { nome: string; params: Partial<Params> };
const casos: Caso[] = [
  ...Object.entries(PRESETS).map(([id, p]) => ({ nome: id, params: p.params })),
  { nome: 'maciça com chanfro', params: { ...PRESETS.macica.params, chanfro: { ativo: true, tamanho: 2, altura: 2, passos: 6 } } },
  { nome: 'moldura ACM, batente em aba', params: { ...PRESETS.moldura_acm.params, batenteModo: 'aba' } },
  { nome: 'chapa com apoio de fora', params: { ...PRESETS.moldura_acm.params, apoio: 'fora' } },
  { nome: 'frente e fundo abertos', params: { ...PARAMS_PADRAO, frente: 'aberta', traseira: 'aberta' } },
  { nome: 'frente e fundo impressos, LED com furo', params: { ...PARAMS_PADRAO, frente: 'impressa', traseira: 'impressa', comLed: true, furoFio: 8 } },
  { nome: 'front-lit com chapa impressa', params: { ...PRESETS.frontlit.params, chapaModo: 'imprimir' } },
];

for (const caractere of ['O', 'W']) {
  const L = letra(caractere, 600);
  for (const caso of casos) {
    const cfg: Params = { ...PARAMS_PADRAO, ...caso.params, chanfro: { ...PARAMS_PADRAO.chanfro, ...caso.params.chanfro } };
    const part = buildPart(L.region, cfg);
    console.log(`\n== ${caractere} 600 mm, ${caso.nome} ==`);
    for (const maq of [x2d, a2l]) {
      const cortes = planejarCortes(part, cfg, maq);
      const div = dividirPeca(part, cfg, cortes, { parafusos: true }, caractere, texto);
      const pedacos = div.pedacos.map((p) => p.part);
      const talas = pedacos.flatMap((p) => p.extras.flatMap((e) => (e.kind === 'stl' && e.name.startsWith('tala') ? [e] : [])));
      const tag = `${maq.nome.replace('Bambu Lab ', '')}: ${pedacos.length} pedaço(s), ${talas.length} tala(s)`;

      ok(`${tag}, todos cabem na mesa`, pedacos.every((p) => caberNaMesa(p.contorno, p.alturaZ, maq).cabe), pedacos.map((p) => { const bb = regionBounds(p.contorno); return `${bb.w.toFixed(0)}x${bb.h.toFixed(0)}`; }).join(' '));
      ok(`${tag}, talas e chapa impressa cabem na mesa`, pedacos.flatMap((p) => p.extras).every((e) => e.kind === 'cut' || caberNaMesa(unir(e.layers.map((l) => l.region)), Math.max(...e.layers.map((l) => l.z1)), maq).cabe));
      ok(`${tag}, malha fechada em todo pedaço`, pedacos.every(malhaFecha));
      ok(`${tag}, todo pedaço encosta na mesa (material em z=0)`, pedacos.every((p) => p.layers.some((l) => l.z0 === 0)));
      ok(`${tag}, nenhum pedaço com trecho fino`, pedacos.every((p) => !p.avisos.length) && !div.avisos.some((a) => /lasca|sem pedaço/.test(a)), [...div.avisos, ...pedacos.flatMap((p) => p.avisos)].join(' | '));
      // Nada sobra e nada sobrepoe: cada altura tem a mesma area (menos folga, gravacao e furos).
      const zs = [...new Set(part.layers.flatMap((l) => [(l.z0 + l.z1) / 2]))];
      const perda = zs.map((z) => { const a0 = areaEm(part.layers, z); return a0 ? (a0 - pedacos.reduce((s, p) => s + areaEm(p.layers, z), 0)) / a0 : 0; });
      ok(`${tag}, a soma dos pedaços é a peça (cada altura)`, perda.every((d) => d > -1e-4 && d < 0.02), perda.map((d) => (d * 100).toFixed(2) + '%').join(' '));
      const sobrepoe = pedacos.some((p, i) => pedacos.some((q, j) => j > i && regionArea(intersectRegion(silhueta(p), silhueta(q))) > 0.5));
      ok(`${tag}, pedaços não se sobrepõem`, !sobrepoe);
      // Espacadores e furo do fio inteiros.
      const espac = part.layers.filter((l) => l.role === 'espacador');
      if (espac.length) ok(`${tag}, espaçadores inteiros`, pedacos.flatMap((p) => p.layers.filter((l) => l.role === 'espacador')).length === espac.length);
      if (cfg.comLed && cfg.furoFio > 0) {
        const furosAntes = part.layers.filter((l) => l.role === 'face' || l.role === 'traseira').reduce((n, l) => n + l.region.reduce((k, p) => k + p.holes.length, 0), 0);
        const furosDepois = pedacos.flatMap((p) => p.layers.filter((l) => l.role === 'face' || l.role === 'traseira')).reduce((n, l) => n + l.region.reduce((k, p) => k + p.holes.length, 0), 0);
        ok(`${tag}, furo do fio inteiro (não cortado)`, furosDepois >= furosAntes);
      }
      const solida = cfg.macica;
      if (solida) {
        // Dente: algum pedaco passa da linha de corte (o dente avanca no vizinho).
        const comDente = cortes.every((c) => pedacos.some((p) => { const bb = regionBounds(p.contorno); const fim = c.eixo === 'x' ? bb.maxX : bb.maxY; return fim > c.pos + 3 && fim < c.pos + 16; }));
        ok(`${tag}, sólida: cada corte tem dente de encaixe`, cortes.length === 0 || comDente);
        ok(`${tag}, sólida: sem tala`, talas.length === 0);
      } else if (cortes.length) {
        ok(`${tag}, oca: cada corte que cruza a cavidade tem tala`, cortes.every((c) => talas.some((t) => trechosNaLinha(unir(t.layers.map((l) => l.region)), c).length > 0)));
        const cavidade = offsetRegion(part.contorno, cfg.parede);
        ok(`${tag}, oca: a tala cabe dentro da cavidade`, talas.every((t) => regionArea(diffRegion(unir(t.layers.map((l) => l.region)), cavidade)) < 0.5));
      }
      // Chapa cortada: inteira, uma vez so.
      const chapas = pedacos.flatMap((p) => p.extras.filter((e) => e.kind === 'cut'));
      const chapaOriginal = part.extras.find((e) => e.kind === 'cut');
      if (chapaOriginal) ok(`${tag}, chapa cortada inteira, uma vez`, chapas.length === 1 && chapas[0]!.kind === 'cut' && Math.abs(regionArea(chapas[0]!.region) - regionArea(chapaOriginal.region)) < 1e-6);
      // Chapa impressa: em degrau (duas metades de espessura por pedaco).
      const chapaImpressa = part.extras.find((e) => e.kind === 'stl');
      if (chapaImpressa && cortes.length) {
        const partes = pedacos.flatMap((p) => p.extras.filter((e) => e.kind === 'stl' && !e.name.startsWith('tala')));
        ok(`${tag}, chapa impressa dividida em degrau`, partes.length > 1 && partes.every((e) => e.kind === 'stl' && e.layers.length >= 2));
      }
      // Numero gravado: o pedaco tem a camada de gravacao (mais fina, com menos area).
      // (sem tampa embaixo nao ha onde gravar: o numero fica so no nome do arquivo)
      const gravados = pedacos.filter((p) => p.layers.some((l) => Math.abs(l.z1 - l.z0 - 0.4) < 1e-6)).length;
      const ondeGravar = solida || part.layers.some((l) => (l.role === 'face' || l.role === 'traseira') && l.z0 === 0);
      if (cortes.length && ondeGravar) ok(`${tag}, número de montagem gravado`, gravados >= pedacos.length - 1, `${gravados}/${pedacos.length}`);
    }
  }
}

console.log('\n== peça que já cabe não é cortada ==');
{
  const p = buildPart(letra('O', 150).region, PRESETS.moldura_acm.params);
  ok('O de 150 mm: nenhum corte na X2D', planejarCortes(p, PRESETS.moldura_acm.params as Params, x2d).length === 0);
  ok('sem cortes, dividir devolve a peça inteira', dividirPeca(p, { ...PARAMS_PADRAO, ...PRESETS.moldura_acm.params }, []).pedacos.length === 1);
}

console.log('\n== mesmo resultado sempre ==');
{
  const cfg = { ...PARAMS_PADRAO, ...PRESETS.moldura_acm.params };
  const p = buildPart(letra('S', 700).region, cfg);
  const a = JSON.stringify(planejarCortes(p, cfg, x2d)), c = JSON.stringify(planejarCortes(p, cfg, x2d));
  ok('planejarCortes é determinístico', a === c, a);
  const corte: Corte[] = JSON.parse(a);
  const d1 = dividirPeca(p, cfg, corte, {}, 'S', texto), d2 = dividirPeca(p, cfg, corte, {}, 'S', texto);
  ok('dividirPeca é determinístico', JSON.stringify(d1.pedacos.map((x) => x.part.volume)) === JSON.stringify(d2.pedacos.map((x) => x.part.volume)));
}

console.log('\n== trecho fino: so a ponta na emenda e perdoada ==');
{
  const cfg = { ...PARAMS_PADRAO, ...PRESETS.macica.params };
  const ret = (x0: number, y0: number, x1: number, y1: number): Region => [{ outer: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], holes: [] }];
  // Barra de 300 x 30 com uma antena de 0,6 x 100 mm na ponta esquerda, longe de qualquer corte
  // (grande o bastante para o minThickness, que tolera 0,5% da area).
  const p = buildPart(unionRegion(ret(0, 0, 300, 30), ret(20, 30, 20.6, 130)), cfg);
  const div = dividirPeca(p, cfg, planejarCortes(p, cfg, x2d));
  ok('antena fina longe da emenda: o pedaço avisa', div.pedacos.some((x) => x.part.avisos.some((a) => /trecho de 0\.\d mm/.test(a))));
}

console.log('\n== furos M3: a tala e o fundo batem ==');
{
  const cfg = { ...PARAMS_PADRAO, ...PRESETS.moldura_acm.params };
  const p = buildPart(letra('O', 600).region, cfg);
  const div = dividirPeca(p, cfg, planejarCortes(p, cfg, x2d), { parafusos: true });
  const furosDaTala = div.pedacos.flatMap((x) => x.part.extras.flatMap((e) => (e.kind === 'stl' && e.name.startsWith('tala') ? e.layers.filter((l) => l.role === 'traseira').flatMap((l) => l.region.flatMap((q) => q.holes)) : [])));
  ok('um parafuso por furo da tala', div.parafusos > 0 && furosDaTala.length === div.parafusos, `${furosDaTala.length} furos, ${div.parafusos} parafusos`);
  const fundo = unir(div.pedacos.flatMap((x) => x.part.layers.filter((l) => l.role === 'traseira' && l.z0 === 0).map((l) => l.region)));
  // O centro de cada furo da tala cai num furo do fundo (fora do material).
  const casam = furosDaTala.every((h) => {
    const cx = h.reduce((s, q) => s + q.x, 0) / h.length, cy = h.reduce((s, q) => s + q.y, 0) / h.length;
    const ponto: Region = [{ outer: [{ x: cx - 0.3, y: cy - 0.3 }, { x: cx + 0.3, y: cy - 0.3 }, { x: cx + 0.3, y: cy + 0.3 }, { x: cx - 0.3, y: cy + 0.3 }], holes: [] }];
    return regionArea(intersectRegion(ponto, fundo)) < 1e-6;
  });
  ok('cada furo da tala tem o furo do fundo embaixo', casam);
}

console.log('\n== pedaços e talas entram nas placas ==');
for (const [nome, maq] of [['X2D', x2d], ['A2L', a2l]] as const) {
  const cfg = { ...PARAMS_PADRAO, ...PRESETS.moldura_acm.params };
  const p = buildPart(letra('W', 600).region, cfg);
  const div = dividirPeca(p, cfg, planejarCortes(p, cfg, maq));
  const itens = div.pedacos.flatMap((x) => [
    { nome: `p${x.indice}`, region: x.part.contorno, alturaZ: x.part.alturaZ },
    ...x.part.extras.flatMap((e, k) => (e.kind === 'stl' && e.name.startsWith('tala') ? [{ nome: `p${x.indice}t${k}`, region: unir(e.layers.map((l) => l.region)), alturaZ: Math.max(...e.layers.map((l) => l.z1)) }] : [])),
  ]);
  const r = arrumar(prepararParaArranjo(itens, maq), maq, 3);
  const emPlaca = new Set(r.todas.flat().map((c) => c.nome));
  const fora = r.sobraram.filter((k) => !emPlaca.has(k));
  ok(`${nome}: ${itens.length} itens em ${r.placas} placa(s), nenhum fica fora`, fora.length === 0 && emPlaca.size === itens.length, fora.join(' '));
}

console.log('\n== custo da emenda ==');
{
  const cfg = { ...PADRAO, valorHora: 60, emendaMin: 10, precoParafuso: 0.5 };
  const sem = orcar({ volumeMm3: 100000, cfg });
  const com = orcar({ volumeMm3: 100000, emendas: 6, parafusos: 12, cfg });
  const item = com.itens.find((i) => i.rotulo === 'Emenda');
  ok('item "Emenda" = minutos x mão de obra + parafusos', !!item && Math.abs(item.valor - (6 * 10 / 60 * 60 + 12 * 0.5)) < 1e-9, item ? `${item.valor.toFixed(2)} (${item.detalhe})` : 'sem item');
  ok('sem emenda, sem item', !sem.itens.some((i) => i.rotulo === 'Emenda'));
  ok('a emenda entra no custo', com.custo > sem.custo);
  const soma = somarInsumos([{ volumeMm3: 1, areaChapaMm2: 0, perimetroLedMm: 0, emendas: 4, parafusos: 8 }, { volumeMm3: 1, areaChapaMm2: 0, perimetroLedMm: 0 }]);
  ok('somarInsumos soma emendas e parafusos', soma.emendas === 4 && soma.parafusos === 8);
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
