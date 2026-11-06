/** Consultas da loja: so o que pode aparecer, por secao, busca e destaques, sempre na ordem da loja (ordem.ts). */
import { ORDEM_SECOES, type Produto, type Secao } from './tipos';
import { ordenarLoja } from './ordem';
import { filtrarPorTexto, termosDe } from './busca';
import { geradorDe } from './formato';
import { PRODUTOS } from './produtos';
import { campanhaAtiva, type Campanha } from './campanhas';

/**
 * Pode aparecer ao publico: o que esta `publico` no banco (decisao de quem cuida da loja; a
 * licenca e so informativa), e peca de campanha so com a campanha ligada (`ativa` troca a chave nos testes).
 */
export const podeAparecer = (p: Produto, ativa: (c: Campanha) => boolean = campanhaAtiva) =>
  p.visibilidade === 'publico' && (!p.campanha || ativa(p.campanha));

/** O catalogo completo (/pecas e a API): os publicos, na ordem da loja (destaques, depois as mais novas). */
export const produtosPublicos = (lista: Produto[] = PRODUTOS): Produto[] => ordenarLoja(lista.filter((p) => podeAparecer(p)));

/** "Nossos geradores": toda peca publica que da para personalizar ao vivo (tambem fica na categoria dela). */
export const geradores = (lista: Produto[] = PRODUTOS): Produto[] => produtosPublicos(lista).filter((p) => !!geradorDe(p));

export const porSlug = (slug: string, lista: Produto[] = PRODUTOS): Produto | undefined => produtosPublicos(lista).find((p) => p.slug === slug);

export const porSecao = (secao: Secao, lista: Produto[] = PRODUTOS): Produto[] => produtosPublicos(lista).filter((p) => p.secao === secao);

/** Todas as secoes, na ordem da loja, com quantas pecas publicas cada uma tem (zero = "em breve"). */
export const secoesComContagem = (lista: Produto[] = PRODUTOS): { secao: Secao; total: number }[] =>
  ORDEM_SECOES.map((secao) => ({ secao, total: porSecao(secao, lista).length }));

/** Secoes com alguma peca publica: so elas entram no menu, no rodape e nos atalhos. */
export const secoesComPecas = (lista: Produto[] = PRODUTOS): Secao[] => secoesComContagem(lista).filter((c) => c.total > 0).map((c) => c.secao);

/**
 * Vitrines da home sem repetir peca: cada uma pula o que as de cima ja mostraram. A que
 * ficaria com menos de `minimo` some (a secao continua no menu e nos atalhos).
 */
export function semRepetir<T extends { slug: string }>(vitrines: T[][], minimo = 3): T[][] {
  const vistos = new Set<string>();
  return vitrines.map((ps) => {
    const novos = ps.filter((p) => !vistos.has(p.slug));
    if (novos.length < minimo) return [];
    novos.forEach((p) => vistos.add(p.slug));
    return novos;
  });
}

export const ehSecao = (s: string): s is Secao => (ORDEM_SECOES as string[]).includes(s);

/** Busca sem acento nem maiuscula, so entre os publicos (o mesmo texto da busca no navegador, ver busca.ts). */
export function buscar(termo: string, secao: Secao | 'todas' = 'todas', lista: Produto[] = PRODUTOS): Produto[] {
  const candidatos = produtosPublicos(lista).filter((p) => secao === 'todas' || p.secao === secao).map((p) => ({ p, termos: termosDe(p) }));
  return filtrarPorTexto(candidatos, termo).map(({ p }) => p);
}

export { comImagemPrimeiro, geradorDe, temImagem, textoDoPreco, urlDaMidia } from './formato';
