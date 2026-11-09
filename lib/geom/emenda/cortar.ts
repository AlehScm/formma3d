/** Aplicar o corte na malha (manifold): o cortador de cada corte, a chapa impressa e as ilhas. */
import { intersectRegion, offsetRegion, regionArea, regionBounds, type Region } from '../region';
import type { Manifold, Mat4 } from 'manifold-3d';
import type { ExtraStl, Papeis, Papel } from '../modes';
import type { Motor } from '../../malha/nucleo';
import { doMalha, paraMalha } from '../../malha/converter';
import { prisma, projecao } from '../../malha/solidos';
import { solidoDaPilha, type PrismaDaPilha } from '../../malha/pilha';
import { caixaDaMalha } from '../../malha/tipos';
import { aplicar, type Matriz } from '../../malha/plano';
import type { OpcoesEmenda } from './tipos';
import { circulo, dentroDa, unir, zBase, zTopo } from './geometria';
import { eixoDoFuro, type EncaixeDoCorte } from './encaixe';

/** Pedaco em construcao: o solido (vivo no escopo da divisao) e os extras impressos que vao com ele. */
export interface Pilha {
  s: Manifold;
  extras: ExtraStl[];
  /** A parte de cima de um corte inclinado: como ela deita na mesa (e a volta). */
  imprimir?: { ida: Matriz; volta: Matriz };
}

/** O motor e o papel das faces que a divisao acrescenta (anel, pino fixo, numero). */
export interface Divisor {
  m: Motor;
  papeis: Papeis;
}

/**
 * Quanto o cortador passa alem da face da peca que ele corta, mm: a booleana fica sem face
 * coplanar (que e o caso mais caro e o que mais deixa lasca). So onde passar nao muda nada.
 */
export const SOBRA_Z = 1;

/** Prisma com o papel das faces dele (o que a divisao acrescenta ou grava na peca). */
export function prismaComPapel(x: Divisor, r: Region, z0: number, z1: number, papel: Papel): Manifold {
  const s = prisma(x.m, r, z0, z1).asOriginal();
  x.papeis[s.originalID()] = papel;
  return s;
}

/** O cortador de um corte: cada faixa de altura com a sua regiao, empilhadas de z0 a z1. */
function cortador(m: Motor, faixas: { ate: number; r: Region }[], z0: number, z1: number): Manifold {
  const id = m.Manifold.reserveIDs(1);
  const pilha: PrismaDaPilha[] = [];
  let baixo = z0;
  for (const f of faixas) {
    const cima = Math.min(f.ate, z1);
    if (cima > baixo && f.r.length) pilha.push({ region: f.r, z0: baixo, z1: cima, id });
    baixo = Math.max(baixo, cima);
  }
  return solidoDaPilha(m, pilha);
}

/** Divide uma pilha num corte: o que fica antes e o que fica depois (cada faixa de altura com o seu cortador). */
export function partir(x: Divisor, p: Pilha, e: EncaixeDoCorte, opc: OpcoesEmenda): [Pilha, Pilha] {
  const { m } = x;
  const base = zBase(p.s), topo = zTopo(p.s);
  const z0 = base - SOBRA_Z, z1 = topo + SOBRA_Z;
  let a = p.s.intersect(cortador(m, e.faixas.map((f) => ({ ate: f.ate, r: f.antes })), z0, z1));
  let d = p.s.subtract(cortador(m, e.faixas.map((f) => ({ ate: f.ate, r: f.depois })), z0, z1));
  for (const v of e.vaos) {
    const vao = prisma(m, v.regiao, v.z0 <= base ? z0 : v.z0, v.z1 >= topo ? z1 : v.z1);
    a = a.subtract(vao);
    d = d.subtract(vao);
  }
  for (const f of e.furos) {
    const furo = prisma(m, circulo(0, 0, f.r, 32), -f.meio, f.meio).transform(eixoDoFuro(f) as Mat4);
    a = a.subtract(furo);
    d = d.subtract(furo);
  }
  const antes: Pilha = { s: a, extras: [] }, depois: Pilha = { s: d, extras: [] };
  for (const ex of p.extras) {
    const [xa, xd] = partirChapaImpressa(m, ex, e.base, opc);
    if (xa) antes.extras.push(xa);
    if (xd) depois.extras.push(xd);
  }
  return [antes, depois];
}

const extraDe = (e: ExtraStl, s: Manifold): ExtraStl | null => (s.isEmpty() || s.volume() < 1e-6 ? null : { ...e, malha: paraMalha(s) });

/**
 * Chapa impressa em degrau: a metade de baixo do pedaco de antes avanca a sobreposicao alem da
 * linha; a de cima para na linha. O de depois e o complemento (com folga). Assim cada pedaco so
 * avanca para a frente, como o dente.
 */
function partirChapaImpressa(m: Motor, e: ExtraStl, base: Region, opc: OpcoesEmenda): [ExtraStl | null, ExtraStl | null] {
  const longe = offsetRegion(base, -opc.sobreposicaoChapa);
  const s = doMalha(m, e.malha);
  const z0 = zBase(s), z1 = zTopo(s), meio = (z0 + z1) / 2;
  const corte = (embaixo: Region, emCima: Region) => cortador(m, [{ ate: meio, r: embaixo }, { ate: Infinity, r: emCima }], z0 - SOBRA_Z, z1 + SOBRA_Z);
  return [
    extraDe(e, s.intersect(corte(longe, base))),
    extraDe(e, s.subtract(corte(offsetRegion(longe, -opc.folga), offsetRegion(base, -opc.folga)))),
  ];
}

/**
 * Separa os pedacos soltos de uma pilha. Partes cuja sombra vista de cima se sobrepoe ficam
 * juntas (o espacador do halo, que nao encosta na parede, continua com a peca); a de dentro do
 * furo de outra (o anel de dentro do O) vira pedaco. Cada extra vai com a sombra que ele cruza.
 */
export function ilhas(m: Motor, p: Pilha): Pilha[] {
  if (p.s.isEmpty()) return [];
  const partes = p.s.decompose();
  if (partes.length <= 1) return [p];
  const sombras = partes.map(projecao);
  const pai = partes.map((_, i) => i);
  const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i]!)));
  for (let i = 0; i < partes.length; i++) {
    for (let j = i + 1; j < partes.length; j++) {
      if (raiz(i) !== raiz(j) && regionArea(intersectRegion(sombras[i]!, sombras[j]!)) > 1e-6) pai[raiz(j)] = raiz(i);
    }
  }
  const grupos = new Map<number, number[]>();
  partes.forEach((_, i) => grupos.set(raiz(i), [...(grupos.get(raiz(i)) ?? []), i]));
  if (grupos.size === 1) return [p];
  const areas = [...grupos.values()].map((ks) => unir(ks.map((k) => sombras[k]!)));
  // O extra posto por matriz (pino do corte inclinado) nao se recorta: a malha dele esta no
  // referencial dele. Vai inteiro para a ilha onde fica o centro dele montado (ou a mais perto).
  const ilhaDe = (e: ExtraStl): number => {
    const b = caixaDaMalha(e.malha);
    const [x, y] = aplicar(e.montagem.matriz!, (b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
    const i = areas.findIndex((a) => dentroDa(a, { x, y }));
    if (i >= 0) return i;
    const longe = areas.map((a) => { const r = regionBounds(a); return Math.hypot(r.minX + r.w / 2 - x, r.minY + r.h / 2 - y); });
    return longe.indexOf(Math.min(...longe));
  };
  return [...grupos.values()].map((ks, g) => {
    const area = areas[g]!;
    const extras = p.extras.flatMap((e) => {
      if (e.montagem.matriz) return ilhaDe(e) === g ? [e] : [];
      const s = doMalha(m, e.malha);
      const r = extraDe(e, s.intersect(prisma(m, area, zBase(s) - SOBRA_Z, zTopo(s) + SOBRA_Z)));
      return r ? [r] : [];
    });
    return { s: ks.length === 1 ? partes[ks[0]!]! : m.Manifold.union(ks.map((k) => partes[k]!)), extras, ...(p.imprimir ? { imprimir: p.imprimir } : {}) };
  });
}
