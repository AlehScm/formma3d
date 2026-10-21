/**
 * Onde o app esta rodando. Interno = no computador da loja (localhost): la aparecem custo,
 * lucro, margem e a divisao entre socios. No site publicado o visitante ve so a versao do
 * cliente. `?cliente=1` mostra a versao do cliente tambem no localhost, para conferir.
 */
const LOCAIS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export function ehInterno(hostname: string, busca = ''): boolean {
  return LOCAIS.has(hostname) && !new URLSearchParams(busca).has('cliente');
}
