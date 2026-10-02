/**
 * Letra grande (uma letra com nome) em sete acabamentos e as luminarias de LED (letra
 * grande e @social).
 *
 * Letra grande: o nome assenta num rebaixo da letra (ou afunda nela), com bordas para
 * resina, com textura ou floral por dentro de uma moldura, com fundo para EVA/feltro ou
 * com compartimento para glitter fechado por acetato. Tudo imprime deitado.
 */
import { diffRegion, intersectRegion, regionArea, regionBounds, rotateRegion, translateRegion, type Region } from '../../geom/region';
import { circulo, comporLinhas, contornar, coracao, escalaParaLargura, retanguloArredondado, semBuracos, temEmoji, textoNaCaixa, unir } from '../formas';
import { arabesco, textura } from '../figuras';
import { comVazios } from '../solidos';
import { desenho, liga, num, soCoresUsadas, txt } from '../tipos';
import { ficha } from './fichas';
import { padraoVazado } from './papelaria';
import type { Camada, Contexto, Item, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string, visivel?: (v: Valores) => boolean): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao, visivel });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });
const ret = (x0: number, y0: number, x1: number, y1: number): Region => [{ outer: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], holes: [] }];

const ESTILOS = [
  { valor: 'nome', rotulo: 'Nome encaixado' },
  { valor: 'rebaixado', rotulo: 'Nome afundado' },
  { valor: 'resina', rotulo: 'Bordas para resina' },
  { valor: 'textura', rotulo: 'Moldura com textura' },
  { valor: 'floral', rotulo: 'Moldura floral' },
  { valor: 'material', rotulo: 'Fundo para EVA ou feltro' },
  { valor: 'brilho', rotulo: 'Compartimento para glitter' },
];
const moldura = (v: Valores) => ['textura', 'floral', 'material', 'brilho'].includes(String(v.estilo));

/** A letra no tamanho (altura das maiusculas), engrossada e com a base cortada reta. */
function letraGrandeRegiao(v: Valores, ctx: Contexto): Region {
  const c = [...txt(v, 'letra').trim()][0] ?? 'A';
  const fonte = ctx.fonte(txt(v, 'fonteLetra'));
  const compor = (k: number) => comporLinhas([{ texto: c, fonte, altura: 10 * k }], 0);
  const t = compor(escalaParaLargura((k) => compor(k).bounds.h, num(v, 'altura')));
  let L = num(v, 'engrossar') > 0 ? contornar(t.regiao, num(v, 'engrossar')) : t.regiao;
  const corte = num(v, 'cortarBase') / 100;
  if (corte > 0) {
    const b = regionBounds(L);
    L = intersectRegion(L, ret(b.minX - 1, b.minY + b.h * corte, b.maxX + 1, b.maxY + 1));
  }
  const b = regionBounds(L);
  return translateRegion(L, -(b.minX + b.maxX) / 2, -b.minY);
}

/** O nome (com enfeite opcional) posicionado sobre a letra. */
function nomeNaLetra(v: Valores, ctx: Contexto, L: Region): Region {
  const nome = txt(v, 'nome').trim();
  const proprio = desenho(v, 'desenhoNome');
  if (!nome && !proprio) return [];
  const b = regionBounds(L);
  let base: Region;
  if (proprio) {
    const db = regionBounds(proprio.regiao);
    const k = Math.min((b.w * (num(v, 'escalaNome') / 100)) / db.w, (b.h * 0.45) / db.h);
    base = proprio.regiao.map((p) => ({ outer: p.outer.map((q) => ({ x: q.x * k, y: q.y * k })), holes: p.holes.map((h) => h.map((q) => ({ x: q.x * k, y: q.y * k }))) }));
  } else {
    base = textoNaCaixa(nome.split('+'), {
      fonte: ctx.fonte(txt(v, 'fonteNome')), reserva: temEmoji(nome) ? ctx.fonte('noto-emoji') : undefined,
      maxW: b.w * (num(v, 'escalaNome') / 100), maxH: b.h * 0.45, entrelinha: 1, espacamento: num(v, 'espacamentoNome') / 100,
    }).regiao;
  }
  let n = num(v, 'engrossarNome') > 0 ? contornar(base, num(v, 'engrossarNome')) : base;
  const nb = regionBounds(n);
  if (txt(v, 'enfeite') === 'coracao') {
    const c = coracao(nb.h * 0.6);
    n = unir([n, translateRegion(c, nb.maxX + regionBounds(c).w * 0.6, (nb.minY + nb.maxY) / 2)]);
  } else if (txt(v, 'enfeite') === 'espiral') {
    const a = arabesco(nb.w * 0.8, Math.max(1, nb.h * 0.06));
    n = unir([n, translateRegion(a, (nb.minX + nb.maxX) / 2, nb.minY - regionBounds(a).h / 2 + nb.h * 0.1)]);
  }
  const fb = regionBounds(n);
  n = translateRegion(n, -(fb.minX + fb.maxX) / 2, -(fb.minY + fb.maxY) / 2);
  n = rotateRegion(n, num(v, 'giroNome'));
  return translateRegion(n, (b.minX + b.maxX) / 2 + (num(v, 'xNome') / 100) * (b.w / 2), (b.minY + b.maxY) / 2 + (num(v, 'yNome') / 100) * (b.h / 2));
}

/** Textura por dentro da moldura: padrao de figuras, desenho do usuario ou floral. */
function texturaDentro(v: Valores, I: Region, floral: boolean): Region {
  const b = regionBounds(I);
  if (floral) return intersectRegion(padraoVazado('floral', b, 1.2), contornar(I, -1));
  const d = desenho(v, 'desenhoTextura');
  if (d) {
    const db = regionBounds(d.regiao), k = 12 / Math.max(db.w, db.h), blocos: Region = [];
    for (let y = b.minY + 6, j = 0; y < b.maxY; y += 14, j++) for (let x = b.minX + 6 + (j % 2 ? 7 : 0); x < b.maxX; x += 14) {
      blocos.push(...translateRegion(d.regiao.map((p) => ({ outer: p.outer.map((q) => ({ x: (q.x - (db.minX + db.maxX) / 2) * k, y: (q.y - (db.minY + db.maxY) / 2) * k })), holes: p.holes.map((h) => h.map((q) => ({ x: (q.x - (db.minX + db.maxX) / 2) * k, y: (q.y - (db.minY + db.maxY) / 2) * k }))) })), x, y));
    }
    return intersectRegion(unir([blocos]), contornar(I, -1));
  }
  return intersectRegion(textura(txt(v, 'textura') || 'pontos', b, 4, 1.2), contornar(I, -1));
}

export const letraGrande: Receita = {
  ...ficha('letra-grande'),
  parametros: [
    { tipo: 'escolha', id: 'estilo', rotulo: 'Acabamento', grupo: 'Letra', padrao: 'nome', opcoes: ESTILOS },
    { tipo: 'texto', id: 'letra', rotulo: 'Letra', grupo: 'Letra', padrao: 'M', maxCaracteres: 1 },
    { tipo: 'fonte', id: 'fonteLetra', rotulo: 'Fonte da letra', grupo: 'Letra', padrao: 'playfair-900' },
    mm('altura', 'Altura da letra', 'Letra', 160, 40, 300, 1),
    mm('engrossar', 'Engrossar a letra', 'Letra', 0, 0, 20, 0.5, 'Letra fina fica larga o bastante para a moldura'),
    { tipo: 'numero', id: 'cortarBase', rotulo: 'Cortar a base', grupo: 'Letra', padrao: 0, min: 0, max: 40, passo: 1, unidade: '%', dica: 'Corta o pé reto para a letra ficar em pé' },
    mm('espLetra', 'Espessura da letra', 'Letra', 22, 6, 60, 0.5),
    { tipo: 'texto', id: 'nome', rotulo: 'Nome', grupo: 'Nome', padrao: 'Mom', maxCaracteres: 30, dica: '"+" quebra a linha; vazio = sem nome' },
    { tipo: 'fonte', id: 'fonteNome', rotulo: 'Fonte do nome', grupo: 'Nome', padrao: 'dancing-script-700' },
    { tipo: 'svg', id: 'desenhoNome', rotulo: 'Ou o nome em imagem', grupo: 'Nome', padrao: '', dica: 'SVG/PNG do nome já desenhado (uma fonte que não está na lista)' },
    { tipo: 'escolha', id: 'enfeite', rotulo: 'Enfeite do nome', grupo: 'Nome', padrao: 'nenhum', opcoes: [{ valor: 'nenhum', rotulo: 'Nenhum' }, { valor: 'coracao', rotulo: 'Coração' }, { valor: 'espiral', rotulo: 'Arabesco' }] },
    { tipo: 'numero', id: 'escalaNome', rotulo: 'Largura do nome', grupo: 'Nome', padrao: 90, min: 30, max: 160, passo: 1, unidade: '%', dica: 'Em % da largura da letra' },
    { tipo: 'numero', id: 'xNome', rotulo: 'Posição X do nome', grupo: 'Nome', padrao: 0, min: -100, max: 100, passo: 1, unidade: '%' },
    { tipo: 'numero', id: 'yNome', rotulo: 'Posição Y do nome', grupo: 'Nome', padrao: -20, min: -100, max: 100, passo: 1, unidade: '%' },
    { tipo: 'numero', id: 'giroNome', rotulo: 'Giro do nome', grupo: 'Nome', padrao: 0, min: -180, max: 180, passo: 1, unidade: '°' },
    mm('engrossarNome', 'Engrossar o nome', 'Nome', 0.4, 0, 2, 0.1),
    { tipo: 'numero', id: 'espacamentoNome', rotulo: 'Espaço entre letras do nome', grupo: 'Nome', padrao: 100, min: 50, max: 200, passo: 1, unidade: '%' },
    mm('contornoNome', 'Contorno do nome', 'Nome', 3, 0.5, 10, 0.1, 'Une as letras do nome numa peça'),
    mm('espNome', 'Espessura do nome', 'Nome', 7, 1, 20, 0.5),
    mm('rebaixo', 'Quanto o nome afunda', 'Nome', 2, 0, 10, 0.5),
    { tipo: 'liga', id: 'nomeVazado', rotulo: 'Nome só com as paredes', grupo: 'Nome', padrao: true, dica: 'Em vez de uma placa cheia, o contorno e as letras', visivel: (v) => v.estilo === 'rebaixado' },
    mm('parede', 'Parede da moldura', 'Moldura', 5, 1.2, 15, 0.5, undefined, moldura),
    mm('fundo', 'Fundo da moldura', 'Moldura', 1.8, 0.8, 6, 0.1, undefined, moldura),
    { tipo: 'escolha', id: 'textura', rotulo: 'Textura', grupo: 'Moldura', padrao: 'pontos', opcoes: [{ valor: 'pontos', rotulo: 'Pontos' }, { valor: 'listras', rotulo: 'Listras' }, { valor: 'hilbert', rotulo: 'Curva de Hilbert' }], visivel: (v) => v.estilo === 'textura' },
    { tipo: 'svg', id: 'desenhoTextura', rotulo: 'Ou um desenho repetido', grupo: 'Moldura', padrao: '', visivel: (v) => v.estilo === 'textura' },
    mm('relevoTextura', 'Relevo da textura', 'Moldura', 0.6, 0.2, 3, 0.1, undefined, (v) => v.estilo === 'textura' || v.estilo === 'floral'),
    { tipo: 'liga', id: 'texturaElevada', rotulo: 'Textura em relevo', grupo: 'Moldura', padrao: false, dica: 'Desligado: a textura fica rente à moldura (boa para imprimir com a face na mesa)', visivel: (v) => v.estilo === 'textura' || v.estilo === 'floral' },
    mm('material', 'Espessura do EVA/feltro', 'Moldura', 2, 0.5, 6, 0.1, undefined, (v) => v.estilo === 'material'),
    mm('frente', 'Largura da moldura da frente', 'Moldura', 6, 1.5, 10, 0.5, 'Segura o acetato', (v) => v.estilo === 'brilho'),
    mm('espFrente', 'Espessura da moldura da frente', 'Moldura', 2, 1, 5, 0.5, undefined, (v) => v.estilo === 'brilho'),
    mm('bordaLetra', 'Borda da letra', 'Resina', 1, 0.4, 4, 0.1, undefined, (v) => v.estilo === 'resina'),
    mm('bordaNome', 'Borda do nome', 'Resina', 0.6, 0.4, 3, 0.1, undefined, (v) => v.estilo === 'resina'),
    mm('altBorda', 'Altura das bordas', 'Resina', 0.4, 0.2, 3, 0.1, undefined, (v) => v.estilo === 'resina'),
    mm('folga', 'Folga do encaixe', 'Encaixe', 0.2, 0.05, 0.6, 0.01),
    cor('corLetra', 'Letra', '#4a1f2e'),
    cor('corNome', 'Nome', '#ffffff'),
    cor('corTextura1', 'Fundo de dentro', '#a85f78', moldura),
    cor('corTextura2', 'Textura', '#f5f5dc', (v) => v.estilo === 'textura' || v.estilo === 'floral'),
  ],
  fontes: (v) => [String(v.fonteLetra), ...(String(v.nome ?? '').trim() ? [String(v.fonteNome), ...(temEmoji(String(v.nome)) ? ['noto-emoji'] : [])] : [])],
  gerar(v, ctx): Resultado {
    const cores = ['Letra', 'Nome', 'Fundo de dentro', 'Textura'], hex = [txt(v, 'corLetra'), txt(v, 'corNome'), txt(v, 'corTextura1'), txt(v, 'corTextura2')];
    const avisos: string[] = [], notas: string[] = [];
    const L = letraGrandeRegiao(v, ctx);
    if (!regionArea(L)) return { itens: [], cores, hex, avisos: ['Digite a letra.'] };
    if (L.length > 1) avisos.push('A letra saiu em partes: engrosse a letra.');
    const E = num(v, 'espLetra'), folga = num(v, 'folga'), estilo = txt(v, 'estilo');
    const N = nomeNaLetra(v, ctx, L);
    const placaNome = N.length ? placaDoNome(N, num(v, 'contornoNome')) : [];
    if (placaNome.length > 1) avisos.push('O nome ficou em pedaços: aumente o contorno do nome.');
    // Nome em peca propria, deitada, para encaixar no rebaixo: onde ele passa da letra,
    // impresso no lugar ficaria no ar.
    const nomeSolto = (extra: Peca[] = []): Item => ({ nome: 'Nome', pecas: [{ nome: 'Nome', cor: 1, camadas: [{ region: placaNome, z0: 0, z1: num(v, 'espNome') }] }, ...extra] });
    if (N.length && regionArea(diffRegion(placaNome, L)) > 1 && estilo !== 'nome') avisos.push('O nome passa da letra: diminua ou mova o nome.');
    const p = Math.min(num(v, 'rebaixo'), E - 1);
    const vao = placaNome.length ? contornar(placaNome, folga) : [];
    const pecas: Peca[] = [];
    const itensExtra: Item[] = [];
    const parede = num(v, 'parede'), fundo = num(v, 'fundo');
    const I = contornar(L, -parede);
    if (moldura(v) && !regionArea(I)) return { itens: [], cores, hex, avisos: ['A letra é fina demais para a moldura: engrosse a letra ou diminua a parede.'] };

    if (estilo === 'nome' || estilo === 'rebaixado' || estilo === 'resina') {
      const fundoRebaixo = E - p;
      pecas.push({ nome: 'Letra', cor: 0, camadas: p > 0 && vao.length ? comVazios(L, 0, E, [{ regiao: vao, z0: fundoRebaixo, z1: E }]) : [{ region: L, z0: 0, z1: E }] });
      if (placaNome.length) {
        if (estilo === 'rebaixado') {
          // Afundado: o nome fica no rebaixo, rente ao topo da letra.
          const vazado = liga(v, 'nomeVazado');
          const reg = vazado ? unir([diffRegion(placaNome, contornar(placaNome, -1.2)), intersectRegion(N, placaNome)]) : placaNome;
          pecas.push({ nome: 'Nome', cor: 1, camadas: [{ region: reg, z0: fundoRebaixo, z1: E }] });
        } else if (estilo !== 'resina') itensExtra.push(nomeSolto());
      }
      if (estilo === 'resina') {
        const hb = num(v, 'altBorda');
        const bordaL = diffRegion(diffRegion(L, contornar(L, -num(v, 'bordaLetra'))), vao);
        pecas.push({ nome: 'Borda da letra', cor: 0, camadas: [{ region: bordaL, z0: E, z1: E + hb }] });
        if (placaNome.length) {
          const topo = num(v, 'espNome');
          itensExtra.push(nomeSolto([{ nome: 'Borda do nome', cor: 1, camadas: [{ region: diffRegion(placaNome, contornar(placaNome, -num(v, 'bordaNome'))), z0: topo, z1: topo + hb }] }]));
        }
        notas.push('Com a peça nivelada, despeje a resina dentro das bordas da letra e do nome.');
      }
    } else if (estilo === 'textura' || estilo === 'floral') {
      // Moldura: fundo e parede em volta; dentro, o fundo de outra cor e a textura em cima.
      // Textura rente (plana): o fundo de dentro vai ate E - h e a textura completa ate E,
      // embutida nele. Em relevo: o fundo vai ate E e a textura sobe h acima.
      const h = num(v, 'relevoTextura'), elevada = liga(v, 'texturaElevada');
      const topoFundo = elevada ? E : E - h;
      const dentro = contornar(I, -folga);
      const vazios = p > 0 && vao.length ? [{ regiao: vao, z0: E - p, z1: E + h + 1 }] : [];
      pecas.push({ nome: 'Letra', cor: 0, camadas: [{ region: L, z0: 0, z1: fundo }, ...comVazios(diffRegion(L, I), fundo, E, vazios)] });
      const tex = diffRegion(texturaDentro(v, I, estilo === 'floral'), p > 0 ? vao : []);
      pecas.push({ nome: 'Fundo de dentro', cor: 2, camadas: [...comVazios(dentro, fundo, topoFundo, vazios), ...(elevada ? [] : comVazios(diffRegion(dentro, tex), E - h, E, vazios))] });
      if (regionArea(tex) > 0.5) pecas.push({ nome: 'Textura', cor: 3, camadas: [{ region: tex, z0: topoFundo, z1: topoFundo + h }] });
      if (placaNome.length) itensExtra.push(nomeSolto());
    } else if (estilo === 'material') {
      // Moldura aberta na frente: fundo, parede, e o EVA/feltro cortado no molde deita no fundo.
      pecas.push({ nome: 'Letra', cor: 0, camadas: [{ region: L, z0: 0, z1: fundo }, { region: diffRegion(L, I), z0: fundo, z1: E }] });
      itensExtra.push({ nome: 'Molde do EVA', pecas: [{ nome: 'Molde', cor: 2, camadas: [{ region: contornar(I, -folga), z0: 0, z1: 0.6 }] }] });
      if (placaNome.length) itensExtra.push(nomeSolto());
      notas.push(`Use a peça "Molde do EVA" para cortar o material (${num(v, 'material').toLocaleString('pt-BR')} mm), deite-o no fundo da letra e cole o nome por cima.`);
      if (fundo + num(v, 'material') > E - 1) avisos.push('O material não cabe na letra: aumente a espessura da letra.');
    } else {
      // Brilho: caixa da letra (fundo + parede), moldura da frente separada que prende o acetato.
      const lip = num(v, 'frente'), ef = num(v, 'espFrente');
      pecas.push({ nome: 'Letra', cor: 0, camadas: [{ region: L, z0: 0, z1: fundo }, { region: diffRegion(L, I), z0: fundo, z1: E - ef }] });
      const frente = diffRegion(L, contornar(L, -lip));
      itensExtra.push({ nome: 'Moldura da frente', pecas: [{ nome: 'Moldura da frente', cor: 0, camadas: [{ region: frente, z0: 0, z1: ef }] }] });
      itensExtra.push({ nome: 'Molde do acetato', pecas: [{ nome: 'Molde', cor: 2, camadas: [{ region: contornar(L, -(lip / 2)), z0: 0, z1: 0.6 }] }] });
      if (placaNome.length) itensExtra.push(nomeSolto());
      notas.push('Encha a letra de glitter, cubra com acetato cortado pelo molde, cole a moldura da frente e o nome.');
      if (lip <= parede) avisos.push('A moldura da frente é mais estreita que a parede: o acetato não apoia. Aumente a largura da frente.');
    }
    if (placaNome.length && p > 0 && ['nome', 'resina', 'textura', 'floral'].includes(estilo)) notas.push('Encaixe o nome no rebaixo da letra (cola se precisar).');
    const itens: Item[] = [{ nome: `Letra ${[...txt(v, 'letra').trim()][0] ?? ''}`, pecas }, ...itensExtra];
    return soCoresUsadas({ itens: itens.length > 1 ? posLado(itens) : itens, cores, hex, avisos, notas });
  },
};

/** Itens lado a lado (o primeiro e a letra, grande; os outros a direita, em coluna). */
function posLado(itens: Item[]): Item[] {
  const bx = (it: Item) => regionBounds(it.pecas.flatMap((p) => p.camadas.flatMap((c) => c.region)));
  const b0 = bx(itens[0]!);
  let y = b0.maxY;
  return itens.map((it, i) => {
    if (!i) return it;
    const b = bx(it);
    const dx = b0.maxX + 10 - b.minX, dy = y - b.maxY;
    y -= b.h + 10;
    return { nome: it.nome, pecas: it.pecas.map((p) => ({ ...p, camadas: p.camadas.map((c) => ({ ...c, region: translateRegion(c.region, dx, dy) })) })) };
  });
}

/**
 * Luminaria letra grande: base (fundo + parede onde cola a fita de LED, com saida do
 * cabo) e tampa translucida que encaixa por fora da parede; o nome cola na tampa.
 */
export const luminariaLetra: Receita = {
  ...ficha('luminaria-letra'),
  parametros: [
    { tipo: 'texto', id: 'letra', rotulo: 'Letra', grupo: 'Letra', padrao: 'A', maxCaracteres: 1 },
    { tipo: 'fonte', id: 'fonteLetra', rotulo: 'Fonte da letra', grupo: 'Letra', padrao: 'archivo-black' },
    mm('altura', 'Altura da letra', 'Letra', 160, 60, 300, 1),
    mm('engrossar', 'Engrossar a letra', 'Letra', 4, 0, 20, 0.5, 'Precisa de espaço por dentro para a fita de LED'),
    { tipo: 'numero', id: 'cortarBase', rotulo: 'Cortar a base', grupo: 'Letra', padrao: 0, min: 0, max: 40, passo: 1, unidade: '%' },
    { tipo: 'texto', id: 'nome', rotulo: 'Nome', grupo: 'Nome', padrao: 'Ana', maxCaracteres: 30 },
    { tipo: 'fonte', id: 'fonteNome', rotulo: 'Fonte do nome', grupo: 'Nome', padrao: 'pacifico' },
    { tipo: 'escolha', id: 'enfeite', rotulo: 'Enfeite do nome', grupo: 'Nome', padrao: 'nenhum', opcoes: [{ valor: 'nenhum', rotulo: 'Nenhum' }, { valor: 'coracao', rotulo: 'Coração' }, { valor: 'espiral', rotulo: 'Arabesco' }] },
    { tipo: 'numero', id: 'escalaNome', rotulo: 'Largura do nome', grupo: 'Nome', padrao: 110, min: 30, max: 160, passo: 1, unidade: '%' },
    { tipo: 'numero', id: 'xNome', rotulo: 'Posição X do nome', grupo: 'Nome', padrao: 0, min: -100, max: 100, passo: 1, unidade: '%' },
    { tipo: 'numero', id: 'yNome', rotulo: 'Posição Y do nome', grupo: 'Nome', padrao: -10, min: -100, max: 100, passo: 1, unidade: '%' },
    { tipo: 'numero', id: 'giroNome', rotulo: 'Giro do nome', grupo: 'Nome', padrao: 0, min: -180, max: 180, passo: 1, unidade: '°' },
    mm('engrossarNome', 'Engrossar o nome', 'Nome', 0.4, 0, 2, 0.1),
    { tipo: 'numero', id: 'espacamentoNome', rotulo: 'Espaço entre letras do nome', grupo: 'Nome', padrao: 100, min: 50, max: 200, passo: 1, unidade: '%' },
    mm('contornoNome', 'Contorno do nome', 'Nome', 3, 0.5, 10, 0.1),
    mm('espNome', 'Espessura do nome', 'Nome', 7, 1, 20, 0.5),
    mm('espTotal', 'Espessura total', 'Luminária', 32, 15, 80, 1),
    mm('fundo', 'Fundo da base', 'Luminária', 4, 1.2, 10, 0.2),
    mm('paredeLed', 'Altura da parede do LED', 'Luminária', 14, 6, 60, 0.5, 'Um pouco mais que a largura da fita'),
    mm('parede', 'Espessura das paredes', 'Luminária', 1.6, 0.8, 4, 0.1),
    mm('tampa', 'Espessura da frente', 'Luminária', 1, 0.4, 3, 0.1, 'Fina para a luz passar'),
    mm('cabo', 'Saída do cabo', 'Luminária', 5, 3, 12, 0.5),
    mm('folga', 'Folga da tampa', 'Luminária', 0.12, 0.05, 0.6, 0.01),
    cor('corLetra', 'Base', '#e91e8c'),
    cor('corTampa', 'Frente (translúcida)', '#ffffff'),
    cor('corNome', 'Nome', '#1f2937'),
  ],
  fontes: (v) => [String(v.fonteLetra), ...(String(v.nome ?? '').trim() ? [String(v.fonteNome)] : [])],
  gerar(v, ctx): Resultado {
    const cores = ['Base', 'Frente', 'Nome'], hex = [txt(v, 'corLetra'), txt(v, 'corTampa'), txt(v, 'corNome')];
    const avisos: string[] = [];
    const L = letraGrandeRegiao(v, ctx);
    if (!regionArea(L)) return { itens: [], cores, hex, avisos: ['Digite a letra.'] };
    const pw = num(v, 'parede'), fz = num(v, 'fundo'), hl = num(v, 'paredeLed'), folga = num(v, 'folga'), et = num(v, 'tampa');
    const H = num(v, 'espTotal'), hTampa = H - fz - hl;
    if (hTampa < 2) avisos.push('A espessura total é pequena para a parede do LED: aumente a espessura.');
    if (!regionArea(contornar(L, -(pw + 4)))) avisos.push('A letra é fina demais por dentro para a fita de LED: engrosse a letra.');
    // Base: fundo cheio e parede por dentro do contorno; a saida do cabo e um recorte na
    // parede, no ponto mais baixo.
    const anel = diffRegion(L, contornar(L, -pw));
    const b = regionBounds(L), dc = num(v, 'cabo');
    let saida: Region = [];
    let areaSaida = 0;
    for (let i = 0; i <= 40; i++) {
      const x = b.minX + dc / 2 + (b.w - dc) * i / 40;
      const candidata = ret(x - dc / 2, b.minY - 1, x + dc / 2, b.minY + pw + 1);
      const areaCortada = regionArea(intersectRegion(anel, candidata));
      if (areaCortada > areaSaida) { saida = candidata; areaSaida = areaCortada; }
    }
    if (areaSaida < 0.5) return { itens: [], cores, hex, avisos: ['Não há parede na base da letra para a saída do cabo: ajuste a letra ou o corte da base.'] };
    const base: Camada[] = [{ region: L, z0: 0, z1: fz }, ...comVazios(anel, fz, fz + hl, [{ regiao: saida, z0: fz, z1: fz + dc }])];
    // Tampa (impressa com a frente na mesa): frente + parede do mesmo contorno da base, que
    // assenta em cima da parede dela; um aro fino entra por dentro da parede da base e
    // alinha as duas. Montada: fundo + parede do LED + tampa = espessura total.
    const hParedeTampa = Math.max(0.6, hTampa - et);
    const dentroAro = contornar(L, -(pw + folga));
    const aroTampa = diffRegion(dentroAro, contornar(dentroAro, -1.2));
    const tampa: Camada[] = [
      { region: L, z0: 0, z1: et },
      { region: anel, z0: et, z1: et + hParedeTampa },
      { region: aroTampa, z0: et + hParedeTampa, z1: et + hParedeTampa + 3 },
    ];
    const itens: Item[] = [{ nome: 'Base', pecas: [{ nome: 'Base', cor: 0, camadas: base }] }, { nome: 'Frente', pecas: [{ nome: 'Frente', cor: 1, camadas: tampa }] }];
    const vv = { ...v, cortarBase: 0 };
    const N = nomeNaLetra(vv, ctx, L);
    if (N.length) {
      const placa = placaDoNome(N, num(v, 'contornoNome'));
      itens.push({ nome: 'Nome', pecas: [{ nome: 'Nome', cor: 2, camadas: [{ region: placa, z0: 0, z1: num(v, 'espNome') }] }] });
    }
    return soCoresUsadas({
      itens: posLado(itens), cores, hex, avisos,
      notas: ['Cole a fita de LED por dentro da parede da base, passe o cabo pela saída, encaixe a frente (de material translúcido) e cole o nome nela.'],
    });
  },
};

/**
 * Luminaria @social: base no contorno do texto (ou retangulo), parede alta com a fita
 * de LED, paredes baixas em volta das letras, frente translucida com as letras em cor e
 * uma faixa de cor na lateral.
 */
export const luminariaSocial: Receita = {
  ...ficha('luminaria-social'),
  parametros: [
    { tipo: 'texto', id: 'usuario', rotulo: 'Usuário', grupo: 'Texto', padrao: '@formma3d', maxCaracteres: 30 },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'cal-sans' },
    mm('largura', 'Largura', 'Texto', 250, 120, 400, 1),
    { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 100, min: 50, max: 200, passo: 1, unidade: '%' },
    mm('engrossarTopo', 'Engrossar as letras da frente', 'Texto', 0.4, 0, 2, 0.1),
    { tipo: 'escolha', id: 'formato', rotulo: 'Formato', grupo: 'Luminária', padrao: 'contornoBase', opcoes: [{ valor: 'contorno', rotulo: 'Contorno' }, { valor: 'contornoBase', rotulo: 'Contorno com base reta' }, { valor: 'retangulo', rotulo: 'Retângulo' }] },
    mm('contorno', 'Contorno em volta das letras', 'Luminária', 7, 4, 15, 0.5),
    mm('profundidade', 'Profundidade', 'Luminária', 25, 10, 60, 1),
    mm('tras', 'Espessura de trás', 'Luminária', 3, 1.2, 6, 0.2),
    mm('frente', 'Espessura da frente', 'Luminária', 1, 0.4, 4, 0.2),
    mm('parede', 'Parede de fora', 'Luminária', 2.4, 1, 6, 0.1),
    mm('paredeInterna', 'Parede em volta das letras', 'Luminária', 4, 1, 8, 0.5, 'Separa a luz de cada letra'),
    mm('altInterna', 'Altura da parede das letras', 'Luminária', 3, 1, 20, 0.5),
    { tipo: 'liga', id: 'faixa', rotulo: 'Faixa na lateral', grupo: 'Luminária', padrao: true },
    mm('larguraFaixa', 'Largura da faixa', 'Luminária', 6, 1, 20, 0.5, undefined, (v) => v.faixa === true),
    { tipo: 'liga', id: 'furoCabo', rotulo: 'Furo do cabo atrás', grupo: 'Cabo', padrao: true },
    mm('dCabo', 'Diâmetro do furo', 'Cabo', 5, 3, 20, 0.5, undefined, (v) => v.furoCabo === true),
    mm('xCabo', 'Posição X do furo', 'Cabo', -90, -200, 200, 1, undefined, (v) => v.furoCabo === true),
    mm('yCabo', 'Posição Y do furo', 'Cabo', 0, -100, 100, 1, undefined, (v) => v.furoCabo === true),
    mm('folga', 'Folga da frente', 'Cabo', 0.1, 0.05, 0.5, 0.01),
    cor('corBase', 'Base', '#4a1f2e'),
    cor('corFrente', 'Frente (translúcida)', '#ffffff'),
    cor('corTexto', 'Letras e faixa', '#f472b6'),
  ],
  fontes: (v) => [String(v.fonte)],
  gerar(v, ctx): Resultado {
    const cores = ['Base', 'Frente', 'Letras e faixa'], hex = [txt(v, 'corBase'), txt(v, 'corFrente'), txt(v, 'corTexto')];
    const avisos: string[] = [];
    const u = txt(v, 'usuario').trim();
    if (!u) return { itens: [], cores, hex, avisos: ['Digite o usuário.'] };
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const ct = num(v, 'contorno'), pw = num(v, 'parede');
    const compor = (k: number) => comporLinhas([{ texto: u, fonte, altura: 10 * k, espacamento: num(v, 'espacamento') / 100 }], 0);
    const t = compor(escalaParaLargura((k) => compor(k).bounds.w + 2 * ct, num(v, 'largura')));
    const tb = t.bounds;
    let S: Region;
    if (txt(v, 'formato') === 'retangulo') S = retanguloArredondado(0, 0, tb.w + 2 * ct, tb.h + 2 * ct, ct);
    else {
      S = semBuracos(contornar(t.regiao, ct));
      if (txt(v, 'formato') === 'contornoBase') S = unir([S, retanguloArredondado(0, tb.minY - ct / 2, tb.w + ct, ct, ct / 3)]);
    }
    if (S.length > 1) avisos.push('O contorno não uniu as letras: aumente o contorno.');
    const D = num(v, 'profundidade'), tr = num(v, 'tras'), fr = num(v, 'frente'), folga = num(v, 'folga');
    const anelFora = diffRegion(S, contornar(S, -pw));
    const internas = diffRegion(intersectRegion(contornar(t.regiao, num(v, 'paredeInterna')), contornar(S, -pw)), contornar(t.regiao, 0.3));
    const furo = circulo(num(v, 'xCabo'), num(v, 'yCabo'), num(v, 'dCabo') / 2, 40);
    if (liga(v, 'furoCabo') && regionArea(diffRegion(furo, S)) > 0.1) return { itens: [], cores, hex, avisos: ['O furo do cabo está fora da base: ajuste a posição X/Y ou a largura.'] };
    const vazios = liga(v, 'furoCabo') ? [{ regiao: furo, z0: 0, z1: tr }] : [];
    const zFrente = D - fr;
    // Parede de fora: com faixa, o trecho do meio sai em outra cor (peca propria).
    const lf = liga(v, 'faixa') ? Math.min(num(v, 'larguraFaixa'), zFrente - tr - 2) : 0;
    const z0f = (tr + zFrente) / 2 - lf / 2, z1f = z0f + lf;
    const base: Camada[] = [...comVazios(S, 0, tr, vazios)];
    if (lf > 0) base.push({ region: anelFora, z0: tr, z1: z0f }, { region: anelFora, z0: z1f, z1: zFrente });
    else base.push({ region: anelFora, z0: tr, z1: zFrente });
    if (regionArea(internas) > 1) base.push({ region: internas, z0: tr, z1: tr + num(v, 'altInterna') });
    const pecas: Peca[] = [{ nome: 'Base', cor: 0, camadas: base }];
    if (lf > 0) pecas.push({ nome: 'Faixa', cor: 2, camadas: [{ region: anelFora, z0: z0f, z1: z1f }] });
    const frente = contornar(S, -(pw + folga));
    const letras = num(v, 'engrossarTopo') > 0 ? contornar(t.regiao, num(v, 'engrossarTopo')) : t.regiao;
    const itens: Item[] = [
      { nome: 'Base', pecas },
      { nome: 'Frente', pecas: [{ nome: 'Frente', cor: 1, camadas: [{ region: diffRegion(frente, letras), z0: 0, z1: fr }] }, { nome: 'Letras', cor: 2, camadas: [{ region: intersectRegion(letras, frente), z0: 0, z1: fr }] }] },
    ];
    return soCoresUsadas({
      itens: posLado(itens), cores, hex, avisos,
      notas: ['Cole a fita de LED por dentro da parede de fora, passe o cabo pelo furo e encaixe a frente translúcida por dentro da borda.'],
    });
  },
};

/**
 * Placa do nome: o contorno das letras, sem miolo. Se ele se separar (palavras ou
 * letras soltas), uma faixa arredondada por tras, na altura do meio, une tudo.
 */
function placaDoNome(N: Region, contorno: number): Region {
  let placa = semBuracos(contornar(N, contorno));
  if (placa.length > 1) {
    const b = regionBounds(placa);
    placa = semBuracos(unir([placa, retanguloArredondado((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, b.w - contorno, Math.max(b.h * 0.35, 2 * contorno), contorno)]));
  }
  return placa;
}
