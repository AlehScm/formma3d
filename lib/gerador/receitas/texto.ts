/** Letreiros de texto em camadas: palavra (1 ou 2 linhas), @social e letras separadas. */
import { regionBounds, translateRegion, type Region } from '../../geom/region';
import { coresDe, empilhar, hexDe, lerCamadas, parametrosCamadas, sobraLateral } from '../camadas';
import { ajustarLargura, comporLinhas, coracao, escalaParaLargura, estrela, temEmoji, unir, type Linha } from '../formas';
import { ficha } from './fichas';
import type { Contexto, Parametro, Receita, Resultado, Valores } from '../tipos';
import { desenho, num, txt } from '../tipos';

const ALTURA_REF = 20; // mm: as medidas saem desta altura vezes a escala
/** Espaco entre o texto e o adorno, alem do deslocamento escolhido, mm. */
const VAO_ADORNO = 4;

const tamanho = (padrao: number): Parametro => ({
  tipo: 'numero', id: 'largura', rotulo: 'Largura total', grupo: 'Tamanho', padrao, min: 20, max: 500, passo: 1, unidade: 'mm',
  dica: 'Largura da peça pronta, com a base e o adorno',
});
const espacamento: Parametro = { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 100, min: 50, max: 200, passo: 1, unidade: '%', dica: '100% é o espaço da própria fonte' };

const comAdorno = (v: Valores) => v.adorno !== 'nenhum';
const parametrosAdorno = (): Parametro[] => [
  {
    tipo: 'escolha', id: 'adorno', rotulo: 'Adorno ao lado', grupo: 'Adorno', padrao: 'nenhum',
    opcoes: [{ valor: 'nenhum', rotulo: 'Nenhum' }, { valor: 'coracao', rotulo: 'Coração' }, { valor: 'estrela', rotulo: 'Estrela' }, { valor: 'desenho', rotulo: 'Desenho' }],
  },
  { tipo: 'svg', id: 'desenho', rotulo: 'Desenho (SVG)', grupo: 'Adorno', padrao: '', visivel: (v) => v.adorno === 'desenho', dica: 'Arquivo SVG com áreas preenchidas (logo, ícone)' },
  { tipo: 'numero', id: 'larguraAdorno', rotulo: 'Largura do adorno', grupo: 'Adorno', padrao: 40, min: 5, max: 200, passo: 1, unidade: 'mm', visivel: comAdorno },
  { tipo: 'escolha', id: 'ladoAdorno', rotulo: 'Lado', grupo: 'Adorno', padrao: 'direita', opcoes: [{ valor: 'esquerda', rotulo: 'Esquerda' }, { valor: 'direita', rotulo: 'Direita' }], visivel: comAdorno },
  { tipo: 'numero', id: 'adornoX', rotulo: 'Afastar do texto', grupo: 'Adorno', padrao: 0, min: -100, max: 100, passo: 0.5, unidade: 'mm', visivel: comAdorno, dica: 'Negativo encosta ou sobrepõe' },
  { tipo: 'numero', id: 'adornoY', rotulo: 'Subir/descer', grupo: 'Adorno', padrao: 0, min: -100, max: 100, passo: 0.5, unidade: 'mm', visivel: comAdorno },
];

/** O adorno escolhido, na largura pedida e centrado em (0, 0); [] sem adorno. */
function formaDoAdorno(v: Valores): Region {
  const w = num(v, 'larguraAdorno');
  switch (txt(v, 'adorno')) {
    case 'coracao': return coracao(w);
    case 'estrela': return estrela(w);
    case 'desenho': {
      const d = desenho(v, 'desenho');
      return d ? ajustarLargura(d.regiao, w) : [];
    }
    default: return [];
  }
}

function vazio(v: Valores, aviso: string): Resultado {
  const o = lerCamadas(v);
  return { itens: [], cores: coresDe(o), hex: hexDe(v, o), avisos: [aviso] };
}

const textos = (v: Valores) => [txt(v, 'linha1'), txt(v, 'linha2'), txt(v, 'usuario')].join('');
const fontesEmoji = (v: Valores) => (temEmoji(textos(v)) ? ['noto-emoji'] : []);

/** Linhas na escala k (altura das maiusculas = ALTURA_REF * k). */
function linhasDe(v: Valores, ctx: Contexto, k: number): Linha[] {
  const razao = num(v, 'razaoLinha2') / 100;
  const reserva = temEmoji(textos(v)) ? ctx.fonte('noto-emoji') : undefined;
  return [
    { texto: txt(v, 'linha1'), fonte: ctx.fonte(txt(v, 'fonte1')), altura: ALTURA_REF * k, espacamento: num(v, 'espacamento') / 100, reserva },
    { texto: txt(v, 'linha2'), fonte: ctx.fonte(txt(v, 'fonte2') || txt(v, 'fonte1')), altura: ALTURA_REF * k * (razao || 1), espacamento: num(v, 'espacamento') / 100, reserva },
  ];
}

/**
 * Texto (com o adorno ao lado, se houver) na largura pedida. A largura conta a base
 * dos dois lados e o adorno; so o texto muda de escala, o adorno tem largura propria.
 */
function textoNaLargura(v: Valores, ctx: Contexto) {
  const cb = sobraLateral(lerCamadas(v));
  const adorno = formaDoAdorno(v);
  const extra = adorno.length ? Math.max(0, num(v, 'larguraAdorno') + VAO_ADORNO + num(v, 'adornoX')) : 0;
  const compor = (k: number) => comporLinhas(linhasDe(v, ctx, k), num(v, 'entrelinha') || 0);
  const k = escalaParaLargura((k) => compor(k).bounds.w + extra + 2 * cb, num(v, 'largura'));
  const t = compor(k);
  const avisos = v.adorno === 'desenho' && !adorno.length ? ['Escolha um arquivo SVG para o adorno.'] : [];
  if (!adorno.length || !t.letras.length) return { ...t, avisos };
  const a = regionBounds(adorno);
  const direita = txt(v, 'ladoAdorno') !== 'esquerda';
  const dx = direita ? t.bounds.maxX + VAO_ADORNO + num(v, 'adornoX') - a.minX : t.bounds.minX - VAO_ADORNO - num(v, 'adornoX') - a.maxX;
  // Texto + adorno, recentrado: a peca inteira fica em volta de (0, 0).
  const junto = unir([t.regiao, translateRegion(adorno, dx, num(v, 'adornoY'))]);
  const b = regionBounds(junto);
  const regiao = translateRegion(junto, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2);
  return { ...t, regiao, bounds: regionBounds(regiao), avisos };
}

export const palavraCamadas: Receita = {
  ...ficha('palavra-camadas'),
  parametros: [
    { tipo: 'texto', id: 'linha1', rotulo: 'Texto', grupo: 'Texto', padrao: 'Formma', maxCaracteres: 40, dica: 'Aceita emoji (♥ ⭐ 🐾...)' },
    { tipo: 'fonte', id: 'fonte1', rotulo: 'Fonte', grupo: 'Texto', padrao: 'archivo-black' },
    { tipo: 'texto', id: 'linha2', rotulo: 'Segunda linha (opcional)', grupo: 'Texto', padrao: '', maxCaracteres: 40 },
    { tipo: 'fonte', id: 'fonte2', rotulo: 'Fonte da segunda linha', grupo: 'Texto', padrao: 'pacifico', visivel: (v) => !!txt(v, 'linha2').trim() },
    { tipo: 'numero', id: 'razaoLinha2', rotulo: 'Tamanho da segunda linha', grupo: 'Texto', padrao: 60, min: 20, max: 150, passo: 5, unidade: '%', visivel: (v) => !!txt(v, 'linha2').trim() },
    { tipo: 'numero', id: 'entrelinha', rotulo: 'Espaço entre as linhas', grupo: 'Texto', padrao: 2, min: -10, max: 30, passo: 0.5, unidade: 'mm', visivel: (v) => !!txt(v, 'linha2').trim() },
    espacamento,
    tamanho(166),
    ...parametrosAdorno(),
    ...parametrosCamadas(),
  ],
  fontes: fontesEmoji,
  gerar(v, ctx) {
    const t = textoNaLargura(v, ctx);
    if (!t.letras.length) return vazio(v, 'Digite um texto.');
    const o = lerCamadas(v);
    const { pecas, avisos } = empilhar(t.regiao, o);
    return { itens: [{ nome: txt(v, 'linha1').trim() || 'Palavra', pecas }], cores: coresDe(o), hex: hexDe(v, o), avisos: [...t.avisos, ...avisos] };
  },
};

export const socialCamadas: Receita = {
  ...ficha('social-camadas'),
  parametros: [
    { tipo: 'texto', id: 'usuario', rotulo: 'Usuário', grupo: 'Texto', padrao: 'formma3d', maxCaracteres: 30, placeholder: 'sem o @' },
    { tipo: 'fonte', id: 'fonte1', rotulo: 'Fonte', grupo: 'Texto', padrao: 'poppins-800' },
    espacamento,
    tamanho(190),
    ...parametrosAdorno(),
    ...parametrosCamadas({ contornoBase: 7, contornoMeio: 4, contornoTopo: 0.4, espBase: 18 }),
  ],
  fontes: fontesEmoji,
  gerar(v, ctx) {
    const usuario = txt(v, 'usuario').trim().replace(/^@+/, '');
    if (!usuario) return vazio(v, 'Digite o usuário.');
    return palavraCamadas.gerar({ ...v, linha1: '@' + usuario, linha2: '', razaoLinha2: 100, entrelinha: 0, fonte2: txt(v, 'fonte1') }, ctx);
  },
};

export const letrasSeparadas: Receita = {
  ...ficha('letras-separadas'),
  parametros: [
    { tipo: 'texto', id: 'linha1', rotulo: 'Texto', grupo: 'Texto', padrao: 'CASA', maxCaracteres: 20 },
    { tipo: 'fonte', id: 'fonte1', rotulo: 'Fonte', grupo: 'Texto', padrao: 'archivo-black' },
    { ...espacamento, padrao: 115 },
    tamanho(450),
    ...parametrosCamadas({ contornoBase: 6, contornoMeio: 4, contornoTopo: 0.2, espBase: 10, folga: 0.24 }),
  ],
  fontes: fontesEmoji,
  gerar(v, ctx) {
    const vv = { ...v, linha2: '', razaoLinha2: 100, entrelinha: 0, fonte2: txt(v, 'fonte1'), adorno: 'nenhum' };
    const t = textoNaLargura(vv, ctx);
    if (!t.letras.length) return vazio(v, 'Digite um texto.');
    const o = lerCamadas(v);
    const avisos = new Set<string>();
    const itens = t.letras.map((l, i) => {
      const r = empilhar(l.region, o);
      r.avisos.forEach((a) => avisos.add(a));
      return { nome: `${String(i + 1).padStart(2, '0')} ${l.nome}`, pecas: r.pecas };
    });
    return { itens, cores: coresDe(o), hex: hexDe(v, o), avisos: [...avisos] };
  },
};
