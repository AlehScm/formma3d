/**
 * "Suavizar relevo": acha letras ou logo em alto/baixo relevo numa face de um STL e
 * troca pela face lisa.
 *
 * Marca e um pedaco da malha separado da face por vinco (segmentar.ts) e cercado por
 * ela. Sai o pedaco; entra um remendo que continua a face em volta (remendar.ts). Nao
 * ha formula da superficie: plano, parede redonda ou esfera saem do mesmo jeito.
 */
import { remendar, type Motivo } from './remendar';
import { segmentar, type Segmentos } from './segmentar';

export interface Malha {
  /** Vertices soldados (x, y, z). */
  v: Float64Array;
  /** Tres indices de `v` por triangulo, na ordem da sopa original. */
  t: Uint32Array;
  /** Aresta (menor,maior) -> triangulos que a usam. */
  arestas: Map<string, number[]>;
}

export interface Peca {
  /** Triangulos (indices em `Malha.t`) que saem. */
  triangulos: number[];
  /** Sopa de triangulos que entra no lugar. */
  remendo: Float32Array;
  /** Area remendada, mm2. */
  area: number;
}

export interface Relevo {
  /** Todos os triangulos que saem (a previa em vermelho). */
  triangulos: number[];
  /** Area remendada, mm2. */
  area: number;
  /** Quantos pedacos separados (letras). */
  pedacos: number;
  pecas: Peca[];
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

/**
 * Acha a marca em volta do triangulo clicado `tri` (no ponto `p`). Clicar no fundo da
 * letra, no topo dela ou na face ao lado da no mesmo: a face de base e o retalho liso
 * em que o clique cai numa marca cercada por ele (ou nele mesmo). Marca = pedaco
 * cercado pela base, a ate `raio` do clique.
 */
export function detectarRelevo(m: Malha, tri: number, p: [number, number, number], o: OpcoesRelevo): Relevo {
  const nt = m.t.length / 3;
  const vazio = (aviso: string): Relevo => ({ triangulos: [], area: 0, pedacos: 0, pecas: [], aviso });
  if (!(tri >= 0 && tri < nt)) return vazio('Clique numa face da peça.');
  const s = segmentar(m);
  const r0 = s.retalho[tri]!;
  const proximos = new Set([r0]);
  for (let passo = 0; passo < 2; passo++) for (const r of [...proximos]) for (const x of s.vizRetalho[r]!) proximos.add(x);
  const candidatas = [r0, ...[...proximos].filter((r) => r !== r0).sort((a, b) => s.areaRetalho[b]! - s.areaRetalho[a]!)];
  const motivos = new Set<Motivo>();
  for (const base of candidatas) {
    const r = marcasSobre(m, s, base, tri, p, o, motivos);
    if (r.pedacos && (base === r0 || r.triangulos.includes(tri))) return r;
  }
  return vazio(
    motivos.has('alto')
      ? `Achei relevo, mas mais alto que ${o.alturaMax} mm. Se for marca, aumente a altura máxima.`
      : motivos.has('borda')
        ? 'O relevo encosta na borda ou em outra parede: não parece marca. Clique na face ao lado dela.'
        : motivos.has('curva')
          ? 'A marca dá a volta numa curva forte demais para remendar.'
          : motivos.has('aberta')
            ? 'A malha está aberta aqui (furo ou aresta com mais de duas faces).'
            : `Não achei relevo de até ${o.alturaMax} mm aqui.`
  );
}

/** Pedacos cercados pelo retalho `base` perto do clique, cada um com o seu remendo. */
function marcasSobre(m: Malha, s: Segmentos, base: number, tri: number, p: [number, number, number], o: OpcoesRelevo, motivos: Set<Motivo>): Relevo {
  const nt = m.t.length / 3;
  const raio2 = o.raio * o.raio;
  const perto = (f: number) => (s.c[f * 3]! - p[0]) ** 2 + (s.c[f * 3 + 1]! - p[1]) ** 2 + (s.c[f * 3 + 2]! - p[2]) ** 2 <= raio2;
  const visto = new Uint8Array(nt);
  const pecas: Peca[] = [];
  for (let semente = 0; semente < nt; semente++) {
    if (visto[semente] || s.retalho[semente] === base || (semente !== tri && !perto(semente))) continue;
    const faces: number[] = [];
    const pilha = [semente];
    visto[semente] = 1;
    while (pilha.length) {
      const f = pilha.pop()!;
      faces.push(f);
      for (let e = 0; e < 3; e++) {
        const g = s.viz[f * 3 + e]!;
        if (g >= 0 && !visto[g] && s.retalho[g] !== base) {
          visto[g] = 1;
          pilha.push(g);
        }
      }
    }
    const r = remendar(m, s, faces, o.alturaMax);
    if ('motivo' in r) motivos.add(r.motivo);
    else {
      pecas.push({ triangulos: faces, remendo: r.remendo, area: r.area });
    }
  }
  return juntarPecas(pecas);
}

/** O resultado com estes pedacos (o usuario pode tirar alguns da previa). */
export function juntarPecas(pecas: Peca[]): Relevo {
  return {
    triangulos: pecas.flatMap((x) => x.triangulos),
    area: pecas.reduce((s, x) => s + x.area, 0),
    pedacos: pecas.length,
    pecas,
    ...(pecas.length ? {} : { aviso: 'Nenhum pedaço marcado. Clique na face para buscar de novo.' }),
  };
}

/** Tira os pedacos e poe os remendos: a nova sopa de triangulos. */
export function aplanar(m: Malha, r: Relevo): Float32Array {
  const nt = m.t.length / 3;
  const sai = new Uint8Array(nt);
  for (const x of r.pecas) for (const f of x.triangulos) sai[f] = 1;
  let n = 0;
  for (let f = 0; f < nt; f++) if (!sai[f]) n++;
  const out = new Float32Array(n * 9 + r.pecas.reduce((s, x) => s + x.remendo.length, 0));
  let i = 0;
  for (let f = 0; f < nt; f++) {
    if (sai[f]) continue;
    for (let e = 0; e < 3; e++) {
      const vi = m.t[f * 3 + e]!;
      out[i++] = m.v[vi * 3]!;
      out[i++] = m.v[vi * 3 + 1]!;
      out[i++] = m.v[vi * 3 + 2]!;
    }
  }
  for (const x of r.pecas) {
    out.set(x.remendo, i);
    i += x.remendo.length;
  }
  return out;
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
