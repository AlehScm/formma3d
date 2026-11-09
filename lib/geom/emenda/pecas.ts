/** Os pedacos prontos: tala, numero gravado, como cada um assenta na mesa, e juntar de novo. */
import { diffRegion, intersectRegion, offsetRegion, regionArea, regionBounds, type Pt, type Region } from '../region';
import type { Manifold, Mat4 } from 'manifold-3d';
import { malhaDasCamadas, samplePointsInside, type Extra, type ExtraStl, type Layer, type MetaDaPeca, type Papeis, type Papel, type Params, type Part } from '../modes';
import { comEscopo } from '../../malha/nucleo';
import { doMalha, paraMalha } from '../../malha/converter';
import { projecao } from '../../malha/solidos';
import { caixaDaMalha, juntarMalhas, volumeDaMalha } from '../../malha/tipos';
import { transformarMalha, type Matriz } from '../../malha/plano';
import type { Divisao, OpcoesEmenda } from './tipos';
import { FURO_M3, GRANDE, PROF_GRAVACAO, TALA_MAX } from './constantes';
import { circulo, escalar, espessuraDaParede, mais, menos, niveis, secaoEm, unir, zBase, zTopo } from './geometria';
import { faixaDaLinha, noDesenho, projetar, segmentosDe, trechosNosSegmentos } from './linha';
import { prismaComPapel, SOBRA_Z, type Divisor, type Pilha } from './cortar';

/** Peca impressa a parte que vai com o pedaco: tala, cavilha, borboleta ou pino. */
export const ehPecaSolta = (e: Extra): e is ExtraStl => e.kind === 'stl' && /^(tala|cavilha|borboleta|pino)/.test(e.name);

/** A peca com o fundo em z=0: a parte de cima de um corte na altura imprime com o corte na mesa. */
export function assentar(part: Part): Part {
  let p = part;
  if (part.paraImprimir) {
    // Parte de cima de um corte inclinado: deita com a face do corte na mesa.
    const malha = transformarMalha(part.malha, part.paraImprimir);
    const { paraImprimir: _, ...resto } = part;
    p = { ...resto, malha, contorno: comEscopo((m) => projecao(doMalha(m, malha))) };
  }
  const c = caixaDaMalha(p.malha);
  const z = c.min[2];
  if (!Number.isFinite(z) || (!part.paraImprimir && !(z > 1e-6))) return p;
  const pos = p.malha.pos.slice();
  for (let i = 2; i < pos.length; i += 3) pos[i] = pos[i]! - z;
  return {
    ...p,
    malha: { ...p.malha, pos },
    extras: p.extras.map((e) => ({ ...e, montagem: { ...e.montagem, z: e.montagem.z - z } })),
    alturaZ: c.max[2] - z,
  };
}

/** Uma peca solta como peca de impressao, assentada em z=0 como foi desenhada. */
export function pecaSolta(e: ExtraStl, base: Part): Part {
  return {
    malha: e.malha,
    papeis: e.papeis,
    extras: [],
    avisos: [],
    volume: volumeDaMalha(e.malha),
    alturaZ: Math.max(0, caixaDaMalha(e.malha).max[2]),
    orientacao: base.orientacao,
    contorno: comEscopo((m) => projecao(doMalha(m, e.malha))),
    meta: base.meta,
  };
}

/** Os pedacos juntos, na posicao do letreiro: e o que o viewport mostra da peca dividida. */
export function juntarPedacos(part: Part, div: Divisao): Part {
  const ps = div.pedacos.map((p) => p.part);
  return {
    malha: juntarMalhas(ps.map((p) => p.malha)),
    papeis: Object.assign({}, ...ps.map((p) => p.papeis)) as Papeis,
    extras: ps.flatMap((p) => p.extras),
    avisos: [...new Set([...part.avisos, ...div.avisos, ...ps.flatMap((p) => p.avisos)])],
    volume: ps.reduce((v, p) => v + p.volume, 0),
    alturaZ: ps.reduce((m, p) => Math.max(m, p.alturaZ), 0),
    orientacao: part.orientacao,
    contorno: part.contorno,
    meta: part.meta,
  };
}

/**
 * As talas de uma emenda na peca oca: para cada trecho da cavidade que a linha cruza, uma peca
 * em "L" (placa + pele na parede) do tamanho da cavidade naquele trecho, ±larguraTala da linha.
 */
export function talasDoCorte(linha: Pt[], part: Part, cfg: Params, opc: OpcoesEmenda): { tala: ExtraStl; furos: Pt[] }[] {
  const espParede = espessuraDaParede(part, cfg);
  const cavidade = offsetRegion(part.contorno, espParede + opc.folgaTala);
  if (!cavidade.length) return [];
  const temTampa = !!part.meta.tampaBaixo;
  const z0 = part.meta.zCavidade;
  const alturaMax = part.meta.alturaCavidade - 1;
  const espPlaca = temTampa ? opc.espTala : 0;
  const alturaPele = Math.max(0, Math.min(opc.alturaTala, alturaMax - espPlaca));
  const zona = intersectRegion(cavidade, faixaDaLinha(linha, opc.larguraTala));
  const segs = segmentosDe(linha);
  // Ao longo da linha, a tala vai em trechos de ate TALA_MAX (com 1 mm entre eles).
  const trechos = zona.flatMap((poly): Region[] => {
    const area: Region = [{ outer: poly.outer, holes: poly.holes }];
    const meio = poly.outer.reduce((m, p) => ({ x: m.x + p.x / poly.outer.length, y: m.y + p.y / poly.outer.length }), { x: 0, y: 0 });
    const s = projetar(meio, segs)?.s;
    if (!s) return [area];
    const us = poly.outer.map((p) => escalar(menos(p, s.o), s.t));
    const u0 = us.reduce((m, u) => Math.min(m, u), Infinity), u1 = us.reduce((m, u) => Math.max(m, u), -Infinity);
    const n = Math.ceil((u1 - u0) / TALA_MAX);
    if (n <= 1) return [area];
    const passo = (u1 - u0) / n;
    const tira = (a: number, b: number) => noDesenho([[a, -GRANDE], [b, -GRANDE], [b, GRANDE], [a, GRANDE]], s, 0);
    return Array.from({ length: n }, (_, k) => intersectRegion(area, tira(u0 + k * passo + (k ? 0.5 : 0), u0 + (k + 1) * passo - (k < n - 1 ? 0.5 : 0))))
      .flatMap((r) => r.map((p) => [{ outer: p.outer, holes: p.holes }]));
  });
  // Sem tampa, a tala e so a pele: cada tira que cruza a linha e uma tala.
  const pecas = temTampa ? trechos : trechos.flatMap((area) => diffRegion(area, offsetRegion(cavidade, opc.peleTala)).map((p): Region => [{ outer: p.outer, holes: p.holes }]));
  const out: { tala: ExtraStl; furos: Pt[] }[] = [];
  for (const area of pecas) {
    const cruzados = trechosNosSegmentos(area, segs);
    if (!cruzados.length) continue;
    const pele = temTampa ? diffRegion(area, offsetRegion(cavidade, opc.peleTala)) : area;
    const layers: Layer[] = [];
    const furos: Pt[] = [];
    let placa = area;
    if (temTampa && opc.parafusos) {
      // Dois furos, um de cada lado da emenda, no meio do trecho da cavidade.
      for (const { s, a, b } of cruzados) {
        for (const lado of [-1, 1]) {
          const pt = mais(mais(s.o, s.t, (a + b) / 2), s.n, lado * opc.larguraTala * 0.55);
          const furo = circulo(pt.x, pt.y, FURO_M3 / 2, 24);
          if (regionArea(diffRegion(offsetRegion(furo, -2.5), offsetRegion(area, 0))) < 0.01) { furos.push(pt); placa = diffRegion(placa, furo); }
        }
      }
    }
    if (espPlaca > 0) layers.push({ region: placa, z0: 0, z1: espPlaca, role: 'traseira' });
    if (alturaPele > 0 && pele.length) layers.push({ region: pele, z0: espPlaca, z1: espPlaca + alturaPele, role: 'parede' });
    if (!layers.length) continue;
    out.push({
      tala: { kind: 'stl', name: 'tala', label: 'Tala de emenda (cole por dentro, cruzando a emenda)', ...malhaDasCamadas(layers), material: 'mesmo', lado: 'traseira', montagem: { z: z0, ordem: 1 } },
      furos,
    });
  }
  return out;
}

/**
 * Grava o numero por dentro da tampa de baixo (oca) ou embaixo, espelhado (solida). Na solida
 * o alvo e a faixa de baixo do pedaco, ate onde o solido muda pela primeira vez.
 */
export function gravarNumero(x: Divisor, p: Pilha, solida: boolean, meta: MetaDaPeca, espParede: number, texto: (t: string, altura: number) => Region, rotulo: string): void {
  if (p.imprimir) {
    // Parte de cima de um corte inclinado: o numero vai na face do corte, que e o fundo dela na
    // mesa (como na parte de cima de um corte reto). Na oca nao ha tampa ali.
    if (!solida) return;
    const deitada = p.s.transform(p.imprimir.ida as Mat4);
    const z0 = zBase(deitada);
    const t = posicionarNumero(secaoEm(deitada, z0 + PROF_GRAVACAO + 0.4), true, espParede, texto, rotulo);
    if (t) p.s = p.s.subtract(prismaComPapel(x, t, z0 - SOBRA_Z, z0 + PROF_GRAVACAO, { role: 'corpo' }).transform(p.imprimir.volta as Mat4));
    return;
  }
  let alvo: { z0: number; z1: number; papel: Papel } | null = null;
  if (solida) {
    const [z0, z1] = niveis(p.s);
    if (z0 !== undefined && z1 !== undefined) alvo = { z0, z1, papel: { role: 'corpo' } };
  } else if (meta.tampaBaixo && Math.abs(zBase(p.s) - meta.tampaBaixo.z0) < 1e-6) {
    alvo = meta.tampaBaixo;
  }
  if (!alvo || alvo.z1 - alvo.z0 <= PROF_GRAVACAO + 0.4) return;
  const t = posicionarNumero(secaoEm(p.s, (alvo.z0 + alvo.z1) / 2), solida, espParede, texto, rotulo);
  if (!t) return;
  const [g0, g1] = solida ? [alvo.z0 - SOBRA_Z, alvo.z0 + PROF_GRAVACAO] : [alvo.z1 - PROF_GRAVACAO, alvo.z1 + SOBRA_Z];
  p.s = p.s.subtract(prismaComPapel(x, t, g0, g1, alvo.papel));
}

/**
 * Onde cabe o numero: um ponto no meio do material com folga para o texto. Devolve o texto ja
 * posicionado (e espelhado na solida, para ler olhando por baixo), ou null se nao couber.
 */
function posicionarNumero(regiao: Region, solida: boolean, espParede: number, texto: (t: string, altura: number) => Region, rotulo: string): Region | null {
  // Na oca, o numero fica dentro da cavidade, longe da parede (que fica em cima da tampa).
  const onde = solida ? regiao : offsetRegion(regiao, espParede + 1);
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
export function finoForaDaEmenda(contorno: Region, bico: number, linhas: Pt[][]): boolean {
  const area = regionArea(contorno);
  const comido = diffRegion(contorno, offsetRegion(offsetRegion(contorno, bico, 'miter'), -bico, 'miter'));
  const bandas = unir(linhas.map((l) => faixaDaLinha(l, BANDA_DA_EMENDA)));
  return regionArea(diffRegion(comido, bandas)) > area * 0.005;
}

export function pecaDe(x: Divisor, s: Manifold, extras: Extra[], base: Part, contorno: Region, imprimir?: Matriz): Part {
  return {
    malha: paraMalha(s),
    papeis: x.papeis,
    extras,
    avisos: [],
    volume: s.volume(),
    alturaZ: zTopo(s),
    orientacao: base.orientacao,
    contorno,
    meta: base.meta,
    ...(imprimir ? { paraImprimir: imprimir } : {}),
  };
}
