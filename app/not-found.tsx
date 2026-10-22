import type { Metadata } from 'next';
import Link from 'next/link';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { TituloPagina } from '@/components/loja/Modulo';
import { porSecao } from '@/lib/marketplace/consultas';
import { ORDEM_SECOES, SECOES } from '@/lib/marketplace/tipos';

// O Next ja marca a 404 com noindex.
export const metadata: Metadata = { title: 'Página não encontrada' };

const LINK = 'rounded-full border border-marca-linha px-4 py-2 text-item text-marca-navy no-underline hover:bg-marca-gelo';

/** Endereco que nao existe (vira o 404.html do Pages): volta para a loja em vez de beco sem saida. */
export default function NaoEncontrada() {
  return (
    <PaginaLoja>
      <TituloPagina titulo="Página não encontrada" descricao="Esse endereço não existe ou mudou de lugar. Veja as peças da loja:" />
      <div className="flex flex-wrap gap-2">
        <Link href="/" className={LINK}>Início</Link>
        <Link href="/pecas" className={LINK}>Todas as peças</Link>
        {ORDEM_SECOES.filter((s) => porSecao(s).length).map((s) => <Link key={s} href={`/secao/${s}`} className={LINK}>{SECOES[s].nome}</Link>)}
        <Link href="/criar" className={LINK}>Personalize em 3D</Link>
      </div>
    </PaginaLoja>
  );
}
