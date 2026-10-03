/**
 * Pecas da loja compartilhadas pela home, pela pagina de secao e pela de produto:
 * cabecalho (secoes + extras), rodape, card de produto e bloco de secao. Cada card e
 * bloco leva `data-secao`, entao a cor filha tinge so os acentos dele.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArteSecao } from '@/components/marca/ArteSecao';
import { Miniatura } from '@/features/catalogo/Miniaturas';
import { BotaoMarca, BotaoWhatsapp, SeloMarca, Wordmark } from '@/components/marca';
import { ORDEM_SECOES, SECOES, type Produto, type Secao } from '@/lib/marketplace/tipos';
import { textoDoPreco, urlDaMidia } from '@/lib/marketplace/formato';
import { MENSAGENS, linkWhatsapp } from '@/lib/marketplace/contato';
import './loja.css';

/** Ha canal de atendimento (numero de WhatsApp configurado)? Sem ele, nada promete resposta. */
export const temCanal = () => linkWhatsapp(MENSAGENS.geral()) !== null;

export function CabecalhoLoja({ secaoAtual }: { secaoAtual?: Secao }) {
  return (
    <header className="l-topo">
      <div className="l-topo-linha">
        <Wordmark />
        <nav className="l-secoes" aria-label="Seções da loja">
          {ORDEM_SECOES.map((s) => (
            <Link key={s} href={`/secao/${s}`} data-secao={s} aria-current={s === secaoAtual ? 'page' : undefined}>{SECOES[s].nome}</Link>
          ))}
        </nav>
        <div className="l-topo-extras">
          <Link href="/criar" className="l-link-extra">Personalize o seu</Link>
          {temCanal() && <BotaoWhatsapp mensagem={MENSAGENS.geral()} pequeno>WhatsApp</BotaoWhatsapp>}
        </div>
      </div>
    </header>
  );
}

export function RodapeLoja() {
  return (
    <footer className="l-rodape">
      <div>
        <Wordmark tamanho={20} subtitulo={null} />
        <p style={{ margin: '10px 0 0', maxWidth: 360 }}>Peças impressas em 3D, sob medida. Preços em validação.</p>
      </div>
      <nav aria-label="Seções">
        {ORDEM_SECOES.map((s) => <Link key={s} href={`/secao/${s}`}>{SECOES[s].nome}</Link>)}
      </nav>
      <nav aria-label="Faça você mesmo">
        <Link href="/criar">Personalize o seu</Link>
        <Link href="/editor">Editor de letreiros</Link>
        <Link href="/placas">Editor de placas</Link>
      </nav>
    </footer>
  );
}

export function PaginaLoja({ secaoAtual, children }: { secaoAtual?: Secao; children: ReactNode }) {
  return (
    <div className="m-escopo l-pagina" data-secao={secaoAtual}>
      <a className="l-pular" href="#conteudo">Pular para o conteúdo</a>
      <CabecalhoLoja secaoAtual={secaoAtual} />
      <main id="conteudo">{children}</main>
      <RodapeLoja />
    </div>
  );
}

/** Gerador da peca (`/moldes/<id>`), se houver: o card mostra a previa 3D real dele. */
const geradorDe = (p: Produto) => p.personalizar?.href.match(/^\/moldes\/([a-z0-9-]+)$/)?.[1];

export function CardProduto({ produto: p }: { produto: Produto }) {
  const gerador = geradorDe(p);
  return (
    <article className="l-card" data-secao={p.secao}>
      <div className="l-card-foto">
        {p.midias[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- export estatico sem otimizador de imagem
          <img src={urlDaMidia(p.midias[0])} alt="" loading="lazy" />
        ) : gerador ? (
          <>
            <Miniatura id={gerador} alt={`Prévia 3D: ${p.nome}`} reserva={<ArteSecao secao={p.secao} />} />
            <span className="l-previa">Prévia 3D</span>
          </>
        ) : (
          <ArteSecao secao={p.secao} />
        )}
      </div>
      <div className="l-card-corpo">
        <div className="l-card-meta">
          <span className="m-chip">{p.tipo}</span>
          <SeloMarca tom="validacao">{textoDoPreco(p)}</SeloMarca>
        </div>
        <h3><Link href={`/produto/${p.slug}`}>{p.nome}</Link></h3>
        <p>{p.resumo}</p>
        <div className="l-card-rodape">
          <span className="l-ver-tudo" aria-hidden="true">Ver peça →</span>
          {p.personalizar && <BotaoMarca variante="contorno" pequeno href={p.personalizar.href}>Personalizar</BotaoMarca>}
        </div>
      </div>
    </article>
  );
}

export function BlocoSecao({ secao, total }: { secao: Secao; total: number }) {
  const s = SECOES[secao];
  return (
    <Link href={`/secao/${secao}`} className="l-bloco" data-secao={secao}>
      <div className="l-bloco-arte"><ArteSecao secao={secao} /></div>
      <div className="l-bloco-texto">
        <strong>{s.nome}</strong>
        <span>{s.chamada}</span>
        <em>{total ? `${total} ${total === 1 ? 'peça' : 'peças'} →` : 'Chegando em breve →'}</em>
      </div>
    </Link>
  );
}
