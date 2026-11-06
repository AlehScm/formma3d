/**
 * Contrato da API da loja: os caminhos que as paginas pedem por GET e o formato da resposta.
 * Hoje os JSON saem estaticos do build (app/api/...); com um banco de verdade, outro servidor
 * responde nos mesmos caminhos (NEXT_PUBLIC_API, ver cliente.ts) e as paginas nao mudam.
 * Sem importar o cadastro: pode ir para o navegador.
 */
import { termosDe } from '../busca';
import { geradorDe } from '../formato';
import { ORDEM_SECOES, type Preco, type Produto, type Secao } from '../tipos';

/** O que card, filtro e busca usam de uma peca (a pagina do produto e que tem o resto). */
export interface ProdutoResumido {
  slug: string;
  nome: string;
  tipo: string;
  secao: Secao;
  /** Foto do card: a versao pequena da primeira foto (ou a propria), `null` sem foto. */
  capa: string | null;
  preco: Preco;
  /** Id do gerador: o card mostra o render 3D quando nao ha foto. */
  gerador: string | null;
  /** Da para montar em 3D (gerador ou editor). */
  personalizavel: boolean;
  destaque: boolean;
  /** Dia em que entrou na loja: a ordem "Mais recentes" (ordem.ts). */
  adicionadoEm: string;
  /** Texto de busca ja normalizado (ver busca.ts). */
  termos: string;
}

/** Resposta de toda lista da API. */
export interface ListaDeProdutos {
  itens: ProdutoResumido[];
  total: number;
}

export const ENDPOINTS = {
  /** Todas as pecas publicas, na ordem da loja (destaques, depois as mais novas). */
  produtos: 'produtos.json',
  /** "Nossos geradores": as pecas que da para personalizar ao vivo. */
  geradores: 'geradores.json',
  /** As pecas publicas de uma secao, na ordem da secao. */
  secao: (s: Secao) => `secoes/${s}/produtos.json`,
} as const;

/** Quantas pecas a listagem mostra por vez (a primeira pagina ja vem no HTML). */
export const POR_PAGINA = 24;

/**
 * O produto inteiro como vai para o navegador (pagina do produto): sem o que e so interno
 * (origem do projeto, referencia e licenca da conferencia, marca de ja impresso). Nada disso aparece no site.
 */
export type ProdutoNoCliente = Omit<Produto, 'credito' | 'ref' | 'licenca' | 'jaImpresso'>;

export const paraCliente = ({ credito: _credito, ref: _ref, licenca: _licenca, jaImpresso: _jaImpresso, ...p }: Produto): ProdutoNoCliente => p;

export const paraResumo = (p: ProdutoNoCliente): ProdutoResumido => ({
  slug: p.slug,
  nome: p.nome,
  tipo: p.tipo,
  secao: p.secao,
  capa: p.capa ?? p.midias[0] ?? null,
  preco: p.preco,
  gerador: geradorDe(p) ?? null,
  personalizavel: !!geradorDe(p) || !!p.personalizar,
  destaque: !!p.destaque,
  adicionadoEm: p.adicionadoEm,
  termos: termosDe(p),
});

export const respostaDaLista = (ps: Produto[]): ListaDeProdutos => ({ itens: ps.map(paraResumo), total: ps.length });

/** Por onde a listagem filtra: o tipo (dentro de uma categoria) ou a categoria (lista que cruza categorias, como Nossos geradores). */
export type FiltroDaLista = 'tipo' | 'secao';

/** Quantas pecas de cada valor do filtro: tipos em ordem alfabetica, categorias na ordem da loja. */
export const contarPor = (ps: { tipo: string; secao: Secao }[], filtro: FiltroDaLista = 'tipo'): { valor: string; total: number }[] =>
  [...ps.reduce((m, p) => m.set(p[filtro], (m.get(p[filtro]) ?? 0) + 1), new Map<string, number>())]
    .map(([valor, total]) => ({ valor, total }))
    .sort((a, b) => (filtro === 'secao' ? ORDEM_SECOES.indexOf(a.valor as Secao) - ORDEM_SECOES.indexOf(b.valor as Secao) : a.valor.localeCompare(b.valor, 'pt-BR')));

/** O que a listagem leva no HTML: a primeira pagina e o resumo da lista inteira (filtros e total). */
export interface PaginaInicial {
  inicial: ProdutoResumido[];
  total: number;
  filtro: FiltroDaLista;
  filtros: { valor: string; total: number }[];
}

export const paginaInicial = (ps: Produto[], filtro: FiltroDaLista = 'tipo'): PaginaInicial => ({
  inicial: ps.slice(0, POR_PAGINA).map(paraResumo),
  total: ps.length,
  filtro,
  filtros: contarPor(ps, filtro),
});
