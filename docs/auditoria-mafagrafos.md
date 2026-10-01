# Auditoria funcional do catálogo Mafagrafos

> Substituído por `docs/mafagrafos-117.md` (117 modelos, opções por ficha, 2026-10-01). Mantido só como histórico.

Consulta: 2026-09-30. Fonte: [catálogo público](https://www.mafagrafos.com/models). Este documento registra **116 entradas do índice**; 115 fichas públicas foram abertas. A ficha de “Carimbos de Massinha” não pôde ser acessada e está marcada abaixo. Não foram testadas as interfaces interativas nem as exportações de cada gerador.

Objetivo: identificar capacidades e núcleos geométricos que podemos implementar de forma própria no Formma3D. Os nomes servem como referências de origem, não como especificação de cópia de marca, layout, código ou arquivos 3D. As famílias e sinais técnicos abaixo são uma triagem nossa, não categorias oficiais do site.

## Situação do Formma3D

- O catálogo local tem 11 cards ilustrativos; isso **não** significa cobertura das 116 entradas.
- Texto/letras têm geometria 3D existente. As duas rotas de placas agora oferecem um gerador 3D inicial de base e letras soltas, além da composição 2D/SVG preexistente; isso ainda não equivale aos geradores completos da referência.
- Cada modelo só deve ser marcado como implementado depois de configuração, geração de geometria, edição, exportação e testes do fluxo completo.

## Núcleos reutilizáveis para implementar

1. Placa/base 3D paramétrica + texto com contorno real e peças separadas; primeiro incremento implementado em versão inicial.
2. Operações 2D/2,5D sobre SVG: offset, furos, relevo/rebaixo, camadas e encaixes.
3. QR/PIX: dados de entrada, matriz QR verificável, base e opções de montagem.
4. Chaveiros e tags: contorno, argola/furo, sobreposição, cavidade NFC e variantes de exportação.
5. Cortadores/carimbos/ejetores: paredes parametrizadas, inversão e superfícies funcionais.
6. Sólidos paramétricos e peças de montagem: recipientes, suportes, texturas, roscas, LED e partes móveis.

## Primeiro incremento: placa 3D própria

- Base paramétrica: largura, altura, espessura, raio dos cantos e margem; malha fechada apoiada na mesa.
- Implementado inicialmente nas duas rotas: texto com contornos reais de fonte, letras como peças 3D individuais, prévia de montagem e ZIP com STL da base, STL de cada letra e mapa JSON das posições de montagem. O editor 2D/SVG continua disponível, sem conversão fiel automática entre os modos. O ZIP é testado por reimportação dos STLs; isso não substitui teste físico de montagem.
- Próximo: arranjo de impressão, formatos adicionais como 3MF, reimportação verificada, edição individual das letras na placa e tolerâncias/encaixes testados fisicamente.
- Critério de pronto do gerador: parâmetros editáveis na rota da placa, prévia 3D, peças nomeadas, exportação reimportável, dimensões/encaixes conferidos e testes em celular/desktop.
- Limite do primeiro produto: letras soltas para montagem; não promete encaixe mecânico, relevo fundido nem paridade com a ficha de Placas Profissionais do site de referência.

## Ordem técnica proposta

| Núcleo | Base já existente no Formma3D | Principal lacuna | Prioridade |
|---|---|---|---|
| Placas e letras | Glifos reais, extrusão, exportação STL/3MF; composição 2D de placas | Fluxo 3D completo, montagem e peças separadas | 1 |
| QR/PIX | Texto, placa e exportação | Matriz QR verificável e variações de suporte | 2 |
| SVG em camadas | Importação de SVG, regiões e offset | Gerador parametrizado de camadas, encaixes e cores | 3 |
| Chaveiros e tags | Regiões, extrusão e furos geométricos básicos | Borda, argola, cavidade NFC e exportações por orientação | 4 |
| Cortadores e carimbos | Offset de contornos e extrusão | Paredes funcionais, inversão, pegada e tolerâncias | 5 |
| Objetos sólidos | Malhas/importação e objetos 3D | Geradores paramétricos específicos e montagem | 6 |

Prioridade indica ordem de construção do núcleo, **não** promessa de que todos os modelos da família ficarão prontos nessa etapa.

## Inventário por entrada

Triagem por família dominante: Corte, carimbo e relevo (18); Objetos e decoracao (22); Chaveiros e identificacao (20); Placas, SVG e suportes (15); QR, Pix e cartoes (15); Letras e letreiros (26).

| Nº | Modelo (ficha pública) | Família preliminar | Sinais técnicos da ficha |
|---:|---|---|---|
| 1 | [Carimbos de Massinha](https://www.mafagrafos.com/models/play-douh-stamps) | Corte, carimbo e relevo | ficha indisponível; não inferir requisitos |
| 2 | [Enfeite Floco de Neve](https://www.mafagrafos.com/models/snowflake-ornament) | Objetos e decoracao | imagem/SVG, texto, encaixe/fixação |
| 3 | [Mini-Microfone](https://www.mafagrafos.com/models/mini-microphone) | Objetos e decoracao | imagem/SVG, encaixe/fixação, medidas |
| 4 | [Gerador de Abridor de Latas (NFC)](https://www.mafagrafos.com/models/can-opener-nfc) | Objetos e decoracao | NFC, imagem/SVG, encaixe/fixação |
| 5 | [Gerador de Chaveiro NFC](https://www.mafagrafos.com/models/nfc-keychain-generator) | Chaveiros e identificacao | NFC, imagem/SVG, camadas/peças, encaixe/fixação |
| 6 | [Gerador de Chaveiro](https://www.mafagrafos.com/models/keychain-generator) | Chaveiros e identificacao | imagem/SVG, camadas/peças, encaixe/fixação, medidas |
| 7 | [Gerador de Porta-Canetas](https://www.mafagrafos.com/models/design-pen-holder) | Objetos e decoracao | imagem/SVG, texto, camadas/peças, medidas |
| 8 | [Chaveiro Carretel de Filamento com NFC](https://www.mafagrafos.com/models/filament-spool) | Chaveiros e identificacao | NFC, imagem/SVG, encaixe/fixação, medidas |
| 9 | [Quadro de Tecido](https://www.mafagrafos.com/models/fabric-floating-sign) | Placas, SVG e suportes | imagem/SVG, texto, camadas/peças |
| 10 | [Cartão de Visita com Tecido](https://www.mafagrafos.com/models/fabric-business-card) | QR, Pix e cartoes | NFC, QR/PIX, texto, camadas/peças |
| 11 | [Cartão de Visita](https://www.mafagrafos.com/models/regular-business-card) | QR, Pix e cartoes | QR/PIX, texto |
| 12 | [Placas Profissionais](https://www.mafagrafos.com/models/profession) | Placas, SVG e suportes | imagem/SVG, texto, encaixe/fixação, medidas |
| 13 | [Porta-Pente para Cílios](https://www.mafagrafos.com/models/lash-holder) | Objetos e decoracao | imagem/SVG, encaixe/fixação, medidas, textura |
| 14 | [Luminária Letra Grande com Nome](https://www.mafagrafos.com/models/big-letter-lamp) | Letras e letreiros | texto, camadas/peças, encaixe/fixação, medidas, iluminação |
| 15 | [Gerador de Chaveiro com Sobreposição](https://www.mafagrafos.com/models/overlay-keychain) | Chaveiros e identificacao | imagem/SVG, texto, camadas/peças, medidas |
| 16 | [Placa de Listras com Base](https://www.mafagrafos.com/models/stripes-plaques) | Placas, SVG e suportes | imagem/SVG, camadas/peças |
| 17 | [Placa de Line Art](https://www.mafagrafos.com/models/line-art-plaque) | Placas, SVG e suportes | imagem/SVG |
| 18 | [Gerador de Topo de Bolo](https://www.mafagrafos.com/models/cake-topper-generator) | Objetos e decoracao | imagem/SVG, texto |
| 19 | [Troféu Imagem + Texto](https://www.mafagrafos.com/models/text-image-trophy) | Placas, SVG e suportes | imagem/SVG, texto, camadas/peças |
| 20 | [Carimbo Circular de Imagem](https://www.mafagrafos.com/models/rounded-circle-stamp) | Corte, carimbo e relevo | imagem/SVG, encaixe/fixação, medidas |
| 21 | [Display para Salão de Unhas](https://www.mafagrafos.com/models/nail-salon-display) | Objetos e decoracao | imagem/SVG, texto, camadas/peças |
| 22 | [Carimbo de Letras/Números](https://www.mafagrafos.com/models/text-brigadeiro-stamp) | Corte, carimbo e relevo | imagem/SVG, texto |
| 23 | [@social - Luminária de LED](https://www.mafagrafos.com/models/social-handle-simple-lamp) | Letras e letreiros | imagem/SVG, texto, encaixe/fixação, iluminação |
| 24 | [Chaveiro com Nome e Logo](https://www.mafagrafos.com/models/logo-text-keychain) | Chaveiros e identificacao | imagem/SVG, texto, medidas |
| 25 | [Ejetor Arredondado com Escala de Forma](https://www.mafagrafos.com/models/scale-dome-ejector) | Corte, carimbo e relevo | imagem/SVG, medidas |
| 26 | [Ejetor de Cúpula Arredondada](https://www.mafagrafos.com/models/rounded-dome-ejector) | Corte, carimbo e relevo | imagem/SVG, camadas/peças, medidas |
| 27 | [Lista Vertical de Códigos QR](https://www.mafagrafos.com/models/vertical-qr-code-list) | QR, Pix e cartoes | QR/PIX, medidas |
| 28 | [Lista Vertical em Camadas de Códigos QR](https://www.mafagrafos.com/models/layered-vertical-qr-code-list) | QR, Pix e cartoes | QR/PIX, imagem/SVG, camadas/peças, medidas |
| 29 | [Lista Horizontal de Códigos QR](https://www.mafagrafos.com/models/horizontal-qr-code-list) | QR, Pix e cartoes | QR/PIX, medidas |
| 30 | [Google Review - Placa de QRCode](https://www.mafagrafos.com/models/google-review-qr-code) | QR, Pix e cartoes | QR/PIX, medidas |
| 31 | [Placa de QRCode WiFi](https://www.mafagrafos.com/models/wi-fi-qr-code) | QR, Pix e cartoes | QR/PIX, imagem/SVG, texto, encaixe/fixação, medidas |
| 32 | [Social - Placa de QRCode](https://www.mafagrafos.com/models/social-qr-code) | QR, Pix e cartoes | QR/PIX, imagem/SVG, medidas |
| 33 | [Placa de QRCode com Texto](https://www.mafagrafos.com/models/text-qr-code-plaque) | QR, Pix e cartoes | QR/PIX, imagem/SVG, texto, encaixe/fixação, medidas |
| 34 | [Placa de QRCode WhatsApp](https://www.mafagrafos.com/models/whats-app) | QR, Pix e cartoes | QR/PIX, imagem/SVG, encaixe/fixação, medidas |
| 35 | [Placa de QRCode com Logo](https://www.mafagrafos.com/models/logo-qr-code-plaque) | QR, Pix e cartoes | QR/PIX, imagem/SVG, encaixe/fixação, medidas |
| 36 | [Suporte para Palitos](https://www.mafagrafos.com/models/stick-stand) | Objetos e decoracao | imagem/SVG, encaixe/fixação, medidas |
| 37 | [Suporte de Bolo](https://www.mafagrafos.com/models/cake-stand) | Objetos e decoracao | imagem/SVG, texto, medidas |
| 38 | [Caixa de Figurinhas](https://www.mafagrafos.com/models/stickers-box) | Objetos e decoracao | imagem/SVG, texto, medidas |
| 39 | [Suporte de Foto com Texto](https://www.mafagrafos.com/models/photo-holder) | Objetos e decoracao | texto, camadas/peças, encaixe/fixação, medidas |
| 40 | [Topo de Bolo Circular com Glitter](https://www.mafagrafos.com/models/circle-glitter-cake-topper) | Objetos e decoracao | imagem/SVG, texto, camadas/peças, medidas |
| 41 | [Cortadores de Retângulos em Grade](https://www.mafagrafos.com/models/rectangle-cutters) | Corte, carimbo e relevo | texto, medidas |
| 42 | [Estojo de Batom - Ícone em Mosaico](https://www.mafagrafos.com/models/small-texture-lipstick-case) | Objetos e decoracao | texto, medidas, textura |
| 43 | [Estojo de Batom - Textura Grande](https://www.mafagrafos.com/models/large-texture-lipstick-case) | Objetos e decoracao | texto, medidas, textura |
| 44 | [Estojo de Batom - Nome](https://www.mafagrafos.com/models/name-lipstick-case) | Objetos e decoracao | texto, encaixe/fixação, medidas |
| 45 | [Estojo de Batom](https://www.mafagrafos.com/models/plain-lipstick-case) | Objetos e decoracao | encaixe/fixação, medidas, textura |
| 46 | [Letreiro com Sobreposição de Palavras](https://www.mafagrafos.com/models/big-word-letreiro) | Letras e letreiros | texto, camadas/peças, encaixe/fixação, medidas |
| 47 | [Rolo de Textura - Mosaico](https://www.mafagrafos.com/models/tiled-texture-roller) | Corte, carimbo e relevo | imagem/SVG, medidas, textura |
| 48 | [Rolo de Textura - Imagem Grande](https://www.mafagrafos.com/models/large-texture-roller) | Corte, carimbo e relevo | imagem/SVG, medidas, textura |
| 49 | [Gerador de Abridor de Latas](https://www.mafagrafos.com/models/can-opener) | Objetos e decoracao | imagem/SVG, encaixe/fixação |
| 50 | [Rosa com Nome](https://www.mafagrafos.com/models/rose-with-name) | Objetos e decoracao | imagem/SVG, texto |
| 51 | [Chaveiro com Espelho e Texto](https://www.mafagrafos.com/models/mirror-text-keychain) | Chaveiros e identificacao | imagem/SVG, texto, encaixe/fixação |
| 52 | [Chaveiro de Rosa com Texto](https://www.mafagrafos.com/models/rose-text-keychain) | Chaveiros e identificacao | imagem/SVG, texto, medidas |
| 53 | [Rosa para Scrunchie](https://www.mafagrafos.com/models/rose-scrunchie) | Objetos e decoracao | imagem/SVG, texto, camadas/peças, encaixe/fixação |
| 54 | [Pingente de Nomes da Família](https://www.mafagrafos.com/models/family-pendant) | Chaveiros e identificacao | imagem/SVG, texto, encaixe/fixação, medidas |
| 55 | [Marcador de Página do Castelo](https://www.mafagrafos.com/models/harry-potter-bookmark) | Placas, SVG e suportes | imagem/SVG, texto, medidas, textura |
| 56 | [Marcador de Página Geométrico com Nome](https://www.mafagrafos.com/models/geometric-name-side-bookmark) | Placas, SVG e suportes | imagem/SVG, texto, medidas, textura |
| 57 | [Marcador Elegante com Nome](https://www.mafagrafos.com/models/elegant-grid-name-side-bookmark) | Placas, SVG e suportes | imagem/SVG, texto, medidas |
| 58 | [Placa PIX Simples](https://www.mafagrafos.com/models/simple-pix-plaque) | QR, Pix e cartoes | QR/PIX, imagem/SVG, texto, medidas |
| 59 | [Placa PIX Logo](https://www.mafagrafos.com/models/logo-pix-plaque) | QR, Pix e cartoes | QR/PIX, imagem/SVG, texto, medidas |
| 60 | [Placa PIX Texto](https://www.mafagrafos.com/models/text-pix-plaque) | QR, Pix e cartoes | QR/PIX, texto, medidas |
| 61 | [Letra Grande - Textura](https://www.mafagrafos.com/models/big-letter-foreground-texture) | Letras e letreiros | imagem/SVG, texto, encaixe/fixação, medidas, textura |
| 62 | [Letra Grande - Nome Rebaixado](https://www.mafagrafos.com/models/big-letter-sunken-name) | Letras e letreiros | imagem/SVG, texto, camadas/peças |
| 63 | [Letra Grande - Borda para Resina](https://www.mafagrafos.com/models/big-letter-resin-casting) | Letras e letreiros | imagem/SVG, texto, camadas/peças, medidas |
| 64 | [Letra Grande - Fundo Texturizado](https://www.mafagrafos.com/models/big-letter-textured-background) | Letras e letreiros | imagem/SVG, texto, textura |
| 65 | [Colorir com Bordas em Relevo](https://www.mafagrafos.com/models/raised-borders-coloring) | Corte, carimbo e relevo | imagem/SVG, camadas/peças, medidas |
| 66 | [Letra Grande Floral](https://www.mafagrafos.com/models/big-letter-floral-texture) | Letras e letreiros | texto, camadas/peças |
| 67 | [Letra Grande - Fundo de Material](https://www.mafagrafos.com/models/big-letter-shell-eva) | Letras e letreiros | imagem/SVG, texto |
| 68 | [Letra Grande - Brilho](https://www.mafagrafos.com/models/big-letter-sunken-sparkle) | Letras e letreiros | imagem/SVG, texto, medidas, textura |
| 69 | [Letra Grande - Nome](https://www.mafagrafos.com/models/big-letter-name) | Letras e letreiros | imagem/SVG, texto, encaixe/fixação, medidas |
| 70 | [Marcador de Livro Floral com Nome](https://www.mafagrafos.com/models/floral-name-side-bookmark) | Placas, SVG e suportes | texto |
| 71 | [Plaquinha de Pet Oval Ondulada](https://www.mafagrafos.com/models/pet-name-oval-wave) | Chaveiros e identificacao | texto, encaixe/fixação, medidas |
| 72 | [Plaquinha de Pet Oval](https://www.mafagrafos.com/models/pet-name-oval) | Chaveiros e identificacao | texto, encaixe/fixação, medidas |
| 73 | [Plaquinha de Pet Peixinho](https://www.mafagrafos.com/models/pet-name-fish) | Chaveiros e identificacao | texto, encaixe/fixação, medidas |
| 74 | [Plaquinha de Pet Ossinho](https://www.mafagrafos.com/models/pet-name-dog-bone) | Chaveiros e identificacao | texto, encaixe/fixação, medidas |
| 75 | [Plaquinha de Pet Qualquer Formato](https://www.mafagrafos.com/models/generic-pet-name-tag) | Chaveiros e identificacao | imagem/SVG, texto, encaixe/fixação, medidas |
| 76 | [Carimbo de Molde a partir de Texto](https://www.mafagrafos.com/models/mold-stamp-text) | Corte, carimbo e relevo | imagem/SVG, texto |
| 77 | [Carimbo de Molde a partir de Imagem](https://www.mafagrafos.com/models/mold-stamp-image) | Corte, carimbo e relevo | imagem/SVG |
| 78 | [Letreiro de Palavra - 2 Linhas com Imagem - 3 Cores](https://www.mafagrafos.com/models/word-offset-3color-2lines-image) | Letras e letreiros | imagem/SVG, texto, camadas/peças, medidas |
| 79 | [Letreiro de Palavra - 2 Linhas com Imagem - 2 Cores](https://www.mafagrafos.com/models/word-offset-2lines-image) | Letras e letreiros | imagem/SVG, texto, camadas/peças, medidas |
| 80 | [Placa Multipart a partir de Imagem - 3 Camadas](https://www.mafagrafos.com/models/logo-offset-3colors) | Placas, SVG e suportes | imagem/SVG, texto, camadas/peças, medidas |
| 81 | [Placa Multipart a partir de Imagem](https://www.mafagrafos.com/models/logo-offset-2colors) | Placas, SVG e suportes | imagem/SVG, texto, camadas/peças, medidas |
| 82 | [Marcador de Livro com Nome e Imagem](https://www.mafagrafos.com/models/name-side-bookmark) | Placas, SVG e suportes | imagem/SVG, texto, medidas |
| 83 | [Chaveiro de Nome com 3 Cores](https://www.mafagrafos.com/models/text-offset-keychain-3colors) | Chaveiros e identificacao | imagem/SVG, texto, camadas/peças |
| 84 | [Chaveiro de Nome com 2 Cores](https://www.mafagrafos.com/models/text-offset-keychain-2colors) | Chaveiros e identificacao | imagem/SVG, texto, camadas/peças |
| 85 | [Cumbuca a partir de Imagem](https://www.mafagrafos.com/models/bowl-anything) | Placas, SVG e suportes | imagem/SVG, medidas, textura |
| 86 | [Palavra 2 Camadas com Coração](https://www.mafagrafos.com/models/word-heart-2colors) | Letras e letreiros | imagem/SVG, texto, camadas/peças, medidas |
| 87 | [Gerador de Colorir em 2 Partes](https://www.mafagrafos.com/models/2part-coloring-generator) | Corte, carimbo e relevo | imagem/SVG, camadas/peças, encaixe/fixação, medidas |
| 88 | [Texto com Guia de Posicionamento](https://www.mafagrafos.com/models/text-placement-helper) | Letras e letreiros | texto, encaixe/fixação, medidas |
| 89 | [Imagem para 3D com Bordas Altas para Resina](https://www.mafagrafos.com/models/image-to3d-resin-border) | Placas, SVG e suportes | imagem/SVG, encaixe/fixação, medidas |
| 90 | [Image Multipartes](https://www.mafagrafos.com/models/image-multipart) | Placas, SVG e suportes | imagem/SVG, camadas/peças, encaixe/fixação, medidas |
| 91 | [Chaveiro Nome Cenoura](https://www.mafagrafos.com/models/carrot-name-keychain) | Chaveiros e identificacao | imagem/SVG, texto, camadas/peças |
| 92 | [Chaveiro Coelho com Nome (até 9 nomes)](https://www.mafagrafos.com/models/bunny-name-keychain) | Chaveiros e identificacao | imagem/SVG, texto |
| 93 | [Chaveiro Retangular com Nome](https://www.mafagrafos.com/models/rectangle-name-keychain) | Chaveiros e identificacao | texto, encaixe/fixação, medidas |
| 94 | [Carimbo de Brigadeiro com Imagem](https://www.mafagrafos.com/models/image-brigadeiro-stamp) | Corte, carimbo e relevo | imagem/SVG, medidas |
| 95 | [Gerador de Quebra-Cabeça](https://www.mafagrafos.com/models/image-puzzle) | Objetos e decoracao | imagem/SVG, medidas |
| 96 | [Ejetor de Brigadeiro Arredondado](https://www.mafagrafos.com/models/candy-mold-rounded) | Corte, carimbo e relevo | imagem/SVG |
| 97 | [Ejetor de Brigadeiro](https://www.mafagrafos.com/models/candy-mold) | Corte, carimbo e relevo | imagem/SVG |
| 98 | [Chaveiro NFC Quadrado](https://www.mafagrafos.com/models/square-nfc-keychain) | Chaveiros e identificacao | NFC, imagem/SVG, camadas/peças, encaixe/fixação |
| 99 | [Letreiro de @social - 2 Cores + QR Code](https://www.mafagrafos.com/models/social-handle-offset-2color-qr-code) | QR, Pix e cartoes | QR/PIX, imagem/SVG, texto, camadas/peças |
| 100 | [Gerador de Cortador de Biscoito](https://www.mafagrafos.com/models/cookie-cutter-generator) | Corte, carimbo e relevo | imagem/SVG, medidas |
| 101 | [Colorir com Imagem Afundada - Offset](https://www.mafagrafos.com/models/sunken-image-coloring-offset) | Corte, carimbo e relevo | imagem/SVG |
| 102 | [Colorir com Imagem Afundada - Forma](https://www.mafagrafos.com/models/sunken-image-coloring) | Corte, carimbo e relevo | imagem/SVG |
| 103 | [Contador Raspadinha](https://www.mafagrafos.com/models/scratch-off-counter) | Objetos e decoracao | validar ficha |
| 104 | [Porta-Canetas Paramétrico](https://www.mafagrafos.com/models/sized-pen-holder) | Objetos e decoracao | encaixe/fixação, medidas |
| 105 | [String Art - Coração Flutuante](https://www.mafagrafos.com/models/string-art-heart-name-vertical-floating) | Letras e letreiros | imagem/SVG, texto, camadas/peças |
| 106 | [String Art - Retângulo](https://www.mafagrafos.com/models/string-art-rectangle-name-radial) | Letras e letreiros | imagem/SVG, texto, camadas/peças |
| 107 | [@Social - String Art](https://www.mafagrafos.com/models/social-handle-string-art-floating) | Letras e letreiros | texto |
| 108 | [Letreiro de Letras Separadas - 2 Cores](https://www.mafagrafos.com/models/separate-letters-offset-2color) | Letras e letreiros | imagem/SVG, texto, camadas/peças, medidas |
| 109 | [Letreiro de Letras Separadas - 3 Cores](https://www.mafagrafos.com/models/separate-letters-offset-3color) | Letras e letreiros | imagem/SVG, texto, camadas/peças, encaixe/fixação, medidas |
| 110 | [@social - 3 Cores](https://www.mafagrafos.com/models/social-handle-offset-3color) | Letras e letreiros | imagem/SVG, texto, camadas/peças, encaixe/fixação |
| 111 | [@social - 2 Cores](https://www.mafagrafos.com/models/social-handle-offset-2color) | Letras e letreiros | imagem/SVG, texto, camadas/peças, encaixe/fixação |
| 112 | [Chaveiro com Nome Completo](https://www.mafagrafos.com/models/full-name-keychain) | Chaveiros e identificacao | texto, medidas |
| 113 | [@social - Retângulo - 3 Cores](https://www.mafagrafos.com/models/social-handle-rectangle-3color) | Letras e letreiros | imagem/SVG, texto, camadas/peças, encaixe/fixação, textura |
| 114 | [@social - Retângulo - 2 Cores](https://www.mafagrafos.com/models/social-handle-rectangle-2color) | Letras e letreiros | imagem/SVG, texto, camadas/peças, encaixe/fixação, textura |
| 115 | [Letreiro de Palavra - 3 Camadas](https://www.mafagrafos.com/models/word-offset-3color) | Letras e letreiros | imagem/SVG, texto, camadas/peças, medidas |
| 116 | [Letreiro de Palavra - Offset - 2 Camadas](https://www.mafagrafos.com/models/word-offset-2color) | Letras e letreiros | texto, camadas/peças |

## Limites desta auditoria

- A presença de um sinal técnico numa ficha não comprova como o gerador implementa o recurso; parâmetros exatos, tolerâncias e qualidade de malha exigem validação própria.
- Nenhum modelo acima está marcado como equivalente no Formma3D apenas por existir um card ou editor genérico.
- Próxima revisão: detalhar parâmetros, peças geradas, formatos de exportação e critérios de aceite por núcleo priorizado.
