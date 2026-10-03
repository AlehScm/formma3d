import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArteSecao } from '@/components/marca/ArteSecao';
import { BotaoMarca, BotaoWhatsapp } from '@/components/marca';
import { PaginaLoja, TRILHA, VAZIO, temCanal } from '@/components/marketplace/Loja';
import { VitrineSecao } from '@/components/marketplace/VitrineSecao';
import { ehSecao, porSecao } from '@/lib/marketplace/consultas';
import { MENSAGENS } from '@/lib/marketplace/contato';
import { ORDEM_SECOES, SECOES } from '@/lib/marketplace/tipos';

// Uma pagina por secao (export estatico), mesmo as que ainda nao tem pecas publicas.
export const dynamicParams = false;

export function generateStaticParams() {
  return ORDEM_SECOES.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return ehSecao(slug) ? { title: `${SECOES[slug].nome} | Scarprint`, description: SECOES[slug].resumo } : {};
}

export default async function SecaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!ehSecao(slug)) notFound();
  const s = SECOES[slug];
  const produtos = porSecao(slug);
  return (
    <PaginaLoja secaoAtual={slug}>
      <section className="grid grid-cols-1 items-center gap-[clamp(20px,4vw,64px)] border-b border-secao-borda bg-secao-fundo px-margem py-[clamp(24px,3.5vw,48px)] md:grid-cols-[minmax(0,1fr)_minmax(0,420px)]" aria-labelledby="secao-titulo">
        <div>
          <nav aria-label="Você está em" className={TRILHA}>
            <Link href="/">Loja</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{s.nome}</span>
          </nav>
          <h1 id="secao-titulo" className="mt-3 mb-2.5 font-display text-marca-display leading-[0.98] font-black tracking-[-0.06em] text-marca-navy">{s.nome}</h1>
          <p className="m-0 max-w-[560px] text-marca-destaque leading-normal text-marca-texto-2">{s.chamada}. {s.resumo}</p>
        </div>
        <div className="aspect-[6/5] max-w-[420px] overflow-hidden rounded-marca-lg border border-secao-borda shadow-marca-1"><ArteSecao secao={slug} /></div>
      </section>
      <div className="px-margem py-[clamp(28px,4vw,56px)]">
        {produtos.length ? (
          <VitrineSecao produtos={produtos} nomeSecao={s.nome} />
        ) : (
          <div className={VAZIO}>
            <strong className="text-lg text-secao-forte">Chegando em breve</strong>
            <p className="m-0 text-marca-texto-2">Estamos preparando as peças de {s.nome.toLowerCase()}.{temCanal() ? ' Quer ser avisado quando chegarem?' : ''}</p>
            {temCanal() ? <BotaoWhatsapp mensagem={`Olá, Scarprint! Quero saber quando chegarem as peças de ${s.nome}.`}>Me avise</BotaoWhatsapp> : <BotaoMarca variante="contorno" href="/">Ver as outras seções</BotaoMarca>}
          </div>
        )}
      </div>
    </PaginaLoja>
  );
}
