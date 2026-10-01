'use client';

/**
 * Tela unica dos geradores do catalogo: o formulario sai do esquema da receita, a
 * previa mostra as pecas montadas com a cor de cada uma, e a exportacao e a mesma
 * para todo modelo. Nenhuma receita tem tela propria.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { Font } from 'opentype.js';
import {
  Alerta,
  Botao,
  Campo,
  CampoNumero,
  IconeBaixar,
  IconeImprimir,
  Interruptor,
  Segmentado,
  Selecao,
} from '@/components/ui';
import { carregarFonteWeb, FONTES_WEB } from '@/lib/text/fontes';
import { receitaPorId } from '@/lib/gerador/receitas';
import { valoresPadrao, type Parametro, type Receita, type Resultado, type Valores } from '@/lib/gerador/tipos';
import { CORES_PREVIA, centrada, nomeComCor, pecasSoltas } from '@/lib/gerador/malha';
import { blob3mfMontado, blob3mfSoltas, nomeSeguro, zipStl } from '@/lib/gerador/exportar';
import { baixar } from '@/features/acoes/exportar';
import { useProjeto } from '@/store/projeto';
import { useInterface } from '@/store/interface';
import { PreviaGerador } from './PreviaGerador';

const CHAVE = (id: string) => `formma3d:gerador:${id}`;

function valoresIniciais(r: Receita): Valores {
  const padrao = valoresPadrao(r);
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE(r.id)) ?? 'null') as Valores | null;
    if (salvo) for (const p of r.parametros) if (typeof salvo[p.id] === typeof padrao[p.id]) padrao[p.id] = salvo[p.id]!;
  } catch {
    // sem armazenamento: comeca do padrao
  }
  return padrao;
}


export function TelaGerador({ id }: { id: string }) {
  const receita = receitaPorId(id)!;
  const router = useRouter();
  const [valores, setValores] = useState<Valores>(() => valoresPadrao(receita));
  useEffect(() => setValores(valoresIniciais(receita)), [receita]);
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE(receita.id), JSON.stringify(valores));
    } catch {
      // sem armazenamento: so nao lembra
    }
  }, [receita.id, valores]);

  const visiveis = receita.parametros.filter((p) => !p.visivel || p.visivel(valores));
  const idsFonte = [...new Set(visiveis.filter((p) => p.tipo === 'fonte').map((p) => String(valores[p.id])))];
  const [fontes, setFontes] = useState<Map<string, Font>>(new Map());
  const [erroFonte, setErroFonte] = useState<string | null>(null);
  const faltam = idsFonte.filter((f) => !fontes.has(f));
  useEffect(() => {
    if (!faltam.length) return;
    let vivo = true;
    Promise.all(faltam.map(async (f) => [f, await carregarFonteWeb(f)] as const))
      .then((novas) => vivo && setFontes((m) => new Map([...m, ...novas])))
      .catch((e: Error) => vivo && setErroFonte(e.message));
    return () => {
      vivo = false;
    };
  }, [faltam.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const adiados = useDeferredValue(valores);
  const { resultado, erro } = useMemo((): { resultado: Resultado | null; erro: string | null } => {
    if (faltam.length) return { resultado: null, erro: null };
    try {
      return { resultado: receita.gerar(adiados, { fonte: (f) => fontes.get(f) ?? fontes.values().next().value! }), erro: null };
    } catch (e) {
      return { resultado: null, erro: (e as Error).message };
    }
  }, [receita, adiados, fontes, faltam.length]);

  const mudar = (id: string, v: Valores[string]) => setValores((s) => ({ ...s, [id]: v }));
  const nomeArquivo = nomeSeguro(`${receita.id}-${resultado?.itens[0]?.nome ?? ''}`);
  const temPecas = !!resultado?.itens.length;

  const abrirNoEditor = () => {
    if (!resultado) return;
    const projeto = useProjeto.getState();
    for (const p of pecasSoltas(resultado)) {
      const posicoes = centrada(p.posicoes);
      let alturaZ = 0;
      for (let i = 2; i < posicoes.length; i += 3) alturaZ = Math.max(alturaZ, posicoes[i]!);
      projeto.adicionarObjeto3d({ nome: nomeComCor(p.nome, resultado.cores[p.cor]), posicoes, alturaZ });
    }
    useInterface.getState().setEspaco('imprimir');
    router.push('/editor');
  };

  // Secoes na ordem em que aparecem no esquema.
  const grupos: [string, Parametro[]][] = [];
  for (const p of visiveis) {
    const g = p.grupo ?? 'Opções';
    const achado = grupos.find(([n]) => n === g);
    if (achado) achado[1].push(p);
    else grupos.push([g, [p]]);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-fundo text-texto lg:h-[100dvh]">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-borda bg-superficie px-4 py-2.5">
        <Link href="/" className="rounded-md px-2 py-1 text-mini font-medium text-texto-2 hover:bg-superficie-3">
          ← Catálogo
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-medio font-semibold">{receita.nome}</h1>
          <p className="truncate text-mini text-texto-3">{receita.resumo}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Botao variante="primario" icone={IconeBaixar} disabled={!temPecas} onClick={async () => resultado && baixar(`${nomeArquivo}.3mf`, await blob3mfMontado(resultado))}>
            3MF multicor
          </Botao>
          <Botao icone={IconeBaixar} disabled={!temPecas} onClick={async () => resultado && baixar(`${nomeArquivo}-pecas.3mf`, await blob3mfSoltas(resultado))}>
            3MF peças separadas
          </Botao>
          <Botao icone={IconeBaixar} disabled={!temPecas} onClick={async () => resultado && baixar(`${nomeArquivo}-stl.zip`, await zipStl(resultado))}>
            STL (zip)
          </Botao>
          <Botao variante="fantasma" icone={IconeImprimir} disabled={!temPecas} onClick={abrirNoEditor}>
            Abrir no editor
          </Botao>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside aria-label="Opções do modelo" className="border-borda bg-superficie lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:border-r">
          <div className="space-y-6 p-4">
            {grupos.map(([nome, ps]) => (
              <section key={nome} className="space-y-3">
                <h2 className="text-micro font-semibold uppercase tracking-wider text-texto-3">{nome}</h2>
                {ps.map((p) => (
                  <CampoDoParametro key={p.id} p={p} valor={valores[p.id]!} set={(v) => mudar(p.id, v)} />
                ))}
              </section>
            ))}
          </div>
        </aside>

        <main className="relative flex min-h-[60vh] flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            {resultado && temPecas ? (
              <PreviaGerador resultado={resultado} />
            ) : (
              <div className="grid h-full place-items-center p-6 text-texto-3">{faltam.length ? 'Carregando a fonte…' : 'Nada para mostrar ainda.'}</div>
            )}
          </div>
          <div className="space-y-2 border-t border-borda bg-superficie px-4 py-3">
            {resultado && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-mini text-texto-2">
                {resultado.cores.map((c, i) => (
                  <span key={c} className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm border border-borda" style={{ background: CORES_PREVIA[i % CORES_PREVIA.length] }} aria-hidden />
                    {c}
                  </span>
                ))}
                <span className="text-texto-3">
                  {resultado.itens.length} {resultado.itens.length === 1 ? 'objeto' : 'objetos'} · {resultado.itens.reduce((s, it) => s + it.pecas.length, 0)} peças
                </span>
              </div>
            )}
            {erroFonte && <Alerta tom="perigo">Não consegui baixar a fonte: {erroFonte}</Alerta>}
            {erro && <Alerta tom="perigo">{erro}</Alerta>}
            {resultado?.avisos.map((a) => (
              <Alerta key={a} tom="atencao">
                {a}
              </Alerta>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function CampoDoParametro({ p, valor, set }: { p: Parametro; valor: Valores[string]; set: (v: Valores[string]) => void }) {
  switch (p.tipo) {
    case 'numero':
      return <CampoNumero rotulo={p.rotulo} dica={p.dica} valor={Number(valor)} set={set} min={p.min} max={p.max} passo={p.passo} unidade={p.unidade} padrao={p.padrao} />;
    case 'texto':
      return (
        <Campo rotulo={p.rotulo} dica={p.dica} htmlFor={`g-${p.id}`}>
          <input
            id={`g-${p.id}`}
            value={String(valor)}
            maxLength={p.maxCaracteres}
            placeholder={p.placeholder}
            onChange={(e) => set(e.target.value)}
            className="h-8 w-full rounded-md border border-borda bg-superficie-2 px-2.5 text-base text-texto outline-none transition-colors duration-150 hover:border-borda-forte focus:border-acento"
          />
        </Campo>
      );
    case 'escolha':
      return p.opcoes.every((o) => o.rotulo.length <= 14) ? (
        <Segmentado rotulo={p.rotulo} dica={p.dica} valor={String(valor)} set={set} opcoes={p.opcoes.map((o) => ({ valor: o.valor, nome: o.rotulo }))} />
      ) : (
        <Selecao rotulo={p.rotulo} dica={p.dica} valor={String(valor)} set={set} opcoes={p.opcoes.map((o) => ({ valor: o.valor, nome: o.rotulo }))} />
      );
    case 'liga':
      return <Interruptor rotulo={p.rotulo} dica={p.dica} valor={valor === true} set={set} />;
    case 'fonte':
      return <Selecao rotulo={p.rotulo} dica={p.dica} valor={String(valor)} set={set} opcoes={FONTES_WEB.map((f) => ({ valor: f.id, nome: f.nome }))} />;
  }
}
