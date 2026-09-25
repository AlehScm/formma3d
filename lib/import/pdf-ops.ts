import {
  buildRegion,
  regionBounds,
  intersectRegion,
  regionIsRect,
  type Bounds,
  type Contorno,
  type FillRule,
  type Pt,
  type Region,
} from '../geom/region';
import { flattenCubic, flattenQuad } from '../geom/flatten';
import { apply, baseCTM, mul, scaleOf, type Mat } from './matrix';

// Este modulo e PURO: nao importa pdfjs. Recebe a operator list e o mapa OPS por
// injecao, entao toda a logica de CTM e de decodificacao e testavel com listas
// escritas a mao, sem worker e sem arquivo.

/** Opcodes internos do buffer de path do pdf.js (confirmado em makePathFromDrawOPS, 6.3.289). */
const DRAW = { moveTo: 0, lineTo: 1, curveTo: 2, quadraticCurveTo: 3, closePath: 4 } as const;

/** Subconjunto do OPS do pdf.js que este modulo consulta. */
export interface OpsMap {
  save: number;
  restore: number;
  transform: number;
  constructPath: number;
  clip: number;
  eoClip: number;
  endPath: number;
  fill: number;
  eoFill: number;
  stroke: number;
  closeStroke: number;
  fillStroke: number;
  eoFillStroke: number;
  closeFillStroke: number;
  closeEOFillStroke: number;
  setLineWidth: number;
  setLineCap: number;
  setLineJoin: number;
  setGState: number;
  paintFormXObjectBegin: number;
  paintFormXObjectEnd: number;
  beginMarkedContentProps: number;
  endMarkedContent: number;
  showText: number;
  paintImageXObject: number;
  paintJpegXObject: number;
  paintInlineImage: number;
  paintImageMaskXObject: number;
  [k: string]: number;
}

export interface ClipEntry {
  region: Region;
  bounds: Bounds;
  isRect: boolean;
}

export interface ObjetoBruto {
  id: number;
  contours: Contorno[];
  paint: 'fill' | 'stroke';
  fillRule: FillRule;
  larguraMm: number;
  capRound: boolean;
  clip: ClipEntry | null;
  camada: string | null;
  bounds: Bounds;
}

export type AvisoCodigo =
  | 'texto-vivo'
  | 'imagem'
  | 'so-tracos'
  | 'traco-preenchido'
  | 'multipagina'
  | 'tamanho-suspeito'
  | 'ai-sem-pdf'
  | 'sem-contorno';

export interface Aviso {
  codigo: AvisoCodigo;
  msg: string;
}

export interface DesenhoBruto {
  objetos: ObjetoBruto[];
  paginaMm: { w: number; h: number };
  camadas: string[];
  avisos: Aviso[];
  temFill: boolean;
  temStroke: boolean;
  temTextoVivo: boolean;
  temImagem: boolean;
}

export interface OpListLike {
  fnArray: ArrayLike<number>;
  argsArray: ArrayLike<unknown>;
}

export interface OpsCfg {
  view: readonly [number, number, number, number];
  rotate?: number;
  nomeCamada?: (id: string) => string | null;
  camadaVisivel?: (id: string) => boolean;
}

/**
 * pdf.js 6.x entrega args[1] como [bufferFlat]. Versoes anteriores a 4.6 usavam
 * outro formato. Tolera as duas formas e o buffer vir como Float32Array.
 */
function bufferFlat(data: unknown): ArrayLike<number> {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] !== 'number') {
    return data[0] as ArrayLike<number>;
  }
  return data as ArrayLike<number>;
}

/**
 * Decodifica o buffer flat de DrawOPS aplicando a CTM aos pontos de controle
 * ANTES do achatamento -- assim a tolerancia de 0.05 vale em mm reais, e nao em
 * unidades arbitrarias do arquivo.
 *
 * Diferenca importante em relacao ao caminho de fonte: no PDF o preenchimento
 * fecha o subpath implicitamente, entao fechamos a cada moveTo novo e no fim,
 * sem depender de closePath aparecer.
 */
export function decodeDrawOps(flat: ArrayLike<number>, ctm: Mat): Contorno[] {
  const out: Contorno[] = [];
  let cur: Pt[] | null = null;
  let start: Pt | null = null;
  let pos: Pt = { x: 0, y: 0 };
  let i = 0;

  const empurrar = (closed: boolean) => {
    if (cur && cur.length >= 2) out.push({ pts: cur, closed });
    cur = null;
  };
  const garantir = () => {
    if (!cur) {
      cur = [pos];
      start = pos;
    }
    return cur;
  };

  while (i < flat.length) {
    const op = flat[i++]!;
    switch (op) {
      case DRAW.moveTo: {
        empurrar(false);
        pos = apply(ctm, flat[i]!, flat[i + 1]!);
        i += 2;
        start = pos;
        cur = [pos];
        break;
      }
      case DRAW.lineTo: {
        const p = apply(ctm, flat[i]!, flat[i + 1]!);
        i += 2;
        garantir().push(p);
        pos = p;
        break;
      }
      case DRAW.curveTo: {
        const c1 = apply(ctm, flat[i]!, flat[i + 1]!);
        const c2 = apply(ctm, flat[i + 2]!, flat[i + 3]!);
        const p = apply(ctm, flat[i + 4]!, flat[i + 5]!);
        i += 6;
        flattenCubic(pos, c1, c2, p, garantir());
        pos = p;
        break;
      }
      case DRAW.quadraticCurveTo: {
        const c = apply(ctm, flat[i]!, flat[i + 1]!);
        const p = apply(ctm, flat[i + 2]!, flat[i + 3]!);
        i += 4;
        flattenQuad(pos, c, p, garantir());
        pos = p;
        break;
      }
      case DRAW.closePath: {
        empurrar(true);
        if (start) pos = start;
        break;
      }
      default:
        // Um opcode desconhecido dessincroniza a leitura de tudo que vem depois,
        // entao falhamos alto em vez de devolver geometria silenciosamente errada.
        throw new Error(
          `Operador de path desconhecido (${op}) na posicao ${i - 1}: o formato interno do pdf.js mudou. ` +
            `Conferir makePathFromDrawOPS em node_modules/pdfjs-dist/build/pdf.mjs.`
        );
    }
  }
  empurrar(false);
  return out;
}

type Pintura = { tipo: 'fill'; rule: FillRule } | { tipo: 'stroke' } | { tipo: 'nenhuma' };

function classificar(op: number, O: OpsMap): Pintura {
  switch (op) {
    case O.fill:
    case O.fillStroke:
    case O.closeFillStroke:
      return { tipo: 'fill', rule: 'nonzero' };
    case O.eoFill:
    case O.eoFillStroke:
    case O.closeEOFillStroke:
      return { tipo: 'fill', rule: 'evenodd' };
    case O.stroke:
    case O.closeStroke:
      return { tipo: 'stroke' };
    default:
      return { tipo: 'nenhuma' };
  }
}

interface GState {
  ctm: Mat;
  lineWidth: number;
  capRound: boolean;
  joinRound: boolean;
  clip: ClipEntry | null;
}

function boundsDeContornos(cs: Contorno[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of cs) {
    for (const p of c.pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 };
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function fazerClip(contornos: Contorno[], rule: FillRule, anterior: ClipEntry | null): ClipEntry | null {
  const fechados = contornos.filter((c) => c.pts.length >= 3).map((c) => c.pts);
  if (!fechados.length) return anterior;
  let region = buildRegion(fechados, rule);
  if (!region.length) return anterior;
  if (anterior) {
    region = intersectRegion(anterior.region, region);
    if (!region.length) return { region: [], bounds: regionBounds([]), isRect: false };
  }
  return { region, bounds: regionBounds(region), isRect: regionIsRect(region) };
}

/**
 * Operator list -> objetos de desenho, ja em mm e com a CTM aplicada.
 * Cada operacao de pintura vira um objeto, preservando o proprio fillRule e o
 * proprio recorte -- e o que se perde ao achatar tudo cedo demais.
 */
export function opListToDrawing(opList: OpListLike, O: OpsMap, cfg: OpsCfg): DesenhoBruto {
  const base = baseCTM(cfg.view, cfg.rotate ?? 0);
  let gs: GState = { ctm: base, lineWidth: 1, capRound: false, joinRound: true, clip: null };
  const stack: GState[] = [];
  const objetos: ObjetoBruto[] = [];
  const avisos: Aviso[] = [];
  const camadasVistas = new Set<string>();
  const mcStack: (string | null)[] = [];
  const ocultoStack: boolean[] = [];

  let ultimoPath: Contorno[] = [];
  let pendingClip: FillRule | null = null;
  let temTextoVivo = false;
  let temImagem = false;
  let temFill = false;
  let temStroke = false;
  let id = 0;

  const camadaAtual = (): string | null => {
    for (let i = mcStack.length - 1; i >= 0; i--) {
      const c = mcStack[i];
      if (c) return c;
    }
    return null;
  };
  const oculto = (): boolean => ocultoStack.some(Boolean);

  const n = opList.fnArray.length;
  for (let k = 0; k < n; k++) {
    const fn = opList.fnArray[k]!;
    const args = opList.argsArray[k] as unknown;

    if (fn === O.save) {
      stack.push({ ...gs });
    } else if (fn === O.restore) {
      const prev = stack.pop();
      if (prev) gs = prev; // Q desbalanceado aparece em arquivo gerado por plugin
    } else if (fn === O.transform) {
      const a = args as number[];
      if (a && a.length >= 6) {
        gs = { ...gs, ctm: mul(gs.ctm, [a[0]!, a[1]!, a[2]!, a[3]!, a[4]!, a[5]!]) };
      }
    } else if (fn === O.constructPath) {
      const a = args as unknown[];
      const paintOp = a[0] as number;
      const contornos = decodeDrawOps(bufferFlat(a[1]), gs.ctm);
      ultimoPath = contornos;

      if (pendingClip) {
        gs = { ...gs, clip: fazerClip(contornos, pendingClip, gs.clip) };
        pendingClip = null;
      }

      const pint = classificar(paintOp, O);
      if (pint.tipo !== 'nenhuma' && !oculto()) {
        if (pint.tipo === 'fill') temFill = true;
        else temStroke = true;
        const camada = camadaAtual();
        if (camada) camadasVistas.add(camada);
        objetos.push({
          id: id++,
          contours: contornos,
          paint: pint.tipo,
          fillRule: pint.tipo === 'fill' ? pint.rule : 'nonzero',
          larguraMm: Math.max(gs.lineWidth * scaleOf(gs.ctm), 0.2),
          capRound: gs.capRound,
          clip: gs.clip,
          camada,
          bounds: boundsDeContornos(contornos),
        });
      }
    } else if (fn === O.clip) {
      pendingClip = 'nonzero';
    } else if (fn === O.eoClip) {
      pendingClip = 'evenodd';
    } else if (fn === O.endPath) {
      // A ordem de clip x constructPath varia entre versoes: se o recorte chegou
      // depois do path, o caminho de recorte e o ultimo que vimos.
      if (pendingClip) {
        gs = { ...gs, clip: fazerClip(ultimoPath, pendingClip, gs.clip) };
        pendingClip = null;
      }
    } else if (fn === O.paintFormXObjectBegin) {
      // Illustrator empacota simbolos e grupos em Form XObject com matriz propria.
      // Ignorar isto traz a arte em escala e posicao erradas, sem erro nenhum.
      const a = args as unknown[];
      stack.push({ ...gs });
      const m = a[0] as number[] | undefined;
      if (m && m.length >= 6) {
        gs = { ...gs, ctm: mul(gs.ctm, [m[0]!, m[1]!, m[2]!, m[3]!, m[4]!, m[5]!]) };
      }
      const bbox = a[1] as number[] | undefined;
      if (bbox && bbox.length >= 4) {
        const c: Contorno[] = [
          {
            pts: [
              apply(gs.ctm, bbox[0]!, bbox[1]!),
              apply(gs.ctm, bbox[2]!, bbox[1]!),
              apply(gs.ctm, bbox[2]!, bbox[3]!),
              apply(gs.ctm, bbox[0]!, bbox[3]!),
            ],
            closed: true,
          },
        ];
        gs = { ...gs, clip: fazerClip(c, 'nonzero', gs.clip) };
      }
    } else if (fn === O.paintFormXObjectEnd) {
      const prev = stack.pop();
      if (prev) gs = prev;
    } else if (fn === O.setLineWidth) {
      const a = args as number[];
      if (typeof a?.[0] === 'number') gs = { ...gs, lineWidth: a[0] };
    } else if (fn === O.setLineCap) {
      const a = args as number[];
      gs = { ...gs, capRound: a?.[0] === 1 };
    } else if (fn === O.setLineJoin) {
      const a = args as number[];
      gs = { ...gs, joinRound: a?.[0] === 1 };
    } else if (fn === O.setGState) {
      const a = args as unknown[];
      const pares = a?.[0] as [string, unknown][] | undefined;
      if (Array.isArray(pares)) {
        for (const par of pares) {
          if (!Array.isArray(par)) continue;
          const [chave, valor] = par;
          if (chave === 'LW' && typeof valor === 'number') gs = { ...gs, lineWidth: valor };
          else if (chave === 'LC' && typeof valor === 'number') gs = { ...gs, capRound: valor === 1 };
          else if (chave === 'LJ' && typeof valor === 'number') gs = { ...gs, joinRound: valor === 1 };
        }
      }
    } else if (fn === O.beginMarkedContentProps) {
      const a = args as unknown[];
      const tag = a?.[0];
      const idOC = a?.[1];
      if (tag === 'OC' && typeof idOC === 'string') {
        mcStack.push(cfg.nomeCamada?.(idOC) ?? null);
        ocultoStack.push(cfg.camadaVisivel ? !cfg.camadaVisivel(idOC) : false);
      } else {
        mcStack.push(null);
        ocultoStack.push(false);
      }
    } else if (fn === O.endMarkedContent) {
      mcStack.pop();
      ocultoStack.pop();
    } else if (fn === O.showText) {
      temTextoVivo = true;
    } else if (
      fn === O.paintImageXObject ||
      fn === O.paintJpegXObject ||
      fn === O.paintInlineImage ||
      fn === O.paintImageMaskXObject
    ) {
      temImagem = true;
    }
  }

  const [x0, y0, x1, y1] = cfg.view;
  const paginaMm = { w: (x1 - x0) * (25.4 / 72), h: (y1 - y0) * (25.4 / 72) };

  if (temTextoVivo && objetos.length) {
    avisos.push({
      codigo: 'texto-vivo',
      msg: 'O arquivo tem texto que não foi convertido em contornos e não pode ser importado. No Illustrator, selecione tudo e use Texto > Criar contornos (Ctrl+Shift+O) antes de salvar.',
    });
  }
  if (temStroke && !temFill) {
    avisos.push({
      codigo: 'so-tracos',
      msg: 'O arquivo não tem areas preenchidas, so tracos. Engrossei os tracos pela largura da linha. Para um resultado exato, use Objeto > Expandir no Illustrator.',
    });
  }

  return {
    objetos,
    paginaMm,
    camadas: [...camadasVistas],
    avisos,
    temFill,
    temStroke,
    temTextoVivo,
    temImagem,
  };
}
