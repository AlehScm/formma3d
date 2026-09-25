/**
 * Formatacao de numero para a interface: virgula decimal e ponto de milhar, como
 * o usuario le. O codigo continua usando numero puro; so a borda formata.
 */

/** Casas decimais implicitas num passo: 0.05 -> 2, 0.5 -> 1, 1 -> 0. */
export function casasDoPasso(passo: number): number {
  if (!Number.isFinite(passo) || passo >= 1) return 0;
  const s = String(passo);
  const i = s.indexOf('.');
  return i < 0 ? 0 : Math.min(3, s.length - i - 1);
}

export function formatarNumero(v: number, casas = 0): string {
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/** Le "1,5", "1.5" ou "1.234,5". Devolve null se nao for numero. */
export function lerNumero(texto: string): number | null {
  const t = texto.trim().replace(/\s/g, '');
  if (!t) return null;
  // Com virgula, o ponto e separador de milhar; sem virgula, o ponto e decimal.
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const v = Number(normal);
  return Number.isFinite(v) ? v : null;
}

export function formatarPeso(gramas: number): string {
  return gramas >= 1000 ? `${formatarNumero(gramas / 1000, 2)} kg` : `${formatarNumero(gramas, 0)} g`;
}

/**
 * Texto que ja vem pronto de `lib/` ("55.7 h", "0.029 m2"): troca o ponto decimal
 * pela virgula e o m2 pelo simbolo. So a borda formata; o calculo fica em numero.
 */
export function formatarTexto(t: string): string {
  return t.replace(/(\d)\.(\d)/g, '$1,$2').replace(/m2/g, 'm²');
}
