/** O encaixe de cada corte em X/Y: o cortador por faixa de altura, os vaos e as pecas soltas. */
import { diffRegion, intersectRegion, offsetRegion, regionArea, type Pt, type Region } from '../region';
import { malhaDasCamadas, type ExtraStl } from '../modes';
import { compor, deitarPlano, transladar, type Matriz } from '../../malha/plano';
import { ehAltura, inclinado, type Caixa, type Corte, type DesenhoDente, type EmendaDoCorte, type FormaEmenda, type MarcaDeEncaixe, type OpcoesEmenda } from './tipos';
import { FUNDO_LIVRE, PASSO_DENTE, PINO_BORDA, PINO_DIAMETRO, PINO_FUNDO, TRECHO_MIN_DENTE } from './constantes';
import { circulo, distancia, mais, unir } from './geometria';
import { distanciaALinha, ladoAntes, noDesenho, projetar, segmentosDe, trechosDaLinha, trechosNosSegmentos, type Segmento } from './linha';

/** O dente visto de cima, no ponto `w` do segmento, com raio `r`, avancando para o lado `lado` (1 ou -1). */
function formaDoDente(desenho: DesenhoDente, s: Segmento, w: number, r: number, lado: number): Region {
  const P = (pts: [number, number][]) => noDesenho(pts.map(([u, v]): [number, number] => [u, v * lado]), s, w);
  if (desenho === 'andorinha') return P([[-0.5 * r, -0.6 * r], [0.5 * r, -0.6 * r], [0.5 * r, 0], [r, 1.6 * r], [-r, 1.6 * r], [-0.5 * r, 0]]);
  if (desenho === 'reto') return P([[-0.7 * r, -0.6 * r], [0.7 * r, -0.6 * r], [0.7 * r, 1.4 * r], [-0.7 * r, 1.4 * r]]);
  if (desenho === 'triangulo') return P([[-r, -0.6 * r], [r, -0.6 * r], [r, 0], [0, 1.6 * r], [-r, 0]]);
  // Redondo: cabeca e pescoco, o quebra-cabeca.
  const c = mais(mais(s.o, s.t, w), s.n, 0.8 * r * lado);
  return unir([circulo(c.x, c.y, r), P([[-r / 2, -0.6 * r], [r / 2, -0.6 * r], [r / 2, 0.6 * r], [-r / 2, 0.6 * r]])]);
}

/** Cavilha vista de cima: barra que cruza a linha, metade em cada pedaco. */
const formaDaCavilha = (s: Segmento, w: number, larg: number) => {
  const meio = Math.max(6, 1.2 * larg);
  return noDesenho([[-larg / 2, -meio], [larg / 2, -meio], [larg / 2, meio], [-larg / 2, meio]], s, w);
};

/** Borboleta vista de cima: estreita na linha, larga nas pontas (trava os dois lados). */
const formaDaBorboleta = (s: Segmento, w: number, larg: number) => {
  const b = larg / 2, a = larg / 4, meio = 0.9 * larg;
  return noDesenho([[-b, -meio], [b, -meio], [a, 0], [b, meio], [-b, meio], [-a, 0]], s, w);
};

export type FormaFeita = Exclude<FormaEmenda, 'auto'>;

/**
 * O encaixe que vale num corte: o dele ou o padrao. Na oca so ha tala ou cola. Na altura: pino
 * solto, pino fixo ou cola, e o anel na oca (o padrao: pino na solida, anel na oca).
 */
export function formaDoCorte(c: Corte, padrao: FormaEmenda, solida: boolean): FormaFeita {
  const escolhida = c.emenda?.forma && c.emenda.forma !== 'auto' ? c.emenda.forma : undefined;
  if (ehAltura(c)) {
    // O anel acompanha a parede na horizontal: no plano inclinado, so cola ou pino.
    const tombado = inclinado(c);
    if (escolhida === 'cola' || escolhida === 'pino' || escolhida === 'pinoFixo' || (escolhida === 'anel' && !solida && !tombado)) return escolhida;
    return solida ? 'pino' : tombado ? 'cola' : 'anel';
  }
  const f = escolhida ?? padrao;
  if (solida) return f === 'auto' || f === 'tala' || f === 'pino' || f === 'pinoFixo' || f === 'anel' ? 'dente' : f;
  return f === 'cola' ? 'cola' : 'tala';
}

/** Ate a altura `ate`: o que fica no pedaco de antes e o que sai do pedaco de depois. */
interface FaixaDoCorte {
  ate: number;
  antes: Region;
  depois: Region;
}

/** Vao aberto nos dois pedacos (cavilha, borboleta), numa faixa de altura. */
interface Vao {
  z0: number;
  z1: number;
  regiao: Region;
}

export interface EncaixeDoCorte {
  indice: number;
  forma: FormaFeita;
  linha: Pt[];
  /** O lado de antes, sem dente. */
  base: Region;
  faixas: FaixaDoCorte[];
  vaos: Vao[];
  /** Furos dos pinos deitados: cada um atravessa o corte, metade em cada pedaco. */
  furos: FuroDeitado[];
  soltas: ExtraStl[];
  marcas: MarcaDeEncaixe[];
}

/** Furo redondo deitado: eixo na normal `n` do corte, centro em `p` na altura `z`; `meio` = metade do comprimento, mm. */
interface FuroDeitado {
  p: Pt;
  n: Pt;
  z: number;
  r: number;
  meio: number;
}

export interface Contexto {
  cx: Caixa;
  solida: boolean;
  material: Region;
  /** Onde cabe dente: o material na solida; na oca, so o traco fino (sem vao por dentro). */
  zonaDente: Region;
  /** Base e topo da peca, mm. */
  base: number;
  altura: number;
  /** O que e cheio da mesa ate o topo entre z0 e z1, visto de cima (onde cabe o pino deitado). */
  cheio: (z0: number, z1: number) => Region;
  opc: OpcoesEmenda;
  avisos: string[];
}

interface LugarNaLinha {
  s: Segmento;
  w: number;
  /** Comprimento do trecho de material onde ele cai. */
  comp: number;
  inverter: boolean;
}

/** Onde vao os encaixes de um corte: onde eu clicar ou o meio dos trechos de material, a cada `passo`. */
function lugaresNaLinha(linha: Pt[], zona: Region, e: EmendaDoCorte | undefined): LugarNaLinha[] {
  const segs = segmentosDe(linha);
  const trechos = trechosNosSegmentos(zona, segs);
  const inv = !!e?.inverter;
  if (e?.lugares) {
    return e.lugares.flatMap((p) => {
      const pr = projetar(p, segs);
      const t = pr && trechos.find((x) => x.s === pr.s && pr.w >= x.a - 0.01 && pr.w <= x.b + 0.01);
      return pr && t ? [{ s: pr.s, w: pr.w, comp: t.b - t.a, inverter: inv !== !!p.inverter }] : [];
    });
  }
  const passo = Math.max(10, e?.passo ?? PASSO_DENTE);
  return trechos.flatMap(({ s, a, b }) => {
    const comp = b - a;
    if (comp <= TRECHO_MIN_DENTE) return [];
    const n = Math.max(1, Math.floor(comp / passo));
    return Array.from({ length: n }, (_, i) => ({ s, w: a + ((i + 0.5) * comp) / n, comp, inverter: inv }));
  });
}

export function pecaSoltaDe(name: string, label: string, r: Region, altura: number, z: number, ordem: number): ExtraStl {
  return { kind: 'stl', name, label, ...malhaDasCamadas([{ region: r, z0: 0, z1: altura, role: 'corpo' }]), material: 'mesmo', lado: 'traseira', montagem: { z, ordem } };
}

/** Do referencial do furo deitado (eixo em Z, centro na origem) para a peca: o eixo vai na normal do corte. */
export const eixoDoFuro = (f: FuroDeitado): Matriz => compor(transladar(f.p.x, f.p.y, f.z), deitarPlano([f.n.x, f.n.y, 0], [0, 0, 0]).volta);

/**
 * O cortador de um corte, por faixa de altura: o lado de antes com os machos (e sem as femeas,
 * quando o dente inverte), o que sai do pedaco de depois (com a folga), os vaos e as pecas
 * soltas. `outras` sao as linhas dos outros cortes: perto delas nao vai encaixe (ficaria partido).
 */
export function encaixeDoCorte(c: Corte, indice: number, linha: Pt[], outras: Pt[][], x: Contexto): EncaixeDoCorte {
  const { opc, solida, altura: H } = x;
  const e = c.emenda;
  const forma = formaDoCorte(c, opc.forma, solida);
  const base = ladoAntes(linha, x.cx);
  const out: EncaixeDoCorte = { indice, forma, linha, base, faixas: [{ ate: Infinity, antes: base, depois: base }], vaos: [], furos: [], soltas: [], marcas: [] };
  if (forma === 'cola') return out;
  if (forma === 'degrau') {
    // Rampa em degraus: embaixo o pedaco de antes passa `s` da linha, em cima para nela. Cada
    // degrau recua um pouco, entao nenhum dos dois pedacos imprime em balanco.
    const s = Math.min(opc.sobreposicaoChapa, 0.8 * H);
    const k = Math.max(2, Math.min(12, Math.round(H / 2)));
    out.faixas = Array.from({ length: k }, (_, i) => {
      const antes = offsetRegion(base, -(s * (k - 1 - i)) / (k - 1));
      return { ate: i === k - 1 ? Infinity : (H * (i + 1)) / k, antes, depois: offsetRegion(antes, -opc.folga) };
    });
    return out;
  }
  // Longe dos outros cortes e das quinas do esboco.
  const quinas = linha.slice(2, -2);
  const perto = (p: Pt, r: number) => outras.some((o) => distanciaALinha(p, o) <= r * 2 + 3) || quinas.some((q) => distancia(p, q) < 1.5 * r);
  const escolhido = !!e?.lugares || !!e?.tamanho;
  let falhas = 0;
  const avisar = () => {
    if (falhas && escolhido) x.avisos.push(`No corte ${indice + 1}, ${falhas === 1 ? 'um encaixe não coube' : `${falhas} encaixes não couberam`}: diminua o tamanho ou mude de lugar.`);
  };

  if (forma === 'pinoDeitado') {
    // Pino redondo deitado no meio da altura, na normal da linha: furo nos dois pedacos, o pino
    // solto (imprime em pe). Cabe onde o material e cheio em volta do furo, com borda.
    const r = Math.max(1, (e?.tamanho ?? Math.min(PINO_DIAMETRO, 0.4 * (H - x.base))) / 2);
    const fundo = e?.fundo ?? PINO_FUNDO;
    const a = r + opc.folga, meio = fundo + FUNDO_LIVRE, zc = (x.base + H) / 2;
    const dentro = offsetRegion(x.cheio(zc - a - PINO_BORDA, zc + a + PINO_BORDA), PINO_BORDA);
    for (const l of lugaresNaLinha(linha, x.material, e)) {
      const p = mais(l.s.o, l.s.t, l.w);
      const furo = noDesenho([[-a, -meio], [a, -meio], [a, meio], [-a, meio]], l.s, l.w);
      const emVolta = offsetRegion(furo, -3);
      if (outras.some((o) => trechosDaLinha(emVolta, o).length > 0) || quinas.some((q) => distancia(p, q) < meio + 3)) continue;
      if (regionArea(diffRegion(furo, dentro)) >= 0.5) { falhas++; continue; }
      const f: FuroDeitado = { p, n: l.s.n, z: zc, r: a, meio };
      out.furos.push(f);
      out.marcas.push({ corte: indice, lugar: p, regiao: noDesenho([[-r, -fundo], [r, -fundo], [r, fundo], [-r, fundo]], l.s, l.w), inverter: false });
      const pino = pecaSoltaDe('pino', 'Pino deitado da emenda (atravessa o corte; imprime em pé)', circulo(p.x, p.y, r, 32), 2 * fundo, 0, 1);
      out.soltas.push({ ...pino, montagem: { ...pino.montagem, matriz: compor(eixoDoFuro(f), transladar(-p.x, -p.y, -fundo)) } });
    }
    avisar();
    if (!out.furos.length) x.avisos.push(`No corte ${indice + 1}, o pino deitado não coube: ali fica só a cola.`);
    return out;
  }

  if (forma === 'cavilha' || forma === 'borboleta') {
    const dentro = offsetRegion(x.material, 1.5);
    const pecas: Region[] = [];
    for (const l of lugaresNaLinha(linha, x.material, e)) {
      const larg = e?.tamanho ?? (forma === 'cavilha' ? Math.min(10, l.comp / 3) : Math.min(24, l.comp / 2));
      const p = mais(l.s.o, l.s.t, l.w);
      if (larg < (forma === 'cavilha' ? 4 : 8) || perto(p, larg / 2)) continue;
      const peca = forma === 'cavilha' ? formaDaCavilha(l.s, l.w, larg) : formaDaBorboleta(l.s, l.w, larg);
      if (regionArea(diffRegion(peca, dentro)) >= 0.5) { falhas++; continue; }
      pecas.push(peca);
      out.marcas.push({ corte: indice, lugar: p, regiao: peca, inverter: false });
    }
    avisar();
    const vao = offsetRegion(unir(pecas), -opc.folga);
    if (forma === 'cavilha') {
      // Barra no meio da altura, vao dos dois lados: nenhum pedaco tem macho em balanco.
      const meia = Math.min(4, 0.2 * H), zc = H / 2;
      if (!pecas.length || 2 * (meia - opc.folga) < 1) return { ...out, marcas: [] };
      out.vaos = [{ z0: zc - meia, z1: zc + meia, regiao: vao }];
      out.soltas = pecas.map((r) => pecaSoltaDe('cavilha', 'Cavilha da emenda (entra nos vãos dos dois pedaços)', r, 2 * (meia - opc.folga), zc - meia + opc.folga, 1));
    } else {
      // Por baixo (o fundo da peca solida), cruzando a emenda.
      const fundo = Math.min(10, 0.4 * H);
      if (!pecas.length || fundo - opc.folga < 1) return { ...out, marcas: [] };
      out.vaos = [{ z0: 0, z1: fundo, regiao: vao }];
      out.soltas = pecas.map((r) => pecaSoltaDe('borboleta', 'Borboleta da emenda (entra por baixo, cruzando a emenda)', r, fundo - opc.folga, 0, -1));
    }
    return out;
  }

  // Dente (altura toda ou escondido) na solida; na oca, so no traco fino.
  const zona = x.zonaDente;
  if (!zona.length) return solida ? { ...out, faixas: [{ ate: Infinity, antes: base, depois: offsetRegion(base, -opc.folga) }] } : out;
  const dentro = offsetRegion(zona, 0.8);
  const desenho = e?.desenho ?? opc.desenho;
  const machos: Region[] = [], femeas: Region[] = [];
  for (const l of lugaresNaLinha(linha, zona, e)) {
    const r = e?.tamanho ? e.tamanho / 2 : Math.min(solida ? 8 : 4, l.comp / 5);
    const p = mais(l.s.o, l.s.t, l.w);
    if (perto(p, r)) continue;
    const dente = formaDoDente(desenho, l.s, l.w, r, l.inverter ? -1 : 1);
    // So se o dente cabe no material do outro lado (senao sairia furado).
    if (regionArea(diffRegion(dente, dentro)) >= 0.5) { falhas++; continue; }
    (l.inverter ? femeas : machos).push(dente);
    out.marcas.push({ corte: indice, lugar: p, regiao: dente, inverter: l.inverter });
  }
  avisar();
  let cort = machos.length ? unir([base, ...machos]) : base;
  if (femeas.length) cort = diffRegion(cort, unir(femeas));
  if (solida) {
    const comFolga = { antes: cort, depois: offsetRegion(cort, -opc.folga) };
    out.faixas = forma === 'escondido'
      ? [{ ate: (H * Math.min(90, Math.max(20, e?.alturaDente ?? 60))) / 100, ...comFolga }, { ate: Infinity, antes: base, depois: base }]
      : [{ ate: Infinity, ...comFolga }];
  } else if (machos.length || femeas.length) {
    // Oca: folga so em volta do dente; a parede continua de topo.
    const emVolta = offsetRegion(unir([...machos, ...femeas]), -(opc.folga + 1.5));
    out.faixas = [{ ate: Infinity, antes: cort, depois: unir([cort, intersectRegion(offsetRegion(cort, -opc.folga), emVolta)]) }];
  }
  return out;
}
