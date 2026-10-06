/**
 * Receita interna do editor 2D livre (/design): recebe o design em JSON e devolve uma peca
 * por camada. Nao entra no catalogo nem na lista RECEITAS: o worker a acha por id.
 */
import { lerDesign, fontesDoDesign } from '@/lib/design/documento';
import { designParaResultado } from '@/lib/design/saida';
import type { Receita, Resultado } from '../tipos';
import { txt } from '../tipos';

export const DESIGN_LIVRE = 'design-livre';

const ler = (json: string) => {
  try {
    return lerDesign(JSON.parse(json));
  } catch {
    return null;
  }
};

export const designLivre: Receita = {
  id: DESIGN_LIVRE,
  nome: 'Design livre',
  familia: 'multicor',
  resumo: 'Composição livre do editor 2D, uma peça por camada.',
  parametros: [{ tipo: 'svg', id: 'design', rotulo: 'Design', padrao: '' }],
  fontes: (v) => {
    const d = ler(txt(v, 'design'));
    return d ? fontesDoDesign(d) : [];
  },
  gerar(v, ctx): Resultado {
    const d = ler(txt(v, 'design'));
    if (!d) return { itens: [], cores: [], avisos: ['O design não pôde ser lido.'] };
    const carregadas = new Set(fontesDoDesign(d));
    return designParaResultado(d, (id) => (carregadas.has(id) ? ctx.fonte(id) : undefined));
  },
};
