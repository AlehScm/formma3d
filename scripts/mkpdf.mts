/**
 * Gerador de PDF minimo para teste, sem dependencia nenhuma.
 * Permite exercitar o extrator com operadores exatos e medidas conhecidas,
 * sem depender de um .ai de cliente.
 */

export interface XObjDef {
  matriz: number[];
  bbox: number[];
  stream: string;
}

export interface PdfOpts {
  mediaBox?: [number, number, number, number];
  rotate?: number;
  xobjects?: Record<string, XObjDef>;
}

export function pdfMinimo(conteudo: string, opts: PdfOpts = {}): Uint8Array {
  const mb = opts.mediaBox ?? [0, 0, 595, 842];
  const xo = opts.xobjects ?? {};
  const nomes = Object.keys(xo);

  const objs: string[] = [];
  // 1 catalogo, 2 pages, 3 page, 4 contents, 5+ xobjects
  const idXObj: Record<string, number> = {};
  nomes.forEach((n, i) => (idXObj[n] = 5 + i));

  const recursos = nomes.length
    ? `/Resources<</XObject<<${nomes.map((n) => `/${n} ${idXObj[n]} 0 R`).join('')}>>>>`
    : '/Resources<<>>';

  objs[0] = '<</Type/Catalog/Pages 2 0 R>>';
  objs[1] = '<</Type/Pages/Kids[3 0 R]/Count 1>>';
  objs[2] =
    `<</Type/Page/Parent 2 0 R/MediaBox[${mb.join(' ')}]` +
    (opts.rotate ? `/Rotate ${opts.rotate}` : '') +
    `${recursos}/Contents 4 0 R>>`;
  objs[3] = `<</Length ${conteudo.length}>>\nstream\n${conteudo}\nendstream`;
  nomes.forEach((n) => {
    const d = xo[n]!;
    objs[idXObj[n]! - 1] =
      `<</Type/XObject/Subtype/Form/FormType 1/BBox[${d.bbox.join(' ')}]` +
      `/Matrix[${d.matriz.join(' ')}]/Resources<<>>/Length ${d.stream.length}>>\n` +
      `stream\n${d.stream}\nendstream`;
  });

  // Monta em bytes acumulando offsets reais: o pdf.js reconstroi xref ausente,
  // mas ai o caminho de codigo exercitado nao seria o mesmo de um arquivo normal.
  const partes: string[] = ['%PDF-1.7\n'];
  const offsets: number[] = [];
  let pos = partes[0]!.length;

  objs.forEach((corpo, i) => {
    const txt = `${i + 1} 0 obj\n${corpo}\nendobj\n`;
    offsets.push(pos);
    partes.push(txt);
    pos += txt.length;
  });

  const startxref = pos;
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  xref += `trailer<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${startxref}\n%%EOF\n`;
  partes.push(xref);

  return new TextEncoder().encode(partes.join(''));
}

/** Retangulo via operador `re`. */
export const re = (x: number, y: number, w: number, h: number) => `${x} ${y} ${w} ${h} re`;
