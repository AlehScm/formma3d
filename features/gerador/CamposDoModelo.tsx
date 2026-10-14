'use client';

/**
 * Configuracoes de um modelo (elemento "modelo" do editor): os campos saem do esquema da
 * receita (numero, texto, escolha, liga, fonte, cor e desenho). Nenhuma receita tem
 * formulario proprio.
 */
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Botao, Campo, CampoNumero, Interruptor, Segmentado, Selecao } from '@/components/ui';
import { FONTES_WEB } from '@/lib/text/fontes';
import { type Parametro, type Receita, type Valores } from '@/lib/gerador/tipos';
import { analisarDesenho, validarDesenho } from '@/lib/gerador/validacaoDesenho';
import { svgParaCores, svgParaRegiao } from '@/lib/import/svg';
import { imagemParaRegiao } from '@/lib/import/imagem';
import type { Region } from '@/lib/geom/region';

// O editor livre so carrega quando a pessoa abre "Criar seu design".
const ModoLivre = dynamic(() => import('@/features/design/ModoLivre').then((m) => m.ModoLivre), { ssr: false });

/** Parametros visiveis em secoes, na ordem do esquema. */
export function gruposDoModelo(r: Receita, valores: Valores): [string, Parametro[]][] {
  const grupos: [string, Parametro[]][] = [];
  for (const p of r.parametros) {
    if (p.visivel && !p.visivel(valores)) continue;
    const g = p.grupo ?? 'Opções';
    const achado = grupos.find(([n]) => n === g);
    if (achado) achado[1].push(p);
    else grupos.push([g, [p]]);
  }
  return grupos;
}

export function CamposDoModelo({ receita, valores, mudar }: { receita: Receita; valores: Valores; mudar: (id: string, v: Valores[string]) => void }) {
  return (
    <div className="space-y-6">
      {gruposDoModelo(receita, valores).map(([nome, ps]) => (
        <section key={nome} className="space-y-3">
          <h3 className="m-0 text-micro font-semibold uppercase tracking-wider text-texto-3">{nome}</h3>
          {ps.map((p) => (
            <CampoDoParametro key={p.id} p={p} valor={valores[p.id] ?? p.padrao} set={(v) => mudar(p.id, v)} />
          ))}
        </section>
      ))}
    </div>
  );
}

/**
 * Seletor de cor nao controlado: arrastando no seletor nativo, o Chrome dispara `input` a
 * cada movimento, e com o campo controlado cada um virava um render sincrono (o React
 * acusava "Maximum update depth exceeded"). Aqui o valor sobe no maximo uma vez por quadro.
 */
function CampoCor({ id, valor, set }: { id: string; valor: string; set: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const pendente = useRef<string | null>(null);
  const quadro = useRef(0);
  useEffect(() => {
    if (ref.current && ref.current.value !== valor) ref.current.value = valor;
  }, [valor]);
  useEffect(() => () => cancelAnimationFrame(quadro.current), []);
  const subir = (v: string) => {
    pendente.current = v;
    if (quadro.current) return;
    quadro.current = requestAnimationFrame(() => {
      quadro.current = 0;
      if (pendente.current !== null) set(pendente.current);
    });
  };
  return <input ref={ref} id={id} type="color" defaultValue={valor} onInput={(e) => subir(e.currentTarget.value)} className="h-8 w-14 cursor-pointer rounded-md border border-borda bg-superficie-2 p-0.5" />;
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
          <CampoCor id={`g-${p.id}`} valor={String(valor)} set={set} />
        </Campo>
      );
    case 'svg':
      return <CampoDesenho p={p} valor={String(valor)} set={set} />;
  }
}

/** SVG ou imagem (PNG/JPG/WebP) -> desenho (area preenchida) guardado como JSON no valor do campo. */
function CampoDesenho({ p, valor, set }: { p: Parametro; valor: string; set: (v: string) => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const analise = analisarDesenho(valor);
  const atual = analise.estado === 'valido' && analise.desenho.regiao.length ? analise.desenho : null;
  const erroSalvo = analise.estado === 'invalido' ? analise.mensagem : null;
  const ler = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    try {
      const ehSvg = arquivo.type === 'image/svg+xml' || /\.svg$/i.test(arquivo.name);
      let lido: { regiao: Region; cores: { regiao: Region; hex: string }[] };
      if (ehSvg) {
        const texto = await arquivo.text();
        lido = { regiao: svgParaRegiao(texto), cores: svgParaCores(texto) };
      } else lido = await imagemParaRegiao(arquivo);
      const importado = { nome: arquivo.name, regiao: lido.regiao, ...(lido.cores.length > 1 ? { cores: lido.cores } : {}) };
      if (!validarDesenho(importado)) throw new Error('O desenho importado tem regiões ou cores inválidas.');
      setErro(null);
      // As cores so vao junto quando ha mais de uma (imagem colorida).
      set(JSON.stringify(importado));
    } catch (e) {
      setErro((e as Error).message);
    }
  };
  return (
    <Campo rotulo={p.rotulo} dica={p.dica} erro={erro ?? erroSalvo} valor={atual?.nome}>
      <div className="flex items-center gap-2">
        <label className="flex h-8 flex-1 cursor-pointer items-center justify-center rounded-md border border-dashed border-borda-forte bg-superficie-2 px-2.5 text-mini text-texto-2 hover:border-acento">
          {atual ? 'Trocar imagem' : 'Escolher SVG, PNG ou JPG…'}
          <input type="file" accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => ler(e.target.files?.[0])} />
        </label>
        {valor && (
          <Botao variante="fantasma" onClick={() => { set(''); setErro(null); }}>
            Tirar
          </Botao>
        )}
      </div>
      <button type="button" onClick={() => setCriando(true)} className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-acento/40 bg-acento/10 px-2.5 text-mini font-semibold text-acento hover:bg-acento/15">
        Criar seu design (texto, formas, QR)
      </button>
      {criando && (
        // Editor 2D livre numa janela: "Usar no modelo" devolve o desenho com uma cor por camada.
        <div role="dialog" aria-modal="true" aria-label="Criar seu design" data-editor-modal="true" className="fixed inset-0 z-50 bg-fundo" onKeyDown={(e) => { if (e.key === 'Escape') setCriando(false); }}>
          <ModoLivre janela onFechar={() => setCriando(false)} onUsar={(d) => {
            if (!validarDesenho(d)) { setErro('O desenho criado tem regiões ou cores inválidas.'); setCriando(false); return; }
            set(JSON.stringify(d)); setErro(null); setCriando(false);
          }} />
        </div>
      )}
    </Campo>
  );
}
