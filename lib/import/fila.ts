import { regionBounds, scaleRegion, translateRegion, type Region } from '@/lib/geom/region';

/** Vao entre um arquivo e o proximo quando ficam lado a lado no letreiro, em mm. */
export const VAO_ENTRE_ARQUIVOS = 80;
/** Rotulo da peca quando ha mais de um arquivo: A01, B03... */
export const letraArquivo = (i: number) => String.fromCharCode(65 + (i % 26));
export const chavePecaArquivo = (arquivo: string, nome: string) => `${arquivo}:${nome}`;

export interface ArquivoNaFila {
  id: string;
  /** Altura final da arte deste arquivo, em mm. */
  alvo: number;
  desativadas: Set<string>;
  pecas: { nome: string; region: Region; espessuraNativa: number }[];
}

export interface PecaNaFila {
  nome: string;
  chave: string;
  region: Region;
  espessuraMin: number;
}

/**
 * Cada arquivo na sua escala, um ao lado do outro no letreiro. A chave e
 * `arquivo:nome`: senao o "03" de um arquivo se confundiria com o do outro.
 */
export function enfileirarArquivos(arquivos: ArquivoNaFila[]): PecaNaFila[] {
  const varios = arquivos.length > 1;
  let x0 = 0;
  const todas: PecaNaFila[] = [];
  arquivos.forEach((a, i) => {
    const ativas = a.pecas.filter((x) => !a.desativadas.has(x.nome));
    if (!ativas.length) return;
    const b = regionBounds(ativas.flatMap((x) => x.region));
    const s = b.h > 0 ? a.alvo / b.h : 1;
    for (const x of ativas) {
      todas.push({
        nome: varios ? `${letraArquivo(i)}${x.nome}` : x.nome,
        chave: chavePecaArquivo(a.id, x.nome),
        region: translateRegion(scaleRegion(x.region, s), x0 - b.minX * s, -b.minY * s),
        espessuraMin: x.espessuraNativa * s,
      });
    }
    x0 += b.w * s + VAO_ENTRE_ARQUIVOS;
  });
  return todas;
}
