/**
 * Cadastro da loja, por secao. Os nossos vem do que ja imprimimos e dos geradores; os de
 * terceiros ficam ocultos ate a licenca de venda ser confirmada. Textos escritos por nos;
 * nenhum arquivo, nome de arquivo, foto, preco ou cliente aqui (o repo e publico): `ref` e
 * uma referencia opaca, e a tabela ref -> arquivo fica fora do repo, no estado do projeto.
 * Nada e anunciado como brinquedo (restricao legal).
 */
import { FOTOS } from './fotos';
import type { Produto, Secao } from './tipos';

const validacao = { status: 'validacao' } as const;

/** Produto nosso, publico, com preco em validacao. */
function nosso(p: Pick<Produto, 'slug' | 'nome' | 'resumo' | 'descricao' | 'secao' | 'tipo' | 'personalizavel'> & Partial<Produto>): Produto {
  return { origem: 'nosso', licenca: 'propria', visibilidade: 'publico', preco: validacao, midias: [], ...p };
}

/** Feito por um gerador nosso: o botao "Personalizar" leva direto a ele. */
function doGerador(slug: string, nome: string, secao: Secao, tipo: string, resumo: string, descricao: string, gerador: string, personalizavel: string[], destaque = false): Produto {
  return nosso({ slug, nome, secao, tipo, resumo, descricao, personalizavel, destaque, personalizar: { href: `/moldes/${gerador}`, rotulo: 'Personalizar agora' } });
}

/** Modelo de terceiro: cadastrado, oculto, licenca a verificar. */
function deTerceiro(slug: string, nome: string, secao: Secao, tipo: string, resumo: string, ref: string, jaImpresso = false): Produto {
  return {
    slug, nome, secao, tipo, resumo, descricao: resumo, origem: 'terceiros', licenca: 'a-verificar', visibilidade: 'oculto',
    preco: validacao, personalizavel: ['Cores'], midias: [], ref, jaImpresso,
  };
}

const CADASTRO: Produto[] = [
  // ---- Casa ----
  doGerador('luminaria-letra', 'Luminária de letra', 'casa', 'Luminária', 'Letra iluminada por dentro, com frente translúcida.', 'Luminária em forma de letra, com espaço para fita de LED e frente que difunde a luz.', 'luminaria-letra', ['Letra', 'Tamanho', 'Cores'], true),
  doGerador('porta-retrato-suspenso', 'Porta-retrato suspenso', 'casa', 'Porta-retrato', 'A foto parece flutuar dentro da moldura.', 'Porta-retrato com a foto presa no meio da moldura, de pé na mesa ou na estante.', 'porta-retrato', ['Tamanho da foto', 'Moldura', 'Cores'], true),
  doGerador('cumbuca', 'Cumbuca decorativa', 'casa', 'Decoração', 'Tigela com o seu desenho no contorno.', 'Cumbuca para chaves, joias ou miudezas, com o contorno que você escolher.', 'cumbuca', ['Desenho', 'Tamanho', 'Cor']),
  doGerador('quadro-tecido', 'Quadro de tecido', 'casa', 'Quadro', 'O desenho flutua sobre um tecido fino na moldura.', 'Quadro com o desenho impresso sobre tule ou organza preso na moldura, com pé e ímãs.', 'quadro-tecido', ['Texto ou desenho', 'Tamanho', 'Cores']),
  doGerador('string-art', 'String art', 'casa', 'Decoração', 'Coração ou nome com linhas esticadas.', 'Quadro de string art já com os pinos impressos: é só passar a linha.', 'string-art', ['Forma', 'Nome', 'Cores']),
  doGerador('suporte-foto-nome', 'Suporte de foto com nome', 'casa', 'Porta-retrato', 'Base com nome que segura uma foto impressa.', 'Base com o nome em relevo e uma fenda que segura a foto em pé.', 'suporte-foto', ['Nome', 'Fonte', 'Cores']),
  doGerador('porta-canetas', 'Porta-canetas sob medida', 'casa', 'Organizador', 'Organizador em grade com o seu nome.', 'Porta-canetas com o número de divisões, altura e nome que você escolher.', 'porta-canetas-grade', ['Divisões', 'Altura', 'Nome']),
  deTerceiro('suporte-fone', 'Suporte de fone', 'casa', 'Organizador', 'Suporte de mesa para headphone.', 'T18'),
  deTerceiro('suporte-celular', 'Suporte de celular', 'casa', 'Organizador', 'Suporte de mesa para celular.', 'T19'),
  deTerceiro('porta-canetas-canelado', 'Porta-canetas canelado', 'casa', 'Organizador', 'Porta-canetas com acabamento canelado.', 'T20'),
  deTerceiro('mosquetao', 'Mosquetão utilitário', 'casa', 'Utilidade', 'Mosquetão para chaves e mochila.', 'T21'),
  deTerceiro('xicara', 'Xícara decorativa', 'casa', 'Decoração', 'Xícara de enfeite.', 'T17', true),

  // ---- Colecionaveis ----
  doGerador('placa-line-art', 'Line art com base', 'colecionaveis', 'Peça de exposição', 'O seu desenho em traço, de pé numa base.', 'Desenho em line art recortado e encaixado numa base, para estante ou mesa.', 'placa-com-base', ['Desenho', 'Tamanho', 'Cores'], true),
  doGerador('mini-microfone', 'Mini-microfone', 'colecionaveis', 'Miniatura', 'Miniatura de microfone com o seu nome.', 'Miniatura de microfone de estúdio, com o nome ou logo na base.', 'mini-microfone', ['Nome', 'Cores']),
  { ...nosso({ slug: 'mapa-3d-cidade', nome: 'Mapa 3D da cidade', secao: 'colecionaveis', tipo: 'Peça de exposição', resumo: 'Ruas, rios e o nome da cidade em relevo, em camadas coloridas.', descricao: 'Mapa da sua cidade em camadas: base, ruas, água, trilhas e o nome.', personalizavel: ['Cidade', 'Recorte', 'Cores'] }), licenca: 'a-verificar', visibilidade: 'oculto', ref: 'N01' },
  deTerceiro('corredor', 'Figura de corredor', 'colecionaveis', 'Figura', 'Silhueta de corredor para troféu ou enfeite.', 'T22'),
  deTerceiro('porta-medalhas-corrida', 'Porta-medalhas de corrida', 'colecionaveis', 'Expositor', 'Suporte de parede para medalhas, com nome do atleta.', 'T01', true),
  deTerceiro('caixa-kettlebell', 'Caixinha kettlebell', 'colecionaveis', 'Miniatura', 'Caixinha de rosca em forma de kettlebell.', 'T16', true),

  // ---- Para sua empresa ----
  nosso({
    slug: 'letreiro-letra-caixa-acm', nome: 'Letreiro de letra caixa com ACM', secao: 'empresa', tipo: 'Letreiro', destaque: true, jaImpresso: true,
    resumo: 'Fachada com letras em relevo e chapa de ACM encaixada, feita sob medida.',
    descricao: 'Cada letra é impressa como uma moldura com bolsão para a chapa de ACM, montada em peças que cabem na impressora. Desenhamos a partir do seu arquivo (AI, PDF ou SVG), calculamos peças, filamento e tempo, e entregamos pronto para fixar.',
    personalizavel: ['Texto ou logo', 'Altura das letras', 'Profundidade', 'Cor do filamento', 'Chapa de ACM'],
    personalizar: { href: '/editor', rotulo: 'Montar no editor' },
  }),
  nosso({
    slug: 'letra-moldura-acm', nome: 'Letra com moldura de ACM', secao: 'empresa', tipo: 'Letreiro',
    resumo: 'Uma letra grande com moldura impressa e face em ACM.',
    descricao: 'Letra avulsa para vitrine, fachada ou evento: a moldura sai da impressora e a face é uma chapa de ACM cortada na medida.',
    personalizavel: ['Letra', 'Tamanho', 'Cor da moldura'],
    personalizar: { href: '/editor', rotulo: 'Montar no editor' },
  }),
  doGerador('arroba-social', '@ da sua rede social', 'empresa', 'Display', 'O seu @ em 3D, para a vitrine ou o balcão.', 'O @ da loja ou do perfil em camadas coloridas, para divulgar nas redes e no ponto de venda.', 'social-camadas', ['@', 'Fonte', 'Cores'], true),
  nosso({
    slug: 'placa-com-marca', nome: 'Placa com a sua marca', secao: 'empresa', tipo: 'Placa', destaque: true,
    resumo: 'Sua logo em relevo numa placa, para balcão, porta ou parede.',
    descricao: 'Passamos a sua logo para o 3D: base, logo e texto em cores diferentes, com pé de mesa ou furos para parafusar.',
    personalizavel: ['Logo', 'Texto', 'Cores', 'Pé ou furos'],
    personalizar: { href: '/moldes/logo-camadas', rotulo: 'Personalizar agora' },
  }),
  nosso({
    slug: 'placa-personalizada', nome: 'Placa de sinalização', secao: 'empresa', tipo: 'Placa',
    resumo: 'Placa com texto e medidas sob medida, em peças prontas para imprimir.',
    descricao: 'Placa de sinalização com o seu texto, medidas e cores. Dividimos em peças quando passa do tamanho da mesa da impressora.',
    personalizavel: ['Texto', 'Medidas', 'Cores'],
    personalizar: { href: '/placas', rotulo: 'Montar a placa' },
  }),
  doGerador('placa-qr-wifi', 'Placa de QR para Wi-Fi', 'empresa', 'QR code', 'O cliente aponta a câmera e entra na rede.', 'Placa com QR code que conecta direto ao Wi-Fi, com texto e pés de mesa.', 'placa-qr-wifi', ['Rede e senha', 'Texto', 'Cores']),
  doGerador('placa-pix', 'Placa de Pix', 'empresa', 'QR code', 'QR do Pix para o caixa, com a chave escrita.', 'Placa com o QR do Pix estático (com ou sem valor), a chave escrita embaixo e o seu logo.', 'placa-pix-logo', ['Chave Pix', 'Logo', 'Cores']),
  doGerador('placa-avaliacao-google', 'Placa de avaliação no Google', 'empresa', 'QR code', 'Leva o cliente direto à página de avaliação.', 'Placa com QR para a avaliação da sua empresa, com estrelas, título e pés de mesa.', 'placa-google-review', ['Link', 'Textos', 'Cores']),
  doGerador('lista-qr', 'Display com vários QR', 'empresa', 'QR code', 'Site, Wi-Fi, WhatsApp, redes e Pix numa peça só.', 'Display em arco com até nove QR, cada um com o seu ícone, e suporte para ficar de pé.', 'lista-qr-vertical', ['QR codes', 'Ícones', 'Cores']),
  doGerador('cartao-visita-3d', 'Cartão de visita em 3D', 'empresa', 'Cartão', 'Cartão impresso com QR e porta-cartões.', 'Cartão de visita com nome, contatos e QR em relevo, e porta-cartões com o seu texto.', 'cartao-visita', ['Textos', 'QR', 'Cores']),

  // ---- Presentes e festas ----
  doGerador('chaveiro-nome', 'Chaveiro com nome', 'presentes', 'Chaveiro', 'Nome em camadas e cores, com argola.', 'Chaveiro com o nome em relevo sobre uma base contornada, em duas ou mais cores. Ótimo para lembrancinha e brinde em quantidade.', 'chaveiro-nome', ['Nome', 'Fonte', 'Cores', 'Tamanho'], true),
  doGerador('letreiro-nome-camadas', 'Letreiro de nome em camadas', 'presentes', 'Letreiro', 'Palavra ou nome com base e topo em cores diferentes.', 'Letreiro de mesa ou parede com o nome que você quiser, em camadas coloridas.', 'palavra-camadas', ['Texto', 'Fonte', 'Cores', 'Largura'], true),
  doGerador('letra-grande-nome', 'Letra grande com nome', 'presentes', 'Decoração', 'Inicial grande com o nome por cima.', 'Letra de destaque para quarto, festa ou presente, com o nome em outra cor.', 'letra-grande', ['Letra', 'Nome', 'Estilo', 'Cores']),
  doGerador('topo-de-bolo', 'Topo de bolo', 'presentes', 'Festa', 'Nome e idade para o bolo da festa.', 'Topo de bolo com o nome e o tema da festa, com hastes para espetar.', 'topo-bolo', ['Texto', 'Fonte', 'Cor']),
  doGerador('rosa-com-nome', 'Rosa com nome', 'presentes', 'Presente', 'Rosa em camadas com o nome no caule.', 'Rosa decorativa com o nome escrito, para presentear sem murchar.', 'rosa-nome', ['Nome', 'Cores']),
  doGerador('trofeu', 'Troféu personalizado', 'presentes', 'Festa', 'Troféu com imagem e texto para premiar.', 'Troféu com a imagem e o texto do seu evento, campeonato ou homenagem.', 'trofeu', ['Imagem', 'Texto', 'Cores']),
  doGerador('plaquinha-pet', 'Plaquinha de pet', 'presentes', 'Pet', 'Nome do pet na frente e telefone no verso.', 'Plaquinha para coleira em vários formatos, com frente e verso.', 'plaquinha-pet', ['Nome', 'Telefone', 'Formato', 'Cores']),
  doGerador('cortador-biscoito', 'Cortador de biscoito', 'presentes', 'Confeitaria', 'Do seu desenho para o cortador.', 'Cortador de biscoito ou massa a partir de um desenho ou imagem, com a borda de corte e o pegador.', 'cortador-biscoito', ['Desenho', 'Tamanho']),
  doGerador('carimbo-doce', 'Carimbo para doces', 'presentes', 'Confeitaria', 'A sua marca carimbada no doce.', 'Carimbo com o seu logo ou desenho para marcar doces e biscoitos.', 'carimbo-imagem', ['Imagem', 'Tamanho']),
  { ...doGerador('enfeite-floco-neve', 'Enfeite floco de neve com nome', 'presentes', 'Enfeite de Natal', 'Floco de neve com o nome no meio, para a árvore.', 'Enfeite de Natal em forma de floco de neve com o nome no centro, em duas cores. Dá para fazer vários nomes numa impressão só.', 'floco-neve', ['Nome', 'Fonte', 'Tamanho', 'Cores'], true), campanha: 'natal' },

  // ---- Sensoriais (terceiros; ocultos ate a licenca de cada um) ----
  deTerceiro('tomate-fidget', 'Tomate de girar', 'sensoriais', 'Para girar', 'Tomate que gira, para mexer nas mãos.', 'T03', true),
  deTerceiro('banana-fidget', 'Banana articulada', 'sensoriais', 'Articulado', 'Banana articulada multicor.', 'T10', true),
  deTerceiro('estrela-fidget', 'Estrela de girar', 'sensoriais', 'Para girar', 'Estrela de dez pontas para girar.', 'T11', true),
  deTerceiro('coxa-pixel', 'Coxinha pixel articulada', 'sensoriais', 'Articulado', 'Coxinha em estilo pixel, articulada.', 'T09', true),
  deTerceiro('elos-fidget', 'Elos de torcer', 'sensoriais', 'Para torcer', 'Elos que torcem e encaixam.', 'T14'),
  deTerceiro('ovo-dragao', 'Ovo de dragão de torcer', 'sensoriais', 'Para torcer', 'Ovo de dragão que torce.', 'T13'),
  deTerceiro('polvo-articulado', 'Polvo articulado', 'sensoriais', 'Articulado', 'Polvo com tentáculos articulados.', 'T12', true),
  deTerceiro('tubarao', 'Tubarão articulado', 'sensoriais', 'Articulado', 'Tubarão articulado de uma cor.', 'T15'),
  deTerceiro('macarrao-miniatura', 'Macarrão em miniatura', 'sensoriais', 'Miniatura', 'Caixinha, macarrão, tigela e garfo em miniatura.', 'T02', true),
  deTerceiro('frigideira-miniatura', 'Frigideira e espátula em miniatura', 'sensoriais', 'Miniatura', 'Frigideira com espátula em miniatura.', 'T04', true),
  deTerceiro('ovo-com-casca', 'Ovo com casca', 'sensoriais', 'Miniatura', 'Ovo que abre, com a casca.', 'T05', true),
  deTerceiro('bolo-miniatura', 'Bolo em miniatura', 'sensoriais', 'Miniatura', 'Bolo de aniversário em miniatura, com fatia.', 'T06', true),
  deTerceiro('pizza-pixel', 'Fatias de pizza pixel', 'sensoriais', 'Miniatura', 'Fatias de pizza em estilo pixel.', 'T07', true),
  deTerceiro('caixa-pizza', 'Caixa de pizza em miniatura', 'sensoriais', 'Miniatura', 'Caixinha de pizza em miniatura.', 'T08', true),
];

/** Cadastro com as fotos de `public/marketplace/<slug>/` (ver scripts/fotos-marketplace.mts). */
export const PRODUTOS: Produto[] = CADASTRO.map((p) => (FOTOS[p.slug]?.length ? { ...p, midias: FOTOS[p.slug]! } : p));
