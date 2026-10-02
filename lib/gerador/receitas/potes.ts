/**
 * Potes cilindricos com tampa de rosca: porta-pente de cilios (pote alto) e carimbos de
 * massinha (discos de dupla face que moram dentro do pote).
 *
 * A rosca e camada a camada (perfil trapezoidal, flancos de 45 graus). A tampa imprime
 * de cabeca para baixo: a rosca dela e a do gargalo espelhada em Y, para casar depois
 * de virada.
 */
import { buildRegion, diffRegion, intersectRegion, regionArea, regionBounds, scaleRegion, translateRegion, type Region } from '../../geom/region';
import { cilindroComRelevo, perfilDeRosca, roscaExterna } from '../cilindro';
import { circulo, contornar, semBuracos } from '../formas';
import { espelharX } from '../figuras';
import { argolaNaDirecao, emGrade } from '../lote';
import { comVazios } from '../solidos';
import { camposTextura, texturaDesenrolada } from './cilindros';
import { AVISO_EXEMPLO, campoDesenho, desenhoNoTamanho } from './desenho';
import { ficha } from './fichas';
import type { Camada, Item, Parametro, Peca, Receita, Resultado, Valores } from '../tipos';
import { desenho, liga, num, soCoresUsadas, txt } from '../tipos';

const cor = (id: string, rotulo: string, padrao: string): Parametro => ({ tipo: 'cor', id, rotulo, grupo: 'Cores', padrao });
const mm = (id: string, rotulo: string, grupo: string, padrao: number, min: number, max: number, passo = 0.1, dica?: string, visivel?: (v: Valores) => boolean): Parametro =>
  ({ tipo: 'numero', id, rotulo, grupo, padrao, min, max, passo, unidade: 'mm', dica, visivel });

export interface Pote {
  corpo: Camada[];
  relevo: Camada[];
  tampa: Camada[];
  R: number;
  alturaCorpo: number;
}

/**
 * Pote de raio interno `ri` e altura interna `hi`: corpo (fundo + parede + gargalo com
 * rosca externa) e tampa (topo + saia com rosca interna, impressa de cabeca para baixo).
 * `desenho` (plano desenrolado) sai em relevo `h` em volta do corpo.
 */
export function poteRosqueado(o: { ri: number; hi: number; fundo: number; passo: number; prof: number; folga: number; rosca: number; topoTampa: number; desenho?: Region; h?: number; argola?: 'tampa' | 'corpo' | 'nenhuma'; furoArgola?: number }): Pote {
  const rn = o.ri + 1.2;
  const R = rn + o.folga + o.prof + 1.6;
  const Hb = o.fundo + o.hi, zRosca = Hb - o.rosca;
  const oco = circulo(0, 0, o.ri, 120);
  const corpo: Camada[] = [{ region: circulo(0, 0, R, 180), z0: 0, z1: o.fundo }];
  const relevo: Camada[] = [];
  const liso = diffRegion(circulo(0, 0, R, 180), oco);
  if (o.desenho?.length && o.h) {
    for (const c of cilindroComRelevo({ R, desenho: o.desenho, h: o.h, z0: o.fundo, z1: zRosca, furo: oco })) {
      const fora = contornar(contornar(diffRegion(c.region, circulo(0, 0, R, 180)), -0.003), 0.003).filter((q) => regionArea([q]) > 0.02);
      if (regionArea(fora) > 0.01) relevo.push({ region: fora, z0: c.z0, z1: c.z1 });
    }
  }
  corpo.push({ region: liso, z0: o.fundo, z1: zRosca });
  corpo.push(...roscaExterna(rn, o.prof, o.passo, zRosca, Hb, oco));
  // Tampa de cabeca para baixo: altura de impressao h <-> altura montada Hb + 0,2 - (h - topo).
  const fora = circulo(0, 0, R, 180);
  const tampa: Camada[] = [{ region: fora, z0: 0, z1: o.topoTampa }];
  const n = Math.round(o.rosca / 0.2);
  for (let i = 0; i < n; i++) {
    const a = o.topoTampa + (o.rosca * i) / n, b = o.topoTampa + (o.rosca * (i + 1)) / n;
    const zMontada = Hb + 0.2 - ((a + b) / 2 - o.topoTampa);
    const furo = buildRegion([perfilDeRosca(rn + o.folga, o.prof, o.passo, zMontada)]);
    tampa.push({ region: scaleRegion(diffRegion(fora, furo), 1, -1), z0: a, z1: b });
  }
  // Argola: aba com furo rente a mesa, na tampa (topo) ou no corpo (fundo).
  if (o.argola && o.argola !== 'nenhuma') {
    const ar = argolaNaDirecao(fora, 0, 1, o.furoArgola ?? 3.4, 2);
    const alvo = o.argola === 'tampa' ? tampa : corpo;
    alvo[0] = { ...alvo[0]!, region: diffRegion(unirSimples(alvo[0]!.region, ar.disco), ar.furo) };
  }
  return { corpo, relevo, tampa, R, alturaCorpo: Hb };
}

const unirSimples = (a: Region, b: Region): Region => contornar(contornar([...a, ...b], 0.001), -0.001);

const camposRosca: Parametro[] = [
  mm('passoRosca', 'Passo da rosca', 'Rosca', 2.5, 1.5, 5, 0.1),
  mm('profRosca', 'Profundidade da rosca', 'Rosca', 1, 0.5, 2, 0.1, 'Até 40% do passo, para os flancos ficarem em 45 graus'),
  mm('folgaRosca', 'Folga da rosca', 'Rosca', 0.3, 0.1, 0.8, 0.05),
  mm('comprimentoRosca', 'Comprimento da rosca', 'Rosca', 8, 4, 20, 0.5),
];
const lerRosca = (v: Valores) => ({ passo: num(v, 'passoRosca'), prof: Math.min(num(v, 'profRosca'), num(v, 'passoRosca') * 0.4), folga: num(v, 'folgaRosca'), rosca: num(v, 'comprimentoRosca') });

/** Porta-pente de cilios: pote alto com textura em volta, tampa de rosca e argola. */
export const portaPente: Receita = {
  ...ficha('porta-pente'),
  parametros: [
    mm('diametroInterno', 'Diâmetro por dentro', 'Pote', 16, 8, 60, 0.5),
    mm('alturaInterna', 'Altura por dentro', 'Pote', 90, 20, 200, 1),
    mm('fundo', 'Espessura do fundo', 'Pote', 2, 0.8, 5),
    { tipo: 'escolha', id: 'argola', rotulo: 'Argola', grupo: 'Pote', padrao: 'tampa', opcoes: [{ valor: 'tampa', rotulo: 'Na tampa' }, { valor: 'corpo', rotulo: 'No corpo' }, { valor: 'nenhuma', rotulo: 'Sem argola' }] },
    mm('furoArgola', 'Furo da argola', 'Pote', 3.4, 2, 6, 0.1, undefined, (v) => v.argola !== 'nenhuma'),
    { tipo: 'escolha', id: 'modo', rotulo: 'Textura em volta', grupo: 'Desenho', padrao: 'mosaico', opcoes: [{ valor: 'lisa', rotulo: 'Liso' }, { valor: 'mosaico', rotulo: 'Mosaico' }, { valor: 'imagem', rotulo: 'Imagem grande' }] },
    ...camposTextura(8).map((p) => ({ ...p, visivel: (v: Valores) => v.modo !== 'lisa' && (!p.visivel || p.visivel(v)) }) as Parametro),
    mm('relevo', 'Relevo da textura', 'Desenho', 1, 0.2, 2, 0.1, undefined, (v) => v.modo !== 'lisa'),
    ...camposRosca,
    cor('corPote', 'Pote', '#a85f78'),
    cor('corTextura', 'Textura', '#ffffff'),
  ],
  gerar(v): Resultado {
    const cores = ['Pote', 'Textura'], hex = [txt(v, 'corPote'), txt(v, 'corTextura')];
    const avisos: string[] = [];
    const ri = num(v, 'diametroInterno') / 2, hi = num(v, 'alturaInterna'), fundo = num(v, 'fundo'), r = lerRosca(v);
    const Rprev = ri + 1.2 + r.folga + r.prof + 1.6;
    let desenhoU: Region = [];
    if (txt(v, 'modo') !== 'lisa') {
      const t = texturaDesenrolada(v, 2 * Math.PI * Rprev, fundo + 2, fundo + hi - r.rosca - 2);
      if (t.exemplo) avisos.push(AVISO_EXEMPLO);
      desenhoU = t.regiao;
    }
    const p = poteRosqueado({ ri, hi, fundo, ...r, topoTampa: 2, desenho: desenhoU, h: num(v, 'relevo'), argola: txt(v, 'argola') as 'tampa', furoArgola: num(v, 'furoArgola') });
    const corpo: Peca[] = [{ nome: 'Pote', cor: 0, camadas: p.corpo }];
    if (p.relevo.length) corpo.push({ nome: 'Textura', cor: 1, camadas: p.relevo });
    const itens: Item[] = [{ nome: 'Pote', pecas: corpo }, { nome: 'Tampa', pecas: [{ nome: 'Tampa', cor: 0, camadas: p.tampa }] }];
    return soCoresUsadas({ itens: emGrade(itens, 2, 8), cores, hex, avisos, notas: ['Imprima o pote em pé e a tampa de cabeça para baixo (o topo na mesa).'] });
  },
};

const MAX_CARIMBOS = 6;
const sufixo = (i: number) => (i ? String(i + 1) : '');

/**
 * Carimbos de massinha: ate 6 discos de dupla face (frente em relevo, verso afundado) e
 * o pote com tampa de rosca onde eles cabem empilhados, com textura em volta.
 */
export const carimbosMassinha: Receita = {
  ...ficha('carimbos-massinha'),
  parametros: [
    ...Array.from({ length: MAX_CARIMBOS }, (_, i): Parametro[] => {
      const s = sufixo(i), g = `Carimbo ${i + 1}`;
      return [
        { ...campoDesenho(`Frente do carimbo ${i + 1}`), id: `frente${s}`, grupo: g, ...(i ? { visivel: (v: Valores) => !!v[`frente${sufixo(i - 1)}`] } : {}) },
        { ...campoDesenho(`Verso do carimbo ${i + 1}`), id: `verso${s}`, grupo: g, visivel: (v: Valores) => !!v[`frente${s}`] },
      ];
    }).flat(),
    mm('diametro', 'Diâmetro dos carimbos', 'Carimbos', 50, 25, 100, 1),
    mm('espessura', 'Espessura do carimbo', 'Carimbos', 8, 3, 15, 0.5),
    mm('relevo', 'Altura da frente', 'Carimbos', 0.6, 0.3, 3, 0.1, 'Desenho em relevo na frente'),
    mm('fundoVerso', 'Profundidade do verso', 'Carimbos', 1, 0.4, 3, 0.1, 'Desenho afundado no verso'),
    { tipo: 'escolha', id: 'modoCor', rotulo: 'Cores', grupo: 'Carimbos', padrao: 'duas', opcoes: [{ valor: 'uma', rotulo: 'Uma cor' }, { valor: 'duas', rotulo: 'Frente em outra cor' }] },
    { tipo: 'liga', id: 'pote', rotulo: 'Pote com tampa', grupo: 'Pote', padrao: true },
    mm('texturaPote', 'Relevo do pote', 'Pote', 0.8, 0, 2, 0.1, '0 = liso; a textura é a frente do 1º carimbo em mosaico', (v) => v.pote === true),
    ...camposRosca.map((p) => ({ ...p, visivel: (v: Valores) => v.pote === true }) as Parametro),
    cor('corCarimbo', 'Carimbo', '#6b2c42'),
    cor('corDesenho', 'Desenho', '#ffffff'),
    cor('corPote', 'Pote', '#6b2c42'),
  ],
  gerar(v): Resultado {
    const cores = ['Carimbo', 'Desenho', 'Pote'], hex = [txt(v, 'corCarimbo'), txt(v, 'corDesenho'), txt(v, 'corPote')];
    const avisos: string[] = [];
    const D = num(v, 'diametro'), E = num(v, 'espessura'), hr = num(v, 'relevo'), pv = Math.min(num(v, 'fundoVerso'), E - 1.2);
    const disco = circulo(0, 0, D / 2, 128), area = contornar(disco, -1.5);
    const itens: Item[] = [];
    let primeiro: Region = [];
    for (let i = 0; i < MAX_CARIMBOS; i++) {
      const s = sufixo(i);
      if (i && !desenho(v, `frente${s}`)) continue;
      const f = desenhoNoTamanho(v, `frente${s}`, D - 4);
      if (f.exemplo) avisos.push(AVISO_EXEMPLO);
      // Frente espelhada (carimba ao contrario). Verso: lido por baixo e carimbado, nao espelha.
      const frenteR = intersectRegion(espelharX(f.regiao), area);
      if (!primeiro.length) primeiro = f.regiao;
      const verso = desenho(v, `verso${s}`) ? intersectRegion(desenhoNoTamanho(v, `verso${s}`, D - 6).regiao, area) : [];
      const duas = txt(v, 'modoCor') === 'duas';
      const pecas: Peca[] = [{ nome: 'Carimbo', cor: 0, camadas: comVazios(disco, 0, E, verso.length ? [{ regiao: verso, z0: 0, z1: pv }] : []) }];
      if (regionArea(frenteR) > 0.3) pecas.push({ nome: 'Desenho', cor: duas ? 1 : 0, camadas: [{ region: frenteR, z0: E, z1: E + hr }] });
      itens.push({ nome: `Carimbo ${i + 1}`, pecas });
    }
    if (liga(v, 'pote')) {
      const r = lerRosca(v), n = itens.length, ri = D / 2 + 0.8, hi = n * (E + hr + 0.4) + 2;
      const R = ri + 1.2 + r.folga + r.prof + 1.6;
      let desU: Region = [];
      if (num(v, 'texturaPote') > 0 && primeiro.length) {
        // Mosaico com a frente do primeiro carimbo, 8 em volta.
        const b = regionBounds(primeiro), C = 2 * Math.PI * R, bloco = Math.min(C / 10, (hi - r.rosca) / 3);
        const peca = scaleRegion(translateRegion(semBuracos(primeiro), -(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2), bloco / Math.max(b.w, b.h));
        const nz = Math.max(1, Math.floor((hi - r.rosca - 4) / (bloco * 1.3)));
        for (let j = 0; j < nz; j++) for (let k = 0; k < 8; k++) desU.push(...translateRegion(peca, ((k + 0.5 + (j % 2) * 0.5) * C) / 8 % C, 2 + 2 + (j + 0.5) * ((hi - r.rosca - 4) / nz)));
      }
      const pote = poteRosqueado({ ri, hi, fundo: 2, ...r, topoTampa: 2, desenho: desU, h: num(v, 'texturaPote') });
      const pecasPote: Peca[] = [{ nome: 'Pote', cor: 2, camadas: pote.corpo }];
      if (pote.relevo.length) pecasPote.push({ nome: 'Textura do pote', cor: 2, camadas: pote.relevo });
      itens.push({ nome: 'Pote', pecas: pecasPote }, { nome: 'Tampa', pecas: [{ nome: 'Tampa', cor: 2, camadas: pote.tampa }] });
    }
    return soCoresUsadas({ itens: emGrade(itens, 3, 8), cores, hex, avisos: [...new Set(avisos)], notas: ['Os carimbos cabem empilhados no pote. A tampa imprime de cabeça para baixo.'] });
  },
};
