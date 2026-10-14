/**
 * O que vai para o Google (sitemap). So pagina com conteudo publico: secao vazia, busca,
 * orcamento, guia interno e enderecos antigos ficam de fora (e com noindex na pagina).
 */
import { CAMPANHAS, campanhaAtiva, type Campanha } from './campanhas';
import { podeAparecer } from './consultas';
import { PRODUTOS } from './produtos';
import { ORDEM_SECOES, type Produto } from './tipos';

/** Geradores e editores abertos ao publico. */
export const FERRAMENTAS = ['/criar', '/design', '/editor', '/placas'];

/** `ativa` troca a chave da campanha nos testes, como em `podeAparecer`. */
export function caminhosIndexaveis(lista: Produto[] = PRODUTOS, ativa: (c: Campanha) => boolean = campanhaAtiva): string[] {
  const publicos = lista.filter((p) => podeAparecer(p, ativa));
  return [
    '/',
    '/pecas',
    ...ORDEM_SECOES.filter((s) => publicos.some((p) => p.secao === s)).map((s) => `/secao/${s}`),
    ...(ativa('natal') ? [CAMPANHAS.natal.href] : []),
    ...FERRAMENTAS,
    ...publicos.map((p) => `/produto/${p.slug}`),
  ];
}
