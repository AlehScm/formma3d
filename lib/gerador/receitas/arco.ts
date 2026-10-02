/**
 * Texto em arco: chaveiro redondo com rebaixo para espelho e frase em volta, e rosa com
 * frase em volta (chaveiro ou enfeite de scrunchie, com furo no meio).
 *
 * A rosa e desenho nosso: petalas em 5 lobos com uma espiral vazada (mostra a base) e
 * duas folhas com nervura.
 */
import { diffRegion, intersectRegion, regionArea, strokeToRegion, translateRegion, type Pt, type Region } from '../../geom/region';
import { circulo, contornar, semBuracos, temEmoji, textoEmArco, textoNaCaixa, unir } from '../formas';
import { espelharX } from '../figuras';
import { argolaNaDirecao } from '../lote';
import { comVazios, type Vazio } from '../solidos';
import { campoDesenho, desenhoNoTamanho } from './desenho';
import { ficha } from './fichas';
import type { Contexto, Parametro, Receita, Resultado, Valores } from '../tipos';
import { desenho, num, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });
const graus = (id: string, rotulo: string, grupo: string, padrao: number, dica?: string): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min: 0, max: 360, passo: 1, unidade: '°', dica });

const FRASE = '♥ MELHOR MÃE DO MUNDO ♥';
const camposFrase = (padraoFonte: number): Parametro[] => [
  { tipo: 'texto', id: 'texto', rotulo: 'Frase', grupo: 'Texto', padrao: FRASE, maxCaracteres: 60 },
  { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'bebas-neue' },
  mm('alturaLetra', 'Altura das letras', 'Texto', padraoFonte, 1.5, 20, 0.5),
];

function frase(v: Valores, ctx: Contexto, raio: number): { regiao: Region; graus: number } {
  const t = txt(v, 'texto').trim();
  if (!t) return { regiao: [], graus: 0 };
  return textoEmArco({ texto: t, fonte: ctx.fonte(txt(v, 'fonte')), altura: num(v, 'alturaLetra'), reserva: temEmoji(t) ? ctx.fonte('noto-emoji') : undefined }, raio, num(v, 'inicio'));
}

const fontesFrase = (v: Valores) => [String(v.fonte), ...(temEmoji(String(v.texto ?? '') + String(v.emojiVerso ?? '')) ? ['noto-emoji'] : [])];

/** Avisos comuns da frase em arco. */
function conferirFrase(f: { regiao: Region; graus: number }, dentro: Region, avisos: string[]) {
  if (f.graus > 350) avisos.push('A frase dá mais que uma volta: diminua as letras ou a frase.');
  if (regionArea(diffRegion(f.regiao, dentro)) > 0.3) avisos.push('A frase passa da borda: diminua as letras.');
}

/**
 * Chaveiro com espelho: disco com rebaixo redondo para colar um espelho, frase em arco
 * em volta, furo da argola e um emoji ou desenho embutido embaixo.
 */
export const chaveiroEspelho: Receita = {
  ...ficha('chaveiro-espelho'),
  parametros: [
    ...camposFrase(5),
    graus('inicio', 'Começo da frase', 'Texto', 270, '0 = em cima, 90 = direita; a frase segue no sentido horário'),
    mm('diametro', 'Diâmetro do chaveiro', 'Chaveiro', 50, 25, 100, 1),
    mm('dEspelho', 'Diâmetro do espelho', 'Chaveiro', 30, 10, 80, 0.5, 'Do espelho que você vai colar'),
    mm('espessura', 'Espessura', 'Chaveiro', 3, 1.6, 6),
    mm('espFundo', 'Fundo sob o espelho', 'Chaveiro', 1, 0.6, 3),
    mm('espTexto', 'Altura da frase', 'Chaveiro', 0.6, 0.2, 3),
    mm('furo', 'Furo da argola', 'Furo', 3, 0, 8, 0.5, '0 = sem furo; ele fica no vão que a frase deixa'),
    { tipo: 'texto', id: 'emojiVerso', rotulo: 'Emoji embaixo', grupo: 'Embaixo', padrao: '♥', maxCaracteres: 4, dica: 'Vazio = usa o desenho, se houver' },
    { ...campoDesenho('Desenho embaixo'), grupo: 'Embaixo', visivel: (v: Valores) => !String(v.emojiVerso ?? '').trim() },
    mm('tamVerso', 'Tamanho embaixo', 'Embaixo', 28, 5, 80, 0.5),
    cor('corTexto', 'Frase', '#ffffff'),
    cor('corBase', 'Chaveiro', '#4a1f2e'),
    cor('corVerso', 'Embaixo', '#ffffff'),
  ],
  fontes: fontesFrase,
  gerar(v, ctx): Resultado {
    const cores = ['Frase', 'Chaveiro', 'Embaixo'], hex = [txt(v, 'corTexto'), txt(v, 'corBase'), txt(v, 'corVerso')];
    const avisos: string[] = [];
    const R = num(v, 'diametro') / 2, rm = num(v, 'dEspelho') / 2 + 0.2, T = num(v, 'espessura'), ef = Math.min(num(v, 'espFundo'), T - 0.6);
    if (rm > R - 3) return { itens: [], cores, hex, avisos: ['O espelho é grande demais para este chaveiro: aumente o diâmetro.'] };
    let disco = circulo(0, 0, R, 160);
    const vazios: Vazio[] = [{ regiao: circulo(0, 0, rm, 160), z0: ef, z1: T }];
    const df = num(v, 'furo');
    const f = frase(v, ctx, rm + 1.2);
    let furo: Region = [];
    if (df > 0) {
      // No meio do vao que a frase deixa (a frase vai de "inicio" ate inicio + graus).
      const a = ((num(v, 'inicio') + f.graus + (360 - f.graus) / 2) * Math.PI) / 180, rf = R - df / 2 - 1.4;
      furo = circulo(rf * Math.sin(a), rf * Math.cos(a), df / 2, 48);
      if (rf - df / 2 < rm + 1) avisos.push('O furo encosta no espelho: diminua o espelho ou o furo.');
      disco = diffRegion(disco, furo);
    }
    conferirFrase(f, contornar(circulo(0, 0, R, 160), -0.8), avisos);
    if (furo.length && regionArea(intersectRegion(f.regiao, contornar(furo, 0.8))) > 0.05) avisos.push('A frase não deixa vão para o furo: diminua a frase ou as letras.');
    const texto = diffRegion(f.regiao, contornar(furo, 0.8));
    // Embaixo: emoji (ou desenho), espelhado e embutido.
    let verso: Region = [];
    const emoji = txt(v, 'emojiVerso').trim();
    if (emoji) verso = textoNaCaixa([emoji], { fonte: ctx.fonte(txt(v, 'fonte')), reserva: temEmoji(emoji) ? ctx.fonte('noto-emoji') : undefined, maxW: num(v, 'tamVerso'), maxH: num(v, 'tamVerso') }).regiao;
    else if (desenho(v, 'desenho')) verso = desenhoNoTamanho(v, 'desenho', num(v, 'tamVerso')).regiao;
    verso = diffRegion(intersectRegion(espelharX(verso), contornar(disco, -1)), contornar(furo, 1));
    const pecas = [];
    if (regionArea(texto) > 0.1) pecas.push({ nome: 'Frase', cor: 0, camadas: [{ region: texto, z0: T, z1: T + num(v, 'espTexto') }] });
    if (regionArea(verso) > 0.1) {
      vazios.push({ regiao: verso, z0: 0, z1: Math.min(0.6, ef - 0.2) });
      pecas.push({ nome: 'Embaixo', cor: 2, camadas: [{ region: verso, z0: 0, z1: Math.min(0.6, ef - 0.2) }] });
    }
    pecas.unshift({ nome: 'Chaveiro', cor: 1, camadas: comVazios(disco, 0, T, vazios) });
    return {
      itens: [{ nome: 'Chaveiro com espelho', pecas }], cores, hex, avisos,
      notas: [`Cole um espelho redondo de ${num(v, 'dEspelho').toLocaleString('pt-BR')} mm no rebaixo (fundo de ${(T - ef).toLocaleString('pt-BR')} mm).`],
    };
  },
};

/** Rosa nossa de raio `R`: petalas em 5 lobos, espiral vazada. Com `miolo`, vazada no centro. */
export function rosa(R: number, miolo = 0): Region {
  const pts: Pt[] = [];
  for (let i = 0; i < 200; i++) {
    const a = (2 * Math.PI * i) / 200;
    const r = R * (0.88 + 0.12 * Math.abs(Math.cos(2.5 * a)));
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  const petalas = [{ outer: pts, holes: [] }];
  // Espiral de Arquimedes do miolo ate perto da borda.
  const r0 = Math.max(R * 0.08, miolo + R * 0.08), r1 = R * 0.8, voltas = 2.25;
  const esp: Pt[] = [];
  for (let i = 0; i <= 240; i++) {
    const t = i / 240, a = t * voltas * 2 * Math.PI + Math.PI / 2;
    const r = r0 + (r1 - r0) * t;
    esp.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  let flor = diffRegion(petalas, strokeToRegion([{ pts: esp, closed: false }], Math.max(0.6, R * 0.07), true));
  if (miolo > 0) flor = diffRegion(flor, circulo(0, 0, miolo, 96));
  return flor;
}

/** Folha (duas arcos) de comprimento `c`, da origem na direcao `graus`, com nervura vazada. */
function folha(c: number, graus: number): Region {
  const pts: Pt[] = [];
  const w = c * 0.36;
  for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push({ x: c * t, y: w * Math.sin(Math.PI * t) }); }
  for (let i = 39; i > 0; i--) { const t = i / 40; pts.push({ x: c * t, y: -w * Math.sin(Math.PI * t) * 0.8 }); }
  const nervura = strokeToRegion([{ pts: [{ x: c * 0.12, y: 0 }, { x: c * 0.82, y: 0 }], closed: false }], Math.max(0.5, c * 0.05), true);
  const f = diffRegion([{ outer: pts, holes: [] }], nervura);
  const a = (graus * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
  return f.map((p) => ({ outer: p.outer.map((q) => ({ x: q.x * cs - q.y * sn, y: q.x * sn + q.y * cs })), holes: p.holes.map((h) => h.map((q) => ({ x: q.x * cs - q.y * sn, y: q.x * sn + q.y * cs }))) }));
}

/**
 * Rosa com frase em volta. Chaveiro: argola em cima. Scrunchie: furo grande no meio da
 * rosa para passar o elastico. A base acompanha tudo, com as frestas fechadas.
 */
export const rosaComTexto: Receita = {
  ...ficha('rosa-texto'),
  parametros: [
    { tipo: 'escolha', id: 'uso', rotulo: 'Uso', grupo: 'Rosa', padrao: 'chaveiro', opcoes: [{ valor: 'chaveiro', rotulo: 'Chaveiro' }, { valor: 'scrunchie', rotulo: 'Scrunchie' }] },
    mm('tamanho', 'Tamanho', 'Rosa', 50, 30, 200, 1),
    mm('furoCentral', 'Furo do meio', 'Rosa', 20, 6, 50, 1, 'Por onde passa o scrunchie', (v) => v.uso === 'scrunchie'),
    mm('furo', 'Furo da argola', 'Rosa', 3, 2, 8, 0.5, undefined, (v) => v.uso !== 'scrunchie'),
    ...camposFrase(4.5),
    graus('inicio', 'Começo da frase', 'Texto', 240, '0 = em cima, 90 = direita; a frase segue no sentido horário'),
    { tipo: 'numero', id: 'raio', rotulo: 'Raio da frase', grupo: 'Texto', padrao: 48, min: 30, max: 80, passo: 1, unidade: '%', dica: 'Em % do tamanho' },
    mm('espBase', 'Espessura da base', 'Espessuras', 2.8, 0.6, 6),
    mm('espRosa', 'Altura da rosa', 'Espessuras', 0.6, 0.2, 3),
    mm('espFolhas', 'Altura das folhas', 'Espessuras', 0.4, 0.2, 3),
    mm('espTexto', 'Altura da frase', 'Espessuras', 0.4, 0.2, 3),
    cor('corBase', 'Base', '#111111'),
    cor('corRosa', 'Rosa', '#ffc0cb'),
    cor('corFolhas', 'Folhas', '#2e7d32'),
    cor('corTexto', 'Frase', '#ffc0cb'),
  ],
  fontes: fontesFrase,
  gerar(v, ctx): Resultado {
    const cores = ['Base', 'Rosa', 'Folhas', 'Frase'], hex = [txt(v, 'corBase'), txt(v, 'corRosa'), txt(v, 'corFolhas'), txt(v, 'corTexto')];
    const avisos: string[] = [];
    const L = num(v, 'tamanho'), scr = txt(v, 'uso') === 'scrunchie';
    const miolo = scr ? num(v, 'furoCentral') / 2 : 0;
    const Rr = Math.max(L * 0.32, miolo + L * 0.12);
    const flor = rosa(Rr, miolo ? miolo + 1.2 : 0);
    // Folhas saindo de baixo da rosa, para os lados.
    const folhas = diffRegion(unir([folha(Rr * 1.05, 205), folha(Rr * 1.05, 335)].map((f) => translateRegion(f, 0, -Rr * 0.62))), contornar(semBuracos(flor), 0.3));
    const f = frase(v, ctx, (num(v, 'raio') / 100) * L);
    if (f.graus > 350) avisos.push('A frase dá mais que uma volta: diminua as letras ou a frase.');
    const texto = diffRegion(f.regiao, contornar(unir([semBuracos(flor), folhas]), 1));
    if (regionArea(f.regiao) - regionArea(texto) > 0.3) avisos.push('A frase encosta na rosa: aumente o raio da frase.');
    // Base: tudo engordado 2 mm, com as frestas de ate ~8 mm fechadas.
    const tudo = unir([semBuracos(flor), folhas, f.regiao]);
    let base = semBuracos(contornar(contornar(tudo, 6), -4));
    if (scr) base = diffRegion(base, circulo(0, 0, miolo, 96));
    else {
      const a = argolaNaDirecao(base, 0, 1, num(v, 'furo'), 1.6);
      base = diffRegion(unir([base, a.disco]), a.furo);
    }
    if (base.length > 1) avisos.push('A base saiu em partes: aproxime a frase da rosa.');
    const eb = num(v, 'espBase');
    const pecas = [
      { nome: 'Base', cor: 0, camadas: [{ region: base, z0: 0, z1: eb }] },
      { nome: 'Rosa', cor: 1, camadas: [{ region: flor, z0: eb, z1: eb + num(v, 'espRosa') }] },
      { nome: 'Folhas', cor: 2, camadas: [{ region: folhas, z0: eb, z1: eb + num(v, 'espFolhas') }] },
    ];
    if (regionArea(texto) > 0.1) pecas.push({ nome: 'Frase', cor: 3, camadas: [{ region: texto, z0: eb, z1: eb + num(v, 'espTexto') }] });
    return { itens: [{ nome: scr ? 'Rosa para scrunchie' : 'Rosa', pecas }], cores, hex, avisos };
  },
};
