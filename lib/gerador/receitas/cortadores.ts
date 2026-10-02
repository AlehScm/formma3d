/**
 * Cortadores: cortador de biscoito com carimbo, ejetor de brigadeiro (cortador + carimbo
 * que empurra o doce para fora) e cortadores de retangulos em grade.
 *
 * Cortador: aba na mesa (z = 0), parede ate a profundidade e, com lamina fina, o topo da
 * parede afinando por fora em degraus (o fio de corte fica em cima). Carimbo: placa que
 * entra no cortador com folga, desenho em relevo em cima (espelhado: ele marca a massa
 * de cabeca para baixo) e furo cego atras para colar o pegador.
 */
import { diffRegion, intersectRegion, regionArea, regionBounds, rotateRegion, scaleRegion, translateRegion, type Region } from '../../geom/region';
import { circulo, contornar, estrela, retanguloArredondado, semBuracos, textoNaCaixa, unir } from '../formas';
import { espelharX, regular } from '../figuras';
import { emGrade } from '../lote';
import { comVazios, type Vazio } from '../solidos';
import { AVISO_EXEMPLO, campoDesenho, campoEixo, desenhoNoTamanho, nomeDoDesenho } from './desenho';
import { ficha } from './fichas';
import type { Camada, Contexto, Item, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';
import { liga, num, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });

/** Anel de largura `e` por fora de `r`. */
const anel = (r: Region, e: number) => diffRegion(contornar(r, e), r);

/** Arredonda cantos convexos e concavos com raio `r` (fecha e abre). */
export function arredondar(r: Region, raio: number): Region {
  if (!(raio > 0)) return r;
  const fechado = contornar(contornar(r, raio), -raio);
  return contornar(contornar(fechado, -raio), raio);
}

export function formaPadrao(forma: string, w: number): Region {
  switch (forma) {
    case 'circulo': return circulo(0, 0, w / 2, 128);
    case 'quadrado': return retanguloArredondado(0, 0, w, w, 0);
    case 'hexagono': return regular(6, w);
    case 'dodecagono': return regular(12, w);
    case 'estrela': return estrela(w);
    default: return [];
  }
}

interface Padroes {
  tamanho: number;
  tamanhoMin: number;
  tamanhoMax: number;
  eixo: 'largura' | 'altura';
  deslocamento: number;
  arredondar: number;
  lamina: boolean;
  profundidade: number;
  profundidadeMin: number;
  profundidadeMax: number;
  espessura: number;
  aba: number;
  espAba: number;
  folga: number;
  relevo: number;
  espPlaca: number;
  pegador: boolean;
  alturaPegador: number;
  formas: boolean;
}

function parametrosCortador(p: Padroes): Parametro[] {
  const n = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo: number, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
    ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });
  const comCarimbo = (v: Valores) => v.carimbo === true;
  return [
    campoDesenho(),
    ...(p.formas ? [{
      tipo: 'escolha', id: 'forma', rotulo: 'Formato do cortador', grupo: 'Desenho', padrao: 'nenhuma',
      dica: 'Nenhum = o cortador acompanha o contorno do desenho',
      opcoes: [{ valor: 'nenhuma', rotulo: 'Contorno do desenho' }, { valor: 'circulo', rotulo: 'Círculo' }, { valor: 'quadrado', rotulo: 'Quadrado' },
        { valor: 'hexagono', rotulo: 'Hexágono' }, { valor: 'dodecagono', rotulo: '12 lados' }, { valor: 'estrela', rotulo: 'Estrela' }],
    } satisfies Parametro] : []),
    n('tamanho', 'Tamanho do desenho', 'Desenho', p.tamanho, p.tamanhoMin, p.tamanhoMax, 1),
    { ...campoEixo, padrao: p.eixo } as Parametro,
    n('deslocamento', 'Distância até o cortador', 'Desenho', p.deslocamento, 0, 20, 0.1, 'Entre o desenho e a parede do cortador'),
    n('arredondar', 'Arredondar cantos', 'Desenho', p.arredondar, 0, 6, 0.1, 'Raio dos cantos do contorno'),
    n('profundidade', 'Altura do cortador', 'Cortador', p.profundidade, p.profundidadeMin, p.profundidadeMax, 0.5),
    n('espessura', 'Espessura da parede', 'Cortador', p.espessura, 0.5, 3, 0.1),
    { tipo: 'liga', id: 'lamina', rotulo: 'Lâmina fina', grupo: 'Cortador', padrao: p.lamina, dica: 'O topo da parede afina para cortar melhor' },
    n('aba', 'Largura da aba', 'Cortador', p.aba, 2, 8, 0.1, 'Aba em volta, na base, para firmar e apertar'),
    n('espAba', 'Espessura da aba', 'Cortador', p.espAba, 1, 4, 0.1),
    { tipo: 'liga', id: 'carimbo', rotulo: 'Fazer o carimbo', grupo: 'Carimbo', padrao: true, dica: 'Placa que entra no cortador e marca o desenho' },
    n('folga', 'Folga no cortador', 'Carimbo', p.folga, 0.1, 3, 0.05, 'Entre a placa do carimbo e a parede', comCarimbo),
    n('relevo', 'Altura do relevo', 'Carimbo', p.relevo, 0.6, 10, 0.1, undefined, comCarimbo),
    n('espPlaca', 'Espessura da placa', 'Carimbo', p.espPlaca, 1, 6, 0.1, undefined, comCarimbo),
    { tipo: 'numero', id: 'escala', rotulo: 'Escala do desenho no carimbo', grupo: 'Carimbo', padrao: 100, min: 10, max: 150, passo: 1, unidade: '%', visivel: comCarimbo },
    n('removerBorda', 'Tirar borda do desenho', 'Carimbo', 0, 0, 10, 0.1, 'Some com a linha de fora do desenho, desta largura', comCarimbo),
    { tipo: 'liga', id: 'espelhar', rotulo: 'Espelhar', grupo: 'Carimbo', padrao: true, dica: 'O carimbo marca de cabeça para baixo', visivel: comCarimbo },
    { tipo: 'liga', id: 'pegador', rotulo: 'Pegador', grupo: 'Pegador', padrao: p.pegador, dica: 'Cilindro para colar atrás do carimbo', visivel: comCarimbo },
    n('dPegador', 'Diâmetro do pegador', 'Pegador', 10, 6, 20, 0.5, undefined, (v) => comCarimbo(v) && v.pegador === true),
    n('hPegador', 'Altura do pegador', 'Pegador', p.alturaPegador, 8, 60, 1, undefined, (v) => comCarimbo(v) && v.pegador === true),
    n('xPegador', 'Posição X do pegador', 'Pegador', 0, -100, 100, 1, undefined, (v) => comCarimbo(v) && v.pegador === true),
    n('yPegador', 'Posição Y do pegador', 'Pegador', 0, -100, 100, 1, undefined, (v) => comCarimbo(v) && v.pegador === true),
    { tipo: 'texto', id: 'marca', rotulo: 'Sua marca', grupo: 'Marca', padrao: '', maxCaracteres: 30, dica: 'Embutida atrás do carimbo, em outra cor', visivel: comCarimbo },
    { tipo: 'fonte', id: 'fonteMarca', rotulo: 'Fonte da marca', grupo: 'Marca', padrao: 'montserrat-900', visivel: (v) => comCarimbo(v) && !!v.marca },
    { tipo: 'numero', id: 'anguloMarca', rotulo: 'Ângulo da marca', grupo: 'Marca', padrao: 0, min: 0, max: 360, passo: 1, unidade: '°', visivel: (v) => comCarimbo(v) && !!v.marca },
    cor('corBase', 'Cortador e placa', '#e2557a'),
    cor('corTopo', 'Desenho e marca', '#ffffff'),
  ];
}

/** Cortador + carimbo + pegador a partir do desenho `D` (centrado, em mm). */
function cortadorComCarimbo(D: Region, v: Valores, ctx: Contexto): { itens: Item[]; avisos: string[]; notas: string[] } {
  const avisos: string[] = [], notas: string[] = [];
  const off = num(v, 'deslocamento'), e = num(v, 'espessura'), P = num(v, 'profundidade');
  const b = regionBounds(D);
  const forma = txt(v, 'forma') || 'nenhuma';
  let I = forma === 'nenhuma' ? semBuracos(contornar(D, off)) : formaPadrao(forma, Math.max(b.w, b.h) + 2 * off);
  I = arredondar(I, num(v, 'arredondar'));
  if (I.length > 1) avisos.push('O contorno saiu em partes separadas: aumente a distância até o cortador para uni-las.');

  // Cortador: aba embaixo, parede, e o fio afinando por fora no topo.
  const espAba = Math.min(num(v, 'espAba'), P - 1);
  const lamina = liga(v, 'lamina') && e > 0.6 ? Math.min(3, (P - espAba) / 2) : 0;
  const cortador: Camada[] = [
    { region: anel(I, e + num(v, 'aba')), z0: 0, z1: espAba },
    { region: anel(I, e), z0: espAba, z1: P - lamina },
  ];
  const DEGRAUS = 5;
  for (let k = 1; k <= DEGRAUS && lamina > 0; k++) {
    const ek = e - ((e - 0.5) * k) / DEGRAUS;
    cortador.push({ region: anel(I, ek), z0: P - lamina + (lamina * (k - 1)) / DEGRAUS, z1: P - lamina + (lamina * k) / DEGRAUS });
  }
  const itens: Item[] = [{ nome: 'Cortador', pecas: [{ nome: 'Cortador', cor: 0, camadas: cortador }] }];

  if (liga(v, 'carimbo')) {
    const S = contornar(I, -num(v, 'folga'));
    if (regionArea(S) < 1) {
      avisos.push('A folga é maior que o desenho: o carimbo não cabe.');
      return { itens, avisos, notas };
    }
    const ep = num(v, 'espPlaca'), rel = num(v, 'relevo');
    let des = scaleRegion(D, num(v, 'escala') / 100);
    const rb = num(v, 'removerBorda');
    if (rb > 0) des = intersectRegion(des, contornar(semBuracos(des), -rb));
    if (liga(v, 'espelhar')) des = espelharX(des);
    des = intersectRegion(des, S);
    if (regionArea(des) < 0.5) avisos.push('O desenho sumiu do carimbo: diminua "Tirar borda" ou aumente a escala.');

    const vazios: Vazio[] = [];
    const pecas: Peca[] = [];
    const comPegador = liga(v, 'pegador');
    const dp = num(v, 'dPegador'), xp = num(v, 'xPegador'), yp = num(v, 'yPegador');
    const furoPeg = circulo(xp, yp, dp / 2 + 0.15, 48);
    const fundoFuro = Math.max(0, ep - 0.8);
    if (comPegador) {
      if (fundoFuro < 0.6) avisos.push('A placa é fina demais para o furo do pegador (mínimo 1,4 mm).');
      else if (regionArea(diffRegion(contornar(furoPeg, 1), S)) > 0.01) avisos.push('O pegador sai para fora da placa: mude a posição dele.');
      else vazios.push({ regiao: furoPeg, z0: 0, z1: fundoFuro });
    }
    const textoMarca = txt(v, 'marca').trim();
    if (textoMarca) {
      const sb = regionBounds(S);
      let marca = textoNaCaixa([textoMarca], { fonte: ctx.fonte(txt(v, 'fonteMarca')), maxW: sb.w * 0.6, maxH: Math.min(sb.h * 0.25, 12) }).regiao;
      marca = espelharX(rotateRegion(translateRegion(marca, (sb.minX + sb.maxX) / 2, comPegador ? yp - dp / 2 - 3 - regionBounds(marca).h / 2 : (sb.minY + sb.maxY) / 2), num(v, 'anguloMarca')));
      marca = diffRegion(intersectRegion(marca, contornar(S, -1)), comPegador ? contornar(furoPeg, 1) : []);
      if (regionArea(marca) > 0.5) {
        vazios.push({ regiao: marca, z0: 0, z1: 0.6 });
        pecas.push({ nome: 'Marca', cor: 1, camadas: [{ region: marca, z0: 0, z1: 0.6 }] });
      } else avisos.push('A marca não coube atrás do carimbo.');
    }
    pecas.unshift({ nome: 'Placa', cor: 0, camadas: comVazios(S, 0, ep, vazios) });
    if (regionArea(des) >= 0.5) pecas.splice(1, 0, { nome: 'Desenho', cor: 1, camadas: [{ region: des, z0: ep, z1: ep + rel }] });
    itens.push({ nome: 'Carimbo', pecas });
    if (comPegador && fundoFuro >= 0.6) {
      const hp = num(v, 'hPegador');
      itens.push({ nome: 'Pegador', pecas: [{ nome: 'Pegador', cor: 0, camadas: [{ region: circulo(0, 0, dp / 2, 48), z0: 0, z1: hp }] }] });
      notas.push('Cole o pegador no furo de trás do carimbo.');
      if (hp + fundoFuro < P - ep + 5) notas.push('Para empurrar o doce até o fim do cortador, use um pegador mais alto que o cortador.');
    }
    notas.unshift(`O carimbo entra no cortador com ${num(v, 'folga').toLocaleString('pt-BR')} mm de folga por lado.`);
  }
  return { itens: emGrade(itens, itens.length, 6), avisos, notas };
}

function receitaCortador(id: string, p: Padroes): Receita {
  return {
    ...ficha(id),
    parametros: parametrosCortador(p),
    fontes: (v) => (v.carimbo === true && String(v.marca ?? '').trim() ? [String(v.fonteMarca)] : []),
    gerar(v, ctx): Resultado {
      const cores = ['Cortador e placa', 'Desenho e marca'], hex = [txt(v, 'corBase'), txt(v, 'corTopo')];
      const { regiao, exemplo } = desenhoNoTamanho(v, 'desenho', num(v, 'tamanho'), txt(v, 'eixo') === 'altura' ? 'altura' : 'largura');
      if (!regiao.length) return { itens: [], cores, hex, avisos: ['O desenho não tem área.'] };
      const r = cortadorComCarimbo(regiao, v, ctx);
      const nome = nomeDoDesenho(v, 'desenho');
      const itens = nome ? r.itens.map((it) => ({ ...it, nome: `${it.nome} ${nome}` })) : r.itens;
      return { itens, cores, hex, avisos: exemplo ? [AVISO_EXEMPLO, ...r.avisos] : r.avisos, notas: r.notas };
    },
  };
}

export const cortadorBiscoito = receitaCortador('cortador-biscoito', {
  tamanho: 70, tamanhoMin: 30, tamanhoMax: 260, eixo: 'largura', deslocamento: 5, arredondar: 0, lamina: true,
  profundidade: 12, profundidadeMin: 8, profundidadeMax: 30, espessura: 1.6, aba: 3.4, espAba: 2,
  folga: 0.5, relevo: 3, espPlaca: 2, pegador: true, alturaPegador: 15, formas: true,
});

export const ejetorBrigadeiro = receitaCortador('ejetor-brigadeiro', {
  tamanho: 33, tamanhoMin: 20, tamanhoMax: 150, eixo: 'altura', deslocamento: 0, arredondar: 0, lamina: false,
  profundidade: 30, profundidadeMin: 10, profundidadeMax: 40, espessura: 1.6, aba: 4, espAba: 2,
  folga: 0.28, relevo: 3, espPlaca: 2, pegador: true, alturaPegador: 40, formas: false,
});

/**
 * Cortadores de retangulos em grade: paredes de espessura unica, base em cima de tudo
 * com uma saia que entra em cada retangulo e abas laterais com a marca em relevo.
 */
export const cortadoresGrade: Receita = {
  ...ficha('cortadores-grade'),
  parametros: [
    { tipo: 'numero', id: 'largura', rotulo: 'Largura de cada retângulo', grupo: 'Grade', padrao: 66, min: 10, max: 200, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'altura', rotulo: 'Altura de cada retângulo', grupo: 'Grade', padrao: 33, min: 10, max: 200, passo: 1, unidade: 'mm' },
    { tipo: 'numero', id: 'linhas', rotulo: 'Linhas', grupo: 'Grade', padrao: 4, min: 1, max: 10, passo: 1 },
    { tipo: 'numero', id: 'colunas', rotulo: 'Colunas', grupo: 'Grade', padrao: 3, min: 1, max: 10, passo: 1 },
    { tipo: 'numero', id: 'raio', rotulo: 'Cantos arredondados', grupo: 'Grade', padrao: 0.4, min: 0, max: 6, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'profundidade', rotulo: 'Altura do cortador', grupo: 'Grade', padrao: 17, min: 8, max: 30, passo: 0.5, unidade: 'mm' },
    { tipo: 'numero', id: 'parede', rotulo: 'Espessura das paredes', grupo: 'Espessuras', padrao: 1.2, min: 0.6, max: 3, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'espBase', rotulo: 'Espessura da base', grupo: 'Espessuras', padrao: 2, min: 1, max: 4, passo: 0.1, unidade: 'mm' },
    { tipo: 'numero', id: 'saia', rotulo: 'Saia da base', grupo: 'Espessuras', padrao: 4, min: 0, max: 10, passo: 0.1, unidade: 'mm', dica: 'Quanto a base entra em cada retângulo: dá firmeza' },
    { tipo: 'texto', id: 'marca', rotulo: 'Sua marca', grupo: 'Abas', padrao: '@formma3d', maxCaracteres: 30, dica: 'Vazio = sem abas' },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte da marca', grupo: 'Abas', padrao: 'montserrat-900', visivel: (v) => !!v.marca },
    { tipo: 'numero', id: 'abaComprimento', rotulo: 'Comprimento da aba', grupo: 'Abas', padrao: 50, min: 30, max: 120, passo: 1, unidade: 'mm', visivel: (v) => !!v.marca },
    { tipo: 'numero', id: 'abaLargura', rotulo: 'Largura da aba', grupo: 'Abas', padrao: 12, min: 8, max: 25, passo: 0.5, unidade: 'mm', visivel: (v) => !!v.marca },
    cor('corBase', 'Cortador', '#e2557a'),
    cor('corTopo', 'Marca', '#ffffff'),
  ],
  fontes: (v) => (String(v.marca ?? '').trim() ? [String(v.fonte)] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Cortador', 'Marca'], hex = [txt(v, 'corBase'), txt(v, 'corTopo')];
    const W = num(v, 'largura'), H = num(v, 'altura'), L = num(v, 'linhas'), C = num(v, 'colunas'), t = num(v, 'parede');
    const r = Math.min(num(v, 'raio'), W / 2 - 0.1, H / 2 - 0.1), s = Math.min(num(v, 'saia'), W / 2 - 1, H / 2 - 1);
    const LT = C * W + (C + 1) * t, HT = L * H + (L + 1) * t;
    const celula = (i: number, j: number, encolhe: number) =>
      retanguloArredondado(-LT / 2 + t + W / 2 + j * (W + t), HT / 2 - t - H / 2 - i * (H + t), W - 2 * encolhe, H - 2 * encolhe, Math.max(0, r - encolhe));
    const celulas = (encolhe: number) => unir(Array.from({ length: L * C }, (_, k) => celula(Math.floor(k / C), k % C, encolhe)));
    const fora = retanguloArredondado(0, 0, LT, HT, r > 0 ? r + t : 0);
    const espBase = num(v, 'espBase'), P = num(v, 'profundidade');
    const avisos: string[] = [];
    let base = diffRegion(fora, celulas(s));
    const marca = txt(v, 'marca').trim();
    const pecas: Peca[] = [];
    if (marca) {
      const comp = Math.min(num(v, 'abaComprimento'), HT), larg = num(v, 'abaLargura');
      const abas = unir([-1, 1].map((lado) => retanguloArredondado(lado * (LT / 2 + larg / 2 - 0.01), 0, larg + 0.02, comp, 0)));
      base = unir([base, abas]);
      const texto = textoNaCaixa([marca], { fonte: ctx.fonte(txt(v, 'fonte')), maxW: comp * 0.88, maxH: larg * 0.6 }).regiao;
      const rel = unir([-1, 1].map((lado) => translateRegion(rotateRegion(texto, lado * 90), lado * (LT / 2 + larg / 2), 0)));
      pecas.push({ nome: 'Marca', cor: 1, camadas: [{ region: rel, z0: espBase, z1: espBase + 0.8 }] });
      if (comp < num(v, 'abaComprimento')) avisos.push('A aba ficou do tamanho da lateral da grade.');
    }
    pecas.unshift({ nome: 'Cortador', cor: 0, camadas: [{ region: base, z0: 0, z1: espBase }, { region: diffRegion(fora, celulas(0)), z0: espBase, z1: P }] });
    if (LT > 256 || HT > 256) avisos.push(`A grade mede ${Math.round(LT)} × ${Math.round(HT)} mm: confira se cabe na mesa da impressora.`);
    return {
      itens: [{ nome: `Cortador ${C}x${L}`, pecas }], cores, hex, avisos,
      notas: ['Imprima com a base na mesa: o fio de corte fica em cima.'],
    };
  },
};
