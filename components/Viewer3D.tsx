'use client';

import { useMemo, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { partToGeometriesByRole, layerToGeometry } from '@/lib/geom/extrude';
import type { Part, Role } from '@/lib/geom/modes';

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
  part: Part;
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

function Peca({
  letras,
  centro,
  explode,
  camadas,
}: {
  letras: LetraRender[];
  centro: [number, number];
  explode: number;
  camadas: Camadas;
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
      {grupos.map((g, i) => (
        <group key={i}>
          {[...g.roles.entries()].map(([role, geo]) => {
            if (!camadas[camadaDoRole(role)]) return null;
            const c = CORES[role];
            // A traseira tambem se afasta, para o explode mostrar as tres partes.
            const dz = role === 'traseira' ? -explode * 0.6 : 0;
            return (
              <mesh key={role} geometry={geo} position={[0, 0, dz]} castShadow receiveShadow>
                <meshStandardMaterial color={c.cor} metalness={c.metal} roughness={c.rug} />
              </mesh>
            );
          })}
        </group>
      ))}
      {camadas.chapa &&
        chapas.map((geo, i) =>
          geo ? (
            <mesh key={'c' + i} geometry={geo} position={[0, 0, explode]}>
              <meshPhysicalMaterial color="#cfe4ff" transparent opacity={0.45} roughness={0.15} metalness={0} transmission={0.6} />
            </mesh>
          ) : null
        )}
    </group>
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
function Enquadrar({ largura, altura, profundidade }: { largura: number; altura: number; profundidade: number }) {
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
  }, [largura, altura, profundidade, camera, controls]);

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
}

export default function Viewer3D({
  letras,
  largura = 200,
  altura = 100,
  profundidade = 30,
  centro = [0, 0],
  explode = 0,
  camadas = CAMADAS_TODAS,
}: Viewer3DProps) {
  const [perdido, setPerdido] = useState(false);

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

      {/* Luzes locais em vez de um HDRI de CDN: o app precisa abrir sem internet,
          e um mapa de ambiente custaria alguns MB para ganho estetico pequeno. */}
      <hemisphereLight intensity={0.7} groundColor="#141821" color="#cfe0ff" />
      <directionalLight position={[300, -400, 600]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-350, 250, 300]} intensity={0.8} color="#bcd4ff" />
      <directionalLight position={[0, 500, -200]} intensity={0.35} />

      <Peca letras={letras} centro={centro} explode={explode} camadas={camadas} />

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

      <Enquadrar largura={largura} altura={altura} profundidade={profundidade} />
      <GuardaContexto onPerda={setPerdido} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} />
    </Canvas>
    </>
  );
}
