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
  ['hanging-photo-holder', 'Porta-Retrato Suspenso', C, 'porta-retrato', 'pronto', 0, 'editor de arte (o desenho vem de texto ou imagem)'],
  ['play-douh-stamps', 'Carimbos de Massinha', C, 'carimbos-massinha', 'pronto', 0, ''],
  ['snowflake-ornament', 'Enfeite Floco de Neve', C, 'floco-neve', 'pronto', 0, ''],
  ['mini-microphone', 'Mini-Microfone', C, 'mini-microfone', 'parcial', 3, 'cavidade moldada do microfone (aqui furo retangular nas medidas)'],
  ['can-opener-nfc', 'Gerador de Abridor de Latas (NFC)', C, 'abridor-latas', 'pronto', 0, 'modo face para baixo'],
  ['nfc-keychain-generator', 'Gerador de Chaveiro NFC', C, 'chaveiro-nfc', 'pronto', 0, 'editor de arte (a arte colorida vem de imagem)'],
  ['keychain-generator', 'Gerador de Chaveiro', C, 'chaveiro-desenho', 'pronto', 0, ''],
  ['design-pen-holder', 'Gerador de Porta-Canetas', C, 'porta-canetas-design', 'pronto', 0, ''],
  ['filament-spool', 'Chaveiro Carretel de Filamento com NFC', C, 'chaveiro-carretel', 'pronto', 0, ''],
  ['fabric-floating-sign', 'Quadro de Tecido', C, 'quadro-tecido', 'pronto', 0, 'editor de arte (o desenho vem de texto ou imagem)'],
  ['fabric-business-card', 'Cartão de Visita com Tecido', C, 'cartao-tecido', 'parcial', 2, 'conferir impresso: tecido na pausa e NFC'],
  ['regular-business-card', 'Cartão de Visita', C, 'cartao-visita', 'pronto', 0, ''],
  ['profession', 'Placas Profissionais', G, '', 'parcial', 1, 'editor de placa existe; falta receita com símbolo, nome e base que encaixa'],
  ['lash-holder', 'Porta-Pente para Cílios', C, 'porta-pente', 'pronto', 0, 'textura vem de imagem (sem editor de arte)'],
  ['big-letter-lamp', 'Luminária Letra Grande com Nome', C, 'luminaria-letra', 'parcial', 3, 'editor de arte; conferir encaixe da frente impresso'],
  ['overlay-keychain', 'Gerador de Chaveiro com Sobreposição', C, 'chaveiro-desenho', 'pronto', 0, ''],
  ['stripes-plaques', 'Placa de Listras com Base', C, 'placa-com-base', 'pronto', 0, 'editor de arte (o desenho vem de imagem)'],
  ['line-art-plaque', 'Placa de Line Art', C, 'placa-com-base', 'pronto', 0, 'pincel para ligar linhas soltas (avisa quando há partes soltas)'],
  ['cake-topper-generator', 'Gerador de Topo de Bolo', C, 'topo-bolo', 'pronto', 0, ''],
  ['text-image-trophy', 'Troféu Imagem + Texto', C, 'trofeu', 'pronto', 0, 'texto da base só na frente'],
  ['rounded-circle-stamp', 'Carimbo Circular de Imagem', C, 'carimbo-circular', 'pronto', 0, ''],
  ['nail-salon-display', 'Display para Salão de Unhas', C, 'display-unhas', 'pronto', 0, ''],
  ['text-brigadeiro-stamp', 'Carimbo de Letras/Números', C, 'carimbo-letras', 'pronto', 0, ''],
  ['social-handle-simple-lamp', '@social - Luminária de LED', C, 'luminaria-social', 'parcial', 3, 'conferir encaixe da frente impresso'],
  ['logo-text-keychain', 'Chaveiro com Nome e Logo', C, 'chaveiro-logo-nome', 'pronto', 0, ''],
  ['scale-dome-ejector', 'Ejetor Arredondado com Escala de Forma', C, 'ejetor-cupula', 'pronto', 0, 'texto e logo da marca; pegador'],
  ['rounded-dome-ejector', 'Ejetor de Cúpula Arredondada', C, 'ejetor-cupula', 'pronto', 0, 'texto e logo da marca'],
  ['vertical-qr-code-list', 'Lista Vertical de Códigos QR', C, 'lista-qr', 'pronto', 0, ''],
  ['layered-vertical-qr-code-list', 'Lista Vertical em Camadas de Códigos QR', C, 'lista-qr-camadas', 'pronto', 0, ''],
  ['horizontal-qr-code-list', 'Lista Horizontal de Códigos QR', C, 'lista-qr', 'pronto', 0, ''],
  ['google-review-qr-code', 'Google Review - Placa de QRCode', C, 'placa-google-review', 'pronto', 0, ''],
  ['wi-fi-qr-code', 'Placa de QRCode WiFi', G, 'placa-qr-wifi', 'parcial', 2, 'encaixe do suporte e leitura após impressão ainda não validados'],
  ['social-qr-code', 'Social - Placa de QRCode', C, 'placa-qr-social', 'pronto', 0, ''],
  ['text-qr-code-plaque', 'Placa de QRCode com Texto', G, 'placa-qr-texto', 'parcial', 2, 'falta conteúdo QR livre além de URL; encaixe e leitura após impressão não validados'],
  ['whats-app', 'Placa de QRCode WhatsApp', G, 'placa-qr-whatsapp', 'parcial', 2, 'encaixe do suporte e leitura após impressão ainda não validados'],
  ['logo-qr-code-plaque', 'Placa de QRCode com Logo', C, 'placa-qr-logo', 'parcial', 2, 'conferir a leitura do QR com logo no meio depois de impresso'],
  ['stick-stand', 'Suporte para Palitos', C, 'suporte-palitos', 'pronto', 0, 'curva das aletas em degraus de 0,4 mm'],
  ['cake-stand', 'Suporte de Bolo', C, 'suporte-bolo', 'pronto', 0, ''],
  ['stickers-box', 'Caixa de Figurinhas', C, 'caixa-figurinhas', 'pronto', 0, ''],
  ['photo-holder', 'Suporte de Foto com Texto', C, 'suporte-foto', 'pronto', 0, ''],
  ['circle-glitter-cake-topper', 'Topo de Bolo Circular com Glitter', C, 'topo-bolo-circular', 'pronto', 0, ''],
  ['rectangle-cutters', 'Cortadores de Retângulos em Grade', C, 'cortadores-grade', 'pronto', 0, ''],
  ['small-texture-lipstick-case', 'Estojo de Batom - Ícone em Mosaico', C, 'estojo-batom', 'pronto', 0, ''],
  ['large-texture-lipstick-case', 'Estojo de Batom - Textura Grande', C, 'estojo-batom', 'pronto', 0, ''],
  ['name-lipstick-case', 'Estojo de Batom - Nome', C, 'estojo-batom', 'pronto', 0, ''],
  ['plain-lipstick-case', 'Estojo de Batom', C, 'estojo-batom', 'pronto', 0, ''],
  ['big-word-letreiro', 'Letreiro com Sobreposição de Palavras', C, 'letreiro-sobreposto', 'pronto', 0, ''],
  ['tiled-texture-roller', 'Rolo de Textura - Mosaico', C, 'rolo-textura', 'pronto', 0, ''],
  ['large-texture-roller', 'Rolo de Textura - Imagem Grande', C, 'rolo-textura', 'pronto', 0, ''],
  ['can-opener', 'Gerador de Abridor de Latas', C, 'abridor-latas', 'pronto', 0, 'modo face para baixo'],
  ['rose-with-name', 'Rosa com Nome', C, 'rosa-nome', 'pronto', 0, ''],
  ['mirror-text-keychain', 'Chaveiro com Espelho e Texto', C, 'chaveiro-espelho', 'pronto', 0, ''],
  ['rose-text-keychain', 'Chaveiro de Rosa com Texto', C, 'rosa-texto', 'pronto', 0, ''],
  ['rose-scrunchie', 'Rosa para Scrunchie', C, 'rosa-texto', 'pronto', 0, ''],
  ['family-pendant', 'Pingente de Nomes da Família', C, 'pingente-familia', 'pronto', 0, ''],
  ['harry-potter-bookmark', 'Marcador de Página do Castelo', C, 'marcador-pagina', 'pronto', 0, 'o castelo é arte da referência: use o seu desenho'],
  ['geometric-name-side-bookmark', 'Marcador de Página Geométrico com Nome', C, 'marcador-pagina', 'pronto', 0, ''],
  ['elegant-grid-name-side-bookmark', 'Marcador Elegante com Nome', C, 'marcador-pagina', 'pronto', 0, ''],
  ['simple-pix-plaque', 'Placa PIX Simples', G, 'placa-pix-simples', 'parcial', 2, 'falta logo Pix, borda em cor própria e validação em aplicativo bancário'],
  ['logo-pix-plaque', 'Placa PIX Logo', C, 'placa-pix-logo', 'parcial', 2, 'validar em aplicativo bancário'],
  ['text-pix-plaque', 'Placa PIX Texto', C, 'placa-pix-texto', 'parcial', 2, 'validar em aplicativo bancário'],
  ['big-letter-foreground-texture', 'Letra Grande - Textura', C, 'letra-grande', 'parcial', 3, 'editor de arte; conferir no fatiador'],
  ['big-letter-sunken-name', 'Letra Grande - Nome Rebaixado', C, 'letra-grande', 'parcial', 3, 'editor de arte; conferir no fatiador'],
  ['big-letter-resin-casting', 'Letra Grande - Borda para Resina', C, 'letra-grande', 'parcial', 3, 'editor de arte; conferir no fatiador'],
  ['big-letter-textured-background', 'Letra Grande - Fundo Texturizado', C, 'letra-grande', 'parcial', 3, 'editor de arte; conferir no fatiador'],
  ['raised-borders-coloring', 'Colorir com Bordas em Relevo', C, 'colorir', 'pronto', 0, 'editor de arte (o desenho vem de imagem)'],
  ['big-letter-floral-texture', 'Letra Grande Floral', C, 'letra-grande', 'parcial', 3, 'editor de arte; conferir no fatiador'],
  ['big-letter-shell-eva', 'Letra Grande - Fundo de Material', C, 'letra-grande', 'parcial', 3, 'editor de arte; conferir no fatiador'],
  ['big-letter-sunken-sparkle', 'Letra Grande - Brilho', C, 'letra-grande', 'parcial', 3, 'editor de arte; conferir no fatiador'],
  ['big-letter-name', 'Letra Grande - Nome', C, 'letra-grande', 'parcial', 3, 'editor de arte; conferir no fatiador'],
  ['floral-name-side-bookmark', 'Marcador de Livro Floral com Nome', C, 'marcador-pagina', 'pronto', 0, ''],
  ['pet-name-oval-wave', 'Plaquinha de Pet Oval Ondulada', C, 'plaquinha-pet', 'pronto', 0, ''],
  ['pet-name-oval', 'Plaquinha de Pet Oval', C, 'plaquinha-pet', 'pronto', 0, ''],
  ['pet-name-fish', 'Plaquinha de Pet Peixinho', C, 'plaquinha-pet', 'pronto', 0, ''],
  ['pet-name-dog-bone', 'Plaquinha de Pet Ossinho', C, 'plaquinha-pet', 'pronto', 0, ''],
  ['generic-pet-name-tag', 'Plaquinha de Pet Qualquer Formato', C, 'plaquinha-pet', 'pronto', 0, ''],
  ['mold-stamp-text', 'Carimbo de Molde a partir de Texto', C, 'carimbo-molde', 'pronto', 0, ''],
  ['mold-stamp-image', 'Carimbo de Molde a partir de Imagem', C, 'carimbo-molde', 'pronto', 0, ''],
  ['word-offset-3color-2lines-image', 'Letreiro de Palavra - 2 Linhas com Imagem - 3 Cores', C, 'palavra-camadas', 'pronto', 0, ''],
  ['word-offset-2lines-image', 'Letreiro 2 linhas, imagem, 2 cores', C, 'palavra-camadas', 'pronto', 0, ''],
  ['logo-offset-3colors', 'Placa multipart SVG, 3 camadas', C, 'logo-camadas', 'pronto', 0, ''],
  ['logo-offset-2colors', 'Placa multipart SVG, 2 camadas', C, 'logo-camadas', 'pronto', 0, ''],
  ['name-side-bookmark', 'Marcador com nome e imagem', C, 'marcador-pagina', 'pronto', 0, ''],
  ['text-offset-keychain-3colors', 'Chaveiro de nome, 3 cores', C, 'chaveiro-nome', 'pronto', 0, ''],
  ['text-offset-keychain-2colors', 'Chaveiro de nome, 2 cores', C, 'chaveiro-nome', 'pronto', 0, ''],
  ['bowl-anything', 'Cumbuca a partir de imagem', C, 'cumbuca', 'pronto', 0, ''],
  ['word-heart-2colors', 'Palavra e coração, 2 camadas', C, 'palavra-camadas', 'pronto', 0, ''],
  ['2part-coloring-generator', 'Colorir em 2 partes', C, 'colorir', 'pronto', 0, ''],
  ['text-placement-helper', 'Texto com guia de posicionamento', C, 'texto-com-guia', 'pronto', 0, ''],
  ['image-to3d-resin-border', 'Imagem 3D com borda para resina', C, 'chaveiro-resina', 'parcial', 2, 'segunda imagem'],
  ['image-multipart', 'Imagem multipartes', C, 'imagem-multipartes', 'pronto', 0, ''],
  ['carrot-name-keychain', 'Chaveiro cenoura', C, 'chaveiro-cenoura', 'pronto', 0, ''],
  ['bunny-name-keychain', 'Chaveiro coelho', C, 'chaveiro-coelho', 'pronto', 0, ''],
  ['rectangle-name-keychain', 'Chaveiro retangular com nome', C, 'chaveiro-retangular', 'pronto', 0, ''],
  ['image-brigadeiro-stamp', 'Carimbo de brigadeiro com imagem', C, 'carimbo-imagem', 'pronto', 0, ''],
  ['image-puzzle', 'Quebra-cabeça de imagem', C, 'quebra-cabeca', 'pronto', 0, 'editor de arte (a imagem vem de arquivo)'],
  ['candy-mold-rounded', 'Ejetor arredondado de brigadeiro', C, 'ejetor-brigadeiro', 'pronto', 0, ''],
  ['candy-mold', 'Ejetor plano de brigadeiro', C, 'ejetor-brigadeiro', 'pronto', 0, ''],
  ['square-nfc-keychain', 'Chaveiro NFC', C, 'chaveiro-nfc', 'parcial', 2, 'QR code no chaveiro (aguarda o núcleo de QR)'],
  ['social-handle-offset-2color-qr-code', '@social, 2 cores + QR', C, 'social-com-qr', 'pronto', 0, ''],
  ['cookie-cutter-generator', 'Cortador de biscoito', C, 'cortador-biscoito', 'pronto', 0, 'reforço da base; logo da marca em imagem'],
  ['sunken-image-coloring-offset', 'Colorir afundado, offset', C, 'colorir', 'pronto', 0, ''],
  ['sunken-image-coloring', 'Colorir afundado, forma', C, 'colorir', 'pronto', 0, ''],
  ['scratch-off-counter', 'Contador raspadinha', C, 'contador-raspadinha', 'pronto', 0, ''],
  ['sized-pen-holder', 'Porta-canetas paramétrico', C, 'porta-canetas-grade', 'pronto', 0, ''],
  ['string-art-heart-name-vertical-floating', 'String art, coração', C, 'string-art', 'pronto', 0, ''],
  ['string-art-rectangle-name-radial', 'String art, retângulo', C, 'string-art', 'pronto', 0, 'editor de arte (o desenho vem de imagem)'],
  ['social-handle-string-art-floating', '@social string art', C, 'string-art', 'pronto', 0, ''],
  ['separate-letters-offset-2color', 'Letras separadas, 2 cores', C, 'letras-separadas', 'pronto', 0, ''],
  ['separate-letters-offset-3color', 'Letras separadas, 3 cores', C, 'letras-separadas', 'pronto', 0, ''],
  ['social-handle-offset-3color', '@social, 3 cores', C, 'social-camadas', 'pronto', 0, ''],
  ['social-handle-offset-2color', '@social, 2 cores', C, 'social-camadas', 'pronto', 0, ''],
  ['full-name-keychain', 'Chaveiro com nome completo', C, 'chaveiro-retangular', 'pronto', 0, ''],
  ['social-handle-rectangle-3color', '@social retângulo, 3 cores', C, 'social-camadas', 'pronto', 0, ''],
  ['social-handle-rectangle-2color', '@social retângulo, 2 cores', C, 'social-camadas', 'pronto', 0, ''],
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
