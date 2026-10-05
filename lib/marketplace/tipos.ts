/**
 * Dominio da loja Scarprint: pecas impressas em 3D organizadas em secoes. Cada secao tem
 * a sua cor filha (tokens `[data-secao]` em styles/marca.css); a cor da marca nao muda.
 * Preco e licenca comecam "em validacao"; produto de terceiro so aparece com licenca
 * comercial confirmada. Sem secao de brinquedos (restricao legal).
 */

export type Secao = 'casa' | 'colecionaveis' | 'empresa' | 'presentes' | 'sensoriais';

/** `universo`: nome do tema visual da secao (cores e textura), nao o material da peca. */
export const SECOES: Record<Secao, { nome: string; universo: string; chamada: string; resumo: string }> = {
  casa: { nome: 'Casa', universo: 'Tons de madeira', chamada: 'Para deixar a casa com a sua cara', resumo: 'Organizadores, porta-retratos, luminárias e peças de decoração.' },
  colecionaveis: { nome: 'Colecionáveis', universo: 'Brilho de vitrine', chamada: 'Peças para expor e guardar', resumo: 'Bases, miniaturas e peças de coleção.' },
  empresa: { nome: 'Para sua empresa', universo: 'Oficina técnica', chamada: 'A sua marca em 3D', resumo: 'Letreiros, placas, QR code, Pix e cartões para o seu negócio.' },
  presentes: { nome: 'Presentes e festas', universo: 'Festa multicor', chamada: 'Com nome, data e carinho', resumo: 'Chaveiros, topos de bolo, lembrancinhas e presentes personalizados.' },
  sensoriais: { nome: 'Sensoriais', universo: 'Toque e brilho', chamada: 'Para mexer nas mãos', resumo: 'Peças articuladas e de girar, para relaxar e concentrar.' },
};

/** Ordem das secoes na loja. */
export const ORDEM_SECOES: Secao[] = ['casa', 'colecionaveis', 'empresa', 'presentes', 'sensoriais'];

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
  secao: Secao;
  /** Subcategoria livre dentro da secao ("Organizador", "Letreiro"...), mostrada no card. */
  tipo: string;
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
  /** Ja impresso para clientes (portfolio), sem dizer quem. So o que esta confirmado. */
  jaImpresso?: boolean;
  /** Peca sazonal: so aparece com a campanha ligada (lib/marketplace/campanhas.ts). */
  campanha?: 'natal';
  /** Referencia opaca para a conferencia de licenca (a tabela ref -> arquivo fica fora do repo). */
  ref?: string;
  destaque?: boolean;
}
