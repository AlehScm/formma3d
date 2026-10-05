import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { IconeBusca, IconeConversa, IconeTridimensional } from '@/components/loja/icones';
import { PaginaLoja } from '@/components/loja/Estrutura';
import { Modulo } from '@/components/loja/Modulo';
import { Prateleira } from '@/components/loja/Vitrine';
import { ComPaleta } from '@/features/catalogo/Miniaturas';
import { TopoNatal } from '@/features/marketplace/Natal';
import { CAMPANHAS, PALETA_NATAL, TEXTOS_NATAL, VITRINES_NATAL, campanhaAtiva } from '@/lib/marketplace/campanhas';
import { porSlug } from '@/lib/marketplace/consultas';
import { COMO_FUNCIONA } from '@/lib/marketplace/loja';
import type { Produto } from '@/lib/marketplace/tipos';

export const metadata: Metadata = { title: `${CAMPANHAS.natal.nome} | Scarprint`, description: TEXTOS_NATAL.frase };

const ICONES_PASSOS = [IconeBusca, IconeTridimensional, IconeConversa];

/** Especial de Natal: so existe com a campanha ligada (desligada, o build gera 404). */
export default function NatalPage() {
  if (!campanhaAtiva('natal')) notFound();
  const vitrines = VITRINES_NATAL.map((v) => ({ ...v, produtos: v.slugs.map((s) => porSlug(s)).filter((p): p is Produto => !!p) })).filter((v) => v.produtos.length);
  return (
    <PaginaLoja>
      <div data-campanha="natal" className="flex flex-col gap-8">
        <TopoNatal />
        <div id="presentes" className="flex scroll-mt-40 flex-col gap-8">
          <ComPaleta cores={PALETA_NATAL}>
            {vitrines.map((v) => <Prateleira key={v.titulo} titulo={v.titulo} produtos={v.produtos} tema="natal" />)}
          </ComPaleta>
        </div>
        <Modulo id="natal-antecedencia" titulo="Peça com antecedência" subtitulo={TEXTOS_NATAL.antecedencia}>
          <ol className="m-0 grid list-none gap-5 p-0 md:grid-cols-3">
            {COMO_FUNCIONA.map((passo, i) => {
              const Icone = ICONES_PASSOS[i]!;
              return (
                <li key={passo.titulo} className="flex items-start gap-3">
                  <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-natal-vermelho/10 text-natal-vermelho">
                    <Icone className="size-5" aria-hidden />
                    <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-natal-vermelho text-apoio font-bold text-white">{i + 1}</span>
                  </span>
                  <div>
                    <h3 className="m-0 text-item font-semibold text-marca-navy">{passo.titulo}</h3>
                    <p className="m-0 mt-1 text-apoio text-marca-texto-2">{passo.texto}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Modulo>
      </div>
    </PaginaLoja>
  );
}
