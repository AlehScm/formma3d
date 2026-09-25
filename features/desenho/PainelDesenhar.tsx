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
  IconeEstilo,
  IconeMedidas,
  IconeChapa,
  IconeAcabamento,
  Selecao,
  cx,
  formatarNumero,
  IconeAbrir,
  IconeFechar,
  IconeTexto,
} from '@/components/ui';
import { CorteApoio } from '@/components/CorteApoio';
import { APOIOS, FECHAMENTOS, PRESETS, type Apoio, type Fechamento, type PresetId } from '@/lib/geom/modes';
import { FONTES_WEB } from '@/lib/text/fontes';
import type { ModoSeparacao, ModoTraco } from '@/lib/import/pecas';
import { useProjeto } from '@/store/projeto';
import { useInterface } from '@/store/interface';
import { useModelo } from '@/modelo/Modelo';
import { buscarFonteDoTexto, listarFontesDoPC, trocarFonteWeb, trocarPagina, usarFonteDoPC } from '@/features/acoes/origem';
import { chaveFonte } from '@/lib/import/texto-em-curvas';

/**
 * Area Desenhar: o que o letreiro E.
 *
 * Ordem das secoes = ordem em que se pensa o trabalho: de onde vem o desenho, que
 * estilo tem, que tamanho, como a chapa encaixa, e os acabamentos. As tres
 * primeiras abrem por padrao; as outras mostram o resumo fechadas.
 */
export function PainelDesenhar() {
  const m = useModelo();
  const categoria = useInterface((x) => x.categoria.desenhar);
  const setCategoria = useInterface((x) => x.setCategoria);
  const r = useResumos();

  const categorias: Categoria[] = [
    { id: 'origem', nome: 'Origem', icone: IconeTexto, resumo: r.origem, alerta: r.alertaOrigem, conteudo: <Origem /> },
    { id: 'estilo', nome: 'Estilo', icone: IconeEstilo, resumo: r.estilo, conteudo: <Estilo /> },
    { id: 'medidas', nome: 'Medidas', icone: IconeMedidas, resumo: r.medidas, conteudo: <Medidas /> },
    // Chapa so existe com chapa: sumir e melhor que mostrar controles que nao fazem nada.
    ...(m.temChapa ? [{ id: 'chapa', nome: 'Chapa', icone: IconeChapa, resumo: r.chapa, conteudo: <Chapa /> }] : []),
    { id: 'acabamento', nome: 'Acabamento', icone: IconeAcabamento, resumo: r.acabamento, conteudo: <Acabamento /> },
  ];

  return (
    <Categorias
      rotulo="Configurações de Desenhar"
      categorias={categorias}
      ativa={categoria}
      setAtiva={(id) => setCategoria('desenhar', id)}
    />
  );
}

/**
 * A linha de resumo de cada categoria: aparece na dica da aba e no cabecalho.
 * Calculada num hook so, sempre, para a ordem dos hooks nao depender de qual
 * categoria esta visivel.
 */
function useResumos() {
  const s = useProjeto(
    useShallow((x) => ({
      imp: x.imp,
      texto: x.texto,
      fonteNome: x.fonteNome,
      erro: x.erro,
      presetAtivo: x.presetAtivo,
      altura: x.altura,
      impAltura: x.impAltura,
      profundidade: x.profundidade,
      frente: x.frente,
      frenteEsp: x.frenteEsp,
      traseira: x.traseira,
      traseiraEsp: x.traseiraEsp,
      apoio: x.apoio,
      comLed: x.comLed,
      espacadores: x.espacadores,
      macica: x.macica,
      biselAtivo: x.biselAtivo,
    }))
  );
  const m = useModelo();
  const fontesTexto = useProjeto((x) => x.fontesTexto);
  // Texto vivo esperando a fonte: ha desenho faltando, o ponto na aba avisa.
  const textoPendente = (s.imp?.desenho.textos ?? []).some((t) => !fontesTexto.has(chaveFonte(t.fonte)));

  const alt = s.imp ? s.impAltura : s.altura;
  const esp = s.frente === 'chapa' ? s.frenteEsp : s.traseiraEsp;
  const extras = [
    s.comLed && 'LED',
    !s.macica && s.traseira === 'aberta' && s.espacadores > 0 && `${s.espacadores} espaçadores`,
    s.macica && s.biselAtivo && 'chanfro',
  ].filter(Boolean);

  return {
    origem: s.imp ? `${s.imp.nomeArquivo} · ${m.nomesImportados.length} peças` : `“${s.texto}” · ${s.fonteNome}`,
    alertaOrigem: s.erro
      ? ('perigo' as const)
      : s.imp?.avisos.length || textoPendente
        ? ('atencao' as const)
        : undefined,
    estilo: s.presetAtivo ? PRESETS[s.presetAtivo].nome : m.desc,
    medidas: `${formatarNumero(alt)} mm · prof. ${formatarNumero(s.profundidade)} mm`,
    chapa: `${formatarNumero(esp, 1)} mm · apoio ${APOIOS[s.apoio].curto.toLowerCase()}`,
    acabamento: extras.length ? extras.join(' · ') : 'nenhum',
  };
}

const FECHAMENTO_OPCOES = (Object.keys(FECHAMENTOS) as Fechamento[]).map((k) => ({
  valor: k,
  nome: FECHAMENTOS[k].nome,
  dica: FECHAMENTOS[k].desc,
}));

/* ------------------------------------------------------------------ origem */

function Origem() {
  const s = useProjeto(
    useShallow((x) => ({
      imp: x.imp,
      texto: x.texto,
      fonteNome: x.fonteNome,
      fontesSistema: x.fontesSistema,
      erro: x.erro,
      impModo: x.impModo,
      impFundir: x.impFundir,
      impTracos: x.impTracos,
      impDesativadas: x.impDesativadas,
    }))
  );
  const definir = useProjeto((x) => x.definir);
  const fecharImport = useProjeto((x) => x.fecharImport);
  const alternar = useProjeto((x) => x.alternarPecaImportada);
  const abrirDesenho = useInterface((x) => x.abrirDesenho);
  const abrirFonte = useInterface((x) => x.abrirFonte);
  const nomes = useModelo().nomesImportados;

  const fonteWeb = FONTES_WEB.find((f) => f.nome === s.fonteNome);

  return (
    <>
      {s.imp ? (
        <>
          {/* Arquivo aberto: cartao do arquivo + como separar as pecas. */}
          <div className="flex items-start gap-2 rounded-md border border-borda bg-superficie-2 p-2.5">
            <IconeAbrir className="mt-0.5 size-4 shrink-0 text-acento-forte" strokeWidth={1.8} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium text-texto" title={s.imp.nomeArquivo}>
                {s.imp.nomeArquivo}
              </p>
              <p className="tabular font-mono text-micro text-texto-3">
                {formatarNumero(s.imp.conteudoMm.w)} × {formatarNumero(s.imp.conteudoMm.h)} mm · {nomes.length} peças
              </p>
            </div>
            <BotaoIcone icone={IconeFechar} rotulo="Fechar o arquivo e voltar ao texto" tamanho="sm" onClick={fecharImport} />
          </div>

          {s.imp.avisos.map((a) => (
            <Alerta key={a.codigo}>{a.msg}</Alerta>
          ))}

          <TextosVivos />

          {s.imp.paginas > 1 && (
            <CampoNumero
              rotulo="Página / prancheta"
              valor={s.imp.pagina}
              set={(v) => void trocarPagina(Math.round(v))}
              min={1}
              max={s.imp.paginas}
              passo={1}
              unidade={`de ${s.imp.paginas}`}
              layout="linha"
            />
          )}

          <Selecao<ModoSeparacao>
            rotulo="Separar peças por"
            valor={s.impModo}
            set={(v) => definir('impModo', v)}
            opcoes={[
              { valor: 'forma', nome: 'Cada forma solta' },
              { valor: 'objeto', nome: 'Objetos do arquivo' },
              ...(s.imp.desenho.camadas.length > 1 ? [{ valor: 'camada' as const, nome: 'Camadas do arquivo' }] : []),
            ]}
          />

          {s.imp.desenho.temStroke && (
            <Segmentado<ModoTraco>
              rotulo="Traço sem preenchimento"
              dica="Contorno fechado costuma ser o limite da peça; linha solta, guia ou corte."
              valor={s.impTracos}
              set={(v) => definir('impTracos', v)}
              opcoes={[
                { valor: 'ignorar', nome: 'Ignorar', dica: 'Traço solto costuma ser linha de corte, guia ou registro' },
                { valor: 'preencher', nome: 'Preencher', dica: 'Contorno fechado é o limite da peça: vale a área que ele cerca' },
                { valor: 'engrossar', nome: 'Engrossar', dica: 'Vira fita da largura da linha, como o Expandir do Illustrator' },
              ]}
            />
          )}

          {nomes.length > 0 && (
            <div>
              <p className="mb-1.5 text-base text-texto-2">
                Peças <span className="text-texto-3">({nomes.length - s.impDesativadas.size} ativas)</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {nomes.map((n) => {
                  const ativa = !s.impDesativadas.has(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => alternar(n)}
                      aria-pressed={ativa}
                      title={ativa ? 'Desligar esta peça' : 'Ligar esta peça'}
                      className={cx(
                        'h-6 rounded-sm border px-1.5 font-mono text-micro transition-colors',
                        ativa ? 'border-acento/40 bg-acento/15 text-acento-forte' : 'border-borda text-texto-3 line-through'
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <MaisOpcoes>
            <CampoNumero
              rotulo="Juntar peças próximas"
              dica="Une acentos e o pingo do i à letra. 0 desliga."
              valor={s.impFundir}
              set={(v) => definir('impFundir', v)}
              min={0}
              max={30}
              passo={0.5}
            />
          </MaisOpcoes>
        </>
      ) : (
        <>
          <input
            value={s.texto}
            onChange={(e) => definir('texto', e.target.value)}
            placeholder="Digite o letreiro"
            aria-label="Texto do letreiro"
            className="h-10 w-full rounded-md border border-borda bg-superficie-2 px-3 text-grande font-semibold tracking-wide text-texto outline-none transition-colors hover:border-borda-forte focus:border-acento"
          />
          <Selecao
            rotulo="Fonte"
            valor={fonteWeb?.id ?? ''}
            vazio={fonteWeb ? undefined : `${s.fonteNome} (carregada)`}
            set={(id) => void trocarFonteWeb(id)}
            opcoes={FONTES_WEB.map((f) => ({ valor: f.id, nome: f.nome }))}
          />
          {s.fontesSistema.fontes.length > 0 && (
            <Selecao
              valor=""
              vazio={`${s.fontesSistema.fontes.length} fontes do computador…`}
              set={(id) => {
                const f = s.fontesSistema.fontes.find((x) => x.id === id);
                if (f) void usarFonteDoPC(f);
              }}
              opcoes={s.fontesSistema.fontes.map((f) => ({ valor: f.id, nome: f.nome }))}
            />
          )}
          <div className="flex gap-1.5">
            <Botao tamanho="sm" onClick={abrirFonte} title="Carregar um .ttf ou .otf do computador">
              Fonte .ttf
            </Botao>
            <Botao tamanho="sm" onClick={() => void listarFontesDoPC()} title="Usar as fontes instaladas no Windows">
              Fontes do PC
            </Botao>
          </div>
          <div className="flex items-center gap-2 border-t border-borda pt-3">
            <IconeTexto className="size-4 text-texto-3" aria-hidden />
            <span className="flex-1 text-mini text-texto-3">Tem o desenho pronto?</span>
            <Botao tamanho="sm" variante="fantasma" icone={IconeAbrir} onClick={abrirDesenho}>
              Abrir .ai / .pdf
            </Botao>
          </div>
        </>
      )}
      {s.erro && <Alerta tom="perigo">{s.erro}</Alerta>}
    </>
  );
}

/**
 * Texto vivo do arquivo: o CorelDRAW exportou sem converter em curvas. O arquivo
 * guarda o texto, a fonte, o corpo e a posicao -- so falta a fonte, que o usuario da.
 */
function TextosVivos() {
  const textos = useProjeto((x) => x.imp?.desenho.textos) ?? [];
  const fontesTexto = useProjeto((x) => x.fontesTexto);
  const abrirFonteTexto = useInterface((x) => x.abrirFonteTexto);
  if (!textos.length) return null;

  return (
    <>
      {textos.map((t, i) => {
        const legivel = t.texto.replace(/\s+/g, ' ').trim();
        const pronto = fontesTexto.has(chaveFonte(t.fonte));
        return pronto ? (
          <Alerta key={i} tom="sucesso">
            Texto “{legivel}” desenhado com a fonte {t.fonte}.
          </Alerta>
        ) : (
          <Alerta
            key={i}
            tom="atencao"
            titulo={`Texto “${legivel}” não aparece ainda`}
            acao={
              <div className="flex flex-wrap gap-1.5">
                <Botao tamanho="sm" variante="primario" onClick={() => void buscarFonteDoTexto(t.fonte)}>
                  Usar a fonte do computador
                </Botao>
                <Botao tamanho="sm" onClick={() => abrirFonteTexto(t.fonte)}>
                  Carregar .ttf
                </Botao>
              </div>
            }
          >
            Ele veio como texto, não como curva, na fonte <strong className="text-texto">{t.fonte}</strong>. O arquivo
            guarda o tamanho e a posição; com a fonte, o app desenha as letras no lugar certo.
          </Alerta>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ estilo */

function Estilo() {
  const s = useProjeto(
    useShallow((x) => ({
      presetAtivo: x.presetAtivo,
      macica: x.macica,
      frente: x.frente,
      frenteEsp: x.frenteEsp,
      traseira: x.traseira,
      traseiraEsp: x.traseiraEsp,
    }))
  );
  const definir = useProjeto((x) => x.definir);
  const aplicarPreset = useProjeto((x) => x.aplicarPreset);

  return (
    <>
      {/* Os estilos so PREENCHEM os controles abaixo: qualquer combinacao continua alcancavel. */}
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(PRESETS) as PresetId[]).map((k) => {
          const ativo = s.presetAtivo === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => aplicarPreset(k)}
              aria-pressed={ativo}
              title={PRESETS[k].desc}
              className={cx(
                'rounded-md border px-2.5 py-2 text-left transition-colors',
                ativo ? 'border-acento bg-acento/10' : 'border-borda bg-superficie-2 hover:border-borda-forte'
              )}
            >
              <span className={cx('block text-mini font-medium leading-snug', ativo ? 'text-acento-forte' : 'text-texto')}>
                {PRESETS[k].nome}
              </span>
            </button>
          );
        })}
      </div>

      <Segmentado<'oca' | 'macica'>
        rotulo="Miolo"
        valor={s.macica ? 'macica' : 'oca'}
        set={(v) => {
          definir('macica', v === 'macica');
          definir('presetAtivo', null);
        }}
        opcoes={[
          { valor: 'oca', nome: 'Oca', dica: 'Com parede e vão por dentro' },
          { valor: 'macica', nome: 'Maciça', dica: 'Bloco cheio, sem vão' },
        ]}
      />

      {!s.macica && (
        <>
          <Segmentado<Fechamento>
            rotulo="Frente"
            dica="O lado virado para quem olha"
            valor={s.frente}
            set={(v) => {
              definir('frente', v);
              definir('presetAtivo', null);
            }}
            opcoes={FECHAMENTO_OPCOES}
          />
          {s.frente !== 'aberta' && (
            <CampoNumero
              rotulo={s.frente === 'chapa' ? 'Espessura da chapa' : 'Espessura da face'}
              valor={s.frenteEsp}
              set={(v) => definir('frenteEsp', v)}
              min={0.4}
              max={12}
              passo={s.frente === 'chapa' ? 0.5 : 0.1}
              layout="linha"
            />
          )}
          <Segmentado<Fechamento>
            rotulo="Fundo"
            dica="O lado que encosta na parede"
            valor={s.traseira}
            set={(v) => {
              definir('traseira', v);
              definir('presetAtivo', null);
            }}
            opcoes={FECHAMENTO_OPCOES}
          />
          {s.traseira !== 'aberta' && (
            <CampoNumero
              rotulo={s.traseira === 'chapa' ? 'Espessura da chapa' : 'Espessura do fundo'}
              valor={s.traseiraEsp}
              set={(v) => definir('traseiraEsp', v)}
              min={0.4}
              max={12}
              passo={s.traseira === 'chapa' ? 0.5 : 0.1}
              layout="linha"
            />
          )}
        </>
      )}
    </>
  );
}

/* ----------------------------------------------------------------- medidas */

function Medidas() {
  const s = useProjeto(
    useShallow((x) => ({
      imp: x.imp !== null,
      altura: x.altura,
      impAltura: x.impAltura,
      tracking: x.tracking,
      profundidade: x.profundidade,
      parede: x.parede,
    }))
  );
  const definir = useProjeto((x) => x.definir);

  return (
    <>
      {s.imp ? (
        <CampoNumero
          rotulo="Altura total"
          dica="Altura do desenho inteiro montado"
          valor={s.impAltura}
          set={(v) => definir('impAltura', v)}
          min={10}
          max={3000}
          passo={1}
        />
      ) : (
        <>
          <CampoNumero
            rotulo="Altura das maiúsculas"
            dica="A medida que o cliente pede"
            valor={s.altura}
            set={(v) => definir('altura', v)}
            min={10}
            max={600}
            passo={1}
          />
          <CampoNumero
            rotulo="Espaço entre letras"
            valor={s.tracking}
            set={(v) => definir('tracking', v)}
            min={-30}
            max={80}
            passo={1}
          />
        </>
      )}
      <CampoNumero
        rotulo="Profundidade"
        dica="Espessura da letra, da frente ao fundo"
        valor={s.profundidade}
        set={(v) => definir('profundidade', v)}
        min={2}
        max={150}
        passo={1}
      />
      <MaisOpcoes>
        <CampoNumero
          rotulo="Parede"
          dica="Espessura da lateral da letra oca"
          valor={s.parede}
          set={(v) => definir('parede', v)}
          min={0.4}
          max={12}
          passo={0.1}
        />
      </MaisOpcoes>
    </>
  );
}

/* ------------------------------------------------------------------- chapa */

function Chapa() {
  const s = useProjeto(
    useShallow((x) => ({
      apoio: x.apoio,
      chapaModo: x.chapaModo,
      borda: x.borda,
      bordaCompensa: x.bordaCompensa,
      labio: x.labio,
      batente: x.batente,
      folga: x.folga,
      frente: x.frente,
      frenteEsp: x.frenteEsp,
      traseiraEsp: x.traseiraEsp,
    }))
  );
  const definir = useProjeto((x) => x.definir);
  const areaChapa = useModelo().totais?.areaChapa ?? 0;

  return (
    <>
      <Segmentado<Apoio>
        rotulo="Apoio"
        dica="Como a chapa encosta na peça impressa"
        valor={s.apoio}
        set={(v) => definir('apoio', v)}
        opcoes={(Object.keys(APOIOS) as Apoio[]).map((k) => ({ valor: k, nome: APOIOS[k].curto, dica: APOIOS[k].desc }))}
      />
      <div className="rounded-md border border-borda bg-fundo p-2">
        <CorteApoio apoio={s.apoio} comLabio={s.labio > 0} />
      </div>

      {s.apoio !== 'dentro' && (
        <>
          <CampoNumero
            rotulo="Largura da borda"
            dica="Quanto a peça avança para fora do contorno da letra"
            valor={s.borda}
            set={(v) => definir('borda', v)}
            min={0.4}
            max={30}
            passo={0.1}
          />
          <Interruptor
            rotulo="Medida vale para a peça pronta"
            dica="Com borda a peça fica maior que a arte. Ligado, a arte encolhe para a peça sair na medida pedida."
            valor={s.bordaCompensa}
            set={(v) => definir('bordaCompensa', v)}
          />
        </>
      )}
      {s.apoio === 'dois' && (
        <CampoNumero
          rotulo="Lábio"
          dica="Quanto a borda sobe acima da chapa para travá-la"
          valor={s.labio}
          set={(v) => definir('labio', v)}
          min={0}
          max={8}
          passo={0.1}
          layout="linha"
        />
      )}

      <Segmentado<'cortar' | 'imprimir'>
        rotulo="A chapa é"
        valor={s.chapaModo}
        set={(v) => definir('chapaModo', v)}
        opcoes={[
          { valor: 'cortar', nome: 'Cortada', dica: 'Sai como DXF/SVG para plotter ou router' },
          { valor: 'imprimir', nome: 'Impressa', dica: 'Sai como STL separado, para imprimir em translúcido' },
        ]}
      />

      {areaChapa > 0 && (
        <p className="flex justify-between text-mini text-texto-3">
          Chapa a cortar
          <span className="tabular font-mono text-texto-2">{formatarNumero(areaChapa / 100)} cm²</span>
        </p>
      )}

      <MaisOpcoes>
        <CampoNumero
          rotulo="Batente"
          dica="O degrau interno onde a chapa apoia"
          valor={s.batente}
          set={(v) => definir('batente', v)}
          min={0.5}
          max={10}
          passo={0.1}
          layout="linha"
        />
        <CampoNumero
          rotulo="Folga da chapa"
          dica="Folga lateral para a chapa entrar sem forçar"
          valor={s.folga}
          set={(v) => definir('folga', v)}
          min={0}
          max={2}
          passo={0.05}
          layout="linha"
        />
      </MaisOpcoes>
    </>
  );
}

/* -------------------------------------------------------------- acabamento */

function Acabamento() {
  const s = useProjeto(
    useShallow((x) => ({
      comLed: x.comLed,
      furoFio: x.furoFio,
      espacadores: x.espacadores,
      macica: x.macica,
      frente: x.frente,
      traseira: x.traseira,
      biselAtivo: x.biselAtivo,
      biselTam: x.biselTam,
    }))
  );
  const definir = useProjeto((x) => x.definir);

  const podeFuro = s.comLed && !s.macica && (s.frente === 'impressa' || s.traseira === 'impressa');
  const podeEspacador = !s.macica && s.traseira === 'aberta';


  return (
    <>
      <Interruptor
        rotulo="Leva fita de LED"
        dica="Entra no custo e libera o furo de passagem do fio"
        valor={s.comLed}
        set={(v) => definir('comLed', v)}
      />
      {podeFuro && (
        <CampoNumero
          rotulo="Furo do fio"
          dica="0 desliga o furo"
          valor={s.furoFio}
          set={(v) => definir('furoFio', v)}
          min={0}
          max={20}
          passo={0.5}
          layout="linha"
        />
      )}
      {/* Espacadores apareciam em duas secoes antes; agora so aqui. */}
      {podeEspacador && (
        <CampoNumero
          rotulo="Espaçadores (halo)"
          dica="Afasta a peça da parede para a luz vazar atrás. 0 desliga."
          valor={s.espacadores}
          set={(v) => definir('espacadores', v)}
          min={0}
          max={60}
          passo={1}
          unidade=""
          layout="linha"
        />
      )}
      {s.macica && (
        <>
          <Interruptor rotulo="Chanfro na face" valor={s.biselAtivo} set={(v) => definir('biselAtivo', v)} />
          {s.biselAtivo && (
            <CampoNumero
              rotulo="Tamanho do chanfro"
              valor={s.biselTam}
              set={(v) => definir('biselTam', v)}
              min={0.2}
              max={10}
              passo={0.1}
              layout="linha"
            />
          )}
        </>
      )}
    </>
  );
}
