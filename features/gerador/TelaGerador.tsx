'use client';

/**
 * Tela unica dos geradores do catalogo: o formulario sai do esquema da receita, a
 * previa mostra as pecas montadas com a cor de cada uma, e a exportacao e a mesma
 * para todo modelo. Nenhuma receita tem tela propria.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import { FONTES_WEB } from '@/lib/text/fontes';
import { receitaPorId } from '@/lib/gerador/receitas';
import { desenho, valoresPadrao, type Parametro, type Receita, type Valores } from '@/lib/gerador/tipos';
import { centrada, corDe, nomeComCor, pecasSoltas } from '@/lib/gerador/malha';
import { blob3mfMontado, blob3mfSoltas, nomeSeguro, zipStl } from '@/lib/gerador/exportar';
import { baixar } from '@/features/acoes/exportar';
import { svgParaCores, svgParaRegiao } from '@/lib/import/svg';
import { imagemParaRegiao } from '@/lib/import/imagem';
import type { Region } from '@/lib/geom/region';
import { useProjeto } from '@/store/projeto';
import { useInterface } from '@/store/interface';
import { PreviaGerador } from './PreviaGerador';
import { useGeracao } from './useGeracao';

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
  // Lembra os valores depois de uma pausa (com imagem, o JSON pode ser grande).
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(CHAVE(receita.id), JSON.stringify(valores));
      } catch {
        // sem armazenamento (ou cheio): so nao lembra
      }
    }, 600);
    return () => clearTimeout(t);
  }, [receita.id, valores]);

  const visiveis = receita.parametros.filter((p) => !p.visivel || p.visivel(valores));
  const idsFonte = [...new Set([...visiveis.filter((p) => p.tipo === 'fonte').map((p) => String(valores[p.id])), ...(receita.fontes?.(valores) ?? [])])];
  const [tentativa, setTentativa] = useState(0);
  // A geracao (e a malha da previa) roda num worker: a tela nao trava em receita pesada.
  const { resultado, malhas, erro, erroFonte, gerando } = useGeracao(receita.id, valores, idsFonte, tentativa);

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
              <PreviaGerador resultado={resultado} malhas={malhas} />
            ) : (
              <div className="grid h-full place-items-center p-6 text-texto-3">{gerando ? 'Gerando…' : 'Nada para mostrar ainda.'}</div>
            )}
            {gerando && resultado && (
              <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-superficie/90 px-2 py-1 text-micro text-texto-2 shadow" role="status">
                Atualizando…
              </div>
            )}
          </div>
          <div className="space-y-2 border-t border-borda bg-superficie px-4 py-3">
            {resultado && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-mini text-texto-2">
                {resultado.cores.map((c, i) => (
                  <span key={c} className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm border border-borda" style={{ background: corDe(resultado, i) }} aria-hidden />
                    {c}
                  </span>
                ))}
                <span className="text-texto-3">
                  {resultado.itens.length} {resultado.itens.length === 1 ? 'objeto' : 'objetos'} · {resultado.itens.reduce((s, it) => s + it.pecas.length, 0)} peças
                </span>
              </div>
            )}
            {erroFonte && (
              <Alerta
                tom="perigo"
                acao={<Botao tamanho="sm" onClick={() => setTentativa((n) => n + 1)}>Tentar de novo</Botao>}
              >
                Não consegui carregar a fonte: {erroFonte}
              </Alerta>
            )}
            {erro && <Alerta tom="perigo">{erro}</Alerta>}
            {resultado?.notas?.map((n) => (
              <Alerta key={n} tom="neutro">
                {n}
              </Alerta>
            ))}
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
      return <CampoNumero rotulo={p.rotulo} dica={p.dica} valor={Number(valor)} set={set} min={p.min} max={p.max} passo={p.passo} unidade={p.unidade} padrao={p.padrao} tetoFixo />;
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
    case 'cor':
      return (
        <Campo rotulo={p.rotulo} dica={p.dica} layout="linha" htmlFor={`g-${p.id}`}>
          <input id={`g-${p.id}`} type="color" value={String(valor)} onChange={(e) => set(e.target.value)} className="h-8 w-14 cursor-pointer rounded-md border border-borda bg-superficie-2 p-0.5" />
        </Campo>
      );
    case 'svg':
      return <CampoDesenho p={p} valor={String(valor)} set={set} />;
  }
}

/** SVG ou imagem (PNG/JPG/WebP) -> desenho (area preenchida) guardado como JSON no valor do campo. */
function CampoDesenho({ p, valor, set }: { p: Parametro; valor: string; set: (v: string) => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const atual = desenho({ d: valor }, 'd');
  const ler = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    try {
      const ehSvg = arquivo.type === 'image/svg+xml' || /\.svg$/i.test(arquivo.name);
      let lido: { regiao: Region; cores: { regiao: Region; hex: string }[] };
      if (ehSvg) {
        const texto = await arquivo.text();
        lido = { regiao: svgParaRegiao(texto), cores: svgParaCores(texto) };
      } else lido = await imagemParaRegiao(arquivo);
      setErro(null);
      // As cores so vao junto quando ha mais de uma (imagem colorida).
      set(JSON.stringify({ nome: arquivo.name, regiao: lido.regiao, ...(lido.cores.length > 1 ? { cores: lido.cores } : {}) }));
    } catch (e) {
      setErro((e as Error).message);
    }
  };
  return (
    <Campo rotulo={p.rotulo} dica={p.dica} erro={erro} valor={atual?.nome}>
      <div className="flex items-center gap-2">
        <label className="flex h-8 flex-1 cursor-pointer items-center justify-center rounded-md border border-dashed border-borda-forte bg-superficie-2 px-2.5 text-mini text-texto-2 hover:border-acento">
          {atual ? 'Trocar imagem' : 'Escolher SVG, PNG ou JPG…'}
          <input type="file" accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => ler(e.target.files?.[0])} />
        </label>
        {atual && (
          <Botao variante="fantasma" onClick={() => set('')}>
            Tirar
          </Botao>
        )}
      </div>
    </Campo>
  );
}
