import { diffRegion, regionBounds } from '../geom/region';
import type { ManipuladorModelo, Resultado, Valores } from './tipos';

const LIMITE = 500;
const limitado = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.max(-LIMITE, Math.min(LIMITE, n)) : 0;

export function furarSeSobrepoe(regiao: import('../geom/region').Region, furo: import('../geom/region').Region): import('../geom/region').Region {
  if (!regiao.length || !furo.length) return regiao;
  const a = regionBounds(regiao), b = regionBounds(furo);
  if (a.maxX <= b.minX || b.maxX <= a.minX || a.maxY <= b.minY || b.maxY <= a.minY) return regiao;
  return diffRegion(regiao, furo);
}

export function atualizarPosicaoManipulador(valores: Valores, m: ManipuladorModelo, valor: { x: number; y: number }): Valores {
  let posicoes: Record<string, { x: number; y: number }> = {};
  const bruto = valores[m.parametro];
  if (typeof bruto === 'string') {
    try {
      const lido: unknown = JSON.parse(bruto);
      if (lido && typeof lido === 'object' && !Array.isArray(lido)) {
        posicoes = Object.fromEntries(Object.entries(lido).map(([k, v]) => {
          const p = v && typeof v === 'object' ? v as Record<string, unknown> : {};
          return [k, { x: limitado(p.x), y: limitado(p.y) }];
        }));
      }
    } catch { /* JSON inválido começa vazio. */ }
  }
  posicoes[m.alvo] = { x: limitado(valor.x), y: limitado(valor.y) };
  return { ...valores, [m.parametro]: JSON.stringify(posicoes) };
}

export function offsetArgola(valores: Valores, alvo: string): { x: number; y: number } {
  if (typeof valores.posicoesArgola !== 'string') return { x: 0, y: 0 };
  try {
    const mapa = JSON.parse(valores.posicoesArgola) as Record<string, unknown>;
    const p = mapa?.[alvo] as Record<string, unknown> | undefined;
    return { x: limitado(p?.x), y: limitado(p?.y) };
  } catch { return { x: 0, y: 0 }; }
}

export function alvoDeNome(nome: string, ocorrencia: number): string {
  const normalizado = nome.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
  return `${normalizado}#${ocorrencia}`;
}

export function concluirManipuladores(r: Resultado): Resultado {
  const itens = r.itens;
  const todas = itens.flatMap((it) => it.pecas.flatMap((p) => p.camadas.flatMap((c) => c.region)));
  const b = todas.length ? regionBounds(todas) : null;
  const caixas = itens.map((it) => it.caixaGrade).filter((c): c is NonNullable<typeof c> => !!c);
  const fixa = caixas.length === itens.length && caixas.length > 0 ? {
    minX: Math.min(...caixas.map((c) => c.minX)), maxX: Math.max(...caixas.map((c) => c.maxX)),
    minY: Math.min(...caixas.map((c) => c.minY)), maxY: Math.max(...caixas.map((c) => c.maxY)),
  } : b;
  const referenciaXY = r.referenciaXY ?? (fixa ? { x: (fixa.minX + fixa.maxX) / 2, y: (fixa.minY + fixa.maxY) / 2 } : { x: 0, y: 0 });
  const manipuladores: ManipuladorModelo[] = [];
  itens.forEach((it, item) => {
    if (!it.alvoArgola || !it.pontoArgola || !it.offsetArgola) return;
    manipuladores.push({ id: `argola:${it.alvoArgola}`, rotulo: 'Argola', item, ponto: it.pontoArgola, parametro: 'posicoesArgola', alvo: it.alvoArgola, valor: it.offsetArgola, ...(it.eixoArgolaX ? { eixoX: it.eixoArgolaX } : {}) });
  });
  return { ...r, referenciaXY, ...(manipuladores.length ? { manipuladores } : {}) };
}
