/**
 * Saidas do design: o Resultado do gerador (uma peca por camada, empilhada em Z, na cor da
 * camada) para a previa 3D e a exportacao 3MF/STL, e o Desenho (forma + cores por camada)
 * que os geradores com campo de desenho recebem em "Usar no modelo".
 */
import type { Desenho, Peca, Resultado } from '@/lib/gerador/tipos';
import type { Design } from './documento';
import { regioesDasCamadas, trechosFinos, type Fontes } from './geometria';
import { unir } from '@/lib/gerador/formas';

export function designParaResultado(d: Design, fontes: Fontes): Resultado {
  const regioes = regioesDasCamadas(d, fontes);
  const visiveis = d.camadas.filter((c) => !c.oculta && (regioes.get(c.id)?.length ?? 0) > 0);
  const pecas: Peca[] = visiveis.map((c, i) => ({ nome: c.nome, cor: i, camadas: [{ region: regioes.get(c.id)!, z0: c.z0, z1: c.z1 }] }));
  const avisos: string[] = [];
  if (!pecas.length) avisos.push('O design está vazio: adicione um texto, uma forma ou uma imagem.');
  for (const c of visiveis) if (trechosFinos(regioes.get(c.id)!).length) avisos.push(`A camada "${c.nome}" tem trechos mais finos que o bico imprime bem.`);
  return {
    itens: pecas.length ? [{ nome: d.nome || 'Design', pecas }] : [],
    cores: visiveis.map((c) => c.nome),
    hex: visiveis.map((c) => c.cor),
    avisos,
  };
}

/** Para os geradores: a forma toda e uma regiao por camada (as de cima cobrem as de baixo). */
export function designParaDesenho(d: Design, fontes: Fontes): Desenho {
  const regioes = regioesDasCamadas(d, fontes);
  const visiveis = d.camadas.filter((c) => !c.oculta && (regioes.get(c.id)?.length ?? 0) > 0);
  const cores = visiveis.map((c) => ({ regiao: regioes.get(c.id)!, hex: c.cor }));
  return { nome: d.nome || 'Design', regiao: unir(cores.map((c) => c.regiao)), ...(cores.length > 1 ? { cores } : {}) };
}
