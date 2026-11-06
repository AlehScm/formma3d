/**
 * Dominio da loja Scarprint: pecas impressas em 3D organizadas em categorias (secoes, as do
 * menu do topo). Cada peca tem uma categoria; o que entra em cada uma esta em
 * docs/categorias.md. Cada secao tem a sua cor filha (tokens `[data-secao]` em
 * styles/marca.css); a cor da marca nao muda. "Nossos geradores" nao e secao: e a lista das
 * pecas com gerador (consultas.ts). Preco comeca "em validacao"; aparece o que esta
 * `publico` no banco (a licenca e so informativa). Sem secao de brinquedos (restricao legal).
 */

export type Secao = 'natal' | 'decoracao' | 'cozinha' | 'organizacao' | 'escritorio' | 'infantil' | 'presentes' | 'empresa' | 'sensoriais';

/** `universo`: nome do tema visual da secao (cores e textura), nao o material da peca. `resumo`: o que entra. */
export const SECOES: Record<Secao, { nome: string; universo: string; chamada: string; resumo: string }> = {
  natal: { nome: 'Natal', universo: 'Noite de Natal', chamada: 'Para enfeitar o Natal', resumo: 'Enfeites, presépios, quebra-nozes, renas, árvores, luzes e mesa de Natal.' },
  decoracao: { nome: 'Decoração', universo: 'Tons de madeira', chamada: 'Para deixar a casa com a sua cara', resumo: 'Estatuetas, esculturas, vasos, arte de parede, luminárias, porta-retratos e arte sacra.' },
  cozinha: { nome: 'Cozinha e mesa', universo: 'Cerâmica clara', chamada: 'Para a cozinha e a mesa posta', resumo: 'Utensílios, porta-copos, café, pia, petisqueiras e organização da cozinha.' },
  organizacao: { nome: 'Organização', universo: 'Gaveta arrumada', chamada: 'Cada coisa no seu lugar', resumo: 'Organizadores de mesa, banheiro, maquiagem, joias e gavetas, prateleiras e ganchos.' },
  escritorio: { nome: 'Escritório e games', universo: 'Mesa de trabalho', chamada: 'Para a mesa, o setup e o console', resumo: 'Suportes de celular, notebook, fone e controle, cabos e acessórios para impressora 3D.' },
  infantil: { nome: 'Bebê e infantil', universo: 'Quarto de bebê', chamada: 'Do nascimento ao quarto da criança', resumo: 'Lembranças de nascimento, mesversário, quarto infantil e luminárias infantis.' },
  presentes: { nome: 'Presentes e festas', universo: 'Festa multicor', chamada: 'Com nome, data e carinho', resumo: 'Chaveiros, topos de bolo, lembrancinhas, confeitaria e presentes personalizados.' },
  empresa: { nome: 'Para sua empresa', universo: 'Oficina técnica', chamada: 'A sua marca em 3D', resumo: 'Letreiros, placas, QR code, Pix e cartões para o seu negócio.' },
  sensoriais: { nome: 'Sensoriais', universo: 'Toque e brilho', chamada: 'Para mexer nas mãos', resumo: 'Peças articuladas e de girar, para relaxar e concentrar.' },
};

/** "Nossos geradores" no menu: nao e secao do banco, e a lista das pecas com gerador (consultas.geradores). */
export const NOSSOS_GERADORES = { nome: 'Nossos geradores', href: '/geradores', chamada: 'Personalize ao vivo', resumo: 'Tudo que a gente criou e você personaliza ao vivo: nome, cores e tamanho, vendo a peça em 3D.' } as const;

/** Ordem das secoes na loja (menu do topo, rodape e atalhos). */
export const ORDEM_SECOES: Secao[] = ['natal', 'decoracao', 'cozinha', 'organizacao', 'escritorio', 'infantil', 'presentes', 'empresa', 'sensoriais'];

/** Endereco da pagina de cada categoria: Natal tem a pagina da campanha; as outras, /secao/<slug>. */
export const hrefDaSecao = (s: Secao) => (s === 'natal' ? '/natal' : `/secao/${s}`);

/** Enderecos antigos de secao que viraram outra pagina (o link velho continua funcionando). */
export const SECOES_ANTIGAS: Record<string, string> = { casa: '/secao/decoracao', colecionaveis: '/pecas' };

/** De quem e o projeto 3D: nosso (feito aqui, inclusive pelos geradores) ou de terceiro. */
export type Origem = 'nosso' | 'terceiros';
/** Licenca original da plataforma, so informativa (nao decide o que aparece). `a-verificar`:
 *  ninguem conferiu ainda. `nao-comercial`: a licenca publicada proibe vender sem permissao do autor. */
export type Licenca = 'propria' | 'a-verificar' | 'nao-comercial' | 'comercial-ok';
export type Visibilidade = 'publico' | 'oculto';
/** Preco: ate o usuario validar custos, nenhum valor aparece. */
export type Preco = { status: 'validacao' } | { status: 'definido'; valor: number };
/** `gerador`: feito por um gerador nosso (`Produto.gerador`), com configuracao simples na pagina
 *  e "Ver no gerador" para o resto. `editor`: montado num editor (`Produto.personalizar`). */
export type Tag = 'gerador' | 'editor';
export const TAGS: Tag[] = ['gerador', 'editor'];

/** Autor do projeto 3D de terceiro, com o link do original e a licenca publicada la. */
export interface Credito {
  autor: string;
  autorUrl: string;
  titulo: string;
  url: string;
  plataforma: 'MakerWorld';
  licencaOriginal: string;
}

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
  /** Versao de card da primeira foto (`public/marketplace/<slug>/card/`), gerada por scripts/fotos-marketplace.mts. */
  capa?: string;
  tags: Tag[];
  /** Id da ficha do gerador (lib/gerador/receitas/fichas.ts); so com a tag `gerador`. */
  gerador?: string;
  /** Editor onde a pessoa monta a peca (/editor, /design); so com a tag `editor`. */
  personalizar?: { href: string; rotulo: string };
  /** Registro criado da ficha, com textos provisorios: preencher no banco (data/produtos.json). */
  revisar?: boolean;
  /** Ja impresso para clientes: registro interno, nao aparece no site (paraCliente tira). */
  jaImpresso?: boolean;
  /** Peca sazonal: so aparece com a campanha ligada (lib/marketplace/campanhas.ts). Toda peca da categoria Natal tem. */
  campanha?: 'natal';
  /** Dia em que a peca entrou na loja (AAAA-MM-DD): a ordem "mais recentes". */
  adicionadoEm: string;
  /** Referencia da conferencia de licenca: M### em data/makerworld/refs.md; T## e N## fora do repo. */
  ref?: string;
  /** Credito ao autor do projeto de terceiro (mostrado na pagina do produto). */
  credito?: Credito;
  destaque?: boolean;
}
