'use client';

/** Resultado da busca (?q=) ou os favoritos (?favoritos=1), sobre os produtos publicos. */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useFavoritos, useMontado } from '@/features/loja/estado';
import { filtrarPorTexto } from '@/lib/marketplace/busca';
import type { Produto } from '@/lib/marketplace/tipos';
import { Listagem } from './Listagem';
import { TituloPagina } from './Modulo';

export function ResultadoBusca({ produtos }: { produtos: Produto[] }) {
  const params = useSearchParams();
  const montado = useMontado();
  const favoritos = useFavoritos((s) => s.slugs);
  const q = params?.get('q')?.trim() ?? '';
  const soFavoritos = params?.get('favoritos') === '1';
  const lista = soFavoritos ? (montado ? produtos.filter((p) => favoritos.includes(p.slug)) : []) : filtrarPorTexto(produtos, q);
  const titulo = soFavoritos ? 'Seus favoritos' : q ? `Resultados para “${q}”` : 'Todos os produtos';
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
