/**
 * Paridade camadas -> malha: cada caso de paridade-casos, montado e dividido no motor de malha,
 * tem de dar o que o motor de camadas dava (scripts/dados/paridade-camadas.json, gravado antes
 * da migracao). Por peca: volume, caixa e area da secao em seis alturas; por divisao: emendas,
 * parafusos, marcas e avisos. Mais: nenhuma pilha precisou da uniao booleana, o tempo da peca
 * ate a tela cabe no orcamento do editor e dividir nao ficou muito mais lento.
 *
 * Pino do corte na altura: o lugar sai de amostragem (`espalhar`), que no motor de camadas
 * dependia de empate no micrometro e agora e estavel (passo da grade a 0,01 mm, empate de
 * folga ate 0,01 mm). Do pino vale a quantidade (no maximo 1 de diferenca) e o tamanho, nao a
 * posicao; volume e fatias podem diferir pelo que esse pino a mais (ou a menos) ocupa.
 */
import fs from 'fs';
import { comEscopo, iniciarMalha } from '../lib/malha/nucleo';
import { doMalha } from '../lib/malha/converter';
import { pilhasPelaUniao } from '../lib/malha/pilha';
import { caixaDaMalha, volumeDaMalha, type Malha } from '../lib/malha/tipos';
import { buildPart, receitaDaPeca, type Part } from '../lib/geom/modes';
import { layerToGeometry, partToGeometriesByRole } from '../lib/geom/extrude';
import { dividirPeca } from '../lib/geom/emenda';
import { minThickness, regionArea, regionBounds } from '../lib/geom/region';
import { casos, letraDe, texto, FRACOES_FATIA } from './paridade-casos.mts';

await iniciarMalha();

interface Medida { volume: number; caixa: number[]; fatias: number[] }
interface Extra { nome: string; area?: number; volume?: number; caixa?: number[]; fatias?: number[] }
interface Peca extends Medida { extras: Extra[] }
interface Caso { inteira: Peca; pedacos: (Peca & { indice: number })[]; emendas: number; parafusos: number; marcas: number; avisos: number[] }
const base = JSON.parse(fs.readFileSync('scripts/dados/paridade-camadas.json', 'utf8')) as { desempenho: Record<string, { mediana: number; p95: number }>; textos: string[]; casos: Record<string, Caso> };

const medir = (malha: Malha, volume: number): Medida => {
  const c = caixaDaMalha(malha);
  const caixa = [c.min[0], c.min[1], c.min[2], c.max[0], c.max[1], c.max[2]];
  const fatias = comEscopo((m) => {
    const s = doMalha(m, malha);
    return FRACOES_FATIA.map((f) => s.slice(caixa[2]! + (caixa[5]! - caixa[2]!) * f).area());
  });
  return { volume, caixa, fatias };
};
const extrasDe = (p: Part): Extra[] =>
  p.extras.map((e) => (e.kind === 'stl' ? { nome: e.name, ...medir(e.malha, volumeDaMalha(e.malha)) } : { nome: e.name, area: regionArea(e.region) }));

const perto = (a: number, b: number, folga = 0) => Math.abs(a - b) <= 1e-3 * Math.max(Math.abs(b), 1) + folga;
/** O que um pino a mais ou a menos ocupa: o furo (6 mm + folga) na secao e nas duas partes. */
const AREA_PINO = Math.PI * 3.2 ** 2, VOLUME_PINO = AREA_PINO * 17;
const difMedida = (onde: string, a: Medida, b: Medida, pinos = 0): string[] => {
  const out: string[] = [];
  if (!perto(a.volume, b.volume, pinos * VOLUME_PINO)) out.push(`${onde} volume ${a.volume.toFixed(1)} (era ${b.volume})`);
  if (a.caixa.some((v, i) => Math.abs(v - b.caixa[i]!) > 0.01)) out.push(`${onde} caixa ${a.caixa.map((v) => v.toFixed(2)).join(',')} (era ${b.caixa.join(',')})`);
  a.fatias.forEach((v, i) => { if (!perto(v, b.fatias[i]!, pinos * AREA_PINO)) out.push(`${onde} fatia ${FRACOES_FATIA[i]} ${v.toFixed(1)} (era ${b.fatias[i]})`); });
  return out;
};
const ehPino = (x: Extra) => x.nome.startsWith('pino');
const tamanho = (x: Extra) => (x.caixa ? [x.caixa[3]! - x.caixa[0]!, x.caixa[4]! - x.caixa[1]!, x.caixa[5]! - x.caixa[2]!] : []);
const difExtras = (onde: string, todosA: Extra[], todosB: Extra[], pinos = 0): string[] => {
  const pa = todosA.filter(ehPino), pb = todosB.filter(ehPino);
  if (Math.abs(pa.length - pb.length) > pinos) return [`${onde} ${pa.length} pinos (eram ${pb.length})`];
  if (pa.length && pb.length && tamanho(pa[0]!).some((v, i) => Math.abs(v - tamanho(pb[0]!)[i]!) > 0.01)) return [`${onde} pino ${tamanho(pa[0]!).map((v) => v.toFixed(2))} (era ${tamanho(pb[0]!)})`];
  const a = todosA.filter((x) => !ehPino(x)), b = todosB.filter((x) => !ehPino(x));
  if (a.length !== b.length) return [`${onde} ${a.length} extras (eram ${b.length})`];
  return a.flatMap((x, i) => {
    const y = b[i]!;
    const nome = x.nome.replace(/-\d+-\d+$/, ''), nomeEra = y.nome.replace(/-\d+-\d+$/, '');
    if (nome !== nomeEra) return [`${onde} extra ${x.nome} (era ${y.nome})`];
    if (x.area !== undefined) return perto(x.area, y.area!) ? [] : [`${onde} ${x.nome} area ${x.area.toFixed(1)} (era ${y.area})`];
    return difMedida(`${onde} ${x.nome}`, x as Medida, y as unknown as Medida);
  });
};

const lista = casos();
const tempos = { camadas: [] as number[], malha: [] as number[], dividir: [] as number[] };
let iguais = 0;
let comPinoDiferente = 0;
const diferencas: string[] = [];
const t0 = Date.now();
for (const c of lista) {
  const era = base.casos[c.id]!;
  const L = letraDe(c);
  // Da mudanca de parametro a geometria da tela, como no editor (a espessura ja vem medida):
  // camadas = receita + uma ExtrudeGeometry por camada (o que o editor fazia); malha = a peca
  // montada + a geometria por papel.
  const esp = minThickness(L.region);
  let t = performance.now();
  for (const l of receitaDaPeca(L.region, c.cfg, esp).layers) layerToGeometry(l)?.dispose();
  tempos.camadas.push(performance.now() - t);
  t = performance.now();
  const p = buildPart(L.region, c.cfg, esp);
  for (const g of partToGeometriesByRole(p).values()) g.dispose();
  tempos.malha.push(performance.now() - t);
  const cortes = c.cortes(regionBounds(p.contorno), p.alturaZ);
  t = performance.now();
  const d = dividirPeca(p, c.cfg, cortes, {}, c.letra, texto);
  tempos.dividir.push(performance.now() - t);
  const dif: string[] = [
    ...difMedida('inteira', medir(p.malha, p.volume), era.inteira),
    ...difExtras('inteira', extrasDe(p), era.inteira.extras),
  ];
  // Pinos do corte na altura: quantos podem diferir (no maximo 1).
  const pinos = cortes.some((k) => 'tipo' in k && k.tipo === 'altura') ? Math.abs(d.marcas.length - era.marcas) : 0;
  if (pinos > 1) dif.push(`marcas ${d.marcas.length} (eram ${era.marcas})`);
  if (d.pedacos.length !== era.pedacos.length) dif.push(`${d.pedacos.length} pedacos (eram ${era.pedacos.length})`);
  else d.pedacos.forEach((x, i) => {
    dif.push(...difMedida(`pedaco ${i + 1}`, medir(x.part.malha, x.part.volume), era.pedacos[i]!, pinos), ...difExtras(`pedaco ${i + 1}`, extrasDe(x.part), era.pedacos[i]!.extras, pinos));
  });
  if (d.emendas !== era.emendas) dif.push(`emendas ${d.emendas} (eram ${era.emendas})`);
  if (d.parafusos !== era.parafusos) dif.push(`parafusos ${d.parafusos} (eram ${era.parafusos})`);
  if (!pinos && d.marcas.length !== era.marcas) dif.push(`marcas ${d.marcas.length} (eram ${era.marcas})`);
  if (pinos) comPinoDiferente++;
  const avisos = [...d.avisos].sort().join(' | '), avisosEra = era.avisos.map((i) => base.textos[i]).sort().join(' | ');
  if (avisos !== avisosEra) dif.push(`avisos [${avisos}] (eram [${avisosEra}])`);
  if (dif.length) diferencas.push(`${c.id}: ${dif.slice(0, 4).join('; ')}${dif.length > 4 ? ` (+${dif.length - 4})` : ''}`);
  else iguais++;
}
const quantil = (v: number[], q: number) => [...v].sort((a, b) => a - b)[Math.floor((v.length - 1) * q)]!;
const agora = Object.fromEntries(Object.entries(tempos).map(([k, v]) => [k, { mediana: quantil(v, 0.5), p95: quantil(v, 0.95) }]));

let falhas = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
};
console.log(`\n== paridade camadas -> malha (${lista.length} casos, ${((Date.now() - t0) / 1000).toFixed(0)} s) ==`);
for (const d of diferencas.slice(0, 25)) console.log('   ', d);
ok('cada caso igual ao motor de camadas', iguais === lista.length, `${iguais}/${lista.length}`);
ok('nenhuma pilha precisou da uniao booleana', pilhasPelaUniao() === 0, String(pilhasPelaUniao()));
console.log(`        (${comPinoDiferente} casos com 1 pino a mais ou a menos que o motor de camadas)`);
// A malha e mais cara que a extrusao por camada (ela fecha o solido que a camada so empilhava):
// vale o orcamento do editor por letra, e o numero das camadas fica ao lado, sem esconder.
const m = agora.malha!, cam = agora.camadas!, dv = agora.dividir!, dvEra = base.desempenho.dividir!;
ok('da peca a tela, por letra: mediana ate 50 ms e p95 ate 250 ms', m.mediana <= 50 && m.p95 <= 250, `malha ${m.mediana.toFixed(0)}/${m.p95.toFixed(0)} ms; camadas ${cam.mediana.toFixed(0)}/${cam.p95.toFixed(0)} ms`);
ok('dividir: no maximo 1,5x o motor de camadas (mediana e p95, ms)', dv.mediana <= dvEra.mediana * 1.5 && dv.p95 <= dvEra.p95 * 1.5, `${dv.mediana.toFixed(0)}/${dv.p95.toFixed(0)} (era ${dvEra.mediana.toFixed(0)}/${dvEra.p95.toFixed(0)})`);
if (falhas) process.exit(1);
