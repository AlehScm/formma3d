import fs from 'fs';
import { parseFont } from '../lib/text/glyphs';
import { prepararTextoPlaca } from '../lib/geom/placa-texto';
import { criarPlaca3D } from '../lib/geom/placa';
import { geometryToSTL } from '../lib/export/stl';

let falhas = 0;
let total = 0;
function ok(nome: string, cond: boolean, detalhe = ''): void {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
}

function malhaFechada(buf: ArrayBuffer): boolean {
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

const bytes = fs.readFileSync('C:/Windows/Fonts/arialbd.ttf');
const font = parseFont(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
const placa = criarPlaca3D({ largura: 120, altura: 60, espessura: 4, raio: 8, margem: 5 });
const resultado = prepararTextoPlaca(placa, font, 'AOB', 24, 1, 3);
const buracos = resultado.letras.reduce((soma, letra) => soma + letra.region.reduce((n, poly) => n + poly.holes.length, 0), 0);
ok('prepara uma geometria por glifo de AOB', resultado.letras.length === 3);
ok('preserva contornos internos e furos', buracos === 4, `${buracos} furos`);
ok('centraliza o conjunto na area util',
  Math.abs((resultado.boundsMontagem.minX + resultado.boundsMontagem.maxX) / 2 - (placa.areaUtil.minX + placa.areaUtil.maxX) / 2) < 0.01 &&
  Math.abs((resultado.boundsMontagem.minY + resultado.boundsMontagem.maxY) / 2 - (placa.areaUtil.minY + placa.areaUtil.maxY) / 2) < 0.01);
ok('bounds de cada letra ficam dentro da area util', resultado.letras.every((letra) =>
  letra.boundsMontagem.minX >= placa.areaUtil.minX - 0.01 && letra.boundsMontagem.maxX <= placa.areaUtil.maxX + 0.01 &&
  letra.boundsMontagem.minY >= placa.areaUtil.minY - 0.01 && letra.boundsMontagem.maxY <= placa.areaUtil.maxY + 0.01));
ok('geometrias individuais sao malhas fechadas e apoiadas em Z=0', resultado.letras.every((letra) => {
  letra.geometry.computeBoundingBox();
  const box = letra.geometry.boundingBox!;
  return box.min.z >= -0.001 && Math.abs(box.max.z - 3) < 0.001 && malhaFechada(geometryToSTL(letra.geometry, letra.nome));
}));

for (const [nome, executar] of [
  ['texto vazio', () => prepararTextoPlaca(placa, font, '  ', 24, 0, 3)],
  ['texto sem contornos', () => prepararTextoPlaca(placa, font, ' ', 24, 0, 3)],
  ['altura zero', () => prepararTextoPlaca(placa, font, 'A', 0, 0, 3)],
  ['tracking nao finito', () => prepararTextoPlaca(placa, font, 'A', 24, Infinity, 3)],
  ['espessura zero', () => prepararTextoPlaca(placa, font, 'A', 24, 0, 0)],
  ['texto que excede a area util', () => prepararTextoPlaca(placa, font, 'MMMMMMMM', 24, 0, 3)],
] as const) {
  let rejeitou = false;
  try { executar(); } catch (e) { rejeitou = e instanceof RangeError; }
  ok(`rejeita ${nome}`, rejeitou);
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
