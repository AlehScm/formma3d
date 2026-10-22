'use client';

/**
 * "Criar" na barra de categorias (docs/handoff-menu-criar.md): um item so para os dois
 * caminhos que nao sao categoria, a peca personalizada em 3D e o letreiro de fachada (orcado
 * no editor, fora do carrinho). No computador abre um menu suspenso no fim da barra; no
 * celular e o primeiro item e abre uma folha que sobe do rodape, para nao sumir na rolagem.
 */
import Link from 'next/link';
import { useState } from 'react';
import { Dialog, Popover } from 'radix-ui';
import { FOCO_MARCA, ICONE_MARCA } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { IconeAbaixo, IconeFachada, IconeFechar, IconeTridimensional } from './icones';

export const OPCOES_CRIAR = [
  { href: '/criar', titulo: 'Personalize em 3D', texto: 'Chaveiros, placas e presentes com o seu nome, vistos em 3D antes de pedir.', Icone: IconeTridimensional },
  { href: '/editor', titulo: 'Letreiro de fachada', texto: 'Letra caixa com chapa de ACM, do tamanho da sua fachada. Você monta e vê em 3D no editor.', Icone: IconeFachada },
] as const;

// Pilula com borda viva (opcao D3 aprovada no canvas): o destaque do menu, sem competir com as categorias.
const BOTAO = cx('group borda-viva inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-marca-pilula px-3.5 text-item font-semibold whitespace-nowrap text-marca-azul', FOCO_MARCA);
const SETA = 'size-4 shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none';
const OPCAO = cx('flex min-h-11 items-start gap-3 rounded-marca-sm p-3 text-marca-navy no-underline hover:bg-marca-gelo', FOCO_MARCA);

function Opcoes({ aoEscolher }: { aoEscolher: () => void }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      {OPCOES_CRIAR.map(({ href, titulo, texto, Icone }) => (
        <li key={href}>
          <Link href={href} onClick={aoEscolher} className={OPCAO}>
            <Icone className="mt-0.5 size-5 shrink-0 text-marca-azul" aria-hidden />
            <span className="flex flex-col gap-0.5">
              <span className="text-item font-semibold">{titulo}</span>
              <span className="text-apoio text-marca-texto-2">{texto}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** `menu`: suspenso, para o computador. `folha`: sobe do rodape, para o celular. */
export function MenuCriar({ modo }: { modo: 'menu' | 'folha' }) {
  const [aberto, setAberto] = useState(false);
  const fechar = () => setAberto(false);
  const gatilho = <><IconeTridimensional className="size-4.5 shrink-0" aria-hidden />Criar<IconeAbaixo className={SETA} aria-hidden /></>;

  if (modo === 'menu') {
    return (
      <Popover.Root open={aberto} onOpenChange={setAberto}>
        <Popover.Trigger className={BOTAO}>{gatilho}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="end" sideOffset={4} aria-label="Criar" className="z-40 w-[min(360px,calc(100vw-32px))] rounded-marca-md border border-marca-linha bg-marca-branco p-1.5 font-marca shadow-marca-2 outline-none">
            <Opcoes aoEscolher={fechar} />
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
        <Dialog.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-1 rounded-t-marca-lg bg-marca-branco px-3 pt-2.5 pb-[calc(28px+env(safe-area-inset-bottom,0px))] font-marca text-marca-texto shadow-marca-2">
          <span className="mx-auto h-1 w-9 rounded-full bg-marca-linha" aria-hidden />
          <div className="flex items-center justify-between pl-3">
            <Dialog.Title className="m-0 font-display text-modulo text-marca-navy">Criar</Dialog.Title>
            <Dialog.Close aria-label="Fechar" className={ICONE_MARCA}><IconeFechar className="size-5" aria-hidden /></Dialog.Close>
          </div>
          <Opcoes aoEscolher={fechar} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
