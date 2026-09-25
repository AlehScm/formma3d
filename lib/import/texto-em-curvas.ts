import type { Font } from 'opentype.js';
import { regionBounds, type Pt } from '../geom/region';
import { pathToContours } from '../text/glyphs';
import type { ObjetoBruto } from './pdf-ops';
import type { TextoVivo } from './ai-texto';

/**
 * Texto vivo + fonte -> contornos, no mesmo formato de qualquer outro objeto do
 * desenho. Daqui para frente o texto e desenho como os outros: separa em pecas,
 * vai para a mesa, ganha chapa e preco.
 *
 * Tudo em mm: os glifos sao gerados no corpo em mm, porque a tolerancia de curva
 * de `pathToContours` foi calibrada em mm.
 */
export function textoEmObjetos(t: TextoVivo, fonte: Font, idInicial = 0): ObjetoBruto[] {
  const escala = t.tamanhoMm / fonte.unitsPerEm;
  const extra = (t.tracking / 1000) * t.tamanhoMm;
  const objetos: ObjetoBruto[] = [];

  t.texto.split('\n').forEach((linha, n) => {
    const glifos = fonte.stringToGlyphs(linha);

    // Avancos primeiro: o alinhamento precisa da largura da linha antes de desenhar.
    const xs: number[] = [];
    let pena = 0;
    glifos.forEach((g, k) => {
      xs.push(pena);
      pena += (g.advanceWidth ?? 0) * escala + extra;
      const prox = glifos[k + 1];
      if (prox) pena += fonte.getKerningValue(g, prox) * escala;
    });
    const largura = pena * t.escalaH;
    const inicio = t.alinhamento === 'centro' ? -largura / 2 : t.alinhamento === 'direita' ? -largura : 0;
    const base = t.y - n * t.entrelinhaMm;

    glifos.forEach((g, k) => {
      const contornos = pathToContours(g.getPath(xs[k]!, 0, t.tamanhoMm));
      if (!contornos.length) return; // espaco
      // A escala horizontal do Illustrator estica o glifo e o avanco em torno da origem.
      const pts = contornos.map((c) =>
        c.map((p): Pt => ({ x: t.x + inicio + p.x * t.escalaH, y: base + p.y }))
      );
      objetos.push({
        id: idInicial + objetos.length,
        contours: pts.map((p) => ({ pts: p, closed: true })),
        paint: 'fill',
        // Glifo TrueType/CFF: o miolo vem com sentido oposto, entao nonzero da o buraco.
        fillRule: 'nonzero',
        larguraMm: 0.2,
        capRound: false,
        clip: null,
        camada: null,
        bounds: regionBounds(pts.map((outer) => ({ outer, holes: [] }))),
      });
    });
  });

  return objetos;
}

/** Nome que o arquivo guarda para a fonte, reduzido para comparar com o do sistema. */
export function chaveFonte(nome: string): string {
  return nome.toLowerCase().replace(/[^a-z0-9]/g, '');
}
