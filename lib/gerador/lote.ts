/** Varios nomes numa geracao so: cada nome vira um item, em grade, prontos para uma mesa. */
import { diffRegion, translateRegion, type Region } from '../geom/region';
import { circulo, unir } from './formas';
import { caixaDoItem } from './malha';
import { txt, type Item, type Valores } from './tipos';

/** Ate quantos nomes um lote aceita. */
export const LOTE_MAX = 9;

/** "Ana, Pedro" -> ["Ana", "Pedro"]: virgula separa nomes; vazios saem. */
export function nomesDoLote(texto: string): string[] {
  return texto.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Itens em grade quase quadrada (cabe melhor na mesa), com `folga` mm entre eles; o
 * primeiro em cima a esquerda.
 */
export function emGrade(itens: Item[], colunas = Math.ceil(Math.sqrt(itens.length)), folga = 5): Item[] {
  const caixas = itens.map(caixaDoItem);
  const largura = Math.max(...caixas.map((c) => c.maxX - c.minX));
  const altura = Math.max(...caixas.map((c) => c.maxY - c.minY));
  return itens.map((it, i) => {
    const c = caixas[i]!;
    const col = i % colunas, lin = Math.floor(i / colunas);
    const dx = col * (largura + folga) - (c.minX + c.maxX) / 2;
    const dy = -lin * (altura + folga) - (c.minY + c.maxY) / 2;
    return {
      nome: it.nome,
      pecas: it.pecas.map((p) => ({ ...p, camadas: p.camadas.map((k) => ({ ...k, region: translateRegion(k.region, dx, dy) })) })),
    };
  });
}

/** Linhas de um nome ("Ana+Maria" -> 2 linhas), com prefixo na 1a e sufixo na ultima. */
export function linhasDoNome(nome: string, prefixo: string, sufixo: string): string[] {
  const ls = nome.split('+').map((s) => s.trim()).filter(Boolean);
  if (!ls.length) return [];
  ls[0] = prefixo + ls[0];
  ls[ls.length - 1] = ls[ls.length - 1] + sufixo;
  return ls;
}

export function loteDeNomes(v: Valores, fazer: (linhas: string[], nome: string) => { item: Item | null; avisos: string[] }) {
  const lista = nomesDoLote(txt(v, 'nomes'));
  const avisos = new Set<string>();
  if (lista.length > LOTE_MAX) avisos.add(`Só os ${LOTE_MAX} primeiros nomes entram.`);
  const itens: Item[] = [];
  for (const nome of lista.slice(0, LOTE_MAX)) {
    const r = fazer(linhasDoNome(nome, txt(v, 'prefixo'), txt(v, 'sufixo')), nome.replace(/\+/g, ' '));
    r.avisos.forEach((a) => avisos.add(a));
    if (r.item) itens.push(r.item);
  }
  if (!lista.length) avisos.add('Digite ao menos um nome.');
  return { itens: itens.length > 1 ? emGrade(itens) : itens, avisos: [...avisos] };
}

/**
 * Argola: disco unido a base no ponto mais a esquerda (direita, ou de cima) dela, com o
 * furo encostado na borda da base -- assim o furo fica a um contorno inteiro das letras.
 */
export function comArgola(base: Region, lado: string, furo: number, aro: number): Region {
  if (lado === 'nenhuma' || !base.length) return base;
  const rf = furo / 2, R = rf + aro;
  const pts = base.flatMap((p) => p.outer);
  const mede = (q: { x: number; y: number }) => (lado === 'direita' ? q.x : lado === 'topo' ? q.y : -q.x);
  const extremo = pts.reduce((a, b) => (mede(b) > mede(a) ? b : a));
  const cx = extremo.x + (lado === 'direita' ? rf : lado === 'topo' ? 0 : -rf);
  const cy = extremo.y + (lado === 'topo' ? rf : 0);
  return diffRegion(unir([base, circulo(cx, cy, R)]), circulo(cx, cy, rf, 48));
}
