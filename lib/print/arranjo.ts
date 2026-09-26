import { offsetRegion, regionBounds, rotateRegion, type Region } from '../geom/region';
import { caberNaMesa, type Impressora } from './impressoras';

/**
 * Encaixe das pecas dentro da mesa da impressora.
 *
 * Isto NAO muda o produto: so decide onde cada peca se acomoda para imprimir. O
 * letreiro, a chapa, o gabarito e o preco continuam iguais.
 *
 * O encaixe e por bitmap, nao por caixa envolvente. Letra e forma esparsa: um "L"
 * entra no vao de outro "L", e um "T" abriga a perna de um vizinho. Empacotar pelo
 * retangulo jogaria metade da mesa fora. Rasterizar num grid de 1mm e testar
 * mascara contra mascara resolve forma concava com codigo simples e verificavel.
 */

export interface Colocada {
  nome: string;
  /** Deslocamento a aplicar DEPOIS do giro, em mm. */
  dx: number;
  dy: number;
  /** Giro em graus, em torno do centro da peca. */
  giro: number;
}

export interface Arranjo {
  colocadas: Colocada[];
  /** Nomes que nao entraram nesta placa. */
  sobraram: string[];
  /** Quantas placas o conjunto inteiro pediria, repetindo o encaixe no que sobra. */
  placas: number;
  /**
   * Colocacoes de cada placa, na ordem (a primeira e `colocadas`). E o que permite
   * exportar "todas as placas" sem rearrumar nada no fatiador.
   */
  todas: Colocada[][];
}

export interface PecaArranjo {
  nome: string;
  region: Region;
  /** Angulo que `caberNaMesa` achou para esta peca. Entra como candidato. */
  giroQueCabe: number;
}

/** Lado da celula do grid, em mm. */
const CELULA = 1;
/** Passo da varredura de posicao, em celulas. 2mm anda rapido e perde pouco. */
const PASSO = 2;

interface Mascara {
  /** Largura e altura em celulas. */
  cw: number;
  ch: number;
  bits: Uint8Array;
  /** Canto inferior esquerdo da mascara no espaco da peca, em mm. */
  minX: number;
  minY: number;
}

/**
 * Rasteriza a regiao numa mascara de celulas cheias.
 *
 * Os aneis internos contam como OCUPADOS: caberia fisicamente uma peca pequena
 * dentro do miolo de um "O", mas os brims se encostariam na mesa.
 */
function rasterizar(region: Region): Mascara {
  const b = regionBounds(region);
  const cw = Math.max(1, Math.ceil(b.w / CELULA));
  const ch = Math.max(1, Math.ceil(b.h / CELULA));
  const bits = new Uint8Array(cw * ch);

  // Scanline por linha de celula, no centro da celula. So os aneis externos, que e
  // o que faz o miolo contar como ocupado.
  const arestas: { x0: number; y0: number; x1: number; y1: number }[] = [];
  for (const poly of region) {
    const pts = poly.outer;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[j]!;
      const c = pts[i]!;
      if (a.y !== c.y) arestas.push({ x0: a.x, y0: a.y, x1: c.x, y1: c.y });
    }
  }

  const cruzamentos: number[] = [];
  for (let gy = 0; gy < ch; gy++) {
    const y = b.minY + (gy + 0.5) * CELULA;
    cruzamentos.length = 0;
    for (const e of arestas) {
      if (e.y0 > y !== e.y1 > y) {
        cruzamentos.push(e.x0 + ((y - e.y0) / (e.y1 - e.y0)) * (e.x1 - e.x0));
      }
    }
    if (cruzamentos.length < 2) continue;
    cruzamentos.sort((p, q) => p - q);
    // Par a par: com aneis externos nao aninhados, par-impar e exato.
    for (let k = 0; k + 1 < cruzamentos.length; k += 2) {
      const xa = cruzamentos[k]!;
      const xb = cruzamentos[k + 1]!;
      let ga = Math.floor((xa - b.minX) / CELULA);
      let gb = Math.ceil((xb - b.minX) / CELULA);
      if (ga < 0) ga = 0;
      if (gb > cw) gb = cw;
      const base = gy * cw;
      for (let gx = ga; gx < gb; gx++) bits[base + gx] = 1;
    }
  }
  return { cw, ch, bits, minX: b.minX, minY: b.minY };
}

/** A mascara cabe na placa com o canto em (ox, oy), sem encostar no que ja esta lá? */
function livre(placa: Uint8Array, pw: number, ph: number, m: Mascara, ox: number, oy: number): boolean {
  if (ox < 0 || oy < 0 || ox + m.cw > pw || oy + m.ch > ph) return false;
  for (let y = 0; y < m.ch; y++) {
    const linhaM = y * m.cw;
    const linhaP = (oy + y) * pw + ox;
    for (let x = 0; x < m.cw; x++) {
      if (m.bits[linhaM + x] && placa[linhaP + x]) return false;
    }
  }
  return true;
}

function marcar(placa: Uint8Array, pw: number, m: Mascara, ox: number, oy: number): void {
  for (let y = 0; y < m.ch; y++) {
    const linhaM = y * m.cw;
    const linhaP = (oy + y) * pw + ox;
    for (let x = 0; x < m.cw; x++) if (m.bits[linhaM + x]) placa[linhaP + x] = 1;
  }
}

/** Candidatos de giro. Em peca deitada o giro no plano e de graca. */
function angulos(giroQueCabe: number): number[] {
  const set = new Set<number>([0, 90, 180, 270]);
  // Sem este, o app se contradiz: `caberNaMesa` diz "cabe girada 45 graus" e o
  // arranjo nao consegue colocar, porque 45 nao estaria na lista.
  const g = ((giroQueCabe % 360) + 360) % 360;
  set.add(g);
  set.add((g + 90) % 360);
  return [...set];
}

/** Gira a regiao em torno do centro dela e devolve a regiao mais o centro usado. */
function girarNoCentro(region: Region, giro: number): Region {
  if (giro === 0) return region;
  const b = regionBounds(region);
  return rotateRegion(region, giro, b.minX + b.w / 2, b.minY + b.h / 2);
}

interface Preparada {
  nome: string;
  giro: number;
  /** Regiao girada e dilatada pela folga, so para rasterizar. */
  mascara: Mascara;
  /** Bounds da regiao girada SEM dilatacao: e a peca de verdade. */
  minX: number;
  minY: number;
  area: number;
}

/**
 * Encaixa o maximo de pecas na placa.
 *
 * `folga` e o espaco livre exigido entre duas pecas, em mm -- o lugar do brim e do
 * skirt. Cada peca e dilatada em metade disso, entao duas vizinhas encostando as
 * dilatacoes ficam a `folga` de distancia.
 */
export function arrumar(pecas: PecaArranjo[], m: Impressora, folga = 3): Arranjo {
  const pw = Math.max(1, Math.floor(m.x / CELULA));
  const ph = Math.max(1, Math.floor(m.y / CELULA));

  // Preparar cada peca em cada giro candidato, uma vez.
  const opcoes = new Map<string, Preparada[]>();
  const areas = new Map<string, number>();
  for (const p of pecas) {
    const lista: Preparada[] = [];
    for (const giro of angulos(p.giroQueCabe)) {
      const girada = girarNoCentro(p.region, giro);
      const b = regionBounds(girada);
      // d < 0 dilata nesta funcao (o Clipper recebe -d). Ver region.ts.
      const inflada = folga > 0 ? offsetRegion(girada, -folga / 2, 'miter') : girada;
      if (!inflada.length) continue;
      lista.push({
        nome: p.nome,
        giro,
        mascara: rasterizar(inflada),
        minX: b.minX,
        minY: b.minY,
        area: b.w * b.h,
      });
    }
    if (lista.length) {
      opcoes.set(p.nome, lista);
      areas.set(p.nome, lista[0]!.area);
    }
  }

  /** Uma passada: enche uma placa e devolve o que sobrou. */
  const umaPlaca = (nomes: string[]): { colocadas: Colocada[]; resto: string[] } => {
    const placa = new Uint8Array(pw * ph);
    const colocadas: Colocada[] = [];
    const resto: string[] = [];

    for (const nome of nomes) {
      const lista = opcoes.get(nome);
      if (!lista) {
        resto.push(nome);
        continue;
      }
      // Baixo-esquerda: primeiro a menor linha, depois a menor coluna. Deixa o
      // espaco vago junto em cima, que e onde a proxima peca grande vai caber.
      let melhor: { p: Preparada; ox: number; oy: number } | null = null;
      for (const p of lista) {
        for (let oy = 0; oy + p.mascara.ch <= ph; oy += PASSO) {
          let achou = -1;
          for (let ox = 0; ox + p.mascara.cw <= pw; ox += PASSO) {
            if (livre(placa, pw, ph, p.mascara, ox, oy)) {
              achou = ox;
              break;
            }
          }
          if (achou >= 0) {
            if (!melhor || oy < melhor.oy || (oy === melhor.oy && achou < melhor.ox)) {
              melhor = { p, ox: achou, oy };
            }
            break; // para esta orientacao, a melhor linha e a primeira que serve
          }
        }
      }
      if (!melhor) {
        resto.push(nome);
        continue;
      }
      marcar(placa, pw, melhor.p.mascara, melhor.ox, melhor.oy);
      // A mascara comeca no canto da peca dilatada; o deslocamento tem de levar o
      // canto da peca DE VERDADE para a posicao escolhida, mais a meia folga.
      const alvoX = melhor.ox * CELULA + folga / 2;
      const alvoY = melhor.oy * CELULA + folga / 2;
      colocadas.push({
        nome: melhor.p.nome,
        giro: melhor.p.giro,
        dx: alvoX - melhor.p.minX,
        dy: alvoY - melhor.p.minY,
      });
    }
    return { colocadas, resto };
  };

  // Maior area primeiro: e o que deixa o encaixe caber melhor.
  const ordem = [...pecas.map((p) => p.nome)].sort((a, b) => (areas.get(b) ?? 0) - (areas.get(a) ?? 0));

  const primeira = umaPlaca(ordem);

  // As placas seguintes: repete o encaixe no que sobrou ate acabar, ou ate sobrar so
  // o que nao cabe em placa nenhuma.
  const todas: Colocada[][] = primeira.colocadas.length ? [primeira.colocadas] : [];
  let restam = primeira.resto;
  while (restam.length) {
    const passo = umaPlaca(restam);
    if (!passo.colocadas.length) break;
    todas.push(passo.colocadas);
    restam = passo.resto;
  }

  return { colocadas: primeira.colocadas, sobraram: primeira.resto, placas: todas.length, todas };
}

/** Peca com o veredito de encaixe ja consultado, do jeito que `arrumar` espera. */
export function prepararParaArranjo(
  pecas: { nome: string; region: Region; alturaZ: number }[],
  m: Impressora
): PecaArranjo[] {
  return pecas.map((p) => ({
    nome: p.nome,
    region: p.region,
    giroQueCabe: caberNaMesa(p.region, p.alturaZ, m).giro,
  }));
}
