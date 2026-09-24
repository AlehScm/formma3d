import {
  buildRegion,
  strokeToRegion,
  unionRegion,
  intersectRegion,
  regionArea,
  regionBounds,
  boundsDentro,
  scaleRegion,
  translateRegion,
  agruparPorProximidade,
  type Region,
} from '../geom/region';
import type { ClipEntry, DesenhoBruto, ObjetoBruto } from './pdf-ops';

export type ModoSeparacao = 'forma' | 'objeto' | 'camada';

export interface PecaImportada {
  nome: string;
  region: Region;
}

/** Peca antes de receber o numero de ordem. */
interface PecaCrua {
  rotulo: string | null;
  region: Region;
}

export interface OpcoesPecas {
  modo: ModoSeparacao;
  /** Inclui paths que so tem traco. Por padrao so entram se o arquivo nao tiver nenhum preenchimento. */
  incluirTracos: boolean;
  /** Une pecas separadas por menos que isto (mm): pingo do i, til, acento. 0 desliga. */
  fundirProximos: number;
  /** Altura total desejada em mm. Escala o conjunto inteiro preservando a proporcao. */
  altura?: number;
  /** Descarta sujeira de vetorizacao abaixo desta area (mm2). */
  areaMinima: number;
}

export const OPCOES_PADRAO: OpcoesPecas = {
  modo: 'forma',
  incluirTracos: false,
  fundirProximos: 0,
  areaMinima: 1,
};

/**
 * Aplica o recorte so quando ele pode mudar alguma coisa.
 * O caso dominante (recorte de prancheta, BBox de XObject) e um retangulo que
 * contem o objeto inteiro, e ai da para pular a intersecao no Clipper.
 */
function aplicarClip(r: Region, clip: ClipEntry | null): Region {
  if (!clip) return r;
  if (!clip.region.length) return [];
  if (clip.isRect && boundsDentro(regionBounds(r), clip.bounds)) return r;
  return intersectRegion(r, clip.region);
}

function objetoParaRegion(obj: ObjetoBruto): Region {
  if (obj.paint === 'stroke') {
    return aplicarClip(strokeToRegion(obj.contours, obj.larguraMm, obj.capRound), obj.clip);
  }
  const fechados = obj.contours.filter((c) => c.pts.length >= 3).map((c) => c.pts);
  if (!fechados.length) return [];
  return aplicarClip(buildRegion(fechados, obj.fillRule), obj.clip);
}

function elegiveis(d: DesenhoBruto, o: OpcoesPecas): ObjetoBruto[] {
  // Traco sem preenchimento costuma ser linha de corte, guia ou marca de registro.
  // So entra quando o usuario pede, ou quando o arquivo nao tem preenchimento nenhum.
  const aceitaTraco = o.incluirTracos || !d.temFill;
  return d.objetos.filter((obj) => (obj.paint === 'fill' ? true : aceitaTraco));
}

/**
 * Ordena da esquerda para a direita -- a ordem em que se le o letreiro -- e so
 * entao numera, para que o numero sempre corresponda a posicao final.
 */
function ordenarENomear(cruas: PecaCrua[]): PecaImportada[] {
  return cruas
    .map((p) => ({ p, minX: regionBounds(p.region).minX }))
    .sort((a, b) => a.minX - b.minX)
    .map(({ p }, i) => {
      const n = String(i + 1).padStart(2, '0');
      return { nome: p.rotulo ? `${n}-${p.rotulo}` : n, region: p.region };
    });
}

/**
 * Desenho importado -> pecas independentes.
 *
 * 'forma'  : une tudo e cada ilha do resultado vira uma peca. O Clipper ja funde
 *            o que se toca, entao cada Poly ja e uma peca fabricavel.
 * 'objeto' : uma peca por operacao de pintura do arquivo.
 * 'camada' : agrupa por camada (OCG), quando o arquivo tiver camadas nomeadas.
 */
export function desenhoParaPecas(d: DesenhoBruto, o: OpcoesPecas = OPCOES_PADRAO): PecaImportada[] {
  const objs = elegiveis(d, o);
  if (!objs.length) return [];

  let cruas: PecaCrua[] = [];

  if (o.modo === 'objeto') {
    cruas = objs.map((obj) => ({ rotulo: obj.camada, region: objetoParaRegion(obj) }));
  } else if (o.modo === 'camada') {
    const grupos = new Map<string, Region>();
    for (const obj of objs) {
      const r = objetoParaRegion(obj);
      if (!r.length) continue;
      const chave = obj.camada ?? 'sem-camada';
      grupos.set(chave, unionRegion(grupos.get(chave) ?? [], r));
    }
    cruas = [...grupos.entries()].map(([rotulo, region]) => ({ rotulo, region }));
  } else {
    // Caminho rapido: sem recorte e com fillRule uniforme, uma unica passada do
    // Clipper resolve tudo, em vez de N unioes em cascata.
    const semClip = objs.every((x) => !x.clip);
    const soFill = objs.every((x) => x.paint === 'fill');
    const regraUnica = objs.every((x) => x.fillRule === objs[0]!.fillRule);

    let total: Region;
    if (semClip && soFill && regraUnica) {
      const todos = objs.flatMap((obj) => obj.contours.filter((c) => c.pts.length >= 3).map((c) => c.pts));
      total = buildRegion(todos, objs[0]!.fillRule);
    } else {
      total = objs.reduce<Region>((acc, obj) => unionRegion(acc, objetoParaRegion(obj)), []);
    }

    const grupos = o.fundirProximos > 0 ? agruparPorProximidade(total, o.fundirProximos) : total.map((p) => [p]);
    cruas = grupos.map((region) => ({ rotulo: null, region }));
  }

  // Sujeira de exportacao: pontos soltos e restos de traco viram pecas de 0.1mm.
  cruas = cruas.filter((p) => p.region.length > 0 && regionArea(p.region) >= o.areaMinima);
  let pecas = ordenarENomear(cruas);

  if (o.altura && o.altura > 0 && pecas.length) {
    // Escala pelo conjunto, nunca peca a peca: o espacamento entre letras precisa
    // acompanhar, senao o letreiro se desmonta.
    const todas = pecas.flatMap((p) => p.region);
    const b = regionBounds(todas);
    if (b.h > 0) {
      const s = o.altura / b.h;
      pecas = pecas.map((p) => ({ ...p, region: scaleRegion(p.region, s) }));
    }
  }

  // Canto inferior esquerdo do conjunto em (0,0), como normalizeLetters faz.
  const bb = regionBounds(pecas.flatMap((p) => p.region));
  if (bb.minX !== 0 || bb.minY !== 0) {
    pecas = pecas.map((p) => ({ ...p, region: translateRegion(p.region, -bb.minX, -bb.minY) }));
  }
  return pecas;
}
