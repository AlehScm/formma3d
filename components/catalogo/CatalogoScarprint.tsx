'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { familias, moldes, type MoldeId } from '@/features/catalogo/catalogo';
import './catalogo.css';

type Familia = keyof typeof familias;
const categorias: (Familia | 'todos')[] = ['todos', ...Object.keys(familias) as Familia[]];

export function CatalogoScarprint() {
  const [busca, setBusca] = useState('');
  const [familia, setFamilia] = useState<Familia | 'todos'>('todos');
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return moldes.filter((item) => (familia === 'todos' || item.family === familia)
      && (!termo || `${item.title} ${item.summary} ${familias[item.family]}`.toLocaleLowerCase('pt-BR').includes(termo)));
  }, [busca, familia]);
  const disponiveis = moldes.filter((item) => item.ativo).length;

  return <div className="catalog-page">
    <header className="catalog-header">
      <Link href="/" className="catalog-brand" aria-label="Scarprint, início"><span className="catalog-wordmark">SCAR<span>PRINT</span></span><small>DESIGN STUDIO</small></Link>
      <nav aria-label="Navegação principal"><a href="#modelos">Biblioteca</a><Link href="/editor" className="catalog-editor-link">Editor livre <span aria-hidden="true">↗</span></Link></nav>
    </header>

    <main>
      <section className="catalog-hero" aria-labelledby="catalog-title">
        <div className="catalog-hero-inner">
          <div className="catalog-hero-copy">
            <div className="catalog-eyebrow"><span aria-hidden="true" /> BIBLIOTECA DE MODELOS</div>
            <h1 id="catalog-title">CRIE SEU MOLDE.<br /><em>DO SEU JEITO.</em></h1>
            <p>Escolha um modelo, personalize o texto e continue criando no editor. Cada molde tem seu próprio espaço para você ajustar os detalhes.</p>
            <div className="catalog-hero-actions"><a href="#modelos">Explorar modelos <span aria-hidden="true">↘</span></a><Link href="/editor">Começar do zero</Link></div>
            <div className="catalog-hero-meta"><span><b>{String(disponiveis).padStart(2, '0')}</b> modelos editáveis</span><span><b>{String(Object.keys(familias).length).padStart(2, '0')}</b> famílias organizadas</span></div>
          </div>
          <div className="catalog-hero-art" aria-hidden="true">
            <div className="hero-art-label">ÁREA DE CRIAÇÃO <span>MM / 2D + 3D</span></div>
            <div className="hero-art-board"><div className="hero-art-handle" /><span>CRIE<br />SEU<br />MOLDE<i className="hero-art-cursor" /></span></div>
            <div className="hero-art-chip chip-a">TEXTO EDITÁVEL</div><div className="hero-art-chip chip-b">PLACA 400 × 160</div><div className="hero-art-guides" />
          </div>
        </div>
      </section>

      <section className="catalog-library" id="modelos" aria-labelledby="catalog-library-title"><div className="catalog-library-inner">
        <div className="catalog-section-heading"><div><span className="catalog-kicker">ESCOLHA UM CAMINHO</span><h2 id="catalog-library-title">Biblioteca de modelos</h2><p>Modelos prontos para começar e famílias que estamos preparando.</p></div><div className="catalog-count">{visiveis.length} modelos</div></div>
        <div className="catalog-toolbar"><label className="catalog-search"><span aria-hidden="true">⌕</span><input type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar modelo ou categoria" aria-label="Buscar modelos" /></label><div className="catalog-filters" aria-label="Filtrar por família">{categorias.map((item) => <button key={item} type="button" className={familia === item ? 'active' : ''} onClick={() => setFamilia(item)} aria-pressed={familia === item}>{item === 'todos' ? 'Todos' : familias[item]}</button>)}</div></div>
        {visiveis.length ? <div className="catalog-grid">{visiveis.map((item) => <article className="template-card" key={item.id}>
          <div className={`template-visual visual-${item.id}`}><TemplateVisual id={item.id} /><span className={`template-status ${item.ativo ? 'is-ready' : 'is-planned'}`}>{item.ativo ? (item.family === 'placas' ? 'Gerador 3D inicial · SVG 2D' : 'Editor 3D') : 'Em desenvolvimento'}</span></div>
          <div className="template-card-body"><span className="template-family">{familias[item.family]}</span><h3>{item.title}</h3><p>{item.summary}</p><div className="template-card-footer"><Link href={`/moldes/${item.id}`}>{item.ativo ? 'Personalizar' : 'Ver modelo'} <span aria-hidden="true">↗</span></Link></div></div>
        </article>)}</div> : <div className="catalog-empty"><b>Nenhum modelo encontrado</b><p>Tente outra busca ou escolha “Todos”.</p><button type="button" onClick={() => { setBusca(''); setFamilia('todos'); }}>Limpar filtros</button></div>}
      </div></section>
    </main>
    <footer className="catalog-footer"><span>SCARPRINT DESIGN STUDIO</span><span>Um editor para cada ideia.</span><span>CATÁLOGO / V 0.5</span></footer>
  </div>;
}

function TemplateVisual({ id }: { id: MoldeId }) {
  switch (id) {
    case 'texto-livre': return <div className="preview-letters"><span>S</span><span>C</span><span>A</span><span>R</span></div>;
    case 'letreiro-nome': return <div className="preview-nameplate"><small>ESPAÇO</small><b>NOME</b><i /></div>;
    case 'placa-personalizada': return <div className="preview-sign"><span>STUDIO</span><small>DESIGN · CRIAÇÃO</small></div>;
    case 'placa-profissional': return <div className="preview-nameplate"><small>SEU NEGÓCIO</small><b>MARCA</b><i /></div>;
    case 'chaveiro-logo': return <div className="preview-keychain"><i /><b>S</b></div>;
    case 'placa-qr': return <div className="preview-qr"><span>▦</span><small>SCAN ME</small></div>;
    case 'cortador-svg': return <div className="preview-cutter"><span>✦</span><i /></div>;
    case 'carimbo-personalizado': return <div className="preview-stamp"><span>FEITO<br />À MÃO</span></div>;
    case 'letra-grande': return <div className="preview-large-letter">A</div>;
    case 'placa-multicamadas': return <div className="preview-layers"><span>01</span><span>02</span><span>03</span></div>;
    case 'porta-canetas': return <div className="preview-parametric">{Array.from({ length: 12 }, (_, index) => <span key={index} />)}</div>;
  }
}
