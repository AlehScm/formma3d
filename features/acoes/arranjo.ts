'use client';

import { arrumar } from '@/lib/print/arranjo';
import { caberNaMesa } from '@/lib/print/impressoras';
import { useInterface } from '@/store/interface';
import type { Modelo } from '@/modelo/Modelo';

/**
 * Encaixa as pecas na mesa. So no clique: refazer a cada tique de slider jogaria
 * fora o ajuste manual feito em cima do resultado.
 *
 * O footprint e `part.contorno` -- com borda de apoio e maior que a arte, e e o
 * que de fato ocupa a mesa.
 */
export function arrumarNaPlaca(m: Modelo): void {
  if (!m.letras.length && !m.objetos.length) return;
  const ui = useInterface.getState();
  // Letras do letreiro e objetos STL dividem a mesma placa, pela mesma regra.
  const r = arrumar(
    [
      ...m.letras.map((l) => ({ nome: l.chave, region: l.part.contorno, alturaZ: l.part.alturaZ })),
      ...m.objetos.map((o) => ({ nome: o.chave, region: o.contorno, alturaZ: o.alturaZ })),
    ].map((p) => ({ nome: p.nome, region: p.region, giroQueCabe: caberNaMesa(p.region, p.alturaZ, m.mesa).giro })),
    m.mesa,
    ui.folgaPecas
  );
  // Sobrar por falta de espaco nesta placa e nao caber na maquina sao problemas
  // diferentes: o primeiro se resolve com outra levada, o segundo nao.
  const impossiveis = r.sobraram.filter((chave) => m.naoCabem.has(chave)).length;
  const emPlaca = new Set(r.todas.flat().map((c) => c.nome));
  ui.definirArranjo(r.todas, r.sobraram.filter((k) => !emPlaca.has(k)), {
    dentro: r.colocadas.length,
    fora: r.sobraram.length - impossiveis,
    impossiveis,
    placas: r.placas,
  });
}
