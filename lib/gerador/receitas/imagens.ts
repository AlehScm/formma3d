/**
 * Receitas que transformam uma imagem de linhas: pagina de colorir (linhas em relevo, em
 * duas partes ou afundadas), chaveiro com bordas para resina, imagem em varias pecas de
 * encaixar e quebra-cabeca.
 *
 * Em todas, "desenho" e a parte escura da imagem (as linhas); o fundo e a silhueta dela
 * (ou uma forma pronta) com uma margem.
 */
import { diffRegion, intersectRegion, regionArea, regionBounds, translateRegion, type Region } from '../../geom/region';
import { circulo, contornar, retanguloArredondado, semBuracos, unir } from '../formas';
import { espelharX } from '../figuras';
import { argolaNaDirecao } from '../lote';
import { comVazios } from '../solidos';
import { formaPadrao } from './cortadores';
import { AVISO_EXEMPLO, campoDesenho, campoEixo, desenhoNoTamanho, nomeDoDesenho } from './desenho';
import { ficha } from './fichas';
import type { Item, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';
import { liga, num, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string, visivel?: (v: Valores) => boolean): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao, visivel });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });
const eixoDe = (v: Valores) => (txt(v, 'eixo') === 'altura' ? 'altura' : 'largura');
const anel = (r: Region, e: number) => diffRegion(contornar(r, e), r);

/**
 * Pagina de colorir. Relevo: linhas sobem da base. Duas partes: as linhas sao outra peca
 * que encaixa num rebaixo da base (troca de cor sem pausa). Afundado: as linhas ficam
 * rebaixadas, mostrando a cor de baixo.
 */
export const colorir: Receita = {
  ...ficha('colorir'),
  parametros: [
    campoDesenho('Desenho de linhas'),
    {
      tipo: 'escolha', id: 'modo', rotulo: 'Tipo', grupo: 'Desenho', padrao: 'relevo',
      opcoes: [{ valor: 'relevo', rotulo: 'Linhas em relevo' }, { valor: 'duas', rotulo: 'Duas partes' }, { valor: 'afundado', rotulo: 'Linhas afundadas' }],
    },
    {
      tipo: 'escolha', id: 'forma', rotulo: 'Formato do fundo', grupo: 'Desenho', padrao: 'contorno',
      opcoes: [{ valor: 'contorno', rotulo: 'Contorno do desenho' }, { valor: 'circulo', rotulo: 'Círculo' }, { valor: 'quadrado', rotulo: 'Quadrado' }, { valor: 'hexagono', rotulo: 'Hexágono' }],
    },
    mm('tamanho', 'Tamanho', 'Desenho', 160, 40, 340, 1, 'Do desenho, ou da forma quando há forma'),
    { ...campoEixo, visivel: (v: Valores) => v.forma === 'contorno' } as Parametro,
    mm('margem', 'Margem do fundo', 'Desenho', 0, 0, 20, 0.5, '0 = o fundo é a silhueta do desenho', (v) => v.forma === 'contorno'),
    { tipo: 'numero', id: 'escala', rotulo: 'Desenho na forma', grupo: 'Desenho', padrao: 92, min: 30, max: 200, passo: 1, unidade: '%', visivel: (v) => v.forma !== 'contorno' },
    mm('x', 'Posição X', 'Desenho', 0, -50, 50, 1, undefined, (v) => v.forma !== 'contorno'),
    mm('y', 'Posição Y', 'Desenho', 0, -50, 50, 1, undefined, (v) => v.forma !== 'contorno'),
    mm('espBase', 'Espessura da base', 'Medidas', 1.8, 1, 10),
    mm('espLinhas', 'Altura das linhas', 'Medidas', 1, 0.2, 10, 0.1, undefined, (v) => v.modo !== 'afundado'),
    mm('profundidade', 'Profundidade das linhas', 'Medidas', 0.6, 0.2, 2, 0.1, undefined, (v) => v.modo === 'afundado'),
    mm('folga', 'Folga do encaixe', 'Medidas', 0.2, 0.05, 0.6, 0.01, undefined, (v) => v.modo === 'duas'),
    cor('corBase', 'Base', '#ffffff'),
    cor('corLinhas', 'Linhas', '#111111'),
  ],
  gerar(v): Resultado {
    const cores = ['Base', 'Linhas'], hex = [txt(v, 'corBase'), txt(v, 'corLinhas')];
    const avisos: string[] = [];
    const forma = txt(v, 'forma');
    let D: Region, S: Region;
    if (forma === 'contorno') {
      const d = desenhoNoTamanho(v, 'desenho', num(v, 'tamanho'), eixoDe(v));
      if (d.exemplo) avisos.push(AVISO_EXEMPLO);
      D = d.regiao;
      S = semBuracos(contornar(D, num(v, 'margem')));
    } else {
      const L = num(v, 'tamanho');
      S = formaPadrao(forma, L);
      const d = desenhoNoTamanho(v, 'desenho', (L * num(v, 'escala')) / 100, 'largura');
      if (d.exemplo) avisos.push(AVISO_EXEMPLO);
      D = translateRegion(d.regiao, num(v, 'x'), num(v, 'y'));
      if (regionArea(diffRegion(D, S)) > 1) avisos.push('O desenho passa da forma: diminua a escala ou mude a posição.');
      // Linha da borda da forma, para a pagina ter moldura.
      D = unir([intersectRegion(D, S), anel(contornar(S, -1.2), 1.2)]);
    }
    if (!regionArea(D)) return { itens: [], cores, hex, avisos: ['O desenho não tem área.'] };
    if (S.length > 1) avisos.push('O fundo saiu em partes soltas: aumente a margem.');
    const eb = num(v, 'espBase'), nome = nomeDoDesenho(v, 'desenho') || 'Colorir';
    const modo = txt(v, 'modo');
    if (modo === 'afundado') {
      const p = Math.min(num(v, 'profundidade'), eb - 0.4);
      return {
        itens: [{ nome, pecas: [
          { nome: 'Fundo', cor: 1, camadas: [{ region: S, z0: 0, z1: eb - p }] },
          { nome: 'Topo', cor: 0, camadas: [{ region: diffRegion(S, D), z0: eb - p, z1: eb }] },
        ] }],
        cores, hex, avisos,
        notas: ['A primeira cor (das linhas) vai até o fundo dos rebaixos; troque de filamento na camada em que começa o topo.'],
      };
    }
    const el = num(v, 'espLinhas');
    if (modo === 'duas') {
      const r = Math.max(0.4, Math.min(1, eb - 0.6));
      const vao = contornar(D, num(v, 'folga'));
      const base = comVazios(S, 0, eb, [{ regiao: vao, z0: eb - r, z1: eb }]);
      const itens: Item[] = [
        { nome: `${nome} base`, pecas: [{ nome: 'Base', cor: 0, camadas: base }] },
        { nome: `${nome} linhas`, pecas: [{ nome: 'Linhas', cor: 1, camadas: [{ region: D, z0: 0, z1: r + el }] }] },
      ];
      const b = regionBounds(S);
      itens[1] = { ...itens[1]!, pecas: itens[1]!.pecas.map((pc) => ({ ...pc, camadas: pc.camadas.map((c) => ({ ...c, region: translateRegion(c.region, b.w + 8, 0) })) })) };
      return { itens, cores, hex, avisos, notas: [`As linhas encaixam no rebaixo de ${r.toLocaleString('pt-BR')} mm da base e ficam ${el.toLocaleString('pt-BR')} mm acima dela.`] };
    }
    return {
      itens: [{ nome, pecas: [
        { nome: 'Base', cor: 0, camadas: [{ region: S, z0: 0, z1: eb }] },
        { nome: 'Linhas', cor: 1, camadas: [{ region: intersectRegion(D, S), z0: eb, z1: eb + el }] },
      ] }],
      cores, hex, avisos,
    };
  },
};

/**
 * Chaveiro (ou placa) com bordas altas para resina: base na silhueta com margem, desenho
 * em relevo baixo, borda em volta do desenho e/ou da peca para segurar a resina.
 */
export const chaveiroResina: Receita = {
  ...ficha('chaveiro-resina'),
  parametros: [
    campoDesenho(),
    mm('tamanho', 'Tamanho (lado maior)', 'Desenho', 65, 15, 200, 1),
    mm('margem', 'Margem da base', 'Desenho', 4, 0, 10, 0.1, 'Aumente até a base sair inteira, sem buracos'),
    { tipo: 'liga', id: 'bordaExterna', rotulo: 'Borda na volta da peça', grupo: 'Bordas', padrao: false, dica: 'Para cobrir a peça toda de resina' },
    { tipo: 'liga', id: 'bordaInterna', rotulo: 'Borda em volta do desenho', grupo: 'Bordas', padrao: true, dica: 'Para pôr resina só no desenho' },
    mm('largBorda', 'Largura das bordas', 'Bordas', 0.8, 0.4, 3),
    mm('altBorda', 'Altura das bordas', 'Bordas', 1.4, 0.4, 5),
    { tipo: 'liga', id: 'argola', rotulo: 'Argola', grupo: 'Argola', padrao: true },
    mm('furo', 'Furo da argola', 'Argola', 3.6, 2, 8, 0.1, undefined, (v) => v.argola === true),
    mm('aro', 'Largura do aro', 'Argola', 1.4, 0.8, 5, 0.1, undefined, (v) => v.argola === true),
    mm('espBase', 'Espessura da base', 'Medidas', 1.8, 0.8, 10),
    mm('altDesenho', 'Altura do desenho', 'Medidas', 0.6, 0.2, 5),
    cor('corBase', 'Base', '#4a1f2e'),
    cor('corBorda', 'Bordas', '#ffffff'),
    cor('corDesenho', 'Desenho', '#f5c518'),
  ],
  gerar(v): Resultado {
    const cores = ['Base', 'Bordas', 'Desenho'], hex = [txt(v, 'corBase'), txt(v, 'corBorda'), txt(v, 'corDesenho')];
    const { regiao: D, exemplo } = desenhoNoTamanho(v, 'desenho', num(v, 'tamanho'), 'largura');
    const avisos = exemplo ? [AVISO_EXEMPLO] : [];
    if (!regionArea(D)) return { itens: [], cores, hex, avisos: ['O desenho não tem área.'] };
    const S0 = semBuracos(contornar(D, num(v, 'margem')));
    if (S0.length > 1) avisos.push('A base saiu em partes soltas: aumente a margem.');
    const lb = num(v, 'largBorda'), eb = num(v, 'espBase'), hb = num(v, 'altBorda');
    let S = S0;
    if (liga(v, 'argola')) {
      const a = argolaNaDirecao(S0, 0, 1, num(v, 'furo'), num(v, 'aro'));
      S = diffRegion(unir([S0, a.disco]), a.furo);
    }
    const pecas: Peca[] = [{ nome: 'Base', cor: 0, camadas: [{ region: S, z0: 0, z1: eb }] }];
    const bordas: Region[] = [];
    if (liga(v, 'bordaExterna')) bordas.push(diffRegion(S0, contornar(S0, -lb)));
    if (liga(v, 'bordaInterna')) {
      const anelDes = intersectRegion(anel(semBuracos(D), lb), contornar(S0, -(liga(v, 'bordaExterna') ? lb + 0.4 : 0)));
      if (regionArea(diffRegion(contornar(semBuracos(D), lb), S0)) > 0.5) avisos.push('A borda do desenho sai da base: aumente a margem.');
      bordas.push(anelDes);
    }
    const borda = unir(bordas);
    if (regionArea(borda) > 0.1) pecas.push({ nome: 'Bordas', cor: 1, camadas: [{ region: borda, z0: eb, z1: eb + hb }] });
    pecas.push({ nome: 'Desenho', cor: 2, camadas: [{ region: diffRegion(D, borda), z0: eb, z1: eb + num(v, 'altDesenho') }] });
    if (num(v, 'altDesenho') >= hb) avisos.push('O desenho está mais alto que as bordas: a resina vai cobri-lo só se as bordas forem mais altas.');
    return {
      itens: [{ nome: nomeDoDesenho(v, 'desenho') || 'Chaveiro', pecas }], cores, hex, avisos,
      notas: ['Depois de imprimir, despeje a resina dentro das bordas com a peça nivelada.'],
    };
  },
};

/**
 * Imagem em varias pecas: as linhas viram paredes sobre uma base e cada area fechada
 * entre elas vira uma peca solta, com folga, para encaixar (pintar de cores diferentes).
 */
export const imagemMultipartes: Receita = {
  ...ficha('imagem-multipartes'),
  parametros: [
    campoDesenho('Desenho de linhas'),
    mm('tamanho', 'Tamanho', 'Desenho', 200, 40, 300, 1),
    { ...campoEixo, padrao: 'altura' } as Parametro,
    { tipo: 'liga', id: 'inverter', rotulo: 'Inverter', grupo: 'Desenho', padrao: false, dica: 'As áreas viram linhas e as linhas viram peças' },
    { tipo: 'liga', id: 'espelhar', rotulo: 'Espelhar as peças', grupo: 'Desenho', padrao: false, dica: 'Para imprimir as peças com a face para baixo' },
    mm('espBase', 'Espessura da base', 'Medidas', 1, 0.6, 10),
    mm('espLinhas', 'Altura das linhas', 'Medidas', 2, 0.4, 10),
    mm('espPecas', 'Espessura das peças', 'Medidas', 1.6, 0.4, 10),
    mm('folga', 'Folga das peças', 'Medidas', 0.22, 0.1, 0.5, 0.01),
    cor('corBase', 'Base e linhas', '#4a1f2e'),
    cor('corPecas', 'Peças', '#ffffff'),
  ],
  gerar(v): Resultado {
    const cores = ['Base e linhas', 'Peças'], hex = [txt(v, 'corBase'), txt(v, 'corPecas')];
    const { regiao: D, exemplo } = desenhoNoTamanho(v, 'desenho', num(v, 'tamanho'), eixoDe(v));
    const avisos = exemplo ? [AVISO_EXEMPLO] : [];
    if (!regionArea(D)) return { itens: [], cores, hex, avisos: ['O desenho não tem área.'] };
    const S = semBuracos(D);
    const L = liga(v, 'inverter') ? unir([diffRegion(S, D), anel(contornar(S, -1.2), 1.2)]) : D;
    const areas = contornar(diffRegion(S, L), -num(v, 'folga'))
      .filter((p) => regionArea([p]) > 4);
    if (!areas.length) avisos.push('Não há áreas fechadas entre as linhas: confira se o desenho tem contorno por fora.');
    const eb = num(v, 'espBase');
    const b = regionBounds(S);
    let pecas = liga(v, 'espelhar') ? espelharX(areas) : areas;
    pecas = translateRegion(pecas, b.w + 10, 0);
    const itens: Item[] = [{
      nome: nomeDoDesenho(v, 'desenho') || 'Imagem',
      pecas: [{ nome: 'Base', cor: 0, camadas: [{ region: S, z0: 0, z1: eb }, { region: L, z0: eb, z1: eb + num(v, 'espLinhas') }] }],
    }];
    if (areas.length) itens.push({ nome: `Peças (${areas.length})`, pecas: [{ nome: 'Peças', cor: 1, camadas: [{ region: pecas, z0: 0, z1: num(v, 'espPecas') }] }] });
    return { itens, cores, hex, avisos, notas: areas.length ? [`${areas.length} peças para encaixar entre as linhas.`] : [] };
  },
};

/** Gerador deterministico (as abas nao mudam a cada redesenho). */
function aleatorio(semente: number) {
  let s = semente >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/**
 * Pecas de quebra-cabeca n x n de lado `L`, centradas em (0, 0): cada aresta interna tem
 * uma aba (pescoco + bola) para um dos lados, sorteada com semente fixa.
 */
export function pecasDeQuebraCabeca(n: number, L: number, folga: number, semente = 7): Region[] {
  const s = L / n, sorte = aleatorio(semente);
  const aba = (x: number, y: number, nx: number, ny: number): Region => {
    // Aba saindo da aresta de centro (x, y) na direcao (nx, ny).
    const rb = s * 0.17, dist = s * 0.2;
    const bola = circulo(x + nx * dist, y + ny * dist, rb, 40);
    const px = -ny, py = nx, w = s * 0.09;
    const pescoco = [{ outer: [
      { x: x - px * w - nx * 0.01, y: y - py * w - ny * 0.01 }, { x: x + px * w - nx * 0.01, y: y + py * w - ny * 0.01 },
      { x: x + px * w + nx * dist, y: y + py * w + ny * dist }, { x: x - px * w + nx * dist, y: y - py * w + ny * dist },
    ], holes: [] }];
    return unir([bola, pescoco]);
  };
  const x0 = -L / 2, y0 = L / 2;
  // ganhos[i][j]: abas que a peca (linha i, coluna j) ganha; perdas: as que entram nela.
  const ganha: Region[][] = Array.from({ length: n * n }, () => []);
  const perde: Region[][] = Array.from({ length: n * n }, () => []);
  const k = (i: number, j: number) => i * n + j;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (j + 1 < n) { // aresta vertical entre (i, j) e (i, j + 1)
        const x = x0 + (j + 1) * s, y = y0 - (i + 0.5) * s, dir = sorte() < 0.5 ? 1 : -1;
        const a = aba(x, y, dir, 0);
        const [dono, outro] = dir > 0 ? [k(i, j), k(i, j + 1)] : [k(i, j + 1), k(i, j)];
        ganha[dono]!.push(a); perde[outro]!.push(a);
      }
      if (i + 1 < n) { // aresta horizontal entre (i, j) e (i + 1, j)
        const x = x0 + (j + 0.5) * s, y = y0 - (i + 1) * s, dir = sorte() < 0.5 ? 1 : -1;
        const a = aba(x, y, 0, -dir);
        const [dono, outro] = dir > 0 ? [k(i, j), k(i + 1, j)] : [k(i + 1, j), k(i, j)];
        ganha[dono]!.push(a); perde[outro]!.push(a);
      }
    }
  }
  const pecas: Region[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const celula = retanguloArredondado(x0 + (j + 0.5) * s, y0 - (i + 0.5) * s, s, s, 0);
      const p = diffRegion(unir([celula, ...ganha[k(i, j)]!]), unir(perde[k(i, j)]!));
      pecas.push(contornar(p, -folga / 2));
    }
  }
  return pecas;
}

/** Quebra-cabeca quadrado com a imagem afundada no topo, verso de outra cor e moldura. */
export const quebraCabeca: Receita = {
  ...ficha('quebra-cabeca'),
  parametros: [
    campoDesenho('Imagem'),
    mm('lado', 'Lado do quebra-cabeça', 'Quebra-cabeça', 150, 50, 250, 1),
    { tipo: 'numero', id: 'pecas', rotulo: 'Peças por lado', grupo: 'Quebra-cabeça', padrao: 8, min: 2, max: 16, passo: 1 },
    mm('folga', 'Folga entre peças', 'Quebra-cabeça', 0.18, 0.1, 0.4, 0.01),
    mm('espessura', 'Espessura', 'Quebra-cabeça', 3.2, 2.4, 5),
    mm('profImagem', 'Profundidade da imagem', 'Quebra-cabeça', 0.6, 0.2, 1.2),
    { tipo: 'numero', id: 'semente', rotulo: 'Sorteio das abas', grupo: 'Quebra-cabeça', padrao: 7, min: 1, max: 999, passo: 1, dica: 'Mude para outro desenho de abas' },
    { tipo: 'liga', id: 'moldura', rotulo: 'Moldura', grupo: 'Moldura', padrao: true },
    mm('largMoldura', 'Largura da moldura', 'Moldura', 10, 4, 30, 1, undefined, (v) => v.moldura === true),
    mm('raioMoldura', 'Cantos da moldura', 'Moldura', 4, 0, 10, 0.1, undefined, (v) => v.moldura === true),
    cor('corFundo', 'Fundo da imagem', '#ffffff'),
    cor('corDesenho', 'Desenho', '#1f2937'),
    cor('corVerso', 'Verso e moldura', '#1e88e5'),
  ],
  gerar(v): Resultado {
    const cores = ['Verso e moldura', 'Fundo', 'Desenho'], hex = [txt(v, 'corVerso'), txt(v, 'corFundo'), txt(v, 'corDesenho')];
    const L = num(v, 'lado'), n = num(v, 'pecas'), T = num(v, 'espessura'), p = num(v, 'profImagem');
    const avisos: string[] = [];
    const s = L / n;
    if (s < 10) avisos.push(`Peças de ${s.toFixed(1)} mm ficam frágeis: aumente o lado ou diminua as peças.`);
    let { regiao: D, exemplo } = desenhoNoTamanho(v, 'desenho', L * 0.9, 'largura');
    if (regionBounds(D).h > L * 0.9) D = desenhoNoTamanho(v, 'desenho', L * 0.9, 'altura').regiao;
    if (exemplo) avisos.push(AVISO_EXEMPLO);
    const pecas = pecasDeQuebraCabeca(n, L, num(v, 'folga'), num(v, 'semente'));
    const todas = pecas.flat();
    const camadasTopo = (r: Region, z0: number, z1: number) => (regionArea(r) > 0.01 ? [{ region: r, z0, z1 }] : []);
    const lista: Peca[] = [
      { nome: 'Verso', cor: 0, camadas: [{ region: todas, z0: 0, z1: T - p }] },
      { nome: 'Fundo', cor: 1, camadas: camadasTopo(diffRegion(todas, D), T - p, T) },
      { nome: 'Desenho', cor: 2, camadas: camadasTopo(intersectRegion(todas, D), T - p, T) },
    ];
    if (liga(v, 'moldura')) {
      const w = num(v, 'largMoldura'), g = num(v, 'folga');
      const fora = retanguloArredondado(0, 0, L + 2 * g + 2 * w, L + 2 * g + 2 * w, num(v, 'raioMoldura'));
      lista.push({ nome: 'Moldura', cor: 0, camadas: [{ region: diffRegion(fora, retanguloArredondado(0, 0, L + 2 * g, L + 2 * g, 0)), z0: 0, z1: T }] });
    }
    return {
      itens: [{ nome: `Quebra-cabeça ${n}x${n}`, pecas: lista.filter((pc) => pc.camadas.length) }], cores, hex, avisos,
      notas: [`${n * n} peças, já montadas na mesa com folga entre elas.`],
    };
  },
};
