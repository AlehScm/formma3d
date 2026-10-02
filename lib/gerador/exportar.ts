/** Saidas comuns a todas as receitas: 3MF montado (multicor), 3MF de pecas soltas, ZIP de STL. */
import JSZip from 'jszip';
import { empacotar3mf, modelo3mf, modelo3mfMontado } from '../export/tresmf';
import { posicoesParaSTL } from '../export/stl';
import { corDe, nomeComCor, pecasSoltas, posicoesDaPeca } from './malha';
import type { Resultado } from './tipos';

/** Nome de arquivo sem acento nem simbolo. */
export const nomeSeguro = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'modelo';

/** Um objeto por item, uma parte por cor, no lugar em que se montam. */
export function xml3mfMontado(r: Resultado): string {
  const grupos = r.itens.map((it) => ({
    nome: it.nome,
    partes: it.pecas.map((p) => ({ nome: `${it.nome} - ${p.nome}`, cor: p.cor, posicoes: posicoesDaPeca(p) })),
  }));
  return modelo3mfMontado(grupos, r.cores.map((nome, i) => ({ nome, hex: corDe(r, i) })));
}

/** Cada peca deitada na mesa, lado a lado: para imprimir cada cor separada e colar. */
export function xml3mfSoltas(r: Resultado): string {
  return modelo3mf(pecasSoltas(r).map((p) => ({ nome: nomeComCor(p.nome, r.cores[p.cor]), posicoes: p.posicoes })));
}

export const blob3mfMontado = (r: Resultado) => empacotar3mf(xml3mfMontado(r));
export const blob3mfSoltas = (r: Resultado) => empacotar3mf(xml3mfSoltas(r));

export async function zipStl(r: Resultado): Promise<Blob> {
  const zip = new JSZip();
  pecasSoltas(r).forEach((p, i) => {
    zip.file(`${String(i + 1).padStart(2, '0')}-${nomeSeguro(p.nome)}-${nomeSeguro(r.cores[p.cor] ?? 'cor')}.stl`, posicoesParaSTL(p.posicoes, p.nome));
  });
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
