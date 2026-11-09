/**
 * Divisao de peca grande com emenda (lib/geom/emenda/), em todas as configuracoes da letra
 * caixa: presets, aba, apoio de fora, chapa cortada e impressa, LED com furo, espacadores e
 * solida com e sem chanfro. E o encaixe escolhido em cada corte (desenho do dente, escondido,
 * cavilha, borboleta, degrau, lado, lugares, largura), corte inclinado, esboco, o dente no
 * traco fino da peca oca e o corte na altura (pino solto, pino fixo, anel por dentro).
 *   npx tsx scripts/verificar-emenda.mts
 */
import fs from 'fs';
import { parseFont, textToLetters } from '../lib/text/glyphs';
import { buildPart, PRESETS, PARAMS_PADRAO, type Params, type Part } from '../lib/geom/modes';
import { assentar, dividirPeca, formaDoCorte, planejarCortes, trechosNaLinha, type Corte, type EmendaDoCorte } from '../lib/geom/emenda';
import { transformarMalha } from '../lib/malha/plano';
import { partToGeometry } from '../lib/geom/extrude';
import { geometryToSTL } from '../lib/export/stl';
import { diffRegion, intersectRegion, offsetRegion, regionArea, regionBounds, unionRegion, type Region } from '../lib/geom/region';
import { caberNaMesa, IMPRESSORAS } from '../lib/print/impressoras';
import { arrumar, prepararParaArranjo } from '../lib/print/arranjo';
import { orcar, somarInsumos, PADRAO } from '../lib/cost/calc';
import type { Manifold, Mat4 } from 'manifold-3d';
import { comEscopo, iniciarMalha, type Motor } from '../lib/malha/nucleo';
import { doMalha } from '../lib/malha/converter';
import { fatia, prisma, projecao } from '../lib/malha/solidos';
import { caixaDaMalha, idsComFaces, type Malha } from '../lib/malha/tipos';

// A peca e montada e cortada pelo motor de malha (WASM): carrega antes do primeiro buildPart.
await iniciarMalha();

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

const disco = (cx: number, cy: number, r: number): Region => [{ outer: Array.from({ length: 32 }, (_, i) => ({ x: cx + r * Math.cos((i / 32) * 2 * Math.PI), y: cy + r * Math.sin((i / 32) * 2 * Math.PI) })), holes: [] }];
const unir = (rs: Region[]) => rs.reduce<Region>((acc, r) => (acc.length ? unionRegion(acc, r) : r), []);
type ComMalha = { malha: Malha };
const comSolido = <T,>(x: ComMalha, fn: (s: Manifold, m: Motor) => T): T => comEscopo((m) => fn(doMalha(m, x.malha), m));
/** A sombra vista de cima. */
const silhueta = (x: ComMalha) => comSolido(x, (s) => projecao(s));
/** O material numa altura z. */
const secao = (x: ComMalha, z: number) => comSolido(x, (s) => fatia(s, z));
const areaEm = (x: ComMalha, z: number) => regionArea(secao(x, z));
/** As alturas em que o solido muda (as dos vertices: tudo aqui e feito de prismas retos). */
const niveis = (x: ComMalha) => [...new Set(Array.from({ length: x.malha.pos.length / 3 }, (_, i) => x.malha.pos[i * 3 + 2]!))].sort((a, b) => a - b);
/** O meio de cada faixa entre dois niveis da peca. */
const meiosDasFaixas = (x: ComMalha) => { const v = niveis(x); return v.slice(1).map((z, i) => (v[i]! + z) / 2); };
const base = (x: ComMalha) => caixaDaMalha(x.malha).min[2];
const topo = (x: ComMalha) => caixaDaMalha(x.malha).max[2];
/** O papel de cada trecho da malha com face (um por prisma da receita que ficou nela). */
const papeisDe = (p: Part) => idsComFaces(p.malha).map((id) => p.papeis[id]?.role ?? '?');
/** Malha fechada: a manifold aceita, e o STL que sai dela tem o volume da peca. */
const malhaFecha = (p: Part) =>
  comSolido(p, (s) => s.status() === 'NoError') && Math.abs(volumeDaMalha(geometryToSTL(partToGeometry(p)!, true)) - p.volume) / Math.max(p.volume, 1) < 1e-4;
/** Nada de `x` na regiao `r` entre z0 e z1: o volume em comum fica abaixo do que a grade deixa. */
const vazioNa = (x: ComMalha | undefined, r: Region, z0: number, z1: number) => !!x && comSolido(x, (s, m) => s.intersect(prisma(m, r, z0, z1)).volume()) < 0.01 * (z1 - z0);
/** Furos nas tampas (face e traseira): a secao no meio de cada trecho da malha com esse papel. */
const furosNasTampas = (p: Part) => {
  const { malha, papeis } = p;
  let n = 0;
  for (let i = 0; i < malha.runOriginalID.length; i++) {
    const role = papeis[malha.runOriginalID[i]!]?.role;
    if (role !== 'face' && role !== 'traseira') continue;
    let z0 = Infinity, z1 = -Infinity;
    for (let k = malha.runIndex[i]!; k < (malha.runIndex[i + 1] ?? malha.tri.length); k++) {
      const z = malha.pos[malha.tri[k]! * 3 + 2]!;
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
    n += secao(p, (z0 + z1) / 2).reduce((k, q) => k + q.holes.length, 0);
  }
  return n;
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
      ok(`${tag}, talas e chapa impressa cabem na mesa`, pedacos.flatMap((p) => p.extras).every((e) => e.kind === 'cut' || caberNaMesa(silhueta(e), topo(e), maq).cabe));
      ok(`${tag}, malha fechada em todo pedaço`, pedacos.every(malhaFecha));
      ok(`${tag}, todo pedaço encosta na mesa (material em z=0)`, pedacos.every((p) => Math.abs(base(p)) < 1e-6));
      ok(`${tag}, nenhum pedaço com trecho fino`, pedacos.every((p) => !p.avisos.length) && !div.avisos.some((a) => /lasca|sem pedaço/.test(a)), [...div.avisos, ...pedacos.flatMap((p) => p.avisos)].join(' | '));
      // Nada sobra e nada sobrepoe: cada altura tem a mesma area (menos folga, gravacao e furos).
      const zs = meiosDasFaixas(part);
      const perda = zs.map((z) => { const a0 = areaEm(part, z); return a0 ? (a0 - pedacos.reduce((s, p) => s + areaEm(p, z), 0)) / a0 : 0; });
      ok(`${tag}, a soma dos pedaços é a peça (cada altura)`, perda.every((d) => d > -1e-4 && d < 0.02), perda.map((d) => (d * 100).toFixed(2) + '%').join(' '));
      const sobrepoe = pedacos.some((p, i) => pedacos.some((q, j) => j > i && regionArea(intersectRegion(silhueta(p), silhueta(q))) > 0.5));
      ok(`${tag}, pedaços não se sobrepõem`, !sobrepoe);
      // Espacadores e furo do fio inteiros.
      const espac = papeisDe(part).filter((r) => r === 'espacador');
      if (espac.length) ok(`${tag}, espaçadores inteiros`, pedacos.flatMap((p) => papeisDe(p).filter((r) => r === 'espacador')).length === espac.length);
      if (cfg.comLed && cfg.furoFio > 0) {
        const furosAntes = furosNasTampas(part);
        const furosDepois = pedacos.reduce((n, p) => n + furosNasTampas(p), 0);
        ok(`${tag}, furo do fio inteiro (não cortado)`, furosDepois >= furosAntes);
      }
      const solida = cfg.macica;
      if (solida) {
        // Dente: algum pedaco passa da linha de corte (o dente avanca no vizinho).
        const comDente = cortes.every((c) => pedacos.some((p) => { const bb = regionBounds(p.contorno); const fim = c.eixo === 'x' ? bb.maxX : bb.maxY; return fim > c.pos + 3 && fim < c.pos + 16; }));
        ok(`${tag}, sólida: cada corte tem dente de encaixe`, cortes.length === 0 || comDente);
        ok(`${tag}, sólida: sem tala`, talas.length === 0);
      } else if (cortes.length) {
        ok(`${tag}, oca: cada corte que cruza a cavidade tem tala`, cortes.every((c) => talas.some((t) => trechosNaLinha(silhueta(t), c).length > 0)));
        const cavidade = offsetRegion(part.contorno, cfg.parede);
        ok(`${tag}, oca: a tala cabe dentro da cavidade`, talas.every((t) => regionArea(diffRegion(silhueta(t), cavidade)) < 0.5));
      }
      // Chapa cortada: inteira, uma vez so.
      const chapas = pedacos.flatMap((p) => p.extras.filter((e) => e.kind === 'cut'));
      const chapaOriginal = part.extras.find((e) => e.kind === 'cut');
      if (chapaOriginal) ok(`${tag}, chapa cortada inteira, uma vez`, chapas.length === 1 && chapas[0]!.kind === 'cut' && Math.abs(regionArea(chapas[0]!.region) - regionArea(chapaOriginal.region)) < 1e-6);
      // Chapa impressa: em degrau (duas metades de espessura por pedaco).
      const chapaImpressa = part.extras.find((e) => e.kind === 'stl');
      if (chapaImpressa && cortes.length) {
        const partes = pedacos.flatMap((p) => p.extras.filter((e) => e.kind === 'stl' && !e.name.startsWith('tala')));
        ok(`${tag}, chapa impressa dividida em degrau`, partes.length > 1 && partes.every((e) => e.kind === 'stl' && niveis(e).length >= 3));
      }
      // Numero gravado: o pedaco tem a camada de gravacao (mais fina, com menos area).
      // (sem tampa embaixo nao ha onde gravar: o numero fica so no nome do arquivo)
      const gravados = pedacos.filter((p) => niveis(p).some((z, i, v) => i > 0 && Math.abs(z - v[i - 1]! - 0.4) < 1e-4)).length;
      const ondeGravar = solida || !!part.meta.tampaBaixo;
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
  const furosDaTala = div.pedacos.flatMap((x) => x.part.extras.flatMap((e) => (e.kind === 'stl' && e.name.startsWith('tala') ? secao(e, 1).flatMap((q) => q.holes) : [])));
  ok('um parafuso por furo da tala', div.parafusos > 0 && furosDaTala.length === div.parafusos, `${furosDaTala.length} furos, ${div.parafusos} parafusos`);
  const fundo = unir(div.pedacos.map((x) => secao(x.part, 0.5)));
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
    ...x.part.extras.flatMap((e, k) => (e.kind === 'stl' && e.name.startsWith('tala') ? [{ nome: `p${x.indice}t${k}`, region: silhueta(e), alturaZ: topo(e) }] : [])),
  ]);
  const r = arrumar(prepararParaArranjo(itens, maq), maq, 3);
  const emPlaca = new Set(r.todas.flat().map((c) => c.nome));
  const fora = r.sobraram.filter((k) => !emPlaca.has(k));
  ok(`${nome}: ${itens.length} itens em ${r.placas} placa(s), nenhum fica fora`, fora.length === 0 && emPlaca.size === itens.length, fora.join(' '));
}

console.log('\n== encaixe escolhido em cada corte (sólida) ==');
{
  const soltasDe = (ps: Part[]) => ps.flatMap((p) => p.extras.flatMap((e) => (e.kind === 'stl' && /^(cavilha|borboleta)/.test(e.name) ? [e] : [])));
  /** Area das pecas soltas numa altura, na posicao montada. */
  const areaSoltas = (ps: Part[], z: number) => soltasDe(ps).reduce((s, e) => s + areaEm(e, z - e.montagem.z), 0);
  const confere = (tag: string, part: Part, div: ReturnType<typeof dividirPeca>, maq = x2d) => {
    const pedacos = div.pedacos.map((p) => p.part);
    ok(`${tag}: todos cabem na ${maq.nome.replace('Bambu Lab ', '')}`, pedacos.every((p) => caberNaMesa(p.contorno, p.alturaZ, maq).cabe), pedacos.map((p) => { const bb = regionBounds(p.contorno); return `${bb.w.toFixed(0)}x${bb.h.toFixed(0)}`; }).join(' '));
    ok(`${tag}: malha fechada em todo pedaço`, pedacos.every(malhaFecha));
    ok(`${tag}: sem aviso`, !div.avisos.length && pedacos.every((p) => !p.avisos.length), [...div.avisos, ...pedacos.flatMap((p) => p.avisos)].join(' | '));
    const H = part.alturaZ;
    // Alturas fora das divisas dos degraus e da faixa da cavilha.
    const zs = [0.031, 0.153, 0.307, 0.461, 0.517, 0.571, 0.709, 0.857, 0.973].map((f) => H * f);
    const perda = zs.map((z) => {
      const a0 = areaEm(part, z);
      return a0 ? (a0 - pedacos.reduce((s, p) => s + areaEm(p, z), 0) - areaSoltas(pedacos, z)) / a0 : 0;
    });
    ok(`${tag}: a soma dos pedaços (e das peças soltas) é a peça`, perda.every((d) => d > -1e-4 && d < 0.03), perda.map((d) => (d * 100).toFixed(2) + '%').join(' '));
    // Em cada altura (o dente escondido e o degrau passam por baixo do vizinho, vistos de cima).
    const naAltura = (p: Part, z: number) => secao(p, z);
    const sobrepoe = zs.some((z) => pedacos.some((p, i) => pedacos.some((q, j) => j > i && regionArea(intersectRegion(naAltura(p, z), naAltura(q, z))) > 0.5)));
    ok(`${tag}: pedaços não se sobrepõem (em cada altura)`, !sobrepoe);
    return pedacos;
  };
  const cfgS: Params = { ...PARAMS_PADRAO, ...PRESETS.macica.params };
  const cfgC: Params = { ...cfgS, chanfro: { ativo: true, tamanho: 2, altura: 2, passos: 6 } };
  const O = letra('O', 600);
  for (const [nomeCfg, cfg] of [['maciça', cfgS], ['maciça com chanfro', cfgC]] as const) {
    const part = buildPart(O.region, cfg);
    const cortes = planejarCortes(part, cfg, x2d);
    const H = part.alturaZ;
    const xs = cortes.filter((c) => c.eixo === 'x');
    // Pedacos do lado de antes de um corte em x: centro a esquerda dele.
    const aEsquerda = (ps: Part[], pos: number) => ps.filter((p) => { const bb = regionBounds(p.contorno); return bb.minX + bb.w / 2 < pos; });
    const fimEm = (p: Part, z: number) => { const r = secao(p, z); return r.length ? regionBounds(r).maxX : -Infinity; };

    for (const desenho of ['redondo', 'andorinha', 'reto', 'triangulo'] as const) {
      const div = dividirPeca(part, cfg, cortes.map((c) => ({ ...c, emenda: { forma: 'dente' as const, desenho } })), {}, 'O', texto);
      const tag = `${nomeCfg}, dente ${desenho}`;
      const ps = confere(tag, part, div);
      ok(`${tag}: tem dente em cada corte`, cortes.every((_, k) => div.marcas.some((m) => m.corte === k)), `${div.marcas.length} dentes`);
      // O macho fica inteiro num pedaco e o vizinho guarda a folga em volta dele.
      const encaixa = div.marcas.every((m) => {
        const dono = ps.find((p) => regionArea(intersectRegion(m.regiao, silhueta(p))) > 0.95 * regionArea(m.regiao));
        if (!dono) return false;
        const outros = unir(ps.filter((p) => p !== dono).map(silhueta));
        return regionArea(intersectRegion(offsetRegion(m.regiao, -0.15), outros)) < 0.5;
      });
      ok(`${tag}: o macho entra no vão com folga`, encaixa);
    }

    {
      const div = dividirPeca(part, cfg, cortes.map((c) => ({ ...c, emenda: { forma: 'escondido' as const } })), {}, 'O', texto);
      const tag = `${nomeCfg}, dente escondido`;
      const ps = confere(tag, part, div);
      const embaixo = xs.every((c) => aEsquerda(ps, c.pos).some((p) => fimEm(p, H * 0.3) > c.pos + 3));
      const emCima = xs.every((c) => aEsquerda(ps, c.pos).every((p) => fimEm(p, H * 0.9) <= c.pos + 0.01));
      ok(`${tag}: dente embaixo, emenda reta em cima (a frente só mostra a linha)`, embaixo && emCima);
    }

    for (const forma of ['cavilha', 'borboleta'] as const) {
      const div = dividirPeca(part, cfg, cortes.map((c) => ({ ...c, emenda: { forma } })), {}, 'O', texto);
      const tag = `${nomeCfg}, ${forma}`;
      const ps = confere(tag, part, div);
      const soltas = soltasDe(ps);
      ok(`${tag}: uma peça solta por encaixe`, soltas.length > 0 && soltas.length === div.marcas.length, `${soltas.length} soltas, ${div.marcas.length} marcas`);
      // No meio da faixa do vao, a peca solta nao bate em nenhum pedaco.
      const z = forma === 'cavilha' ? H / 2 : 1;
      const corpo = unir(ps.map((p) => secao(p, z)));
      ok(`${tag}: a peça solta entra no vão com folga`, soltas.every((e) => regionArea(intersectRegion(offsetRegion(silhueta(e), -0.15), corpo)) < 0.5));
      const itens = [...ps.map((p, i) => ({ nome: `p${i}`, region: p.contorno, alturaZ: p.alturaZ })), ...soltas.map((e, i) => ({ nome: `s${i}`, region: silhueta(e), alturaZ: topo(e) }))];
      const r = arrumar(prepararParaArranjo(itens, x2d), x2d, 3);
      ok(`${tag}: pedaços e peças soltas entram nas placas`, new Set(r.todas.flat().map((c) => c.nome)).size === itens.length);
    }

    {
      const div = dividirPeca(part, cfg, cortes.map((c) => ({ ...c, emenda: { forma: 'pinoDeitado' as const } })), {}, 'O', texto);
      const tag = `${nomeCfg}, pino deitado`;
      const ps = confere(tag, part, div);
      const pinos = ps.flatMap((p) => p.extras.flatMap((e) => (e.kind === 'stl' && e.name.startsWith('pino') ? [e] : [])));
      ok(`${tag}: um pino por marca, de lado na montagem`, pinos.length > 0 && pinos.length === div.marcas.length && pinos.every((e) => !!e.montagem.matriz), `${pinos.length} pinos, ${div.marcas.length} marcas`);
      const cx0 = pinos[0] && caixaDaMalha(pinos[0].malha);
      ok(`${tag}: pino de Ø6 x 16 mm, em pé para imprimir`, !!cx0 && Math.abs(cx0.max[0] - cx0.min[0] - 6) < 0.05 && Math.abs(cx0.max[2] - cx0.min[2] - 16) < 1e-3 && cx0.min[2] === 0);
      // Montado: o pino nao bate em pedaco nenhum, e o cilindro com a folga (e um pouco) pega os dois lados do corte.
      const montado = pinos.map((e) => comEscopo((m) => {
        const b = caixaDaMalha(e.malha);
        const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, r = (b.max[0] - b.min[0]) / 2;
        const mat = e.montagem.matriz as Mat4;
        const pino = doMalha(m, e.malha).transform(mat);
        const folgado = prisma(m, disco(cx, cy, r + 0.3), 0.5, b.max[2] - 0.5).transform(mat);
        const solidos = ps.map((p) => doMalha(m, p.malha));
        return { bate: solidos.some((s) => s.intersect(pino).volume() > 0.01), lados: solidos.filter((s) => s.intersect(folgado).volume() > 0.01).length, meio: pino.boundingBox() };
      }));
      ok(`${tag}: montado, o pino não bate nos pedaços`, montado.every((x) => !x.bate));
      ok(`${tag}: o furo atravessa a emenda (um pedaço de cada lado)`, montado.every((x) => x.lados === 2), montado.map((x) => x.lados).join(','));
      ok(`${tag}: deitado no meio da altura`, montado.every((x) => Math.abs((x.meio.min[2] + x.meio.max[2]) / 2 - H / 2) < 1e-3 && x.meio.max[2] - x.meio.min[2] < 6.2));
      const itens = [...ps.map((p, i) => ({ nome: `p${i}`, region: p.contorno, alturaZ: p.alturaZ })), ...pinos.map((e, i) => ({ nome: `s${i}`, region: silhueta(e), alturaZ: topo(e) }))];
      const r = arrumar(prepararParaArranjo(itens, x2d), x2d, 3);
      ok(`${tag}: pedaços e pinos entram nas placas`, new Set(r.todas.flat().map((c) => c.nome)).size === itens.length);
    }

    {
      const div = dividirPeca(part, cfg, cortes.map((c) => ({ ...c, emenda: { forma: 'degrau' as const } })), {}, 'O', texto);
      const tag = `${nomeCfg}, degrau`;
      const ps = confere(tag, part, div);
      const embaixo = xs.every((c) => aEsquerda(ps, c.pos).some((p) => fimEm(p, H * 0.03) > c.pos + 10));
      const emCima = xs.every((c) => aEsquerda(ps, c.pos).every((p) => fimEm(p, H * 0.97) <= c.pos + 0.01));
      ok(`${tag}: embaixo passa da linha, em cima para nela`, embaixo && emCima);
    }

    {
      const div = dividirPeca(part, cfg, cortes.map((c) => ({ ...c, emenda: { inverter: true } })), {}, 'O', texto);
      const tag = `${nomeCfg}, dente invertido`;
      const ps = confere(tag, part, div);
      // O pedaco de depois passa para tras da linha (o macho e dele).
      const doOutro = xs.every((c) => ps.some((p) => { const bb = regionBounds(p.contorno); return bb.minX + bb.w / 2 > c.pos && bb.minX < c.pos - 3; }));
      ok(`${tag}: o pedaço do outro lado leva o dente`, doOutro && div.marcas.every((m) => m.inverter));
    }

    {
      const c0 = xs[0]!;
      const t = trechosNaLinha(part.contorno, c0);
      const ys = [(t[0]![0] + t[0]![1]) / 2, (t[t.length - 1]![0] + t[t.length - 1]![1]) / 2];
      const lugares = ys.map((y) => ({ x: c0.pos + 7, y }));
      const div = dividirPeca(part, cfg, cortes.map((c) => (c === c0 ? { ...c, emenda: { lugares } } : c)), {}, 'O', texto);
      const tag = `${nomeCfg}, dentes onde eu clicar`;
      confere(tag, part, div);
      const meus = div.marcas.filter((m) => m.corte === cortes.indexOf(c0));
      ok(`${tag}: os dentes ficam exatamente nos lugares (na linha)`, meus.length === 2 && meus.every((m, i) => Math.abs(m.lugar.x - c0.pos) < 1e-6 && Math.abs(m.lugar.y - ys[i]!) < 1e-6), meus.map((m) => `${m.lugar.x.toFixed(1)},${m.lugar.y.toFixed(1)}`).join(' '));
      const nenhum = dividirPeca(part, cfg, cortes.map((c) => (c === c0 ? { ...c, emenda: { lugares: [] } } : c)));
      ok(`${tag}: sem lugar nenhum, o corte fica sem dente`, !nenhum.marcas.some((m) => m.corte === cortes.indexOf(c0)));
      const grande = dividirPeca(part, cfg, cortes.map((c) => ({ ...c, emenda: { tamanho: 12 } })));
      ok(`${tag}: a largura escolhida vale (dente de 12 mm)`, grande.marcas.length > 0 && grande.marcas.every((m) => { const bb = regionBounds(m.regiao); return Math.abs(Math.min(bb.w, bb.h) - 12) < 0.2; }));
    }

    {
      // Sem escolher nada: o mesmo que dente na altura toda (o padrao).
      const a = dividirPeca(part, cfg, cortes), c = dividirPeca(part, cfg, cortes.map((x) => ({ ...x, emenda: { forma: 'dente' as const, desenho: 'redondo' as const } })));
      ok(`${nomeCfg}: sem escolha, o encaixe é o dente redondo`, JSON.stringify(a.pedacos.map((p) => p.part.volume.toFixed(3))) === JSON.stringify(c.pedacos.map((p) => p.part.volume.toFixed(3))));
      const pad = dividirPeca(part, cfg, cortes, { forma: 'cavilha' });
      ok(`${nomeCfg}: o encaixe padrão vale para os cortes sem escolha`, soltasDe(pad.pedacos.map((p) => p.part)).length > 0);
    }

    const b = regionBounds(part.contorno);
    const cx = b.minX + b.w / 2, cy = b.minY + b.h / 2;
    {
      const div = dividirPeca(part, cfg, [{ eixo: 'x', pos: cx, angulo: 30 }], {}, 'O', texto);
      const tag = `${nomeCfg}, corte inclinado 30°`;
      const ps = div.pedacos.map((p) => p.part);
      const perda = [0.1, 0.5, 0.9].map((f) => { const z = H * f, a0 = areaEm(part, z); return (a0 - ps.reduce((s, p) => s + areaEm(p, z), 0)) / a0; });
      ok(`${tag}: 2 pedaços, a soma é a peça, malha fechada`, ps.length === 2 && perda.every((d) => d > -1e-4 && d < 0.03) && ps.every(malhaFecha), perda.map((d) => (d * 100).toFixed(2) + '%').join(' '));
      ok(`${tag}: tem dente na linha inclinada`, div.marcas.length > 0 && !ps.some((p, i) => ps.some((q, j) => j > i && regionArea(intersectRegion(silhueta(p), silhueta(q))) > 0.5)));
    }
    const esbocos: [string, { x: number; y: number }[]][] = [
      ['esboço em L', [{ x: cx, y: b.maxY + 10 }, { x: cx, y: cy }, { x: b.maxX + 10, y: cy }]],
      ['esboço em zigue-zague', [{ x: b.minX - 10, y: cy - 60 }, { x: cx - 120, y: cy + 60 }, { x: cx + 120, y: cy - 60 }, { x: b.maxX + 10, y: cy + 60 }]],
    ];
    for (const [nome, pontos] of esbocos) {
      const div = dividirPeca(part, cfg, [{ tipo: 'esboco', pontos }], {}, 'O', texto);
      const tag = `${nomeCfg}, ${nome}`;
      const ps = div.pedacos.map((p) => p.part);
      const perda = [0.1, 0.5, 0.9].map((f) => { const z = H * f, a0 = areaEm(part, z); return (a0 - ps.reduce((s, p) => s + areaEm(p, z), 0)) / a0; });
      ok(`${tag}: 2 pedaços, a soma é a peça, malha fechada`, ps.length === 2 && perda.every((d) => d > -1e-4 && d < 0.03) && ps.every(malhaFecha), `${ps.length} pedaços; ` + perda.map((d) => (d * 100).toFixed(2) + '%').join(' '));
      ok(`${tag}: dentes nos segmentos, longe das quinas`, div.marcas.length > 0 && div.marcas.every((m) => pontos.slice(1, -1).every((q) => Math.hypot(m.lugar.x - q.x, m.lugar.y - q.y) > 8)), `${div.marcas.length} dentes`);
      ok(`${tag}: pedaços não se sobrepõem`, !ps.some((p, i) => ps.some((q, j) => j > i && regionArea(intersectRegion(silhueta(p), silhueta(q))) > 0.5)));
    }
  }
}

console.log('\n== peça oca com traço fino: a emenda leva dente ali ==');
{
  const cfg: Params = { ...PARAMS_PADRAO, ...PRESETS.moldura_acm.params };
  const ret = (x0: number, y0: number, x1: number, y1: number): Region => [{ outer: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], holes: [] }];
  // Caixa grande (com vao) e uma perna de 8 mm, fina demais para ter vao por dentro.
  const part = buildPart(unionRegion(ret(0, 0, 300, 200), ret(300, 96, 600, 104)), cfg);
  const div = dividirPeca(part, cfg, [{ eixo: 'x', pos: 150 }, { eixo: 'x', pos: 450 }], { parafusos: true }, 'L', texto);
  const ps = div.pedacos.map((p) => p.part);
  const talas = ps.flatMap((p) => p.extras.filter((e) => e.kind === 'stl' && e.name.startsWith('tala')));
  ok('o corte na perna fina tem dente', div.marcas.some((m) => m.corte === 1));
  ok('o corte na caixa tem tala e nenhum dente', talas.length > 0 && !div.marcas.some((m) => m.corte === 0));
  ok('3 pedaços, malha fechada, sem aviso', ps.length === 3 && ps.every(malhaFecha) && !div.avisos.length && ps.every((p) => !p.avisos.length), [...div.avisos, ...ps.flatMap((p) => p.avisos)].join(' | '));
  const zs = meiosDasFaixas(part);
  const perda = zs.map((z) => { const a0 = areaEm(part, z); return a0 ? (a0 - ps.reduce((s, p) => s + areaEm(p, z), 0)) / a0 : 0; });
  ok('a soma dos pedaços é a peça (cada altura)', perda.every((d) => d > -1e-4 && d < 0.02), perda.map((d) => (d * 100).toFixed(2) + '%').join(' '));
  ok('pedaços não se sobrepõem', !ps.some((p, i) => ps.some((q, j) => j > i && regionArea(intersectRegion(silhueta(p), silhueta(q))) > 0.5)));
  const so = dividirPeca(part, cfg, [{ eixo: 'x', pos: 450, emenda: { forma: 'cola' } }]);
  ok('só cola: nem dente nem tala', !so.marcas.length && !so.pedacos.some((p) => p.part.extras.some((e) => e.kind === 'stl' && e.name.startsWith('tala'))));
  const auto = planejarCortes(part, cfg, x2d);
  const dAuto = dividirPeca(part, cfg, auto);
  ok('o automático deixa espaço para o dente da perna (tudo cabe na X2D)', dAuto.pedacos.every((p) => caberNaMesa(p.part.contorno, p.part.alturaZ, x2d).cabe), dAuto.pedacos.map((p) => { const bb = regionBounds(p.part.contorno); return `${bb.w.toFixed(0)}x${bb.h.toFixed(0)}`; }).join(' '));
}

console.log('\n== corte na altura (Z) ==');
{
  const L = letra('O', 200);
  const cfgS: Params = { ...PARAMS_PADRAO, ...PRESETS.macica.params };
  const pS = buildPart(L.region, cfgS);
  const H = pS.alturaZ;
  const folga = 0.2;
  const pinos = (d: ReturnType<typeof dividirPeca>) => d.pedacos.flatMap((x) => x.part.extras.filter((e) => e.kind === 'stl' && e.name.startsWith('pino')));

  // So cola: duas partes, uma de cada lado do plano, e o volume fecha.
  const cola = dividirPeca(pS, cfgS, [{ tipo: 'altura', z: 15, emenda: { forma: 'cola' } }], {}, 'O', texto);
  const [c1, c2] = cola.pedacos.map((x) => x.part);
  ok('sólida, cola: duas partes', cola.pedacos.length === 2, String(cola.pedacos.length));
  ok('a de baixo vai até 15 mm e a de cima começa em 15', !!c1 && !!c2 && Math.abs(topo(c1) - 15) < 1e-5 && Math.abs(base(c2) - 15) < 1e-5, `${c1 && topo(c1)} / ${c2 && base(c2)}`);
  ok('o volume das partes soma o da peça (menos o número gravado)', Math.abs(cola.pedacos.reduce((s, x) => s + x.part.volume, 0) - pS.volume) / pS.volume < 0.01);
  ok('a parte de cima desce para a mesa', !!c2 && Math.abs(assentar(c2).alturaZ - (H - 15)) < 1e-5 && Math.abs(base(assentar(c2))) < 1e-5, String(c2 && assentar(c2).alturaZ));
  ok('a parte de cima leva o número embaixo (no corte)', !!c2 && niveis(c2).some((z) => Math.abs(z - 15.4) < 1e-4));
  ok('as duas malhas fecham', cola.pedacos.every((x) => malhaFecha(x.part)));
  ok('a divisão mostra o plano do corte', cola.planos.length === 1 && cola.planos[0]!.z === 15 && regionArea(cola.planos[0]!.regiao) > 0.9 * regionArea(pS.contorno));

  // Pino solto (o padrao da solida): furo nas duas partes e o pino a parte.
  const h = 20;
  const pino = dividirPeca(pS, cfgS, [{ tipo: 'altura', z: h }]);
  const [b1, b2] = pino.pedacos.map((x) => x.part);
  const ps = pinos(pino);
  ok('sólida, pino solto: tem pinos, um por marca', ps.length > 1 && ps.length === pino.marcas.length, `${ps.length} pinos, ${pino.marcas.length} marcas`);
  const pino0 = ps[0] && ps[0].kind === 'stl' ? ps[0] : null;
  const rPino = pino0 ? offsetRegion(silhueta(pino0), -(folga - 0.02)) : [];
  ok('o pino tem 16 mm (8 em cada parte) e 6 de diâmetro', !!pino0 && Math.abs(topo(pino0) - 16) < 1e-5 && Math.abs(regionBounds(silhueta(pino0)).w - 6) < 0.1);
  ok('o furo da parte de baixo cabe o pino com a folga', vazioNa(b1, rPino, h - 8, h));
  ok('o furo da parte de cima cabe o pino com a folga', vazioNa(b2, rPino, h, h + 8));
  ok('em volta do furo há material', !!b1 && regionArea(intersectRegion(secao(b1, h - 4), offsetRegion(rPino, -1))) > 0.5);
  ok('as malhas fecham (nada sobreposto)', pino.pedacos.every((x) => malhaFecha(x.part)));
  ok('pinos entram nas peças soltas para imprimir', pino.pedacos[0]!.part.extras.some((e) => e.kind === 'stl' && e.name.startsWith('pino')));

  // Pino fixo: o macho sai da parte de baixo, o furo fica na de cima.
  const fixo = dividirPeca(pS, cfgS, [{ tipo: 'altura', z: h, emenda: { forma: 'pinoFixo' } }]);
  const [f1, f2] = fixo.pedacos.map((x) => x.part);
  const macho = f1 ? secao(f1, h + 1) : [];
  ok('pino fixo: o macho sobe 8 mm da parte de baixo', macho.length > 0 && !!f1 && Math.abs(topo(f1) - (h + 8)) < 1e-5 && pinos(fixo).length === 0);
  ok('o furo da parte de cima cabe o macho com a folga', macho.length > 0 && vazioNa(f2, offsetRegion(macho, -(folga - 0.02)), h, h + 8));
  ok('pino fixo: malhas fecham', fixo.pedacos.every((x) => malhaFecha(x.part)));

  // Onde eu clicar: o pino vai so no lugar pedido; fora do material, aviso.
  const bb = regionBounds(pS.contorno);
  const ali = { x: bb.minX + 15, y: (bb.minY + bb.maxY) / 2 };
  const um = dividirPeca(pS, cfgS, [{ tipo: 'altura', z: h, emenda: { lugares: [ali] } }]);
  ok('lugar escolhido: um pino, ali', pinos(um).length === 1 && um.marcas.length === 1 && Math.hypot(um.marcas[0]!.lugar.x - ali.x, um.marcas[0]!.lugar.y - ali.y) < 1e-6);
  const fora = dividirPeca(pS, cfgS, [{ tipo: 'altura', z: h, emenda: { lugares: [ali, { x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 }] } }]);
  ok('lugar no furo da letra: avisa que não coube', pinos(fora).length === 1 && fora.avisos.some((a) => a.includes('um pino não coube')), fora.avisos.join(' | '));
  ok('diâmetro e profundidade escolhidos', (() => {
    const d = dividirPeca(pS, cfgS, [{ tipo: 'altura', z: h, emenda: { lugares: [ali], tamanho: 8, fundo: 5 } }]);
    const x = pinos(d)[0];
    return !!x && x.kind === 'stl' && Math.abs(topo(x) - 10) < 1e-5 && Math.abs(regionBounds(silhueta(x)).w - 8) < 0.1;
  })());
  ok('fora da altura da peça: avisa', dividirPeca(pS, cfgS, [{ tipo: 'altura', z: H + 5 }]).avisos.some((a) => a.includes('não atravessa')));

  // Com corte vertical: quatro partes, cada metade com seus pinos.
  const L6 = letra('O', 600);
  const p6 = buildPart(L6.region, cfgS);
  const b6 = regionBounds(p6.contorno);
  const xz = dividirPeca(p6, cfgS, [{ eixo: 'x', pos: Math.round(b6.minX + b6.w / 2) }, { tipo: 'altura', z: h }], {}, 'O', texto);
  ok('vertical + altura: quatro partes', xz.pedacos.length === 4, String(xz.pedacos.length));
  ok('em cada metade tem pino', xz.pedacos.filter((x) => x.part.extras.some((e) => e.kind === 'stl' && e.name.startsWith('pino'))).length === 2);
  ok('na ordem, a de baixo antes da de cima', xz.pedacos.every((x, i) => i % 2 === 0 ? topo(x.part) <= h + 1e-6 : base(x.part) >= h - 1e-6), xz.pedacos.map((x) => `${base(x.part)}-${topo(x.part)}`).join(' '));
  ok('vertical + altura: o dente continua nas duas alturas', xz.marcas.some((m) => m.corte === 0) && xz.marcas.some((m) => m.corte === 1));

  // Peca mais alta que a mesa: o automatico corta na altura.
  const auto = planejarCortes(pS, cfgS, { x: 1000, y: 1000, z: 25 });
  ok('mais alta que a mesa: corte automático na altura', auto.length === 1 && auto[0]!.tipo === 'altura', JSON.stringify(auto));
  const da = dividirPeca(pS, cfgS, auto);
  ok('cada parte cabe no Z da mesa', da.pedacos.every((x) => assentar(x.part).alturaZ <= 25), da.pedacos.map((x) => assentar(x.part).alturaZ).join('/'));
  // A malha (vertices e triangulos); os ids dos trechos sao um contador global e mudam de uma vez para outra.
  const geometria = (d: ReturnType<typeof dividirPeca>) => JSON.stringify(d.pedacos.map((x) => [Array.from(x.part.malha.pos), Array.from(x.part.malha.tri)]));
  ok('mesmo resultado sempre (altura)', geometria(dividirPeca(pS, cfgS, [{ tipo: 'altura', z: h }])) === geometria(pino));

  // Oca: o anel por dentro da parede.
  const cfgO: Params = { ...PARAMS_PADRAO, ...PRESETS.moldura_acm.params };
  const pO = buildPart(L.region, cfgO);
  const so = dividirPeca(pO, cfgO, [{ tipo: 'altura', z: h, emenda: { forma: 'cola' } }]);
  ok('oca, cola: o O vira fundo + dois anéis de parede', so.pedacos.length === 3, String(so.pedacos.length));
  ok('oca, cola: o volume fecha (o anel de dentro não conta duas vezes)', Math.abs(so.pedacos.reduce((s, x) => s + x.part.volume, 0) - pO.volume) / pO.volume < 1e-6);
  const an = dividirPeca(pO, cfgO, [{ tipo: 'altura', z: h }]);
  const fundo = an.pedacos[0]!.part;
  const anel = secao(fundo, h + 1);
  ok('oca: o anel sobe 8 mm da parte de baixo', regionArea(anel) > 100 && Math.abs(topo(fundo) - (h + 8)) < 1e-5, `${regionArea(anel).toFixed(0)} mm², topo ${topo(fundo)}`);
  ok('o anel não encosta na parede de cima (folga)', an.pedacos.slice(1).every((x) => vazioNa(x.part, offsetRegion(anel, -(folga - 0.02)), h, h + 8)));
  ok('o anel fica por dentro (não aparece por fora)', regionArea(diffRegion(anel, offsetRegion(pO.contorno, 1))) < 0.01);
  ok('oca: as malhas fecham (nada sobreposto)', an.pedacos.every((x) => malhaFecha(x.part)));
  // Rampa: cada degrau abaixo do anel avanca no maximo a propria altura (45 graus).
  const zsF = niveis(fundo).filter((z) => z > 3 && z < h);
  const balanco = zsF.slice(0, -1).map((z, i) => {
    const sobe = zsF[i + 1]! - z;
    return regionArea(diffRegion(secao(fundo, z + 1e-3), offsetRegion(secao(fundo, z - 1e-3), -(sobe + 0.05))));
  });
  ok('o anel colado tem rampa, sem balanço', balanco.every((a) => a < 0.5) && zsF.length >= 5, `${zsF.length} degraus, maior ${Math.max(0, ...balanco).toFixed(2)} mm²`);
  ok('oca, anel: malhas fecham', an.pedacos.every((x) => malhaFecha(x.part)));
  ok('oca: pino onde não cabe avisa', dividirPeca(pO, cfgO, [{ tipo: 'altura', z: h, emenda: { forma: 'pino' } }]).avisos.some((a) => a.includes('o pino não coube')));
}

console.log('\n== corte na altura inclinado ==');
{
  const cfgS: Params = { ...PARAMS_PADRAO, ...PRESETS.macica.params };
  const pS = buildPart(letra('O', 200).region, cfgS);
  const folga = 0.2;
  const plano = (inclinacao: number, direcao: number, emenda: EmendaDoCorte = {}): Corte => ({ tipo: 'altura', z: 20, inclinacao, direcao, emenda });
  const cola = dividirPeca(pS, cfgS, [plano(30, 0, { forma: 'cola' })], {}, 'O', texto);
  const cima = cola.pedacos.find((x) => x.part.paraImprimir)?.part;
  ok('inclinado 30°, cola: duas partes, a de cima sabe deitar', cola.pedacos.length === 2 && !!cima && cola.pedacos.filter((x) => x.part.paraImprimir).length === 1);
  ok('o volume das partes soma o da peça (menos o número gravado)', Math.abs(cola.pedacos.reduce((s, x) => s + x.part.volume, 0) - pS.volume) / pS.volume < 0.01);
  ok('as malhas fecham', cola.pedacos.every((x) => malhaFecha(x.part)));
  const deitada = cima ? assentar(cima) : undefined;
  const areaPlano = regionArea(cola.planos[0]!.regiao);
  ok('a parte de cima deita com a face do corte inteira na mesa', !!deitada && Math.abs(base(deitada)) < 1e-5 && Math.abs(areaEm(deitada, 0.6) - areaPlano) / areaPlano < 0.02, `${deitada && areaEm(deitada, 0.6).toFixed(0)} de ${areaPlano.toFixed(0)} mm²`);
  ok('e leva o número gravado na face do corte', !!deitada && niveis(deitada).some((z) => Math.abs(z - 0.4) < 1e-3));
  // O plano sai pelas faces de cima e de baixo: a secao e uma faixa da letra (a face do corte acima).
  ok('o plano mostra a seção inclinada (com a matriz para a peça)', cola.planos.length === 1 && !!cola.planos[0]!.matriz && areaPlano > 100);

  // Pino solto: perpendicular ao plano, furo nas duas partes; o pino fica de lado na montagem.
  const pino = dividirPeca(pS, cfgS, [plano(30, 0)]);
  const pinos = pino.pedacos.flatMap((x) => x.part.extras.filter((e) => e.kind === 'stl' && e.name.startsWith('pino')));
  ok('inclinado, pino solto: tem pinos, de lado na montagem', pinos.length > 0 && pinos.length === pino.marcas.length && pinos.every((e) => e.kind === 'stl' && !!e.montagem.matriz), `${pinos.length} pinos`);
  const ida = pino.pedacos.find((x) => x.part.paraImprimir)?.part.paraImprimir;
  const [pb, pc] = pino.pedacos.map((x) => x.part);
  const noPlano = (p: Part | undefined) => (p && ida ? { malha: transformarMalha(p.malha, ida) } : undefined);
  const furos = unir(pino.marcas.map((m) => offsetRegion(m.regiao, -(folga - 0.02))));
  ok('o furo das duas partes cabe o pino com a folga (visto do plano)', vazioNa(noPlano(pb), furos, -8, 0) && vazioNa(noPlano(pc), furos, 0, 8));
  ok('inclinado, pino: malhas fecham', pino.pedacos.every((x) => malhaFecha(x.part)));
  const outro = dividirPeca(pS, cfgS, [plano(-25, 90, { forma: 'cola' })]);
  ok('para o outro lado (−25°, direção 90°): duas partes, o volume fecha', outro.pedacos.length === 2 && Math.abs(outro.pedacos.reduce((s, x) => s + x.part.volume, 0) - pS.volume) / pS.volume < 1e-6);

  // Oca: no plano inclinado o anel nao acompanha a parede; o padrao e cola.
  const cfgO: Params = { ...PARAMS_PADRAO, ...PRESETS.moldura_acm.params };
  ok('oca inclinada: o padrão é cola, e o anel não vale', formaDoCorte(plano(20, 0), 'auto', false) === 'cola' && formaDoCorte(plano(20, 0, { forma: 'anel' }), 'auto', false) === 'cola');
  const oca = dividirPeca(buildPart(letra('O', 200).region, cfgO), cfgO, [plano(20, 0)]);
  ok('oca inclinada: corta e as malhas fecham', oca.pedacos.length >= 2 && oca.pedacos.every((x) => malhaFecha(x.part)), String(oca.pedacos.length));

  // Lugares escolhidos no corte reto ficam no corte depois de inclinado: ali nao valem (pinos no automatico).
  const lugares = dividirPeca(pS, cfgS, [{ tipo: 'altura', z: 20 }]).marcas.map((m) => ({ x: m.lugar.x, y: m.lugar.y }));
  const herdou = dividirPeca(pS, cfgS, [plano(30, 0, { lugares })]);
  const pinosHerdou = herdou.pedacos.flatMap((x) => x.part.extras.filter((e) => e.kind === 'stl' && e.name.startsWith('pino')));
  ok('inclinado com lugares do corte reto: pinos no automático, sem aviso', lugares.length > 0 && pinosHerdou.length > 0 && !herdou.avisos.some((a) => /coube/.test(a)), herdou.avisos.join(' | '));
  const cxO = regionBounds(pS.contorno);
  ok('as marcas do inclinado ficam sobre o letreiro (vista de cima)', pino.marcas.length > 0 && pino.marcas.every((m) => m.lugar.x > cxO.minX && m.lugar.x < cxO.minX + cxO.w && m.lugar.y > cxO.minY && m.lugar.y < cxO.minY + cxO.h));
  const dois = dividirPeca(pS, cfgS, [{ tipo: 'altura', z: 20, emenda: { forma: 'cola' } }, plano(30, 0, { forma: 'cola' })]);
  ok('reto e inclinado na mesma altura: os dois valem', dois.planos.length === 2 && !dois.avisos.some((a) => /repete/.test(a)), `${dois.planos.length} planos`);
  const repetido = dividirPeca(pS, cfgS, [plano(30, 0, { forma: 'cola' }), plano(30, 0, { forma: 'cola' })]);
  ok('o mesmo corte duas vezes: vale um e avisa', repetido.planos.length === 1 && repetido.avisos.some((a) => /O corte 2 repete o corte 1/.test(a)), repetido.avisos.join(' | '));
  // "i": o pingo e a haste sao duas ilhas; o pino feito com o plano deitado vai inteiro para a dele.
  const pI = buildPart(letra('i', 200).region, cfgS);
  const divI = dividirPeca(pI, cfgS, [plano(30, 0)]);
  const pinosI = divI.pedacos.flatMap((x) => x.part.extras.filter((e) => e.kind === 'stl' && e.name.startsWith('pino')));
  ok('"i" com corte inclinado: um pino por marca, nenhum some', pinosI.length > 0 && pinosI.length === divI.marcas.length, `${pinosI.length} pinos, ${divI.marcas.length} marcas`);
}

console.log('\n== tampa da malha ==');
{
  // O A cortado na horizontal: o triangulador do three errava a tampa e cobria o miolo.
  const ba = fs.readFileSync('public/fontes/anton.ttf');
  const anton = parseFont(ba.buffer.slice(ba.byteOffset, ba.byteOffset + ba.byteLength) as ArrayBuffer);
  const cfgM: Params = { ...PARAMS_PADRAO, ...PRESETS.macica.params };
  for (const [nome, f, pos] of [['Anton', anton, 81.3], ['Arial', font, 85.7]] as const) {
    const pA = buildPart(textToLetters(f, 'A', { altura: 300 })[0]!.region, cfgM);
    const dA = dividirPeca(pA, cfgM, [{ eixo: 'y', pos }], {}, 'A', texto);
    ok(`A da ${nome} cortado em ${pos} mm: a malha fecha (o miolo fica aberto)`, dA.pedacos.length === 2 && dA.pedacos.every((x) => malhaFecha(x.part)));
  }
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
