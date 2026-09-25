'use client';

import type { RefObject } from 'react';
import { Grupo, Num, Check, Sel, Segmentado, Botao, Aviso } from './Campos';
import { PainelImport, type EstadoImport } from './PainelImport';
import { CorteApoio } from './CorteApoio';
import { CORES, LEGENDA, type Camadas } from './Viewer3D';
import type { SecaoId } from './Rail';
import {
  APOIOS,
  FECHAMENTOS,
  PRESETS,
  type Apoio,
  type Role,
  type Fechamento,
  type ChapaModo,
  type PresetId,
} from '@/lib/geom/modes';
import { FILAMENTOS, type CustoCfg, type FilamentoId, type Orcamento, brl } from '@/lib/cost/calc';
import { FONTES_WEB, type ResultadoFontesSistema, type FonteSistema } from '@/lib/text/fontes';
import type { ModoSeparacao, ModoTraco } from '@/lib/import/pecas';

export interface PainelProps {
  secao: SecaoId;

  // --- arquivo e texto ---
  imp: EstadoImport | null;
  texto: string;
  setTexto: (v: string) => void;
  fonteNome: string;
  trocarFonteWeb: (id: string) => void;
  carregando: boolean;
  erro: string | null;
  arquivoRef: RefObject<HTMLInputElement | null>;
  abrirFontesSistema: () => void;
  sistema: ResultadoFontesSistema;
  carregarSistema: (f: FonteSistema) => void;
  impModo: ModoSeparacao;
  setImpModo: (v: ModoSeparacao) => void;
  impAltura: number;
  setImpAltura: (v: number) => void;
  impFundir: number;
  setImpFundir: (v: number) => void;
  impTracos: ModoTraco;
  setImpTracos: (v: ModoTraco) => void;
  impDesativadas: Set<string>;
  alternarPeca: (nome: string) => void;
  setPagina: (n: number) => void;
  fecharImport: () => void;

  // --- estilo: as seis escolhas soltas ---
  macica: boolean;
  setMacica: (v: boolean) => void;
  frente: Fechamento;
  setFrente: (v: Fechamento) => void;
  frenteEsp: number;
  setFrenteEsp: (v: number) => void;
  traseira: Fechamento;
  setTraseira: (v: Fechamento) => void;
  traseiraEsp: number;
  setTraseiraEsp: (v: number) => void;
  chapaModo: ChapaModo;
  setChapaModo: (v: ChapaModo) => void;
  apoio: Apoio;
  setApoio: (v: Apoio) => void;
  comLed: boolean;
  setComLed: (v: boolean) => void;
  espacadores: number;
  setEspacadores: (v: number) => void;
  virar: boolean;
  setVirar: (v: boolean) => void;
  orientacao: string;
  podeVirar: boolean;
  presetAtivo: PresetId | null;
  aplicarPreset: (id: PresetId) => void;

  // --- parametros ---
  altura: number;
  setAltura: (v: number) => void;
  tracking: number;
  setTracking: (v: number) => void;
  profundidade: number;
  setProfundidade: (v: number) => void;
  parede: number;
  setParede: (v: number) => void;
  batente: number;
  setBatente: (v: number) => void;
  borda: number;
  setBorda: (v: number) => void;
  folga: number;
  setFolga: (v: number) => void;
  labio: number;
  setLabio: (v: number) => void;
  bordaCompensa: boolean;
  setBordaCompensa: (v: boolean) => void;
  furoFio: number;
  setFuroFio: (v: number) => void;
  biselAtivo: boolean;
  setBiselAtivo: (v: boolean) => void;
  biselTam: number;
  setBiselTam: (v: number) => void;
  bico: number;
  setBico: (v: number) => void;
  mesaX: number;
  setMesaX: (v: number) => void;
  mesaY: number;
  setMesaY: (v: number) => void;

  // --- camadas ---
  camadas: Camadas;
  setCamadas: (c: Camadas) => void;
  /** Area total da chapa a cortar, em mm2. Muda conforme o apoio. */
  areaChapa: number;
  rolesUsados: Set<Role>;
  temChapa: boolean;
  pecas: { nome: string; w: number; h: number; gramas: number }[];
  baixarSTL: (i: number) => void;
  avisos: string[];

  // --- custos ---
  cfg: CustoCfg;
  setCfg: <K extends keyof CustoCfg>(k: K) => (v: CustoCfg[K]) => void;
  orcamento: Orcamento | null;
  temLed: boolean;

  // --- exportacao ---
  baixarChapaSVG: () => void;
  baixarChapaDXF: () => void;
  baixarGabarito: () => void;
}

export function Paineis(p: PainelProps) {
  if (p.secao === 'arquivo') return <PainelArquivo {...p} />;
  if (p.secao === 'estilo') return <PainelEstilo {...p} />;
  if (p.secao === 'parametros') return <PainelParametros {...p} />;
  if (p.secao === 'camadas') return <PainelCamadas {...p} />;
  return <PainelCustos {...p} />;
}

function PainelArquivo(p: PainelProps) {
  const fonteWeb = FONTES_WEB.find((f) => f.nome === p.fonteNome);
  return (
    <>
      {p.imp ? (
        <PainelImport
          est={p.imp}
          modo={p.impModo}
          setModo={p.setImpModo}
          altura={p.impAltura}
          setAltura={p.setImpAltura}
          fundir={p.impFundir}
          setFundir={p.setImpFundir}
          tracos={p.impTracos}
          setTracos={p.setImpTracos}
          desativadas={p.impDesativadas}
          alternarPeca={p.alternarPeca}
          setPagina={p.setPagina}
          fechar={p.fecharImport}
        />
      ) : (
        <>
          <Grupo titulo="Texto">
            <input
              value={p.texto}
              onChange={(e) => p.setTexto(e.target.value)}
              placeholder="Digite o letreiro"
              className="w-full rounded-md border border-linha bg-fundo px-2.5 py-2 text-grande font-semibold tracking-wide text-tinta outline-none transition focus:border-acento"
            />
          </Grupo>

          <Grupo titulo={`Fonte${p.carregando ? ' (carregando...)' : ''}`}>
            <Sel
              valor={fonteWeb?.id ?? ''}
              set={p.trocarFonteWeb}
              opcoes={[
                ...(fonteWeb ? [] : [{ valor: '' as const, nome: `${p.fonteNome} (carregada)` }]),
                ...FONTES_WEB.map((f) => ({ valor: f.id, nome: f.nome })),
              ]}
            />
            <div className="flex gap-1.5">
              <Botao onClick={() => p.arquivoRef.current?.click()} title="Carregar um .ttf/.otf do computador">
                Abrir .ttf
              </Botao>
              <Botao onClick={p.abrirFontesSistema} title="Usar as fontes ja instaladas no Windows">
                Fontes do PC
              </Botao>
            </div>
            {p.sistema.fontes.length > 0 && (
              <select
                onChange={(e) => {
                  const f = p.sistema.fontes.find((x) => x.id === e.target.value);
                  if (f) p.carregarSistema(f);
                }}
                defaultValue=""
                className="w-full rounded-md border border-linha bg-fundo px-2.5 py-2 text-base text-tinta"
              >
                <option value="">{p.sistema.fontes.length} fontes do PC...</option>
                {p.sistema.fontes.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            )}
          </Grupo>
        </>
      )}
      {p.erro && (
        <Grupo>
          <Aviso>{p.erro}</Aviso>
        </Grupo>
      )}
    </>
  );
}

function PainelEstilo(p: PainelProps) {
  const temChapa = p.frente === 'chapa' || p.traseira === 'chapa';

  const opcoesFechamento = (Object.keys(FECHAMENTOS) as Fechamento[]).map((k) => ({
    valor: k,
    nome: FECHAMENTOS[k].nome,
    dica: FECHAMENTOS[k].desc,
  }));

  return (
    <>
      {/* Os atalhos so PREENCHEM os controles abaixo. Nada aqui trava nada. */}
      <Grupo titulo="Comecar de" dica="Preenche os controles abaixo; depois mude o que quiser">
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(PRESETS) as PresetId[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => p.aplicarPreset(k)}
              title={PRESETS[k].desc}
              className={`rounded-lg border px-2.5 py-2 text-left transition ${
                p.presetAtivo === k ? 'border-acento bg-acento/10 text-acento-forte' : 'border-linha bg-fundo text-tinta hover:border-linha-forte'
              }`}
            >
              <div className="text-mini font-medium leading-snug">{PRESETS[k].nome}</div>
            </button>
          ))}
        </div>
      </Grupo>

      <Grupo titulo="Miolo">
        <Segmentado<'macica' | 'oca'>
          valor={p.macica ? 'macica' : 'oca'}
          set={(v) => p.setMacica(v === 'macica')}
          opcoes={[
            { valor: 'oca', nome: 'Oca', dica: 'Com parede e vao por dentro' },
            { valor: 'macica', nome: 'Macica', dica: 'Bloco cheio, sem vao' },
          ]}
        />
      </Grupo>

      {!p.macica && (
        <>
          <Grupo titulo="Frente" dica="O lado que fica virado para quem olha">
            <Segmentado<Fechamento> valor={p.frente} set={p.setFrente} opcoes={opcoesFechamento} />
            {p.frente !== 'aberta' && (
              <Num
                label={p.frente === 'chapa' ? 'Espessura da chapa' : 'Espessura da face'}
                valor={p.frenteEsp}
                set={p.setFrenteEsp}
                min={0.4}
                max={12}
                step={p.frente === 'chapa' ? 0.5 : 0.1}
              />
            )}
          </Grupo>

          <Grupo titulo="Fundo" dica="O lado que encosta na parede">
            <Segmentado<Fechamento> valor={p.traseira} set={p.setTraseira} opcoes={opcoesFechamento} />
            {p.traseira !== 'aberta' && (
              <Num
                label={p.traseira === 'chapa' ? 'Espessura da chapa' : 'Espessura do fundo'}
                valor={p.traseiraEsp}
                set={p.setTraseiraEsp}
                min={0.4}
                max={12}
                step={p.traseira === 'chapa' ? 0.5 : 0.1}
              />
            )}
          </Grupo>

          {temChapa && (
            <Grupo titulo="Apoio da chapa" dica="Como a chapa encosta na peca impressa">
              <Segmentado<Apoio>
                valor={p.apoio}
                set={p.setApoio}
                opcoes={(Object.keys(APOIOS) as Apoio[]).map((k) => ({
                  valor: k,
                  nome: APOIOS[k].curto,
                  dica: APOIOS[k].desc,
                }))}
              />
              <CorteApoio apoio={p.apoio} comLabio={p.labio > 0} />
              <p className="text-mini leading-relaxed text-tinta-fraca">{APOIOS[p.apoio].desc}</p>
              {p.areaChapa > 0 && (
                <p className="text-mini text-tinta-fraca">
                  Chapa a cortar:{' '}
                  <span className="tabular font-mono text-tinta-media">{(p.areaChapa / 100).toFixed(0)} cm2</span>
                </p>
              )}
              <Segmentado<'cortar' | 'imprimir'>
                label="A chapa e"
                valor={p.chapaModo}
                set={p.setChapaModo}
                opcoes={[
                  { valor: 'cortar', nome: 'Cortada', dica: 'Sai como DXF/SVG para o plotter ou router' },
                  { valor: 'imprimir', nome: 'Impressa', dica: 'Sai como STL separado, para imprimir em translucido' },
                ]}
              />
            </Grupo>
          )}
        </>
      )}

      <Grupo titulo="Extras">
        <Check
          label="Leva fita de LED"
          valor={p.comLed}
          set={p.setComLed}
          dica="Entra no custo e libera o furo de passagem do fio"
        />
        {p.comLed && !p.macica && (p.frente === 'impressa' || p.traseira === 'impressa') && (
          <Num label="Furo do fio" valor={p.furoFio} set={p.setFuroFio} min={0} max={20} step={0.5} dica="0 desliga o furo" />
        )}
        {!p.macica && p.traseira === 'aberta' && (
          <Num
            label="Espacadores (halo)"
            valor={p.espacadores}
            set={p.setEspacadores}
            min={0}
            max={60}
            step={1}
            dica="Afasta a peca da parede para a luz vazar atras. 0 desliga."
          />
        )}
        {p.macica && (
          <>
            <Check label="Chanfro na face" valor={p.biselAtivo} set={p.setBiselAtivo} />
            {p.biselAtivo && <Num label="Tamanho do chanfro" valor={p.biselTam} set={p.setBiselTam} min={0.2} max={10} step={0.1} />}
          </>
        )}
      </Grupo>

      <Grupo titulo="Na mesa de impressao">
        <Aviso tom="info">{p.orientacao}</Aviso>
        {p.podeVirar && (
          <Check
            label="Virar a peca na mesa"
            valor={p.virar}
            set={p.setVirar}
            dica="O lado que encosta na mesa sai mais liso. Com as duas faces iguais, a escolha e sua."
          />
        )}
      </Grupo>
    </>
  );
}

function PainelParametros(p: PainelProps) {
  const temChapa = p.frente === 'chapa' || p.traseira === 'chapa';
  return (
    <>
      <Grupo titulo="Medidas">
        {!p.imp && (
          <>
            <Num label="Altura das maiusculas" valor={p.altura} set={p.setAltura} min={10} max={600} step={1} dica="A medida que o cliente pede" destaque />
            <Num label="Espacamento entre letras" valor={p.tracking} set={p.setTracking} min={-30} max={80} step={1} />
          </>
        )}
        <Num label="Profundidade" valor={p.profundidade} set={p.setProfundidade} min={2} max={150} step={1} destaque />
        <Num label="Parede" valor={p.parede} set={p.setParede} min={0.4} max={12} step={0.1} />
      </Grupo>

      {temChapa && (
        <Grupo titulo="Encaixe da chapa">
          {p.apoio !== 'dentro' && (
            <>
              <Num label="Largura da borda" valor={p.borda} set={p.setBorda} min={0.4} max={30} step={0.1} dica="Quanto a peca avanca para fora do contorno da letra" destaque />
              <Check
                label="A medida vale para a peca pronta"
                valor={p.bordaCompensa}
                set={p.setBordaCompensa}
                dica="Com borda a peca fica maior que a arte. Marcado, a arte encolhe para a peca sair na medida pedida."
              />
            </>
          )}
          {p.apoio === 'dois' && (
            <Num label="Labio (trava a chapa)" valor={p.labio} set={p.setLabio} min={0} max={8} step={0.1} dica="Quanto a borda sobe acima da chapa" />
          )}
          <Num label="Largura do batente" valor={p.batente} set={p.setBatente} min={0.5} max={10} step={0.1} dica="O degrau interno onde a chapa apoia" />
          <Num label="Folga da chapa" valor={p.folga} set={p.setFolga} min={0} max={2} step={0.05} dica="Folga lateral para a chapa entrar sem forcar" />
        </Grupo>
      )}

      <Grupo titulo="Extras">
        {p.comLed && !p.macica && (p.frente === 'impressa' || p.traseira === 'impressa') && (
          <Num label="Furo de passagem do fio" valor={p.furoFio} set={p.setFuroFio} min={0} max={20} step={0.5} dica="0 desliga o furo" />
        )}
        {!p.macica && p.traseira === 'aberta' && (
          <Num label="Espacadores (halo)" valor={p.espacadores} set={p.setEspacadores} min={0} max={60} step={1} dica="Afasta a peca da parede. 0 desliga." />
        )}
        {p.macica && (
          <>
            <Check label="Chanfro na face" valor={p.biselAtivo} set={p.setBiselAtivo} />
            {p.biselAtivo && <Num label="Tamanho do chanfro" valor={p.biselTam} set={p.setBiselTam} min={0.2} max={10} step={0.1} />}
          </>
        )}
      </Grupo>

      <Grupo titulo="Impressora">
        <Num label="Diametro do bico" valor={p.bico} set={p.setBico} min={0.2} max={1.2} step={0.05} />
        <Num label="Mesa X" valor={p.mesaX} set={p.setMesaX} min={100} max={600} step={1} />
        <Num label="Mesa Y" valor={p.mesaY} set={p.setMesaY} min={100} max={600} step={1} />
        <Num
          label="Vazao efetiva"
          valor={p.cfg.vazao}
          set={p.setCfg('vazao')}
          min={2}
          max={60}
          step={0.5}
          sufixo=" g/h"
          dica="Calibre com um job real: gramas do job divididas pelas horas que levou"
        />
      </Grupo>
    </>
  );
}

function PainelCamadas(p: PainelProps) {
  const item = (k: keyof Camadas, nome: string, dica: string) => (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 hover:bg-elevado" title={dica}>
      <input type="checkbox" checked={p.camadas[k]} onChange={(e) => p.setCamadas({ ...p.camadas, [k]: e.target.checked })} className="size-4 accent-acento" />
      <span className="text-base text-tinta-media">{nome}</span>
    </label>
  );

  return (
    <>
      <Grupo titulo="Mostrar no 3D">
        {item('corpo', 'Letra / corpo', 'A peca impressa')}
        {p.temChapa && item('chapa', 'Chapa', 'A chapa de ACM ou a face translucida')}
        {p.rolesUsados.has('traseira') && item('traseira', 'Fundo', 'A traseira da peca')}
      </Grupo>

      <Grupo titulo="Legenda">
        <div className="space-y-1.5">
          {LEGENDA.filter(([r]) => p.rolesUsados.has(r)).map(([r, nome]) => (
            <div key={r} className="flex items-center gap-2.5">
              <span className="size-3 rounded-sm" style={{ background: CORES[r].cor }} />
              <span className="text-mini text-tinta-media">{nome}</span>
            </div>
          ))}
          {p.temChapa && (
            <div className="flex items-center gap-2.5">
              <span className="size-3 rounded-sm border border-white/30 bg-[#cfe4ff]/45" />
              <span className="text-mini text-tinta-media">Chapa (encaixada)</span>
            </div>
          )}
        </div>
      </Grupo>

      {p.avisos.length > 0 && (
        <Grupo titulo={`Antes de imprimir (${p.avisos.length})`}>
          {p.avisos.map((a) => (
            <Aviso key={a}>{a}</Aviso>
          ))}
        </Grupo>
      )}

      {p.pecas.length > 0 && (
        <Grupo titulo={`Pecas (${p.pecas.length})`}>
          <div className="space-y-1">
            {p.pecas.map((x, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-fundo px-2 py-1.5">
                <span className="min-w-5 text-center text-base font-semibold text-tinta">{x.nome}</span>
                <span className="tabular flex-1 font-mono text-micro text-tinta-fraca">
                  {x.w.toFixed(0)}x{x.h.toFixed(0)} · {x.gramas.toFixed(0)}g
                </span>
                <Botao onClick={() => p.baixarSTL(i)} variante="fantasma" title="Baixar o STL desta peca">
                  stl
                </Botao>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 pt-1">
            {p.temChapa && (
              <div className="flex gap-1.5">
                <Botao onClick={p.baixarChapaSVG} title="Contorno da chapa em mm reais, para abrir no Corel">
                  chapa .svg
                </Botao>
                <Botao onClick={p.baixarChapaDXF} title="Para router CNC / plotter de corte">
                  chapa .dxf
                </Botao>
              </div>
            )}
            <Botao onClick={p.baixarGabarito} largura title="Imprima em escala 100%, cole na parede e fure no lugar certo">
              gabarito de instalacao 1:1
            </Botao>
          </div>
        </Grupo>
      )}
    </>
  );
}

function PainelCustos(p: PainelProps) {
  const o = p.orcamento;
  return (
    <>
      {o && (
        <>
          <Grupo>
            <div>
              <div className="text-micro font-semibold uppercase tracking-wider text-tinta-fraca">Preco sugerido</div>
              <div className="tabular mt-1 font-mono text-numero font-semibold leading-none text-lucro">{brl(o.preco)}</div>
              <div className="mt-1.5 text-mini text-tinta-fraca">
                custo {brl(o.custo)} · lucro {brl(o.lucro)}
              </div>
            </div>
            <table className="w-full text-mini">
              <tbody>
                {o.itens.map((i) => (
                  <tr key={i.rotulo}>
                    <td className="py-1 text-tinta-fraca">{i.rotulo}</td>
                    <td className="tabular py-1 text-right font-mono text-tinta-media">{brl(i.valor)}</td>
                    <td className="tabular py-1 pl-2 text-right font-mono text-micro text-tinta-fraca">{i.detalhe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Grupo>
        </>
      )}

      <Grupo titulo="Material">
        <Sel<FilamentoId>
          label="Filamento"
          valor={p.cfg.filamento}
          set={p.setCfg('filamento')}
          opcoes={(Object.keys(FILAMENTOS) as FilamentoId[]).map((k) => ({
            valor: k,
            nome: `${FILAMENTOS[k].nome} (${FILAMENTOS[k].densidade} g/cm3)`,
          }))}
        />
        <Num label="Preco do rolo" valor={p.cfg.precoRolo} set={p.setCfg('precoRolo')} min={30} max={600} step={5} sufixo=" R$" />
        <Num label="Gramas por rolo" valor={p.cfg.rendimento} set={p.setCfg('rendimento')} min={250} max={5000} step={50} sufixo=" g" />
        {p.temChapa && <Num label="Preco do ACM" valor={p.cfg.precoAcmM2} set={p.setCfg('precoAcmM2')} min={10} max={500} step={5} sufixo=" R$/m2" />}
        {p.temLed && <Num label="Fita LED" valor={p.cfg.precoFitaLedM} set={p.setCfg('precoFitaLedM')} min={2} max={200} step={1} sufixo=" R$/m" />}
      </Grupo>

      <Grupo titulo="Maquina e trabalho">
        <Num label="Custo de maquina" valor={p.cfg.custoMaquina} set={p.setCfg('custoMaquina')} min={0} max={30} step={0.5} sufixo=" R$/h" />
        <Num label="Energia" valor={p.cfg.precoKwh} set={p.setCfg('precoKwh')} min={0.2} max={3} step={0.05} sufixo=" R$/kWh" />
        <Num label="Potencia media" valor={p.cfg.potencia} set={p.setCfg('potencia')} min={40} max={600} step={10} sufixo=" W" />
        <Num label="Mao de obra" valor={p.cfg.valorHora} set={p.setCfg('valorHora')} min={0} max={200} step={5} sufixo=" R$/h" />
        <Num label="Preparo do job" valor={p.cfg.setupMin} set={p.setCfg('setupMin')} min={0} max={120} step={1} sufixo=" min" />
        <Num label="Acabamento por peca" valor={p.cfg.posMin} set={p.setCfg('posMin')} min={0} max={120} step={1} sufixo=" min" />
      </Grupo>

      <Grupo titulo="Margem">
        <Num label="Taxa de falha" valor={p.cfg.taxaFalha} set={p.setCfg('taxaFalha')} min={0} max={50} step={1} sufixo="%" dica="Entra no custo: voce paga pelos jobs perdidos" />
        <Num label="Margem" valor={p.cfg.margem} set={p.setCfg('margem')} min={0} max={500} step={5} sufixo="%" />
      </Grupo>
    </>
  );
}
