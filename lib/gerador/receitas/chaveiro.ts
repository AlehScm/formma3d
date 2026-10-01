/** Chaveiros de nome: em camadas com argola, e retangular com o nome ajustado. */
import { diffRegion, regionBounds, translateRegion, type Region } from '../../geom/region';
import { coresDe, empilhar, lerCamadas, parametrosCamadas } from '../camadas';
import { circulo, comporLinhas, escalaParaLargura, retanguloArredondado, unir } from '../formas';
import { emGrade, LOTE_MAX, nomesDoLote } from '../lote';
import { ficha } from './fichas';
import type { Contexto, Item, Parametro, Receita, Valores } from '../tipos';
import { num, txt } from '../tipos';

const nomes = (padrao: string): Parametro => ({
  tipo: 'texto', id: 'nomes', rotulo: 'Nomes', grupo: 'Texto', padrao, maxCaracteres: 300,
  dica: `Até ${LOTE_MAX} nomes separados por vírgula; "+" quebra a linha dentro de um nome`,
});
const furo: Parametro[] = [
  { tipo: 'numero', id: 'furo', rotulo: 'Diâmetro do furo', grupo: 'Argola', padrao: 4, min: 2, max: 12, passo: 0.5, unidade: 'mm' },
  { tipo: 'numero', id: 'aro', rotulo: 'Largura do aro', grupo: 'Argola', padrao: 2.5, min: 1.2, max: 8, passo: 0.1, unidade: 'mm', dica: 'Material em volta do furo' },
];

/** Linhas de um nome ("Ana+Maria" -> 2 linhas), com prefixo na 1a e sufixo na ultima. */
function linhasDoNome(nome: string, prefixo: string, sufixo: string): string[] {
  const ls = nome.split('+').map((s) => s.trim()).filter(Boolean);
  if (!ls.length) return [];
  ls[0] = prefixo + ls[0];
  ls[ls.length - 1] = ls[ls.length - 1] + sufixo;
  return ls;
}

function lote(v: Valores, fazer: (linhas: string[], nome: string) => { item: Item | null; avisos: string[] }) {
  const lista = nomesDoLote(txt(v, 'nomes'));
  const avisos = new Set<string>();
  if (lista.length > LOTE_MAX) avisos.add(`Só os ${LOTE_MAX} primeiros nomes entram.`);
  const itens: Item[] = [];
  for (const nome of lista.slice(0, LOTE_MAX)) {
    const r = fazer(linhasDoNome(nome, txt(v, 'prefixo'), txt(v, 'sufixo')), nome.replace(/\+/g, ' '));
    r.avisos.forEach((a) => avisos.add(a));
    if (r.item) itens.push(r.item);
  }
  if (!itens.length) avisos.add('Digite ao menos um nome.');
  return { itens: itens.length > 1 ? emGrade(itens) : itens, avisos: [...avisos] };
}

/**
 * Argola: disco unido a base no ponto mais a esquerda (ou direita) dela, com o furo
 * encostado na borda da base -- assim o furo fica a um contorno inteiro das letras.
 */
function comArgola(base: Region, lado: string, furo: number, aro: number): Region {
  if (lado === 'nenhuma' || !base.length) return base;
  const rf = furo / 2, R = rf + aro;
  const pts = base.flatMap((p) => p.outer);
  const extremo = pts.reduce((a, b) => (lado === 'direita' ? (b.x > a.x ? b : a) : b.x < a.x ? b : a));
  const cx = lado === 'direita' ? extremo.x + rf : extremo.x - rf;
  return diffRegion(unir([base, circulo(cx, extremo.y, R)]), circulo(cx, extremo.y, rf, 48));
}

export const chaveiroNome: Receita = {
  ...ficha('chaveiro-nome'),
  parametros: [
    nomes('Ana, Pedro, Lu'),
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'lobster' },
    { tipo: 'numero', id: 'altura', rotulo: 'Altura das letras', grupo: 'Texto', padrao: 14, min: 5, max: 60, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'tracking', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 0, min: -3, max: 10, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'entrelinha', rotulo: 'Espaço entre linhas', grupo: 'Texto', padrao: 1, min: -10, max: 20, passo: 0.5, unidade: 'mm' },
    { tipo: 'texto', id: 'prefixo', rotulo: 'Antes do nome', grupo: 'Texto', padrao: '', maxCaracteres: 15 },
    { tipo: 'texto', id: 'sufixo', rotulo: 'Depois do nome', grupo: 'Texto', padrao: '', maxCaracteres: 15 },
    { tipo: 'escolha', id: 'argola', rotulo: 'Argola', grupo: 'Argola', padrao: 'esquerda', opcoes: [{ valor: 'esquerda', rotulo: 'À esquerda' }, { valor: 'direita', rotulo: 'À direita' }, { valor: 'nenhuma', rotulo: 'Sem argola' }] },
    ...furo.map((p) => ({ ...p, visivel: (v: Valores) => v.argola !== 'nenhuma' })),
    ...parametrosCamadas({ contornoBase: 3, contornoMeio: 1.2, espBase: 2.4, espMeio: 1, espTopo: 1 }),
  ],
  gerar(v, ctx) {
    const o = lerCamadas(v);
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const r = lote(v, (linhas, nome) => {
      const t = comporLinhas(linhas.map((texto) => ({ texto, fonte, altura: num(v, 'altura'), tracking: num(v, 'tracking') })), num(v, 'entrelinha'));
      if (!t.letras.length) return { item: null, avisos: [] };
      const e = empilhar(t.regiao, o, (b) => comArgola(b, txt(v, 'argola'), num(v, 'furo'), num(v, 'aro')));
      return { item: { nome, pecas: e.pecas }, avisos: e.avisos };
    });
    return { itens: r.itens, cores: coresDe(o), avisos: r.avisos };
  },
};

export const chaveiroRetangular: Receita = {
  ...ficha('chaveiro-retangular'),
  parametros: [
    nomes('Maria Eduarda Silva'),
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'montserrat-900' },
    { tipo: 'numero', id: 'alturaMax', rotulo: 'Altura máx. das letras', grupo: 'Texto', padrao: 10, min: 3, max: 40, passo: 0.5, unidade: 'mm', dica: 'O nome encolhe para caber na largura; não passa desta altura' },
    { tipo: 'numero', id: 'entrelinha', rotulo: 'Espaço entre linhas', grupo: 'Texto', padrao: 1.5, min: 0, max: 20, passo: 0.5, unidade: 'mm' },
    { tipo: 'texto', id: 'prefixo', rotulo: 'Antes do nome', grupo: 'Texto', padrao: '', maxCaracteres: 15 },
    { tipo: 'texto', id: 'sufixo', rotulo: 'Depois do nome', grupo: 'Texto', padrao: '', maxCaracteres: 15 },
    { tipo: 'numero', id: 'largura', rotulo: 'Largura', grupo: 'Placa', padrao: 75, min: 30, max: 200, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'margem', rotulo: 'Margem', grupo: 'Placa', padrao: 3, min: 1, max: 15, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'raio', rotulo: 'Raio dos cantos', grupo: 'Placa', padrao: 4, min: 0, max: 20, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'espBase', rotulo: 'Espessura da placa', grupo: 'Placa', padrao: 2.4, min: 0.8, max: 10, passo: 0.2, unidade: 'mm' },
    { tipo: 'numero', id: 'espTopo', rotulo: 'Altura do nome', grupo: 'Placa', padrao: 1, min: 0.4, max: 5, passo: 0.2, unidade: 'mm' },
    furo[0]!,
  ],
  gerar(v, ctx: Contexto) {
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const L = num(v, 'largura'), m = num(v, 'margem'), rf = num(v, 'furo') / 2;
    const zonaFuro = 2 * rf + m; // furo + margem ate o texto
    const livre = L - 2 * m - zonaFuro;
    const cores = ['Placa', 'Nome'];
    const r = lote(v, (linhas, nome) => {
      const compor = (k: number) => comporLinhas(linhas.map((texto) => ({ texto, fonte, altura: 10 * k })), num(v, 'entrelinha'));
      const t0 = compor(1);
      if (!t0.letras.length) return { item: null, avisos: [] };
      // Escala que faz a linha mais larga caber em `livre`, sem passar da altura maxima.
      const k = Math.min(escalaParaLargura((k) => compor(k).bounds.w, livre), num(v, 'alturaMax') / 10);
      const t = compor(k);
      const H = Math.max(t.bounds.h + 2 * m, 2 * rf + 2 * m);
      const placa = diffRegion(retanguloArredondado(0, 0, L, H, num(v, 'raio')), circulo(-L / 2 + m + rf, 0, rf, 48));
      const dx = -L / 2 + m + zonaFuro + livre / 2;
      const texto = translateRegion(t.regiao, dx, 0);
      const avisos = livre <= 0 ? ['A placa é estreita demais para o furo e as margens.'] : [];
      const tb = regionBounds(texto);
      if (tb.h < 2.5) avisos.push(`"${nome}" ficou com ${tb.h.toFixed(1)} mm de altura: pequeno para imprimir bem (aumente a largura).`);
      const eb = num(v, 'espBase');
      return {
        item: { nome, pecas: [{ nome: 'Placa', cor: 0, camadas: [{ region: placa, z0: 0, z1: eb }] }, { nome: 'Nome', cor: 1, camadas: [{ region: texto, z0: eb, z1: eb + num(v, 'espTopo') }] }] },
        avisos,
      };
    });
    return { itens: r.itens, cores, avisos: r.avisos };
  },
};
