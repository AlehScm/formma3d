/**
 * "Suavizar relevo": acha a marca em alto/baixo relevo numa face plana e achata.
 *   npx tsx scripts/verificar-relevo.mts
 *
 * As malhas de teste sao montadas a mao como UMA casca fechada, igual a um STL de
 * verdade: o partToGeometry empilha solidos que so encostam, o que nao serve aqui.
 */
import * as THREE from 'three';
import { aplanar, detectarRelevo, juntarPecas, malhaFechada, soldar } from '../lib/mesh/relevo';
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

  ok('area remendada = L + O inteiro (o miolo sai e volta)', perto(r.area, (6 * 20 + 8 * 4) + 16 * 20, 0.01), `${r.area.toFixed(1)} mm2`);
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
  ok('chanfro na borda da peca nao conta como marca', rc.triangulos.length === 0 && !!rc.aviso, rc.aviso);

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

console.log('\n== superficies geradas: plano, cilindros, esfera, sela ==');
{
  // Gerador unico: superficie S(u, v) com a normal, grade de celulas e um mapa de marca.
  // Celula marcada desce (gravada) ou sobe (alto relevo) `prof` ao longo da normal local,
  // com parede na divisa. Fecha num solido com o verso a `ESP` para dentro e laterais.
  // Como a superficie verdadeira e conhecida, da para medir o remendo de verdade.
  interface Sup { nome: string; S: (u: number, v: number) => { p: V3; n: V3 }; dist: (q: V3) => number; nu: number; nv: number }
  const ESP = 2;
  const unit = (x: V3): V3 => { const l = Math.hypot(...x); return [x[0] / l, x[1] / l, x[2] / l]; };
  const plano: Sup = { nome: 'plano', S: (u, v) => ({ p: [30 * u, 30 * v, 0], n: [0, 0, 1] }), dist: (q) => Math.abs(q[2]), nu: 60, nv: 60 };
  const cilindro = (R: number, nu = 60): Sup => ({
    nome: `cilindro R${R}${nu < 60 ? ' grosso' : ''}`,
    S: (u, v) => { const t = ((u - 0.5) * 30) / R; return { p: [R * Math.sin(t), 30 * v, R * Math.cos(t)], n: [Math.sin(t), 0, Math.cos(t)] }; },
    dist: (q) => Math.abs(Math.hypot(q[0], q[2]) - R), nu, nv: 60,
  });
  const esfera: Sup = {
    nome: 'esfera R20',
    S: (u, v) => { const d = unit([(u - 0.5) * 30, (v - 0.5) * 30, 20]); return { p: [20 * d[0], 20 * d[1], 20 * d[2]], n: d }; },
    dist: (q) => Math.abs(Math.hypot(...q) - 20), nu: 60, nv: 60,
  };
  const sela: Sup = {
    nome: 'sela',
    S: (u, v) => { const x = (u - 0.5) * 30, y = (v - 0.5) * 30; return { p: [x, y, (x * x - y * y) / 50], n: unit([-x / 25, y / 25, 1]) }; },
    dist: (q) => Math.abs(q[2] - (q[0] * q[0] - q[1] * q[1]) / 50) / Math.hypot(1, q[0] / 25, q[1] / 25), nu: 60, nv: 60,
  };
  // "I", "L" e um "O" com miolo, no meio da grade (celula de 0,5 mm).
  const letras = (nu: number, nv: number) => (i: number, j: number) => {
    const x = i - Math.floor(nu / 2) + 13, y = j - Math.floor(nv / 2) + 8;
    const I = x >= 0 && x < 4 && y >= 0 && y < 16;
    const L = x >= 8 && x < 18 && y >= 0 && y < 16 && (x < 11 || y < 3);
    const O = x >= 21 && x < 31 && y >= 0 && y < 16 && !(x >= 24 && x < 28 && y >= 4 && y < 12);
    return I || L || O;
  };
  const semMarca = () => false;

  function gerar(sup: Sup, marca: (i: number, j: number) => boolean, prof: number, ruido = 0): Float32Array {
    const out: number[] = [];
    const { nu, nv } = sup;
    let semente = 11;
    const cacheR = new Map<string, number>();
    const r = (i: number, j: number) => {
      const k = `${i},${j}`;
      if (!cacheR.has(k)) cacheR.set(k, ruido ? (((semente = (semente * 16807) % 2147483647) / 2147483647) * 2 - 1) * ruido : 0);
      return cacheR.get(k)!;
    };
    const P = (i: number, j: number, off: number): V3 => {
      const { p, n } = sup.S(i / nu, j / nv);
      const d = off === 0 ? r(i, j) : off;
      return [p[0] + d * n[0], p[1] + d * n[1], p[2] + d * n[2]];
    };
    const B = (i: number, j: number) => P(i, j, -ESP);
    const nC = (i: number, j: number) => sup.S((i + 0.5) / nu, (j + 0.5) / nv).n;
    const cC = (i: number, j: number) => sup.S((i + 0.5) / nu, (j + 0.5) / nv).p;
    const dentroG = (i: number, j: number) => i >= 0 && j >= 0 && i < nu && j < nv;
    const nivel = (i: number, j: number) => (marca(i, j) ? prof : 0);
    const quad = (a: V3, b: V3, c: V3, d: V3, n: V3) => { tri(out, a, b, c, n); tri(out, a, c, d, n); };
    const menos = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const h = nivel(i, j);
      quad(P(i, j, h), P(i + 1, j, h), P(i + 1, j + 1, h), P(i, j + 1, h), nC(i, j));
      quad(B(i, j), B(i + 1, j), B(i + 1, j + 1), B(i, j + 1), nC(i, j).map((x) => -x) as V3);
      // Parede entre celula marcada e nao marcada (a direita e em cima desta).
      for (const [di, dj] of [[1, 0], [0, 1]] as const) {
        const i2 = i + di, j2 = j + dj;
        if (!dentroG(i2, j2) || marca(i, j) === marca(i2, j2)) continue;
        const [p0, p1] = di ? [[i + 1, j], [i + 1, j + 1]] : [[i, j + 1], [i + 1, j + 1]];
        const [mi, mj, ni, nj] = marca(i, j) ? [i, j, i2, j2] : [i2, j2, i, j];
        const para = prof < 0 ? menos(cC(mi, mj), cC(ni, nj)) : menos(cC(ni, nj), cC(mi, mj));
        quad(P(p0![0]!, p0![1]!, 0), P(p1![0]!, p1![1]!, 0), P(p1![0]!, p1![1]!, prof), P(p0![0]!, p0![1]!, prof), para);
      }
    }
    // Laterais: por aresta da borda, poligono verso -> niveis da frente, em leque de um
    // ponto do meio (os niveis de um canto ficam na mesma reta e nao podem ser leque).
    const centro = sup.S(0.5, 0.5).p;
    const borda: [number, number, number, number, number, number][] = [];
    for (let i = 0; i < nu; i++) { borda.push([i, 0, i + 1, 0, i, 0]); borda.push([i, nv, i + 1, nv, i, nv - 1]); }
    for (let j = 0; j < nv; j++) { borda.push([0, j, 0, j + 1, 0, j]); borda.push([nu, j, nu, j + 1, nu - 1, j]); }
    const niveisNo = (i: number, j: number, ate: number) => {
      const lv = new Set<number>();
      for (const [ci, cj] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) if (dentroG(ci!, cj!) && (ci === 0 || cj === 0 || ci === nu - 1 || cj === nv - 1)) lv.add(nivel(ci!, cj!));
      return [...lv].filter((x) => x <= ate).sort((a, b) => a - b);
    };
    for (const [ai, aj, bi, bj, ci, cj] of borda) {
      const h = nivel(ci, cj);
      const poli: V3[] = [B(ai, aj), B(bi, bj), ...niveisNo(bi, bj, h).map((x) => P(bi, bj, x)), ...niveisNo(ai, aj, h).reverse().map((x) => P(ai, aj, x))];
      const meio = poli.reduce((s, q) => [s[0] + q[0] / poli.length, s[1] + q[1] / poli.length, s[2] + q[2] / poli.length] as V3, [0, 0, 0] as V3);
      const fora = menos(meio, centro);
      poli.forEach((q, k) => tri(out, meio, q, poli[(k + 1) % poli.length]!, fora));
    }
    return new Float32Array(out);
  }
  // Clique no meio da celula (i, j) da frente, no nivel dela.
  const clique = (sup: Sup, m: ReturnType<typeof soldar>, i: number, j: number, off: number) => {
    const { p, n } = sup.S((i + 0.5) / sup.nu, (j + 0.5) / sup.nv);
    const q: V3 = [p[0] + off * n[0], p[1] + off * n[1], p[2] + off * n[2]];
    let melhor = -1, dmin = Infinity;
    for (let f = 0; f < m.t.length / 3; f++) {
      const c = [0, 1, 2].map((k) => [0, 1, 2].reduce((s, e) => s + m.v[m.t[f * 3 + e]! * 3 + k]!, 0) / 3);
      const d = Math.hypot(c[0]! - q[0], c[1]! - q[1], c[2]! - q[2]);
      if (d < dmin) { dmin = d; melhor = f; }
    }
    return { tri: melhor, p: q };
  };
  const chaves = (pos: Float32Array) => { const s = new Set<string>(); for (let i = 0; i < pos.length; i += 3) s.add(`${pos[i]},${pos[i + 1]},${pos[i + 2]}`); return s; };
  // Lascas: tampa de area zero em aresta de vinco e agulha em aresta lisa.
  function comLascas(pos: Float32Array, cada: number): Float32Array {
    const m = soldar(pos);
    const nt = m.t.length / 3;
    const normal = (f: number) => {
      const p = [0, 1, 2].map((e) => Array.from(m.v.slice(m.t[f * 3 + e]! * 3, m.t[f * 3 + e]! * 3 + 3)));
      const u = [0, 1, 2].map((k) => p[1]![k]! - p[0]![k]!), w = [0, 1, 2].map((k) => p[2]![k]! - p[0]![k]!);
      return unit([u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!]);
    };
    const tris: number[][] = [];
    for (let f = 0; f < nt; f++) tris.push([m.t[f * 3]!, m.t[f * 3 + 1]!, m.t[f * 3 + 2]!]);
    const vs = Array.from(m.v);
    const mexido = new Set<number>();
    let conta = 0;
    for (const [k, l] of m.arestas) {
      if (l.length !== 2 || mexido.has(l[0]!) || mexido.has(l[1]!)) continue;
      if (conta++ % cada) continue;
      const [f, g] = l as [number, number];
      const na = normal(f), nb = normal(g);
      const vinco = na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2] < 0.5;
      const [a, b] = k.split(',').map(Number) as [number, number];
      // f tem a aresta p -> q; g tem q -> p.
      const tf = tris[f]!, ia = tf.indexOf(a);
      const [p, q] = tf[(ia + 1) % 3] === b ? [a, b] : [b, a];
      const t = vinco ? 0.5 : 0.01; // agulha de 5 um (a solda junta pontos a menos de 0,1 um)
      const mid = vs.length / 3;
      vs.push(...[0, 1, 2].map((c) => vs[p * 3 + c]! + t * (vs[q * 3 + c]! - vs[p * 3 + c]!)));
      const c1 = tf.find((x) => x !== a && x !== b)!, c2 = tris[g]!.find((x) => x !== a && x !== b)!;
      tris[g] = [q, mid, c2];
      tris.push([mid, p, c2]);
      if (vinco) tris.push([q, p, mid]); // tampa: tres pontos na mesma reta
      else {
        tris[f] = [p, mid, c1];
        tris.push([mid, q, c1]);
      }
      mexido.add(f).add(g);
    }
    const out: number[] = [];
    for (const t of tris) for (const vi of t) out.push(vs[vi * 3]!, vs[vi * 3 + 1]!, vs[vi * 3 + 2]!);
    return new Float32Array(out);
  }
  const varrer = (pos: Float32Array, passo: number) => {
    const m = soldar(pos);
    let achou = 0;
    for (let f = 0; f < m.t.length / 3; f += passo) {
      const c = [0, 1, 2].map((k) => [0, 1, 2].reduce((s, e) => s + m.v[m.t[f * 3 + e]! * 3 + k]!, 0) / 3) as V3;
      if (detectarRelevo(m, f, c, O_).triangulos.length) achou++;
    }
    return achou;
  };

  for (const sup of [plano, cilindro(25), cilindro(8), esfera, sela]) {
    const liso = gerar(sup, semMarca, 0);
    for (const [tipo, prof] of [['gravada', -0.25], ['alto relevo', 0.4]] as const) {
      const nome = `${sup.nome}, ${tipo}`;
      const pos = gerar(sup, letras(sup.nu, sup.nv), prof);
      const m = soldar(pos);
      const i0 = Math.floor(sup.nu / 2), j0 = Math.floor(sup.nv / 2);
      const ao = clique(sup, m, i0 + 22, j0, 0), na = clique(sup, m, i0 - 12, j0, prof);
      const r = detectarRelevo(m, ao.tri, ao.p, O_);
      const rLetra = detectarRelevo(m, na.tri, na.p, O_);
      const depois = r.pedacos ? aplanar(m, r) : pos;
      const esperado = volume(liso) - volume(pos);
      const erro = volume(liso) - volume(depois);
      const orig = chaves(pos);
      let desvio = 0;
      for (let i = 0; i < depois.length; i += 3) {
        if (orig.has(`${depois[i]},${depois[i + 1]},${depois[i + 2]}`)) continue;
        desvio = Math.max(desvio, sup.dist([depois[i]!, depois[i + 1]!, depois[i + 2]!]));
      }
      ok(`${nome}: fechada; acha I, L e O clicando ao lado`, malhaFechada(pos) && r.pedacos === 3, `${r.pedacos} pedacos ${r.aviso ?? ''}`);
      ok(`${nome}: clicando na letra da no mesmo`, rLetra.triangulos.length === r.triangulos.length, `${rLetra.pedacos} pedacos ${rLetra.aviso ?? ''}`);
      ok(`${nome}: remendada fica fechada, volume da peca lisa`, malhaFechada(depois) && Math.abs(erro) <= 0.03 * Math.abs(esperado), `sobra ${erro.toFixed(3)} de ${esperado.toFixed(2)} mm3`);
      ok(`${nome}: remendo na superficie verdadeira (< 0,05 mm, abaixo da resolucao de impressao)`, desvio <= 0.05, `desvio max ${desvio.toFixed(4)} mm`);
    }
  }

  console.log('\n-- o que nao e marca --');
  for (const sup of [plano, cilindro(8), cilindro(8, 8), esfera, sela]) {
    const grosso = sup.nu < 60;
    const achados = varrer(gerar(sup, semMarca, 0, grosso ? 0 : 0.015), 23);
    ok(`${sup.nome} liso${grosso ? '' : ' com ruido'}: nenhum clique acha marca`, achados === 0, `${achados} achados`);
  }
  {
    const achados = varrer(comLascas(gerar(cilindro(25), semMarca, 0), 7), 23);
    ok('cilindro liso com lascas: nenhum clique acha marca', achados === 0, `${achados} achados`);
  }
  {
    const sup = cilindro(25);
    const pos = comLascas(gerar(sup, letras(sup.nu, sup.nv), -0.25), 5);
    const m = soldar(pos);
    const c = clique(sup, m, 52, 30, 0);
    const r = detectarRelevo(m, c.tri, c.p, O_);
    const depois = r.pedacos ? aplanar(m, r) : pos;
    ok('lascas no vinco da letra: fechada, acha as 3 e remenda fechado', malhaFechada(pos) && r.pedacos === 3 && malhaFechada(depois), `${r.pedacos} pedacos ${r.aviso ?? ''}`);
  }
  {
    const pos = gerar(esfera, letras(esfera.nu, esfera.nv), -0.25, 0.015);
    const m = soldar(pos);
    const c = clique(esfera, m, 52, 30, 0);
    const r = detectarRelevo(m, c.tri, c.p, O_);
    ok('esfera com ruido: acha as 3', r.pedacos === 3 && malhaFechada(aplanar(m, r)), `${r.pedacos} pedacos ${r.aviso ?? ''}`);
  }
  {
    // Rasgo que sai pela borda da peca: e degrau da peca, nao marca. O I no meio sai.
    const marca = (i: number, j: number) => (i >= 17 && i < 21 && j >= 22 && j < 38) || (i >= 40 && j >= 28 && j < 32);
    const pos = gerar(plano, marca, -0.25);
    const m = soldar(pos);
    const c = clique(plano, m, 30, 10, 0);
    const r = detectarRelevo(m, c.tri, c.p, O_);
    ok('rasgo que sai pela borda fica; a letra no meio sai', malhaFechada(pos) && r.pedacos === 1 && malhaFechada(aplanar(m, r)), `${r.pedacos} pedacos ${r.aviso ?? ''}`);
  }
  {
    // Peca de 2 mm com altura maxima 5: o resto da peca "cabe" na altura, mas nao e marca.
    const pos = gerar(plano, letras(plano.nu, plano.nv), -0.25);
    const m = soldar(pos);
    const c = clique(plano, m, 52, 30, 0);
    const r = detectarRelevo(m, c.tri, c.p, { alturaMax: 5, raio: 60 });
    ok('peca mais fina que a altura maxima: so as letras saem', r.pedacos === 3 && perto(volume(aplanar(m, r)), volume(gerar(plano, semMarca, 0)), 0.01), `${r.pedacos} pedacos`);
  }
}

console.log('\n== tirar um pedaco da previa (rebaixo da peca que nao e marca) ==');
{
  const pos = placa(-1);
  const m = soldar(pos);
  const c = achar(pos, 55, 35, T);
  const r = detectarRelevo(m, c.tri, c.p, O_);
  const noL = achar(pos, 12, 20, T - 1).tri;
  const soO = juntarPecas(r.pecas.filter((x) => !x.triangulos.includes(noL)));
  ok('sem o L: sobra 1 pedaco', r.pedacos === 2 && soO.pedacos === 1 && soO.area < r.area);
  const depois = aplanar(m, soO);
  const esperado = cheia - 152; // o L (152 mm2 x 1 mm) continua gravado
  ok('aplicado: fechada, so o O foi preenchido', malhaFechada(depois) && perto(volume(depois), esperado, 0.01), `${volume(depois).toFixed(2)} vs ${esperado}`);
  ok('tirando todos: avisa e nao muda nada', juntarPecas([]).pedacos === 0 && !!juntarPecas([]).aviso);
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
