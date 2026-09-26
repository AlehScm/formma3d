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
  IconeAbrir,
  Dica,
} from '@/components/ui';
import { IMPRESSORAS, MANUAL, caberNaMesa } from '@/lib/print/impressoras';
import { regionBounds, type Region } from '@/lib/geom/region';
import { useProjeto } from '@/store/projeto';
import { placaDe, useInterface } from '@/store/interface';
import { useModelo } from '@/modelo/Modelo';
import { arrumarNaPlaca } from '@/features/acoes/arranjo';
import { baixarObjeto, baixarPlaca3MF, baixarPlacaSTL, baixarSTL, baixarTodasAsPlacas } from '@/features/acoes/exportar';

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
  const placas = useInterface((x) => x.placas);
  const vista = useInterface((x) => x.placaVista);
  const naVista = placas[vista]?.size ?? 0;

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
        <Botao icone={IconeArrumar} largura disabled={!m.letras.length && !m.objetos.length} onClick={() => arrumarNaPlaca(m)}>
          Arrumar na placa
        </Botao>
        {info && <BotaoIcone icone={IconeDesfazer} rotulo="Voltar à posição do letreiro" onClick={limpar} />}
      </div>
      {info && (
        <Alerta tom={info.impossiveis > 0 ? 'perigo' : placas.length > 1 ? 'atencao' : 'sucesso'}>
          {placas.length > 1 ? (
            <span className="font-medium">
              Não cabe tudo de uma vez: são {placas.length} impressões. Troque de placa em cima do 3D.
            </span>
          ) : (
            <span className="font-medium">Tudo numa placa só: uma impressão.</span>
          )}
          {info.impossiveis > 0 && <> {info.impossiveis} peça(s) maior(es) que a mesa ficam de fora, em vermelho.</>}
        </Alerta>
      )}
      {info && naVista > 0 && (
        // A placa sai num arquivo so, com as pecas onde estao na tela.
        <div className="space-y-1.5 border-t border-borda pt-3">
          <p className="text-mini font-semibold uppercase tracking-wider text-texto-2">
            Baixar a placa {placas.length > 1 ? `${vista + 1} de ${placas.length}` : ''} · {naVista} peça(s)
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <Dica conteudo="Formato do Bambu Studio: cada peça continua um objeto separado, na posição do arranjo">
              <Botao icone={IconeBaixar} largura variante="primario" onClick={() => void baixarPlaca3MF(m, vista)}>
                3MF
              </Botao>
            </Dica>
            <Dica conteudo="Todas as peças numa malha só, já posicionadas">
              <Botao icone={IconeBaixar} largura onClick={() => baixarPlacaSTL(m, vista)}>
                STL
              </Botao>
            </Dica>
          </div>
          {placas.length > 1 && (
            <Botao icone={IconeBaixar} largura variante="fantasma" onClick={() => void baixarTodasAsPlacas(m)}>
              Todas as {placas.length} placas (.zip)
            </Botao>
          )}
        </div>
      )}
    </>
  );
}

interface ItemPeca {
  chave: string;
  nome: string;
  contorno: Region;
  alturaZ: number;
  stl: boolean;
  baixar: () => void;
}

function Pecas() {
  const m = useModelo();
  const placas = useInterface((x) => x.placas);
  const abrirDesenho = useInterface((x) => x.abrirDesenho);

  // Letras do letreiro e objetos STL na mesma lista: dividem a mesma placa.
  const itens: ItemPeca[] = [
    ...m.letras.map((l) => ({ chave: l.chave, nome: l.nome, contorno: l.part.contorno, alturaZ: l.part.alturaZ, stl: false, baixar: () => baixarSTL(m, l) })),
    ...m.objetos.map((o) => ({ chave: o.chave, nome: o.nome, contorno: o.contorno, alturaZ: o.alturaZ, stl: true, baixar: () => baixarObjeto(o) })),
  ];

  // Depois de arrumar, a lista segue as placas: da para ver o que sai em cada impressao.
  const grupos: { titulo: string; placa?: number; itens: ItemPeca[] }[] = placas.length
    ? [
        ...placas.map((p, i) => ({ titulo: `Placa ${i + 1}`, placa: i, itens: itens.filter((it) => p.has(it.chave)) })),
        { titulo: 'Fora das placas', itens: itens.filter((it) => placaDe(placas, it.chave) < 0) },
      ].filter((g) => g.itens.length)
    : [{ titulo: '', itens }];

  return (
    <>
      <p className="text-mini text-texto-3">Clique numa peça para vê-la no 3D e mexer nela.</p>
      {grupos.map((g) => (
        <GrupoPecas key={g.titulo || 'todas'} {...g} />
      ))}
      <div className="space-y-1.5 border-t border-borda pt-3">
        <Botao icone={IconeAbrir} largura onClick={() => abrirDesenho(false)}>
          Importar STL
        </Botao>
        <p className="text-mini text-texto-3">
          Objeto 3D pronto: divide a placa com o letreiro, mas não vira letra caixa e não entra no orçamento.
        </p>
      </div>
    </>
  );
}

function GrupoPecas({ titulo, placa, itens }: { titulo: string; placa?: number; itens: ItemPeca[] }) {
  const selecionada = useInterface((x) => x.selecionada);
  const selecionar = useInterface((x) => x.selecionar);
  const vista = useInterface((x) => x.placaVista);
  const verPlaca = useInterface((x) => x.verPlaca);

  return (
    <div className="space-y-1">
      {titulo && (
        <button
          type="button"
          onClick={() => placa !== undefined && verPlaca(placa)}
          disabled={placa === undefined}
          className={cx(
            'flex w-full items-center justify-between rounded px-1 text-left text-mini font-semibold uppercase tracking-wider',
            placa === undefined ? 'text-perigo' : placa === vista ? 'text-acento' : 'text-texto-2 hover:text-texto'
          )}
        >
          <span>
            {titulo}
            {placa === vista && ' · na tela'}
          </span>
          <span className="tabular font-mono normal-case tracking-normal text-texto-3">{itens.length}</span>
        </button>
      )}
      <ul className="-mx-2 space-y-0.5">
        {itens.map((it) => {
          const b = regionBounds(it.contorno);
          const sel = selecionada === it.chave;
          return (
            <li key={it.chave}>
              <div
                className={cx(
                  'group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                  sel ? 'bg-acento/15 ring-1 ring-acento' : 'hover:bg-superficie-3'
                )}
              >
                <button
                  type="button"
                  aria-pressed={sel}
                  onClick={() => selecionar(sel ? null : it.chave)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                >
                  {it.stl ? (
                    <span className="min-w-0 max-w-24 truncate text-base font-medium text-texto" title={it.nome}>
                      {it.nome}
                    </span>
                  ) : (
                    <span className="w-8 shrink-0 text-center text-base font-semibold text-texto">{it.nome}</span>
                  )}
                  <span className="tabular min-w-0 flex-1 truncate font-mono text-micro text-texto-3">
                    {formatarNumero(b.w)}×{formatarNumero(b.h)}
                  </span>
                  {/* As duas maquinas lado a lado: o que decide e QUAL serve. */}
                  {IMPRESSORAS.map((mq) => {
                    const cabe = caberNaMesa(it.contorno, it.alturaZ, mq).cabe;
                    return (
                      <Selo key={mq.id} tom={cabe ? 'sucesso' : 'perigo'}>
                        {mq.nome.replace('Bambu Lab ', '')}
                      </Selo>
                    );
                  })}
                </button>
                <BotaoIcone icone={IconeBaixar} rotulo={`Baixar STL de ${it.nome}`} tamanho="sm" onClick={it.baixar} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
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
