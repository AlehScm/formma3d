/**
 * "Suavizar relevo": acha a marca em alto/baixo relevo numa face plana e achata.
 *   npx tsx scripts/verificar-relevo.mts
 *
 * As malhas de teste sao montadas a mao como UMA casca fechada, igual a um STL de
 * verdade: o partToGeometry empilha solidos que so encostam, o que nao serve aqui.
 */
import * as THREE from 'three';
import { aplanar, detectarRelevo, malhaFechada, soldar } from '../lib/mesh/relevo';
import { lerStl } from '../lib/import/stl';
import { posicoesParaSTL } from '../lib/export/stl';

let falhas = 0;
let total = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  total++;
  if (!cond) falhas++;
  console.log(`${cond ? '  ok  ' : ' FALHA'}  ${nome}${detalhe ? '  -> ' + detalhe : ''}`);
};
const perto = (a: number, b: number, tol = 1e-3) => Math.abs(a - b) <= tol;

type P = [number, number];
type V3 = [number, number, number];
interface Forma { contorno: P[]; furos: P[][] }

const areaAssinada = (r: P[]) => r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]!; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
const ccw = (r: P[]) => (areaAssinada(r) < 0 ? [...r].reverse() : r);

function tri(out: number[], a: V3, b: V3, c: V3, n: V3) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const g = [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
  if (g[0]! * n[0] + g[1]! * n[1] + g[2]! * n[2] < 0) out.push(...a, ...c, ...b);
  else out.push(...a, ...b, ...c);
}
/** Tampa horizontal (contorno com furos) em z, olhando para cima ou para baixo. */
function tampa(out: number[], f: Forma, z: number, cima: boolean) {
  const cont = ccw(f.contorno).map((p) => new THREE.Vector2(p[0], p[1]));
  const furos = f.furos.map((h) => ccw(h).reverse().map((p) => new THREE.Vector2(p[0], p[1])));
  const todos = [...cont, ...furos.flat()];
  for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(cont, furos)) {
    const pa = todos[a!]!, pb = todos[b!]!, pc = todos[c!]!;
    tri(out, [pa.x, pa.y, z], [pb.x, pb.y, z], [pc.x, pc.y, z], [0, 0, cima ? 1 : -1]);
  }
}
/** Parede vertical de um anel entre z0 e z1; `direita` = normal no lado direito de cada aresta do anel em CCW. */
function parede(out: number[], anel: P[], z0: number, z1: number, direita: boolean) {
  const r = ccw(anel);
  r.forEach((a, i) => {
    const b = r[(i + 1) % r.length]!;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const n: V3 = direita ? [dy, -dx, 0] : [-dy, dx, 0];
    tri(out, [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], n);
    tri(out, [a[0], a[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], n);
  });
}
const ret = (x0: number, y0: number, x1: number, y1: number): P[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

// A marca: um "L" e um "O" (anel com miolo).
const L: Forma = { contorno: [[10, 10], [16, 10], [16, 26], [24, 26], [24, 30], [10, 30]], furos: [] };
// Bases desalinhadas de proposito: colineares, o triangulador deixa uma aresta passando pelos cantos.
const O: Forma = { contorno: ret(32, 12, 48, 32), furos: [ret(36, 16, 44, 28)] };
const MARCA = [L, O];
const W = 60, D = 40, T = 10;

/**
 * Placa W x D x T com a marca na face de cima: `h` > 0 em alto relevo, < 0 gravada.
 * `chanfro` > 0 chanfra a borda de cima da placa.
 */
function placa(h: number, chanfro = 0): Float32Array {
  const out: number[] = [];
  const zc = T - chanfro;
  tampa(out, { contorno: ret(0, 0, W, D), furos: [] }, 0, false);
  parede(out, ret(0, 0, W, D), 0, zc, true);
  const topo = chanfro ? ret(chanfro, chanfro, W - chanfro, D - chanfro) : ret(0, 0, W, D);
  if (chanfro) {
    const a = ret(0, 0, W, D), b = topo;
    for (let i = 0; i < 4; i++) {
      const a0 = a[i]!, a1 = a[(i + 1) % 4]!, b0 = b[i]!, b1 = b[(i + 1) % 4]!;
      const n: V3 = [a1[1] - a0[1], -(a1[0] - a0[0]), 1];
      tri(out, [a0[0], a0[1], zc], [a1[0], a1[1], zc], [b1[0], b1[1], T], n);
      tri(out, [a0[0], a0[1], zc], [b1[0], b1[1], T], [b0[0], b0[1], T], n);
    }
  }
  if (!h) {
    tampa(out, { contorno: topo, furos: [] }, T, true);
    return new Float32Array(out);
  }
  // Face de cima com buraco no formato da marca; o miolo do O fica na face.
  tampa(out, { contorno: topo, furos: MARCA.map((f) => f.contorno) }, T, true);
  for (const f of MARCA) for (const furo of f.furos) tampa(out, { contorno: furo, furos: [] }, T, true);
  const z1 = T + h;
  for (const f of MARCA) {
    // Alto relevo: material dentro da letra. Gravado: material fora (paredes olham para o vazio).
    parede(out, f.contorno, Math.min(T, z1), Math.max(T, z1), h > 0);
    for (const furo of f.furos) parede(out, furo, Math.min(T, z1), Math.max(T, z1), h < 0);
    tampa(out, f, z1, true);
  }
  return new Float32Array(out);
}

function volume(pos: Float32Array): number {
  let v = 0;
  for (let i = 0; i < pos.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = Array.from(pos.subarray(i, i + 9)) as number[];
    v += (ax! * (by! * cz! - bz! * cy!) - ay! * (bx! * cz! - bz! * cx!) + az! * (bx! * cy! - by! * cx!)) / 6;
  }
  return v;
}
const zMax = (pos: Float32Array) => { let z = -Infinity; for (let i = 2; i < pos.length; i += 3) z = Math.max(z, pos[i]!); return z; };
const zMin = (pos: Float32Array) => { let z = Infinity; for (let i = 2; i < pos.length; i += 3) z = Math.min(z, pos[i]!); return z; };

/** Triangulo cujo centro esta em (x, y), olhando para cima, na altura z. */
function achar(pos: Float32Array, x: number, y: number, z: number, tol = 1e-3): { tri: number; p: V3 } {
  const m = soldar(pos);
  let melhor = -1, dmin = Infinity;
  for (let f = 0; f < m.t.length / 3; f++) {
    const vs = [0, 1, 2].map((e) => m.t[f * 3 + e]! * 3);
    if (!vs.every((k) => perto(m.v[k + 2]!, z, tol))) continue;
    const cx = vs.reduce((s, k) => s + m.v[k]!, 0) / 3, cy = vs.reduce((s, k) => s + m.v[k + 1]!, 0) / 3;
    const d = Math.hypot(cx - x, cy - y);
    if (d < dmin) { dmin = d; melhor = f; }
  }
  return { tri: melhor, p: [x, y, z] };
}

const cheia = W * D * T;
const O_ = { alturaMax: 2, raio: 60 };

console.log('\n== malhas de teste ==');
for (const [nome, pos] of [['alto relevo', placa(1)], ['gravada', placa(-1)], ['com chanfro', placa(0, 0.8)]] as const) {
  ok(`${nome}: casca unica e fechada`, malhaFechada(pos));
}

console.log('\n== alto relevo (letras 1 mm acima da face) ==');
{
  const pos = placa(1);
  const m = soldar(pos);
  ok('antes: a marca soma volume', volume(pos) > cheia, `${volume(pos).toFixed(0)} mm3`);
  const naLetra = achar(pos, 12, 20, T + 1);
  const r = detectarRelevo(m, naLetra.tri, naLetra.p, O_);
  ok('clicando na letra: acha a marca', r.triangulos.length > 0 && r.pedacos === 2, `${r.pedacos} pedacos, ${r.triangulos.length} triangulos`);
  ok('plano base e a face de cima', perto(r.plano.n[2], 1) && perto(r.plano.d, T));
  ok('area da marca = L + O sem o miolo', perto(r.area, (6 * 20 + 8 * 4) + (16 * 20 - 8 * 12), 0.01), `${r.area.toFixed(1)} mm2`);
  const naFace = achar(pos, 55, 35, T);
  ok('clicando na face ao lado: acha o mesmo', detectarRelevo(m, naFace.tri, naFace.p, O_).triangulos.length === r.triangulos.length);
  const depois = aplanar(m, r);
  ok('depois: continua fechada', malhaFechada(depois));
  ok('depois: a marca sumiu (volume da placa lisa)', perto(volume(depois), cheia, 0.01), `${volume(depois).toFixed(2)} vs ${cheia}`);
  ok('depois: altura volta a 10 mm', perto(zMax(depois), T) && perto(zMin(depois), 0));
}

console.log('\n== baixo relevo (letras gravadas 1 mm) ==');
{
  const pos = placa(-1);
  const m = soldar(pos);
  ok('antes: a marca tira volume', volume(pos) < cheia);
  const noFundo = achar(pos, 12, 20, T - 1);
  const r = detectarRelevo(m, noFundo.tri, noFundo.p, O_);
  ok('clicando no fundo da gravacao: acha a marca', r.pedacos === 2, `${r.pedacos} pedacos`);
  const depois = aplanar(m, r);
  ok('depois: fechada e com a face cheia', malhaFechada(depois) && perto(volume(depois), cheia, 0.01), `${volume(depois).toFixed(2)} mm3`);
}

console.log('\n== nao mexe no que nao e marca ==');
{
  const alto = placa(5);
  const m5 = soldar(alto);
  const c = achar(alto, 55, 35, T);
  const r5 = detectarRelevo(m5, c.tri, c.p, O_);
  ok('relevo mais alto que o limite e ignorado, com aviso', r5.triangulos.length === 0 && !!r5.aviso, r5.aviso);

  const cham = placa(0, 0.8);
  const mc = soldar(cham);
  const cc = achar(cham, 30, 20, T);
  const rc = detectarRelevo(mc, cc.tri, cc.p, O_);
  ok('chanfro na borda da peca nao conta como marca', rc.triangulos.length === 0 && /borda/.test(rc.aviso ?? ''), rc.aviso);

  const lisa = placa(0);
  const ml = soldar(lisa);
  const cl = achar(lisa, 30, 20, T);
  const rl = detectarRelevo(ml, cl.tri, cl.p, O_);
  ok('face sem nada: avisa e nao muda', rl.triangulos.length === 0 && !!rl.aviso, rl.aviso);

  const pouco = detectarRelevo(soldar(placa(1)), achar(placa(1), 12, 20, T + 1).tri, [12, 20, T + 1], { alturaMax: 2, raio: 3 });
  ok('raio pequeno ainda pega a letra inteira clicada', pouco.pedacos >= 1, `${pouco.pedacos} pedaco(s)`);
}

console.log('\n== malha de verdade: face "plana" com oscilacao e lascas ==');
{
  // Mosquetao da Bambu: a face tinha pontos a 0,01-0,02 mm do plano e triangulos lasca
  // com a normal torta em ate 20 graus. Metade do texto era recusada e, ao aplicar,
  // a malha abria. Aqui: gravacao rasa (0,25 mm) e ruido de ate 0,015 mm na face.
  const pos = placa(-0.25);
  let semente = 7;
  const aleatorio = () => ((semente = (semente * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const ruido = new Map<string, number>();
  for (let i = 0; i < pos.length; i += 3) {
    if (!perto(pos[i + 2]!, T, 1e-6)) continue;
    const k = `${pos[i]},${pos[i + 1]}`; // mesmo ponto, mesmo ruido: a malha continua fechada
    if (!ruido.has(k)) ruido.set(k, aleatorio() * 0.015);
    pos[i + 2] = T + ruido.get(k)!;
  }
  ok('malha com ruido continua fechada', malhaFechada(pos));
  const m = soldar(pos);
  const c = achar(pos, 55, 35, T, 0.02);
  const r = detectarRelevo(m, c.tri, c.p, O_);
  ok('acha a marca inteira mesmo com a face oscilando', r.pedacos === 2, `${r.pedacos} pedacos ${r.aviso ?? ''}`);
  const depois = aplanar(m, r);
  ok('achatada, a malha fica fechada', malhaFechada(depois));
  // O ruido muda uns mm3 da placa; o que importa e a gravacao (376 mm2 x 0,25 mm) voltar.
  const preenchido = volume(depois) - volume(pos);
  ok('e a gravacao some (volume dela volta)', perto(preenchido, 376 * 0.25, 5), `+${preenchido.toFixed(1)} mm3`);
}

console.log('\n== parede curva: texto gravado na lateral redonda ==');
{
  // Mosquetao: "C.2" gravado 0,25 mm na parede que curva para o gancho. Aqui: cilindro
  // R 25 x 10, parede em grade de 1 grau x 0,5 mm, com um "I" e um "L" gravados.
  const R0 = 25, H = 10, N = 360, M = 20, prof = 0.25;
  const noI = (i: number, j: number) => i >= 20 && i < 24 && j >= 4 && j < 16;
  const noL = (i: number, j: number) => i >= 28 && i < 40 && j >= 4 && j < 16 && (i < 31 || j < 7);
  const cilindro = (marca: (i: number, j: number) => boolean) => {
    const out: number[] = [];
    const th = (i: number) => (2 * Math.PI * i) / N;
    const pt = (i: number, j: number, r: number): V3 => [r * Math.cos(th(i)), r * Math.sin(th(i)), (H * j) / M];
    const quad = (a: V3, b: V3, c: V3, d: V3, n: V3) => { tri(out, a, b, c, n); tri(out, a, c, d, n); };
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const g = marca(i, j), r = g ? R0 - prof : R0;
      const tm = th(i + 0.5);
      quad(pt(i, j, r), pt(i + 1, j, r), pt(i + 1, j + 1, r), pt(i, j + 1, r), [Math.cos(tm), Math.sin(tm), 0]);
      // Parede da gravacao: olha para dentro da celula gravada.
      if (g !== marca(i + 1, j)) {
        const t: V3 = [-Math.sin(th(i + 1)), Math.cos(th(i + 1)), 0];
        const n: V3 = g ? [-t[0], -t[1], 0] : t;
        quad(pt(i + 1, j, R0), pt(i + 1, j, R0 - prof), pt(i + 1, j + 1, R0 - prof), pt(i + 1, j + 1, R0), n);
      }
      if (g !== marca(i, j + 1)) {
        quad(pt(i, j + 1, R0), pt(i + 1, j + 1, R0), pt(i + 1, j + 1, R0 - prof), pt(i, j + 1, R0 - prof), [0, 0, g ? -1 : 1]);
      }
    }
    for (let i = 0; i < N; i++) {
      tri(out, [0, 0, 0], pt(i, 0, R0), pt(i + 1, 0, R0), [0, 0, -1]);
      tri(out, [0, 0, H], pt(i, M, R0), pt(i + 1, M, R0), [0, 0, 1]);
    }
    return new Float32Array(out);
  };
  const clique = (m: ReturnType<typeof soldar>, i: number, j: number, r: number) => {
    const t = (2 * Math.PI * (i + 0.5)) / N;
    const p: V3 = [r * Math.cos(t), r * Math.sin(t), (H * (j + 0.5)) / M];
    let melhor = -1, dmin = Infinity;
    for (let f = 0; f < m.t.length / 3; f++) {
      const c = [0, 1, 2].map((k) => [0, 1, 2].reduce((s, e) => s + m.v[m.t[f * 3 + e]! * 3 + k]!, 0) / 3);
      const d = Math.hypot(c[0]! - p[0], c[1]! - p[1], c[2]! - p[2]);
      if (d < dmin) { dmin = d; melhor = f; }
    }
    return { tri: melhor, p };
  };
  const pos = cilindro((i, j) => noI(i, j) || noL(i, j));
  ok('cilindro gravado: casca fechada', malhaFechada(pos));
  const m = soldar(pos);
  const naParede = clique(m, 45, 10, R0);
  const r = detectarRelevo(m, naParede.tri, naParede.p, O_);
  ok('clicando na parede ao lado: acha o I e o L', r.pedacos === 2 && !!r.curva, `${r.pedacos} pedacos ${r.aviso ?? ''}`);
  const noFundo = clique(m, 22, 10, R0 - prof);
  ok('clicando no fundo da letra: acha o mesmo', detectarRelevo(m, noFundo.tri, noFundo.p, O_).triangulos.length === r.triangulos.length);
  const depois = aplanar(m, r);
  ok('achatada: fechada e sem as paredes da gravacao', malhaFechada(depois) && depois.length < pos.length);
  const celulas = 4 * 12 + (3 * 12 + 9 * 3);
  const esperado = celulas * ((2 * Math.PI * R0) / N) * (H / M) * prof;
  const preenchido = volume(depois) - volume(pos);
  ok('e a gravacao some (volume dela volta)', perto(preenchido, esperado, esperado * 0.05), `+${preenchido.toFixed(2)} de ~${esperado.toFixed(2)} mm3`);
  const liso = cilindro(() => false);
  const ml = soldar(liso);
  let achou = 0;
  for (let i = 0; i < N; i += 15) for (const j of [2, 10, 17]) {
    const c = clique(ml, i, j, R0);
    if (detectarRelevo(ml, c.tri, c.p, O_).triangulos.length) achou++;
  }
  ok('cilindro liso: nenhum clique acha marca', achou === 0, `${achou} achados`);
}

console.log('\n== caminho do app: importar STL, suavizar, exportar, reimportar ==');
{
  // Mesmos passos do app: lerStl centraliza em XY e assenta em Z=0, como o import faz.
  const importado = lerStl(posicoesParaSTL(placa(1), 'placa-marca'));
  const pos = importado.posicoes;
  const m = soldar(pos);
  // Clique no topo do L, ja no referencial do objeto importado (centrado).
  const dx = -W / 2, dy = -D / 2;
  const alvo = achar(pos, 12 + dx, 20 + dy, T + 1);
  const r = detectarRelevo(m, alvo.tri, alvo.p, O_);
  ok('no STL importado: acha a marca', r.pedacos === 2, `${r.pedacos} pedacos`);
  const volta = lerStl(posicoesParaSTL(aplanar(m, r), 'placa-lisa'));
  ok('exportado e reimportado: fechado', malhaFechada(volta.posicoes));
  ok('exportado e reimportado: 60 x 40 x 10, sem a marca', perto(volta.max[0] - volta.min[0], W) && perto(volta.max[1] - volta.min[1], D) && perto(volta.max[2], T) && perto(volume(volta.posicoes), cheia, 0.05), `${volume(volta.posicoes).toFixed(2)} mm3`);
}

console.log(`\n${total - falhas}/${total} passaram\n`);
process.exit(falhas ? 1 : 0);
