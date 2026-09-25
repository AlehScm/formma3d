'use client';

import { useState } from 'react';
import {
  Botao,
  CampoNumero,
  ListaValores,
  Metrica,
  Secao,
  Selecao,
  Vazio,
  formatarNumero,
  formatarPeso,
  formatarTexto,
  IconeBaixar,
  IconeCopiar,
  IconeOk,
  IconeOrcamento,
} from '@/components/ui';
import { FILAMENTOS, brl, type CustoCfg, type FilamentoId } from '@/lib/cost/calc';
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
  const c = <K extends keyof CustoCfg>(k: K) => (v: CustoCfg[K]) => definir(k, v);

  return (
    <>
      <Secao titulo="Material" resumo={`${FILAMENTOS[cfg.filamento].nome} · ${brl(cfg.precoRolo)} o rolo`} padraoAberta>
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
      </Secao>

      <Secao titulo="Produção" resumo={`${formatarNumero(cfg.vazao, 1)} g/h · ${brl(cfg.valorHora)}/h`} padraoAberta>
        <CampoNumero
          rotulo="Vazão efetiva"
          dica="Calibre com um trabalho real: gramas do trabalho divididas pelas horas que levou. É o que estima o tempo."
          valor={cfg.vazao}
          set={c('vazao')}
          min={2}
          max={60}
          passo={0.5}
          unidade="g/h"
          layout="linha"
        />
        <CampoNumero rotulo="Custo de máquina" valor={cfg.custoMaquina} set={c('custoMaquina')} min={0} max={30} passo={0.5} unidade="R$/h" layout="linha" />
        <CampoNumero rotulo="Mão de obra" valor={cfg.valorHora} set={c('valorHora')} min={0} max={200} passo={5} unidade="R$/h" layout="linha" />
        <CampoNumero rotulo="Preparo do trabalho" valor={cfg.setupMin} set={c('setupMin')} min={0} max={120} passo={1} unidade="min" layout="linha" />
        <CampoNumero rotulo="Acabamento por peça" valor={cfg.posMin} set={c('posMin')} min={0} max={120} passo={1} unidade="min" layout="linha" />
        <MaisEnergia cfg={cfg} c={c} />
      </Secao>

      <Secao titulo="Margem" resumo={`${cfg.margem}% · falha ${cfg.taxaFalha}%`} padraoAberta>
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
      </Secao>
    </>
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
  const o = useOrcamento();
  const cfg = useProjeto((x) => x.cfg);
  const placas = useInterface((x) => x.infoArranjo?.placas);
  const [copiado, setCopiado] = useState(false);

  if (!o) {
    return (
      <div className="flex h-full items-center justify-center">
        <Vazio icone={IconeOrcamento} titulo="Sem orçamento ainda">
          O orçamento aparece assim que houver um letreiro em Desenhar.
        </Vazio>
      </div>
    );
  }

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
    <div className="h-full overflow-y-auto">
      <article className="mx-auto my-8 max-w-2xl rounded-xl border border-borda bg-superficie shadow-flutuante">
        <header className="flex items-start justify-between gap-4 border-b border-borda px-6 py-5">
          <div className="min-w-0">
            <p className="text-micro font-medium uppercase tracking-wider text-texto-3">Orçamento</p>
            <h1 className="mt-1 truncate text-grande font-semibold text-texto">{m.nomeProjeto || 'Sem nome'}</h1>
            <p className="mt-0.5 text-mini text-texto-3">
              {m.letras.length} {m.letras.length === 1 ? 'peça' : 'peças'}
              {m.bounds && ` · ${formatarNumero(m.bounds.w)} × ${formatarNumero(m.bounds.h)} mm`} ·{' '}
              {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
          <Metrica rotulo="Preço sugerido" valor={brl(o.preco)} tom="sucesso" tamanho="lg" />
        </header>

        <div className="grid grid-cols-3 gap-4 border-b border-borda px-6 py-4">
          <Metrica rotulo="Filamento" valor={formatarPeso(o.gramas)} tamanho="sm" detalhe={`${formatarNumero(o.rolos, 2)} rolo`} />
          <Metrica
            rotulo="Tempo de máquina"
            valor={formatarNumero(o.horas, 1)}
            unidade="h"
            tamanho="sm"
            detalhe={placas ? `${placas} ${placas === 1 ? 'placa' : 'placas'}` : undefined}
          />
          <Metrica rotulo="Lucro" valor={brl(o.lucro)} tamanho="sm" tom="sucesso" detalhe={`margem ${cfg.margem}%`} />
        </div>

        <div className="px-6 py-4">
          <p className="mb-1 text-micro font-medium uppercase tracking-wider text-texto-3">Composição do custo</p>
          <ListaValores
            itens={[
              ...o.itens.map((i) => ({ rotulo: i.rotulo, valor: brl(i.valor), detalhe: formatarTexto(i.detalhe) })),
              { rotulo: 'Custo total', valor: brl(o.custo), forte: true },
              { rotulo: 'Preço sugerido', valor: brl(o.preco), forte: true, tom: 'sucesso' as const },
            ]}
          />
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-borda px-6 py-4">
          <Botao variante="fantasma" icone={copiado ? IconeOk : IconeCopiar} onClick={() => void copiar()}>
            {copiado ? 'Copiado' : 'Copiar para o cliente'}
          </Botao>
          <Botao icone={IconeBaixar} onClick={() => void baixarPacote(m, o)}>
            Baixar pacote
          </Botao>
        </footer>
      </article>
      <p className="mb-8 text-center text-mini text-texto-3">
        “Copiar para o cliente” leva só medida, acabamento e valor — custo e margem ficam aqui.
      </p>
    </div>
  );
}
