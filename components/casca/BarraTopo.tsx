'use client';

import { useState } from 'react';
import {
  Abas,
  Botao,
  Menu,
  MenuItem,
  MenuRotulo,
  MenuSeparador,
  IconeAbaixo,
  IconeAbrir,
  IconeBaixar,
  IconeDesenhar,
  IconeImprimir,
  IconeNovo,
  IconeOrcamento,
  formatarPeso,
} from '@/components/ui';
import { brl } from '@/lib/cost/calc';
import { useProjeto } from '@/store/projeto';
import { useInterface, type Espaco } from '@/store/interface';
import { useModelo, useOrcamento } from '@/modelo/Modelo';
import {
  baixarChapaDXF,
  baixarChapaSVG,
  baixarGabarito,
  baixarPacote,
  baixarPlaca3MF,
  baixarPlacaSTL,
  baixarTodasAsPlacas,
} from '@/features/acoes/exportar';

/**
 * Topo do app: identidade, projeto, as tres areas e a UNICA acao primaria da tela
 * (Exportar). Medida nenhuma mora aqui -- elas ficam em Desenhar > Medidas, em vez
 * de duplicadas em dois lugares como antes.
 */
export function BarraTopo() {
  const espaco = useInterface((s) => s.espaco);
  const setEspaco = useInterface((s) => s.setEspaco);
  const abrirDesenho = useInterface((s) => s.abrirDesenho);
  const imp = useProjeto((s) => s.arquivos.length > 0);
  const definir = useProjeto((s) => s.definir);
  const fecharImport = useProjeto((s) => s.fecharImport);
  const m = useModelo();
  const o = useOrcamento();
  const [editando, setEditando] = useState(false);
  const temPecas = m.letras.length > 0 || m.objetos.length > 0;
  const placas = useInterface((s) => s.placas.length);
  const vista = useInterface((s) => (s.placas[s.placaVista]?.size ? s.placaVista : -1));

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-borda bg-superficie px-3">
      <span className="select-none pl-1 text-medio font-semibold tracking-tight text-texto">
        formma<span className="text-acento">3d</span>
      </span>

      <div className="h-5 w-px bg-borda" />

      {/* Projeto: o nome batiza STL, zip e orcamento. Vindo de arquivo, e o nome dele. */}
      <div className="flex min-w-0 items-center">
        {editando && !imp ? (
          <input
            autoFocus
            defaultValue={m.nomeProjeto}
            onBlur={(e) => {
              definir('nomeTrabalho', e.target.value.trim());
              setEditando(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setEditando(false);
            }}
            aria-label="Nome do trabalho"
            className="h-8 w-48 rounded-md border border-acento bg-superficie-2 px-2 text-base text-texto outline-none"
          />
        ) : (
          <Menu
            alinhar="start"
            gatilho={
              <button
                type="button"
                className="flex h-8 max-w-56 items-center gap-1.5 rounded-md px-2 text-base text-texto hover:bg-superficie-3"
              >
                <span className="truncate">{m.nomeProjeto || 'Sem nome'}</span>
                <IconeAbaixo className="size-3.5 shrink-0 text-texto-3" aria-hidden />
              </button>
            }
          >
            <MenuItem icone={IconeAbrir} detalhe=".ai .pdf" onSelect={() => abrirDesenho(true)}>
              Abrir desenho
            </MenuItem>
            <MenuItem icone={IconeNovo} detalhe=".ai .pdf .stl" onSelect={() => abrirDesenho(false)}>
              Adicionar arquivo ao projeto
            </MenuItem>
            <MenuItem icone={IconeNovo} onSelect={fecharImport} disabled={!imp}>
              Novo letreiro de texto
            </MenuItem>
            <MenuSeparador />
            <MenuItem onSelect={() => setEditando(true)} disabled={!!imp}>
              Renomear
            </MenuItem>
          </Menu>
        )}
      </div>

      <div className="mx-auto">
        <Abas<Espaco>
          rotulo="Área de trabalho"
          valor={espaco}
          set={setEspaco}
          abas={[
            { valor: 'desenhar', nome: 'Desenhar', icone: IconeDesenhar, dica: 'Como o letreiro é: texto, estilo e medidas', atalho: '1' },
            { valor: 'imprimir', nome: 'Imprimir', icone: IconeImprimir, dica: 'Máquina, mesa e arranjo das peças', atalho: '2' },
            { valor: 'orcamento', nome: 'Orçamento', icone: IconeOrcamento, dica: 'Custo, margem e preço', atalho: '3' },
          ]}
        />
      </div>

      {o && (
        <button
          type="button"
          onClick={() => setEspaco('orcamento')}
          className="hidden h-8 items-center gap-3 rounded-md px-2.5 hover:bg-superficie-3 md:flex"
          aria-label="Ver orçamento"
        >
          <span className="tabular font-mono text-mini text-texto-2">{formatarPeso(o.gramas)}</span>
          <span className="tabular font-mono text-base font-semibold text-sucesso">{brl(o.preco)}</span>
        </button>
      )}

      <Menu
        gatilho={
          <Botao variante="primario" icone={IconeBaixar} disabled={!temPecas}>
            Exportar
            <IconeAbaixo className="-mr-1 size-3.5" aria-hidden />
          </Botao>
        }
      >
        <MenuRotulo>Tudo de uma vez</MenuRotulo>
        <MenuItem icone={IconeBaixar} detalhe=".zip" disabled={!o || !m.letras.length} onSelect={() => o && void baixarPacote(m, o)}>
          Pacote completo
        </MenuItem>
        {m.temCorte && (
          <>
            <MenuSeparador />
            <MenuRotulo>Para cortar a chapa</MenuRotulo>
            <MenuItem icone={IconeBaixar} detalhe=".dxf" onSelect={() => baixarChapaDXF(m)}>
              Chapa ACM
            </MenuItem>
            <MenuItem icone={IconeBaixar} detalhe=".svg" onSelect={() => baixarChapaSVG(m)}>
              Chapa ACM
            </MenuItem>
          </>
        )}
        <MenuSeparador />
        <MenuRotulo>Para imprimir, já arrumado</MenuRotulo>
        <MenuItem icone={IconeBaixar} detalhe=".3mf" disabled={vista < 0} onSelect={() => void baixarPlaca3MF(m, vista)}>
          Placa{placas > 1 ? ` ${vista + 1} (a que está na tela)` : ''}
        </MenuItem>
        <MenuItem icone={IconeBaixar} detalhe=".stl" disabled={vista < 0} onSelect={() => baixarPlacaSTL(m, vista)}>
          Placa{placas > 1 ? ` ${vista + 1} (a que está na tela)` : ''}
        </MenuItem>
        {placas > 1 && (
          <MenuItem icone={IconeBaixar} detalhe=".zip" onSelect={() => void baixarTodasAsPlacas(m)}>
            Todas as {placas} placas
          </MenuItem>
        )}
        {!placas && <p className="px-2 pb-1 text-mini text-texto-3">Arrume as peças em Imprimir primeiro.</p>}
        {m.letras.length > 0 && (
          <>
            <MenuSeparador />
            <MenuRotulo>Para instalar</MenuRotulo>
            <MenuItem icone={IconeBaixar} detalhe=".svg" onSelect={() => baixarGabarito(m)}>
              Gabarito 1:1
            </MenuItem>
          </>
        )}
      </Menu>
    </header>
  );
}
