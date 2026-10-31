'use client';

/**
 * Esteira das letras como na referencia (Reelmark): cards por dentro de um cilindro (concava:
 * os das pontas maiores e virados para quem olha), andando para a esquerda com um unico
 * requestAnimationFrame que so escreve variaveis CSS. No desktop cada card mostra a peca
 * montada girando (giroCards); no celular e com movimento reduzido fica a foto. A esteira
 * desliza para o lugar quando chega na tela; para no hover, no foco, com a aba oculta ou fora
 * da tela. No celular e com movimento reduzido vira uma fileira de cards de arrastar.
 */
import Link from 'next/link';
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { BotaoMarca, FOCO_MARCA, SecaoMarca } from '@/components/marca';
import { ImagemProduto } from '@/components/loja/CardProduto';
import { cx } from '@/components/ui/cx';
import { BALANCO_CARDS, idDoProduto } from '@/lib/marketplace/vitrineLetras';
import type { Produto } from '@/lib/marketplace/tipos';
import type { GiroCards } from './giroCards';

/** Largura do card (w-[260px]) e vao entre cards: o passo do anel sai daqui. */
const PASSO = 260 + 24;
/** Cards no anel antes de duplicar: menos que isso deixa o cilindro estreito demais. */
const MINIMO_CARDS = 12;
/** Radianos por segundo: devagar, uma volta em torno de dois minutos. */
const VELOCIDADE = 0.05;
/** Quanto a curva vem na direcao de quem olha (1 = o cilindro inteiro: as pontas ficariam enormes). */
const COMPRIME = 0.45;
/** Ate que angulo (rad) o card aparece de cada lado; o ultimo trecho some aos poucos. */
const ARCO = 1.15;
const SUMIR = 0.3;
/** A esteira entra deslizando da direita (rad a percorrer) quando chega na tela. */
const DESLIZE = 1.4;
const ENTRADA = 1.3; // s
/** Canvas da peca girando: a area da foto do card (228 x 200) a 1,5x. */
const CANVAS = { w: 342, h: 300 };
const QUADROS_POR_SEGUNDO = 30;
/**
 * Todos os cards iguais: a peca num estudio cinza neutro (os dois cinzas da marca, com luz atras
 * da peca), como foto de produto. No tom medio a peca clara, a escura e a acesa aparecem.
 */
const ESTUDIO = 'bg-[radial-gradient(ellipse_75%_65%_at_50%_38%,rgb(255_255_255/0.45),transparent_70%),linear-gradient(to_bottom,var(--marca-linha),var(--marca-linha-forte))]';

interface Carta {
  produto: Produto;
  /** Falso nas repeticoes e na copia do loop: fora da leitura de tela e da tabulacao. */
  principal: boolean;
}

function montarAnel(produtos: Produto[]): Carta[] {
  const uma: Carta[] = [];
  for (let volta = 0; uma.length < MINIMO_CARDS; volta++) {
    produtos.forEach((produto) => uma.push({ produto, principal: volta === 0 }));
  }
  return [...uma, ...uma.map((c) => ({ ...c, principal: false }))];
}

const raioDo = (total: number) => (total * PASSO) / (2 * Math.PI);

interface Posicao {
  x: number;
  z: number;
  giro: number;
  opacidade: number;
  visivel: boolean;
}

/** Por dentro do cilindro: o card vem para frente nas pontas e fica tangente a curva. */
function posicao(k: number, total: number, fase: number, raio: number): Posicao {
  const bruto = (2 * Math.PI * k) / total + fase;
  const a = Math.atan2(Math.sin(bruto), Math.cos(bruto));
  const longe = Math.abs(a);
  return {
    x: raio * Math.sin(a),
    z: raio * (1 - Math.cos(a)) * COMPRIME,
    giro: -Math.atan(COMPRIME * Math.tan(a)),
    opacidade: Math.min(1, Math.max(0, (ARCO - longe) / SUMIR)),
    visivel: longe < ARCO,
  };
}

function variaveis(p: Posicao): CSSProperties {
  return {
    '--x': `${p.x.toFixed(1)}px`,
    '--z': `${p.z.toFixed(1)}px`,
    '--giro': `${p.giro.toFixed(4)}rad`,
    '--opacidade': p.opacidade.toFixed(3),
    '--vis': p.visivel ? 'visible' : 'hidden',
  } as CSSProperties;
}

export function EsteiraLetras({ produtos }: { produtos: Produto[] }) {
  const anel = useMemo(() => montarAnel(produtos), [produtos]);
  const total = anel.length;
  const raio = raioDo(total);
  const caixa = useRef<HTMLDivElement>(null);
  const itens = useRef<(HTMLLIElement | null)[]>([]);
  const pausa = useRef({ mouse: false, foco: false, naTela: false });

  useEffect(() => {
    // Cilindro so em tela larga e com movimento; no celular e uma fileira de arrastar com o dedo.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(min-width: 768px)').matches) return;
    const el = caixa.current;
    if (!el) return;
    const comPeca = window.matchMedia('(min-width: 1024px)').matches;
    const canvas = itens.current.map((li) => li?.querySelector<HTMLCanvasElement>('canvas[data-giro]') ?? null);
    const fotos = itens.current.map((li) => li?.querySelector<HTMLElement>('[data-foto]') ?? null);
    const contextos = canvas.map((c) => c?.getContext('2d') ?? null);
    const vivos = new Set<number>();
    let giro: GiroCards | null = null;
    let carregando = false;
    let quadro = 0, fase = 0, ultimo = 0, entrou = -1, acumulado = 0, relogio = 0;

    const io = new IntersectionObserver(([e]) => {
      pausa.current.naTela = !!e?.isIntersecting;
      if (!e?.isIntersecting) return;
      if (entrou < 0) entrou = performance.now();
      if (comPeca && !giro && !carregando) {
        carregando = true;
        import('./giroCards').then(({ GiroCards: G }) => { giro = new G(CANVAS.w, CANVAS.h); }).catch(() => {});
      }
    }, { rootMargin: '200px 0px' });
    io.observe(el);

    const passo = (agora: number) => {
      const dt = ultimo ? Math.min(agora - ultimo, 100) / 1000 : 0;
      ultimo = agora;
      const parada = !pausa.current.naTela || pausa.current.mouse || pausa.current.foco || document.hidden;
      if (!parada && dt) {
        fase = (fase - dt * VELOCIDADE) % (2 * Math.PI);
        // Antes de chegar na tela os cards esperam a direita; depois deslizam para o lugar.
        const e = entrou < 0 ? 0 : Math.min(1, (agora - entrou) / 1000 / ENTRADA);
        const desvio = DESLIZE * (1 - e) ** 3;
        const posicoes = anel.map((_, k) => posicao(k, total, fase + desvio, raio));
        posicoes.forEach((p, k) => {
          const li = itens.current[k];
          if (li) for (const [nome, valor] of Object.entries(variaveis(p))) li.style.setProperty(nome, String(valor));
        });
        relogio += dt;
        acumulado += dt;
        if (giro && acumulado >= 1 / QUADROS_POR_SEGUNDO) {
          acumulado = 0;
          posicoes.forEach((p, k) => {
            const ctx = contextos[k];
            if (!p.visivel || p.opacidade < 0.05 || !ctx) return;
            if (giro!.desenhar(idDoProduto(anel[k]!.produto.slug), BALANCO_CARDS * Math.sin(relogio * 0.7 + k * 0.9), ctx) && !vivos.has(k)) {
              vivos.add(k);
              canvas[k]!.style.opacity = '1';
              if (fotos[k]) fotos[k]!.style.opacity = '0';
            }
          });
        }
      }
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(quadro);
      io.disconnect();
      (giro as GiroCards | null)?.descartar();
    };
  }, [anel, total, raio]);

  return (
    <SecaoMarca
      id="letras-esteira"
      titulo="Todas as letras que já imprimimos em 3D"
      texto="Cada peça abre com a prévia em 3D para você personalizar."
      acao={<BotaoMarca variante="contorno" href="/letras">Ver todas as letras</BotaoMarca>}
    >
      <div
        ref={caixa}
        onPointerEnter={() => { pausa.current.mouse = true; }}
        onPointerLeave={() => { pausa.current.mouse = false; }}
        onFocus={() => { pausa.current.foco = true; }}
        onBlur={(e) => { pausa.current.foco = e.currentTarget.contains(e.relatedTarget as Node | null); }}
        className="relative h-[360px] snap-x snap-mandatory overflow-x-auto [perspective:1200px] md:motion-safe:h-[470px] md:motion-safe:snap-none md:motion-safe:overflow-hidden md:motion-safe:[mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]"
      >
        <ul className="m-0 flex list-none gap-[24px] p-0 max-md:px-[calc(50%-130px)] md:motion-safe:relative md:motion-safe:top-[75px] md:motion-safe:h-[320px] md:motion-safe:[transform-style:preserve-3d]">
          {anel.map((c, k) => {
            const { produto: p } = c;
            const oculto = !c.principal;
            return (
              <li
                key={`${p.slug}-${k}`}
                ref={(el) => { itens.current[k] = el; }}
                aria-hidden={oculto || undefined}
                style={variaveis(posicao(k, total, 0, raio))}
                className={cx(
                  'relative h-[320px] w-[260px] shrink-0',
                  'snap-center md:motion-safe:absolute md:motion-safe:top-0 md:motion-safe:left-1/2 md:motion-safe:-ml-[130px]',
                  'md:motion-safe:[transform:translate3d(var(--x),0,var(--z))_rotateY(var(--giro))] md:motion-safe:[opacity:var(--opacidade)] md:motion-safe:[visibility:var(--vis)]',
                  oculto && 'max-md:hidden motion-reduce:hidden',
                )}
              >
                <Link
                  href={`/produto/${p.slug}`}
                  tabIndex={oculto ? -1 : undefined}
                  className={cx('flex h-full w-full flex-col overflow-hidden rounded-marca-lg bg-marca-branco text-marca-navy shadow-marca-1 no-underline', FOCO_MARCA)}
                >
                  <div className={cx('relative h-[232px] shrink-0 p-4', ESTUDIO)}>
                    <div data-foto className="size-full transition-opacity duration-500 motion-reduce:transition-none">
                      <ImagemProduto produto={p} className="size-full" />
                    </div>
                    <canvas data-giro width={CANVAS.w} height={CANVAS.h} aria-hidden="true" className="pointer-events-none absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] opacity-0 transition-opacity duration-500 motion-reduce:hidden" />
                  </div>
                  <div className="flex flex-col gap-0.5 px-4 pb-4">
                    <span className="line-clamp-2 text-item font-semibold">{p.nome}</span>
                    <span className="text-apoio">{p.tipo}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </SecaoMarca>
  );
}
