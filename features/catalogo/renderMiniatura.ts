/**
 * Foto 3D do exemplo de um gerador para o card do catalogo. Um renderizador so para a
 * pagina toda (o navegador limita os contextos WebGL); cada chamada monta a cena,
 * fotografa em 3/4 e devolve a imagem. Carregado sob demanda: e o que puxa three e
 * as receitas para a pagina inicial. A geracao e a malha rodam no worker.
 */
import * as THREE from 'three';
import { prepararExemplo } from '@/lib/gerador/exemplo';
import { corDe } from '@/lib/gerador/malha';
import { gerarNoWorker } from '@/features/gerador/clienteWorker';

const LARGURA = 720, ALTURA = 540, FOV = 28;
/** Fracao do quadro (do centro a borda) que a peca ocupa. */
const OCUPACAO = 0.88;
let renderizador: THREE.WebGLRenderer | null = null;

/** `paleta`: pinta as cores da peca, na ordem em que aparecem, com estas (o tema da secao). */
export async function renderizarMiniatura(id: string, paleta?: string[]): Promise<string> {
  const { valores, idsFonte } = prepararExemplo(id);
  // Geracao e malha no worker: a pagina do catalogo nao engasga enquanto as fotos saem.
  const { resultado: res, malhas } = await gerarNoWorker(id, valores, idsFonte);

  const cena = new THREE.Scene();
  cena.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sol = new THREE.DirectionalLight(0xffffff, 1.7);
  sol.position.set(1, -2, 3);
  const contra = new THREE.DirectionalLight(0xffffff, 0.5);
  contra.position.set(-2, 1, 1);
  cena.add(sol, contra);
  const descartar: { dispose(): void }[] = [];
  const ordemCores: unknown[] = [];
  const cor = (c: unknown) => {
    if (!paleta?.length) return corDe(res, c as never);
    if (!ordemCores.includes(c)) ordemCores.push(c);
    return paleta[ordemCores.indexOf(c) % paleta.length]!;
  };
  for (const [i, it] of res.itens.entries()) {
    for (const [j, p] of it.pecas.entries()) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(malhas[i]![j]!.posicoes, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(malhas[i]![j]!.normais, 3));
      const m = new THREE.MeshStandardMaterial({ color: cor(p.cor), roughness: 0.5, metalness: 0.02 });
      cena.add(new THREE.Mesh(g, m));
      descartar.push(g, m);
    }
  }

  // Olhando de frente-cima-direita, a camera chega perto ate a peca ocupar OCUPACAO do
  // quadro (pela projecao dos cantos da caixa; a esfera deixaria peca larga pequena).
  const caixa = new THREE.Box3().setFromObject(cena);
  const centro = caixa.getCenter(new THREE.Vector3());
  const cantos = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(i & 1 ? caixa.max.x : caixa.min.x, i & 2 ? caixa.max.y : caixa.min.y, i & 4 ? caixa.max.z : caixa.min.z));
  const camera = new THREE.PerspectiveCamera(FOV, LARGURA / ALTURA, 0.1, 100000);
  camera.up.set(0, 0, 1);
  const direcao = new THREE.Vector3(0.18, -0.8, 0.72).normalize();
  let distancia = caixa.getBoundingSphere(new THREE.Sphere()).radius / Math.sin(((FOV / 2) * Math.PI) / 180);
  for (let i = 0; i < 4; i++) {
    camera.position.copy(centro).addScaledVector(direcao, distancia);
    camera.lookAt(centro);
    camera.updateMatrixWorld();
    const ocupa = Math.max(...cantos.map((c) => { const p = c.clone().project(camera); return Math.max(Math.abs(p.x), Math.abs(p.y)); }));
    distancia *= ocupa / OCUPACAO;
  }
  camera.position.copy(centro).addScaledVector(direcao, distancia);
  camera.lookAt(centro);

  if (!renderizador) {
    renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderizador.setPixelRatio(1);
    renderizador.setSize(LARGURA, ALTURA, false);
    renderizador.setClearColor(0x000000, 0);
  }
  renderizador.render(cena, camera);
  const url = renderizador.domElement.toDataURL('image/webp', 0.9);
  descartar.forEach((d) => d.dispose());
  return url;
}
