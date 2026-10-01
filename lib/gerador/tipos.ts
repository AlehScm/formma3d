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
  | (Base & { tipo: 'fonte'; padrao: string });

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

export interface Resultado {
  itens: Item[];
  /** Nome de cada cor (Base, Meio, Topo...), na ordem dos indices de `Peca.cor`. */
  cores: string[];
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
}

export function valoresPadrao(r: Receita): Valores {
  return Object.fromEntries(r.parametros.map((p) => [p.id, p.padrao]));
}

/** Leitores tipados (a tela sempre passa todos os valores do esquema). */
export const num = (v: Valores, id: string) => Number(v[id]);
export const txt = (v: Valores, id: string) => String(v[id] ?? '');
export const liga = (v: Valores, id: string) => v[id] === true;
