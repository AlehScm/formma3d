'use client';

import type { ReactNode } from 'react';
import {
  ItemContexto,
  MenuContexto,
  RotuloContexto,
  SeparadorContexto,
  SubmenuContexto,
  IconeAgrupar,
  IconeBaixar,
  IconeDesagrupar,
  IconeExcluir,
  IconeOculto,
  IconeSelecionarTudo,
  IconeTravado,
  IconeVisivel,
  IconeDestravado,
} from '@/components/ui';
import { grupoDe } from '@/lib/cena/grupo';
import { useInterface } from '@/store/interface';
import { useProjeto } from '@/store/projeto';
import { useModelo } from '@/modelo/Modelo';
import {
  agruparSelecao,
  desagruparSelecao,
  excluirSelecao,
  exportarSelecao,
  nomeDaSelecao,
  ocultarSelecao,
  selecionarTudo,
  travarSelecao,
} from '@/features/acoes/selecao';

/**
 * Menu do botao direito sobre objetos: o mesmo no 3D e no painel de Objetos.
 * `onAbrir` roda antes de abrir -- e ali que o clique direito numa peca fora da
 * selecao a marca, como no Photoshop.
 */
export function MenuObjetos({ children, onAbrir }: { children: ReactNode; onAbrir?: () => void }) {
  return (
    <MenuContexto itens={<ItensObjetos />} onAbrir={onAbrir}>
      {children}
    </MenuContexto>
  );
}

function ItensObjetos() {
  const m = useModelo();
  const selecao = useInterface((s) => s.selecao);
  const ocultas = useInterface((s) => s.ocultas);
  const travadas = useInterface((s) => s.travadas);
  const grupos = useProjeto((s) => s.grupos);
  const n = selecao.length;
  const temGrupo = selecao.some((k) => grupoDe(grupos, k));
  const todasOcultas = n > 0 && selecao.every((k) => ocultas.has(k));
  const todasTravadas = n > 0 && selecao.every((k) => travadas.has(k));

  return (
    <>
      <RotuloContexto>{n ? nomeDaSelecao(m) : 'Nada selecionado'}</RotuloContexto>
      <ItemContexto icone={IconeAgrupar} atalho="Ctrl+G" disabled={n < 2} onSelect={agruparSelecao}>
        Agrupar
      </ItemContexto>
      <ItemContexto icone={IconeDesagrupar} atalho="Ctrl+Shift+G" disabled={!temGrupo} onSelect={desagruparSelecao}>
        Desagrupar
      </ItemContexto>
      <ItemContexto icone={IconeSelecionarTudo} atalho="Ctrl+A" onSelect={() => selecionarTudo(m)}>
        Selecionar tudo
      </ItemContexto>
      <SeparadorContexto />
      <ItemContexto icone={todasOcultas ? IconeVisivel : IconeOculto} atalho="H" disabled={!n} onSelect={ocultarSelecao}>
        {todasOcultas ? 'Mostrar' : 'Ocultar da tela'}
      </ItemContexto>
      <ItemContexto icone={todasTravadas ? IconeDestravado : IconeTravado} disabled={!n} onSelect={travarSelecao}>
        {todasTravadas ? 'Destravar' : 'Travar'}
      </ItemContexto>
      <SeparadorContexto />
      <SubmenuContexto rotulo="Exportar seleção" icone={IconeBaixar} disabled={!n}>
        {/* Os dois saem num arquivo so: o que muda e como o Bambu enxerga as pecas. */}
        <RotuloContexto>Um arquivo com todas as peças</RotuloContexto>
        <ItemContexto atalho="recomendado" onSelect={() => exportarSelecao(m, '3mf')}>
          3MF · peças soltas no Bambu
        </ItemContexto>
        <ItemContexto onSelect={() => exportarSelecao(m, 'stl')}>STL · tudo grudado numa peça</ItemContexto>
      </SubmenuContexto>
      <SeparadorContexto />
      <ItemContexto icone={IconeExcluir} atalho="Del" disabled={!n} perigo onSelect={excluirSelecao}>
        Excluir{n > 1 ? ` ${n} peças` : ''}
      </ItemContexto>
    </>
  );
}
