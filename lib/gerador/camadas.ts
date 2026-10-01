/**
 * Texto em camadas de cor: TOPO e o texto, MEIO e o texto com contorno, BASE e um
 * contorno maior sem miolo, que une as letras numa peca so. Serve a palavra, @social,
 * letras separadas e chaveiros (a receita so muda o que entra e o que vai na base).
 */
import { diffRegion, regionArea, type Region } from '../geom/region';
import { contornar, semBuracos } from './formas';
import type { Parametro, Peca, Valores } from './tipos';
import { liga, num, txt } from './tipos';

export interface OpcoesCamadas {
  cores: 2 | 3;
  espBase: number;
  espMeio: number;
  espTopo: number;
  /** Contorno do meio em volta do texto, mm. */
  contornoMeio: number;
  /** Contorno da base em volta do texto, mm. */
  contornoBase: number;
  /** Tapa o miolo das letras no meio (O, A, B...). */
  preencherMiolo: boolean;
  /** Pecas que se encaixam: cada peca afunda `profEncaixe` num rebaixo da de baixo. */
  encaixe: boolean;
  folga: number;
  profEncaixe: number;
}

/** Parede minima entre o rebaixo do encaixe e a borda da peca de baixo, mm. */
const PAREDE_MIN = 0.8;
/** Piso minimo embaixo do rebaixo, mm. */
const PISO_MIN = 0.4;

export const coresDe = (o: Pick<OpcoesCamadas, 'cores'>) => (o.cores === 3 ? ['Base', 'Meio', 'Topo'] : ['Base', 'Topo']);

/**
 * As pecas de um texto, montadas (base em Z=0, as outras em cima). `ajustarBase`
 * deixa a receita mexer na base (argola do chaveiro, retangulo...).
 */
export function empilhar(texto: Region, o: OpcoesCamadas, ajustarBase: (b: Region) => Region = (b) => b): { pecas: Peca[]; avisos: string[] } {
  const avisos: string[] = [];
  const regioes: { nome: string; r: Region; esp: number }[] = [];
  regioes.push({ nome: 'Base', r: ajustarBase(semBuracos(contornar(texto, o.contornoBase))), esp: o.espBase });
  if (o.cores === 3) {
    const meio = contornar(texto, o.contornoMeio);
    regioes.push({ nome: 'Meio', r: o.preencherMiolo ? semBuracos(meio) : meio, esp: o.espMeio });
  }
  regioes.push({ nome: 'Topo', r: texto, esp: o.espTopo });
  if (regioes[0]!.r.length > 1) avisos.push('A base ficou em mais de um pedaço: aumente o contorno da base para unir as letras.');
  if (o.cores === 3 && o.contornoMeio >= o.contornoBase) avisos.push('O contorno do meio é maior que o da base: o meio vai sobrar para fora.');

  const pecas: Peca[] = [];
  let z = 0;
  regioes.forEach((cam, i) => {
    const prox = regioes[i + 1];
    let p = o.encaixe && prox ? o.profEncaixe : 0;
    if (p > cam.esp - PISO_MIN) {
      p = Math.max(0, cam.esp - PISO_MIN);
      avisos.push(`Encaixe mais fundo que a peça ${cam.nome}: usei ${p.toFixed(1)} mm.`);
    }
    const z1 = z + cam.esp;
    if (p > 0 && prox) {
      const rebaixo = contornar(prox.r, o.folga);
      const sobra = diffRegion(contornar(rebaixo, PAREDE_MIN), cam.r);
      if (regionArea(sobra) > 0.01) avisos.push(`Parede fina entre o encaixe e a borda da peça ${cam.nome}: aumente o contorno.`);
      pecas.push({ nome: cam.nome, cor: i, camadas: [{ region: cam.r, z0: z, z1: z1 - p }, { region: diffRegion(cam.r, rebaixo), z0: z1 - p, z1 }] });
    } else {
      pecas.push({ nome: cam.nome, cor: i, camadas: [{ region: cam.r, z0: z, z1 }] });
    }
    z = z1 - p;
  });
  return { pecas, avisos };
}

/** Os campos de camadas e montagem, iguais em todas as receitas de texto em camadas. */
export function parametrosCamadas(padrao: Partial<Record<'cores' | 'contornoBase' | 'contornoMeio' | 'espBase' | 'espMeio' | 'espTopo', number>> = {}): Parametro[] {
  const tres = (v: Valores) => v.cores === '3';
  const encaixe = (v: Valores) => v.montagem === 'encaixe';
  return [
    { tipo: 'escolha', id: 'cores', rotulo: 'Cores', grupo: 'Camadas', padrao: String(padrao.cores ?? 3), opcoes: [{ valor: '2', rotulo: '2 cores' }, { valor: '3', rotulo: '3 cores' }] },
    { tipo: 'numero', id: 'contornoBase', rotulo: 'Contorno da base', grupo: 'Camadas', padrao: padrao.contornoBase ?? 5, min: 1, max: 20, passo: 0.5, unidade: 'mm', dica: 'Quanto a base passa do texto' },
    { tipo: 'numero', id: 'contornoMeio', rotulo: 'Contorno do meio', grupo: 'Camadas', padrao: padrao.contornoMeio ?? 2, min: 0.5, max: 10, passo: 0.5, unidade: 'mm', visivel: tres },
    { tipo: 'liga', id: 'preencherMiolo', rotulo: 'Tapar o miolo das letras no meio', grupo: 'Camadas', padrao: true, visivel: tres },
    { tipo: 'numero', id: 'espBase', rotulo: 'Espessura da base', grupo: 'Camadas', padrao: padrao.espBase ?? 3, min: 0.6, max: 20, passo: 0.2, unidade: 'mm' },
    { tipo: 'numero', id: 'espMeio', rotulo: 'Espessura do meio', grupo: 'Camadas', padrao: padrao.espMeio ?? 1.6, min: 0.4, max: 20, passo: 0.2, unidade: 'mm', visivel: tres },
    { tipo: 'numero', id: 'espTopo', rotulo: 'Espessura do topo', grupo: 'Camadas', padrao: padrao.espTopo ?? 1.6, min: 0.4, max: 20, passo: 0.2, unidade: 'mm' },
    {
      tipo: 'escolha', id: 'montagem', rotulo: 'Como imprimir', grupo: 'Montagem', padrao: 'ams',
      opcoes: [{ valor: 'ams', rotulo: 'Uma peça multicor (AMS ou troca de filamento)' }, { valor: 'encaixe', rotulo: 'Peças separadas que se encaixam' }],
    },
    { tipo: 'numero', id: 'profEncaixe', rotulo: 'Profundidade do encaixe', grupo: 'Montagem', padrao: 0.6, min: 0.2, max: 3, passo: 0.1, unidade: 'mm', visivel: encaixe },
    { tipo: 'numero', id: 'folga', rotulo: 'Folga do encaixe', grupo: 'Montagem', padrao: 0.2, min: 0, max: 1, passo: 0.05, unidade: 'mm', visivel: encaixe, dica: 'Espaço entre a peça e o rebaixo (cada lado)' },
  ];
}

export function lerCamadas(v: Valores): OpcoesCamadas {
  return {
    cores: txt(v, 'cores') === '2' ? 2 : 3,
    espBase: num(v, 'espBase'),
    espMeio: num(v, 'espMeio'),
    espTopo: num(v, 'espTopo'),
    contornoMeio: num(v, 'contornoMeio'),
    contornoBase: num(v, 'contornoBase'),
    preencherMiolo: liga(v, 'preencherMiolo'),
    encaixe: txt(v, 'montagem') === 'encaixe',
    folga: num(v, 'folga'),
    profEncaixe: num(v, 'profEncaixe'),
  };
}
