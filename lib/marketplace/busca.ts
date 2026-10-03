/**
 * Filtro de texto da loja, sem importar o cadastro: pode ir para o navegador (a pagina
 * passa so os produtos publicos) sem levar junto os ocultos.
 */
import { SECOES, type Produto } from './tipos';

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

/** Sem acento nem maiuscula, em nome, resumo, tipo, secao e no que da para personalizar. */
export function filtrarPorTexto(lista: Produto[], termo: string): Produto[] {
  const t = normalizar(termo.trim());
  if (!t) return lista;
  return lista.filter((p) => normalizar([p.nome, p.resumo, p.tipo, SECOES[p.secao].nome, ...p.personalizavel].join(' ')).includes(t));
}
