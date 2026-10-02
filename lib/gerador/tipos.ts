/**
 * Base comum dos geradores do catalogo: cada modelo e uma RECEITA -- esquema de
 * parametros + uma funcao que devolve as pecas. Formulario, previa e exportacao sao
 * da tela unica (features/gerador), nunca da receita.
 */
import type { Font } from 'opentype.js';
import type { Region } from '../geom/region';

interface Base {
  id: string;
  rotulo: string;
  dica?: string;
  /** Titulo da secao do formulario em que o campo aparece. */
  grupo?: string;
  /** Some do formulario quando a funcao devolve false (ex.: 3a camada so com 3 cores). */
  visivel?: (v: Valores) => boolean;
}

export type Parametro =
  | (Base & { tipo: 'numero'; padrao: number; min: number; max: number; passo?: number; unidade?: string })
  | (Base & { tipo: 'texto'; padrao: string; maxCaracteres?: number; placeholder?: string })
  | (Base & { tipo: 'escolha'; padrao: string; opcoes: { valor: string; rotulo: string }[] })
  | (Base & { tipo: 'liga'; padrao: boolean })
  /** Fonte: id de `FONTES_WEB` (lib/text/fontes.ts). */
  | (Base & { tipo: 'fonte'; padrao: string })
  /** Cor de previa e do 3MF, '#rrggbb'. */
  | (Base & { tipo: 'cor'; padrao: string })
  /** Desenho do usuario (SVG): o valor e um `Desenho` em JSON, '' sem desenho. */
  | (Base & { tipo: 'svg'; padrao: '' });

export type Valor = number | string | boolean;
export type Valores = Record<string, Valor>;

/** Prisma reto: uma Region entre dois planos Z, em mm. */
export interface Camada {
  region: Region;
  z0: number;
  z1: number;
}

/** Uma peca impressa: uma cor so. */
export interface Peca {
  nome: string;
  /** Indice em `Resultado.cores`. */
  cor: number;
  camadas: Camada[];
}

/**
 * Um objeto do resultado: as pecas dele ja montadas (empilhadas em Z como ficam
 * prontas). No lote (varios nomes) cada nome e um item, ja lado a lado em XY.
 */
export interface Item {
  nome: string;
  pecas: Peca[];
}

/** Desenho vindo de SVG: a area preenchida, em unidades do arquivo, Y para cima. */
export interface Desenho {
  nome: string;
  regiao: Region;
}

export interface Resultado {
  itens: Item[];
  /** Nome de cada cor (Base, Meio, Topo...), na ordem dos indices de `Peca.cor`. */
  cores: string[];
  /** Cor de cada indice ('#rrggbb'); sem ela a previa usa a paleta padrao. */
  hex?: string[];
  avisos: string[];
}

export interface Contexto {
  /** Fonte ja carregada (a tela carrega as fontes dos campos `fonte` antes de gerar). */
  fonte: (id: string) => Font;
}

export interface Receita {
  id: string;
  nome: string;
  familia: string;
  resumo: string;
  parametros: Parametro[];
  gerar: (v: Valores, ctx: Contexto) => Resultado;
  /** Fontes alem das dos campos `fonte` (ex.: a de emoji, se o texto tiver emoji). */
  fontes?: (v: Valores) => string[];
}

export function valoresPadrao(r: Receita): Valores {
  return Object.fromEntries(r.parametros.map((p) => [p.id, p.padrao]));
}

/**
 * Os valores dentro do esquema: numero entre min e max, texto no tamanho maximo, escolha
 * entre as opcoes, tipo errado volta ao padrao. A receita sempre recebe isto.
 */
export function valoresValidos(r: Receita, v: Valores): Valores {
  const out: Valores = { ...v };
  for (const p of r.parametros) {
    const x = v[p.id];
    switch (p.tipo) {
      case 'numero': {
        const n = typeof x === 'number' && Number.isFinite(x) ? x : p.padrao;
        out[p.id] = Math.min(p.max, Math.max(p.min, n));
        break;
      }
      case 'texto':
        out[p.id] = typeof x === 'string' ? (p.maxCaracteres ? [...x].slice(0, p.maxCaracteres).join('') : x) : p.padrao;
        break;
      case 'escolha':
        out[p.id] = p.opcoes.some((o) => o.valor === x) ? x! : p.padrao;
        break;
      case 'liga':
        out[p.id] = typeof x === 'boolean' ? x : p.padrao;
        break;
      case 'cor':
        out[p.id] = typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x) ? x : p.padrao;
        break;
      default:
        out[p.id] = typeof x === 'string' ? x : p.padrao;
    }
  }
  return out;
}

/** Leitores tipados (a tela sempre passa todos os valores do esquema). */
export const num = (v: Valores, id: string) => Number(v[id]);
export const txt = (v: Valores, id: string) => String(v[id] ?? '');
export const liga = (v: Valores, id: string) => v[id] === true;

/** O desenho de um campo `svg`, ou null. */
export function desenho(v: Valores, id: string): Desenho | null {
  const s = txt(v, id);
  if (!s) return null;
  try {
    const d = JSON.parse(s) as Desenho;
    return Array.isArray(d.regiao) && d.regiao.length ? d : null;
  } catch {
    return null;
  }
}
