/**
 * Dominio do marketplace Scarprint: o que e um produto da loja, sem nada de tela.
 * Preco e licenca comecam "em validacao"; produto de terceiro so aparece com licenca
 * comercial confirmada.
 */

export type Categoria = 'letreiros' | 'placas' | 'personalizados' | 'decoracao' | 'cozinha' | 'brinquedos' | 'utilidades';

export const CATEGORIAS: Record<Categoria, { nome: string; resumo: string }> = {
  letreiros: { nome: 'Letreiros e fachadas', resumo: 'Letra caixa, ACM e letreiros de parede.' },
  placas: { nome: 'Placas e QR', resumo: 'Sinalização, QR code, Pix e avaliação.' },
  personalizados: { nome: 'Personalizados', resumo: 'Com o seu nome, a sua marca, o seu @.' },
  decoracao: { nome: 'Decoração', resumo: 'Para presentear e enfeitar.' },
  cozinha: { nome: 'Confeitaria', resumo: 'Cortadores, carimbos e topos de bolo.' },
  brinquedos: { nome: 'Brinquedos e fidgets', resumo: 'Para brincar e mexer nas mãos.' },
  utilidades: { nome: 'Utilidades', resumo: 'Suportes, organizadores e acessórios.' },
};

/** De quem e o projeto 3D: nosso (feito aqui, inclusive pelos geradores) ou de terceiro. */
export type Origem = 'nosso' | 'terceiros';
/** Licenca para vender a peca impressa. `a-verificar`: ninguem conferiu ainda. */
export type Licenca = 'propria' | 'a-verificar' | 'comercial-ok';
export type Visibilidade = 'publico' | 'oculto';
/** Preco: ate o usuario validar custos, nenhum valor aparece. */
export type Preco = { status: 'validacao' } | { status: 'definido'; valor: number };

export interface Produto {
  slug: string;
  nome: string;
  /** Uma linha para o card. */
  resumo: string;
  /** Paragrafo da pagina do produto. */
  descricao: string;
  categoria: Categoria;
  origem: Origem;
  licenca: Licenca;
  visibilidade: Visibilidade;
  preco: Preco;
  /** O que da para escolher (cores, tamanho, texto...). */
  personalizavel: string[];
  /** Caminhos de fotos em `public/marketplace/<slug>/`; vazio ate as fotos chegarem. */
  midias: string[];
  /** Onde a pessoa mesma monta a peca (um gerador ou o editor). */
  personalizar?: { href: string; rotulo: string };
  /** Ja impresso para clientes (portfolio), sem dizer quem. */
  jaImpresso?: boolean;
  /** Referencia opaca para a conferencia de licenca (a tabela ref -> arquivo fica fora do repo). */
  ref?: string;
  destaque?: boolean;
}
