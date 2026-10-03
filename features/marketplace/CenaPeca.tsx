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

function Modelo({ peca, girar }: { peca: PecaCarregada; girar: boolean }) {
  const grupo = useRef<THREE.Group>(null);
  const entrada = useRef(0);
  const { geos, centro, raio } = useMemo(() => {
    const geos = peca.partes.map((p) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(p.posicoes, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(p.normais, 3));
      return { g, cor: p.cor };
    });
    const caixa = new THREE.Box3();
    for (const { g } of geos) { g.computeBoundingBox(); caixa.union(g.boundingBox!); }
    return { geos, centro: caixa.getCenter(new THREE.Vector3()), raio: caixa.getBoundingSphere(new THREE.Sphere()).radius };
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
    if (girar) g.rotation.z += dt * 0.32;
  });

  return (
    <group ref={grupo} rotation={[0, 0, -0.5]}>
      <group position={[-centro.x, -centro.y, -centro.z]}>
        {geos.map(({ g, cor }, i) => (
          <mesh key={i} geometry={g}>
            <meshStandardMaterial color={cor} roughness={0.48} metalness={0.02} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function CenaPeca({ peca, girar, interativo }: { peca: PecaCarregada; girar: boolean; interativo?: boolean }) {
  return (
    <Canvas className="!absolute inset-0" camera={{ fov: FOV, up: [0, 0, 1] }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.65} />
      <directionalLight position={[2, -3, 4]} intensity={1.7} />
      <directionalLight position={[-3, 2, 1.5]} intensity={0.55} />
      <Modelo peca={peca} girar={girar} />
      {interativo && <OrbitControls enablePan={false} makeDefault />}
    </Canvas>
  );
}
