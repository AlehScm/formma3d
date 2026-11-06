/**
 * O que vai para o Google (sitemap). So pagina com conteudo publico: secao vazia, busca,
 * orcamento, guia interno e enderecos antigos ficam de fora (e com noindex na pagina).
 */
import { CAMPANHAS, campanhaAtiva, type Campanha } from './campanhas';
import { podeAparecer } from './consultas';
import { geradorDe } from './formato';
import { PRODUTOS } from './produtos';
import { NOSSOS_GERADORES, ORDEM_SECOES, type Produto } from './tipos';

/** Geradores e editores abertos ao publico. */
export const FERRAMENTAS = ['/criar', '/design', '/editor'];

export const LETRAS = ['/letra-caixa', '/letras'];

/** Politicas da loja, linkadas no rodape. */
export const INSTITUCIONAIS = ['/trocas', '/privacidade'];

/** `ativa` troca a chave da campanha nos testes, como em `podeAparecer`. */
export function caminhosIndexaveis(lista: Produto[] = PRODUTOS, ativa: (c: Campanha) => boolean = campanhaAtiva): string[] {
  const publicos = lista.filter((p) => podeAparecer(p, ativa));
  return [
    '/',
    '/pecas',
    // Natal tem a pagina da campanha (sempre no sitemap, logo abaixo); as outras, /secao/<slug>.
    ...ORDEM_SECOES.filter((s) => s !== 'natal' && publicos.some((p) => p.secao === s)).map((s) => `/secao/${s}`),
    ...(publicos.some((p) => geradorDe(p)) ? [NOSSOS_GERADORES.href] : []),
    CAMPANHAS.natal.href,
    ...FERRAMENTAS,
    ...LETRAS,
    ...INSTITUCIONAIS,
    ...publicos.map((p) => `/produto/${p.slug}`),
  ];
}
