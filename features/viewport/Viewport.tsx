'use client';

import dynamic from 'next/dynamic';
import {
  Balao,
  BarraFerramentas,
  Botao,
  BotaoIcone,
  CampoNumero,
  Interruptor,
  Separador,
  Vazio,
  IconeAbrir,
  IconeCamadas,
  IconeEnquadrar,
  IconeGirar,
  IconeMontagem,
  IconeMover,
  IconeSelecionar,
  IconeTamanho,
  IconeTexto,
  formatarNumero,
  type Icone,
} from '@/components/ui';
import { CORES, LEGENDA } from '@/components/Viewer3D';
import { useModelo } from '@/modelo/Modelo';
import { useProjeto } from '@/store/projeto';
import { useInterface, type Ferramenta } from '@/store/interface';
import { SEM_EDICAO } from '@/lib/geom/pecaEditada';

// O canvas WebGL nao pode ser renderizado no servidor.
const Viewer3D = dynamic(() => import('@/components/Viewer3D'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-base text-texto-3">carregando 3D…</div>,
});

const GIZMO: Record<Ferramenta, 'nenhuma' | 'mover' | 'girar' | 'escalar'> = {
  selecionar: 'nenhuma',
  mover: 'mover',
  girar: 'girar',
  tamanho: 'escalar',
};

/**
 * O 3D e o que fica em volta dele.
 *
 * Regra do sistema: o viewport tem so tres zonas -- contexto no topo-esquerdo,
 * ferramentas na base-centro, status na barra de baixo (fora do 3D). Nada mais
 * flutua em cima do desenho.
 */
export function Viewport({ pedidoEnquadrar, onEnquadrar }: { pedidoEnquadrar: number; onEnquadrar: () => void }) {
  const m = useModelo();
  const espaco = useInterface((s) => s.espaco);
  const selecionada = useInterface((s) => s.selecionada);
  const selecionar = useInterface((s) => s.selecionar);
  const ferramenta = useInterface((s) => s.ferramenta);
  const setFerramenta = useInterface((s) => s.setFerramenta);
  const explode = useInterface((s) => s.explode);
  const setExplode = useInterface((s) => s.setExplode);
  const camadas = useInterface((s) => s.camadas);
  const setCamadas = useInterface((s) => s.setCamadas);
  const arranjo = useInterface((s) => s.arranjo);
  const sobraram = useInterface((s) => s.sobraram);
  const posicionarNoArranjo = useInterface((s) => s.posicionarNoArranjo);
  const abrirDesenho = useInterface((s) => s.abrirDesenho);
  const profundidade = useProjeto((s) => s.profundidade);
  const editarPeca = useProjeto((s) => s.editarPeca);

  const naPlaca = espaco === 'imprimir';

  if (!m.letras.length || !m.bounds) {
    return (
      <div className="flex h-full items-center justify-center">
        <Vazio
          icone={IconeTexto}
          titulo="Nada para mostrar ainda"
          acao={
            <Botao icone={IconeAbrir} onClick={abrirDesenho}>
              Abrir desenho .ai ou .pdf
            </Botao>
          }
        >
          Digite o texto do letreiro em Desenhar › Origem, ou abra um desenho do Corel ou do Illustrator.
        </Vazio>
      </div>
    );
  }

  // Tamanho so existe em Desenhar: muda o produto. Na placa o gizmo so acomoda.
  const ferramentas: [Ferramenta, Icone, string, string][] = [
    ['selecionar', IconeSelecionar, 'Selecionar', 'V'],
    ['mover', IconeMover, naPlaca ? 'Mover na placa' : 'Mover a peça', 'G'],
    ['girar', IconeGirar, naPlaca ? 'Girar na placa' : 'Girar a peça', 'R'],
    ...(naPlaca ? [] : ([['tamanho', IconeTamanho, 'Tamanho da peça — muda o produto', 'S']] as [Ferramenta, Icone, string, string][])),
  ];

  return (
    <div className="relative h-full">
      <Viewer3D
        letras={m.letras}
        largura={m.bounds.w}
        altura={m.bounds.h}
        profundidade={profundidade}
        centro={[m.bounds.w / 2, m.bounds.h / 2]}
        explode={explode}
        camadas={camadas}
        mesa={naPlaca ? { x: m.mesa.x, y: m.mesa.y } : null}
        naoCabem={m.naoCabem}
        arranjo={naPlaca ? arranjo : new Map()}
        sobraram={naPlaca ? sobraram : []}
        selecionada={selecionada}
        onSelecionar={selecionar}
        ferramenta={selecionada ? GIZMO[ferramenta] : 'nenhuma'}
        pedidoEnquadrar={pedidoEnquadrar}
        // Na placa a transformacao so acomoda: nao toca no produto.
        onArranjar={(_, c) => posicionarNoArranjo(c)}
        onTransformar={(chave, t) => {
          // No letreiro ela entra na Region e muda chapa, gabarito e preco.
          const a = useProjeto.getState().edicoes.get(chave) ?? SEM_EDICAO;
          editarPeca(chave, { dx: a.dx + t.dx, dy: a.dy + t.dy, giro: a.giro + t.giro, ex: a.ex * t.ex, ey: a.ey * t.ey });
        }}
      />

      {/* Zona 1: contexto. */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-borda bg-flutuante/90 px-2.5 py-1.5 text-mini text-texto-2 backdrop-blur">
        {naPlaca ? (
          <>
            Placa · <span className="text-texto">{m.mesa.nome.replace('Bambu Lab ', '')}</span>{' '}
            <span className="tabular font-mono text-texto-3">
              {formatarNumero(m.mesa.x)}×{formatarNumero(m.mesa.y)} mm
            </span>
          </>
        ) : (
          <>Letreiro montado</>
        )}
      </div>

      {/* Zona 2: ferramentas. */}
      <div className="absolute bottom-3 left-1/2 z-[var(--z-barra)] -translate-x-1/2">
        <BarraFerramentas rotulo="Ferramentas do 3D">
          {ferramentas.map(([id, I, rotulo, atalho]) => (
            <BotaoIcone
              key={id}
              icone={I}
              rotulo={id !== 'selecionar' && !selecionada ? `${rotulo} (selecione uma peça)` : rotulo}
              atalho={atalho}
              ativo={ferramenta === id}
              onClick={() => setFerramenta(id)}
            />
          ))}
          <Separador />
          <Balao
            lado="top"
            largura="w-64"
            gatilho={<BotaoIcone icone={IconeCamadas} rotulo="Camadas e legenda" />}
          >
            <p className="mb-2 text-mini font-semibold uppercase tracking-wider text-texto-2">Mostrar</p>
            <div className="space-y-1">
              <Interruptor rotulo="Letra / corpo" valor={camadas.corpo} set={(v) => setCamadas({ ...camadas, corpo: v })} />
              {m.temChapa && <Interruptor rotulo="Chapa" valor={camadas.chapa} set={(v) => setCamadas({ ...camadas, chapa: v })} />}
              {m.rolesUsados.has('traseira') && (
                <Interruptor rotulo="Fundo" valor={camadas.traseira} set={(v) => setCamadas({ ...camadas, traseira: v })} />
              )}
            </div>
            <p className="mb-2 mt-4 text-mini font-semibold uppercase tracking-wider text-texto-2">Legenda</p>
            <ul className="space-y-1.5">
              {LEGENDA.filter(([r]) => m.rolesUsados.has(r)).map(([r, nome]) => (
                <li key={r} className="flex items-center gap-2.5 text-mini text-texto-2">
                  <span className="size-3 rounded-sm" style={{ background: CORES[r].cor }} />
                  {nome}
                </li>
              ))}
            </ul>
          </Balao>
          {m.temChapa && (
            <Balao lado="top" largura="w-64" gatilho={<BotaoIcone icone={IconeMontagem} rotulo="Montagem" ativo={explode > 0} />}>
              <CampoNumero
                rotulo="Afastar a chapa"
                dica="Separa a chapa do corpo para conferir o encaixe"
                valor={explode}
                set={setExplode}
                min={0}
                max={Math.max(40, profundidade * 2)}
                passo={1}
              />
            </Balao>
          )}
          <BotaoIcone icone={IconeEnquadrar} rotulo="Enquadrar" atalho="F" onClick={onEnquadrar} />
        </BarraFerramentas>
      </div>
    </div>
  );
}
