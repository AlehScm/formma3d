import {
  shrinkRegion,
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
export type Role = 'corpo' | 'face' | 'parede' | 'traseira' | 'bolsao' | 'bisel' | 'espacador' | 'batente';

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
 * Onde fica o batente da chapa do lado de cima.
 *
 *  dentro - a parede de fora sobe mais e o batente fica por dentro, mais baixo: o degrau
 *           fica virado para dentro e a chapa entra na letra.
 *  fora   - o contrario: o batente sobe e passa da parede de fora, e o degrau fica virado
 *           para fora. Nao tem chapa. A letra nao muda de formato nem de tamanho.
 */
export type Apoio = 'dentro' | 'fora';

export const APOIOS: Record<Apoio, { nome: string; curto: string; desc: string }> = {
  dentro: {
    nome: 'Batente de dentro',
    curto: 'De dentro',
    desc: 'A parede de fora é mais alta e o batente fica por dentro: o degrau vira para dentro e a chapa entra na letra.',
  },
  fora: {
    nome: 'Batente de fora',
    curto: 'De fora',
    desc: 'O batente sobe e passa da parede de fora: o degrau vira para fora. Sem chapa.',
  },
};

/**
 * Como o degrau da chapa e feito.
 *
 *  parede - a parede inteira engrossa o batente, do fundo ate a chapa. Mais forte.
 *  aba    - parede fina no corpo e o batente so logo abaixo da chapa, com rampa de 45°
 *           por baixo para imprimir sem suporte. Gasta bem menos filamento.
 */
export type BatenteModo = 'parede' | 'aba';

export const BATENTES: Record<BatenteModo, { nome: string; desc: string }> = {
  parede: { nome: 'Parede inteira', desc: 'O batente engrossa a parede do fundo até a chapa. Mais forte.' },
  aba: { nome: 'Só a aba', desc: 'Parede fina e o batente só embaixo da chapa, com rampa de 45°. Mais barato.' },
};

export const FECHAMENTOS: Record<Fechamento, { nome: string; desc: string }> = {
  aberta: { nome: 'Aberta', desc: 'Sem tampa deste lado.' },
  impressa: { nome: 'Impressa', desc: 'Tampa sólida, sai junto com a peça.' },
  chapa: { nome: 'Chapa', desc: 'Bolsão para receber chapa de ACM, acrílico ou PVC.' },
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
  /** Largura do degrau interno onde a chapa apoia. */
  batente: number;
  batenteModo: BatenteModo;
  /** Altura da parte reta da aba (modo `aba`), onde a chapa encosta. */
  batenteAltura: number;

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

/**
 * Onde um extra fica com o letreiro montado, no referencial da peca principal.
 * `z` e onde o z=0 do extra encosta; `ordem` diz quanto e para que lado ele se afasta
 * na vista de montagem (1 = um passo para cima, 2 = dois passos, -1 = um para baixo).
 */
export interface Montagem {
  z: number;
  ordem: number;
}

/** Peca que se imprime separada. */
export interface ExtraStl {
  kind: 'stl';
  name: string;
  label: string;
  layers: Layer[];
  material: string;
  lado: LadoNaMesa;
  montagem: Montagem;
}

/** Contorno que se corta em chapa, nao se imprime. */
export interface ExtraCut {
  kind: 'cut';
  name: string;
  label: string;
  region: Region;
  espessura: number;
  lado: LadoNaMesa;
  montagem: Montagem;
}

export type Extra = ExtraStl | ExtraCut;

export interface Part {
  layers: Layer[];
  extras: Extra[];
  avisos: string[];
  volume: number;
  alturaZ: number;
  orientacao: string;
  /** Footprint real da peca: vale para a mesa e para colisao. */
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
  batente: 2.5,
  batenteModo: 'parede',
  batenteAltura: 3,
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
 * deixa o degrau da chapa em balanço, e uma tampa sobre o vazio vira ponte.
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
    return { mesa: 'traseira', texto: 'Traseira na mesa, bolsão da chapa aberto para cima.', podeVirar: false };
  }
  if (t === 'chapa' && f !== 'chapa') {
    return { mesa: 'frente', texto: 'Face na mesa, bolsão do fundo aberto para cima.', podeVirar: false };
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
    return inverte({ mesa: 'traseira', texto: 'Chapa nos dois lados: um bolsão imprime virado para baixo.', podeVirar: true });
  }
  return inverte({ mesa: 'traseira', texto: 'Aberta dos dois lados: tanto faz o lado.', podeVirar: true });
}

/** Nome curto derivado das escolhas, para nomear STL, zip e orcamento. */
export function descreverPeca(p: Params): string {
  if (p.macica) return 'macica';
  const lado = (f: Fechamento) => (f === 'chapa' ? 'chapa' : f === 'impressa' ? 'impressa' : 'aberta');
  const fora = p.apoio === 'fora' && (p.frente === 'chapa' || p.traseira === 'chapa') ? '_batente-fora' : '';
  return `frente-${lado(p.frente)}_fundo-${lado(p.traseira)}${fora}`;
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
  const { profundidade: T, parede, batente, folga, bico, chanfro } = cfg;

  const layers: Layer[] = [];
  const extras: Extra[] = [];
  const avisos: string[] = [];

  let frente = cfg.frente;
  let traseira = cfg.traseira;

  // Peca cheia nao tem cavidade onde encaixar chapa.
  if (cfg.macica && (frente === 'chapa' || traseira === 'chapa')) {
    avisos.push('Peça maciça não tem onde encaixar chapa: a face virou impressa. Desmarque "maciça" para usar chapa.');
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

  const vao = (d: number): Region => diffRegion(region, shrinkRegion(region, d));
  const temMiolo = (d: number): boolean => regionArea(shrinkRegion(region, d)) > 0.01;

  // Sem miolo nao ha parede: vira bloco cheio.
  const espCorpo = parede + (temChapa ? batente : 0);
  if (!temMiolo(espCorpo)) {
    avisos.push('A letra é fina demais para ficar oca com esta parede e este batente: saiu maciça. Reduza a parede ou o batente.');
    layers.push({ region, z0: 0, z1: T, role: 'corpo' });
    return fechar(layers, extras, avisos, region, o, cfg, espessuraMin);
  }

  // Ordena as extremidades conforme a orientacao: `baixo` encosta na mesa.
  const exFrente: Extremidade = { tipo: frente, esp: cfg.frenteEsp, role: 'face', qual: 'frente' };
  const exTraseira: Extremidade = { tipo: traseira, esp: cfg.traseiraEsp, role: 'traseira', qual: 'traseira' };
  const baixo = o.mesa === 'frente' ? exFrente : exTraseira;
  const cima = o.mesa === 'frente' ? exTraseira : exFrente;

  const ocupa = (x: Extremidade) => (x.tipo === 'aberta' ? 0 : x.esp);
  const zBaixo = ocupa(baixo);
  const zCima = T - ocupa(cima);
  const fundoMin = Math.max(bico * 2, 0.8);

  if (zCima - zBaixo < fundoMin) {
    avisos.push(`Profundidade de ${T}mm não cabe as duas faces: aumente a profundidade.`);
  }

  const hAba = Math.max(0, cfg.batenteAltura);
  const soAba = cfg.batenteModo === 'aba' && temChapa && batente > 0;

  /** Parede que engrossa para dentro em degraus de 45°: cada degrau avanca no maximo a propria altura. */
  const rampa = (de: number, ate: number, z0: number, role: Role): Layer[] => {
    const passos = Math.max(1, Math.ceil((ate - de) / 0.4));
    const h = (ate - de) / passos;
    const out: Layer[] = [];
    for (let k = 1; k <= passos; k++) {
      out.push({ region: vao(de + ((ate - de) * k) / passos), z0: z0 + (k - 1) * h, z1: z0 + k * h, role });
    }
    return out;
  };

  // --- extremidade de baixo ---
  monta(baixo, 0, zBaixo, true);
  // --- corpo entre as duas ---
  const zCorpo0 = Math.max(zBaixo, 0);
  const zCorpo1 = Math.max(zCorpo0, zCima);
  if (zCorpo1 > zCorpo0) {
    const papel: Role = temChapa ? 'corpo' : 'parede';
    const abaEmBaixo = baixo.tipo === 'chapa';
    const abaEmCima = cima.tipo === 'chapa';
    const precisa = (abaEmBaixo ? hAba : 0) + (abaEmCima ? hAba + batente : 0);

    if (soAba && zCorpo1 - zCorpo0 >= precisa) {
      // Parede fina no corpo; o batente so onde a chapa encosta.
      let z = zCorpo0;
      if (abaEmBaixo) {
        // Chapa na mesa: a aba vem logo acima dela. Afinar subindo nao e balanco.
        layers.push({ region: vao(espCorpo), z0: z, z1: z + hAba, role: 'batente' });
        z += hAba;
      }
      const zFina = abaEmCima ? zCorpo1 - hAba - batente : zCorpo1;
      if (zFina > z) layers.push({ region: vao(parede), z0: z, z1: zFina, role: papel });
      if (abaEmCima) {
        // Aba no meio da parede ficaria no ar: por baixo, rampa de 45° em degraus.
        layers.push(...rampa(parede, parede + batente, zFina, 'batente'));
        layers.push({ region: vao(espCorpo), z0: zCorpo1 - hAba, z1: zCorpo1, role: 'batente' });
      }
    } else {
      if (soAba) avisos.push('Não cabe só a aba nesta profundidade: o batente ficou na parede inteira.');
      layers.push({ region: vao(espCorpo), z0: zCorpo0, z1: zCorpo1, role: papel });
    }
  }
  // --- extremidade de cima ---
  monta(cima, zCima, T, false);

  function monta(x: Extremidade, z0: number, z1: number, naMesa: boolean): void {
    if (x.tipo === 'aberta' || z1 <= z0) return;

    if (x.tipo === 'impressa') {
      let tampa = region;
      // O furo so faz sentido em tampa fechada, e so quando a peca leva LED.
      if (cfg.comLed && cfg.furoFio > 0) {
        const pts = samplePointsInside(region, cfg.furoFio / 2 + parede, 1);
        if (pts[0]) tampa = diffRegion(region, circleRegion(pts[0].x, pts[0].y, cfg.furoFio / 2));
        else avisos.push('Não cabe furo de fio nesta letra: gerada sem furo.');
      }
      layers.push({ region: tampa, z0, z1, role: x.role, lado: x.qual });
      return;
    }

    if (cfg.apoio === 'fora') {
      // O de dentro ao contrario: o batente sobe e passa da parede de fora, e o degrau
      // fica virado para fora. Sem chapa.
      layers.push({ region: diffRegion(shrinkRegion(region, parede), shrinkRegion(region, espCorpo)), z0, z1, role: 'batente', lado: x.qual });
      if (naMesa) {
        avisos.push(
          `O batente de fora da ${x.qual === 'frente' ? 'frente' : 'traseira'} imprime virado para baixo: a parede de fora fica em balanço. ` +
            'Considere deixar esse lado impresso ou aberto.'
        );
      }
      return;
    }

    // chapa: a cerca sobe reta do fundo do rebaixo ate o topo, nada em balanço
    layers.push({ region: vao(parede), z0, z1, role: 'bolsao', lado: x.qual });

    if (naMesa) {
      avisos.push(
        `O bolsão da ${x.qual === 'frente' ? 'frente' : 'traseira'} imprime virado para baixo: o degrau fica em balanço. ` +
          'Considere deixar esse lado impresso ou aberto.'
      );
    }
    fazerChapa(x, { z: naMesa ? 0 : z1 - x.esp, ordem: naMesa ? -1 : 1 });
  }

  /** A chapa: o vao da cerca menos a folga. */
  function fazerChapa(x: Extremidade, montagem: Montagem): void {
    const chapa = shrinkRegion(region, parede + folga);
    if (!chapa.length) {
      avisos.push('A chapa fica sem área nesta letra: reduza a parede.');
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
        montagem,
      });
    } else {
      extras.push({
        kind: 'cut',
        name: nome,
        label: `Chapa da ${x.qual} ${x.esp}mm (cortar)`,
        region: chapa,
        espessura: x.esp,
        lado: x.qual,
        montagem,
      });
    }
  }

  // --- espacadores de halo, atras da peca ---
  if (cfg.espacadores > 0) {
    if (cima.tipo !== 'aberta') {
      avisos.push('Espaçadores só fazem sentido com o lado de trás aberto: ignorados.');
    } else {
      const raio = Math.max(parede, 3);
      const pts = samplePointsInside(region, raio + 0.5, 3);
      for (const pt of pts) {
        layers.push({ region: circleRegion(pt.x, pt.y, raio), z0: T, z1: T + cfg.espacadores, role: 'espacador' });
      }
      if (!pts.length) avisos.push('Não cabem espaçadores: afaste a letra da parede na instalação.');
    }
  }

  // --- avisos de fabricacao ---
  if (temChapa && batente < bico * 2) {
    avisos.push(`Batente de ${batente}mm é menor que 2 linhas do bico ${bico}mm: a chapa vai apoiar no ar.`);
  }
  if (parede < bico * 2) {
    avisos.push(`Parede de ${parede}mm é menor que 2 linhas do bico ${bico}mm: use ${(bico * 2).toFixed(1)}mm ou mais.`);
  }

  return fechar(layers, extras, avisos, region, o, cfg, espessuraMin);
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
    avisos.push(`Trecho de ${esp.toFixed(1)}mm é mais fino que 2 linhas do bico ${cfg.bico}mm: vai sair falhado.`);
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
    nome: 'Maciça',
    desc: 'Bloco cheio. Acabamento máximo, consumo máximo.',
    params: { macica: true, frente: 'impressa', traseira: 'impressa', profundidade: 40 },
  },
  oca: {
    nome: 'Oca com face',
    desc: 'Face impressa na frente, fundo aberto. O padrão de letra caixa.',
    params: { macica: false, frente: 'impressa', frenteEsp: 2, traseira: 'aberta', parede: 2.4, profundidade: 40 },
  },
  moldura_acm: {
    nome: 'Moldura para chapa ACM',
    desc: 'Corpo com bolsão na frente para receber a chapa cortada, fundo impresso.',
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
    desc: 'Fundo impresso, face translúcida impressa à parte, LED por dentro.',
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
    desc: 'Face impressa, fundo aberto e espaçadores para a luz vazar atrás.',
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
