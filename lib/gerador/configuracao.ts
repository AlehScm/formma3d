import { valoresPadrao, valoresValidos, type Receita, type Valores } from './tipos';

/** Resolve os valores de uma receita sem conhecer fichas nem o registro de modelos. */
export function resolverValores(r: Receita, exemplo?: Valores, extras?: Valores): Valores {
  return valoresValidos(r, { ...valoresPadrao(r), ...(exemplo ?? {}), ...(extras ?? {}) });
}

/** Fontes dos campos visíveis e da receita para os valores finais já resolvidos. */
export function coletarFontes(r: Receita, valores: Valores): string[] {
  return [...new Set([
    ...r.parametros
      .filter((p) => p.tipo === 'fonte' && (!p.visivel || p.visivel(valores)))
      .map((p) => String(valores[p.id])),
    ...(r.fontes?.(valores) ?? []),
  ])];
}
