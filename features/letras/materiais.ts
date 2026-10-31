/**
 * Materiais das pecas da vitrine de letras (palco do topo e cards da esteira), pelo papel de
 * cada parte gerada no build.
 */
import * as THREE from 'three';
import type { ParteVitrine } from './carregarVitrine';

export function materialDe(p: ParteVitrine): THREE.Material {
  const cor = new THREE.Color(p.cor);
  switch (p.papel) {
    // Face de acrilico: lisa e com verniz, reflete o estudio.
    case 'face': return new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.14, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
    // Lateral de letra caixa: metal pintado acetinado.
    case 'lateral': return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.3, metalness: 0.62 });
    // Frente de luminaria: acesa.
    case 'difusor': return new THREE.MeshPhysicalMaterial({ color: cor, emissive: cor, emissiveIntensity: 2.4, roughness: 0.5, toneMapped: false });
    // Plastico impresso: acetinado, com um pouco de verniz.
    default: return new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.36, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.35 });
  }
}
