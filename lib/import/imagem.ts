/**
 * Imagem (PNG/JPG/WebP) -> Region: separa o desenho do fundo e contorna.
 *
 * - Com transparencia de verdade, o desenho e o que e opaco.
 * - Sem ela, limiar de Otsu na luminancia: o lado escuro e o desenho. Se a borda da
 *   imagem cair quase toda no lado escuro, o fundo e escuro e o desenho e o claro.
 * - Contorno por marching squares nos centros dos pixels (diagonais, nao escadinha),
 *   simplificado por Douglas-Peucker. Unidade = pixel, Y para cima.
 *
 * `pixelsParaRegiao` e puro (testavel no Node); `imagemParaRegiao` decodifica no navegador.
 */
import { buildRegion, type Pt, type Region } from '../geom/region';
import { ErroImport } from './erro';

export interface Pixels {
  largura: number;
  altura: number;
  /** RGBA, 4 bytes por pixel, linha a linha de cima para baixo. */
  dados: Uint8ClampedArray | Uint8Array;
}

export interface OpcoesImagem {
  /** Limiar 0..255 na luminancia; sem ele, Otsu. */
  limiar?: number;
  /** Troca desenho e fundo. */
  inverter?: boolean;
  /** Tolerancia da simplificacao, em pixels. */
  tolerancia?: number;
  /** Ilhas e furos menores que isto (px^2) somem: sujeira de JPG. */
  areaMinima?: number;
}

/** Lado maior da imagem antes de contornar (mais que isso so pesa, sem ganhar forma). */
export const LADO_MAX = 700;

export function mascaraDaImagem({ largura: W, altura: H, dados }: Pixels, o: OpcoesImagem = {}): Uint8Array {
  const n = W * H;
  const m = new Uint8Array(n);
  let transparentes = 0, opacos = 0;
  for (let i = 0; i < n; i++) {
    const a = dados[i * 4 + 3]!;
    if (a < 128) transparentes++;
    else opacos++;
  }
  const porAlfa = transparentes > n * 0.02 && opacos > n * 0.002;
  if (porAlfa) {
    for (let i = 0; i < n; i++) m[i] = dados[i * 4 + 3]! >= 128 ? 1 : 0;
  } else {
    const lum = new Uint8Array(n);
    const hist = new Array<number>(256).fill(0);
    for (let i = 0; i < n; i++) {
      const a = dados[i * 4 + 3]! / 255;
      const l = 0.2126 * dados[i * 4]! + 0.7152 * dados[i * 4 + 1]! + 0.0722 * dados[i * 4 + 2]!;
      const v = Math.round(a * l + (1 - a) * 255);
      lum[i] = v;
      hist[v]!++;
    }
    const t = o.limiar ?? otsu(hist, n);
    for (let i = 0; i < n; i++) m[i] = lum[i]! <= t ? 1 : 0;
    // Fundo escuro: a moldura da imagem cai quase toda no "desenho".
    let borda = 0, cheia = 0;
    for (let x = 0; x < W; x++) for (const y of [0, H - 1]) { borda++; cheia += m[y * W + x]!; }
    for (let y = 1; y < H - 1; y++) for (const x of [0, W - 1]) { borda++; cheia += m[y * W + x]!; }
    if (cheia > borda * 0.6) for (let i = 0; i < n; i++) m[i] = 1 - m[i]!;
  }
  if (o.inverter) for (let i = 0; i < n; i++) m[i] = 1 - m[i]!;
  return m;
}

function otsu(hist: number[], n: number): number {
  let soma = 0;
  for (let i = 0; i < 256; i++) soma += i * hist[i]!;
  let somaB = 0, wB = 0, melhor = 0, limiar = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]!;
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    somaB += t * hist[t]!;
    const mB = somaB / wB, mF = (soma - somaB) / wF;
    const entre = wB * wF * (mB - mF) ** 2;
    if (entre > melhor) { melhor = entre; limiar = t; }
  }
  return limiar;
}

/**
 * Contornos da mascara (1 = desenho) por marching squares, com uma moldura vazia em volta
 * para todo contorno fechar. Pontos nos meios das arestas entre centros de pixel.
 */
export function contornosDaMascara(m: Uint8Array, W: number, H: number): Pt[][] {
  const v = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : m[y * W + x]!);
  // Chave de um ponto meio-inteiro: coordenadas dobradas (inteiras), com a moldura.
  const LX = 2 * W + 4;
  const chave = (x2: number, y2: number) => (y2 + 2) * LX + (x2 + 2);
  const viz = new Map<number, number[]>();
  const ligar = (a: number, b: number) => {
    (viz.get(a) ?? viz.set(a, []).get(a)!).push(b);
    (viz.get(b) ?? viz.set(b, []).get(b)!).push(a);
  };
  for (let y = -1; y < H; y++) {
    for (let x = -1; x < W; x++) {
      const tl = v(x, y), tr = v(x + 1, y), br = v(x + 1, y + 1), bl = v(x, y + 1);
      const caso = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (caso === 0 || caso === 15) continue;
      const T = chave(2 * x + 1, 2 * y), R = chave(2 * x + 2, 2 * y + 1), B = chave(2 * x + 1, 2 * y + 2), L = chave(2 * x, 2 * y + 1);
      if (caso === 10) { ligar(L, T); ligar(R, B); continue; }
      if (caso === 5) { ligar(T, R); ligar(B, L); continue; }
      const arestas: number[] = [];
      if (tl !== tr) arestas.push(T);
      if (tr !== br) arestas.push(R);
      if (bl !== br) arestas.push(B);
      if (tl !== bl) arestas.push(L);
      ligar(arestas[0]!, arestas[1]!);
    }
  }
  const usados = new Set<number>();
  const lacos: Pt[][] = [];
  const ponto = (k: number): Pt => ({ x: ((k % LX) - 2) / 2, y: (Math.floor(k / LX) - 2) / 2 });
  for (const inicio of viz.keys()) {
    if (usados.has(inicio)) continue;
    const pts: Pt[] = [];
    let ant = -1, atual = inicio;
    while (!usados.has(atual)) {
      usados.add(atual);
      pts.push(ponto(atual));
      const [a, b] = viz.get(atual)!;
      const prox = a !== ant && !usados.has(a!) ? a! : b!;
      ant = atual;
      atual = prox;
    }
    if (pts.length >= 3) lacos.push(pts);
  }
  return lacos;
}

/** Douglas-Peucker num contorno fechado. */
export function simplificar(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 4) return pts;
  // Corta no ponto mais distante do primeiro: dois trechos abertos.
  let k = 0, dmax = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = (pts[i]!.x - pts[0]!.x) ** 2 + (pts[i]!.y - pts[0]!.y) ** 2;
    if (d > dmax) { dmax = d; k = i; }
  }
  const a = dp(pts.slice(0, k + 1), tol), b = dp([...pts.slice(k), pts[0]!], tol);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function dp(pts: Pt[], tol: number): Pt[] {
  const manter = new Uint8Array(pts.length);
  manter[0] = manter[pts.length - 1] = 1;
  const pilha: [number, number][] = [[0, pts.length - 1]];
  while (pilha.length) {
    const [i, j] = pilha.pop()!;
    const p = pts[i]!, q = pts[j]!;
    const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1;
    let k = -1, dmax = tol;
    for (let t = i + 1; t < j; t++) {
      const d = Math.abs((pts[t]!.x - p.x) * dy - (pts[t]!.y - p.y) * dx) / L;
      if (d > dmax) { dmax = d; k = t; }
    }
    if (k >= 0) { manter[k] = 1; pilha.push([i, k], [k, j]); }
  }
  return pts.filter((_, i) => manter[i]);
}

const areaDe = (p: Pt[]) => {
  let s = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) s += (p[j]!.x - p[i]!.x) * (p[j]!.y + p[i]!.y);
  return Math.abs(s) / 2;
};

/** Pixels -> Region (unidade pixel, Y para cima, origem no canto de baixo). */
export function pixelsParaRegiao(px: Pixels, o: OpcoesImagem = {}): Region {
  return regiaoDaMascara(mascaraDaImagem(px, o), px.largura, px.altura, o);
}

/** Mascara (1 = cheio) -> Region: contorno, simplificacao, sem sujeira, Y para cima. */
function regiaoDaMascara(m: Uint8Array, W: number, H: number, o: OpcoesImagem = {}): Region {
  const tol = o.tolerancia ?? 0.6, min = o.areaMinima ?? Math.max(4, W * H * 2e-5);
  const lacos = contornosDaMascara(m, W, H)
    .map((l) => simplificar(l, tol))
    .filter((l) => l.length >= 3 && areaDe(l) >= min)
    .map((l) => l.map((p) => ({ x: p.x, y: H - p.y })));
  return buildRegion(lacos, 'evenodd');
}

export interface RegiaoDeCor {
  regiao: Region;
  /** Cor media do grupo, '#rrggbb'. */
  hex: string;
}

/**
 * Imagem colorida -> uma regiao por cor (ate `k`), sem o fundo. Agrupa os pixels por cor
 * (k-medias com sementes deterministicas, a mais distante a cada passo); o fundo e o
 * transparente ou, sem transparencia, o grupo que domina a moldura da imagem. Grupos
 * com menos de 0,5% da imagem somem.
 */
export function pixelsParaCores({ largura: W, altura: H, dados }: Pixels, k = 4, o: OpcoesImagem = {}): RegiaoDeCor[] {
  const n = W * H;
  let transparentes = 0;
  for (let i = 0; i < n; i++) if (dados[i * 4 + 3]! < 128) transparentes++;
  const porAlfa = transparentes > n * 0.02;
  const usa = (i: number) => !porAlfa || dados[i * 4 + 3]! >= 128;
  const kk = porAlfa ? k : k + 1;
  // Amostra (ate ~20 mil pixels) para as sementes e as medias.
  const passo = Math.max(1, Math.floor(n / 20000));
  const amostra: number[] = [];
  for (let i = 0; i < n; i += passo) if (usa(i)) amostra.push(i);
  if (!amostra.length) return [];
  const rgb = (i: number): number[] => [dados[i * 4]!, dados[i * 4 + 1]!, dados[i * 4 + 2]!];
  const d2 = (a: number[], b: number[]) => (a[0]! - b[0]!) ** 2 + (a[1]! - b[1]!) ** 2 + (a[2]! - b[2]!) ** 2;
  const maisPerto = (c: number[], centros: number[][]) => {
    let j = 0, dm = Infinity;
    centros.forEach((x, t) => { const d = d2(c, x); if (d < dm) { dm = d; j = t; } });
    return j;
  };
  const centros: number[][] = [rgb(amostra[0]!)];
  while (centros.length < kk) {
    let melhor = amostra[0]!, dmax = -1;
    for (const i of amostra) { const c = rgb(i); const d = Math.min(...centros.map((x) => d2(c, x))); if (d > dmax) { dmax = d; melhor = i; } }
    if (dmax < 400) break; // as cores que sobram ja estao cobertas (diferenca < ~20 por canal)
    centros.push(rgb(melhor));
  }
  for (let it = 0; it < 12; it++) {
    const soma = centros.map(() => [0, 0, 0, 0]);
    for (const i of amostra) {
      const c = rgb(i), s = soma[maisPerto(c, centros)]!;
      s[0]! += c[0]!; s[1]! += c[1]!; s[2]! += c[2]!; s[3]! += 1;
    }
    soma.forEach((x, t) => { if (x[3]) centros[t] = [x[0]! / x[3]!, x[1]! / x[3]!, x[2]! / x[3]!]; });
  }
  const grupo = new Int8Array(n).fill(-1);
  const conta = new Array<number>(centros.length).fill(0);
  for (let i = 0; i < n; i++) {
    if (!usa(i)) continue;
    const j = maisPerto(rgb(i), centros);
    grupo[i] = j;
    conta[j]!++;
  }
  // Fundo: sem transparencia, o grupo que mais aparece na moldura.
  let fundo = -1;
  if (!porAlfa) {
    const borda = new Array<number>(centros.length).fill(0);
    for (let x = 0; x < W; x++) for (const y of [0, H - 1]) { const g = grupo[y * W + x]!; if (g >= 0) borda[g]!++; }
    for (let y = 0; y < H; y++) for (const x of [0, W - 1]) { const g = grupo[y * W + x]!; if (g >= 0) borda[g]!++; }
    fundo = borda.indexOf(Math.max(...borda));
  }
  const hex = (c: number[]) => '#' + c.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
  const out: (RegiaoDeCor & { area: number })[] = [];
  centros.forEach((c, j) => {
    if (j === fundo || conta[j]! < n * 0.005) return;
    const m = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (grupo[i] === j) m[i] = 1;
    const regiao = regiaoDaMascara(m, W, H, o);
    if (regiao.length) out.push({ regiao, hex: hex(c), area: conta[j]! });
  });
  return out.sort((a, b) => b.area - a.area).map(({ regiao, hex: h }) => ({ regiao, hex: h }));
}

/** Arquivo de imagem -> Region e as regioes de cada cor, no navegador. Reduz a `LADO_MAX` antes de contornar. */
export async function imagemParaRegiao(arquivo: Blob, o: OpcoesImagem = {}): Promise<{ regiao: Region; cores: RegiaoDeCor[] }> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(arquivo);
  } catch {
    throw new ErroImport('Não consegui abrir esta imagem.');
  }
  const k = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height));
  const W = Math.max(1, Math.round(bmp.width * k)), H = Math.max(1, Math.round(bmp.height * k));
  const tela = document.createElement('canvas');
  tela.width = W;
  tela.height = H;
  const g = tela.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(bmp, 0, 0, W, H);
  bmp.close();
  const px = { largura: W, altura: H, dados: g.getImageData(0, 0, W, H).data };
  const regiao = pixelsParaRegiao(px, o);
  if (!regiao.length) throw new ErroImport('Não achei nenhum desenho nesta imagem (ela parece lisa).');
  return { regiao, cores: pixelsParaCores(px, 4, o) };
}
