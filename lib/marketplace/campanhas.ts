/**
 * Campanhas sazonais da loja. A chave e manual: `ativa: true`, publica, e a campanha aparece
 * (pagina, faixa na home, item no menu e as pecas so dela); `ativa: false`, publica, e some
 * tudo. Para o proximo ano basta religar.
 */
import type { Valores } from '@/lib/gerador/tipos';

export const CAMPANHAS = {
  natal: { ativa: true, nome: 'Especial de Natal', href: '/natal' },
} as const;

export type Campanha = keyof typeof CAMPANHAS;

export const campanhaAtiva = (id: Campanha): boolean => CAMPANHAS[id].ativa;

/** Cores do Natal para as pecas (as mesmas dos tokens `--natal-*` em styles/marca.css). */
export const CORES_NATAL = { vermelho: '#b3261e', verde: '#1f6b45', dourado: '#d9b24c', creme: '#fbf6ec' } as const;
const { vermelho, verde, dourado, creme } = CORES_NATAL;

/** Miniaturas das vitrines de Natal pintadas nas cores da campanha. */
export const PALETA_NATAL = [vermelho, creme, verde, dourado];

/**
 * "Monte com cara de Natal": valores que o painel de personalizar aplica por cima do exemplo
 * quando a pagina do produto abre com ?tema=natal. Chave = id do gerador (o teste confere
 * que cada parametro existe na receita).
 */
export const PRESETS_NATAL: Record<string, Valores> = {
  'chaveiro-nome': { nomes: 'Noel', corBase: creme, corMeio: vermelho, corTopo: verde },
  'palavra-camadas': { linha1: 'Feliz', linha2: 'Natal', corBase: verde, corMeio: creme, corTopo: vermelho },
  'topo-bolo': { linha1: 'Feliz', linha2: 'Natal', corBase: dourado, corMeio: creme, corTopo: vermelho },
  'letra-grande': { letra: 'N', nome: 'Natal', corLetra: verde, corNome: dourado },
  'rosa-nome': { nomes: 'Feliz Natal', cor: vermelho },
  'plaquinha-pet': { corPlaca: vermelho, corDetalhe: creme },
  'cortador-biscoito': { forma: 'estrela', corBase: vermelho, corTopo: creme },
  'carimbo-imagem': { corBase: vermelho, corTopo: creme },
  'floco-neve': { nomes: 'Noel', corFloco: creme, corNome: vermelho },
  'luminaria-letra': { letra: 'N', nome: 'Natal', corLetra: vermelho, corNome: verde },
  'porta-retrato': { texto: 'Feliz Natal', corCima: creme, corBaixo: vermelho, corDesenho: verde },
  'string-art': { linha1: 'Feliz', linha2: 'Natal', corBorda: verde, corFio: vermelho },
};

/** Vitrines da pagina de Natal (slugs de produto, na ordem). */
export const VITRINES_NATAL: { titulo: string; slugs: string[] }[] = [
  { titulo: 'Presentes com nome', slugs: ['enfeite-floco-neve', 'chaveiro-nome', 'letreiro-nome-camadas', 'letra-grande-nome', 'rosa-com-nome', 'plaquinha-pet'] },
  { titulo: 'Para a ceia e os doces', slugs: ['cortador-biscoito', 'carimbo-doce', 'topo-de-bolo'] },
  { titulo: 'Para a casa', slugs: ['luminaria-letra', 'porta-retrato-suspenso', 'string-art'] },
];

/** Textos da campanha (o teste barra prazo, frete e promessa de entrega). */
export const TEXTOS_NATAL = {
  titulo: 'Natal com o nome de quem você ama',
  frase: 'Enfeites e presentes impressos em 3D, feitos sob medida. Escreva um nome e veja a peça antes de pedir.',
  faixa: 'Enfeites, presentes com nome e peças para a ceia, com cara de Natal.',
  antecedencia: 'O Natal enche a fila de impressão: quanto antes você monta o orçamento, mais tranquilo para todo mundo.',
};

/** Dias ate o proximo 25 de dezembro (0 no proprio dia). Calculado no navegador de quem visita. */
export function diasAteONatal(hoje: Date): number {
  const ano = hoje.getMonth() === 11 && hoje.getDate() > 25 ? hoje.getFullYear() + 1 : hoje.getFullYear();
  const natal = new Date(ano, 11, 25);
  const dia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((natal.getTime() - dia.getTime()) / 86_400_000);
}

/** Todas as pecas das vitrines de Natal (ganham a fitinha "Presente de Natal" pela loja). */
export const SLUGS_NATAL: string[] = [...new Set(VITRINES_NATAL.flatMap((v) => v.slugs))];

/** A peca e destaque de Natal agora? So com a campanha ligada (`ativa` troca a chave nos testes). */
export const pecaDeNatal = (slug: string, ativa: (c: Campanha) => boolean = campanhaAtiva): boolean => ativa('natal') && SLUGS_NATAL.includes(slug);
