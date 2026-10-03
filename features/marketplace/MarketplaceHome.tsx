/**
 * Home da loja Scarprint: antes de tudo, uma loja de pecas impressas em 3D por secao
 * (cada uma com a sua cor filha). Geradores, editor e apoiador sao extras, no fim.
 * Componente de servidor: so produtos publicos chegam ao HTML. So Tailwind.
 */
import Link from 'next/link';
import { BotaoMarca, BotaoWhatsapp, SeloMarca, Sobretitulo } from '@/components/marca';
import { ArteSecao } from '@/components/marca/ArteSecao';
import { BlocoSecao, CardProduto, GRADE_BLOCOS, GRADE_PRODUTOS, LINK_SECAO, PaginaLoja, TITULO_2, temCanal } from '@/components/marketplace/Loja';
import { destaquesPorSecao, secoesComContagem } from '@/lib/marketplace/consultas';
import { MENSAGENS } from '@/lib/marketplace/contato';
import { SECOES } from '@/lib/marketplace/tipos';

export function MarketplaceHome() {
  const contagem = secoesComContagem();
  const vitrines = destaquesPorSecao(4).filter((v) => v.produtos.length);
  const canal = temCanal();

  return (
    <PaginaLoja>
      <section aria-labelledby="loja-titulo" className="grid grid-cols-1 items-center gap-[clamp(24px,4vw,72px)] border-b border-marca-linha bg-marca-suave px-margem py-[clamp(36px,6vw,96px)] md:grid-cols-2">
        <div>
          <Sobretitulo>Loja de impressão 3D</Sobretitulo>
          <h1 id="loja-titulo" className="my-[18px] font-display text-marca-display leading-[0.98] font-black tracking-[-0.065em] text-marca-navy">
            Peças impressas em 3D, <em className="texto-gradiente not-italic">feitas para você.</em>
          </h1>
          <p className="m-0 max-w-[560px] text-[clamp(17px,1.5vw,21px)] leading-normal text-marca-texto-2">Para a sua casa, a sua coleção, a sua empresa e as suas festas. Escolha a seção e encontre a peça.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <BotaoMarca href="#secoes">Ver as seções ↓</BotaoMarca>
            <BotaoMarca variante="fantasma" href="/criar">Ou personalize a sua →</BotaoMarca>
          </div>
        </div>
        <div aria-hidden="true" className="grid max-w-[520px] grid-cols-2 gap-vao md:max-w-none">
          {contagem.slice(0, 4).map(({ secao }, i) => (
            <div key={secao} data-secao={secao} className={`relative aspect-[6/5] overflow-hidden rounded-marca-lg border border-secao-borda shadow-marca-1 ${i === 1 || i === 2 ? 'sm:translate-y-[18px]' : ''}`}>
              <ArteSecao secao={secao} />
              <span className="absolute bottom-3 left-3 rounded-marca-pilula bg-marca-vidro px-3 py-1.5 text-[11px] font-extrabold text-secao-forte sm:text-[13px]">{SECOES[secao].nome}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="secoes" aria-labelledby="secoes-titulo" className="px-margem pt-[var(--marca-secao)] pb-[clamp(28px,4vw,48px)]">
        <h2 id="secoes-titulo" className={`${TITULO_2} mb-[clamp(18px,2.4vw,28px)]`}>Seções da loja</h2>
        <div className={GRADE_BLOCOS}>
          {contagem.map(({ secao, total }) => <BlocoSecao key={secao} secao={secao} total={total} />)}
        </div>
      </section>

      {vitrines.map(({ secao, produtos }) => (
        <section key={secao} data-secao={secao} aria-labelledby={`vitrine-${secao}`} className="border-t border-marca-linha px-margem py-[clamp(32px,4vw,56px)]">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <h2 id={`vitrine-${secao}`} className={`${TITULO_2} flex items-center gap-3 before:size-3.5 before:rounded-full before:bg-secao before:ring-[5px] before:ring-secao-suave before:content-['']`}>{SECOES[secao].nome}</h2>
              <p className="mt-1.5 mb-0 text-marca-texto-2">{SECOES[secao].resumo}</p>
            </div>
            <Link className={LINK_SECAO} href={`/secao/${secao}`}>Ver tudo de {SECOES[secao].nome} →</Link>
          </div>
          <div className={GRADE_PRODUTOS}>{produtos.map((p) => <CardProduto key={p.slug} produto={p} />)}</div>
        </section>
      ))}

      <section aria-labelledby="extra-titulo" className="mt-[var(--marca-secao)] flex flex-wrap items-center justify-between gap-x-12 gap-y-5 border-y border-marca-linha bg-marca-gelo px-margem py-[clamp(32px,4vw,56px)]">
        <div>
          <Sobretitulo>Faça você mesmo</Sobretitulo>
          <h2 id="extra-titulo" className={`${TITULO_2} mt-3 mb-2.5`}>Quer a peça do seu jeito?</h2>
          <p className="m-0 max-w-[640px] leading-relaxed text-marca-texto-2">Monte o seu chaveiro, letreiro, placa ou QR no gerador, veja em 3D e baixe o arquivo para imprimir. No editor, dá para montar letreiros e estimar o orçamento.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <BotaoMarca href="/criar">Abrir os geradores</BotaoMarca>
          <BotaoMarca variante="contorno" href="/editor">Editor de letreiros</BotaoMarca>
          {canal && <BotaoWhatsapp mensagem={MENSAGENS.arquivo()} variante="contorno">Enviar o meu arquivo</BotaoWhatsapp>}
        </div>
      </section>

      <section id="apoiador" aria-labelledby="apoiador-titulo" className="flex flex-wrap items-center justify-between gap-x-12 gap-y-5 px-margem py-[clamp(32px,4vw,56px)]">
        <div>
          <SeloMarca tom="validacao">Licença em validação</SeloMarca>
          <h2 id="apoiador-titulo" className="mt-3 mb-2 font-display text-[clamp(24px,2.4vw,32px)] leading-[1.05] font-black tracking-[-0.05em] text-marca-navy">Seja apoiador</h2>
          <p className="m-0 max-w-[640px] leading-relaxed text-marca-texto-2">Apoiadores poderão usar os nossos geradores para imprimir os próprios modelos. Benefícios e condições ainda estão em validação.</p>
        </div>
        {canal ? <BotaoWhatsapp mensagem={MENSAGENS.apoiador()} variante="contorno">Quero saber mais</BotaoWhatsapp> : <BotaoMarca variante="contorno" href="/criar">Conhecer os geradores</BotaoMarca>}
      </section>
    </PaginaLoja>
  );
}
