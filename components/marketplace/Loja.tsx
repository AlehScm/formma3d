/**
 * Ponte para quem ainda importa daqui (o catalogo /criar): a moldura da loja agora mora
 * em components/loja. O conteudo do catalogo cuida do proprio espacamento (`cru`).
 */
import type { ReactNode } from 'react';
import { PaginaLoja as PaginaLojaBase } from '@/components/loja/Estrutura';
import type { Secao } from '@/lib/marketplace/tipos';

export function PaginaLoja({ secaoAtual, children }: { secaoAtual?: Secao; children: ReactNode }) {
  return <PaginaLojaBase secaoAtual={secaoAtual} cru>{children}</PaginaLojaBase>;
}
