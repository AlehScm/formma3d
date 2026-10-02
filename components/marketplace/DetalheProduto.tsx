/**
 * Pagina de um produto da loja: galeria (ou arte da categoria), o que da para escolher,
 * preco em validacao, pedido pelo WhatsApp e o atalho para montar no gerador.
 * Recebe so produtos publicos (quem chama filtra).
 */
import Link from 'next/link';
import { ArteCategoria } from '@/components/marca/ArteCategoria';
import { BotaoMarca, BotaoWhatsapp, CartaoMarca, SeloMarca, Wordmark } from '@/components/marca';
import { CATEGORIAS, type Produto } from '@/lib/marketplace/tipos';
import { textoDoPreco, urlDaMidia } from '@/lib/marketplace/consultas';
import { MENSAGENS, linkWhatsapp } from '@/lib/marketplace/contato';
import './produto.css';

export function DetalheProduto({ produto: p, relacionados }: { produto: Produto; relacionados: Produto[] }) {
  const categoria = CATEGORIAS[p.categoria];
  // Sem numero de WhatsApp ainda nao ha atendimento: o texto nao promete resposta.
  const temCanal = linkWhatsapp(MENSAGENS.geral()) !== null;
  return (
    <div className="m-escopo p-pagina">
      <header className="p-topo">
        <Wordmark />
        <nav aria-label="Navegação principal" className="p-nav">
          <Link href="/#colecao">Loja</Link>
          <Link href="/criar">Crie o seu 3D</Link>
          {temCanal && <BotaoWhatsapp mensagem={MENSAGENS.geral()} pequeno>WhatsApp</BotaoWhatsapp>}
        </nav>
      </header>

      <main className="p-principal">
        <nav aria-label="Você está em" className="p-trilha">
          <Link href="/#colecao">Loja</Link>
          <span aria-hidden="true">/</span>
          <span>{categoria.nome}</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{p.nome}</span>
        </nav>

        <article className="p-produto">
          <div className="p-galeria">
            {p.midias.length ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- export estatico sem otimizador de imagem */}
                <img src={urlDaMidia(p.midias[0]!)} alt={p.nome} className="p-foto" />
                {p.midias.length > 1 && (
                  <ul className="p-miniaturas" aria-label="Mais fotos">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.midias.slice(1).map((m, i) => <li key={m}><img src={urlDaMidia(m)} alt={`${p.nome}, foto ${i + 2}`} /></li>)}
                  </ul>
                )}
              </>
            ) : (
              <div className="p-foto p-foto-reserva">
                <ArteCategoria categoria={p.categoria} />
                <span className="p-sem-foto">Foto em breve</span>
              </div>
            )}
          </div>

          <div className="p-info">
            <div className="p-selos">
              {p.origem === 'nosso' && <SeloMarca tom="nosso">Projeto Scarprint</SeloMarca>}
              {p.personalizar && <SeloMarca tom="personalizavel">Personalizável</SeloMarca>}
              {p.jaImpresso && <SeloMarca>Já impresso para clientes</SeloMarca>}
            </div>
            <h1 className="p-nome">{p.nome}</h1>
            <p className="p-resumo">{p.resumo}</p>

            <div className="p-preco">
              <SeloMarca tom="validacao">{textoDoPreco(p)}</SeloMarca>
              {p.preco.status === 'validacao' && <p>O valor depende do tamanho, das cores e da quantidade. {temCanal ? 'Peça um orçamento: respondemos com o preço e o prazo.' : 'Os pedidos de orçamento abrem em breve.'}{p.personalizar && !temCanal ? ' Enquanto isso, você já pode montar o seu no gerador.' : ''}</p>}
            </div>

            {p.personalizavel.length > 0 && (
              <div className="p-escolhas">
                <h2>Você escolhe</h2>
                <ul>{p.personalizavel.map((o) => <li key={o}>{o}</li>)}</ul>
              </div>
            )}

            <div className="p-acoes">
              <BotaoWhatsapp mensagem={MENSAGENS.produto(p)} />
              {p.personalizar && <BotaoMarca variante="contorno" href={p.personalizar.href}>{p.personalizar.rotulo} <span aria-hidden="true">→</span></BotaoMarca>}
            </div>

            <div className="p-descricao">
              <h2>Sobre</h2>
              <p>{p.descricao}</p>
            </div>

            {p.personalizar && (
              <aside className="p-faca">
                <strong>Prefere fazer você mesmo?</strong>
                <p>Monte no gerador, veja em 3D e baixe o arquivo (3MF multicor ou STL) para imprimir na sua impressora{temCanal ? ' ou mande para nós imprimirmos' : ''}.</p>
              </aside>
            )}
          </div>
        </article>

        {relacionados.length > 0 && (
          <section className="p-relacionados" aria-labelledby="relacionados-titulo">
            <h2 id="relacionados-titulo">Mais em {categoria.nome}</h2>
            <div className="p-grade">
              {relacionados.map((r) => (
                <CartaoMarca key={r.slug} href={`/produto/${r.slug}`}>
                  <div className="p-cartao-foto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.midias.length ? <img src={urlDaMidia(r.midias[0]!)} alt="" /> : <ArteCategoria categoria={r.categoria} />}
                  </div>
                  <div className="p-cartao-corpo">
                    <h3>{r.nome}</h3>
                    <p>{r.resumo}</p>
                  </div>
                </CartaoMarca>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="p-rodape">
        <Wordmark tamanho={18} subtitulo={null} />
        <span>Impressão 3D sob medida · Do código à peça</span>
      </footer>
    </div>
  );
}
