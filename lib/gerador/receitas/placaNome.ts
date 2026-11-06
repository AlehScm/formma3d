/**
 * Placa de nome em pe: o nome em letras grossas, de pe, sobre uma base fina de cantos redondos.
 * Imprime em pe, como fica na mesa: a base deitada e as letras em fatias por cima, em 1 ou 2
 * cores (a troca de cor e na altura da base).
 */
import { intersectRegion, regionBounds, translateRegion } from '../../geom/region';
import { emPe, ret } from '../fatias';
import { comporLinhas, retanguloArredondado } from '../formas';
import { LOTE_MAX, loteDeNomes } from '../lote';
import { ficha } from './fichas';
import type { Parametro, Receita, Resultado } from '../tipos';
import { num, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.5, dica?: string): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica });

export const placaNome: Receita = {
  ...ficha('placa-nome'),
  parametros: [
    { tipo: 'texto', id: 'nomes', rotulo: 'Nomes', grupo: 'Texto', padrao: 'Oliver', maxCaracteres: 200, dica: `Até ${LOTE_MAX} nomes separados por vírgula` },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'luckiest-guy' },
    { tipo: 'liga', id: 'maiusculas', rotulo: 'Tudo em maiúsculas', grupo: 'Texto', padrao: true },
    mm('altura', 'Altura das letras', 'Texto', 30, 12, 80),
    { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 100, min: 70, max: 150, passo: 1, unidade: '%', dica: '100% é o espaço da própria fonte' },
    mm('profundidade', 'Profundidade das letras', 'Texto', 8, 3, 20, 0.5, 'Da frente para trás'),
    mm('espBase', 'Espessura da base', 'Base', 2, 1.2, 6, 0.2),
    mm('sobraLados', 'Sobra da base nos lados', 'Base', 4, 0, 20),
    mm('sobraFrente', 'Sobra da base na frente e atrás', 'Base', 5, 1, 25),
    cor('corBase', 'Base', '#3f6fb5'),
    cor('corLetras', 'Letras', '#3f6fb5'),
  ],
  fontes: (v) => [txt(v, 'fonte')],
  gerar(v, ctx): Resultado {
    const cores = ['Base', 'Letras'], hex = [txt(v, 'corBase'), txt(v, 'corLetras')];
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const eb = num(v, 'espBase'), prof = num(v, 'profundidade');
    const lote = loteDeNomes(v, (linhas) => {
      const texto = linhas.join(' ');
      const t = comporLinhas([{ texto: v.maiusculas === false ? texto : texto.toLocaleUpperCase('pt-BR'), fonte, altura: num(v, 'altura'), espacamento: num(v, 'espacamento') / 100 }], 0);
      if (!t.letras.length) return { item: null, avisos: [] };
      // O pe das letras na linha de base (o mais comum entre elas), em cima da base; a sobra das
      // letras redondas abaixo da linha fica cortada, para todas assentarem por igual.
      const pes = t.letras.map((l) => l.bounds.minY).sort((a, b) => a - b), linha = pes[Math.floor(pes.length / 2)]!;
      const frente = intersectRegion(translateRegion(t.regiao, 0, eb - linha), ret(t.bounds.minX - 1, eb, t.bounds.maxX + 1, t.bounds.maxY - linha + eb + 1));
      const b = regionBounds(frente);
      const largura = b.w + 2 * num(v, 'sobraLados'), fundo = prof + 2 * num(v, 'sobraFrente');
      const base = retanguloArredondado((b.minX + b.maxX) / 2, 0, largura, fundo, Math.min(4, fundo / 3));
      return {
        item: {
          nome: texto,
          pecas: [
            { nome: 'Base', cor: 0, camadas: [{ region: base, z0: 0, z1: eb }] },
            { nome: 'Letras', cor: 1, camadas: emPe(frente, -prof / 2, prof / 2) },
          ],
        },
        avisos: largura > 256 ? [`A placa "${texto}" tem ${largura.toFixed(0)} mm: passa da mesa de 256 mm.`] : [],
      };
    });
    return { itens: lote.itens, cores, hex, avisos: lote.avisos, notas: ['Imprima em pé, como fica na mesa: a base embaixo e as letras para cima. Para 2 cores, troque o filamento no fim da base.'] };
  },
};
