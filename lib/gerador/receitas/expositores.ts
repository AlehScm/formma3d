/**
 * Pecas em pe numa base com fenda: placa de line art (ou de listras) e trofeu de imagem
 * + palavra. Tudo imprime deitado, sem suporte: as pecas em pe saem chatas na mesa com
 * uma aba embaixo, e a base sai de costas (a frente para cima, com o texto em relevo),
 * com as fendas abertas na face de cima dela.
 */
import { diffRegion, intersectRegion, regionArea, regionBounds, translateRegion, type Region } from '../../geom/region';
import { contornar, retanguloArredondado, semBuracos, textoNaCaixa, unir } from '../formas';
import { emGrade } from '../lote';
import { comVazios, type Vazio } from '../solidos';
import { AVISO_EXEMPLO, campoDesenho, campoEixo, desenhoNoTamanho, nomeDoDesenho } from './desenho';
import { ficha } from './fichas';
import type { Camada, Contexto, Item, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';
import { desenho, liga, num, soCoresUsadas, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string, visivel?: (v: Valores) => boolean): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao, visivel });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });
const ret = (x0: number, y0: number, x1: number, y1: number): Region => [{ outer: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], holes: [] }];

export interface Fenda {
  /** Centro da fenda na largura da base. */
  cx: number;
  /** Largura e espessura da aba que entra nela (sem folga). */
  largura: number;
  espessura: number;
  profundidade: number;
}

/**
 * Base deitada de costas: o contorno de frente (`frente`, x na largura, y de 0 a H) vira
 * prisma de 0 a L (L = profundidade da base em pe); a frente fica em z = L. O chanfro de
 * cima da frente sai em degraus. As fendas abrem na face de cima (y = H), no meio da
 * parte reta.
 */
export function baseDeitada(frente: Region, H: number, L: number, chanfro: number, fendas: Fenda[], tolV: number, tolH: number): { camadas: Camada[]; avisos: string[] } {
  const avisos: string[] = [];
  const c = Math.min(chanfro, L / 2, H / 2);
  const reto = L - c, zc = reto / 2;
  const vazios: Vazio[] = fendas.map((f) => {
    const t = f.espessura + 2 * tolH;
    if (t > reto - 2) avisos.push('A peça é grossa demais para a fenda da base: aumente a profundidade da base ou diminua o chanfro.');
    return { regiao: ret(f.cx - f.largura / 2 - tolH, H - f.profundidade - tolV, f.cx + f.largura / 2 + tolH, H + 1), z0: zc - t / 2, z1: zc + t / 2 };
  });
  const camadas = comVazios(frente, 0, reto, vazios);
  const n = Math.ceil(c / 0.4);
  const b = regionBounds(frente);
  for (let k = 0; k < n; k++) {
    const yTopo = H - ((k + 0.5) * c) / n;
    camadas.push({ region: intersectRegion(frente, ret(b.minX - 1, b.minY - 1, b.maxX + 1, yTopo)), z0: reto + (k * c) / n, z1: reto + ((k + 1) * c) / n });
  }
  return { camadas, avisos };
}

/**
 * Aba de encaixe embaixo de uma regiao em pe: retangulo de `largura` (no maximo) centrado
 * na faixa mais baixa da regiao, descendo `prof`. Devolve a regiao com a aba, com o pe em
 * y = 0 (a aba fica abaixo).
 */
export function comAbaDeEncaixe(r: Region, largura: number, prof: number): { regiao: Region; cx: number; largura: number } {
  const b = regionBounds(r);
  const faixa = regionBounds(intersectRegion(r, ret(b.minX - 1, b.minY - 1, b.maxX + 1, b.minY + 4)));
  const w = Math.min(largura, Math.max(faixa.w, 6));
  const cx = (faixa.minX + faixa.maxX) / 2;
  const aba = ret(cx - w / 2, b.minY - prof, cx + w / 2, b.minY + Math.min(3, b.h / 4));
  return { regiao: translateRegion(unir([r, aba]), 0, -b.minY), cx, largura: w };
}

const camposBase = (p: { largura: number; altura: number; prof: number; chanfro: number }): Parametro[] => [
  mm('larguraBase', 'Largura da base', 'Base', p.largura, 60, 360, 1),
  mm('alturaBase', 'Altura da base', 'Base', p.altura, 12, 120, 1),
  mm('profBase', 'Profundidade da base', 'Base', p.prof, 10, 60, 1),
  mm('chanfro', 'Chanfro da frente', 'Base', p.chanfro, 0, 16, 0.5),
];
const camposTexto = (padrao: string, fonte: string, tamanho: number): Parametro[] => [
  { tipo: 'texto', id: 'textoBase', rotulo: 'Texto da base', grupo: 'Texto da base', padrao, maxCaracteres: 40 },
  { tipo: 'fonte', id: 'fonteBase', rotulo: 'Fonte', grupo: 'Texto da base', padrao: fonte, visivel: (v) => !!String(v.textoBase ?? '').trim() },
  mm('tamTextoBase', 'Altura do texto', 'Texto da base', tamanho, 4, 60, 0.5, undefined, (v) => !!String(v.textoBase ?? '').trim()),
  { tipo: 'numero', id: 'espacamentoBase', rotulo: 'Espaço entre letras', grupo: 'Texto da base', padrao: 110, min: 50, max: 300, passo: 1, unidade: '%', visivel: (v) => !!String(v.textoBase ?? '').trim() },
  mm('espTextoBase', 'Relevo do texto', 'Texto da base', 1.2, 0.4, 4, 0.1, undefined, (v) => !!String(v.textoBase ?? '').trim()),
];
const camposFolga: Parametro[] = [
  mm('tolV', 'Folga no fundo da fenda', 'Encaixe', 0.24, 0, 0.6, 0.01),
  mm('tolH', 'Folga dos lados da fenda', 'Encaixe', 0.2, 0, 0.5, 0.01),
];

/** Texto em relevo na frente da base (z = L), dentro da parte reta. */
function textoDaFrente(v: Valores, ctx: Contexto, W: number, H: number, L: number, c: number): Camada[] {
  const t = txt(v, 'textoBase').trim();
  if (!t) return [];
  const alto = Math.max(2, H - c);
  const r = textoNaCaixa([t], { fonte: ctx.fonte(txt(v, 'fonteBase')), espacamento: num(v, 'espacamentoBase') / 100, maxW: W * 0.88, maxH: Math.min(num(v, 'tamTextoBase'), alto * 0.8) }).regiao;
  return [{ region: translateRegion(r, 0, alto / 2), z0: L, z1: L + num(v, 'espTextoBase') }];
}

/**
 * Placa de line art (o desenho em pe, grosso) ou de listras (placa com listras atras do
 * desenho) encaixada numa base com o texto na frente.
 */
export const placaComBase: Receita = {
  ...ficha('placa-com-base'),
  parametros: [
    { tipo: 'escolha', id: 'modo', rotulo: 'Tipo', grupo: 'Desenho', padrao: 'lineart', opcoes: [{ valor: 'lineart', rotulo: 'Line art' }, { valor: 'listras', rotulo: 'Placa de listras' }] },
    campoDesenho(),
    mm('tamanho', 'Tamanho do desenho', 'Desenho', 150, 40, 320, 1),
    { ...campoEixo, padrao: 'altura' } as Parametro,
    mm('espPeca', 'Espessura do desenho', 'Desenho', 3, 1.2, 8, 0.1, undefined, (v) => v.modo !== 'listras'),
    mm('margem', 'Margem da placa', 'Listras', 5, 1, 20, 0.5, undefined, (v) => v.modo === 'listras'),
    { tipo: 'numero', id: 'nListras', rotulo: 'Número de listras', grupo: 'Listras', padrao: 11, min: 3, max: 25, passo: 1, dica: 'Ímpar deixa uma listra no meio', visivel: (v) => v.modo === 'listras' },
    mm('vaoListras', 'Vão entre listras', 'Listras', 1.2, 0, 5, 0.1, undefined, (v) => v.modo === 'listras'),
    mm('espPlaca', 'Espessura da placa', 'Listras', 2, 1.2, 5, 0.1, undefined, (v) => v.modo === 'listras'),
    mm('espListra', 'Altura das listras', 'Listras', 1.6, 0.2, 4, 0.1, undefined, (v) => v.modo === 'listras'),
    mm('espDesenho', 'Altura do desenho', 'Listras', 3.6, 0.4, 8, 0.1, undefined, (v) => v.modo === 'listras'),
    mm('encaixe', 'Quanto entra na base', 'Encaixe', 10, 4, 30, 0.5),
    mm('xEncaixe', 'Posição na base', 'Encaixe', 0, -150, 150, 1),
    ...camposFolga,
    ...camposBase({ largura: 180, altura: 30, prof: 26, chanfro: 8 }),
    ...camposTexto('PAI', 'chicle', 23),
    cor('corBase', 'Base', '#fcd7b6'),
    cor('corDesenho', 'Desenho', '#111111'),
    cor('corTexto', 'Texto da base', '#001b5e'),
    cor('corListras', 'Listras', '#ffffff', (v) => v.modo === 'listras'),
  ],
  fontes: (v) => (String(v.textoBase ?? '').trim() ? [String(v.fonteBase)] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Base', 'Desenho', 'Texto da base', 'Listras'], hex = [txt(v, 'corBase'), txt(v, 'corDesenho'), txt(v, 'corTexto'), txt(v, 'corListras')];
    const { regiao: D, exemplo } = desenhoNoTamanho(v, 'desenho', num(v, 'tamanho'), txt(v, 'eixo') === 'largura' ? 'largura' : 'altura');
    const avisos = exemplo ? [AVISO_EXEMPLO] : [];
    if (!regionArea(D)) return { itens: [], cores, hex, avisos: ['O desenho não tem área.'] };
    const W = num(v, 'larguraBase'), H = num(v, 'alturaBase'), L = num(v, 'profBase'), c = num(v, 'chanfro'), prof = Math.min(num(v, 'encaixe'), H - 2);
    const listras = txt(v, 'modo') === 'listras';
    const larguraAba = W - 20;
    let peca: Peca[], t: number, aba: { regiao: Region; cx: number; largura: number };
    if (listras) {
      const P = semBuracos(contornar(D, num(v, 'margem')));
      aba = comAbaDeEncaixe(P, larguraAba, prof);
      const dy = -regionBounds(P).minY;
      const Pb = translateRegion(P, 0, dy), Db = translateRegion(D, 0, dy);
      const b = regionBounds(Pb), n = num(v, 'nListras'), g = num(v, 'vaoListras');
      const w = (b.w - (n - 1) * g) / n;
      const faixas = unir(Array.from({ length: n }, (_, i) => ret(b.minX + i * (w + g), b.minY - 1, b.minX + i * (w + g) + w, b.maxY + 1)));
      t = num(v, 'espPlaca');
      peca = [
        { nome: 'Placa', cor: 0, camadas: [{ region: aba.regiao, z0: 0, z1: t }] },
        { nome: 'Listras', cor: 3, camadas: [{ region: diffRegion(intersectRegion(Pb, faixas), Db), z0: t, z1: t + num(v, 'espListra') }] },
        { nome: 'Desenho', cor: 1, camadas: [{ region: intersectRegion(Db, Pb), z0: t, z1: t + num(v, 'espDesenho') }] },
      ];
      if (P.length > 1) avisos.push('A placa saiu em partes: aumente a margem.');
    } else {
      aba = comAbaDeEncaixe(D, larguraAba, prof);
      t = num(v, 'espPeca');
      peca = [{ nome: 'Desenho', cor: 1, camadas: [{ region: aba.regiao, z0: 0, z1: t }] }];
      if (aba.regiao.length > 1) avisos.push('O desenho tem partes soltas: ligue as linhas (elas cairiam da base).');
    }
    const cx = num(v, 'xEncaixe');
    if (Math.abs(cx) + aba.largura / 2 > W / 2 - 3) avisos.push('A aba sai da base: diminua o desenho ou centralize.');
    const frente = ret(-W / 2, 0, W / 2, H);
    const base = baseDeitada(frente, H, L, c, [{ cx, largura: aba.largura, espessura: t, profundidade: prof }], num(v, 'tolV'), num(v, 'tolH'));
    const texto = textoDaFrente(v, ctx, W, H, L, c);
    const itens: Item[] = [
      { nome: 'Base', pecas: [{ nome: 'Base', cor: 0, camadas: base.camadas }, ...(texto.length ? [{ nome: 'Texto', cor: 2, camadas: texto }] : [])] },
      { nome: nomeDoDesenho(v, 'desenho') || (listras ? 'Placa' : 'Desenho'), pecas: peca },
    ];
    return soCoresUsadas({
      itens: emGrade(itens, 1, 10), cores, hex, avisos: [...avisos, ...base.avisos],
      notas: ['A base imprime deitada, com a frente para cima. Encaixe a aba do desenho na fenda de cima da base.'],
    });
  },
};

/**
 * Trofeu: imagem e palavra grossas em pe sobre uma base com o texto na frente e uma
 * placa para colar atras.
 */
export const trofeu: Receita = {
  ...ficha('trofeu'),
  parametros: [
    campoDesenho('Imagem'),
    mm('tamImagem', 'Largura da imagem', 'Topo', 60, 15, 200, 1),
    { tipo: 'texto', id: 'palavra', rotulo: 'Palavra', grupo: 'Topo', padrao: '100K', maxCaracteres: 20 },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Topo', padrao: 'cal-sans' },
    { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Topo', padrao: 100, min: 50, max: 200, passo: 1, unidade: '%' },
    mm('profImagem', 'Espessura da imagem', 'Topo', 22, 3, 30, 0.5),
    mm('profTexto', 'Espessura da palavra', 'Topo', 18, 3, 30, 0.5),
    { tipo: 'liga', id: 'fundoImagem', rotulo: 'Fundo atrás da imagem', grupo: 'Topo', padrao: false, dica: 'Liga as partes soltas da imagem' },
    mm('espFundo', 'Espessura do fundo', 'Topo', 3, 1, 10, 0.5, undefined, (v) => v.fundoImagem === true),
    mm('margem', 'Margem dos lados', 'Topo', 12, 0, 40, 1),
    mm('espaco', 'Espaço entre imagem e palavra', 'Topo', 8, 0, 40, 1),
    mm('encaixe', 'Quanto entra na base', 'Encaixe', 9, 4, 20, 0.5),
    ...camposFolga.map((p) => ({ ...p, padrao: p.id === 'tolV' ? 0.21 : 0.16 }) as Parametro),
    mm('larguraBase', 'Largura da base', 'Base', 235, 100, 320, 1),
    mm('alturaBase', 'Altura da base', 'Base', 38, 15, 120, 1),
    mm('profBase', 'Profundidade da base', 'Base', 40, 20, 80, 1),
    { tipo: 'liga', id: 'chanfrar', rotulo: 'Chanfrar os cantos', grupo: 'Base', padrao: true },
    ...camposTexto('1º lugar', 'cal-sans', 20),
    { tipo: 'liga', id: 'placa', rotulo: 'Placa atrás', grupo: 'Placa de trás', padrao: true, dica: 'Peça fina para colar atrás da base' },
    mm('largPlaca', 'Largura da placa', 'Placa de trás', 90, 20, 300, 1, undefined, (v) => v.placa === true),
    mm('altPlaca', 'Altura da placa', 'Placa de trás', 30, 10, 120, 1, undefined, (v) => v.placa === true),
    { ...campoDesenho('Desenho da placa'), id: 'desenhoPlaca', grupo: 'Placa de trás', visivel: (v: Valores) => v.placa === true },
    cor('corBase', 'Base', '#333333'),
    cor('corImagem', 'Imagem', '#ffd700'),
    cor('corTexto', 'Palavra e textos', '#ffd700'),
    cor('corFundo', 'Fundo da imagem', '#333333', (v) => v.fundoImagem === true),
  ],
  fontes: (v) => [String(v.fonte), ...(String(v.textoBase ?? '').trim() ? [String(v.fonteBase)] : [])],
  gerar(v, ctx): Resultado {
    const cores = ['Base', 'Imagem', 'Palavra e textos', 'Fundo da imagem'], hex = [txt(v, 'corBase'), txt(v, 'corImagem'), txt(v, 'corTexto'), txt(v, 'corFundo')];
    const avisos: string[] = [];
    const W = num(v, 'larguraBase'), H = num(v, 'alturaBase'), L = num(v, 'profBase'), prof = Math.min(num(v, 'encaixe'), H - 2);
    const disponivel = W - 2 * num(v, 'margem');
    const wi = Math.min(num(v, 'tamImagem'), disponivel);
    const { regiao: D, exemplo } = desenhoNoTamanho(v, 'desenho', wi);
    if (exemplo) avisos.push(AVISO_EXEMPLO);
    const fendas: { fenda: { largura: number; espessura: number; profundidade: number }; item: Item; w: number }[] = [];
    // Imagem em pe.
    const fundo = liga(v, 'fundoImagem');
    const pi = num(v, 'profImagem'), ef = Math.min(num(v, 'espFundo'), pi - 0.4);
    if (fundo) {
      const F = semBuracos(contornar(D, 1.5));
      const a = comAbaDeEncaixe(F, wi * 0.6, prof);
      const dy = -regionBounds(F).minY;
      fendas.push({ fenda: { largura: a.largura, espessura: ef, profundidade: prof }, w: regionBounds(F).w, item: { nome: nomeDoDesenho(v, 'desenho') || 'Imagem', pecas: [
        { nome: 'Fundo', cor: 3, camadas: [{ region: a.regiao, z0: 0, z1: ef }] },
        { nome: 'Imagem', cor: 1, camadas: [{ region: translateRegion(D, 0, dy), z0: ef, z1: pi }] },
      ] } });
    } else {
      const a = comAbaDeEncaixe(D, wi * 0.6, prof);
      if (a.regiao.length > 1) avisos.push('A imagem tem partes soltas: ligue "Fundo atrás da imagem".');
      fendas.push({ fenda: { largura: a.largura, espessura: pi, profundidade: prof }, w: wi, item: { nome: nomeDoDesenho(v, 'desenho') || 'Imagem', pecas: [{ nome: 'Imagem', cor: 1, camadas: [{ region: a.regiao, z0: 0, z1: pi }] }] } });
    }
    // Palavra em pe, no espaco que sobra.
    const palavra = txt(v, 'palavra').trim();
    if (palavra) {
      const wp = disponivel - wi - num(v, 'espaco');
      if (wp < 20) avisos.push('Não sobra espaço para a palavra: aumente a base ou diminua a imagem.');
      else {
        const t = textoNaCaixa([palavra], { fonte: ctx.fonte(txt(v, 'fonte')), espacamento: num(v, 'espacamento') / 100, maxW: wp, maxH: wi * 1.2 }).regiao;
        // Aba na largura toda: cada letra apoia nela.
        const a = comAbaDeEncaixe(t, regionBounds(t).w, prof);
        if (a.regiao.length > 1) avisos.push('As letras da palavra ficam soltas: diminua o espaço entre letras.');
        fendas.push({ fenda: { largura: a.largura, espessura: num(v, 'profTexto'), profundidade: prof }, w: regionBounds(t).w, item: { nome: palavra, pecas: [{ nome: 'Palavra', cor: 2, camadas: [{ region: a.regiao, z0: 0, z1: num(v, 'profTexto') }] }] } });
      }
    }
    // Fendas lado a lado, o conjunto centrado na base.
    const total = fendas.reduce((s, f) => s + f.w, 0) + num(v, 'espaco') * (fendas.length - 1);
    let x = -total / 2;
    const lista = fendas.map((f) => { const cx = x + f.w / 2; x += f.w + num(v, 'espaco'); return { ...f.fenda, cx }; });
    const ch = liga(v, 'chanfrar') ? Math.min(8, H / 3) : 0;
    const frente: Region = ch ? [{ outer: [{ x: -W / 2, y: 0 }, { x: W / 2, y: 0 }, { x: W / 2, y: H - ch }, { x: W / 2 - ch, y: H }, { x: -W / 2 + ch, y: H }, { x: -W / 2, y: H - ch }], holes: [] }] : ret(-W / 2, 0, W / 2, H);
    const base = baseDeitada(frente, H, L, 0, lista, num(v, 'tolV'), num(v, 'tolH'));
    const texto = textoDaFrente(v, ctx, W - 2 * ch, H, L, 0);
    const itens: Item[] = [{ nome: 'Base', pecas: [{ nome: 'Base', cor: 0, camadas: base.camadas }, ...(texto.length ? [{ nome: 'Texto', cor: 2, camadas: texto }] : [])] }, ...fendas.map((f) => f.item)];
    if (liga(v, 'placa')) {
      const pw = num(v, 'largPlaca'), ph = num(v, 'altPlaca');
      const placa = retanguloArredondado(0, 0, pw, ph, 2);
      const pecas: Peca[] = [{ nome: 'Placa', cor: 0, camadas: [{ region: placa, z0: 0, z1: 1.6 }] }];
      if (desenho(v, 'desenhoPlaca')) {
        const dp = desenhoNoTamanho(v, 'desenhoPlaca', pw * 0.8).regiao;
        const dpb = regionBounds(dp);
        const k = dpb.h > ph * 0.8 ? desenhoNoTamanho(v, 'desenhoPlaca', ph * 0.8, 'altura').regiao : dp;
        pecas.push({ nome: 'Desenho', cor: 2, camadas: [{ region: intersectRegion(k, contornar(placa, -1)), z0: 1.6, z1: 2 }] });
      }
      itens.push({ nome: 'Placa de trás', pecas });
    }
    return soCoresUsadas({
      itens: emGrade(itens, 2, 10), cores, hex, avisos: [...avisos, ...base.avisos],
      notas: ['A base imprime deitada, com a frente para cima; a imagem e a palavra imprimem deitadas e encaixam nas fendas de cima.'],
    });
  },
};
