'use client';

import { useShallow } from 'zustand/react/shallow';
import {
  Alerta,
  Botao,
  BotaoIcone,
  CampoNumero,
  Interruptor,
  MaisOpcoes,
  Segmentado,
  Categorias,
  type Categoria,
  IconeImprimir,
  IconeLista,
  IconeOrientacao,
  Selo,
  cx,
  formatarNumero,
  IconeArrumar,
  IconeBaixar,
  IconeDesfazer,
} from '@/components/ui';
import { IMPRESSORAS, MANUAL, caberNaMesa } from '@/lib/print/impressoras';
import { regionBounds } from '@/lib/geom/region';
import { useProjeto } from '@/store/projeto';
import { useInterface } from '@/store/interface';
import { useModelo } from '@/modelo/Modelo';
import { arrumarNaPlaca } from '@/features/acoes/arranjo';
import { baixarSTL } from '@/features/acoes/exportar';

/**
 * Area Imprimir: como o letreiro vai para a maquina. Nada aqui muda o produto --
 * mover e girar na placa so acomodam a peca.
 */
export function PainelImprimir() {
  const m = useModelo();
  const s = useProjeto(useShallow((x) => ({ id: x.impressoraId, mesaX: x.mesaX, mesaY: x.mesaY, mesaZ: x.mesaZ })));
  const info = useInterface((x) => x.infoArranjo);
  const categoria = useInterface((x) => x.categoria.imprimir);
  const setCategoria = useInterface((x) => x.setCategoria);
  const nome = IMPRESSORAS.find((x) => x.id === s.id)?.nome.replace('Bambu Lab ', '') ?? 'Manual';

  const categorias: Categoria[] = [
    {
      id: 'maquina',
      nome: 'Máquina',
      icone: IconeImprimir,
      resumo: `${nome} · ${formatarNumero(s.mesaX)}×${formatarNumero(s.mesaY)}×${formatarNumero(s.mesaZ)} mm`,
      conteudo: <Maquina />,
    },
    {
      id: 'arranjo',
      nome: 'Arranjo',
      icone: IconeArrumar,
      resumo: info ? `${info.dentro} na placa${info.placas > 1 ? ` · ${info.placas} placas` : ''}` : 'posição do letreiro',
      conteudo: <Arranjo />,
    },
    {
      id: 'pecas',
      nome: 'Peças',
      icone: IconeLista,
      resumo: `${m.letras.length} · ${m.naoCabem.size ? `${m.naoCabem.size} não cabem` : 'todas cabem'}`,
      // Ponto vermelho na aba: tem peca que nao cabe nesta maquina.
      alerta: m.naoCabem.size ? 'perigo' : undefined,
      conteudo: <Pecas />,
    },
    { id: 'orientacao', nome: 'Orientação', icone: IconeOrientacao, resumo: m.orientacao.texto, conteudo: <Orientacao /> },
  ];

  return (
    <Categorias
      rotulo="Configurações de Imprimir"
      categorias={categorias}
      ativa={categoria}
      setAtiva={(id) => setCategoria('imprimir', id)}
    />
  );
}

function Maquina() {
  const s = useProjeto(
    useShallow((x) => ({ id: x.impressoraId, mesaX: x.mesaX, mesaY: x.mesaY, mesaZ: x.mesaZ, bico: x.bico }))
  );
  const escolher = useProjeto((x) => x.escolherImpressora);
  const definir = useProjeto((x) => x.definir);
  const manual = s.id === MANUAL;

  return (
    <>
      <Segmentado
        valor={s.id}
        set={escolher}
        opcoes={[
          ...IMPRESSORAS.map((m) => ({
            valor: m.id,
            nome: m.nome.replace('Bambu Lab ', ''),
            dica: `Mesa ${m.x} × ${m.y} mm, altura útil ${m.z} mm`,
          })),
          { valor: MANUAL, nome: 'Manual', dica: 'Informe a mesa à mão' },
        ]}
      />
      {manual ? (
        <div className="space-y-1">
          <CampoNumero rotulo="Mesa X" valor={s.mesaX} set={(v) => definir('mesaX', v)} min={100} max={600} passo={1} layout="linha" />
          <CampoNumero rotulo="Mesa Y" valor={s.mesaY} set={(v) => definir('mesaY', v)} min={100} max={600} passo={1} layout="linha" />
          <CampoNumero rotulo="Altura útil" valor={s.mesaZ} set={(v) => definir('mesaZ', v)} min={50} max={600} passo={1} layout="linha" />
        </div>
      ) : (
        // Medidas lidas dos perfis do Bambu Studio: ver lib/print/impressoras.ts.
        <p className="tabular flex justify-between font-mono text-mini text-texto-3">
          <span>
            mesa {formatarNumero(s.mesaX)} × {formatarNumero(s.mesaY)} mm
          </span>
          <span>altura {formatarNumero(s.mesaZ)} mm</span>
        </p>
      )}
      <MaisOpcoes>
        <CampoNumero
          rotulo="Diâmetro do bico"
          dica="Avisa quando um trecho da letra fica mais fino que o bico"
          valor={s.bico}
          set={(v) => definir('bico', v)}
          min={0.2}
          max={1.2}
          passo={0.05}
          layout="linha"
        />
      </MaisOpcoes>
    </>
  );
}

function Arranjo() {
  const m = useModelo();
  const folga = useInterface((x) => x.folgaPecas);
  const setFolga = useInterface((x) => x.setFolgaPecas);
  const info = useInterface((x) => x.infoArranjo);
  const limpar = useInterface((x) => x.limparArranjo);

  return (
    <>
      <CampoNumero
        rotulo="Folga entre peças"
        dica="Espaço livre para brim e skirt"
        valor={folga}
        set={setFolga}
        min={0}
        max={20}
        passo={0.5}
        layout="linha"
      />
      <div className="flex gap-1.5">
        <Botao icone={IconeArrumar} largura disabled={!m.letras.length} onClick={() => arrumarNaPlaca(m)}>
          Arrumar na placa
        </Botao>
        {info && <BotaoIcone icone={IconeDesfazer} rotulo="Voltar à posição do letreiro" onClick={limpar} />}
      </div>
      {info && (
        <Alerta tom={info.impossiveis > 0 ? 'perigo' : info.fora > 0 ? 'atencao' : 'sucesso'}>
          <span className="font-medium">{info.dentro} nesta placa</span>
          {info.placas > 1 && <> · {info.placas} placas no total</>}
          {info.fora > 0 && <> · {info.fora} na próxima</>}
          {info.impossiveis > 0 && <> · {info.impossiveis} não cabe(m) nesta máquina</>}
        </Alerta>
      )}
    </>
  );
}

function Pecas() {
  const m = useModelo();
  const selecionada = useInterface((x) => x.selecionada);
  const selecionar = useInterface((x) => x.selecionar);

  return (
    <>
      <ul className="-mx-2 space-y-0.5">
        {m.letras.map((l) => {
          const b = regionBounds(l.part.contorno);
          const sel = selecionada === l.chave;
          return (
            <li key={l.chave}>
              <div
                className={cx(
                  'group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                  sel ? 'bg-acento/10 ring-1 ring-acento/40' : 'hover:bg-superficie-3'
                )}
              >
                <button
                  type="button"
                  onClick={() => selecionar(sel ? null : l.chave)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="w-6 shrink-0 text-center text-base font-semibold text-texto">{l.nome}</span>
                  <span className="tabular min-w-0 flex-1 truncate font-mono text-micro text-texto-3">
                    {formatarNumero(b.w)}×{formatarNumero(b.h)}
                  </span>
                  {/* As duas maquinas lado a lado: o que decide e QUAL serve. */}
                  {IMPRESSORAS.map((mq) => {
                    const cabe = caberNaMesa(l.part.contorno, l.part.alturaZ, mq).cabe;
                    return (
                      <Selo key={mq.id} tom={cabe ? 'sucesso' : 'perigo'}>
                        {mq.nome.replace('Bambu Lab ', '')}
                      </Selo>
                    );
                  })}
                </button>
                <BotaoIcone icone={IconeBaixar} rotulo={`Baixar STL da peça ${l.nome}`} tamanho="sm" onClick={() => baixarSTL(m, l)} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Orientacao() {
  const m = useModelo();
  const virar = useProjeto((x) => x.virar);
  const definir = useProjeto((x) => x.definir);
  return (
    <>
      <Alerta tom="acento">{m.orientacao.texto}</Alerta>
      {m.orientacao.podeVirar && (
        <Interruptor
          rotulo="Virar a peça na mesa"
          dica="O lado que encosta na mesa sai mais liso. Com as duas faces iguais, a escolha é sua."
          valor={virar}
          set={(v) => definir('virar', v)}
        />
      )}
    </>
  );
}
