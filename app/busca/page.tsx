import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { ResultadoBusca } from '@/components/loja/Busca';
import { produtosPublicos } from '@/lib/marketplace/consultas';

export const metadata: Metadata = { title: 'Buscar peças | Scarprint' };

export default function BuscaPage() {
  // A busca le ?q= no navegador (export estatico); so os produtos publicos vao para a pagina.
  return (
    <PaginaLoja>
      <Suspense fallback={<div className="h-40 rounded-2xl bg-marca-branco shadow-marca-1" aria-busy="true" />}>
        <ResultadoBusca produtos={produtosPublicos()} />
      </Suspense>
    </PaginaLoja>
  );
}
