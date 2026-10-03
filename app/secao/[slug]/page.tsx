import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArteSecao } from '@/components/marca/ArteSecao';
import { BotaoMarca, BotaoWhatsapp } from '@/components/marca';
import { PaginaLoja, temCanal } from '@/components/marketplace/Loja';
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
      <section className="l-secao-topo" aria-labelledby="secao-titulo">
        <div>
          <nav aria-label="Você está em" className="l-trilha">
            <Link href="/">Loja</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{s.nome}</span>
          </nav>
          <h1 id="secao-titulo">{s.nome}</h1>
          <p>{s.chamada}. {s.resumo}</p>
        </div>
        <div className="l-secao-arte"><ArteSecao secao={slug} /></div>
      </section>
      <div className="l-margem" style={{ paddingBlock: 'clamp(28px, 4vw, 56px)' }}>
        {produtos.length ? (
          <VitrineSecao produtos={produtos} nomeSecao={s.nome} />
        ) : (
          <div className="l-vazio">
            <strong>Chegando em breve</strong>
            <p>Estamos preparando as peças de {s.nome.toLowerCase()}.{temCanal() ? ' Quer ser avisado quando chegarem?' : ''}</p>
            {temCanal() ? <BotaoWhatsapp mensagem={`Olá, Scarprint! Quero saber quando chegarem as peças de ${s.nome}.`}>Me avise</BotaoWhatsapp> : <BotaoMarca variante="contorno" href="/">Ver as outras seções</BotaoMarca>}
          </div>
        )}
      </div>
    </PaginaLoja>
  );
}
