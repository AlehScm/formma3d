/** Consultas da loja: so o que pode aparecer, busca e filtros. */
import { CATEGORIAS, type Categoria, type Produto } from './tipos';
import { PRODUTOS } from './produtos';

/** Pode aparecer ao publico: publico e, se for de terceiro, com licenca comercial confirmada. */
export const podeAparecer = (p: Produto) => p.visibilidade === 'publico' && (p.origem === 'nosso' || p.licenca === 'comercial-ok');

export const produtosPublicos = (lista: Produto[] = PRODUTOS): Produto[] => lista.filter(podeAparecer);

export const porSlug = (slug: string, lista: Produto[] = PRODUTOS): Produto | undefined => produtosPublicos(lista).find((p) => p.slug === slug);

export const destaques = (lista: Produto[] = PRODUTOS): Produto[] => produtosPublicos(lista).filter((p) => p.destaque);

/** Categorias que tem algo publico, na ordem do cadastro de categorias. */
export const categoriasComProdutos = (lista: Produto[] = PRODUTOS): Categoria[] => {
  const usadas = new Set(produtosPublicos(lista).map((p) => p.categoria));
  return (Object.keys(CATEGORIAS) as Categoria[]).filter((c) => usadas.has(c));
};

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

/** Busca sem acento nem maiuscula em nome, resumo, categoria e no que da para personalizar. */
export function buscar(termo: string, categoria: Categoria | 'todas' = 'todas', lista: Produto[] = PRODUTOS): Produto[] {
  const t = normalizar(termo.trim());
  return produtosPublicos(lista).filter(
    (p) => (categoria === 'todas' || p.categoria === categoria) && (!t || normalizar([p.nome, p.resumo, CATEGORIAS[p.categoria].nome, ...p.personalizavel].join(' ')).includes(t)),
  );
}

/** Texto do preco para a tela. */
export const textoDoPreco = (p: Produto) => (p.preco.status === 'validacao' ? 'Preço em validação' : p.preco.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
