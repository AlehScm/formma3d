/**
 * Documento do editor 2D livre ("Criar seu design"): uma tela em mm com elementos soltos
 * (texto, forma, desenho importado, QR) organizados em camadas de impressao. Cada camada e
 * uma altura Z e uma cor. Uma camada pode ser desenhada (tem os proprios elementos) ou o
 * contorno de outra (a borda e o fundo que acompanham o desenho sozinhos).
 * Coordenadas em mm, Y para cima, origem no centro da tela.
 */
import type { Region } from '@/lib/geom/region';

export type OrigemCamada = 'desenhada' | { contornoDe: string; folgaMm: number };

export interface CamadaDesign {
  id: string;
  nome: string;
  /** '#rrggbb' */
  cor: string;
  /** Faixa em Z, mm (a de baixo comeca em 0). */
  z0: number;
  z1: number;
  origem: OrigemCamada;
  oculta?: boolean;
  travada?: boolean;
}

/** Formas da biblioteca propria (lib/gerador/formas.ts e figuras.ts). */
export const FORMAS = {
  circulo: 'Círculo',
  quadrado: 'Quadrado',
  retangulo: 'Retângulo arredondado',
  coracao: 'Coração',
  estrela: 'Estrela',
  hexagono: 'Hexágono',
  floco: 'Floco de neve',
  pata: 'Pata',
  osso: 'Osso',
  nuvem: 'Nuvem',
} as const;
export type FormaId = keyof typeof FORMAS;

interface BaseElemento {
  id: string;
  camadaId: string;
  /** Centro do elemento, mm. */
  x: number;
  y: number;
  /** Graus, sentido anti-horario (Y para cima). */
  giro: number;
  escalaX: number;
  escalaY: number;
  espelhar?: boolean;
  /** Engrossar as linhas, mm (offset para fora antes de transformar). */
  engrossar?: number;
  travado?: boolean;
  oculto?: boolean;
}

export type Elemento = BaseElemento & (
  | { tipo: 'texto'; texto: string; fonte: string; /** Altura das maiusculas, mm. */ altura: number; /** Fator do avanco (1 = normal). */ espacamento?: number }
  | { tipo: 'forma'; forma: FormaId; /** Largura natural, mm. */ largura: number }
  | { tipo: 'desenho'; nome: string; /** Ja em mm, centrado em (0, 0). */ regiao: Region }
  | { tipo: 'qr'; conteudo: string; /** Lado do QR com a margem, mm. */ largura: number }
);

export type TipoElemento = Elemento['tipo'];

export interface Design {
  versao: 1;
  nome: string;
  larguraMm: number;
  alturaMm: number;
  /** De baixo para cima. */
  camadas: CamadaDesign[];
  elementos: Elemento[];
}

let seq = 0;
export const novoId = (prefixo = 'el') => `${prefixo}-${Date.now().toString(36)}-${(++seq).toString(36)}`;

/** Camadas padrao: fundo e borda acompanham o desenho (contornos), o desenho fica em cima. */
export function camadasPadrao(): CamadaDesign[] {
  return [
    { id: 'base', nome: 'Fundo', cor: '#1f2937', z0: 0, z1: 2, origem: { contornoDe: 'topo', folgaMm: 4 } },
    { id: 'meio', nome: 'Borda', cor: '#f5f5f4', z0: 2, z1: 2.8, origem: { contornoDe: 'topo', folgaMm: 1.5 } },
    { id: 'topo', nome: 'Desenho', cor: '#e2557a', z0: 2.8, z1: 3.6, origem: 'desenhada' },
  ];
}

export function designNovo(): Design {
  return {
    versao: 1,
    nome: 'Meu design',
    larguraMm: 200,
    alturaMm: 140,
    camadas: camadasPadrao(),
    elementos: [
      { id: novoId(), tipo: 'texto', camadaId: 'topo', texto: 'Seu nome', fonte: 'pacifico', altura: 22, x: 0, y: 0, giro: 0, escalaX: 1, escalaY: 1 },
    ],
  };
}

/** Camada onde os elementos novos entram: a desenhada mais alta. */
/** Camada nova: desenhada, 0,8 mm, empilhada em cima pelo editor. */
export const camadaNova = (n: number): CamadaDesign => ({ id: novoId('cam'), nome: `Camada ${n}`, cor: '#2563eb', z0: 0, z1: 0.8, origem: 'desenhada' });

export const camadaDesenhadaPadrao = (d: Design) => [...d.camadas].reverse().find((c) => c.origem === 'desenhada')?.id ?? d.camadas.at(-1)?.id ?? 'topo';

/** Fontes usadas pelos textos (para carregar antes de gerar). */
export const fontesDoDesign = (d: Design) => [...new Set(d.elementos.flatMap((e) => (e.tipo === 'texto' ? [e.fonte] : [])))];

/** Valida e completa um design vindo de JSON (arquivo ou navegador). Lanca erro se nao for um design. */
export function lerDesign(json: unknown): Design {
  const d = json as Partial<Design> | null;
  if (!d || d.versao !== 1 || !Array.isArray(d.camadas) || !Array.isArray(d.elementos)) throw new Error('Este arquivo não é um design do editor.');
  const camadas = d.camadas.filter((c) => c && typeof c.id === 'string' && typeof c.z0 === 'number' && typeof c.z1 === 'number');
  if (!camadas.length) throw new Error('O design não tem camadas.');
  const ids = new Set(camadas.map((c) => c.id));
  return {
    versao: 1,
    nome: typeof d.nome === 'string' ? d.nome : 'Meu design',
    larguraMm: typeof d.larguraMm === 'number' && d.larguraMm > 0 ? d.larguraMm : 200,
    alturaMm: typeof d.alturaMm === 'number' && d.alturaMm > 0 ? d.alturaMm : 140,
    camadas,
    elementos: d.elementos.filter((e) => e && typeof e.id === 'string' && ids.has(e.camadaId) && ['texto', 'forma', 'desenho', 'qr'].includes(e.tipo)),
  };
}
