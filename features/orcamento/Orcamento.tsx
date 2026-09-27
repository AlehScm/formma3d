'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Botao,
  CampoNumero,
  ListaValores,
  Metrica,
  Categorias,
  type Categoria,
  IconeMaterial,
  IconeProducao,
  IconeMargem,
  Selecao,
  Vazio,
  formatarNumero,
  formatarPeso,
  formatarTempo,
  formatarTempoHM,
  formatarTexto,
  lerNumero,
  lerTempo,
  cx,
  IconeBaixar,
  IconeCopiar,
  IconeOk,
  IconeOrcamento,
  IconeMais,
  Interruptor,
  Cartao,
  Dica,
} from '@/components/ui';
import { FILAMENTOS, brl, calibrar, dividirEntreSocios, esquecerCalibracao, orcar, type CustoCfg, type FilamentoId, type Orcamento } from '@/lib/cost/calc';
import { useCustos, type CustoPlaca } from '@/features/orcamento/custos';
import type { PlacaAvulsa } from '@/lib/cost/trabalho';
import { useProjeto } from '@/store/projeto';
import { useInterface } from '@/store/interface';
import { useModelo, useOrcamento, type Modelo } from '@/modelo/Modelo';
import { baixarPacote } from '@/features/acoes/exportar';

/* ----------------------------------------------------- barra lateral: custos */

export function PainelOrcamento() {
  const cfg = useProjeto((x) => x.cfg);
  const definir = useProjeto((x) => x.definirCusto);
  const m = useModelo();
  const comLed = useProjeto((x) => x.comLed);
  const categoria = useInterface((x) => x.categoria.orcamento);
  const setCategoria = useInterface((x) => x.setCategoria);
  const c = <K extends keyof CustoCfg>(k: K) => (v: CustoCfg[K]) => definir(k, v);

  const categorias: Categoria[] = [
    {
      id: 'material',
      nome: 'Material',
      icone: IconeMaterial,
      resumo: `${FILAMENTOS[cfg.filamento].nome} · ${brl(cfg.precoRolo)} o rolo`,
      conteudo: (
        <>
        <Selecao<FilamentoId>
          rotulo="Filamento"
          valor={cfg.filamento}
          set={c('filamento')}
          opcoes={(Object.keys(FILAMENTOS) as FilamentoId[]).map((k) => ({
            valor: k,
            nome: `${FILAMENTOS[k].nome} — ${formatarNumero(FILAMENTOS[k].densidade, 2)} g/cm³`,
          }))}
        />
        <CampoNumero rotulo="Preço do rolo" valor={cfg.precoRolo} set={c('precoRolo')} min={30} max={600} passo={5} unidade="R$" layout="linha" />
        <CampoNumero rotulo="Gramas por rolo" valor={cfg.rendimento} set={c('rendimento')} min={250} max={5000} passo={50} unidade="g" layout="linha" />
        {m.temChapa && (
          <CampoNumero rotulo="Preço do ACM" valor={cfg.precoAcmM2} set={c('precoAcmM2')} min={10} max={500} passo={5} unidade="R$/m²" layout="linha" />
        )}
        {comLed && (
          <CampoNumero rotulo="Fita de LED" valor={cfg.precoFitaLedM} set={c('precoFitaLedM')} min={2} max={200} passo={1} unidade="R$/m" layout="linha" />
        )}
        </>
      ),
    },
    {
      id: 'producao',
      nome: 'Produção',
      icone: IconeProducao,
      resumo: `${brl(cfg.custoMaquina)}/h máquina · ${brl(cfg.valorHora)}/h`,
      conteudo: (
        <>
        <p className="rounded-md border border-borda bg-superficie-2 px-3 py-2 text-mini text-texto-2">
          Gramas e tempo vêm do Bambu Studio: preencha em <span className="text-texto">Por placa</span>, na folha ao lado.
          {cfg.amostras.length > 0 ? (
            <span className="mt-1 block text-texto-3">
              Estimativa aprendida de {cfg.amostras.length} {cfg.amostras.length === 1 ? 'placa' : 'placas'}:{' '}
              {formatarNumero(cfg.vazao, 1)} g/h, gramas × {formatarNumero(cfg.fatorGramas, 2)}.{' '}
              <button
                type="button"
                onClick={() => {
                  const n = esquecerCalibracao(cfg);
                  definir('vazao', n.vazao);
                  definir('fatorGramas', n.fatorGramas);
                  definir('amostras', n.amostras);
                }}
                className="text-texto-2 underline underline-offset-2 hover:text-texto"
              >
                Esquecer
              </button>
            </span>
          ) : (
            <span className="mt-1 block text-texto-3">Até lá, o valor é estimado pelo volume das peças.</span>
          )}
        </p>
        <CampoNumero rotulo="Custo de máquina" valor={cfg.custoMaquina} set={c('custoMaquina')} min={0} max={30} passo={0.5} unidade="R$/h" layout="linha" />
        <CampoNumero rotulo="Mão de obra" valor={cfg.valorHora} set={c('valorHora')} min={0} max={200} passo={5} unidade="R$/h" layout="linha" />
        <CampoNumero rotulo="Preparo do trabalho" valor={cfg.setupMin} set={c('setupMin')} min={0} max={120} passo={1} unidade="min" layout="linha" />
        <CampoNumero rotulo="Acabamento por peça" valor={cfg.posMin} set={c('posMin')} min={0} max={120} passo={1} unidade="min" layout="linha" />
        <MaisEnergia cfg={cfg} c={c} />
        </>
      ),
    },
    {
      id: 'margem',
      nome: 'Margem',
      icone: IconeMargem,
      resumo: `${cfg.margem}% · falha ${cfg.taxaFalha}%`,
      conteudo: (
        <>
        <CampoNumero rotulo="Margem" valor={cfg.margem} set={c('margem')} min={0} max={500} passo={5} unidade="%" />
        <CampoNumero
          rotulo="Taxa de falha"
          dica="Entra no custo: você paga pelos trabalhos perdidos"
          valor={cfg.taxaFalha}
          set={c('taxaFalha')}
          min={0}
          max={50}
          passo={1}
          unidade="%"
          layout="linha"
        />
        </>
      ),
    },
  ];

  return (
    <Categorias
      rotulo="Configurações de Orçamento"
      categorias={categorias}
      ativa={categoria}
      setAtiva={(id) => setCategoria('orcamento', id)}
    />
  );
}

function MaisEnergia({ cfg, c }: { cfg: CustoCfg; c: <K extends keyof CustoCfg>(k: K) => (v: CustoCfg[K]) => void }) {
  return (
    <div className="space-y-1 border-t border-borda pt-2">
      <CampoNumero rotulo="Energia" valor={cfg.precoKwh} set={c('precoKwh')} min={0.2} max={3} passo={0.05} unidade="R$/kWh" layout="linha" />
      <CampoNumero rotulo="Potência média" valor={cfg.potencia} set={c('potencia')} min={40} max={600} passo={10} unidade="W" layout="linha" />
    </div>
  );
}

/* ------------------------------------------------ centro: a folha do orcamento */

/**
 * Texto para mandar ao cliente. Diferente do orcamento interno: NAO leva custo,
 * margem nem taxa de falha -- so o que o cliente precisa saber.
 */
function textoCliente(m: Modelo, preco: number): string {
  const s = useProjeto.getState();
  const medida = m.bounds ? `${formatarNumero(m.bounds.w)} × ${formatarNumero(m.bounds.h)} mm` : '';
  const descricao = [
    `*${m.nomeProjeto}*`,
    `Letreiro em letra caixa impressa em 3D, ${m.letras.length} ${m.letras.length === 1 ? 'peça' : 'peças'}.`,
    medida && `Medida montado: ${medida}, profundidade ${formatarNumero(s.profundidade)} mm.`,
    m.temChapa && 'Com chapa de ACM encaixada.',
    s.comLed && 'Com iluminação de LED.',
  ].filter(Boolean);
  return [...descricao, '', `Valor: *${brl(preco)}*`].join('\n');
}

export function FolhaOrcamento() {
  const m = useModelo();
  const total = useOrcamento();
  const cfg = useProjeto((x) => x.cfg);
  const avulsas = useProjeto((x) => x.avulsas);
  const adicionarAvulsa = useProjeto((x) => x.adicionarAvulsa);
  const custos = useCustos();
  const [copiado, setCopiado] = useState(false);

  // Da para usar so para orcar: sem letreiro, com impressoes feitas fora do app.
  if (!total && !m.letras.length && !avulsas.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <Vazio
          icone={IconeOrcamento}
          titulo="Sem orçamento ainda"
          acao={
            <Botao icone={IconeMais} onClick={adicionarAvulsa}>
              Orçar com os dados do fatiador
            </Botao>
          }
        >
          Faça um letreiro em Desenhar, ou orce direto com gramas e tempo de uma impressão feita fora daqui.
        </Vazio>
      </div>
    );
  }
  // Tudo tirado do orcamento, ou avulsa ainda sem numeros: a folha fica, zerada.
  const o = total ?? orcar({ volumeMm3: 0, qtdLetras: 0, impressoes: 0, gramasReais: 0, horasReais: 0, cfg });
  const contam = custos.porPlaca.filter((p) => !p.excluida);
  const impressoes = contam.length + custos.porAvulsa.size;
  const estimadas = contam.filter((p) => p.estimado).length;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoCliente(m, o.preco));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  return (
    // Container query: a largura util depende da barra lateral fixa, nao da janela.
    <div className="@container h-full overflow-y-auto">
      <div className="space-y-4 p-4 @2xl:p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-micro font-medium uppercase tracking-wider text-texto-3">Orçamento</p>
            <h1 className="mt-0.5 truncate text-grande font-semibold text-texto">{m.nomeProjeto || 'Sem nome'}</h1>
            <p className="mt-0.5 text-mini text-texto-3">
              {new Date().toLocaleDateString('pt-BR')}
              {m.letras.length > 0 && (
                <>
                  {' · '}
                  {m.letras.length} {m.letras.length === 1 ? 'peça' : 'peças'}
                  {m.bounds && ` · ${formatarNumero(m.bounds.w)} × ${formatarNumero(m.bounds.h)} mm`}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dica conteudo="Leva só medida, acabamento e valor. Custo, margem e sócios ficam aqui.">
              <Botao variante="fantasma" icone={copiado ? IconeOk : IconeCopiar} onClick={() => void copiar()}>
                {copiado ? 'Copiado' : 'Copiar para o cliente'}
              </Botao>
            </Dica>
            <Botao icone={IconeBaixar} disabled={!m.letras.length} onClick={() => void baixarPacote(m, o)}>
              Baixar pacote
            </Botao>
          </div>
        </header>

        <section aria-label="Resumo" className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @5xl:grid-cols-6">
          <Indicador destaque>
            <Metrica rotulo="Preço sugerido" valor={brl(o.preco)} tom="sucesso" tamanho="lg" />
          </Indicador>
          <Indicador>
            <Metrica rotulo="Custo" valor={brl(o.custo)} tamanho="md" detalhe={`perdas ${cfg.taxaFalha}% incluídas`} />
          </Indicador>
          <Indicador>
            <Metrica rotulo="Lucro" valor={brl(o.lucro)} tom="sucesso" tamanho="md" detalhe={`margem ${cfg.margem}%`} />
          </Indicador>
          <Indicador>
            <Metrica rotulo="Filamento" valor={formatarPeso(o.gramas)} tamanho="md" detalhe={`${formatarNumero(o.rolos, 2)} rolo`} />
          </Indicador>
          <Indicador>
            <Metrica rotulo="Tempo de máquina" valor={formatarTempoHM(o.horas)} tamanho="md" detalhe={`${formatarNumero(o.horas, 1)} h`} />
          </Indicador>
          <Indicador>
            <Metrica
              rotulo="Impressões"
              valor={impressoes}
              tamanho="md"
              tom={estimadas ? 'atencao' : 'neutro'}
              detalhe={estimadas ? `${estimadas} ainda estimada${estimadas > 1 ? 's' : ''}` : 'todas com dado real'}
            />
          </Indicador>
        </section>

        <div className="grid gap-4 @5xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="min-w-0 space-y-4">
            <CartaoImpressoes />
            <CartaoPorPeca />
          </div>
          <div className="grid min-w-0 content-start gap-4 @2xl:grid-cols-2 @5xl:grid-cols-1">
            <Cartao titulo="Composição do custo">
              <BarraComposicao o={o} />
              <ListaValores
                densa
                itens={[
                  ...o.itens.map((i) => ({ rotulo: <ItemCor rotulo={i.rotulo} />, valor: brl(i.valor), detalhe: formatarTexto(i.detalhe) })),
                  { rotulo: 'Custo total', valor: brl(o.custo), forte: true },
                  { rotulo: 'Preço sugerido', valor: brl(o.preco), forte: true, tom: 'sucesso' as const },
                ]}
              />
            </Cartao>
            <DivisaoSocios o={o} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Indicador({ children, destaque }: { children: ReactNode; destaque?: boolean }) {
  return (
    <div
      className={cx(
        'min-w-0 rounded-lg border bg-superficie px-4 py-3',
        destaque ? 'col-span-2 border-sucesso/40 @2xl:col-span-1' : 'border-borda'
      )}
    >
      {children}
    </div>
  );
}

/** Cor de cada item do custo: a mesma na barra e na lista. */
const COR_ITEM: Record<string, string> = {
  Filamento: 'bg-acento',
  Máquina: 'bg-atencao',
  Energia: 'bg-peca-borda',
  'Mão de obra': 'bg-peca-bolsao',
  'Chapa ACM': 'bg-peca-chapa',
  'Fita LED': 'bg-peca-labio',
};
const corItem = (rotulo: string) => COR_ITEM[rotulo] ?? 'bg-texto-3';

function ItemCor({ rotulo }: { rotulo: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cx('size-2 shrink-0 rounded-sm', corItem(rotulo))} aria-hidden />
      {rotulo}
    </span>
  );
}

/** O que pesa no custo, de relance: uma fatia por item. */
function BarraComposicao({ o }: { o: Orcamento }) {
  const itens = o.itens.filter((i) => i.valor > 0);
  if (!(o.custo > 0)) return null;
  return (
    <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-superficie-3" role="img" aria-label="Divisão do custo por item">
      {itens.map((i) => (
        <div
          key={i.rotulo}
          className={corItem(i.rotulo)}
          style={{ width: `${(i.valor / o.custo) * 100}%` }}
          title={`${i.rotulo}: ${brl(i.valor)} (${formatarNumero((i.valor / o.custo) * 100, 0)}%)`}
        />
      ))}
    </div>
  );
}

function CartaoPorPeca() {
  const m = useModelo();
  const { porPeca } = useCustos();
  const nomes = new Map([...m.letras.map((l) => [l.chave, l.nome] as const), ...m.objetos.map((o) => [o.chave, o.nome] as const)]);
  const pecas = [...porPeca].filter(([k]) => nomes.has(k));
  if (!pecas.length) return null;

  return (
    <Cartao titulo={`Por peça (${pecas.length})`} nota="Sem o preparo da máquina, que entra uma vez em cada placa.">
      <div className="max-h-96 overflow-auto">
        <TabelaCusto linhas={pecas.map(([k, o]) => ({ nome: nomes.get(k)!, o }))} />
      </div>
    </Cartao>
  );
}

function TabelaCusto({ linhas }: { linhas: { nome: string; qtd?: number; o: Orcamento }[] }) {
  const comQtd = linhas.some((l) => l.qtd !== undefined);
  return (
    <table className="tabular w-full min-w-[480px] text-mini">
      <thead className="sticky top-0 bg-superficie">
        <tr className="text-left text-micro text-texto-3">
          <th className="py-1.5 font-medium" />
          {comQtd && <th className="py-1.5 text-right font-medium">Peças</th>}
          <th className="py-1.5 text-right font-medium">Filamento</th>
          <th className="py-1.5 text-right font-medium">Tempo</th>
          <th className="py-1.5 text-right font-medium">Custo</th>
          <th className="py-1.5 text-right font-medium">Preço</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-borda/60 font-mono">
        {linhas.map((l) => (
          <tr key={l.nome}>
            <td className="py-1.5 font-sans font-medium text-texto">{l.nome}</td>
            {comQtd && <td className="py-1.5 text-right text-texto-2">{l.qtd}</td>}
            <td className="py-1.5 text-right text-texto-2">{formatarPeso(l.o.gramas)}</td>
            <td className="py-1.5 text-right text-texto-2">{formatarTempo(l.o.horas)}</td>
            <td className="py-1.5 text-right text-texto-2">{brl(l.o.custo)}</td>
            <td className="py-1.5 text-right font-semibold text-sucesso">{brl(l.o.preco)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Por placa, com os gramas e o tempo que o Bambu Studio mostra depois de fatiar.
 * Sem eles, a linha fica na estimativa. Cada dado real tambem ensina a estimativa.
 */
function CartaoImpressoes() {
  const { porPlaca } = useCustos();
  const avulsas = useProjeto((x) => x.avulsas);
  const adicionarAvulsa = useProjeto((x) => x.adicionarAvulsa);
  const arrumado = useInterface((x) => x.placas.length > 0);
  const temStl = porPlaca.some((p) => p.temStl);
  const faltam = porPlaca.filter((p) => p.estimado && !p.excluida).length;

  return (
    <Cartao
      titulo="Impressões"
      nota={temStl ? '* inclui objeto STL: conta no custo da impressão, mas não no preço do letreiro.' : undefined}
      acao={
        <Botao variante="fantasma" tamanho="sm" icone={IconeMais} onClick={adicionarAvulsa}>
          Placa feita fora do app
        </Botao>
      }
    >
      <p className="mb-3 text-mini text-texto-2">
        Fatie no Bambu Studio e copie os <span className="text-texto">gramas</span> e o <span className="text-texto">tempo</span> de cada
        placa. Desmarque a placa que não entra no orçamento.{' '}
        {faltam > 0 && <span className="text-atencao">Sem gramas e tempo, o valor é estimado.</span>}
      </p>
      <div className="overflow-x-auto">
      <table className="tabular w-full min-w-[620px] text-mini">
        <thead>
          <tr className="text-left text-micro text-texto-3">
            <th className="py-1.5 font-medium" />
            <th className="py-1.5 text-right font-medium">Peças</th>
            <th className="py-1.5 pl-2 font-medium">Filamento</th>
            <th className="py-1.5 pl-2 font-medium">Tempo</th>
            <th className="py-1.5 text-right font-medium">Custo</th>
            <th className="py-1.5 text-right font-medium">Preço</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borda/60 font-mono">
          {porPlaca.map((p) => (
            <LinhaPlaca key={p.indice} p={p} nome={arrumado ? `Placa ${p.indice + 1}${p.temStl ? ' *' : ''}` : 'Letreiro'} />
          ))}
          {avulsas.map((a) => (
            <LinhaAvulsa key={a.id} a={a} />
          ))}
        </tbody>
      </table>
      </div>
    </Cartao>
  );
}

function LinhaPlaca({ p, nome }: { p: CustoPlaca; nome: string }) {
  const m = useModelo();
  const real = useInterface((x) => x.reais[p.indice] ?? null);
  const definirReal = useInterface((x) => x.definirReal);
  const alternarExcluida = useInterface((x) => x.alternarExcluida);
  const definirCusto = useProjeto((x) => x.definirCusto);
  const [g, setG] = useState(real ? formatarNumero(real.gramas, 0) : '');
  const [t, setT] = useState(real ? formatarTempoHM(real.horas) : '');
  // Rearrumar ou mexer na placa apaga o dado real: os campos acompanham.
  const antes = useRef(real);
  useEffect(() => {
    if (antes.current && !real) {
      setG('');
      setT('');
    }
    antes.current = real;
  }, [real]);

  // Os dois juntos: gramas sem tempo (ou o contrario) ainda nao da para usar.
  const confirmar = (gt: string, tt: string) => {
    const gramas = lerNumero(gt);
    const horas = lerTempo(tt);
    if (!gramas || gramas <= 0 || !horas) return;
    if (real && Math.abs(real.gramas - gramas) < 1e-9 && Math.abs(real.horas - horas) < 1e-9) return;
    definirReal(p.indice, { gramas, horas });
    const volume = p.chaves.reduce((a, k) => a + (m.insumos.get(k)?.volumeMm3 ?? 0), 0);
    // A placa e identificada pelo trabalho e pelas pecas dela.
    const id = `${m.nomeProjeto}|${[...p.chaves].sort().join(',')}`;
    const cfg = calibrar(useProjeto.getState().cfg, id, { gramas, horas }, volume);
    definirCusto('vazao', cfg.vazao);
    definirCusto('fatorGramas', cfg.fatorGramas);
    definirCusto('amostras', cfg.amostras);
  };
  const limpar = () => {
    setG('');
    setT('');
    definirReal(p.indice, null);
  };
  const tempoInvalido = t.trim() !== '' && lerTempo(t) === null;

  return (
    <tr className={cx(p.excluida && 'opacity-45')}>
      <td className="py-1.5 font-sans font-medium text-texto">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={!p.excluida}
            onChange={() => alternarExcluida(p.indice)}
            className="size-3.5 accent-[var(--color-acento)]"
            aria-label={`${nome} entra no orçamento`}
          />
          <span>
            {nome}
            <span className={cx('ml-1.5 text-micro font-normal', p.excluida ? 'text-texto-3' : p.estimado ? 'text-atencao' : 'text-sucesso')}>
              {p.excluida ? 'fora do orçamento' : p.estimado ? 'estimado' : 'real'}
            </span>
          </span>
        </label>
      </td>
      <td className="py-1.5 text-right text-texto-2">{p.chaves.length}</td>
      <td className="py-1 pl-2">
        <CampoReal
          rotulo={`Gramas: ${nome}`}
          valor={g}
          set={setG}
          dica={formatarNumero(p.orc.gramas, 0)}
          unidade="g"
          onConfirmar={() => confirmar(g, t)}
        />
      </td>
      <td className="py-1 pl-2">
        <CampoReal
          rotulo={`Tempo: ${nome}`}
          valor={t}
          set={setT}
          dica={formatarTempoHM(p.orc.horas)}
          invalido={tempoInvalido}
          onConfirmar={() => confirmar(g, t)}
        />
      </td>
      <td className="whitespace-nowrap py-1.5 text-right text-texto-2">{brl(p.orc.custo)}</td>
      <td className="whitespace-nowrap py-1.5 text-right font-semibold text-sucesso">
        {brl(p.orc.preco)}
        {!p.estimado && (
          <button
            type="button"
            onClick={limpar}
            className="ml-1 font-sans text-micro font-normal text-texto-3 hover:text-perigo"
            title="Voltar para a estimativa"
          >
            ×
          </button>
        )}
      </td>
    </tr>
  );
}

function CampoReal({
  rotulo,
  valor,
  set,
  dica,
  unidade,
  invalido,
  onConfirmar,
}: {
  rotulo: string;
  valor: string;
  set: (v: string) => void;
  /** A estimativa, em cinza, enquanto nao ha valor real. */
  dica: string;
  unidade?: string;
  invalido?: boolean;
  onConfirmar: () => void;
}) {
  return (
    <div
      className={cx(
        'flex h-7 w-24 items-center rounded-md border bg-superficie-2 transition-colors focus-within:border-acento',
        invalido ? 'border-perigo' : 'border-borda hover:border-borda-forte'
      )}
    >
      <input
        type="text"
        aria-label={rotulo}
        value={valor}
        placeholder={dica}
        onChange={(e) => set(e.target.value)}
        onBlur={onConfirmar}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="min-w-0 flex-1 bg-transparent pl-2 font-mono text-mini text-texto outline-none placeholder:text-texto-3/60"
      />
      {unidade && <span className="pr-2 font-mono text-micro text-texto-3">{unidade}</span>}
    </div>
  );
}

/** Impressao feita fora do app: nome, pecas, gramas e tempo, direto do fatiador. */
function LinhaAvulsa({ a }: { a: PlacaAvulsa }) {
  const ajustar = useProjeto((x) => x.ajustarAvulsa);
  const remover = useProjeto((x) => x.removerAvulsa);
  const o = useCustos().porAvulsa.get(a.id);
  const [nome, setNome] = useState(a.nome);
  const [pecas, setPecas] = useState(String(a.pecas));
  const [g, setG] = useState(a.gramas ? formatarNumero(a.gramas, 0) : '');
  const [t, setT] = useState(a.horas ? formatarTempoHM(a.horas) : '');
  const tempoInvalido = t.trim() !== '' && lerTempo(t) === null;

  return (
    <tr>
      <td className="py-1 pr-2 font-sans">
        <input
          type="text"
          aria-label="Nome da placa"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => ajustar(a.id, { nome: nome.trim() || a.nome })}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="h-7 w-full min-w-0 rounded-md border border-transparent bg-transparent px-1.5 text-mini font-medium text-texto outline-none hover:border-borda focus:border-acento"
        />
      </td>
      <td className="py-1 text-right">
        <input
          type="text"
          inputMode="numeric"
          aria-label={`Peças: ${a.nome}`}
          value={pecas}
          onChange={(e) => setPecas(e.target.value)}
          onBlur={() => {
            const n = Math.round(lerNumero(pecas) ?? a.pecas);
            ajustar(a.id, { pecas: Math.max(1, n) });
            setPecas(String(Math.max(1, n)));
          }}
          className="h-7 w-10 rounded-md border border-borda bg-superficie-2 px-1.5 text-right font-mono text-mini text-texto outline-none focus:border-acento"
        />
      </td>
      <td className="py-1 pl-2">
        <CampoReal
          rotulo={`Gramas: ${a.nome}`}
          valor={g}
          set={setG}
          dica="gramas"
          unidade="g"
          onConfirmar={() => ajustar(a.id, { gramas: Math.max(0, lerNumero(g) ?? 0) })}
        />
      </td>
      <td className="py-1 pl-2">
        <CampoReal
          rotulo={`Tempo: ${a.nome}`}
          valor={t}
          set={setT}
          dica="ex. 5h 32m"
          invalido={tempoInvalido}
          onConfirmar={() => ajustar(a.id, { horas: lerTempo(t) ?? 0 })}
        />
      </td>
      <td className="whitespace-nowrap py-1.5 text-right text-texto-2">{o ? brl(o.custo) : '—'}</td>
      <td className="whitespace-nowrap py-1.5 text-right font-semibold text-sucesso">
        {o ? brl(o.preco) : <span className="font-sans font-normal text-texto-3" title="Preencha gramas e tempo">—</span>}
        <button
          type="button"
          onClick={() => remover(a.id)}
          className="ml-1 font-sans text-micro font-normal text-texto-3 hover:text-perigo"
          title="Tirar esta placa"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

/**
 * Quanto cada socio recebe. Ligado, o dono da maquina recebe antes a maquina e a
 * luz; o resto (filamento incluido) e dividido igual.
 */
function DivisaoSocios({ o }: { o: Orcamento }) {
  const cfg = useProjeto((x) => x.cfg);
  const definirCusto = useProjeto((x) => x.definirCusto);
  const pagarMaquina = useProjeto((x) => x.pagarMaquina);
  const definir = useProjeto((x) => x.definir);
  const socios = cfg.socios;
  const dono = Math.min(cfg.donoMaquina, socios.length - 1);
  const maquinaEnergia = o.maquina + o.energia;
  const partes = dividirEntreSocios(o.preco, maquinaEnergia, socios.length, dono, pagarMaquina);

  const renomear = (i: number, nome: string) => definirCusto('socios', socios.map((x, k) => (k === i ? nome.trim() || x : x)));
  const remover = (i: number) => {
    definirCusto('socios', socios.filter((_, k) => k !== i));
    // O dono continua o mesmo; se foi ele que saiu, volta para o primeiro.
    definirCusto('donoMaquina', i < dono ? dono - 1 : i === dono ? 0 : dono);
  };

  return (
    <Cartao titulo="Divisão entre sócios">
      <Interruptor
        rotulo={
          <>
            Dono da máquina recebe máquina + energia <span className="tabular font-mono text-texto-3">({brl(maquinaEnergia)})</span>
          </>
        }
        dica="Ele paga o desgaste da impressora e a luz: recebe isso antes. O resto é dividido igual."
        valor={pagarMaquina}
        set={(v) => definir('pagarMaquina', v)}
      />
      <ul className="mt-2 divide-y divide-borda/60">
        {socios.map((nome, i) => (
          <li key={`${i}:${nome}`} className="group flex items-center gap-2 py-1.5">
            <input
              type="text"
              aria-label={`Nome do sócio ${i + 1}`}
              defaultValue={nome}
              onBlur={(e) => renomear(i, e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-base text-texto outline-none hover:border-borda focus:border-acento"
            />
            {pagarMaquina && (
              <label className="flex cursor-pointer items-center gap-1 text-micro text-texto-3" title="Dono da máquina">
                <input
                  type="radio"
                  name="dono-maquina"
                  checked={i === dono}
                  onChange={() => definirCusto('donoMaquina', i)}
                  className="accent-[var(--color-acento)]"
                />
                máquina
              </label>
            )}
            {pagarMaquina && i === dono && (
              <span className="tabular font-mono text-micro text-texto-3">inclui {brl(maquinaEnergia)}</span>
            )}
            <span className="tabular w-24 text-right font-mono text-base font-semibold text-sucesso">{brl(partes[i] ?? 0)}</span>
            {socios.length > 1 && (
              <button
                type="button"
                onClick={() => remover(i)}
                className="text-micro text-texto-3 opacity-0 transition-opacity hover:text-perigo group-hover:opacity-100 focus:opacity-100"
                title="Tirar este sócio"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      <Botao variante="fantasma" tamanho="sm" icone={IconeMais} onClick={() => definirCusto('socios', [...socios, `Sócio ${socios.length + 1}`])}>
        Adicionar sócio
      </Botao>
    </Cartao>
  );
}
