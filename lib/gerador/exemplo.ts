import { receitaPorId } from './receitas';
import { ficha } from './receitas/fichas';
import { valoresPadrao } from './tipos';

export function prepararExemplo(id: string) {
  const receita = receitaPorId(id);
  if (!receita) throw new Error('Gerador desconhecido: ' + id);
  const valores = { ...valoresPadrao(receita), ...(ficha(id).exemplo ?? {}) };
  const fontes = new Set([
    ...receita.parametros.filter((p) => p.tipo === 'fonte' && (!p.visivel || p.visivel(valores))).map((p) => String(valores[p.id])),
    ...(receita.fontes?.(valores) ?? []),
  ]);
  return { receita, valores, idsFonte: [...fontes] };
}
