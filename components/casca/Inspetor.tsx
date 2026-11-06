'use client';

import {
  Alerta,
  Botao,
  BotaoIcone,
  CabecalhoPainel,
  CampoNumero,
  Campo,
  EntradaNumero,
  ListaValores,
  Metrica,
  Selo,
  formatarNumero,
  formatarPeso,
  formatarTempo,
  formatarTexto,
  IconeBaixar,
  IconeFechar,
  IconeOriginal,
  IconeTravado,
  IconeExcluir,
  IconeAgrupar,
  IconeDesagrupar,
  IconeSuavizar,
  IconeDividir,
  IconeMais,
  Interruptor,
  Dica,
} from '@/components/ui';
import { brl } from '@/lib/cost/calc';
import { regionBounds, type Region } from '@/lib/geom/region';
import { EMENDA_PADRAO, type Corte, type Eixo } from '@/lib/geom/emenda';
import { edicaoVazia, escalaDeMm, mmDeEscala, SEM_EDICAO } from '@/lib/geom/pecaEditada';
import { IMPRESSORAS, caberNaMesa, descreverVeredito } from '@/lib/print/impressoras';
import { useCustos } from '@/features/orcamento/custos';
import { useInterno } from '@/features/orcamento/interno';
import { useProjeto } from '@/store/projeto';
import { placaDe, useInterface } from '@/store/interface';
import { useModelo, useOrcamento, type LetraComPeca } from '@/modelo/Modelo';
import { DICA_3MF, DICA_STL, NOTA_FORMATOS, baixarObjeto, baixarSTL } from '@/features/acoes/exportar';
import { aplicarRelevo, refazerRelevo } from '@/features/acoes/relevo';
import { agruparSelecao, desagruparSelecao, excluirSelecao, exportarSelecao, grupoDaSelecao } from '@/features/acoes/selecao';

/**
 * Inspetor: propriedades do que esta selecionado. Sem selecao, o resumo do
 * letreiro.
 *
 * A edicao da peca morava no meio do painel de medidas, longe da peca clicada.
 * Aqui ela aparece do lado do 3D, so quando ha algo selecionado.
 */
export function Inspetor() {
  const m = useModelo();
  const espaco = useInterface((s) => s.espaco);
  const selecionada = useInterface((s) => s.selecionada);
  const varias = useInterface((s) => s.selecao.length > 1);
  const l = selecionada ? m.letras.find((x) => x.chave === selecionada) : undefined;
  const o = selecionada ? m.objetos.find((x) => x.chave === selecionada) : undefined;
  // Na placa vai o que se imprime: a letra inteira, ou o pedaco e a tala da dividida.
  const i = selecionada ? m.impressas.find((x) => x.chave === selecionada) : undefined;

  // Na placa, letra e STL sao a mesma coisa: nome, footprint, altura e um arquivo.
  const naPlaca = i
    ? { chave: i.chave, nome: i.nome, contorno: i.part.contorno, alturaZ: i.part.alturaZ, baixar: () => baixarSTL(m, i), excluivel: i.tipo === 'letra' }
    : o
      ? { chave: o.chave, nome: o.nome, contorno: o.contorno, alturaZ: o.alturaZ, baixar: () => baixarObjeto(o), excluivel: true }
      : undefined;

  return (
    <section aria-label="Inspetor" className="flex min-h-0 flex-1 flex-col">
      {varias ? (
        <InspetorConjunto />
      ) : espaco === 'imprimir' && naPlaca ? (
        <InspetorImpressao p={naPlaca} />
      ) : l ? (
        <InspetorPeca l={l} />
      ) : (
        <Resumo />
      )}
    </section>
  );
}

/** Excluir a peca do letreiro. Volta por "Restaurar" em Origem. */
function Excluir({ l }: { l: { chave: string; nome: string } }) {
  const remover = useProjeto((s) => s.removerPeca);
  const selecionar = useInterface((s) => s.selecionar);
  return (
    <Dica conteudo="Tira esta peça do letreiro. Dá para trazer de volta em Desenhar › Origem." atalho="Del">
      <Botao
        variante="perigo"
        icone={IconeExcluir}
        largura
        onClick={() => {
          remover(l.chave);
          selecionar(null);
        }}
      >
        Excluir peça
      </Botao>
    </Dica>
  );
}

function Cabecalho({ l, subtitulo }: { l: { chave: string; nome: string }; subtitulo: string }) {
  const selecionar = useInterface((s) => s.selecionar);
  return (
    <CabecalhoPainel
      titulo={<>Peça “{l.nome}”</>}
      subtitulo={subtitulo}
      acao={<BotaoIcone icone={IconeFechar} rotulo="Desmarcar" atalho="Esc" tamanho="sm" onClick={() => selecionar(null)} />}
    />
  );
}

/** Desenhar: mover, girar e tamanho da peca. Muda o produto. */
function InspetorPeca({ l }: { l: LetraComPeca }) {
  const e = useProjeto((s) => s.edicoes.get(l.chave)) ?? SEM_EDICAO;
  const editar = useProjeto((s) => s.editarPeca);
  const resetar = useProjeto((s) => s.resetarPeca);
  const b = regionBounds(l.part.contorno);
  const proporcional = Math.abs(e.ex - e.ey) < 1e-9;

  return (
    <>
      <Cabecalho l={l} subtitulo={`${formatarNumero(b.w)} × ${formatarNumero(b.h)} mm`} />
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <Alerta tom="acento">Muda o produto: a chapa, o gabarito e o preço desta peça acompanham.</Alerta>

        <div className="space-y-1">
          <p className="text-micro font-semibold uppercase tracking-wider text-texto-3">Posição</p>
          <CampoNumero rotulo="X" valor={e.dx} set={(v) => editar(l.chave, { dx: v })} min={-5000} max={5000} passo={0.5} layout="linha" />
          <CampoNumero rotulo="Y" valor={e.dy} set={(v) => editar(l.chave, { dy: v })} min={-5000} max={5000} passo={0.5} layout="linha" />
          <CampoNumero rotulo="Giro" valor={e.giro} set={(v) => editar(l.chave, { giro: v })} min={-360} max={360} passo={1} unidade="°" layout="linha" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-micro font-semibold uppercase tracking-wider text-texto-3">Tamanho</p>
            <BotaoIcone
              icone={IconeTravado}
              rotulo={proporcional ? 'Proporção travada' : 'Igualar Y a X (travar proporção)'}
              ativo={proporcional}
              tamanho="sm"
              onClick={() => editar(l.chave, { ey: e.ex })}
            />
          </div>
          {/* mm e x ligados: digitar um atualiza o outro. A medida em mm parte da que
              veio do arquivo (ou do texto), sem a borda de apoio. */}
          <TamanhoEixo
            rotulo="Largura"
            base={l.baseW}
            escala={e.ex}
            // Com a proporcao travada, mexer num eixo mexe no outro: e o que se espera
            // de "aumentar a letra"; esticar e a excecao.
            set={(v) => editar(l.chave, proporcional ? { ex: v, ey: v } : { ex: v })}
          />
          <TamanhoEixo
            rotulo="Altura"
            base={l.baseH}
            escala={e.ey}
            set={(v) => editar(l.chave, proporcional ? { ex: v, ey: v } : { ey: v })}
          />
        </div>

        <ListaValores densa itens={[{ rotulo: 'Espessura mínima', valor: `${formatarNumero(l.espessuraMin, 1)} mm` }]} />
        <DivisaoDaPeca l={l} />
        <CustoDaPeca chave={l.chave} />

        {!edicaoVazia(e) && (
          <Botao variante="fantasma" icone={IconeOriginal} largura onClick={() => resetar(l.chave)}>
            Voltar ao original
          </Botao>
        )}
        <Excluir l={l} />
      </div>
    </>
  );
}

const TITULO = 'text-micro font-semibold uppercase tracking-wider text-texto-3';

/**
 * Peca maior que a mesa: dividir em pedacos que cabem, com emenda (dente na solida, tala por
 * dentro na oca), e os cortes, automaticos ou dados a mao em mm a partir do canto da peca.
 */
function DivisaoDaPeca({ l }: { l: LetraComPeca }) {
  const m = useModelo();
  const dividir = useProjeto((s) => s.dividirPecas);
  const definirCortes = useProjeto((s) => s.definirCortes);
  const juntar = useProjeto((s) => s.juntarPecas);
  const emenda = useProjeto((s) => s.emenda);
  const ajustar = useProjeto((s) => s.ajustarEmenda);
  const d = l.divisao;
  const inteira = d?.inteira ?? l.part;
  const maquina = m.mesa.nome.replace('Bambu Lab ', '');

  if (!d) {
    const v = caberNaMesa(inteira.contorno, inteira.alturaZ, m.mesa);
    if (v.cabe) return null;
    return (
      <div className="space-y-2">
        <p className={TITULO}>Divisão</p>
        <Alerta tom="perigo">{formatarTexto(descreverVeredito(v, m.mesa)).replace(/^./, (c) => c.toUpperCase())} na {maquina}.</Alerta>
        <Botao icone={IconeDividir} variante="primario" largura onClick={() => dividir([l.chave])}>
          Dividir para caber na mesa
        </Botao>
        <p className="text-micro text-texto-3">Corta em pedaços que cabem na {maquina}, com encaixe na emenda e o número de montagem gravado em cada um.</p>
      </div>
    );
  }

  const b = regionBounds(inteira.contorno);
  const itens = m.impressas.filter((x) => x.letra === l.chave);
  const pedacos = itens.filter((x) => x.tipo !== 'tala');
  const talas = itens.length - pedacos.length;
  const solida = m.params.macica;
  const tamanho = (e: Eixo) => (e === 'x' ? b.w : b.h);
  const mudar = (k: number, pos: number) => definirCortes(l.chave, d.cortes.map((c, j) => (j === k ? { ...c, pos } : c)));
  const tirar = (k: number) => definirCortes(l.chave, d.cortes.filter((_, j) => j !== k));
  // Corte novo no meio do maior trecho sem corte naquele eixo.
  const somar = (eixo: Eixo) => {
    const marcos = [0, ...d.cortes.filter((c) => c.eixo === eixo).map((c) => c.pos), tamanho(eixo)].sort((a, c) => a - c);
    let k = 1;
    for (let j = 2; j < marcos.length; j++) if (marcos[j]! - marcos[j - 1]! > marcos[k]! - marcos[k - 1]!) k = j;
    const novo: Corte = { eixo, pos: Math.round((marcos[k]! + marcos[k - 1]!) / 2) };
    definirCortes(l.chave, [...d.cortes, novo]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className={TITULO}>Divisão</p>
        <Selo tom={d.auto ? 'acento' : undefined}>{d.auto ? 'automática' : 'cortes a mão'}</Selo>
      </div>
      <ListaValores
        densa
        itens={[
          { rotulo: 'Pedaços', valor: String(pedacos.length) },
          ...(talas ? [{ rotulo: 'Talas de emenda', valor: String(talas) }] : []),
          { rotulo: 'Emenda', valor: solida ? 'dente de encaixe' : 'tala colada por dentro' },
          ...(d.parafusos ? [{ rotulo: 'Parafusos M3', valor: String(d.parafusos) }] : []),
        ]}
      />

      <div className="space-y-1">
        {d.cortes.map((c, k) => (
          <div key={k} className="flex items-center gap-2 text-mini text-texto-2">
            <span className="flex-1 leading-tight">
              {c.eixo === 'x' ? 'Vertical' : 'Horizontal'}
              <span className="block text-micro text-texto-3">{c.eixo === 'x' ? 'mm da esquerda' : 'mm de baixo'}</span>
            </span>
            <EntradaNumero
              valor={c.pos}
              set={(v) => mudar(k, v)}
              min={1}
              max={Math.floor(tamanho(c.eixo)) - 1}
              passo={1}
              unidade="mm"
              rotuloAcessivel={`Corte ${c.eixo === 'x' ? 'vertical, mm da esquerda' : 'horizontal, mm de baixo'}`}
            />
            <BotaoIcone icone={IconeFechar} rotulo="Tirar este corte" tamanho="sm" onClick={() => tirar(k)} />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <Dica conteudo="Mais um corte vertical, no meio do maior pedaço">
            <Botao tamanho="sm" icone={IconeMais} onClick={() => somar('x')}>
              Vertical
            </Botao>
          </Dica>
          <Dica conteudo="Mais um corte horizontal, no meio do maior pedaço">
            <Botao tamanho="sm" icone={IconeMais} onClick={() => somar('y')}>
              Horizontal
            </Botao>
          </Dica>
        </div>
      </div>

      <div className="space-y-1">
        {pedacos.map((x) => {
          const bx = regionBounds(x.part.contorno);
          const cabe = !m.naoCabem.has(x.chave);
          return (
            <div key={x.chave} className="flex items-center justify-between text-mini">
              <span className="text-texto-2">{x.nome}</span>
              <span className="flex items-center gap-2 text-texto-3 tabular-nums">
                {formatarNumero(bx.w, 0)} × {formatarNumero(bx.h, 0)} mm
                <Selo tom={cabe ? 'sucesso' : 'perigo'}>{cabe ? 'cabe' : 'não cabe'}</Selo>
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <p className={TITULO}>Emenda (todas as peças divididas)</p>
        <Interruptor rotulo="Gravar o número" dica={solida ? 'Número de montagem embaixo, espelhado, para ler olhando por baixo' : 'Número de montagem por dentro, no fundo'} valor={emenda.gravarNumero} set={(v) => ajustar({ gravarNumero: v })} />
        {solida ? (
          <CampoNumero rotulo="Folga do encaixe" dica="Entre o dente e o vão" valor={emenda.folga} padrao={EMENDA_PADRAO.folga} set={(v) => ajustar({ folga: v })} min={0} max={1} passo={0.05} layout="linha" />
        ) : (
          <>
            <Interruptor rotulo="Parafusos M3" dica="Furos na tala e no fundo, dois por emenda; a cola continua" valor={emenda.parafusos} set={(v) => ajustar({ parafusos: v })} />
            <CampoNumero rotulo="Largura da tala" dica="Quanto a tala passa da emenda, para cada lado" valor={emenda.larguraTala} padrao={EMENDA_PADRAO.larguraTala} set={(v) => ajustar({ larguraTala: v })} min={10} max={80} passo={1} layout="linha" />
          </>
        )}
      </div>

      <div className="space-y-1.5">
        {!d.auto && (
          <Botao icone={IconeDividir} largura onClick={() => dividir([l.chave])}>
            Voltar aos cortes automáticos
          </Botao>
        )}
        <Botao variante="fantasma" icone={IconeOriginal} largura onClick={() => juntar([l.chave])}>
          Juntar de novo (peça inteira)
        </Botao>
      </div>
    </div>
  );
}

/**
 * O que esta peca custa sozinha: filamento, maquina, acabamento, chapa e perdas.
 * O preparo da maquina fica na placa (uma vez por impressao), nao aqui.
 */
function CustoDaPeca({ chave }: { chave: string }) {
  const o = useCustos().porPeca.get(chave);
  const interno = useInterno();
  if (!o || !interno) return null;
  return (
    <div className="space-y-1">
      <p className="text-micro font-semibold uppercase tracking-wider text-texto-3">Custo desta peça</p>
      <ListaValores
        densa
        itens={[
          { rotulo: 'Filamento', valor: formatarPeso(o.gramas) },
          { rotulo: 'Tempo de máquina', valor: formatarTempo(o.horas) },
          { rotulo: 'Custo', valor: brl(o.custo) },
          { rotulo: 'Preço', valor: brl(o.preco), forte: true, tom: 'sucesso' },
        ]}
      />
      <p className="text-micro text-texto-3">Sem o preparo da máquina, que é contado uma vez por placa.</p>
    </div>
  );
}

/** Um eixo do tamanho: o mesmo valor em mm e em multiplicador. */
function TamanhoEixo({ rotulo, base, escala, set }: { rotulo: string; base: number; escala: number; set: (escala: number) => void }) {
  return (
    <Campo rotulo={rotulo} dica="Medida da letra, sem a borda de apoio. 1,00 × = tamanho original." layout="linha">
      <div className="flex items-center gap-1">
        <EntradaNumero
          rotuloAcessivel={`${rotulo} em mm`}
          valor={mmDeEscala(escala, base)}
          set={(mm) => set(escalaDeMm(mm, base))}
          min={1}
          passo={0.5}
          unidade="mm"
          largura="w-24"
        />
        <EntradaNumero
          rotuloAcessivel={`${rotulo} em multiplicador`}
          valor={escala}
          set={set}
          min={0.05}
          max={10}
          passo={0.01}
          unidade="×"
          largura="w-[4.5rem]"
        />
      </div>
    </Campo>
  );
}

/**
 * Tira marca d'agua em relevo (letras, logo) de uma face do STL (plana ou curva): clique na
 * marca ou do lado dela, confira o vermelho e aplique.
 */
function SuavizarRelevo({ chave }: { chave: string }) {
  const ativo = useInterface((s) => s.ferramentaRelevo === chave);
  const ligar = useInterface((s) => s.definirFerramentaRelevo);
  const opcoes = useInterface((s) => s.opcoesRelevo);
  const definirOpcoes = useInterface((s) => s.definirOpcoesRelevo);
  const relevo = useInterface((s) => (s.relevo?.objeto === chave ? s.relevo.resultado : null));
  const id = chave.slice(4);
  const editado = useProjeto((s) => !!s.objetos3d.find((o) => o.id === id)?.original);
  const restaurar = useProjeto((s) => s.restaurarObjeto);
  const mudar = (o: Partial<typeof opcoes>) => {
    definirOpcoes(o);
    refazerRelevo();
  };

  return (
    <div className="space-y-2">
      <p className="text-micro font-semibold uppercase tracking-wider text-texto-3">Suavizar relevo</p>
      {!ativo ? (
        <Botao icone={IconeSuavizar} largura onClick={() => ligar(chave)}>
          Tirar marca em relevo
        </Botao>
      ) : (
        <>
          <Alerta tom="acento">
            Clique na marca, ou na face lisa ao lado dela. O que vai sumir fica vermelho; clique num pedaço vermelho para
            deixá-lo de fora.
          </Alerta>
          <CampoNumero
            rotulo="Altura máx. da marca"
            dica="Relevo (ou gravação) mais alto que isso não conta como marca"
            valor={opcoes.alturaMax}
            set={(v) => mudar({ alturaMax: v })}
            min={0.2}
            max={10}
            passo={0.1}
            layout="linha"
          />
          <CampoNumero
            rotulo="Raio de busca"
            dica="Até onde procurar em volta do clique"
            valor={opcoes.raio}
            set={(v) => mudar({ raio: v })}
            min={2}
            max={500}
            passo={1}
            layout="linha"
          />
          {relevo &&
            (relevo.triangulos.length ? (
              <p className="text-mini text-texto-2">
                Achei {relevo.pedacos} {relevo.pedacos === 1 ? 'pedaço' : 'pedaços'} de marca,{' '}
                <span className="tabular font-mono">{formatarNumero(relevo.area / 100, 1)} cm²</span>.
              </p>
            ) : (
              <Alerta tom="atencao">{relevo.aviso}</Alerta>
            ))}
          <div className="grid grid-cols-2 gap-1.5">
            <Botao variante="primario" largura disabled={!relevo?.triangulos.length} onClick={aplicarRelevo}>
              Aplicar
            </Botao>
            <Botao variante="fantasma" largura onClick={() => ligar(null)}>
              Fechar
            </Botao>
          </div>
        </>
      )}
      {editado && (
        <Botao variante="fantasma" icone={IconeOriginal} largura onClick={() => restaurar(id)}>
          Restaurar original
        </Botao>
      )}
      <p className="text-micro text-texto-3">
        Use em modelos seus ou cuja licença permite alterar: a marca de outro designer costuma fazer parte da licença.
      </p>
    </div>
  );
}

/** Imprimir: em qual maquina a peca cabe, e o STL dela. */
interface PecaDePlaca {
  chave: string;
  nome: string;
  contorno: Region;
  alturaZ: number;
  baixar: () => void;
  /** Pedaco e tala de peca dividida nao se excluem sozinhos (a peca e uma so). */
  excluivel: boolean;
}

/** Imprimir: em qual maquina a peca cabe, e o STL dela. Serve a letra e a STL. */
function InspetorImpressao({ p }: { p: PecaDePlaca }) {
  const m = useModelo();
  const placas = useInterface((s) => s.placas);
  const i = placaDe(placas, p.chave);
  const colocada = placas[i]?.get(p.chave);
  const b = regionBounds(p.contorno);

  return (
    <>
      <Cabecalho l={p} subtitulo={`${formatarNumero(b.w)} × ${formatarNumero(b.h)} × ${formatarNumero(p.alturaZ)} mm`} />
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="space-y-2">
          <p className="text-micro font-semibold uppercase tracking-wider text-texto-3">Cabe em qual máquina</p>
          {IMPRESSORAS.map((mq) => {
            const v = caberNaMesa(p.contorno, p.alturaZ, mq);
            return (
              <div key={mq.id} className="rounded-md border border-borda bg-superficie-2 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-texto">{mq.nome.replace('Bambu Lab ', '')}</span>
                  <Selo tom={v.cabe ? 'sucesso' : 'perigo'}>{v.cabe ? 'cabe' : 'não cabe'}</Selo>
                </div>
                <p className="mt-1 text-mini text-texto-3">{formatarTexto(descreverVeredito(v, mq))}</p>
              </div>
            );
          })}
        </div>

        {colocada && (
          <ListaValores
            densa
            itens={[
              { rotulo: 'Placa', valor: `${i + 1} de ${placas.length} · ${m.mesa.nome.replace('Bambu Lab ', '')}` },
              { rotulo: 'Giro na placa', valor: `${formatarNumero(colocada.giro)}°` },
            ]}
          />
        )}

        <CustoDaPeca chave={p.chave} />

        {p.chave.startsWith('stl:') && <SuavizarRelevo chave={p.chave} />}

        <Botao icone={IconeBaixar} largura onClick={p.baixar}>
          Baixar STL desta peça
        </Botao>
        {p.excluivel ? <Excluir l={p} /> : <p className="text-micro text-texto-3">É parte de uma peça dividida: os cortes se mudam em Desenhar, no Inspetor da peça.</p>}
      </div>
    </>
  );
}

/** Sem selecao: o letreiro inteiro de relance. */
/**
 * Varias pecas marcadas: as informacoes delas juntas (medida do conjunto, soma de
 * filamento, tempo e preco) e o que da para fazer com elas.
 */
function InspetorConjunto() {
  const m = useModelo();
  const selecao = useInterface((s) => s.selecao);
  const espaco = useInterface((s) => s.espaco);
  const definirSelecao = useInterface((s) => s.definirSelecao);
  const grupos = useProjeto((s) => s.grupos);
  const custos = useCustos();
  const interno = useInterno();

  const itens = selecao.flatMap((k) => {
    const l = m.letras.find((x) => x.chave === k) ?? m.impressas.find((x) => x.chave === k);
    if (l) return [{ chave: k, contorno: l.part.contorno }];
    const o = m.objetos.find((x) => x.chave === k);
    return o ? [{ chave: k, contorno: o.contorno }] : [];
  });
  const b = regionBounds(itens.flatMap((i) => i.contorno));
  const soma = (f: (o: NonNullable<ReturnType<typeof custos.porPeca.get>>) => number) =>
    itens.reduce((t, i) => t + (custos.porPeca.has(i.chave) ? f(custos.porPeca.get(i.chave)!) : 0), 0);
  const naoCabem = itens.filter((i) => m.naoCabem.has(i.chave)).length;
  const grupo = grupoDaSelecao();
  const temGrupo = selecao.some((k) => grupos.some((g) => g.membros.includes(k)));

  return (
    <>
      <CabecalhoPainel
        titulo={grupo ? <>Grupo “{grupo.nome}”</> : `${itens.length} peças`}
        subtitulo={`${formatarNumero(b.w)} × ${formatarNumero(b.h)} mm no letreiro`}
        acao={<BotaoIcone icone={IconeFechar} rotulo="Desmarcar" atalho="Esc" tamanho="sm" onClick={() => definirSelecao([])} />}
      />
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {interno && <Metrica rotulo="Preço junto" valor={brl(soma((o) => o.preco))} tom="sucesso" />}
          <Metrica rotulo="Filamento" valor={formatarPeso(soma((o) => o.gramas))} />
        </div>
        <ListaValores
          densa
          itens={[
            { rotulo: 'Peças', valor: String(itens.length) },
            { rotulo: 'Tempo de máquina', valor: formatarTempo(soma((o) => o.horas)) },
            ...(interno ? [{ rotulo: 'Custo', valor: brl(soma((o) => o.custo)) }] : []),
            ...(espaco === 'imprimir'
              ? [{ rotulo: `Não cabem na ${m.mesa.nome.replace('Bambu Lab ', '')}`, valor: String(naoCabem), tom: naoCabem ? ('perigo' as const) : undefined }]
              : []),
          ]}
        />
        <p className="text-micro text-texto-3">Soma das peças, sem o preparo da máquina (que é por placa).</p>

        <div className="grid grid-cols-2 gap-1.5">
          <Botao icone={IconeAgrupar} largura disabled={!!grupo} onClick={agruparSelecao}>
            Agrupar
          </Botao>
          <Botao icone={IconeDesagrupar} largura disabled={!temGrupo} onClick={desagruparSelecao}>
            Desagrupar
          </Botao>
          <Dica conteudo={DICA_3MF}>
            <Botao icone={IconeBaixar} largura variante="primario" onClick={() => exportarSelecao(m, '3mf')}>
              3MF
            </Botao>
          </Dica>
          <Dica conteudo={DICA_STL}>
            <Botao icone={IconeBaixar} largura onClick={() => exportarSelecao(m, 'stl')}>
              STL
            </Botao>
          </Dica>
        </div>
        <p className="text-micro text-texto-3">{NOTA_FORMATOS}</p>
        <Botao variante="perigo" icone={IconeExcluir} largura onClick={excluirSelecao}>
          Excluir {itens.length} peças
        </Botao>
      </div>
    </>
  );
}

function Resumo() {
  const m = useModelo();
  const o = useOrcamento();
  const profundidade = useProjeto((s) => s.profundidade);
  const interno = useInterno();

  return (
    <>
      <CabecalhoPainel titulo="Letreiro" subtitulo="Clique numa peça para editá-la" />
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {o && (
          <div className="grid grid-cols-2 gap-4">
            {interno && <Metrica rotulo="Preço" valor={brl(o.preco)} tom="sucesso" />}
            <Metrica rotulo="Filamento" valor={formatarPeso(o.gramas)} />
          </div>
        )}
        {m.bounds && (
          <ListaValores
            densa
            itens={[
              { rotulo: 'Largura montado', valor: `${formatarNumero(m.bounds.w)} mm` },
              { rotulo: 'Altura', valor: `${formatarNumero(m.bounds.h)} mm` },
              { rotulo: 'Profundidade', valor: `${formatarNumero(profundidade)} mm` },
              { rotulo: 'Peças', valor: m.letras.length },
              ...(m.impressas.length !== m.letras.length ? [{ rotulo: 'Para imprimir (pedaços e talas)', valor: m.impressas.length }] : []),
              ...(m.totais && m.totais.areaChapa > 0
                ? [{ rotulo: 'Chapa ACM', valor: `${formatarNumero(m.totais.areaChapa / 100)} cm²` }]
                : []),
              ...(m.naoCabem.size
                ? [{ rotulo: `Não cabem na ${m.mesa.nome.replace('Bambu Lab ', '')}`, valor: m.naoCabem.size, tom: 'perigo' as const }]
                : []),
            ]}
          />
        )}
      </div>
    </>
  );
}
