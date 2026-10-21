/**
 * Personalizar na pagina do produto: quais campos do gerador aparecem (os principais:
 * texto, fonte, cores e uma medida) e o resumo legivel da configuracao, que vai para o
 * orcamento e para a mensagem. O resto das opcoes continua no gerador completo.
 */
import { prepararModelo } from '@/lib/gerador/exemplo';
import { hrefComSnapshotModelo } from '@/lib/gerador/handoff';
import { FONTES_WEB } from '@/lib/text/fontes';
import type { Parametro, Valores } from '@/lib/gerador/tipos';

const LIMITE = { texto: 2, fonte: 1, cor: 4, numero: 1 } as const;
/** Medidas que fazem sentido para quem compra (o resto e ajuste tecnico). */
const MEDIDA = /^(altura|largura|tamanho|diametro|lado|comprimento)$/;

export function camposPrincipais(id: string, valores: Valores): Parametro[] {
  const { receita } = prepararModelo(id, { base: 'exemplo' });
  const contagem = { texto: 0, fonte: 0, cor: 0, numero: 0 };
  return receita.parametros.filter((p) => {
    if (p.visivel && !p.visivel(valores)) return false;
    if (p.tipo === 'numero' && !(p.unidade === 'mm' && MEDIDA.test(p.id))) return false;
    if (p.tipo !== 'texto' && p.tipo !== 'fonte' && p.tipo !== 'cor' && p.tipo !== 'numero') return false;
    if (contagem[p.tipo] >= LIMITE[p.tipo]) return false;
    contagem[p.tipo]++;
    return true;
  });
}

/** Valores iniciais do produto: o exemplo da ficha do gerador. */
export const valoresIniciais = (id: string, extras?: Valores): Valores => prepararModelo(id, { base: 'exemplo', extras }).valores;

export function hrefParaEditor(id: string, href: string, valores: Valores, basePath = ''): string {
  const { receita } = prepararModelo(id, { base: 'padrao' });
  return hrefComSnapshotModelo(href, { versao: 1, receita: id, valores }, basePath, receita);
}

const legivel = (p: Parametro, v: Valores[string]): string => {
  if (p.tipo === 'fonte') return FONTES_WEB.find((f) => f.id === v)?.nome ?? String(v);
  if (p.tipo === 'cor') return String(v).toUpperCase();
  if (p.tipo === 'numero') return `${v}${p.unidade ? ` ${p.unidade}` : ''}`;
  if (p.tipo === 'escolha') return p.opcoes.find((o) => o.valor === v)?.rotulo ?? String(v);
  if (p.tipo === 'liga') return v ? 'Sim' : 'Não';
  // A imagem nao cabe na mensagem: a pessoa manda pelo WhatsApp.
  if (p.tipo === 'svg') return v ? 'imagem enviada (mandar pelo WhatsApp)' : '';
  return String(v).trim();
};

/** "Nomes: Ana; Fonte: Lobster; Base: #F5F5F4" -- so os campos mostrados, na ordem do gerador. */
export function resumoPersonalizacao(campos: Parametro[], valores: Valores): string {
  return campos.map((p) => `${p.rotulo}: ${legivel(p, valores[p.id] ?? p.padrao)}`).filter((t) => !t.endsWith(': ')).join('; ');
}

/**
 * O pedido que sai do gerador completo (/design): os textos e tudo o que mudou do padrao,
 * so os campos visiveis, na ordem do gerador.
 */
export function resumoDoModelo(id: string, valores: Valores): string {
  const { receita, valores: padrao } = prepararModelo(id, { base: 'padrao' });
  const campos = receita.parametros.filter((p) => (!p.visivel || p.visivel(valores)) && p.id in valores && (p.tipo === 'texto' || valores[p.id] !== padrao[p.id]));
  return resumoPersonalizacao(campos, valores) || 'Configuração padrão do modelo';
}

/** Valores para guardar no orcamento: sem os desenhos importados (pesam e nao vao na mensagem). */
export function valoresParaOrcamento(id: string, valores: Valores): Valores {
  const { receita } = prepararModelo(id, { base: 'padrao' });
  const imagens = new Set(receita.parametros.filter((p) => p.tipo === 'svg').map((p) => p.id));
  return Object.fromEntries(Object.entries(valores).filter(([k]) => !imagens.has(k)));
}
