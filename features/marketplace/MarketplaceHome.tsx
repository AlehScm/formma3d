import Link from 'next/link';
import { BotaoMarca, BotaoWhatsapp, SeloMarca, Wordmark } from '@/components/marca';
import { ArteCategoria } from '@/components/marca/ArteCategoria';
import { CATEGORIAS, produtosPublicos, textoDoPreco, urlDaMidia, type Produto } from '@/lib/marketplace';
import { MENSAGENS } from '@/lib/marketplace/contato';
import styles from './MarketplaceHome.module.css';

export function MarketplaceHome() {
  const publicos = produtosPublicos();
  const categorias = [...new Set(publicos.map((p) => p.categoria))];

  return <div className={`m-escopo ${styles.page}`}>
    <a className={styles.skip} href="#conteudo">Pular para o conteúdo</a>
    <header className={styles.header}><div className={styles.wrap}>
      <Wordmark tamanho={25} />
      <nav className={styles.nav} aria-label="Navegação principal"><a href="#colecao">Coleção</a><a href="#como-funciona">Como criar</a><a href="#apoiador">Seja apoiador</a><Link href="/criar">Moldes</Link></nav>
      <div className={styles.headerActions}><span>WhatsApp em breve</span><BotaoMarca href="/editor" pequeno>Abrir editor ↗</BotaoMarca></div>
    </div></header>

    <main id="conteudo">
      <section className={styles.hero} aria-labelledby="titulo-principal"><div className={`${styles.wrap} ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>DESIGN 3D, DO SEU JEITO</p>
          <h1 id="titulo-principal">Do código<br />à <em>peça.</em></h1>
          <p className={styles.heroLead}>Letras, placas e objetos 3D que começam com uma ideia sua.</p>
          <p className={styles.heroDetail}>Explore a coleção, personalize modelos e exporte arquivos para imprimir.</p>
          <div className={styles.heroActions}><BotaoMarca href="#colecao">Explorar coleção ↘</BotaoMarca><BotaoMarca variante="fantasma" href="/criar">Ver moldes →</BotaoMarca></div>
        </div>
        <div className={styles.heroArt} role="img" aria-label="Ilustração de conceito de uma letra em relevo, uma placa e um símbolo de QR decorativo">
          <div className={styles.artRing} /><div className={styles.artCard}>
            <span className={styles.artTop}>DA TELA PARA O 3D <b>↗</b></span>
            <span className={styles.artLetter}>S</span>
            <span className={styles.artPlate}><strong>SUA MARCA</strong><small>EM OUTRA DIMENSÃO</small></span>
            <span className={styles.artQr}><i /><i /><i /><b>QR</b></span>
            <span className={styles.artBottom}>LETRA · PLACA · QR <b>SCARPRINT</b></span>
          </div><div className={styles.artChip} aria-hidden="true">3D</div><span className={styles.artNote}>ILUSTRAÇÃO DE CONCEITO</span>
        </div>
      </div><div className={`${styles.wrap} ${styles.heroFooter}`}><span>DESIGN QUE SAI DA TELA</span><a href="#colecao">DESLIZE PARA EXPLORAR ↓</a><span>IMPRESSÃO 3D · IDEIAS AUTORAIS</span></div></section>

      <section id="colecao" className={styles.collection} aria-labelledby="colecao-titulo"><div className={styles.wrap}>
        <div className={styles.sectionHeading}><div><p className={styles.kicker}>01 / A COLEÇÃO</p><h2 id="colecao-titulo">Encontre sua próxima <em>ideia.</em></h2></div><p>Peças e possibilidades em desenvolvimento. Os visuais são ilustrações; fotos e valores ainda serão definidos.</p></div>
        <nav className={styles.categories} aria-label="Categorias disponíveis">{categorias.map((categoria) => <a key={categoria} href={`#categoria-${categoria}`}>{CATEGORIAS[categoria].nome}</a>)}</nav>
        {categorias.map((categoria) => <section className={styles.categorySection} id={`categoria-${categoria}`} key={categoria} aria-labelledby={`titulo-${categoria}`}>
          <div className={styles.categoryHeading}><h3 id={`titulo-${categoria}`}>{CATEGORIAS[categoria].nome}</h3><p>{CATEGORIAS[categoria].resumo}</p></div>
          <div className={styles.grid}>{publicos.filter((p) => p.categoria === categoria).map((produto) => <ProductCard key={produto.slug} produto={produto} />)}</div>
        </section>)}
        <div className={styles.collectionFooter}><p>Quer começar por um arquivo para imprimir?</p><Link href="/criar">Explorar a biblioteca de moldes ↗</Link></div>
      </div></section>

      <section id="como-funciona" className={styles.process} aria-labelledby="processo-titulo"><div className={`${styles.wrap} ${styles.processGrid}`}>
        <div><p className={styles.kicker}>02 / DA IDEIA AO ARQUIVO</p><h2 id="processo-titulo">O primeiro passo<br />é <em>seu.</em></h2><p className={styles.processText}>Na biblioteca, você encontra modelos para personalizar. No editor, pode criar e exportar seu arquivo 3D e montar uma estimativa de orçamento. O canal para solicitar uma peça impressa está em preparação.</p></div>
        <div className={styles.processLinks}>
          <Link href="/criar"><small>01 / PERSONALIZAR</small><strong>Comece por um molde</strong><span>Escolha um modelo e ajuste as opções disponíveis.</span><b aria-hidden="true">↗</b></Link>
          <Link href="/editor"><small>02 / CRIAR</small><strong>Monte no editor</strong><span>Crie seu arquivo 3D e exporte para preparar a impressão.</span><b aria-hidden="true">↗</b></Link>
          <Link href="/placas"><small>03 / EXPLORAR</small><strong>Experimente placas</strong><span>Explore o editor de placas e componha uma peça do seu jeito.</span><b aria-hidden="true">↗</b></Link>
        </div>
      </div></section>

      <section id="apoiador" className={styles.supporter} aria-labelledby="apoiador-titulo"><div className={`${styles.wrap} ${styles.supporterGrid}`}>
        <div><p className={styles.kicker}>03 / SEJA APOIADOR</p><SeloMarca tom="validacao">Licença em validação</SeloMarca><h2 id="apoiador-titulo">Crie mais.<br /><em>Imprima do seu jeito.</em></h2></div>
        <div><p>A proposta para apoiadores é ampliar o uso dos geradores e dos arquivos em projetos de impressão própria. Benefícios e condições ainda estão em validação.</p><div className={styles.supporterActions}><BotaoMarca href="/criar">Conhecer os geradores ↗</BotaoMarca><BotaoWhatsapp mensagem={MENSAGENS.apoiador()} variante="contorno">Falar sobre apoio</BotaoWhatsapp></div></div>
      </div></section>

      <section className={styles.finalCta} aria-labelledby="cta-titulo"><div className={styles.wrap}><p className={styles.kicker}>04 / SUA IDEIA EM 3D</p><h2 id="cta-titulo">Quer ajuda com seu 3D?<br /><em>Monte seu orçamento.</em></h2><p>Use o editor para estimar seu projeto ou escolha um molde para personalizar. O envio de arquivo para atendimento estará disponível quando o contato abrir.</p><div className={styles.finalActions}><BotaoMarca variante="contorno" href="/editor">Montar orçamento no editor ↗</BotaoMarca><BotaoMarca variante="contorno" href="/criar">Escolher um molde ↗</BotaoMarca><BotaoWhatsapp mensagem={MENSAGENS.arquivo()} variante="contorno">Enviar meu arquivo</BotaoWhatsapp></div></div><span className={styles.giantS} aria-hidden="true">S</span></section>
    </main>
    <footer className={styles.footer}><div className={styles.wrap}><Wordmark tamanho={21} subtitulo={null} /><span>Ideias autorais em desenvolvimento.</span><nav aria-label="Navegação do rodapé"><Link href="/criar">Moldes</Link><Link href="/editor">Editor</Link><Link href="/placas">Placas</Link></nav></div></footer>
  </div>;
}

function ProductCard({ produto }: { produto: Produto }) {
  return <article className={styles.card}>
    <div className={styles.cardVisual}>{produto.midias[0] ? <img src={urlDaMidia(produto.midias[0])} alt={produto.nome} loading="lazy" /> : <ArteCategoria categoria={produto.categoria} />}</div>
    <div className={styles.cardBody}><div className={styles.cardMeta}><span>{CATEGORIAS[produto.categoria].nome}</span><SeloMarca tom="validacao">{textoDoPreco(produto)}</SeloMarca></div><h4><Link href={`/produto/${produto.slug}`}>{produto.nome}</Link></h4><p>{produto.resumo}</p><div className={styles.cardActions}><Link href={`/produto/${produto.slug}`} className={styles.cardLink}>Ver detalhes ↗</Link>{produto.personalizar && <Link href={produto.personalizar.href} className={styles.cardLink}>{produto.personalizar.rotulo} →</Link>}</div></div>
  </article>;
}
