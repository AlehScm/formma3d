/**
 * Saidas do design: o Resultado do gerador (uma peca por camada, empilhada em Z, na cor da
 * camada, mais as pecas de cada modelo no lugar onde ele esta) para a previa 3D e a
 * exportacao 3MF/STL, e o Desenho (forma + cores por camada)
 * que os geradores com campo de desenho recebem em "Usar no modelo".
 */
import { valoresValidos, type Contexto, type Desenho, type Item, type Peca, type Resultado } from '@/lib/gerador/tipos';
import { regionBounds, translateRegion, type Region } from '@/lib/geom/region';
import { corDe } from '@/lib/gerador/malha';
import type { Design, Elemento } from './documento';
import { receitaDoModelo } from './registro';
import { regioesDasCamadas, transformar, trechosFinos, type Fontes } from './geometria';
import { unir } from '@/lib/gerador/formas';
import { fontesDoModelo } from './documento';
import { validarCamposDesenho } from '@/lib/gerador/validacaoDesenho';

type ElementoModelo = Extract<Elemento, { tipo: 'modelo' }>;

/** O resultado de um modelo como o gerador entrega (coordenadas dele, sem mover). */
export function resultadoDoModelo(el: ElementoModelo, ctx: Contexto): Resultado | null {
  const r = receitaDoModelo(el.receita);
  if (!r) return null;
  const valores = valoresValidos(r, { ...el.valores });
  const desenhoInvalido = validarCamposDesenho(r.parametros, valores);
  if (desenhoInvalido) throw new Error(`${desenhoInvalido.rotulo}: ${desenhoInvalido.mensagem}`);
  if (ctx.resultadoModelo) return ctx.resultadoModelo(el.id, el.receita, valores, fontesDoModelo(el.receita, valores), ctx.tentativaModelo?.(el.id) ?? 0);
  return r.gerar(valores, ctx);
}

/** Centro (mm) de tudo o que o modelo gera: e ele que fica no (x, y) do elemento. */
export function centroDoResultado(r: Resultado): { x: number; y: number } {
  if (r.referenciaXY && Number.isFinite(r.referenciaXY.x) && Number.isFinite(r.referenciaXY.y)) return r.referenciaXY;
  const b = regionBounds(r.itens.flatMap((it) => it.pecas.flatMap((p) => p.camadas.flatMap((c) => c.region))));
  return { x: b.minX + b.w / 2, y: b.minY + b.h / 2 };
}

export function designParaResultado(d: Design, fontes: Fontes, ctx: Contexto = { fonte: (id) => fontes(id)! }): Resultado {
  const regioes = regioesDasCamadas(d, fontes);
  const visiveis = d.camadas.filter((c) => !c.oculta && (regioes.get(c.id)?.length ?? 0) > 0);
  const pecas: Peca[] = visiveis.map((c, i) => ({ nome: c.nome, cor: i, camadas: [{ region: regioes.get(c.id)!, z0: c.z0, z1: c.z1 }] }));
  const avisos: string[] = [];
  const notas: string[] = [];
  for (const c of visiveis) if (trechosFinos(regioes.get(c.id)!).length) avisos.push(`A camada "${c.nome}" tem trechos mais finos que o bico imprime bem.`);
  const itens: Item[] = pecas.length ? [{ nome: d.nome || 'Design', pecas }] : [];
  const cores = visiveis.map((c) => c.nome);
  const hex = visiveis.map((c) => c.cor);

  // Cada modelo: as pecas dele, centradas e levadas para onde o elemento esta (com giro e escala).
  for (const el of d.elementos) {
    if (el.tipo !== 'modelo' || el.oculto || d.camadas.find((c) => c.id === el.camadaId)?.oculta) continue;
    const r = resultadoDoModelo(el, ctx);
    if (!r) continue;
    const nome = receitaDoModelo(el.receita)?.nome ?? 'Modelo';
    if (r.itens.length) {
      const c = centroDoResultado(r);
      const mover = (reg: Region) => transformar(translateRegion(reg, -c.x, -c.y), el);
      const desloc = cores.length;
      r.cores.forEach((cor, i) => {
        cores.push(r.itens.length > 1 || d.elementos.filter((e) => e.tipo === 'modelo').length > 1 ? `${cor} (${nome})` : cor);
        hex.push(corDe(r, i));
      });
      for (const it of r.itens) {
        itens.push({ nome: it.nome || nome, pecas: it.pecas.map((p) => ({ ...p, cor: p.cor + desloc, camadas: p.camadas.map((k) => ({ ...k, region: mover(k.region) })) })) });
      }
    }
    avisos.push(...r.avisos.map((a) => `${nome}: ${a}`));
    notas.push(...(r.notas ?? []).map((n) => `${nome}: ${n}`));
  }

  if (!itens.length) avisos.push('O design está vazio: adicione um texto, uma forma, uma imagem ou um modelo.');
  return { itens, cores, hex, avisos, ...(notas.length ? { notas } : {}) };
}

/** Para os geradores: a forma toda e uma regiao por camada (as de cima cobrem as de baixo). */
export function designParaDesenho(d: Design, fontes: Fontes): Desenho {
  const regioes = regioesDasCamadas(d, fontes);
  const visiveis = d.camadas.filter((c) => !c.oculta && (regioes.get(c.id)?.length ?? 0) > 0);
  const cores = visiveis.map((c) => ({ regiao: regioes.get(c.id)!, hex: c.cor }));
  return { nome: d.nome || 'Design', regiao: unir(cores.map((c) => c.regiao)), ...(cores.length > 1 ? { cores } : {}) };
}
