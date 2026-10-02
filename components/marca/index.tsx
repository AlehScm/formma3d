/**
 * Primitivos da marca Scarprint (tema claro da loja e do catalogo): wordmark, botao,
 * selo, cartao, secao e o botao de WhatsApp. Envolva a pagina em `.m-escopo`.
 */
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { linkWhatsapp } from '@/lib/marketplace/contato';
import './marca.css';

export function Wordmark({ tamanho = 24, subtitulo = 'DESIGN STUDIO', href = '/' }: { tamanho?: number; subtitulo?: string | null; href?: string | null }) {
  const corpo = (
    <>
      <b style={{ '--m-wordmark': `${tamanho}px` } as CSSProperties}>
        SCAR<span>PRINT</span>
      </b>
      {subtitulo && <small>{subtitulo}</small>}
    </>
  );
  return href ? (
    <Link href={href} className="m-wordmark" aria-label="Scarprint, início">{corpo}</Link>
  ) : (
    <span className="m-wordmark" aria-label="Scarprint">{corpo}</span>
  );
}

type Variante = 'primario' | 'contorno' | 'fantasma' | 'whatsapp';
interface PropsBotao {
  variante?: Variante;
  pequeno?: boolean;
  /** Interno (`/criar`), externo (`https://`) ou ancora (`#loja`). Sem href vira <button>. */
  href?: string;
  onClick?: () => void;
  desabilitado?: boolean;
  rotulo?: string;
  children: ReactNode;
}

export function BotaoMarca({ variante = 'primario', pequeno, href, onClick, desabilitado, rotulo, children }: PropsBotao) {
  const cls = `m-botao m-botao-${variante}${pequeno ? ' m-botao-pequeno' : ''}`;
  if (desabilitado) return <span className={cls} aria-disabled="true" aria-label={rotulo}>{children}</span>;
  if (href && /^https?:\/\//.test(href)) return <a className={cls} href={href} target="_blank" rel="noopener noreferrer" aria-label={rotulo}>{children}</a>;
  if (href && href.startsWith('#')) return <a className={cls} href={href} aria-label={rotulo}>{children}</a>;
  if (href) return <Link className={cls} href={href} aria-label={rotulo}>{children}</Link>;
  return <button type="button" className={cls} onClick={onClick} aria-label={rotulo}>{children}</button>;
}

export type TomSelo = 'validacao' | 'personalizavel' | 'nosso' | 'novo' | 'neutro';
export function SeloMarca({ tom = 'neutro', children }: { tom?: TomSelo; children: ReactNode }) {
  return <span className={`m-selo m-selo-${tom}`}>{children}</span>;
}

/** Cartao: com `href` vira link inteiro (hover sobe); sem, e so a caixa. */
export function CartaoMarca({ href, className = '', children }: { href?: string; className?: string; children: ReactNode }) {
  return href ? <Link href={href} className={`m-cartao ${className}`}>{children}</Link> : <div className={`m-cartao ${className}`}>{children}</div>;
}

export function SecaoMarca({ id, fundo = 'claro', sobretitulo, titulo, texto, acao, children }: {
  id?: string;
  fundo?: 'claro' | 'gelo' | 'escura';
  sobretitulo?: string;
  titulo?: ReactNode;
  texto?: ReactNode;
  acao?: ReactNode;
  children?: ReactNode;
}) {
  const idTitulo = id ? `${id}-titulo` : undefined;
  return (
    <section id={id} className={`m-secao${fundo === 'claro' ? '' : ` m-secao-${fundo}`}`} aria-labelledby={titulo ? idTitulo : undefined}>
      {(sobretitulo || titulo || texto || acao) && (
        <div className="m-secao-cabeca">
          <div>
            {sobretitulo && <div className="m-sobretitulo">{sobretitulo}</div>}
            {titulo && <h2 id={idTitulo} className="m-titulo">{titulo}</h2>}
            {texto && <p className="m-texto">{texto}</p>}
          </div>
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

/** WhatsApp com a mensagem pronta; sem numero configurado vira "em breve" (desabilitado). */
export function BotaoWhatsapp({ mensagem, children = 'Pedir orçamento', pequeno, variante = 'whatsapp' }: { mensagem: string; children?: ReactNode; pequeno?: boolean; variante?: Variante }) {
  const link = linkWhatsapp(mensagem);
  return link ? (
    <BotaoMarca variante={variante} pequeno={pequeno} href={link}>{children}</BotaoMarca>
  ) : (
    <BotaoMarca variante={variante} pequeno={pequeno} desabilitado rotulo="WhatsApp em breve">{children} · em breve</BotaoMarca>
  );
}
