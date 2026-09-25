'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  Abas,
  Alerta,
  Balao,
  BarraFerramentas,
  Botao,
  BotaoIcone,
  CampoNumero,
  Dica,
  IconeAbrir,
  IconeArrumar,
  IconeBaixar,
  IconeCamadas,
  IconeDesenhar,
  IconeGirar,
  IconeImprimir,
  IconeMontagem,
  IconeMover,
  IconeOrcamento,
  IconeSelecionar,
  IconeTamanho,
  IconeTexto,
  Interruptor,
  ListaValores,
  MaisOpcoes,
  Menu,
  MenuItem,
  MenuRotulo,
  MenuSeparador,
  Metrica,
  Secao,
  Segmentado,
  Selecao,
  Selo,
  Separador,
  Tecla,
  Vazio,
} from '@/components/ui';

/**
 * Guia vivo do design system.
 *
 * As cores sao lidas do CSS em tempo de execucao, nao copiadas: se um token
 * mudar em `styles/tokens.css`, a pagina mostra o valor novo e o contraste novo.
 * Nao ha segunda fonte de verdade para ficar desatualizada.
 */

const PRINCIPIOS: [string, string][] = [
  ['Uma ação primária por tela', 'Exportar, no topo. Todo o resto é secundário ou fantasma.'],
  ['O 3D tem três zonas', 'Contexto no topo à esquerda, ferramentas na base, status na barra de baixo. Nada mais flutua.'],
  ['Revelação progressiva', 'Seção recolhida mostra um resumo de uma linha. O raro fica em “Mais opções”.'],
  ['Explicação em dica', 'Texto fixo só quando evita um erro. O resto vai no ícone de informação.'],
  ['Cor com significado', 'Azul: seleção. Verde: dinheiro e “cabe”. Âmbar: confira. Vermelho: impede imprimir.'],
  ['Número é mono', 'Algarismos de largura fixa, unidade separada e mais fraca, vírgula decimal.'],
  ['Português com acento', 'Na interface. Identificadores e comentários do código seguem em ASCII.'],
  ['Densidade fixa', 'Controle de 32px (compacto 28px), espaço de 12/16px, raio de 6px.'],
];

const GRUPOS_COR: { titulo: string; nomes: string[] }[] = [
  { titulo: 'Superfícies', nomes: ['fundo', 'superficie', 'superficie-2', 'superficie-3', 'flutuante', 'borda', 'borda-forte'] },
  { titulo: 'Texto', nomes: ['texto', 'texto-2', 'texto-3'] },
  { titulo: 'Significado', nomes: ['acento', 'acento-forte', 'sucesso', 'atencao', 'perigo'] },
  { titulo: 'Eixos do 3D', nomes: ['eixo-x', 'eixo-y', 'eixo-z'] },
  {
    titulo: 'Partes da peça',
    nomes: ['peca-face', 'peca-corpo', 'peca-parede', 'peca-traseira', 'peca-bolsao', 'peca-borda', 'peca-labio', 'peca-bisel', 'peca-espacador'],
  },
];

/** Luminancia relativa (WCAG 2.x). */
function luminancia(hex: string): number | null {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  const canal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

function contraste(a: string, b: string): number | null {
  const la = luminancia(a);
  const lb = luminancia(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const TODAS_AS_CORES = GRUPOS_COR.flatMap((g) => g.nomes);

function useTokens(): Record<string, string> {
  const [valores, setValores] = useState<Record<string, string>>({});
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const v: Record<string, string> = {};
    for (const n of TODAS_AS_CORES) v[n] = css.getPropertyValue(`--color-${n}`).trim();
    setValores(v);
  }, []);
  return valores;
}

function Bloco({ titulo, descricao, children }: { titulo: string; descricao?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-borda pt-8">
      <div>
        <h2 className="text-grande font-semibold text-texto">{titulo}</h2>
        {descricao && <p className="mt-1 max-w-2xl text-base text-texto-3">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

function Amostra({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-borda bg-superficie p-4">
      <div className="mb-3 text-micro font-medium uppercase tracking-wider text-texto-3">{rotulo}</div>
      {children}
    </div>
  );
}

export default function PaginaSistema() {
  const cores = useTokens();
  const fundoRef = cores['superficie'] ?? '#12161d';

  const [num, setNum] = useState(150);
  const [numLinha, setNumLinha] = useState(1.25);
  const [seg, setSeg] = useState<'dentro' | 'fora' | 'dois'>('dentro');
  const [sel, setSel] = useState<'petg' | 'pla' | 'abs'>('petg');
  const [liga, setLiga] = useState(true);
  const [aba, setAba] = useState<'desenhar' | 'imprimir' | 'orcamento'>('desenhar');
  const [ferr, setFerr] = useState('mover');

  return (
    <main className="h-full overflow-y-auto bg-fundo">
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
        <header className="space-y-2">
          <p className="text-mini font-medium uppercase tracking-wider text-acento-forte">formma3d</p>
          <h1 className="text-numero font-semibold tracking-tight text-texto">Design system</h1>
          <p className="max-w-2xl text-medio text-texto-2">
            Tokens em <code className="font-mono text-mini text-texto">styles/tokens.css</code>, primitivos em{' '}
            <code className="font-mono text-mini text-texto">components/ui</code>. Toda tela nova sai daqui — se faltar alguma
            coisa, ela entra no sistema primeiro.
          </p>
        </header>

        <Bloco titulo="Princípios">
          <ol className="grid gap-3 sm:grid-cols-2">
            {PRINCIPIOS.map(([t, d], i) => (
              <li key={t} className="flex gap-3 rounded-lg border border-borda bg-superficie p-4">
                <span className="tabular font-mono text-mini text-acento-forte">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <p className="text-base font-semibold text-texto">{t}</p>
                  <p className="mt-0.5 text-base text-texto-3">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Bloco>

        <Bloco
          titulo="Cores"
          descricao="Lidas do CSS em tempo real. O contraste é medido contra a superfície dos painéis; texto precisa de pelo menos 4,5:1."
        >
          {GRUPOS_COR.map((g) => (
            <div key={g.titulo}>
              <h3 className="mb-2 text-mini font-semibold uppercase tracking-wider text-texto-2">{g.titulo}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {g.nomes.map((n) => {
                  const hex = cores[n] ?? '';
                  const c = hex ? contraste(hex, fundoRef) : null;
                  const eTexto = g.titulo === 'Texto';
                  return (
                    <div key={n} className="overflow-hidden rounded-lg border border-borda bg-superficie">
                      <div className="h-12 border-b border-borda" style={{ background: hex || undefined }} />
                      <div className="space-y-0.5 p-2.5">
                        <div className="font-mono text-mini text-texto">{n}</div>
                        <div className="flex items-center justify-between font-mono text-micro text-texto-3">
                          <span>{hex || '…'}</span>
                          {c !== null && (
                            <span className={eTexto ? (c >= 4.5 ? 'text-sucesso' : 'text-perigo') : undefined}>
                              {c.toFixed(1).replace('.', ',')}:1
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </Bloco>

        <Bloco titulo="Tipografia" descricao="Inter para a interface, JetBrains Mono para todo número. Corpo de 13px.">
          <div className="divide-y divide-borda rounded-lg border border-borda bg-superficie">
            {(
              [
                // Classes escritas por extenso: o Tailwind nao enxerga `text-${nome}` montado.
                ['numero', '28px', 'Preço sugerido', 'text-numero font-mono font-semibold'],
                ['grande', '16px', 'Título de página', 'text-grande font-semibold'],
                ['medio', '14px', 'Título de painel', 'text-medio font-semibold'],
                ['base', '13px', 'Corpo da interface, rótulos de campo', 'text-base'],
                ['mini', '12px', 'Botões, texto secundário', 'text-mini'],
                ['micro', '11px', 'Unidade, legenda, rótulo de seção', 'text-micro uppercase tracking-wider'],
              ] as const
            ).map(([t, px, ex, extra]) => (
              <div key={t} className="flex items-baseline gap-4 px-4 py-3">
                <span className="w-16 shrink-0 font-mono text-micro text-texto-3">{t}</span>
                <span className="w-10 shrink-0 font-mono text-micro text-texto-3">{px}</span>
                <span className={`text-texto ${extra}`}>{ex}</span>
              </div>
            ))}
          </div>
        </Bloco>

        <Bloco titulo="Forma e profundidade">
          <div className="flex flex-wrap gap-4">
            {(
              [
                ['sm', 'rounded-sm'],
                ['md', 'rounded-md'],
                ['lg', 'rounded-lg'],
                ['xl', 'rounded-xl'],
              ] as const
            ).map(([r, classe]) => (
              <div key={r} className="text-center">
                <div className={`size-16 border border-borda-forte bg-superficie-2 ${classe}`} />
                <div className="mt-1.5 font-mono text-micro text-texto-3">{classe}</div>
              </div>
            ))}
            <div className="text-center">
              <div className="size-16 rounded-lg bg-flutuante shadow-flutuante" />
              <div className="mt-1.5 font-mono text-micro text-texto-3">shadow-flutuante</div>
            </div>
          </div>
        </Bloco>

        <Bloco titulo="Ações" descricao="Uma primária por tela. Botão de ícone sempre tem rótulo — vira a dica e o nome para leitor de tela.">
          <div className="grid gap-3 md:grid-cols-2">
            <Amostra rotulo="Botao — variantes">
              <div className="flex flex-wrap gap-2">
                <Botao variante="primario" icone={IconeBaixar}>
                  Exportar
                </Botao>
                <Botao variante="secundario" icone={IconeAbrir}>
                  Abrir
                </Botao>
                <Botao variante="fantasma">Cancelar</Botao>
                <Botao variante="perigo">Descartar</Botao>
                <Botao disabled>Desabilitado</Botao>
              </div>
            </Amostra>
            <Amostra rotulo="Botao — tamanhos">
              <div className="flex flex-wrap items-center gap-2">
                <Botao tamanho="sm" icone={IconeArrumar}>
                  Arrumar na placa
                </Botao>
                <Botao tamanho="md" icone={IconeArrumar}>
                  Arrumar na placa
                </Botao>
              </div>
            </Amostra>
            <Amostra rotulo="BarraFerramentas + BotaoIcone">
              <BarraFerramentas rotulo="Ferramentas">
                {(
                  [
                    ['selecionar', IconeSelecionar, 'Selecionar', 'V'],
                    ['mover', IconeMover, 'Mover', 'G'],
                    ['girar', IconeGirar, 'Girar', 'R'],
                    ['tamanho', IconeTamanho, 'Tamanho', 'S'],
                  ] as const
                ).map(([id, I, r, k]) => (
                  <BotaoIcone key={id} icone={I} rotulo={r} atalho={k} ativo={ferr === id} onClick={() => setFerr(id)} />
                ))}
                <Separador />
                <BotaoIcone icone={IconeCamadas} rotulo="Camadas" />
                <BotaoIcone icone={IconeMontagem} rotulo="Montagem" />
              </BarraFerramentas>
            </Amostra>
            <Amostra rotulo="Menu, Balao, Dica, Tecla">
              <div className="flex flex-wrap items-center gap-2">
                <Menu gatilho={<Botao icone={IconeBaixar}>Exportar</Botao>} alinhar="start">
                  <MenuRotulo>Para imprimir</MenuRotulo>
                  <MenuItem icone={IconeBaixar} detalhe=".zip">
                    Pacote completo
                  </MenuItem>
                  <MenuItem icone={IconeBaixar} detalhe=".stl">
                    STL por peça
                  </MenuItem>
                  <MenuSeparador />
                  <MenuRotulo>Para cortar</MenuRotulo>
                  <MenuItem icone={IconeBaixar} detalhe=".dxf">
                    Chapa ACM
                  </MenuItem>
                </Menu>
                <Balao gatilho={<Botao variante="fantasma">Abrir balão</Botao>} lado="bottom">
                  <p className="text-base text-texto-2">Conteúdo ancorado no gatilho, com borda e sombra flutuante.</p>
                </Balao>
                <Dica conteudo="Mover a peça" atalho="G">
                  <Botao variante="fantasma">Passe o mouse</Botao>
                </Dica>
                <Tecla>Esc</Tecla>
              </div>
            </Amostra>
          </div>
        </Bloco>

        <Bloco titulo="Entrada" descricao="Número aceita vírgula ou ponto; setas mudam um passo, Shift+seta dez. O valor só vale ao sair do campo.">
          <div className="grid gap-3 md:grid-cols-2">
            <Amostra rotulo="CampoNumero — bloco">
              <CampoNumero rotulo="Altura das letras" valor={num} set={setNum} min={20} max={1000} passo={1} dica="Altura das maiúsculas, a medida que o cliente pede" />
            </Amostra>
            <Amostra rotulo="CampoNumero — linha (inspetor)">
              <div className="space-y-1">
                <CampoNumero rotulo="Tamanho X" valor={numLinha} set={setNumLinha} passo={0.01} unidade="×" layout="linha" />
                <CampoNumero rotulo="Giro" valor={0} set={() => {}} passo={1} unidade="°" layout="linha" />
              </div>
            </Amostra>
            <Amostra rotulo="Segmentado (2 a 4 opções)">
              <Segmentado
                rotulo="Apoio da chapa"
                valor={seg}
                set={setSeg}
                opcoes={[
                  { valor: 'dentro', nome: 'Dentro' },
                  { valor: 'fora', nome: 'Fora' },
                  { valor: 'dois', nome: 'Dois lados' },
                ]}
              />
            </Amostra>
            <Amostra rotulo="Selecao (5+ opções) e Interruptor">
              <div className="space-y-3">
                <Selecao
                  rotulo="Filamento"
                  valor={sel}
                  set={setSel}
                  opcoes={[
                    { valor: 'petg', nome: 'PETG' },
                    { valor: 'pla', nome: 'PLA' },
                    { valor: 'abs', nome: 'ABS' },
                  ]}
                />
                <Interruptor rotulo="Com LED" valor={liga} set={setLiga} dica="Deixa espaço para a fita" />
              </div>
            </Amostra>
          </div>
        </Bloco>

        <Bloco titulo="Estrutura" descricao="Seção recolhida mostra o resumo; as abas trocam a área sem desmontar o 3D.">
          <div className="grid gap-3 md:grid-cols-2">
            <Amostra rotulo="Secao">
              <div className="-mx-4 -mb-4 border-t border-borda">
                <Secao titulo="Medidas" resumo="150 mm · prof. 40 mm" padraoAberta>
                  <CampoNumero rotulo="Profundidade" valor={40} set={() => {}} min={5} max={200} passo={1} />
                  <MaisOpcoes>
                    <CampoNumero rotulo="Parede" valor={2.4} set={() => {}} min={0.8} max={6} passo={0.1} />
                  </MaisOpcoes>
                </Secao>
                <Secao titulo="Chapa ACM" resumo="3 mm · apoio por dentro">
                  <p className="text-base text-texto-3">Conteúdo.</p>
                </Secao>
              </div>
            </Amostra>
            <Amostra rotulo="Abas">
              <Abas
                rotulo="Área de trabalho"
                valor={aba}
                set={setAba}
                abas={[
                  { valor: 'desenhar', nome: 'Desenhar', icone: IconeDesenhar, atalho: '1' },
                  { valor: 'imprimir', nome: 'Imprimir', icone: IconeImprimir, atalho: '2' },
                  { valor: 'orcamento', nome: 'Orçamento', icone: IconeOrcamento, atalho: '3' },
                ]}
              />
            </Amostra>
          </div>
        </Bloco>

        <Bloco titulo="Leitura" descricao="Tom é significado: neutro, acento (seleção), sucesso (dinheiro, cabe), atenção, perigo (impede imprimir).">
          <div className="grid gap-3 md:grid-cols-2">
            <Amostra rotulo="Alerta">
              <div className="space-y-2">
                <Alerta tom="acento" titulo="Muda o produto">
                  A chapa, o gabarito e o preço acompanham.
                </Alerta>
                <Alerta tom="atencao">O arquivo tem texto que não foi convertido em curvas.</Alerta>
                <Alerta tom="perigo" titulo="Não cabe na X2D">
                  Passou 44 mm em Y.
                </Alerta>
                <Alerta tom="sucesso">12 peças em 2 placas.</Alerta>
              </div>
            </Amostra>
            <Amostra rotulo="Metrica, Selo, ListaValores">
              <div className="space-y-4">
                <div className="flex gap-6">
                  <Metrica rotulo="Preço sugerido" valor="R$ 480,00" tom="sucesso" tamanho="lg" detalhe="custo R$ 212,40" />
                  <Metrica rotulo="Filamento" valor="1,24" unidade="kg" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Selo tom="sucesso">cabe</Selo>
                  <Selo tom="acento">girada 45°</Selo>
                  <Selo tom="atencao">parede fina</Selo>
                  <Selo tom="perigo">não cabe</Selo>
                  <Selo>2 furos</Selo>
                </div>
                <ListaValores
                  densa
                  itens={[
                    { rotulo: 'Filamento', valor: 'R$ 118,20', detalhe: '1,24 kg' },
                    { rotulo: 'Máquina', valor: 'R$ 64,00', detalhe: '16 h' },
                    { rotulo: 'Preço', valor: 'R$ 480,00', tom: 'sucesso', forte: true },
                  ]}
                />
              </div>
            </Amostra>
            <Amostra rotulo="Vazio">
              <Vazio icone={IconeTexto} titulo="Nada para mostrar" acao={<Botao icone={IconeAbrir}>Abrir .ai</Botao>}>
                Digite um texto ou abra um desenho do Corel ou do Illustrator.
              </Vazio>
            </Amostra>
          </div>
        </Bloco>
      </div>
    </main>
  );
}
