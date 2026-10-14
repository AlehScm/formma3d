import { receitaPorId } from './receitas';
import { ficha } from './receitas/fichas';
import { coletarFontes, resolverValores } from './configuracao';
import type { Valores } from './tipos';

type OpcoesModelo = { base: 'padrao' | 'exemplo'; extras?: Valores };

export function prepararModelo(id: string, opcoes: OpcoesModelo) {
  const receita = receitaPorId(id);
  if (!receita) throw new Error('Gerador desconhecido: ' + id);
  const exemplo = opcoes.base === 'exemplo' ? ficha(id).exemplo : undefined;
  const valores = resolverValores(receita, exemplo, opcoes.extras);
  return { receita, valores, idsFonte: coletarFontes(receita, valores) };
}

export function prepararExemplo(id: string) {
  return prepararModelo(id, { base: 'exemplo' });
}
