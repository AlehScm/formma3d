/**
 * Topo da home no padrao das grandes lojas (Magalu, Mercado Livre, Etsy; Baymard: a home e a
 * porta de entrada e o carrossel que gira sozinho atrapalha): um banner grande com fotos reais
 * (Natal na campanha; fora dela, as novidades), dois banners menores (Nossos geradores e Para
 * sua empresa), a faixa de vantagens e as categorias com foto. Componentes de servidor: o
 * navegador recebe so o HTML, sem a lista de pecas.
 */
import Link from 'next/link';
import { BotaoMarca, classeBotaoMarca } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import { ImagemProduto } from '@/components/loja/CardProduto';
import { IconeConversa, IconeImpressora, IconeMedida, IconePersonalizar } from '@/components/loja/icones';
import { paraResumo } from '@/lib/marketplace/api/contrato';
import { FOTOS_TOPO_NATAL, TEXTOS_NATAL } from '@/lib/marketplace/campanhas';
import { geradores, porSecao, porSlug, produtosPublicos } from '@/lib/marketplace/consultas';
import { urlDaMidia } from '@/lib/marketplace/formato';
import { VANTAGENS } from '@/lib/marketplace/loja';
import { maisRecentes } from '@/lib/marketplace/ordem';
import { NOSSOS_GERADORES, SECOES, hrefDaSecao, type Produto, type Secao } from '@/lib/marketplace/tipos';
import { Neve } from './Natal';

const comFoto = (ps: Produto[]) => ps.filter((p) => p.midias.length > 0);

/** As fotos do mosaico: as escolhidas que estao no ar, completadas pelas outras com foto. */
function fotosDoMosaico(escolhidas: string[], resto: Produto[], n = 5): Produto[] {
  const primeiro = escolhidas.map((s) => porSlug(s)).filter((p): p is Produto => !!p && p.midias.length > 0);
  return [...primeiro, ...comFoto(resto).filter((p) => !primeiro.includes(p))].slice(0, n);
}

function Mosaico({ pecas }: { pecas: Produto[] }) {
  return (
    <ul className="m-0 grid h-full min-h-72 list-none grid-cols-4 grid-rows-2 gap-2 p-0">
      {pecas.map((p, i) => (
        <li key={p.slug} className={cx('min-h-0 overflow-hidden rounded-marca-md bg-white/10', i === 0 && 'col-span-2 row-span-2')}>
          <Link href={`/produto/${p.slug}`} className="group block size-full" aria-label={p.nome}>
            {/* eslint-disable-next-line @next/next/no-img-element -- export estatico sem otimizador de imagem */}
            <img src={urlDaMidia(i === 0 ? p.midias[0]! : p.capa ?? p.midias[0]!)} alt="" loading={i < 3 ? 'eager' : 'lazy'} className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BannerPrincipal({ natal }: { natal: boolean }) {
  const pecas = natal ? fotosDoMosaico(FOTOS_TOPO_NATAL, porSecao('natal')) : fotosDoMosaico([], maisRecentes(produtosPublicos()));
  const texto = natal
    ? { selo: 'Especial de Natal', titulo: 'O Natal da sua casa, impresso em 3D', frase: TEXTOS_NATAL.vitrine, acao: { href: '/natal#colecao-natal', rotulo: 'Ver a coleção de Natal' }, extra: { href: '/natal#presentes', rotulo: 'Presentes com nome' } }
    : { selo: 'Novidades', titulo: 'Peças novas na loja', frase: 'Decoração, cozinha, organização e presentes impressos em 3D, sob medida.', acao: { href: '/pecas', rotulo: 'Ver todas as peças' }, extra: { href: NOSSOS_GERADORES.href, rotulo: 'Personalize ao vivo' } };
  return (
    <div data-campanha={natal ? 'natal' : undefined} className={cx('relative grid overflow-hidden rounded-marca-lg md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]', natal ? 'bg-natal-verde-noite text-natal-creme' : 'bg-marca-navy text-white')}>
      {natal && <Neve />}
      <div className="relative flex flex-col justify-center gap-4 p-6 md:p-10">
        <p className={cx('m-0 text-apoio font-semibold tracking-wide uppercase', natal ? 'text-natal-dourado' : 'text-marca-gelo')}>{texto.selo}</p>
        <h1 id="loja-titulo" className="m-0 font-display text-display">{texto.titulo}</h1>
        <p className="m-0 max-w-[46ch] text-corpo opacity-90">{texto.frase}</p>
        <div className="flex flex-wrap gap-3">
          <BotaoMarca href={texto.acao.href} variante={natal ? 'sucesso' : 'primario'}>{texto.acao.rotulo}</BotaoMarca>
          <Link href={texto.extra.href} className={cx(classeBotaoMarca('contorno'), 'border-current text-inherit hover:bg-white/10')}>{texto.extra.rotulo}</Link>
        </div>
      </div>
      <div className="relative h-full p-3 md:p-4">
        <Mosaico pecas={pecas} />
      </div>
    </div>
  );
}

/** Pecas dos banners menores (renders que leem bem pequenos); se uma sair do ar, entra a proxima da lista. */
const PECAS_GERADORES = ['letreiro-nome-camadas', 'chaveiro-nome'];
const PECAS_EMPRESA = ['arroba-social', 'placa-qr-wifi'];
const escolher = (slugs: string[], resto: Produto[]) => [...slugs.map((s) => porSlug(s)).filter((p): p is Produto => !!p), ...resto].filter((p, i, l) => l.indexOf(p) === i);

/** Banner menor: titulo, frase, link e ate duas pecas (render 3D dos geradores ou foto). */
function BannerMenor({ secao, titulo, frase, href, rotulo, pecas }: { secao?: Secao; titulo: string; frase: string; href: string; rotulo: string; pecas: Produto[] }) {
  return (
    <Link href={href} data-secao={secao} className="group grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-marca-lg bg-secao-suave p-5 no-underline">
      <div className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-modulo text-secao-forte">{titulo}</h2>
        <p className="m-0 text-apoio text-marca-texto-2">{frase}</p>
        <span className="text-item font-semibold text-marca-azul group-hover:underline">{rotulo} →</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {pecas.slice(0, 2).map((p) => (
          <div key={p.slug} className="aspect-square overflow-hidden rounded-marca-md bg-white">
            <ImagemProduto produto={paraResumo(p)} />
          </div>
        ))}
      </div>
    </Link>
  );
}

export function TopoLoja({ natal }: { natal: boolean }) {
  return (
    <section aria-labelledby="loja-titulo" className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <BannerPrincipal natal={natal} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
        <BannerMenor titulo={NOSSOS_GERADORES.nome} frase={NOSSOS_GERADORES.resumo} href={NOSSOS_GERADORES.href} rotulo={NOSSOS_GERADORES.chamada} pecas={escolher(PECAS_GERADORES, geradores())} />
        <BannerMenor secao="empresa" titulo={SECOES.empresa.nome} frase={SECOES.empresa.resumo} href={hrefDaSecao('empresa')} rotulo="Ver as peças" pecas={escolher(PECAS_EMPRESA, porSecao('empresa'))} />
      </div>
    </section>
  );
}

const ICONES_VANTAGEM = { medida: IconeMedida, personalizar: IconePersonalizar, impressora: IconeImpressora, conversa: IconeConversa };

/** Faixa de confianca logo abaixo do topo. */
export function FaixaVantagens() {
  return (
    <ul aria-label="Por que pedir aqui" className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-4 rounded-marca-lg bg-marca-branco p-5 lg:grid-cols-4">
      {VANTAGENS.map((v) => {
        const Icone = ICONES_VANTAGEM[v.icone];
        return (
          <li key={v.titulo} className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-gelo text-marca-azul"><Icone className="size-5" aria-hidden /></span>
            <span className="flex flex-col">
              <span className="text-item font-semibold text-marca-navy">{v.titulo}</span>
              <span className="text-apoio text-marca-texto-2">{v.texto}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** A foto que representa a categoria: a primeira peca com foto; sem foto, a primeira com gerador (render 3D). */
const capaDa = (ps: Produto[]) => comFoto(ps)[0] ?? ps[0];

/** Todas as categorias do menu, com foto e quantidade (Nossos geradores com o render 3D). */
export function GradeCategorias({ secoes }: { secoes: Secao[] }) {
  const itens = [
    { chave: 'geradores', nome: NOSSOS_GERADORES.nome, href: NOSSOS_GERADORES.href, secao: undefined, pecas: geradores() },
    ...secoes.map((s) => ({ chave: s, nome: SECOES[s].nome, href: hrefDaSecao(s), secao: s, pecas: porSecao(s) })),
  ].filter((i) => i.pecas.length);
  return (
    <nav aria-labelledby="categorias-titulo" className="flex flex-col gap-4">
      <h2 id="categorias-titulo" className="m-0 font-display text-modulo text-marca-navy">Categorias</h2>
      <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0 sm:grid-cols-5 lg:grid-cols-9">
        {itens.map((i) => {
          const capa = capaDa(i.pecas)!;
          return (
            <li key={i.chave} data-secao={i.secao}>
              <Link href={i.href} className="group flex flex-col gap-2 no-underline">
                <span className="block aspect-square overflow-hidden rounded-marca-md bg-secao-suave ring-1 ring-marca-linha transition-shadow group-hover:ring-2 group-hover:ring-secao">
                  <ImagemProduto produto={paraResumo(capa)} className="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />
                </span>
                <span className="text-item font-semibold text-marca-navy group-hover:underline">{i.nome}</span>
                <span className="-mt-1.5 text-apoio text-marca-texto-2">{i.pecas.length} {i.pecas.length === 1 ? 'peça' : 'peças'}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
