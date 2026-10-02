import fs from 'fs';
import type { Font } from 'opentype.js';
import { parseFont } from '../lib/text/glyphs';
import { regionArea } from '../lib/geom/region';
import { receitaPorId } from '../lib/gerador/receitas';
import { valoresPadrao, type Receita, type Valores } from '../lib/gerador/tipos';

const fontes = new Map<string, Font>();
const ctx = {
  fonte: (id: string) => {
    const arquivo = id === 'archivo-black' ? 'ariblk.ttf' : id === 'pacifico' ? 'segoescb.ttf' : 'arialbd.ttf';
    if (!fontes.has(arquivo)) {
      const b = fs.readFileSync(`C:/Windows/Fonts/${arquivo}`);
      fontes.set(arquivo, parseFont(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer));
    }
    return fontes.get(arquivo)!;
  },
};
const gerar = (id: string, mudar: Valores = {}) => {
  const r = receitaPorId(id) as Receita;
  if (!r) throw new Error(`Receita ausente: ${id}`);
  return r.gerar({ ...valoresPadrao(r), ...mudar }, ctx);
};
const conferir = (nome: string, condicao: boolean) => {
  if (!condicao) throw new Error(nome);
  console.log(`ok ${nome}`);
};

const letra = gerar('luminaria-letra', { letra: 'A', engrossar: 4, nome: '' });
const base = letra.itens.find((it) => it.nome === 'Base')?.pecas[0];
conferir('A engrossado mantém o vazado interno', !!base?.camadas[0]?.region.some((p) => p.holes.length > 0));
const parede = base?.camadas.filter((c) => c.z0 >= 4) ?? [];
conferir('saída do cabo atravessa a parede do A', parede.length >= 2 && regionArea(parede[0]!.region) < regionArea(parede.at(-1)!.region) - 1);

const socialFora = gerar('luminaria-social', { largura: 120, xCabo: -90 });
conferir('furo fora da base não exporta peça sem abertura', socialFora.itens.length === 0 && socialFora.avisos.some((a) => a.includes('furo do cabo')));
const socialPadrao = gerar('luminaria-social');
conferir('furo padrão permite gerar a luminária social', socialPadrao.itens.length > 0 && socialPadrao.avisos.length === 0);

const brilho = gerar('letra-grande', { estilo: 'brilho', nome: '' });
conferir('moldura padrão apoia o acetato', brilho.itens.length > 0 && !brilho.avisos.some((a) => a.includes('acetato')));
