import {
  shrinkRegion,
  offsetRegion,
  diffRegion,
  regionArea,
  regionBounds,
  minThickness,
  type Region,
  type Pt,
} from './region';

// Convencao de eixos: Z = 0 e SEMPRE a superficie que encosta na mesa de impressao.
// Nada aqui usa CSG: a peca e uma pilha de prismas retos, porque booleana 3D quebra
// com frequencia em contorno de fonte.

/** Papel de cada camada. Governa a cor no preview e o que o usuario entende. */
export type Role = 'corpo' | 'face' | 'parede' | 'traseira' | 'bolsao' | 'bisel' | 'espacador' | 'borda' | 'labio';

/**
 * Como cada extremidade da peca e fechada.
 *
 *  aberta   - nao tem tampa; o vao fica exposto.
 *  impressa - tampa solida, parte da propria peca.
 *  chapa    - fica um bolsao para receber uma chapa (ACM, acrilico, PVC) feita a parte.
 */
export type Fechamento = 'aberta' | 'impressa' | 'chapa';

/** A chapa e cortada (vira DXF de corte) ou impressa a parte (vira STL separado). */
export type ChapaModo = 'cortar' | 'imprimir';

/**
 * Como a chapa se apoia na peca impressa.
 *
 *  dentro - chapa menor que a letra, embutida num bolsao e apoiada num degrau interno.
 *  fora   - a peca cresce `borda` mm para fora; a chapa tem o tamanho da arte e fica
 *           cercada por essa borda. A peca final mede a arte + 2x borda.
 *  dois   - os dois ao mesmo tempo: degrau por baixo e borda por fora, com o labio
 *           subindo acima da chapa para travar pela frente.
 */
export type Apoio = 'dentro' | 'fora' | 'dois';

export const APOIOS: Record<Apoio, { nome: string; curto: string; desc: string }> = {
  dentro: {
    nome: 'Para dentro',
    curto: 'Para dentro',
    desc: 'Chapa menor que a letra, embutida num bolsao e apoiada num degrau interno.',
  },
  fora: {
    nome: 'Para fora (bordinha)',
    curto: 'Para fora',
    desc: 'A peca ganha uma borda para fora; a chapa tem o tamanho da arte e fica cercada por ela.',
  },
  dois: {
    nome: 'Dos dois lados',
    curto: 'Dois lados',
    desc: 'Degrau por baixo e borda por fora, com o labio travando a chapa pela frente.',
  },
};

export const FECHAMENTOS: Record<Fechamento, { nome: string; desc: string }> = {
  aberta: { nome: 'Aberta', desc: 'Sem tampa deste lado.' },
  impressa: { nome: 'Impressa', desc: 'Tampa solida, sai junto com a peca.' },
  chapa: { nome: 'Chapa', desc: 'Bolsao para receber chapa de ACM, acrilico ou PVC.' },
};

/** Qual extremidade da peca encosta na mesa de impressao. */
export type LadoNaMesa = 'frente' | 'traseira';

/** Prisma reto: uma Region entre dois planos Z. A peca inteira e uma lista destes. */
export interface Layer {
  region: Region;
  z0: number;
  z1: number;
  role: Role;
  /**
   * De qual extremidade esta camada veio. Com chapa dos dois lados existem dois
   * bolsoes, e ai o `role` sozinho nao distingue um do outro.
   */
  lado?: LadoNaMesa;
}

export interface BiselCfg {
  ativo: boolean;
  tamanho: number;
  altura: number;
  passos: number;
}

export interface Params {
  /** Bloco cheio. Ignora frente, traseira, parede e apoio. */
  macica: boolean;
  profundidade: number;
  parede: number;

  frente: Fechamento;
  frenteEsp: number;
  traseira: Fechamento;
  traseiraEsp: number;

  /** Como a chapa e produzida, quando algum lado for `chapa`. */
  chapaModo: ChapaModo;
  /** Folga lateral para a chapa entrar sem forcar. */
  folga: number;

  apoio: Apoio;
  /** Quanto a peca avanca para fora do contorno da arte (apoios `fora` e `dois`). */
  borda: number;
  /** Largura do degrau interno onde a chapa apoia. */
  batente: number;
  /** Quanto a borda sobe acima da chapa, travando pela frente (apoio `dois`). */
  labio: number;
  /** A medida pedida vale para a peca pronta: a arte encolhe 2x borda para compensar. */
  bordaCompensa: boolean;

  /** A peca leva fita de LED. Libera o furo de passagem e entra no custo. */
  comLed: boolean;
  /** Diametro do furo de passagem do fio. 0 desliga. */
  furoFio: number;
  /** Altura dos espacadores de halo atras da peca. 0 desliga. */
  espacadores: number;

  chanfro: BiselCfg;
  bico: number;
  /** Inverte qual lado encosta na mesa, quando as duas opcoes sao viaveis. */
  virar: boolean;
}

/** Peca que se imprime separada. */
export interface ExtraStl {
  kind: 'stl';
  name: string;
  label: string;
  layers: Layer[];
  material: string;
  lado: LadoNaMesa;
}

/** Contorno que se corta em chapa, nao se imprime. */
export interface ExtraCut {
  kind: 'cut';
  name: string;
  label: string;
  region: Region;
  espessura: number;
  lado: LadoNaMesa;
}

export type Extra = ExtraStl | ExtraCut;

export interface Part {
  layers: Layer[];
  extras: Extra[];
  avisos: string[];
  volume: number;
  alturaZ: number;
  orientacao: string;
  /** Footprint real da peca. Com borda e maior que a arte: vale para a mesa e para colisao. */
  contorno: Region;
}

export const PARAMS_PADRAO: Params = {
  macica: false,
  profundidade: 40,
  parede: 2.4,
  frente: 'chapa',
  frenteEsp: 3,
  traseira: 'impressa',
  traseiraEsp: 2,
  chapaModo: 'cortar',
  folga: 0.3,
  apoio: 'dentro',
  borda: 3,
  batente: 2.5,
  labio: 1,
  bordaCompensa: true,
  comLed: false,
  furoFio: 0,
  espacadores: 0,
  chanfro: { ativo: false, tamanho: 1.5, altura: 1.5, passos: 6 },
  bico: 0.4,
  virar: false,
};
function circleRegion(cx: number, cy: number, r: number, seg = 24): Region {
  const pts: Pt[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return [{ outer: pts, holes: [] }];
}

function pointInPoly(pt: Pt, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]!;
    const b = pts[j]!;
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function pointInRegion(pt: Pt, region: Region): boolean {
  for (const poly of region) {
    if (!pointInPoly(pt, poly.outer)) continue;
    let inHole = false;
    for (const h of poly.holes) if (pointInPoly(pt, h)) inHole = true;
    if (!inHole) return true;
  }
  return false;
}

/**
 * Pontos internos com folga minima de `margem` da borda, bem espalhados.
 * Posiciona espacadores de halo e furo de fio sem cair num contra-forma
 * (o miolo do O) nem encostar na parede.
 */
export function samplePointsInside(region: Region, margem: number, count: number): Pt[] {
  const core = shrinkRegion(region, margem);
  if (!core.length) return [];
  const b = regionBounds(core);
  const found: Pt[] = [];
  const step = Math.max(1, Math.min(b.w, b.h) / 6);
  for (let y = b.minY + step / 2; y <= b.maxY; y += step) {
    for (let x = b.minX + step / 2; x <= b.maxX; x += step) {
      if (pointInRegion({ x, y }, core)) found.push({ x, y });
    }
  }
  if (!found.length) return [];
  // Farthest-point sampling: espalha os pontos ao maximo dentro do material.
  const picked: Pt[] = [found[Math.floor(found.length / 2)]!];
  while (picked.length < count && picked.length < found.length) {
    let best: Pt | null = null;
    let bestD = -1;
    for (const c of found) {
      let d = Infinity;
      for (const p of picked) d = Math.min(d, Math.hypot(c.x - p.x, c.y - p.y));
      if (d > bestD) {
        bestD = d;
        best = c;
      }
    }
    if (!best || bestD <= 0) break;
    picked.push(best);
  }
  return picked;
}

/**
 * Dilata a letra por `borda` mm para fora, preservando os vazados internos que
 * fechariam no caminho.
 *
 * Dilatar o solido ENCOLHE os buracos: o miolo do 'e', do 'a' ou de um 'O' estreito
 * some antes do resto. Em vez de limitar a borda da letra inteira por causa de um
 * miolo pequeno, devolvemos aquele buraco ao tamanho original -- fica sem borda no
 * miolo, mas a letra continua legivel e a parede ali fica mais grossa, nunca mais fina.
 */
export function dilataComMiolo(region: Region, borda: number, vaoMin: number): { base: Region; preservados: number } {
  if (borda <= 0) return { base: region, preservados: 0 };

  // 'round' garante que a caixa cresce exatamente `borda` por lado; com 'miter' uma
  // ponta aguda cresceria ate o dobro e a medida final mentiria.
  let base = offsetRegion(region, -borda, 'round');
  let preservados = 0;

  // Abertura morfologica: o que nao volta depois de erodir e dilatar era fino demais.
  const sobrevive = (r: Region, raio: number): boolean =>
    regionArea(offsetRegion(offsetRegion(r, raio, 'miter'), -raio, 'miter')) > 0.01;

  for (const poly of region) {
    for (const h of poly.holes) {
      const buraco: Region = [{ outer: h, holes: [] }];
      const apos = shrinkRegion(buraco, borda); // e assim que a dilatacao do solido o encolhe
      if (!apos.length || !sobrevive(apos, vaoMin / 2)) {
        base = diffRegion(base, buraco);
        preservados++;
      }
    }
  }
  return { base, preservados };
}

/**
 * Altura a dar para a ARTE, dado o que o cliente pediu para a PECA.
 * Com borda, a peca fica `2 x borda` maior que a arte. No comercio a medida
 * contratada e a da peca pronta, entao por padrao a arte encolhe para compensar.
 */
export function alturaArte(alturaPedida: number, apoio: Apoio, borda: number, compensar: boolean): number {
  const e = apoio === 'dentro' ? 0 : Math.max(0, borda);
  return compensar ? Math.max(1, alturaPedida - 2 * e) : alturaPedida;
}

/** Chanfro como degraus: a impressora ja deposita em camadas, entao escalonar e honesto. */
function bevelLayers(region: Region, cfg: BiselCfg, zTop: number): Layer[] {
  const layers: Layer[] = [];
  const h = cfg.altura / cfg.passos;
  for (let i = 0; i < cfg.passos; i++) {
    const d = (cfg.tamanho * (i + 1)) / cfg.passos;
    const r = shrinkRegion(region, d);
    if (!r.length) break;
    layers.push({ region: r, z0: zTop - cfg.altura + i * h, z1: zTop - cfg.altura + (i + 1) * h, role: 'bisel' });
  }
  return layers;
}

export interface Orientacao {
  mesa: LadoNaMesa;
  /** Frase curta para a interface. */
  texto: string;
  /** As duas opcoes sao viaveis: virar e escolha de acabamento, nao de viabilidade. */
  podeVirar: boolean;
}

/**
 * De que lado a peca deita na mesa.
 *
 * Antes cada modo carregava uma frase fixa. Com as escolhas soltas isso tem de ser
 * derivado, porque decide se a peca imprime sem suporte: um bolsao virado para baixo
 * deixa o degrau da chapa em voladico, e uma tampa sobre o vazio vira ponte.
 */
export function orientar(p: Pick<Params, 'frente' | 'traseira' | 'macica' | 'virar'>): Orientacao {
  const { frente: f, traseira: t } = p;
  const inverte = (o: Orientacao): Orientacao =>
    o.podeVirar && p.virar ? { ...o, mesa: o.mesa === 'frente' ? 'traseira' : 'frente' } : o;

  if (p.macica) {
    return inverte({ mesa: 'traseira', texto: 'Traseira na mesa, face para cima.', podeVirar: true });
  }

  // O bolsao da chapa tem de abrir para cima: virado para baixo, o degrau onde ela
  // apoia ficaria no ar.
  if (f === 'chapa' && t !== 'chapa') {
    return { mesa: 'traseira', texto: 'Traseira na mesa, bolsao da chapa aberto para cima.', podeVirar: false };
  }
  if (t === 'chapa' && f !== 'chapa') {
    return { mesa: 'frente', texto: 'Face na mesa, bolsao do fundo aberto para cima.', podeVirar: false };
  }

  // Lado aberto para cima nao precisa de ponte; o fechado deita na mesa.
  if (f === 'aberta' && t !== 'aberta') {
    return { mesa: 'traseira', texto: 'Traseira na mesa, frente aberta para cima.', podeVirar: false };
  }
  if (t === 'aberta' && f !== 'aberta') {
    return { mesa: 'frente', texto: 'Face na mesa (sai lisa), fundo aberto para cima.', podeVirar: false };
  }

  // Empate: os dois iguais. Vira escolha de acabamento -- o lado que encosta sai liso.
  if (f === 'impressa') {
    return inverte({ mesa: 'frente', texto: 'Face na mesa, para sair lisa.', podeVirar: true });
  }
  if (f === 'chapa') {
    return inverte({ mesa: 'traseira', texto: 'Chapa nos dois lados: um bolsao imprime virado para baixo.', podeVirar: true });
  }
  return inverte({ mesa: 'traseira', texto: 'Aberta dos dois lados: tanto faz o lado.', podeVirar: true });
}

/** Nome curto derivado das escolhas, para nomear STL, zip e orcamento. */
export function descreverPeca(p: Params): string {
  if (p.macica) return 'macica';
  const lado = (f: Fechamento) => (f === 'chapa' ? 'chapa' : f === 'impressa' ? 'impressa' : 'aberta');
  return `frente-${lado(p.frente)}_fundo-${lado(p.traseira)}`;
}

interface Extremidade {
  tipo: Fechamento;
  esp: number;
  role: Role;
  qual: LadoNaMesa;
}

/**
 * Gera a peca a partir da Region 2D e das escolhas de fabricacao.
 *
 * A montagem e simetrica: as duas extremidades passam pela mesma regra, e o que muda
 * entre elas e so o tipo de fechamento. Foi assim que os cinco modos fechados viraram
 * combinacoes de escolhas soltas.
 */
export function buildPart(region: Region, p: Partial<Params> = {}, espessuraMin?: number): Part {
  const cfg: Params = { ...PARAMS_PADRAO, ...p, chanfro: { ...PARAMS_PADRAO.chanfro, ...p.chanfro } };
  const { profundidade: T, parede, batente, folga, apoio, bico, chanfro } = cfg;

  const layers: Layer[] = [];
  const extras: Extra[] = [];
  const avisos: string[] = [];

  let frente = cfg.frente;
  let traseira = cfg.traseira;

  // Peca cheia nao tem cavidade onde encaixar chapa.
  if (cfg.macica && (frente === 'chapa' || traseira === 'chapa')) {
    avisos.push('Peca macica nao tem onde encaixar chapa: a face virou impressa. Desmarque "macica" para usar chapa.');
    if (frente === 'chapa') frente = 'impressa';
    if (traseira === 'chapa') traseira = 'impressa';
  }

  const temChapa = frente === 'chapa' || traseira === 'chapa';
  const o = orientar({ ...cfg, frente, traseira });

  // --- caso simples: bloco cheio ---
  if (cfg.macica) {
    if (chanfro.ativo) {
      const bAlt = Math.min(chanfro.altura, T - 0.4);
      layers.push({ region, z0: 0, z1: T - bAlt, role: 'corpo' });
      layers.push(...bevelLayers(region, { ...chanfro, altura: bAlt }, T));
    } else {
      layers.push({ region, z0: 0, z1: T, role: 'corpo' });
    }
    return fechar(layers, extras, avisos, region, o, cfg, espessuraMin);
  }

  // --- a peca cresce para fora quando a borda existe ---
  // Dilatar desde a base e o que impede a borda de ficar em voladico.
  const e = temChapa && apoio !== 'dentro' ? Math.max(0, cfg.borda) : 0;
  const { base, preservados } = dilataComMiolo(region, e, Math.max(bico * 2, 0.8));
  if (preservados > 0) {
    avisos.push(
      `${preservados} vazado(s) interno(s) fechariam com borda de ${e}mm: mantidos no tamanho original, sem borda no miolo.`
    );
  }

  const vao = (d: number): Region => diffRegion(base, shrinkRegion(base, d));
  const temMiolo = (d: number): boolean => regionArea(shrinkRegion(base, d)) > 0.01;

  // Sem miolo nao ha parede: vira bloco cheio.
  const espCorpo = parede + (temChapa ? batente : 0);
  if (!temMiolo(espCorpo)) {
    avisos.push(
      e > 0
        ? `Mesmo com borda de ${e}mm nao sobra miolo para a parede: saiu macica. Aumente a borda ou reduza parede/batente.`
        : 'A letra e fina demais para ficar oca com esta parede: saiu macica. Experimente o apoio "para fora".'
    );
    layers.push({ region: base, z0: 0, z1: T, role: 'corpo' });
    return fechar(layers, extras, avisos, base, o, cfg, espessuraMin);
  }

  // Ordena as extremidades conforme a orientacao: `baixo` encosta na mesa.
  const exFrente: Extremidade = { tipo: frente, esp: cfg.frenteEsp, role: 'face', qual: 'frente' };
  const exTraseira: Extremidade = { tipo: traseira, esp: cfg.traseiraEsp, role: 'traseira', qual: 'traseira' };
  const baixo = o.mesa === 'frente' ? exFrente : exTraseira;
  const cima = o.mesa === 'frente' ? exTraseira : exFrente;

  const labio = apoio === 'dois' ? Math.max(0, cfg.labio) : 0;
  const ocupa = (x: Extremidade, comLabio: boolean) =>
    x.tipo === 'aberta' ? 0 : x.tipo === 'chapa' ? x.esp + (comLabio ? labio : 0) : x.esp;

  const zBaixo = ocupa(baixo, false);
  const zCima = T - ocupa(cima, true);
  const fundoMin = Math.max(bico * 2, 0.8);

  if (zCima - zBaixo < fundoMin) {
    avisos.push(`Profundidade de ${T}mm nao cabe as duas faces: aumente a profundidade.`);
  }

  // --- extremidade de baixo ---
  monta(baixo, 0, zBaixo, true);
  // --- corpo entre as duas ---
  const zCorpo0 = Math.max(zBaixo, 0);
  const zCorpo1 = Math.max(zCorpo0, zCima);
  if (zCorpo1 > zCorpo0) {
    layers.push({ region: vao(espCorpo), z0: zCorpo0, z1: zCorpo1, role: temChapa ? 'corpo' : 'parede' });
  }
  // --- extremidade de cima ---
  monta(cima, zCima, T, false);

  function monta(x: Extremidade, z0: number, z1: number, naMesa: boolean): void {
    if (x.tipo === 'aberta' || z1 <= z0) return;

    if (x.tipo === 'impressa') {
      let tampa = base;
      // O furo so faz sentido em tampa fechada, e so quando a peca leva LED.
      if (cfg.comLed && cfg.furoFio > 0) {
        const pts = samplePointsInside(base, cfg.furoFio / 2 + parede, 1);
        if (pts[0]) tampa = diffRegion(base, circleRegion(pts[0].x, pts[0].y, cfg.furoFio / 2));
        else avisos.push('Nao cabe furo de fio nesta letra: gerada sem furo.');
      }
      layers.push({ region: tampa, z0, z1, role: x.role, lado: x.qual });
      return;
    }

    // chapa: a cerca sobe reta do fundo do rebaixo ate o topo, nada em voladico
    const cerca = vao(parede);
    const zChapaTopo = naMesa ? z1 : z1 - labio;
    layers.push({ region: cerca, z0, z1: Math.max(z0, zChapaTopo), role: e > 0 ? 'borda' : 'bolsao', lado: x.qual });
    if (!naMesa && labio > 0) layers.push({ region: cerca, z0: zChapaTopo, z1, role: 'labio', lado: x.qual });

    if (naMesa) {
      avisos.push(
        `O bolsao da ${x.qual === 'frente' ? 'frente' : 'traseira'} imprime virado para baixo: o degrau fica em voladico. ` +
          'Considere deixar esse lado impresso ou aberto.'
      );
    }

    // A chapa: o vao da cerca menos a folga. Com borda = parede + folga ela sai
    // exatamente no contorno da arte original.
    const chapa = shrinkRegion(base, parede + folga);
    if (!chapa.length) {
      avisos.push('A chapa fica sem area nesta letra: reduza a parede ou aumente a borda.');
      return;
    }
    const nome = x.qual === 'frente' ? 'chapa-frente' : 'chapa-fundo';
    if (cfg.chapaModo === 'imprimir') {
      extras.push({
        kind: 'stl',
        name: nome,
        label: `Chapa da ${x.qual} ${x.esp}mm (imprimir separado)`,
        layers: [{ region: chapa, z0: 0, z1: x.esp, role: 'face' }],
        material: 'translucido',
        lado: x.qual,
      });
    } else {
      extras.push({
        kind: 'cut',
        name: nome,
        label: `Chapa da ${x.qual} ${x.esp}mm (cortar)`,
        region: chapa,
        espessura: x.esp,
        lado: x.qual,
      });
    }
  }

  // --- espacadores de halo, atras da peca ---
  if (cfg.espacadores > 0) {
    if (cima.tipo !== 'aberta') {
      avisos.push('Espacadores so fazem sentido com o lado de tras aberto: ignorados.');
    } else {
      const raio = Math.max(parede, 3);
      const pts = samplePointsInside(base, raio + 0.5, 3);
      for (const pt of pts) {
        layers.push({ region: circleRegion(pt.x, pt.y, raio), z0: T, z1: T + cfg.espacadores, role: 'espacador' });
      }
      if (!pts.length) avisos.push('Nao cabem espacadores: afaste a letra da parede na instalacao.');
    }
  }

  // --- avisos de fabricacao ---
  if (e > 0 && e < bico) {
    avisos.push(`Borda de ${e}mm e menor que uma linha do bico ${bico}mm: nao vai aparecer na peca.`);
  }
  if (temChapa && batente < bico * 2) {
    avisos.push(`Batente de ${batente}mm e menor que 2 linhas do bico ${bico}mm: a chapa vai apoiar no ar.`);
  }
  if (labio > 0 && parede < bico * 3) {
    avisos.push(`Com labio, a parede precisa de ${(bico * 3).toFixed(1)}mm ou mais para nao descolar.`);
  }
  if (parede < bico * 2) {
    avisos.push(`Parede de ${parede}mm e menor que 2 linhas do bico ${bico}mm: use ${(bico * 2).toFixed(1)}mm ou mais.`);
  }

  return fechar(layers, extras, avisos, base, o, cfg, espessuraMin);
}

/** Volume analitico, avisos de espessura e empacotamento final. */
function fechar(
  layers: Layer[],
  extras: Extra[],
  avisos: string[],
  contorno: Region,
  o: Orientacao,
  cfg: Params,
  espessuraMin?: number
): Part {
  // Cada camada e um prisma reto, entao area x altura e exato, nao aproximado.
  let volume = 0;
  for (const l of layers) volume += regionArea(l.region) * (l.z1 - l.z0);

  const esp = espessuraMin ?? minThickness(contorno);
  if (esp < cfg.bico * 2) {
    avisos.push(`Trecho de ${esp.toFixed(1)}mm e mais fino que 2 linhas do bico ${cfg.bico}mm: vai sair falhado.`);
  }

  const alturaZ = layers.reduce((m, l) => Math.max(m, l.z1), 0);
  return { layers, extras, avisos, volume, alturaZ, orientacao: o.texto, contorno };
}

// ---------------------------------------------------------------------------
// Atalhos: preenchem as escolhas de uma vez, mas nao travam nada.
// ---------------------------------------------------------------------------

export type PresetId = 'macica' | 'oca' | 'moldura_acm' | 'frontlit' | 'backlit';

export interface Preset {
  nome: string;
  desc: string;
  params: Partial<Params>;
}

export const PRESETS: Record<PresetId, Preset> = {
  macica: {
    nome: 'Macica',
    desc: 'Bloco cheio. Acabamento maximo, consumo maximo.',
    params: { macica: true, frente: 'impressa', traseira: 'impressa', profundidade: 40 },
  },
  oca: {
    nome: 'Oca com face',
    desc: 'Face impressa na frente, fundo aberto. O padrao de letra caixa.',
    params: { macica: false, frente: 'impressa', frenteEsp: 2, traseira: 'aberta', parede: 2.4, profundidade: 40 },
  },
  moldura_acm: {
    nome: 'Moldura para chapa ACM',
    desc: 'Corpo com bolsao na frente para receber a chapa cortada, fundo impresso.',
    params: {
      macica: false,
      frente: 'chapa',
      frenteEsp: 3,
      traseira: 'impressa',
      traseiraEsp: 2,
      chapaModo: 'cortar',
      apoio: 'dentro',
      batente: 2.5,
      parede: 2.4,
      profundidade: 40,
    },
  },
  frontlit: {
    nome: 'Luminosa front-lit',
    desc: 'Fundo impresso, face translucida impressa a parte, LED por dentro.',
    params: {
      macica: false,
      frente: 'chapa',
      frenteEsp: 2,
      traseira: 'impressa',
      traseiraEsp: 2,
      chapaModo: 'imprimir',
      apoio: 'dentro',
      batente: 2.5,
      parede: 2.4,
      profundidade: 40,
      comLed: true,
      furoFio: 6,
    },
  },
  backlit: {
    nome: 'Backlit / halo',
    desc: 'Face impressa, fundo aberto e espacadores para a luz vazar atras.',
    params: {
      macica: false,
      frente: 'impressa',
      frenteEsp: 2,
      traseira: 'aberta',
      parede: 2.4,
      profundidade: 40,
      espacadores: 15,
      comLed: true,
    },
  },
};
