/**
 * "Suavizar relevo": acha letras ou logo em alto/baixo relevo sobre uma face plana
 * de um STL e achata no plano da face.
 *
 * O que decide se um trecho e marca (e nao parte da peca) e ele estar CERCADO pela
 * face: toda aresta de borda do relevo encosta num triangulo do plano. Um chanfro ou
 * filete na borda da peca encosta em parede lateral e fica de fora.
 */

export interface Malha {
  /** Vertices soldados (x, y, z). */
  v: Float64Array;
  /** Tres indices de `v` por triangulo, na ordem da sopa original. */
  t: Uint32Array;
  /** Aresta (menor,maior) -> triangulos que a usam. */
  arestas: Map<string, number[]>;
}

export interface Plano {
  /** Normal unitaria, para fora da peca. */
  n: [number, number, number];
  /** n . p = d para os pontos do plano. */
  d: number;
}

export interface Relevo {
  plano: Plano;
  /** Triangulos (indices em `Malha.t`) que somem ao achatar. */
  triangulos: number[];
  /** Area do relevo projetada no plano, mm2. */
  area: number;
  /** Quantos pedacos separados (letras). */
  pedacos: number;
  aviso?: string;
}

export interface OpcoesRelevo {
  /** Altura (ou fundura) maxima do que conta como marca, mm. */
  alturaMax: number;
  /** Raio de busca em volta do clique, mm. */
  raio: number;
}

const Q = 1e4; // solda: 0,1 micrometro
const chaveAresta = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);

/** Junta os vertices repetidos da sopa de triangulos e monta a vizinhanca por aresta. */
export function soldar(pos: ArrayLike<number>): Malha {
  const nt = Math.floor(pos.length / 9);
  const idx = new Map<string, number>();
  const vs: number[] = [];
  const t = new Uint32Array(nt * 3);
  for (let i = 0; i < nt * 3; i++) {
    const x = pos[i * 3]!, y = pos[i * 3 + 1]!, z = pos[i * 3 + 2]!;
    const k = `${Math.round(x * Q)},${Math.round(y * Q)},${Math.round(z * Q)}`;
    let j = idx.get(k);
    if (j === undefined) {
      j = vs.length / 3;
      idx.set(k, j);
      vs.push(x, y, z);
    }
    t[i] = j;
  }
  const arestas = new Map<string, number[]>();
  for (let f = 0; f < nt; f++) {
    for (let e = 0; e < 3; e++) {
      const k = chaveAresta(t[f * 3 + e]!, t[f * 3 + ((e + 1) % 3)]!);
      const l = arestas.get(k);
      if (l) l.push(f);
      else arestas.set(k, [f]);
    }
  }
  return { v: new Float64Array(vs), t, arestas };
}

function geo(m: Malha, f: number) {
  const a = m.t[f * 3]! * 3, b = m.t[f * 3 + 1]! * 3, c = m.t[f * 3 + 2]! * 3;
  const ux = m.v[b]! - m.v[a]!, uy = m.v[b + 1]! - m.v[a + 1]!, uz = m.v[b + 2]! - m.v[a + 2]!;
  const wx = m.v[c]! - m.v[a]!, wy = m.v[c + 1]! - m.v[a + 1]!, wz = m.v[c + 2]! - m.v[a + 2]!;
  const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
  const L = Math.hypot(nx, ny, nz);
  return {
    area: L / 2,
    n: L > 0 ? ([nx / L, ny / L, nz / L] as [number, number, number]) : ([0, 0, 0] as [number, number, number]),
    c: [(m.v[a]! + m.v[b]! + m.v[c]!) / 3, (m.v[a + 1]! + m.v[b + 1]! + m.v[c + 1]!) / 3, (m.v[a + 2]! + m.v[b + 2]! + m.v[c + 2]!) / 3] as [number, number, number],
  };
}

const TOL_PLANO = 0.03; // mm (malha real: face "plana" oscila ~0,02)
const RAIO_PLANO_MIN = 25; // mm
const COS_PARALELO = Math.cos((10 * Math.PI) / 180);
const COS_NO_PLANO = Math.cos((1 * Math.PI) / 180);

/**
 * Acha o relevo em volta do triangulo clicado `tri` (no ponto `p`). Clicar na face ao
 * lado da marca ou no topo da letra da no mesmo: o plano base e o de maior area.
 */
export function detectarRelevo(m: Malha, tri: number, p: [number, number, number], o: OpcoesRelevo): Relevo {
  const nt = m.t.length / 3;
  const g0 = geo(m, tri);
  const vazio = (aviso: string, plano: Plano = { n: g0.n, d: 0 }): Relevo => ({ plano, triangulos: [], area: 0, pedacos: 0, aviso });
  if (!(g0.area > 0)) return vazio('Clique numa face da peça.');
  const perto = (c: [number, number, number]) => Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]) <= o.raio;
  // O plano e procurado numa roda maior que o raio da marca: com raio pequeno em cima
  // da letra, so o topo dela apareceria e viraria a "face".
  const raioPlano = Math.max(o.raio, RAIO_PLANO_MIN);
  const pertoPlano = (c: [number, number, number]) => Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]) <= raioPlano;

  // 1. Plano base: entre os paralelos ao clicado, o plano de maior area em volta.
  const grupos: { n: [number, number, number]; d: number; area: number }[] = [];
  for (let f = 0; f < nt; f++) {
    const g = geo(m, f);
    if (!(g.area > 0) || !pertoPlano(g.c)) continue;
    if (g.n[0] * g0.n[0] + g.n[1] * g0.n[1] + g.n[2] * g0.n[2] < COS_PARALELO) continue;
    const d = g.n[0] * g.c[0] + g.n[1] * g.c[1] + g.n[2] * g.c[2];
    const gr = grupos.find(
      (x) => Math.abs(x.d - d) < TOL_PLANO * 2 && x.n[0] * g.n[0] + x.n[1] * g.n[1] + x.n[2] * g.n[2] > COS_NO_PLANO
    );
    if (gr) gr.area += g.area;
    else grupos.push({ n: g.n, d, area: g.area });
  }
  const base = grupos.sort((a, b) => b.area - a.area)[0];
  if (!base) return vazio('Não achei uma face plana aqui.');
  const plano: Plano = { n: base.n, d: base.d };
  const dist = (vi: number) => plano.n[0] * m.v[vi * 3]! + plano.n[1] * m.v[vi * 3 + 1]! + plano.n[2] * m.v[vi * 3 + 2]! - plano.d;
  // Todos os pontos no plano e virado para o mesmo lado. A direcao nao precisa bater
  // fino: triangulo lasca (muito fino) no meio da face sai com a normal torta em ate
  // ~20 graus so por arredondamento, e contava como "outra parede" -- a letra vizinha
  // era recusada (mosquetao da Bambu: so metade do texto saia).
  const noPlano = (f: number) => {
    for (let e = 0; e < 3; e++) if (Math.abs(dist(m.t[f * 3 + e]!)) > TOL_PLANO) return false;
    const g = geo(m, f);
    return g.n[0] * plano.n[0] + g.n[1] * plano.n[1] + g.n[2] * plano.n[2] > 0;
  };
  const candidato = (f: number) => {
    let fora = false;
    for (let e = 0; e < 3; e++) {
      const d = Math.abs(dist(m.t[f * 3 + e]!));
      if (d > o.alturaMax + TOL_PLANO) return false;
      if (d > TOL_PLANO) fora = true;
    }
    return fora && !noPlano(f);
  };

  // 2-3. Componentes de candidatos, semeados no raio e crescidos pela vizinhanca.
  const vizinhos = (f: number) => {
    const out: number[] = [];
    for (let e = 0; e < 3; e++) {
      for (const x of m.arestas.get(chaveAresta(m.t[f * 3 + e]!, m.t[f * 3 + ((e + 1) % 3)]!)) ?? []) if (x !== f) out.push(x);
    }
    return out;
  };
  const visto = new Uint8Array(nt);
  const escolhidos: number[] = [];
  let pedacos = 0;
  let descartados = 0;
  for (let s = 0; s < nt; s++) {
    if (visto[s] || !perto(geo(m, s).c) || !candidato(s)) continue;
    const comp: number[] = [];
    const pilha = [s];
    visto[s] = 1;
    let cercado = true;
    while (pilha.length) {
      const f = pilha.pop()!;
      comp.push(f);
      for (const x of vizinhos(f)) {
        if (visto[x]) continue;
        if (candidato(x)) {
          visto[x] = 1;
          pilha.push(x);
        } else if (!noPlano(x)) cercado = false; // encosta em algo que nao e a face
      }
    }
    // Aresta de borda sem vizinho (malha aberta) tambem nao e marca cercada.
    if (cercado && comp.every((f) => vizinhos(f).length >= 3)) {
      escolhidos.push(...comp);
      pedacos++;
    } else descartados++;
  }
  if (!escolhidos.length) {
    return vazio(
      descartados
        ? 'O relevo encosta na borda ou em outra parede: não parece marca. Diminua o raio ou clique mais perto dela.'
        : `Não achei relevo de até ${o.alturaMax} mm nesta face.`,
      plano
    );
  }
  // Area projetada: so o que olha para o mesmo lado da face (topo da letra ou fundo do rebaixo).
  let area = 0;
  for (const f of escolhidos) {
    const g = geo(m, f);
    const c = g.n[0] * plano.n[0] + g.n[1] * plano.n[1] + g.n[2] * plano.n[2];
    if (c > 0) area += g.area * c;
  }
  return { plano, triangulos: escolhidos, area, pedacos };
}

/**
 * Achata o relevo no plano da face e devolve a nova sopa de triangulos. As paredes
 * da marca colapsam (area zero) e saem; o topo da letra (ou o fundo do rebaixo) vira
 * parte da face, fechando o buraco que ela ocupava.
 */
export function aplanar(m: Malha, r: Relevo): Float32Array {
  const v = Float64Array.from(m.v);
  const { n, d } = r.plano;
  const mexer = new Set<number>();
  for (const f of r.triangulos) for (let e = 0; e < 3; e++) mexer.add(m.t[f * 3 + e]!);
  for (const vi of mexer) {
    const k = n[0] * v[vi * 3]! + n[1] * v[vi * 3 + 1]! + n[2] * v[vi * 3 + 2]! - d;
    v[vi * 3] = v[vi * 3]! - k * n[0];
    v[vi * 3 + 1] = v[vi * 3 + 1]! - k * n[1];
    v[vi * 3 + 2] = v[vi * 3 + 2]! - k * n[2];
  }
  // Solda de novo: o ponto do fundo da letra achatado cai em cima do ponto da face.
  // Sai SO o triangulo com dois pontos iguais (a parede que colapsou). Lasca fina de
  // area ~0 que liga faces fica: tirar ela abria furos numa malha de verdade.
  const unico = new Map<string, number>();
  const rep: number[] = [];
  const id = new Int32Array(m.v.length / 3);
  for (let i = 0; i < id.length; i++) {
    const k = `${Math.round(v[i * 3]! * Q)},${Math.round(v[i * 3 + 1]! * Q)},${Math.round(v[i * 3 + 2]! * Q)}`;
    let j = unico.get(k);
    if (j === undefined) {
      j = rep.length / 3;
      unico.set(k, j);
      rep.push(v[i * 3]!, v[i * 3 + 1]!, v[i * 3 + 2]!);
    }
    id[i] = j;
  }
  const out: number[] = [];
  const nt = m.t.length / 3;
  for (let f = 0; f < nt; f++) {
    const a = id[m.t[f * 3]!]!, b = id[m.t[f * 3 + 1]!]!, c = id[m.t[f * 3 + 2]!]!;
    if (a === b || b === c || a === c) continue; // parede que colapsou
    out.push(rep[a * 3]!, rep[a * 3 + 1]!, rep[a * 3 + 2]!, rep[b * 3]!, rep[b * 3 + 1]!, rep[b * 3 + 2]!, rep[c * 3]!, rep[c * 3 + 1]!, rep[c * 3 + 2]!);
  }
  return new Float32Array(out);
}

/** Malha fechada e orientada: cada aresta usada por exatamente 2 triangulos, em sentidos opostos. */
export function malhaFechada(pos: ArrayLike<number>): boolean {
  const m = soldar(pos);
  const dir = new Map<string, number>();
  const nt = m.t.length / 3;
  for (let f = 0; f < nt; f++) {
    for (let e = 0; e < 3; e++) {
      const a = m.t[f * 3 + e]!, b = m.t[f * 3 + ((e + 1) % 3)]!;
      const k = `${a},${b}`;
      dir.set(k, (dir.get(k) ?? 0) + 1);
    }
  }
  for (const [k, c] of dir) {
    if (c !== 1) return false;
    const [a, b] = k.split(',');
    if (dir.get(`${b},${a}`) !== 1) return false;
  }
  return true;
}
