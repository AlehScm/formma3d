'use client';

/**
 * Palco 3D do topo da landing de letras. Um canvas so para todos os slides: trocar de canvas a
 * cada slide recriava o WebGL e travava. As pecas vem prontas do build (carregarVitrine).
 * Coreografia da referencia (Lena Varga, estudada quadro a quadro): a peca chega pela diagonal
 * girando e assenta com um leve passo a mais, fica balancando e flutuando sobre a sombra; na
 * troca ela sai pela diagonal, crescendo, enquanto a proxima ja entra. Luz de estudio sem
 * internet (Lightformer), sombra suave no chao; arrastar gira a peca e ela volta sozinha.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PresentationControls } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SLIDES_LETRAS } from '@/lib/marketplace/vitrineLetras';
import { carregarVitrine, type PecaVitrine3D } from './carregarVitrine';
import { materialDe } from './materiais';

const FOV = 26;
const ENTRADA = 0.8; // s
const SAIDA = 0.7; // s
/** A proxima entra um pouco depois de a atual comecar a sair (e a cor nova varrer): as duas se cruzam. */
const ATRASO_ENTRADA = 0.24; // s

const limitar = (x: number) => Math.min(1, Math.max(0, x));
const saidaCubica = (t: number) => 1 - (1 - t) ** 3;
const voltaComPasso = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

interface Enquadramento {
  W: number;
  H: number;
  /** Centro da peca em X e o chao (onde a sombra fica), no plano z=0. */
  x: number;
  chao: number;
  /** Quanto a peca flutua acima do chao. */
  folga: number;
  maxW: number;
  maxH: number;
  /** Celular: a peca fica centrada nesta altura (acima do texto), qualquer que seja o formato; a sombra acompanha. */
  centroY?: number;
  /** Descida da peca na entrada e na saida (fracao de H): na diagonal no desktop; no celular quase reta, para nao passar por cima do texto. */
  desceEntrando: number;
  desceSaindo: number;
}

/**
 * Peca grande: ~56% da largura e da altura no desktop, um pouco a direita (o titulo fica no
 * canto). No celular (retrato), centrada no espaco acima do texto: apoiada no chao, a peca larga
 * ficava pequena e baixa.
 */
function useEnquadramento(reservaTexto: number): Enquadramento {
  const { camera, size, viewport } = useThree();
  const vp = viewport.getCurrentViewport(camera, new THREE.Vector3(0, 0, 0));
  const W = vp.width, H = vp.height;
  if (size.width < size.height * 1.1) {
    // Espaco livre: do topo do palco ate onde o texto comeca (fracao medida no topo da pagina).
    const livre = Math.max(0.3, 1 - reservaTexto) * H;
    return { W, H, x: 0, chao: 0, folga: 0.03 * H, maxW: 0.86 * W, maxH: livre * 0.62, centroY: H / 2 - livre / 2, desceEntrando: -0.04, desceSaindo: 0.04 };
  }
  return { W, H, x: 0.07 * W, chao: -0.2 * H, folga: 0.07 * H, maxW: 0.56 * W, maxH: 0.58 * H, desceEntrando: 0.32, desceSaindo: 0.42 };
}

/** Degrade radial (centro cheio, borda transparente): o brilho da luminaria e a sombra no chao. */
let halo: THREE.Texture | null = null;
function degradeRadial(): THREE.Texture {
  if (halo) return halo;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  halo = new THREE.CanvasTexture(c);
  return halo;
}

/**
 * Materiais de cada peca, feitos uma vez e nunca descartados (sao 5 pecas): descartar liberava
 * o programa de shader e a peca seguinte recompilava no meio da troca.
 */
const materiaisPorPeca = new WeakMap<PecaVitrine3D, THREE.Material[]>();
function materiaisDe(peca: PecaVitrine3D): THREE.Material[] {
  let m = materiaisPorPeca.get(peca);
  if (!m) {
    m = peca.partes.map(materialDe);
    materiaisPorPeca.set(peca, m);
  }
  return m;
}

function Modelo({ peca, saindo, atraso, calmo, enq }: { peca: PecaVitrine3D; saindo: boolean; atraso: number; calmo: boolean; enq: Enquadramento }) {
  const mov = useRef<THREE.Group>(null);
  const gira = useRef<THREE.Group>(null);
  const sombra = useRef<THREE.MeshBasicMaterial>(null);
  const inicio = useRef<number | null>(null);
  const saida = useRef<number | null>(null);
  const materiais = materiaisDe(peca);
  const acesa = peca.partes.some((p) => p.papel === 'difusor');
  const s = Math.min(enq.maxW / peca.tamanho.x, enq.maxH / peca.tamanho.y);
  const y0 = enq.centroY ?? enq.chao + enq.folga + (peca.tamanho.y * s) / 2;

  useFrame(() => {
    const m = mov.current, g = gira.current;
    if (!m || !g) return;
    g.position.y = 0;
    // Relogio proprio: o do R3F zera quando o frameloop muda (topo saindo e voltando para a tela,
    // aba oculta), e a peca, com o inicio guardado no relogio antigo, ficava invisivel.
    const agora = performance.now() / 1000;
    inicio.current ??= agora + atraso;
    if (saindo) saida.current ??= agora;
    const t = agora - inicio.current;
    if (calmo) {
      m.visible = !saindo;
      m.position.set(enq.x, y0, 0);
      m.rotation.set(0, 0, 0);
      m.scale.setScalar(s);
      g.rotation.set(-0.05, 0.26, 0);
      return;
    }
    // Parada: balanca de um lado para o outro (~22 graus) e flutua devagar sobre a sombra, que
    // fica no chao e clareia quando a peca sobe.
    const balanco = 0.38 * Math.sin(t * 0.55 + 0.5);
    const flutua = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 2.8);
    g.rotation.set(-0.05 + 0.035 * Math.sin(t * 0.8), balanco, 0);
    g.position.y = (enq.H * 0.022 * flutua) / s;
    if (sombra.current) sombra.current.opacity = 0.5 - 0.18 * flutua;
    if (saida.current === null) {
      const e = limitar(t / ENTRADA), ep = saidaCubica(e);
      m.visible = t >= 0;
      m.position.set(enq.x + (1 - ep) * enq.W * 0.6, y0 - (1 - ep) * enq.H * enq.desceEntrando, 0);
      m.rotation.set(0, (1 - ep) * -0.75, (1 - voltaComPasso(e)) * 0.34);
      m.scale.setScalar(s * (1 + (1 - ep) * 0.22));
    } else {
      // Quadratica: comeca a andar junto com a cor nova (a cubica parava no primeiro terco).
      const e = limitar((agora - saida.current) / SAIDA), ei = e * e;
      m.visible = e < 1;
      m.position.set(enq.x - ei * enq.W * 0.72, y0 - ei * enq.H * enq.desceSaindo, 0);
      m.rotation.set(0, ei * 0.4, -0.28 * ei);
      m.scale.setScalar(s * (1 + 0.38 * ei));
    }
  });

  return (
    <group ref={mov} visible={false}>
      {/* Sombra no chao: elipse suave embaixo da peca (de pe para a camera, como o chao e visto). */}
      <mesh position={[0, -peca.tamanho.y / 2 - enq.folga / s, -peca.tamanho.z]} scale={[peca.tamanho.x * 1.2, Math.max(peca.tamanho.x * 0.09, peca.tamanho.y * 0.08), 1]} renderOrder={-1}>
        <planeGeometry />
        <meshBasicMaterial ref={sombra} map={degradeRadial()} color="#000000" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <PresentationControls global snap speed={1.6} polar={[-0.35, 0.35]} azimuth={[-1.3, 1.3]} cursor>
        <group ref={gira}>
          {peca.partes.map((p, i) => <mesh key={p.nome + i} geometry={p.geo} material={materiais[i]} />)}
          {acesa && (
            <mesh position={[0, 0, -peca.tamanho.z * 0.6]} scale={[peca.tamanho.x * 2.1, peca.tamanho.y * 1.9, 1]}>
              <planeGeometry />
              <meshBasicMaterial map={degradeRadial()} color="#ffc66b" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
          )}
        </group>
      </PresentationControls>
    </group>
  );
}

interface Vivo { i: number; chave: number; saindo: boolean; atraso: number }

function Pecas({ atual, calmo, reservaTexto, onPronta }: { atual: number; calmo: boolean; reservaTexto: number; onPronta: () => void }) {
  const enq = useEnquadramento(reservaTexto);
  const { gl, camera, scene } = useThree();
  const [pecas, setPecas] = useState<Partial<Record<string, PecaVitrine3D>>>({});

  // Cada peca aquecida em segundo plano assim que chega, nao na troca: shaders compilados sem
  // travar (compileAsync, com as luzes e o ambiente da cena) e, num momento ocioso, um desenho
  // da cena com a peca num alvo de 1x1, que ja manda a malha para a GPU.
  const aquecidas = useRef(new WeakSet<PecaVitrine3D>());
  useEffect(() => {
    const ocioso = (f: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 300));
    for (const p of Object.values(pecas)) {
      if (!p || aquecidas.current.has(p)) continue;
      aquecidas.current.add(p);
      const grupo = new THREE.Group();
      materiaisDe(p).forEach((m, i) => grupo.add(new THREE.Mesh(p.partes[i]!.geo, m)));
      gl.compileAsync(grupo, camera, scene).then(() => ocioso(() => {
        const alvo = new THREE.WebGLRenderTarget(1, 1);
        const antes = gl.getRenderTarget();
        scene.add(grupo);
        gl.setRenderTarget(alvo);
        gl.render(scene, camera);
        gl.setRenderTarget(antes);
        scene.remove(grupo);
        alvo.dispose();
      })).catch(() => {});
    }
  }, [pecas, gl, camera, scene]);
  const [vivos, setVivos] = useState<Vivo[]>([{ i: atual, chave: 0, saindo: false, atraso: 0 }]);
  const contador = useRef(1);

  // O slide aberto primeiro; os outros em seguida, um por vez, para a troca nao esperar rede.
  useEffect(() => {
    let vivo = true;
    const ordem = [atual, ...SLIDES_LETRAS.map((_, i) => i).filter((i) => i !== atual)];
    (async () => {
      for (const i of ordem) {
        const id = SLIDES_LETRAS[i]!.id;
        try {
          const p = await carregarVitrine(id);
          if (!vivo) return;
          setPecas((a) => (a[id] ? a : { ...a, [id]: p }));
        } catch {
          // peca que nao veio: o slide fica so com o fundo e o texto
        }
      }
    })();
    return () => { vivo = false; };
    // So na montagem: a ordem de carga parte do slide inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setVivos((v) => {
      if (v.some((x) => x.i === atual && !x.saindo)) return v;
      return [...v.map((x) => ({ ...x, saindo: true })), { i: atual, chave: contador.current++, saindo: false, atraso: v.length ? ATRASO_ENTRADA : 0 }];
    });
    const t = setTimeout(() => setVivos((v) => v.filter((x) => !x.saindo)), (SAIDA + 0.2) * 1000);
    return () => clearTimeout(t);
  }, [atual]);

  const pronta = !!pecas[SLIDES_LETRAS[atual]!.id];
  useEffect(() => { if (pronta) onPronta(); }, [pronta, onPronta]);

  return (
    <>
      {vivos.map((v) => {
        const p = pecas[SLIDES_LETRAS[v.i]!.id];
        return p ? <Modelo key={v.chave} peca={p} saindo={v.saindo} atraso={v.atraso} calmo={calmo} enq={enq} /> : null;
      })}
    </>
  );
}

function Estudio() {
  return (
    <>
      <Environment resolution={256} frames={1}>
        {/* Softbox grande de frente: a face lisa reflete luz (sem ela, reflete o escuro e fica cinza). */}
        <Lightformer form="rect" intensity={1.7} position={[0, 1.5, 9]} scale={[16, 8, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 3]} scale={[10, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.3} position={[-7, 1, 3]} scale={[3, 7, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} position={[7, 2, -2]} scale={[2.5, 8, 1]} target={[0, 0, 0]} />
      </Environment>
      <directionalLight position={[3, 5, 6]} intensity={1.1} />
      <ambientLight intensity={0.22} />
    </>
  );
}

/** `ativo`: fora da tela o canvas para de desenhar (frameloop never). */
/** `reservaTexto`: fracao da altura do palco que o texto ocupa embaixo (no celular a peca fica acima dele). */
export default function PalcoLetras({ atual, calmo, ativo, reservaTexto, onPronta }: { atual: number; calmo: boolean; ativo: boolean; reservaTexto: number; onPronta: () => void }) {
  return (
    <Canvas
      className="!absolute inset-0"
      frameloop={ativo ? 'always' : 'never'}
      dpr={[1, 1.75]}
      camera={{ fov: FOV, position: [0, 0, 10], near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        // Arrastar na vertical rola a pagina; na horizontal gira a peca.
        gl.domElement.style.touchAction = 'pan-y';
      }}
    >
      <Estudio />
      <Pecas atual={atual} calmo={calmo} reservaTexto={reservaTexto} onPronta={onPronta} />
    </Canvas>
  );
}
