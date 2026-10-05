'use client';

/**
 * Topo da loja: a pessoa escreve um nome e ve o chaveiro em 3D mudar na hora (prevista ao
 * vivo, como nas lojas de presente personalizado). A peca entra "imprimindo" camada por
 * camada e depois so gira devagar. Sem WebGL, ou enquanto carrega, fica a foto do gerador;
 * quem pede menos movimento ve a peca pronta e parada.
 */
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { CAMPO_MARCA, classeBotaoMarca } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { BotaoAdicionar } from '@/components/loja/CardProduto';
import { Miniatura } from '@/features/catalogo/Miniaturas';
import type { PecaCarregada } from './carregarPeca';

const CenaPeca = dynamic(() => import('./CenaPeca'), { ssr: false });

const GERADOR = 'chaveiro-nome';
const PRODUTO = 'chaveiro-nome';
const NOME_INICIAL = 'Ana';
const MAX = 14;
const ESPERA = 350; // ms depois da ultima tecla

export function TopoPersonalize() {
  const [nome, setNome] = useState(NOME_INICIAL);
  const [pedido, setPedido] = useState(NOME_INICIAL);
  const [peca, setPeca] = useState<PecaCarregada | null>(null);
  const [gerando, setGerando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [calmo, setCalmo] = useState(false);

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setCalmo(m.matches);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPedido(nome.trim()), ESPERA);
    return () => clearTimeout(t);
  }, [nome]);

  useEffect(() => {
    if (!pedido) return;
    let vivo = true;
    setGerando(true);
    import('./pecaPersonalizada')
      .then(({ carregarPecaCom }) => carregarPecaCom(GERADOR, { nomes: pedido }))
      .then((p) => { if (vivo) { setPeca(p); setFalhou(false); } })
      .catch(() => vivo && setFalhou(true))
      .finally(() => vivo && setGerando(false));
    return () => {
      vivo = false;
    };
  }, [pedido]);

  const nomeFinal = nome.trim();
  return (
    <section aria-labelledby="loja-titulo" className="grid items-center gap-6 border-b border-marca-linha pb-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10">
      <div className="flex max-w-[600px] flex-col gap-5">
        <h1 id="loja-titulo" className="m-0 font-display text-[clamp(32px,3.8vw,54px)] leading-[1.05] font-semibold tracking-tight text-marca-navy">Escreva um nome. Veja a peça em 3D.</h1>
        <p className="m-0 max-w-[48ch] text-base leading-relaxed text-marca-texto-2">Chaveiro com nome em camadas, impresso sob medida. Digite e confira a peça antes de pedir: nas outras peças personalizáveis é igual.</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="topo-nome" className="text-sm font-semibold text-marca-navy">Nome no chaveiro</label>
          <input
            id="topo-nome"
            value={nome}
            maxLength={MAX}
            autoComplete="off"
            onChange={(e) => setNome(e.target.value)}
            className={cx(CAMPO_MARCA, 'h-12 max-w-sm text-lg')}
          />
          <p className="m-0 text-xs text-marca-texto-2" aria-live="polite">{gerando ? 'Montando a peça…' : falhou ? 'Não deu para mostrar o 3D agora; a peça continua disponível.' : `Até ${MAX} letras.`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-auto sm:min-w-64">
            <BotaoAdicionar slug={PRODUTO} extra={{ quantidade: 1, observacao: nomeFinal ? `Nome: ${nomeFinal}` : '' }} grande />
          </div>
          <a href="#produtos" className={classeBotaoMarca('fantasma', false, 'controle')}>Ver todas as peças</a>
        </div>
      </div>
      <div data-secao="presentes" className="relative order-first aspect-[16/10] overflow-hidden rounded-marca-lg bg-secao-suave md:order-none md:aspect-auto md:h-[min(56vh,520px)]">
        {!peca && (
          <div className="absolute inset-0 p-[8%] [&_.miniatura]:size-full [&_.miniatura]:object-contain [&_.miniatura-reserva]:size-full">
            <Miniatura id={GERADOR} alt="Chaveiro com nome" reserva={<span className="grid size-full place-items-center text-sm text-secao-forte">Chaveiro com nome</span>} />
          </div>
        )}
        {peca && <CenaPeca peca={peca} girar={!calmo} imprimir={!calmo} balancar />}
        <p className="absolute bottom-3 left-3 m-0 rounded-marca-md bg-marca-vidro px-3 py-1.5 text-sm text-marca-texto backdrop-blur-sm">
          {peca ? <><strong>{nomeFinal || NOME_INICIAL}</strong>, {peca.medidas[0]} × {peca.medidas[1]} mm</> : 'Chaveiro com nome'}
        </p>
      </div>
    </section>
  );
}
