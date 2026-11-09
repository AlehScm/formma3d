/** O corte na altura (reto ou inclinado): o plano, o pino, o anel. */
import { diffRegion, intersectRegion, offsetRegion, regionArea, regionBounds, type Pt, type Region } from '../region';
import type { Manifold } from 'manifold-3d';
import { fundir, type ExtraStl, type Layer, type Papel } from '../modes';
import { doMalha } from '../../malha/converter';
import { prisma } from '../../malha/solidos';
import { aplicar, type Matriz } from '../../malha/plano';
import type { CorteNaAltura, EmendaDoCorte, MarcaDeEncaixe, OpcoesEmenda } from './tipos';
import { ANEL_ALTURA, ANEL_COLADO, EMPATE_FOLGA, FUNDO_LIVRE, PASSO_DENTE, PINO_BORDA, PINO_DIAMETRO, PINO_FUNDO } from './constantes';
import { circulo, dentroDa, distancia, escalar, mais, menos, niveis, secaoEm, unir, zBase, zTopo } from './geometria';
import { pecaSoltaDe, type FormaFeita } from './encaixe';
import { prismaComPapel, SOBRA_Z, type Divisor, type Pilha } from './cortar';

/** O material que existe em toda a faixa de z0 a z1: onde um furo fica cercado. */
export function cheioNaFaixa(s: Manifold, z0: number, z1: number): Region {
  // Peca de prismas retos: a secao so muda nos niveis dos vertices. Girada (corte inclinado), ela
  // muda aos poucos: a faixa e amostrada em 12 alturas (a borda do pino cobre o que muda entre elas).
  const dentro = niveis(s).filter((z) => z > z0 && z < z1);
  const zs = dentro.length <= 24 ? [z0, ...dentro, z1] : Array.from({ length: 13 }, (_, i) => z0 + ((z1 - z0) * i) / 12);
  let r: Region | null = null;
  for (let i = 0; i + 1 < zs.length; i++) {
    if (zs[i + 1]! - zs[i]! < 1e-6) continue;
    const sec = secaoEm(s, (zs[i]! + zs[i + 1]!) / 2);
    r = r ? intersectRegion(r, sec) : sec;
    if (!r.length) return [];
  }
  return r ?? [];
}

function distanciaAoSegmento(p: Pt, a: Pt, b: Pt): number {
  const v = menos(b, a), n = escalar(v, v);
  const t = n > 1e-12 ? Math.max(0, Math.min(1, escalar(menos(p, a), v) / n)) : 0;
  return distancia(p, mais(a, v, t));
}

/**
 * Pontos espalhados na zona, um a cada `passo` mm, pelo menos um por ilha: o primeiro onde ha
 * mais material em volta, os outros sempre o mais longe dos que ja foram. A escolha nao depende
 * de micrometros (a secao sai da malha numa grade de 0,001 mm): o passo da grade de candidatos
 * vai a 0,01 mm, e entre folgas a menos de EMPATE_FOLGA vale o primeiro da varredura.
 */
function espalhar(zona: Region, passo: number): Pt[] {
  const out: Pt[] = [];
  for (const poly of zona) {
    const ilha: Region = [{ outer: poly.outer, holes: poly.holes }];
    const b = regionBounds(ilha);
    const g = Math.max(0.5, Math.round(Math.sqrt((b.w * b.h) / 2500) * 100) / 100);
    const cand: Pt[] = [];
    for (let y = b.minY + g / 2; y < b.maxY; y += g) for (let x = b.minX + g / 2; x < b.maxX; x += g) if (dentroDa(ilha, { x, y })) cand.push({ x, y });
    if (!cand.length) {
      const m = poly.outer.reduce((s, p) => ({ x: s.x + p.x / poly.outer.length, y: s.y + p.y / poly.outer.length }), { x: 0, y: 0 });
      if (dentroDa(ilha, m)) out.push(m);
      continue;
    }
    const aneis = [poly.outer, ...poly.holes];
    const folga = (q: Pt) => {
      let d = Infinity;
      for (const an of aneis) for (let i = 0; i < an.length; i++) d = Math.min(d, distanciaAoSegmento(q, an[i]!, an[(i + 1) % an.length]!));
      return d;
    };
    const folgas = cand.map(folga);
    const maior = Math.max(...folgas);
    const primeiro = cand[folgas.findIndex((f) => f >= maior - EMPATE_FOLGA)]!;
    out.push(primeiro);
    const longe = cand.map((q) => distancia(q, primeiro));
    for (;;) {
      let i = 0;
      for (let j = 1; j < cand.length; j++) if (longe[j]! > longe[i]!) i = j;
      if (longe[i]! < passo) break;
      const q = cand[i]!;
      out.push(q);
      cand.forEach((c, j) => { longe[j] = Math.min(longe[j]!, distancia(c, q)); });
    }
  }
  return out;
}

export interface ContextoAltura {
  opc: OpcoesEmenda;
  /** Por dentro do desenho (oca): onde o anel pode ir, tirado o material na altura. */
  cavidade: Region;
  /** Onde o anel nao vai: perto das linhas dos cortes (a tala, a ponta da parede). */
  evitar: Region;
  /** Espessura do anel, mm. */
  espAnel: number;
  /** Papel do pino fixo (o da peca em volta dele). */
  papelDoPino: Papel;
}

/** Parte uma pilha num plano z; cada extra vai com a parte onde ele encosta. */
export function partirNaAltura(p: Pilha, h: number, emCima: (e: ExtraStl) => boolean = (e) => e.montagem.z >= h - 1e-6): [Pilha, Pilha] {
  const [cima, baixo] = p.s.splitByPlane([0, 0, 1], h);
  // A de baixo imprime como ja imprimia; a de cima, com o corte na mesa.
  const b: Pilha = { s: baixo, extras: [], ...(p.imprimir ? { imprimir: p.imprimir } : {}) }, c: Pilha = { s: cima, extras: [] };
  for (const e of p.extras) (emCima(e) ? c : b).extras.push(e);
  return [b, c];
}

/**
 * Anel por dentro da parede (oca): na parte de baixo, colado na parede (com rampa de 45 graus
 * embaixo, sem balanco), sobe `fundo` mm alem do corte, com folga da parede de cima, que encaixa
 * por fora dele. Na parte de cima, o que estiver no caminho do anel e cavado.
 */
function anelNaAltura(x: Divisor, baixo: Pilha, cima: Pilha, h: number, e: EmendaDoCorte | undefined, c: ContextoAltura): boolean {
  const { opc } = c;
  const parede = secaoEm(baixo.s, h - 0.01);
  if (!parede.length || !c.cavidade.length) return false;
  const esp = Math.max(0.8, e?.tamanho ?? c.espAnel);
  const vazio = diffRegion(diffRegion(c.cavidade, parede), c.evitar);
  const colado = intersectRegion(vazio, offsetRegion(parede, -(esp + opc.folga)));
  const anel = diffRegion(colado, offsetRegion(parede, -opc.folga));
  const alto = Math.min(e?.fundo ?? ANEL_ALTURA, zTopo(cima.s) - h - 1.5);
  if (regionArea(anel) < 1 || alto < 2) return false;
  const piso = zBase(baixo.s);
  const rampa = esp + opc.folga;
  const z0 = Math.max(piso, h - ANEL_COLADO);
  const novas: Layer[] = [];
  if (z0 - rampa >= piso) {
    const n = 4;
    for (let i = 0; i < n; i++) {
      novas.push({ region: intersectRegion(vazio, offsetRegion(parede, -(rampa * (i + 1)) / n)), z0: z0 - rampa + (rampa * i) / n, z1: z0 - rampa + (rampa * (i + 1)) / n, role: 'parede' });
    }
  }
  novas.push({ region: colado, z0, z1: h, role: 'parede' }, { region: anel, z0: h, z1: h + alto, role: 'parede' });
  baixo.s = baixo.s.add(doMalha(x.m, fundir(x.m, novas, x.papeis)));
  cima.s = cima.s.subtract(prisma(x.m, diffRegion(offsetRegion(anel, -opc.folga), parede), h - SOBRA_Z, h + alto + FUNDO_LIVRE));
  return true;
}

/**
 * O encaixe de um corte na altura entre as duas partes. Pino solto: furo nas duas e o pino
 * impresso a parte (em pe). Pino fixo: macho na de baixo, furo na de cima (que imprime com o
 * corte na mesa: o furo abre para a mesa). O pino so vai onde o material cerca o furo inteiro.
 * `usados` marca os lugares pedidos que couberam (o mesmo corte passa por varias pilhas).
 */
/**
 * O corte inclinado com o plano deitado em z = 0. Os lugares escolhidos sao pontos da vista de
 * cima e nao do plano deitado: ali os pinos vao no automatico (o Inspetor e o Cortar a mao ja
 * nao oferecem escolher).
 */
export function deitado(c: CorteNaAltura): CorteNaAltura {
  const { lugares: _, ...emenda } = c.emenda ?? {};
  return { ...c, z: 0, emenda };
}

/** A marca feita com o plano deitado, de volta ao letreiro e vista de cima (o pino na sombra dele). */
export function vistaDeCima(m: MarcaDeEncaixe, volta: Matriz): MarcaDeEncaixe {
  const ponto = (p: Pt): Pt => {
    const [x, y] = aplicar(volta, p.x, p.y, 0);
    return { x, y };
  };
  return { ...m, lugar: ponto(m.lugar), regiao: m.regiao.map((p) => ({ outer: p.outer.map(ponto), holes: p.holes.map((h) => h.map(ponto)) })) };
}

export function encaixarNaAltura(
  x: Divisor,
  baixo: Pilha,
  cima: Pilha,
  c: CorteNaAltura,
  k: number,
  forma: FormaFeita,
  ctx: ContextoAltura,
  usados: Set<number>
): { marcas: MarcaDeEncaixe[]; semEncaixe: boolean } {
  const { opc } = ctx;
  const h = c.z, e = c.emenda;
  const marcas: MarcaDeEncaixe[] = [];
  if (forma === 'cola') return { marcas, semEncaixe: false };
  if (forma === 'anel') return { marcas, semEncaixe: !anelNaAltura(x, baixo, cima, h, e, ctx) };
  const fixo = forma === 'pinoFixo';
  const r = Math.max(1, (e?.tamanho ?? PINO_DIAMETRO) / 2);
  const piso = zBase(baixo.s);
  const fundo = Math.min(e?.fundo ?? PINO_FUNDO, zTopo(cima.s) - h - 1.2, fixo ? Infinity : h - piso - 1.2);
  if (fundo < 2) return { marcas, semEncaixe: !e?.lugares };
  const furo = r + opc.folga;
  const embaixo = cheioNaFaixa(baixo.s, Math.max(piso, fixo ? h - 1 : h - fundo - FUNDO_LIVRE), h);
  const zona = offsetRegion(intersectRegion(embaixo, cheioNaFaixa(cima.s, h, h + fundo + FUNDO_LIVRE)), furo + PINO_BORDA);
  const pedidos: [Pt, number][] = e?.lugares
    ? e.lugares.map((p, i): [Pt, number] => [p, i])
    : espalhar(zona, Math.max(10, e?.passo ?? PASSO_DENTE)).map((p): [Pt, number] => [p, -1]);
  const pts: Pt[] = [];
  for (const [p, i] of pedidos) {
    if (!dentroDa(zona, p)) continue;
    if (i >= 0) usados.add(i);
    pts.push(p);
  }
  if (!pts.length) return { marcas, semEncaixe: !e?.lugares };
  const furos = unir(pts.map((p) => circulo(p.x, p.y, furo, 32)));
  cima.s = cima.s.subtract(prisma(x.m, furos, h - SOBRA_Z, h + fundo + FUNDO_LIVRE));
  if (fixo) {
    // O macho entra 1 mm na de baixo (dentro do material que a zona garante): a uniao fica sem face coplanar.
    baixo.s = baixo.s.add(prismaComPapel(x, unir(pts.map((p) => circulo(p.x, p.y, r, 32))), Math.max(piso, h - SOBRA_Z), h + fundo, ctx.papelDoPino));
  } else {
    baixo.s = baixo.s.subtract(prisma(x.m, furos, h - fundo - FUNDO_LIVRE, h + SOBRA_Z));
    baixo.extras.push(...pts.map((p) => pecaSoltaDe('pino', 'Pino da emenda na altura (entra nos furos das duas partes)', circulo(p.x, p.y, r, 32), 2 * fundo, h - fundo, 1)));
  }
  for (const p of pts) marcas.push({ corte: k, lugar: p, regiao: circulo(p.x, p.y, r, 32), inverter: false });
  return { marcas, semEncaixe: false };
}
