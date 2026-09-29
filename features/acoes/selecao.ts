'use client';

import { grupoDe } from '@/lib/cena/grupo';
import { useInterface } from '@/store/interface';
import { useProjeto } from '@/store/projeto';
import type { Modelo } from '@/modelo/Modelo';
import { baixarSelecao3MF, baixarSelecaoSTL } from './exportar';

/**
 * O que se faz com a selecao: e o mesmo pelo menu do botao direito, pelos atalhos
 * e pelo painel de Objetos. Tudo aqui le as stores na hora -- nenhuma copia velha.
 */

/** A ordem do painel de Objetos: pecas do letreiro, depois objetos STL. */
export const ordemObjetos = (m: Modelo): string[] => [...m.letras.map((l) => l.chave), ...m.objetos.map((o) => o.chave)];

const selecao = () => useInterface.getState().selecao;

/** O grupo, se a selecao e exatamente um grupo inteiro. */
export function grupoDaSelecao() {
  const sel = selecao();
  const g = sel[0] ? grupoDe(useProjeto.getState().grupos, sel[0]) : undefined;
  return g && g.membros.length === sel.length && sel.every((k) => g.membros.includes(k)) ? g : undefined;
}

/** Nome para arquivo e cabecalho: o do grupo, ou "N pecas". */
export function nomeDaSelecao(m: Modelo): string {
  const g = grupoDaSelecao();
  if (g) return g.nome;
  const sel = selecao();
  if (sel.length === 1) return nomeDe(m, sel[0]!);
  return `${sel.length} peças`;
}

export const nomeDe = (m: Modelo, chave: string): string =>
  m.letras.find((l) => l.chave === chave)?.nome ?? m.objetos.find((o) => o.chave === chave)?.nome ?? chave;

export function agruparSelecao(): void {
  const sel = selecao();
  if (sel.length < 2) return;
  useProjeto.getState().agruparPecas(sel);
}

export function desagruparSelecao(): void {
  const sel = selecao();
  if (sel.length) useProjeto.getState().desagruparPecas(sel);
}

/** Algum grupo tem peca selecionada? (habilita "Desagrupar") */
export function selecaoTemGrupo(): boolean {
  const g = useProjeto.getState().grupos;
  return selecao().some((k) => grupoDe(g, k));
}

export function selecionarTudo(m: Modelo): void {
  const ui = useInterface.getState();
  // Na placa, "tudo" e o que esta na cena: a placa na tela mais a fila de fora.
  const vis = ui.espaco === 'imprimir' && ui.placas.length ? visiveisNaPlaca(m) : ordemObjetos(m).filter((k) => m.letras.some((l) => l.chave === k));
  ui.definirSelecao(vis.filter((k) => !ui.travadas.has(k) && !ui.ocultas.has(k)));
}

function visiveisNaPlaca(m: Modelo): string[] {
  const ui = useInterface.getState();
  const outras = new Set(ui.placas.flatMap((p, i) => (i === ui.placaVista ? [] : [...p.keys()])));
  return ordemObjetos(m).filter((k) => !outras.has(k));
}

export function ocultarSelecao(): void {
  const sel = selecao();
  if (!sel.length) return;
  const ui = useInterface.getState();
  ui.alternarOcultas(sel);
  // O que sumiu da tela sai da selecao: gizmo em peca invisivel so confunde.
  if (sel.every((k) => useInterface.getState().ocultas.has(k))) ui.definirSelecao([]);
}

export function travarSelecao(): void {
  const sel = selecao();
  if (sel.length) useInterface.getState().alternarTravadas(sel);
}

export function excluirSelecao(): void {
  const sel = selecao();
  if (!sel.length) return;
  useProjeto.getState().removerPeca(sel);
  useInterface.getState().definirSelecao([]);
}

export function exportarSelecao(m: Modelo, formato: 'stl' | '3mf'): void {
  const sel = selecao();
  if (!sel.length) return;
  const nome = nomeDaSelecao(m);
  if (formato === 'stl') baixarSelecaoSTL(m, sel, nome);
  else void baixarSelecao3MF(m, sel, nome);
}
