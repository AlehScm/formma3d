import { grupoDe, type Grupo } from './grupo';

export interface Modificadores {
  /** Ctrl (ou Cmd): liga e desliga sem perder o resto. */
  ctrl?: boolean;
  /** Shift: intervalo na ordem do painel de Objetos. */
  shift?: boolean;
  /**
   * Clique vindo da linha de um membro no painel: pega so aquela peca. No 3D, a
   * peca de um grupo traz o grupo inteiro, como "auto-selecionar grupo".
   */
  soAPeca?: boolean;
}

const unicos = (xs: readonly string[]) => [...new Set(xs)];

/** Nova selecao depois de um clique numa peca. A ultima da lista e a "principal". */
export function clicar(
  selecao: readonly string[],
  chave: string,
  mods: Modificadores,
  grupos: readonly Grupo[],
  ordem: readonly string[]
): string[] {
  const expandir = (k: string) => (mods.soAPeca ? [k] : (grupoDe(grupos, k)?.membros ?? [k]));
  const alvo = expandir(chave);
  // A principal fica no fim: o inspetor e o gizmo olham para ela.
  const comPrincipal = (xs: string[]) => [...xs.filter((k) => k !== chave), chave];

  if (mods.shift && selecao.length) {
    const ultima = selecao[selecao.length - 1]!;
    const i = ordem.indexOf(ultima);
    const j = ordem.indexOf(chave);
    if (i >= 0 && j >= 0) {
      const faixa = ordem.slice(Math.min(i, j), Math.max(i, j) + 1).flatMap(expandir);
      return comPrincipal(unicos(mods.ctrl ? [...selecao, ...faixa] : faixa));
    }
  }
  if (mods.ctrl) {
    const todos = alvo.every((k) => selecao.includes(k));
    return todos ? selecao.filter((k) => !alvo.includes(k)) : comPrincipal(unicos([...selecao, ...alvo]));
  }
  return comPrincipal(unicos(alvo));
}
