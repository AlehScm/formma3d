/** Chaveiros de nome: em camadas com argola, e retangular com o nome ajustado. */
import { diffRegion, type Region } from '../../geom/region';
import { coresDe, empilhar, hexDe, lerCamadas, parametrosCamadas } from '../camadas';
import { circulo, comporLinhas, contornar, escalaParaLargura, retanguloArredondado, semBuracos, temEmoji, unir } from '../formas';
import { emGrade, LOTE_MAX, nomesDoLote } from '../lote';
import { ficha } from './fichas';
import type { Contexto, Item, Parametro, Receita, Valores } from '../tipos';
import { num, txt } from '../tipos';

const nomes = (padrao: string): Parametro => ({
  tipo: 'texto', id: 'nomes', rotulo: 'Nomes', grupo: 'Texto', padrao, maxCaracteres: 300,
  dica: `Até ${LOTE_MAX} nomes separados por vírgula; "+" quebra a linha dentro de um nome; aceita emoji (♥ 🐾)`,
});
const comEmoji = (v: Valores) => temEmoji(txt(v, 'nomes') + txt(v, 'prefixo') + txt(v, 'sufixo'));
const fontesEmoji = (v: Valores) => (comEmoji(v) ? ['noto-emoji'] : []);
const furo: Parametro[] = [
  { tipo: 'numero', id: 'furo', rotulo: 'Diâmetro do furo', grupo: 'Argola', padrao: 2.5, min: 2, max: 12, passo: 0.5, unidade: 'mm' },
  { tipo: 'numero', id: 'aro', rotulo: 'Largura do aro', grupo: 'Argola', padrao: 1.8, min: 1.2, max: 8, passo: 0.1, unidade: 'mm', dica: 'Material em volta do furo' },
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
    ...parametrosCamadas({ contornoBase: 2.8, contornoMeio: 1.8, espBase: 2.8, espMeio: 1.2, espTopo: 1.2, preencherBase: true }),
  ],
  gerar(v, ctx) {
    const o = lerCamadas(v);
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const reserva = comEmoji(v) ? ctx.fonte('noto-emoji') : undefined;
    const r = lote(v, (linhas, nome) => {
      const t = comporLinhas(linhas.map((texto) => ({ texto, fonte, reserva, altura: num(v, 'altura'), tracking: num(v, 'tracking') })), num(v, 'entrelinha'));
      if (!t.letras.length) return { item: null, avisos: [] };
      const e = empilhar(t.regiao, o, (b) => comArgola(b, txt(v, 'argola'), num(v, 'furo'), num(v, 'aro')));
      return { item: { nome, pecas: e.pecas }, avisos: e.avisos };
    });
    return { itens: r.itens, cores: coresDe(o), hex: hexDe(v, o), avisos: r.avisos };
  },
  fontes: fontesEmoji,
};

/**
 * Argola em aba: disco tangente por fora ao canto de cima a esquerda da placa, com o
 * furo inteiro fora dela (a placa fica lisa) e o aro unido ao canto.
 */
function abaNoCanto(L: number, H: number, raio: number, furo: number, externo: number): { disco: Region; furo: Region } {
  const rf = furo / 2, R = Math.max(externo / 2, rf + 0.8);
  const r = Math.min(raio, L / 2, H / 2);
  const ax = -L / 2 + r, ay = H / 2 - r; // centro do arco do canto
  const d = (r + rf) / Math.SQRT2;
  return { disco: circulo(ax - d, ay + d, R), furo: circulo(ax - d, ay + d, rf, 48) };
}

export const chaveiroRetangular: Receita = {
  ...ficha('chaveiro-retangular'),
  parametros: [
    nomes('Aline+Borges, Ana+Silva da Mata'),
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'archivo-black' },
    { tipo: 'numero', id: 'tracking', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 0, min: -3, max: 10, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'entrelinha', rotulo: 'Espaço entre linhas', grupo: 'Texto', padrao: 1.5, min: -5, max: 20, passo: 0.5, unidade: 'mm' },
    { tipo: 'texto', id: 'prefixo', rotulo: 'Antes do nome', grupo: 'Texto', padrao: '', maxCaracteres: 15 },
    { tipo: 'texto', id: 'sufixo', rotulo: 'Depois do nome', grupo: 'Texto', padrao: '', maxCaracteres: 15 },
    { tipo: 'numero', id: 'largura', rotulo: 'Largura', grupo: 'Placa', padrao: 75, min: 20, max: 200, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'altura', rotulo: 'Altura', grupo: 'Placa', padrao: 30, min: 12, max: 200, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'raio', rotulo: 'Raio dos cantos', grupo: 'Placa', padrao: 5, min: 0, max: 20, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'margemH', rotulo: 'Margem nas laterais', grupo: 'Placa', padrao: 6, min: 0, max: 30, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'margemV', rotulo: 'Margem em cima e embaixo', grupo: 'Placa', padrao: 6, min: 0, max: 30, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'borda', rotulo: 'Borda elevada', grupo: 'Placa', padrao: 1.2, min: 0, max: 5, passo: 0.1, unidade: 'mm', dica: 'Largura da borda em volta da placa (0 = sem borda)' },
    { tipo: 'numero', id: 'espPlaca', rotulo: 'Espessura da placa', grupo: 'Placa', padrao: 3, min: 0.8, max: 10, passo: 0.2, unidade: 'mm' },
    { tipo: 'numero', id: 'contornoNome', rotulo: 'Contorno do nome', grupo: 'Nome', padrao: 1.2, min: 0, max: 3, passo: 0.1, unidade: 'mm', dica: '0 = nome sem contorno (2 cores)' },
    { tipo: 'numero', id: 'espContorno', rotulo: 'Espessura do contorno', grupo: 'Nome', padrao: 0.4, min: 0.2, max: 3, passo: 0.1, unidade: 'mm', visivel: (v) => Number(v.contornoNome) > 0 },
    { tipo: 'numero', id: 'espNome', rotulo: 'Espessura do nome', grupo: 'Nome', padrao: 0.8, min: 0.2, max: 3, passo: 0.1, unidade: 'mm' },
    { tipo: 'liga', id: 'argola', rotulo: 'Argola no canto', grupo: 'Argola', padrao: true },
    { ...furo[0]!, visivel: (v: Valores) => v.argola === true },
    { tipo: 'numero', id: 'externo', rotulo: 'Diâmetro externo da argola', grupo: 'Argola', padrao: 6, min: 3, max: 20, passo: 0.5, unidade: 'mm', visivel: (v) => v.argola === true },
    { tipo: 'cor', id: 'corPlaca', rotulo: 'Placa', grupo: 'Cores', padrao: '#2b2f36' },
    { tipo: 'cor', id: 'corContorno', rotulo: 'Contorno', grupo: 'Cores', padrao: '#f2efe8', visivel: (v) => Number(v.contornoNome) > 0 },
    { tipo: 'cor', id: 'corNome', rotulo: 'Nome', grupo: 'Cores', padrao: '#e0533d' },
  ],
  fontes: fontesEmoji,
  gerar(v, ctx: Contexto) {
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const L = num(v, 'largura'), H = num(v, 'altura'), raio = num(v, 'raio'), borda = num(v, 'borda');
    const W = L - 2 * num(v, 'margemH') - 2 * borda, Hd = H - 2 * num(v, 'margemV') - 2 * borda;
    const cn = num(v, 'contornoNome');
    const ep = num(v, 'espPlaca'), ec = cn > 0 ? num(v, 'espContorno') : 0, en = num(v, 'espNome');
    const cores = cn > 0 ? ['Placa', 'Contorno', 'Nome'] : ['Placa', 'Nome'];
    const hex = cn > 0 ? [txt(v, 'corPlaca'), txt(v, 'corContorno'), txt(v, 'corNome')] : [txt(v, 'corPlaca'), txt(v, 'corNome')];
    const reserva = comEmoji(v) ? ctx.fonte('noto-emoji') : undefined;
    const r = lote(v, (linhas, nome) => {
      // Cada linha do tamanho que enche a largura; se nao couber na altura, todas encolhem juntas.
      const larguraDe = (texto: string, altura: number) => comporLinhas([{ texto, fonte, reserva, altura, tracking: num(v, 'tracking') }], 0).bounds.w;
      const alturas = linhas.map((texto) => 10 * escalaParaLargura((k) => larguraDe(texto, 10 * k) + 2 * cn, W));
      const compor = (f: number) => comporLinhas(linhas.map((texto, i) => ({ texto, fonte, reserva, altura: alturas[i]! * f, tracking: num(v, 'tracking') })), num(v, 'entrelinha'));
      let t = compor(1);
      if (!t.letras.length) return { item: null, avisos: [] };
      let escalaFinal = 1;
      if (t.bounds.h + 2 * cn > Hd) {
        escalaFinal = escalaParaLargura((f) => compor(f).bounds.h + 2 * cn, Hd);
        t = compor(escalaFinal);
      }
      const avisos: string[] = [];
      if (W <= 0 || Hd <= 0) avisos.push('As margens e a borda não deixam espaço para o nome.');
      // Altura das maiusculas da menor linha (a minuscula e menor, mas e a maiuscula que se escolhe).
      const menor = Math.min(...alturas) * escalaFinal;
      if (menor < 2.5) avisos.push(`"${nome}" ficou com letras de ${menor.toFixed(1)} mm: pequeno para imprimir bem.`);

      let placa = retanguloArredondado(0, 0, L, H, raio);
      const fundo = placa;
      if (v.argola === true) {
        const a = abaNoCanto(L, H, raio, num(v, 'furo'), num(v, 'externo'));
        placa = diffRegion(unir([placa, a.disco]), a.furo);
      }
      const camadasPlaca = [{ region: placa, z0: 0, z1: ep }];
      if (borda > 0) camadasPlaca.push({ region: diffRegion(fundo, contornar(fundo, -borda)), z0: ep, z1: ep + ec + en });
      const pecas = [{ nome: 'Placa', cor: 0, camadas: camadasPlaca }];
      if (cn > 0) pecas.push({ nome: 'Contorno', cor: 1, camadas: [{ region: semBuracos(contornar(t.regiao, cn)), z0: ep, z1: ep + ec }] });
      pecas.push({ nome: 'Nome', cor: cores.length - 1, camadas: [{ region: t.regiao, z0: ep + ec, z1: ep + ec + en }] });
      return { item: { nome, pecas }, avisos };
    });
    return { itens: r.itens, cores, hex, avisos: r.avisos };
  },
};
