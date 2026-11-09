/**
 * Matriz da paridade camadas -> malha: as mesmas pecas e cortes. O motor de camadas foi medido
 * nela antes da migracao (scripts/dados/paridade-camadas.json); verificar-paridade mede o de
 * malha. Os cortes saem da caixa do contorno, entao valem para qualquer letra.
 */
import fs from 'fs';
import { parseFont, textToLetters } from '../lib/text/glyphs';
import { PRESETS, PARAMS_PADRAO, type Params, type PresetId } from '../lib/geom/modes';
import type { Corte, EmendaDoCorte } from '../lib/geom/emenda';
import { unionRegion, type Bounds, type Region } from '../lib/geom/region';

const carregar = (arq: string) => {
  const b = fs.readFileSync(arq);
  return parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};

export const FONTES = { anton: carregar('public/fontes/anton.ttf'), arial: carregar('C:/Windows/Fonts/arialbd.ttf') };
export const LETRAS = ['A', 'O', 'B', 'W', '8', 'g'];
export const ALTURA = 300;

/** O numero gravado em cada pedaco, como no editor. */
export const texto = (t: string, altura: number): Region =>
  textToLetters(FONTES.arial, t, { altura }).reduce<Region>((acc, l) => (acc.length ? unionRegion(acc, l.region) : l.region), []);

type Cortes = (b: Bounds, T: number) => Corte[];
const emY = (b: Bounds, f: number) => Math.round((b.minY + b.h * f) * 10) / 10;
const emX = (b: Bounds, f: number) => Math.round((b.minX + b.w * f) * 10) / 10;
const naY = (e: EmendaDoCorte): Cortes => (b) => [{ eixo: 'y', pos: emY(b, 0.37), emenda: e }];
const naAltura = (e: EmendaDoCorte): Cortes => (b, T) => [{ tipo: 'altura', z: Math.round(T / 2), emenda: e }];

const BASICOS: Record<string, Cortes> = {
  inteira: () => [],
  y: (b) => [{ eixo: 'y', pos: emY(b, 0.37) }],
  x: (b) => [{ eixo: 'x', pos: emX(b, 0.5) }],
  inclinado: (b) => [{ eixo: 'y', pos: emY(b, 0.43), angulo: 25 }],
  esboco: (b) => [{ tipo: 'esboco', pontos: [{ x: emX(b, 0.3), y: b.minY - 5 }, { x: emX(b, 0.3), y: emY(b, 0.5) }, { x: b.maxX + 5, y: emY(b, 0.5) }] }],
  altura: (b, T) => [{ tipo: 'altura', z: Math.round(T / 2) }],
  'x+altura': (b, T) => [{ eixo: 'x', pos: emX(b, 0.5) }, { tipo: 'altura', z: Math.round(T / 2) }],
};

const DA_MACICA: Record<string, Cortes> = {
  escondido: naY({ forma: 'escondido' }),
  cavilha: naY({ forma: 'cavilha' }),
  borboleta: naY({ forma: 'borboleta' }),
  degrau: naY({ forma: 'degrau' }),
  cola: naY({ forma: 'cola' }),
  andorinha: naY({ forma: 'dente', desenho: 'andorinha' }),
  triangulo: naY({ forma: 'dente', desenho: 'triangulo' }),
  reto: naY({ forma: 'dente', desenho: 'reto' }),
  inverter: naY({ inverter: true }),
  lugares: (b) => [{ eixo: 'y', pos: emY(b, 0.37), emenda: { lugares: [{ x: emX(b, 0.5), y: emY(b, 0.37) }] } }],
  'altura-pinoFixo': naAltura({ forma: 'pinoFixo' }),
  'altura-cola': naAltura({ forma: 'cola' }),
};

const DA_OCA: Record<string, Cortes> = {
  cola: naY({ forma: 'cola' }),
  'altura-pino': naAltura({ forma: 'pino' }),
};

export interface Caso {
  id: string;
  fonte: keyof typeof FONTES;
  letra: string;
  cfg: Params;
  cortes: Cortes;
}

const cfgDe = (estilo: PresetId, chanfro: boolean): Params => ({
  ...PARAMS_PADRAO,
  ...PRESETS[estilo].params,
  chanfro: { ...PARAMS_PADRAO.chanfro, ativo: chanfro },
});

export function casos(): Caso[] {
  const estilos: [PresetId, boolean, Record<string, Cortes>][] = [
    ['macica', false, DA_MACICA],
    ['macica', true, DA_MACICA],
    ['oca', false, DA_OCA],
    ['moldura_acm', false, DA_OCA],
    ['frontlit', false, {}],
    ['backlit', false, {}],
  ];
  const out: Caso[] = [];
  for (const fonte of Object.keys(FONTES) as (keyof typeof FONTES)[]) {
    for (const letra of LETRAS) {
      for (const [estilo, chanfro, extra] of estilos) {
        for (const [nome, cortes] of Object.entries({ ...BASICOS, ...extra })) {
          out.push({ id: `${fonte}:${letra}:${estilo}${chanfro ? '+chanfro' : ''}:${nome}`, fonte, letra, cfg: cfgDe(estilo, chanfro), cortes });
        }
      }
    }
  }
  return out;
}

export const letraDe = (c: Caso) => textToLetters(FONTES[c.fonte], c.letra, { altura: ALTURA })[0]!;

/** Alturas das fatias: fracoes que nao caem na troca de camada. */
export const FRACOES_FATIA = [0.06, 0.23, 0.41, 0.58, 0.77, 0.94];

export const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
