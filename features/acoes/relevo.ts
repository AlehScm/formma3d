'use client';

import { aplanar, detectarRelevo, juntarPecas, soldar, type Malha } from '@/lib/mesh/relevo';
import { lerChave, useProjeto } from '@/store/projeto';
import { useInterface } from '@/store/interface';

/**
 * Suavizar relevo num objeto STL: o clique acha a marca (previa em vermelho), clique
 * num pedaco vermelho tira ele da previa, os campos refazem a busca no mesmo clique,
 * e "Aplicar" troca as marcas pela face lisa.
 */

// Soldar e o passo caro (malha de 100 mil triangulos): uma vez por malha.
const cache = new WeakMap<Float32Array, Malha>();
function malhaDe(pos: Float32Array): Malha {
  let m = cache.get(pos);
  if (!m) {
    m = soldar(pos);
    cache.set(pos, m);
  }
  return m;
}

function objeto(chave: string) {
  const c = lerChave(chave);
  return c.tipo === 'stl' ? useProjeto.getState().objetos3d.find((o) => o.id === c.id) : undefined;
}

/** Clique no objeto com a ferramenta ligada: triangulo e ponto em coordenadas da malha. */
export function procurarRelevo(chave: string, tri: number, ponto: [number, number, number]): void {
  const o = objeto(chave);
  if (!o) return;
  const ui = useInterface.getState();
  // Clique num pedaco da previa: ele fica de fora (um rebaixo da peca que nao e marca).
  const atual = ui.relevo;
  if (atual?.objeto === chave) {
    const i = atual.resultado.pecas.findIndex((p) => p.triangulos.includes(tri));
    if (i >= 0) {
      ui.definirRelevo({ ...atual, resultado: juntarPecas(atual.resultado.pecas.filter((_, j) => j !== i)) });
      return;
    }
  }
  const resultado = detectarRelevo(malhaDe(o.posicoes), tri, ponto, ui.opcoesRelevo);
  ui.definirRelevo({ objeto: chave, tri, ponto, resultado });
}

/** Mudou altura ou raio: refaz no mesmo clique. */
export function refazerRelevo(): void {
  const r = useInterface.getState().relevo;
  if (r) procurarRelevo(r.objeto, r.tri, r.ponto);
}

export function aplicarRelevo(): void {
  const ui = useInterface.getState();
  const r = ui.relevo;
  if (!r || !r.resultado.triangulos.length) return;
  const o = objeto(r.objeto);
  if (!o) return;
  useProjeto.getState().editarMalhaObjeto(o.id, aplanar(malhaDe(o.posicoes), r.resultado));
  // Continua ligada: costuma ter mais de uma marca (fundo e costas).
  ui.definirRelevo(null);
}
