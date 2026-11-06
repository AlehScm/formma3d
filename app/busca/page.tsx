import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { ResultadoBusca } from '@/components/loja/Busca';
import { naoIndexar } from '@/lib/seo';

// Resultado de busca nao vai para o Google (conteudo repetido das secoes).
export const metadata: Metadata = naoIndexar('Buscar peças');

export default function BuscaPage() {
  // A busca le ?q= no navegador (export estatico) e busca as pecas publicas por GET na API.
  return (
    <PaginaLoja>
      <Suspense fallback={<div className="h-40 rounded-2xl bg-marca-branco shadow-marca-1" aria-busy="true" />}>
        <ResultadoBusca />
      </Suspense>
    </PaginaLoja>
  );
}
