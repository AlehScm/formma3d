/**
 * Formas curvas feitas de camadas: ejetor de cupula (o doce sai abaulado), cumbuca a
 * partir de imagem e suporte de bolo (prato ondulado + pe em sino).
 *
 * Toda curva sai em degraus de camada (0,2-0,3 mm), sempre abrindo no maximo ~50 graus
 * para fora, para imprimir sem suporte.
 */
import { diffRegion, intersectRegion, regionArea, regionBounds, scaleRegion, translateRegion, type Region } from '../../geom/region';
import { circulo, contornar, semBuracos, temEmoji, textoEmArco, unir } from '../formas';
import { emGrade } from '../lote';
import { torneado } from '../solidos';
import { arredondar } from './cortadores';
import { AVISO_EXEMPLO, campoDesenho, campoEixo, desenhoNoTamanho, nomeDoDesenho } from './desenho';
import { ficha } from './fichas';
import type { Camada, Item, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';
import { liga, num, soCoresUsadas, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });

/** Forma `S` (centrada) encolhida para a camada: por escala ou por recuo do contorno. */
function encolhida(S: Region, quanto: number, porEscala: boolean): Region {
  if (porEscala) {
    const b = regionBounds(S), lado = Math.max(b.w, b.h);
    const k = Math.max(0.02, 1 - (2 * quanto) / lado);
    return scaleRegion(S, k);
  }
  return contornar(S, -quanto);
}

/**
 * Ejetor de cupula: casca (tubo no contorno do desenho, cantos suavizados) e embolo que
 * corre dentro dela com o topo cavado em cupula -- o doce sai com o topo abaulado.
 */
export const ejetorCupula: Receita = {
  ...ficha('ejetor-cupula'),
  parametros: [
    campoDesenho('Forma do doce'),
    { tipo: 'escolha', id: 'metodo', rotulo: 'Como a cúpula fecha', grupo: 'Desenho', padrao: 'recuo', opcoes: [{ valor: 'recuo', rotulo: 'Recuando o contorno' }, { valor: 'escala', rotulo: 'Escalando a forma' }], dica: 'Escala mantém a forma até o topo; recuo arredonda as pontas' },
    mm('tamanho', 'Tamanho do doce', 'Desenho', 31, 15, 60, 0.5, 'Lado maior'),
    mm('profundidade', 'Altura da cúpula', 'Desenho', 10, 2, 25, 0.5),
    { tipo: 'numero', id: 'curva', rotulo: 'Curva da cúpula', grupo: 'Desenho', padrao: 2, min: 1, max: 4, passo: 0.1, dica: 'Maior = mais redonda no alto' },
    mm('borda', 'Borda do embolo', 'Desenho', 0.6, 0.4, 2, 0.1, 'Aro fino em volta da cúpula'),
    { tipo: 'liga', id: 'mostrarDesenho', rotulo: 'Linhas do desenho na cúpula', grupo: 'Desenho', padrao: false, dica: 'As linhas da imagem viram frisos dentro da cúpula e marcam o doce' },
    mm('larguraLinhas', 'Largura das linhas', 'Desenho', 1.2, 0.6, 4, 0.1, undefined, (v) => v.mostrarDesenho === true),
    mm('altLinhas', 'Altura dos frisos', 'Desenho', 1.2, 0.4, 4, 0.1, undefined, (v) => v.mostrarDesenho === true),
    mm('folga', 'Folga entre casca e êmbolo', 'Medidas', 0.4, 0.2, 3, 0.05),
    mm('alturaEjetor', 'Altura do êmbolo', 'Medidas', 35, 15, 60, 1),
    mm('alturaCasca', 'Altura da casca', 'Medidas', 35, 15, 60, 1),
    mm('espCasca', 'Espessura da casca', 'Medidas', 1.2, 0.6, 3, 0.1),
    mm('suavizar', 'Suavizar a casca', 'Medidas', 3, 0, 10, 0.1, 'Arredonda os cantos de fora'),
    cor('corBase', 'Casca', '#a85f78'),
    cor('corTopo', 'Êmbolo', '#c98fa3'),
  ],
  gerar(v): Resultado {
    const cores = ['Casca', 'Êmbolo'], hex = [txt(v, 'corBase'), txt(v, 'corTopo')];
    const avisos: string[] = [];
    const d = desenhoNoTamanho(v, 'desenho', num(v, 'tamanho'));
    if (d.exemplo) avisos.push(AVISO_EXEMPLO);
    const S = semBuracos(d.regiao);
    if (!regionArea(S)) return { itens: [], cores, hex, avisos: ['O desenho não tem área.'] };
    if (S.length > 1) avisos.push('O desenho tem partes soltas: use uma forma fechada só.');
    const folga = num(v, 'folga'), ec = num(v, 'espCasca');
    // Casca: tubo da forma + folga, parede ec, cantos de fora suavizados.
    const dentroCasca = contornar(S, folga);
    const foraCasca = arredondar(contornar(dentroCasca, ec), num(v, 'suavizar'));
    const casca: Peca = { nome: 'Casca', cor: 0, camadas: [{ region: diffRegion(foraCasca, dentroCasca), z0: 0, z1: num(v, 'alturaCasca') }] };
    // Embolo: a forma; no topo, a cupula cavada (cada camada um pouco menor descendo).
    const H = num(v, 'alturaEjetor'), P = Math.min(num(v, 'profundidade'), H - 3), bw = num(v, 'borda');
    const k = num(v, 'curva'), porEscala = txt(v, 'metodo') === 'escala';
    const b = regionBounds(S), maxRecuo = Math.min(b.w, b.h) / 2 - bw;
    const camadas: Camada[] = [{ region: S, z0: 0, z1: H - P }];
    const n = Math.max(4, Math.round(P / 0.2));
    // Linhas do desenho dentro da cupula: frisos que sobem `altLinhas` acima da superficie
    // dela (o doce sai com o desenho marcado), alinhados com a forma da casca.
    const L = liga(v, 'mostrarDesenho') ? linhasDoDesenho(d.regiao, num(v, 'larguraLinhas')) : [];
    const k2 = Math.max(1, Math.round(num(v, 'altLinhas') / (P / n)));
    const cavs: Region[] = [];
    for (let i = 0; i < n; i++) {
      // t: 0 no fundo da cupula, 1 na boca. A meia largura da cavidade segue um quarto de
      // superelipse (k = 2 e um arco de elipse): fundo redondo, parede quase reta na boca.
      const t = (i + 0.5) / n;
      const largura = Math.pow(1 - Math.pow(1 - t, k), 1 / k);
      const recuo = bw + maxRecuo * (1 - largura) * 0.98;
      let cav = encolhida(S, recuo, porEscala);
      cavs.push(cav);
      // Friso: ponto da linha que virou cavidade ha menos de k2 camadas continua cheio.
      const antes = i - k2 >= 0 ? cavs[i - k2]! : [];
      if (L.length && regionArea(cav) > 0.05) cav = diffRegion(cav, diffRegion(L, antes));
      camadas.push({ region: regionArea(cav) > 0.05 ? diffRegion(S, cav) : S, z0: H - P + (P * i) / n, z1: H - P + (P * (i + 1)) / n });
    }
    const itens: Item[] = [
      { nome: nomeDoDesenho(v, 'desenho') ? `Casca ${nomeDoDesenho(v, 'desenho')}` : 'Casca', pecas: [casca] },
      { nome: 'Êmbolo', pecas: [{ nome: 'Êmbolo', cor: 1, camadas }] },
    ];
    return {
      itens: emGrade(itens, 2, 8), cores, hex, avisos,
      notas: ['Encha a casca com o doce, aperte o êmbolo por baixo e empurre: o doce sai com o topo em cúpula.'],
    };
  },
};

/**
 * Cumbuca a partir de imagem: o contorno da imagem e a boca; descendo, o contorno recua
 * numa curva ate o fundo (que fica menor), com a casca de espessura fixa e o desenho no
 * fundo, por dentro.
 */
export const cumbuca: Receita = {
  ...ficha('cumbuca'),
  parametros: [
    campoDesenho('Imagem (contorno da boca)'),
    mm('tamanho', 'Tamanho', 'Cumbuca', 160, 40, 220, 1, 'Lado maior da boca'),
    { ...campoEixo, grupo: 'Cumbuca' } as Parametro,
    mm('altura', 'Altura', 'Cumbuca', 40, 10, 80, 1),
    mm('casca', 'Espessura da casca', 'Cumbuca', 1.6, 0.8, 4, 0.1),
    { tipo: 'numero', id: 'curva', rotulo: 'Curva', grupo: 'Cumbuca', padrao: 2.6, min: 1.2, max: 5, passo: 0.1, dica: 'Maior = parede mais reta perto da boca' },
    { tipo: 'liga', id: 'desenhoFundo', rotulo: 'Desenho no fundo', grupo: 'Fundo', padrao: true, dica: 'A imagem em relevo no fundo, por dentro' },
    mm('altDesenho', 'Altura do desenho', 'Fundo', 0.8, 0.2, 3, 0.1, undefined, (v) => v.desenhoFundo === true),
    mm('tirarBorda', 'Tirar borda do desenho', 'Fundo', 0, 0, 10, 0.1, undefined, (v) => v.desenhoFundo === true),
    { tipo: 'liga', id: 'inverter', rotulo: 'Inverter o desenho', grupo: 'Fundo', padrao: false, visivel: (v) => v.desenhoFundo === true },
    cor('corCumbuca', 'Cumbuca', '#c8a2c8'),
    cor('corDesenho', 'Desenho', '#ffffff'),
  ],
  gerar(v): Resultado {
    const cores = ['Cumbuca', 'Desenho'], hex = [txt(v, 'corCumbuca'), txt(v, 'corDesenho')];
    const avisos: string[] = [];
    const d = desenhoNoTamanho(v, 'desenho', num(v, 'tamanho'), txt(v, 'eixo') === 'altura' ? 'altura' : 'largura');
    if (d.exemplo) avisos.push(AVISO_EXEMPLO);
    const boca = semBuracos(d.regiao);
    if (!regionArea(boca)) return { itens: [], cores, hex, avisos: ['O desenho não tem área.'] };
    if (boca.length > 1) avisos.push('A imagem tem partes soltas: a cumbuca sai em pedaços. Use uma forma fechada.');
    const H = num(v, 'altura'), e = num(v, 'casca'), k = num(v, 'curva');
    const b = regionBounds(boca);
    // Recuo maximo do fundo: no maximo 1 mm por mm de altura na media (sem suporte) e
    // sem fechar a forma.
    const recuoMax = Math.min(Math.min(b.w, b.h) * 0.3, H * 0.6);
    const passo = 0.3, n = Math.round(H / passo);
    const camadas: Camada[] = [];
    let fundo: Region = [];
    let anterior = recuoMax;
    for (let i = 0; i < n; i++) {
      const z0 = (H * i) / n, z1 = (H * (i + 1)) / n, t = (i + 0.5) / n;
      // Recuo: maximo no fundo (t = 0), zero na boca (t = 1), curva de superelipse.
      // A curva perto do fundo e quase deitada: limita o quanto a parede abre por camada
      // (50 graus), virando um chanfro ali, para nao ficar no ar.
      const curva = recuoMax * (1 - Math.pow(1 - Math.pow(1 - t, k), 1 / k));
      const recuo = Math.max(curva, anterior - (z1 - z0) * Math.tan((50 * Math.PI) / 180));
      anterior = recuo;
      const fora = recuo > 0.01 ? contornar(boca, -recuo) : boca;
      if (!fundo.length) fundo = fora;
      camadas.push({ region: z1 <= e + 1e-9 ? fora : diffRegion(fora, contornar(fora, -e)), z0, z1 });
    }
    const pecas: Peca[] = [{ nome: 'Cumbuca', cor: 0, camadas }];
    if (liga(v, 'desenhoFundo')) {
      let des = d.regiao;
      const tb = num(v, 'tirarBorda');
      if (tb > 0) des = intersectRegion(des, contornar(semBuracos(des), -tb));
      if (liga(v, 'inverter')) des = diffRegion(boca, des);
      // O desenho cabe no fundo: escala para dentro do fundo com 2 mm de folga.
      const fb = regionBounds(fundo), db = regionBounds(des);
      const kk = Math.min((fb.w - 4) / db.w, (fb.h - 4) / db.h, 1);
      des = intersectRegion(scaleRegion(translateRegion(des, -(db.minX + db.maxX) / 2, -(db.minY + db.maxY) / 2), kk), contornar(fundo, -2));
      const zf = camadas.filter((c) => c.z1 <= e + 1e-9).at(-1)?.z1 ?? e;
      if (regionArea(des) > 0.5) pecas.push({ nome: 'Desenho', cor: 1, camadas: [{ region: des, z0: zf, z1: zf + num(v, 'altDesenho') }] });
    }
    return soCoresUsadas({ itens: [{ nome: nomeDoDesenho(v, 'desenho') || 'Cumbuca', pecas }], cores, hex, avisos, notas: ['Imprima com o fundo na mesa.'] });
  },
};

/** Prato com borda de ondas (circulos em volta) de raio R. */
function pratoOndulado(R: number, ondas: number): Region {
  const w = (2 * Math.PI * R) / ondas, r = w / 2;
  const discos = Array.from({ length: ondas }, (_, i) => {
    const a = (2 * Math.PI * i) / ondas;
    return circulo((R - r) * Math.cos(a), (R - r) * Math.sin(a), r, 32);
  });
  return unir([circulo(0, 0, R - r, 180), ...discos]);
}

/**
 * Suporte de bolo: prato com borda ondulada, um friso em volta e o nome em arco na
 * frente; pe em sino oco, que afina da base ate o topo onde o prato assenta.
 */
export const suporteBolo: Receita = {
  ...ficha('suporte-bolo'),
  parametros: [
    { tipo: 'texto', id: 'nome', rotulo: 'Nome', grupo: 'Prato', padrao: '@formma3d', maxCaracteres: 30, dica: 'Em arco na borda do prato; vazio = sem nome' },
    { tipo: 'fonte', id: 'fonte', rotulo: 'Fonte', grupo: 'Prato', padrao: 'cal-sans' },
    mm('alturaNome', 'Altura das letras', 'Prato', 12, 4, 30, 0.5),
    mm('diametroTopo', 'Diâmetro do prato', 'Prato', 245, 120, 320, 1),
    mm('espTopo', 'Espessura do prato', 'Prato', 5, 2, 12, 0.5),
    { tipo: 'numero', id: 'ondas', rotulo: 'Ondas na borda', grupo: 'Prato', padrao: 20, min: 0, max: 40, passo: 1, dica: '0 = borda lisa' },
    mm('friso', 'Largura do friso', 'Prato', 4, 0, 10, 0.1, '0 = sem friso'),
    mm('recuoFriso', 'Distância do friso à borda', 'Prato', 10, 2, 30, 0.5),
    mm('diametroBase', 'Diâmetro do pé (embaixo)', 'Pé', 170, 60, 220, 1),
    mm('diametroFinal', 'Diâmetro do pé (em cima)', 'Pé', 50, 20, 120, 1),
    mm('altura', 'Altura do pé', 'Pé', 100, 20, 200, 1),
    { tipo: 'numero', id: 'curva', rotulo: 'Curva do pé', grupo: 'Pé', padrao: 2, min: 1, max: 4, passo: 0.1 },
    mm('parede', 'Parede do pé', 'Pé', 2.4, 1.2, 6, 0.1),
    cor('corTopo', 'Prato', '#ffffff'),
    cor('corBase', 'Pé', '#ffc1e3'),
  ],
  fontes: (v) => (String(v.nome ?? '').trim() ? [String(v.fonte), ...(temEmoji(String(v.nome)) ? ['noto-emoji'] : [])] : []),
  gerar(v, ctx): Resultado {
    const cores = ['Prato', 'Pé'], hex = [txt(v, 'corTopo'), txt(v, 'corBase')];
    const avisos: string[] = [];
    const R = num(v, 'diametroTopo') / 2, et = num(v, 'espTopo');
    const prato = num(v, 'ondas') > 0 ? pratoOndulado(R, num(v, 'ondas')) : circulo(0, 0, R, 240);
    const pecasPrato: Peca[] = [{ nome: 'Prato', cor: 0, camadas: [{ region: prato, z0: 0, z1: et }] }];
    const fr = num(v, 'friso'), rf = R - num(v, 'recuoFriso');
    const relevo: Region[] = [];
    if (fr > 0) relevo.push(diffRegion(circulo(0, 0, rf, 240), circulo(0, 0, rf - fr, 240)));
    const nome = txt(v, 'nome').trim();
    if (nome) {
      const h = num(v, 'alturaNome');
      const base = rf - fr - 3 - h;
      // Mede o arco, depois gira para o meio dele ficar no alto (0 graus).
      const t = textoEmArco({ texto: nome, fonte: ctx.fonte(txt(v, 'fonte')), altura: h, reserva: temEmoji(nome) ? ctx.fonte('noto-emoji') : undefined }, base, 0);
      // No fundo do prato (0 graus, lado de la): quem olha de frente le direito.
      const giro = 360 - t.graus / 2;
      const arco = textoEmArco({ texto: nome, fonte: ctx.fonte(txt(v, 'fonte')), altura: h, reserva: temEmoji(nome) ? ctx.fonte('noto-emoji') : undefined }, base, giro).regiao;
      if (t.graus > 300) avisos.push('O nome dá quase uma volta: diminua as letras.');
      relevo.push(arco);
    }
    if (relevo.length) pecasPrato.push({ nome: 'Friso e nome', cor: 1, camadas: [{ region: unir(relevo), z0: et, z1: et + 0.8 }] });
    // Pe em sino: raio do fundo ao topo numa curva (afina subindo: nunca fica no ar).
    const Hp = num(v, 'altura'), rb = num(v, 'diametroBase') / 2, rt = num(v, 'diametroFinal') / 2, k = num(v, 'curva'), pw = num(v, 'parede');
    if (rt >= rb) avisos.push('O pé precisa ser mais largo embaixo que em cima.');
    // Curva de potencia: a base sai com o diametro pedido e o pe afina ate o topo.
    const raio = (z: number) => rt + (rb - rt) * Math.pow(1 - z / Hp, k);
    const fora = torneado(raio, 0, Hp, 0.3, 160);
    // Oco e aberto em cima (o prato apoia no aro): sem teto em ponte.
    const pe: Camada[] = fora.map((c) => {
      const r = regionBounds(c.region).w / 2;
      return { ...c, region: diffRegion(c.region, circulo(0, 0, Math.max(0.5, r - pw), 160)) };
    });
    const itens: Item[] = [
      { nome: 'Prato', pecas: pecasPrato },
      { nome: 'Pé', pecas: [{ nome: 'Pé', cor: 1, camadas: pe }] },
    ];
    return soCoresUsadas({
      itens: emGrade(itens, 2, 10), cores, hex, avisos,
      notas: ['O pé imprime em pé, oco, com a boca larga na mesa. Cole o prato no topo do pé.'],
    });
  },
};

/** Linhas de um desenho (para frisos): a borda de cada area, com a largura `w`. */
function linhasDoDesenho(D: Region, w: number): Region {
  return diffRegion(contornar(D, w / 2), contornar(D, -w / 2));
}
