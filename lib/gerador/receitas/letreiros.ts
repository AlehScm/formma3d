/**
 * Letreiro de duas palavras sobrepostas (palavra grande + nome encaixado num rebaixo) e
 * topo de bolo circular com janela para glitter entre duas laminas de acetato.
 */
import { diffRegion, regionBounds, translateRegion, type Region } from '../../geom/region';
import { circulo, contornar, escalaParaLargura, retanguloArredondado, semBuracos, temEmoji, textoNaCaixa, unir, comporLinhas } from '../formas';
import { ficha } from './fichas';
import type { Parametro, Receita, Resultado } from '../tipos';
import { num, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const centrar = (r: Region): Region => {
  const b = regionBounds(r);
  return translateRegion(r, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2);
};

export const letreiroSobreposto: Receita = {
  ...ficha('letreiro-sobreposto'),
  parametros: [
    { tipo: 'texto', id: 'palavra', rotulo: 'Palavra grande', grupo: 'Palavras', padrao: 'LOVE', maxCaracteres: 20 },
    { tipo: 'fonte', id: 'fontePalavra', rotulo: 'Fonte da palavra', grupo: 'Palavras', padrao: 'archivo-black' },
    { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre as letras grandes', grupo: 'Palavras', padrao: 82, min: 50, max: 150, passo: 1, unidade: '%', dica: 'Abaixo de 100% as letras se encostam e viram uma peça só' },
    { tipo: 'texto', id: 'nome', rotulo: 'Nome por cima', grupo: 'Palavras', padrao: 'Ana & João', maxCaracteres: 40, dica: 'Aceita emoji' },
    { tipo: 'fonte', id: 'fonteNome', rotulo: 'Fonte do nome', grupo: 'Palavras', padrao: 'great-vibes' },
    { tipo: 'numero', id: 'largura', rotulo: 'Largura da palavra grande', grupo: 'Tamanho', padrao: 250, min: 60, max: 600, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'escalaNome', rotulo: 'Largura do nome', grupo: 'Tamanho', padrao: 85, min: 30, max: 120, passo: 1, unidade: '%', dica: 'Em relação à palavra grande' },
    { tipo: 'numero', id: 'subirNome', rotulo: 'Subir/descer o nome', grupo: 'Tamanho', padrao: 0, min: -50, max: 50, passo: 1, unidade: '%' },
    { tipo: 'numero', id: 'contornoNome', rotulo: 'Contorno do nome', grupo: 'Tamanho', padrao: 4, min: 0.5, max: 10, passo: 0.1, unidade: 'mm', dica: 'Une as letras do nome numa peça' },
    { tipo: 'numero', id: 'espPalavra', rotulo: 'Espessura da palavra grande', grupo: 'Espessuras', padrao: 22, min: 8, max: 40, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'espNome', rotulo: 'Espessura do nome', grupo: 'Espessuras', padrao: 5, min: 2, max: 20, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'rebaixo', rotulo: 'Profundidade do encaixe', grupo: 'Espessuras', padrao: 2, min: 0, max: 10, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'folga', rotulo: 'Folga do encaixe', grupo: 'Espessuras', padrao: 0.2, min: 0.05, max: 0.5, passo: 0.01, unidade: 'mm' },
    cor('corPalavra', 'Palavra grande', '#fbcfe8'),
    cor('corNome', 'Nome', '#9d174d'),
  ],
  fontes: (v) => (temEmoji(txt(v, 'nome')) ? ['noto-emoji'] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Palavra', 'Nome'], hex = [txt(v, 'corPalavra'), txt(v, 'corNome')];
    const fp = ctx.fonte(txt(v, 'fontePalavra')), fn = ctx.fonte(txt(v, 'fonteNome'));
    const reserva = temEmoji(txt(v, 'nome')) ? ctx.fonte('noto-emoji') : undefined;
    const L = num(v, 'largura');
    const compor = (k: number) => comporLinhas([{ texto: txt(v, 'palavra'), fonte: fp, altura: 10 * k, espacamento: num(v, 'espacamento') / 100 }], 0);
    const grande = compor(escalaParaLargura((k) => compor(k).bounds.w, L));
    if (!grande.letras.length) return { itens: [], cores, hex, avisos: ['Digite a palavra grande.'] };
    const gb = grande.bounds;
    const nomeTxt = textoNaCaixa([txt(v, 'nome')], { fonte: fn, reserva, maxW: L * num(v, 'escalaNome') / 100, maxH: gb.h * 0.8 });
    const E = num(v, 'espPalavra'), en = num(v, 'espNome');
    const pecas = [];
    const avisos: string[] = [];
    if (grande.regiao.length > 1) avisos.push('As letras da palavra grande ficam soltas: cada uma vira uma peça (ou use uma fonte que encoste).');
    if (nomeTxt.letras.length) {
      let contorno = semBuracos(contornar(nomeTxt.regiao, num(v, 'contornoNome')));
      if (contorno.length > 1) {
        // Palavras separadas (espaco): uma faixa atras do texto une tudo numa peca so.
        const nb = regionBounds(contorno);
        contorno = unir([contorno, retanguloArredondado((nb.minX + nb.maxX) / 2, (nb.minY + nb.maxY) / 2, nb.w - num(v, 'contornoNome'), Math.max(nb.h * 0.3, 2 * num(v, 'contornoNome')), num(v, 'contornoNome'))]);
      }
      const nome = translateRegion(contorno, 0, (gb.h * num(v, 'subirNome')) / 100);
      // O nome assenta num rebaixo da palavra grande, so onde ele passa por cima dela.
      const p = Math.min(num(v, 'rebaixo'), E - 1);
      const rebaixo = contornar(nome, num(v, 'folga'));
      const camadasPalavra = p > 0
        ? [{ region: grande.regiao, z0: 0, z1: E - p }, { region: diffRegion(grande.regiao, rebaixo), z0: E - p, z1: E }]
        : [{ region: grande.regiao, z0: 0, z1: E }];
      pecas.push({ nome: 'Palavra', cor: 0, camadas: camadasPalavra });
      pecas.push({ nome: 'Nome', cor: 1, camadas: [{ region: nome, z0: E - p, z1: E - p + en }] });
      if (nome.length > 1) avisos.push('O nome ficou em mais de um pedaço: aumente o contorno do nome.');
    } else {
      pecas.push({ nome: 'Palavra', cor: 0, camadas: [{ region: grande.regiao, z0: 0, z1: E }] });
    }
    return { itens: [{ nome: txt(v, 'palavra'), pecas }], cores, hex, avisos };
  },
};

/**
 * Topo de bolo redondo: um aro com aba por dentro (onde apoiam duas laminas de acetato
 * com glitter no meio), uma tampa de aro por cima, o nome atravessando o circulo e o
 * numero em cima, cada um com base; haste embaixo.
 */
export const topoBoloCircular: Receita = {
  ...ficha('topo-bolo-circular'),
  parametros: [
    { tipo: 'texto', id: 'nome', rotulo: 'Nome', grupo: 'Texto', padrao: 'Elisa', maxCaracteres: 20 },
    { tipo: 'fonte', id: 'fonteNome', rotulo: 'Fonte do nome', grupo: 'Texto', padrao: 'great-vibes' },
    { tipo: 'texto', id: 'numero', rotulo: 'Número', grupo: 'Texto', padrao: '3', maxCaracteres: 4 },
    { tipo: 'fonte', id: 'fonteNumero', rotulo: 'Fonte do número', grupo: 'Texto', padrao: 'luckiest-guy' },
    { tipo: 'numero', id: 'tamanhoNumero', rotulo: 'Altura do número', grupo: 'Texto', padrao: 40, min: 15, max: 100, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'diametro', rotulo: 'Diâmetro do círculo', grupo: 'Círculo', padrao: 140, min: 80, max: 220, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'borda', rotulo: 'Largura do aro', grupo: 'Círculo', padrao: 9, min: 5, max: 15, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'aba', rotulo: 'Aba de apoio do acetato', grupo: 'Círculo', padrao: 4, min: 2, max: 8, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'altura', rotulo: 'Altura do aro', grupo: 'Círculo', padrao: 5, min: 3, max: 10, passo: 0.5, unidade: 'mm', dica: 'Espaço para as laminas e o glitter' },
    { tipo: 'numero', id: 'espBase', rotulo: 'Espessura da aba e da tampa', grupo: 'Círculo', padrao: 1, min: 0.6, max: 3, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'contornoTexto', rotulo: 'Base do nome e do número', grupo: 'Texto', padrao: 2, min: 0.5, max: 6, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'haste', rotulo: 'Comprimento da haste', grupo: 'Haste', padrao: 70, min: 0, max: 150, passo: 1, unidade: 'mm' },
    cor('corAro', 'Aro', '#f9a8d4'),
    cor('corTexto', 'Nome e número', '#ffffff'),
  ],
  gerar(v, ctx): Resultado {
    const cores = ['Aro', 'Nome e número'], hex = [txt(v, 'corAro'), txt(v, 'corTexto')];
    const D = num(v, 'diametro'), b = num(v, 'borda'), aba = num(v, 'aba'), H = num(v, 'altura'), e = num(v, 'espBase'), ct = num(v, 'contornoTexto');
    const R = D / 2;
    const aro = diffRegion(circulo(0, 0, R, 160), circulo(0, 0, R - b, 160));
    const abaR = diffRegion(circulo(0, 0, R - b + 0.01, 160), circulo(0, 0, R - b - aba, 160));
    const haste = num(v, 'haste') > 0 ? retanguloArredondado(0, -R - num(v, 'haste') / 2 + b / 2, 6, num(v, 'haste') + b, 1) : [];
    // Nome atravessando o circulo um pouco abaixo do centro, encostando no aro dos dois lados.
    const nomeTxt = textoNaCaixa([txt(v, 'nome')], { fonte: ctx.fonte(txt(v, 'fonteNome')), maxW: (D - b) * 0.98, maxH: D * 0.32 });
    const nome = nomeTxt.letras.length ? translateRegion(semBuracos(contornar(nomeTxt.regiao, ct)), 0, -R * 0.25) : [];
    const numTxt = textoNaCaixa([txt(v, 'numero')], { fonte: ctx.fonte(txt(v, 'fonteNumero')), maxW: D * 0.5, maxH: num(v, 'tamanhoNumero') });
    // Numero centrado no topo do aro, metade para fora.
    const numero = numTxt.letras.length ? translateRegion(centrar(semBuracos(contornar(numTxt.regiao, ct))), 0, R - b / 2) : [];
    const pecas = [
      { nome: 'Aro', cor: 0, camadas: [{ region: unir([aro, abaR, haste]), z0: 0, z1: e }, { region: unir([aro, haste]), z0: e, z1: e + H }] },
      { nome: 'Tampa', cor: 0, camadas: [{ region: aro, z0: e + H, z1: e + H + e }] },
    ];
    const texto = unir([nome, numero]);
    if (texto.length) pecas.push({ nome: 'Nome e número', cor: 1, camadas: [{ region: texto, z0: e + H + e, z1: e + H + e + 2 }] });
    return {
      itens: [{ nome: txt(v, 'nome') || 'Topo', pecas }], cores, hex, avisos: [],
      notas: ['Monte: acetato, glitter e acetato apoiados na aba; tampa por cima; nome e número colados na tampa.'],
    };
  },
};

