'use client';

import Link from 'next/link';
import { useState } from 'react';
import { editoresLivres, emBreve, familias } from '@/features/catalogo/catalogo';
import { FICHAS, type Ficha } from '@/lib/gerador/receitas/fichas';
import { COBERTURA } from '@/lib/gerador/cobertura';
import { Miniatura } from '@/features/catalogo/Miniaturas';
import { PaginaLoja } from '@/components/marketplace/Loja';
import { BotaoMarca, CartaoMarca } from '@/components/marca';
import './catalogo.css';

type Familia = keyof typeof familias;

/** Etiqueta do card: o que a coisa e, no singular. */
const tipoDe: Record<Familia, string> = {
  multicor: 'Letreiro em camadas', chaveiros: 'Chaveiro', texto: 'Letra caixa', placas: 'Placa',
  qr: 'QR code', cortadores: 'Cortador', carimbos: 'Carimbo', parametricos: 'Peça paramétrica',
};

/** Modelos da vitrine do topo (fotos reais dos geradores). */
const VITRINE = ['palavra-camadas', 'chaveiro-nome', 'social-camadas'];
const RECEITAS_PARCIAIS = new Set(COBERTURA.filter((c) => c.status === 'parcial' && c.receita).map((c) => c.receita));

export function CatalogoScarprint() {
  const [busca, setBusca] = useState('');
  const [familia, setFamilia] = useState<Familia | 'todos'>('todos');
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const passa = (fam: Familia, ...textos: string[]) =>
    (familia === 'todos' || fam === familia) && (!termo || [...textos, familias[fam]].join(' ').toLocaleLowerCase('pt-BR').includes(termo));

  const prontos = FICHAS.filter((f) => passa(f.familia, f.nome, f.resumo, f.tipo ?? '', ...f.destaques));
  const editores = editoresLivres.filter((e) => passa(e.family, e.title, e.summary, ...e.destaques));
  const breve = emBreve.filter((m) => passa(m.family, m.title, m.summary));
  const comAlgo = new Set<Familia>([...FICHAS.map((f) => f.familia), ...editoresLivres.map((e) => e.family), ...emBreve.map((m) => m.family)]);
  const filtros: (Familia | 'todos')[] = ['todos', ...(Object.keys(familias) as Familia[]).filter((f) => comAlgo.has(f))];
  const nada = !prontos.length && !editores.length && !breve.length;

  return (
    <PaginaLoja>
      <div className="bg-marca-palido font-marca text-marca-texto">
        <section className="bg-marca-suave" aria-labelledby="catalog-title">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-[clamp(28px,4vw,72px)] px-margem pt-10 pb-11 max-[980px]:grid-cols-1">
            <div>
              <div className="flex items-center gap-2 text-marca-mini font-black tracking-[0.18em] text-marca-azul-forte"><span className="size-[7px] rounded-full bg-marca-ciano ring-4 ring-marca-gelo" aria-hidden="true" /> MODELOS 3D PERSONALIZADOS</div>
              <h1 id="catalog-title" className="my-5 font-display text-[clamp(42px,5.2vw,72px)] leading-none font-black tracking-[-0.075em] text-marca-navy max-sm:text-[clamp(36px,10vw,54px)]">Escolha. Personalize.<br /><em className="texto-gradiente not-italic">Imprima.</em></h1>
              <p className="max-w-[525px] text-marca-corpo leading-relaxed text-marca-texto-2">Letreiros, chaveiros e placas que você ajusta com o seu texto, as suas cores e o seu tamanho, e baixa pronto para a impressora: 3MF multicor ou STL.</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <BotaoMarca href="#modelos">Ver os modelos <span aria-hidden="true">↓</span></BotaoMarca>
                <BotaoMarca href="/editor" variante="contorno">Montar do zero</BotaoMarca>
              </div>
              <div className="mt-8 flex flex-wrap gap-6 text-marca-pequeno text-marca-texto-3 max-sm:mt-6 max-sm:gap-4">
                <span className="flex items-center gap-2"><b className="text-xl tracking-tight text-marca-azul">{FICHAS.length}</b> geradores disponíveis</span>
                <span className="flex items-center gap-2"><b className="text-xl tracking-tight text-marca-azul">{editoresLivres.length}</b> editores livres</span>
                <span className="flex items-center gap-2"><b className="text-xl tracking-tight text-marca-azul">{emBreve.length}</b> chegando</span>
              </div>
            </div>
            <div className="hero-vitrine relative h-[clamp(300px,30vw,460px)] max-[980px]:h-[320px] max-sm:h-[230px]" aria-hidden="true">
              {VITRINE.map((id, i) => {
                const f = FICHAS.find((x) => x.id === id)!;
                return (
                  <Link key={id} href={`/moldes/${id}`} className={`hero-peca hero-peca-${i + 1}`} tabIndex={-1}>
                    <Miniatura id={id} alt={f.nome} reserva={<VisualReserva id={id} family={f.familia} />} />
                    <span>{f.nome}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="scroll-mt-20 border-t border-marca-linha bg-marca-branco px-margem pt-8 pb-20" id="modelos" aria-label="Modelos">
          <div className="flex flex-wrap items-center gap-x-[18px] gap-y-3.5">
            <label className="flex h-[46px] w-[min(100%,420px)] items-center gap-2 rounded-marca-md border border-marca-linha bg-marca-palido px-3.5 text-marca-azul focus-within:border-marca-azul focus-within:shadow-marca-foco">
              <span className="text-2xl leading-none" aria-hidden="true">⌕</span>
              <input className="min-w-0 flex-1 border-0 bg-transparent text-sm text-marca-navy outline-none placeholder:text-marca-texto-3" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar: chaveiro, @, placa, emoji…" aria-label="Buscar modelos" />
            </label>
            <div className="flex flex-wrap gap-2" aria-label="Filtrar por tipo">
              {filtros.map((f) => (
                <button key={f} type="button" className={`cursor-pointer rounded-marca-pilula border px-3.5 py-2 text-[13px] font-bold transition-colors ${familia === f ? 'border-marca-azul bg-marca-gelo text-marca-azul-forte' : 'border-marca-linha bg-marca-branco text-marca-texto-2 hover:bg-marca-palido'}`} onClick={() => setFamilia(f)} aria-pressed={familia === f}>
                  {f === 'todos' ? 'Todos' : familias[f]}
                </button>
              ))}
            </div>
          </div>

          {prontos.length > 0 && (
            <Secao titulo="Geradores disponíveis" texto="Escolha um modelo, confira as opções disponíveis e exporte para imprimir.">
              <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-vao">
                {prontos.map((f) => <CardGerador key={f.id} f={f} />)}
              </div>
            </Secao>
          )}

          {editores.length > 0 && (
            <Secao titulo="Editores livres" texto="Para montar do zero, peça por peça, quando nenhum modelo pronto serve.">
              <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-vao">
                {editores.map((e) => (
                  <CartaoMarca key={e.id} href={e.href} className="catalog-card">
                    <div className={`catalog-card-foto foto-${e.family}`}><VisualReserva id={e.visual} family={e.family} /></div>
                    <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
                      <span className="self-start rounded-md bg-marca-gelo px-2.5 py-1 text-[11px] font-extrabold text-marca-azul-forte">Editor · {tipoDe[e.family]}</span>
                      <h3 className="mt-2 mb-1 text-[17px] leading-tight font-black tracking-tight text-marca-navy">{e.title}</h3>
                      <p className="m-0 line-clamp-2 text-[13px] leading-normal text-marca-texto-2">{e.summary}</p>
                      <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-[11px] text-marca-texto-3"><span>Montagem livre</span><span className="rounded-marca-pilula bg-marca px-4 py-2 text-[13px] font-extrabold whitespace-nowrap text-white">Abrir <span aria-hidden="true">→</span></span></div>
                    </div>
                  </CartaoMarca>
                ))}
              </div>
            </Secao>
          )}

          {breve.length > 0 && (
            <Secao titulo="Em breve" texto="Modelos que estamos preparando.">
              <ul className="mt-[18px] grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-2.5 p-0">
                {breve.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-marca-md border border-dashed border-marca-linha bg-marca-palido px-3.5 py-3 text-marca-texto-3">
                    <span className="grid size-[38px] shrink-0 place-items-center rounded-marca-md bg-marca-gelo text-lg font-black text-marca-texto-3" aria-hidden="true">{m.icon}</span>
                    <span><b className="block text-sm text-marca-texto-2">{m.title}</b><small className="mt-0.5 block text-xs">{m.summary}</small></span>
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {nada && (
            <div className="mt-10 rounded-marca-md border border-dashed border-marca-linha px-5 py-[72px] text-center text-marca-profundo">
              <b>Nenhum modelo encontrado</b>
              <p className="my-2.5 text-marca-texto-3">Tente outra busca ou escolha “Todos”.</p>
              <button className="cursor-pointer rounded-marca-md border border-marca-linha bg-marca-gelo px-3.5 py-2.5 text-marca-azul-forte" type="button" onClick={() => { setBusca(''); setFamilia('todos'); }}>Limpar filtros</button>
            </div>
          )}
        </section>
      </div>
    </PaginaLoja>
  );
}

function Secao({ titulo, texto, children }: { titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <section className="mt-11">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 border-b border-marca-linha pb-3.5"><h2 className="m-0 text-[clamp(22px,2vw,30px)] font-black tracking-[-0.04em] text-marca-navy">{titulo}</h2><p className="m-0 text-sm text-marca-texto-3">{texto}</p></div>
      {children}
    </section>
  );
}

function CardGerador({ f }: { f: Ficha }) {
  return (
    <CartaoMarca href={`/moldes/${f.id}`} className="catalog-card">
      <div className={`catalog-card-foto foto-${f.familia}`}>
        <Miniatura id={f.id} alt={`Exemplo: ${f.nome}`} reserva={<VisualReserva id={f.id} family={f.familia} />} />
      </div>
      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="self-start rounded-md bg-marca-gelo px-2.5 py-1 text-[11px] font-extrabold text-marca-azul-forte">{f.tipo ?? tipoDe[f.familia]}</span>
          {RECEITAS_PARCIAIS.has(f.id) && <span className="rounded-md bg-marca-atencao-fundo px-2.5 py-1 text-[11px] font-extrabold text-marca-atencao" title="Algumas opções desta família ainda estão em desenvolvimento">Em evolução</span>}
        </div>
        <h3 className="mt-2 mb-1 text-[17px] leading-tight font-black tracking-tight text-marca-navy">{f.nome}</h3>
        <p className="m-0 line-clamp-2 text-[13px] leading-normal text-marca-texto-2">{f.resumo}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-[11px] text-marca-texto-3"><span>3MF multicor · STL</span><span className="rounded-marca-pilula bg-marca px-4 py-2 text-[13px] font-extrabold whitespace-nowrap text-white">Criar <span aria-hidden="true">→</span></span></div>
      </div>
    </CartaoMarca>
  );
}

/** Desenho de reserva (sem WebGL) e ilustracao dos editores. */
function VisualReserva({ id, family }: { id: string; family: Familia }) {
  switch (id) {
    case 'texto-livre': return <div className="preview-letters"><span>S</span><span>C</span><span>A</span><span>R</span></div>;
    case 'palavra-camadas': return <div className="preview-layers"><span>BOLOS</span><span>BOLOS</span><span>BOLOS</span></div>;
    case 'social-camadas': return <div className="preview-social"><span>@</span><b>scarprint</b></div>;
    case 'placa-personalizada': return <div className="preview-sign"><span>STUDIO</span><small>DESIGN · CRIAÇÃO</small></div>;
    case 'placa-profissional': return <div className="preview-nameplate"><small>SEU NEGÓCIO</small><b>MARCA</b><i /></div>;
    case 'logo-camadas': return <div className="preview-sign"><span>LOGO</span><small>CAMADAS</small></div>;
    case 'floco-neve': return <div className="preview-snowflake">❄</div>;
    case 'topo-bolo':
    case 'topo-bolo-circular': return <div className="preview-cake"><span>★</span><b>FESTA</b><i /></div>;
    case 'marcador-pagina': return <div className="preview-bookmark"><span>ANA</span></div>;
    case 'plaquinha-pet': return <div className="preview-pet"><span>🐾</span><b>LUNA</b></div>;
    case 'pingente-familia': return <div className="preview-pendant"><span>♥ ANA</span><span>♥ LEO</span><span>● MEL</span></div>;
    default:
      if (family === 'chaveiros') return <div className="preview-keychain"><i /><b>A</b></div>;
      if (family === 'cortadores') return <div className="preview-cutter"><span>✦</span></div>;
      if (family === 'carimbos') return <div className="preview-stamp"><span>CARIMBO</span></div>;
      if (family === 'parametricos') return <div className="preview-parametric">{Array.from({ length: 12 }, (_, i) => <span key={i} />)}</div>;
      if (family === 'multicor') return <div className="preview-layers"><span>BASE</span><span>MEIO</span><span>TOPO</span></div>;
      if (family === 'qr') return <div className="preview-qr"><span>⌗</span><small>QR CODE</small></div>;
      return <div className="preview-letters"><span>A</span><span>b</span><span>c</span></div>;
  }
}
