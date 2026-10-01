import { criarPlaca3D } from '../lib/geom/placa';
import type { ParametrosPlaca } from '../lib/geom/placa';
import { geometryToSTL } from '../lib/export/stl';

let falhas = 0;
let total = 0;
function ok(nome: string, cond: boolean, detalhe = ''): void {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
}
const perto = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;

function volumeDaMalha(buf: ArrayBuffer): number {
  const dv = new DataView(buf);
  const tris = dv.getUint32(80, true);
  let volume = 0;
  let off = 84;
  for (let t = 0; t < tris; t++) {
    off += 12;
    const v: number[][] = [];
    for (let i = 0; i < 3; i++) {
      v.push([dv.getFloat32(off, true), dv.getFloat32(off + 4, true), dv.getFloat32(off + 8, true)]);
      off += 12;
    }
    const [a, b, c] = v as [number[], number[], number[]];
    volume += (a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) + a[1]! * (b[2]! * c[0]! - b[0]! * c[2]!) + a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!)) / 6;
    off += 2;
  }
  return Math.abs(volume);
}

function arestasFechadas(buf: ArrayBuffer): boolean {
  const dv = new DataView(buf);
  const tris = dv.getUint32(80, true);
  const arestas = new Map<string, number>();
  let off = 84;
  const ponto = () => {
    const p = [dv.getFloat32(off, true), dv.getFloat32(off + 4, true), dv.getFloat32(off + 8, true)];
    off += 12;
    return p.map((n) => Math.round(n * 10000)).join(',');
  };
  for (let t = 0; t < tris; t++) {
    off += 12;
    const ps = [ponto(), ponto(), ponto()];
    for (let i = 0; i < 3; i++) {
      const a = ps[i]!;
      const b = ps[(i + 1) % 3]!;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      arestas.set(key, (arestas.get(key) ?? 0) + 1);
    }
    off += 2;
  }
  return [...arestas.values()].every((n) => n === 2);
}

const placa = criarPlaca3D({ largura: 120, altura: 60, espessura: 4, raio: 8, margem: 5 });
const stl = geometryToSTL(placa.geometry, 'base');
placa.geometry.computeBoundingBox();
const areaEsperada = 120 * 60 - (4 - Math.PI) * 8 ** 2;
ok('bounds acompanham dimensoes totais', perto(placa.bounds.w, 120) && perto(placa.bounds.h, 60));
ok('placa centrada em XY', perto(placa.bounds.minX, -60) && perto(placa.bounds.maxY, 30));
const insetEsperado = 5 + (8 - 5) * (1 - 1 / Math.SQRT2);
ok('margem define a area util', perto(placa.areaUtil.w, 120 - 2 * insetEsperado) && perto(placa.areaUtil.h, 60 - 2 * insetEsperado));
ok('area da regiao arredondada', perto(placa.area, areaEsperada, 0.8));
ok('geometria assentada entre Z=0 e espessura', perto(placa.geometry.boundingBox?.min.z ?? NaN, 0) && perto(placa.geometry.boundingBox?.max.z ?? NaN, 4));
ok('malha fechada', arestasFechadas(stl));
ok('volume da malha coincide com volume analitico', perto(volumeDaMalha(stl), placa.volume, placa.volume * 0.001), `malha ${volumeDaMalha(stl).toFixed(2)} / analitico ${placa.volume.toFixed(2)} mm3`);

const quadrada = criarPlaca3D({ largura: 20, altura: 12, espessura: 2, raio: 0, margem: 1 });
ok('raio zero gera retangulo sem arredondamento', quadrada.region[0]!.outer.length === 4 && perto(quadrada.area, 240));
const placaComRaioEMargemZero = criarPlaca3D({ largura: 100, altura: 50, espessura: 2, raio: 10, margem: 0 });
const cantoUtilX = placaComRaioEMargemZero.areaUtil.maxX;
const cantoUtilY = placaComRaioEMargemZero.areaUtil.maxY;
const distanciaCanto = Math.hypot(cantoUtilX - 40, cantoUtilY - 15);
ok('area util retangular cabe dentro dos cantos arredondados', distanciaCanto >= 10 - 0.001,
  `distancia ${distanciaCanto.toFixed(3)} mm para raio 10 mm`);
const comMargem = criarPlaca3D({ largura: 100, altura: 50, espessura: 2, raio: 10, margem: 2 });
const b = comMargem.areaUtil;
const centros = [
  [40, 15, b.maxX, b.maxY],
  [-40, 15, b.minX, b.maxY],
  [40, -15, b.maxX, b.minY],
  [-40, -15, b.minX, b.minY],
];
const afastamentos = centros.map(([cx, cy, x, y]) => 10 - Math.hypot(x! - cx!, y! - cy!));
ok('area util preserva a margem minima nos quatro arcos', afastamentos.every((d) => d >= 2 - 0.001),
  afastamentos.map((d) => d.toFixed(3)).join(', ') + ' mm');
ok('bounds da area util permanecem positivos', b.w > 0 && b.h > 0);

for (const [nome, p] of [
  ['largura zero', { largura: 0, altura: 10, espessura: 1, raio: 0, margem: 0 }],
  ['altura infinita', { largura: 10, altura: Infinity, espessura: 1, raio: 0, margem: 0 }],
  ['espessura negativa', { largura: 10, altura: 10, espessura: -1, raio: 0, margem: 0 }],
  ['raio negativo', { largura: 10, altura: 10, espessura: 1, raio: -1, margem: 0 }],
  ['raio acima do limite', { largura: 10, altura: 8, espessura: 1, raio: 4.01, margem: 0 }],
  ['margem negativa', { largura: 10, altura: 10, espessura: 1, raio: 0, margem: -1 }],
  ['margem sem area util', { largura: 10, altura: 8, espessura: 1, raio: 0, margem: 4 }],
] as const) {
  let rejeitou = false;
  try { criarPlaca3D(p); } catch (e) { rejeitou = e instanceof RangeError; }
  ok(`valida ${nome}`, rejeitou);
}

for (const nome of ['largura', 'altura', 'espessura', 'raio', 'margem'] as const) {
  const incompleto = { largura: 10, altura: 10, espessura: 1, raio: 0, margem: 0 } as Record<string, number>;
  delete incompleto[nome];
  let rejeitou = false;
  try { criarPlaca3D(incompleto as unknown as ParametrosPlaca); } catch (e) { rejeitou = e instanceof RangeError; }
  ok(`rejeita parametro omitido: ${nome}`, rejeitou);
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
