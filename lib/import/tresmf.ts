import JSZip from 'jszip';
import { assentar, type MalhaStl } from './stl';
import { ErroImport } from './erro';

/**
 * Leitura de 3MF (o formato do Bambu Studio, Prusa, Orca) para objetos de placa.
 *
 * O 3MF e um zip com a malha em XML. Cada item do <build> vira um objeto: e o que o
 * fatiador mostra como peca separada. O Bambu guarda a malha de cada peca num
 * arquivo proprio (3D/Objects/*.model) e o arquivo principal so referencia (<component
 * p:path=...>), com transformacao de posicao/escala -- por isso a leitura segue as
 * referencias e compoe as transformacoes.
 */

export interface Objeto3mf {
  nome: string;
  malha: MalhaStl;
}

const UNIDADE: Record<string, number> = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };

/** Transformacao 3MF: 12 numeros "m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32", ponto em linha: p' = [x y z 1] . M. */
type Mat = number[];
const IDENT: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const lerMat = (s?: string): Mat => {
  const n = (s ?? '').trim().split(/\s+/).map(Number);
  return n.length === 12 && n.every(Number.isFinite) ? n : IDENT;
};
/** Primeiro `a`, depois `b`. */
function compor(a: Mat, b: Mat): Mat {
  const r: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y, z] = [a[i * 3]!, a[i * 3 + 1]!, a[i * 3 + 2]!];
    const t = i === 3 ? 1 : 0;
    for (let j = 0; j < 3; j++) r.push(x * b[j]! + y * b[3 + j]! + z * b[6 + j]! + t * b[9 + j]!);
  }
  return r;
}

const atributos = (s: string): Record<string, string> => {
  const r: Record<string, string> = {};
  for (const m of s.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) r[m[1]!] = m[2]!;
  return r;
};

interface Componente {
  objectid: string;
  transform: Mat;
  caminho?: string;
}
interface ObjetoXml {
  nome?: string;
  vertices: number[];
  triangulos: number[];
  componentes: Componente[];
}
interface ModeloXml {
  escala: number;
  objetos: Map<string, ObjetoXml>;
  itens: { objectid: string; transform: Mat; caminho?: string }[];
}

const normalizar = (c: string) => c.replace(/^\/+/, '');

function lerModelo(xml: string): ModeloXml {
  const unidade = /<model\b[^>]*\bunit\s*=\s*"(\w+)"/.exec(xml)?.[1] ?? 'millimeter';
  const objetos = new Map<string, ObjetoXml>();
  for (const m of xml.matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>/g)) {
    const a = atributos(m[1]!);
    const corpo = m[2]!;
    const vertices: number[] = [];
    for (const v of corpo.matchAll(/<vertex\b([^>]*)\/?>/g)) {
      const va = atributos(v[1]!);
      vertices.push(Number(va.x), Number(va.y), Number(va.z));
    }
    const triangulos: number[] = [];
    for (const t of corpo.matchAll(/<triangle\b([^>]*)\/?>/g)) {
      const ta = atributos(t[1]!);
      triangulos.push(Number(ta.v1), Number(ta.v2), Number(ta.v3));
    }
    const componentes: Componente[] = [];
    for (const c of corpo.matchAll(/<component\b([^>]*)\/?>/g)) {
      const ca = atributos(c[1]!);
      componentes.push({ objectid: ca.objectid ?? '', transform: lerMat(ca.transform), caminho: ca['p:path'] ? normalizar(ca['p:path']) : undefined });
    }
    if (a.id) objetos.set(a.id, { nome: a.name, vertices, triangulos, componentes });
  }
  const itens = [...xml.matchAll(/<item\b([^>]*)\/?>/g)].map((m) => {
    const a = atributos(m[1]!);
    return { objectid: a.objectid ?? '', transform: lerMat(a.transform), caminho: a['p:path'] ? normalizar(a['p:path']) : undefined };
  });
  return { escala: UNIDADE[unidade] ?? 1, objetos, itens };
}

/** Le o 3MF: um objeto por item do build (ou por objeto com malha, se nao houver build). */
export async function lerTresMf(buf: ArrayBuffer, nomeArquivo = 'objeto'): Promise<Objeto3mf[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    throw new ErroImport(`“${nomeArquivo}” não abre: o 3MF parece corrompido.`);
  }
  // O arquivo principal vem das relacoes do pacote; o padrao e 3D/3dmodel.model.
  const rels = (await zip.file('_rels/.rels')?.async('string')) ?? '';
  const alvo = /Target\s*=\s*"([^"]+\.model)"/i.exec(rels)?.[1];
  const principal = normalizar(alvo ?? '3D/3dmodel.model');
  const modelos = new Map<string, ModeloXml>();
  async function modelo(caminho: string): Promise<ModeloXml | undefined> {
    if (!modelos.has(caminho)) {
      const f = zip.file(caminho) ?? zip.file(new RegExp(`^${caminho.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'))[0];
      if (!f) return undefined;
      modelos.set(caminho, lerModelo(await f.async('string')));
    }
    return modelos.get(caminho);
  }
  const raiz = await modelo(principal);
  if (!raiz) throw new ErroImport(`“${nomeArquivo}” não tem o modelo 3D dentro.`);

  // Junta a malha do objeto (e dos componentes dele) ja transformada, em mm.
  async function malhaDe(caminho: string, id: string, M: Mat, out: number[], nivel = 0): Promise<string | undefined> {
    const mod = await modelo(caminho);
    const o = mod?.objetos.get(id);
    if (!mod || !o || nivel > 16) return undefined;
    const k = mod.escala;
    const v = o.vertices;
    for (let i = 0; i + 2 < o.triangulos.length; i += 3) {
      for (let j = 0; j < 3; j++) {
        const vi = o.triangulos[i + j]! * 3;
        const [x, y, z] = [v[vi]!, v[vi + 1]!, v[vi + 2]!];
        out.push(
          (x * M[0]! + y * M[3]! + z * M[6]! + M[9]!) * k,
          (x * M[1]! + y * M[4]! + z * M[7]! + M[10]!) * k,
          (x * M[2]! + y * M[5]! + z * M[8]! + M[11]!) * k
        );
      }
    }
    for (const c of o.componentes) await malhaDe(c.caminho ?? caminho, c.objectid, compor(c.transform, M), out, nivel + 1);
    return o.nome;
  }

  // Sem <build>: todo objeto com malha que nao e componente de outro.
  const itens = raiz.itens.length
    ? raiz.itens
    : [...raiz.objetos.keys()]
        .filter((id) => ![...raiz.objetos.values()].some((o) => o.componentes.some((c) => !c.caminho && c.objectid === id)))
        .map((objectid) => ({ objectid, transform: IDENT, caminho: undefined }));

  const saida: Objeto3mf[] = [];
  for (const [i, it] of itens.entries()) {
    const out: number[] = [];
    const nome = await malhaDe(it.caminho ?? principal, it.objectid, it.transform, out);
    if (!out.length || out.some((x) => !Number.isFinite(x))) continue;
    const base = nomeArquivo.replace(/\.3mf$/i, '');
    saida.push({ nome: nome?.trim() || (itens.length > 1 ? `${base} ${i + 1}` : base), malha: assentar(new Float32Array(out)) });
  }
  if (!saida.length) throw new ErroImport(`Não achei nenhum objeto com malha em “${nomeArquivo}”.`);
  return saida;
}
