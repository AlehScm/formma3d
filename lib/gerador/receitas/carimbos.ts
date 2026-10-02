/**
 * Carimbos: molde de texto ou imagem (para massa/argila), carimbo circular de imagem e
 * carimbos de doce (letras/numeros ou imagens) com corpo torneado.
 *
 * O desenho fica sempre em cima, em relevo, espelhado por padrao (o carimbo marca de
 * cabeca para baixo). A marca, quando ha, fica embutida rente a face de baixo, em outra
 * cor, espelhada para se ler olhando por baixo.
 */
import type { Font } from 'opentype.js';
import { diffRegion, intersectRegion, regionArea, regionBounds, scaleRegion, translateRegion, type Region } from '../../geom/region';
import { circulo, contornar, semBuracos, temEmoji, textoNaCaixa, unir } from '../formas';
import { espelharX } from '../figuras';
import { argolaNaDirecao, emGrade, LOTE_MAX } from '../lote';
import { comVazios, torneado, type Vazio } from '../solidos';
import { AVISO_EXEMPLO, campoDesenho, desenhoNoTamanho, nomeDoDesenho } from './desenho';
import { ficha } from './fichas';
import type { Camada, Contexto, Item, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';
import { desenho, liga, num, soCoresUsadas, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
/** Id da imagem i: 'desenho', 'desenho2', 'desenho3'... */
const sufixo = (i: number) => (i ? String(i + 1) : '');
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });

/** Regiao `r` com a maior medida igual a `tamanho`, centrada. */
function noTamanho(r: Region, tamanho: number): Region {
  const b = regionBounds(r);
  return scaleRegion(translateRegion(r, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2), tamanho / Math.max(b.w, b.h));
}

/** Marca (letra ou texto) embutida na face de baixo, dentro de `area`. */
function marcaEmbaixo(texto: string, fonte: Font, area: Region, tamanho: number): Region {
  const b = regionBounds(area);
  const t = textoNaCaixa([texto], { fonte, maxW: Math.min(b.w * 0.7, tamanho * Math.max(1, texto.length) * 0.8), maxH: Math.min(b.h * 0.7, tamanho) }).regiao;
  return intersectRegion(espelharX(translateRegion(t, (b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2)), contornar(area, -0.8));
}

const camposMarca = (padraoTamanho: number, max: number): Parametro[] => [
  { tipo: 'texto', id: 'marca', rotulo: 'Marca embaixo', grupo: 'Marca', padrao: '', maxCaracteres: 12, dica: 'Uma letra ou palavra curta, embutida na face de baixo' },
  { tipo: 'fonte', id: 'fonteMarca', rotulo: 'Fonte da marca', grupo: 'Marca', padrao: 'bebas-neue', visivel: (v) => !!v.marca },
  { ...campoDesenho('Ou o logo da marca'), id: 'marcaDesenho', grupo: 'Marca', visivel: (v: Valores) => !v.marca },
  mm('tamanhoMarca', 'Tamanho da marca', 'Marca', padraoTamanho, 2, max, 0.5, undefined, (v) => !!v.marca || !!v.marcaDesenho),
];

/** Placa (ou corpo) com a marca embutida embaixo: devolve as pecas da base e da marca. */
function comMarca(v: Valores, ctx: Contexto, area: Region, corpo: (vazios: Vazio[]) => Peca, corMarca: number): { pecas: Peca[]; avisos: string[] } {
  const texto = txt(v, 'marca').trim();
  const logo = desenho(v, 'marcaDesenho');
  if (!texto && !logo) return { pecas: [corpo([])], avisos: [] };
  let m: Region;
  if (texto) m = marcaEmbaixo(texto, ctx.fonte(txt(v, 'fonteMarca')), area, num(v, 'tamanhoMarca'));
  else {
    const b = regionBounds(area), lb = regionBounds(logo!.regiao);
    const k = Math.min(num(v, 'tamanhoMarca'), b.w * 0.7, b.h * 0.7) / Math.max(lb.w, lb.h);
    m = intersectRegion(espelharX(translateRegion(scaleRegion(translateRegion(logo!.regiao, -(lb.minX + lb.maxX) / 2, -(lb.minY + lb.maxY) / 2), k), -(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2)), contornar(area, -0.8));
  }
  if (regionArea(m) < 0.3) return { pecas: [corpo([])], avisos: ['A marca não coube embaixo do carimbo.'] };
  return { pecas: [corpo([{ regiao: m, z0: 0, z1: 0.6 }]), { nome: 'Marca', cor: corMarca, camadas: [{ region: m, z0: 0, z1: 0.6 }] }], avisos: [] };
}

/**
 * Carimbo de molde (massa, argila, biscuit): um bloco no contorno do desenho, com o
 * desenho em relevo na face e um apoio redondo para o polegar atras. O deslocamento
 * engorda o contorno do bloco ate unir partes soltas (letras, por exemplo); invertido,
 * o desenho vira vazio na face.
 */
export const carimboMolde: Receita = {
  ...ficha('carimbo-molde'),
  parametros: [
    { tipo: 'escolha', id: 'origem', rotulo: 'Desenho a partir de', grupo: 'Desenho', padrao: 'texto', opcoes: [{ valor: 'texto', rotulo: 'Texto' }, { valor: 'imagem', rotulo: 'Imagem' }] },
    { tipo: 'texto', id: 'texto', rotulo: 'Texto', grupo: 'Desenho', padrao: '@formma3d', maxCaracteres: 40, visivel: (v) => v.origem !== 'imagem' },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Desenho', padrao: 'cal-sans', visivel: (v) => v.origem !== 'imagem' },
    { ...campoDesenho(), visivel: (v) => v.origem === 'imagem' },
    mm('tamanho', 'Tamanho (lado maior)', 'Desenho', 90, 30, 300, 1),
    mm('deslocamento', 'Margem do bloco', 'Desenho', 3, 0, 10, 0.1, 'Engorda o contorno do bloco para unir partes soltas'),
    { tipo: 'liga', id: 'inverter', rotulo: 'Inverter', grupo: 'Desenho', padrao: false, dica: 'O desenho vira vazio na face (marca em relevo na massa)' },
    { tipo: 'liga', id: 'espelhar', rotulo: 'Espelhar', grupo: 'Desenho', padrao: true },
    mm('espBloco', 'Espessura do bloco', 'Medidas', 8, 2, 30, 0.5),
    mm('relevo', 'Altura do desenho', 'Medidas', 2.5, 0.6, 8),
    { tipo: 'liga', id: 'polegar', rotulo: 'Apoio do polegar', grupo: 'Polegar', padrao: true, dica: 'Rebaixo redondo atrás, para apertar' },
    mm('dPolegar', 'Diâmetro do apoio', 'Polegar', 10, 8, 25, 0.5, undefined, (v) => v.polegar === true),
    mm('xPolegar', 'Posição X', 'Polegar', 0, -100, 100, 1, undefined, (v) => v.polegar === true),
    mm('yPolegar', 'Posição Y', 'Polegar', 0, -100, 100, 1, undefined, (v) => v.polegar === true),
    cor('corBase', 'Bloco', '#e2557a'),
    cor('corTopo', 'Desenho', '#ffffff'),
  ],
  fontes: (v) => (v.origem !== 'imagem' ? [String(v.fonte), ...(temEmoji(String(v.texto ?? '')) ? ['noto-emoji'] : [])] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Bloco', 'Desenho'], hex = [txt(v, 'corBase'), txt(v, 'corTopo')];
    const avisos: string[] = [];
    let D: Region;
    let nome = 'Carimbo';
    if (txt(v, 'origem') === 'imagem') {
      const d = desenhoNoTamanho(v, 'desenho', 100);
      if (d.exemplo) avisos.push(AVISO_EXEMPLO);
      D = d.regiao;
      nome = nomeDoDesenho(v, 'desenho') || nome;
    } else {
      const t = txt(v, 'texto').trim();
      if (!t) return { itens: [], cores, hex, avisos: ['Digite o texto.'] };
      D = textoNaCaixa([t], { fonte: ctx.fonte(txt(v, 'fonte')), reserva: temEmoji(t) ? ctx.fonte('noto-emoji') : undefined, maxW: 1000, maxH: 1000 }).regiao;
      nome = t;
    }
    if (!regionArea(D)) return { itens: [], cores, hex, avisos: ['O desenho não tem área.'] };
    D = noTamanho(D, num(v, 'tamanho'));
    if (liga(v, 'espelhar')) D = espelharX(D);
    const S = semBuracos(contornar(D, num(v, 'deslocamento')));
    if (S.length > 1) avisos.push('O bloco saiu em partes soltas: aumente a margem do bloco para uni-las.');
    const H = num(v, 'espBloco'), rel = num(v, 'relevo');
    const vazios: Vazio[] = [];
    if (liga(v, 'polegar')) {
      const r = num(v, 'dPolegar') / 2, x = num(v, 'xPolegar'), y = num(v, 'yPolegar');
      let pol = circulo(x, y, r, 64);
      if (regionArea(diffRegion(pol, contornar(S, -1))) > 0.01) {
        // Nao cabe ali: vai para o ponto mais perto onde cabe com 1 mm de parede.
        const cabe = contornar(S, -(r + 1)).flatMap((p) => p.outer);
        const perto = cabe.reduce<{ x: number; y: number } | null>((m, q) => (!m || Math.hypot(q.x - x, q.y - y) < Math.hypot(m.x - x, m.y - y) ? q : m), null);
        pol = perto ? circulo(perto.x, perto.y, r, 64) : [];
        if (!perto) avisos.push('O bloco é estreito demais para o apoio do polegar: diminua o diâmetro.');
      }
      if (pol.length) vazios.push({ regiao: pol, z0: 0, z1: Math.min(3, H - 1.2) });
    }
    const face = liga(v, 'inverter') ? diffRegion(S, D) : D;
    const pecas: Peca[] = [{ nome: 'Bloco', cor: 0, camadas: comVazios(S, 0, H, vazios) }];
    if (regionArea(face) > 0.3) pecas.push({ nome: 'Desenho', cor: 1, camadas: [{ region: face, z0: H, z1: H + rel }] });
    return {
      itens: [{ nome, pecas }], cores, hex, avisos,
      notas: ['Imprima com o desenho para cima; o apoio do polegar fica na face de baixo.'],
    };
  },
};

/**
 * Carimbo circular de imagem: corpo que abre da base (na mesa) ate o topo, em degraus, o
 * desenho em relevo em cima, borda opcional em volta e marca embutida embaixo.
 */
export const carimboCircular: Receita = {
  ...ficha('carimbo-circular'),
  parametros: [
    ...camposImagens(6, 'Imagem'),
    mm('tamanho', 'Tamanho da imagem', 'Imagem', 46, 2, 60, 0.5),
    mm('xImagem', 'Posição X', 'Imagem', 0, -30, 30, 0.5),
    mm('yImagem', 'Posição Y', 'Imagem', 0, -30, 30, 0.5),
    { tipo: 'liga', id: 'espelhar', rotulo: 'Espelhar', grupo: 'Imagem', padrao: true, dica: 'Ligado para carimbar; desligado para enfeite' },
    { tipo: 'liga', id: 'borda', rotulo: 'Borda em volta', grupo: 'Imagem', padrao: true },
    mm('espBorda', 'Espessura da borda', 'Imagem', 1.2, 0.4, 10, 0.1, undefined, (v) => v.borda === true),
    mm('relevo', 'Altura do desenho', 'Carimbo', 3, 1, 10),
    mm('alturaCorpo', 'Altura do corpo', 'Carimbo', 28, 10, 42, 1),
    mm('dBase', 'Diâmetro embaixo', 'Carimbo', 40, 10, 60, 0.5, 'Na mesa'),
    mm('dTopo', 'Diâmetro em cima', 'Carimbo', 60, 10, 60, 0.5, 'Onde fica o desenho'),
    { tipo: 'liga', id: 'argola', rotulo: 'Argola de chaveiro', grupo: 'Carimbo', padrao: false, dica: 'Aba com furo na base, rente à mesa' },
    mm('furoArgola', 'Furo da argola', 'Carimbo', 3.4, 2, 8, 0.1, undefined, (v) => v.argola === true),
    ...camposMarca(20, 30),
    cor('corBase', 'Corpo', '#e2557a'),
    cor('corTopo', 'Desenho', '#ffffff'),
    cor('corMarca', 'Marca', '#ffffff'),
  ],
  fontes: (v) => (String(v.marca ?? '').trim() ? [String(v.fonteMarca)] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Corpo', 'Desenho', 'Marca'], hex = [txt(v, 'corBase'), txt(v, 'corTopo'), txt(v, 'corMarca')];
    const avisos: string[] = [];
    const Hc = num(v, 'alturaCorpo'), rb = num(v, 'dBase') / 2, rt = num(v, 'dTopo') / 2;
    // Abrir mais que 45 graus vira balanco: limita o quanto o corpo abre.
    if (rt - rb > Hc) avisos.push('O corpo abre mais que 45°: aumente a altura ou aproxime os diâmetros.');
    const topo = circulo(0, 0, rt, 128);
    const base = circulo(0, 0, rb, 128);
    const argola = liga(v, 'argola') ? argolaNaDirecao(base, 0, 1, num(v, 'furoArgola'), 1.8) : null;
    if (argola && rt > rb + 0.5) avisos.push('A argola fica embaixo da borda do topo: para chaveiro, use o topo do tamanho da base.');
    const itens: Item[] = [];
    for (const id of idsComImagem(v, 6)) {
      const { regiao, exemplo } = desenhoNoTamanho(v, id, num(v, 'tamanho'));
      if (exemplo) avisos.push(AVISO_EXEMPLO);
      let D = translateRegion(regiao, num(v, 'xImagem'), num(v, 'yImagem'));
      if (liga(v, 'espelhar')) D = espelharX(D);
      if (liga(v, 'borda')) D = unir([D, diffRegion(topo, contornar(topo, -num(v, 'espBorda')))]);
      if (regionArea(diffRegion(D, topo)) > 0.5) avisos.push('A imagem passa da borda do carimbo: diminua o tamanho ou mude a posição.');
      D = intersectRegion(D, topo);
      const corpo = (vazios: Vazio[]): Peca => {
        const camadas = furarFundo(torneado((z) => rb + (rt - rb) * Math.min(1, z / Hc), 0, Hc, 0.3, 128), vazios);
        if (!argola) return { nome: 'Corpo', cor: 0, camadas };
        // A aba da argola so nos primeiros 2,4 mm.
        const ea = Math.min(2.4, Hc);
        const comAba = camadas.flatMap((c) => (c.z0 >= ea ? [c] : c.z1 <= ea ? [{ ...c, region: diffRegion(unir([c.region, argola.disco]), argola.furo) }] : [{ ...c, z1: ea, region: diffRegion(unir([c.region, argola.disco]), argola.furo) }, { ...c, z0: ea }]));
        return { nome: 'Corpo', cor: 0, camadas: comAba };
      };
      const m = comMarca(v, ctx, base, corpo, 2);
      avisos.push(...m.avisos);
      itens.push({ nome: nomeDoDesenho(v, id) || 'Carimbo', pecas: [m.pecas[0]!, { nome: 'Desenho', cor: 1, camadas: [{ region: D, z0: Hc, z1: Hc + num(v, 'relevo') }] }, ...m.pecas.slice(1)] });
    }
    return soCoresUsadas({ itens: itens.length > 1 ? emGrade(itens) : itens, cores, hex, avisos: [...new Set(avisos)] });
  },
};

/** Tira os `vazios` (todos rentes ao fundo) das camadas de um corpo empilhado. */
function furarFundo(camadas: Camada[], vazios: Vazio[]): Camada[] {
  if (!vazios.length) return camadas;
  const topo = Math.max(...vazios.map((x) => x.z1));
  return camadas.flatMap((c) => (c.z0 >= topo ? [c] : c.z1 <= topo ? comVazios(c.region, c.z0, c.z1, vazios) : [...comVazios(c.region, c.z0, topo, vazios), { ...c, z0: topo }]));
}

/** Corpo de carimbo de doce: pe, cabo fino e topo que abre ate o diametro do desenho. */
function corpoDoce(v: Valores): { raio: (z: number) => number; H: number; avisos: string[] } {
  const H = num(v, 'alturaCorpo'), rb = num(v, 'dBase') / 2, rc = num(v, 'dCabo') / 2, rt = num(v, 'dTopo') / 2;
  const avisos: string[] = [];
  // Cada transicao abre no maximo 40 graus (sem suporte).
  const tg = Math.tan((40 * Math.PI) / 180);
  const hPe = Math.max(H * 0.15, Math.abs(rb - rc) / tg), hTopo = Math.max(H * 0.2, Math.abs(rt - rc) / tg);
  if (hPe + hTopo > H * 0.9) avisos.push('O corpo é baixo para essas larguras: aumente a altura do corpo.');
  const zPe = Math.min(hPe, H * 0.45), zTopo = H - Math.min(hTopo, H * 0.45);
  const raio = (z: number) => (z <= zPe ? rb + (rc - rb) * (z / zPe) : z >= zTopo ? rc + (rt - rc) * ((z - zTopo) / (H - zTopo)) : rc);
  return { raio, H, avisos };
}

const camposCorpoDoce = (dTopo: number, H: number): Parametro[] => [
  mm('profundidade', 'Altura do desenho', 'Carimbo', 4, 1, 10),
  mm('dTopo', 'Diâmetro do topo', 'Carimbo', dTopo, 10, 60, 0.5, 'Onde fica o desenho'),
  mm('alturaCorpo', 'Altura do corpo', 'Carimbo', H, 10, 42, 1),
  mm('dCabo', 'Diâmetro do cabo', 'Carimbo', 10, 5, 20, 0.5),
  mm('dBase', 'Diâmetro da base', 'Carimbo', 18, 10, 60, 0.5),
  { tipo: 'liga', id: 'espelhar', rotulo: 'Espelhar', grupo: 'Carimbo', padrao: true, dica: 'Ligado para carimbar; desligado para enfeite' },
];

/** Um carimbo de doce com o desenho `D` (centrado) em cima. */
function carimboDoce(nome: string, D: Region, v: Valores, ctx: Contexto): { item: Item; avisos: string[] } {
  const { raio, H, avisos } = corpoDoce(v);
  const rt = num(v, 'dTopo') / 2;
  const topo = circulo(0, 0, rt, 96);
  let des = liga(v, 'espelhar') ? espelharX(D) : D;
  if (regionArea(diffRegion(des, topo)) > 0.3) avisos.push(`"${nome}": o desenho passa do topo; diminua o tamanho.`);
  des = intersectRegion(des, contornar(topo, -0.3));
  const base = circulo(0, 0, num(v, 'dBase') / 2, 96);
  const corpo = (vazios: Vazio[]): Peca => ({ nome: 'Corpo', cor: 0, camadas: furarFundo(torneado(raio, 0, H, 0.3, 96), vazios) });
  const m = comMarca(v, ctx, base, corpo, 1);
  const pecas: Peca[] = [m.pecas[0]!];
  if (regionArea(des) > 0.3) pecas.push({ nome: 'Desenho', cor: 1, camadas: [{ region: des, z0: H, z1: H + num(v, 'profundidade') }] });
  else avisos.push(`"${nome}": o desenho sumiu.`);
  pecas.push(...m.pecas.slice(1));
  return { item: { nome, pecas }, avisos: [...avisos, ...m.avisos] };
}

/** Carimbos de doce de letras e numeros: um carimbo por caractere, ate 9. */
export const carimboLetras: Receita = {
  ...ficha('carimbo-letras'),
  parametros: [
    { tipo: 'texto', id: 'textos', rotulo: 'Letras ou números', grupo: 'Texto', padrao: 'A, B, C, 1, 2, 3', maxCaracteres: 60, dica: `Separados por vírgula; até ${LOTE_MAX}` },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'bebas-neue' },
    mm('tamanho', 'Altura da letra', 'Texto', 16, 2, 40, 0.5),
    ...camposCorpoDoce(22, 25),
    ...camposMarca(8, 10),
    cor('corBase', 'Corpo', '#e2557a'),
    cor('corTopo', 'Letra e marca', '#ffffff'),
  ],
  fontes: (v) => [String(v.fonte), ...(String(v.marca ?? '').trim() ? [String(v.fonteMarca)] : [])],
  gerar(v, ctx): Resultado {
    const cores = ['Corpo', 'Letra'], hex = [txt(v, 'corBase'), txt(v, 'corTopo')];
    const lista = txt(v, 'textos').split(',').map((s) => s.trim()).filter(Boolean);
    if (!lista.length) return { itens: [], cores, hex, avisos: ['Digite ao menos uma letra ou número.'] };
    const avisos: string[] = lista.length > LOTE_MAX ? [`Só os ${LOTE_MAX} primeiros entram.`] : [];
    const itens: Item[] = [];
    for (const t of lista.slice(0, LOTE_MAX)) {
      const D = textoNaCaixa([t], { fonte: ctx.fonte(txt(v, 'fonte')), maxW: num(v, 'dTopo') - 1.5, maxH: num(v, 'tamanho') }).regiao;
      if (!regionArea(D)) { avisos.push(`"${t}" não tem desenho nesta fonte.`); continue; }
      const r = carimboDoce(t, D, v, ctx);
      itens.push(r.item);
      avisos.push(...r.avisos);
    }
    return { itens: emGrade(itens), cores, hex, avisos: [...new Set(avisos)] };
  },
};

const IMAGENS = 6;

/** Carimbos de doce com imagem: ate 6 imagens, cada uma com tamanho e posicao proprios. */
export const carimboImagem: Receita = {
  ...ficha('carimbo-imagem'),
  parametros: [
    ...Array.from({ length: IMAGENS }, (_, i): Parametro[] => {
      const s = sufixo(i), g = `Imagem ${i + 1}`;
      const tem = (v: Valores) => !!v[`desenho${s}`];
      return [
        { ...campoDesenho(`Imagem ${i + 1}`), id: `desenho${s}`, grupo: g, ...(i ? { visivel: (v: Valores) => !!v[`desenho${sufixo(i - 1)}`] } : {}) },
        mm(`tamanho${s}`, 'Tamanho (lado maior)', g, 16, 2, 40, 0.5, undefined, i ? tem : undefined),
        mm(`x${s}`, 'Posição X', g, 0, -20, 20, 0.5, undefined, i ? tem : undefined),
        mm(`y${s}`, 'Posição Y', g, 0, -20, 20, 0.5, undefined, i ? tem : undefined),
        { tipo: 'liga', id: `preencher${s}`, rotulo: 'Só a silhueta', grupo: g, padrao: false, dica: 'Preenche os vazios do desenho: marca só a forma de fora', ...(i ? { visivel: tem } : {}) },
      ];
    }).flat(),
    ...camposCorpoDoce(22, 40),
    ...camposMarca(8, 10),
    cor('corBase', 'Corpo', '#e2557a'),
    cor('corTopo', 'Desenho e marca', '#ffffff'),
  ],
  fontes: (v) => (String(v.marca ?? '').trim() ? [String(v.fonteMarca)] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Corpo', 'Desenho'], hex = [txt(v, 'corBase'), txt(v, 'corTopo')];
    const avisos: string[] = [];
    const itens: Item[] = [];
    for (let i = 0; i < IMAGENS; i++) {
      const s = sufixo(i), id = `desenho${s}`;
      if (i && !desenho(v, id)) continue;
      const { regiao, exemplo } = desenhoNoTamanho(v, id, 100);
      if (exemplo) avisos.push(AVISO_EXEMPLO);
      if (!regionArea(regiao)) continue;
      let D = translateRegion(noTamanho(regiao, num(v, `tamanho${s}`)), num(v, `x${s}`), num(v, `y${s}`));
      if (liga(v, `preencher${s}`)) D = semBuracos(D);
      const r = carimboDoce(nomeDoDesenho(v, id) || `Carimbo ${i + 1}`, D, v, ctx);
      itens.push(r.item);
      avisos.push(...r.avisos);
    }
    return { itens: emGrade(itens), cores, hex, avisos: [...new Set(avisos)] };
  },
};

/** Campos de ate `n` imagens: a seguinte aparece quando a anterior foi escolhida. */
function camposImagens(n: number, rotulo: string): Parametro[] {
  return Array.from({ length: n }, (_, i): Parametro => ({
    ...campoDesenho(n > 1 ? `${rotulo} ${i + 1}` : rotulo), id: `desenho${sufixo(i)}`, grupo: rotulo,
    ...(i ? { visivel: (v: Valores) => !!v[`desenho${sufixo(i - 1)}`] } : {}),
  }));
}

/** Ids das imagens escolhidas (a primeira sempre, com o exemplo se vazia). */
function idsComImagem(v: Valores, n: number): string[] {
  return Array.from({ length: n }, (_, i) => `desenho${sufixo(i)}`).filter((id, i) => i === 0 || desenho(v, id));
}
