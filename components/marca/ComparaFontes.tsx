/**
 * Comparacao das fontes de display candidatas (livres, OFL), servidas pelo proprio site
 * (next/font). So a pagina /sistema importa este arquivo, entao as tres so carregam ali.
 * A escolhida vira --marca-fonte-display; as outras saem.
 */
import { Bricolage_Grotesque, Space_Grotesk, Unbounded } from 'next/font/google';
import { cx } from '@/components/ui/cx';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['800'], display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['700'], display: 'swap' });
const unbounded = Unbounded({ subsets: ['latin'], weight: ['800'], display: 'swap' });

const CANDIDATAS = [
  { nome: 'Arial Black (atual)', classe: 'font-display', nota: 'Do sistema: muda de aparelho para aparelho.' },
  { nome: 'Bricolage Grotesque', classe: bricolage.className, nota: 'Grotesca expressiva, com personalidade; boa para títulos grandes.' },
  { nome: 'Space Grotesk', classe: spaceGrotesk.className, nota: 'Geométrica e técnica, combina com 3D e código.' },
  { nome: 'Unbounded', classe: unbounded.className, nota: 'Larga e arredondada, chamativa; pede textos curtos.' },
];

export function ComparaFontes() {
  return (
    <section aria-labelledby="fontes-titulo" className="border-y border-marca-linha bg-marca-branco px-6 py-8">
      <h2 id="fontes-titulo" className="m-0 text-marca-titulo-3 font-extrabold text-marca-navy">Fonte de display: escolha</h2>
      <p className="mt-1.5 mb-6 text-sm text-marca-texto-2">O mesmo trecho em cada candidata. A escolhida vale para o wordmark, os títulos e os destaques.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
        {CANDIDATAS.map((c) => (
          <article key={c.nome} className="flex flex-col gap-3 rounded-marca-lg border border-marca-linha bg-marca-palido p-5">
            <div className="flex items-baseline justify-between gap-3">
              <strong className="text-sm text-marca-navy">{c.nome}</strong>
            </div>
            <p className={cx('m-0 -skew-x-[7deg] text-[34px] leading-none italic tracking-[-0.06em] text-marca-navy', c.classe)}>
              SCAR<span className="texto-gradiente">PRINT</span>
            </p>
            <p className={cx('m-0 text-[clamp(28px,2.6vw,40px)] leading-[0.98] tracking-[-0.05em] text-marca-navy', c.classe)}>
              Peças impressas em 3D, <span className="texto-gradiente">feitas para você.</span>
            </p>
            <p className={cx('m-0 text-[22px] tracking-[-0.03em] text-marca-navy', c.classe)}>Casa · Colecionáveis · Presentes</p>
            <p className="m-0 text-[13px] text-marca-texto-3">{c.nota}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
