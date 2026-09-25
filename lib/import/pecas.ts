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
  type Pt,
} from '../geom/region';
import type { ClipEntry, DesenhoBruto, ObjetoBruto } from './pdf-ops';

export type ModoSeparacao = 'forma' | 'objeto' | 'camada';

/**
 * O que fazer com caminho que so tem traco, sem preenchimento.
 *
 * 'ignorar'   : descarta. Traco solto costuma ser linha de corte, guia ou marca
 *               de registro.
 * 'preencher' : um contorno FECHADO e o limite de uma forma -- e assim que chega
 *               um arquivo que e "so o contorno da peca". A area cercada e a
 *               peca. Traco aberto nao cerca area nenhuma, entao continua sendo
 *               engrossado.
 * 'engrossar' : vira fita da largura da linha, como o "Expandir" do Illustrator.
 *               Util quando a linha e o desenho (risco, filete), inutil quando o
 *               arquivo tem traco de 0.2mm.
 * 'auto'      : decide pelo desenho. Ver `resolverTracos`.
 */
export type ModoTraco = 'auto' | 'ignorar' | 'preencher' | 'engrossar';

export type TracoResolvido = Exclude<ModoTraco, 'auto'>;

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
  /** O que fazer com caminho so de traco. 'auto' decide pelo desenho. */
  tracos: ModoTraco;
  /** Une pecas separadas por menos que isto (mm): pingo do i, til, acento. 0 desliga. */
  fundirProximos: number;
  /** Altura total desejada em mm. Escala o conjunto inteiro preservando a proporcao. */
  altura?: number;
  /** Descarta sujeira de vetorizacao abaixo desta area (mm2). */
  areaMinima: number;
}

export const OPCOES_PADRAO: OpcoesPecas = {
  modo: 'forma',
  tracos: 'auto',
  fundirProximos: 0,
  areaMinima: 1,
};

/** Area de um anel fechado, por Gauss. Nao precisa do Clipper: e so para comparar. */
function areaAnel(pts: Pt[]): number {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    s += (pts[j]!.x + pts[i]!.x) * (pts[j]!.y - pts[i]!.y);
  }
  return Math.abs(s) / 2;
}

/** Soma as areas cercadas pelos contornos fechados de um objeto. */
function areaCercada(obj: ObjetoBruto): number {
  return obj.contours.reduce((a, c) => (c.closed && c.pts.length >= 3 ? a + areaAnel(c.pts) : a), 0);
}

/**
 * Decide o que fazer com traco quando o pedido e 'auto'.
 *
 * O caso que importa: um arquivo que e "so o contorno da peca". Ali o desenho
 * inteiro esta em caminhos fechados sem preenchimento, e engrossar a linha daria
 * uma fita de decimos de milimetro -- nao uma peca. Por outro lado, traco solto
 * num arquivo normal e linha de corte ou guia, e tem que sair.
 *
 * O que separa os dois casos e quanta area os contornos fechados cercam: quando
 * cercam mais que os preenchimentos, sao ELES o desenho.
 */
export function resolverTracos(d: DesenhoBruto, pedido: ModoTraco): TracoResolvido {
  if (pedido !== 'auto') return pedido;

  const tracos = d.objetos.filter((o) => o.paint === 'stroke');
  if (!tracos.length) return 'ignorar';

  const temCercada = tracos.some((o) => areaCercada(o) > 0);

  // Sem preenchimento nenhum, o traco e tudo que o arquivo tem: descartar deixaria
  // a tela vazia. Contorno fechado vale pela area que cerca; linha aberta nao cerca
  // nada, e so engrossando vira peca.
  const cheios = d.objetos.filter((o) => o.paint === 'fill');
  if (!d.temFill || !cheios.length) return temCercada ? 'preencher' : 'engrossar';

  // Ha desenho preenchido: linha aberta solta ali e guia ou cota, nao peca.
  if (!temCercada) return 'ignorar';

  // Moldura: um traco que cerca TODO o desenho preenchido e borda de prancheta,
  // linha de corte ou marca de sangria -- nunca o assunto do arquivo. E preciso
  // descontar, porque uma moldura cerca sempre mais area que o desenho que ela
  // envolve, e sozinha ganharia a comparacao em qualquer arquivo.
  const bCheios = regionBounds(cheios.flatMap((o) => o.contours.map((c) => ({ outer: c.pts, holes: [] }))));
  const cercada = tracos
    .filter((o) => !boundsDentro(bCheios, o.bounds))
    .reduce((a, o) => a + areaCercada(o), 0);
  if (cercada <= 0) return 'ignorar';

  const preenchida = cheios.reduce((a, o) => a + areaCercada(o), 0);
  return cercada > preenchida ? 'preencher' : 'ignorar';
}

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

function objetoParaRegion(obj: ObjetoBruto, traco: TracoResolvido): Region {
  if (obj.paint === 'stroke') {
    // Um contorno fechado sem preenchimento e o limite de uma forma, nao uma
    // linha: o que se quer dele e a area que ele cerca. Engrossar daria uma fita
    // da largura da linha -- 0.2mm num arquivo de CorelDRAW, que nao e peca.
    // Traco ABERTO nao cerca area, entao esse sim so vira peca engrossando.
    if (traco === 'preencher') {
      const fechados = obj.contours.filter((c) => c.closed && c.pts.length >= 3).map((c) => c.pts);
      const abertos = obj.contours.filter((c) => !c.closed && c.pts.length >= 2);
      let r = fechados.length ? buildRegion(fechados, obj.fillRule) : [];
      if (abertos.length) r = unionRegion(r, strokeToRegion(abertos, obj.larguraMm, obj.capRound));
      return aplicarClip(r, obj.clip);
    }
    return aplicarClip(strokeToRegion(obj.contours, obj.larguraMm, obj.capRound), obj.clip);
  }
  const fechados = obj.contours.filter((c) => c.pts.length >= 3).map((c) => c.pts);
  if (!fechados.length) return [];
  return aplicarClip(buildRegion(fechados, obj.fillRule), obj.clip);
}

function elegiveis(d: DesenhoBruto, traco: TracoResolvido): ObjetoBruto[] {
  return d.objetos.filter((obj) => obj.paint === 'fill' || traco !== 'ignorar');
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
  const traco = resolverTracos(d, o.tracos);
  const objs = elegiveis(d, traco);
  if (!objs.length) return [];

  let cruas: PecaCrua[] = [];

  if (o.modo === 'objeto') {
    cruas = objs.map((obj) => ({ rotulo: obj.camada, region: objetoParaRegion(obj, traco) }));
  } else if (o.modo === 'camada') {
    const grupos = new Map<string, Region>();
    for (const obj of objs) {
      const r = objetoParaRegion(obj, traco);
      if (!r.length) continue;
      const chave = obj.camada ?? 'sem-camada';
      grupos.set(chave, unionRegion(grupos.get(chave) ?? [], r));
    }
    cruas = [...grupos.entries()].map(([rotulo, region]) => ({ rotulo, region }));
  } else {
    // Caminho rapido: sem recorte e com fillRule uniforme, uma unica passada do
    // Clipper resolve tudo, em vez de N unioes em cascata.
    //
    // Vale so para non-zero. Even-odd e regra DE UM objeto, nao do conjunto: numa
    // passada unica o que se sobrepoe entre objetos distintos se cancela, e duas
    // formas encostadas viram buraco ou desaparecem. Nesse caso cada objeto e
    // resolvido com a sua regra e a uniao vem depois.
    const semClip = objs.every((x) => !x.clip);
    const soFill = objs.every((x) => x.paint === 'fill');
    const regraUnica = objs.every((x) => x.fillRule === 'nonzero');

    let total: Region;
    if (semClip && soFill && regraUnica) {
      const todos = objs.flatMap((obj) => obj.contours.filter((c) => c.pts.length >= 3).map((c) => c.pts));
      total = buildRegion(todos, objs[0]!.fillRule);
    } else {
      total = objs.reduce<Region>((acc, obj) => unionRegion(acc, objetoParaRegion(obj, traco)), []);
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
