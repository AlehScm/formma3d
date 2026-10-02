'use client';

/** Previa das pecas montadas, cada uma na cor dela. Z para cima, como no editor. */
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { caixaDoItem, corDe, posicoesDaPeca } from '@/lib/gerador/malha';
import type { Resultado } from '@/lib/gerador/tipos';

/**
 * `prontas`: posicoes e normais ja calculadas (no worker), na ordem itens/pecas; sem
 * elas, a malha e montada aqui.
 */
export function PreviaGerador({ resultado, malhas: prontas }: { resultado: Resultado; malhas?: { posicoes: Float32Array; normais: Float32Array }[][] | null }) {
  const malhas = useMemo(() => {
    return resultado.itens.flatMap((it, i) =>
      it.pecas.map((p, j) => {
        const g = new THREE.BufferGeometry();
        const pronta = prontas?.[i]?.[j];
        g.setAttribute('position', new THREE.BufferAttribute(pronta ? pronta.posicoes : posicoesDaPeca(p), 3));
        if (pronta) g.setAttribute('normal', new THREE.BufferAttribute(pronta.normais, 3));
        else g.computeVertexNormals();
        return { chave: `${i}/${j}/${it.nome}/${p.nome}`, g, cor: corDe(resultado, p.cor) };
      })
    );
  }, [resultado, prontas]);
  useEffect(() => () => malhas.forEach((m) => m.g.dispose()), [malhas]);

  const caixa = useMemo(() => {
    const cs = resultado.itens.map(caixaDoItem);
    return {
      minX: Math.min(...cs.map((c) => c.minX)), maxX: Math.max(...cs.map((c) => c.maxX)),
      minY: Math.min(...cs.map((c) => c.minY)), maxY: Math.max(...cs.map((c) => c.maxY)),
      z1: Math.max(...cs.map((c) => c.z1)),
    };
  }, [resultado]);

  return (
    <Canvas className="!absolute inset-0" camera={{ fov: 40, up: [0, 0, 1], near: 0.1, far: 10000 }} dpr={[1, 2]}>
      <color attach="background" args={['#eef0f3']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[1, -2, 3]} intensity={1.6} />
      <directionalLight position={[-2, 1, 1]} intensity={0.5} />
      {malhas.map((m) => (
        <mesh key={m.chave} geometry={m.g}>
          <meshStandardMaterial color={m.cor} roughness={0.55} metalness={0.02} />
        </mesh>
      ))}
      <Enquadrar caixa={caixa} />
    </Canvas>
  );
}

/** Enquadra quando o tamanho muda bastante (nao a cada letra digitada). */
function Enquadrar({ caixa }: { caixa: { minX: number; maxX: number; minY: number; maxY: number; z1: number } }) {
  const { camera } = useThree();
  const controles = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const ultimo = useRef(0);
  const cx = (caixa.minX + caixa.maxX) / 2, cy = (caixa.minY + caixa.maxY) / 2, cz = caixa.z1 / 2;
  // Esfera que envolve a caixa inteira (pecas altas, como carimbos, tambem cabem).
  const raio = Math.hypot(caixa.maxX - caixa.minX, caixa.maxY - caixa.minY, caixa.z1) / 2;
  useEffect(() => {
    if (!(raio > 0) || (ultimo.current && Math.abs(raio / ultimo.current - 1) < 0.3)) return;
    ultimo.current = raio;
    const d = raio / Math.sin((20 * Math.PI) / 180);
    const dir = [0.25, -0.75, 0.75], n = Math.hypot(...dir);
    camera.position.set(cx + (d * dir[0]!) / n, cy + (d * dir[1]!) / n, cz + (d * dir[2]!) / n);
    controles.current?.target.set(cx, cy, cz);
    controles.current?.update();
  }, [camera, cx, cy, cz, raio]);
  return <OrbitControls ref={controles} makeDefault target={[cx, cy, cz]} />;
}
