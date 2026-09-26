import JSZip from 'jszip';

/**
 * 3MF: o formato nativo do Bambu Studio (e do Prusa/Orca).
 *
 * Diferente do STL, guarda cada peca como OBJETO SEPARADO. Com a placa em STL o
 * fatiador enxerga uma coisa so, e nao da para mexer numa peca sem mexer nas outras;
 * no 3MF cada uma segue independente, ja na posicao em que o arranjo pos.
 *
 * As posicoes ja chegam em coordenadas da mesa, entao o <build> nao precisa de
 * transformacao. Vertices repetidos sao reaproveitados (a sopa de triangulos
 * repete cada vertice ~6 vezes), o que corta o arquivo em ~5x.
 */

export interface Objeto3mf {
  nome: string;
  /** Sopa de triangulos, 9 numeros por triangulo, em mm. */
  posicoes: Float32Array;
}

const esc = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
const n6 = (v: number) => (Math.round(v * 1e6) / 1e6).toString();

function malhaXml(p: Float32Array): string {
  const indice = new Map<string, number>();
  const vertices: string[] = [];
  const triangulos: string[] = [];
  const id = (i: number) => {
    const k = `${n6(p[i]!)},${n6(p[i + 1]!)},${n6(p[i + 2]!)}`;
    let v = indice.get(k);
    if (v === undefined) {
      v = vertices.length;
      indice.set(k, v);
      vertices.push(`<vertex x="${n6(p[i]!)}" y="${n6(p[i + 1]!)}" z="${n6(p[i + 2]!)}"/>`);
    }
    return v;
  };
  for (let t = 0; t < p.length; t += 9) {
    const a = id(t);
    const b = id(t + 3);
    const c = id(t + 6);
    // Triangulo degenerado (dois vertices iguais) e rejeitado por alguns fatiadores.
    if (a !== b && b !== c && a !== c) triangulos.push(`<triangle v1="${a}" v2="${b}" v3="${c}"/>`);
  }
  return `<mesh><vertices>${vertices.join('')}</vertices><triangles>${triangulos.join('')}</triangles></mesh>`;
}

export function modelo3mf(objs: Objeto3mf[]): string {
  const recursos = objs
    .map((o, k) => `<object id="${k + 1}" type="model" name="${esc(o.nome)}">${malhaXml(o.posicoes)}</object>`)
    .join('');
  const build = objs.map((_, k) => `<item objectid="${k + 1}"/>`).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<model unit="millimeter" xml:lang="pt-BR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">' +
    '<metadata name="Application">formma3d</metadata>' +
    `<resources>${recursos}</resources><build>${build}</build></model>`
  );
}

export async function gerar3mf(objs: Objeto3mf[]): Promise<Blob> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>' +
      '</Types>'
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>' +
      '</Relationships>'
  );
  zip.file('3D/3dmodel.model', modelo3mf(objs));
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml', compression: 'DEFLATE' });
}
