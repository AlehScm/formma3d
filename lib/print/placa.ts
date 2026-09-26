import { regionBounds, type Region } from '../geom/region';
import type { Colocada } from './arranjo';

/**
 * Monta a placa: cada peca na posicao que o arranjo decidiu, em coordenadas da
 * mesa (0..M.x, 0..M.y), prontas para virar um arquivo so.
 *
 * A conta e a mesma do arranjo e do 3D (ver `features/viewport/referencial.ts`):
 * girar em torno do centro do FOOTPRINT da peca e transladar por `d`. Tem de ser a
 * mesma, senao o que sai no arquivo e diferente do que aparece na tela.
 */

export interface PecaPlaca {
  chave: string;
  nome: string;
  /** Sopa de triangulos no referencial em que o `contorno` foi medido. */
  posicoes: Float32Array;
  /** Footprint usado pelo arranjo, no mesmo referencial das posicoes. */
  contorno: Region;
}

export interface ObjetoPlaca {
  nome: string;
  posicoes: Float32Array;
}

export function montarPlaca(pecas: PecaPlaca[], colocadas: Colocada[]): ObjetoPlaca[] {
  const objs: ObjetoPlaca[] = [];
  for (const c of colocadas) {
    const p = pecas.find((x) => x.chave === c.nome);
    if (!p) continue;
    const b = regionBounds(p.contorno);
    const cx = b.minX + b.w / 2;
    const cy = b.minY + b.h / 2;
    const r = (c.giro * Math.PI) / 180;
    const cos = Math.cos(r);
    const sen = Math.sin(r);
    const out = new Float32Array(p.posicoes.length);
    for (let i = 0; i < out.length; i += 3) {
      const x = p.posicoes[i]! - cx;
      const y = p.posicoes[i + 1]! - cy;
      out[i] = cx + c.dx + x * cos - y * sen;
      out[i + 1] = cy + c.dy + x * sen + y * cos;
      out[i + 2] = p.posicoes[i + 2]!;
    }
    objs.push({ nome: p.nome, posicoes: out });
  }
  return objs;
}

/** Todas as pecas da placa numa sopa so: e o "STL com os objetos juntos". */
export function juntar(objs: ObjetoPlaca[]): Float32Array {
  const total = objs.reduce((a, o) => a + o.posicoes.length, 0);
  const out = new Float32Array(total);
  let i = 0;
  for (const o of objs) {
    out.set(o.posicoes, i);
    i += o.posicoes.length;
  }
  return out;
}
