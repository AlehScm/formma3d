/** Referencia viva da marca (tokens e primitivos) para a pagina /sistema. */
import { BotaoMarca, BotaoWhatsapp, CartaoMarca, SecaoMarca, SeloMarca, Wordmark } from '.';
import { ArteCategoria } from './ArteCategoria';
import { CATEGORIAS, type Categoria } from '@/lib/marketplace/tipos';

const CORES: [string, string][] = [
  ['--marca-navy', 'texto forte'], ['--marca-azul', 'ação'], ['--marca-ciano', 'brilho'], ['--marca-profundo', 'faixa escura'],
  ['--marca-gelo', 'destaque suave'], ['--marca-palido', 'fundo'], ['--marca-linha', 'borda'], ['--marca-texto-2', 'corpo'],
  ['--marca-texto-3', 'apoio'], ['--marca-atencao', 'em validação'], ['--marca-sucesso', 'nosso'], ['--marca-whatsapp', 'WhatsApp'],
];

export function VitrineMarca() {
  return (
    <div className="m-escopo overflow-hidden rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6" style={{ background: 'var(--marca-branco)', borderBottom: '1px solid var(--marca-linha)' }}>
        <Wordmark href={null} />
        <Wordmark href={null} tamanho={40} subtitulo={null} />
      </div>
      <div className="grid gap-3 p-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {CORES.map(([v, uso]) => (
          <div key={v} className="overflow-hidden rounded-md" style={{ border: '1px solid var(--marca-linha)', background: 'var(--marca-branco)' }}>
            <div style={{ height: 44, background: `var(${v})` }} />
            <div className="p-2" style={{ fontSize: 12, color: 'var(--marca-texto-2)' }}>
              <code style={{ color: 'var(--marca-navy)' }}>{v}</code>
              <div>{uso}</div>
            </div>
          </div>
        ))}
        <div className="overflow-hidden rounded-md" style={{ border: '1px solid var(--marca-linha)', background: 'var(--marca-branco)' }}>
          <div style={{ height: 44, background: 'var(--marca-gradiente)' }} />
          <div className="p-2" style={{ fontSize: 12, color: 'var(--marca-texto-2)' }}><code style={{ color: 'var(--marca-navy)' }}>--marca-gradiente</code><div>ação primária</div></div>
        </div>
      </div>
      <SecaoMarca sobretitulo="Seção" titulo={<>Título de seção em <span style={{ color: 'var(--marca-azul)' }}>display</span></>} texto="Corpo em 16px, linha 1,6, cor --marca-texto-2. Sobretítulo em caixa alta com o ponto ciano." acao={<BotaoMarca variante="contorno">Ação da seção</BotaoMarca>}>
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
        </div>
        <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          <CartaoMarca href="#">
            <div style={{ aspectRatio: '4 / 3', background: 'var(--marca-gradiente-suave)' }} />
            <div className="p-4">
              <SeloMarca tom="personalizavel">Personalizável</SeloMarca>
              <h3 style={{ margin: '10px 0 4px', fontSize: 'var(--marca-t-titulo-3)', fontWeight: 800 }}>Cartão com link</h3>
              <p style={{ margin: 0, color: 'var(--marca-texto-2)', fontSize: 14 }}>Sobe e ganha sombra no hover.</p>
            </div>
          </CartaoMarca>
          <CartaoMarca>
            <div className="p-4">
              <h3 style={{ margin: '0 0 4px', fontSize: 'var(--marca-t-titulo-3)', fontWeight: 800 }}>Cartão estático</h3>
              <p style={{ margin: 0, color: 'var(--marca-texto-2)', fontSize: 14 }}>Mesma borda, raio 18 e sombra 1.</p>
            </div>
          </CartaoMarca>
        </div>
      </SecaoMarca>
      <SecaoMarca fundo="gelo" sobretitulo="Sem foto" titulo="Arte por categoria" texto="Desenho nosso enquanto a foto do produto não chega (components/marca/ArteCategoria).">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
            <CartaoMarca key={c}>
              <div style={{ aspectRatio: '6 / 5' }}><ArteCategoria categoria={c} /></div>
              <div className="p-3" style={{ fontSize: 13, fontWeight: 700 }}>{CATEGORIAS[c].nome}</div>
            </CartaoMarca>
          ))}
        </div>
      </SecaoMarca>
      <SecaoMarca fundo="escura" sobretitulo="Faixa escura" titulo="Para chamadas fortes" texto="Fundo --marca-profundo, texto claro com contraste AA." acao={<BotaoMarca>Chamada</BotaoMarca>} />
    </div>
  );
}
