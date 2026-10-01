/** Todas as receitas do catalogo. Modelo novo: escrever a receita e registrar aqui. */
import type { Receita } from '../tipos';
import { chaveiroNome, chaveiroRetangular } from './chaveiro';
import { letrasSeparadas, palavraCamadas, socialCamadas } from './texto';

export const RECEITAS: Receita[] = [palavraCamadas, socialCamadas, letrasSeparadas, chaveiroNome, chaveiroRetangular];

export const receitaPorId = (id: string) => RECEITAS.find((r) => r.id === id);
