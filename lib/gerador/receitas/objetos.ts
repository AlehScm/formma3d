/**
 * Objetos parametricos: suporte de foto com nome, suporte de palitos, porta-canetas em
 * grade e enfeite floco de neve com nome.
 */
import { diffRegion, regionBounds, rotateRegion, type Region } from '../../geom/region';
import { circulo, contornar, comporLinhas, retanguloArredondado, semBuracos, temEmoji, textoNaCaixa, unir } from '../formas';
import { floco } from '../figuras';
import { comArgola, emGrade, LOTE_MAX, nomesDoLote } from '../lote';
import { ficha } from './fichas';
import type { Camada, Item, Parametro, Receita, Resultado } from '../tipos';
import { liga, num, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });

/**
 * Suporte de foto: a base acompanha o contorno do nome e tem uma fenda no alto onde a
 * foto encaixa em pe. Imprime deitada (a espessura e a profundidade da peca em pe); as
 * letras saem a parte para colar na frente.
 */
export const suporteFoto: Receita = {
  ...ficha('suporte-foto'),
  parametros: [
    { tipo: 'texto', id: 'nome', rotulo: 'Nome', grupo: 'Texto', padrao: 'ELISA', maxCaracteres: 20 },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'luckiest-guy' },
    { tipo: 'numero', id: 'altura', rotulo: 'Altura das letras', grupo: 'Texto', padrao: 36, min: 15, max: 200, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 104, min: 50, max: 200, passo: 1, unidade: '%' },
    { tipo: 'numero', id: 'espTexto', rotulo: 'Espessura das letras', grupo: 'Texto', padrao: 1.8, min: 0.4, max: 10, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'contorno', rotulo: 'Contorno da base', grupo: 'Base', padrao: 4, min: 1, max: 15, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'profundidade', rotulo: 'Profundidade da base', grupo: 'Base', padrao: 21, min: 8, max: 60, passo: 0.5, unidade: 'mm', dica: 'De frente para trás, com a peça em pé' },
    { tipo: 'numero', id: 'fenda', rotulo: 'Largura da fenda', grupo: 'Base', padrao: 1, min: 0.4, max: 5, passo: 0.1, unidade: 'mm', dica: 'Espessura da foto' },
    { tipo: 'numero', id: 'fundoFenda', rotulo: 'Profundidade da fenda', grupo: 'Base', padrao: 14, min: 4, max: 60, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'folga', rotulo: 'Folga da fenda', grupo: 'Base', padrao: 0.2, min: 0, max: 0.6, passo: 0.05, unidade: 'mm' },
    cor('corBase', 'Base', '#f5f5f4'),
    cor('corLetras', 'Letras', '#be185d'),
  ],
  gerar(v, ctx): Resultado {
    const cores = ['Base', 'Letras'], hex = [txt(v, 'corBase'), txt(v, 'corLetras')];
    const t = comporLinhas([{ texto: txt(v, 'nome'), fonte: ctx.fonte(txt(v, 'fonte')), altura: num(v, 'altura'), espacamento: num(v, 'espacamento') / 100 }], 0);
    if (!t.letras.length) return { itens: [], cores, hex, avisos: ['Digite o nome.'] };
    const c = num(v, 'contorno');
    let base = semBuracos(contornar(t.regiao, c));
    const b = regionBounds(base);
    // Pe reto para ficar em pe.
    base = unir([base, retanguloArredondado((b.minX + b.maxX) / 2, b.minY + c / 2, b.w, c, 0)]);
    const P = num(v, 'profundidade'), larg = num(v, 'fenda') + 2 * num(v, 'folga');
    const z0 = (P - larg) / 2, z1 = z0 + larg;
    const faixa = retanguloArredondado((b.minX + b.maxX) / 2, b.maxY - num(v, 'fundoFenda') / 2 + 1, b.w + 2, num(v, 'fundoFenda') + 2, 0);
    const avisos: string[] = [];
    if (num(v, 'fundoFenda') > b.h - 3) avisos.push('A fenda é mais funda que a base: diminua a profundidade da fenda.');
    return {
      itens: [{
        nome: txt(v, 'nome'),
        pecas: [
          { nome: 'Base', cor: 0, camadas: [{ region: base, z0: 0, z1: z0 }, { region: diffRegion(base, faixa), z0, z1 }, { region: base, z0: z1, z1: P }] },
          { nome: 'Letras', cor: 1, camadas: [{ region: t.regiao, z0: P, z1: P + num(v, 'espTexto') }] },
        ],
      }],
      cores, hex,
      avisos,
      notas: ['Imprima a base deitada; cole as letras na frente e encaixe a foto na fenda.'],
    };
  },
};

/** Suporte de palitos: disco, tubo no centro e aletas em degraus em volta. */
export const suportePalitos: Receita = {
  ...ficha('suporte-palitos'),
  parametros: [
    { tipo: 'numero', id: 'palito', rotulo: 'Diâmetro do palito', grupo: 'Suporte', padrao: 6, min: 2, max: 10, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'folga', rotulo: 'Folga do furo', grupo: 'Suporte', padrao: 0.3, min: 0, max: 1, passo: 0.05, unidade: 'mm' },
    { tipo: 'numero', id: 'diametro', rotulo: 'Diâmetro da base', grupo: 'Suporte', padrao: 80, min: 30, max: 150, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'espBase', rotulo: 'Espessura da base', grupo: 'Suporte', padrao: 2, min: 1, max: 10, passo: 0.2, unidade: 'mm' },
    { tipo: 'numero', id: 'altura', rotulo: 'Altura do tubo', grupo: 'Suporte', padrao: 40, min: 10, max: 120, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'parede', rotulo: 'Parede do tubo', grupo: 'Suporte', padrao: 1.6, min: 0.8, max: 10, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'aletas', rotulo: 'Quantidade de aletas', grupo: 'Aletas', padrao: 4, min: 3, max: 10, passo: 1, unidade: '' },
    { tipo: 'numero', id: 'alturaAleta', rotulo: 'Altura das aletas', grupo: 'Aletas', padrao: 30, min: 5, max: 100, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'espAleta', rotulo: 'Espessura das aletas', grupo: 'Aletas', padrao: 2, min: 1, max: 8, passo: 0.2, unidade: 'mm' },
    cor('cor', 'Suporte', '#22c55e'),
  ],
  gerar(v): Resultado {
    const r0 = num(v, 'palito') / 2 + num(v, 'folga'), r1 = r0 + num(v, 'parede'), R = num(v, 'diametro') / 2, eb = num(v, 'espBase');
    const furo = circulo(0, 0, r0, 48);
    const camadas: Camada[] = [{ region: diffRegion(circulo(0, 0, R, 128), furo), z0: 0, z1: eb }];
    camadas.push({ region: diffRegion(circulo(0, 0, r1, 48), furo), z0: eb, z1: eb + num(v, 'altura') });
    // Aletas: degraus que encurtam para fora (perfil de rampa sem precisar de suporte).
    const n = num(v, 'aletas'), H = num(v, 'alturaAleta'), alcance = R * 0.75 - r1, degraus = 6;
    for (let d = 0; d < degraus; d++) {
      const ate = r1 + alcance * (1 - d / degraus);
      const aletas = unir(Array.from({ length: n }, (_, k) => rotateRegion(retanguloArredondado((r1 + ate) / 2 - 0.2, 0, ate - r1 + 0.4, num(v, 'espAleta'), 0), (360 * k) / n)));
      camadas.push({ region: diffRegion(aletas, circulo(0, 0, r1 - 0.01, 48)), z0: eb + (H * d) / degraus, z1: eb + (H * (d + 1)) / degraus });
    }
    return { itens: [{ nome: 'Suporte', pecas: [{ nome: 'Suporte', cor: 0, camadas }] }], cores: ['Suporte'], hex: [txt(v, 'cor')], avisos: [] };
  },
};

/** Porta-canetas em grade de celulas quadradas, com furo de drenagem opcional. */
export const portaCanetasGrade: Receita = {
  ...ficha('porta-canetas-grade'),
  parametros: [
    { tipo: 'numero', id: 'celula', rotulo: 'Lado da célula', grupo: 'Grade', padrao: 14, min: 8, max: 50, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'colunas', rotulo: 'Células na horizontal', grupo: 'Grade', padrao: 6, min: 1, max: 20, passo: 1, unidade: '' },
    { tipo: 'numero', id: 'linhas', rotulo: 'Células na vertical', grupo: 'Grade', padrao: 6, min: 1, max: 20, passo: 1, unidade: '' },
    { tipo: 'numero', id: 'altura', rotulo: 'Altura', grupo: 'Grade', padrao: 130, min: 10, max: 250, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'paredeInterna', rotulo: 'Parede interna', grupo: 'Paredes', padrao: 1, min: 0.4, max: 10, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'paredeExterna', rotulo: 'Parede externa', grupo: 'Paredes', padrao: 1.2, min: 0.4, max: 10, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'fundo', rotulo: 'Fundo', grupo: 'Paredes', padrao: 1, min: 0.4, max: 10, passo: 0.1, unidade: 'mm' },
    { tipo: 'liga', id: 'dreno', rotulo: 'Furo no fundo de cada célula', grupo: 'Paredes', padrao: true },
    cor('cor', 'Porta-canetas', '#0ea5e9'),
  ],
  gerar(v): Resultado {
    const s = num(v, 'celula'), nx = num(v, 'colunas'), ny = num(v, 'linhas'), wi = num(v, 'paredeInterna'), we = num(v, 'paredeExterna');
    const W = nx * s + (nx - 1) * wi + 2 * we, D = ny * s + (ny - 1) * wi + 2 * we;
    const fora = retanguloArredondado(0, 0, W, D, Math.min(2, we));
    const celulas: Region[] = [], drenos: Region[] = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const cx = -W / 2 + we + s / 2 + i * (s + wi), cy = -D / 2 + we + s / 2 + j * (s + wi);
      celulas.push(retanguloArredondado(cx, cy, s, s, 0));
      drenos.push(circulo(cx, cy, s * 0.18, 24));
    }
    const fundo = num(v, 'fundo');
    const camadas: Camada[] = [
      { region: liga(v, 'dreno') ? diffRegion(fora, unir(drenos)) : fora, z0: 0, z1: fundo },
      { region: diffRegion(fora, unir(celulas)), z0: fundo, z1: num(v, 'altura') },
    ];
    return { itens: [{ nome: 'Porta-canetas', pecas: [{ nome: 'Porta-canetas', cor: 0, camadas }] }], cores: ['Porta-canetas'], hex: [txt(v, 'cor')], avisos: [] };
  },
};

/** Enfeite floco de neve com nome no centro e argola; ate 9 nomes. */
export const flocoNeve: Receita = {
  ...ficha('floco-neve'),
  parametros: [
    { tipo: 'texto', id: 'nomes', rotulo: 'Nomes', grupo: 'Texto', padrao: 'Ana, Lucas', maxCaracteres: 200, dica: `Até ${LOTE_MAX} enfeites, separados por vírgula` },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'pacifico' },
    { tipo: 'numero', id: 'tamanho', rotulo: 'Tamanho', grupo: 'Floco', padrao: 80, min: 40, max: 200, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'traco', rotulo: 'Espessura das linhas', grupo: 'Floco', padrao: 3.2, min: 1.5, max: 8, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'ramos', rotulo: 'Ramos por braço', grupo: 'Floco', padrao: 2, min: 1, max: 3, passo: 1, unidade: '' },
    { tipo: 'numero', id: 'espessura', rotulo: 'Espessura', grupo: 'Floco', padrao: 3, min: 1.5, max: 6, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'espNome', rotulo: 'Altura do nome', grupo: 'Floco', padrao: 1, min: 0.4, max: 3, passo: 0.1, unidade: 'mm' },
    cor('corFloco', 'Floco', '#bae6fd'),
    cor('corNome', 'Nome', '#1d4ed8'),
  ],
  fontes: (v) => (temEmoji(txt(v, 'nomes')) ? ['noto-emoji'] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Floco', 'Nome'], hex = [txt(v, 'corFloco'), txt(v, 'corNome')];
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const reserva = temEmoji(txt(v, 'nomes')) ? ctx.fonte('noto-emoji') : undefined;
    const w = num(v, 'tamanho'), E = num(v, 'espessura');
    const desenho = floco(w, num(v, 'traco'), num(v, 'ramos'));
    const lista = nomesDoLote(txt(v, 'nomes'));
    const nomes = lista.length ? lista.slice(0, LOTE_MAX) : [''];
    const itens: Item[] = nomes.map((nome) => {
      const t = nome ? textoNaCaixa([nome], { fonte, reserva, maxW: w * 0.62, maxH: w * 0.2 }) : null;
      const placaNome = t?.letras.length ? semBuracos(contornar(t.regiao, Math.max(2, num(v, 'traco') * 0.7))) : [];
      const corpo = comArgola(unir([desenho, placaNome]), 'topo', 4, 2);
      const pecas = [{ nome: 'Floco', cor: 0, camadas: [{ region: corpo, z0: 0, z1: E }] }];
      if (t?.letras.length) pecas.push({ nome: 'Nome', cor: 1, camadas: [{ region: t.regiao, z0: E, z1: E + num(v, 'espNome') }] });
      return { nome: nome || 'Floco', pecas };
    });
    return { itens: itens.length > 1 ? emGrade(itens) : itens, cores, hex, avisos: lista.length > LOTE_MAX ? [`Só os ${LOTE_MAX} primeiros nomes entram.`] : [] };
  },
};

