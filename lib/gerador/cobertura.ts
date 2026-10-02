/**
 * Cobertura dos 117 modelos da referencia (docs/mafagrafos-117.md): quem faz, qual
 * receita cobre, status e o que falta para paridade. `scripts/cobertura.mts` gera
 * docs/cobertura-117.md daqui; `verificar-gerador` confere slugs e receitas.
 */
export type Dono = 'claude' | 'chatgpt';
export type Status = 'pronto' | 'parcial' | 'pendente';

export interface Cobertura {
  slug: string;
  nome: string;
  dono: Dono;
  /** Id da receita (lib/gerador/receitas) que cobre; '' sem receita. */
  receita: string;
  status: Status;
  /** Onda do plano em que entra (0 = ja coberto). */
  onda: 0 | 1 | 2 | 3;
  falta: string;
}

type Linha = [slug: string, nome: string, dono: Dono, receita: string, status: Status, onda: 0 | 1 | 2 | 3, falta: string];

const C: Dono = 'claude', G: Dono = 'chatgpt';

const LINHAS: Linha[] = [
  ['hanging-photo-holder', 'Porta-Retrato Suspenso', C, '', 'pendente', 3, 'moldura em 2 partes com pinos, 3 tamanhos, design em relevo'],
  ['play-douh-stamps', 'Carimbos de Massinha', C, '', 'pendente', 3, 'discos dupla face, cilindro com tampa rosqueada'],
  ['snowflake-ornament', 'Enfeite Floco de Neve', C, 'floco-neve', 'parcial', 2, 'floco desenhado por nós; falta trocar pelo desenho do usuário'],
  ['mini-microphone', 'Mini-Microfone', C, '', 'pendente', 3, 'corpo, cabeça texturizada e placas laterais com arte'],
  ['can-opener-nfc', 'Gerador de Abridor de Latas (NFC)', C, '', 'pendente', 2, 'abertura funcional + bolsão NFC'],
  ['nfc-keychain-generator', 'Gerador de Chaveiro NFC', C, '', 'pendente', 2, 'bolsão NFC com pausa, borda opcional'],
  ['keychain-generator', 'Gerador de Chaveiro', C, 'chaveiro-desenho', 'parcial', 2, 'imagem PNG/JPG; modo face para baixo'],
  ['design-pen-holder', 'Gerador de Porta-Canetas', C, '', 'pendente', 3, 'base paramétrica + peça de design separada'],
  ['filament-spool', 'Chaveiro Carretel de Filamento com NFC', C, '', 'pendente', 2, 'carretel + base NFC com encaixe e tolerância'],
  ['fabric-floating-sign', 'Quadro de Tecido', C, '', 'pendente', 3, '3 partes, pausa para tecido, ímãs'],
  ['fabric-business-card', 'Cartão de Visita com Tecido', G, '', 'pendente', 2, 'cartão em camadas com tecido, NFC e QR'],
  ['regular-business-card', 'Cartão de Visita', G, '', 'pendente', 2, 'texto + QR, face para cima/baixo'],
  ['profession', 'Placas Profissionais', G, '', 'parcial', 1, 'editor de placa existe; falta receita com símbolo, nome e base que encaixa'],
  ['lash-holder', 'Porta-Pente para Cílios', C, '', 'pendente', 3, 'cilindro com tampa rosqueada e textura/SVG'],
  ['big-letter-lamp', 'Luminária Letra Grande com Nome', C, '', 'pendente', 3, 'letra oca com canal de LED e tampa'],
  ['overlay-keychain', 'Gerador de Chaveiro com Sobreposição', C, 'chaveiro-desenho', 'parcial', 2, 'texto como sobreposição; imagem PNG/JPG'],
  ['stripes-plaques', 'Placa de Listras com Base', C, '', 'pendente', 2, 'arte em listras com base de apoio'],
  ['line-art-plaque', 'Placa de Line Art', C, '', 'pendente', 2, 'line art (imagem) com base em pé, conectar traços'],
  ['cake-topper-generator', 'Gerador de Topo de Bolo', C, 'topo-bolo', 'parcial', 2, 'imagem PNG/JPG'],
  ['text-image-trophy', 'Troféu Imagem + Texto', C, '', 'pendente', 2, 'base, topo, imagem e placa com texto'],
  ['rounded-circle-stamp', 'Carimbo Circular de Imagem', C, '', 'pendente', 2, 'carimbo redondo espelhado com cabo, até 6'],
  ['nail-salon-display', 'Display para Salão de Unhas', C, '', 'pendente', 3, 'mão com logo e 2 linhas, decoração da base'],
  ['text-brigadeiro-stamp', 'Carimbo de Letras/Números', C, '', 'pendente', 2, 'carimbo de doce com caractere, até 9'],
  ['social-handle-simple-lamp', '@social - Luminária de LED', C, '', 'pendente', 3, 'base com canal de LED e furo de cabo'],
  ['logo-text-keychain', 'Chaveiro com Nome e Logo', C, 'chaveiro-logo-nome', 'parcial', 2, 'logo em PNG/JPG'],
  ['scale-dome-ejector', 'Ejetor Arredondado com Escala de Forma', C, '', 'pendente', 2, 'forma em degraus de escala (cúpula)'],
  ['rounded-dome-ejector', 'Ejetor de Cúpula Arredondada', C, '', 'pendente', 2, 'molde + ejetor de cúpula'],
  ['vertical-qr-code-list', 'Lista Vertical de Códigos QR', G, '', 'pendente', 2, 'QR por tipo (link, WiFi, PIX...) em coluna'],
  ['layered-vertical-qr-code-list', 'Lista Vertical em Camadas de Códigos QR', G, '', 'pendente', 2, 'QRs em camadas com logo e contato'],
  ['horizontal-qr-code-list', 'Lista Horizontal de Códigos QR', G, '', 'pendente', 2, 'QR por tipo em linha'],
  ['google-review-qr-code', 'Google Review - Placa de QRCode', G, '', 'pendente', 2, 'QR de avaliação Google'],
  ['wi-fi-qr-code', 'Placa de QRCode WiFi', G, '', 'pendente', 2, 'QR WiFi com suporte/furo'],
  ['social-qr-code', 'Social - Placa de QRCode', G, '', 'pendente', 2, 'vários QR de perfis'],
  ['text-qr-code-plaque', 'Placa de QRCode com Texto', G, '', 'pendente', 2, 'QR + texto acima/abaixo'],
  ['whats-app', 'Placa de QRCode WhatsApp', G, '', 'pendente', 2, 'QR de WhatsApp'],
  ['logo-qr-code-plaque', 'Placa de QRCode com Logo', G, '', 'pendente', 2, 'QR com logo no centro'],
  ['stick-stand', 'Suporte para Palitos', C, 'suporte-palitos', 'pronto', 0, 'aletas em degraus (não curvas)'],
  ['cake-stand', 'Suporte de Bolo', C, '', 'pendente', 3, 'prato com ondulações e pé'],
  ['stickers-box', 'Caixa de Figurinhas', C, '', 'pendente', 3, 'caixa, suporte removível e tampa'],
  ['photo-holder', 'Suporte de Foto com Texto', C, 'suporte-foto', 'pronto', 0, ''],
  ['circle-glitter-cake-topper', 'Topo de Bolo Circular com Glitter', C, 'topo-bolo-circular', 'parcial', 2, 'desenho do glitter na janela'],
  ['rectangle-cutters', 'Cortadores de Retângulos em Grade', C, '', 'pendente', 2, 'grade de retângulos com abas e marca'],
  ['small-texture-lipstick-case', 'Estojo de Batom - Ícone em Mosaico', C, '', 'pendente', 3, 'rosca + textura em mosaico'],
  ['large-texture-lipstick-case', 'Estojo de Batom - Textura Grande', C, '', 'pendente', 3, 'rosca + textura de imagem'],
  ['name-lipstick-case', 'Estojo de Batom - Nome', C, '', 'pendente', 3, 'rosca + nome'],
  ['plain-lipstick-case', 'Estojo de Batom', C, '', 'pendente', 3, 'corpo e tampa rosqueada'],
  ['big-word-letreiro', 'Letreiro com Sobreposição de Palavras', C, 'letreiro-sobreposto', 'parcial', 3, 'adornos coração/arabesco no nome'],
  ['tiled-texture-roller', 'Rolo de Textura - Mosaico', C, '', 'pendente', 3, 'cilindro com relevo em mosaico'],
  ['large-texture-roller', 'Rolo de Textura - Imagem Grande', C, '', 'pendente', 3, 'cilindro com imagem envolvida'],
  ['can-opener', 'Gerador de Abridor de Latas', C, '', 'pendente', 2, 'abertura funcional + SVG + argola'],
  ['rose-with-name', 'Rosa com Nome', C, '', 'pendente', 3, 'rosa orgânica com nome, até 9'],
  ['mirror-text-keychain', 'Chaveiro com Espelho e Texto', C, '', 'pendente', 2, 'base para espelho + texto em arco'],
  ['rose-text-keychain', 'Chaveiro de Rosa com Texto', C, '', 'pendente', 2, 'rosa + texto em arco'],
  ['rose-scrunchie', 'Rosa para Scrunchie', C, '', 'pendente', 2, 'rosa + texto em arco + furo'],
  ['family-pendant', 'Pingente de Nomes da Família', C, 'pingente-familia', 'pronto', 0, ''],
  ['harry-potter-bookmark', 'Marcador de Página do Castelo', C, 'marcador-pagina', 'parcial', 2, 'motivo do castelo é arte deles: usar SVG próprio'],
  ['geometric-name-side-bookmark', 'Marcador de Página Geométrico com Nome', C, 'marcador-pagina', 'pronto', 0, ''],
  ['elegant-grid-name-side-bookmark', 'Marcador Elegante com Nome', C, 'marcador-pagina', 'pronto', 0, ''],
  ['simple-pix-plaque', 'Placa PIX Simples', G, '', 'pendente', 2, 'QR PIX (BR Code) + título'],
  ['logo-pix-plaque', 'Placa PIX Logo', G, '', 'pendente', 2, 'QR PIX + logo'],
  ['text-pix-plaque', 'Placa PIX Texto', G, '', 'pendente', 2, 'QR PIX + 2 linhas'],
  ['big-letter-foreground-texture', 'Letra Grande - Textura', C, '', 'pendente', 3, 'letra + nome com textura SVG'],
  ['big-letter-sunken-name', 'Letra Grande - Nome Rebaixado', C, '', 'pendente', 3, 'letra com nome rebaixado'],
  ['big-letter-resin-casting', 'Letra Grande - Borda para Resina', C, '', 'pendente', 3, 'letra com bordas para resina'],
  ['big-letter-textured-background', 'Letra Grande - Fundo Texturizado', C, '', 'pendente', 3, 'letra + fundo texturizado'],
  ['raised-borders-coloring', 'Colorir com Bordas em Relevo', C, '', 'pendente', 2, 'imagem com bordas elevadas para pintar'],
  ['big-letter-floral-texture', 'Letra Grande Floral', C, '', 'pendente', 3, 'fundo floral em camadas'],
  ['big-letter-shell-eva', 'Letra Grande - Fundo de Material', C, '', 'pendente', 3, 'letra + fundo para EVA/feltro'],
  ['big-letter-sunken-sparkle', 'Letra Grande - Brilho', C, '', 'pendente', 3, 'letra com compartimento para glitter'],
  ['big-letter-name', 'Letra Grande - Nome', C, '', 'pendente', 3, 'letra + nome encaixado'],
  ['floral-name-side-bookmark', 'Marcador de Livro Floral com Nome', C, 'marcador-pagina', 'pronto', 0, ''],
  ['pet-name-oval-wave', 'Plaquinha de Pet Oval Ondulada', C, 'plaquinha-pet', 'pronto', 0, ''],
  ['pet-name-oval', 'Plaquinha de Pet Oval', C, 'plaquinha-pet', 'pronto', 0, ''],
  ['pet-name-fish', 'Plaquinha de Pet Peixinho', C, 'plaquinha-pet', 'pronto', 0, ''],
  ['pet-name-dog-bone', 'Plaquinha de Pet Ossinho', C, 'plaquinha-pet', 'pronto', 0, ''],
  ['generic-pet-name-tag', 'Plaquinha de Pet Qualquer Formato', C, 'plaquinha-pet', 'pronto', 0, ''],
  ['mold-stamp-text', 'Carimbo de Molde a partir de Texto', C, '', 'pendente', 2, 'molde de texto invertido com apoio de polegar'],
  ['mold-stamp-image', 'Carimbo de Molde a partir de Imagem', C, '', 'pendente', 2, 'molde de imagem invertido com apoio de polegar'],
  ['word-offset-3color-2lines-image', 'Letreiro de Palavra - 2 Linhas com Imagem - 3 Cores', C, 'palavra-camadas', 'parcial', 2, 'imagem PNG/JPG (hoje só SVG); mover linha'],
  ['word-offset-2lines-image', 'Letreiro 2 linhas, imagem, 2 cores', C, 'palavra-camadas', 'parcial', 2, 'imagem PNG/JPG (hoje só SVG); mover linha'],
  ['logo-offset-3colors', 'Placa multipart SVG, 3 camadas', C, 'logo-camadas', 'parcial', 2, 'imagem PNG/JPG'],
  ['logo-offset-2colors', 'Placa multipart SVG, 2 camadas', C, 'logo-camadas', 'parcial', 2, 'imagem PNG/JPG'],
  ['name-side-bookmark', 'Marcador com nome e imagem', C, 'marcador-pagina', 'parcial', 2, 'duas imagens (frente e verso)'],
  ['text-offset-keychain-3colors', 'Chaveiro de nome, 3 cores', C, 'chaveiro-nome', 'pronto', 0, ''],
  ['text-offset-keychain-2colors', 'Chaveiro de nome, 2 cores', C, 'chaveiro-nome', 'pronto', 0, ''],
  ['bowl-anything', 'Cumbuca a partir de imagem', C, '', 'pendente', 3, 'casca a partir de forma fechada'],
  ['word-heart-2colors', 'Palavra e coração, 2 camadas', C, 'palavra-camadas', 'pronto', 0, ''],
  ['2part-coloring-generator', 'Colorir em 2 partes', C, '', 'pendente', 2, 'base + topo de linhas que encaixa'],
  ['text-placement-helper', 'Texto com guia de posicionamento', C, 'texto-com-guia', 'pronto', 0, 'guia só corta na vertical'],
  ['image-to3d-resin-border', 'Imagem 3D com borda para resina', C, '', 'pendente', 2, 'bordas altas para resina'],
  ['image-multipart', 'Imagem multipartes', C, '', 'pendente', 2, 'peças por região de cor com folga'],
  ['carrot-name-keychain', 'Chaveiro cenoura', C, '', 'pendente', 2, 'forma temática própria + nome'],
  ['bunny-name-keychain', 'Chaveiro coelho', C, '', 'pendente', 2, 'forma temática própria + nome'],
  ['rectangle-name-keychain', 'Chaveiro retangular com nome', C, 'chaveiro-retangular', 'pronto', 0, ''],
  ['image-brigadeiro-stamp', 'Carimbo de brigadeiro com imagem', C, '', 'pendente', 2, 'carimbo de doce a partir de imagem'],
  ['image-puzzle', 'Quebra-cabeça de imagem', C, '', 'pendente', 2, 'peças de quebra-cabeça, moldura e suporte'],
  ['candy-mold-rounded', 'Ejetor arredondado de brigadeiro', C, '', 'pendente', 2, 'ejetor com borda arredondada'],
  ['candy-mold', 'Ejetor plano de brigadeiro', C, '', 'pendente', 2, 'ejetor plano'],
  ['square-nfc-keychain', 'Chaveiro NFC', C, '', 'pendente', 2, 'formas + rebaixo NFC 25 mm'],
  ['social-handle-offset-2color-qr-code', '@social, 2 cores + QR', G, '', 'pendente', 2, '@social em camadas + QR lateral'],
  ['cookie-cutter-generator', 'Cortador de biscoito', C, '', 'pendente', 2, 'parede do cortador a partir de SVG/imagem'],
  ['sunken-image-coloring-offset', 'Colorir afundado, offset', C, '', 'pendente', 2, 'imagem rebaixada com fundo em offset'],
  ['sunken-image-coloring', 'Colorir afundado, forma', C, '', 'pendente', 2, 'imagem rebaixada com bordas'],
  ['scratch-off-counter', 'Contador raspadinha', C, 'contador-raspadinha', 'pronto', 0, ''],
  ['sized-pen-holder', 'Porta-canetas paramétrico', C, 'porta-canetas-grade', 'pronto', 0, ''],
  ['string-art-heart-name-vertical-floating', 'String art, coração', C, '', 'pendente', 3, 'moldura com pinos e nome flutuante'],
  ['string-art-rectangle-name-radial', 'String art, retângulo', C, '', 'pendente', 3, 'moldura com pinos radial'],
  ['social-handle-string-art-floating', '@social string art', C, '', 'pendente', 3, 'moldura com texto suspenso'],
  ['separate-letters-offset-2color', 'Letras separadas, 2 cores', C, 'letras-separadas', 'pronto', 0, ''],
  ['separate-letters-offset-3color', 'Letras separadas, 3 cores', C, 'letras-separadas', 'pronto', 0, ''],
  ['social-handle-offset-3color', '@social, 3 cores', C, 'social-camadas', 'pronto', 0, ''],
  ['social-handle-offset-2color', '@social, 2 cores', C, 'social-camadas', 'pronto', 0, ''],
  ['full-name-keychain', 'Chaveiro com nome completo', C, 'chaveiro-retangular', 'pronto', 0, ''],
  ['social-handle-rectangle-3color', '@social retângulo, 3 cores', C, 'social-camadas', 'parcial', 3, 'textura na base retangular'],
  ['social-handle-rectangle-2color', '@social retângulo, 2 cores', C, 'social-camadas', 'parcial', 3, 'textura na base retangular'],
  ['word-offset-3color', 'Palavra, 3 camadas', C, 'palavra-camadas', 'pronto', 0, ''],
  ['word-offset-2color', 'Palavra, 2 camadas', C, 'palavra-camadas', 'pronto', 0, ''],
];

export const COBERTURA: Cobertura[] = LINHAS.map(([slug, nome, dono, receita, status, onda, falta]) => ({ slug, nome, dono, receita, status, onda, falta }));

const ROTULO: Record<Status, string> = { pronto: 'Pronto', parcial: 'Parcial', pendente: 'Pendente' };

/** docs/cobertura-117.md (o teste confere que o arquivo esta igual a isto). */
export function markdownCobertura(): string {
  const conta = (f: (c: Cobertura) => boolean) => COBERTURA.filter(f).length;
  const linhas = [
    '# Cobertura dos 117 modelos da referência',
    '',
    'Gerado de `lib/gerador/cobertura.ts` por `npx tsx scripts/cobertura.mts`; não editar à mão.',
    'Fonte dos modelos: `docs/mafagrafos-117.md`. Divisão em `docs/coordenacao.md`.',
    '',
    `**${conta((c) => c.status === 'pronto')} prontos · ${conta((c) => c.status === 'parcial')} parciais · ${conta((c) => c.status === 'pendente')} pendentes** de ${COBERTURA.length}.`,
    '',
    '| Onda | Claude | ChatGPT |',
    '|---|---:|---:|',
    ...([0, 1, 2, 3] as const).map((o) => `| ${o === 0 ? 'já coberto' : o} | ${conta((c) => c.onda === o && c.dono === 'claude')} | ${conta((c) => c.onda === o && c.dono === 'chatgpt')} |`),
    '',
    '| Modelo | Dono | Receita | Status | Onda | Falta |',
    '|---|---|---|---|---:|---|',
    ...COBERTURA.map((c) => `| [${c.nome}](https://www.mafagrafos.com/models/${c.slug}) | ${c.dono === 'claude' ? 'Claude' : 'ChatGPT'} | ${c.receita ? '`' + c.receita + '`' : '—'} | ${ROTULO[c.status]} | ${c.onda} | ${c.falta || '—'} |`),
    '',
  ];
  return linhas.join('\n');
}
