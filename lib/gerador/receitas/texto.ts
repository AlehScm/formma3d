/** Letreiros de texto em camadas: palavra (1 ou 2 linhas), @social e letras separadas. */
import { coresDe, empilhar, lerCamadas, parametrosCamadas } from '../camadas';
import { comporLinhas, escalaParaLargura, type Linha } from '../formas';
import { ficha } from './fichas';
import type { Contexto, Parametro, Receita, Resultado, Valores } from '../tipos';
import { num, txt } from '../tipos';

const ALTURA_REF = 20; // mm: as medidas saem desta altura vezes a escala

const tamanho = (padrao: number): Parametro => ({
  tipo: 'numero', id: 'largura', rotulo: 'Largura total', grupo: 'Tamanho', padrao, min: 20, max: 500, passo: 1, unidade: 'mm',
  dica: 'Largura da peça pronta, contorno incluído',
});
const espacamento: Parametro = { tipo: 'numero', id: 'tracking', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 0, min: -5, max: 20, passo: 0.1, unidade: 'mm' };

function vazio(v: Valores, aviso: string): Resultado {
  return { itens: [], cores: coresDe(lerCamadas(v)), avisos: [aviso] };
}

/** Linhas na escala k (altura das maiusculas = ALTURA_REF * k). */
function linhasDe(v: Valores, ctx: Contexto, k: number): Linha[] {
  const razao = num(v, 'razaoLinha2') / 100;
  return [
    { texto: txt(v, 'linha1'), fonte: ctx.fonte(txt(v, 'fonte1')), altura: ALTURA_REF * k, tracking: num(v, 'tracking') },
    { texto: txt(v, 'linha2'), fonte: ctx.fonte(txt(v, 'fonte2') || txt(v, 'fonte1')), altura: ALTURA_REF * k * (razao || 1), tracking: num(v, 'tracking') },
  ];
}

/** O texto na largura pedida (a largura conta o contorno da base dos dois lados). */
function textoNaLargura(v: Valores, ctx: Contexto) {
  const cb = num(v, 'contornoBase');
  const compor = (k: number) => comporLinhas(linhasDe(v, ctx, k), num(v, 'entrelinha') || 0);
  const k = escalaParaLargura((k) => compor(k).bounds.w + 2 * cb, num(v, 'largura'));
  return compor(k);
}

export const palavraCamadas: Receita = {
  ...ficha('palavra-camadas'),
  parametros: [
    { tipo: 'texto', id: 'linha1', rotulo: 'Texto', grupo: 'Texto', padrao: 'Formma', maxCaracteres: 40 },
    { tipo: 'fonte', id: 'fonte1', rotulo: 'Fonte', grupo: 'Texto', padrao: 'archivo-black' },
    { tipo: 'texto', id: 'linha2', rotulo: 'Segunda linha (opcional)', grupo: 'Texto', padrao: '', maxCaracteres: 40 },
    { tipo: 'fonte', id: 'fonte2', rotulo: 'Fonte da segunda linha', grupo: 'Texto', padrao: 'pacifico', visivel: (v) => !!txt(v, 'linha2').trim() },
    { tipo: 'numero', id: 'razaoLinha2', rotulo: 'Tamanho da segunda linha', grupo: 'Texto', padrao: 60, min: 20, max: 150, passo: 5, unidade: '%', visivel: (v) => !!txt(v, 'linha2').trim() },
    { tipo: 'numero', id: 'entrelinha', rotulo: 'Espaço entre as linhas', grupo: 'Texto', padrao: 2, min: -10, max: 30, passo: 0.5, unidade: 'mm', visivel: (v) => !!txt(v, 'linha2').trim() },
    espacamento,
    tamanho(160),
    ...parametrosCamadas(),
  ],
  gerar(v, ctx) {
    const t = textoNaLargura(v, ctx);
    if (!t.letras.length) return vazio(v, 'Digite um texto.');
    const o = lerCamadas(v);
    const { pecas, avisos } = empilhar(t.regiao, o);
    return { itens: [{ nome: txt(v, 'linha1').trim() || 'Palavra', pecas }], cores: coresDe(o), avisos };
  },
};

export const socialCamadas: Receita = {
  ...ficha('social-camadas'),
  parametros: [
    { tipo: 'texto', id: 'usuario', rotulo: 'Usuário', grupo: 'Texto', padrao: 'formma3d', maxCaracteres: 30, placeholder: 'sem o @' },
    { tipo: 'fonte', id: 'fonte1', rotulo: 'Fonte', grupo: 'Texto', padrao: 'poppins-800' },
    espacamento,
    tamanho(180),
    ...parametrosCamadas({ cores: 2, contornoBase: 4 }),
  ],
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
    { ...espacamento, padrao: 6 },
    tamanho(300),
    ...parametrosCamadas({ contornoBase: 3, contornoMeio: 1.5 }),
  ],
  gerar(v, ctx) {
    const vv = { ...v, linha2: '', razaoLinha2: 100, entrelinha: 0, fonte2: txt(v, 'fonte1') };
    const t = textoNaLargura(vv, ctx);
    if (!t.letras.length) return vazio(v, 'Digite um texto.');
    const o = lerCamadas(v);
    const avisos = new Set<string>();
    const itens = t.letras.map((l, i) => {
      const r = empilhar(l.region, o);
      r.avisos.forEach((a) => avisos.add(a));
      return { nome: `${String(i + 1).padStart(2, '0')} ${l.nome}`, pecas: r.pecas };
    });
    return { itens, cores: coresDe(o), avisos: [...avisos] };
  },
};
