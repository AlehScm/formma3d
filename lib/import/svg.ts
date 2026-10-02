/**
 * SVG -> Region: as areas preenchidas viram area; os tracos (com ou sem preenchimento)
 * viram faixa da largura do traco (como o "Expandir" do Illustrator). Y vira para cima.
 * Usa o SVGLoader do three, que precisa de DOMParser (navegador).
 */
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { buildRegion, diffRegion, strokeToRegion, unionRegion, type Pt, type Region } from '../geom/region';
import { ErroImport } from './erro';

const PONTOS_POR_CURVA = 12;

export function svgParaRegiao(texto: string): Region {
  let dados;
  try {
    dados = new SVGLoader().parse(texto);
  } catch {
    throw new ErroImport('Não consegui ler este SVG.');
  }
  const virar = (p: { x: number; y: number }): Pt => ({ x: p.x, y: -p.y });
  let regiao: Region = [];
  for (const path of dados.paths) {
    const estilo = (path.userData?.style ?? {}) as { fill?: string; stroke?: string; strokeWidth?: number; strokeLineCap?: string };
    const preenche = estilo.fill !== 'none' && estilo.fill !== 'transparent';
    let parte: Region = [];
    if (preenche) {
      for (const forma of SVGLoader.createShapes(path)) {
        const { shape, holes } = forma.extractPoints(PONTOS_POR_CURVA);
        const fora = buildRegion([shape.map(virar)]);
        const furos = holes.length ? buildRegion(holes.map((h) => h.map(virar))) : [];
        parte = unionRegion(parte, furos.length ? diffRegion(fora, furos) : fora);
      }
    }
    // Traco conta tambem quando ha preenchimento (contorno grosso em volta da forma).
    if (estilo.stroke && estilo.stroke !== 'none' && estilo.stroke !== 'transparent') {
      const contornos = path.subPaths.map((s) => ({ pts: s.getPoints(PONTOS_POR_CURVA).map(virar), closed: s.autoClose }));
      parte = unionRegion(parte, strokeToRegion(contornos, Number(estilo.strokeWidth) || 1, estilo.strokeLineCap === 'round'));
    }
    regiao = unionRegion(regiao, parte);
  }
  if (!regiao.length) throw new ErroImport('O SVG não tem nenhuma área preenchida nem traço.');
  return regiao;
}
