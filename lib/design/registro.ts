/**
 * Acesso as receitas a partir do design sem import circular (receitas/index ja importa a
 * receita do design). O index registra o `receitaPorId` dele quando carrega.
 */
import type { Receita } from '@/lib/gerador/tipos';

let achar: ((id: string) => Receita | undefined) | null = null;

export const registrarReceitas = (f: (id: string) => Receita | undefined) => {
  achar = f;
};

export const receitaDoModelo = (id: string): Receita | undefined => achar?.(id);
