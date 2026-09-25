import { regionBounds, type Region } from '@/lib/geom/region';
import type { Colocada } from '@/lib/print/arranjo';

/**
 * Onde cada peca aparece na cena quando o 3D mostra a placa.
 *
 * Tres referenciais se encontram aqui, e confundi-los tirava as pecas de cima da
 * placa em silencio -- os numeros do arranjo estavam certos, o desenho nao:
 *   - letreiro: as Region tem posicao absoluta; o grupo das pecas e deslocado por
 *     -C (centro do letreiro) para o letreiro ficar no meio da cena;
 *   - placa: onde `arrumar` trabalha, de (0,0) a (M.x, M.y);
 *   - cena: a placa e desenhada centrada na origem, de -M/2 a +M/2.
 *
 * Cada peca e desenhada girando em torno do centro c do proprio footprint e
 * transladada por d. Um ponto p da peca vai para:  -C + c + d + R(p - c).
 *
 * Peca colocada: o ponto da placa q = c + a.d + R(p - c) deve ir para q - M/2,
 *   logo d = a.d + C - M/2.
 * Peca que sobrou: centro do footprint no alvo T ao lado da placa, logo
 *   d = T + C - c.
 *
 * Puro (sem React/three) para ser testado: `scripts/verificar-referencial.mts`.
 */

export interface Deslocamento {
  dx: number;
  dy: number;
  giro: number;
}

export interface PecaReferencial {
  chave: string;
  contorno: Region;
}

export function deslocamentosNaPlaca(
  pecas: PecaReferencial[],
  arranjo: ReadonlyMap<string, Colocada>,
  sobraram: readonly string[],
  mesa: { x: number; y: number },
  centro: [number, number]
): Map<string, Deslocamento> {
  const m = new Map<string, Deslocamento>();
  const [cx, cy] = centro;

  for (const [chave, a] of arranjo) {
    m.set(chave, { dx: a.dx + cx - mesa.x / 2, dy: a.dy + cy - mesa.y / 2, giro: a.giro });
  }

  // "O que ficar de fora fica ali no 3D, mas fora da placa": em colunas a direita.
  const folga = 20;
  let x0 = mesa.x / 2 + 40;
  let topo = mesa.y / 2;
  let largura = 0;
  for (const chave of sobraram) {
    if (m.has(chave)) continue;
    const p = pecas.find((x) => x.chave === chave);
    if (!p) continue;
    const b = regionBounds(p.contorno);
    // Coluna cheia: abre outra ao lado, para a fila nao descer para longe da placa.
    if (topo - b.h < -mesa.y / 2 && topo < mesa.y / 2) {
      x0 += largura + folga;
      topo = mesa.y / 2;
      largura = 0;
    }
    const tx = x0 + b.w / 2;
    const ty = topo - b.h / 2;
    m.set(chave, { dx: tx + cx - (b.minX + b.w / 2), dy: ty + cy - (b.minY + b.h / 2), giro: 0 });
    topo -= b.h + folga;
    largura = Math.max(largura, b.w);
  }
  return m;
}

/** Desfaz o referencial: posicao efetiva na cena + delta do gizmo -> coordenadas da placa. */
export function paraCoordenadasDaPlaca(
  chave: string,
  efetivo: Deslocamento,
  delta: Deslocamento,
  mesa: { x: number; y: number },
  centro: [number, number]
): Colocada {
  return {
    nome: chave,
    dx: efetivo.dx + delta.dx - centro[0] + mesa.x / 2,
    dy: efetivo.dy + delta.dy - centro[1] + mesa.y / 2,
    giro: efetivo.giro + delta.giro,
  };
}
