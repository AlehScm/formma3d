'use client';

/** Resultado da busca (?q=) ou os favoritos (?favoritos=1), sobre os produtos publicos (GET na API). */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { BotaoMarca } from '@/components/marca';
import { useFavoritos, useMontado } from '@/features/loja/estado';
import { useLista } from '@/lib/marketplace/api/cliente';
import { ENDPOINTS } from '@/lib/marketplace/api/contrato';
import { filtrarPorTexto } from '@/lib/marketplace/busca';
import { Listagem } from './Listagem';
import { TituloPagina } from './Modulo';

export function ResultadoBusca() {
  const params = useSearchParams();
  const montado = useMontado();
  const favoritos = useFavoritos((s) => s.slugs);
  const [tentativa, setTentativa] = useState(0);
  const { itens: produtos, erro } = useLista(ENDPOINTS.produtos, tentativa);
  const q = params?.get('q')?.trim() ?? '';
  const soFavoritos = params?.get('favoritos') === '1';
  const titulo = soFavoritos ? 'Seus favoritos' : q ? `Resultados para “${q}”` : 'Todos os produtos';
  if (erro) {
    return (
      <>
        <TituloPagina titulo={titulo} />
        <div role="alert" className="flex flex-col items-center gap-3 rounded-marca-lg bg-marca-branco p-10 text-center">
          <p className="m-0 font-display text-modulo text-marca-navy">Não deu para carregar as peças.</p>
          <BotaoMarca onClick={() => setTentativa(tentativa + 1)} formato="controle" variante="contorno">Tentar de novo</BotaoMarca>
        </div>
      </>
    );
  }
  if (!produtos || (soFavoritos && !montado)) {
    return (
      <>
        <TituloPagina titulo={titulo} />
        <div className="h-40 rounded-2xl bg-marca-branco shadow-marca-1" aria-busy="true" aria-label="Carregando as peças" />
      </>
    );
  }
  const lista = soFavoritos ? produtos.filter((p) => favoritos.includes(p.slug)) : filtrarPorTexto(produtos, q);
  return (
    <>
      <TituloPagina titulo={titulo} />
      <Listagem
        key={`${q}|${soFavoritos}`}
        produtos={lista}
        vazio={
          <div className="rounded-marca-lg bg-marca-branco p-10 text-center">
            <p className="m-0 font-display text-modulo text-marca-navy">{soFavoritos ? 'Você ainda não favoritou nada.' : `Nada encontrado para “${q}”.`}</p>
            <p className="mt-1 mb-4 text-corpo text-marca-texto-2">{soFavoritos ? 'Toque no coração das peças para guardar aqui.' : 'Tente outra palavra, como chaveiro, placa ou letreiro.'}</p>
            <Link href="/pecas" className="inline-flex min-h-11 items-center rounded-lg bg-marca-azul px-6 text-item font-semibold text-white no-underline hover:bg-marca-azul-forte">Ver todas as peças</Link>
          </div>
        }
      />
    </>
  );
}
