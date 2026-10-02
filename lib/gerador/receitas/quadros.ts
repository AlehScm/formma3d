/**
 * Quadros e displays: quadro de tecido (o desenho imprime em cima do tule, na pausa, e
 * a moldura prende num pe com imas), porta-retrato suspenso (moldura em duas partes com
 * pinos e furos para o fio das fotos), display de unhas (disco para fotografar as maos)
 * e mini-microfone (cubo que veste o microfone sem fio, com capas e cabeca).
 */
import { diffRegion, intersectRegion, regionArea, regionBounds, rotateRegion, translateRegion, type Region } from '../../geom/region';
import { circulo, contornar, estrela, retanguloArredondado, temEmoji, textoNaCaixa, unir } from '../formas';
import { elipse, espelharX } from '../figuras';
import { emGrade } from '../lote';
import { comVazios, torneado, type Vazio } from '../solidos';
import { AVISO_EXEMPLO, campoDesenho, coresNoTamanho, desenhoNoTamanho } from './desenho';
import { ficha } from './fichas';
import { padraoVazado } from './papelaria';
import type { Camada, Contexto, Item, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';
import { desenho, liga, num, soCoresUsadas, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string, visivel?: (v: Valores) => boolean): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao, visivel });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });
const ret = (x0: number, y0: number, x1: number, y1: number): Region => [{ outer: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], holes: [] }];

/** Campos de "texto ou imagem" e o desenho resultante, no lado maior `tam`. */
const camposArte = (padraoTexto: string, fonte: string): Parametro[] => [
  { tipo: 'escolha', id: 'origem', rotulo: 'Desenho', grupo: 'Desenho', padrao: 'texto', opcoes: [{ valor: 'texto', rotulo: 'Texto' }, { valor: 'imagem', rotulo: 'Imagem' }] },
  { tipo: 'texto', id: 'texto', rotulo: 'Texto', grupo: 'Desenho', padrao: padraoTexto, maxCaracteres: 60, dica: '"+" quebra a linha', visivel: (v) => v.origem !== 'imagem' },
  { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Desenho', padrao: fonte, visivel: (v) => v.origem !== 'imagem' },
  { ...campoDesenho(), visivel: (v: Valores) => v.origem === 'imagem' },
];
function arte(v: Valores, ctx: Contexto, maxW: number, maxH: number, avisos: string[]): Region {
  if (txt(v, 'origem') === 'imagem') {
    const d = desenhoNoTamanho(v, 'desenho', 100);
    if (d.exemplo) avisos.push(AVISO_EXEMPLO);
    const b = regionBounds(d.regiao), k = Math.min(maxW / b.w, maxH / b.h);
    return d.regiao.map((p) => ({ outer: p.outer.map((q) => ({ x: q.x * k, y: q.y * k })), holes: p.holes.map((h) => h.map((q) => ({ x: q.x * k, y: q.y * k }))) }));
  }
  const t = txt(v, 'texto').trim();
  if (!t) return [];
  return textoNaCaixa(t.split('+'), { fonte: ctx.fonte(txt(v, 'fonte')), reserva: temEmoji(t) ? ctx.fonte('noto-emoji') : undefined, maxW, maxH, entrelinha: 1 }).regiao;
}
/** As cores da imagem (se colorida) na mesma escala que `arte` da ao desenho. */
function coresDaArte(v: Valores, maxW: number, maxH: number): { regiao: Region; hex: string }[] {
  const d = desenhoNoTamanho(v, 'desenho', 100), b = regionBounds(d.regiao);
  if (!(b.w > 0)) return [];
  const k = Math.min(maxW / b.w, maxH / b.h);
  return coresNoTamanho(v, 'desenho', 100).map((c) => ({ hex: c.hex, regiao: c.regiao.map((p) => ({ outer: p.outer.map((q) => ({ x: q.x * k, y: q.y * k })), holes: p.holes.map((h) => h.map((q) => ({ x: q.x * k, y: q.y * k }))) })) }));
}
const fontesArte = (v: Valores) => (v.origem !== 'imagem' ? [String(v.fonte), ...(temEmoji(String(v.texto ?? '')) ? ['noto-emoji'] : [])] : []);

/**
 * Quadro de tecido: moldura deitada; na pausa (0,6 mm) entra o tule ou organza por cima
 * de tudo e o resto imprime em cima dele -- a moldura prende o tecido e o desenho fica
 * "flutuando" na janela. O pe tem fenda e imas.
 */
export const quadroTecido: Receita = {
  ...ficha('quadro-tecido'),
  parametros: [
    ...camposArte('Ana+& Leo', 'great-vibes'),
    mm('largura', 'Largura', 'Quadro', 150, 60, 300, 1),
    mm('altura', 'Altura', 'Quadro', 150, 60, 300, 1),
    mm('borda', 'Largura da moldura', 'Quadro', 12, 5, 40, 0.5),
    mm('espessura', 'Espessura da moldura', 'Quadro', 10, 4, 20, 0.5),
    mm('espDesenho', 'Espessura do desenho', 'Quadro', 5, 0.6, 10, 0.1),
    mm('espCor', 'Camada de cor do desenho', 'Quadro', 0.2, 0, 5, 0.1, 'O topo do desenho em outra cor (0 = uma cor só)'),
    mm('pausa', 'Altura da pausa', 'Quadro', 0.6, 0.4, 3, 0.2, 'Onde entra o tecido'),
    mm('tampaFrente', 'Moldura da frente', 'Quadro', 4, 0, 10, 0.5, 'Peça que cola por cima e esconde a borda do tecido (0 = sem)'),
    mm('alturaBase', 'Altura do pé', 'Pé', 12, 7, 40, 0.5),
    mm('profBase', 'Profundidade do pé', 'Pé', 48, 30, 100, 1),
    mm('ima', 'Diâmetro do ímã', 'Pé', 8, 0, 15, 0.5, '0 = sem ímã'),
    mm('espIma', 'Espessura do ímã', 'Pé', 3, 1, 6, 0.5),
    cor('corMoldura', 'Moldura', '#c98fa3'),
    cor('corDesenho', 'Desenho', '#ffffff'),
    cor('corTopo', 'Cor do topo do desenho', '#4a1f2e'),
    cor('corBase', 'Pé', '#c98fa3'),
  ],
  fontes: fontesArte,
  gerar(v, ctx): Resultado {
    const cores = ['Moldura', 'Desenho', 'Topo do desenho', 'Pé'], hex = [txt(v, 'corMoldura'), txt(v, 'corDesenho'), txt(v, 'corTopo'), txt(v, 'corBase')];
    const avisos: string[] = [];
    const W = num(v, 'largura'), H = num(v, 'altura'), bw = num(v, 'borda'), T = num(v, 'espessura'), zp = num(v, 'pausa');
    const fora = retanguloArredondado(0, 0, W, H, 4), janela = retanguloArredondado(0, 0, W - 2 * bw, H - 2 * bw, 2);
    const D = arte(v, ctx, W - 2 * bw - 8, H - 2 * bw - 8, avisos);
    if (!regionArea(D)) return { itens: [], cores, hex, avisos: avisos.length ? avisos : ['Digite o texto.'] };
    // Imas: bolsoes na borda de baixo da moldura (abertos para baixo, em pe).
    const di = num(v, 'ima'), ei = num(v, 'espIma');
    const imas: Vazio[] = di > 0 ? [-1, 1].map((s) => ({ regiao: ret(s * W / 4 - di / 2 - 0.2, -H / 2 - 1, s * W / 4 + di / 2 + 0.2, -H / 2 + ei + 0.2), z0: (T - di) / 2 - 0.2, z1: (T + di) / 2 + 0.2 })) : [];
    if (di > T - 1.2) avisos.push('O ímã é maior que a espessura da moldura.');
    const moldura = comVazios(diffRegion(fora, janela), 0, T, imas);
    const ed = num(v, 'espDesenho'), ec = Math.min(num(v, 'espCor'), ed);
    const des = intersectRegion(D, janela);
    const pecas: Peca[] = [{ nome: 'Moldura', cor: 0, camadas: moldura }];
    // O desenho comeca na pausa, em cima do tecido (nada embaixo dele: o tecido apoia).
    pecas.push({ nome: 'Desenho', cor: 1, camadas: [{ region: des, z0: zp, z1: zp + ed - ec }] });
    if (ec > 0) pecas.push({ nome: 'Topo do desenho', cor: 2, camadas: [{ region: des, z0: zp + ed - ec, z1: zp + ed }] });
    // Pe: bloco com fenda da espessura da moldura e os imas no fundo da fenda.
    const Pb = num(v, 'profBase'), Hb = num(v, 'alturaBase');
    const peB = retanguloArredondado(0, 0, W, Pb, 3), fenda = ret(-W / 2 - 1, -T / 2 - 0.2, W / 2 + 1, T / 2 + 0.2);
    const vaziosPe: Vazio[] = [{ regiao: fenda, z0: Hb - Math.min(6, Hb - 2), z1: Hb + 1 }];
    if (di > 0) for (const s of [-1, 1]) vaziosPe.push({ regiao: circulo(s * W / 4, 0, di / 2 + 0.2, 32), z0: Hb - Math.min(6, Hb - 2) - ei - 0.2, z1: Hb - Math.min(6, Hb - 2) });
    const itens: Item[] = [{ nome: 'Quadro', pecas }, { nome: 'Pé', pecas: [{ nome: 'Pé', cor: 3, camadas: comVazios(peB, 0, Hb, vaziosPe) }] }];
    if (num(v, 'tampaFrente') > 0) itens.push({ nome: 'Moldura da frente', pecas: [{ nome: 'Moldura da frente', cor: 0, camadas: [{ region: diffRegion(fora, contornar(janela, 1)), z0: 0, z1: num(v, 'tampaFrente') }] }] });
    return soCoresUsadas({
      itens: emGrade(itens, 1, 10), cores, hex, avisos,
      notas: [`Pause a impressão em ${zp.toLocaleString('pt-BR')} mm, estique o tule ou organza por cima e continue: o desenho imprime em cima do tecido.`, 'Cole os ímãs nos bolsões da moldura e do pé e encaixe a moldura na fenda.'],
    });
  },
};

const TAMANHOS: Record<string, [number, number]> = { '10x15': [102, 142], '15x20': [142, 202], '25x15': [242, 142] };

/**
 * Porta-retrato suspenso: moldura grossa em duas partes (a de baixo de outra cor) unidas
 * por pinos, com furos atravessados nas laterais para o fio das fotos e o desenho
 * embutido na frente da parte de baixo.
 */
export const portaRetrato: Receita = {
  ...ficha('porta-retrato'),
  parametros: [
    ...camposArte('Família', 'pacifico'),
    { tipo: 'escolha', id: 'tamanho', rotulo: 'Tamanho', grupo: 'Moldura', padrao: '15x20', opcoes: [{ valor: '10x15', rotulo: '10 × 15 (em pé)' }, { valor: '15x20', rotulo: '15 × 20 (em pé)' }, { valor: '25x15', rotulo: '25 × 15 (deitado)' }] },
    mm('borda', 'Largura da moldura', 'Moldura', 14, 6, 40, 0.5),
    mm('espessura', 'Espessura da moldura', 'Moldura', 28, 12, 100, 1),
    { tipo: 'numero', id: 'baseAltura', rotulo: 'Altura da parte de baixo', grupo: 'Moldura', padrao: 30, min: 10, max: 60, passo: 1, unidade: '%' },
    mm('furoFio', 'Distância do furo ao canto', 'Moldura', 5.3, 1, 40, 0.1),
    mm('dFio', 'Diâmetro do furo do fio', 'Moldura', 2, 1, 5, 0.1),
    { tipo: 'escolha', id: 'face', rotulo: 'Desenho', grupo: 'Desenho', padrao: 'cima', opcoes: [{ valor: 'cima', rotulo: 'Peça em relevo na frente' }, { valor: 'baixo', rotulo: 'Embutido rente (face para baixo)' }, { valor: 'camadas', rotulo: 'Uma cor por camada (imagem colorida)' }] },
    mm('alturaCor', 'Altura de cada cor', 'Desenho', 0.7, 0.2, 2, 0.1, 'Cada cor da imagem sobe uma faixa: dá para imprimir trocando o filamento na altura', (v) => v.face === 'camadas'),
    mm('espDesenho', 'Espessura do desenho', 'Desenho', 5, 1, 10, 0.5, undefined, (v) => v.face !== 'baixo'),
    mm('embutir', 'Quanto o desenho entra na moldura', 'Desenho', 2, 0, 5, 0.5, undefined, (v) => v.face !== 'baixo'),
    mm('folga', 'Folga dos encaixes', 'Moldura', 0.2, 0.05, 0.6, 0.01),
    cor('corCima', 'Moldura (cima)', '#ffffff'),
    cor('corBaixo', 'Moldura (baixo)', '#a85f78'),
    cor('corDesenho', 'Desenho', '#4a1f2e'),
  ],
  fontes: fontesArte,
  gerar(v, ctx): Resultado {
    const cores = ['Moldura (cima)', 'Moldura (baixo)', 'Desenho'], hex = [txt(v, 'corCima'), txt(v, 'corBaixo'), txt(v, 'corDesenho')];
    const avisos: string[] = [];
    const [W, H] = TAMANHOS[txt(v, 'tamanho')] ?? [142, 202];
    const bw = num(v, 'borda'), T = num(v, 'espessura'), folga = num(v, 'folga');
    const fora = retanguloArredondado(0, 0, W, H, bw * 0.8), janela = retanguloArredondado(0, 0, W - 2 * bw, H - 2 * bw, 3);
    const yCorte = -H / 2 + (H * num(v, 'baseAltura')) / 100;
    // Furos do fio: tuneis atravessando as laterais, abaixo dos cantos de cima.
    const yFio = H / 2 - bw * 0.8 - num(v, 'furoFio'), df = num(v, 'dFio');
    const fio: Vazio = { regiao: ret(-W / 2 - 1, yFio - df / 2, W / 2 + 1, yFio + df / 2), z0: T / 2 - df / 2, z1: T / 2 + df / 2 };
    // Pinos: furos quadrados de 4 mm nas duas faces do corte, um em cada lateral.
    const lp = 4 + 2 * folga, prof = 8;
    const furosPino = (lado: 'cima' | 'baixo'): Vazio[] => [-1, 1].map((s) => ({
      regiao: ret(s * (W / 2 - bw / 2) - lp / 2, lado === 'cima' ? yCorte - 1 : yCorte - prof, s * (W / 2 - bw / 2) + lp / 2, lado === 'cima' ? yCorte + prof : yCorte + 1),
      z0: T / 2 - lp / 2, z1: T / 2 + lp / 2,
    }));
    const anel = diffRegion(fora, janela);
    const cima = intersectRegion(anel, ret(-W, yCorte, W, H));
    const baixo = intersectRegion(anel, ret(-W, -H, W, yCorte));
    // Desenho embutido na frente da parte de baixo.
    // O desenho vai na barra de baixo da moldura (abaixo da janela).
    const D = arte(v, ctx, W - bw - 6, bw - 4, avisos);
    const desenhoR = intersectRegion(translateRegion(D, 0, -H / 2 + bw / 2), contornar(baixo, -1.5));
    const emb = Math.min(num(v, 'embutir'), T - 2);
    const faceBaixo = txt(v, 'face') === 'baixo';
    const vaziosBaixo: Vazio[] = [...furosPino('baixo')];
    // Face para baixo: a frente da moldura e a face na mesa; o desenho, espelhado, fica
    // embutido 0,6 mm nela, em outra cor e rente.
    const desenhoM = faceBaixo ? intersectRegion(espelharX(desenhoR), contornar(espelharX(baixo), -1.5)) : [];
    if (faceBaixo && regionArea(desenhoM) > 0.5) vaziosBaixo.push({ regiao: desenhoM, z0: 0, z1: 0.6 });
    else if (regionArea(desenhoR) > 0.5 && emb > 0) vaziosBaixo.push({ regiao: contornar(desenhoR, folga), z0: T - emb, z1: T + 1 });
    if (regionArea(D) && regionArea(desenhoR) < regionArea(D) * 0.9) avisos.push('O desenho não coube na moldura de baixo: diminua o texto ou aumente a borda.');
    const itens: Item[] = [
      { nome: 'Moldura de cima', pecas: [{ nome: 'Cima', cor: 0, camadas: comVazios(cima, 0, T, [fio, ...furosPino('cima')]) }] },
      { nome: 'Moldura de baixo', pecas: [{ nome: 'Baixo', cor: 1, camadas: comVazios(faceBaixo ? espelharX(baixo) : baixo, 0, T, faceBaixo ? vaziosBaixo.map((x) => (x.z1 > 0.6 ? { ...x, regiao: espelharX(x.regiao) } : x)) : vaziosBaixo) }, ...(faceBaixo && regionArea(desenhoM) > 0.5 ? [{ nome: 'Desenho', cor: 2, camadas: [{ region: desenhoM, z0: 0, z1: 0.6 }] }] : [])] },
      { nome: 'Pinos', pecas: [{ nome: 'Pinos', cor: 0, camadas: [{ region: unir([retanguloArredondado(-6, 0, 4, 2 * prof - 1, 0.5), retanguloArredondado(6, 0, 4, 2 * prof - 1, 0.5)]), z0: 0, z1: 4 }] }] },
    ];
    const notasCor: string[] = [];
    const coresImg = txt(v, 'origem') === 'imagem' && txt(v, 'face') === 'camadas' ? coresDaArte(v, W - bw - 6, bw - 4) : [];
    if (coresImg.length > 1) {
      // Uma cor por camada: a faixa j cobre todas as cores de indice >= j, na cor j. Vista
      // de cima, cada area mostra a sua cor; imprime com troca de filamento por altura.
      const hc = num(v, 'alturaCor'), area = contornar(baixo, -1.5);
      const regs = coresImg.map((c) => intersectRegion(translateRegion(c.regiao, 0, -H / 2 + bw / 2), area));
      const pecasD: Peca[] = regs.map((_, j) => ({ nome: `Cor ${j + 1}`, cor: 3 + j, camadas: [{ region: unir(regs.slice(j)), z0: j * hc, z1: (j + 1) * hc }] }));
      const base = Math.max(0, num(v, 'espDesenho') - regs.length * hc);
      if (base > 0) pecasD.forEach((p) => { p.camadas = p.camadas.map((c) => ({ ...c, z0: c.z0 + base, z1: c.z1 + base })); });
      if (base > 0) pecasD.unshift({ nome: 'Base do desenho', cor: 3, camadas: [{ region: unir(regs), z0: 0, z1: base }] });
      itens.push({ nome: 'Desenho', pecas: pecasD });
      cores.push(...coresImg.map((_, j) => `Cor ${j + 1}`));
      hex.push(...coresImg.map((c) => c.hex));
      notasCor.push(`Desenho: troque o filamento a cada ${num(v, 'alturaCor').toLocaleString('pt-BR')} mm (uma cor por faixa).`);
    } else if (!faceBaixo && regionArea(desenhoR) > 0.5) itens.push({ nome: 'Desenho', pecas: [{ nome: 'Desenho', cor: 2, camadas: [{ region: desenhoR, z0: 0, z1: num(v, 'espDesenho') }] }] });
    return soCoresUsadas({
      itens: emGrade(itens, 2, 10), cores, hex, avisos,
      notas: ['Imprima as partes deitadas. Una com os pinos, passe um fio pelos furos das laterais e pendure as fotos com prendedores.', ...notasCor],
    });
  },
};

/** Laco (desenho nosso): duas abas e o no, largura w. */
function laco(w: number): Region {
  const aba = (s: number) => rotateRegion(translateRegion(elipse(w * 0.45, w * 0.32), s * w * 0.25, 0), s * 12, s * w * 0.05, 0);
  const pontas = [-1, 1].map((s) => rotateRegion(translateRegion(elipse(w * 0.12, w * 0.35), s * w * 0.08, -w * 0.2), s * 18, 0, -w * 0.05));
  return unir([aba(-1), aba(1), ...pontas, circulo(0, 0, w * 0.09, 32)]);
}

/** Display de unhas: disco com logo ou texto, borda, decoracao embaixo e encaixe do dedo. */
export const displayUnhas: Receita = {
  ...ficha('display-unhas'),
  parametros: [
    ...camposArte('Salão de Unhas+@formma3d', 'cal-sans'),
    mm('tamDesenho', 'Tamanho do desenho', 'Desenho', 60, 10, 120, 1),
    mm('yDesenho', 'Posição Y do desenho', 'Desenho', 8, -40, 40, 1),
    { tipo: 'escolha', id: 'lado', rotulo: 'Desenho em', grupo: 'Desenho', padrao: 'dupla', opcoes: [{ valor: 'cima', rotulo: 'Cima' }, { valor: 'baixo', rotulo: 'Baixo' }, { valor: 'dupla', rotulo: 'Dupla face' }] },
    mm('diametro', 'Diâmetro', 'Display', 90, 50, 130, 1),
    mm('base', 'Espessura', 'Display', 1.6, 1, 3),
    mm('espTexto', 'Relevo em cima', 'Display', 0.6, 0.2, 3),
    mm('borda', 'Borda', 'Display', 1, 0.4, 3, 0.1),
    mm('recuoBorda', 'Distância da borda à beira', 'Display', 2, 0.5, 6, 0.1),
    { tipo: 'escolha', id: 'mao', rotulo: 'Mão', grupo: 'Display', padrao: 'esquerda', opcoes: [{ valor: 'esquerda', rotulo: 'Esquerda' }, { valor: 'direita', rotulo: 'Direita' }], dica: 'Lado do encaixe para segurar entre os dedos' },
    { tipo: 'escolha', id: 'decoracao', rotulo: 'Decoração embaixo', grupo: 'Base', padrao: 'laco', opcoes: [{ valor: 'estrelas', rotulo: 'Estrelas' }, { valor: 'laco', rotulo: 'Laço' }, { valor: 'floral', rotulo: 'Floral' }, { valor: 'desenho', rotulo: 'Desenho' }, { valor: 'nada', rotulo: 'Nada' }] },
    { ...campoDesenho('Desenho embaixo'), id: 'desenhoBase', grupo: 'Base', visivel: (v: Valores) => v.decoracao === 'desenho' },
    mm('tamBase', 'Tamanho da decoração', 'Base', 48, 10, 120, 1),
    mm('yBase', 'Posição Y da decoração', 'Base', 0, -30, 30, 1),
    cor('corBase', 'Display', '#4a1f2e'),
    cor('corDesenho', 'Desenho', '#ffffff'),
    cor('corBorda', 'Borda', '#ffffff'),
  ],
  fontes: fontesArte,
  gerar(v, ctx): Resultado {
    const cores = ['Display', 'Desenho', 'Borda'], hex = [txt(v, 'corBase'), txt(v, 'corDesenho'), txt(v, 'corBorda')];
    const avisos: string[] = [];
    const R = num(v, 'diametro') / 2, eb = num(v, 'base');
    // Encaixe do dedo: meia-lua na lateral da mao escolhida.
    const sx = txt(v, 'mao') === 'direita' ? 1 : -1;
    const disco = diffRegion(circulo(0, 0, R, 160), circulo(sx * R, -R * 0.35, R * 0.18, 48));
    const rb = R - num(v, 'recuoBorda');
    const borda = intersectRegion(diffRegion(circulo(0, 0, rb, 160), circulo(0, 0, rb - num(v, 'borda'), 160)), contornar(disco, -0.8));
    const t = num(v, 'tamDesenho');
    const D = translateRegion(arte(v, ctx, t, t * 0.6, avisos), 0, num(v, 'yDesenho'));
    const dentro = contornar(circulo(0, 0, rb - num(v, 'borda'), 160), -1);
    const desCima = intersectRegion(D, dentro);
    const lado = txt(v, 'lado');
    // Embaixo: a decoracao (ou o desenho, se for so embaixo), embutida e espelhada.
    let deco: Region = [];
    const tb = num(v, 'tamBase');
    switch (txt(v, 'decoracao')) {
      case 'estrelas': deco = unir([translateRegion(estrela(tb * 0.45), -tb * 0.28, 0), translateRegion(estrela(tb * 0.3), tb * 0.3, tb * 0.2), translateRegion(estrela(tb * 0.22), tb * 0.25, -tb * 0.25)]); break;
      case 'laco': deco = laco(tb); break;
      case 'floral': deco = intersectRegion(padraoVazado('floral', { minX: -tb / 2, minY: -tb / 2, maxX: tb / 2, maxY: tb / 2 }, 1.2), circulo(0, 0, tb / 2, 96)); break;
      case 'desenho': if (desenho(v, 'desenhoBase')) deco = desenhoNoTamanho(v, 'desenhoBase', tb).regiao; break;
    }
    deco = translateRegion(deco, 0, num(v, 'yBase'));
    let baixo = lado === 'cima' ? deco : lado === 'baixo' ? D : unir([D, deco]);
    if (lado === 'dupla' && regionArea(intersectRegion(D, deco)) > 1) baixo = D;
    baixo = intersectRegion(espelharX(baixo), contornar(disco, -1.5));
    const ev = Math.min(0.6, eb - 0.6);
    const pecas: Peca[] = [{ nome: 'Display', cor: 0, camadas: comVazios(disco, 0, eb, regionArea(baixo) > 0.3 ? [{ regiao: baixo, z0: 0, z1: ev }] : []) }];
    if (regionArea(baixo) > 0.3) pecas.push({ nome: 'Embaixo', cor: 1, camadas: [{ region: baixo, z0: 0, z1: ev }] });
    if (lado !== 'baixo' && regionArea(desCima) > 0.3) pecas.push({ nome: 'Desenho', cor: 1, camadas: [{ region: desCima, z0: eb, z1: eb + num(v, 'espTexto') }] });
    pecas.push({ nome: 'Borda', cor: 2, camadas: [{ region: borda, z0: eb, z1: eb + num(v, 'espTexto') }] });
    return soCoresUsadas({ itens: [{ nome: 'Display de unhas', pecas }], cores, hex, avisos });
  },
};

/**
 * Mini-microfone: cubo que encaixa por baixo no microfone sem fio (furo na medida, ou
 * oco para outros modelos), capas com arte para a frente e o verso, cabeca de grade
 * (anéis) e cabo.
 */
export const miniMicrofone: Receita = {
  ...ficha('mini-microfone'),
  parametros: [
    ...camposArte('@formma3d', 'cal-sans'),
    mm('lado', 'Lado do cubo', 'Cubo', 38, 30, 80, 0.5),
    mm('alturaCubo', 'Altura do cubo', 'Cubo', 38, 30, 80, 0.5),
    mm('larguraMic', 'Largura do microfone', 'Encaixe', 22, 10, 60, 0.5),
    mm('espessuraMic', 'Espessura do microfone', 'Encaixe', 14, 6, 40, 0.5),
    mm('profundidadeMic', 'Quanto o microfone entra', 'Encaixe', 28, 10, 75, 0.5),
    { tipo: 'liga', id: 'oco', rotulo: 'Esvaziar por dentro', grupo: 'Encaixe', padrao: false, dica: 'Para outros microfones: cubo oco com paredes de 2 mm' },
    mm('folga', 'Folga do encaixe', 'Encaixe', 0.3, 0.1, 1, 0.05),
    mm('baseCapa', 'Espessura da capa', 'Capas', 1, 0.6, 3),
    mm('relevoCapa', 'Relevo da arte', 'Capas', 0.8, 0.2, 3),
    mm('cabeca', 'Diâmetro da cabeça', 'Cabeça', 30, 15, 60, 0.5),
    mm('cabo', 'Comprimento do cabo', 'Cabeça', 30, 0, 80, 1, '0 = sem cabo'),
    cor('corCubo', 'Cubo e capas', '#a85f78'),
    cor('corCabeca', 'Cabeça', '#c0c0c0'),
    cor('corCabo', 'Cabo e arte', '#222222'),
  ],
  fontes: fontesArte,
  gerar(v, ctx): Resultado {
    const cores = ['Cubo e capas', 'Cabeça', 'Cabo e arte'], hex = [txt(v, 'corCubo'), txt(v, 'corCabeca'), txt(v, 'corCabo')];
    const avisos: string[] = [];
    const L = num(v, 'lado'), Hc = num(v, 'alturaCubo'), f = num(v, 'folga');
    const quadrado = retanguloArredondado(0, 0, L, L, 2);
    const furo = liga(v, 'oco') ? retanguloArredondado(0, 0, L - 4, L - 4, 1) : retanguloArredondado(0, 0, num(v, 'larguraMic') + 2 * f, num(v, 'espessuraMic') + 2 * f, 1.5);
    const pm = Math.min(num(v, 'profundidadeMic'), Hc - 2);
    if (regionArea(diffRegion(furo, contornar(quadrado, -1.6))) > 0.1) avisos.push('O microfone não cabe no cubo: aumente o lado.');
    // Cubo em pe: furo cego vindo de baixo; o teto do furo e uma ponte curta.
    const cubo: Camada[] = comVazios(quadrado, 0, Hc, [{ regiao: furo, z0: 0, z1: pm }]);
    // Capas: placas do tamanho da face com a arte em relevo (frente e verso).
    const face = retanguloArredondado(0, 0, L - 2, Hc - 2, 2);
    const D = intersectRegion(arte(v, ctx, L - 8, Hc - 8, avisos), contornar(face, -1));
    const ec = num(v, 'baseCapa'), er = num(v, 'relevoCapa');
    const capa = (nome: string): Item => ({ nome, pecas: [{ nome: 'Capa', cor: 0, camadas: [{ region: face, z0: 0, z1: ec }] }, ...(regionArea(D) > 0.3 ? [{ nome: 'Arte', cor: 2, camadas: [{ region: D, z0: ec, z1: ec + er }] }] : [])] });
    // Cabeca: meia esfera de aneis (grade), impressa com a base na mesa.
    const rc = num(v, 'cabeca') / 2;
    const cabeca = torneado((z) => {
      const base = Math.sqrt(Math.max(0, rc * rc - z * z));
      return Math.max(0.6, base - (Math.floor(z / 1.2) % 2 ? 0.5 : 0));
    }, 0, rc * 0.98, 0.3, 96);
    const itens: Item[] = [{ nome: 'Cubo', pecas: [{ nome: 'Cubo', cor: 0, camadas: cubo }] }, capa('Capa da frente'), capa('Capa de trás'), { nome: 'Cabeça', pecas: [{ nome: 'Cabeça', cor: 1, camadas: cabeca }] }];
    if (num(v, 'cabo') > 0) itens.push({ nome: 'Cabo', pecas: [{ nome: 'Cabo', cor: 2, camadas: [{ region: circulo(0, 0, 3, 32), z0: 0, z1: num(v, 'cabo') }] }] });
    return soCoresUsadas({
      itens: emGrade(itens, 3, 8), cores, hex, avisos,
      notas: ['Cole as capas na frente e no verso do cubo, a cabeça em cima e o cabo embaixo; o microfone entra pelo furo de baixo.', 'Meça o seu microfone: o encaixe vem com as medidas que você puser.'],
    });
  },
};
