/**
 * Divide uma peca maior que a mesa em pedacos que cabem, com emenda. A peca e uma pilha de
 * prismas 2D (modes.ts): o mesmo cortador e aplicado a todas as camadas e a chapa, entao a
 * emenda fica exata e sem booleana 3D. A emenda depende da peca:
 *
 *  - solida (com ou sem chanfro): dente de encaixe na altura toda, a cada ~60 mm de material
 *    na linha de corte. O pedaco de baixo leva o dente; o de cima, o vao com folga.
 *  - oca: a emenda fica aberta por dentro (sem parede dupla, nada de sombra no acrilico) e uma
 *    tala impressa a parte, em "L", encaixa por dentro cruzando a emenda: placa sobre a tampa
 *    fechada e pele colada na parede. Furos opcionais para parafuso M3 na tala e na tampa.
 *  - chapa cortada (ACM/acrilico): fica inteira e cobre a emenda.
 *  - chapa impressa: emenda em degrau na espessura (metade de baixo de um pedaco, metade de
 *    cima do outro), para sobrepor e colar.
 *
 * Cortes retos em X e em Y (linhas inteiras). `planejarCortes` escolhe o minimo de cortes e,
 * entre as posicoes que cabem, as que cruzam a parede reta e de frente, longe do furo do fio e
 * dos espacadores. Cada pedaco pode levar o numero de montagem gravado por dentro (ou embaixo).
 */
import {
  diffRegion,
  intersectRegion,
  minThickness,
  offsetRegion,
  regionArea,
  regionBounds,
  unionRegion,
  type Bounds,
  type Pt,
  type Region,
} from './region';
import { samplePointsInside, type Extra, type ExtraStl, type Layer, type Params, type Part } from './modes';

export type Eixo = 'x' | 'y';

/** Linha de corte inteira: x = pos (corte vertical) ou y = pos (horizontal). */
export interface Corte {
  eixo: Eixo;
  pos: number;
}

export interface OpcoesEmenda {
  /** Folga do encaixe (dente e degrau da chapa), mm. */
  folga: number;
  /** Quanto a tala avanca de cada lado da emenda, mm. */
  larguraTala: number;
  /** Espessura da placa da tala, mm. */
  espTala: number;
  /** Altura da pele da tala na parede, mm (a partir da placa). */
  alturaTala: number;
  /** Espessura da pele da tala na parede, mm. */
  peleTala: number;
  /** Folga entre a tala e a parede, mm. */
  folgaTala: number;
  /** Furos para parafuso M3 na tala e na tampa embaixo. */
  parafusos: boolean;
  /** Grava o numero de montagem (N-1, N-2...) no pedaco. */
  gravarNumero: boolean;
  /** Sobra dentro da mesa em cada eixo, mm (o arranjo ainda deixa folga entre pecas). */
  margem: number;
  /** Sobreposicao da chapa impressa no degrau, mm. */
  sobreposicaoChapa: number;
}

export const EMENDA_PADRAO: OpcoesEmenda = {
  folga: 0.2,
  larguraTala: 30,
  espTala: 3,
  alturaTala: 12,
  peleTala: 2,
  folgaTala: 0.3,
  parafusos: false,
  gravarNumero: true,
  margem: 4,
  sobreposicaoChapa: 15,
};

/** Diametro do furo do parafuso M3 (passa folgado). */
const FURO_M3 = 3.4;
/** Profundidade da gravacao do numero, mm. */
const PROF_GRAVACAO = 0.4;
/** Espacamento do dente ao longo do material na linha de corte, mm. */
const PASSO_DENTE = 60;
/** Menor trecho de material que recebe dente, mm. */
const TRECHO_MIN_DENTE = 6;
/** Quanto o dente avanca alem da linha (no maximo 1,8 x raio 8). */
const AVANCO_DENTE = 15;
/** Menor pedaco ao longo de um eixo, mm. */
const PEDACO_MIN = 30;
/** Pedaco menor que isto (mm2) e lasca: some, com aviso. */
const LASCA = 20;
/** Menor trecho de material entre a linha de corte e um corte do outro eixo, mm. */
const TRECHO_MIN = 20;
/** Maior tala ao longo da linha de corte, mm (as mais compridas viram varias). */
const TALA_MAX = 150;
/** Pedaco mais raso que isto (da linha de corte ate onde o material acaba) pesa na nota, mm. */
const FUNDO_BOM = 80;
/** Peso, por mm, da diferenca entre um pedaco e a divisao em partes iguais (so desempata). */
const EQUILIBRIO = 0.03;
/** Pedacinho que um corte solta (refaz o plano longe dele): area, mm2, e maior lado, mm. */
const PEDACINHO_AREA = 600;
const PEDACINHO_LADO = 40;
/** Quanto o corte que soltou pedacinho fica evitado, para cada lado, mm. */
const RAIO_EVITAR = 12;
const GRANDE = 1e5;

// ---------------------------------------------------------------------------
// Utilitarios 2D
// ---------------------------------------------------------------------------

const retangulo = (x0: number, y0: number, x1: number, y1: number): Region => [
  { outer: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], holes: [] },
];

function circulo(cx: number, cy: number, r: number, lados = 40): Region {
  const outer: Pt[] = [];
  for (let i = 0; i < lados; i++) {
    const a = (i / lados) * Math.PI * 2;
    outer.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return [{ outer, holes: [] }];
}

const unir = (rs: Region[]): Region => rs.reduce<Region>((acc, r) => (r.length ? (acc.length ? unionRegion(acc, r) : r) : acc), []);

/** Tudo que fica antes da linha (x < pos ou y < pos). */
const antesDe = (c: Corte): Region => (c.eixo === 'x' ? retangulo(-GRANDE, -GRANDE, c.pos, GRANDE) : retangulo(-GRANDE, -GRANDE, GRANDE, c.pos));

/** Faixa em volta da linha, de `a` ate `b` ao longo do eixo do corte. */
const faixa = (c: Corte, a: number, b: number): Region => (c.eixo === 'x' ? retangulo(a, -GRANDE, b, GRANDE) : retangulo(-GRANDE, a, GRANDE, b));

/**
 * Trechos de material na linha de corte (par-impar), medidos ao longo da linha: para x = pos,
 * intervalos em y; para y = pos, intervalos em x.
 */
export function trechosNaLinha(r: Region, c: Corte): [number, number][] {
  const vals: number[] = [];
  for (const p of r) for (const anel of [p.outer, ...p.holes]) for (let i = 0; i < anel.length; i++) {
    const a = anel[i]!, b = anel[(i + 1) % anel.length]!;
    const [ua, ub, va, vb] = c.eixo === 'x' ? [a.x, b.x, a.y, b.y] : [a.y, b.y, a.x, b.x];
    if ((ua <= c.pos) !== (ub <= c.pos)) vals.push(va + ((c.pos - ua) * (vb - va)) / (ub - ua));
  }
  vals.sort((p, q) => p - q);
  const out: [number, number][] = [];
  for (let k = 0; k + 1 < vals.length; k += 2) if (vals[k + 1]! - vals[k]! > 0.02) out.push([vals[k]!, vals[k + 1]!]);
  return out;
}

const somaTrechos = (t: [number, number][]) => t.reduce((s, [a, b]) => s + (b - a), 0);

/** A silhueta impressa da peca: a uniao de todas as camadas. */
const silhueta = (layers: Layer[]): Region => unir(layers.map((l) => l.region));

const volumeDe = (layers: Layer[]) => layers.reduce((v, l) => v + regionArea(l.region) * (l.z1 - l.z0), 0);

/** Peca solida: nao tem cavidade (todas as camadas cheias na silhueta, menos o chanfro). */
const ehSolida = (part: Part, cfg: Pick<Params, 'macica'>): boolean =>
  cfg.macica || part.layers.every((l) => l.role === 'corpo' || l.role === 'bisel' || l.role === 'espacador');

/** Pontos em que o corte nao pode passar: espacadores e furo do fio (com raio). */
function pontosProibidos(part: Part, cfg: Params): { p: Pt; r: number }[] {
  const out: { p: Pt; r: number }[] = [];
  for (const l of part.layers) {
    if (l.role !== 'espacador') continue;
    const b = regionBounds(l.region);
    out.push({ p: { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }, r: b.w / 2 + 3 });
  }
  if (cfg.comLed && cfg.furoFio > 0) {
    // O mesmo ponto que o buildPart escolhe para o furo (amostragem deterministica).
    const pt = samplePointsInside(part.contorno, cfg.furoFio / 2 + cfg.parede, 1)[0];
    if (pt) out.push({ p: pt, r: cfg.furoFio / 2 + 3 });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Onde cortar
// ---------------------------------------------------------------------------

export interface Mesa {
  x: number;
  y: number;
}

/**
 * Nota de uma posicao de corte (menor e melhor): quanto de borda a linha cruza (de frente e
 * melhor que de raspao), mais um pouco do material cortado. Infinito onde nao pode cortar.
 */
/** Trechos de material numa linha, guardados por posicao (a nota consulta as mesmas linhas). */
function trechosGuardados(material: Region, eixo: Eixo): (pos: number) => [number, number][] {
  const cache = new Map<number, [number, number][]>();
  return (pos) => {
    let t = cache.get(pos);
    if (!t) cache.set(pos, (t = trechosNaLinha(material, { eixo, pos })));
    return t;
  };
}

const cruza = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];

/** Os trechos partidos nos cortes do outro eixo: cada parte fica na sua coluna (ou linha). */
const nasCelulas = (ts: [number, number][], outros: number[]): [number, number][] =>
  outros.length
    ? ts.flatMap(([a, b]) => {
        const m = [a, ...outros.filter((v) => v > a && v < b), b];
        return m.slice(1).map((v, i): [number, number] => [m[i]!, v]);
      })
    : ts;

/**
 * Ate onde vai, de um lado da linha, o material de cada trecho cortado: segue os trechos que
 * continuam (se sobrepoem) de 5 em 5 mm, dentro da mesma coluna dos cortes do outro eixo. O que
 * acaba antes de FUNDO_BOM vira pedaco raso (ponta de perna, tira na beirada) e pesa na nota.
 */
function pedacosRasos(pos: number, tm: [number, number][], linha: (pos: number) => [number, number][], outros: number[]): number {
  let peso = 0;
  for (const lado of [-1, 1]) {
    for (const t of nasCelulas(tm, outros)) {
      let vivos: [number, number][] = [t];
      let fundo = 0;
      for (let d = 5; d <= FUNDO_BOM && vivos.length; d += 5) {
        vivos = nasCelulas(linha(pos + lado * d), outros).filter((x) => vivos.some((v) => cruza(v, x)));
        if (vivos.length) fundo = d;
      }
      if (fundo < FUNDO_BOM) peso += (FUNDO_BOM - fundo) / FUNDO_BOM;
    }
  }
  return peso;
}

function notaDoCorte(c: Corte, material: Region, borda: Region, proibidos: { p: Pt; r: number }[], outros: number[], linha: (pos: number) => [number, number][], evitar: Corte[]): number {
  for (const { p, r } of proibidos) if (Math.abs((c.eixo === 'x' ? p.x : p.y) - c.pos) < r) return Infinity;
  const tb = trechosNaLinha(borda, c);
  if (!tb.length) return Infinity;
  // De raspao (tangente) ou num canto: os trechos mudam logo ao lado.
  const antes = trechosNaLinha(borda, { ...c, pos: c.pos - 1.5 }).length;
  const depois = trechosNaLinha(borda, { ...c, pos: c.pos + 1.5 }).length;
  const instavel = antes !== tb.length || depois !== tb.length ? 40 : 0;
  const curtos = tb.filter(([a, b]) => b - a < 1).length * 60;
  // Perto da ponta de uma perna (o material muda logo adiante) sobra um pedacinho.
  // Pedaco e a area do desenho (parede e vao): os trechos sao do contorno, nao so do material.
  const tm = linha(c.pos);
  let ponta = 0;
  for (const [d, peso] of [[5, 25], [10, 15], [15, 10]] as const) {
    if (linha(c.pos - d).length !== tm.length) ponta += peso;
    if (linha(c.pos + d).length !== tm.length) ponta += peso;
  }
  ponta += 120 * pedacosRasos(c.pos, tm, linha, outros);
  // Os cortes do outro eixo partem o trecho: um pedaco estreito entre eles vira lasca.
  let estreitos = 0;
  for (const [a, b] of tm) {
    const marcos = [a, ...outros.filter((v) => v > a && v < b), b];
    for (let i = 1; i < marcos.length; i++) if (marcos[i]! - marcos[i - 1]! < TRECHO_MIN) estreitos++;
  }
  const evitado = evitar.some((e) => e.eixo === c.eixo && Math.abs(e.pos - c.pos) < RAIO_EVITAR) ? 300 : 0;
  return somaTrechos(tb) + 0.05 * somaTrechos(trechosNaLinha(material, c)) + instavel + curtos + ponta + estreitos * 500 + evitado;
}

/**
 * Cortes num eixo: o minimo que faz cada trecho caber em `limite` (o pedaco que leva o dente
 * soma `avanco`), escolhidos pela menor nota somada (programacao dinamica, passo de 1 mm).
 */
function cortesNoEixo(eixo: Eixo, ini: number, fim: number, limite: number, avanco: number, nota: (pos: number) => number): number[] {
  const tam = fim - ini;
  if (tam <= limite) return [];
  const candidatos: { pos: number; nota: number }[] = [];
  for (let pos = Math.ceil(ini + PEDACO_MIN); pos <= fim - PEDACO_MIN; pos += 1) {
    const n = nota(pos);
    if (Number.isFinite(n)) candidatos.push({ pos, nota: n });
  }
  const util = limite - avanco;
  if (util <= PEDACO_MIN) return [];
  for (let n = Math.max(1, Math.ceil(tam / util) - 1); n <= Math.ceil(tam / PEDACO_MIN); n++) {
    // custo[k][i]: melhor soma com o k-esimo corte (0-based) no candidato i.
    const K = candidatos.length;
    // Desempate: pedacos de tamanho parecido (mesmo tempo de impressao, nada de tira).
    const ideal = tam / (n + 1);
    const desvio = (largura: number) => EQUILIBRIO * Math.abs(largura - ideal);
    const custo: number[][] = Array.from({ length: n }, () => new Array<number>(K).fill(Infinity));
    const de: number[][] = Array.from({ length: n }, () => new Array<number>(K).fill(-1));
    for (let i = 0; i < K; i++) if (candidatos[i]!.pos - ini + avanco <= limite) custo[0]![i] = candidatos[i]!.nota + desvio(candidatos[i]!.pos - ini);
    for (let k = 1; k < n; k++) {
      for (let i = 0; i < K; i++) {
        const ci = candidatos[i]!;
        for (let j = 0; j < i; j++) {
          const largura = ci.pos - candidatos[j]!.pos;
          if (largura < PEDACO_MIN || largura + avanco > limite || !Number.isFinite(custo[k - 1]![j]!)) continue;
          const c = custo[k - 1]![j]! + ci.nota + desvio(largura);
          if (c < custo[k]![i]!) { custo[k]![i] = c; de[k]![i] = j; }
        }
      }
    }
    let melhor = -1;
    const total = (i: number) => custo[n - 1]![i]! + desvio(fim - candidatos[i]!.pos);
    for (let i = 0; i < K; i++) {
      if (fim - candidatos[i]!.pos > limite || !Number.isFinite(custo[n - 1]![i]!)) continue;
      if (melhor < 0 || total(i) < total(melhor)) melhor = i;
    }
    if (melhor < 0) continue;
    const posicoes: number[] = [];
    for (let k = n - 1, i = melhor; k >= 0; k--) { posicoes.unshift(candidatos[i]!.pos); i = de[k]![i]!; }
    return posicoes;
  }
  return [];
}

/**
 * Os cortes para a peca caber na `mesa` (X e Y da maquina, menos a margem). Vazio se ja cabe.
 * Cortes so em linhas retas, de 1 em 1 mm.
 */
export function planejarCortes(part: Part, cfg: Params, mesa: Mesa, o: Partial<OpcoesEmenda> = {}): Corte[] {
  const opc = { ...EMENDA_PADRAO, ...o };
  const material = silhueta(part.layers);
  const b = regionBounds(material);
  const solida = ehSolida(part, cfg);
  const chapaImpressa = part.extras.some((e) => e.kind === 'stl');
  // Pedaco com dente (ou com o degrau da chapa) passa um pouco da linha.
  const avanco = solida ? AVANCO_DENTE : chapaImpressa ? opc.sobreposicaoChapa + opc.folga : 0;
  const borda = diffRegion(part.contorno, offsetRegion(part.contorno, 3));
  const proibidos = pontosProibidos(part, cfg);
  const lx = trechosGuardados(part.contorno, 'x'), ly = trechosGuardados(part.contorno, 'y');
  const evitar: Corte[] = [];
  const colunas = (ys: number[]) => cortesNoEixo('x', b.minX, b.maxX, mesa.x - opc.margem, avanco, (pos) => notaDoCorte({ eixo: 'x', pos }, material, borda, proibidos, ys, lx, evitar));
  const linhas = (xs: number[]) => cortesNoEixo('y', b.minY, b.maxY, mesa.y - opc.margem, avanco, (pos) => notaDoCorte({ eixo: 'y', pos }, material, borda, proibidos, xs, ly, evitar));
  // Colunas, linhas sabendo das colunas e as colunas de novo sabendo das linhas. Depois confere
  // no material de verdade: corte que solta pedacinho fica marcado para evitar e refaz.
  let melhor: { xs: number[]; ys: number[]; ruins: number } | null = null;
  for (let rodada = 0; rodada < 4; rodada++) {
    let xs = colunas([]);
    let ys = linhas(xs);
    if (xs.length && ys.length) {
      const xs2 = colunas(ys);
      if (xs2.join() !== xs.join()) { xs = xs2; ys = linhas(xs); }
    }
    const ruins = cortesQueSoltamPedacinho(material, b, xs, ys);
    if (!melhor || ruins.length < melhor.ruins) melhor = { xs, ys, ruins: ruins.length };
    if (!ruins.length) break;
    evitar.push(...ruins);
  }
  return [...melhor!.xs.map((pos) => ({ eixo: 'x' as const, pos })), ...melhor!.ys.map((pos) => ({ eixo: 'y' as const, pos }))];
}

/**
 * Recorta o material nas celulas dos cortes (sem dente) e devolve os cortes que encostam num
 * pedacinho: menor que PEDACINHO_AREA ou sem nenhum lado de PEDACINHO_LADO. Ilha pequena que ja
 * era do desenho (o pingo do i) nao encosta em corte e nao conta.
 */
function cortesQueSoltamPedacinho(material: Region, b: Bounds, xs: number[], ys: number[]): Corte[] {
  if (!xs.length && !ys.length) return [];
  const cx = [b.minX - 1, ...xs, b.maxX + 1], cy = [b.minY - 1, ...ys, b.maxY + 1];
  const out: Corte[] = [];
  for (let i = 0; i + 1 < cx.length; i++) {
    for (let j = 0; j + 1 < cy.length; j++) {
      for (const p of intersectRegion(material, retangulo(cx[i]!, cy[j]!, cx[i + 1]!, cy[j + 1]!))) {
        const r: Region = [p];
        const bb = regionBounds(r);
        if (regionArea(r) >= PEDACINHO_AREA && Math.max(bb.w, bb.h) >= PEDACINHO_LADO) continue;
        for (const x of xs) if (Math.abs(bb.minX - x) < 0.5 || Math.abs(bb.maxX - x) < 0.5) out.push({ eixo: 'x', pos: x });
        for (const y of ys) if (Math.abs(bb.minY - y) < 0.5 || Math.abs(bb.maxY - y) < 0.5) out.push({ eixo: 'y', pos: y });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Cortar
// ---------------------------------------------------------------------------

/**
 * O cortador de um corte: o lado de baixo (antes da linha) e, na peca solida, os dentes que
 * avancam para o lado de cima no meio dos trechos de material (longe dos outros cortes).
 */
function cortador(c: Corte, material: Region, solida: boolean, outros: Corte[]): Region {
  const base = antesDe(c);
  if (!solida) return base;
  const dentes: Region[] = [];
  // Perto de um corte do outro eixo nao vai dente (ficaria partido entre dois pedacos).
  const longeDosOutros = (v: number, rd: number) => outros.every((o) => o.eixo === c.eixo || Math.abs(o.pos - v) > rd * 2 + 3);
  for (const [a, b] of trechosNaLinha(material, c)) {
    const comp = b - a;
    if (comp <= TRECHO_MIN_DENTE) continue;
    const rd = Math.min(8, comp / 5);
    const n = Math.max(1, Math.floor(comp / PASSO_DENTE));
    for (let i = 0; i < n; i++) {
      const meio = a + ((i + 0.5) * comp) / n;
      if (!longeDosOutros(meio, rd)) continue;
      const dente = c.eixo === 'x'
        ? unir([circulo(c.pos + rd * 0.8, meio, rd), retangulo(c.pos - rd * 0.6, meio - rd / 2, c.pos + rd * 0.6, meio + rd / 2)])
        : unir([circulo(meio, c.pos + rd * 0.8, rd), retangulo(meio - rd / 2, c.pos - rd * 0.6, meio + rd / 2, c.pos + rd * 0.6)]);
      // So se o dente cabe no material do outro lado (senao sairia furado).
      if (regionArea(diffRegion(dente, offsetRegion(material, 0.8))) < 0.5) dentes.push(dente);
    }
  }
  return dentes.length ? unir([base, ...dentes]) : base;
}

interface Pilha {
  layers: Layer[];
  extras: Extra[];
}

/** Divide uma pilha numa linha: o que fica antes e o que fica depois (com a folga no encaixe). */
function partir(p: Pilha, c: Corte, cort: Region, folga: number, opc: OpcoesEmenda): [Pilha, Pilha] {
  const depoisCort = folga > 0 ? offsetRegion(cort, -folga) : cort;
  const antes: Pilha = { layers: [], extras: [] }, depois: Pilha = { layers: [], extras: [] };
  for (const l of p.layers) {
    const a = intersectRegion(l.region, cort), d = diffRegion(l.region, depoisCort);
    if (regionArea(a) > 1e-6) antes.layers.push({ ...l, region: a });
    if (regionArea(d) > 1e-6) depois.layers.push({ ...l, region: d });
  }
  for (const e of p.extras) {
    if (e.kind === 'cut') continue;
    const [ea, ed] = partirChapaImpressa(e, c, opc);
    if (ea) antes.extras.push(ea);
    if (ed) depois.extras.push(ed);
  }
  return [antes, depois];
}

/**
 * Chapa impressa em degrau: a metade de baixo do pedaco de antes avanca a sobreposicao alem da
 * linha; a de cima para na linha. O de depois e o complemento (com folga). Assim cada pedaco so
 * avanca para a frente, como o dente.
 */
function partirChapaImpressa(e: ExtraStl, c: Corte, opc: OpcoesEmenda): [ExtraStl | null, ExtraStl | null] {
  const s = opc.sobreposicaoChapa;
  const antes: Layer[] = [], depois: Layer[] = [];
  for (const l of e.layers) {
    const meio = (l.z0 + l.z1) / 2;
    const metades: [number, number, number][] = [[l.z0, meio, s], [meio, l.z1, 0]];
    for (const [z0, z1, desloca] of metades) {
      const cort = antesDe({ eixo: c.eixo, pos: c.pos + desloca });
      const a = intersectRegion(l.region, cort), d = diffRegion(l.region, offsetRegion(cort, -opc.folga));
      if (regionArea(a) > 1e-6) antes.push({ ...l, region: a, z0, z1 });
      if (regionArea(d) > 1e-6) depois.push({ ...l, region: d, z0, z1 });
    }
  }
  return [antes.length ? { ...e, layers: antes } : null, depois.length ? { ...e, layers: depois } : null];
}

/** Separa as ilhas soltas de uma pilha: cada ilha da silhueta vira um pedaco. */
function ilhas(p: Pilha): Pilha[] {
  const sil = silhueta(p.layers);
  if (sil.length <= 1) return p.layers.length ? [p] : [];
  return sil.map((poly) => {
    const area: Region = [{ outer: poly.outer, holes: [] }];
    return {
      layers: p.layers.flatMap((l) => { const r = intersectRegion(l.region, area); return regionArea(r) > 1e-6 ? [{ ...l, region: r }] : []; }),
      extras: p.extras.flatMap((e): Extra[] => {
        if (e.kind === 'cut') return [];
        const ls = e.layers.flatMap((l) => { const r = intersectRegion(l.region, area); return regionArea(r) > 1e-6 ? [{ ...l, region: r }] : []; });
        return ls.length ? [{ ...e, layers: ls }] : [];
      }),
    };
  });
}

// ---------------------------------------------------------------------------
// Tala, furos e numero (peca oca)
// ---------------------------------------------------------------------------

export interface PedacoDePeca {
  /** 1, 2, 3... na ordem de leitura (de cima para baixo, da esquerda para a direita). */
  indice: number;
  part: Part;
}

export interface Divisao {
  pedacos: PedacoDePeca[];
  /** Quantas emendas (trechos de material cortados): base do custo de montagem. */
  emendas: number;
  /** Parafusos M3 (um por furo da tala, que casa com o furo da tampa). */
  parafusos: number;
  avisos: string[];
}

/** A tala e impressa no mesmo material, a parte: sai como peca propria na placa. */
export const ehTala = (e: Extra): e is ExtraStl => e.kind === 'stl' && e.name.startsWith('tala');

/** Uma tala como peca de impressao, assentada em z=0 como foi desenhada. */
export function pecaDaTala(e: ExtraStl, base: Part): Part {
  return {
    layers: e.layers,
    extras: [],
    avisos: [],
    volume: volumeDe(e.layers),
    alturaZ: e.layers.reduce((m, l) => Math.max(m, l.z1), 0),
    orientacao: base.orientacao,
    contorno: silhueta(e.layers),
  };
}

/** Os pedacos juntos, na posicao do letreiro: e o que o viewport mostra da peca dividida. */
export function juntarPedacos(part: Part, div: Divisao): Part {
  const ps = div.pedacos.map((p) => p.part);
  return {
    layers: ps.flatMap((p) => p.layers),
    extras: ps.flatMap((p) => p.extras),
    avisos: [...new Set([...part.avisos, ...div.avisos, ...ps.flatMap((p) => p.avisos)])],
    volume: ps.reduce((v, p) => v + p.volume, 0),
    alturaZ: ps.reduce((m, p) => Math.max(m, p.alturaZ), 0),
    orientacao: part.orientacao,
    contorno: part.contorno,
  };
}

/** A tampa fechada que encosta na mesa (onde a tala apoia), se houver. */
const tampaDeBaixo = (layers: Layer[]): Layer | undefined => layers.find((l) => (l.role === 'face' || l.role === 'traseira') && l.z0 === 0);

/** Onde a cavidade comeca em Z (em cima da tampa de baixo, do bolsao de baixo ou do zero). */
function zDaCavidade(layers: Layer[]): number {
  const t = tampaDeBaixo(layers);
  if (t) return t.z1;
  const bolsao = layers.find((l) => l.role === 'bolsao' && l.z0 === 0);
  return bolsao ? bolsao.z1 : 0;
}

/** Altura da cavidade: ate a tampa de cima (ou o topo). */
function alturaDaCavidade(layers: Layer[], z0: number): number {
  const topo = layers.reduce((m, l) => Math.max(m, l.z1), 0);
  const tampaCima = layers.find((l) => (l.role === 'face' || l.role === 'traseira') && l.z1 === topo && l.z0 > 0);
  return (tampaCima ? tampaCima.z0 : topo) - z0;
}

/**
 * As talas de uma emenda na peca oca: para cada trecho da cavidade que a linha cruza, uma peca
 * em "L" (placa + pele na parede) do tamanho da cavidade naquele trecho, ±larguraTala da linha.
 */
/** Espessura da parede na peca oca: a parede mais o batente, quando ha chapa ou batente. */
const espessuraDaParede = (part: Part, cfg: Params) =>
  cfg.parede + (part.extras.length || part.layers.some((l) => l.role === 'bolsao' || l.role === 'batente') ? cfg.batente : 0);

function talasDoCorte(c: Corte, part: Part, cfg: Params, opc: OpcoesEmenda): { tala: ExtraStl; furos: Pt[] }[] {
  const espParede = espessuraDaParede(part, cfg);
  const cavidade = offsetRegion(part.contorno, espParede + opc.folgaTala);
  if (!cavidade.length) return [];
  const temTampa = !!tampaDeBaixo(part.layers);
  const z0 = zDaCavidade(part.layers);
  const alturaMax = alturaDaCavidade(part.layers, z0) - 1;
  const espPlaca = temTampa ? opc.espTala : 0;
  const alturaPele = Math.max(0, Math.min(opc.alturaTala, alturaMax - espPlaca));
  const zona = intersectRegion(cavidade, faixa(c, c.pos - opc.larguraTala, c.pos + opc.larguraTala));
  // Ao longo da linha, a tala vai em trechos de ate TALA_MAX (com 1 mm entre eles).
  const outro: Eixo = c.eixo === 'x' ? 'y' : 'x';
  const trechos = zona.flatMap((poly): Region[] => {
    const area: Region = [{ outer: poly.outer, holes: poly.holes }];
    const bb = regionBounds(area);
    const [u0, u1] = outro === 'y' ? [bb.minY, bb.maxY] : [bb.minX, bb.maxX];
    const n = Math.ceil((u1 - u0) / TALA_MAX);
    if (n <= 1) return [area];
    const passo = (u1 - u0) / n;
    return Array.from({ length: n }, (_, k) => intersectRegion(area, faixa({ eixo: outro, pos: 0 }, u0 + k * passo + (k ? 0.5 : 0), u0 + (k + 1) * passo - (k < n - 1 ? 0.5 : 0))))
      .flatMap((r) => r.map((p) => [{ outer: p.outer, holes: p.holes }]));
  });
  // Sem tampa, a tala e so a pele: cada tira que cruza a linha e uma tala.
  const pecas = temTampa ? trechos : trechos.flatMap((area) => diffRegion(area, offsetRegion(cavidade, opc.peleTala)).map((p): Region => [{ outer: p.outer, holes: p.holes }]));
  const out: { tala: ExtraStl; furos: Pt[] }[] = [];
  for (const area of pecas) {
    if (!trechosNaLinha(area, c).length) continue;
    const pele = temTampa ? diffRegion(area, offsetRegion(cavidade, opc.peleTala)) : area;
    const layers: Layer[] = [];
    const furos: Pt[] = [];
    let placa = area;
    if (temTampa && opc.parafusos) {
      // Dois furos, um de cada lado da emenda, no meio do trecho da cavidade.
      for (const [a, b] of trechosNaLinha(area, c)) {
        const meio = (a + b) / 2;
        for (const lado of [-1, 1]) {
          const u = c.pos + lado * opc.larguraTala * 0.55;
          const pt = c.eixo === 'x' ? { x: u, y: meio } : { x: meio, y: u };
          const furo = circulo(pt.x, pt.y, FURO_M3 / 2, 24);
          if (regionArea(diffRegion(offsetRegion(furo, -2.5), offsetRegion(area, 0))) < 0.01) { furos.push(pt); placa = diffRegion(placa, furo); }
        }
      }
    }
    if (espPlaca > 0) layers.push({ region: placa, z0: 0, z1: espPlaca, role: 'traseira' });
    if (alturaPele > 0 && pele.length) layers.push({ region: pele, z0: espPlaca, z1: espPlaca + alturaPele, role: 'parede' });
    if (!layers.length) continue;
    out.push({
      tala: { kind: 'stl', name: 'tala', label: 'Tala de emenda (cole por dentro, cruzando a emenda)', layers, material: 'mesmo', lado: 'traseira', montagem: { z: z0, ordem: 1 } },
      furos,
    });
  }
  return out;
}

/** Numero gravado: por dentro da tampa de baixo (oca) ou embaixo, espelhado (solida). */
function gravarNumero(layers: Layer[], texto: Region, solida: boolean): Layer[] {
  const alvo = solida ? layers.find((l) => l.z0 === 0) : tampaDeBaixo(layers);
  if (!alvo || alvo.z1 - alvo.z0 <= PROF_GRAVACAO + 0.4) return layers;
  const zCorte = solida ? alvo.z0 + PROF_GRAVACAO : alvo.z1 - PROF_GRAVACAO;
  const [zg0, zg1] = solida ? [alvo.z0, zCorte] : [zCorte, alvo.z1];
  const cheio = solida ? { ...alvo, z0: zCorte } : { ...alvo, z1: zCorte };
  const gravado = { ...alvo, region: diffRegion(alvo.region, texto), z0: zg0, z1: zg1 };
  return layers.flatMap((l) => (l === alvo ? [cheio, gravado] : [l]));
}

/**
 * Onde cabe o numero: um ponto no meio do material com folga para o texto. Devolve o texto ja
 * posicionado (e espelhado na solida, para ler olhando por baixo), ou null se nao couber.
 */
function posicionarNumero(layers: Layer[], solida: boolean, espParede: number, texto: (t: string, altura: number) => Region, rotulo: string): Region | null {
  const alvo = solida ? layers.find((l) => l.z0 === 0) : tampaDeBaixo(layers);
  if (!alvo) return null;
  // Na oca, o numero fica dentro da cavidade, longe da parede (que fica em cima da tampa).
  const onde = solida ? alvo.region : offsetRegion(alvo.region, espParede + 1);
  for (const altura of [10, 7, 5]) {
    const t = texto(rotulo, altura);
    if (!t.length) return null;
    const tb = regionBounds(t);
    const raio = Math.hypot(tb.w, tb.h) / 2 + 2;
    const pt = samplePointsInside(onde, raio, 1)[0];
    if (!pt) continue;
    const cx = (tb.minX + tb.maxX) / 2, cy = (tb.minY + tb.maxY) / 2;
    return t.map((p) => ({
      outer: (solida ? [...p.outer].reverse() : p.outer).map((q) => ({ x: pt.x + (solida ? cx - q.x : q.x - cx), y: pt.y + (q.y - cy) })),
      holes: p.holes.map((h) => (solida ? [...h].reverse() : h).map((q) => ({ x: pt.x + (solida ? cx - q.x : q.x - cx), y: pt.y + (q.y - cy) }))),
    }));
  }
  return null;
}

/** Ate onde, de cada lado da linha, a ponta que afina e da propria emenda, mm. */
const BANDA_DA_EMENDA = 8;

/**
 * O trecho fino esta fora da emenda? Parede cortada na diagonal sempre afina na ponta, na
 * linha de corte (e a tala cobre): so conta o que a abertura de um bico come longe dos cortes.
 */
function finoForaDaEmenda(contorno: Region, bico: number, cortes: Corte[]): boolean {
  const area = regionArea(contorno);
  const comido = diffRegion(contorno, offsetRegion(offsetRegion(contorno, bico, 'miter'), -bico, 'miter'));
  const bandas = unir(cortes.map((c) => faixa(c, c.pos - BANDA_DA_EMENDA, c.pos + BANDA_DA_EMENDA)));
  return regionArea(diffRegion(comido, bandas)) > area * 0.005;
}

function pecaDe(p: Pilha, base: Part): Part {
  return {
    layers: p.layers,
    extras: p.extras,
    avisos: [],
    volume: volumeDe(p.layers),
    alturaZ: p.layers.reduce((m, l) => Math.max(m, l.z1), 0),
    orientacao: base.orientacao,
    contorno: silhueta(p.layers),
  };
}

/**
 * Divide a peca nos `cortes`. Cada pedaco e uma peca normal (camadas, contorno, volume): mesa,
 * arranjo, custo e exportacao valem sem mudanca. A chapa cortada fica inteira no pedaco 1; as
 * talas vao como extras impressos do pedaco de antes de cada emenda.
 * `texto(rotulo, altura)` desenha o numero (a fonte vem de quem chama); sem ele, nao grava.
 */
export function dividirPeca(
  part: Part,
  cfg: Params,
  cortes: Corte[],
  o: Partial<OpcoesEmenda> = {},
  nome = '',
  texto?: (t: string, altura: number) => Region
): Divisao {
  const opc = { ...EMENDA_PADRAO, ...o };
  const avisos: string[] = [];
  if (!cortes.length) return { pedacos: [{ indice: 1, part }], emendas: 0, parafusos: 0, avisos };
  const solida = ehSolida(part, cfg);
  const material = silhueta(part.layers);
  const folgaCorpo = solida ? opc.folga : 0;
  const xs = [...new Set(cortes.filter((c) => c.eixo === 'x').map((c) => c.pos))].sort((a, b) => a - b).map((pos) => ({ eixo: 'x' as const, pos }));
  const ys = [...new Set(cortes.filter((c) => c.eixo === 'y').map((c) => c.pos))].sort((a, b) => a - b).map((pos) => ({ eixo: 'y' as const, pos }));
  const todos = [...xs, ...ys];

  // Talas e furos de parafuso: calculados na peca inteira, um conjunto por corte.
  const talas: { c: Corte; tala: ExtraStl; furos: Pt[] }[] = solida ? [] : todos.flatMap((c) => talasDoCorte(c, part, cfg, opc).map((t) => ({ c, ...t })));
  let pilha: Pilha = { layers: part.layers, extras: part.extras };
  // Furos M3 na tampa de baixo, nos mesmos pontos da tala.
  const furos = talas.flatMap((t) => t.furos);
  if (furos.length) {
    const tampa = tampaDeBaixo(pilha.layers);
    if (tampa) {
      const buracos = unir(furos.map((pt) => circulo(pt.x, pt.y, FURO_M3 / 2, 24)));
      pilha = { ...pilha, layers: pilha.layers.map((l) => (l === tampa ? { ...l, region: diffRegion(l.region, buracos) } : l)) };
    }
  }

  // Colunas (cortes em x), depois linhas (cortes em y) de cada coluna.
  const colunas: Pilha[] = [];
  let resto = pilha;
  for (const c of xs) {
    const [antes, depois] = partir(resto, c, cortador(c, material, solida, todos), folgaCorpo, opc);
    colunas.push(antes);
    resto = depois;
  }
  colunas.push(resto);
  const celulas: Pilha[] = colunas.flatMap((col) => {
    const linhas: Pilha[] = [];
    let r = col;
    for (const c of ys) {
      const [antes, depois] = partir(r, c, cortador(c, material, solida, todos), folgaCorpo, opc);
      linhas.push(antes);
      r = depois;
    }
    linhas.push(r);
    return linhas;
  });

  // Ilhas soltas viram pedacos; lascas somem com aviso.
  const pilhas = celulas.flatMap(ilhas).filter((p) => {
    const a = regionArea(silhueta(p.layers));
    if (a < LASCA) { if (a > 0.5) avisos.push(`Uma lasca de ${a.toFixed(0)} mm² saiu da emenda: mude o corte de lugar.`); return false; }
    return true;
  });

  // Ordem de leitura: de cima para baixo, da esquerda para a direita.
  const centro = (p: Pilha) => { const b = regionBounds(silhueta(p.layers)); return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }; };
  pilhas.sort((a, b) => { const ca = centro(a), cb = centro(b); return Math.abs(ca.y - cb.y) > 20 ? cb.y - ca.y : ca.x - cb.x; });

  // Cada tala vai no pedaco de antes da linha que encosta nela (a parede fica em volta da tala).
  const espParede = solida ? 0 : espessuraDaParede(part, cfg);
  const dono = talas.map(({ c, tala }) => {
    const antes = intersectRegion(silhueta(tala.layers), antesDe(c));
    return pilhas.findIndex((p) => regionArea(intersectRegion(offsetRegion(silhueta(p.layers), -(espParede + opc.folgaTala + 1)), antes)) > 0.1);
  });
  talas.forEach((_, k) => { if (dono[k]! < 0) avisos.push('Uma tala de emenda ficou sem pedaço: mude o corte de lugar.'); });
  const pedacos: PedacoDePeca[] = pilhas.map((p, i) => {
    const minhas = talas.filter((_, k) => dono[k] === i).map(({ tala }, k) => ({ ...tala, name: `tala-${i + 1}-${k + 1}` }));
    let layers = p.layers;
    if (opc.gravarNumero && texto) {
      const rotulo = `${nome ? `${nome}-` : ''}${i + 1}`;
      const t = posicionarNumero(layers, solida, espParede, texto, rotulo);
      if (t) layers = gravarNumero(layers, t, solida);
    }
    // A chapa cortada fica inteira, uma vez so (no pedaco 1).
    const peca = pecaDe({ layers, extras: [...(i === 0 ? part.extras.filter((e) => e.kind === 'cut') : []), ...p.extras, ...minhas] }, part);
    const esp = minThickness(peca.contorno);
    if (esp < cfg.bico * 2 && finoForaDaEmenda(peca.contorno, cfg.bico, todos)) {
      peca.avisos.push(`O pedaço ${i + 1} tem um trecho de ${esp.toFixed(1)} mm: mude o corte de lugar.`);
    }
    return { indice: i + 1, part: peca };
  });

  const chapa = part.extras.find((e) => e.kind === 'cut');
  if (chapa) {
    const b = regionBounds(chapa.region);
    if (Math.min(b.w, b.h) > 1220) avisos.push(`A chapa tem ${b.w.toFixed(0)} x ${b.h.toFixed(0)} mm: passa da chapa de 1220 mm de largura.`);
  }
  // Uma emenda por trecho do desenho que a linha cruza (oca ou solida, conta igual).
  const emendas = todos.reduce((n, c) => n + trechosNaLinha(part.contorno, c).length, 0);
  return { pedacos, emendas, parafusos: furos.length, avisos };
}
