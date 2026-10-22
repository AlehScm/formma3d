'use client';

import Link from 'next/link';
import { useState } from 'react';
import { editoresLivres, emBreve, familias, tipoDaFamilia } from '@/features/catalogo/catalogo';
import { FICHAS } from '@/lib/gerador/receitas/fichas';
import { COBERTURA } from '@/lib/gerador/cobertura';
import { Miniatura } from '@/features/catalogo/Miniaturas';
import { PaginaLoja } from '@/components/marketplace/Loja';
import { BotaoMarca, CartaoMarca, classeBotaoMarca } from '@/components/marca';
import { cx } from '@/components/ui/cx';
import './catalogo.css';

type Familia = keyof typeof familias;


/** Modelos da vitrine do topo (fotos reais dos geradores). */
const VITRINE = ['palavra-camadas', 'chaveiro-nome', 'social-camadas'];
const RECEITAS_PARCIAIS = new Set(COBERTURA.filter((c) => c.status === 'parcial' && c.receita).map((c) => c.receita));

/** `naLoja`: gerador -> peca da loja feita com ele (vem do servidor; o banco nao vai para o navegador). */
export function CatalogoScarprint({ naLoja = {} }: { naLoja?: Record<string, string> }) {
  // Todo gerador tem peca no banco (verificar-marketplace); o /design e so a reserva.
  const pecaDo = (id: string) => naLoja[id] ? `/produto/${naLoja[id]}` : `/design?modelo=${id}`;
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
              <div className="flex items-center gap-2 text-apoio font-semibold text-marca-azul-forte"><span className="size-[7px] rounded-full bg-marca-ciano ring-4 ring-marca-gelo" aria-hidden="true" /> Modelos 3D personalizados</div>
              <h1 id="catalog-title" className="my-5 font-display text-display text-marca-navy">Escolha. Personalize.<br /><em className="texto-gradiente not-italic">Imprima.</em></h1>
              <p className="max-w-[525px] text-corpo text-marca-texto-2">Letreiros, chaveiros e placas com o seu texto, as suas cores e o seu tamanho. Você personaliza, vê em 3D e pede o orçamento.</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <BotaoMarca href="#modelos">Ver os modelos <span aria-hidden="true">↓</span></BotaoMarca>
                <BotaoMarca href="/design" variante="contorno">Montar do zero</BotaoMarca>
              </div>
              <div className="mt-8 flex flex-wrap gap-6 text-apoio text-marca-texto-3 max-sm:mt-6 max-sm:gap-4">
                <span className="flex items-center gap-2"><b className="text-modulo text-marca-azul">{FICHAS.length}</b> geradores disponíveis</span>
                <span className="flex items-center gap-2"><b className="text-modulo text-marca-azul">{editoresLivres.length}</b> editores livres</span>
                <span className="flex items-center gap-2"><b className="text-modulo text-marca-azul">{emBreve.length}</b> chegando</span>
              </div>
            </div>
            <div className="hero-vitrine relative h-[clamp(300px,30vw,460px)] max-[980px]:h-[320px] max-sm:h-[230px]" aria-hidden="true">
              {VITRINE.map((id, i) => {
                const f = FICHAS.find((x) => x.id === id)!;
                return (
                  <Link key={id} href={pecaDo(id)} className={`hero-peca hero-peca-${i + 1}`} tabIndex={-1}>
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
              <span className="text-modulo leading-none" aria-hidden="true">⌕</span>
              <input className="min-w-0 flex-1 border-0 bg-transparent text-item text-marca-navy outline-none placeholder:text-marca-texto-3" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar: chaveiro, @, placa, emoji…" aria-label="Buscar modelos" />
            </label>
            <div className="flex flex-wrap gap-2" aria-label="Filtrar por tipo">
              {filtros.map((f) => (
                <button key={f} type="button" className={`min-h-11 cursor-pointer rounded-marca-pilula border px-3.5 py-2 text-apoio font-bold transition-colors ${familia === f ? 'border-marca-azul bg-marca-gelo text-marca-azul-forte' : 'border-marca-linha bg-marca-branco text-marca-texto-2 hover:bg-marca-palido'}`} onClick={() => setFamilia(f)} aria-pressed={familia === f}>
                  {f === 'todos' ? 'Todos' : familias[f]}
                </button>
              ))}
            </div>
          </div>

          {prontos.length > 0 && (
            <Secao titulo="Geradores disponíveis" texto="Escolha um modelo, personalize e peça o orçamento.">
              <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-vao">
                {prontos.map((f) => (
                  <CardModelo key={f.id} href={pecaDo(f.id)} nome={f.nome} resumo={f.resumo} familia={f.familia}
                    etiqueta={f.tipo ?? tipoDaFamilia[f.familia]} emEvolucao={RECEITAS_PARCIAIS.has(f.id)} acao="Personalizar"
                    foto={<Miniatura id={f.id} alt={`Exemplo: ${f.nome}`} reserva={<VisualReserva id={f.id} family={f.familia} />} />} />
                ))}
              </div>
            </Secao>
          )}

          {editores.length > 0 && (
            <Secao titulo="Editores livres" texto="Para montar do zero, peça por peça, quando nenhum modelo pronto serve.">
              <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-vao">
                {editores.map((e) => (
                  <CardModelo key={e.id} href={e.href} nome={e.title} resumo={e.summary} familia={e.family}
                    etiqueta={`Editor · ${tipoDaFamilia[e.family]}`} acao="Abrir editor"
                    foto={<VisualReserva id={e.visual} family={e.family} />} />
                ))}
              </div>
            </Secao>
          )}

          {breve.length > 0 && (
            <Secao titulo="Em breve" texto="Modelos que estamos preparando.">
              <ul className="mt-[18px] grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-2.5 p-0">
                {breve.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-marca-md border border-dashed border-marca-linha bg-marca-palido px-3.5 py-3 text-marca-texto-3">
                    <span className="grid size-[38px] shrink-0 place-items-center rounded-marca-md bg-marca-gelo text-modulo text-marca-texto-3" aria-hidden="true">{m.icon}</span>
                    <span><b className="block text-item font-semibold text-marca-texto-2">{m.title}</b><small className="mt-0.5 block text-apoio">{m.summary}</small></span>
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
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 border-b border-marca-linha pb-3.5"><h2 className="m-0 font-display text-modulo text-marca-navy">{titulo}</h2><p className="m-0 text-apoio text-marca-texto-3">{texto}</p></div>
      {children}
    </section>
  );
}

/** Card de gerador e de editor livre: o mesmo molde e um botao so, igual em todos. O card
 *  inteiro e o link (gerador -> pagina da peca; editor -> o editor). */
function CardModelo({ href, nome, resumo, familia, etiqueta, emEvolucao, foto, acao }: {
  href: string; nome: string; resumo: string; familia: Familia; etiqueta: string; emEvolucao?: boolean;
  foto: React.ReactNode; acao: string;
}) {
  return (
    <CartaoMarca href={href} className="catalog-card">
      <div className={`catalog-card-foto foto-${familia}`}>{foto}</div>
      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="self-start rounded-md bg-marca-gelo px-2.5 py-1 text-apoio font-extrabold text-marca-azul-forte">{etiqueta}</span>
          {emEvolucao && <span className="rounded-md bg-marca-atencao-fundo px-2.5 py-1 text-apoio font-extrabold text-marca-atencao" title="Algumas opções desta família ainda estão em desenvolvimento">Em evolução</span>}
        </div>
        <h3 className="mt-2 mb-1 text-item font-bold text-marca-navy">{nome}</h3>
        <p className="m-0 line-clamp-2 text-apoio leading-normal text-marca-texto-2">{resumo}</p>
        <div className="mt-auto pt-3"><span className={cx(classeBotaoMarca('primario', true), 'w-full')}>{acao} <span aria-hidden="true">→</span></span></div>
      </div>
    </CartaoMarca>
  );
}

/** Desenho de reserva (sem WebGL) e ilustracao dos editores. */
function VisualReserva({ id, family }: { id: string; family: Familia }) {
  switch (id) {
    case 'texto-livre': return <div className="preview-letters"><span>S</span><span>C</span><span>A</span><span>R</span></div>;
    case 'palavra-camadas': return <div className="preview-layers"><span>SCAR</span><span>SCAR</span><span>SCAR</span></div>;
    case 'social-camadas': return <div className="preview-social"><span>@</span><b>scarprint</b></div>;
    case 'logo-camadas': return <div className="preview-sign"><span>LOGO</span><small>CAMADAS</small></div>;
    case 'floco-neve': return <div className="preview-snowflake">❄</div>;
    case 'topo-bolo':
    case 'topo-bolo-circular': return <div className="preview-cake"><span>★</span><b>FESTA</b><i /></div>;
    case 'marcador-pagina': return <div className="preview-bookmark"><span>SCAR</span></div>;
    case 'plaquinha-pet': return <div className="preview-pet"><span>🐾</span><b>SCAR</b></div>;
    case 'pingente-familia': return <div className="preview-pendant"><span>♥ SCAR</span><span>♥ PRINT</span><span>● 3D</span></div>;
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
