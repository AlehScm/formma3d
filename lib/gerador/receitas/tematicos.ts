/**
 * Chaveiros tematicos (cenoura e coelho, desenhos nossos), rosa com nome (uma cor) e
 * string art impresso: moldura, texto ou desenho "flutuando" no meio e fios finos
 * impressos que ligam um ao outro.
 */
import { diffRegion, intersectRegion, regionArea, regionBounds, rotateRegion, strokeToRegion, translateRegion, type Pt, type Region } from '../../geom/region';
import { circulo, contornar, coracao, retanguloArredondado, semBuracos, temEmoji, textoNaCaixa, unir } from '../formas';
import { elipse } from '../figuras';
import { emGrade, LOTE_MAX, nomesDoLote } from '../lote';
import { rosa } from './arco';
import { AVISO_EXEMPLO, campoDesenho, desenhoNoTamanho } from './desenho';
import { baseDeitada } from './expositores';
import { ficha } from './fichas';
import type { Item, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';
import { liga, num, soCoresUsadas, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });
const poligono = (pts: Pt[]): Region => [{ outer: pts, holes: [] }];

/** Cenoura (corpo afinando para baixo, com riscos) e folhas, altura total H, centrada. */
function cenoura(H: number): { corpo: Region; folhas: Region } {
  const hc = H * 0.72, w = H * 0.34, topo = H / 2 - H * 0.28;
  const pts: Pt[] = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push({ x: (w / 2) * (1 - Math.pow(t, 1.7)) + w * 0.03, y: topo - t * hc }); }
  for (let i = 40; i >= 0; i--) { const t = i / 40; pts.push({ x: -(w / 2) * (1 - Math.pow(t, 1.7)) - w * 0.03, y: topo - t * hc }); }
  let corpo = contornar(contornar(poligono(pts), w * 0.08), -w * 0.08);
  // Riscos da casca, alternando os lados.
  const riscos = [0.25, 0.42, 0.6, 0.76].map((t, i) => {
    const y = topo - t * hc, meia = (w / 2) * (1 - Math.pow(t, 1.7));
    const lado = i % 2 ? 1 : -1;
    return strokeToRegion([{ pts: [{ x: lado * (meia + 1), y }, { x: lado * meia * 0.35, y: y - w * 0.04 }], closed: false }], Math.max(0.8, w * 0.045), true);
  });
  corpo = diffRegion(corpo, unir(riscos));
  const folha = (giro: number, comp: number) => rotateRegion(translateRegion(elipse(comp * 0.32, comp), 0, comp / 2), giro, 0, 0);
  const folhas = translateRegion(unir([folha(28, H * 0.26), folha(0, H * 0.3), folha(-28, H * 0.26)]), 0, topo - w * 0.05);
  return { corpo, folhas: diffRegion(folhas, contornar(corpo, 0.4)) };
}

/** Coelho: cabeca redonda e duas orelhas compridas, com o miolo das orelhas. */
function coelho(H: number): { corpo: Region; detalhe: Region } {
  const r = H * 0.27, cy = -H / 2 + r;
  const orelha = (lado: number) => rotateRegion(translateRegion(elipse(H * 0.17, H * 0.5), lado * r * 0.45, cy + r + H * 0.18), lado * -12, lado * r * 0.45, cy + r * 0.6);
  const miolo = (lado: number) => rotateRegion(translateRegion(elipse(H * 0.08, H * 0.34), lado * r * 0.45, cy + r + H * 0.2), lado * -12, lado * r * 0.45, cy + r * 0.6);
  const corpo = unir([circulo(0, cy, r, 96), orelha(-1), orelha(1)]);
  return { corpo, detalhe: unir([miolo(-1), miolo(1)]) };
}

/** Chaveiro tematico em camadas: base que contorna tudo, figura, contorno do nome e nome. */
function tematico(id: 'chaveiro-cenoura' | 'chaveiro-coelho'): Receita {
  const ehCenoura = id === 'chaveiro-cenoura';
  return {
    ...ficha(id),
    parametros: [
      { tipo: 'texto', id: 'nomes', rotulo: 'Nomes', grupo: 'Texto', padrao: ehCenoura ? 'Enzo, Ana Clara, Miguel' : 'Clara, Leo, Bento', maxCaracteres: 300, dica: `Até ${LOTE_MAX}, separados por vírgula` },
      { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'pacifico' },
      { tipo: 'numero', id: 'escalaNome', rotulo: 'Tamanho do nome', grupo: 'Texto', padrao: 110, min: 50, max: 150, passo: 1, unidade: '%', dica: 'Um pouco maior que a figura: passa da borda' },
      mm('altura', 'Altura do chaveiro', 'Chaveiro', ehCenoura ? 70 : 75, 30, 200, 1),
      mm('furo', 'Furo da argola', 'Chaveiro', 3, 0, 10, 0.1, '0 = sem furo'),
      { tipo: 'numero', id: 'xFuro', rotulo: 'Posição X do furo', grupo: 'Chaveiro', padrao: ehCenoura ? -55 : 18, min: -100, max: 100, passo: 1, unidade: '%' },
      { tipo: 'numero', id: 'yFuro', rotulo: 'Posição Y do furo', grupo: 'Chaveiro', padrao: ehCenoura ? 40 : 45, min: -100, max: 100, passo: 1, unidade: '%' },
      mm('espBase', 'Espessura da base', 'Espessuras', ehCenoura ? 2 : 1, 0.4, 4),
      mm('espMeio', 'Espessura da figura', 'Espessuras', ehCenoura ? 1 : 0.8, 0.2, 3),
      mm('espTopo', 'Espessura do nome', 'Espessuras', 0.8, 0.2, 2),
      mm('offsetBase', 'Borda da base', 'Espessuras', ehCenoura ? 1.6 : 1, 0.4, 4),
      cor('corBase', 'Base', '#ffffff'),
      cor('corFigura', ehCenoura ? 'Cenoura' : 'Coelho', ehCenoura ? '#f97316' : '#cda1fc'),
      cor('corDetalhe', ehCenoura ? 'Folhas' : 'Contorno do nome', ehCenoura ? '#16a34a' : '#6d3db4'),
      cor('corNome', 'Nome', '#ffffff'),
    ],
    fontes: (v) => (temEmoji(String(v.nomes ?? '')) ? ['noto-emoji'] : []),
    gerar(v, ctx): Resultado {
      const cores = ['Base', ehCenoura ? 'Cenoura' : 'Coelho', ehCenoura ? 'Folhas' : 'Contorno do nome', 'Nome'];
      const hex = [txt(v, 'corBase'), txt(v, 'corFigura'), txt(v, 'corDetalhe'), txt(v, 'corNome')];
      const H = num(v, 'altura'), eb = num(v, 'espBase'), em = num(v, 'espMeio'), et = num(v, 'espTopo');
      const lista = nomesDoLote(txt(v, 'nomes'));
      const avisos: string[] = lista.length > LOTE_MAX ? [`Só os ${LOTE_MAX} primeiros nomes entram.`] : [];
      if (!lista.length) return { itens: [], cores, hex, avisos: ['Digite ao menos um nome.'] };
      const fig = ehCenoura ? cenoura(H) : coelho(H);
      const corpo = fig.corpo, extra = ehCenoura ? (fig as { folhas: Region }).folhas : (fig as { detalhe: Region }).detalhe;
      const cb = regionBounds(corpo);
      const fonte = ctx.fonte(txt(v, 'fonte'));
      const itens: Item[] = lista.slice(0, LOTE_MAX).map((nome) => {
        // Nome atravessado na figura, um pouco mais largo que ela.
        const yNome = ehCenoura ? cb.minY + cb.h * 0.55 : cb.minY + cb.h * 0.22;
        const largura = (ehCenoura ? cb.w * 1.15 : cb.w * 0.9) * (num(v, 'escalaNome') / 100);
        const t = translateRegion(textoNaCaixa([nome], { fonte, reserva: temEmoji(nome) ? ctx.fonte('noto-emoji') : undefined, maxW: largura, maxH: H * 0.22 }).regiao, 0, yNome);
        const contornoNome = semBuracos(contornar(t, 1));
        let base = semBuracos(contornar(unir([corpo, extra, contornoNome]), num(v, 'offsetBase')));
        const df = num(v, 'furo');
        if (df > 0) {
          const bb = regionBounds(base);
          const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
          let fx = cx + (num(v, 'xFuro') / 100) * (bb.w / 2), fy = cy + (num(v, 'yFuro') / 100) * (bb.h / 2);
          // Se cair em cima da figura, o furo anda para fora na mesma direcao ate ficar livre.
          const dx = fx - cx, dy = fy - cy, L = Math.hypot(dx, dy) || 1;
          const figura = unir([corpo, extra]);
          for (let k = 0; k < 200 && regionArea(intersectRegion(circulo(fx, fy, df / 2 + 0.8, 32), figura)) > 0.01; k++) { fx += (dx / L) * 0.5; fy += (dy / L) * 0.5; }
          const furo = circulo(fx, fy, df / 2, 40);
          // Se o furo cair fora (ou na borda), uma aba redonda em volta dele.
          if (regionArea(diffRegion(contornar(furo, 1.6), base)) > 0.01) base = unir([base, circulo(fx, fy, df / 2 + 1.8, 48)]);
          base = diffRegion(base, furo);
          if (regionArea(intersectRegion(contornar(furo, 0.6), unir([corpo, extra]))) > 0.01) avisos.push('O furo pega na figura: mova o furo.');
        }
        const z1 = eb + em;
        const pecas: Peca[] = [
          { nome: 'Base', cor: 0, camadas: [{ region: base, z0: 0, z1: eb }] },
          // Coelho: o miolo das orelhas e o contorno do nome saem na cor de detalhe.
          { nome: cores[1]!, cor: 1, camadas: [{ region: diffRegion(corpo, ehCenoura ? contornoNome : unir([contornoNome, extra])), z0: eb, z1 }] },
          { nome: cores[2]!, cor: 2, camadas: [{ region: ehCenoura ? diffRegion(extra, contornoNome) : unir([contornoNome, intersectRegion(extra, corpo)]), z0: eb, z1 }] },
          { nome: 'Nome', cor: 3, camadas: [{ region: t, z0: z1, z1: z1 + et }] },
        ];
        if (ehCenoura) pecas.push({ nome: 'Fundo do nome', cor: 0, camadas: [{ region: contornoNome, z0: eb, z1 }] });
        return { nome, pecas: pecas.filter((p) => p.camadas.every((c) => regionArea(c.region) > 0.01)) };
      });
      return soCoresUsadas({ itens: itens.length > 1 ? emGrade(itens) : itens, cores, hex, avisos: [...new Set(avisos)] });
    },
  };
}

export const chaveiroCenoura = tematico('chaveiro-cenoura');
export const chaveiroCoelho = tematico('chaveiro-coelho');

/**
 * Rosa com nome (uma cor): a rosa no alto e o nome fazendo o cabo, de baixo para cima,
 * numa faixa com folhas; o nome fica em relevo sobre a faixa.
 */
export const rosaNome: Receita = {
  ...ficha('rosa-nome'),
  parametros: [
    { tipo: 'texto', id: 'nomes', rotulo: 'Nomes', grupo: 'Texto', padrao: 'Aline, Mãe, Elisa', maxCaracteres: 300, dica: `Até ${LOTE_MAX}, separados por vírgula` },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'great-vibes' },
    mm('altura', 'Altura da rosa', 'Rosa', 90, 40, 250, 1),
    mm('espessura', 'Espessura', 'Rosa', 2, 1, 10),
    mm('relevo', 'Relevo do nome e da flor', 'Rosa', 0.8, 0.2, 3),
    cor('cor', 'Rosa', '#6b2c42'),
  ],
  gerar(v, ctx): Resultado {
    const cores = ['Rosa'], hex = [txt(v, 'cor')];
    const H = num(v, 'altura'), E = num(v, 'espessura');
    const lista = nomesDoLote(txt(v, 'nomes'));
    if (!lista.length) return { itens: [], cores, hex, avisos: ['Digite ao menos um nome.'] };
    const Rr = H * 0.2;
    const flor = rosa(Rr);
    const cabo = H - 2 * Rr;
    const itens: Item[] = lista.slice(0, LOTE_MAX).map((nome) => {
      // Nome girado (le-se de baixo para cima) na largura do cabo.
      const t = rotateRegion(textoNaCaixa([nome], { fonte: ctx.fonte(txt(v, 'fonte')), maxW: cabo * 0.92, maxH: Rr * 0.7 }).regiao, 90);
      const tb = regionBounds(t);
      const nomeR = translateRegion(t, -(tb.minX + tb.maxX) / 2, -Rr * 0.9 - tb.maxY);
      const faixa = semBuracos(contornar(nomeR, 1.6));
      const fb = regionBounds(faixa);
      // Folhas presas a faixa: saem do lado dela, inclinadas 40 graus para cima, com a
      // ponta de dentro 1,5 mm enterrada na faixa.
      const folha = (lado: number) => {
        const comp = Rr * 1.1, graus = lado > 0 ? 40 : 140, a = (graus * Math.PI) / 180;
        const px = lado * (fb.w / 2), py = fb.minY + fb.h * 0.35;
        const cx = px + Math.cos(a) * (comp / 2 - 1.5), cy = py + Math.sin(a) * (comp / 2 - 1.5);
        return translateRegion(rotateRegion(elipse(comp, Rr * 0.5), graus), cx, cy);
      };
      const silhueta = unir([semBuracos(flor), faixa, folha(-1), folha(1)]);
      const espiral = diffRegion(semBuracos(flor), flor);
      return {
        nome,
        pecas: [{ nome: 'Rosa', cor: 0, camadas: [{ region: diffRegion(silhueta, espiral), z0: 0, z1: E }, { region: unir([nomeR, diffRegion(contornar(semBuracos(flor), -Rr * 0.12), espiral)]), z0: E, z1: E + num(v, 'relevo') }] }],
      };
    });
    return { itens: itens.length > 1 ? emGrade(itens) : itens, cores, hex, avisos: lista.length > LOTE_MAX ? [`Só os ${LOTE_MAX} primeiros nomes entram.`] : [] };
  },
};

/** Fios: faixas finas (largura `e`) verticais a cada `passo`, dentro de `area`, sem `fora`. */
function fiosVerticais(area: Region, fora: Region, passo: number, e: number): Region {
  const b = regionBounds(area);
  const linhas = [];
  for (let x = b.minX + passo / 2; x < b.maxX; x += passo) linhas.push({ pts: [{ x, y: b.minY - 1 }, { x, y: b.maxY + 1 }], closed: false });
  return diffRegion(intersectRegion(strokeToRegion(linhas, e, false), area), fora);
}

/** Fios radiais: `n` raios do centro (cx, cy) ate a borda de `area`, sem `fora`. */
function fiosRadiais(area: Region, fora: Region, n: number, e: number, cx: number, cy: number): Region {
  const b = regionBounds(area), L = Math.hypot(b.w, b.h);
  const linhas = Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return { pts: [{ x: cx, y: cy }, { x: cx + L * Math.cos(a), y: cy + L * Math.sin(a) }], closed: false };
  });
  return diffRegion(intersectRegion(strokeToRegion(linhas, e, false), area), fora);
}

/**
 * String art impresso. Coracao: nome em 2 linhas flutuando num coracao, fios verticais.
 * Retangulo: o seu desenho no meio, fios radiais. @social: o @ num retangulo, fios
 * verticais. Os fios tocam a moldura e o texto e saem na outra cor.
 */
export const stringArt: Receita = {
  ...ficha('string-art'),
  parametros: [
    { tipo: 'escolha', id: 'modelo', rotulo: 'Modelo', grupo: 'Modelo', padrao: 'coracao', opcoes: [{ valor: 'coracao', rotulo: 'Coração com nome' }, { valor: 'retangulo', rotulo: 'Retângulo com desenho (fios radiais)' }, { valor: 'social', rotulo: '@ num retângulo' }] },
    { tipo: 'texto', id: 'linha1', rotulo: 'Texto', grupo: 'Texto', padrao: 'Maria', maxCaracteres: 40, visivel: (v) => v.modelo !== 'retangulo' },
    { tipo: 'texto', id: 'linha2', rotulo: 'Segunda linha', grupo: 'Texto', padrao: 'Júlia', maxCaracteres: 40, visivel: (v) => v.modelo === 'coracao' },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'dancing-script-700', visivel: (v) => v.modelo !== 'retangulo' },
    mm('larguraTexto', 'Largura do texto', 'Texto', 85, 20, 250, 1, undefined, (v) => v.modelo !== 'retangulo'),
    mm('engrossar', 'Engrossar o texto', 'Texto', 0.4, 0, 2, 0.1, 'Letra fina fica mais forte', (v) => v.modelo !== 'retangulo'),
    { ...campoDesenho(), visivel: (v: Valores) => v.modelo === 'retangulo' },
    mm('tamDesenho', 'Tamanho do desenho', 'Texto', 70, 20, 250, 1, undefined, (v) => v.modelo === 'retangulo'),
    mm('largura', 'Largura da moldura', 'Moldura', 140, 40, 300, 1, 'No coração, a largura dele'),
    mm('altura', 'Altura da moldura', 'Moldura', 110, 30, 300, 1, undefined, (v) => v.modelo === 'retangulo'),
    mm('margem', 'Margem em cima e embaixo', 'Moldura', 6, 1, 40, 1, undefined, (v) => v.modelo === 'social'),
    mm('borda', 'Largura da borda', 'Moldura', 4, 2, 15, 0.5),
    mm('cantos', 'Cantos arredondados', 'Moldura', 4, 0, 30, 0.5, undefined, (v) => v.modelo !== 'coracao'),
    mm('profundidade', 'Espessura da moldura', 'Moldura', 10, 3, 40, 0.5),
    mm('espTexto', 'Espessura do texto', 'Moldura', 4, 1, 30, 0.5),
    mm('passoFios', 'Distância entre fios', 'Fios', 5, 2, 15, 0.5, undefined, (v) => v.modelo !== 'retangulo'),
    { tipo: 'numero', id: 'nFios', rotulo: 'Número de fios', grupo: 'Fios', padrao: 60, min: 12, max: 160, passo: 1, visivel: (v) => v.modelo === 'retangulo' },
    mm('larguraFio', 'Largura do fio', 'Fios', 0.8, 0.4, 2, 0.1),
    mm('espFio', 'Espessura do fio', 'Fios', 0.6, 0.2, 2, 0.1),
    { tipo: 'liga', id: 'base', rotulo: 'Base para ficar em pé', grupo: 'Extras', padrao: true, dica: 'Peça separada com fenda; a moldura encaixa e sai' },
    mm('encaixeBase', 'Quanto a moldura entra na base', 'Extras', 8, 4, 20, 0.5, undefined, (v) => v.base === true),
    { tipo: 'liga', id: 'capa', rotulo: 'Capa de envio', grupo: 'Extras', padrao: false, dica: 'Tampa que protege os fios no transporte' },
    cor('corBorda', 'Moldura e texto', '#a85f78'),
    cor('corFio', 'Fios', '#ffffff'),
  ],
  fontes: (v) => (v.modelo !== 'retangulo' ? [String(v.fonte), ...(temEmoji(String(v.linha1 ?? '') + String(v.linha2 ?? '')) ? ['noto-emoji'] : [])] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Moldura e texto', 'Fios'], hex = [txt(v, 'corBorda'), txt(v, 'corFio')];
    const avisos: string[] = [];
    const modelo = txt(v, 'modelo'), bw = num(v, 'borda'), e = num(v, 'larguraFio');
    let centro: Region, fora: Region = [];
    if (modelo === 'retangulo') {
      const d = desenhoNoTamanho(v, 'desenho', num(v, 'tamDesenho'));
      if (d.exemplo) avisos.push(AVISO_EXEMPLO);
      centro = d.regiao;
      fora = retanguloArredondado(0, 0, num(v, 'largura'), num(v, 'altura'), num(v, 'cantos'));
    } else {
      const linhas = [txt(v, 'linha1'), modelo === 'coracao' ? txt(v, 'linha2') : ''].filter((s) => s.trim());
      if (!linhas.length) return { itens: [], cores, hex, avisos: ['Digite o texto.'] };
      const reserva = temEmoji(linhas.join('')) ? ctx.fonte('noto-emoji') : undefined;
      const t = textoNaCaixa(linhas, { fonte: ctx.fonte(txt(v, 'fonte')), reserva, maxW: num(v, 'larguraTexto'), maxH: 1000, entrelinha: 1 });
      centro = num(v, 'engrossar') > 0 ? contornar(t.regiao, num(v, 'engrossar')) : t.regiao;
      if (modelo === 'coracao') {
        // O coracao cresce ate o texto caber com 2 mm de folga (o meio visual dele fica um
        // pouco acima do centro da caixa).
        let W = Math.max(num(v, 'largura'), regionBounds(centro).w * 1.3 + 2 * bw);
        let posto = centro;
        for (let k = 0; k < 20; k++, W *= 1.05) {
          fora = coracao(W);
          const fb = regionBounds(fora);
          posto = translateRegion(centro, 0, (fb.minY + fb.maxY) / 2 + fb.h * 0.04);
          if (regionArea(diffRegion(posto, contornar(fora, -(bw + 2)))) < 0.01) break;
        }
        centro = posto;
      } else {
        const cb = regionBounds(centro), W = Math.max(num(v, 'largura'), cb.w + 2 * bw + 12);
        fora = retanguloArredondado(0, 0, W, cb.h + 2 * num(v, 'margem') + 2 * bw, num(v, 'cantos'));
      }
    }
    const dentro = contornar(fora, -bw);
    const moldura = diffRegion(fora, dentro);
    if (regionArea(diffRegion(centro, contornar(dentro, -1))) > 0.5) avisos.push('O texto encosta na moldura: aumente a moldura ou diminua o texto.');
    const cb = regionBounds(centro);
    const fios = modelo === 'retangulo'
      ? fiosRadiais(dentro, contornar(centro, -0.3), num(v, 'nFios'), e, (cb.minX + cb.maxX) / 2, (cb.minY + cb.maxY) / 2)
      : fiosVerticais(dentro, contornar(centro, -0.3), num(v, 'passoFios'), e);
    // Os fios atravessam tambem os vazios do desenho (miolo do O, o vao entre anel e
    // estrela): toda ilha fica presa a moldura por algum fio.
    const ef = num(v, 'espFio');
    const pecas: Peca[] = [
      { nome: 'Moldura', cor: 0, camadas: [{ region: moldura, z0: 0, z1: num(v, 'profundidade') }] },
      { nome: 'Centro', cor: 0, camadas: [{ region: centro, z0: 0, z1: num(v, 'espTexto') }] },
      { nome: 'Fios', cor: 1, camadas: [{ region: diffRegion(fios, unir([moldura, centro])), z0: 0, z1: ef }] },
    ];
    const itens: Item[] = [{ nome: modelo === 'retangulo' ? 'String art' : txt(v, 'linha1'), pecas }];
    const notas = ['Imprima deitado; os fios são finos de propósito (aspecto de linha).'];
    const prof = num(v, 'profundidade'), fb = regionBounds(fora);
    if (liga(v, 'base')) {
      // Base destacavel: a ponta de baixo da moldura (no coracao, a ponta dele) entra na
      // fenda; a largura da fenda e a da moldura nessa altura.
      const enc = num(v, 'encaixeBase');
      const ponta = intersectRegion(fora, retanguloArredondado((fb.minX + fb.maxX) / 2, fb.minY + enc / 2, fb.w + 2, enc, 0));
      const pb = regionBounds(ponta);
      const W = Math.max(pb.w + 30, fb.w * 0.6), Hb = enc + 6, Lb = Math.max(prof + 16, 30);
      const frente = retanguloArredondado(0, Hb / 2, W, Hb, 3);
      const base = baseDeitada(frente, Hb, Lb, 0, [{ cx: (pb.minX + pb.maxX) / 2 - (fb.minX + fb.maxX) / 2, largura: pb.w, espessura: prof, profundidade: enc }], 0.2, 0.2);
      itens.push({ nome: 'Base', pecas: [{ nome: 'Base', cor: 0, camadas: base.camadas }] });
      avisos.push(...base.avisos);
      notas.push('A base imprime deitada; encaixe a ponta de baixo da moldura na fenda dela.');
    }
    if (liga(v, 'capa')) {
      // Capa de envio: placa no contorno de fora, com um aro que entra por dentro da
      // moldura e protege os fios no transporte.
      const folga = 0.3, dentroCapa = contornar(dentro, -folga);
      itens.push({ nome: 'Capa de envio', pecas: [{ nome: 'Capa', cor: 1, camadas: [{ region: fora, z0: 0, z1: 1.2 }, { region: diffRegion(dentroCapa, contornar(dentroCapa, -1.2)), z0: 1.2, z1: 3.2 }] }] });
      if (num(v, 'espTexto') > prof - 2) avisos.push('O texto é mais alto que a moldura: a capa encostaria nele.');
    }
    return { itens: itens.length > 1 ? emGrade(itens, 2, 10) : itens, cores, hex, avisos, notas };
  },
};

