/**
 * Solido de uma pilha de prismas retos (a receita da peca), montado direto, sem booleana.
 *
 * Unir prismas que se encostam em face plana e o caso mais caro da manifold (o chanfro de um
 * "g", 7 prismas: 700 ms). Aqui a malha sai da propria pilha. Em cada plano z onde ela muda,
 * as faces horizontais: o que acaba ali (para cima) e o que comeca ali (para baixo). Em cada
 * faixa entre dois planos, as paredes do contorno dela. Todo ponto que existe num plano entra
 * em toda aresta do plano que passa por ele, entao nao sobra junta em T e a malha fecha. A
 * manifold confere (ofMesh) e o volume tem de ser o da pilha; se nao for, a uniao booleana
 * resolve, com os mesmos ids (o teste exige que isso nunca aconteca nas pecas do editor).
 */
import type { Manifold } from 'manifold-3d';
import { buildRegion, diffRegion, regionArea, regionPerimeter, unionRegion, type Poly, type Pt, type Region } from '../geom/region';
import type { Motor } from './nucleo';
import { prisma } from './solidos';
import { doMalha, paraMalha } from './converter';
import { juntarMalhas, MALHA_VAZIA, volumeDaMalha, type Malha } from './tipos';

/** Um prisma da pilha; `id` vira o originalID das faces dele (o papel na tela). */
export interface PrismaDaPilha {
  region: Region;
  z0: number;
  z1: number;
  id: number;
}

/** A grade do clipper (lib/geom/region.ts): todo ponto que sai de uma operacao de Region cai nela. */
const ESCALA = 1000;
/** Celula do indice de pontos de um plano: 2 mm. */
const CELULA = 2000;

type P2 = [number, number];
/** Chave numerica de um ponto da grade (inteiros ate 2^25 unidades, 33 m, de cada lado). */
const chave2 = (p: P2) => (p[0] + 2 ** 25) * 2 ** 26 + (p[1] + 2 ** 25);
const chaveCelula = (cx: number, cy: number) => (cx + 2 ** 15) * 2 ** 16 + (cy + 2 ** 15);

/** A Region na grade (externos CCW, furos CW). */
const naGradeInteira = (c: Pt[]): P2[] => c.map((q): P2 => [Math.round(q.x * ESCALA), Math.round(q.y * ESCALA)]);
const emMm = (c: P2[]): Pt[] => c.map(([x, y]) => ({ x: x / ESCALA, y: y / ESCALA }));

/**
 * O contorno sem agulha: vertice onde ele volta para tras (angulo de mais de 90 graus) e o
 * triangulo com os vizinhos tem ate 1 unidade de altura sobre o maior lado (a mesma medida da
 * junta em T). O offset e a diferenca do clipper deixam isso onde dois contornos quase coincidem
 * (a pele da tala rente a borda): um bico de largura 0,001 mm, que cada face leria de um jeito.
 * Ponto repetido em seguida tambem sai.
 */
function semAgulhas(c: P2[]): P2[] {
  let out = c.filter((p, i) => { const q = c[(i + 1) % c.length]!; return p[0] !== q[0] || p[1] !== q[1]; });
  // Cada passada so olha os vizinhos de cada ponto, e de duas agulhas vizinhas sai so a mais
  // baixa (no empate, a de menor coordenada): o resultado nao depende do sentido nem do comeco
  // do contorno, entao a borda que duas regioes dividem (o furo de uma e o contorno da outra)
  // sai igual nas duas; e o par de pontos a 0,001 mm perde um ponto so, nao o canto.
  for (;;) {
    if (out.length < 3) return out;
    const altura = out.map((b, i) => {
      const a = out[(i - 1 + out.length) % out.length]!, d = out[(i + 1) % out.length]!;
      const ux = b[0] - a[0], uy = b[1] - a[1], vx = d[0] - b[0], vy = d[1] - b[1];
      const wx = d[0] - a[0], wy = d[1] - a[1];
      // O dobro da area do triangulo a-b-d, ao quadrado, sobre o maior lado ao quadrado: a altura ao quadrado.
      const cruz = ux * wy - uy * wx;
      const maior = Math.max(ux * ux + uy * uy, vx * vx + vy * vy, wx * wx + wy * wy);
      return ux * vx + uy * vy < 0 && cruz * cruz <= maior ? (cruz * cruz) / maior : Infinity;
    });
    const antes = (i: number, j: number) =>
      altura[i]! < altura[j]! || (altura[i] === altura[j] && (out[i]![0] < out[j]![0] || (out[i]![0] === out[j]![0] && out[i]![1] < out[j]![1])));
    const sai = altura.map((h, i) => h !== Infinity && antes(i, (i - 1 + out.length) % out.length) && antes(i, (i + 1) % out.length));
    if (!sai.includes(true)) return out;
    out = out.filter((_, i) => !sai[i]);
  }
}


/** A Region na grade (externos CCW, furos CW) e sem agulha: e com ela que a pilha toda e montada. */
const naGrade = (r: Region): Region =>
  buildRegion(r.flatMap((p) => [p.outer, ...p.holes]).map((c) => emMm(semAgulhas(naGradeInteira(c)))).filter((c) => c.length >= 3), 'nonzero');

const contornos = (r: Region): P2[][] =>
  r.flatMap((p) => [p.outer, ...p.holes]).filter((c) => c.length >= 3).map((c) => c.map((q): P2 => [Math.round(q.x * ESCALA), Math.round(q.y * ESCALA)]));

/** O ponto antes da aresta i -> i+1 do contorno e o depois dela. */
const vizinhosDaAresta = (c: P2[], i: number): [P2, P2] => [c[(i - 1 + c.length) % c.length]!, c[(i + 2) % c.length]!];
const mesmo = (p: P2, q: P2) => p[0] === q[0] && p[1] === q[1];

/** Dois pontos do mesmo plano a esta distancia (ao quadrado, em unidades) viram um so. */
const SOLDA2 = 2.25;

/**
 * Os pontos de um plano, por celula. Ponto a ate 1,5 unidade de outro ja visto vira esse outro
 * (solda): o mesmo canto, vindo de dois contornos, sai arredondado em dois pontos vizinhos da
 * grade, e todo mundo que usa o plano (face, parede, diferenca) passa a ver um ponto so.
 */
class PontosDoPlano {
  private celulas = new Map<number, P2[]>();
  private solda = new Map<number, P2>();

  addRegion(r: Region) {
    for (const c of contornos(r)) for (const p of c) this.add(p);
  }

  private add(p: P2) {
    const k = chave2(p);
    if (this.solda.has(k)) return;
    const cx = Math.floor(p[0] / CELULA), cy = Math.floor(p[1] / CELULA);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const q of this.celulas.get(chaveCelula(cx + dx, cy + dy)) ?? []) {
          if ((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 <= SOLDA2) {
            this.solda.set(k, q);
            return;
          }
        }
      }
    }
    this.solda.set(k, p);
    const ck = chaveCelula(cx, cy);
    const lista = this.celulas.get(ck);
    if (lista) lista.push(p);
    else this.celulas.set(ck, [p]);
  }

  /** O ponto que representa `p` neste plano. */
  ponto(p: P2): P2 {
    return this.solda.get(chave2(p)) ?? p;
  }

  /** O contorno com os pontos soldados, sem repetir um ponto em seguida. */
  soldar(c: P2[]): P2[] {
    const out: P2[] = [];
    for (const q of c) {
      const p = this.ponto(q);
      const u = out[out.length - 1];
      if (!u || u[0] !== p[0] || u[1] !== p[1]) out.push(p);
    }
    while (out.length > 1 && out[0]![0] === out[out.length - 1]![0] && out[0]![1] === out[out.length - 1]![1]) out.pop();
    return out;
  }

  /**
   * Os pontos sobre a aresta a->b (sem as pontas), em ordem de a para b. `vizinhos` sao os
   * da aresta no contorno dela (o de antes de a e o de depois de b): esses ja estao
   * nele e nao entram. O offset do clipper deixa pares de pontos a 0,001 mm; o vizinho do
   * vizinho cai a menos de 1 unidade da aresta e, se entrasse, o contorno ganharia uma ponta de
   * area zero (a -> X -> Y -> X). Os outros pontos do proprio contorno entram: o clipper devolve
   * poligono que encosta nele mesmo ao longo de uma reta (duas lacunas ligadas por uma ponte de
   * largura zero), e a ponte so se desfaz com os pontos dela nas duas arestas que se cobrem.
   */
  naAresta(a: P2, b: P2, [antes, depois]: [P2, P2]): P2[] {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return [];
    const out: [number, P2][] = [];
    for (const ck of this.celulasDaAresta(a, b)) {
      for (const p of this.celulas.get(ck) ?? []) {
        const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
        if (t <= 0 || t >= 1) continue;
        // Distancia a reta ate 1 unidade da grade: o ponto de cruzamento sai arredondado nela.
        const cruz = (p[0] - a[0]) * dy - (p[1] - a[1]) * dx;
        if (cruz * cruz > len2) continue;
        if (mesmo(p, antes) || mesmo(p, depois)) continue;
        out.push([t, p]);
      }
    }
    return out.sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  }

  /** As celulas onde pode haver ponto a ate 1 unidade da aresta: a caixa dela, ou (aresta longa) o caminho dela. */
  private celulasDaAresta(a: P2, b: P2): Iterable<number> {
    const cx0 = Math.floor((Math.min(a[0], b[0]) - 1) / CELULA), cx1 = Math.floor((Math.max(a[0], b[0]) + 1) / CELULA);
    const cy0 = Math.floor((Math.min(a[1], b[1]) - 1) / CELULA), cy1 = Math.floor((Math.max(a[1], b[1]) + 1) / CELULA);
    const out = new Set<number>();
    if ((cx1 - cx0 + 1) * (cy1 - cy0 + 1) <= 16) {
      for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) out.add(chaveCelula(cx, cy));
      return out;
    }
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (CELULA / 2));
    for (let i = 0; i <= n; i++) {
      const cx = Math.floor((a[0] + ((b[0] - a[0]) * i) / n) / CELULA), cy = Math.floor((a[1] + ((b[1] - a[1]) * i) / n) / CELULA);
      for (let ex = -1; ex <= 1; ex++) for (let ey = -1; ey <= 1; ey++) out.add(chaveCelula(cx + ex, cy + ey));
    }
    return out;
  }

  /** O contorno soldado, com cada ponto do plano que cai nas arestas dele. */
  refinar(c: P2[]): P2[] {
    const s = this.soldar(c);
    const n = s.length;
    return n < 3 ? s : s.flatMap((a, i) => [a, ...this.naAresta(a, s[(i + 1) % n]!, vizinhosDaAresta(s, i))]);
  }
}

/**
 * Poligono mais fino que a tolerancia da aresta (largura menor que 2 unidades da grade): sobra
 * de contornos que se cruzam quase rentes. Ponto a menos de 1 unidade de uma aresta conta como
 * nela, entao essa lasca nao e face: entra na aresta.
 */
const lasca = (p: Poly) => regionArea([p]) < regionPerimeter([p]) / ESCALA;
const semLascas = (r: Region): Region => r.filter((p) => !lasca(p));

interface Faixa {
  z0: number;
  z1: number;
  pecas: { id: number; region: Region }[];
  uniao: Region;
}

/** A malha da pilha. Devolve null se ela nao fechar (ai a uniao booleana resolve). */
function montar(m: Motor, pilha: PrismaDaPilha[]): Malha | null {
  const zs = [...new Set(pilha.flatMap((l) => [l.z0, l.z1]))].sort((a, b) => a - b);
  const faixas: Faixa[] = zs.slice(0, -1).map((z0, j) => {
    const z1 = zs[j + 1]!;
    const pecas = pilha.filter((l) => l.z0 <= z0 && l.z1 >= z1).map((l) => ({ id: l.id, region: naGrade(l.region) }));
    return { z0, z1, pecas, uniao: pecas.reduce<Region>((acc, p) => unionRegion(acc, p.region), []) };
  });
  const vazia: Faixa = { z0: 0, z1: 0, pecas: [], uniao: [] };

  const pos: number[] = [];
  const indices = zs.map(() => new Map<number, number>());
  const vertice = (p: P2, k: number): number => {
    const ch = chave2(p);
    let v = indices[k]!.get(ch);
    if (v === undefined) {
      v = pos.length / 3;
      pos.push(p[0] / ESCALA, p[1] / ESCALA, zs[k]!);
      indices[k]!.set(ch, v);
    }
    return v;
  };
  const tris = new Map<number, number[]>();
  const tri = (id: number, a: number, b: number, c: number) => {
    const t = tris.get(id);
    if (t) t.push(a, b, c);
    else tris.set(id, [a, b, c]);
  };

  // Faces horizontais e os pontos de cada plano.
  // Faces horizontais e os pontos de cada plano. Antes da diferenca, cada contorno ganha os
  // pontos do plano que caem nele (a junta em T): o que se encosta passa a ter os mesmos
  // vertices (a pele da tala e a borda da placa), e a diferenca nao deixa lasca nem ponta.
  const planos = zs.map((_, k) => {
    const baixo = faixas[k - 1] ?? vazia, cima = faixas[k] ?? vazia;
    const pontos = new PontosDoPlano();
    for (const r of [baixo.uniao, cima.uniao, ...baixo.pecas.map((p) => p.region), ...cima.pecas.map((p) => p.region)]) pontos.addRegion(r);
    // Plano com um lado vazio (o fundo e o topo da peca): a face e a propria regiao, nada a ajustar.
    const ajustar = (r: Region): Region =>
      r.map((p) => ({ outer: emMm(pontos.refinar(naGradeInteira(p.outer))), holes: p.holes.map((h) => emMm(pontos.refinar(naGradeInteira(h)))) }));
    const face = (r: Region, outro: Region, outroAjustado: () => Region): Region => (outro.length ? semLascas(diffRegion(ajustar(r), outroAjustado())) : r);
    let cimaU: Region | null = null, baixoU: Region | null = null;
    const sobe = baixo.pecas.map((p) => ({ id: p.id, region: face(p.region, cima.uniao, () => (cimaU ??= ajustar(cima.uniao))) }));
    const desce = cima.pecas.map((p) => ({ id: p.id, region: face(p.region, baixo.uniao, () => (baixoU ??= ajustar(baixo.uniao))) }));
    for (const f of [...sobe, ...desce]) pontos.addRegion(f.region);
    return { sobe, desce, pontos };
  });
  planos.forEach(({ sobe, desce, pontos }, k) => {
    for (const [faces, paraCima] of [[sobe, true], [desce, false]] as const) {
      for (const f of faces) {
        for (const poly of f.region) {
          const aneis = contornos([poly]).map((c) => pontos.refinar(c)).filter((c) => c.length >= 3);
          if (!aneis.length) continue;
          const todos = aneis.flat();
          for (const [a, b, c] of m.triangulate(aneis)) {
            const va = vertice(todos[a]!, k), vb = vertice(todos[b]!, k), vc = vertice(todos[c]!, k);
            // O contorno que encosta nele mesmo (o mesmo ponto duas vezes) da triangulo de area zero:
            // as duas arestas dele sao a mesma, em sentidos opostos, e saem juntas sem abrir nada.
            if (va === vb || vb === vc || va === vc) continue;
            if (paraCima) tri(f.id, va, vb, vc);
            else tri(f.id, va, vc, vb);
          }
        }
      }
    }
  });

  // Paredes: cada aresta do contorno da faixa, refinada pelos pontos do plano de baixo e do de cima.
  faixas.forEach((f, j) => {
    const dono = new Map<number, Set<number>>();
    for (const p of f.pecas) for (const c of contornos(p.region)) for (const q of c) {
      const k = chave2(q);
      const s = dono.get(k);
      if (s) s.add(p.id);
      else dono.set(k, new Set([p.id]));
    }
    const idDaAresta = (a: P2, b: P2): number => {
      const da = dono.get(chave2(a)), db = dono.get(chave2(b));
      const comum = da && db ? [...da].filter((id) => db.has(id)) : [];
      return comum[0] ?? (da ? [...da][0]! : db ? [...db][0]! : f.pecas[0]!.id);
    };
    const pb = planos[j]!.pontos, pc = planos[j + 1]!.pontos;
    for (const c of contornos(f.uniao)) {
      // A aresta no plano de baixo e no de cima: os pontos soldados de cada um (uma aresta
      // menor que a solda vira um ponto, e a parede dela, um leque).
      const cb = c.map((q) => pb.ponto(q)), cc = c.map((q) => pc.ponto(q));
      const cadeia = (pl: PontosDoPlano, vizinhos: [P2, P2], a: P2, b: P2): P2[] => {
        const pa = pl.ponto(a), pbb = pl.ponto(b);
        return pa[0] === pbb[0] && pa[1] === pbb[1] ? [pa] : [pa, ...pl.naAresta(pa, pbb, vizinhos), pbb];
      };
      c.forEach((a, i) => {
        const b = c[(i + 1) % c.length]!;
        const id = idDaAresta(a, b);
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const t = (p: P2) => (p[0] - a[0]) * dx + (p[1] - a[1]) * dy;
        const baixo = cadeia(pb, vizinhosDaAresta(cb, i), a, b), cima = cadeia(pc, vizinhosDaAresta(cc, i), a, b);
        let ib = 0, ic = 0;
        while (ib < baixo.length - 1 || ic < cima.length - 1) {
          const avancaBaixo = ic === cima.length - 1 || (ib < baixo.length - 1 && t(baixo[ib + 1]!) <= t(cima[ic + 1]!));
          if (avancaBaixo) {
            tri(id, vertice(baixo[ib]!, j), vertice(baixo[ib + 1]!, j), vertice(cima[ic]!, j + 1));
            ib++;
          } else {
            tri(id, vertice(baixo[ib]!, j), vertice(cima[ic + 1]!, j + 1), vertice(cima[ic]!, j + 1));
            ic++;
          }
        }
      });
    }
  });

  const ids = [...tris.keys()].sort((a, b) => a - b);
  const triVerts = new Uint32Array(ids.reduce((s, id) => s + tris.get(id)!.length, 0));
  const runIndex = new Uint32Array(ids.length + 1);
  let n = 0;
  ids.forEach((id, i) => {
    runIndex[i] = n;
    triVerts.set(tris.get(id)!, n);
    n += tris.get(id)!.length;
  });
  runIndex[ids.length] = n;
  const malha: Malha = { pos: new Float32Array(pos), tri: triVerts, runIndex, runOriginalID: new Uint32Array(ids) };
  if (!fechada(malha)) return null;
  // Fechar nao basta: a malha tem de ter o volume da pilha, menos o que a grade permite (cada
  // ponto de junta em T fica a ate 1 unidade da aresta).
  const esperado = faixas.reduce((v, f) => v + regionArea(f.uniao) * (f.z1 - f.z0), 0);
  const superficie =
    faixas.reduce((a, f) => a + regionPerimeter(f.uniao) * (f.z1 - f.z0), 0) +
    planos.reduce((a, p) => a + [...p.sobe, ...p.desce].reduce((b, f) => b + regionArea(f.region), 0), 0);
  return Math.abs(volumeDaMalha(malha) - esperado) <= (2 * superficie) / ESCALA ? malha : null;
}

/**
 * Malha fechada e orientada (o que a manifold exige): sem triangulo de vertice repetido, e cada
 * aresta em exatamente dois triangulos, uma vez em cada sentido. As arestas vao para um array
 * numerico ordenado (menor vertice, maior vertice, sentido) e cada par tem de aparecer junto.
 */
function fechada(malha: Malha): boolean {
  const t = malha.tri;
  const n = malha.pos.length / 3;
  const arestas = new Float64Array(t.length);
  for (let i = 0; i < t.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = t[i + k]!, b = t[i + ((k + 1) % 3)]!;
      if (a === b) return false;
      arestas[i + k] = (Math.min(a, b) * n + Math.max(a, b)) * 2 + (a < b ? 0 : 1);
    }
  }
  arestas.sort();
  for (let i = 0; i < arestas.length; i += 2) {
    const x = arestas[i]!, y = arestas[i + 1];
    // A mesma aresta nos dois sentidos (0 e 1), e mais nenhuma vez.
    if (y === undefined || Math.floor(x / 2) !== Math.floor(y / 2) || x % 2 !== 0 || y % 2 !== 1) return false;
    if (i + 2 < arestas.length && Math.floor(arestas[i + 2]! / 2) === Math.floor(x / 2)) return false;
  }
  return true;
}

/** O prisma com o id pedido (ofMesh aceita os runs da malha de entrada). */
function prismaComId(m: Motor, l: PrismaDaPilha): Manifold {
  const g = prisma(m, l.region, l.z0, l.z1).getMesh();
  return m.Manifold.ofMesh(new m.Mesh({ numProp: 3, vertProperties: g.vertProperties, triVerts: g.triVerts, runIndex: new Uint32Array([0, g.triVerts.length]), runOriginalID: new Uint32Array([l.id]) }));
}

let usouUniao = 0;
/** Quantas pilhas precisaram da uniao booleana (o teste exige 0). */
export const pilhasPelaUniao = () => usouUniao;

/** A malha da pilha; cada face leva o id do prisma de onde veio. Nao cria solido na manifold. */
export function malhaDaPilha(m: Motor, pilha: PrismaDaPilha[]): Malha {
  const validos = pilha.filter((l) => l.z1 > l.z0 && l.region.length);
  if (!validos.length) return MALHA_VAZIA;
  const direto = montar(m, validos);
  if (direto) return direto;
  usouUniao++;
  return paraMalha(m.Manifold.union(validos.map((l) => prismaComId(m, l))));
}

let usouPrismas = 0;
/** Quantas pilhas sairam em prismas separados (`malhaDaPilhaOuPrismas`). */
export const pilhasEmPrismas = () => usouPrismas;

/**
 * A malha para imprimir (as pecas dos geradores): a pilha montada direto ou, se ela nao fechar,
 * cada prisma fechado por si, encostado no vizinho, sem booleana. A textura de relevo empilha
 * centenas de camadas cujos contornos diferem por micra, e a uniao delas leva segundos; impressa,
 * a peca e a mesma. Quem opera com o solido depois (a emenda) usa `malhaDaPilha`.
 */
export function malhaDaPilhaOuPrismas(m: Motor, pilha: PrismaDaPilha[]): Malha {
  const validos = pilha.filter((l) => l.z1 > l.z0 && l.region.length);
  if (!validos.length) return MALHA_VAZIA;
  const direto = montar(m, validos);
  if (direto) return direto;
  usouPrismas++;
  // O prisma da manifold sai com um trecho so: ele leva o id pedido.
  return juntarMalhas(validos.map((l) => {
    const g = paraMalha(prisma(m, l.region, l.z0, l.z1));
    return { ...g, runIndex: new Uint32Array([0, g.tri.length]), runOriginalID: new Uint32Array([l.id]) };
  }));
}

/** O solido da pilha (para quem vai operar com ele: o cortador da emenda). */
export const solidoDaPilha = (m: Motor, pilha: PrismaDaPilha[]): Manifold => doMalha(m, malhaDaPilha(m, pilha));
