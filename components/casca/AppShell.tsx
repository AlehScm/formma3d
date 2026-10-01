'use client';

import { useCallback, useEffect, useState } from 'react';
import { useInterface } from '@/store/interface';
import { lembrarCustos } from '@/store/projeto';
import { ProvedorModelo } from '@/modelo/Modelo';
import { carregarFonteInicial } from '@/features/acoes/origem';
import { Viewport } from '@/features/viewport/Viewport';
import { PainelDesenhar } from '@/features/desenho/PainelDesenhar';
import { PainelImprimir } from '@/features/impressao/PainelImprimir';
import { FolhaOrcamento, PainelOrcamento } from '@/features/orcamento/Orcamento';
import { cx } from '@/components/ui';
import { BarraTopo } from './BarraTopo';
import { PainelObjetos } from './PainelObjetos';
import { BarraStatus } from './BarraStatus';
import { Inspetor } from './Inspetor';
import { EntradasArquivo } from './EntradasArquivo';
import { Atalhos } from './Atalhos';

/**
 * Layout do app:
 *
 *   BarraTopo (projeto, areas, preco, Exportar)
 *   BarraLateral | centro (3D ou folha do orcamento) | Inspetor
 *   BarraStatus (medidas, problemas)
 *
 * O canvas 3D fica MONTADO nas tres areas -- no Orcamento so e escondido. Recriar
 * o contexto WebGL a cada troca de aba custaria caro e piscaria a tela.
 */
export function AppShell() {
  const espaco = useInterface((s) => s.espaco);
  const [painelMobile, setPainelMobile] = useState<'configuracoes' | 'viewport' | 'objetos'>('viewport');
  const [pedidoEnquadrar, setPedido] = useState(0);
  const enquadrar = useCallback(() => setPedido((n) => n + 1), []);

  useEffect(() => {
    void carregarFonteInicial();
    return lembrarCustos();
  }, []);

  useEffect(() => setPainelMobile('viewport'), [espaco]);

  const orcamento = espaco === 'orcamento';

  return (
    <ProvedorModelo>
      <EntradasArquivo />
      <Atalhos onEnquadrar={enquadrar} />

      <div className="flex h-screen flex-col overflow-hidden bg-fundo max-xl:h-[100dvh]">
        <BarraTopo />

        <div className={cx('relative flex min-h-0 flex-1 xl:static', orcamento ? 'w-full' : 'mx-auto w-full max-w-[2400px]')}>
          <aside
            aria-label="Configurações"
            className={cx(
              'absolute inset-0 z-10 hidden overflow-hidden border-r border-borda bg-superficie xl:static xl:flex xl:w-[356px] xl:shrink-0',
              painelMobile === 'configuracoes' && 'max-xl:flex'
            )}
          >
            {espaco === 'desenhar' && <PainelDesenhar />}
            {espaco === 'imprimir' && <PainelImprimir />}
            {orcamento && <PainelOrcamento />}
          </aside>

          <main
            className={cx(
              'absolute inset-0 min-w-0 flex-1 xl:relative xl:inset-auto xl:block',
              painelMobile === 'viewport' ? 'block' : 'hidden xl:block'
            )}
          >
            <div className={cx('absolute inset-0', orcamento && 'invisible')} aria-hidden={orcamento}>
              <Viewport pedidoEnquadrar={pedidoEnquadrar} onEnquadrar={enquadrar} />
            </div>
            {orcamento && (
              <div className="absolute inset-0 bg-fundo">
                <FolhaOrcamento />
              </div>
            )}
          </main>

          {/* Coluna da direita, como no Photoshop: camadas em cima, propriedades embaixo. */}
          {!orcamento && (
            <aside
              aria-label="Objetos e propriedades"
              className={cx(
                'absolute inset-0 z-10 hidden flex-col border-l border-borda bg-superficie xl:static xl:flex xl:w-[300px] xl:shrink-0',
                painelMobile === 'objetos' && 'max-xl:flex'
              )}
            >
              <PainelObjetos />
              <Inspetor />
            </aside>
          )}
        </div>

        <nav aria-label="Painéis" className={cx('grid h-12 shrink-0 border-t border-borda bg-superficie xl:hidden', orcamento ? 'grid-cols-2' : 'grid-cols-3')}>
          {([
            ['configuracoes', 'Configurações'],
            ['viewport', espaco === 'orcamento' ? 'Orçamento' : '3D'],
            ...(!orcamento ? ([['objetos', 'Objetos']] as const) : []),
          ] as const).map(([painel, nome]) => (
            <button
              key={painel}
              type="button"
              aria-current={painelMobile === painel ? 'page' : undefined}
              onClick={() => setPainelMobile(painel)}
              className={cx(
                'border-t-2 px-2 text-mini font-medium',
                painelMobile === painel ? 'border-acento text-texto' : 'border-transparent text-texto-3'
              )}
            >
              {nome}
            </button>
          ))}
        </nav>

        <BarraStatus />
      </div>
    </ProvedorModelo>
  );
}
