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
  ['can-opener-nfc', 'Gerador de Abridor de Latas (NFC)', C, 'abridor-latas', 'pronto', 0, 'modo face para baixo'],
  ['nfc-keychain-generator', 'Gerador de Chaveiro NFC', C, 'chaveiro-nfc', 'parcial', 2, 'editor de arte com cor por subcamada'],
  ['keychain-generator', 'Gerador de Chaveiro', C, 'chaveiro-desenho', 'parcial', 2, 'modo face para baixo'],
  ['design-pen-holder', 'Gerador de Porta-Canetas', C, '', 'pendente', 3, 'base paramétrica + peça de design separada'],
  ['filament-spool', 'Chaveiro Carretel de Filamento com NFC', C, 'chaveiro-carretel', 'pronto', 0, ''],
  ['fabric-floating-sign', 'Quadro de Tecido', C, '', 'pendente', 3, '3 partes, pausa para tecido, ímãs'],
  ['fabric-business-card', 'Cartão de Visita com Tecido', G, '', 'pendente', 2, 'cartão em camadas com tecido, NFC e QR'],
  ['regular-business-card', 'Cartão de Visita', G, '', 'pendente', 2, 'texto + QR, face para cima/baixo'],
  ['profession', 'Placas Profissionais', G, '', 'parcial', 1, 'editor de placa existe; falta receita com símbolo, nome e base que encaixa'],
  ['lash-holder', 'Porta-Pente para Cílios', C, '', 'pendente', 3, 'cilindro com tampa rosqueada e textura/SVG'],
  ['big-letter-lamp', 'Luminária Letra Grande com Nome', C, '', 'pendente', 3, 'letra oca com canal de LED e tampa'],
  ['overlay-keychain', 'Gerador de Chaveiro com Sobreposição', C, 'chaveiro-desenho', 'parcial', 2, 'texto como sobreposição'],
  ['stripes-plaques', 'Placa de Listras com Base', C, 'placa-com-base', 'parcial', 2, 'editor de arte (aqui o desenho vem de imagem)'],
  ['line-art-plaque', 'Placa de Line Art', C, 'placa-com-base', 'parcial', 2, 'pincel para ligar linhas soltas'],
  ['cake-topper-generator', 'Gerador de Topo de Bolo', C, 'topo-bolo', 'pronto', 0, ''],
  ['text-image-trophy', 'Troféu Imagem + Texto', C, 'trofeu', 'pronto', 0, 'texto da base só na frente'],
  ['rounded-circle-stamp', 'Carimbo Circular de Imagem', C, 'carimbo-circular', 'parcial', 2, 'furo de chaveiro; logo da marca em imagem; vários por impressão'],
  ['nail-salon-display', 'Display para Salão de Unhas', C, '', 'pendente', 3, 'mão com logo e 2 linhas, decoração da base'],
  ['text-brigadeiro-stamp', 'Carimbo de Letras/Números', C, 'carimbo-letras', 'pronto', 0, 'marca embaixo só como texto (sem logo em imagem)'],
  ['social-handle-simple-lamp', '@social - Luminária de LED', C, '', 'pendente', 3, 'base com canal de LED e furo de cabo'],
  ['logo-text-keychain', 'Chaveiro com Nome e Logo', C, 'chaveiro-logo-nome', 'pronto', 0, ''],
  ['scale-dome-ejector', 'Ejetor Arredondado com Escala de Forma', C, '', 'pendente', 3, 'cúpula curva: precisa de sólido não-prisma'],
  ['rounded-dome-ejector', 'Ejetor de Cúpula Arredondada', C, '', 'pendente', 3, 'cúpula curva: precisa de sólido não-prisma'],
  ['vertical-qr-code-list', 'Lista Vertical de Códigos QR', G, '', 'pendente', 2, 'QR por tipo (link, WiFi, PIX...) em coluna'],
  ['layered-vertical-qr-code-list', 'Lista Vertical em Camadas de Códigos QR', G, '', 'pendente', 2, 'QRs em camadas com logo e contato'],
  ['horizontal-qr-code-list', 'Lista Horizontal de Códigos QR', G, '', 'pendente', 2, 'QR por tipo em linha'],
  ['google-review-qr-code', 'Google Review - Placa de QRCode', G, '', 'pendente', 2, 'QR de avaliação Google'],
  ['wi-fi-qr-code', 'Placa de QRCode WiFi', G, '', 'pendente', 2, 'QR WiFi com suporte/furo'],
  ['social-qr-code', 'Social - Placa de QRCode', G, '', 'pendente', 2, 'vários QR de perfis'],
  ['text-qr-code-plaque', 'Placa de QRCode com Texto', G, '', 'pendente', 2, 'QR + texto acima/abaixo'],
  ['whats-app', 'Placa de QRCode WhatsApp', G, '', 'pendente', 2, 'QR de WhatsApp'],
  ['logo-qr-code-plaque', 'Placa de QRCode com Logo', G, '', 'pendente', 2, 'QR com logo no centro'],
  ['stick-stand', 'Suporte para Palitos', C, 'suporte-palitos', 'parcial', 2, 'cavidade e aletas curvas (aqui em degraus retos)'],
  ['cake-stand', 'Suporte de Bolo', C, '', 'pendente', 3, 'prato com ondulações e pé'],
  ['stickers-box', 'Caixa de Figurinhas', C, '', 'pendente', 3, 'caixa, suporte removível e tampa'],
  ['photo-holder', 'Suporte de Foto com Texto', C, 'suporte-foto', 'pronto', 0, ''],
  ['circle-glitter-cake-topper', 'Topo de Bolo Circular com Glitter', C, 'topo-bolo-circular', 'parcial', 2, 'desenho do glitter na janela'],
  ['rectangle-cutters', 'Cortadores de Retângulos em Grade', C, 'cortadores-grade', 'pronto', 0, ''],
  ['small-texture-lipstick-case', 'Estojo de Batom - Ícone em Mosaico', C, '', 'pendente', 3, 'rosca + textura em mosaico'],
  ['large-texture-lipstick-case', 'Estojo de Batom - Textura Grande', C, '', 'pendente', 3, 'rosca + textura de imagem'],
  ['name-lipstick-case', 'Estojo de Batom - Nome', C, '', 'pendente', 3, 'rosca + nome'],
  ['plain-lipstick-case', 'Estojo de Batom', C, '', 'pendente', 3, 'corpo e tampa rosqueada'],
  ['big-word-letreiro', 'Letreiro com Sobreposição de Palavras', C, 'letreiro-sobreposto', 'parcial', 3, 'adornos coração/arabesco no nome'],
  ['tiled-texture-roller', 'Rolo de Textura - Mosaico', C, '', 'pendente', 3, 'cilindro com relevo em mosaico'],
  ['large-texture-roller', 'Rolo de Textura - Imagem Grande', C, '', 'pendente', 3, 'cilindro com imagem envolvida'],
  ['can-opener', 'Gerador de Abridor de Latas', C, 'abridor-latas', 'pronto', 0, 'modo face para baixo'],
  ['rose-with-name', 'Rosa com Nome', C, '', 'pendente', 3, 'rosa orgânica com nome, até 9'],
  ['mirror-text-keychain', 'Chaveiro com Espelho e Texto', C, 'chaveiro-espelho', 'pronto', 0, ''],
  ['rose-text-keychain', 'Chaveiro de Rosa com Texto', C, 'rosa-texto', 'pronto', 0, ''],
  ['rose-scrunchie', 'Rosa para Scrunchie', C, 'rosa-texto', 'pronto', 0, ''],
  ['family-pendant', 'Pingente de Nomes da Família', C, 'pingente-familia', 'parcial', 2, 'forma livre e 3 cores'],
  ['harry-potter-bookmark', 'Marcador de Página do Castelo', C, 'marcador-pagina', 'parcial', 2, 'motivo do castelo é arte deles: usar SVG próprio'],
  ['geometric-name-side-bookmark', 'Marcador de Página Geométrico com Nome', C, 'marcador-pagina', 'parcial', 2, 'padrão frente/verso em cor (aqui o padrão é vazado)'],
  ['elegant-grid-name-side-bookmark', 'Marcador Elegante com Nome', C, 'marcador-pagina', 'parcial', 2, 'padrão frente/verso em cor (aqui o padrão é vazado)'],
  ['simple-pix-plaque', 'Placa PIX Simples', G, '', 'pendente', 2, 'QR PIX (BR Code) + título'],
  ['logo-pix-plaque', 'Placa PIX Logo', G, '', 'pendente', 2, 'QR PIX + logo'],
  ['text-pix-plaque', 'Placa PIX Texto', G, '', 'pendente', 2, 'QR PIX + 2 linhas'],
  ['big-letter-foreground-texture', 'Letra Grande - Textura', C, '', 'pendente', 3, 'letra + nome com textura SVG'],
  ['big-letter-sunken-name', 'Letra Grande - Nome Rebaixado', C, '', 'pendente', 3, 'letra com nome rebaixado'],
  ['big-letter-resin-casting', 'Letra Grande - Borda para Resina', C, '', 'pendente', 3, 'letra com bordas para resina'],
  ['big-letter-textured-background', 'Letra Grande - Fundo Texturizado', C, '', 'pendente', 3, 'letra + fundo texturizado'],
  ['raised-borders-coloring', 'Colorir com Bordas em Relevo', C, 'colorir', 'parcial', 2, 'até 4 imagens por vez; editor de arte'],
  ['big-letter-floral-texture', 'Letra Grande Floral', C, '', 'pendente', 3, 'fundo floral em camadas'],
  ['big-letter-shell-eva', 'Letra Grande - Fundo de Material', C, '', 'pendente', 3, 'letra + fundo para EVA/feltro'],
  ['big-letter-sunken-sparkle', 'Letra Grande - Brilho', C, '', 'pendente', 3, 'letra com compartimento para glitter'],
  ['big-letter-name', 'Letra Grande - Nome', C, '', 'pendente', 3, 'letra + nome encaixado'],
  ['floral-name-side-bookmark', 'Marcador de Livro Floral com Nome', C, 'marcador-pagina', 'parcial', 2, 'padrão frente/verso em cor (aqui o padrão é vazado)'],
  ['pet-name-oval-wave', 'Plaquinha de Pet Oval Ondulada', C, 'plaquinha-pet', 'parcial', 2, 'ajuste de posição do nome e do verso'],
  ['pet-name-oval', 'Plaquinha de Pet Oval', C, 'plaquinha-pet', 'parcial', 2, 'ajuste de posição do nome e do verso'],
  ['pet-name-fish', 'Plaquinha de Pet Peixinho', C, 'plaquinha-pet', 'parcial', 2, 'ajuste de posição do nome e do verso'],
  ['pet-name-dog-bone', 'Plaquinha de Pet Ossinho', C, 'plaquinha-pet', 'parcial', 2, 'ajuste de posição do nome e do verso'],
  ['generic-pet-name-tag', 'Plaquinha de Pet Qualquer Formato', C, 'plaquinha-pet', 'parcial', 2, 'ajuste de posição do nome e do verso'],
  ['mold-stamp-text', 'Carimbo de Molde a partir de Texto', C, 'carimbo-molde', 'pronto', 0, ''],
  ['mold-stamp-image', 'Carimbo de Molde a partir de Imagem', C, 'carimbo-molde', 'pronto', 0, ''],
  ['word-offset-3color-2lines-image', 'Letreiro de Palavra - 2 Linhas com Imagem - 3 Cores', C, 'palavra-camadas', 'parcial', 2, 'mover linha'],
  ['word-offset-2lines-image', 'Letreiro 2 linhas, imagem, 2 cores', C, 'palavra-camadas', 'parcial', 2, 'mover linha'],
  ['logo-offset-3colors', 'Placa multipart SVG, 3 camadas', C, 'logo-camadas', 'pronto', 0, ''],
  ['logo-offset-2colors', 'Placa multipart SVG, 2 camadas', C, 'logo-camadas', 'pronto', 0, ''],
  ['name-side-bookmark', 'Marcador com nome e imagem', C, 'marcador-pagina', 'parcial', 2, 'duas imagens (frente e verso)'],
  ['text-offset-keychain-3colors', 'Chaveiro de nome, 3 cores', C, 'chaveiro-nome', 'pronto', 0, ''],
  ['text-offset-keychain-2colors', 'Chaveiro de nome, 2 cores', C, 'chaveiro-nome', 'pronto', 0, ''],
  ['bowl-anything', 'Cumbuca a partir de imagem', C, '', 'pendente', 3, 'casca a partir de forma fechada'],
  ['word-heart-2colors', 'Palavra e coração, 2 camadas', C, 'palavra-camadas', 'pronto', 0, ''],
  ['2part-coloring-generator', 'Colorir em 2 partes', C, 'colorir', 'pronto', 0, ''],
  ['text-placement-helper', 'Texto com guia de posicionamento', C, 'texto-com-guia', 'parcial', 2, 'dividir letra maior que a mesa'],
  ['image-to3d-resin-border', 'Imagem 3D com borda para resina', C, 'chaveiro-resina', 'parcial', 2, 'segunda imagem'],
  ['image-multipart', 'Imagem multipartes', C, 'imagem-multipartes', 'pronto', 0, ''],
  ['carrot-name-keychain', 'Chaveiro cenoura', C, '', 'pendente', 2, 'forma temática própria + nome'],
  ['bunny-name-keychain', 'Chaveiro coelho', C, '', 'pendente', 2, 'forma temática própria + nome'],
  ['rectangle-name-keychain', 'Chaveiro retangular com nome', C, 'chaveiro-retangular', 'pronto', 0, ''],
  ['image-brigadeiro-stamp', 'Carimbo de brigadeiro com imagem', C, 'carimbo-imagem', 'parcial', 2, 'até 4 imagens (referência: 6); posição por imagem'],
  ['image-puzzle', 'Quebra-cabeça de imagem', C, 'quebra-cabeca', 'parcial', 2, 'imagem colorida (aqui 2 cores); editor de arte'],
  ['candy-mold-rounded', 'Ejetor arredondado de brigadeiro', C, 'ejetor-brigadeiro', 'pronto', 0, ''],
  ['candy-mold', 'Ejetor plano de brigadeiro', C, 'ejetor-brigadeiro', 'pronto', 0, ''],
  ['square-nfc-keychain', 'Chaveiro NFC', C, 'chaveiro-nfc', 'parcial', 2, 'QR code no chaveiro (aguarda o núcleo de QR)'],
  ['social-handle-offset-2color-qr-code', '@social, 2 cores + QR', G, '', 'pendente', 2, '@social em camadas + QR lateral'],
  ['cookie-cutter-generator', 'Cortador de biscoito', C, 'cortador-biscoito', 'pronto', 0, 'reforço da base; logo da marca em imagem'],
  ['sunken-image-coloring-offset', 'Colorir afundado, offset', C, 'colorir', 'pronto', 0, ''],
  ['sunken-image-coloring', 'Colorir afundado, forma', C, 'colorir', 'pronto', 0, ''],
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
