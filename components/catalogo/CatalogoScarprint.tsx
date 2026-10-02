'use client';

import Link from 'next/link';
import { useState } from 'react';
import { editoresLivres, emBreve, familias } from '@/features/catalogo/catalogo';
import { FICHAS, type Ficha } from '@/lib/gerador/receitas/fichas';
import { COBERTURA } from '@/lib/gerador/cobertura';
import { Miniatura } from '@/features/catalogo/Miniaturas';
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
    <div className="catalog-page">
      <header className="catalog-header">
        <Link href="/" className="catalog-brand" aria-label="Scarprint, início">
          <span className="catalog-wordmark">SCAR<span>PRINT</span></span>
          <small>DESIGN STUDIO</small>
        </Link>
        <nav aria-label="Navegação principal">
          <a href="#modelos">Modelos</a>
          <Link href="/editor" className="catalog-editor-link">Editor livre <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <main>
        <section className="catalog-hero" aria-labelledby="catalog-title">
          <div className="catalog-hero-inner">
            <div className="catalog-hero-copy">
              <div className="catalog-eyebrow"><span aria-hidden="true" /> MODELOS 3D PERSONALIZADOS</div>
              <h1 id="catalog-title">Escolha. Personalize.<br /><em>Imprima.</em></h1>
              <p>Letreiros, chaveiros e placas que você ajusta com o seu texto, as suas cores e o seu tamanho, e baixa pronto para a impressora: 3MF multicor ou STL.</p>
              <div className="catalog-hero-actions">
                <a href="#modelos">Ver os modelos <span aria-hidden="true">↓</span></a>
                <Link href="/editor">Montar do zero</Link>
              </div>
              <div className="catalog-hero-meta">
                <span><b>{FICHAS.length}</b> geradores disponíveis</span>
                <span><b>{editoresLivres.length}</b> editores livres</span>
                <span><b>{emBreve.length}</b> chegando</span>
              </div>
            </div>
            <div className="hero-vitrine" aria-hidden="true">
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

        <section className="catalog-library" id="modelos" aria-label="Modelos">
          <div className="catalog-toolbar">
            <label className="catalog-search">
              <span aria-hidden="true">⌕</span>
              <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar: chaveiro, @, placa, emoji…" aria-label="Buscar modelos" />
            </label>
            <div className="catalog-filters" aria-label="Filtrar por tipo">
              {filtros.map((f) => (
                <button key={f} type="button" className={familia === f ? 'active' : ''} onClick={() => setFamilia(f)} aria-pressed={familia === f}>
                  {f === 'todos' ? 'Todos' : familias[f]}
                </button>
              ))}
            </div>
          </div>

          {prontos.length > 0 && (
            <Secao titulo="Geradores disponíveis" texto="Escolha um modelo, confira as opções disponíveis e exporte para imprimir.">
              <div className="catalog-grid">
                {prontos.map((f) => <CardGerador key={f.id} f={f} />)}
              </div>
            </Secao>
          )}

          {editores.length > 0 && (
            <Secao titulo="Editores livres" texto="Para montar do zero, peça por peça, quando nenhum modelo pronto serve.">
              <div className="catalog-grid">
                {editores.map((e) => (
                  <Link key={e.id} href={e.href} className="card">
                    <div className={`card-foto foto-${e.family}`}><VisualReserva id={e.visual} family={e.family} /></div>
                    <div className="card-corpo">
                      <span className="card-tag">Editor · {tipoDe[e.family]}</span>
                      <h3>{e.title}</h3>
                      <p>{e.summary}</p>
                      <Destaques itens={e.destaques} />
                      <div className="card-rodape"><span>Montagem livre</span><span className="card-cta">Abrir <span aria-hidden="true">→</span></span></div>
                    </div>
                  </Link>
                ))}
              </div>
            </Secao>
          )}

          {breve.length > 0 && (
            <Secao titulo="Em breve" texto="Modelos que estamos preparando.">
              <ul className="em-breve">
                {breve.map((m) => (
                  <li key={m.id}>
                    <span className="em-breve-icone" aria-hidden="true">{m.icon}</span>
                    <span><b>{m.title}</b><small>{m.summary}</small></span>
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {nada && (
            <div className="catalog-empty">
              <b>Nenhum modelo encontrado</b>
              <p>Tente outra busca ou escolha “Todos”.</p>
              <button type="button" onClick={() => { setBusca(''); setFamilia('todos'); }}>Limpar filtros</button>
            </div>
          )}
        </section>
      </main>
      <footer className="catalog-footer"><span>SCARPRINT DESIGN STUDIO</span><span>Modelos 3D sob medida, prontos para imprimir.</span></footer>
    </div>
  );
}

function Secao({ titulo, texto, children }: { titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <section className="catalog-secao">
      <div className="catalog-secao-titulo"><h2>{titulo}</h2><p>{texto}</p></div>
      {children}
    </section>
  );
}

function Destaques({ itens }: { itens: readonly string[] }) {
  return <ul className="card-destaques">{itens.map((d) => <li key={d}>{d}</li>)}</ul>;
}

function CardGerador({ f }: { f: Ficha }) {
  return (
    <Link href={`/moldes/${f.id}`} className="card">
      <div className={`card-foto foto-${f.familia}`}>
        <Miniatura id={f.id} alt={`Exemplo: ${f.nome}`} reserva={<VisualReserva id={f.id} family={f.familia} />} />
      </div>
      <div className="card-corpo">
        <div className="card-tag-row">
          <span className="card-tag">{f.tipo ?? tipoDe[f.familia]}</span>
          {RECEITAS_PARCIAIS.has(f.id) && <span className="card-status" title="Algumas opções desta família ainda estão em desenvolvimento">Em evolução</span>}
        </div>
        <h3>{f.nome}</h3>
        <p>{f.resumo}</p>
        <Destaques itens={f.destaques} />
        <div className="card-rodape"><span>3MF multicor · STL</span><span className="card-cta">Criar <span aria-hidden="true">→</span></span></div>
      </div>
    </Link>
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
