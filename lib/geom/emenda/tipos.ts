/** Os cortes, o encaixe de cada um e o resultado da divisao (o que a tela e a exportacao leem). */
import type { Pt, Region } from '../region';
import type { Part } from '../modes';

export type Eixo = 'x' | 'y';

/** Linha de corte inteira: x = pos (corte vertical) ou y = pos (horizontal). */
export interface Reta {
  eixo: Eixo;
  pos: number;
}

/**
 * Como a emenda de um corte encaixa. `auto`: a forma padrao (dente na solida, tala na oca).
 * Na oca so valem tala e cola; na solida, as outras (`pinoDeitado`: pino redondo que atravessa
 * o corte no meio da altura). No corte na altura: pino solto, pino fixo, anel (so na oca) ou cola.
 */
export type FormaEmenda = 'auto' | 'dente' | 'escondido' | 'cavilha' | 'borboleta' | 'degrau' | 'tala' | 'cola' | 'pino' | 'pinoFixo' | 'anel' | 'pinoDeitado';

/** Desenho do dente visto de cima. */
export type DesenhoDente = 'redondo' | 'andorinha' | 'reto' | 'triangulo';

/** Dente posto a mao: vai no ponto da linha mais perto dele (acompanha a linha que se move). */
export interface LugarDoDente {
  x: number;
  y: number;
  /** Este dente sai do outro pedaco. */
  inverter?: boolean;
}

/** O encaixe de um corte. O que falta vem das opcoes gerais (`OpcoesEmenda`). */
export interface EmendaDoCorte {
  forma?: FormaEmenda;
  desenho?: DesenhoDente;
  /** O pedaco de depois da linha leva o macho. */
  inverter?: boolean;
  /** Largura do dente (ou da cavilha, da borboleta), mm. Sem ela, pelo trecho de material. */
  tamanho?: number;
  /** Um dente a cada tantos mm de material na linha. */
  passo?: number;
  /** Onde eu clicar: os dentes vao so nestes lugares (substitui o passo; vazio = nenhum). */
  lugares?: LugarDoDente[];
  /** Altura do dente escondido, em % da altura da peca. */
  alturaDente?: number;
  /** No corte na altura: quanto o pino (ou o anel) entra na parte de cima, mm. */
  fundo?: number;
}

/** Corte reto: x = pos ou y = pos, podendo inclinar em torno do meio da linha na peca. */
export interface CorteReto extends Reta {
  tipo?: 'reta';
  /** Graus, anti-horario. */
  angulo?: number;
  emenda?: EmendaDoCorte;
}

/** Linha quebrada desenhada vista de cima: as pontas se estendem ate sair da peca. */
export interface CorteDesenhado {
  tipo: 'esboco';
  pontos: Pt[];
  emenda?: EmendaDoCorte;
}

/** Corte na altura: plano em z (mm da mesa). Cada parte imprime com o lado cortado na mesa. */
export interface CorteNaAltura {
  tipo: 'altura';
  z: number;
  /** Plano inclinado, graus a partir do horizontal (0 = reto). Ele passa pelo meio da peca na altura z. */
  inclinacao?: number;
  /** Para que lado o plano desce, graus a partir de +X. */
  direcao?: number;
  emenda?: EmendaDoCorte;
}

/** Corte na altura com o plano inclinado. */
export const inclinado = (c: CorteNaAltura) => Math.abs(c.inclinacao ?? 0) > 1e-6;

export type Corte = CorteReto | CorteDesenhado | CorteNaAltura;

export const ehReta = (c: Corte): c is CorteReto => c.tipo === undefined || c.tipo === 'reta';

export const ehEsboco = (c: Corte): c is CorteDesenhado => c.tipo === 'esboco';

export const ehAltura = (c: Corte): c is CorteNaAltura => c.tipo === 'altura';

/** O corte deslocado (cortes a mao ficam guardados a partir do canto da peca). */
export function moverCorte(c: Corte, dx: number, dy: number, arredondar = false): Corte {
  const r = (v: number) => (arredondar ? Math.round(v * 10) / 10 : v);
  const emenda = c.emenda?.lugares ? { ...c.emenda, lugares: c.emenda.lugares.map((p) => ({ ...p, x: r(p.x + dx), y: r(p.y + dy) })) } : c.emenda;
  if (ehEsboco(c)) return { ...c, pontos: c.pontos.map((p) => ({ x: r(p.x + dx), y: r(p.y + dy) })), ...(emenda ? { emenda } : {}) };
  if (ehAltura(c)) return { ...c, ...(emenda ? { emenda } : {}) };
  return { ...c, pos: r(c.pos + (c.eixo === 'x' ? dx : dy)), ...(emenda ? { emenda } : {}) };
}

export interface OpcoesEmenda {
  /** Folga do encaixe (dente e degrau da chapa), mm. */
  folga: number;
  /** Quanto a tala avanca de cada lado da emenda, mm. */
  larguraTala: number;
  /** Espessura da placa da tala, mm. */
  espTala: number;
  /** Altura da pele da tala na parede, mm (a partir da placa). */
  alturaTala: number;
  /** Espessura da pele da tala na parede, mm. */
  peleTala: number;
  /** Folga entre a tala e a parede, mm. */
  folgaTala: number;
  /** Furos para parafuso M3 na tala e na tampa embaixo. */
  parafusos: boolean;
  /** Grava o numero de montagem (N-1, N-2...) no pedaco. */
  gravarNumero: boolean;
  /** Sobra dentro da mesa em cada eixo, mm (o arranjo ainda deixa folga entre pecas). */
  margem: number;
  /** Sobreposicao da chapa impressa no degrau (e do degrau da peca solida), mm. */
  sobreposicaoChapa: number;
  /** Encaixe dos cortes que nao escolheram o seu. */
  forma: FormaEmenda;
  /** Desenho do dente dos cortes que nao escolheram o seu. */
  desenho: DesenhoDente;
}

export interface Mesa {
  x: number;
  y: number;
  z?: number;
}

/** Caixa que contem a peca toda, com sobra: o lado de antes do corte fecha pela borda dela. */
export interface Caixa {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Dente, cavilha ou borboleta de um corte: onde fica, para a tela mostrar e o clique achar. */
export interface MarcaDeEncaixe {
  /** Indice do corte na lista de quem chamou. */
  corte: number;
  lugar: Pt;
  regiao: Region;
  inverter: boolean;
}

/** Corte na altura, para a tela: o contorno do material no plano. */
export interface PlanoDoCorte {
  /** Indice do corte na lista de quem chamou. */
  corte: number;
  z: number;
  regiao: Region;
  /** Corte inclinado: a regiao e o z estao no plano deitado; esta matriz os leva para a peca montada. */
  matriz?: number[];
}

export interface PedacoDePeca {
  /** 1, 2, 3... na ordem de leitura (de cima para baixo, da esquerda para a direita). */
  indice: number;
  part: Part;
}

export interface Divisao {
  pedacos: PedacoDePeca[];
  /** Quantas emendas (trechos de material cortados): base do custo de montagem. */
  emendas: number;
  /** Parafusos M3 (um por furo da tala, que casa com o furo da tampa). */
  parafusos: number;
  avisos: string[];
  /** A linha de cada corte (na ordem de quem chamou), de borda a borda; null se nao atravessa a peca. */
  linhas: (Pt[] | null)[];
  /** Dentes, cavilhas, borboletas e pinos, para a tela. */
  marcas: MarcaDeEncaixe[];
  /** Os cortes na altura que partiram a peca. */
  planos: PlanoDoCorte[];
}
