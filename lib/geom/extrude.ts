import * as THREE from 'three';
import type { Region } from './region';
import type { Layer, Papeis, Part, Role } from './modes';
import { malhaVazia, posicoesDaMalha, type Malha } from '../malha/tipos';

/** Region -> THREE.Shape[], com buracos como Path internos. */
export function regionToShapes(region: Region): THREE.Shape[] {
  const shapes: THREE.Shape[] = [];
  for (const poly of region) {
    if (poly.outer.length < 3) continue;
    const shape = new THREE.Shape(poly.outer.map((p) => new THREE.Vector2(p.x, p.y)));
    for (const h of poly.holes) {
      if (h.length < 3) continue;
      shape.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p.x, p.y))));
    }
    shapes.push(shape);
  }
  return shapes;
}

/** Uma Region entre dois Z -> prisma reto (geradores, chapa cortada, desenhos por cima da peca). */
export function layerToGeometry(layer: Pick<Layer, 'region' | 'z0' | 'z1'>): THREE.BufferGeometry | null {
  const shapes = regionToShapes(layer.region);
  if (!shapes.length) return null;
  const depth = layer.z1 - layer.z0;
  if (depth <= 0) return null;
  const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geo.translate(0, 0, layer.z0);
  return geo;
}

/** Sopa de triangulos com normal por face (aresta viva, como a peca impressa). */
function geometriaDe(pos: Float32Array): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * A malha separada por papel (face, parede, bolsao...): cada trecho (run) vem de um prisma da
 * receita e leva o papel dele. O preview colore cada funcao com cor propria. Face nascida de
 * corte (sem papel) fica com a cor do corpo.
 */
export function partToGeometriesByRole(part: { malha: Malha; papeis: Papeis }): Map<Role, THREE.BufferGeometry> {
  const { malha, papeis } = part;
  const runs = malha.runOriginalID.length;
  const papelDo = (i: number): Role => papeis[malha.runOriginalID[i]!]?.role ?? 'corpo';
  const fim = (i: number) => malha.runIndex[i + 1] ?? malha.tri.length;
  // Quantos vertices cada papel tem (pelos trechos), e cada um num Float32Array do tamanho certo.
  const tamanho = new Map<Role, number>();
  for (let i = 0; i < runs; i++) tamanho.set(papelDo(i), (tamanho.get(papelDo(i)) ?? 0) + (fim(i) - malha.runIndex[i]!) * 3);
  const porPapel = new Map<Role, { pos: Float32Array; n: number }>();
  for (const [role, n] of tamanho) if (n) porPapel.set(role, { pos: new Float32Array(n), n: 0 });
  for (let i = 0; i < runs; i++) {
    const alvo = porPapel.get(papelDo(i));
    if (!alvo) continue;
    for (let k = malha.runIndex[i]!; k < fim(i); k++) {
      const v = malha.tri[k]! * 3;
      alvo.pos[alvo.n++] = malha.pos[v]!;
      alvo.pos[alvo.n++] = malha.pos[v + 1]!;
      alvo.pos[alvo.n++] = malha.pos[v + 2]!;
    }
  }
  const out = new Map<Role, THREE.BufferGeometry>();
  for (const [role, { pos }] of porPapel) out.set(role, geometriaDe(pos));
  return out;
}

/** A malha inteira da peca, para exportar STL e montar a placa. */
export function partToGeometry(part: Pick<Part, 'malha'>): THREE.BufferGeometry | null {
  return malhaVazia(part.malha) ? null : geometriaDe(posicoesDaMalha(part.malha));
}
