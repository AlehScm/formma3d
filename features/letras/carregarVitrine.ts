/**
 * Le as pecas da vitrine de letras geradas no build (scripts/gerar-vitrine-letras.mts): um
 * .json com as partes e um .bin com os numeros. Sem gerar nada aqui; cada peca uma vez.
 */
import * as THREE from 'three';
import { PASTA_VITRINE, type MalhaVitrine } from '@/lib/marketplace/vitrineLetras';

export interface ParteVitrine {
  nome: string;
  papel: MalhaVitrine['partes'][number]['papel'];
  cor: string;
  geo: THREE.BufferGeometry;
}

export interface PecaVitrine3D {
  partes: ParteVitrine[];
  /** Largura, altura e profundidade da peca inteira (centrada na origem). */
  tamanho: THREE.Vector3;
}

const cache = new Map<string, Promise<PecaVitrine3D>>();

export function carregarVitrine(id: string): Promise<PecaVitrine3D> {
  let p = cache.get(id);
  if (!p) {
    p = baixar(id);
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

async function baixar(id: string): Promise<PecaVitrine3D> {
  const base = `${process.env.NEXT_PUBLIC_BASE ?? ''}/${PASTA_VITRINE}/${id}`;
  const [json, bin] = await Promise.all([
    fetch(`${base}.json`).then((r) => { if (!r.ok) throw new Error(`Peca ${id} sem .json`); return r.json() as Promise<MalhaVitrine>; }),
    fetch(`${base}.bin`).then((r) => { if (!r.ok) throw new Error(`Peca ${id} sem .bin`); return r.arrayBuffer(); }),
  ]);
  const tam = json.max.map((x, k) => x - json.min[k]!);
  const partes = json.partes.map((p) => {
    // Int16 de -32767 a 32767 cobre a caixa da peca; volta para mm aqui (uma vez por peca).
    const q = new Int16Array(bin, p.posicoes, p.vertices * 3);
    const pos = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) pos[i] = json.min[i % 3]! + ((q[i]! + 32767) / 65534) * tam[i % 3]!;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(bin, p.normais, p.vertices * 3), 3, true));
    geo.setIndex(new THREE.BufferAttribute(p.indice32 ? new Uint32Array(bin, p.triangulos, p.indices) : new Uint16Array(bin, p.triangulos, p.indices), 1));
    geo.computeBoundingSphere();
    return { nome: p.nome, papel: p.papel, cor: p.cor, geo };
  });
  return { partes, tamanho: new THREE.Vector3(tam[0], tam[1], tam[2]) };
}
