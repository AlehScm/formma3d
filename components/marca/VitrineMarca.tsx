/** Referencia viva da marca (tokens e primitivos) para a pagina /sistema. So Tailwind. */
import { BotaoMarca, BotaoWhatsapp, CampoMarca, CartaoMarca, ChipSecao, ESCOPO_MARCA, RotuloMarca, SecaoMarca, SeloMarca, Wordmark } from '.';
import { ArteSecao } from './ArteSecao';
import { ComparaFontes } from './ComparaFontes';
import { cx } from '@/components/ui/cx';
import { ORDEM_SECOES, SECOES } from '@/lib/marketplace/tipos';

/** Classe da amostra (estatica, para o Tailwind gerar), token e uso. */
const CORES: [string, string, string][] = [
  ['bg-marca-navy', '--marca-navy', 'texto forte'], ['bg-marca-azul', '--marca-azul', 'ação'], ['bg-marca-ciano', '--marca-ciano', 'brilho'],
  ['bg-marca-profundo', '--marca-profundo', 'faixa escura'], ['bg-marca-gelo', '--marca-gelo', 'destaque suave'], ['bg-marca-palido', '--marca-palido', 'fundo'],
  ['bg-marca-linha', '--marca-linha', 'borda'], ['bg-marca-texto-2', '--marca-texto-2', 'corpo'], ['bg-marca-texto-3', '--marca-texto-3', 'apoio'],
  ['bg-marca-atencao', '--marca-atencao', 'em validação'], ['bg-marca-sucesso', '--marca-sucesso', 'nosso'], ['bg-marca-whatsapp', '--marca-whatsapp', 'WhatsApp'],
  ['bg-marca', '--marca-gradiente', 'ação primária'],
];
const SECAO_AMOSTRAS: [string, string][] = [['bg-secao', '--secao'], ['bg-secao-2', '--secao-2'], ['bg-secao-suave', '--secao-suave'], ['bg-secao-forte', '--secao-forte']];
const AMOSTRA = 'overflow-hidden rounded-marca-sm border border-marca-linha bg-marca-branco';

export function VitrineMarca() {
  return (
    <div className={cx(ESCOPO_MARCA, 'overflow-hidden rounded-lg')}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-marca-linha bg-marca-branco p-6">
        <Wordmark href={null} />
        <Wordmark href={null} tamanho={40} subtitulo={null} />
      </div>
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

      <ComparaFontes />

      <SecaoMarca sobretitulo="Seção" titulo={<>Título de seção em <span className="text-marca-azul">display</span></>} texto="Corpo em 16px, linha 1,6, cor marca-texto-2. Sobretítulo em caixa alta com o ponto da seção." acao={<BotaoMarca variante="contorno">Ação da seção</BotaoMarca>}>
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

      <SecaoMarca fundo="gelo" sobretitulo="Seções da loja" titulo="Cada seção, um universo" texto="A marca (azul, wordmark, botão primário) não muda. Dentro de [data-secao], o palco (bg-universo, com textura própria) e os acentos secao-* mudam: banner, portal da seção, categorias, prateleiras e a galeria 3D.">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
          {ORDEM_SECOES.map((s) => (
            <div key={s} data-secao={s}>
              <CartaoMarca>
                <div className="flex aspect-[6/5] flex-col justify-between bg-universo p-3 text-secao-universo-texto">
                  <span className="text-xs font-semibold">{SECOES[s].universo}</span>
                  <div className="mx-auto w-3/5"><ArteSecao secao={s} /></div>
                </div>
                <div className="flex flex-col gap-2 p-3">
                  <strong className="text-[15px]">{SECOES[s].nome}</strong>
                  <div className="flex gap-1.5">
                    {SECAO_AMOSTRAS.map(([cls, token]) => <span key={token} title={token} className={cx('size-[22px] rounded-md border border-marca-linha', cls)} />)}
                  </div>
                  <ChipSecao className="self-start">Chip da seção</ChipSecao>
                  <BotaoMarca pequeno>Botão da marca</BotaoMarca>
                </div>
              </CartaoMarca>
            </div>
          ))}
        </div>
      </SecaoMarca>
      <SecaoMarca fundo="escura" sobretitulo="Faixa escura" titulo="Para chamadas fortes" texto="Fundo marca-profundo, texto claro com contraste AA." acao={<BotaoMarca>Chamada</BotaoMarca>} />
    </div>
  );
}
