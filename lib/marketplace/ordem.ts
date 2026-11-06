/**
 * Ordem das pecas na loja (docs/categorias.md), sem importar o cadastro: serve no servidor e
 * no navegador. Padrao ("Relevancia"): destaques primeiro, depois as que entraram na loja
 * mais recentemente; no mesmo dia, a que esta mais embaixo no banco (a ultima cadastrada).
 */
type Ordenavel = { destaque?: boolean; adicionadoEm: string };

/** Ordem padrao da loja. `ps` na ordem do banco (o desempate do mesmo dia usa essa posicao). */
export const ordenarLoja = <T extends Ordenavel>(ps: T[]): T[] =>
  ps.map((p, i) => ({ p, i }))
    .sort((a, b) => Number(!!b.p.destaque) - Number(!!a.p.destaque) || b.p.adicionadoEm.localeCompare(a.p.adicionadoEm) || b.i - a.i)
    .map(({ p }) => p);

/** "Mais recentes": so pela data de entrada; no mesmo dia, fica a ordem recebida (a da loja). */
export const maisRecentes = <T extends Ordenavel>(ps: T[]): T[] =>
  ps.map((p, i) => ({ p, i }))
    .sort((a, b) => b.p.adicionadoEm.localeCompare(a.p.adicionadoEm) || a.i - b.i)
    .map(({ p }) => p);
