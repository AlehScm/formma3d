/**
 * Filtro de texto da loja, sem importar o cadastro: pode ir para o navegador (a pagina
 * passa so os produtos publicos) sem levar junto os ocultos.
 */
import { SECOES, type Produto } from './tipos';

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

/** Texto de busca da peca, sem acento nem maiuscula: nome, resumo, tipo, secao e o que da para personalizar. */
export const termosDe = (p: Pick<Produto, 'nome' | 'resumo' | 'tipo' | 'secao' | 'personalizavel'>) =>
  normalizar([p.nome, p.resumo, p.tipo, SECOES[p.secao].nome, ...p.personalizavel].join(' '));

/** So as pecas com o termo nos `termos` (sem acento nem maiuscula); termo vazio devolve tudo. */
export function filtrarPorTexto<T extends { termos: string }>(lista: T[], termo: string): T[] {
  const t = normalizar(termo.trim());
  return t ? lista.filter((p) => p.termos.includes(t)) : lista;
}
