'use client';

import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { partToGeometriesByRole, layerToGeometry } from '@/lib/geom/extrude';
import type { Part, Role } from '@/lib/geom/modes';
import { regionBounds, type Region } from '@/lib/geom/region';
import type { Colocada } from '@/lib/print/arranjo';
import { deslocamentosNaPlaca, paraCoordenadasDaPlaca, type Deslocamento } from '@/features/viewport/referencial';

/** Peca que nao cabe na mesa: cor unica, para nao se confundir com nenhum papel. */
const COR_NAO_CABE = '#e03131';
/** Peca selecionada. */
const COR_SELECAO = '#ffd43b';
/** Objeto STL pronto: cor neutra propria, para nao parecer parte da letra. */
const COR_OBJETO = '#a0a8b8';

// Cada papel da peca tem cor propria: e o que faz o corte da letra ficar obvio no preview.
export const CORES: Record<Role, { cor: string; metal: number; rug: number }> = {
  corpo: { cor: '#8b93a1', metal: 0.1, rug: 0.65 },
  face: { cor: '#4c8bf5', metal: 0.15, rug: 0.5 },
  parede: { cor: '#6f7785', metal: 0.1, rug: 0.7 },
  traseira: { cor: '#525a68', metal: 0.1, rug: 0.75 },
  bolsao: { cor: '#e8913a', metal: 0.2, rug: 0.5 },
  bisel: { cor: '#6ea8ff', metal: 0.2, rug: 0.45 },
  espacador: { cor: '#d9534f', metal: 0.1, rug: 0.7 },
  borda: { cor: '#b6e04a', metal: 0.15, rug: 0.55 },
  labio: { cor: '#8cba2e', metal: 0.15, rug: 0.55 },
};

export const LEGENDA: [Role, string][] = [
  ['face', 'Face'],
  ['parede', 'Parede'],
  ['corpo', 'Corpo'],
  ['traseira', 'Traseira'],
  ['bolsao', 'Bolsao da chapa'],
  ['borda', 'Borda de apoio'],
  ['labio', 'Labio (trava a chapa)'],
  ['bisel', 'Chanfro'],
  ['espacador', 'Espacador do halo'],
];

export interface LetraRender {
  nome: string;
  /** Identificador unico: `nome` repete em texto ("BARBER" tem dois "B"). */
  chave: string;
  part: Part;
}

/** Objeto STL pronto: so aparece na placa. Posicoes centradas em XY, Z a partir de 0. */
export interface ObjetoRender {
  chave: string;
  nome: string;
  posicoes: Float32Array;
  contorno: Region;
}

/** O que o gizmo devolve quando o usuario solta o mouse. */
export interface Transformacao {
  dx: number;
  dy: number;
  giro: number;
  ex: number;
  ey: number;
}

/** Quais partes da peca estao visiveis. Serve ao painel "Camadas". */
export interface Camadas {
  corpo: boolean;
  chapa: boolean;
  traseira: boolean;
}

export const CAMADAS_TODAS: Camadas = { corpo: true, chapa: true, traseira: true };

/** A qual controle de camada cada papel responde. */
function camadaDoRole(role: Role): keyof Camadas {
  if (role === 'traseira') return 'traseira';
  return 'corpo';
}

/**
 * Retangulo vazado como quatro segmentos.
 *
 * `lineSegments` e nao `line`: em TSX o nome `line` colide com o elemento SVG e a
 * tipagem recusa as props de objeto 3D.
 */
function retanguloVazado(minX: number, minY: number, maxX: number, maxY: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        minX, minY, 0, maxX, minY, 0,
        maxX, minY, 0, maxX, maxY, 0,
        maxX, maxY, 0, minX, maxY, 0,
        minX, maxY, 0, minX, minY, 0,
      ],
      3
    )
  );
  return g;
}

/**
 * Mesa da impressora em escala real, no plano Z=0.
 *
 * Fica fora do grupo que desloca as pecas, entao cai no centro da cena -- serve
 * como regua: da para ver de um olho se o letreiro inteiro passa longe de uma
 * levada de impressao ou se esta na medida.
 */
function Mesa({ x, y }: { x: number; y: number }) {
  const borda = useMemo(() => retanguloVazado(-x / 2, -y / 2, x / 2, y / 2), [x, y]);
  useEffect(() => () => borda.dispose(), [borda]);

  return (
    <group position={[0, 0, -0.01]}>
      <mesh>
        <planeGeometry args={[x, y]} />
        <meshBasicMaterial color="#1b2530" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={borda}>
        <lineBasicMaterial color="#5b8db8" />
      </lineSegments>
    </group>
  );
}

/** Contorno do footprint de uma peca, para apontar qual e a que nao cabe. */
function CaixaFootprint({ contorno, cor }: { contorno: Region; cor: string }) {
  const geo = useMemo(() => {
    const b = regionBounds(contorno);
    return retanguloVazado(b.minX, b.minY, b.maxX, b.maxY);
  }, [contorno]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <lineSegments geometry={geo} position={[0, 0, 0.05]}>
      <lineBasicMaterial color={cor} />
    </lineSegments>
  );
}

function Peca({
  letras,
  centro,
  explode,
  camadas,
  naoCabem,
  deslocamentos,
  objetos,
  selecionada,
  onSelecionar,
  registrar,
}: {
  letras: LetraRender[];
  centro: [number, number];
  explode: number;
  camadas: Camadas;
  naoCabem: ReadonlySet<string>;
  /** Deslocamento de cada peca JA no referencial da cena. Ver `Viewer3D`. */
  deslocamentos: ReadonlyMap<string, Deslocamento>;
  objetos: ObjetoRender[];
  selecionada: string | null;
  onSelecionar: (chave: string) => void;
  registrar: (chave: string, o: THREE.Object3D | null) => void;
}) {
  // As Regions ja carregam a posicao real de cada letra no letreiro (avanco + kerning
  // da fonte), entao o grupo inteiro so precisa ser deslocado para o centro da cena.
  const grupos = useMemo(
    () =>
      letras.map((l) => ({
        roles: partToGeometriesByRole(l.part),
        // Qualquer extra e uma chapa: cortada vira DXF, impressa vira STL separado.
        // Casar por `kind` e nao por nome, senao renomear um extra some com ele do preview.
        chapa: l.part.extras[0],
        alturaZ: l.part.alturaZ,
      })),
    [letras]
  );

  // A chapa fica no proprio Z; o "explode" so a afasta para a frente, para dar
  // para ver as duas pecas separadas sem mexer na geometria.
  const chapas = useMemo(
    () =>
      grupos.map((g) => {
        if (!g.chapa) return null;
        const region = g.chapa.kind === 'cut' ? g.chapa.region : g.chapa.layers[0]?.region;
        if (!region) return null;
        const esp = g.chapa.kind === 'cut' ? g.chapa.espessura : (g.chapa.layers[0]?.z1 ?? 2);
        return layerToGeometry({ region, z0: g.alturaZ, z1: g.alturaZ + esp });
      }),
    [grupos]
  );

  useEffect(
    () => () => {
      for (const g of grupos) for (const geo of g.roles.values()) geo.dispose();
      for (const c of chapas) c?.dispose();
    },
    [grupos, chapas]
  );

  return (
    <group position={[-centro[0], -centro[1], 0]}>
      {grupos.map((g, i) => {
        const l = letras[i]!;
        // Peca que nao cabe na mesa fica vermelha e ganha o contorno do footprint:
        // sem isso o aviso em texto nao diz QUAL das letras e o problema.
        const fora = naoCabem.has(l.chave);
        const sel = selecionada === l.chave;
        return (
          <PecaPosicionada
            key={l.chave}
            contorno={l.part.contorno}
            chave={l.chave}
            desloc={deslocamentos.get(l.chave) ?? null}
            registrar={registrar}
          >
            {[...g.roles.entries()].map(([role, geo]) => {
              if (!camadas[camadaDoRole(role)]) return null;
              const c = CORES[role];
              // A traseira tambem se afasta, para o explode mostrar as tres partes.
              const dz = role === 'traseira' ? -explode * 0.6 : 0;
              return (
                <mesh
                  key={role}
                  geometry={geo}
                  position={[0, 0, dz]}
                  castShadow
                  receiveShadow
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelecionar(l.chave);
                  }}
                >
                  <meshStandardMaterial
                    color={fora ? COR_NAO_CABE : c.cor}
                    metalness={fora ? 0.1 : c.metal}
                    roughness={fora ? 0.6 : c.rug}
                    emissive={sel ? COR_SELECAO : '#000000'}
                    emissiveIntensity={sel ? 0.35 : 0}
                  />
                </mesh>
              );
            })}
            {fora && <CaixaFootprint contorno={l.part.contorno} cor={COR_NAO_CABE} />}
            {sel && <CaixaFootprint contorno={l.part.contorno} cor={COR_SELECAO} />}
            {camadas.chapa && chapas[i] ? (
              <mesh geometry={chapas[i]!} position={[0, 0, explode]}>
                <meshPhysicalMaterial color="#cfe4ff" transparent opacity={0.45} roughness={0.15} metalness={0} transmission={0.6} />
              </mesh>
            ) : null}
          </PecaPosicionada>
        );
      })}
      {objetos.map((o) => (
        <PecaPosicionada key={o.chave} contorno={o.contorno} chave={o.chave} desloc={deslocamentos.get(o.chave) ?? null} registrar={registrar}>
          <MalhaObjeto
            o={o}
            fora={naoCabem.has(o.chave)}
            sel={selecionada === o.chave}
            onSelecionar={onSelecionar}
          />
        </PecaPosicionada>
      ))}
    </group>
  );
}

/**
 * Objeto STL. A malha nao depende do letreiro, entao a geometria so e refeita
 * quando o arquivo muda.
 */
function MalhaObjeto({
  o,
  fora,
  sel,
  onSelecionar,
}: {
  o: ObjetoRender;
  fora: boolean;
  sel: boolean;
  onSelecionar: (chave: string) => void;
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(o.posicoes, 3));
    g.computeVertexNormals();
    return g;
  }, [o.posicoes]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <>
      <mesh
        geometry={geo}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelecionar(o.chave);
        }}
      >
        <meshStandardMaterial
          color={fora ? COR_NAO_CABE : COR_OBJETO}
          metalness={0.1}
          roughness={0.6}
          emissive={sel ? COR_SELECAO : '#000000'}
          emissiveIntensity={sel ? 0.35 : 0}
        />
      </mesh>
      {(fora || sel) && <CaixaFootprint contorno={o.contorno} cor={sel ? COR_SELECAO : COR_NAO_CABE} />}
    </>
  );
}

/**
 * Envolve uma peca com a transformacao de ARRANJO (posicao na mesa).
 *
 * Nao confundir com a edicao da peca, que ja esta embutida na geometria porque muda
 * o produto. Aqui e so acomodacao para imprimir, entao vale como transformacao de
 * cena -- barato, e nao reconstroi malha.
 *
 * O giro tem de acontecer no centro da propria peca: as geometrias carregam a
 * posicao absoluta no letreiro, e girar na origem jogaria a letra para longe.
 */
function PecaPosicionada({
  contorno,
  chave,
  desloc,
  registrar,
  children,
}: {
  contorno: Region;
  chave: string;
  desloc: Deslocamento | null;
  registrar: (chave: string, o: THREE.Object3D | null) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    registrar(chave, ref.current);
    return () => registrar(chave, null);
  }, [chave, registrar]);

  const centro = useMemo(() => {
    const b = regionBounds(contorno);
    return [b.minX + b.w / 2, b.minY + b.h / 2] as [number, number];
  }, [contorno]);

  const dx = desloc?.dx ?? 0;
  const dy = desloc?.dy ?? 0;
  const giro = ((desloc?.giro ?? 0) * Math.PI) / 180;

  return (
    <group ref={ref} position={[centro[0] + dx, centro[1] + dy, 0]} rotation={[0, 0, giro]}>
      <group position={[-centro[0], -centro[1], 0]}>{children}</group>
    </group>
  );
}

/**
 * Gizmo de mover / girar / escalar preso a peca selecionada.
 *
 * O delta e lido e devolvido SO quando o usuario solta o mouse. Em modo letreiro a
 * transformacao muda o produto e reconstroi a malha da peca: fazer isso a cada
 * quadro de arraste travaria a interface num letreiro com muitas pecas.
 *
 * Tudo e travado no plano da mesa -- mover em XY, girar em Z. Peca de letra caixa
 * deita na mesa, e inclinar em X ou Y produziria uma peca que nao imprime.
 */
function Gizmo({
  alvo,
  ferramenta,
  onSoltar,
}: {
  alvo: THREE.Object3D | null;
  ferramenta: 'nenhuma' | 'mover' | 'girar' | 'escalar';
  onSoltar: (t: Transformacao) => void;
}) {
  const inicio = useRef<{ p: THREE.Vector3; r: number; s: THREE.Vector3 } | null>(null);

  if (!alvo || ferramenta === 'nenhuma') return null;
  const modo = ferramenta === 'mover' ? 'translate' : ferramenta === 'girar' ? 'rotate' : 'scale';

  return (
    <TransformControls
      object={alvo as THREE.Object3D}
      mode={modo}
      showX={ferramenta !== 'girar'}
      showY={ferramenta !== 'girar'}
      showZ={ferramenta === 'girar'}
      onMouseDown={() => {
        inicio.current = { p: alvo.position.clone(), r: alvo.rotation.z, s: alvo.scale.clone() };
      }}
      onMouseUp={() => {
        const i = inicio.current;
        if (!i) return;
        inicio.current = null;
        onSoltar({
          dx: alvo.position.x - i.p.x,
          dy: alvo.position.y - i.p.y,
          giro: ((alvo.rotation.z - i.r) * 180) / Math.PI,
          ex: i.s.x === 0 ? 1 : alvo.scale.x / i.s.x,
          ey: i.s.y === 0 ? 1 : alvo.scale.y / i.s.y,
        });
        // A transformacao real vira da `Region` (letreiro) ou do arranjo (placa):
        // devolver o grupo ao estado anterior evita a transformacao entrar duas vezes.
        alvo.position.copy(i.p);
        alvo.rotation.z = i.r;
        alvo.scale.copy(i.s);
      }}
    />
  );
}

/**
 * O contexto WebGL pode cair sozinho (reset de driver, troca de GPU, abas demais).
 * Sem tratar, a cena some e fica uma tela preta sem explicacao nenhuma.
 */
function GuardaContexto({ onPerda }: { onPerda: (perdido: boolean) => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const perdeu = (e: Event) => {
      e.preventDefault(); // permite que o navegador restaure depois
      onPerda(true);
    };
    const voltou = () => onPerda(false);
    canvas.addEventListener('webglcontextlost', perdeu);
    canvas.addEventListener('webglcontextrestored', voltou);
    return () => {
      canvas.removeEventListener('webglcontextlost', perdeu);
      canvas.removeEventListener('webglcontextrestored', voltou);
    };
  }, [gl, onPerda]);
  return null;
}

/** Enquadra a camera no letreiro inteiro sempre que o tamanho muda. */
function Enquadrar({
  largura,
  altura,
  profundidade,
  pedido,
}: {
  largura: number;
  altura: number;
  profundidade: number;
  /** Muda para reenquadrar sob demanda (atalho F), mesmo sem o tamanho mudar. */
  pedido: number;
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null;

  useEffect(() => {
    const raio = Math.max(largura, altura, profundidade, 50) * 0.9;
    const dist = raio * 2.1;
    camera.position.set(dist * 0.45, -dist * 0.55, dist * 0.7);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.near = Math.max(1, dist / 500);
      camera.far = dist * 12;
    }
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(0, 0, profundidade / 2);
      controls.update();
    }
  }, [largura, altura, profundidade, pedido, camera, controls]);

  return null;
}

export interface Viewer3DProps {
  letras: LetraRender[];
  largura?: number;
  altura?: number;
  profundidade?: number;
  centro?: [number, number];
  /** Quanto afastar a chapa do corpo, em mm. 0 = peca montada. */
  explode?: number;
  camadas?: Camadas;
  /** Mesa da impressora, desenhada em escala real no centro da cena. */
  mesa?: { x: number; y: number } | null;
  /** Chaves das pecas que nao cabem na mesa: saem em vermelho. */
  naoCabem?: ReadonlySet<string>;
  /** Onde cada peca foi acomodada na mesa. Vazio = posicao do letreiro. */
  arranjo?: ReadonlyMap<string, Colocada>;
  /** Chaves que sobraram do arranjo: ficam enfileiradas ao lado da placa. */
  sobraram?: readonly string[];
  /** Objetos STL prontos. So desenhados na placa (quando ha `mesa`). */
  objetos?: ObjetoRender[];
  selecionada?: string | null;
  onSelecionar?: (chave: string | null) => void;
  /** Ferramenta do gizmo. 'nenhuma' desliga. */
  ferramenta?: 'nenhuma' | 'mover' | 'girar' | 'escalar';
  /**
   * Na placa (com `mesa`), o gizmo devolve a posicao ABSOLUTA da peca em
   * coordenadas da placa -- as mesmas do `arrumar` -- em vez de um delta. Assim
   * uma peca que sobrou e e arrastada para dentro vira colocada sem pular.
   */
  onArranjar?: (chave: string, c: Colocada) => void;
  /** Chamado quando o usuario solta o gizmo, com o delta acumulado. */
  onTransformar?: (chave: string, t: Transformacao) => void;
  /** Incrementar reenquadra a camera. */
  pedidoEnquadrar?: number;
}

export default function Viewer3D({
  letras,
  largura = 200,
  altura = 100,
  profundidade = 30,
  centro = [0, 0],
  explode = 0,
  camadas = CAMADAS_TODAS,
  mesa = null,
  naoCabem = new Set<string>(),
  arranjo = new Map<string, Colocada>(),
  sobraram = [],
  objetos = [],
  selecionada = null,
  onSelecionar = () => {},
  ferramenta = 'nenhuma',
  onTransformar = () => {},
  onArranjar = () => {},
  pedidoEnquadrar = 0,
}: Viewer3DProps) {
  const [perdido, setPerdido] = useState(false);

  // Os grupos de cada peca, para o gizmo poder se prender ao selecionado.
  const grupos = useRef(new Map<string, THREE.Object3D>());
  const registrar = useCallback((chave: string, o: THREE.Object3D | null) => {
    if (o) grupos.current.set(chave, o);
    else grupos.current.delete(chave);
  }, []);

  // A conta dos referenciais mora em `referencial.ts`, pura e testada: aqui dentro
  // ela ja tirou as pecas de cima da placa uma vez sem ninguem ver.
  const deslocamentos = useMemo(
    () =>
      mesa
        ? deslocamentosNaPlaca(
            [...letras.map((l) => ({ chave: l.chave, contorno: l.part.contorno })), ...objetos],
            arranjo,
            sobraram,
            mesa,
            centro
          )
        : new Map<string, Deslocamento>(),
    [mesa, arranjo, sobraram, letras, objetos, centro]
  );

  return (
    <>
      {perdido && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-6 text-center">
          <div className="max-w-xs text-[12px] leading-relaxed text-slate-300">
            O navegador encerrou a aceleracao grafica e a visualizacao 3D parou.
            <br />
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded border border-sky-500/50 bg-sky-600 px-3 py-1.5 text-[11.5px] font-medium text-white hover:bg-sky-500"
            >
              Recarregar a pagina
            </button>
          </div>
        </div>
      )}
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 42, up: [0, 0, 1], position: [200, -250, 250] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <color attach="background" args={['#0b0d10']} />

      {/* Clique no vazio desmarca. Fica atras de tudo e nao recebe luz. */}
      <mesh position={[0, 0, -400]} onClick={() => onSelecionar(null)}>
        <planeGeometry args={[100000, 100000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Luzes locais em vez de um HDRI de CDN: o app precisa abrir sem internet,
          e um mapa de ambiente custaria alguns MB para ganho estetico pequeno. */}
      <hemisphereLight intensity={0.7} groundColor="#141821" color="#cfe0ff" />
      <directionalLight position={[300, -400, 600]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-350, 250, 300]} intensity={0.8} color="#bcd4ff" />
      <directionalLight position={[0, 500, -200]} intensity={0.35} />

      <Peca
        letras={letras}
        centro={centro}
        explode={explode}
        camadas={camadas}
        naoCabem={naoCabem}
        deslocamentos={deslocamentos}
        objetos={mesa ? objetos : []}
        selecionada={selecionada}
        onSelecionar={onSelecionar}
        registrar={registrar}
      />

      <Gizmo
        alvo={selecionada ? (grupos.current.get(selecionada) ?? null) : null}
        ferramenta={ferramenta}
        onSoltar={(t) => {
          if (!selecionada) return;
          if (!mesa) return onTransformar(selecionada, t);
          // Na placa: devolve a posicao absoluta em coordenadas da placa. Parte do
          // deslocamento efetivo de agora (colocada ou sobra) e desfaz o referencial.
          const d = deslocamentos.get(selecionada) ?? { dx: 0, dy: 0, giro: 0 };
          onArranjar(selecionada, paraCoordenadasDaPlaca(selecionada, d, t, mesa, centro));
        }}
      />

      {mesa && <Mesa x={mesa.x} y={mesa.y} />}

      {/* Quadriculado de 10mm / 50mm: referencia de escala real sob o letreiro. */}
      <Grid
        cellSize={10}
        cellColor="#2a2f38"
        sectionSize={50}
        sectionColor="#3d4552"
        infiniteGrid
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -0.02]}
        fadeDistance={Math.max(largura, altura) * 6 + 600}
        fadeStrength={1.5}
      />

      <Enquadrar
        pedido={pedidoEnquadrar}
        largura={Math.max(largura, mesa?.x ?? 0)}
        altura={Math.max(altura, mesa?.y ?? 0)}
        profundidade={profundidade}
      />
      <GuardaContexto onPerda={setPerdido} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} />
    </Canvas>
    </>
  );
}
