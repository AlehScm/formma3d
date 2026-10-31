'use client';

/**
 * Topo da landing de letras (Google Ads), no ritmo da referencia (Lena Varga, estudada quadro a
 * quadro): a peca 3D e a protagonista, num fundo de estudio da cor do slide (chao, luz atras da
 * peca, vinheta); o titulo e pequeno, no canto, e entra e sai letra por letra; na troca a peca
 * sai pela diagonal, o chao inclina e a cor nova varre da direita. Cada slide fica ~4,8 s;
 * pausa ao arrastar a peca, com o foco nos controles, com a aba oculta ou fora da tela. Com
 * movimento reduzido nao troca sozinho nem anima. O CTA leva ao WhatsApp (o selo flutuante e a
 * barra do celular ficam em ChamadaWhatsApp).
 */
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Anton } from 'next/font/google';
import { Component, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '@/components/ui/cx';
import { linkWhatsapp, MENSAGENS } from '@/lib/marketplace/contato';
import { SLIDES_LETRAS } from '@/lib/marketplace/vitrineLetras';
import { IconeWhatsapp } from './IconeWhatsapp';

const PalcoLetras = dynamic(() => import('./PalcoLetras'), { ssr: false });
const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });

/** Tempo de cada slide e quando o titulo comeca a sair (antes da troca, como na referencia). */
const SLIDE = 4800;
const SAI_TEXTO = 720;
/** Depois de soltar a peca, quanto espera para voltar a trocar sozinho. */
const RETOMA = 1600;

const KEYFRAMES = `
@keyframes letra3d-entra { from { opacity: 0; filter: blur(8px); transform: translateY(38%); } to { opacity: 1; filter: none; transform: none; } }
@keyframes letra3d-sai { from { opacity: 1; filter: none; transform: none; } to { opacity: 0; filter: blur(8px); transform: translateY(-30%); } }
@keyframes letra3d-varre { from { clip-path: polygon(118% 0, 135% 0, 118% 100%, 101% 100%); } to { clip-path: polygon(-45% 0, 135% 0, 118% 100%, -62% 100%); } }
@keyframes letra3d-chao { 0% { transform: none; } 38% { transform: rotate(-6deg) translateY(5%) scale(1.18); } 100% { transform: none; } }
@keyframes letra3d-dica { 0%, 100% { opacity: 0; } 12%, 80% { opacity: 1; } }
`;

const LINK = linkWhatsapp(MENSAGENS.letraCaixa());
const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-current';
const ICONE_SETA = (d: string) => (
  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

/** Se a cena 3D falhar (sem WebGL, por exemplo), fica so o fundo de estudio e o texto. */
class LimiteCena extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  render() {
    return this.state.erro ? null : this.props.children;
  }
}

/** Titulo letra por letra: entra depois de a peca chegar e sai antes da troca. */
function Titulo({ texto, saindo, calmo }: { texto: string; saindo: boolean; calmo: boolean }) {
  let n = 0;
  const palavras = texto.split(' ');
  return (
    <p aria-hidden="true" className={cx(anton.className, 'm-0 max-w-[12ch] pt-[0.12em] text-[length:clamp(2.25rem,4.4vw,5rem)] leading-[0.98] font-normal uppercase')}>
      {palavras.map((p, k) => (
        <span key={k}>
          <span className="inline-block whitespace-nowrap">
            {[...p].map((c) => {
              const i = n++;
              const animacao = calmo ? 'none' : saindo ? `letra3d-sai 360ms cubic-bezier(.5,0,.75,0) ${i * 24}ms both` : `letra3d-entra 520ms cubic-bezier(.2,.7,.2,1) ${380 + i * 32}ms both`;
              return <span key={i} className="inline-block" style={{ animation: animacao }}>{c}</span>;
            })}
          </span>
          {k < palavras.length - 1 && ' '}
        </span>
      ))}
    </p>
  );
}

export function TopoLetras() {
  const [atual, setAtual] = useState(0);
  const [anterior, setAnterior] = useState(0);
  const [calmo, setCalmo] = useState(false);
  const [oculta, setOculta] = useState(false);
  const [naTela, setNaTela] = useState(true);
  const [focoControles, setFocoControles] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [retomarEm, setRetomarEm] = useState(0);
  const [saindo, setSaindo] = useState(false);
  const [pronta, setPronta] = useState(false);
  const [jaGirou, setJaGirou] = useState(false);
  const secao = useRef<HTMLElement>(null);
  const texto = useRef<HTMLDivElement>(null);
  const [reservaTexto, setReservaTexto] = useState(0.5);

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ouvir = () => setCalmo(m.matches);
    ouvir();
    m.addEventListener('change', ouvir);
    return () => m.removeEventListener('change', ouvir);
  }, []);

  useEffect(() => {
    const ouvir = () => setOculta(document.hidden);
    ouvir();
    document.addEventListener('visibilitychange', ouvir);
    return () => document.removeEventListener('visibilitychange', ouvir);
  }, []);

  useEffect(() => {
    const el = secao.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNaTela(!!e?.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Quanto da altura o texto ocupa embaixo: no celular a peca e a dica ficam no espaco acima dele
  // (em telefone baixo, por fracao fixa da altura, a peca invadia o titulo).
  useEffect(() => {
    const el = secao.current, t = texto.current;
    if (!el || !t) return;
    const medir = () => setReservaTexto(Math.min(0.8, t.offsetHeight / Math.max(1, el.offsetHeight)));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    ro.observe(t);
    return () => ro.disconnect();
  }, []);

  const irPara = useCallback((i: number) => {
    setSaindo(false);
    setAnterior(atual);
    setAtual((i + SLIDES_LETRAS.length) % SLIDES_LETRAS.length);
  }, [atual]);
  const marcarPronta = useCallback(() => setPronta(true), []);

  const parado = calmo || oculta || !naTela || focoControles || arrastando || !pronta;
  useEffect(() => {
    if (parado) return;
    const espera = Math.max(0, retomarEm - Date.now());
    const sai = setTimeout(() => setSaindo(true), espera + SLIDE - SAI_TEXTO);
    const troca = setTimeout(() => irPara(atual + 1), espera + SLIDE);
    return () => { clearTimeout(sai); clearTimeout(troca); };
  }, [atual, parado, retomarEm, irPara]);

  const soltar = () => {
    setArrastando(false);
    setRetomarEm(Date.now() + RETOMA);
  };

  const s = SLIDES_LETRAS[atual]!;
  const n = String(atual + 1).padStart(2, '0');
  const total = String(SLIDES_LETRAS.length).padStart(2, '0');
  const estilo = { color: s.tinta, '--botao': s.botao, '--botao-texto': s.botaoTexto, '--fundo': s.fundo } as CSSProperties;
  const trocou = atual !== anterior;

  return (
    <section ref={secao} aria-label="Letras em 3D" style={estilo} className="relative isolate flex min-h-[92svh] flex-col justify-end overflow-hidden md:min-h-[88svh]">
      <style>{KEYFRAMES}</style>
      <h1 className="sr-only">Letra caixa e letras personalizadas impressas em 3D</h1>

      {/* Estudio: a cor anterior embaixo, a nova varre por cima na diagonal; chao, luz e vinheta. */}
      <div aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: SLIDES_LETRAS[anterior]!.fundo }} />
      <div aria-hidden="true" key={`cor-${atual}`} className="absolute inset-0" style={{ backgroundColor: s.fundo, animation: trocou && !calmo ? 'letra3d-varre 620ms cubic-bezier(.35,.55,.25,1) both' : 'none' }} />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_46%_52%_at_57%_40%,rgb(255_255_255/0.17),transparent_72%)]" />
      <div
        aria-hidden="true"
        key={`chao-${atual}`}
        className="absolute inset-x-[-12%] bottom-0 h-[48%] origin-[60%_0] md:h-[42%]"
        style={{ background: 'linear-gradient(to bottom, rgb(255 255 255 / 0.10), rgb(255 255 255 / 0.03) 7%, rgb(0 0 0 / 0.07) 40%, rgb(0 0 0 / 0.24))', animation: trocou && !calmo ? 'letra3d-chao 900ms cubic-bezier(.6,0,.2,1) both' : 'none' }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_55%_45%,transparent_55%,rgb(0_0_0/0.32))]" />

      {/* Palco 3D: arrastar gira a peca (e pausa a troca). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onPointerDown={() => { setArrastando(true); setJaGirou(true); }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onPointerLeave={() => { if (arrastando) soltar(); }}
      >
        <LimiteCena>
          <PalcoLetras atual={atual} calmo={calmo} ativo={naTela && !oculta} reservaTexto={reservaTexto} onPronta={marcarPronta} />
        </LimiteCena>
      </div>

      {pronta && !jaGirou && (
        <p aria-hidden="true" className="pointer-events-none absolute top-[var(--topo-dica)] left-1/2 z-10 m-0 -translate-x-1/2 rounded-full bg-black/20 px-3 py-1.5 text-apoio font-semibold backdrop-blur-sm md:top-[76%] md:left-[57%]" style={{ animation: calmo ? 'none' : 'letra3d-dica 5s ease-in-out 1.4s both', '--topo-dica': `${Math.max(20, (1 - reservaTexto) * 100 - 9).toFixed(1)}%` } as CSSProperties}>
          Arraste para girar
        </p>
      )}

      {/* Texto pequeno no canto (a peca e o foco). */}
      <div ref={texto} className="pointer-events-none relative z-10 flex flex-col gap-4 px-margem pb-24 md:max-w-[40%] md:pb-12">
        <div onFocus={() => setFocoControles(true)} onBlur={() => setFocoControles(false)} className="pointer-events-auto flex items-center gap-2 text-apoio font-bold tabular-nums">
          <span>{n} / {total}</span>
          <button type="button" onClick={() => irPara(atual - 1)} aria-label="Slide anterior" className={cx('grid size-9 cursor-pointer place-items-center rounded-full border-2 border-current', FOCO)}>{ICONE_SETA('M15 18l-6-6 6-6')}</button>
          <button type="button" onClick={() => irPara(atual + 1)} aria-label="Próximo slide" className={cx('grid size-9 cursor-pointer place-items-center rounded-full border-2 border-current', FOCO)}>{ICONE_SETA('M9 6l6 6-6 6')}</button>
        </div>
        <div key={`titulo-${atual}`}>
          <Titulo texto={s.titulo} saindo={saindo} calmo={calmo} />
        </div>
        <p className="m-0 max-w-[42ch] text-base opacity-90 md:text-lg">{s.apoio}</p>
        {/* O botao que converte: verde do WhatsApp, com o icone, maior que tudo em volta; os
            outros caminhos ficam pequenos, para nao competir. */}
        <div className="pointer-events-auto flex flex-col items-start gap-2">
          {LINK ? (
            <a href={LINK} data-cta-whatsapp target="_blank" rel="noopener noreferrer" className={cx('inline-flex min-h-14 items-center justify-center gap-2.5 rounded-marca-pilula bg-marca-whatsapp px-5 text-base font-extrabold text-white md:px-7 md:text-lg no-underline shadow-[0_14px_30px_-10px_rgb(0_0_0/0.55)] ring-1 ring-white/25 transition-colors hover:bg-marca-whatsapp-forte motion-reduce:transition-none max-md:w-full', FOCO)}>
              <IconeWhatsapp className="size-6 shrink-0" />
              Pedir orçamento pelo WhatsApp
            </a>
          ) : (
            <Link href="/pecas" className={cx('inline-flex min-h-14 items-center rounded-marca-pilula bg-[var(--botao)] px-7 text-lg font-extrabold text-[var(--botao-texto)] no-underline', FOCO)}>
              Ver as peças
            </Link>
          )}
          {LINK && <p className="m-0 text-apoio opacity-90">Resposta com preço e prazo, sem compromisso.</p>}
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center gap-x-5 text-apoio">
          <Link href="/editor" className={cx('inline-flex min-h-11 items-center font-semibold underline decoration-1 underline-offset-4 opacity-90 hover:opacity-100', FOCO)}>Montar no editor profissional</Link>
          <Link href="/letras" className={cx('inline-flex min-h-11 items-center font-semibold underline decoration-1 underline-offset-4 opacity-90 hover:opacity-100', FOCO)}>Ver todas as letras</Link>
        </div>
      </div>
    </section>
  );
}
