'use client';

/**
 * Peca viva: o modelo 3D real de um gerador girando devagar sobre o palco da secao, com
 * as medidas reais embaixo. Carrega so no navegador (three e as receitas vem por import
 * dinamico). Sem WebGL ou enquanto carrega, mostra a reserva. Respeita "reduzir movimento".
 */
import dynamic from 'next/dynamic';
import { useEffect, useState, type ReactNode } from 'react';
import type { PecaCarregada } from './carregarPeca';

const CenaPeca = dynamic(() => import('./CenaPeca'), { ssr: false });

const mm = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export function PecaViva({ id, nome, reserva, interativo = false }: { id: string | null; nome?: string; reserva: ReactNode; interativo?: boolean }) {
  const [peca, setPeca] = useState<{ id: string; dados: PecaCarregada } | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [calmo, setCalmo] = useState(false);

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setCalmo(m.matches);
    const ouvir = () => setCalmo(m.matches);
    m.addEventListener('change', ouvir);
    return () => m.removeEventListener('change', ouvir);
  }, []);

  useEffect(() => {
    if (!id) return;
    let vivo = true;
    setFalhou(false);
    import('./carregarPeca')
      .then(({ carregarPeca }) => carregarPeca(id))
      .then((dados) => vivo && setPeca({ id, dados }))
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
  }, [id]);

  const pronta = peca && peca.id === id && !falhou;
  return (
    <div className="relative size-full">
      {!pronta && <div className="absolute inset-0">{reserva}</div>}
      {/* troca de peca: a anterior fica ate a nova chegar; secao sem peca mostra so a reserva */}
      {id && peca && !falhou && <CenaPeca key={peca.id} peca={peca.dados} girar={!calmo && !interativo} interativo={interativo} />}
      {pronta && nome && (
        <p className="absolute bottom-4 left-4 m-0 max-w-[calc(100%-2rem)] rounded-marca-md bg-marca-vidro px-3 py-2 text-marca-pequeno leading-snug text-marca-texto backdrop-blur-sm">
          <strong className="font-bold">{nome}</strong>
          <span className="block tabular-nums text-marca-texto-2">
            {mm(peca.dados.medidas[0])} × {mm(peca.dados.medidas[1])} × {mm(peca.dados.medidas[2])} mm, {peca.dados.cores} {peca.dados.cores === 1 ? 'cor' : 'cores'}
          </span>
        </p>
      )}
    </div>
  );
}
