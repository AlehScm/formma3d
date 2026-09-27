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

/** Tempo de maquina: minutos abaixo de uma hora, horas com uma casa acima. */
export function formatarTempo(horas: number): string {
  return horas < 1 ? `${formatarNumero(horas * 60, 0)} min` : `${formatarNumero(horas, 1)} h`;
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

/** Tempo como o Bambu Studio mostra: "1d 2h 5m", "5h 32m", "48m". */
export function formatarTempoHM(horas: number): string {
  const min = Math.round(horas * 60);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  return [d && `${d}d`, (d || h) && `${h}h`, `${m}m`].filter(Boolean).join(' ');
}

/**
 * Le o tempo do jeito que vier: "5h 32m", "5h32", "1d 2h 3m", "5:32", "332 min",
 * "5,5" (horas). Devolve horas, ou null.
 */
export function lerTempo(texto: string): number | null {
  const t = texto.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!t) return null;
  const relogio = /^(\d+):(\d{1,2})$/.exec(t);
  if (relogio) return Number(relogio[1]) + Number(relogio[2]) / 60;
  if (/[dhm]/.test(t)) {
    const partes = [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*(d|h|min|m)?/g)];
    if (!partes.length || t.replace(/(\d+(?:[.,]\d+)?)\s*(d|h|min|m)?/g, '').trim()) return null;
    let horas = 0;
    partes.forEach(([, n, u], i) => {
      const v = Number(n!.replace(',', '.'));
      // "5h32": numero sem unidade depois de horas sao minutos.
      const unidade = u ?? (i > 0 && partes[i - 1]![2] === 'h' ? 'm' : 'h');
      horas += unidade === 'd' ? v * 24 : unidade === 'h' ? v : v / 60;
    });
    return horas > 0 ? horas : null;
  }
  const v = lerNumero(t);
  return v !== null && v > 0 ? v : null;
}
