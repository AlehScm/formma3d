/**
 * Cadastro da loja. Os nossos vem do que ja imprimimos e dos geradores; os de terceiros
 * ficam ocultos ate a licenca de venda ser confirmada. Textos escritos por nos; nenhum
 * arquivo, nome de arquivo, foto, preco ou cliente aqui (o repo e publico): `ref` e uma
 * referencia opaca, e a tabela ref -> arquivo fica fora do repo, no estado do projeto.
 */
import { FOTOS } from './fotos';
import type { Categoria, Produto } from './tipos';

const validacao = { status: 'validacao' } as const;

/** Produto nosso, publico, com preco em validacao. */
function nosso(p: Pick<Produto, 'slug' | 'nome' | 'resumo' | 'descricao' | 'categoria' | 'personalizavel'> & Partial<Produto>): Produto {
  return { origem: 'nosso', licenca: 'propria', visibilidade: 'publico', preco: validacao, midias: [], ...p };
}

/** Feito por um gerador nosso: o botao "Personalizar" leva direto a ele. */
function doGerador(slug: string, nome: string, categoria: Categoria, resumo: string, descricao: string, gerador: string, personalizavel: string[], destaque = false): Produto {
  return nosso({ slug, nome, categoria, resumo, descricao, personalizavel, destaque, personalizar: { href: `/moldes/${gerador}`, rotulo: 'Personalizar agora' } });
}

/** Modelo de terceiro: cadastrado, oculto, licenca a verificar. */
function deTerceiro(slug: string, nome: string, categoria: Categoria, resumo: string, ref: string, jaImpresso = false): Produto {
  return {
    slug, nome, categoria, resumo, descricao: resumo, origem: 'terceiros', licenca: 'a-verificar', visibilidade: 'oculto',
    preco: validacao, personalizavel: ['Cores'], midias: [], ref, jaImpresso,
  };
}

const CADASTRO: Produto[] = [
  // Ja impressos para clientes, projeto nosso.
  nosso({
    slug: 'letreiro-letra-caixa-acm', nome: 'Letreiro de letra caixa com ACM', categoria: 'letreiros', destaque: true, jaImpresso: true,
    resumo: 'Fachada com letras em relevo e chapa de ACM encaixada, feita sob medida.',
    descricao: 'Cada letra é impressa como uma moldura com bolsão para a chapa de ACM, montada em peças que cabem na impressora. Desenhamos a partir do seu arquivo (AI, PDF ou SVG), calculamos peças, filamento e tempo, e entregamos pronto para fixar.',
    personalizavel: ['Texto ou logo', 'Altura das letras', 'Profundidade', 'Cor do filamento', 'Chapa de ACM'],
    personalizar: { href: '/editor', rotulo: 'Montar no editor' },
  }),
  nosso({
    slug: 'letra-moldura-acm', nome: 'Letra decorativa com moldura de ACM', categoria: 'letreiros', jaImpresso: true,
    resumo: 'Uma letra grande com moldura impressa e face em ACM.',
    descricao: 'Letra avulsa para decoração, vitrine ou evento: a moldura sai da impressora e a face é uma chapa de ACM cortada na medida.',
    personalizavel: ['Letra', 'Tamanho', 'Cor da moldura'],
    personalizar: { href: '/editor', rotulo: 'Montar no editor' },
  }),
  nosso({
    slug: 'placa-personalizada', nome: 'Placa personalizada', categoria: 'placas', jaImpresso: true, destaque: true,
    resumo: 'Placa com texto e medidas sob medida, em peças prontas para imprimir.',
    descricao: 'Placa de sinalização ou decoração com o seu texto, medidas e cores. Dividimos em peças quando passa do tamanho da mesa da impressora.',
    personalizavel: ['Texto', 'Medidas', 'Cores'],
    personalizar: { href: '/placas', rotulo: 'Montar a placa' },
  }),
  nosso({
    slug: 'placa-com-marca', nome: 'Placa com a sua marca', categoria: 'placas', jaImpresso: true,
    resumo: 'Sua logo em relevo numa placa, para balcão, porta ou parede.',
    descricao: 'Enviamos a sua logo para o 3D: base, logo e texto em cores diferentes, com pé de mesa ou furos para parafusar.',
    personalizavel: ['Logo', 'Texto', 'Cores', 'Pé ou furos'],
    personalizar: { href: '/moldes/logo-camadas', rotulo: 'Personalizar agora' },
  }),

  // Dos geradores (o cliente monta e baixa, ou pede para nos imprimirmos).
  doGerador('chaveiro-nome', 'Chaveiro com nome', 'personalizados', 'Nome em camadas e cores, com argola.', 'Chaveiro com o nome em relevo sobre uma base contornada, em duas ou mais cores. Ótimo para lembrancinha e brinde em quantidade.', 'chaveiro-nome', ['Nome', 'Fonte', 'Cores', 'Tamanho'], true),
  doGerador('letreiro-nome-camadas', 'Letreiro de nome em camadas', 'decoracao', 'Palavra ou nome com base e topo em cores diferentes.', 'Letreiro de mesa ou parede com o nome que você quiser, em camadas coloridas.', 'palavra-camadas', ['Texto', 'Fonte', 'Cores', 'Largura'], true),
  doGerador('arroba-social', '@ da sua rede social', 'personalizados', 'O seu @ em 3D, em camadas, para a vitrine ou o balcão.', 'O @ da loja ou do perfil em camadas coloridas, para divulgar nas redes e no ponto de venda.', 'social-camadas', ['@', 'Fonte', 'Cores']),
  doGerador('placa-qr-wifi', 'Placa de QR para Wi-Fi', 'placas', 'O cliente aponta a câmera e entra na rede.', 'Placa com QR code que conecta direto ao Wi-Fi, com texto e pés de mesa.', 'placa-qr-wifi', ['Rede e senha', 'Texto', 'Cores']),
  doGerador('placa-pix', 'Placa de Pix', 'placas', 'QR do Pix para o caixa, com a chave escrita.', 'Placa com o QR do Pix estático (com ou sem valor), a chave escrita embaixo e o seu logo.', 'placa-pix-logo', ['Chave Pix', 'Logo', 'Cores']),
  doGerador('placa-avaliacao-google', 'Placa de avaliação no Google', 'placas', 'Leva o cliente direto à página de avaliação.', 'Placa com QR para a avaliação da sua empresa, com estrelas, título e pés de mesa.', 'placa-google-review', ['Link', 'Textos', 'Cores']),
  doGerador('lista-qr', 'Display com vários QR', 'placas', 'Site, Wi-Fi, WhatsApp, redes e Pix numa peça só.', 'Display em arco com até nove QR, cada um com o seu ícone, e suporte para ficar de pé.', 'lista-qr-vertical', ['QR codes', 'Ícones', 'Cores']),
  doGerador('letra-grande-nome', 'Letra grande com nome', 'decoracao', 'Inicial grande com o nome por cima.', 'Letra de destaque para quarto, festa ou presente, com o nome em outra cor.', 'letra-grande', ['Letra', 'Nome', 'Estilo', 'Cores']),
  doGerador('luminaria-letra', 'Luminária de letra', 'decoracao', 'Letra iluminada por dentro, com frente translúcida.', 'Luminária em forma de letra, com espaço para fita de LED e frente que difunde a luz.', 'luminaria-letra', ['Letra', 'Tamanho', 'Cores']),
  doGerador('topo-de-bolo', 'Topo de bolo', 'cozinha', 'Nome e idade para o bolo da festa.', 'Topo de bolo com o nome e o tema da festa, com hastes para espetar.', 'topo-bolo', ['Texto', 'Fonte', 'Cor']),
  doGerador('cortador-biscoito', 'Cortador de biscoito', 'cozinha', 'Do seu desenho para o cortador.', 'Cortador de biscoito ou massa a partir de um desenho ou imagem, com a borda de corte e o pegador.', 'cortador-biscoito', ['Desenho', 'Tamanho']),
  doGerador('carimbo-doce', 'Carimbo para doces', 'cozinha', 'Sua marca carimbada no doce.', 'Carimbo com o seu logo ou desenho para marcar doces, biscoitos e massinhas.', 'carimbo-imagem', ['Imagem', 'Tamanho']),
  doGerador('plaquinha-pet', 'Plaquinha de pet', 'personalizados', 'Nome do pet na frente e telefone no verso.', 'Plaquinha para coleira em vários formatos, com frente e verso.', 'plaquinha-pet', ['Nome', 'Telefone', 'Formato', 'Cores']),
  doGerador('cartao-visita-3d', 'Cartão de visita em 3D', 'personalizados', 'Cartão impresso com QR e porta-cartões.', 'Cartão de visita com nome, contatos e QR em relevo, e porta-cartões com o seu texto.', 'cartao-visita', ['Textos', 'QR', 'Cores']),
  doGerador('porta-canetas', 'Porta-canetas sob medida', 'utilidades', 'Organizador em grade com o seu nome.', 'Porta-canetas com o número de divisões, altura e nome que você escolher.', 'porta-canetas-grade', ['Divisões', 'Altura', 'Nome']),

  // Nossos com origem a confirmar (ocultos ate o usuario validar).
  { ...nosso({ slug: 'mapa-3d-cidade', nome: 'Mapa 3D da cidade', categoria: 'decoracao', jaImpresso: true, resumo: 'Ruas, rios e o nome da cidade em relevo, em camadas coloridas.', descricao: 'Mapa da sua cidade em camadas: base, ruas, água, trilhas e o nome.', personalizavel: ['Cidade', 'Recorte', 'Cores'] }), licenca: 'a-verificar', visibilidade: 'oculto', ref: 'N01' },

  // Terceiros (MakerWorld e afins): ocultos ate a licenca de venda ser confirmada.
  deTerceiro('porta-medalhas-corrida', 'Porta-medalhas de corrida', 'decoracao', 'Suporte de parede para medalhas, com nome do atleta.', 'T01', true),
  deTerceiro('macarrao-brinquedo', 'Macarrão de brinquedo', 'brinquedos', 'Caixinha, macarrão, tigela e garfo de brinquedo.', 'T02', true),
  deTerceiro('tomate-fidget', 'Tomate fidget', 'brinquedos', 'Tomate que gira, para mexer nas mãos.', 'T03', true),
  deTerceiro('frigideira-brinquedo', 'Frigideira e espátula', 'brinquedos', 'Frigideira com espátula de brinquedo.', 'T04', true),
  deTerceiro('ovo-surpresa', 'Ovo com casca', 'brinquedos', 'Ovo de brinquedo que abre.', 'T05', true),
  deTerceiro('bolo-brinquedo', 'Bolo, suporte e espátula', 'brinquedos', 'Bolo de aniversário de brinquedo com fatia.', 'T06', true),
  deTerceiro('pizza-pixel', 'Fatias de pizza pixel', 'brinquedos', 'Fatias de pizza em estilo pixel.', 'T07', true),
  deTerceiro('caixa-pizza', 'Caixa de pizza', 'brinquedos', 'Caixinha de pizza de brinquedo.', 'T08', true),
  deTerceiro('coxa-pixel', 'Coxa de frango pixel fidget', 'brinquedos', 'Coxinha em estilo pixel, articulada.', 'T09', true),
  deTerceiro('banana-fidget', 'Banana fidget', 'brinquedos', 'Banana articulada multicor.', 'T10', true),
  deTerceiro('estrela-fidget', 'Estrela fidget', 'brinquedos', 'Estrela de dez pontas para girar.', 'T11', true),
  deTerceiro('polvo-articulado', 'Polvo articulado', 'brinquedos', 'Polvo fofo com tentáculos articulados.', 'T12', true),
  deTerceiro('ovo-dragao', 'Ovo de dragão fidget', 'brinquedos', 'Ovo de dragão que torce.', 'T13'),
  deTerceiro('elos-fidget', 'Elos fidget', 'brinquedos', 'Elos que torcem e encaixam.', 'T14'),
  deTerceiro('tubarao', 'Tubarão', 'brinquedos', 'Tubarão articulado de uma cor.', 'T15'),
  deTerceiro('caixa-kettlebell', 'Caixinha kettlebell', 'utilidades', 'Caixinha de rosca em forma de kettlebell.', 'T16', true),
  deTerceiro('xicara', 'Xícara decorativa', 'decoracao', 'Xícara de enfeite.', 'T17', true),
  deTerceiro('suporte-fone', 'Suporte de fone', 'utilidades', 'Suporte de mesa para headphone.', 'T18'),
  deTerceiro('suporte-celular', 'Suporte de celular', 'utilidades', 'Suporte de mesa para celular.', 'T19'),
  deTerceiro('porta-canetas-canelado', 'Porta-canetas canelado', 'utilidades', 'Porta-canetas com acabamento canelado.', 'T20'),
  deTerceiro('mosquetao', 'Mosquetão utilitário', 'utilidades', 'Mosquetão para chaves e mochila.', 'T21'),
  deTerceiro('corredor', 'Figura de corredor', 'decoracao', 'Silhueta de corredor para troféu ou enfeite.', 'T22'),
];

/** Cadastro com as fotos de `public/marketplace/<slug>/` (ver scripts/fotos-marketplace.mts). */
export const PRODUTOS: Produto[] = CADASTRO.map((p) => (FOTOS[p.slug]?.length ? { ...p, midias: FOTOS[p.slug]! } : p));
