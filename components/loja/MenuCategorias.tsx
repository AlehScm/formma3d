'use client';

/**
 * "Categorias" na barra do topo (padrao "todos os departamentos" das grandes lojas): um botao
 * so no lugar das categorias soltas na barra. No computador abre um menu suspenso; no celular,
 * uma folha que sobe do rodape (como o "Criar", MenuCriar.tsx). Lista as categorias com peca
 * publica, com a quantidade; a atual fica marcada e da nome ao botao.
 */
import Link from 'next/link';
import { useState } from 'react';
import { Dialog, Popover } from 'radix-ui';
import { FOCO_MARCA, ICONE_MARCA } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { SECOES, hrefDaSecao, type Secao } from '@/lib/marketplace/tipos';
import { IconeAbaixo, IconeFechar, IconeMenu } from './icones';

export type ItemCategoria = { secao: Secao; total: number };

const BOTAO = cx('group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-marca-sm px-3 py-2 text-item font-semibold whitespace-nowrap text-marca-navy hover:bg-marca-gelo data-[state=open]:bg-marca-gelo', FOCO_MARCA);
const SETA = 'size-4 shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none';
const OPCAO = cx("flex min-h-11 items-center gap-3 rounded-marca-sm px-3 py-2 text-item text-marca-navy no-underline before:size-2.5 before:shrink-0 before:rounded-full before:bg-secao before:content-[''] hover:bg-secao-suave aria-[current=page]:bg-secao-suave aria-[current=page]:font-semibold", FOCO_MARCA);

function Lista({ itens, atual, aoEscolher }: { itens: ItemCategoria[]; atual?: Secao; aoEscolher: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      <ul className="m-0 grid list-none grid-cols-1 gap-0.5 p-0 sm:grid-cols-2">
        {itens.map(({ secao, total }) => (
          <li key={secao} data-secao={secao}>
            <Link href={hrefDaSecao(secao)} onClick={aoEscolher} aria-current={secao === atual ? 'page' : undefined} className={OPCAO}>
              <span className="flex-1">{SECOES[secao].nome}</span>
              <span className="text-apoio text-marca-texto-3 tabular-nums">{total}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/pecas" onClick={aoEscolher} className={cx('mt-1 border-t border-marca-linha px-3 pt-3 pb-2 text-item font-semibold text-marca-azul no-underline hover:underline', FOCO_MARCA)}>Ver todas as peças</Link>
    </div>
  );
}

/** `menu`: suspenso, para o computador. `folha`: sobe do rodape, para o celular. */
export function MenuCategorias({ itens, atual, modo }: { itens: ItemCategoria[]; atual?: Secao; modo: 'menu' | 'folha' }) {
  const [aberto, setAberto] = useState(false);
  const fechar = () => setAberto(false);
  // No computador o botao diz a categoria atual; no celular fica curto (o titulo da pagina ja diz).
  const gatilho = <><IconeMenu className="size-4.5 shrink-0" aria-hidden />{atual && modo === 'menu' ? `Categorias: ${SECOES[atual].nome}` : 'Categorias'}<IconeAbaixo className={SETA} aria-hidden /></>;

  if (modo === 'menu') {
    return (
      <Popover.Root open={aberto} onOpenChange={setAberto}>
        <Popover.Trigger className={BOTAO}>{gatilho}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="start" sideOffset={4} aria-label="Categorias" className="z-40 w-[min(520px,calc(100vw-32px))] rounded-marca-md border border-marca-linha bg-marca-branco p-2 font-marca shadow-marca-2 outline-none">
            <Lista itens={itens} atual={atual} aoEscolher={fechar} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
      <Dialog.Trigger className={BOTAO}>{gatilho}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-marca-navy/40" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col gap-1 overflow-y-auto rounded-t-marca-lg bg-marca-branco px-3 pt-2.5 pb-[calc(28px+env(safe-area-inset-bottom,0px))] font-marca text-marca-texto shadow-marca-2">
          <span className="mx-auto h-1 w-9 rounded-full bg-marca-linha" aria-hidden />
          <div className="flex items-center justify-between pl-3">
            <Dialog.Title className="m-0 font-display text-modulo text-marca-navy">Categorias</Dialog.Title>
            <Dialog.Close aria-label="Fechar" className={ICONE_MARCA}><IconeFechar className="size-5" aria-hidden /></Dialog.Close>
          </div>
          <Lista itens={itens} atual={atual} aoEscolher={fechar} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
