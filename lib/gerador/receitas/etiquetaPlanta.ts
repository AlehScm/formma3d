/**
 * Etiqueta de planta: o nome em letras grossas apoiado numa travessa, e o espeto pontudo
 * descendo do meio dela para fincar na terra. Imprime deitada, numa peca de 2 cores: as letras
 * (mais altas) e o espeto com a travessa.
 */
import { diffRegion, regionBounds, type Region } from '../../geom/region';
import { comporLinhas, retanguloArredondado, unir } from '../formas';
import { LOTE_MAX, loteDeNomes } from '../lote';
import { ficha } from './fichas';
import type { Parametro, Receita, Resultado } from '../tipos';
import { num, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.5, dica?: string): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica });

/** Quanto a travessa sobe no pe das letras (as letras redondas apoiam nela, nao num ponto), mm. */
const APOIO = 1;

/** Espeto de largura `w` e comprimento `c` descendo de (cx, y0), com a ponta em triangulo. */
function espeto(cx: number, y0: number, w: number, c: number): Region {
  const ponta = Math.min(w * 1.4, c / 3);
  return [{ outer: [
    { x: cx - w / 2, y: y0 }, { x: cx - w / 2, y: y0 - c + ponta }, { x: cx, y: y0 - c },
    { x: cx + w / 2, y: y0 - c + ponta }, { x: cx + w / 2, y: y0 },
  ], holes: [] }];
}

export const etiquetaPlanta: Receita = {
  ...ficha('etiqueta-planta'),
  parametros: [
    { tipo: 'texto', id: 'nomes', rotulo: 'Nomes das plantas', grupo: 'Texto', padrao: 'Hortelã, Manjericão', maxCaracteres: 200, dica: `Até ${LOTE_MAX} nomes separados por vírgula` },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'luckiest-guy' },
    { tipo: 'liga', id: 'maiusculas', rotulo: 'Tudo em maiúsculas', grupo: 'Texto', padrao: true },
    mm('altura', 'Altura das letras', 'Texto', 18, 8, 40),
    { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 100, min: 70, max: 150, passo: 1, unidade: '%', dica: '100% é o espaço da própria fonte' },
    mm('espLetras', 'Espessura das letras', 'Texto', 5, 2, 10),
    mm('comprimento', 'Comprimento do espeto', 'Espeto', 100, 50, 200, 1, 'Da travessa até a ponta'),
    mm('larguraEspeto', 'Largura do espeto', 'Espeto', 8, 4, 15),
    mm('espEspeto', 'Espessura do espeto e da travessa', 'Espeto', 3, 1.6, 6, 0.2),
    mm('alturaTravessa', 'Altura da travessa', 'Espeto', 4, 2, 10),
    mm('sobraTravessa', 'Sobra da travessa nas pontas', 'Espeto', 3, 0, 15),
    cor('corLetras', 'Letras', '#2f8f46'),
    cor('corEspeto', 'Espeto', '#d1d5db'),
  ],
  fontes: (v) => [txt(v, 'fonte')],
  gerar(v, ctx): Resultado {
    const cores = ['Espeto', 'Letras'], hex = [txt(v, 'corEspeto'), txt(v, 'corLetras')];
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const lote = loteDeNomes(v, (linhas) => {
      const texto = linhas.join(' ');
      const t = comporLinhas([{ texto: v.maiusculas === false ? texto : texto.toLocaleUpperCase('pt-BR'), fonte, altura: num(v, 'altura'), espacamento: num(v, 'espacamento') / 100 }], 0);
      if (!t.letras.length) return { item: null, avisos: [] };
      const b = regionBounds(t.regiao), cx = (b.minX + b.maxX) / 2;
      const hT = num(v, 'alturaTravessa'), topoT = b.minY + APOIO, w = b.w + 2 * num(v, 'sobraTravessa');
      const travessa = retanguloArredondado(cx, topoT - hT / 2, w, hT, Math.min(hT / 2, 2));
      const suporte = unir([travessa, espeto(cx, topoT - hT + 0.5, num(v, 'larguraEspeto'), num(v, 'comprimento'))]);
      const letras = diffRegion(t.regiao, travessa);
      return {
        item: {
          nome: texto,
          pecas: [
            { nome: 'Espeto', cor: 0, camadas: [{ region: suporte, z0: 0, z1: num(v, 'espEspeto') }] },
            { nome: 'Letras', cor: 1, camadas: [{ region: letras, z0: 0, z1: num(v, 'espLetras') }] },
          ],
        },
        avisos: [],
      };
    });
    return { itens: lote.itens, cores, hex, avisos: lote.avisos, notas: ['Imprima deitada, numa peça de 2 cores; as letras ficam mais altas que o espeto.'] };
  },
};
