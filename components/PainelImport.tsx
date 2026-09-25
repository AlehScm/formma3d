'use client';

import { Num, Sel, Segmentado, Botao } from './Campos';
import type { ModoSeparacao, ModoTraco } from '@/lib/import/pecas';
import type { Aviso } from '@/lib/import/pdf-ops';

export interface EstadoImport {
  nomeArquivo: string;
  paginaMm: { w: number; h: number };
  paginas: number;
  pagina: number;
  avisos: Aviso[];
  camadas: string[];
  temFill: boolean;
  temStroke: boolean;
  nomesPecas: string[];
}

export function PainelImport({
  est,
  modo,
  setModo,
  altura,
  setAltura,
  fundir,
  setFundir,
  tracos,
  setTracos,
  desativadas,
  alternarPeca,
  setPagina,
  fechar,
}: {
  est: EstadoImport;
  modo: ModoSeparacao;
  setModo: (m: ModoSeparacao) => void;
  altura: number;
  setAltura: (v: number) => void;
  fundir: number;
  setFundir: (v: number) => void;
  tracos: ModoTraco;
  setTracos: (v: ModoTraco) => void;
  desativadas: Set<string>;
  alternarPeca: (nome: string) => void;
  setPagina: (n: number) => void;
  fechar: () => void;
}) {
  // Contorno fechado sem preenchimento e o limite de uma forma, nao uma linha: o
  // que se aproveita dele e a area que ele cerca. Engrossar daria uma fita da
  // largura da linha, que num arquivo de CorelDRAW e 0.2mm.
  const opcoesTraco: { valor: ModoTraco; nome: string; dica?: string }[] = [
    { valor: 'ignorar', nome: 'Ignorar', dica: 'Traco solto costuma ser linha de corte, guia ou marca de registro' },
    { valor: 'preencher', nome: 'Preencher', dica: 'Contorno fechado e o limite da peca: vale a area que ele cerca' },
    { valor: 'engrossar', nome: 'Engrossar', dica: 'Vira fita da largura da linha, como o Expandir do Illustrator' },
  ];

  const opcoesModo: { valor: ModoSeparacao; nome: string }[] = [
    { valor: 'forma', nome: 'Cada forma solta' },
    { valor: 'objeto', nome: 'Objetos do arquivo' },
    ...(est.camadas.length > 1 ? [{ valor: 'camada' as const, nome: 'Camadas do arquivo' }] : []),
  ];

  return (
    <div className="space-y-2.5 border-b border-white/10 bg-sky-500/5 px-4 py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold text-slate-200" title={est.nomeArquivo}>
            {est.nomeArquivo}
          </div>
          <div className="font-mono text-[10px] text-slate-500">
            desenho {est.paginaMm.w.toFixed(0)} x {est.paginaMm.h.toFixed(0)} mm · {est.nomesPecas.length} pecas
          </div>
        </div>
        <Botao onClick={fechar} variante="fantasma" title="Voltar para o modo texto">
          x
        </Botao>
      </div>

      {est.avisos.map((a) => (
        <p key={a.codigo} className="rounded bg-amber-500/10 px-2 py-1.5 text-[11px] leading-relaxed text-amber-200/90">
          {a.msg}
        </p>
      ))}

      {est.paginas > 1 && (
        <Num
          label="Pagina / prancheta"
          valor={est.pagina}
          set={(v) => setPagina(Math.round(v))}
          min={1}
          max={est.paginas}
          step={1}
          sufixo={` de ${est.paginas}`}
        />
      )}

      <Sel<ModoSeparacao> label="Separar pecas por" valor={modo} set={setModo} opcoes={opcoesModo} />

      <Num label="Altura total do letreiro" valor={altura} set={setAltura} min={10} max={3000} step={1} />
      <Num
        label="Juntar pecas proximas"
        valor={fundir}
        set={setFundir}
        min={0}
        max={30}
        step={0.5}
        dica="Une acentos e o pingo do i a letra. 0 desliga."
      />
      {est.temStroke && (
        <Segmentado<ModoTraco>
          label="Traco sem preenchimento"
          valor={tracos}
          set={setTracos}
          opcoes={opcoesTraco}
        />
      )}

      {est.nomesPecas.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] text-slate-400">Pecas ({est.nomesPecas.length - desativadas.size} ativas)</div>
          <div className="flex flex-wrap gap-1">
            {est.nomesPecas.map((n) => {
              const ativa = !desativadas.has(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => alternarPeca(n)}
                  title={ativa ? 'Clique para desligar esta peca' : 'Clique para ligar esta peca'}
                  className={`rounded border px-1.5 py-1 font-mono text-[10px] transition ${
                    ativa
                      ? 'border-sky-500/50 bg-sky-600/25 text-sky-200'
                      : 'border-white/10 bg-transparent text-slate-600 line-through'
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
