/**
 * Geometria do design: cada elemento vira a area real em mm (o mesmo contorno que a tela
 * desenha e que vira 3D), cada camada e a uniao dos seus elementos, e as camadas de
 * contorno acompanham a camada de origem (offset para fora), fundindo onde encostam.
 */
import type { Font } from 'opentype.js';
import { diffRegion, offsetRegion, regionArea, regionBounds, rotateRegion, scaleRegion, translateRegion, type Bounds, type Region } from '@/lib/geom/region';
import { circulo, comporLinhas, contornar, coracao, estrela, retanguloArredondado, unir } from '@/lib/gerador/formas';
import { elipse, floco, osso, pata, regular } from '@/lib/gerador/figuras';
import { qrParaRegiao } from '@/lib/gerador/qr';
import type { CamadaDesign, Design, Elemento, FormaId } from './documento';

export type Fontes = (id: string) => Font | undefined;

/** Espessura minima que o bico imprime bem, mm. */
export const LINHA_MINIMA = 0.4;

function forma(f: FormaId, w: number): Region {
  switch (f) {
    case 'circulo': return circulo(0, 0, w / 2, 96);
    case 'quadrado': return retanguloArredondado(0, 0, w, w, 0);
    case 'retangulo': return retanguloArredondado(0, 0, w, w * 0.6, w * 0.08);
    case 'coracao': return coracao(w);
    case 'estrela': return estrela(w);
    case 'hexagono': return regular(6, w);
    case 'floco': return floco(w, Math.max(1.6, w * 0.06));
    case 'pata': return pata(w);
    case 'osso': return osso(w);
    case 'nuvem': return unir([elipse(w * 0.55, w * 0.42), translateRegion(elipse(w * 0.5, w * 0.36), -w * 0.24, -w * 0.06), translateRegion(elipse(w * 0.5, w * 0.36), w * 0.24, -w * 0.06), translateRegion(retanguloArredondado(0, -w * 0.13, w * 0.86, w * 0.2, w * 0.1), 0, 0)]);
  }
}

/** O que muda a forma do elemento (mover/girar/escalar nao): chave do cache da geometria local. */
function chaveConteudo(el: Elemento, fontes: Fontes): string {
  switch (el.tipo) {
    case 'texto': return `t|${el.fonte}|${fontes(el.fonte) ? 1 : 0}|${el.altura}|${el.espacamento ?? 1}|${el.texto}`;
    case 'forma': return `f|${el.forma}|${el.largura}`;
    case 'desenho': return `d|${el.id}|${el.regiao.length}`;
    case 'qr': return `q|${el.largura}|${el.conteudo}`;
  }
}

// Compor texto e QR custa; arrastar so muda a posicao. Guarda as ultimas formas locais.
const CACHE_LOCAL = new Map<string, Region>();
const LIMITE_CACHE = 300;

/** A area do elemento antes de mover/girar/escalar, centrada em (0, 0). */
export function regiaoLocal(el: Elemento, fontes: Fontes): Region {
  const k = chaveConteudo(el, fontes);
  const pronta = CACHE_LOCAL.get(k);
  if (pronta) return pronta;
  const r = calcularLocal(el, fontes);
  CACHE_LOCAL.set(k, r);
  if (CACHE_LOCAL.size > LIMITE_CACHE) CACHE_LOCAL.delete(CACHE_LOCAL.keys().next().value!);
  return r;
}

function calcularLocal(el: Elemento, fontes: Fontes): Region {
  switch (el.tipo) {
    case 'texto': {
      const fonte = fontes(el.fonte);
      if (!fonte || !el.texto.trim()) return [];
      const linhas = el.texto.split('\n').map((texto) => ({ texto, fonte, altura: el.altura, espacamento: el.espacamento ?? 1 }));
      return comporLinhas(linhas, el.altura * 0.35).regiao;
    }
    case 'forma': return forma(el.forma, el.largura);
    case 'desenho': return el.regiao;
    case 'qr':
      if (!el.conteudo.trim()) return [];
      try {
        return qrParaRegiao(el.conteudo, el.largura, 0.4).regiao;
      } catch {
        return [];
      }
  }
}

/** Engrossar, espelhar, escalar e girar em torno do centro, depois levar para (x, y). */
export function transformar(r: Region, el: Pick<Elemento, 'x' | 'y' | 'giro' | 'escalaX' | 'escalaY' | 'espelhar' | 'engrossar'>): Region {
  if (!r.length) return r;
  let out = el.engrossar ? contornar(r, el.engrossar) : r;
  const sx = el.escalaX * (el.espelhar ? -1 : 1);
  if (sx !== 1 || el.escalaY !== 1) out = scaleRegion(out, sx, el.escalaY);
  if (el.giro) out = rotateRegion(out, el.giro);
  return translateRegion(out, el.x, el.y);
}

export const regiaoDoElemento = (el: Elemento, fontes: Fontes): Region => transformar(regiaoLocal(el, fontes), el);

/**
 * Caixa do elemento sem o giro (no referencial dele), para as alcas: largura e altura ja
 * escaladas, centro no (x, y). A tela desenha a caixa girada.
 */
export function caixaDoElemento(el: Elemento, fontes: Fontes): { w: number; h: number } {
  const r = regiaoLocal(el, fontes);
  if (!r.length) return { w: 10, h: 10 };
  const b = regionBounds(el.engrossar ? contornar(r, el.engrossar) : r);
  return { w: b.w * Math.abs(el.escalaX), h: b.h * Math.abs(el.escalaY) };
}

/**
 * A area de cada camada: desenhada = uniao dos elementos visiveis dela; contorno = a camada
 * de origem dilatada pela folga (mais os elementos proprios, se tiver). Resolve em ordem de
 * dependencia; contorno circular vira vazio.
 */
export function regioesDasCamadas(d: Design, fontes: Fontes, cache = new Map<string, Region>()): Map<string, Region> {
  const porId = new Map(d.camadas.map((c) => [c.id, c]));
  const elementos = new Map<string, Region>();
  for (const el of d.elementos) {
    if (el.oculto) continue;
    const r = regiaoDoElemento(el, fontes);
    if (!r.length) continue;
    elementos.set(el.camadaId, unir([elementos.get(el.camadaId) ?? [], r]));
  }
  const calculando = new Set<string>();
  const resolver = (c: CamadaDesign): Region => {
    const pronta = cache.get(c.id);
    if (pronta) return pronta;
    if (calculando.has(c.id)) return [];
    calculando.add(c.id);
    const proprios = elementos.get(c.id) ?? [];
    let r = proprios;
    if (c.origem !== 'desenhada') {
      const origem = porId.get(c.origem.contornoDe);
      const base = origem ? resolver(origem) : [];
      r = unir([base.length ? contornar(base, c.origem.folgaMm) : [], proprios]);
    }
    calculando.delete(c.id);
    cache.set(c.id, r);
    return r;
  };
  for (const c of d.camadas) resolver(c);
  return cache;
}

/** Limites de tudo o que esta visivel (para enquadrar a tela e a previa). */
export function limitesDoDesign(regioes: Map<string, Region>): Bounds | null {
  const tudo = [...regioes.values()].flat();
  return tudo.length ? regionBounds(tudo) : null;
}

/**
 * Trechos mais finos que `minimo` mm: o que some numa abertura morfologica (encolhe e
 * volta). Vazio = pronto para imprimir.
 */
export function trechosFinos(r: Region, minimo = LINHA_MINIMA): Region {
  if (!r.length) return [];
  const raio = minimo / 2;
  const aberta = offsetRegion(offsetRegion(r, raio, 'miter'), -raio, 'miter');
  const finos = diffRegion(r, aberta);
  // migalhas de arredondamento do clipper nao contam
  return finos.filter((p) => regionArea([p]) > minimo * minimo * 0.25);
}
