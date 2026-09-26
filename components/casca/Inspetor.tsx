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
  formatarTexto,
  IconeBaixar,
  IconeFechar,
  IconeOriginal,
  IconeTravado,
  IconeExcluir,
  Dica,
} from '@/components/ui';
import { brl } from '@/lib/cost/calc';
import { regionBounds, type Region } from '@/lib/geom/region';
import { edicaoVazia, escalaDeMm, mmDeEscala, SEM_EDICAO } from '@/lib/geom/pecaEditada';
import { IMPRESSORAS, caberNaMesa, descreverVeredito } from '@/lib/print/impressoras';
import { FILAMENTOS } from '@/lib/cost/calc';
import { useProjeto } from '@/store/projeto';
import { useInterface } from '@/store/interface';
import { useModelo, useOrcamento, type LetraComPeca } from '@/modelo/Modelo';
import { baixarObjeto, baixarSTL } from '@/features/acoes/exportar';

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
  const l = selecionada ? m.letras.find((x) => x.chave === selecionada) : undefined;
  const o = selecionada ? m.objetos.find((x) => x.chave === selecionada) : undefined;

  // Na placa, letra e STL sao a mesma coisa: nome, footprint, altura e um arquivo.
  const naPlaca = l
    ? { chave: l.chave, nome: l.nome, contorno: l.part.contorno, alturaZ: l.part.alturaZ, baixar: () => baixarSTL(m, l) }
    : o
      ? { chave: o.chave, nome: o.nome, contorno: o.contorno, alturaZ: o.alturaZ, baixar: () => baixarObjeto(o) }
      : undefined;

  return (
    <aside aria-label="Inspetor" className="flex w-[300px] shrink-0 flex-col border-l border-borda bg-superficie">
      {espaco === 'imprimir' && naPlaca ? <InspetorImpressao p={naPlaca} /> : l ? <InspetorPeca l={l} /> : <Resumo />}
    </aside>
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
  const densidade = useProjeto((s) => FILAMENTOS[s.cfg.filamento].densidade);
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

        <ListaValores
          densa
          itens={[
            { rotulo: 'Espessura mínima', valor: `${formatarNumero(l.espessuraMin, 1)} mm` },
            { rotulo: 'Filamento', valor: formatarPeso((l.part.volume / 1000) * densidade) },
          ]}
        />

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

/** Imprimir: em qual maquina a peca cabe, e o STL dela. */
interface PecaDePlaca {
  chave: string;
  nome: string;
  contorno: Region;
  alturaZ: number;
  baixar: () => void;
}

/** Imprimir: em qual maquina a peca cabe, e o STL dela. Serve a letra e a STL. */
function InspetorImpressao({ p }: { p: PecaDePlaca }) {
  const m = useModelo();
  const colocada = useInterface((s) => s.arranjo.get(p.chave));
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
              { rotulo: 'Na placa', valor: m.mesa.nome.replace('Bambu Lab ', '') },
              { rotulo: 'Giro na placa', valor: `${formatarNumero(colocada.giro)}°` },
            ]}
          />
        )}

        <Botao icone={IconeBaixar} largura onClick={p.baixar}>
          Baixar STL desta peça
        </Botao>
        <Excluir l={p} />
      </div>
    </>
  );
}

/** Sem selecao: o letreiro inteiro de relance. */
function Resumo() {
  const m = useModelo();
  const o = useOrcamento();
  const profundidade = useProjeto((s) => s.profundidade);

  return (
    <>
      <CabecalhoPainel titulo="Letreiro" subtitulo="Clique numa peça para editá-la" />
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {o && (
          <div className="grid grid-cols-2 gap-4">
            <Metrica rotulo="Preço" valor={brl(o.preco)} tom="sucesso" />
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
