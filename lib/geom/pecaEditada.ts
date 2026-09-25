import { regionBounds, rotateRegion, scaleRegion, translateRegion, type Region } from './region';

/**
 * Transformacao que o usuario aplica a UMA peca no letreiro.
 *
 * Isto muda o PRODUTO, nao so a imagem: a chapa de ACM daquela letra, o gabarito
 * de instalacao, a colisao com as vizinhas, as gramas e o preco acompanham. Por
 * isso a edicao entra antes do `buildPart`, e nao na hora de desenhar.
 *
 * Nao confundir com o arranjo na placa (`lib/print/arranjo.ts`), que so acomoda a
 * peca na mesa da impressora e nao mexe no produto.
 */
export interface Edicao {
  /** Deslocamento em mm. */
  dx: number;
  dy: number;
  /** Giro em graus, em torno do centro da propria peca. */
  giro: number;
  /** Escala em cada eixo. 1 = tamanho original. */
  ex: number;
  ey: number;
}

export const SEM_EDICAO: Edicao = { dx: 0, dy: 0, giro: 0, ex: 1, ey: 1 };

export function edicaoVazia(e: Edicao | undefined): boolean {
  if (!e) return true;
  return e.dx === 0 && e.dy === 0 && e.giro === 0 && e.ex === 1 && e.ey === 1;
}

/** A escala mantem a proporcao? Decide se `minThickness` pode ser reaproveitada. */
export function escalaUniforme(e: Edicao): boolean {
  return Math.abs(e.ex - e.ey) < 1e-9;
}

/**
 * Aplica a edicao a uma regiao.
 *
 * Escala e giro acontecem em torno do centro do footprint, para a peca nao sair
 * do lugar so por ter mudado de tamanho; o deslocamento vem depois.
 */
export function aplicarEdicao(region: Region, e: Edicao): Region {
  if (!region.length || edicaoVazia(e)) return region;

  const b = regionBounds(region);
  const cx = b.minX + b.w / 2;
  const cy = b.minY + b.h / 2;

  let r = region;
  if (e.ex !== 1 || e.ey !== 1) {
    // scaleRegion escala em torno da ORIGEM: levar ao centro, escalar, voltar.
    r = translateRegion(scaleRegion(translateRegion(r, -cx, -cy), e.ex, e.ey), cx, cy);
  }
  if (e.giro !== 0) r = rotateRegion(r, e.giro, cx, cy);
  if (e.dx !== 0 || e.dy !== 0) r = translateRegion(r, e.dx, e.dy);
  return r;
}
