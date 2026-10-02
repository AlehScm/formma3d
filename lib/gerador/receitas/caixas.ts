/**
 * Caixa de figurinhas (compartimentos na medida da figurinha, cortes para pegar, tampa
 * com aro de encaixe e logo embutido, nome embaixo) e porta-canetas com um painel de
 * desenho que encaixa num rebaixo da frente.
 */
import { diffRegion, intersectRegion, regionArea, regionBounds, rotateRegion, scaleRegion, translateRegion, type Region } from '../../geom/region';
import { contornar, retanguloArredondado, temEmoji, textoNaCaixa, unir } from '../formas';
import { espelharX } from '../figuras';
import { emGrade } from '../lote';
import { comVazios, type Vazio } from '../solidos';
import { campoDesenho, desenhoNoTamanho } from './desenho';
import { ficha } from './fichas';
import type { Camada, Item, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';
import { desenho, num, soCoresUsadas, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });
const ret = (x0: number, y0: number, x1: number, y1: number): Region => [{ outer: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], holes: [] }];

/** Desenho do campo `id` centrado, com o lado maior `tam`, girado e deslocado. */
function desenhoPosto(v: Valores, id: string, tam: number, giro: number, x: number, y: number): Region {
  if (!desenho(v, id)) return [];
  return translateRegion(rotateRegion(desenhoNoTamanho(v, id, tam).regiao, giro), x, y);
}

export const caixaFigurinhas: Receita = {
  ...ficha('caixa-figurinhas'),
  parametros: [
    mm('larguraFig', 'Largura da figurinha', 'Figurinha', 49, 30, 100, 0.5),
    mm('alturaFig', 'Altura da figurinha', 'Figurinha', 65, 30, 100, 0.5),
    mm('folgaFig', 'Folga em volta', 'Figurinha', 1.2, 0.5, 6, 0.1),
    { tipo: 'numero', id: 'caixas', rotulo: 'Compartimentos', grupo: 'Caixa', padrao: 2, min: 1, max: 4, passo: 1 },
    mm('profundidade', 'Profundidade', 'Caixa', 22, 8, 100, 0.5, 'Altura da pilha de figurinhas'),
    mm('parede', 'Parede', 'Caixa', 1.2, 0.8, 4),
    mm('base', 'Fundo', 'Caixa', 1.2, 0.8, 4),
    mm('corte', 'Largura dos cortes para pegar', 'Caixa', 14, 0, 40, 0.5, '0 = sem cortes'),
    { tipo: 'liga', id: 'suporte', rotulo: 'Suporte removível', grupo: 'Caixa', padrao: true, dica: 'Bandeja com puxador em cada compartimento: levanta a pilha de figurinhas' },
    mm('folgaSuporte', 'Folga do suporte', 'Caixa', 1.3, 0.4, 3, 0.1, undefined, (v) => v.suporte === true),
    mm('folgaTampa', 'Folga da tampa', 'Tampa', 0.23, 0.1, 0.6, 0.01),
    mm('aro', 'Altura do aro da tampa', 'Tampa', 3, 1.5, 8, 0.5),
    { ...campoDesenho('Logo na tampa'), grupo: 'Tampa' },
    { tipo: 'numero', id: 'escalaLogo', rotulo: 'Tamanho do logo', grupo: 'Tampa', padrao: 100, min: 30, max: 250, passo: 1, unidade: '%' },
    { tipo: 'numero', id: 'giroLogo', rotulo: 'Giro do logo', grupo: 'Tampa', padrao: 0, min: -180, max: 180, passo: 1, unidade: '°' },
    mm('xLogo', 'Posição X do logo', 'Tampa', 0, -100, 100, 1),
    mm('yLogo', 'Posição Y do logo', 'Tampa', 0, -100, 100, 1),
    { tipo: 'texto', id: 'nome', rotulo: 'Nome no fundo', grupo: 'Fundo', padrao: '', maxCaracteres: 30 },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte do nome', grupo: 'Fundo', padrao: 'bebas-neue', visivel: (v) => !!v.nome },
    { tipo: 'numero', id: 'escalaNome', rotulo: 'Tamanho do nome', grupo: 'Fundo', padrao: 60, min: 20, max: 100, passo: 1, unidade: '%', visivel: (v) => !!v.nome },
    cor('corCaixa', 'Caixa', '#ffef00'),
    cor('corTampa', 'Tampa e suporte', '#228b22'),
    cor('corLogo', 'Logo e nome', '#ffffff'),
  ],
  fontes: (v) => (String(v.nome ?? '').trim() ? [String(v.fonte), ...(temEmoji(String(v.nome)) ? ['noto-emoji'] : [])] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Caixa', 'Tampa', 'Logo e nome'], hex = [txt(v, 'corCaixa'), txt(v, 'corTampa'), txt(v, 'corLogo')];
    const avisos: string[] = [];
    const cw = num(v, 'larguraFig') + 2 * num(v, 'folgaFig'), ch = num(v, 'alturaFig') + 2 * num(v, 'folgaFig');
    const n = num(v, 'caixas'), pw = num(v, 'parede'), eb = num(v, 'base'), P = num(v, 'profundidade');
    const W = n * cw + (n + 1) * pw, H = ch + 2 * pw;
    const fora = retanguloArredondado(0, 0, W, H, 2);
    const celulas = unir(Array.from({ length: n }, (_, i) => retanguloArredondado(-W / 2 + pw + cw / 2 + i * (cw + pw), 0, cw, ch, 1)));
    // Cortes para pegar: frestas no meio das paredes da frente e de tras de cada celula.
    const c = num(v, 'corte');
    const cortes: Vazio[] = c > 0 ? Array.from({ length: n }, (_, i) => {
      const x = -W / 2 + pw + cw / 2 + i * (cw + pw);
      return { regiao: ret(x - c / 2, -H / 2 - 1, x + c / 2, H / 2 + 1), z0: eb + Math.min(P * 0.4, P - 2), z1: eb + P + 1 };
    }) : [];
    const vaziosFundo: Vazio[] = [];
    const pecasCaixa: Peca[] = [];
    const nome = txt(v, 'nome').trim();
    if (nome) {
      const t = textoNaCaixa([nome], { fonte: ctx.fonte(txt(v, 'fonte')), reserva: temEmoji(nome) ? ctx.fonte('noto-emoji') : undefined, maxW: W * (num(v, 'escalaNome') / 100), maxH: H * 0.4 });
      const m = intersectRegion(espelharX(t.regiao), contornar(fora, -2));
      vaziosFundo.push({ regiao: m, z0: 0, z1: 0.6 });
      pecasCaixa.push({ nome: 'Nome', cor: 2, camadas: [{ region: m, z0: 0, z1: 0.6 }] });
    }
    pecasCaixa.unshift({ nome: 'Caixa', cor: 0, camadas: [...comVazios(fora, 0, eb, vaziosFundo), ...comVazios(diffRegion(fora, celulas), eb, eb + P, cortes)] });
    // Tampa: placa + aro que entra justo por dentro da parede de fora (com folga).
    const ft = num(v, 'folgaTampa');
    const dentro = contornar(fora, -(pw + ft));
    const aro = diffRegion(dentro, contornar(dentro, -1.2));
    const logo = desenhoPosto(v, 'desenho', Math.min(W, H) * 0.6 * (num(v, 'escalaLogo') / 100), num(v, 'giroLogo'), num(v, 'xLogo'), num(v, 'yLogo'));
    const logoM = intersectRegion(espelharX(logo), contornar(fora, -2));
    const tampa: Peca[] = [{ nome: 'Tampa', cor: 1, camadas: [...comVazios(fora, 0, 1.2, regionArea(logoM) > 0.3 ? [{ regiao: logoM, z0: 0, z1: 0.6 }] : []), { region: aro, z0: 1.2, z1: 1.2 + num(v, 'aro') }] }];
    if (regionArea(logoM) > 0.3) tampa.push({ nome: 'Logo', cor: 2, camadas: [{ region: logoM, z0: 0, z1: 0.6 }] });
    const itens: Item[] = [{ nome: 'Caixa', pecas: pecasCaixa }, { nome: 'Tampa', pecas: tampa }];
    if (v.suporte === true) {
      // Bandeja fina na medida da celula (menos a folga) com uma alca que sobe ate a borda.
      const fs = num(v, 'folgaSuporte');
      const bandeja = retanguloArredondado(0, 0, cw - 2 * fs, ch - 2 * fs, 1);
      const alca = retanguloArredondado(0, ch / 2 - fs - 6, Math.min(16, cw * 0.4), 12, 2);
      for (let i = 0; i < n; i++) itens.push({ nome: `Suporte ${i + 1}`, pecas: [{ nome: 'Suporte', cor: 1, camadas: [{ region: bandeja, z0: 0, z1: 1.2 }, { region: diffRegion(alca, retanguloArredondado(0, ch / 2 - fs - 6, Math.min(16, cw * 0.4) - 4, 8, 1)), z0: 1.2, z1: 1.2 + Math.max(4, P * 0.6) }] }] });
    }
    return soCoresUsadas({ itens: emGrade(itens, 1, 8), cores, hex, avisos, notas: ['A tampa imprime com o topo na mesa (o logo fica rente) e o aro para cima.'] });
  },
};

/**
 * Porta-canetas com design: tubo quadrado com um rebaixo na frente; o painel com o
 * desenho em relevo imprime deitado e encaixa no rebaixo.
 */
export const portaCanetasDesign: Receita = {
  ...ficha('porta-canetas-design'),
  parametros: [
    { tipo: 'escolha', id: 'origem', rotulo: 'Desenho', grupo: 'Desenho', padrao: 'texto', opcoes: [{ valor: 'texto', rotulo: 'Texto' }, { valor: 'imagem', rotulo: 'Imagem' }] },
    { tipo: 'texto', id: 'texto', rotulo: 'Texto', grupo: 'Desenho', padrao: 'Lápis+& cia', maxCaracteres: 40, dica: '"+" quebra a linha', visivel: (v) => v.origem !== 'imagem' },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Desenho', padrao: 'pacifico', visivel: (v) => v.origem !== 'imagem' },
    { ...campoDesenho(), visivel: (v: Valores) => v.origem === 'imagem' },
    mm('lado', 'Lado', 'Porta-canetas', 55, 30, 150, 1),
    mm('altura', 'Altura', 'Porta-canetas', 95, 40, 200, 1),
    mm('parede', 'Parede', 'Porta-canetas', 2.4, 1.6, 6),
    mm('fundo', 'Fundo', 'Porta-canetas', 2.4, 1, 6),
    mm('rebaixo', 'Profundidade do rebaixo', 'Painel', 0.8, 0.4, 1.6, 0.1),
    mm('relevo', 'Relevo do desenho', 'Painel', 1.4, 0.4, 5, 0.1),
    mm('margem', 'Margem do painel', 'Painel', 5, 2, 20, 0.5),
    mm('folga', 'Folga do painel', 'Painel', 0.2, 0.05, 0.6, 0.01),
    cor('corCorpo', 'Porta-canetas', '#4a1f2e'),
    cor('corPainel', 'Painel', '#4a1f2e'),
    cor('corDesenho', 'Desenho', '#f5d0a9'),
  ],
  fontes: (v) => (v.origem !== 'imagem' ? [String(v.fonte)] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Porta-canetas', 'Painel', 'Desenho'], hex = [txt(v, 'corCorpo'), txt(v, 'corPainel'), txt(v, 'corDesenho')];
    const avisos: string[] = [];
    const L = num(v, 'lado'), A = num(v, 'altura'), pw = num(v, 'parede'), fz = num(v, 'fundo'), r = Math.min(num(v, 'rebaixo'), pw - 0.8);
    const m = num(v, 'margem'), folga = num(v, 'folga');
    const fora = retanguloArredondado(0, 0, L, L, 3), oco = retanguloArredondado(0, 0, L - 2 * pw, L - 2 * pw, 1.5);
    // Rebaixo: faixa rasa na face da frente (y = -L/2), entre as margens.
    const pl = L - 2 * m, pa = A - fz - 2 * m;
    const rebaixo: Vazio = { regiao: ret(-pl / 2 - folga, -L / 2 - 1, pl / 2 + folga, -L / 2 + r), z0: fz + m - folga, z1: fz + m + pa + folga };
    const corpo: Camada[] = [{ region: fora, z0: 0, z1: fz }, ...comVazios(diffRegion(fora, oco), fz, A, [rebaixo])];
    // Painel deitado: placa da espessura do rebaixo + desenho em relevo.
    let D: Region;
    if (txt(v, 'origem') === 'imagem') D = desenhoNoTamanho(v, 'desenho', 100).regiao;
    else {
      const t = txt(v, 'texto').trim();
      if (!t) return { itens: [], cores, hex, avisos: ['Digite o texto.'] };
      D = textoNaCaixa(t.split('+'), { fonte: ctx.fonte(txt(v, 'fonte')), maxW: 1000, maxH: 1000, entrelinha: 1 }).regiao;
    }
    const db = regionBounds(D);
    // O painel fica em pe na frente: largura pl, altura pa. Deitado, a altura vira o eixo y.
    const k = Math.min((pl - 4) / db.w, (pa - 4) / db.h);
    D = scaleRegion(translateRegion(D, -(db.minX + db.maxX) / 2, -(db.minY + db.maxY) / 2), k);
    const placa = retanguloArredondado(0, 0, pl, pa, 1);
    const painel: Peca[] = [{ nome: 'Painel', cor: 1, camadas: [{ region: placa, z0: 0, z1: r }] }, { nome: 'Desenho', cor: 2, camadas: [{ region: intersectRegion(D, contornar(placa, -1)), z0: r, z1: r + num(v, 'relevo') }] }];
    if (pa < 15 || pl < 15) avisos.push('O painel ficou pequeno: diminua a margem.');
    return soCoresUsadas({
      itens: emGrade([{ nome: 'Porta-canetas', pecas: [{ nome: 'Porta-canetas', cor: 0, camadas: corpo }] }, { nome: 'Painel', pecas: painel }], 2, 8),
      cores, hex, avisos, notas: ['Cole o painel no rebaixo da frente.'],
    });
  },
};
