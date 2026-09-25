'use client';

import { useCallback, useEffect, useState } from 'react';
import { useInterface } from '@/store/interface';
import { ProvedorModelo } from '@/modelo/Modelo';
import { carregarFonteInicial } from '@/features/acoes/origem';
import { Viewport } from '@/features/viewport/Viewport';
import { PainelDesenhar } from '@/features/desenho/PainelDesenhar';
import { PainelImprimir } from '@/features/impressao/PainelImprimir';
import { FolhaOrcamento, PainelOrcamento } from '@/features/orcamento/Orcamento';
import { cx } from '@/components/ui';
import { BarraTopo } from './BarraTopo';
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
  const [pedidoEnquadrar, setPedido] = useState(0);
  const enquadrar = useCallback(() => setPedido((n) => n + 1), []);

  useEffect(() => {
    void carregarFonteInicial();
  }, []);

  const orcamento = espaco === 'orcamento';

  return (
    <ProvedorModelo>
      <EntradasArquivo />
      <Atalhos onEnquadrar={enquadrar} />

      <div className="flex h-screen flex-col overflow-hidden bg-fundo">
        <BarraTopo />

        <div className="flex min-h-0 flex-1">
          <aside aria-label="Configurações" className="w-[356px] shrink-0 overflow-hidden border-r border-borda bg-superficie">
            {espaco === 'desenhar' && <PainelDesenhar />}
            {espaco === 'imprimir' && <PainelImprimir />}
            {orcamento && <PainelOrcamento />}
          </aside>

          <main className="relative min-w-0 flex-1">
            <div className={cx('absolute inset-0', orcamento && 'invisible')} aria-hidden={orcamento}>
              <Viewport pedidoEnquadrar={pedidoEnquadrar} onEnquadrar={enquadrar} />
            </div>
            {orcamento && (
              <div className="absolute inset-0 bg-fundo">
                <FolhaOrcamento />
              </div>
            )}
          </main>

          {!orcamento && <Inspetor />}
        </div>

        <BarraStatus />
      </div>
    </ProvedorModelo>
  );
}
