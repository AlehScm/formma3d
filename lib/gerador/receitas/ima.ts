/**
 * Ima com nome: o nome em camadas de cor, como o chaveiro mas sem argola, com a cavidade do
 * ima de neodimio atras. A cavidade fica do lado da mesa (aberta), para colar o ima depois.
 */
import { diffRegion, regionBounds, type Pt, type Region } from '../../geom/region';
import { coresDe, empilhar, hexDe, lerCamadas, parametrosCamadas } from '../camadas';
import { circulo, comporLinhas, contornar, pontoDentro, temEmoji } from '../formas';
import { LOTE_MAX, loteDeNomes } from '../lote';
import { ficha } from './fichas';
import type { Parametro, Peca, Receita, Valores } from '../tipos';
import { num, txt } from '../tipos';

/** Folga no diametro do ima, chao minimo sobre a cavidade e margem ate a borda da base, mm. */
const FOLGA_IMA = 0.4, CHAO_MIN = 0.6, MARGEM = 1.2;

const comEmoji = (v: Valores) => temEmoji(txt(v, 'nomes'));

/** Onde cabem `qtd` imas de raio `r` dentro da base: espalhados na largura, sem se tocar. */
function lugaresDosImas(base: Region, r: number, qtd: number): Pt[] {
  const area = contornar(base, -(r + MARGEM));
  const b = regionBounds(base), cy = (b.minY + b.maxY) / 2;
  const pontos: Pt[] = [];
  for (let i = 0; i < qtd; i++) {
    const p = pontoDentro(area, { x: b.minX + (b.w * (i + 0.5)) / qtd, y: cy }, 0.5);
    if (p && pontos.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= 2 * r + MARGEM)) pontos.push(p);
  }
  return pontos;
}

/** A peca com `furos` abertos por baixo ate `prof`: a camada que cruza essa altura e dividida. */
function furarPorBaixo(p: Peca, furos: Region, prof: number): Peca {
  return {
    ...p,
    camadas: p.camadas.flatMap((c) => {
      if (c.z0 >= prof) return [c];
      if (c.z1 <= prof) return [{ ...c, region: diffRegion(c.region, furos) }];
      return [{ ...c, region: diffRegion(c.region, furos), z1: prof }, { ...c, z0: prof }];
    }),
  };
}

export const imaNome: Receita = {
  ...ficha('ima-nome'),
  parametros: [
    {
      tipo: 'texto', id: 'nomes', rotulo: 'Nomes', grupo: 'Texto', padrao: 'Amelia, Lucas', maxCaracteres: 300,
      dica: `Até ${LOTE_MAX} nomes separados por vírgula; "+" quebra a linha dentro de um nome`,
    },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'pacifico' },
    { tipo: 'numero', id: 'altura', rotulo: 'Altura das letras', grupo: 'Texto', padrao: 18, min: 8, max: 60, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 100, min: 50, max: 200, passo: 1, unidade: '%', dica: '100% é o espaço da própria fonte' },
    { tipo: 'numero', id: 'entrelinha', rotulo: 'Espaço entre linhas', grupo: 'Texto', padrao: 1, min: -10, max: 20, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'imaDiametro', rotulo: 'Diâmetro do ímã', grupo: 'Ímã', padrao: 10, min: 5, max: 25, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'imaEspessura', rotulo: 'Espessura do ímã', grupo: 'Ímã', padrao: 2, min: 1, max: 5, passo: 0.5, unidade: 'mm' },
    {
      tipo: 'escolha', id: 'imaQtd', rotulo: 'Quantos ímãs', grupo: 'Ímã', padrao: 'auto',
      opcoes: [{ valor: 'auto', rotulo: 'Pelo tamanho' }, { valor: '1', rotulo: '1' }, { valor: '2', rotulo: '2' }, { valor: '3', rotulo: '3' }],
    },
    ...parametrosCamadas({ cores: 2, contornoBase: 2.6, espBase: 3.2, espTopo: 1.4, preencherBase: true, corBase: '#5b2a86', corTopo: '#f8f4ec' }),
  ],
  fontes: (v) => [txt(v, 'fonte'), ...(comEmoji(v) ? ['noto-emoji'] : [])],
  gerar(v, ctx) {
    const o = lerCamadas(v);
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const reserva = comEmoji(v) ? ctx.fonte('noto-emoji') : undefined;
    const r = num(v, 'imaDiametro') / 2 + FOLGA_IMA / 2, prof = num(v, 'imaEspessura') + 0.2;
    const avisos: string[] = [];
    if (o.espBase < prof + CHAO_MIN) avisos.push(`A base é fina para o ímã: use pelo menos ${(prof + CHAO_MIN).toFixed(1)} mm de espessura da base.`);
    const lote = loteDeNomes(v, (linhas) => {
      const t = comporLinhas(linhas.map((texto) => ({ texto, fonte, reserva, altura: num(v, 'altura'), espacamento: num(v, 'espacamento') / 100 })), num(v, 'entrelinha'));
      if (!t.letras.length) return { item: null, avisos: [] };
      const e = empilhar(t.regiao, o);
      const base = e.pecas[0]!.camadas[0]!.region, largura = regionBounds(base).w;
      const qtd = txt(v, 'imaQtd') === 'auto' ? (largura < 80 ? 1 : largura < 160 ? 2 : 3) : num(v, 'imaQtd');
      const lugares = lugaresDosImas(base, r, qtd);
      const avisosNome = [...e.avisos];
      if (lugares.length < qtd) avisosNome.push(lugares.length ? `Só ${lugares.length} ímã(s) couberam na base.` : 'O ímã não cabe na base: diminua o ímã ou aumente as letras.');
      const furos = lugares.flatMap((p) => circulo(p.x, p.y, r, 48));
      const pecas = [furarPorBaixo(e.pecas[0]!, furos, Math.min(prof, o.espBase - CHAO_MIN)), ...e.pecas.slice(1)];
      return { item: { nome: linhas.join(' '), pecas }, avisos: avisosNome };
    });
    return { itens: lote.itens, cores: coresDe(o), hex: hexDe(v, o), avisos: [...avisos, ...lote.avisos], notas: ['Imprima com a base na mesa: a cavidade fica atrás. Cole o ímã com uma gota de cola.'] };
  },
};
