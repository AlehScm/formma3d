/**
 * Nucleo de malha (lib/malha): motor, escopo sem vazamento, ponte Region <-> CrossSection,
 * prisma, fatia, projecao, Malha (volume, caixa, ida e volta com os runs), a pilha de prismas
 * montada sem booleana e os contornos cuja tampa o earcut 3.0.1 errava (o A macico cortado na
 * horizontal), agora fechados pela manifold.
 */
import fs from 'fs';
import { comEscopo, iniciarMalha, malhaPronta, objetosVivos } from '../lib/malha/nucleo';
import { doMalha, paraCrossSection, paraGeometria, paraMalha, paraRegion } from '../lib/malha/converter';
import { fatia, prisma, projecao } from '../lib/malha/solidos';
import { pilhasPelaUniao, solidoDaPilha } from '../lib/malha/pilha';
import { caixaDaMalha, posicoesDaMalha, volumeDaMalha } from '../lib/malha/tipos';
import { parseFont, textToLetters } from '../lib/text/glyphs';
import { buildPart, PRESETS, PARAMS_PADRAO, type Params } from '../lib/geom/modes';
import { dividirPeca } from '../lib/geom/emenda';
import { partToGeometriesByRole } from '../lib/geom/extrude';
import { diffRegion, regionArea, regionPerimeter, scaleRegion, shrinkRegion, type Region } from '../lib/geom/region';

let falhas = 0;
let total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
};
const erro = (fn: () => unknown) => {
  try {
    fn();
    return '';
  } catch (e) {
    return String(e);
  }
};
const perto = (a: number, b: number, rel = 1e-6) => Math.abs(a - b) <= rel * Math.max(Math.abs(b), 1);
const igualRegiao = (a: Region, b: Region) => regionArea(diffRegion(a, b)) + regionArea(diffRegion(b, a)) < 1e-3 * Math.max(regionArea(b), 1);

const carregar = (arq: string) => {
  const b = fs.readFileSync(arq);
  return parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};
const anton = carregar('public/fontes/anton.ttf');
const arial = carregar('C:/Windows/Fonts/arialbd.ttf');
const letra = (f: typeof anton, t: string) => textToLetters(f, t, { altura: 300 })[0]!.region;

const t0 = performance.now();
await iniciarMalha();
const msInicio = performance.now() - t0;

console.log('\n== motor e escopo ==');
ok('o motor inicia', malhaPronta(), `${msInicio.toFixed(0)} ms`);
await iniciarMalha();
ok('iniciar de novo nao recarrega', malhaPronta());
const motor = comEscopo((m) => m);
ok('criar objeto fora de um escopo e erro', /fora de comEscopo/.test(erro(() => motor.Manifold.cube([1, 1, 1]))));
ok('criar com new fora de um escopo tambem', /fora de comEscopo/.test(erro(() => new motor.CrossSection([[[0, 0], [1, 0], [0, 1]]]))));
ok('devolver objeto WASM do escopo e erro', /devolveu objeto WASM/.test(erro(() => comEscopo((m) => m.Manifold.cube([1, 1, 1])))));
ok('e mesmo assim nada fica vivo', objetosVivos() === 0, String(objetosVivos()));
ok('erro dentro do escopo tambem apaga tudo', /^Error: x$/.test(erro(() => comEscopo((m) => { m.Manifold.cube([1, 1, 1]).translate([1, 0, 0]); throw new Error('x'); }))) && objetosVivos() === 0);
ok('escopo aninhado apaga so o que criou', comEscopo((m) => {
  const fora = m.Manifold.cube([2, 2, 2]);
  const dentro = comEscopo((n) => n.Manifold.cube([1, 1, 1]).volume());
  return dentro === 1 && fora.volume() === 8 && objetosVivos() === 1;
}) && objetosVivos() === 0);
for (let i = 0; i < 300; i++) comEscopo((m) => m.Manifold.cube([3, 3, 3]).subtract(m.Manifold.cylinder(5, 1, 1, 24).translate([1.5, 1.5, -1])).volume());
ok('300 booleanas seguidas: nada vivo depois', objetosVivos() === 0);
ok('funcao assincrona no escopo e erro (depois do await os objetos ja estariam apagados)', /assincrona/.test(erro(() => comEscopo(async (m) => m.Manifold.cube([1, 1, 1]).volume()))) && objetosVivos() === 0);

console.log('\n== regiao <-> secao ==');
const O = letra(anton, 'O');
const B = letra(arial, 'B');
comEscopo((m) => {
  for (const [nome, r] of [['O', O], ['B', B]] as const) {
    const volta = paraRegion(paraCrossSection(m, r));
    ok(`${nome}: ida e volta tem a mesma area e os mesmos furos`, perto(regionArea(volta), regionArea(r)) && volta.reduce((s, p) => s + p.holes.length, 0) === r.reduce((s, p) => s + p.holes.length, 0) && igualRegiao(volta, r));
  }
  const espelho = scaleRegion(B, -1, 1);
  ok('espelhada (contornos no outro sentido) continua cheia', perto(paraCrossSection(m, espelho).area(), regionArea(B)));
  ok('regiao vazia vira secao vazia e prisma vazio', paraCrossSection(m, []).isEmpty() && prisma(m, [], 0, 10).isEmpty());
});

console.log('\n== prisma, fatia, projecao ==');
comEscopo((m) => {
  const pO = prisma(m, O, 0, 40);
  ok('prisma do O: volume = area x altura, solido certo', perto(pO.volume(), regionArea(O) * 40) && pO.status() === 'NoError', `${pO.volume().toFixed(1)} vs ${(regionArea(O) * 40).toFixed(1)}`);
  ok('genus = furos de lado a lado (O 1, B 2)', pO.genus() === 1 && prisma(m, B, 0, 10).genus() === 2);
  ok('fatia no meio e a propria regiao', igualRegiao(fatia(pO, 20), O));
  ok('fatia fora da altura e vazia', fatia(pO, 50).length === 0);
  ok('projecao e a propria regiao', igualRegiao(projecao(pO), O));
  const subido = prisma(m, O, 12, 30);
  const bb = subido.boundingBox();
  ok('prisma comeca em z0 e vai a z1', perto(bb.min[2], 12) && perto(bb.max[2], 30));
});

console.log('\n== malha em dados ==');
comEscopo((m) => {
  const a = prisma(m, O, 0, 40).asOriginal();
  const b = m.Manifold.cube([20, 20, 10]).translate([60, 140, 35]).asOriginal();
  const u = m.Manifold.union(a, b);
  const malha = paraMalha(u);
  ok('volume da malha (JS) = volume do motor', perto(volumeDaMalha(malha), u.volume()));
  const cx = caixaDaMalha(malha);
  const bb = u.boundingBox();
  ok('caixa da malha (JS) = caixa do motor', [0, 1, 2].every((k) => perto(cx.min[k]!, bb.min[k]!) && perto(cx.max[k]!, bb.max[k]!)));
  const ids = Array.from(malha.runOriginalID);
  ok('cada solido de origem vira um trecho (run)', ids.includes(a.originalID()) && ids.includes(b.originalID()), JSON.stringify(ids));
  const volta = doMalha(m, malha);
  ok('ida e volta da malha: mesmo volume, solido certo, mesmos trechos', perto(volta.volume(), u.volume()) && volta.status() === 'NoError' && JSON.stringify(Array.from(paraMalha(volta).runOriginalID)) === JSON.stringify(ids));
  const g = paraGeometria(malha, (id) => (id === b.originalID() ? 1 : 0));
  ok('geometria da tela: um grupo por material, cobrindo tudo', g.groups.length === 2 && g.groups.reduce((s, x) => s + x.count, 0) === malha.tri.length && g.groups.some((x) => x.materialIndex === 1));
  ok('sopa de triangulos do STL', posicoesDaMalha(malha).length === malha.tri.length * 3);
});

console.log('\n== pilha de prismas (lib/malha/pilha.ts) ==');
{
  const g = letra(arial, 'g');
  const vol = (ls: { region: Region; z0: number; z1: number }[]) => ls.reduce((s, l) => s + regionArea(l.region) * (l.z1 - l.z0), 0);
  const montar = (ls: { region: Region; z0: number; z1: number }[]) =>
    comEscopo((m) => {
      const id0 = m.Manifold.reserveIDs(ls.length);
      const s = solidoDaPilha(m, ls.map((l, i) => ({ ...l, id: id0 + i })));
      return { vol: s.volume(), ok: s.status() === 'NoError', topo: s.slice(ls[ls.length - 1]!.z1 - 0.5).area(), ids: [...new Set(paraMalha(s).runOriginalID)].sort((a, b) => a - b).map((id) => id - id0) };
    });
  // Chanfro de 6 degraus: 7 prismas empilhados, cada um recuado do de baixo.
  const chanfro = [{ region: g, z0: 0, z1: 38.5 }, ...Array.from({ length: 6 }, (_, i) => ({ region: shrinkRegion(g, (1.5 * (i + 1)) / 6), z0: 38.5 + i * 0.25, z1: 38.5 + (i + 1) * 0.25 }))];
  const t = performance.now();
  const r1 = montar(chanfro);
  const ms = performance.now() - t;
  ok('chanfro do g (7 prismas): fecha e tem o volume da pilha', r1.ok && perto(r1.vol, vol(chanfro), 1e-6), `${r1.vol.toFixed(1)} vs ${vol(chanfro).toFixed(1)}`);
  ok('cada prisma vira o seu trecho (papel)', JSON.stringify(r1.ids) === JSON.stringify([0, 1, 2, 3, 4, 5, 6]), JSON.stringify(r1.ids));
  const t2 = performance.now();
  comEscopo((m) => m.Manifold.union(chanfro.map((l) => prisma(m, l.region, l.z0, l.z1))).volume());
  const msUniao = performance.now() - t2;
  ok('sem booleana: no maximo metade do tempo da uniao dos mesmos prismas', ms <= msUniao / 2, `${ms.toFixed(0)} ms vs ${msUniao.toFixed(0)} ms`);
  // O oco: o recuo de 2,4 mm deixa pares de pontos a 0,001 mm (o caso que entortava a parede).
  const O2 = letra(anton, 'O');
  const vao = diffRegion(O2, shrinkRegion(O2, 2.4));
  const oco = [{ region: O2, z0: 0, z1: 2 }, { region: vao, z0: 2, z1: 40 }];
  const r2 = montar(oco);
  // Exatos ate a grade: cada ponto anda no maximo 0,001 mm (a parede torta errava 287 mm3).
  const grade = (ls: { region: Region; z0: number; z1: number }[]) => ls.reduce((s, l) => s + regionPerimeter(l.region) * (l.z1 - l.z0) * 0.001, 0);
  ok('O oco: volume e a secao no topo exatos ate a grade (parede reta)', r2.ok && Math.abs(r2.vol - vol(oco)) <= grade(oco) && Math.abs(r2.topo - regionArea(vao)) <= regionPerimeter(vao) * 0.001, `${r2.vol.toFixed(2)} vs ${vol(oco).toFixed(2)} (grade ${grade(oco).toFixed(1)} mm3)`);
  // Lado a lado na mesma faixa (o batente encostado na parede) e um em cima.
  const fora = diffRegion(O2, shrinkRegion(O2, 2.4)), dentro = diffRegion(shrinkRegion(O2, 2.4), shrinkRegion(O2, 5));
  const lado = [{ region: fora, z0: 0, z1: 30 }, { region: dentro, z0: 0, z1: 30 }, { region: fora, z0: 30, z1: 40 }];
  const r3 = montar(lado);
  ok('prismas lado a lado e empilhados: fecha com o volume certo', r3.ok && perto(r3.vol, vol(lado), 1e-6), `${r3.vol.toFixed(1)} vs ${vol(lado).toFixed(1)}`);
  // Tala: placa e a pele que encosta na borda dela (cantos arredondados para dentro da borda).
  const placa: Region = [{ outer: [{ x: 149.634, y: 126.171 }, { x: 143.619, y: 189.567 }, { x: 95.317, y: 167.044 }, { x: 100.793, y: 103.396 }], holes: [] }];
  const pele: Region = [
    { outer: [{ x: 149.634, y: 126.171 }, { x: 143.619, y: 189.567 }, { x: 141.695, y: 188.67 }, { x: 147.71, y: 125.274 }], holes: [] },
    { outer: [{ x: 102.723, y: 104.296 }, { x: 97.247, y: 167.944 }, { x: 95.317, y: 167.044 }, { x: 100.793, y: 103.396 }], holes: [] },
  ];
  const tala = [{ region: placa, z0: 0, z1: 3 }, { region: pele, z0: 3, z1: 15 }];
  const r4 = montar(tala);
  ok('tala (pele rente a borda da placa): fecha com o volume certo', r4.ok && perto(r4.vol, vol(tala), 1e-4), `${r4.vol.toFixed(2)} vs ${vol(tala).toFixed(2)}`);
  ok('nenhuma pilha precisou da uniao booleana', pilhasPelaUniao() === 0, String(pilhasPelaUniao()));
}

console.log('\n== tampa onde o earcut 3.0.1 errava ==');
{
  const cfg: Params = { ...PARAMS_PADRAO, ...PRESETS.macica.params };
  let casos = 0;
  let certos = 0;
  let furoCerto = 0;
  let divisoes = 0;
  for (const f of [anton, arial]) {
    const r = letra(f, 'A');
    const baseDoMiolo = Math.min(...r[0]!.holes[0]!.map((q) => q.y));
    const p = buildPart(r, cfg);
    for (const pos of [42.9, 81.3, 85.7, 128.6, 171.4, 214.3]) {
      divisoes++;
      let comFuro = 0;
      for (const x of dividirPeca(p, cfg, [{ eixo: 'y', pos }]).pedacos) {
        casos++;
        comEscopo((m) => {
          const s = doMalha(m, x.part.malha);
          if (s.status() === 'NoError' && perto(s.volume(), x.part.volume) && perto(volumeDaMalha(x.part.malha), x.part.volume, 1e-5)) certos++;
          if (s.genus() === 1) comFuro++;
        });
      }
      // Corte abaixo do miolo: o pedaco de cima fica com o furo; corte que passa no miolo o abre.
      if (comFuro === (pos < baseDoMiolo ? 1 : 0)) furoCerto++;
    }
  }
  ok('cada pedaco sai fechado e com o volume certo', certos === casos, `${certos}/${casos}`);
  ok('o miolo do A e furo so no pedaco de cima quando o corte passa abaixo dele', furoCerto === divisoes, `${furoCerto}/${divisoes}`);
}

console.log('\n== peca oca ==');
{
  const cfgO: Params = { ...PARAMS_PADRAO, ...PRESETS.moldura_acm.params };
  const t = performance.now();
  const p = buildPart(letra(anton, 'A'), cfgO);
  ok('A oca (moldura) vira um solido fechado so', comEscopo((m) => doMalha(m, p.malha).status() === 'NoError') && perto(volumeDaMalha(p.malha), p.volume, 1e-5), `${(performance.now() - t).toFixed(0)} ms`);
  const geos = partToGeometriesByRole(p);
  const soma = [...geos.values()].reduce((s, g) => s + g.getAttribute('position').array.length, 0);
  ok('a geometria por papel leva todos os triangulos da malha', geos.size >= 2 && soma === p.malha.tri.length * 3, `${geos.size} papeis`);
  geos.forEach((g) => g.dispose());
}

console.log(`\n${total - falhas}/${total} passaram`);
if (falhas) process.exit(1);
