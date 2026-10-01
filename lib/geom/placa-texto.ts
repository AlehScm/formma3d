import type { Font } from 'opentype.js';
import type * as THREE from 'three';
import { normalizeLetters, textToLetters } from '../text/glyphs';
import { layerToGeometry } from './extrude';
import { regionBounds, translateRegion, type Bounds, type Region } from './region';
import type { Placa3D } from './placa';

export interface LetraPlaca3D {
  nome: string;
  region: Region;
  boundsMontagem: Bounds;
  geometry: THREE.BufferGeometry;
}

export interface TextoPlaca3D {
  letras: LetraPlaca3D[];
  boundsMontagem: Bounds;
}

/**
 * Prepara glifos nas coordenadas de montagem da placa. Esse posicionamento nao
 * define o arranjo na mesa de impressao nem as posicoes do arquivo exportado.
 */
export function prepararTextoPlaca(
  placa: Placa3D,
  font: Font,
  texto: string,
  altura: number,
  tracking: number,
  espessura: number
): TextoPlaca3D {
  if (typeof texto !== 'string' || !texto.trim()) throw new RangeError('Texto vazio: informe ao menos uma letra com contorno');
  for (const [nome, valor] of Object.entries({ altura, tracking, espessura })) {
    if (typeof valor !== 'number' || !Number.isFinite(valor)) throw new RangeError(`${nome} deve ser um numero finito`);
  }
  if (altura <= 0 || espessura <= 0) throw new RangeError('Altura e espessura da letra devem ser maiores que zero');

  const letrasBase = normalizeLetters(textToLetters(font, texto, { altura, tracking }));
  if (!letrasBase.length) throw new RangeError('Texto sem contornos: escolha letras com area preenchida');

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const letra of letrasBase) {
    minX = Math.min(minX, letra.bounds.minX);
    minY = Math.min(minY, letra.bounds.minY);
    maxX = Math.max(maxX, letra.bounds.maxX);
    maxY = Math.max(maxY, letra.bounds.maxY);
  }
  const larguraTexto = maxX - minX;
  const alturaTexto = maxY - minY;
  if (larguraTexto > placa.areaUtil.w + 1e-6 || alturaTexto > placa.areaUtil.h + 1e-6) {
    throw new RangeError(`Texto nao cabe na area util (${larguraTexto.toFixed(2)} x ${alturaTexto.toFixed(2)} mm)`);
  }

  const dx = placa.areaUtil.minX + (placa.areaUtil.w - larguraTexto) / 2;
  const dy = placa.areaUtil.minY + (placa.areaUtil.h - alturaTexto) / 2;
  const letras = letrasBase.map((letra) => {
    const region = translateRegion(letra.region, dx, dy);
    const boundsMontagem = regionBounds(region);
    const geometry = layerToGeometry({ region, z0: 0, z1: espessura });
    if (!geometry) throw new Error(`Falha ao gerar geometria da letra "${letra.nome}"`);
    return { nome: letra.nome, region, boundsMontagem, geometry };
  });
  return {
    letras,
    boundsMontagem: {
      minX: minX + dx,
      minY: minY + dy,
      maxX: maxX + dx,
      maxY: maxY + dy,
      w: larguraTexto,
      h: alturaTexto,
    },
  };
}
