/**
 * Etiqueta de cabo: o nome de pe em letras grossas, unidas por uma faixa embaixo, com um canal
 * que atravessa todas as letras para o cabo passar e uma fenda por baixo para encaixar o cabo
 * sem tirar o plugue. Imprime em pe; a cor troca numa altura (uma troca de filamento so).
 */
import { diffRegion, intersectRegion, translateRegion } from '../../geom/region';
import { cortarNaAltura, emPe, furoDeitado, ret } from '../fatias';
import { comporLinhas, contornar, semBuracos, unir } from '../formas';
import { LOTE_MAX, loteDeNomes } from '../lote';
import { ficha } from './fichas';
import type { Parametro, Receita, Resultado } from '../tipos';
import { num, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.5, dica?: string): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica });

/** Parede minima em volta do canal e quanto a faixa tapa entre as letras (vao ate o dobro), mm. */
const PAREDE = 1.6, FECHAR = 4;

export const etiquetaCabo: Receita = {
  ...ficha('etiqueta-cabo'),
  parametros: [
    { tipo: 'texto', id: 'nomes', rotulo: 'Nomes', grupo: 'Texto', padrao: 'John', maxCaracteres: 200, dica: `Até ${LOTE_MAX} nomes separados por vírgula, uma etiqueta por nome` },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'anton' },
    mm('altura', 'Altura das letras', 'Texto', 20, 10, 40),
    { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 92, min: 60, max: 130, passo: 1, unidade: '%', dica: 'Menos de 100% junta as letras' },
    mm('profundidade', 'Profundidade', 'Texto', 10, 6, 20, 0.5, 'Da frente para trás'),
    mm('cabo', 'Diâmetro do cabo', 'Cabo', 3.5, 2, 8, 0.1),
    mm('folga', 'Folga do canal', 'Cabo', 0.3, 0, 1, 0.1),
    { tipo: 'numero', id: 'fenda', rotulo: 'Fenda por baixo', grupo: 'Cabo', padrao: 75, min: 0, max: 100, passo: 5, unidade: '%', dica: 'Largura da fenda, em % do cabo (0 = sem fenda: o cabo entra pela ponta)' },
    { tipo: 'numero', id: 'troca', rotulo: 'Troca de cor', grupo: 'Cores', padrao: 55, min: 0, max: 100, passo: 5, unidade: '%', dica: 'Altura da troca, em % da letra' },
    cor('corBaixo', 'Embaixo', '#f4f4f2'),
    cor('corCima', 'Em cima', '#8ec5ec'),
  ],
  fontes: (v) => [txt(v, 'fonte')],
  gerar(v, ctx): Resultado {
    const cores = ['Embaixo', 'Em cima'], hex = [txt(v, 'corBaixo'), txt(v, 'corCima')];
    const fonte = ctx.fonte(txt(v, 'fonte')), prof = num(v, 'profundidade');
    const r = num(v, 'cabo') / 2 + num(v, 'folga'), zc = PAREDE + r, topoFaixa = zc + r * Math.SQRT2 + PAREDE;
    const meiaFenda = (num(v, 'cabo') * num(v, 'fenda')) / 200;
    const lote = loteDeNomes(v, (linhas) => {
      const texto = linhas.join(' ');
      const t = comporLinhas([{ texto: texto.toLocaleUpperCase('pt-BR'), fonte, altura: num(v, 'altura'), espacamento: num(v, 'espacamento') / 100 }], 0);
      if (!t.letras.length) return { item: null, avisos: [] };
      const pes = t.letras.map((l) => l.bounds.minY).sort((a, b) => a - b), linha = pes[Math.floor(pes.length / 2)]!;
      const b = t.bounds, H = b.maxY - linha;
      // Letras no chao, a sobra das redondas cortada. Embaixo, os vaos entre as letras e os miolos
      // ficam tapados ate a altura da faixa (o canal passa inteiro) e as curvas de fora continuam.
      const letras = intersectRegion(translateRegion(t.regiao, 0, -linha), ret(b.minX - 1, 0, b.maxX + 1, H + 1));
      const faixa = intersectRegion(semBuracos(contornar(contornar(letras, FECHAR), -FECHAR)), ret(b.minX - 1, 0, b.maxX + 1, Math.min(topoFaixa, H)));
      const frente = unir([letras, faixa]);
      const camadas = emPe(frente, -prof / 2, prof / 2, {
        cortes: [zc - r, zc, zc + r * Math.SQRT2],
        ajustar: (fatia, z) => {
          const meia = Math.max(furoDeitado(r, zc, z), z < zc ? meiaFenda : 0);
          return meia > 0 ? diffRegion(fatia, ret(b.minX - 1, -meia, b.maxX + 1, meia)) : fatia;
        },
      });
      const [baixo, cima] = cortarNaAltura(camadas, (H * num(v, 'troca')) / 100);
      const avisos = b.w > 256 ? [`A etiqueta "${texto}" tem ${b.w.toFixed(0)} mm: passa da mesa de 256 mm.`] : [];
      if (topoFaixa > H) avisos.push('O cabo é grosso para a altura das letras: aumente as letras.');
      return {
        item: { nome: texto, pecas: [{ nome: 'Embaixo', cor: 0, camadas: baixo }, { nome: 'Em cima', cor: 1, camadas: cima }].filter((p) => p.camadas.length) },
        avisos,
      };
    });
    return { itens: lote.itens, cores, hex, avisos: lote.avisos, notas: ['Imprima em pé, com a fenda na mesa. Para 2 cores, troque o filamento na altura da troca.', 'Encaixe o cabo pela fenda de baixo: não precisa tirar o plugue.'] };
  },
};
