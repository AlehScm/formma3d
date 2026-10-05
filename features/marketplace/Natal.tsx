'use client';

/**
 * Pecas do especial de Natal: neve caindo e pisca-pisca no palco (CSS, param com "reduzir
 * movimento"), a contagem ate o Natal, o topo com o enfeite de floco de neve ao vivo e a
 * faixa da home. Tudo so aparece com a campanha ligada (lib/marketplace/campanhas.ts).
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { classeBotaoMarca } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { Miniatura } from '@/features/catalogo/Miniaturas';
import { useMontado } from '@/features/loja/estado';
import { CAMPANHAS, CORES_NATAL, TEXTOS_NATAL, diasAteONatal } from '@/lib/marketplace/campanhas';
import { TopoAoVivo } from './TopoAoVivo';

// Fundo e brilho (currentColor) na mesma cor de cada lampada.
const LAMPADAS = ['bg-natal-vermelho text-natal-vermelho', 'bg-natal-dourado text-natal-dourado', 'bg-natal-verde text-natal-verde', 'bg-natal-creme text-natal-creme'];

export function Neve({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('pointer-events-none absolute inset-0 natal-neve opacity-80', className)} />;
}

/** Fio de luzes no alto do palco: cada lampada acende num tempo (natal-pisca). */
export function PiscaPisca({ quantas = 18 }: { quantas?: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8">
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-5 w-full stroke-natal-creme/50">
        <path d="M0 2 Q 12.5 9 25 2 T 50 2 T 75 2 T 100 2" fill="none" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="natal-pisca absolute inset-x-[2%] top-1 flex justify-between">
        {Array.from({ length: quantas }, (_, i) => (
          <span key={i} className={cx('block h-3 w-2 rounded-full shadow-[0_0_10px_2px_currentColor]', LAMPADAS[i % LAMPADAS.length], i % 2 ? 'mt-2.5' : 'mt-0.5')} />
        ))}
      </div>
    </div>
  );
}

export function ContagemNatal({ claro }: { claro?: boolean }) {
  const montado = useMontado();
  const [hoje, setHoje] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setHoje(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const dias = diasAteONatal(hoje);
  return (
    <p className={cx('m-0 inline-flex min-h-8 w-fit items-center gap-2 rounded-marca-pilula px-3 text-apoio font-semibold', claro ? 'bg-natal-creme/15 text-natal-creme' : 'bg-natal-vermelho/10 text-natal-vermelho')} aria-live="polite">
      <span aria-hidden="true" className="size-2 rounded-full bg-natal-dourado" />
      {montado ? (dias === 0 ? 'Feliz Natal!' : `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'} para o Natal`) : 'Especial de Natal'}
    </p>
  );
}

/** Topo da pagina de Natal: o enfeite de floco de neve com o nome, num palco de noite com neve. */
export function TopoNatal() {
  return (
    <TopoAoVivo
      c={{
        gerador: 'floco-neve', produto: 'enfeite-floco-neve', nomePeca: 'Enfeite floco de neve', campo: 'nomes', rotuloCampo: 'Nome no enfeite', nomeInicial: 'Noel', max: 14,
        titulo: TEXTOS_NATAL.titulo,
        texto: TEXTOS_NATAL.frase,
        link: { href: '#presentes', rotulo: 'Ver presentes de Natal' },
        extras: { corFloco: CORES_NATAL.creme, corNome: CORES_NATAL.vermelho },
        paleta: [CORES_NATAL.creme, CORES_NATAL.vermelho],
        palco: { classe: 'bg-natal-verde-noite', decoracao: <><Neve /><PiscaPisca /></> },
        extra: <ContagemNatal />,
      }}
    />
  );
}

/** Faixa da home: chama para o especial, com neve leve, o floco em miniatura e a contagem. */
export function FaixaNatal() {
  const c = CAMPANHAS.natal;
  return (
    <section aria-labelledby="faixa-natal" className="relative grid items-center gap-6 overflow-hidden rounded-marca-lg bg-natal-verde-noite px-6 py-8 text-natal-creme md:grid-cols-[minmax(0,1fr)_auto] md:px-10">
      <Neve className="opacity-60" />
      <PiscaPisca quantas={24} />
      <div className="relative flex flex-col gap-3 pt-3">
        <ContagemNatal claro />
        <h2 id="faixa-natal" className="m-0 font-display text-titulo">{c.nome}</h2>
        <p className="m-0 max-w-[52ch] text-corpo text-natal-creme/85">{TEXTOS_NATAL.faixa}</p>
        <Link href={c.href} className={cx(classeBotaoMarca('primario', false, 'controle'), 'w-fit')}>Ver o especial de Natal</Link>
      </div>
      <div className="relative mx-auto size-40 md:size-48 [&_.miniatura]:size-full [&_.miniatura]:object-contain [&_.miniatura]:drop-shadow-[0_10px_18px_rgb(0_0_0/0.45)] [&_.miniatura-reserva]:size-full">
        <Miniatura id="floco-neve" alt="Enfeite floco de neve com nome" paleta={[CORES_NATAL.creme, CORES_NATAL.vermelho]} reserva={<span className="block size-full" />} />
      </div>
    </section>
  );
}
