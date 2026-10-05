'use client';

/**
 * A cena 3D da peca viva (three/R3F). Fica num arquivo proprio para entrar so por
 * import dinamico, sem pesar o primeiro carregamento da loja. Z para cima, como no editor.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { PecaCarregada } from './carregarPeca';

const FOV = 30;

/** Quanto dura a "impressao" de entrada (a peca sobe camada por camada). */
const IMPRESSAO = 1.2; // s

function Modelo({ peca, girar, imprimir, balancar }: { peca: PecaCarregada; girar: boolean; imprimir: boolean; balancar: boolean }) {
  const grupo = useRef<THREE.Group>(null);
  const entrada = useRef(0);
  // Plano de corte que sobe no Z: so o que esta abaixo dele aparece. Uma vez por cena.
  const corte = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), []);
  const impresso = useRef(!imprimir);
  const tempo = useRef(0);
  const { geos, centro, raio, meiaAltura } = useMemo(() => {
    const geos = peca.partes.map((p) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(p.posicoes, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(p.normais, 3));
      return { g, cor: p.cor };
    });
    const caixa = new THREE.Box3();
    for (const { g } of geos) { g.computeBoundingBox(); caixa.union(g.boundingBox!); }
    if (!impresso.current) corte.constant = -(caixa.max.z - caixa.min.z) / 2; // nada aparece antes do 1o quadro
    return { geos, centro: caixa.getCenter(new THREE.Vector3()), raio: caixa.getBoundingSphere(new THREE.Sphere()).radius, meiaAltura: (caixa.max.z - caixa.min.z) / 2 };
  }, [peca]);
  useEffect(() => () => geos.forEach(({ g }) => g.dispose()), [geos]);

  // Camera de frente-cima, longe o bastante para a esfera da peca caber com folga.
  const { camera } = useThree();
  useEffect(() => {
    const d = (raio / Math.sin(((FOV / 2) * Math.PI) / 180)) * 1.08;
    const dir = new THREE.Vector3(0, -0.82, 0.57).normalize();
    camera.position.copy(dir.multiplyScalar(d));
    camera.near = d / 50;
    camera.far = d * 10;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    entrada.current = 0;
  }, [camera, raio]);

  useFrame((_, dt) => {
    const g = grupo.current;
    if (!g) return;
    // Unico movimento da pagina: a peca entra crescendo um pouco e gira devagar.
    entrada.current = Math.min(1, entrada.current + dt / 0.45);
    const e = 1 - (1 - entrada.current) ** 3;
    g.scale.setScalar(0.9 + 0.1 * e);
    tempo.current += impresso.current ? dt : 0;
    // Texto (nome) balanca de um lado para o outro: girando inteiro ele aparece de tras para frente.
    if (girar) g.rotation.z = balancar ? -0.15 + 0.5 * Math.sin(tempo.current * 0.7) : g.rotation.z + dt * 0.32;
    if (!impresso.current) {
      tempo.current += dt;
      const t = Math.min(1, tempo.current / IMPRESSAO);
      corte.constant = -meiaAltura + 2.02 * meiaAltura * (1 - (1 - t) ** 2);
      if (t >= 1) { impresso.current = true; corte.constant = Infinity; }
    }
  });

  return (
    <group ref={grupo} rotation={[0, 0, -0.5]}>
      <group position={[-centro.x, -centro.y, -centro.z]}>
        {geos.map(({ g, cor }, i) => (
          <mesh key={i} geometry={g}>
            <meshStandardMaterial color={cor} roughness={0.48} metalness={0.02} clippingPlanes={imprimir ? [corte] : undefined} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** `imprimir`: na primeira peca, ela "imprime" de baixo para cima (quem pede menos movimento nao recebe). */
export default function CenaPeca({ peca, girar, interativo, imprimir = false, balancar = false }: { peca: PecaCarregada; girar: boolean; interativo?: boolean; imprimir?: boolean; balancar?: boolean }) {
  return (
    <Canvas className="!absolute inset-0" camera={{ fov: FOV, up: [0, 0, 1] }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }} onCreated={({ gl }) => { gl.localClippingEnabled = imprimir; }}>
      <ambientLight intensity={0.65} />
      <directionalLight position={[2, -3, 4]} intensity={1.7} />
      <directionalLight position={[-3, 2, 1.5]} intensity={0.55} />
      <Modelo peca={peca} girar={girar} imprimir={imprimir} balancar={balancar} />
      {interativo && <OrbitControls enablePan={false} makeDefault />}
    </Canvas>
  );
}
