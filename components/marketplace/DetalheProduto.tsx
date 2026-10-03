/**
 * Pagina de um produto da loja, tingida pela cor filha da secao dele: galeria (ou a arte
 * da secao), o que da para escolher, preco em validacao, pedido pelo WhatsApp e o atalho
 * para montar no gerador. Recebe so produtos publicos (quem chama filtra).
 */
import Link from 'next/link';
import { ArteSecao } from '@/components/marca/ArteSecao';
import { BotaoMarca, BotaoWhatsapp, SeloMarca } from '@/components/marca';
import { SECOES, type Produto } from '@/lib/marketplace/tipos';
import { textoDoPreco, urlDaMidia } from '@/lib/marketplace/formato';
import { MENSAGENS } from '@/lib/marketplace/contato';
import { CardProduto, PaginaLoja, temCanal } from './Loja';
import './produto.css';

export function DetalheProduto({ produto: p, relacionados }: { produto: Produto; relacionados: Produto[] }) {
  const secao = SECOES[p.secao];
  // Sem numero de WhatsApp ainda nao ha atendimento: o texto nao promete resposta.
  const canal = temCanal();
  return (
    <PaginaLoja secaoAtual={p.secao}>
      <div className="p-principal">
        <nav aria-label="Você está em" className="l-trilha p-trilha">
          <Link href="/">Loja</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/secao/${p.secao}`}>{secao.nome}</Link>
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
                <ArteSecao secao={p.secao} />
                <span className="p-sem-foto">Foto em breve</span>
              </div>
            )}
          </div>

          <div className="p-info">
            <div className="p-selos">
              <span className="m-chip">{secao.nome} · {p.tipo}</span>
              {p.origem === 'nosso' && <SeloMarca tom="nosso">Projeto Scarprint</SeloMarca>}
              {p.personalizar && <SeloMarca tom="personalizavel">Personalizável</SeloMarca>}
              {p.jaImpresso && <SeloMarca>Já impresso para clientes</SeloMarca>}
            </div>
            <h1 className="p-nome">{p.nome}</h1>
            <p className="p-resumo">{p.resumo}</p>

            <div className="p-preco">
              <SeloMarca tom="validacao">{textoDoPreco(p)}</SeloMarca>
              {p.preco.status === 'validacao' && <p>O valor depende do tamanho, das cores e da quantidade. {canal ? 'Peça um orçamento: respondemos com o preço e o prazo.' : 'Os pedidos de orçamento abrem em breve.'}{p.personalizar && !canal ? ' Enquanto isso, você já pode montar o seu no gerador.' : ''}</p>}
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
                <p>Monte no gerador, veja em 3D e baixe o arquivo (3MF multicor ou STL) para imprimir na sua impressora{canal ? ' ou mande para nós imprimirmos' : ''}.</p>
              </aside>
            )}
          </div>
        </article>

        {relacionados.length > 0 && (
          <section className="p-relacionados" aria-labelledby="relacionados-titulo">
            <div className="l-vitrine-cabeca">
              <h2 id="relacionados-titulo">Mais em {secao.nome}</h2>
              <Link className="l-ver-tudo" href={`/secao/${p.secao}`}>Ver tudo →</Link>
            </div>
            <div className="l-grade">{relacionados.map((r) => <CardProduto key={r.slug} produto={r} />)}</div>
          </section>
        )}
      </div>
    </PaginaLoja>
  );
}
