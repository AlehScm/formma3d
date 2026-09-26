'use client';

import JSZip from 'jszip';
import { APOIOS, PRESETS } from '@/lib/geom/modes';
import type { Region } from '@/lib/geom/region';
import { partToGeometry } from '@/lib/geom/extrude';
import { geometryToSTL, posicoesDaGeometria, posicoesParaSTL } from '@/lib/export/stl';
import { gerar3mf } from '@/lib/export/tresmf';
import { juntar, montarPlaca, type PecaPlaca } from '@/lib/print/placa';
import type { Colocada } from '@/lib/print/arranjo';
import { useInterface } from '@/store/interface';
import { regionToSVG, regionToDXF, gabaritoSVG } from '@/lib/export/vectors';
import { brl, orcarPlaca, type CustoCfg, type Orcamento } from '@/lib/cost/calc';
import { useProjeto } from '@/store/projeto';
import type { LetraComPeca, Modelo, ObjetoModelo } from '@/modelo/Modelo';

/**
 * Tudo que sai do app como arquivo ou texto. Funcoes puras sobre o modelo: nenhum
 * componente monta arquivo.
 */

export function baixar(nome: string, data: BlobPart, tipo?: string): void {
  const blob = data instanceof Blob ? data : new Blob([data], tipo ? { type: tipo } : undefined);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const seguro = (s: string): string => (s || 'letra').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'letra';

const regioesDeCorte = (letras: LetraComPeca[]): Region =>
  letras.flatMap((l) => l.part.extras.flatMap((e) => (e.kind === 'cut' ? e.region : [])));

export function baixarSTL(m: Modelo, letra: LetraComPeca): void {
  const geo = partToGeometry(letra.part);
  if (!geo) return;
  baixar(`${seguro(m.nomeProjeto)}_${seguro(letra.nome)}_${m.desc}.stl`, geometryToSTL(geo, letra.nome), 'model/stl');
  geo.dispose();
}

export function baixarChapaSVG(m: Modelo): void {
  baixar(`${seguro(m.nomeProjeto)}_chapa_acm.svg`, regionToSVG(regioesDeCorte(m.letras), { titulo: m.nomeProjeto }), 'image/svg+xml');
}

export function baixarChapaDXF(m: Modelo): void {
  baixar(`${seguro(m.nomeProjeto)}_chapa_acm.dxf`, regionToDXF(regioesDeCorte(m.letras)), 'image/vnd.dxf');
}

export function baixarGabarito(m: Modelo): void {
  baixar(`${seguro(m.nomeProjeto)}_gabarito.svg`, gabaritoSVG(m.letras), 'image/svg+xml');
}

/**
 * O orcamento como texto: vai no .zip e e o que o botao "copiar para o cliente"
 * poe na area de transferencia.
 */
export function textoOrcamento(m: Modelo, o: Orcamento): string {
  const s = useProjeto.getState();
  const temChapa = m.temChapa;
  return [
    `Letreiro: ${m.nomeProjeto}`,
    `Peça: ${s.presetAtivo ? PRESETS[s.presetAtivo].nome : m.desc}`,
    `Orientação de impressão: ${m.orientacao.texto}`,
    s.arquivos.length
      ? `Altura: ${s.arquivos.map((a) => `${a.nomeArquivo} ${a.altura} mm`).join(', ')} | Profundidade: ${s.profundidade} mm`
      : `Altura das maiúsculas: ${s.altura} mm | Profundidade: ${s.profundidade} mm`,
    `Largura total montado: ${m.bounds ? m.bounds.w.toFixed(0) : '?'} mm`,
    `Parede: ${s.parede} mm | Bico: ${s.bico} mm`,
    ...(temChapa
      ? [`Chapa: ${s.frente === 'chapa' ? s.frenteEsp : s.traseiraEsp} mm, folga ${s.folga} mm, batente ${s.batente} mm, apoio ${APOIOS[s.apoio].curto}`]
      : []),
    '',
    `Filamento: ${s.cfg.filamento} - ${o.gramas.toFixed(0)} g (${o.rolos.toFixed(2)} rolo)`,
    `Tempo estimado: ${o.horas.toFixed(1)} h`,
    '',
    ...o.itens.map((i) => `${i.rotulo.padEnd(18)} ${brl(i.valor).padStart(12)}  ${i.detalhe}`),
    `${'CUSTO'.padEnd(18)} ${brl(o.custo).padStart(12)}`,
    `${'PREÇO SUGERIDO'.padEnd(18)} ${brl(o.preco).padStart(12)}  (margem ${s.cfg.margem}%)`,
    ...linhasPorPlaca(m, s.cfg),
    ...(m.avisos.length ? ['', 'AVISOS:', ...m.avisos.map((a) => '- ' + a)] : []),
  ].join('\r\n');
}

/** Uma linha por placa arrumada: cada placa e uma impressao, com seu preparo. */
function linhasPorPlaca(m: Modelo, cfg: CustoCfg): string[] {
  const placas = useInterface.getState().placas.flatMap((p, i) => {
    const chaves = [...p.keys()].filter((k) => m.insumos.has(k));
    return chaves.length ? [{ i, chaves, o: orcarPlaca(chaves.map((k) => m.insumos.get(k)!), cfg) }] : [];
  });
  if (!placas.length) return [];
  return [
    '',
    'POR PLACA (cada uma e uma impressao):',
    ...placas.map(
      ({ i, chaves, o }) =>
        `Placa ${i + 1}: ${chaves.length} peça(s), ${o.gramas.toFixed(0)} g, ${o.horas.toFixed(1)} h, custo ${brl(o.custo)}, preço ${brl(o.preco)}` +
        (chaves.some((k) => k.startsWith('stl:')) ? ' (inclui STL)' : '')
    ),
  ];
}

export async function baixarPacote(m: Modelo, o: Orcamento): Promise<void> {
  const zip = new JSZip();
  const pasta = zip.folder(`${seguro(m.nomeProjeto)}_${m.desc}`);
  if (!pasta) return;

  m.letras.forEach((l, i) => {
    const n = String(i + 1).padStart(2, '0');
    const geo = partToGeometry(l.part);
    if (geo) {
      pasta.file(`${n}_${seguro(l.nome)}.stl`, geometryToSTL(geo, l.nome));
      geo.dispose();
    }
    for (const e of l.part.extras) {
      if (e.kind !== 'stl') continue;
      const g2 = partToGeometry({ layers: e.layers });
      if (g2) {
        pasta.file(`${n}_${seguro(l.nome)}_${e.name}.stl`, geometryToSTL(g2, e.name));
        g2.dispose();
      }
    }
  });

  // Chapas de corte com as letras na posicao do letreiro, ja nesteadas como montado.
  const chapas = regioesDeCorte(m.letras);
  if (chapas.length) {
    pasta.file('chapa_acm_todas.svg', regionToSVG(chapas, { titulo: m.nomeProjeto }));
    pasta.file('chapa_acm_todas.dxf', regionToDXF(chapas));
  }
  pasta.file('gabarito_instalacao_1a1.svg', gabaritoSVG(m.letras));
  pasta.file('orcamento.txt', textoOrcamento(m, o));

  baixar(`${seguro(m.nomeProjeto)}_${m.desc}.zip`, await zip.generateAsync({ type: 'blob' }));
}

/* ------------------------------------------------------------- placa inteira */

/** Todas as pecas que podem ir para a placa: letras do letreiro e objetos STL. */
function pecasDaPlaca(m: Modelo): PecaPlaca[] {
  return [
    ...m.letras.flatMap((l) => {
      const geo = partToGeometry(l.part);
      if (!geo) return [];
      const posicoes = posicoesDaGeometria(geo);
      geo.dispose();
      return [{ chave: l.chave, nome: l.nome, posicoes, contorno: l.part.contorno }];
    }),
    ...m.objetos.map((o) => ({ chave: o.chave, nome: o.nome, posicoes: o.posicoes, contorno: o.contorno })),
  ];
}

/** As placas como o usuario ve, com os ajustes feitos a mao. */
export function placasAtuais(): Colocada[][] {
  return useInterface.getState().placas.map((p) => [...p.values()]);
}

const nomePlaca = (m: Modelo, i: number, total: number) =>
  `${seguro(m.nomeProjeto)}_placa${total > 1 ? `_${i + 1}_de_${total}` : ''}`;

/** A placa num STL so: todas as pecas juntas, ja posicionadas. */
export function baixarPlacaSTL(m: Modelo, i = 0): void {
  const placas = placasAtuais();
  const c = placas[i];
  if (!c?.length) return;
  const objs = montarPlaca(pecasDaPlaca(m), c);
  baixar(`${nomePlaca(m, i, placas.length)}.stl`, posicoesParaSTL(juntar(objs), 'placa'), 'model/stl');
}

/** A placa em 3MF: cada peca como objeto separado, na posicao do arranjo. */
export async function baixarPlaca3MF(m: Modelo, i = 0): Promise<void> {
  const placas = placasAtuais();
  const c = placas[i];
  if (!c?.length) return;
  baixar(`${nomePlaca(m, i, placas.length)}.3mf`, await gerar3mf(montarPlaca(pecasDaPlaca(m), c)));
}

/** Todas as placas num .zip, cada uma em 3MF e em STL. */
export async function baixarTodasAsPlacas(m: Modelo): Promise<void> {
  const placas = placasAtuais();
  if (!placas.length) return;
  const pecas = pecasDaPlaca(m);
  const zip = new JSZip();
  for (const [i, c] of placas.entries()) {
    if (!c.length) continue;
    const objs = montarPlaca(pecas, c);
    const nome = nomePlaca(m, i, placas.length);
    zip.file(`${nome}.3mf`, await gerar3mf(objs));
    zip.file(`${nome}.stl`, posicoesParaSTL(juntar(objs), nome));
  }
  baixar(`${seguro(m.nomeProjeto)}_placas.zip`, await zip.generateAsync({ type: 'blob' }));
}

/** Um objeto STL importado, de volta como veio (centrado, assentado em Z=0). */
export function baixarObjeto(o: ObjetoModelo): void {
  baixar(`${seguro(o.nome)}.stl`, posicoesParaSTL(o.posicoes, o.nome), 'model/stl');
}
