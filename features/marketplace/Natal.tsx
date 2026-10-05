'use client';

/**
 * Pecas do especial de Natal: neve caindo e pisca-pisca no palco (CSS, param com "reduzir
 * movimento"), o fio de luzes do cabecalho, o gorro, a contagem ate o Natal e o topo com o
 * enfeite de floco de neve ao vivo. Tudo so aparece com a campanha ligada (lib/marketplace/campanhas.ts).
 */
import { useEffect, useState } from 'react';
import { cx } from '@/components/ui/cx';
import { useMontado } from '@/features/loja/estado';
import { CORES_NATAL, TEXTOS_NATAL, diasAteONatal } from '@/lib/marketplace/campanhas';
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

/** Fio de luzes na borda de baixo do cabecalho, em toda a largura (no celular, metade das lampadas). */
export function FioDeLuzes() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative h-4 overflow-hidden">
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-3 w-full stroke-marca-linha">
        <path d="M0 1 Q 2.5 7 5 1 T 10 1 T 15 1 T 20 1 T 25 1 T 30 1 T 35 1 T 40 1 T 45 1 T 50 1 T 55 1 T 60 1 T 65 1 T 70 1 T 75 1 T 80 1 T 85 1 T 90 1 T 95 1 T 100 1" fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="natal-pisca absolute inset-x-[1.25%] top-0 flex justify-between max-sm:[&>:nth-child(even)]:hidden">
        {Array.from({ length: 40 }, (_, i) => (
          <span key={i} className={cx('block h-2.5 w-1.5 rounded-full shadow-[0_0_8px_1px_currentColor]', LAMPADAS[i % LAMPADAS.length], 'mt-1')} />
        ))}
      </div>
    </div>
  );
}

/** Estrelinha dourada do Natal (menu, rodape, botao do produto). */
export function EstrelaNatal({ className = 'size-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={cx('fill-natal-dourado', className)}><path d="m12 2 2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" /></svg>;
}

/** Gorro de Papai Noel (desenho proprio): vai inclinado no canto de icones e circulos. */
export function GorroNoel({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 34" aria-hidden="true" className={cx('pointer-events-none drop-shadow-[0_2px_2px_rgb(0_0_0/0.25)]', className)}>
      <path d="M5 26 C9 13 18 4 30 5 C29 11 30 17 34 23 Z" className="fill-natal-vermelho" />
      <rect x="2" y="22" width="34" height="9" rx="4.5" transform="rotate(-6 19 26)" className="fill-natal-creme" />
      <circle cx="31" cy="6" r="4.5" className="fill-natal-creme" />
    </svg>
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
      }}
    />
  );
}
