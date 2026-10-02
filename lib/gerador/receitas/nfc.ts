/**
 * Chaveiros com etiqueta NFC embutida (forma pronta + desenho, carretel de filamento) e
 * abridor de latas com desenho (com ou sem NFC).
 *
 * O bolsao do NFC fica fechado dentro da peca: a impressao pausa no fim do bolsao para
 * colocar a etiqueta, e a nota diz a altura. O simbolo de NFC do verso e desenho nosso
 * (tres ondas), embutido na face de baixo e espelhado.
 */
import { diffRegion, intersectRegion, regionArea, regionBounds, rotateRegion, translateRegion, strokeToRegion, type Pt, type Region } from '../../geom/region';
import { circulo, contornar, coracao, estrela, retanguloArredondado, semBuracos, unir } from '../formas';
import { espelharX, regular } from '../figuras';
import { argolaNaDirecao } from '../lote';
import { comVazios, torneado, type Vazio } from '../solidos';
import { AVISO_EXEMPLO, campoDesenho, desenhoNoTamanho, nomeDoDesenho } from './desenho';
import { ficha } from './fichas';
import type { Camada, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';
import { liga, num, soCoresUsadas, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });
const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Simbolo de NFC nosso: tres ondas concentricas e um ponto, largura `w`, centrado. */
export function simboloNfc(w: number): Region {
  const e = w * 0.09, arcos: { pts: Pt[]; closed: boolean }[] = [];
  for (let k = 1; k <= 3; k++) {
    const r = (w * 0.16 * k), pts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = -Math.PI / 4 + (Math.PI / 2) * (i / 24);
      pts.push({ x: -w * 0.32 + r * Math.cos(a), y: r * Math.sin(a) });
    }
    arcos.push({ pts, closed: false });
  }
  return unir([strokeToRegion(arcos, e, true), circulo(-w * 0.32, 0, e * 0.9, 24)]);
}

const campoNfc = (padraoD: number, padraoE: number): Parametro[] => [
  { tipo: 'liga', id: 'nfc', rotulo: 'Bolsão para NFC', grupo: 'NFC', padrao: true, dica: 'Etiqueta redonda embutida; a impressão pausa para colocá-la' },
  mm('dNfc', 'Diâmetro da etiqueta', 'NFC', padraoD, 10, 40, 0.5, 'Use 1 mm a mais que a etiqueta', (v) => v.nfc === true),
  mm('espNfc', 'Espessura da etiqueta', 'NFC', padraoE, 0.4, 1.5, 0.05, 'Adesivo ~0,6 mm; etiqueta grossa ~1,2 mm', (v) => v.nfc === true),
];

/** Bolsao do NFC: comeca a `cobertura` mm do topo. Devolve o vazio e a nota da pausa. */
function bolsao(v: Valores, cx: number, cy: number, topo: number, cobertura = 1): { vazio: Vazio; nota: string } {
  const en = num(v, 'espNfc'), z1 = topo - cobertura, z0 = z1 - en;
  return {
    vazio: { regiao: circulo(cx, cy, num(v, 'dNfc') / 2, 96), z0, z1 },
    nota: `Pause a impressão na altura ${fmt(z1)} mm (fim do bolsão), coloque a etiqueta NFC e continue.`,
  };
}

function formaChaveiro(v: Valores): Region {
  const W = num(v, 'largura');
  switch (txt(v, 'forma')) {
    case 'circulo': return circulo(0, 0, W / 2, 128);
    case 'coracao': return coracao(W);
    case 'hexagono': return regular(6, W, 0);
    case 'estrela': return estrela(W);
    case 'dodecagono': return regular(12, W);
    default: return retanguloArredondado(0, 0, W, num(v, 'altura'), Math.min(num(v, 'raio'), W / 2, num(v, 'altura') / 2));
  }
}

const DIRECOES: Record<string, [number, number]> = { topo: [0, 1], cantoEsq: [-Math.SQRT1_2, Math.SQRT1_2], cantoDir: [Math.SQRT1_2, Math.SQRT1_2] };

/**
 * Chaveiro NFC: forma pronta com o seu desenho em relevo, borda opcional (para resina),
 * argola mais fina que o corpo e simbolo de NFC (ou outro desenho) embaixo.
 */
export const chaveiroNfc: Receita = {
  ...ficha('chaveiro-nfc'),
  parametros: [
    {
      tipo: 'escolha', id: 'forma', rotulo: 'Formato', grupo: 'Chaveiro', padrao: 'quadrado',
      opcoes: [{ valor: 'quadrado', rotulo: 'Quadrado' }, { valor: 'circulo', rotulo: 'Círculo' }, { valor: 'coracao', rotulo: 'Coração' },
        { valor: 'hexagono', rotulo: 'Hexágono' }, { valor: 'estrela', rotulo: 'Estrela' }, { valor: 'dodecagono', rotulo: '12 lados' }],
    },
    mm('largura', 'Largura', 'Chaveiro', 32, 20, 70, 1),
    mm('altura', 'Altura', 'Chaveiro', 32, 20, 70, 1, undefined, (v) => v.forma === 'quadrado'),
    mm('raio', 'Cantos arredondados', 'Chaveiro', 5, 0, 15, 0.5, undefined, (v) => v.forma === 'quadrado'),
    mm('espessura', 'Espessura', 'Chaveiro', 4, 2.4, 8),
    ...campoNfc(26, 0.6),
    {
      tipo: 'escolha', id: 'argola', rotulo: 'Argola', grupo: 'Argola', padrao: 'cantoDir',
      opcoes: [{ valor: 'cantoDir', rotulo: 'Canto direito' }, { valor: 'cantoEsq', rotulo: 'Canto esquerdo' }, { valor: 'topo', rotulo: 'Em cima' }, { valor: 'nenhuma', rotulo: 'Sem argola' }],
    },
    mm('furo', 'Furo da argola', 'Argola', 3.6, 2, 8, 0.1, undefined, (v) => v.argola !== 'nenhuma'),
    mm('aro', 'Largura do aro', 'Argola', 1.8, 0.8, 5, 0.1, undefined, (v) => v.argola !== 'nenhuma'),
    mm('espArgola', 'Espessura da argola', 'Argola', 2, 1, 8, 0.1, undefined, (v) => v.argola !== 'nenhuma'),
    { tipo: 'liga', id: 'borda', rotulo: 'Borda elevada', grupo: 'Borda', padrao: true, dica: 'Ótima para pôr resina por cima' },
    mm('largBorda', 'Largura da borda', 'Borda', 1, 0.4, 4, 0.1, undefined, (v) => v.borda === true),
    mm('altBorda', 'Altura da borda', 'Borda', 0.8, 0.2, 4, 0.1, undefined, (v) => v.borda === true),
    campoDesenho(),
    mm('tamDesenho', 'Tamanho do desenho', 'Desenho', 20, 5, 60, 0.5),
    { tipo: 'numero', id: 'giro', rotulo: 'Giro do desenho', grupo: 'Desenho', padrao: 0, min: 0, max: 360, passo: 1, unidade: '°' },
    mm('x', 'Posição X', 'Desenho', 0, -30, 30, 0.5),
    mm('y', 'Posição Y', 'Desenho', 0, -30, 30, 0.5),
    mm('espDesenho', 'Altura do desenho', 'Desenho', 1, 0.2, 3),
    {
      tipo: 'escolha', id: 'verso', rotulo: 'Embaixo', grupo: 'Verso', padrao: 'nfc',
      opcoes: [{ valor: 'nfc', rotulo: 'Símbolo de NFC' }, { valor: 'desenho', rotulo: 'Outro desenho' }, { valor: 'nada', rotulo: 'Nada' }],
    },
    { ...campoDesenho('Desenho de baixo'), id: 'desenhoVerso', grupo: 'Verso', visivel: (v: Valores) => v.verso === 'desenho' },
    mm('tamVerso', 'Tamanho embaixo', 'Verso', 18, 5, 60, 0.5, undefined, (v) => v.verso !== 'nada'),
    cor('corBase', 'Chaveiro', '#4a1f2e'),
    cor('corBorda', 'Borda', '#ffffff'),
    cor('corDesenho', 'Desenho', '#ffffff'),
    cor('corVerso', 'Símbolo embaixo', '#ffffff'),
  ],
  gerar(v): Resultado {
    const cores = ['Chaveiro', 'Borda', 'Desenho', 'Embaixo'], hex = [txt(v, 'corBase'), txt(v, 'corBorda'), txt(v, 'corDesenho'), txt(v, 'corVerso')];
    const avisos: string[] = [], notas: string[] = [];
    const S = formaChaveiro(v), T = num(v, 'espessura');
    const b = regionBounds(S);
    const vazios: Vazio[] = [];
    const pecas: Peca[] = [];
    // Verso embutido rente a face de baixo.
    let verso: Region = [];
    if (txt(v, 'verso') === 'nfc') verso = simboloNfc(num(v, 'tamVerso'));
    else if (txt(v, 'verso') === 'desenho') {
      const d = desenhoNoTamanho(v, 'desenhoVerso', num(v, 'tamVerso'));
      if (d.exemplo) avisos.push('Escolha a imagem de baixo.');
      else verso = d.regiao;
    }
    verso = intersectRegion(espelharX(verso), contornar(S, -1));
    const ev = 0.4;
    if (regionArea(verso) > 0.1) {
      vazios.push({ regiao: verso, z0: 0, z1: ev });
      pecas.push({ nome: 'Embaixo', cor: 3, camadas: [{ region: verso, z0: 0, z1: ev }] });
    }
    if (liga(v, 'nfc')) {
      const { vazio, nota } = bolsao(v, (b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, T);
      if (regionArea(diffRegion(vazio.regiao, contornar(S, -1))) > 0.5) avisos.push('A etiqueta NFC não cabe neste formato: aumente o chaveiro.');
      if (vazio.z0 < ev + 0.4) avisos.push('O chaveiro é fino demais para o NFC: aumente a espessura.');
      vazios.push(vazio);
      notas.push(nota);
    }
    // Corpo: a argola so vai ate a espessura dela.
    const lado = txt(v, 'argola');
    let camadas: Camada[];
    if (lado !== 'nenhuma') {
      const [dx, dy] = DIRECOES[lado] ?? [0, 1];
      const a = argolaNaDirecao(S, dx, dy, num(v, 'furo'), num(v, 'aro'));
      const ea = Math.min(num(v, 'espArgola'), T);
      camadas = [...comVazios(diffRegion(unir([S, a.disco]), a.furo), 0, ea, vazios), ...comVazios(diffRegion(S, a.furo), ea, T, vazios)];
    } else camadas = comVazios(S, 0, T, vazios);
    pecas.unshift({ nome: 'Chaveiro', cor: 0, camadas });
    const lb = num(v, 'largBorda');
    const miolo = liga(v, 'borda') ? contornar(S, -lb) : contornar(S, -0.8);
    if (liga(v, 'borda')) pecas.push({ nome: 'Borda', cor: 1, camadas: [{ region: diffRegion(S, miolo), z0: T, z1: T + num(v, 'altBorda') }] });
    const d = desenhoNoTamanho(v, 'desenho', num(v, 'tamDesenho'));
    if (d.exemplo) avisos.push(AVISO_EXEMPLO);
    const D = translateRegion(rotateRegion(d.regiao, num(v, 'giro')), num(v, 'x') + (b.minX + b.maxX) / 2, num(v, 'y') + (b.minY + b.maxY) / 2);
    const des = intersectRegion(D, liga(v, 'borda') ? contornar(miolo, -0.4) : miolo);
    if (regionArea(diffRegion(D, miolo)) > 0.5) avisos.push('O desenho passa da borda: diminua ou mova o desenho.');
    if (regionArea(des) > 0.1) pecas.push({ nome: 'Desenho', cor: 2, camadas: [{ region: des, z0: T, z1: T + num(v, 'espDesenho') }] });
    return soCoresUsadas({ itens: [{ nome: nomeDoDesenho(v, 'desenho') || 'Chaveiro NFC', pecas }], cores, hex, avisos, notas });
  },
};

/**
 * Chaveiro carretel de filamento: aba de baixo com o NFC embutido e a argola, cubo, o
 * "filamento enrolado" (fios redondos empilhados, em degraus) e a aba de cima, que
 * encaixa no cubo com folga.
 */
export const chaveiroCarretel: Receita = {
  ...ficha('chaveiro-carretel'),
  parametros: [
    mm('diametro', 'Diâmetro do carretel', 'Carretel', 32, 20, 60, 0.5),
    mm('altFilamento', 'Altura do filamento', 'Carretel', 10, 4, 30, 0.5),
    mm('fio', 'Espessura do fio', 'Carretel', 1.2, 0.6, 3, 0.1),
    mm('espBase', 'Espessura das abas', 'Carretel', 1.6, 1, 4),
    mm('encaixe', 'Altura do encaixe', 'Carretel', 3, 1.5, 6, 0.5),
    mm('folga', 'Folga do encaixe', 'Carretel', 0.14, 0.05, 0.5, 0.01),
    ...campoNfc(25, 0.8),
    { tipo: 'liga', id: 'indicador', rotulo: 'Símbolo de NFC embaixo', grupo: 'NFC', padrao: true, visivel: (v) => v.nfc === true },
    mm('furo', 'Furo da argola', 'Argola', 3.4, 2, 6),
    cor('corBase', 'Carretel', '#222222'),
    cor('corFilamento', 'Filamento', '#ff69b4'),
    cor('corIndicador', 'Símbolo NFC', '#ffffff'),
  ],
  gerar(v): Resultado {
    const cores = ['Carretel', 'Filamento', 'Símbolo NFC'], hex = [txt(v, 'corBase'), txt(v, 'corFilamento'), txt(v, 'corIndicador')];
    const avisos: string[] = [], notas: string[] = [];
    const R = num(v, 'diametro') / 2, eb = num(v, 'espBase'), hf = num(v, 'altFilamento'), fio = num(v, 'fio');
    const rh = R * 0.42, rp = rh - 1.2, ae = Math.min(num(v, 'encaixe'), hf - 0.6), folga = num(v, 'folga');
    const nfc = liga(v, 'nfc');
    if (nfc && num(v, 'dNfc') / 2 > R - 1) avisos.push('A etiqueta NFC é maior que o carretel: aumente o diâmetro.');
    // Aba de baixo: com NFC, fica mais grossa para o bolsao ficar fechado.
    const tf = nfc ? Math.max(eb, 0.4 + 0.4 + num(v, 'espNfc') + 0.8) : eb;
    const aba = circulo(0, 0, R, 128);
    const a = argolaNaDirecao(aba, 0, 1, num(v, 'furo'), 1.6);
    const vazios: Vazio[] = [];
    const pecas: Peca[] = [];
    if (nfc) {
      const { vazio, nota } = bolsao(v, 0, 0, tf, 0.8);
      vazios.push(vazio);
      notas.push(nota);
      if (liga(v, 'indicador')) {
        const ind = espelharX(simboloNfc(R * 0.9));
        vazios.push({ regiao: ind, z0: 0, z1: 0.4 });
        pecas.push({ nome: 'Símbolo NFC', cor: 2, camadas: [{ region: ind, z0: 0, z1: 0.4 }] });
      }
    }
    const cubo = circulo(0, 0, rh, 96), soquete = circulo(0, 0, rp + folga, 96);
    const topoCubo = tf + hf;
    pecas.unshift({
      nome: 'Carretel', cor: 0,
      camadas: [
        ...comVazios(diffRegion(unir([aba, a.disco]), a.furo), 0, tf, vazios),
        { region: cubo, z0: tf, z1: topoCubo - ae },
        { region: diffRegion(cubo, soquete), z0: topoCubo - ae, z1: topoCubo },
      ],
    });
    // Fio enrolado: cada volta e um meio-circulo de raio fio/2 para fora.
    const Rf = R - 1.2, r = fio / 2;
    const raio = (z: number) => {
      const dz = ((z - tf) % fio) - r;
      return Rf - r + Math.sqrt(Math.max(0, r * r - dz * dz));
    };
    const filamento = torneado(raio, tf, topoCubo, 0.2, 96).map((c) => ({ ...c, region: diffRegion(c.region, cubo) }));
    pecas.push({ nome: 'Filamento', cor: 1, camadas: filamento });
    const tampa: Peca = {
      nome: 'Tampa', cor: 0,
      camadas: [{ region: aba, z0: 0, z1: eb }, { region: circulo(0, 0, rp, 96), z0: eb, z1: eb + ae - 0.2 }],
    };
    return {
      itens: [{ nome: 'Carretel', pecas }, { nome: 'Tampa', pecas: [{ ...tampa, camadas: tampa.camadas.map((c) => ({ ...c, region: translateRegion(c.region, 2 * R + 8, 0) })) }] }],
      cores, hex, avisos,
      notas: [...notas, 'Encaixe o pino da tampa no cubo do carretel (aperta; uma gota de cola segura de vez).'],
    };
  },
};

/**
 * Abridor de latas: o seu desenho num chaveiro grosso com uma caixa que tem um tunel
 * aberto para fora -- a aba da lata entra no tunel e alavanca. Com NFC opcional.
 */
export const abridorLatas: Receita = {
  ...ficha('abridor-latas'),
  parametros: [
    campoDesenho(),
    mm('tamanho', 'Tamanho do desenho', 'Desenho', 40, 20, 120, 1),
    mm('margem', 'Margem do corpo', 'Desenho', 3, 1, 10, 0.5),
    mm('espDesenho', 'Altura do desenho', 'Desenho', 1, 0.2, 3),
    mm('espessura', 'Espessura', 'Corpo', 6.4, 5, 10),
    mm('largCaixa', 'Largura da caixa', 'Abridor', 28, 22, 50, 0.5),
    mm('fundoCaixa', 'Profundidade da caixa', 'Abridor', 16, 12, 30, 0.5),
    mm('alturaInicial', 'Piso do túnel', 'Abridor', 0.8, 0.4, 2, 0.1, 'Espessura embaixo do túnel'),
    mm('alturaTunel', 'Altura do túnel', 'Abridor', 2.6, 1.6, 4, 0.1),
    { tipo: 'liga', id: 'alivio', rotulo: 'Entrada arredondada', grupo: 'Abridor', padrao: true, dica: 'Recorte redondo em cima da entrada, para o dedo e a aba' },
    { tipo: 'numero', id: 'giro', rotulo: 'Giro do abridor', grupo: 'Abridor', padrao: 0, min: -180, max: 180, passo: 1, unidade: '°' },
    mm('x', 'Posição X do abridor', 'Abridor', 0, -60, 60, 0.5),
    mm('y', 'Posição Y do abridor', 'Abridor', 0, -60, 60, 0.5),
    { tipo: 'liga', id: 'argola', rotulo: 'Argola', grupo: 'Argola', padrao: true },
    mm('furo', 'Furo da argola', 'Argola', 3.6, 2, 8, 0.1, undefined, (v) => v.argola === true),
    mm('espArgola', 'Espessura da argola', 'Argola', 2, 1, 8, 0.1, undefined, (v) => v.argola === true),
    ...campoNfc(25, 0.8).map((p) => (p.id === 'nfc' ? { ...p, padrao: false } as Parametro : p)),
    cor('corBase', 'Corpo', '#4a1f2e'),
    cor('corDesenho', 'Desenho', '#ffffff'),
  ],
  gerar(v): Resultado {
    const cores = ['Corpo', 'Desenho'], hex = [txt(v, 'corBase'), txt(v, 'corDesenho')];
    const avisos: string[] = [], notas: string[] = [];
    const { regiao: D, exemplo } = desenhoNoTamanho(v, 'desenho', num(v, 'tamanho'));
    if (exemplo) avisos.push(AVISO_EXEMPLO);
    const corpo = semBuracos(contornar(D, num(v, 'margem')));
    const b = regionBounds(corpo), T = num(v, 'espessura');
    // Caixa encostada embaixo do corpo (entrando 3 mm nele); tunel aberto para baixo.
    const W = num(v, 'largCaixa'), P = num(v, 'fundoCaixa');
    const cy = b.minY - P / 2 + 3;
    const lugar = (r: Region) => translateRegion(rotateRegion(r, num(v, 'giro'), 0, cy), num(v, 'x'), num(v, 'y'));
    const caixa = lugar(retanguloArredondado(0, cy, W, P, 3));
    const larguraTunel = W - 5, fundoTunel = P - 4;
    const tunel = lugar(retanguloArredondado(0, b.minY - P + 3 + fundoTunel / 2 - 1, larguraTunel, fundoTunel + 2, 1));
    const h0 = num(v, 'alturaInicial'), ht = num(v, 'alturaTunel');
    if (h0 + ht > T - 1.6) avisos.push('O teto do túnel ficou fino: aumente a espessura ou diminua o túnel.');
    const vazios: Vazio[] = [{ regiao: tunel, z0: h0, z1: h0 + ht }];
    if (liga(v, 'alivio')) vazios.push({ regiao: lugar(circulo(0, b.minY - P + 3, Math.min(6, W / 4), 48)), z0: h0, z1: T });
    let corpoTodo = unir([corpo, caixa]);
    if (liga(v, 'nfc')) {
      const { vazio, nota } = bolsao(v, (b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, T);
      if (regionArea(diffRegion(vazio.regiao, contornar(corpo, -1))) > 0.5) avisos.push('A etiqueta NFC não cabe no corpo: aumente o desenho ou a margem.');
      if (regionArea(intersectRegion(vazio.regiao, contornar(tunel, 1))) > 0.01) avisos.push('O NFC encosta no túnel do abridor: mova o abridor.');
      vazios.push(vazio);
      notas.push(nota);
    }
    let camadas: Camada[];
    if (liga(v, 'argola')) {
      const a = argolaNaDirecao(corpoTodo, 0, 1, num(v, 'furo'), 1.8);
      const ea = Math.min(num(v, 'espArgola'), T);
      camadas = [...comVazios(diffRegion(unir([corpoTodo, a.disco]), a.furo), 0, ea, vazios), ...comVazios(diffRegion(corpoTodo, a.furo), ea, T, vazios)];
      corpoTodo = diffRegion(corpoTodo, a.furo);
    } else camadas = comVazios(corpoTodo, 0, T, vazios);
    const des = intersectRegion(D, contornar(corpo, -0.6));
    return {
      itens: [{ nome: nomeDoDesenho(v, 'desenho') || 'Abridor', pecas: [{ nome: 'Corpo', cor: 0, camadas }, { nome: 'Desenho', cor: 1, camadas: [{ region: des, z0: T, z1: T + num(v, 'espDesenho') }] }] }],
      cores, hex, avisos,
      notas: [...notas, 'Para abrir: encaixe a aba da lata no túnel e puxe para cima.'],
    };
  },
};

