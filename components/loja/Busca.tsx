'use client';

/** Resultado da busca (?q=) ou os favoritos (?favoritos=1), sobre os produtos publicos. */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useFavoritos, useMontado } from '@/features/loja/estado';
import { filtrarPorTexto } from '@/lib/marketplace/busca';
import type { Produto } from '@/lib/marketplace/tipos';
import { Listagem } from './Listagem';

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
      <div className="rounded-2xl bg-marca-branco px-6 py-5 shadow-marca-1">
        <h1 className="m-0 font-display text-[clamp(24px,2.6vw,34px)] leading-tight font-extrabold text-marca-navy">{titulo}</h1>
      </div>
      <Listagem
        key={`${q}|${soFavoritos}`}
        produtos={lista}
        vazio={
          <div className="rounded-2xl bg-marca-branco p-10 text-center shadow-marca-1">
            <p className="m-0 text-lg font-semibold text-marca-navy">{soFavoritos ? 'Você ainda não favoritou nada.' : `Nada encontrado para “${q}”.`}</p>
            <p className="mt-1 mb-4 text-marca-texto-2">{soFavoritos ? 'Toque no coração das peças para guardar aqui.' : 'Tente outra palavra, como chaveiro, placa ou letreiro.'}</p>
            <Link href="/" className="inline-flex min-h-11 items-center rounded-lg bg-marca-azul px-6 font-semibold text-white no-underline hover:bg-marca-azul-forte">Ver todas as peças</Link>
          </div>
        }
      />
    </>
  );
}
