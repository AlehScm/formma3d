/** Onde cortar: os cortes retos em X e Y que fazem a peca caber na mesa. */
import { diffRegion, intersectRegion, offsetRegion, regionArea, regionBounds, type Bounds, type Pt, type Region } from '../region';
import type { Params, Part } from '../modes';
import type { Corte, CorteNaAltura, Eixo, Mesa, OpcoesEmenda, Reta } from './tipos';
import { AVANCO_DENTE, EMENDA_PADRAO, EQUILIBRIO, FUNDO_BOM, PEDACINHO_AREA, PEDACINHO_LADO, PEDACO_MIN, RAIO_EVITAR, TRECHO_MIN } from './constantes';
import { ehSolida, espessuraDaParede, retangulo, silhueta, somaTrechos, trechosNaLinha, zonaMacica } from './geometria';

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

function notaDoCorte(c: Reta, material: Region, borda: Region, proibidos: { p: Pt; r: number }[], outros: number[], linha: (pos: number) => [number, number][], evitar: Reta[]): number {
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

/** Cortes na altura para a peca caber no Z da mesa: partes iguais, de 1 em 1 mm. */
function alturasParaCaber(part: Part, mesa: Mesa): CorteNaAltura[] {
  const H = part.alturaZ;
  if (!mesa.z || H <= mesa.z) return [];
  const n = Math.ceil(H / (mesa.z - 1));
  return Array.from({ length: n - 1 }, (_, i) => ({ tipo: 'altura' as const, z: Math.round((H * (i + 1)) / n) }));
}

/**
 * Os cortes para a peca caber na `mesa` (X e Y da maquina, menos a margem, e o Z). Vazio se ja
 * cabe. Cortes so em linhas retas e na altura, de 1 em 1 mm.
 */
export function planejarCortes(part: Part, cfg: Params, mesa: Mesa, o: Partial<OpcoesEmenda> = {}): Corte[] {
  const opc = { ...EMENDA_PADRAO, ...o };
  const material = silhueta(part);
  const b = regionBounds(material);
  const solida = ehSolida(part, cfg);
  const chapaImpressa = part.extras.some((e) => e.kind === 'stl');
  // Pedaco com dente (ou com o degrau da chapa) passa um pouco da linha. Na oca, o traco fino
  // leva dente pequeno (raio ate 4).
  const fino = !solida && regionArea(zonaMacica(part, espessuraDaParede(part, cfg))) > 1 ? 8 : 0;
  const avanco = solida ? AVANCO_DENTE : Math.max(fino, chapaImpressa ? opc.sobreposicaoChapa + opc.folga : 0);
  const borda = diffRegion(part.contorno, offsetRegion(part.contorno, 3));
  const proibidos = part.meta.proibidos;
  const lx = trechosGuardados(part.contorno, 'x'), ly = trechosGuardados(part.contorno, 'y');
  const evitar: Reta[] = [];
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
  return [...melhor!.xs.map((pos) => ({ eixo: 'x' as const, pos })), ...melhor!.ys.map((pos) => ({ eixo: 'y' as const, pos })), ...alturasParaCaber(part, mesa)];
}

/**
 * Recorta o material nas celulas dos cortes (sem dente) e devolve os cortes que encostam num
 * pedacinho: menor que PEDACINHO_AREA ou sem nenhum lado de PEDACINHO_LADO. Ilha pequena que ja
 * era do desenho (o pingo do i) nao encosta em corte e nao conta.
 */
function cortesQueSoltamPedacinho(material: Region, b: Bounds, xs: number[], ys: number[]): Reta[] {
  if (!xs.length && !ys.length) return [];
  const cx = [b.minX - 1, ...xs, b.maxX + 1], cy = [b.minY - 1, ...ys, b.maxY + 1];
  const out: Reta[] = [];
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
