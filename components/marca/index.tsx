/**
 * Primitivos da marca Scarprint (tema claro da loja e do catalogo), so em Tailwind com os
 * tokens de styles/marca.css: wordmark, botao, selo, chip da secao, cartao, secao,
 * rotulo/campo e o botao de WhatsApp. Envolva a pagina em `ESCOPO_MARCA`.
 */
import Link from 'next/link';
import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/components/ui/cx';
import { linkWhatsapp } from '@/lib/marketplace/contato';
import './marca.css';

/** Fundo, texto, fonte e anel de foco da marca para a pagina inteira. */
export const ESCOPO_MARCA = 'bg-marca-palido text-marca-texto font-marca [&_:focus-visible]:outline-none [&_:focus-visible]:shadow-marca-foco';

export function Wordmark({ tamanho = 24, subtitulo = 'DESIGN STUDIO', href = '/' }: { tamanho?: number; subtitulo?: string | null; href?: string | null }) {
  const corpo = (
    <>
      {/* o tamanho vem da prop: variavel CSS (unico estilo inline permitido) */}
      <b className="flex -skew-x-[7deg] font-display text-(length:--wordmark) font-black italic tracking-[-0.105em]" style={{ '--wordmark': `${tamanho}px` } as CSSProperties}>
        SCAR<span className="texto-gradiente pr-[0.08em]">PRINT</span>
      </b>
      {subtitulo && <small className="mt-1.5 pl-0.5 text-[8px] font-extrabold tracking-[0.23em] text-marca-texto-3">{subtitulo}</small>}
    </>
  );
  const cls = 'inline-flex flex-col leading-none whitespace-nowrap text-marca-navy no-underline';
  return href ? <Link href={href} className={cls} aria-label="Scarprint, início">{corpo}</Link> : <span className={cls} aria-label="Scarprint">{corpo}</span>;
}

type Variante = 'primario' | 'contorno' | 'fantasma' | 'whatsapp';
// `m-botao`: so marcador (sem estilo) para o CSS do catalogo ainda em migracao.
const BOTAO_BASE = 'm-botao inline-flex items-center justify-center gap-2.5 rounded-marca-pilula border border-transparent font-marca font-extrabold leading-none whitespace-nowrap no-underline cursor-pointer transition-[transform,box-shadow,background-color,border-color] duration-150 hover:-translate-y-px active:translate-y-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:translate-y-0';
const BOTAO_VARIANTE: Record<Variante, string> = {
  primario: 'bg-marca text-white shadow-marca-acao hover:shadow-marca-2',
  contorno: 'bg-marca-branco text-marca-navy border-marca-linha hover:border-marca-linha-forte hover:bg-marca-gelo',
  fantasma: 'bg-transparent text-marca-azul px-1.5 hover:text-marca-azul-forte hover:underline underline-offset-4',
  whatsapp: 'bg-marca-whatsapp text-white hover:bg-marca-whatsapp-forte',
};
const botaoClasse = (variante: Variante, pequeno?: boolean) =>
  cx(BOTAO_BASE, BOTAO_VARIANTE[variante], variante === 'fantasma' ? 'min-h-10 text-sm' : pequeno ? 'min-h-9 px-3.5 text-[13px]' : 'min-h-[46px] px-5 text-sm');

interface PropsBotao {
  variante?: Variante;
  pequeno?: boolean;
  type?: 'button' | 'submit';
  /** Interno (`/criar`), externo (`https://`) ou ancora (`#loja`). Sem href vira <button>. */
  href?: string;
  onClick?: () => void;
  desabilitado?: boolean;
  disabled?: boolean;
  rotulo?: string;
  className?: string;
  children: ReactNode;
}

export function BotaoMarca({ variante = 'primario', pequeno, type = 'button', href, onClick, desabilitado, disabled, rotulo, className, children }: PropsBotao) {
  const cls = cx(botaoClasse(variante, pequeno), className);
  if (desabilitado || (disabled && href)) return <span className={cls} aria-disabled="true" aria-label={rotulo}>{children}</span>;
  if (href && /^https?:\/\//.test(href)) return <a className={cls} href={href} target="_blank" rel="noopener noreferrer" aria-label={rotulo}>{children}</a>;
  if (href && href.startsWith('#')) return <a className={cls} href={href} aria-label={rotulo}>{children}</a>;
  if (href) return <Link className={cls} href={href} aria-label={rotulo}>{children}</Link>;
  return <button type={type} className={cls} onClick={onClick} disabled={disabled} aria-label={rotulo}>{children}</button>;
}

export type TomSelo = 'validacao' | 'personalizavel' | 'nosso' | 'novo' | 'neutro';
const SELO_TOM: Record<TomSelo, string> = {
  validacao: 'bg-marca-atencao-fundo text-marca-atencao',
  personalizavel: 'bg-marca-gelo text-marca-azul-forte',
  nosso: 'bg-marca-sucesso-fundo text-marca-sucesso',
  novo: 'bg-marca text-white',
  neutro: 'bg-marca-neutro-fundo text-marca-texto-2',
};
const PILULA = 'inline-flex h-6 items-center gap-1.5 rounded-marca-pilula px-2.5 text-marca-mini font-extrabold leading-none tracking-[0.02em] whitespace-nowrap';
export function SeloMarca({ tom = 'neutro', children }: { tom?: TomSelo; children: ReactNode }) {
  return <span className={cx(PILULA, SELO_TOM[tom])}>{children}</span>;
}

/** Chip na cor filha da secao (fora de secao, cai na cor da marca). */
export function ChipSecao({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx(PILULA, 'bg-secao-suave text-secao-forte before:size-[7px] before:rounded-full before:bg-secao before:content-[""]', className)}>{children}</span>;
}

/** Cartao: com `href` vira link inteiro (hover sobe); sem, e so a caixa. */
export const CARTAO = 'flex flex-col overflow-hidden rounded-marca-lg border border-marca-linha bg-marca-branco text-inherit no-underline shadow-marca-1 transition-[transform,box-shadow,border-color] duration-150';
export const CARTAO_INTERATIVO = 'hover:-translate-y-[3px] hover:shadow-marca-2 hover:border-secao-borda focus-within:-translate-y-[3px] focus-within:shadow-marca-2';
export function CartaoMarca({ href, className, children }: { href?: string; className?: string; children: ReactNode }) {
  return href ? <Link href={href} className={cx(CARTAO, CARTAO_INTERATIVO, className)}>{children}</Link> : <div className={cx(CARTAO, className)}>{children}</div>;
}

/** Sobretitulo em caixa alta com o ponto da secao. */
export function Sobretitulo({ children, escuro }: { children: ReactNode; escuro?: boolean }) {
  return (
    <p className={cx('m-0 flex items-center gap-2.5 text-marca-mini font-black uppercase leading-none tracking-[0.18em]', escuro ? 'text-marca-escura-sobretitulo' : 'text-marca-sobretitulo',
      'before:size-[7px] before:rounded-full before:bg-secao-2 before:content-[""] before:ring-4', escuro ? 'before:ring-marca-profundo' : 'before:ring-secao-suave')}>
      {children}
    </p>
  );
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
  const escuro = fundo === 'escura';
  const idTitulo = id ? `${id}-titulo` : undefined;
  return (
    <section id={id} className={cx('px-margem py-secao', fundo === 'gelo' && 'bg-marca-gelo', escuro && 'bg-marca-profundo text-white')} aria-labelledby={titulo ? idTitulo : undefined}>
      {(sobretitulo || titulo || texto || acao) && (
        <div className="mb-[clamp(24px,3vw,40px)] flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            {sobretitulo && <Sobretitulo escuro={escuro}>{sobretitulo}</Sobretitulo>}
            {titulo && <h2 id={idTitulo} className="mt-3.5 mb-0 font-display text-marca-titulo-2 leading-[1.04] font-black tracking-[-0.05em]">{titulo}</h2>}
            {texto && <p className={cx('mt-3 mb-0 max-w-[620px] text-marca-corpo leading-relaxed', escuro ? 'text-marca-escura-texto' : 'text-marca-texto-2')}>{texto}</p>}
          </div>
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

export function RotuloMarca({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="block text-marca-pequeno leading-snug font-extrabold text-marca-texto">{children}</label>;
}

export function CampoMarca({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx('min-h-12 w-full rounded-marca-md border border-marca-linha bg-marca-branco px-4 text-marca-corpo font-medium text-marca-texto placeholder:text-marca-texto-3 focus:border-marca-azul', className)} />;
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
