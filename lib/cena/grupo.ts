/**
 * Grupos de objetos, como no Photoshop e no Bambu: as pecas continuam separadas,
 * mas selecionam, movem e exportam juntas. Uma peca esta em no maximo um grupo.
 */

export interface Grupo {
  id: string;
  nome: string;
  membros: string[];
}

export const grupoDe = (grupos: readonly Grupo[], chave: string): Grupo | undefined => grupos.find((g) => g.membros.includes(chave));

/**
 * Junta as chaves num grupo novo. Quem ja estava em outro grupo sai de la (e o grupo
 * antigo que ficar com menos de 2 se desfaz). Menos de 2 pecas nao forma grupo.
 */
export function agrupar(grupos: readonly Grupo[], chaves: readonly string[], id: string, nome: string): Grupo[] {
  const alvo = [...new Set(chaves)];
  if (alvo.length < 2) return [...grupos];
  const igual = grupos.find((g) => g.membros.length === alvo.length && alvo.every((k) => g.membros.includes(k)));
  if (igual) return [...grupos];
  const resto = grupos
    .map((g) => ({ ...g, membros: g.membros.filter((k) => !alvo.includes(k)) }))
    .filter((g) => g.membros.length >= 2);
  return [...resto, { id, nome, membros: alvo }];
}

/** Desfaz todo grupo que tenha alguma das chaves. As pecas continuam onde estao. */
export function desagrupar(grupos: readonly Grupo[], chaves: readonly string[]): Grupo[] {
  return grupos.filter((g) => !g.membros.some((k) => chaves.includes(k)));
}

/** Tira do grupo as pecas que nao existem mais; grupo com menos de 2 se desfaz. */
export function limparGrupos(grupos: readonly Grupo[], vivas: ReadonlySet<string>): Grupo[] {
  const r = grupos.map((g) => ({ ...g, membros: g.membros.filter((k) => vivas.has(k)) })).filter((g) => g.membros.length >= 2);
  // Nada mudou: devolve o mesmo array, para nao disparar render a toa.
  return r.length === grupos.length && r.every((g, i) => g.membros.length === grupos[i]!.membros.length) ? (grupos as Grupo[]) : r;
}

export interface Pt {
  x: number;
  y: number;
}

/** O que o gizmo fez com o conjunto: mover, girar (graus) e escalar em torno de C. */
export interface TransformacaoConjunto {
  tx: number;
  ty: number;
  giro: number;
  sx: number;
  sy: number;
}

/** O que cada peca recebe: mesmo formato do gizmo de uma peca so. */
export interface Delta {
  dx: number;
  dy: number;
  giro: number;
  ex: number;
  ey: number;
}

/**
 * Transforma varias pecas como um corpo so em torno de C. `ancoras` e o ponto em
 * torno do qual cada peca gira e escala (o centro dela ja deslocado): cada uma gira
 * no proprio lugar E orbita C, entao a distancia entre elas se mantem no giro e
 * escala junto na escala.
 */
export function transformarConjunto(ancoras: ReadonlyMap<string, Pt>, c: Pt, t: TransformacaoConjunto): Map<string, Delta> {
  const r = (t.giro * Math.PI) / 180;
  const cos = Math.cos(r);
  const sen = Math.sin(r);
  const out = new Map<string, Delta>();
  for (const [k, a] of ancoras) {
    const x = (a.x - c.x) * t.sx;
    const y = (a.y - c.y) * t.sy;
    const nx = c.x + x * cos - y * sen + t.tx;
    const ny = c.y + x * sen + y * cos + t.ty;
    out.set(k, { dx: nx - a.x, dy: ny - a.y, giro: t.giro, ex: t.sx, ey: t.sy });
  }
  return out;
}

/** Centro de um conjunto de pontos (media): onde o gizmo do grupo fica. */
export function centroDe(pontos: Iterable<Pt>): Pt {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const p of pontos) {
    x += p.x;
    y += p.y;
    n++;
  }
  return n ? { x: x / n, y: y / n } : { x: 0, y: 0 };
}
