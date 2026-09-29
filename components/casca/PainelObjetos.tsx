'use client';

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import {
  cx,
  formatarNumero,
  IconeAbaixo,
  IconeDireita,
  IconeDestravado,
  IconeGrupo,
  IconeGrupoAberto,
  IconeOculto,
  IconeTravado,
  IconeVisivel,
  type Icone,
} from '@/components/ui';
import { regionBounds, type Region } from '@/lib/geom/region';
import type { Grupo } from '@/lib/cena/grupo';
import { useInterface, placaDe } from '@/store/interface';
import { useProjeto } from '@/store/projeto';
import { useModelo } from '@/modelo/Modelo';
import { MenuObjetos } from './MenuObjetos';

interface Item {
  chave: string;
  nome: string;
  contorno: Region;
  stl: boolean;
}

/**
 * Painel de Objetos, como as camadas do Photoshop ou a lista do Bambu Studio:
 * pecas e grupos, com olho (ocultar da tela) e cadeado (travar). Clique, Ctrl+clique,
 * Shift+clique e botao direito funcionam igual ao 3D.
 */
export function PainelObjetos() {
  const m = useModelo();
  const espaco = useInterface((s) => s.espaco);
  const selecao = useInterface((s) => s.selecao);
  const grupos = useProjeto((s) => s.grupos);
  const naPlaca = espaco === 'imprimir';

  const itens: Item[] = [
    ...m.letras.map((l) => ({ chave: l.chave, nome: l.nome, contorno: l.part.contorno, stl: false })),
    ...(naPlaca ? m.objetos.map((o) => ({ chave: o.chave, nome: o.nome, contorno: o.contorno, stl: true })) : []),
  ];
  const ordem = itens.map((i) => i.chave);
  const porChave = new Map(itens.map((i) => [i.chave, i]));

  // A arvore: cada grupo aparece onde esta o primeiro membro dele.
  const linhas: ({ tipo: 'grupo'; g: Grupo; membros: Item[] } | { tipo: 'peca'; item: Item })[] = [];
  const vistos = new Set<string>();
  for (const it of itens) {
    if (vistos.has(it.chave)) continue;
    const g = grupos.find((x) => x.membros.includes(it.chave));
    if (g) {
      const membros = g.membros.map((k) => porChave.get(k)).filter((x): x is Item => !!x);
      membros.forEach((x) => vistos.add(x.chave));
      if (membros.length) linhas.push({ tipo: 'grupo', g, membros });
    } else {
      vistos.add(it.chave);
      linhas.push({ tipo: 'peca', item: it });
    }
  }

  return (
    <section aria-label="Objetos" className="flex max-h-[45%] min-h-24 shrink-0 flex-col border-b border-borda">
      <header className="flex h-9 shrink-0 items-center justify-between px-3">
        <h2 className="text-micro font-semibold uppercase tracking-wider text-texto-2">Objetos</h2>
        <span className="tabular font-mono text-micro text-texto-3">
          {selecao.length ? `${selecao.length} de ${itens.length}` : itens.length}
        </span>
      </header>
      <MenuObjetos>
        <ul role="tree" aria-multiselectable className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
          {linhas.map((l) =>
            l.tipo === 'grupo' ? (
              <LinhaGrupo key={l.g.id} g={l.g} membros={l.membros} ordem={ordem} />
            ) : (
              <LinhaPeca key={l.item.chave} item={l.item} ordem={ordem} />
            )
          )}
          {!itens.length && <li className="px-2 py-3 text-mini text-texto-3">Nenhuma peça ainda.</li>}
        </ul>
      </MenuObjetos>
    </section>
  );
}

const mods = (e: MouseEvent) => ({ ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });

function LinhaPeca({ item, ordem, recuo }: { item: Item; ordem: string[]; recuo?: boolean }) {
  const sel = useInterface((s) => s.selecao.includes(item.chave));
  const clicarObjeto = useInterface((s) => s.clicarObjeto);
  const placa = useInterface((s) => (s.espaco === 'imprimir' ? placaDe(s.placas, item.chave) : -2));
  const ref = useRef<HTMLLIElement>(null);
  const b = regionBounds(item.contorno);

  // Selecionou pelo 3D: a linha aparece no painel.
  useEffect(() => {
    if (sel) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  return (
    <li
      ref={ref}
      role="treeitem"
      aria-selected={sel}
      // Dentro do painel, o membro de um grupo pode ser pego sozinho.
      onClick={(e) => clicarObjeto(item.chave, { ...mods(e), soAPeca: true }, ordem)}
      onContextMenu={() => !sel && clicarObjeto(item.chave, { soAPeca: true }, ordem)}
      className={cx(
        'group flex h-7 cursor-default select-none items-center gap-1.5 rounded-md pr-1 text-mini',
        recuo ? 'pl-7' : 'pl-2',
        sel ? 'bg-acento/15 text-texto' : 'text-texto-2 hover:bg-superficie-3'
      )}
    >
      <span className={cx('min-w-0 flex-1 truncate', item.stl ? '' : 'font-medium')} title={item.nome}>
        {item.nome}
      </span>
      <span className="tabular shrink-0 font-mono text-micro text-texto-3">
        {formatarNumero(b.w)}×{formatarNumero(b.h)}
      </span>
      {placa >= 0 && <span className="tabular shrink-0 rounded-sm bg-superficie-3 px-1 font-mono text-micro text-texto-3">P{placa + 1}</span>}
      {placa === -1 && <span className="shrink-0 rounded-sm bg-perigo/15 px-1 text-micro text-perigo">fora</span>}
      <Alternadores chaves={[item.chave]} />
    </li>
  );
}

function LinhaGrupo({ g, membros, ordem }: { g: Grupo; membros: Item[]; ordem: string[] }) {
  const [aberto, setAberto] = useState(true);
  const [editando, setEditando] = useState(false);
  const selecao = useInterface((s) => s.selecao);
  const definirSelecao = useInterface((s) => s.definirSelecao);
  const clicarObjeto = useInterface((s) => s.clicarObjeto);
  const renomear = useProjeto((s) => s.renomearGrupo);
  const chaves = membros.map((x) => x.chave);
  const todos = chaves.every((k) => selecao.includes(k));

  // Clicar no grupo marca todos (Ctrl soma/tira o grupo inteiro).
  const clicar = (e: MouseEvent) => {
    const md = mods(e);
    if (md.ctrl) return clicarObjeto(chaves[0]!, { ctrl: true }, ordem);
    definirSelecao(chaves);
  };

  return (
    <li role="treeitem" aria-expanded={aberto} aria-selected={todos}>
      <div
        onClick={clicar}
        onContextMenu={() => !todos && definirSelecao(chaves)}
        onDoubleClick={() => setEditando(true)}
        className={cx(
          'group flex h-7 cursor-default select-none items-center gap-1.5 rounded-md pl-1 pr-1 text-mini',
          todos ? 'bg-acento/15 text-texto' : 'text-texto-2 hover:bg-superficie-3'
        )}
      >
        <button
          type="button"
          aria-label={aberto ? 'Recolher grupo' : 'Abrir grupo'}
          onClick={(e) => {
            e.stopPropagation();
            setAberto(!aberto);
          }}
          className="grid size-5 place-items-center rounded text-texto-3 hover:text-texto"
        >
          {aberto ? <IconeAbaixo className="size-3.5" /> : <IconeDireita className="size-3.5" />}
        </button>
        {aberto ? <IconeGrupoAberto className="size-3.5 shrink-0 text-acento" /> : <IconeGrupo className="size-3.5 shrink-0 text-acento" />}
        {editando ? (
          <input
            autoFocus
            defaultValue={g.nome}
            aria-label="Nome do grupo"
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => {
              renomear(g.id, e.currentTarget.value);
              setEditando(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setEditando(false);
            }}
            className="h-6 min-w-0 flex-1 rounded border border-acento bg-superficie-2 px-1 text-mini text-texto outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate font-medium" title="Duplo clique para renomear">
            {g.nome}
          </span>
        )}
        <span className="tabular shrink-0 font-mono text-micro text-texto-3">{membros.length}</span>
        <Alternadores chaves={chaves} />
      </div>
      {aberto && (
        <ul role="group">
          {membros.map((it) => (
            <LinhaPeca key={it.chave} item={it} ordem={ordem} recuo />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Olho e cadeado. Apagados ate passar o mouse, a nao ser que estejam ativos. */
function Alternadores({ chaves }: { chaves: string[] }) {
  const oculta = useInterface((s) => chaves.every((k) => s.ocultas.has(k)));
  const travada = useInterface((s) => chaves.every((k) => s.travadas.has(k)));
  const alternarOcultas = useInterface((s) => s.alternarOcultas);
  const alternarTravadas = useInterface((s) => s.alternarTravadas);
  return (
    <>
      <Alternador
        ativo={oculta}
        icone={oculta ? IconeOculto : IconeVisivel}
        rotulo={oculta ? 'Mostrar' : 'Ocultar da tela'}
        onClick={() => alternarOcultas(chaves)}
      />
      <Alternador
        ativo={travada}
        icone={travada ? IconeTravado : IconeDestravado}
        rotulo={travada ? 'Destravar' : 'Travar'}
        onClick={() => alternarTravadas(chaves)}
      />
    </>
  );
}

function Alternador({ ativo, icone: I, rotulo, onClick }: { ativo: boolean; icone: Icone; rotulo: string; onClick: () => void }): ReactNode {
  return (
    <button
      type="button"
      aria-label={rotulo}
      aria-pressed={ativo}
      title={rotulo}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cx(
        'grid size-5 shrink-0 place-items-center rounded hover:bg-superficie-3',
        ativo ? 'text-atencao' : 'text-texto-3 opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
      )}
    >
      <I className="size-3.5" strokeWidth={1.8} />
    </button>
  );
}
