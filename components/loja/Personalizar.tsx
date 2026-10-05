'use client';

/**
 * Personalizar na pagina do produto (como Customily / Nike By You): os campos principais
 * do gerador ao lado do 3D, que muda junto. So o que a pessoa mudou vai para o orcamento.
 * Os campos carregam sob demanda (puxam as receitas, como o 3D).
 */
import { useEffect, useRef, useState } from 'react';
import { CAMPO_MARCA } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import type { Parametro, Valores } from '@/lib/gerador/tipos';
import { FONTES_WEB } from '@/lib/text/fontes';

type Modulo = typeof import('@/lib/marketplace/personalizar');

/** O que mudou em relacao ao exemplo da ficha (so isso vai para o 3D e para o orcamento). */
export function diferenca(valores: Valores, iniciais: Valores): Valores {
  return Object.fromEntries(Object.entries(valores).filter(([k, v]) => iniciais[k] !== v));
}

export function usePersonalizacao(gerador: string | null) {
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [iniciais, setIniciais] = useState<Valores>({});
  const [valores, setValores] = useState<Valores>({});
  const [atrasados, setAtrasados] = useState<Valores>({});

  useEffect(() => {
    if (!gerador) return;
    let vivo = true;
    import('@/lib/marketplace/personalizar').then((m) => {
      if (!vivo) return;
      const v = m.valoresIniciais(gerador);
      setModulo(m);
      setIniciais(v);
      setValores(v);
      setAtrasados(v);
    });
    return () => {
      vivo = false;
    };
  }, [gerador]);

  // O 3D so regera depois de uma pausa na digitacao.
  useEffect(() => {
    const t = setTimeout(() => setAtrasados(valores), 400);
    return () => clearTimeout(t);
  }, [valores]);

  const campos = modulo && gerador ? modulo.camposPrincipais(gerador, valores) : [];
  const mudou = diferenca(valores, iniciais);
  const alterado = Object.keys(mudou).length > 0;
  return {
    pronto: !!modulo,
    campos,
    valores,
    mudar: (id: string, v: Valores[string]) => setValores((s) => (s[id] === v ? s : { ...s, [id]: v })),
    desfazer: () => setValores(iniciais),
    alterado,
    /** Valores para o 3D (com pausa), ou undefined sem mudanca: o 3D usa o exemplo. */
    extras3d: Object.keys(diferenca(atrasados, iniciais)).length ? diferenca(atrasados, iniciais) : undefined,
    /** Resumo legivel e valores para o orcamento, so quando a pessoa mudou algo. */
    pedido: alterado && modulo ? { personalizacao: modulo.resumoPersonalizacao(campos, valores), valores: mudou } : undefined,
  };
}

/** Cor nao controlada: arrastando no seletor nativo o Chrome dispara input a cada movimento. */
function CampoCor({ id, valor, set }: { id: string; valor: string; set: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const quadro = useRef(0);
  const pendente = useRef(valor);
  useEffect(() => {
    if (ref.current && ref.current.value !== valor) ref.current.value = valor;
  }, [valor]);
  useEffect(() => () => cancelAnimationFrame(quadro.current), []);
  return (
    <input
      ref={ref}
      id={id}
      type="color"
      defaultValue={valor}
      onInput={(e) => {
        pendente.current = e.currentTarget.value;
        if (quadro.current) return;
        quadro.current = requestAnimationFrame(() => { quadro.current = 0; set(pendente.current); });
      }}
      className="h-11 w-16 cursor-pointer rounded-marca-sm border border-secao-linha bg-secao-superficie p-1"
    />
  );
}

function Campo({ p, valor, set }: { p: Parametro; valor: Valores[string]; set: (v: Valores[string]) => void }) {
  const id = `pz-${p.id}`;
  const rotulo = <label htmlFor={id} className="mb-1 block text-apoio font-semibold text-marca-navy">{p.rotulo}</label>;
  if (p.tipo === 'texto') {
    return <div>{rotulo}<input id={id} value={String(valor)} maxLength={p.maxCaracteres} placeholder={p.placeholder} onChange={(e) => set(e.target.value)} className={CAMPO_MARCA} /></div>;
  }
  if (p.tipo === 'fonte') {
    return (
      <div>{rotulo}
        <select id={id} value={String(valor)} onChange={(e) => set(e.target.value)} className={CAMPO_MARCA}>
          {FONTES_WEB.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
      </div>
    );
  }
  if (p.tipo === 'numero') {
    return (
      <div>{rotulo}
        <div className="flex items-center gap-3">
          <input id={id} type="range" min={p.min} max={p.max} step={p.passo ?? 1} value={Number(valor)} onChange={(e) => set(Number(e.target.value))} className="min-w-0 flex-1 accent-marca-azul" />
          <span className="w-20 text-right text-item font-semibold text-marca-navy tabular-nums">{String(valor)} {p.unidade}</span>
        </div>
      </div>
    );
  }
  if (p.tipo === 'cor') {
    return <div className="flex flex-col">{rotulo}<CampoCor id={id} valor={String(valor)} set={set} /></div>;
  }
  return null;
}

export function PainelPersonalizar({ pz, maisOpcoes }: { pz: ReturnType<typeof usePersonalizacao>; maisOpcoes?: { href: string; rotulo: string } }) {
  if (!pz.pronto) return <div className="h-40 animate-pulse rounded-2xl bg-marca-branco shadow-marca-1 motion-reduce:animate-none" aria-hidden />;
  const cores = pz.campos.filter((p) => p.tipo === 'cor');
  const outros = pz.campos.filter((p) => p.tipo !== 'cor');
  return (
    <section aria-labelledby="pz-titulo" className="flex flex-col gap-4 rounded-2xl bg-marca-branco p-5 shadow-marca-1">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="pz-titulo" className="m-0 font-display text-modulo text-marca-navy">Personalize a sua peça</h2>
        {pz.alterado && <button type="button" onClick={pz.desfazer} className="text-item font-semibold text-marca-azul hover:underline">Voltar ao exemplo</button>}
      </div>
      <p className="m-0 -mt-2 text-apoio text-marca-texto-2">O 3D ao lado muda enquanto você escolhe.</p>
      {outros.map((p) => <Campo key={p.id} p={p} valor={pz.valores[p.id] ?? p.padrao} set={(v) => pz.mudar(p.id, v)} />)}
      {cores.length > 0 && (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 text-apoio font-semibold text-marca-navy">Cores</legend>
          <div className={cx('grid gap-3', cores.length > 2 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2')}>
            {cores.map((p) => <Campo key={p.id} p={p} valor={pz.valores[p.id] ?? p.padrao} set={(v) => pz.mudar(p.id, v)} />)}
          </div>
        </fieldset>
      )}
      {maisOpcoes && <a href={maisOpcoes.href} className="text-item font-semibold text-marca-azul no-underline hover:underline">Mais opções no gerador completo</a>}
    </section>
  );
}
