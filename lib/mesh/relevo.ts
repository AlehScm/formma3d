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
  /** Face curva: a superficie ajustada em volta do clique (senao, vale o plano). */
  curva?: { p: [number, number, number]; n: [number, number, number]; t1: [number, number, number]; t2: [number, number, number]; R: number; coef: number[] };
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
const ALTURA_MIN = 0.06; // mm: abaixo disso e ruido da malha, nao marca
const COS_PARALELO = Math.cos((10 * Math.PI) / 180);
const COS_NO_PLANO = Math.cos((1 * Math.PI) / 180);

/**
 * Acha o relevo em volta do triangulo clicado `tri` (no ponto `p`). Primeiro numa face
 * PLANA (clicar na face ao lado ou no topo da letra da no mesmo: o plano base e o de
 * maior area). Se ali nao houver marca, tenta uma superficie CURVA ajustada aos pontos
 * em volta do clique -- texto gravado no bico arredondado de um mosquetao, por exemplo.
 */
export function detectarRelevo(m: Malha, tri: number, p: [number, number, number], o: OpcoesRelevo): Relevo {
  const g0 = geo(m, tri);
  if (!(g0.area > 0)) return { plano: { n: g0.n, d: 0 }, triangulos: [], area: 0, pedacos: 0, aviso: 'Clique numa face da peça.' };
  const plano = relevoNoPlano(m, g0, p, o);
  if (plano.triangulos.length) return plano;
  // Raios menores primeiro: numa curva fechada, o ajuste so vale perto do clique.
  for (const R of [Math.min(o.raio, 12), Math.min(o.raio, 8), Math.min(o.raio, 5)]) {
    const curva = relevoNaCurva(m, g0, p, o, R);
    if (curva?.triangulos.length) return curva;
  }
  return plano;
}

/** Superficie base: distancia (com sinal, ao longo de `n`) de cada vertice ate ela. */
interface Superficie {
  n: [number, number, number];
  dist: (vi: number) => number;
  /** Onde a superficie vale (o ajuste curvo so vale perto do clique). */
  dentro: (vi: number) => boolean;
  tol: number;
}

function relevoNoPlano(m: Malha, g0: ReturnType<typeof geo>, p: [number, number, number], o: OpcoesRelevo): Relevo {
  const nt = m.t.length / 3;
  // O plano e procurado numa roda maior que o raio da marca: com raio pequeno em cima
  // da letra, so o topo dela apareceria e viraria a "face".
  const raioPlano = Math.max(o.raio, RAIO_PLANO_MIN);
  const pertoPlano = (c: [number, number, number]) => Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]) <= raioPlano;
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
  if (!base) return { plano: { n: g0.n, d: 0 }, triangulos: [], area: 0, pedacos: 0, aviso: 'Não achei uma face aqui.' };
  const plano: Plano = { n: base.n, d: base.d };
  const sup: Superficie = {
    n: plano.n,
    dist: (vi) => plano.n[0] * m.v[vi * 3]! + plano.n[1] * m.v[vi * 3 + 1]! + plano.n[2] * m.v[vi * 3 + 2]! - plano.d,
    dentro: () => true,
    tol: TOL_PLANO,
  };
  return { plano, ...pedacosCercados(m, sup, p, o, o.raio) };
}

/**
 * Face curva: ajusta h(u,v) de grau 4 no referencial do clique aos vertices em volta
 * (raio R), descartando os que destoam (as letras) e ajustando de novo.
 */
function relevoNaCurva(m: Malha, g0: ReturnType<typeof geo>, p: [number, number, number], o: OpcoesRelevo, R: number): Relevo | null {
  // Parede vertical (peca extrudada, como o mosquetao): a superficie e a curva vista
  // de cima subindo reto. Ajusta so essa curva, h(u), com pontos da propria parede --
  // os arredondados de cima e de baixo ficam de fora e nao sujam o ajuste.
  const parede = Math.abs(g0.n[2]) < 0.2;
  const n: [number, number, number] = parede ? normalizar([g0.n[0], g0.n[1], 0]) : g0.n;
  // Referencial: n e dois vetores no plano tangente (na parede: horizontal e vertical).
  const a: [number, number, number] = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const t1: [number, number, number] = parede ? [-n[1], n[0], 0] : normalizar(cruz(n, a));
  const t2: [number, number, number] = parede ? [0, 0, 1] : cruz(n, t1);
  const nv = m.v.length / 3;
  const uvh = (vi: number) => {
    const x = m.v[vi * 3]! - p[0], y = m.v[vi * 3 + 1]! - p[1], z = m.v[vi * 3 + 2]! - p[2];
    return [(x * t1[0] + y * t1[1] + z * t1[2]) / R, (x * t2[0] + y * t2[1] + z * t2[2]) / R, x * n[0] + y * n[1] + z * n[2]] as const;
  };
  // Vertices da face em volta: perto do clique e de triangulos virados para o mesmo lado
  // (fica de fora o topo, o fundo e a parede do outro lado).
  const doLado = new Uint8Array(nv);
  const nt = m.t.length / 3;
  for (let f = 0; f < nt; f++) {
    const g = geo(m, f);
    const mesmoLado = g.n[0] * n[0] + g.n[1] * n[1] + g.n[2] * n[2] > (parede ? 0.5 : 0.3);
    if (g.area > 0 && mesmoLado && (!parede || Math.abs(g.n[2]) < 0.1)) for (let e = 0; e < 3; e++) doLado[m.t[f * 3 + e]!] = 1;
  }
  const pts: number[] = [];
  for (let vi = 0; vi < nv; vi++) {
    if (!doLado[vi]) continue;
    const d = Math.hypot(m.v[vi * 3]! - p[0], m.v[vi * 3 + 1]! - p[1], m.v[vi * 3 + 2]! - p[2]);
    if (d <= R) pts.push(vi);
  }
  if (pts.length < 30) return null;
  // Ajuste robusto: a cada rodada fica so o que esta perto da superficie (as letras
  // destoam e saem). A folga comeca pequena e nunca passa de 0,1 mm -- com folga
  // grande, numa curva que o polinomio nao acompanha (o olhal do mosquetao), "marca"
  // passava a ser qualquer coisa a ate 8 mm da superficie.
  let usar = pts;
  let coef: number[] | null = null;
  let folga = 0.1;
  for (let it = 0; it < 5; it++) {
    coef = ajustar(usar.map(uvh), parede);
    if (!coef) return null;
    const res = pts.map((vi) => {
      const [u, v, h] = uvh(vi);
      return h - avaliar(coef!, u, v);
    });
    usar = pts.filter((_, i) => Math.abs(res[i]!) <= folga);
    if (usar.length < 20) return null;
    const rmsDentro = Math.sqrt(usar.reduce((s, vi) => s + res[pts.indexOf(vi)]! ** 2, 0) / usar.length);
    folga = Math.max(TOL_PLANO, Math.min(0.1, 3 * rmsDentro));
  }
  const c = coef!;
  const residuos = usar.map((vi) => {
    const [u, v, h] = uvh(vi);
    return h - avaliar(c, u, v);
  });
  const rms = Math.sqrt(residuos.reduce((s, x) => s + x * x, 0) / residuos.length);
  // Superficie que o polinomio nao descreve bem: aqui o modo curvo nao da resposta.
  if (rms > 0.015 || usar.length < 0.4 * pts.length) return null;
  const noRaio = new Uint8Array(nv);
  for (const vi of pts) noRaio[vi] = 1;
  const sup: Superficie = {
    n,
    dist: (vi) => {
      const [u, v, h] = uvh(vi);
      return h - avaliar(c, u, v);
    },
    dentro: (vi) => noRaio[vi] === 1,
    tol: Math.max(TOL_PLANO, Math.min(0.05, 3 * rms)),
  };
  const r = pedacosCercados(m, sup, p, o, R, marcaDeVerdade(m, sup));
  return { plano: { n, d: n[0] * p[0] + n[1] * p[1] + n[2] * p[2] }, curva: { p, n, t1, t2, R, coef: c }, ...r };
}

/**
 * Na face curva, "cercado" nao basta: um arredondado ou o olhal da peca tambem ficam
 * cercados e sairiam (no mosquetao, ate 150 mm3 de peca). Marca de verdade tem fundo
 * (ou topo) numa profundidade so, paralelo a superficie: e isso que se exige.
 */
function marcaDeVerdade(m: Malha, sup: Superficie) {
  return (comp: readonly number[]): boolean => {
    let area = 0;
    let soma = 0;
    const fundo: { a: number; d: number }[] = [];
    for (const f of comp) {
      const g = geo(m, f);
      if (g.n[0] * sup.n[0] + g.n[1] * sup.n[1] + g.n[2] * sup.n[2] < 0.9) continue; // so fundo/topo
      const d = [0, 1, 2].reduce((s, e) => s + sup.dist(m.t[f * 3 + e]!), 0) / 3;
      fundo.push({ a: g.area, d });
      area += g.area;
      soma += g.area * d;
    }
    if (area <= 0) return false;
    const media = soma / area;
    if (Math.abs(media) <= sup.tol) return false;
    const desvio = Math.sqrt(fundo.reduce((s, x) => s + x.a * (x.d - media) ** 2, 0) / area);
    // Fundo reto: quase tudo na mesma profundidade (folga de 25% ou 0,05 mm).
    if (desvio > Math.max(0.05, 0.25 * Math.abs(media))) return false;
    // Conferencia de volume: achatar a marca muda a peca em ~ area x profundidade. No
    // olhal redondo do mosquetao o ajuste curvo "achava" marca de 18 mm2 que arrancaria
    // 150 mm3 -- impossivel para marca de verdade.
    const mexer = new Map<number, number>();
    for (const f of comp) for (let e = 0; e < 3; e++) {
      const vi = m.t[f * 3 + e]!;
      if (!mexer.has(vi)) mexer.set(vi, sup.dist(vi));
    }
    const pos = (vi: number, novo: boolean): [number, number, number] => {
      const k = novo ? (mexer.get(vi) ?? 0) : 0;
      return [m.v[vi * 3]! - k * sup.n[0], m.v[vi * 3 + 1]! - k * sup.n[1], m.v[vi * 3 + 2]! - k * sup.n[2]];
    };
    const tet = (a: number[], b: number[], c: number[]) => (a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) - a[1]! * (b[0]! * c[2]! - b[2]! * c[0]!) + a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!)) / 6;
    const tocados = new Set<number>();
    for (const vi of mexer.keys()) for (const f of trianglesDoVertice(m, vi)) tocados.add(f);
    let dV = 0;
    for (const f of tocados) {
      const [a, b, c] = [0, 1, 2].map((e) => m.t[f * 3 + e]!) as [number, number, number];
      dV += tet(pos(a, true), pos(b, true), pos(c, true)) - tet(pos(a, false), pos(b, false), pos(c, false));
    }
    let projetada = 0;
    for (const f of comp) {
      const g = geo(m, f);
      const c = g.n[0] * sup.n[0] + g.n[1] * sup.n[1] + g.n[2] * sup.n[2];
      if (c > 0) projetada += g.area * c;
    }
    const maxProf = Math.max(...[...mexer.values()].map(Math.abs));
    return Math.abs(dV) <= 1.5 * projetada * maxProf + 0.5;
  };
}

/** Triangulos que usam o vertice (indice construido na primeira chamada). */
const porVertice = new WeakMap<Malha, number[][]>();
function trianglesDoVertice(m: Malha, vi: number): number[] {
  let idx = porVertice.get(m);
  if (!idx) {
    idx = Array.from({ length: m.v.length / 3 }, () => [] as number[]);
    for (let f = 0; f < m.t.length / 3; f++) for (let e = 0; e < 3; e++) idx[m.t[f * 3 + e]!]!.push(f);
    porVertice.set(m, idx);
  }
  return idx[vi] ?? [];
}

/** Os pedacos de relevo cercados pela superficie base (o que decide se e marca). */
function pedacosCercados(
  m: Malha,
  sup: Superficie,
  p: [number, number, number],
  o: OpcoesRelevo,
  raioSemente: number,
  aceitar: (comp: readonly number[]) => boolean = () => true
): Omit<Relevo, 'plano' | 'curva'> {
  const nt = m.t.length / 3;
  const naFace = (f: number) => {
    for (let e = 0; e < 3; e++) {
      const vi = m.t[f * 3 + e]!;
      if (!sup.dentro(vi) || Math.abs(sup.dist(vi)) > sup.tol) return false;
    }
    const g = geo(m, f);
    // Virado para o mesmo lado. A direcao nao precisa bater fino: triangulo lasca
    // no meio da face sai com a normal torta em ate ~20 graus so por arredondamento.
    return g.n[0] * sup.n[0] + g.n[1] * sup.n[1] + g.n[2] * sup.n[2] > 0;
  };
  const candidato = (f: number) => {
    let fora = false;
    for (let e = 0; e < 3; e++) {
      const vi = m.t[f * 3 + e]!;
      if (!sup.dentro(vi)) return false;
      const d = Math.abs(sup.dist(vi));
      if (d > o.alturaMax + sup.tol) return false;
      if (d > sup.tol) fora = true;
    }
    return fora && !naFace(f);
  };
  const vizinhos = (f: number) => {
    const out: number[] = [];
    for (let e = 0; e < 3; e++) {
      for (const x of m.arestas.get(chaveAresta(m.t[f * 3 + e]!, m.t[f * 3 + ((e + 1) % 3)]!)) ?? []) if (x !== f) out.push(x);
    }
    return out;
  };
  const perto = (c: [number, number, number]) => Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]) <= raioSemente;
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
        } else if (!naFace(x)) cercado = false; // encosta em algo que nao e a face
      }
    }
    // Aresta de borda sem vizinho (malha aberta) tambem nao e marca cercada.
    const alto = comp.some((f) => [0, 1, 2].some((e) => Math.abs(sup.dist(m.t[f * 3 + e]!)) >= ALTURA_MIN));
    if (cercado && alto && comp.every((f) => vizinhos(f).length >= 3) && aceitar(comp)) {
      escolhidos.push(...comp);
      pedacos++;
    } else descartados++;
  }
  if (!escolhidos.length) {
    return {
      triangulos: [],
      area: 0,
      pedacos: 0,
      aviso: descartados
        ? 'O relevo encosta na borda ou em outra parede: não parece marca. Diminua o raio ou clique mais perto dela.'
        : `Não achei relevo de até ${o.alturaMax} mm aqui.`,
    };
  }
  // Area projetada: so o que olha para o mesmo lado da face (topo da letra ou fundo do rebaixo).
  let area = 0;
  for (const f of escolhidos) {
    const g = geo(m, f);
    const c = g.n[0] * sup.n[0] + g.n[1] * sup.n[1] + g.n[2] * sup.n[2];
    if (c > 0) area += g.area * c;
  }
  return { triangulos: escolhidos, area, pedacos };
}

const cruz = (a: readonly number[], b: readonly number[]): [number, number, number] => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];
const normalizar = (v: [number, number, number]): [number, number, number] => {
  const L = Math.hypot(...v) || 1;
  return [v[0] / L, v[1] / L, v[2] / L];
};

/** Termos do polinomio de grau 4: em (u, v) sao 15; na parede, so em u, sao 5. */
function termos(u: number, v: number, soU: boolean): number[] {
  if (soU) return [1, u, u * u, u ** 3, u ** 4];
  const out: number[] = [];
  for (let g = 0; g <= 4; g++) for (let i = 0; i <= g; i++) out.push(u ** (g - i) * v ** i);
  return out;
}
const avaliar = (c: readonly number[], u: number, v: number) => termos(u, v, c.length === 5).reduce((s, t, i) => s + t * c[i]!, 0);

/** Minimos quadrados h ~ poly(u, v), por equacoes normais com pivoteamento. */
function ajustar(pontos: readonly (readonly [number, number, number])[], soU = false): number[] | null {
  const k = soU ? 5 : 15;
  const A = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0));
  for (const [u, v, h] of pontos) {
    const t = termos(u, v, soU);
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) A[i]![j]! += t[i]! * t[j]!;
      A[i]![k]! += t[i]! * h;
    }
  }
  // Um pouco de regularizacao: com poucos pontos num lado, o grau 4 nao dispara.
  for (let i = 1; i < k; i++) A[i]![i]! += 1e-9 * pontos.length;
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[piv]![c]!)) piv = r;
    if (Math.abs(A[piv]![c]!) < 1e-12) return null;
    [A[c], A[piv]] = [A[piv]!, A[c]!];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = A[r]![c]! / A[c]![c]!;
      for (let j = c; j <= k; j++) A[r]![j]! -= f * A[c]![j]!;
    }
  }
  return A.map((row, i) => row[k]! / row[i]!);
}

/** Distancia (com sinal) de um ponto a superficie do relevo: plano ou curva ajustada. */
export function distanciaSuperficie(r: Relevo, x: number, y: number, z: number): number {
  if (!r.curva) return r.plano.n[0] * x + r.plano.n[1] * y + r.plano.n[2] * z - r.plano.d;
  const { p, n, t1, t2, R, coef } = r.curva;
  const dx = x - p[0], dy = y - p[1], dz = z - p[2];
  const u = (dx * t1[0] + dy * t1[1] + dz * t1[2]) / R;
  const v = (dx * t2[0] + dy * t2[1] + dz * t2[2]) / R;
  return dx * n[0] + dy * n[1] + dz * n[2] - avaliar(coef, u, v);
}

/**
 * Achata o relevo no plano da face e devolve a nova sopa de triangulos. As paredes
 * da marca colapsam (area zero) e saem; o topo da letra (ou o fundo do rebaixo) vira
 * parte da face, fechando o buraco que ela ocupava.
 */
export function aplanar(m: Malha, r: Relevo): Float32Array {
  const v = Float64Array.from(m.v);
  const n = r.curva?.n ?? r.plano.n;
  const mexer = new Set<number>();
  for (const f of r.triangulos) for (let e = 0; e < 3; e++) mexer.add(m.t[f * 3 + e]!);
  const dist = (vi: number) => distanciaSuperficie(r, m.v[vi * 3]!, m.v[vi * 3 + 1]!, m.v[vi * 3 + 2]!);
  // Na curva a parede da letra segue a normal LOCAL, nao `n`: projetar o fundo ao longo
  // de `n` erraria o ponto da borda e a parede viraria lasca dobrada. Entao o ponto do
  // fundo vai direto para o vizinho na face do outro lado da parede (a aresta mais
  // alinhada com a normal).
  const par = new Map<number, number>();
  if (r.curva) {
    const melhor = new Map<number, number>();
    const tol = 0.05;
    for (const f of r.triangulos) for (let e = 0; e < 3; e++) {
      for (const [a, b] of [[m.t[f * 3 + e]!, m.t[f * 3 + ((e + 1) % 3)]!], [m.t[f * 3 + ((e + 1) % 3)]!, m.t[f * 3 + e]!]] as const) {
        if (Math.abs(dist(a)) <= tol || Math.abs(dist(b)) > tol) continue;
        const dx = m.v[b * 3]! - m.v[a * 3]!, dy = m.v[b * 3 + 1]! - m.v[a * 3 + 1]!, dz = m.v[b * 3 + 2]! - m.v[a * 3 + 2]!;
        const cos = Math.abs(dx * n[0] + dy * n[1] + dz * n[2]) / (Math.hypot(dx, dy, dz) || 1);
        if (cos > 0.7 && cos > (melhor.get(a) ?? 0)) {
          melhor.set(a, cos);
          par.set(a, b);
        }
      }
    }
  }
  for (const vi of mexer) {
    const b = par.get(vi);
    if (b !== undefined) {
      v[vi * 3] = m.v[b * 3]!;
      v[vi * 3 + 1] = m.v[b * 3 + 1]!;
      v[vi * 3 + 2] = m.v[b * 3 + 2]!;
      continue;
    }
    const k = dist(vi);
    // Ponto da borda fica onde esta: e nele que o fundo gruda.
    if (r.curva && Math.abs(k) <= 0.05) continue;
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
