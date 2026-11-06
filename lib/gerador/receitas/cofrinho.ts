/**
 * Cofrinho com nome: corpo oco no contorno da palavra alargado por igual, com as letras apoiadas
 * na mesma linha para ficar em pe, fenda de moeda em cima, costas fechadas com uma tampinha redonda para tirar as moedas e as
 * letras como peca propria, que encaixa num rebaixo da frente.
 *
 * Imprime assim: o corpo de frente na mesa (o rebaixo das letras fica do lado da mesa e a
 * parede sobe sem balanco), as costas e a tampinha com a placa na mesa e as letras deitadas.
 * As costas entram justas no corpo; a tampinha encaixa no furo delas. A parede pode ser
 * canelada: faixas de meio passo alternam o contorno e o contorno dilatado.
 */
import { diffRegion, intersectRegion, regionArea, regionBounds, translateRegion, type Pt, type Region } from '../../geom/region';
import { circulo, comporLinhas, contornar, escalaParaLargura, pontoDentro, retanguloArredondado, semBuracos, unir, type TextoComposto } from '../formas';
import { espelharX } from '../figuras';
import { ficha } from './fichas';
import { montarJunto } from './letras';
import type { Camada, Item, Parametro, Receita, Resultado, Valores } from '../tipos';
import { num, soCoresUsadas, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });
const ret = (x0: number, y0: number, x1: number, y1: number): Region => [{ outer: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], holes: [] }];

/** Rebaixo das letras na frente, placa da frente, placa das costas e aba de encaixe, mm. */
const REBAIXO = 1, FRENTE = 2.4, PLACA_TAMPA = 1.6, ABA = 4, PAREDE_ABA = 1.6;
/** Furo da tampinha (raio): passa a moeda de R$ 1; o minimo ainda passa com folga. */
const FURO_R = 16, FURO_MIN_R = 14.5;
/** Aba da tampinha alem do furo, lingueta para puxar e rebaixo da unha nas costas, mm. */
const ABA_TAMPINHA = 3, LINGUETA = 5, UNHA = 0.8;
/** Fenda de moeda: a de R$ 1 tem 27 mm de diametro e 1,95 mm de espessura. */
const FENDA_L = 30, FENDA_A = 4;
/** Folga das letras no rebaixo, mm. */
const FOLGA_LETRAS = 0.15;
const MESA = 256;

/** A janela de `largura` mm onde o topo da silhueta e mais alto no ponto mais baixo (fenda reta). */
function janelaDaFenda(S: Region, largura: number): { cx: number; topo: number } {
  const b = regionBounds(S);
  const topos: { x: number; y: number }[] = [];
  for (let x = b.minX + 2; x <= b.maxX - 2; x += 1) {
    const f = regionBounds(intersectRegion(S, ret(x - 0.25, b.minY - 1, x + 0.25, b.maxY + 1)));
    if (f.h > 0) topos.push({ x, y: f.maxY });
  }
  let melhor = { cx: (b.minX + b.maxX) / 2, topo: -Infinity };
  for (let i = 0; i < topos.length; i++) {
    const fim = topos.findIndex((t, j) => j >= i && t.x - topos[i]!.x >= largura);
    if (fim < 0) break;
    const janela = topos.slice(i, fim + 1);
    const minimo = Math.min(...janela.map((t) => t.y));
    if (minimo > melhor.topo || (minimo === melhor.topo && Math.abs((topos[i]!.x + topos[fim]!.x) / 2) < Math.abs(melhor.cx))) melhor = { cx: (topos[i]!.x + topos[fim]!.x) / 2, topo: minimo };
  }
  return Number.isFinite(melhor.topo) ? melhor : { cx: melhor.cx, topo: b.maxY - 4 };
}

/** Silhueta do nome para ficar em pe (cofrinho, porta-canetas): `t` deslocado de (dx, dy). */
export function silhuetaEmPe(t: TextoComposto, dx: number, dy: number, altura: number, borda: number): Region {
  // O contorno das letras alargado por igual pela borda (canto redondo), sem buracos.
  // Antes, o pe das letras vai para a mesma linha: a sobra das letras redondas (O, U, S...)
  // abaixo da linha de base e cortada, para cada bolha de baixo encostar na mesa na mesma altura
  // e o cofrinho ficar em pe sobre todas. Rabo de letra (Q, J) fica. O corte e so no contorno:
  // as letras da frente continuam inteiras, e a sobra delas cabe na borda.
  const pes = t.letras.map((l) => l.bounds.minY + dy).sort((a, b) => a - b);
  const linha = pes[Math.floor(pes.length / 2)]!;
  const sobra = Math.min(altura * 0.06, borda - 1.5);
  const alinhadas = unir(t.letras.map((l) => {
    const r = translateRegion(l.region, dx, dy), pe = l.bounds.minY + dy;
    return pe < linha && pe >= linha - sobra ? intersectRegion(r, ret(l.bounds.minX + dx - 1, linha, l.bounds.maxX + dx + 1, l.bounds.maxY + dy + 1)) : r;
  }));
  // O fechamento so tapa a fresta estreita entre letras; a onda de cada letra fica.
  const fechar = borda * 0.5;
  return semBuracos(contornar(contornar(contornar(alinhadas, borda), fechar), -fechar));
}

export const cofrinhoNome: Receita = {
  ...ficha('cofrinho-nome'),
  parametros: [
    { tipo: 'texto', id: 'nome', rotulo: 'Nome', grupo: 'Texto', padrao: 'Luna', maxCaracteres: 14 },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Texto', padrao: 'chewy' },
    { tipo: 'liga', id: 'maiusculas', rotulo: 'Tudo em maiúsculas', grupo: 'Texto', padrao: true, dica: 'Letras da mesma altura dão o contorno por igual' },
    { tipo: 'numero', id: 'espacamento', rotulo: 'Espaço entre letras', grupo: 'Texto', padrao: 100, min: 70, max: 140, passo: 1, unidade: '%', dica: '100% é o espaço da própria fonte' },
    mm('altura', 'Altura das letras', 'Tamanho', 50, 40, 75, 1),
    mm('largura', 'Largura máxima', 'Tamanho', 220, 100, 250, 1, 'Nome comprido diminui para caber'),
    mm('profundidade', 'Profundidade', 'Tamanho', 45, 35, 70, 1, 'Da frente das letras às costas'),
    mm('borda', 'Borda em volta das letras', 'Tamanho', 7, 4, 12, 0.5),
    mm('parede', 'Parede', 'Tamanho', 2, 1.6, 3, 0.1),
    { tipo: 'escolha', id: 'textura', rotulo: 'Parede', grupo: 'Textura', padrao: 'canelada', opcoes: [{ valor: 'canelada', rotulo: 'Canelada' }, { valor: 'lisa', rotulo: 'Lisa' }] },
    mm('passo', 'Distância entre os frisos', 'Textura', 1.2, 0.8, 3, 0.1, undefined, (v) => v.textura === 'canelada'),
    mm('relevo', 'Altura dos frisos', 'Textura', 0.4, 0.2, 0.8, 0.05, undefined, (v) => v.textura === 'canelada'),
    mm('espLetras', 'Letras saltadas', 'Encaixe', 2, 1, 4, 0.2, 'Quanto as letras saem da frente'),
    mm('folga', 'Folga das costas e da tampinha', 'Encaixe', 0.2, 0.1, 0.4, 0.05),
    cor('corCorpo', 'Corpo', '#9ca3af'),
    cor('corLetras', 'Letras', '#e8d5b5'),
    cor('corTampa', 'Tampinha', '#9ca3af'),
  ],
  fontes: (v) => [txt(v, 'fonte')],
  gerar(v, ctx): Resultado {
    const cores = ['Corpo', 'Letras', 'Tampinha'], hex = [txt(v, 'corCorpo'), txt(v, 'corLetras'), txt(v, 'corTampa')];
    const digitado = txt(v, 'nome').trim();
    const nome = v.maiusculas === false ? digitado : digitado.toLocaleUpperCase('pt-BR');
    if (!nome) return { itens: [], cores, hex, avisos: ['Digite o nome.'] };
    const fonte = ctx.fonte(txt(v, 'fonte'));
    const borda = num(v, 'borda'), parede = num(v, 'parede'), folga = num(v, 'folga');
    const compor = (altura: number) => comporLinhas([{ texto: nome, fonte, altura, espacamento: num(v, 'espacamento') / 100 }], 0);
    const larguraDe = (altura: number) => compor(altura).bounds.w + 2 * borda;
    let altura = num(v, 'altura');
    const avisos: string[] = [];
    if (larguraDe(altura) > num(v, 'largura')) {
      altura = escalaParaLargura((k) => larguraDe(k), num(v, 'largura'));
      avisos.push(`O nome não cabe em ${num(v, 'largura')} mm: as letras ficaram com ${altura.toFixed(0)} mm de altura.`);
    }
    const t = compor(altura);
    if (!t.letras.length) return { itens: [], cores, hex, avisos: ['Esta fonte não tem as letras do nome.'] };
    const b0 = t.bounds;
    const dx = -(b0.minX + b0.maxX) / 2, dy = -(b0.minY + b0.maxY) / 2;
    const L = translateRegion(t.regiao, dx, dy);
    const S = silhuetaEmPe(t, dx, dy, altura, borda);
    if (S.length > 1) avisos.push('O nome ficou em pedaços separados: diminua o espaço entre letras ou aumente a borda.');
    const bS = regionBounds(S);
    if (bS.w > MESA || bS.h > MESA) avisos.push(`O cofrinho tem ${bS.w.toFixed(0)} mm: passa da mesa de ${MESA} mm.`);

    const espLetras = num(v, 'espLetras') + REBAIXO;
    const H = num(v, 'profundidade') - num(v, 'espLetras') - PLACA_TAMPA; // altura do corpo impresso
    const dentro = contornar(S, -parede);
    if (regionArea(dentro) < regionArea(S) * 0.3) avisos.push('A parede ficou grossa demais para o tamanho do nome.');
    const canelada = txt(v, 'textura') === 'canelada';
    const fora = canelada ? contornar(S, num(v, 'relevo')) : S;

    // Fenda: 30 x 4 mm atravessando a parede de cima, no meio da profundidade do corpo.
    const j = janelaDaFenda(S, FENDA_L + 4);
    const corteFenda = ret(j.cx - FENDA_L / 2, j.topo - parede - 1, j.cx + FENDA_L / 2, bS.maxY + 2);
    const zF0 = FRENTE + (H - FRENTE - FENDA_A) / 2, zF1 = zF0 + FENDA_A;
    const anel = (externo: Region, z0: number, z1: number) => (z1 > zF0 && z0 < zF1 ? diffRegion(diffRegion(externo, dentro), corteFenda) : diffRegion(externo, dentro));

    const corpo: Camada[] = [
      { region: diffRegion(S, contornar(L, FOLGA_LETRAS)), z0: 0, z1: REBAIXO },
      { region: S, z0: REBAIXO, z1: FRENTE },
    ];
    // A parede em faixas: lisa numa faixa so (partida na fenda); canelada alterna a cada meio passo.
    const cortes = [FRENTE, zF0, zF1, H];
    if (canelada) {
      const meio = num(v, 'passo') / 2;
      for (let z = FRENTE + meio; z < H - 1e-6; z += meio) cortes.push(z);
    }
    const zs = [...new Set(cortes.map((z) => Math.round(z * 1e4) / 1e4))].sort((a, b) => a - b);
    for (let i = 0; i + 1 < zs.length; i++) {
      const z0 = zs[i]!, z1 = zs[i + 1]!;
      const friso = canelada && Math.floor((z0 - FRENTE + 1e-6) / (num(v, 'passo') / 2)) % 2 === 1;
      corpo.push({ region: anel(friso ? fora : S, z0, z1), z0, z1 });
    }

    // Costas: placa no contorno com aba que entra justa na parede e o furo da tampinha. O furo
    // fica longe da aba (nao corta o encaixe) e a tampinha inteira cabe dentro do contorno.
    const encaixe = contornar(S, -parede - folga), miolo = contornar(encaixe, -PAREDE_ABA);
    const centro = { x: (bS.minX + bS.maxX) / 2, y: (bS.minY + bS.maxY) / 2 };
    let R = FURO_R, c: Pt | null = null;
    for (const r of [FURO_R, FURO_MIN_R]) {
      c = pontoDentro(intersectRegion(contornar(miolo, -(r + 1)), contornar(S, -(r + ABA_TAMPINHA + LINGUETA + 1))), centro);
      if (c) { R = r; break; }
    }
    if (!c) {
      c = centro;
      avisos.push('O nome ficou baixo demais para a tampinha de trás: aumente a altura das letras.');
    }
    const furo = circulo(c.x, c.y, R, 96), rTampinha = R + ABA_TAMPINHA, aro = circulo(c.x, c.y, rTampinha, 96);
    // Lingueta embaixo da tampinha e, nas costas, um rebaixo sob ela para a unha entrar.
    const lingueta = retanguloArredondado(c.x, c.y - rTampinha, 10, 2 * LINGUETA, 2);
    const unha = contornar(diffRegion(lingueta, aro), 1);
    const costas: Camada[] = [
      { region: diffRegion(diffRegion(S, furo), unha), z0: 0, z1: UNHA },
      { region: diffRegion(S, furo), z0: UNHA, z1: PLACA_TAMPA },
      { region: diffRegion(encaixe, miolo), z0: PLACA_TAMPA, z1: PLACA_TAMPA + ABA },
    ];
    const rPino = R - folga;
    const tampinha: Camada[] = [
      { region: unir([aro, lingueta]), z0: 0, z1: PLACA_TAMPA },
      { region: diffRegion(circulo(c.x, c.y, rPino, 96), circulo(c.x, c.y, rPino - PAREDE_ABA, 96)), z0: PLACA_TAMPA, z1: PLACA_TAMPA + ABA },
    ];
    const letras: Camada[] = [{ region: contornar(L, -FOLGA_LETRAS), z0: 0, z1: espLetras }];

    const itemCorpo: Item = { nome: 'Corpo', pecas: [{ nome: 'Corpo', cor: 0, camadas: corpo }] };
    const itemCostas: Item = { nome: 'Costas', pecas: [{ nome: 'Costas', cor: 0, camadas: costas }] };
    const itemLetras: Item = { nome: 'Letras', pecas: [{ nome: 'Letras', cor: 1, camadas: letras }] };
    const itemTampinha: Item = { nome: 'Tampinha', pecas: [{ nome: 'Tampinha', cor: 2, camadas: tampinha }] };
    const notas = [
      'O corpo imprime de frente na mesa; as letras encaixam no rebaixo da frente (um pingo de cola segura).',
      'As costas entram justas atrás do corpo (com cola ficam fixas); as moedas saem pela tampinha redonda, puxada pela lingueta.',
    ];
    if (v.montado === true) {
      // Pronto, de frente para cima: corpo virado, letras no rebaixo, costas fechando atras e a
      // tampinha no furo delas.
      const pronto = montarJunto({ ...itemCorpo, pecas: [] }, [
        { item: itemCorpo, dz: H, virar: true },
        { item: itemLetras, dz: H - REBAIXO },
        { item: itemCostas, dz: -PLACA_TAMPA },
        { item: itemTampinha, dz: -2 * PLACA_TAMPA },
      ]);
      return soCoresUsadas({ itens: [{ ...pronto, nome }], cores, hex, avisos, notas });
    }
    // Na mesa: uma peca abaixo da outra, sem encostar.
    const vao = 8;
    let topo = bS.minY - vao;
    const abaixo = (it: Item): Item => {
      const b = regionBounds(it.pecas.flatMap((p) => p.camadas.flatMap((cm) => cm.region)));
      const dy = topo - b.maxY;
      topo = b.minY + dy - vao;
      return { ...it, pecas: it.pecas.map((p) => ({ ...p, camadas: p.camadas.map((cm) => ({ ...cm, region: translateRegion(cm.region, 0, dy) })) })) };
    };
    // O corpo imprime de frente na mesa e depois e virado: sai espelhado, para a frente ficar
    // igual as letras e o fundo igual as costas (que imprimem ja do lado em que encaixam).
    const corpoNaMesa: Item = { ...itemCorpo, pecas: itemCorpo.pecas.map((p) => ({ ...p, camadas: p.camadas.map((cm) => ({ ...cm, region: espelharX(cm.region) })) })) };
    const itens = [corpoNaMesa, abaixo(itemCostas), abaixo(itemLetras), abaixo(itemTampinha)];
    return soCoresUsadas({ itens, cores, hex, avisos, notas });
  },
};
