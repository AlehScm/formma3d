/**
 * Pagina de um produto da loja, tingida pela cor filha da secao dele: galeria (ou a arte
 * da secao), o que da para escolher, preco em validacao, pedido pelo WhatsApp e o atalho
 * para montar no gerador. Recebe so produtos publicos (quem chama filtra). So Tailwind.
 */
import Link from 'next/link';
import { ArteSecao } from '@/components/marca/ArteSecao';
import { BotaoMarca, BotaoWhatsapp, ChipSecao, SeloMarca } from '@/components/marca';
import { SECOES, type Produto } from '@/lib/marketplace/tipos';
import { textoDoPreco, urlDaMidia } from '@/lib/marketplace/formato';
import { MENSAGENS } from '@/lib/marketplace/contato';
import { CardProduto, GRADE_PRODUTOS, LINK_SECAO, PaginaLoja, TITULO_2, TRILHA, temCanal } from './Loja';

const FOTO = 'relative block aspect-[4/3] w-full overflow-hidden rounded-marca-lg border border-secao-borda bg-marca-branco object-cover shadow-marca-1';
const SUBTITULO = 'mt-0 mb-2.5 text-sm font-extrabold tracking-[0.04em] uppercase text-marca-navy';

export function DetalheProduto({ produto: p, relacionados }: { produto: Produto; relacionados: Produto[] }) {
  const secao = SECOES[p.secao];
  // Sem numero de WhatsApp ainda nao ha atendimento: o texto nao promete resposta.
  const canal = temCanal();
  return (
    <PaginaLoja secaoAtual={p.secao}>
      <div className="flex-1 px-margem pt-[clamp(20px,3vw,36px)] pb-[var(--marca-secao)]">
        <nav aria-label="Você está em" className={`${TRILHA} mb-[clamp(16px,2.4vw,28px)]`}>
          <Link href="/">Loja</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/secao/${p.secao}`}>{secao.nome}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-semibold text-marca-texto-2">{p.nome}</span>
        </nav>

        <article className="grid grid-cols-1 items-start gap-[clamp(24px,4vw,64px)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-24">
            {p.midias.length ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- export estatico sem otimizador de imagem */}
                <img src={urlDaMidia(p.midias[0]!)} alt={p.nome} className={FOTO} />
                {p.midias.length > 1 && (
                  <ul className="mt-3 mb-0 flex list-none gap-2.5 p-0" aria-label="Mais fotos">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.midias.slice(1).map((m, i) => <li key={m}><img src={urlDaMidia(m)} alt={`${p.nome}, foto ${i + 2}`} className="h-16 w-[84px] rounded-marca-sm border border-marca-linha object-cover" /></li>)}
                  </ul>
                )}
              </>
            ) : (
              <div className={FOTO}>
                <ArteSecao secao={p.secao} />
                <span className="absolute right-3.5 bottom-3.5 rounded-marca-pilula bg-marca-vidro px-3 py-1.5 text-xs font-bold text-marca-texto-2">Foto em breve</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-[18px]">
            <div className="flex flex-wrap gap-2">
              <ChipSecao>{secao.nome} · {p.tipo}</ChipSecao>
              {p.origem === 'nosso' && <SeloMarca tom="nosso">Projeto Scarprint</SeloMarca>}
              {p.personalizar && <SeloMarca tom="personalizavel">Personalizável</SeloMarca>}
              {p.jaImpresso && <SeloMarca>Já impresso para clientes</SeloMarca>}
            </div>
            <h1 className="m-0 font-display text-[clamp(32px,4.2vw,56px)] leading-[1.02] font-black tracking-[-0.05em] text-marca-navy">{p.nome}</h1>
            <p className="m-0 text-marca-destaque leading-normal text-marca-texto-2">{p.resumo}</p>

            <div className="flex flex-col items-start gap-2 rounded-marca-md border border-marca-linha bg-marca-branco p-4">
              <SeloMarca tom="validacao">{textoDoPreco(p)}</SeloMarca>
              {p.preco.status === 'validacao' && (
                <p className="m-0 text-sm leading-normal text-marca-texto-2">
                  O valor depende do tamanho, das cores e da quantidade. {canal ? 'Peça um orçamento: respondemos com o preço e o prazo.' : 'Os pedidos de orçamento abrem em breve.'}
                  {p.personalizar && !canal ? ' Enquanto isso, você já pode montar o seu no gerador.' : ''}
                </p>
              )}
            </div>

            {p.personalizavel.length > 0 && (
              <div>
                <h2 className={SUBTITULO}>Você escolhe</h2>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {p.personalizavel.map((o) => <li key={o} className="rounded-marca-pilula border border-secao-borda bg-marca-branco px-3 py-2 text-sm font-semibold text-marca-texto">{o}</li>)}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3 max-sm:[&>*]:flex-1 max-sm:[&>*]:basis-full">
              <BotaoWhatsapp mensagem={MENSAGENS.produto(p)} />
              {p.personalizar && <BotaoMarca variante="contorno" href={p.personalizar.href}>{p.personalizar.rotulo} <span aria-hidden="true">→</span></BotaoMarca>}
            </div>

            <div>
              <h2 className={SUBTITULO}>Sobre</h2>
              <p className="m-0 text-marca-corpo leading-relaxed text-marca-texto-2">{p.descricao}</p>
            </div>

            {p.personalizar && (
              <aside className="rounded-marca-md bg-secao-suave p-[18px] text-marca-texto">
                <strong className="mb-1.5 block text-[15px]">Prefere fazer você mesmo?</strong>
                <p className="m-0 text-sm leading-normal text-marca-texto-2">Monte no gerador, veja em 3D e baixe o arquivo (3MF multicor ou STL) para imprimir na sua impressora{canal ? ' ou mande para nós imprimirmos' : ''}.</p>
              </aside>
            )}
          </div>
        </article>

        {relacionados.length > 0 && (
          <section className="mt-[var(--marca-secao)]" aria-labelledby="relacionados-titulo">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <h2 id="relacionados-titulo" className={TITULO_2}>Mais em {secao.nome}</h2>
              <Link className={LINK_SECAO} href={`/secao/${p.secao}`}>Ver tudo →</Link>
            </div>
            <div className={GRADE_PRODUTOS}>{relacionados.map((r) => <CardProduto key={r.slug} produto={r} />)}</div>
          </section>
        )}
      </div>
    </PaginaLoja>
  );
}
