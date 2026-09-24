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
// Cada modo declara a propria orientacao para que nenhuma camada dependa de suporte.

export type ModoId = 'macica' | 'oca' | 'moldura_acm' | 'frontlit' | 'backlit';

/** Papel de cada camada na peca. Governa a cor no preview e o que o usuario entende. */
export type Role = 'corpo' | 'face' | 'parede' | 'traseira' | 'bolsao' | 'bisel' | 'espacador' | 'borda' | 'labio';

/**
 * Como a chapa (ACM/acrilico) se apoia na peca impressa.
 *
 *  dentro   - a chapa e menor que a letra e fica embutida num bolsao, apoiada num
 *             degrau interno. A borda da peca fica rente com a face da chapa.
 *  fora     - a peca ganha uma aba que projeta `borda` mm para FORA do contorno.
 *             A chapa tem o tamanho da letra, assenta sobre a parede e fica cercada
 *             pela aba. A peca final mede letra + 2x borda.
 *  canaleta - os dois ao mesmo tempo: degrau interno segurando por baixo e aba
 *             externa cercando por fora. A chapa fica travada dos dois lados.
 */
export type Apoio = 'dentro' | 'fora' | 'canaleta';

export const APOIOS: Record<Apoio, { nome: string; desc: string }> = {
  dentro: {
    nome: 'Para dentro (embutida)',
    desc: 'Chapa menor que a letra, encaixada num bolsao e apoiada num degrau interno.',
  },
  fora: {
    nome: 'Para fora (bordinha)',
    desc: 'Aba projetada para fora: a chapa tem o tamanho da letra e fica cercada pela borda.',
  },
  canaleta: {
    nome: 'Dos dois lados',
    desc: 'Degrau interno por baixo e aba externa por fora: a chapa trava nos dois lados.',
  },
};

export interface ModoInfo {
  nome: string;
  desc: string;
  orientacao: string;
  permiteBisel: boolean;
}

export const MODOS: Record<ModoId, ModoInfo> = {
  macica: {
    nome: 'Macica',
    desc: 'Bloco extrudado inteiro. Acabamento maximo, consumo maximo.',
    orientacao: 'Traseira na mesa, face para cima.',
    permiteBisel: true,
  },
  oca: {
    nome: 'Oca com face',
    desc: 'Face frontal + parede lateral, fundo aberto. O padrao de letra caixa.',
    orientacao: 'Face na mesa (sai lisa), parede subindo, fundo aberto para cima.',
    permiteBisel: false,
  },
  moldura_acm: {
    nome: 'Moldura para chapa ACM',
    desc: 'So o corpo, com batente interno para receber a chapa de ACM na frente.',
    orientacao: 'Traseira na mesa, bolsao da chapa aberto para cima.',
    permiteBisel: false,
  },
  frontlit: {
    nome: 'Luminosa front-lit',
    desc: 'Traseira fechada + parede + face translucida encaixada. LED por dentro.',
    orientacao: 'Traseira na mesa, cavidade do LED aberta para cima.',
    permiteBisel: false,
  },
  backlit: {
    nome: 'Backlit / halo',
    desc: 'Face opaca + parede, fundo aberto e espacadores para a luz vazar atras.',
    orientacao: 'Face na mesa, espacadores no topo.',
    permiteBisel: false,
  },
};

/** Prisma reto: uma Region entre dois planos Z. A peca inteira e uma lista destes. */
export interface Layer {
  region: Region;
  z0: number;
  z1: number;
  role: Role;
}

export interface BiselCfg {
  ativo: boolean;
  tamanho: number;
  altura: number;
  passos: number;
}

export interface Params {
  modo: ModoId;
  profundidade: number;
  parede: number;
  face: number;
  traseira: number;
  comTraseira: boolean;
  acmEsp: number;
  acmFolga: number;
  batente: number;
  /** Como a chapa se apoia. Ver `Apoio`. */
  apoio: Apoio;
  /** Quanto a borda projeta para fora do contorno, em mm (apoios 'fora' e 'canaleta'). */
  borda: number;
  /** Quanto a cerca sobe acima da chapa, travando-a pela frente (apoio 'canaleta'). */
  labio: number;
  bisel: BiselCfg;
  standoff: number;
  faceTransEsp: number;
  furoFio: number;
  bico: number;
}

/** Peca que se imprime separada (face translucida). */
export interface ExtraStl {
  kind: 'stl';
  name: string;
  label: string;
  layers: Layer[];
  material: string;
}

/** Contorno que se corta em chapa, nao se imprime. */
export interface ExtraCut {
  kind: 'cut';
  name: string;
  label: string;
  region: Region;
  espessura: number;
}

export type Extra = ExtraStl | ExtraCut;

export interface Part {
  layers: Layer[];
  extras: Extra[];
  avisos: string[];
  volume: number;
  alturaZ: number;
  modo: ModoId;
  orientacao: string;
  /**
   * Footprint real da peca impressa. Com borda ele e maior que a letra, e e ele
   * que vale para caber na mesa, para o nesting e para testar colisao com a vizinha.
   */
  contorno: Region;
}

export const PARAMS_PADRAO: Params = {
  modo: 'macica',
  profundidade: 40,
  parede: 2.4,
  face: 2,
  traseira: 2,
  comTraseira: true,
  acmEsp: 3,
  acmFolga: 0.3,
  batente: 2.5,
  apoio: 'dentro',
  borda: 3,
  labio: 1,
  bisel: { ativo: false, tamanho: 1.5, altura: 1.5, passos: 6 },
  standoff: 15,
  faceTransEsp: 2,
  furoFio: 6,
  bico: 0.4,
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

/**
 * Gera a peca de uma letra a partir da Region 2D e dos parametros de fabricacao.
 * Sempre camadas prismaticas -- nunca CSG, que quebra em contorno de fonte.
 */
export function buildPart(region: Region, p: Partial<Params> = {}, espessuraMin?: number): Part {
  const cfg: Params = { ...PARAMS_PADRAO, ...p, bisel: { ...PARAMS_PADRAO.bisel, ...p.bisel } };
  const { modo, profundidade: T, parede, face, traseira, comTraseira, acmEsp, acmFolga, batente, apoio, borda, bisel, standoff, faceTransEsp, furoFio, bico } = cfg;

  const layers: Layer[] = [];
  const extras: Extra[] = [];
  const avisos: string[] = [];
  // Sem borda o footprint e a propria letra; o ramo da chapa substitui quando dilata.
  let contorno: Region = region;

  const vao = (d: number): Region => diffRegion(region, shrinkRegion(region, d)); // anel de espessura d
  const temMiolo = (d: number): boolean => regionArea(shrinkRegion(region, d)) > 0.01;

  if (modo === 'macica') {
    if (bisel.ativo) {
      const bAlt = Math.min(bisel.altura, T - 0.4);
      layers.push({ region, z0: 0, z1: T - bAlt, role: 'corpo' });
      layers.push(...bevelLayers(region, { ...bisel, altura: bAlt }, T));
    } else {
      layers.push({ region, z0: 0, z1: T, role: 'corpo' });
    }
  } else if (modo === 'oca') {
    layers.push({ region, z0: 0, z1: face, role: 'face' });
    if (!temMiolo(parede)) {
      avisos.push('A letra e fina demais para ficar oca com esta parede: saiu macica.');
      layers.push({ region, z0: face, z1: T, role: 'corpo' });
    } else {
      layers.push({ region: vao(parede), z0: face, z1: T, role: 'parede' });
    }
  } else if (modo === 'moldura_acm' || modo === 'frontlit') {
    const comFundo = modo === 'frontlit' ? true : comTraseira;
    const espChapa = modo === 'frontlit' ? faceTransEsp : acmEsp;
    const zFundo = comFundo ? traseira : 0;
    const zBolsao = T - espChapa;

    // A peca inteira cresce `borda` mm desde a base. Este e o ponto central:
    // material que se projetasse para fora SO na frente ficaria em voladico e
    // desabaria na impressao. Dilatando desde z=0, a parede sobe reta e imprime.
    const e = apoio === 'dentro' ? 0 : Math.max(0, borda);
    const { base, preservados } = dilataComMiolo(region, e, Math.max(bico * 2, 0.8));
    contorno = base;
    if (preservados > 0) {
      avisos.push(
        `${preservados} vazado(s) interno(s) fechariam com borda de ${e}mm: mantidos no tamanho original, sem borda no miolo.`
      );
    }

    // Daqui para baixo tudo trabalha sobre `base`, nao sobre `region`.
    const vaoB = (d: number): Region => diffRegion(base, shrinkRegion(base, d));
    const temMioloB = (d: number): boolean => regionArea(shrinkRegion(base, d)) > 0.01;

    // O labio e o trecho da cerca que sobe acima da chapa: e o que trava a chapa
    // pela frente no apoio 'canaleta'.
    let labio = apoio === 'canaleta' ? Math.max(0, cfg.labio) : 0;
    const fundoMin = Math.max(bico * 2, 0.8);
    if (zFundo + fundoMin + espChapa + labio > T) {
      labio = Math.max(0, T - zFundo - fundoMin - espChapa);
      if (apoio === 'canaleta') avisos.push(`Sem profundidade para o labio inteiro: reduzido para ${labio.toFixed(1)}mm.`);
    }
    const zTopoChapa = T - labio;
    const zChapa = zTopoChapa - espChapa;

    if (comFundo) {
      let fundoRegion = base;
      if (furoFio > 0) {
        const pts = samplePointsInside(base, furoFio / 2 + parede, 1);
        if (pts[0]) fundoRegion = diffRegion(base, circleRegion(pts[0].x, pts[0].y, furoFio / 2));
        else avisos.push('Nao cabe furo de fio nesta letra: gerada sem furo.');
      }
      layers.push({ region: fundoRegion, z0: 0, z1: traseira, role: 'traseira' });
    }

    if (!temMioloB(parede + batente)) {
      avisos.push(
        e > 0
          ? `Mesmo com borda de ${e}mm nao ha miolo para o batente: saiu macica. Aumente a borda ou reduza parede/batente.`
          : 'Sem espaco para batente: a chapa nao tem onde apoiar nesta letra. Saiu macica. Experimente o apoio "para fora".'
      );
      layers.push({ region: base, z0: zFundo, z1: T, role: 'corpo' });
    } else {
      if (zChapa > zFundo) {
        layers.push({ region: vaoB(parede + batente), z0: zFundo, z1: zChapa, role: 'corpo' });
      } else {
        avisos.push('Profundidade menor que a espessura da chapa: aumente a profundidade.');
      }

      // A mesma cerca sobe do fundo do rebaixo ate o topo: nada fica em voladico.
      const cerca = vaoB(parede);
      const z0c = Math.max(zFundo, zChapa);
      layers.push({ region: cerca, z0: z0c, z1: Math.max(z0c, zTopoChapa), role: e > 0 ? 'borda' : 'bolsao' });
      if (labio > 0) layers.push({ region: cerca, z0: zTopoChapa, z1: T, role: 'labio' });

      if (e > 0 && e < bico) {
        avisos.push(`Borda de ${e}mm e menor que uma linha do bico ${bico}mm: nao vai aparecer na peca.`);
      }
      if (batente < bico * 2) {
        avisos.push(`Batente de ${batente}mm e menor que 2 linhas do bico ${bico}mm: a chapa vai apoiar no ar.`);
      }
      if (labio > 0 && parede < bico * 3) {
        avisos.push(`Com labio, a parede precisa de ${(bico * 3).toFixed(1)}mm ou mais para nao descolar.`);
      }

      // A chapa e sempre o vao da cerca menos a folga. Com borda = parede + folga
      // ela sai exatamente no contorno da arte original.
      const chapa = shrinkRegion(base, parede + acmFolga);
      if (chapa.length) {
        if (modo === 'frontlit') {
          extras.push({
            kind: 'stl',
            name: 'face-translucida',
            label: 'Face translucida (imprimir separado)',
            layers: [{ region: chapa, z0: 0, z1: faceTransEsp, role: 'face' }],
            material: 'translucido',
          });
        } else {
          extras.push({
            kind: 'cut',
            name: 'chapa-acm',
            label: `Chapa ACM ${acmEsp}mm (cortar)`,
            region: chapa,
            espessura: acmEsp,
          });
        }
      }
    }
  } else if (modo === 'backlit') {
    layers.push({ region, z0: 0, z1: face, role: 'face' });
    if (!temMiolo(parede)) {
      avisos.push('Letra fina demais para vazar atras: saiu macica.');
      layers.push({ region, z0: face, z1: T, role: 'corpo' });
    } else {
      layers.push({ region: vao(parede), z0: face, z1: T, role: 'parede' });
      const raio = Math.max(parede, 3);
      const pts = samplePointsInside(region, raio + 0.5, 3);
      for (const pt of pts) {
        layers.push({ region: circleRegion(pt.x, pt.y, raio), z0: T, z1: T + standoff, role: 'espacador' });
      }
      if (!pts.length) avisos.push('Nao cabem espacadores: afaste a letra da parede na instalacao.');
    }
  }

  // Volume exato: cada camada e um prisma reto, entao area x altura e analitico.
  let volume = 0;
  for (const l of layers) volume += regionArea(l.region) * (l.z1 - l.z0);

  // minThickness e caro (abertura morfologica em busca binaria) e nao depende dos
  // parametros de fabricacao. Quem chama em loop deve calcular uma vez por letra.
  const esp = espessuraMin ?? minThickness(region);
  if (esp < bico * 2) {
    avisos.push(`Trecho de ${esp.toFixed(1)}mm e mais fino que 2 linhas do bico ${bico}mm: vai sair falhado.`);
  }
  if (layers.some((l) => l.role === 'parede' || l.role === 'bolsao') && parede < bico * 2) {
    avisos.push(`Parede de ${parede}mm e menor que 2 linhas do bico ${bico}mm: use ${(bico * 2).toFixed(1)}mm ou mais.`);
  }

  const alturaZ = layers.reduce((m, l) => Math.max(m, l.z1), 0);
  return { layers, extras, avisos, volume, alturaZ, modo, orientacao: MODOS[modo].orientacao, contorno };
}
