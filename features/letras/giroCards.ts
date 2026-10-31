/**
 * Pecas girando dentro dos cards da esteira (desktop). Um renderizador so, fora da tela, desenha
 * a peca de cada card visivel e copia o quadro para o <canvas> 2D do proprio card: assim a
 * imagem inclina junto com o card na perspectiva da esteira (um canvas WebGL por cima ficaria
 * reto). A mesma ideia das fotos dos cards (renderMiniatura), em movimento.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BALANCO_CARDS } from '@/lib/marketplace/vitrineLetras';
import { carregarVitrine, type PecaVitrine3D } from './carregarVitrine';
import { materialDe } from './materiais';

const FOV = 24;

interface Montada {
  grupo: THREE.Group;
  distancia: number;
  /** Onde fica a base da peca (fracao da altura do quadro, de cima) e a largura dela (fracao da largura). */
  base: number;
  largura: number;
}

export class GiroCards {
  private readonly renderizador: THREE.WebGLRenderer;
  private readonly cena = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly pecas = new Map<string, Montada | 'carregando' | 'erro'>();
  private readonly aspecto: number;

  /** `largura` x `altura`: o tamanho do canvas dos cards, em pixels. */
  constructor(largura: number, altura: number) {
    this.aspecto = largura / altura;
    this.renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderizador.setPixelRatio(1);
    this.renderizador.setSize(largura, altura, false);
    this.renderizador.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderizador.toneMappingExposure = 1.05;
    const pmrem = new THREE.PMREMGenerator(this.renderizador);
    this.cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const sol = new THREE.DirectionalLight(0xffffff, 1.1);
    sol.position.set(2, 4, 5);
    this.cena.add(sol);
    this.camera = new THREE.PerspectiveCamera(FOV, this.aspecto, 1, 10000);
  }

  /** Desenha a peca `id` girada `angulo` (rad) no canvas do card. Falso: a peca ainda nao chegou. */
  desenhar(id: string, angulo: number, ctx: CanvasRenderingContext2D): boolean {
    const m = this.montada(id);
    if (!m) return false;
    for (const filho of this.cena.children) if (filho instanceof THREE.Group) filho.visible = filho === m.grupo;
    m.grupo.rotation.y = angulo;
    this.camera.position.set(0, m.distancia * 0.16, m.distancia);
    this.camera.lookAt(0, 0, 0);
    this.renderizador.render(this.cena, this.camera);
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);
    sombra(ctx, W / 2, m.base * H + H * 0.02, m.largura * W * 0.6, H * 0.05);
    ctx.drawImage(this.renderizador.domElement, 0, 0, W, H);
    return true;
  }

  descartar(): void {
    this.cena.environment?.dispose();
    this.renderizador.dispose();
  }

  private montada(id: string): Montada | null {
    const m = this.pecas.get(id);
    if (m && typeof m === 'object') return m;
    if (!m) {
      this.pecas.set(id, 'carregando');
      carregarVitrine(id).then((p) => this.pecas.set(id, this.montar(p))).catch(() => this.pecas.set(id, 'erro'));
    }
    return null;
  }

  private montar(p: PecaVitrine3D): Montada {
    const grupo = new THREE.Group();
    for (const parte of p.partes) grupo.add(new THREE.Mesh(parte.geo, materialDe(parte)));
    grupo.visible = false;
    this.cena.add(grupo);
    // Balancando ate BALANCO_CARDS, a largura maxima na tela e a da peca virada nesse angulo:
    // cabe em qualquer momento sem a camera precisar andar.
    const v = (FOV * Math.PI) / 360, h = Math.atan(Math.tan(v) * this.aspecto);
    const largura = p.tamanho.x * Math.cos(BALANCO_CARDS) + p.tamanho.z * Math.sin(BALANCO_CARDS);
    const distancia = Math.max(p.tamanho.y / 2 / Math.tan(v), largura / 2 / Math.tan(h)) * 1.1 + p.tamanho.z / 2;
    return { grupo, distancia, base: 0.5 + p.tamanho.y / (4 * distancia * Math.tan(v)), largura: p.tamanho.x / (2 * distancia * Math.tan(h)) };
  }
}

/** Sombra suave no chao do estudio, embaixo da peca: uma elipse que esmaece para fora. */
function sombra(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, 'rgba(0,0,0,0.34)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
