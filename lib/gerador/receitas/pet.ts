/**
 * Plaquinhas de pet (frente com o nome, verso com o contato, borda, argola ou furo, NFC
 * opcional) e pingente da familia (uma peca por nome, ligadas por furos).
 */
import { diffRegion, intersectRegion, regionArea, regionBounds, scaleRegion, translateRegion, type Region } from '../../geom/region';
import { ajustarLargura, circulo, contornar, coracao, estrela, retanguloArredondado, semBuracos, temEmoji, textoNaCaixa, unir } from '../formas';
import { elipse, espelharX, gato, osso, ovalOndulada, pata, peixe } from '../figuras';
import { comArgola, emGrade, LOTE_MAX, nomesDoLote } from '../lote';
import { ficha } from './fichas';
import type { Item, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';
import { desenho, liga, num, soCoresUsadas, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
/** Tag NFC adesiva redonda de 25 mm: o bolsao tem folga para ela entrar. */
const NFC = { diametro: 25.6, profundidade: 0.8 };

/** Contorno da plaquinha na largura `w`. */
function formaDaPlaquinha(v: Valores, w: number): { regiao: Region; aviso?: string } {
  switch (txt(v, 'forma')) {
    case 'ondulada': return { regiao: ovalOndulada(w, w * 0.66) };
    case 'peixe': return { regiao: peixe(w) };
    case 'osso': return { regiao: osso(w) };
    case 'desenho': {
      const d = desenho(v, 'desenho');
      if (!d) return { regiao: elipse(w, w * 0.66), aviso: 'Escolha a imagem do formato (usando oval).' };
      const b = regionBounds(d.regiao);
      const r = translateRegion(d.regiao, -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2);
      return { regiao: txt(v, 'eixo') === 'altura' ? scaleRegion(r, w / b.h) : ajustarLargura(r, w) };
    }
    default: return { regiao: elipse(w, w * 0.66) };
  }
}

export const plaquinhaPet: Receita = {
  ...ficha('plaquinha-pet'),
  parametros: [
    {
      tipo: 'escolha', id: 'forma', rotulo: 'Formato', grupo: 'Formato', padrao: 'oval',
      opcoes: [{ valor: 'oval', rotulo: 'Oval' }, { valor: 'ondulada', rotulo: 'Ondulada' }, { valor: 'peixe', rotulo: 'Peixe' }, { valor: 'osso', rotulo: 'Osso' }, { valor: 'desenho', rotulo: 'Do meu SVG' }],
    },
    { tipo: 'svg', id: 'desenho', rotulo: 'Formato (imagem)', grupo: 'Formato', padrao: '', visivel: (v) => v.forma === 'desenho' },
    { tipo: 'escolha', id: 'eixo', rotulo: 'O tamanho vale para', grupo: 'Formato', padrao: 'largura', opcoes: [{ valor: 'largura', rotulo: 'Largura' }, { valor: 'altura', rotulo: 'Altura' }], visivel: (v) => v.forma === 'desenho' },
    { tipo: 'numero', id: 'tamanho', rotulo: 'Tamanho', grupo: 'Formato', padrao: 53, min: 20, max: 200, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'espessura', rotulo: 'Espessura', grupo: 'Formato', padrao: 5, min: 1, max: 10, passo: 0.2, unidade: 'mm' },
    {
      tipo: 'texto', id: 'nomes', rotulo: 'Nomes (frente)', grupo: 'Frente', padrao: 'Luna, Thor, Mel', maxCaracteres: 300,
      dica: `Até ${LOTE_MAX} plaquinhas, separadas por vírgula; aceita emoji`,
    },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Frente', padrao: 'luckiest-guy' },
    { tipo: 'numero', id: 'escala', rotulo: 'Tamanho do nome', grupo: 'Frente', padrao: 100, min: 30, max: 140, passo: 1, unidade: '%' },
    { tipo: 'numero', id: 'xNome', rotulo: 'Mover o nome (X)', grupo: 'Frente', padrao: 0, min: -40, max: 40, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'yNome', rotulo: 'Mover o nome (Y)', grupo: 'Frente', padrao: 0, min: -40, max: 40, passo: 0.5, unidade: 'mm' },
    {
      tipo: 'texto', id: 'versos', rotulo: 'Verso (contato)', grupo: 'Verso', padrao: 'Ana+41 9999-1111, Pedro+21 8888-2222', maxCaracteres: 400,
      dica: 'Na mesma ordem dos nomes, separados por vírgula; "+" quebra a linha. Vazio = sem verso',
    },
    { tipo: 'fonte', id: 'fonteVerso', rotulo: 'Fonte do verso', grupo: 'Verso', padrao: 'montserrat-900' },
    { tipo: 'numero', id: 'escalaVerso', rotulo: 'Tamanho do verso', grupo: 'Verso', padrao: 100, min: 30, max: 140, passo: 1, unidade: '%' },
    { tipo: 'numero', id: 'xVerso', rotulo: 'Mover o verso (X)', grupo: 'Verso', padrao: 0, min: -40, max: 40, passo: 0.5, unidade: 'mm', dica: 'Olhando o verso de frente' },
    { tipo: 'numero', id: 'yVerso', rotulo: 'Mover o verso (Y)', grupo: 'Verso', padrao: 0, min: -40, max: 40, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'espVerso', rotulo: 'Espessura do verso', grupo: 'Verso', padrao: 0.4, min: 0.2, max: 1, passo: 0.1, unidade: 'mm', dica: 'O verso fica embutido, rente à face de baixo' },
    { tipo: 'numero', id: 'larguraBorda', rotulo: 'Largura da borda', grupo: 'Borda', padrao: 1, min: 0, max: 5, passo: 0.1, unidade: 'mm', dica: '0 = sem borda' },
    { tipo: 'numero', id: 'altura', rotulo: 'Altura da borda e do nome', grupo: 'Borda', padrao: 0.8, min: 0.2, max: 2, passo: 0.1, unidade: 'mm' },
    { tipo: 'escolha', id: 'suporte', rotulo: 'Para pendurar', grupo: 'Suporte', padrao: 'argola', opcoes: [{ valor: 'argola', rotulo: 'Argola' }, { valor: 'furo', rotulo: 'Furo' }] },
    { tipo: 'numero', id: 'furo', rotulo: 'Diâmetro do furo', grupo: 'Suporte', padrao: 3, min: 2, max: 10, passo: 0.25, unidade: 'mm' },
    { tipo: 'numero', id: 'aro', rotulo: 'Largura do aro', grupo: 'Suporte', padrao: 1.6, min: 1, max: 5, passo: 0.1, unidade: 'mm', visivel: (v) => v.suporte === 'argola' },
    { tipo: 'liga', id: 'nfc', rotulo: 'Bolsão para tag NFC (25 mm)', grupo: 'Suporte', padrao: false, dica: 'Pause a impressão na altura indicada e cole a tag' },
    cor('corPlaca', 'Placa', '#0ea5e9'),
    cor('corDetalhe', 'Nome, borda e verso', '#ffffff'),
  ],
  fontes: (v) => (temEmoji(txt(v, 'nomes') + txt(v, 'versos')) ? ['noto-emoji'] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Placa', 'Detalhes'];
    const hex = [txt(v, 'corPlaca'), txt(v, 'corDetalhe')];
    const fonte = ctx.fonte(txt(v, 'fonte')), fonteVerso = ctx.fonte(txt(v, 'fonteVerso'));
    const reserva = temEmoji(txt(v, 'nomes') + txt(v, 'versos')) ? ctx.fonte('noto-emoji') : undefined;
    const nomes = nomesDoLote(txt(v, 'nomes'));
    const versos = txt(v, 'versos').split(',').map((s) => s.trim());
    const avisos = new Set<string>(), notas = new Set<string>();
    if (nomes.length > LOTE_MAX) avisos.add(`Só as ${LOTE_MAX} primeiras plaquinhas entram.`);
    if (!nomes.length) avisos.add('Digite ao menos um nome.');
    const forma = formaDaPlaquinha(v, num(v, 'tamanho'));
    if (forma.aviso) avisos.add(forma.aviso);
    const E = num(v, 'espessura'), ev = num(v, 'espVerso'), h = num(v, 'altura'), wb = num(v, 'larguraBorda');
    const S = forma.regiao;
    const miolo = contornar(S, -(wb + 1.2));
    const mb = regionBounds(miolo.length ? miolo : S);
    const furoD = num(v, 'furo');
    const topo = regionBounds(S).maxY;
    // Centro do furo: o ponto mais alto, no eixo, em que ele cabe inteiro dentro do formato
    // com borda em volta (no osso, o meio de cima e um vao entre as bolinhas).
    let yFuro = topo - furoD / 2 - wb - 1.2;
    for (; yFuro > regionBounds(S).minY; yFuro -= 0.25) {
      if (regionArea(diffRegion(circulo(0, yFuro, furoD / 2 + wb + 1.2, 40), S)) < 0.01) break;
    }
    // Furo: dentro da placa, perto de cima; o texto fica abaixo dele.
    const comFuro = txt(v, 'suporte') === 'furo';
    const abaixoDoFuro = yFuro - furoD / 2 - 1.5;
    const areaTexto = { w: mb.w * 0.86, h: (comFuro ? Math.min(mb.h, abaixoDoFuro - mb.minY) : mb.h) * 0.62 };
    const cyTexto = comFuro ? (mb.minY + abaixoDoFuro) / 2 : (mb.minY + mb.maxY) / 2;
    const itens: Item[] = [];
    nomes.slice(0, LOTE_MAX).forEach((nome, i) => {
      const placa = comFuro ? diffRegion(S, circulo(0, yFuro, furoD / 2, 40)) : comArgola(S, 'topo', furoD, num(v, 'aro'));
      // O maior nome que cabe na caixa; se o formato for curvo (oval, osso) e a caixa
      // passar da borda, encolhe ate ficar inteiro dentro.
      let k = num(v, 'escala') / 100;
      const nomeEm = (k: number) => translateRegion(textoNaCaixa(nome.split('+'), { fonte, reserva, maxW: areaTexto.w * k, maxH: areaTexto.h * k, entrelinha: 1 }).regiao, num(v, 'xNome'), cyTexto + num(v, 'yNome'));
      let nomeR = nomeEm(k);
      for (let i = 0; i < 15 && nomeR.length && regionArea(diffRegion(nomeR, miolo)) > 0.01; i++) nomeR = nomeEm((k *= 0.93));
      const linhasVerso = (versos[i] ?? '').split('+').map((s) => s.trim()).filter(Boolean);
      // Verso: como o nome, encolhe ate caber dentro do formato (a caixa passa da borda curva).
      const dentroVerso = contornar(S, -1);
      const versoEm = (k: number) => espelharX(translateRegion(textoNaCaixa(linhasVerso, { fonte: fonteVerso, reserva, maxW: mb.w * 0.8 * k, maxH: mb.h * 0.6 * k, entrelinha: 1.5 }).regiao, num(v, 'xVerso'), (mb.minY + mb.maxY) / 2 + num(v, 'yVerso')));
      let kv = num(v, 'escalaVerso') / 100;
      let verso: Region = linhasVerso.length ? versoEm(kv) : [];
      for (let j = 0; j < 15 && verso.length && regionArea(diffRegion(verso, dentroVerso)) > 0.01; j++) verso = versoEm((kv *= 0.93));
      if (verso.length && regionArea(diffRegion(verso, dentroVerso)) > 0.01) avisos.add('O verso não cabe na plaquinha: diminua o texto ou mova o verso.');
      if (nomeR.length && regionArea(diffRegion(nomeR, miolo)) > 0.01) avisos.add(`"${nome}" não cabe dentro da borda: use um nome menor ou uma plaquinha maior.`);
      const base: Peca = { nome: 'Placa', cor: 0, camadas: [] };
      const det: Peca = { nome: 'Detalhes', cor: 1, camadas: [] };
      let z = 0;
      if (verso.length) {
        base.camadas.push({ region: diffRegion(placa, verso), z0: 0, z1: ev });
        det.camadas.push({ region: verso, z0: 0, z1: ev });
        z = ev;
      }
      if (liga(v, 'nfc')) {
        const bolsao = circulo(0, (mb.minY + mb.maxY) / 2, NFC.diametro / 2, 72);
        if (regionArea(diffRegion(bolsao, contornar(S, -1))) > 0.5) avisos.add('A tag NFC de 25 mm não cabe nesta plaquinha: aumente o tamanho.');
        const z1 = Math.max(z + 0.6, E / 2 - NFC.profundidade / 2);
        base.camadas.push({ region: placa, z0: z, z1 });
        base.camadas.push({ region: diffRegion(placa, bolsao), z0: z1, z1: z1 + NFC.profundidade });
        notas.add(`NFC: pause a impressão em ${(z1 + NFC.profundidade).toFixed(1)} mm, cole a tag e continue.`);
        z = z1 + NFC.profundidade;
      }
      base.camadas.push({ region: placa, z0: z, z1: E });
      if (wb > 0) det.camadas.push({ region: diffRegion(S, contornar(S, -wb)), z0: E, z1: E + h });
      if (nomeR.length) det.camadas.push({ region: nomeR, z0: E, z1: E + h });
      itens.push({ nome, pecas: det.camadas.length ? [base, det] : [base] });
    });
    return { itens: itens.length > 1 ? emGrade(itens) : itens, cores, hex, avisos: [...avisos], notas: [...notas] };
  },
};

/** Icone de cada categoria do pingente (desenhos nossos). */
const ICONE: Record<string, (w: number) => Region> = { nomes: coracao, cachorros: pata, gatos: gato, outros: estrela };

export const pingenteFamilia: Receita = {
  ...ficha('pingente-familia'),
  parametros: [
    { tipo: 'texto', id: 'titulo', rotulo: 'Título', grupo: 'Nomes', padrao: 'Família', maxCaracteres: 30, dica: 'Vazio = sem peça de título' },
    { tipo: 'texto', id: 'nomes', rotulo: 'Pessoas', grupo: 'Nomes', padrao: 'Aline, Alex, Elisa', maxCaracteres: 200, dica: 'Separadas por vírgula (ícone de coração)' },
    { tipo: 'texto', id: 'cachorros', rotulo: 'Cachorros', grupo: 'Nomes', padrao: 'Geleia', maxCaracteres: 200, dica: 'Ícone de pata' },
    { tipo: 'texto', id: 'gatos', rotulo: 'Gatos', grupo: 'Nomes', padrao: 'Marrie', maxCaracteres: 200, dica: 'Ícone de gato' },
    { tipo: 'texto', id: 'outros', rotulo: 'Outros', grupo: 'Nomes', padrao: '', maxCaracteres: 200, dica: 'Ícone de estrela' },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Peças', padrao: 'pacifico' },
    {
      tipo: 'escolha', id: 'formaPeca', rotulo: 'Formato das peças', grupo: 'Peças', padrao: 'pilula',
      opcoes: [{ valor: 'pilula', rotulo: 'Pílula' }, { valor: 'retangulo', rotulo: 'Retângulo' }, { valor: 'oval', rotulo: 'Oval' }, { valor: 'desenho', rotulo: 'Do meu desenho' }],
    },
    { tipo: 'svg', id: 'desenhoPeca', rotulo: 'Formato (imagem)', grupo: 'Peças', padrao: '', visivel: (v) => v.formaPeca === 'desenho', dica: 'A silhueta vira a peça; os furos vão nas pontas' },
    { tipo: 'numero', id: 'largura', rotulo: 'Largura de cada peça', grupo: 'Peças', padrao: 60, min: 40, max: 100, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'proporcao', rotulo: 'Altura da peça', grupo: 'Peças', padrao: 34, min: 20, max: 80, passo: 1, unidade: '%', dica: 'Em % da largura (não vale para desenho)' },
    { tipo: 'numero', id: 'espessura', rotulo: 'Espessura', grupo: 'Peças', padrao: 3, min: 1, max: 10, passo: 0.2, unidade: 'mm' },
    { tipo: 'numero', id: 'espTexto', rotulo: 'Altura do nome', grupo: 'Peças', padrao: 0.6, min: 0.2, max: 2, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'furo', rotulo: 'Furo para o cordão', grupo: 'Peças', padrao: 4, min: 1.5, max: 10, passo: 0.25, unidade: 'mm' },
    { tipo: 'numero', id: 'borda', rotulo: 'Borda em relevo', grupo: 'Peças', padrao: 0, min: 0, max: 4, passo: 0.1, unidade: 'mm', dica: '0 = sem borda; com borda, a peça tem 3 cores' },
    cor('corPeca', 'Peça', '#fef3c7'),
    cor('corTexto', 'Nome e ícone', '#9f1239'),
    cor('corBorda', 'Borda', '#d4a017'),
  ],
  gerar(v, ctx): Resultado {
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const W = num(v, 'largura'), E = num(v, 'espessura'), et = num(v, 'espTexto'), d = num(v, 'furo'), wb = num(v, 'borda');
    // Formato da peca, centrado.
    let forma: Region, H: number;
    const fp = txt(v, 'formaPeca');
    const avisos: string[] = [];
    const prop = desenho(v, 'desenhoPeca');
    if (fp === 'desenho' && prop) {
      forma = semBuracos(ajustarLargura(prop.regiao, W));
      H = regionBounds(forma).h;
    } else {
      if (fp === 'desenho') avisos.push('Escolha a imagem do formato (usando pílula).');
      H = (W * num(v, 'proporcao')) / 100;
      forma = fp === 'retangulo' ? retanguloArredondado(0, 0, W, H, Math.min(3, H / 4)) : fp === 'oval' ? elipse(W, H) : retanguloArredondado(0, 0, W, H, H / 2);
    }
    const fb = regionBounds(forma);
    // Furos: na linha do meio, o mais perto possivel de cada ponta com 1,6 mm de parede.
    const furos: Region[] = [];
    for (const sx of [-1, 1]) {
      let x = sx < 0 ? fb.minX + d / 2 + 1.6 : fb.maxX - d / 2 - 1.6;
      const cy = (fb.minY + fb.maxY) / 2;
      for (let k = 0; k < 200 && regionArea(diffRegion(circulo(x, cy, d / 2 + 1.6, 40), forma)) > 0.01; k++) x -= sx * 0.25;
      furos.push(circulo(x, cy, d / 2, 40));
    }
    const pedidos: { nome: string; icone?: string }[] = [];
    if (txt(v, 'titulo').trim()) pedidos.push({ nome: txt(v, 'titulo').trim() });
    for (const cat of ['nomes', 'cachorros', 'gatos', 'outros']) for (const n of nomesDoLote(txt(v, cat))) pedidos.push({ nome: n, icone: cat });
    if (!pedidos.length) avisos.push('Digite ao menos um nome.');
    const xf = furos.map((f) => regionBounds(f));
    const esq = xf[0]!.maxX + 1.5, dir = xf[1]!.minX - 1.5;
    const dentro = contornar(forma, -(wb > 0 ? wb + 0.6 : 0.8));
    const itens: Item[] = pedidos.map(({ nome, icone }) => {
      const placa = diffRegion(forma, unir(furos));
      const hIcone = Math.min(H * 0.55, (dir - esq) * 0.3);
      const util = dir - esq - (icone ? hIcone * 1.35 : 0);
      const t = textoNaCaixa([nome], { fonte, maxW: Math.max(5, util), maxH: H * 0.62 });
      let texto = translateRegion(t.regiao, (esq + dir) / 2, (fb.minY + fb.maxY) / 2);
      let desenhoIcone: Region = [];
      if (icone) {
        desenhoIcone = translateRegion(ICONE[icone]!(hIcone), esq + hIcone * 0.55, (fb.minY + fb.maxY) / 2);
        texto = translateRegion(texto, hIcone * 0.675, 0);
      }
      const det = intersectRegion(unir([texto, desenhoIcone]), dentro);
      if (regionArea(unir([texto, desenhoIcone])) - regionArea(det) > 0.3) avisos.push(`"${nome}" passa da borda da peça: aumente a peça ou use um nome menor.`);
      const pecas: Peca[] = [{ nome: 'Peça', cor: 0, camadas: [{ region: placa, z0: 0, z1: E }] }, { nome: 'Nome', cor: 1, camadas: [{ region: det, z0: E, z1: E + et }] }];
      if (wb > 0) pecas.push({ nome: 'Borda', cor: 2, camadas: [{ region: diffRegion(forma, contornar(forma, -wb)), z0: E, z1: E + et }] });
      return { nome, pecas };
    });
    return soCoresUsadas({ itens: itens.length > 1 ? emGrade(itens) : itens, cores: ['Peça', 'Nome', 'Borda'], hex: [txt(v, 'corPeca'), txt(v, 'corTexto'), txt(v, 'corBorda')], avisos: [...new Set(avisos)] });
  },
};
