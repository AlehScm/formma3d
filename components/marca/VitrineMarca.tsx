/** Referencia viva da marca (tokens e primitivos) para a pagina /sistema. So Tailwind. */
import { BotaoIconeMarca, BotaoMarca, BotaoWhatsapp, CampoMarca, CartaoMarca, ChipSecao, ESCOPO_MARCA, RotuloMarca, SecaoMarca, SeloMarca, Wordmark } from '.';
import { IconeFavorito } from '@/components/loja/icones';
import { ArteSecao } from './ArteSecao';
import { cx } from '@/components/ui/cx';
import { ORDEM_SECOES, SECOES } from '@/lib/marketplace/tipos';

/** Classe da amostra (estatica, para o Tailwind gerar), token e uso. */
const CORES: [string, string, string][] = [
  ['bg-marca-navy', '--marca-navy', 'títulos e texto forte'], ['bg-marca-azul', '--marca-azul', 'ação principal'], ['bg-marca-ciano', '--marca-ciano', 'alias do azul'],
  ['bg-marca-profundo', '--marca-profundo', 'neutro escuro'], ['bg-marca-gelo', '--marca-gelo', 'fundo claro'], ['bg-marca-palido', '--marca-palido', 'fundo da loja'],
  ['bg-marca-linha', '--marca-linha', 'bordas'], ['bg-marca-texto-2', '--marca-texto-2', 'corpo'], ['bg-marca-texto-3', '--marca-texto-3', 'apoio'],
  ['bg-marca-atencao', '--marca-atencao', 'em validação'], ['bg-marca-sucesso', '--marca-sucesso', 'nosso'], ['bg-marca-whatsapp', '--marca-whatsapp', 'WhatsApp'],
  ['bg-marca', '--marca-gradiente', 'alias da ação azul'],
];
const SECAO_AMOSTRAS: [string, string][] = [['bg-secao', 'principal'], ['bg-secao-2', 'apoio'], ['bg-secao-suave', 'fundo'], ['bg-secao-forte', 'texto']];
const AMOSTRA = 'overflow-hidden rounded-marca-sm border border-marca-linha bg-marca-branco';

export function VitrineMarca() {
  return (
    <div className={cx(ESCOPO_MARCA, 'overflow-hidden rounded-lg')}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-marca-linha bg-marca-branco p-6">
        <Wordmark href={null} />
        <Wordmark href={null} tamanho={40} subtitulo={null} />
      </div>
      <SecaoMarca titulo="Uma marca, cinco seções" texto="A identidade Scarprint permanece no cabeçalho, nas ações e na navegação. A composição usa aproximadamente 70% branco/off-white, 20% neutros e 10% cor da categoria, sem transformar cada seção em um site diferente.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([['completo', 'Composição completa'], ['logotipo', 'Cabeçalho'], ['simbolo', 'Símbolo e favicon'], ['risco', 'Assinatura gráfica']] as const).map(([arquivo, nome]) => (
            <div key={arquivo} className="flex flex-col gap-4 rounded-marca-md border border-marca-linha bg-marca-branco p-5">
              {/* eslint-disable-next-line @next/next/no-img-element -- variantes vetoriais locais */}
              <img src={`${process.env.NEXT_PUBLIC_BASE ?? ''}/marca/scarprint-${arquivo}.svg`} alt={nome} className="h-28 w-full object-contain" />
              <p className="m-0 font-display text-sm font-semibold text-marca-navy">{nome}</p>
            </div>
          ))}
        </div>
      </SecaoMarca>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 p-6">
        {CORES.map(([cls, token, uso]) => (
          <div key={token} className={AMOSTRA}>
            <div className={cx('h-11', cls)} />
            <div className="p-2 text-xs text-marca-texto-2">
              <code className="text-marca-navy">{token}</code>
              <div>{uso}</div>
            </div>
          </div>
        ))}
      </div>

      <SecaoMarca titulo="Tipografia da marca" texto="Manrope nos títulos, categorias, preços, botões e banners. Inter no corpo, navegação, filtros e dados técnicos. O editor mantém sua fonte monoespaçada para medidas.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-marca-md border border-marca-linha bg-marca-branco p-5">
            <p className="m-0 text-xs text-marca-texto-2">Manrope</p>
            <p className="mt-3 mb-0 font-display text-3xl font-semibold text-marca-navy">Peças para a sua casa</p>
            <p className="mt-2 mb-0 font-display text-lg font-semibold text-marca-azul">Preço sob consulta</p>
          </div>
          <div className="rounded-marca-md border border-marca-linha bg-marca-branco p-5">
            <p className="m-0 text-xs text-marca-texto-2">Inter</p>
            <p className="mt-3 mb-0 font-marca text-base leading-relaxed text-marca-texto-2">Escolha uma peça, ajuste as opções e acompanhe seu orçamento.</p>
            <p className="mt-2 mb-0 font-marca text-sm text-marca-texto-2">Buscar por categoria · Filtrar produtos</p>
          </div>
        </div>
      </SecaoMarca>

      <SecaoMarca titulo="Controles da loja" texto="Conteúdo distribuído pela largura disponível, com margens fluidas e grades que ganham colunas conforme o espaço. Controles com pelo menos 44 px de toque e ações principais com 48 px. Foco, bordas e estados são compartilhados.">
        <div className="grid gap-6 md:grid-cols-2">
          {(['marca', 'casa'] as const).map((tema) => (
            <div key={tema} data-secao={tema === 'casa' ? tema : undefined} data-universo={tema === 'casa' ? tema : undefined} className="rounded-marca-md border border-secao-linha bg-secao-superficie p-5 text-secao-tinta">
              <h3 className="mt-0 mb-4 text-lg font-semibold">{tema === 'casa' ? 'Universo Casa' : 'Marca principal'}</h3>
              <div className="flex flex-wrap items-center gap-3">
                <BotaoMarca formato="controle" variante="secao">Adicionar ao orçamento</BotaoMarca>
                <BotaoMarca formato="controle" variante="contorno" pequeno>Personalizar</BotaoMarca>
                <BotaoIconeMarca rotulo="Exemplo de favorito"><IconeFavorito className="size-5" aria-hidden /></BotaoIconeMarca>
                <BotaoMarca formato="controle" variante="sucesso" pequeno>Adicionado</BotaoMarca>
                <BotaoMarca formato="controle" variante="secao" disabled>Indisponível</BotaoMarca>
              </div>
              <label htmlFor={`campo-loja-${tema}`} className="mt-5 mb-2 block text-sm font-semibold">Cor desejada</label>
              <CampoMarca id={`campo-loja-${tema}`} placeholder="Ex.: azul e branco" />
            </div>
          ))}
        </div>
      </SecaoMarca>

      <SecaoMarca sobretitulo="Seção" titulo={<>Título de seção em <span className="text-marca-azul">Manrope</span></>} texto="Corpo em Inter, 16px, com contraste legível sobre os fundos claros." acao={<BotaoMarca variante="contorno">Ação da seção</BotaoMarca>}>
        <div className="flex flex-wrap items-center gap-3">
          <BotaoMarca>Primário</BotaoMarca>
          <BotaoMarca variante="contorno">Contorno</BotaoMarca>
          <BotaoMarca variante="fantasma">Fantasma →</BotaoMarca>
          <BotaoWhatsapp mensagem="teste" />
          <BotaoMarca pequeno>Pequeno</BotaoMarca>
          <BotaoMarca desabilitado>Desabilitado</BotaoMarca>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <SeloMarca tom="validacao">Preço em validação</SeloMarca>
          <SeloMarca tom="personalizavel">Personalizável</SeloMarca>
          <SeloMarca tom="nosso">Projeto nosso</SeloMarca>
          <SeloMarca tom="novo">Novo</SeloMarca>
          <SeloMarca>Neutro</SeloMarca>
          <ChipSecao>Chip da seção</ChipSecao>
        </div>
        <div className="mt-6 max-w-[420px]">
          <RotuloMarca htmlFor="vitrine-campo">Campo de texto</RotuloMarca>
          <CampoMarca id="vitrine-campo" className="mt-2" placeholder="Seu texto" />
        </div>
        <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          <CartaoMarca href="#">
            <div className="aspect-[4/3] bg-marca-suave" />
            <div className="p-4">
              <SeloMarca tom="personalizavel">Personalizável</SeloMarca>
              <h3 className="mt-2.5 mb-1 text-marca-titulo-3 font-extrabold">Cartão com link</h3>
              <p className="m-0 text-sm text-marca-texto-2">Sobe e ganha sombra no hover.</p>
            </div>
          </CartaoMarca>
          <CartaoMarca>
            <div className="p-4">
              <h3 className="mt-0 mb-1 text-marca-titulo-3 font-extrabold">Cartão estático</h3>
              <p className="m-0 text-sm text-marca-texto-2">Mesma borda, raio 18 e sombra 1.</p>
            </div>
          </CartaoMarca>
        </div>
      </SecaoMarca>

      <SecaoMarca fundo="gelo" sobretitulo="Seções da loja" titulo="Cada seção, um universo" texto="A marca azul não muda. As seções usam fundos claros e cores próprias para produto, categoria e detalhes; texto permanece escuro e as ações principais continuam azuis.">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
          {ORDEM_SECOES.map((s) => (
            <div key={s} data-secao={s}>
              <CartaoMarca>
                <div className="flex aspect-[6/5] flex-col justify-between bg-universo p-3 text-secao-universo-texto">
                  <span className="font-display text-sm font-semibold">{SECOES[s].universo}</span>
                  <div className="mx-auto w-3/5"><ArteSecao secao={s} /></div>
                </div>
                <div className="flex flex-col gap-2 p-3">
                  <strong className="text-[15px]">{SECOES[s].nome}</strong>
                  <div className="flex gap-1.5">
                    {SECAO_AMOSTRAS.map(([cls, rotulo]) => <span key={rotulo} title={rotulo} className={cx('size-[22px] rounded-md border border-marca-linha', cls)} />)}
                  </div>
                  <ChipSecao className="self-start">Chip da seção</ChipSecao>
                  <BotaoMarca pequeno>Botão da marca</BotaoMarca>
                </div>
              </CartaoMarca>
            </div>
          ))}
        </div>
      </SecaoMarca>
    </div>
  );
}
