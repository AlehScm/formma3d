/** Consultas da loja: so o que pode aparecer, por secao, busca e destaques. */
import { ORDEM_SECOES, type Produto, type Secao } from './tipos';
import { filtrarPorTexto } from './busca';
import { geradorDe } from './formato';
import { PRODUTOS } from './produtos';

/** Pode aparecer ao publico: publico e, se for de terceiro, com licenca comercial confirmada. */
export const podeAparecer = (p: Produto) => p.visibilidade === 'publico' && (p.origem === 'nosso' || p.licenca === 'comercial-ok');

export const produtosPublicos = (lista: Produto[] = PRODUTOS): Produto[] => lista.filter(podeAparecer);

export const porSlug = (slug: string, lista: Produto[] = PRODUTOS): Produto | undefined => produtosPublicos(lista).find((p) => p.slug === slug);

export const porSecao = (secao: Secao, lista: Produto[] = PRODUTOS): Produto[] => produtosPublicos(lista).filter((p) => p.secao === secao);

/** Todas as secoes, na ordem da loja, com quantas pecas publicas cada uma tem (zero = "em breve"). */
export const secoesComContagem = (lista: Produto[] = PRODUTOS): { secao: Secao; total: number }[] =>
  ORDEM_SECOES.map((secao) => ({ secao, total: porSecao(secao, lista).length }));

/** Ate `n` pecas por secao para a vitrine: primeiro as marcadas como destaque. */
export function destaquesPorSecao(n = 4, lista: Produto[] = PRODUTOS): { secao: Secao; produtos: Produto[] }[] {
  return ORDEM_SECOES.map((secao) => {
    const ps = porSecao(secao, lista);
    return { secao, produtos: [...ps.filter((p) => p.destaque), ...ps.filter((p) => !p.destaque)].slice(0, n) };
  });
}

export const ehSecao = (s: string): s is Secao => (ORDEM_SECOES as string[]).includes(s);

/** Busca sem acento nem maiuscula, so entre os publicos (ver busca.ts). */
export const buscar = (termo: string, secao: Secao | 'todas' = 'todas', lista: Produto[] = PRODUTOS): Produto[] =>
  filtrarPorTexto(produtosPublicos(lista).filter((p) => secao === 'todas' || p.secao === secao), termo);

export { geradorDe, textoDoPreco, urlDaMidia } from './formato';

/** Peca que representa a secao na vitrine 3D: a primeira publica com gerador (destaques antes). */
export function pecaDaSecao(secao: Secao, lista: Produto[] = PRODUTOS): { gerador: string; nome: string; slug: string } | null {
  const ps = porSecao(secao, lista);
  const p = [...ps.filter((x) => x.destaque), ...ps.filter((x) => !x.destaque)].find((x) => geradorDe(x));
  return p ? { gerador: geradorDe(p)!, nome: p.nome, slug: p.slug } : null;
}
