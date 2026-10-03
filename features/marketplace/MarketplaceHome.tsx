/**
 * Home da loja Scarprint: antes de tudo, uma loja de pecas impressas em 3D por secao
 * (cada uma com a sua cor filha). Geradores, editor e apoiador sao extras, no fim.
 * Componente de servidor: so produtos publicos chegam ao HTML.
 */
import Link from 'next/link';
import { BotaoMarca, BotaoWhatsapp, SeloMarca } from '@/components/marca';
import { ArteSecao } from '@/components/marca/ArteSecao';
import { BlocoSecao, CardProduto, PaginaLoja, temCanal } from '@/components/marketplace/Loja';
import { destaquesPorSecao, secoesComContagem } from '@/lib/marketplace/consultas';
import { MENSAGENS } from '@/lib/marketplace/contato';
import { SECOES } from '@/lib/marketplace/tipos';
import styles from './MarketplaceHome.module.css';

export function MarketplaceHome() {
  const contagem = secoesComContagem();
  const vitrines = destaquesPorSecao(4).filter((v) => v.produtos.length);
  const canal = temCanal();

  return (
    <PaginaLoja>
      <section className={styles.topo} aria-labelledby="loja-titulo">
        <div className={styles.topoTexto}>
          <p className={styles.sobretitulo}>LOJA DE IMPRESSÃO 3D</p>
          <h1 id="loja-titulo">Peças impressas em 3D, <em>feitas para você.</em></h1>
          <p className={styles.topoLead}>Para a sua casa, a sua coleção, a sua empresa e as suas festas. Escolha a seção e encontre a peça.</p>
          <div className={styles.topoAcoes}>
            <BotaoMarca href="#secoes">Ver as seções ↓</BotaoMarca>
            <BotaoMarca variante="fantasma" href="/criar">Ou personalize a sua →</BotaoMarca>
          </div>
        </div>
        <div className={styles.topoMosaico} aria-hidden="true">
          {contagem.slice(0, 4).map(({ secao }) => (
            <div key={secao} data-secao={secao} className={styles.mosaicoItem}>
              <ArteSecao secao={secao} />
              <span>{SECOES[secao].nome}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="secoes" className={styles.secoes} aria-labelledby="secoes-titulo">
        <h2 id="secoes-titulo" className={styles.titulo}>Seções da loja</h2>
        <div className="l-blocos">
          {contagem.map(({ secao, total }) => <BlocoSecao key={secao} secao={secao} total={total} />)}
        </div>
      </section>

      {vitrines.map(({ secao, produtos }) => (
        <section key={secao} className="l-vitrine" data-secao={secao} aria-labelledby={`vitrine-${secao}`}>
          <div className="l-vitrine-cabeca">
            <div>
              <h2 id={`vitrine-${secao}`}>{SECOES[secao].nome}</h2>
              <p>{SECOES[secao].resumo}</p>
            </div>
            <Link className="l-ver-tudo" href={`/secao/${secao}`}>Ver tudo de {SECOES[secao].nome} →</Link>
          </div>
          <div className="l-grade">{produtos.map((p) => <CardProduto key={p.slug} produto={p} />)}</div>
        </section>
      ))}

      <section className={styles.extra} aria-labelledby="extra-titulo">
        <div>
          <p className={styles.sobretitulo}>FAÇA VOCÊ MESMO</p>
          <h2 id="extra-titulo" className={styles.titulo}>Quer a peça do seu jeito?</h2>
          <p className={styles.extraTexto}>Monte o seu chaveiro, letreiro, placa ou QR no gerador, veja em 3D e baixe o arquivo para imprimir. No editor, dá para montar letreiros e estimar o orçamento.</p>
        </div>
        <div className={styles.extraAcoes}>
          <BotaoMarca href="/criar">Abrir os geradores</BotaoMarca>
          <BotaoMarca variante="contorno" href="/editor">Editor de letreiros</BotaoMarca>
          {canal && <BotaoWhatsapp mensagem={MENSAGENS.arquivo()} variante="contorno">Enviar o meu arquivo</BotaoWhatsapp>}
        </div>
      </section>

      <section id="apoiador" className={styles.apoiador} aria-labelledby="apoiador-titulo">
        <div>
          <SeloMarca tom="validacao">Licença em validação</SeloMarca>
          <h2 id="apoiador-titulo" className={styles.titulo}>Seja apoiador</h2>
          <p>Apoiadores poderão usar os nossos geradores para imprimir os próprios modelos. Benefícios e condições ainda estão em validação.</p>
        </div>
        {canal ? <BotaoWhatsapp mensagem={MENSAGENS.apoiador()} variante="contorno">Quero saber mais</BotaoWhatsapp> : <BotaoMarca variante="contorno" href="/criar">Conhecer os geradores</BotaoMarca>}
      </section>
    </PaginaLoja>
  );
}
