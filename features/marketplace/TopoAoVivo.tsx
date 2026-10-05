'use client';

/**
 * Topo com peca ao vivo: a pessoa escreve um nome e ve a peca em 3D mudar na hora (previa ao
 * vivo, como nas lojas de presente personalizado). A peca entra "imprimindo" camada por
 * camada e depois balanca de leve. Sem WebGL, ou enquanto carrega, fica a foto do gerador;
 * quem pede menos movimento ve a peca pronta e parada. Usado no topo da home (chaveiro) e no
 * especial de Natal (enfeite de floco de neve, com palco proprio).
 */
import dynamic from 'next/dynamic';
import { useEffect, useState, type ReactNode } from 'react';
import type { Valores } from '@/lib/gerador/tipos';
import { CAMPO_MARCA, classeBotaoMarca } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { BotaoAdicionar } from '@/components/loja/CardProduto';
import { Miniatura } from '@/features/catalogo/Miniaturas';
import type { PecaCarregada } from './carregarPeca';

const CenaPeca = dynamic(() => import('./CenaPeca'), { ssr: false });

const ESPERA = 350; // ms depois da ultima tecla

export interface ConfigTopo {
  /** Gerador da peca e produto que vai para o orcamento. */
  gerador: string;
  produto: string;
  nomePeca: string;
  /** Parametro de texto do gerador que recebe o nome digitado. */
  campo: string;
  rotuloCampo: string;
  nomeInicial: string;
  max: number;
  titulo: string;
  texto: string;
  link: { href: string; rotulo: string };
  /** Valores fixos por cima do exemplo (cores da campanha, por exemplo). */
  extras?: Valores;
  /** Cores da foto de reserva (antes do 3D chegar). */
  paleta?: string[];
  /** Palco: classes do fundo e decoracao por cima (neve, pisca-pisca). */
  palco?: { classe: string; decoracao?: ReactNode };
  /** Algo a mais embaixo do texto (contagem regressiva, por exemplo). */
  extra?: ReactNode;
}

export function TopoAoVivo({ c }: { c: ConfigTopo }) {
  const [nome, setNome] = useState(c.nomeInicial);
  const [pedido, setPedido] = useState(c.nomeInicial);
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
      .then(({ carregarPecaCom }) => carregarPecaCom(c.gerador, { ...c.extras, [c.campo]: pedido }))
      .then((p) => { if (vivo) { setPeca(p); setFalhou(false); } })
      .catch(() => vivo && setFalhou(true))
      .finally(() => vivo && setGerando(false));
    return () => {
      vivo = false;
    };
    // c.extras e fixo por pagina
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido, c.gerador, c.campo]);

  const nomeFinal = nome.trim();
  return (
    <section aria-labelledby="loja-titulo" className="grid items-center gap-6 border-b border-marca-linha pb-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10">
      <div className="flex max-w-[600px] flex-col gap-5">
        <h1 id="loja-titulo" className="m-0 font-display text-display text-marca-navy">{c.titulo}</h1>
        <p className="m-0 max-w-[48ch] text-corpo text-marca-texto-2">{c.texto}</p>
        {c.extra}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="topo-nome" className="text-apoio font-semibold text-marca-navy">{c.rotuloCampo}</label>
          <input
            id="topo-nome"
            value={nome}
            maxLength={c.max}
            autoComplete="off"
            onChange={(e) => setNome(e.target.value)}
            className={cx(CAMPO_MARCA, 'h-12 max-w-sm text-item')}
          />
          <p className="m-0 text-apoio text-marca-texto-2" aria-live="polite">{gerando ? 'Montando a peça…' : falhou ? 'Não deu para mostrar o 3D agora; a peça continua disponível.' : `Até ${c.max} letras.`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-auto sm:min-w-64">
            <BotaoAdicionar slug={c.produto} extra={{ quantidade: 1, observacao: nomeFinal ? `Nome: ${nomeFinal}` : '' }} grande />
          </div>
          <a href={c.link.href} className={classeBotaoMarca('fantasma', false, 'controle')}>{c.link.rotulo}</a>
        </div>
      </div>
      <div data-secao="presentes" className={cx('relative order-first aspect-[16/10] overflow-hidden rounded-marca-lg md:order-none md:aspect-auto md:h-[min(56vh,520px)]', c.palco?.classe ?? 'bg-secao-suave')}>
        {c.palco?.decoracao}
        {!peca && (
          <div className="absolute inset-0 p-[8%] [&_.miniatura]:size-full [&_.miniatura]:object-contain [&_.miniatura-reserva]:size-full">
            <Miniatura id={c.gerador} alt={c.nomePeca} paleta={c.paleta} reserva={<span className="grid size-full place-items-center text-apoio text-secao-forte">{c.nomePeca}</span>} />
          </div>
        )}
        {peca && <CenaPeca peca={peca} girar={!calmo} imprimir={!calmo} balancar />}
        <p className="absolute bottom-3 left-3 m-0 rounded-marca-md bg-marca-vidro px-3 py-1.5 text-apoio text-marca-texto backdrop-blur-sm">
          {peca ? <><strong>{nomeFinal || c.nomeInicial}</strong>, {peca.medidas[0]} × {peca.medidas[1]} mm</> : c.nomePeca}
        </p>
      </div>
    </section>
  );
}

/** Topo da home: o chaveiro com nome. */
const TOPO_HOME: ConfigTopo = {
  gerador: 'chaveiro-nome', produto: 'chaveiro-nome', nomePeca: 'Chaveiro com nome', campo: 'nomes', rotuloCampo: 'Nome no chaveiro', nomeInicial: 'Ana', max: 14,
  titulo: 'Escreva um nome. Veja a peça em 3D.',
  texto: 'Chaveiro com nome em camadas, impresso sob medida. Digite e confira a peça antes de pedir: nas outras peças personalizáveis é igual.',
  link: { href: '/pecas', rotulo: 'Ver todas as peças' },
};

export function TopoPersonalize() {
  return <TopoAoVivo c={TOPO_HOME} />;
}
