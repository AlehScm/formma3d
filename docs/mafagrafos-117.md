# Mafagrafos — auditoria das opções por modelo

Consulta em 1º de outubro de 2026. O [índice público oficial](https://www.mafagrafos.com/models) apresentou **117 modelos distintos** na busca atual. Este documento registra o que as fichas oficiais declaram para cada modelo; não é uma cópia de software, arquivo 3D ou arte.

## O que foi e não foi verificado

- **Verificado:** nome/família do modelo e opções, variações, peças ou formatos explicitamente descritos nas fichas públicas. Cada entrada aponta para a ficha original.
- **Não verificado:** formulário do gerador, nomes reais dos controles, faixas e valores iniciais quando não publicados, comportamento de edição, validação, malha resultante, qualidade de encaixe e arquivos efetivamente baixados. O navegador interativo não conseguiu abrir o site nesta sessão; não houve login ou geração.
- **Interpretação:** “recriar exatamente” só pode ser avaliado com testes dentro do gerador, exemplos exportados e comparação geométrica/funcional. Até lá, o plano é reproduzir **capacidades e fluxos equivalentes com implementação e templates originais**.
- **Uso de templates:** ficha pública ou licença de venda de impressões não comprova direito de reutilizar STL/3MF/DXF, artes, imagens, fontes, logos ou código de terceiros no Formma3D. Para usar arquivos idênticos, precisamos de licença/autorização específica do titular ou dos arquivos originais do usuário.

## Modelo recém-indexado

117. [Porta-Retrato Suspenso](https://www.mafagrafos.com/models/hanging-photo-holder) — Entradas/opções: texto ou design próprio em alto-relevo; tamanhos pequeno (102 × 142 mm), 10×15 (142 × 202 mm) e três fotos (242 × 142 mm); imagem colorida face para cima ou para baixo. Saída/peças: moldura inferior e superior em cores distintas, unidas por pequenos pinos; design impresso separadamente; AMS descrito como necessário somente para imagem colorida; DXF correspondente à forma da moldura com recorte do design. Não confirmado: controles exatos, dimensões de pinos, parâmetros de cor, conteúdo real de exportação e encaixe. Evidência: [trecho oficial indexado](https://www.mafagrafos.com/models/hanging-photo-holder); abertura direta falhou, gerador não observado.

## Fichas 1–39

# Auditoria Mafagrafos — índices 1–39

Consulta das fichas públicas: 2026-10-01. Escopo: descrições textuais das fichas oficiais, sem interação nos geradores, login, download ou inspeção de assets/código. **Evidência em todas as entradas abaixo: ficha pública; gerador observado: não.** “Não confirmado” abrange controles exatos, limites/faixas, valores padrão e resposta interativa, salvo quando a ficha informa explicitamente um valor.

1. [Carimbos de Massinha](https://www.mafagrafos.com/models/play-douh-stamps) — Entradas/opções: desenho, texto, ícones ou imagem ao redor do cilindro; até 6 discos dupla face (12 designs), organizados em páginas frente/verso; modo SingleColor ou DualColor; espessura do disco, altura do relevo frontal, profundidade do baixo-relevo traseiro e altura da textura ajustáveis. Um par de páginas vazio não gera disco. Saída/peças: corpo e tampa rosqueada em STL; conjunto de discos em 3MF; disco de 45,6 mm de diâmetro, cilindro interno de 47,8 mm e externo de 53,4 mm. A ficha cita 12 animais como demonstração, mas essa arte não integra a especificação reutilizável. Não confirmado: controles interativos, faixas/defaults, geometria/encaixe real e arquivos exportados em teste. Evidência: [trecho oficial indexado](https://www.mafagrafos.com/models/play-douh-stamps); a abertura direta falhou; gerador não observado.
2. [Enfeite Floco de Neve](https://www.mafagrafos.com/models/snowflake-ornament) — Entradas/opções: qualquer nome; arte SVG personalizável; cores distintas para floco, argola e nome. Saída/peças: enfeite plano multicolorido com argola integrada; sem suportes. Não confirmado: fonte, limites de nome, dimensões, espessuras, parâmetros de cor/exportação e defaults. Evidência: ficha.
3. [Mini-Microfone](https://www.mafagrafos.com/models/mini-microphone) — Entradas/opções: design/logo em editor de design, até 3 páginas (uma por lado); placas frontais/laterais direita e esquerda opcionais; orientação da placa com face para cima (relevo) ou para baixo (incrustação nivelada). Saída/peças: Cube, Head, HandleAndConnector e Cover1/2/3 opcionais; lado sem arte não gera placa; cabeça texturizada, pino e cabo. Ficha informa compatibilidade com transmissor Hollyland e tempos/pesos de impressão. Não confirmado: modelos/tamanhos exatos compatíveis, controles, medidas, limites do editor e formatos de arquivo. Evidência: ficha.
4. [Gerador de Abridor de Latas (NFC)](https://www.mafagrafos.com/models/can-opener-nfc) — Entradas/opções: SVG para topo; posição/rotação livre da abertura; fixação por furo ou argola; colocação de tag NFC. Saída/peças: orientação face para cima (multicor AMS ou pausa/troca manual), face para baixo (design separado colado) ou uma cor por camada; NFC fica selado após pausa de impressão. Não confirmado: dimensões NFC/abertura, faixas, tamanhos, defaults e nomes/formato de exportação. Evidência: ficha.
5. [Gerador de Chaveiro NFC](https://www.mafagrafos.com/models/nfc-keychain-generator) — Entradas/opções: arte criada no editor com cor por subcamada; profundidade do bolso NFC; borda em relevo opcional; furo ou argola. Ficha cita bolso 0,6 mm para adesivos e 1,2 mm para tags grossas; pausa antes de fechar. Saída/peças: modos SideUp, SideDown e OneColorPerLayer. Não confirmado: limites dos controles, dimensões de tag suportadas, valores padrão, arquivos/formatos efetivamente gerados. Evidência: ficha.
6. [Gerador de Chaveiro](https://www.mafagrafos.com/models/keychain-generator) — Entradas/opções: SVG próprio de ícone/logo no editor; espessuras da base e do design controladas independentemente; furo ou argola. Saída/peças: arquivos separados face para cima/baixo ou uma placa em uma cor por camada (multicor). Não confirmado: faixas, medidas, defaults, quantidade de peças/arquivos e formatos. Evidência: ficha.
7. [Gerador de Porta-Canetas](https://www.mafagrafos.com/models/design-pen-holder) — Entradas/opções: texto ou imagem para design; base e peça de design paramétricas; cores distintas sugeridas. Saída/peças: base e design impressos separadamente. Não confirmado: campos exatos da base/design, limites, fontes, dimensões, fixação e formatos. Evidência: ficha.
8. [Chaveiro Carretel de Filamento com NFC](https://www.mafagrafos.com/models/filament-spool) — Entradas/opções: FilamentColor, BaseColor, HasNFC (opcional), NFCIndicatorColor e Tolerance ajustável; tag inserida durante pausa antes do fechamento. Saída/peças: Spool e NFC Base separados, com encaixe. Não confirmado: valores/faixas de tolerância, medidas NFC, defaults e formato de exportação. Evidência: ficha.
9. [Quadro de Tecido](https://www.mafagrafos.com/models/fabric-floating-sign) — Entradas/opções: texto ou arte; uso de tule/organza, inseridos com pausa por volta da camada 4–5 e presos por ímãs. Saída/peças: quadro com arte, capa de acabamento e base de apoio (três partes). Não confirmado: campos do conteúdo, dimensões, tolerâncias, cores, formatos e camada exata conforme configuração. Evidência: ficha.
10. [Cartão de Visita com Tecido](https://www.mafagrafos.com/models/fabric-business-card) — Entradas/opções: tecido inserido na pausa da camada 2; NFC opcional com inserção na camada 5–6; QR code opcional usando link curto. Saída/peças: cartão impresso em camadas que capturam tecido e, opcionalmente, tag NFC. Ficha menciona porta-cartões relacionado, impresso de lado com fuzzy skin opcional (não é saída descrita deste cartão). Não confirmado: campos de cartão/QR, limites, dimensões, arquivos/formatos e comportamento do NFC além da descrição. Evidência: ficha.
11. [Cartão de Visita](https://www.mafagrafos.com/models/regular-business-card) — Entradas/opções: texto/informação e QR code; textura opcional Hilbert Curve a 70% apenas na base. Saída/peças: SideUp.3mf (face para cima/relevo) ou SideDown.3mf (face para baixo). Não confirmado: dimensões, campos exatos, limites, defaults e parâmetros além da textura descrita. Evidência: ficha.
12. [Placas Profissionais](https://www.mafagrafos.com/models/profession) — Entradas/opções: nome, símbolo de profissão e cores; pesos opcionais adicionados durante pausa. Saída/peças: base, peça de nome e símbolo separados; encaixes por pequena sobreposição; base encaixa diagonalmente; ficha declara caber em A1 256×256. Não confirmado: lista de profissões/símbolos, campos, dimensões individuais, tolerâncias, defaults e formatos. Evidência: ficha.
13. [Porta-Pente para Cílios](https://www.mafagrafos.com/models/lash-holder) — Entradas/opções: textura ou design SVG no exterior; fuzzy skin exterior opcional com configurações citadas (distância 0,2; espessura 0,12; costura aleatória). Saída/peças: recipiente cilíndrico e tampa rosqueada, furo de chaveiro na tampa; ficha recomenda 0,16 alta qualidade sem suportes. Não confirmado: dimensões do pente/recipiente, rosca e tolerâncias, controles e defaults do gerador. Evidência: ficha.
14. [Luminária Letra Grande com Nome](https://www.mafagrafos.com/models/big-letter-lamp) — Entradas/opções: letra única grande, nome sobreposto; LED COB 5V; tampa traseira mais opaca com 7–8 camadas superiores/inferiores. Saída/peças: tampa traseira, frente e nome separados; suportes necessários na tampa frontal. Ficha informa exemplos de peso/tempo a 0,16 mm. Não confirmado: seleção de letras/fontes, faixa de tamanho, dimensão do canal/LED, campos, defaults e formatos. Evidência: ficha.
15. [Gerador de Chaveiro com Sobreposição](https://www.mafagrafos.com/models/overlay-keychain) — Entradas/opções: texto ou imagem sobre o corpo; dimensões ajustáveis. Saída/peças: três arquivos/modos: face para baixo, face para cima ou modelo multipartes; sobreposição separável da base para duas cores. Não confirmado: valores dimensionais, furo/argola, limites, defaults e formatos/extensões dos três arquivos. Evidência: ficha.
16. [Placa de Listras com Base](https://www.mafagrafos.com/models/stripes-plaques) — Entradas/opções: arte/layout no editor estilo Canva; flexibilidade de design descrita. Saída/peças: placa renderizada em listras com base; modo multipartes ou face para cima. Não confirmado: controles da arte/listras, dimensões, número de partes/camadas, limites, defaults e formatos. Evidência: ficha.
17. [Placa de Line Art](https://www.mafagrafos.com/models/line-art-plaque) — Entradas/opções: imagem line art enviada; ferramenta de Edição para conectar linhas desconectadas; ficha sugere traços de 2 mm no prompt de geração de imagem. Saída/peças: placa com base integrada para ficar em pé; objetivo de formar peça conectada. Não confirmado: formatos de entrada, ferramentas/controles da edição, espessuras efetivas, dimensões e formatos de saída. Evidência: ficha.
18. [Gerador de Topo de Bolo](https://www.mafagrafos.com/models/cake-topper-generator) — Entradas/opções: mensagem/texto, seleção entre fontes, imagens; impressão face para cima ou para baixo; multicolorida. Saída/peças: topo de bolo com as orientações descritas; não há peças separadas especificadas. Não confirmado: lista de fontes, quantidade de imagens/cores, dimensões, limites, defaults e formatos de arquivo. Evidência: ficha.
19. [Troféu Imagem + Texto](https://www.mafagrafos.com/models/text-image-trophy) — Entradas/opções: imagem, texto ou ambos; arte totalmente conectada ou borda fechada com fundo opcional; texto gravado na base ou placa personalizada separada; pesos na cavidade da base. Saída/peças: base, topo, imagem e placa separáveis para multicor; exemplos de modelos/pesos listados. Não confirmado: controles de conexão/gravura, limites, medidas, valores padrão, encaixes e formatos. Evidência: ficha.
20. [Carimbo Circular de Imagem](https://www.mafagrafos.com/models/rounded-circle-stamp) — Entradas/opções: imagem própria em SVG; ajustar tamanho, posição e base; até 6 imagens numa impressão; borda e furo para chaveiro opcionais. Saída/peças: carimbo circular; ficha não discrimina arquivos ou partes separadas. Não confirmado: faixas de tamanho/posição, controles da base, limites de imagens além do máximo citado, defaults e formatos. Evidência: ficha.
21. [Display para Salão de Unhas](https://www.mafagrafos.com/models/nail-salon-display) — Entradas/opções: logo, duas linhas de texto e fontes; decoração da base Estrelas, Laço, Floral ou SVG próprio; face para cima, para baixo ou dupla face; layout da mão esquerda/direita; base/design/borda com cores separadas. Saída/peças: placa multicor; modos de orientação descritos. Não confirmado: fontes, medidas, campos do logo, parâmetros/limites e formatos de exportação. Evidência: ficha.
22. [Carimbo de Letras/Números](https://www.mafagrafos.com/models/text-brigadeiro-stamp) — Entradas/opções: caracteres digitados; até 9 carimbos por exportação; fontes Bebas Neue, Cal Sans, Montserrat, Pacifico e Roboto Mono; marca opcional (letra ou logo) na parte inferior; base/topo em cores separadas. Saída/peças: até nove carimbos; base e topo com cores distintas. Não confirmado: faixa de caracteres por carimbo, limites/tamanhos, defaults, extensão/formato e se as peças exportam individualmente. Evidência: ficha.
23. [@social - Luminária de LED](https://www.mafagrafos.com/models/social-handle-simple-lamp) — Entradas/opções: texto/@social; três formas de base (Offset, Offset com Base, Retângulo); furo traseiro opcional para cabo; duas cores (base e texto); fita LED COB traseira. Saída/peças: base e texto em cores distintas conforme descrição. Não confirmado: dimensões/limites, tipo/medida de LED, parâmetros do furo, defaults, nomes/formatos de exportação. Evidência: ficha.
24. [Chaveiro com Nome e Logo](https://www.mafagrafos.com/models/logo-text-keychain) — Entradas/opções: nome e logo/imagem simples; até 9 nomes por vez. Saída/peças: chaveiros compactos em uma impressão conforme ficha; separação e orientação não especificadas. Não confirmado: fontes, tamanhos, forma/fixação, limite de caracteres, defaults e formatos. Evidência: ficha.
25. [Ejetor Arredondado com Escala de Forma](https://www.mafagrafos.com/models/scale-dome-ejector) — Entradas/opções: forma fechada personalizada; recomenda formas simples/arredondadas e evitar pontas/entradas profundas. Saída/peças: ejetor/molde com escala gradual do formato grande para pequeno e perfil arredondado. Não confirmado: campos ajustáveis, dimensões, número de etapas, limites, defaults, peças exportadas e formatos. Evidência: ficha.
26. [Ejetor de Cúpula Arredondada](https://www.mafagrafos.com/models/rounded-dome-ejector) — Entradas/opções: imagem/desenho fechado; tamanho do carimbo, profundidade, espaçamento e suavização ajustáveis; recomenda formas simples e linhas espessas. Saída/peças: conjunto completo, molde ou ejetor exportados separadamente em STL. Não confirmado: faixas/defaults dos quatro parâmetros, dimensões e limites de imagem; impressão sugerida 0,08–0,12 mm não comprova valor do gerador. Evidência: ficha.
27. [Lista Vertical de Códigos QR](https://www.mafagrafos.com/models/vertical-qr-code-list) — Entradas/opções: até 9 tipos diferentes de QR; controlar quantidade, espaçamento e dimensões; tipos: links personalizados, WiFi, WhatsApp, Instagram, TikTok, YouTube, PIX e Google Reviews. Saída/peças: visor vertical compacto, impressão padrão sem suportes. Não confirmado: campos específicos por tipo, limites de dimensão/espaçamento, defaults, separação de peças e formato. Evidência: ficha.
28. [Lista Vertical em Camadas de Códigos QR](https://www.mafagrafos.com/models/layered-vertical-qr-code-list) — Entradas/opções: múltiplos QR codes/camadas; controlar espaçamento e dimensões; logo e informação de contato por camada; cores/materiais diferentes. Saída/peças: QR codes empilhados verticalmente, cada um em camada própria; design de tábua de fundo. Não confirmado: quantidade máxima, tipos de QR, campos, dimensões, defaults e formatos. Evidência: ficha.
29. [Lista Horizontal de Códigos QR](https://www.mafagrafos.com/models/horizontal-qr-code-list) — Entradas/opções: até 9 tipos diferentes de QR; quantidade, espaçamento e dimensões; tipos: links personalizados, WiFi, WhatsApp, Instagram, TikTok, YouTube, PIX e Google Reviews. Saída/peças: visor horizontal compacto, impressão padrão sem suportes. Não confirmado: campos específicos por tipo, limites de dimensão/espaçamento, defaults, separação de peças e formato. Evidência: ficha.
30. [Google Review - Placa de QRCode](https://www.mafagrafos.com/models/google-review-qr-code) — Entradas/opções: URL de avaliação Google; dimensões ajustáveis. Saída/peças: placa com QR gerado automaticamente; não há exportações separadas especificadas. Não confirmado: demais textos/imagens/montagem, faixas de tamanho, defaults, formato de arquivo e validação de QR. Evidência: ficha.
31. [Placa de QRCode WiFi](https://www.mafagrafos.com/models/wi-fi-qr-code) — Entradas/opções: nome da rede e senha; tamanho, opções de montagem e estilo ajustáveis. Saída/peças: QR WiFi; exportação como modelo 3D, componente de suporte ou suporte com furo de montagem. Não confirmado: campos adicionais (p.ex. segurança/oculta), limites/defaults, dimensões e extensões de exportação. Evidência: ficha.
32. [Social - Placa de QRCode](https://www.mafagrafos.com/models/social-qr-code) — Entradas/opções: URLs de perfis; múltiplas plataformas (Instagram, Facebook, TikTok, YouTube ou outras); tamanho ajustável. Saída/peças: placa com múltiplos QR codes gerados automaticamente. Não confirmado: quantidade máxima, layout, campos/limites por plataforma, montagem, defaults e formato. Evidência: ficha.
33. [Placa de QRCode com Texto](https://www.mafagrafos.com/models/text-qr-code-plaque) — Entradas/opções: URL/informação para QR; texto descritivo acima ou abaixo; conteúdo, tamanho da fonte e dimensões ajustáveis. Saída/peças: modelo 3D, componente de suporte ou suporte com furo de montagem. Não confirmado: faixas/defaults, SVG/logo, variações de layout e extensão de arquivo. Evidência: ficha.
34. [Placa de QRCode WhatsApp](https://www.mafagrafos.com/models/whats-app) — Entradas/opções: número de WhatsApp; tamanho da placa, montagem e estilo ajustáveis. Saída/peças: QR de contato gerado automaticamente; modelo 3D, componente de suporte ou suporte com furo de montagem. Não confirmado: formato do telefone, limites/defaults, campos adicionais, dimensões e extensões. Evidência: ficha.
35. [Placa de QRCode com Logo](https://www.mafagrafos.com/models/logo-qr-code-plaque) — Entradas/opções: link/informação para QR; logo/imagem central; posição e tamanho do logo e dimensões da placa ajustáveis. Saída/peças: modelo 3D, componente de suporte ou suporte com furo de montagem. Não confirmado: formato do logo, limites/defaults, correção/validação do QR e extensões dos arquivos. Evidência: ficha.
36. [Suporte para Palitos](https://www.mafagrafos.com/models/stick-stand) — Entradas/opções: base fina ou espessa (cavidade interna para peso); diâmetro do furo de 2–10 mm; quatro suportes curvos ajustáveis. Saída/peças: peça única, impressão sem suportes; descrição informa uso mínimo de material. Não confirmado: outros controles/faixas, dimensões gerais, defaults, tolerância do furo e formato. Evidência: ficha.
37. [Suporte de Bolo](https://www.mafagrafos.com/models/cake-stand) — Entradas/opções: diâmetro superior, altura, proporções da base, texto/nome de marca, tamanho das ondulações, detalhes de borda, espessura superior, largura de linha e padrões decorativos. Saída/peças: peça única, sem suportes. Não confirmado: faixas/defaults, carga suportada, materiais e formatos de exportação. Evidência: ficha.
38. [Caixa de Figurinhas](https://www.mafagrafos.com/models/stickers-box) — Entradas/opções: design do topo; texto no fundo; dimensões, profundidade, cores, fontes e layouts ajustáveis. Saída/peças: caixa, suporte removível e tampa imprimem separadamente; acesso às figurinhas por baixo. Não confirmado: dimensões/faixas, mecanismo e tolerâncias, limites/defaults e formatos. Evidência: ficha.
39. [Suporte de Foto com Texto](https://www.mafagrafos.com/models/photo-holder) — Entradas/opções: texto; fonte, tamanho e espaçamento ajustáveis; 15+ fontes (exemplos Luckiest Guy, Pacifico, Bebas Neue); impressão invertida da base; colagem das letras. Saída/peças: base com slot/fenda para foto e texto separado; sem suportes. Não confirmado: formatos/dimensões de foto, limites/defaults do texto, lista completa de fontes e formatos de exportação. Evidência: ficha.

## Lacunas comuns

- Nenhuma ficha foi testada no gerador; não há campos, defaults nem comportamento interativo observados neste lote. As descrições não bastam para afirmar paridade funcional.
- Em geral, faltam faixas numéricas, dimensões de referência, tolerâncias/encaixes, validação de entradas e nomes/extensões dos arquivos gerados. Só foram registrados números e formatos citados literalmente nas fichas.
- A abertura direta da ficha 1 falhou, mas um trecho indexado da ficha oficial trouxe as opções acima. As demais 38 fichas foram abertas; nenhuma sessão interativa foi observada. Nenhuma tentativa de login foi feita.

## Fichas 40–78

# Auditoria Mafagrafos — índices 40–78

Escopo: fichas oficiais abertas em `https://www.mafagrafos.com/models/<slug>`. Evidência abaixo é exclusivamente texto da ficha. Nenhum gerador/editor interativo, upload, cálculo ou exportação foi observado; portanto nomes exatos de controles, limites completos, defaults e comportamento interativo permanecem sem confirmação, salvo quando explicitamente indicados. “Impressão em X cores/peças” não implica formato de arquivo; só afirmo exportação quando a ficha o declara.

| Nº | Modelo e ficha | Entradas/opções explicitamente citadas | Saída/peças/exportação explicitamente citadas | Não confirmado | Evidência |
|---:|---|---|---|---|---|
| 40 | [Topo de Bolo Circular com Glitter](https://www.mafagrafos.com/models/circle-glitter-cake-topper) | Nome e número (fontes/tamanhos escolhidos); imagem pequena ou glitter real para janela; diâmetro, borda, parede e espessura ajustáveis. | Base circular; nome e número em base e camada superior separadas; janela para imagem/glitter entre folhas de acetato; peças planas, sem suportes. Sem formato de exportação citado. | Campos, limites, default, tipo/limites da imagem e exportação. | Ficha; gerador não observado. |
| 41 | [Cortadores de Retângulos em Grade](https://www.mafagrafos.com/models/rectangle-cutters) | Largura/altura de cada retângulo em mm; número de linhas/colunas; nome da marca nas abas; arredondamento opcional dos cantos. | Cortador com vários retângulos em grade, abas laterais. Exportação/peças separadas não citadas. | Faixas e defaults de medidas/grade/raio, texto de marca e formatos. | Ficha; gerador não observado. |
| 42 | [Estojo de Batom - Ícone em Mosaico](https://www.mafagrafos.com/models/small-texture-lipstick-case) | Ícone repetido; nome gravado; altura e diâmetro internos. | Estojo com corpo texturizado em mosaico e tampa alinhada ao padrão; impressão sem suportes. Sem exportação citada. | Fonte, limites, defaults, encaixe/tolerâncias, se tampa é peça/export separado. | Ficha; gerador não observado. |
| 43 | [Estojo de Batom - Textura Grande](https://www.mafagrafos.com/models/large-texture-lipstick-case) | Imagem/textura que envolve o corpo; nome gravado; altura e diâmetro internos. | Corpo texturizado e tampa alinhada à textura; impressão sem suportes. Sem exportação citada. | Formato/limites da imagem, dimensões, defaults, rosca/encaixe e arquivos. | Ficha; gerador não observado. |
| 44 | [Estojo de Batom - Nome](https://www.mafagrafos.com/models/name-lipstick-case) | Nome; altura e diâmetro internos medidos para o batom; Fuzzy Skin indicado apenas nas paredes externas (orientação de fatiador). | Corpo com nome e tampa rosqueada alinhada; sem suportes. Sem exportação citada. | Campos e limites exatos, parâmetros da rosca/tolerância, default e formatos. | Ficha; gerador não observado. |
| 45 | [Estojo de Batom](https://www.mafagrafos.com/models/plain-lipstick-case) | Altura/diâmetro internos; furo para chaveiro opcional na tampa; Fuzzy Skin compatível nas paredes externas (orientação de fatiador). | Corpo e tampa rosqueada; sem suportes. Arquivos/formatos não citados. | Valores-limite/default, parâmetros da rosca e dimensões do furo, peças/exportação. | Ficha; gerador não observado. |
| 46 | [Letreiro com Sobreposição de Palavras](https://www.mafagrafos.com/models/big-word-letreiro) | Duas palavras; fontes, tamanhos e posições próprios; emojis; adornos opcionais Coração/Arabesco. | Palavra grande de fundo e palavra pequena separadas para impressão multicolorida. Formato de exportação não citado. | Campos exatos/limites, encaixe dimensional alegado sem tolerância, defaults, exportação e quantidade final de arquivos. | Ficha; gerador não observado. |
| 47 | [Rolo de Textura - Mosaico](https://www.mafagrafos.com/models/tiled-texture-roller) | Imagem pequena de mosaico; quantidade de blocos horizontal/vertical; deslocamento de linhas opcional; diâmetro/altura; textura positiva ou negativa. | Um rolo cilíndrico com padrão repetido. Não cita arquivos nem divisão em peças. | Formato/tamanho da imagem, limites e defaults de contagem/dimensões/profundidade, exportação. | Ficha; gerador não observado. |
| 48 | [Rolo de Textura - Imagem Grande](https://www.mafagrafos.com/models/large-texture-roller) | Uma imagem para envolver o cilindro; diâmetro/altura ajustáveis; relevo positivo ou negativo. Textura tile pode continuar sem emenda. | Rolo cilíndrico com superfície envolvida por imagem. Nenhum formato citado. | Entrada/formato de imagem, valores-limite/default, tratamento de imagem não tile, profundidade e exportação. | Ficha; gerador não observado. |
| 49 | [Gerador de Abridor de Latas](https://www.mafagrafos.com/models/can-opener) | SVG próprio no topo; posição e rotação livres da abertura funcional; escolher furo ou argola para chaveiro; imprimir face para cima (AMS/pausa e troca), face para baixo com design colado, ou uma cor por camada. | Abridor/chaveiro; design pode ser separado e colado ou impresso multicolor/por camada. Sem formato de arquivo declarado. | Faixas, defaults, geometria da abertura, número/arquivos de cada modo e exportação. | Ficha; gerador não observado. |
| 50 | [Rosa com Nome](https://www.mafagrafos.com/models/rose-with-name) | Um nome por rosa; gerar até 9 nomes/rosas em lote. | Rosas compactas, cada uma com nome; desenho de cor única. Não declara exportação. | Campos, limite inferior, fontes, dimensões, arranjo/saída do lote e arquivos. | Ficha; gerador não observado. |
| 51 | [Chaveiro com Espelho e Texto](https://www.mafagrafos.com/models/mirror-text-keychain) | Texto em arco; emoji opcional no início e fim; emoji ou imagem SVG opcional na base. | Base para espelho circular; chaveiro, texto e design da base com cores separadas, AMS citado. Exportação não especificada. | Diâmetro/espessura do espelho, limites de texto/emoji/posição, dimensões, defaults e arquivos. | Ficha; gerador não observado. |
| 52 | [Chaveiro de Rosa com Texto](https://www.mafagrafos.com/models/rose-text-keychain) | Frase em arco; emojis nas pontas usando Noto Emoji; ângulo inicial, raio e tamanho da fonte ajustáveis. | Base, rosa, folhas e texto em cores separadas (AMS). Não especifica exportação/arquivos. | Faixas/defaults de arco e fonte, campos, dimensões, peças e formato de exportação. | Ficha; gerador não observado. |
| 53 | [Rosa para Scrunchie](https://www.mafagrafos.com/models/rose-scrunchie) | Nome/mensagem em arco; furo para passar scrunchie enrolado. | Camadas separadas para base, rosa, folhas e texto; otimizadas para reduzir trocas de cor; ficha estima ~6 g por peça. | Campos exatos/limites/default, geometria do furo, sequência/arquivos exportados e peso real. | Ficha; gerador não observado. |
| 54 | [Pingente de Nomes da Família](https://www.mafagrafos.com/models/family-pendant) | Nome por membro/pet/formato personalizado; largura de cada peça 40–100 mm; várias fontes; ícones citados: coração, pata, gato e onda oval. | Peças individuais conectáveis por furos para barbante/corrente; base, texto e decoração em cores diferentes via AMS ou troca de cor. Exportação não citada. | Quantidade máxima, altura/espessura, campos, limites dos nomes e arquivos por peça. | Ficha; gerador não observado. |
| 55 | [Marcador de Página do Castelo](https://www.mafagrafos.com/models/harry-potter-bookmark) | Texto/nome lateral; fontes Cal Sans, Bebas Neue, Arial, Helvetica ou sans-serif; comprimento/largura ajustáveis. | Marcador com castelo e vassoura; ficha declara exportação 3MF para multicolor AMS. | Limites/defaults, edição dos motivos, estrutura de objetos no 3MF e outras exportações. | Ficha; gerador não observado. |
| 56 | [Marcador de Página Geométrico com Nome](https://www.mafagrafos.com/models/geometric-name-side-bookmark) | Nome/mensagem lateral; fontes Cal Sans, Bebas Neue, Arial, Helvetica ou sans-serif; comprimento/largura ajustáveis. | Padrão geométrico na frente e verso; ficha declara exportação 3MF para AMS. | Campos/limites/default, personalização do padrão, objetos e outros formatos. | Ficha; gerador não observado. |
| 57 | [Marcador Elegante com Nome](https://www.mafagrafos.com/models/elegant-grid-name-side-bookmark) | Nome/palavra lateral; várias fontes; espaçamento entre letras ajustável; fonte dimensionada automaticamente. | Aba com padrão de grade nos dois lados; cores separadas para texto e aba. Formato de exportação não citado. | Fontes disponíveis, limites/defaults, algoritmo/resultado do dimensionamento, arquivos. | Ficha; gerador não observado. |
| 58 | [Placa PIX Simples](https://www.mafagrafos.com/models/simple-pix-plaque) | Chave PIX e tipo (CNPJ, CPF, telefone, email ou aleatória); título editável mantendo logo PIX; largura, comprimento, espessura da borda e arredondamento ajustáveis. | QR gerado da chave/tipo; base, QR, logo, borda e texto em cores separadas. Recomenda validar QR no app bancário antes do download; formato não indicado. | Campos exatos/formatação e validação, limites/defaults, dimensões/camadas e formatos; QR não foi verificado. | Ficha; gerador e QR não observados. |
| 59 | [Placa PIX Logo](https://www.mafagrafos.com/models/logo-pix-plaque) | Chave e tipo PIX (CNPJ, CPF, telefone, email ou aleatória); logo SVG própria com tamanho/posição ajustáveis; dimensões, cores, fontes, borda e cantos customizáveis. | QR automático; base, QR, logo, borda e texto em cores separadas. Ficha orienta validar QR no app bancário; sem formato de saída especificado. | Exatidão da geração/validação do QR, limites/defaults, campos e exportações. | Ficha; gerador e QR não observados. |
| 60 | [Placa PIX Texto](https://www.mafagrafos.com/models/text-pix-plaque) | Chave/tipo PIX (CNPJ, CPF, telefone, email ou aleatória); duas linhas de texto no topo; tamanho, fontes, cores, bordas e cantos ajustáveis. | QR automático; base, QR, texto e borda com cores separadas. Recomenda conferir QR no app bancário; formato não citado. | Campos/validação QR, limites/default, peças/arquivos e exportação. | Ficha; gerador e QR não observados. |
| 61 | [Letra Grande - Textura](https://www.mafagrafos.com/models/big-letter-foreground-texture) | Letra/nome, fonte, tamanho, posição, escala e cores; SVG como textura elevada ou plana na face; texto/design também pode ser SVG. | Letra e nome impressos separadamente em duas partes; textura tem cor separada para multicolor. A ficha diz STL pré-ajustado ao tamanho, sem redimensionar. | Valores/defaults, limites do SVG, integração/encaixe, se a textura é terceira peça ou região, arquivos exatos. | Ficha; gerador não observado. |
| 62 | [Letra Grande - Nome Rebaixado](https://www.mafagrafos.com/models/big-letter-sunken-name) | Letra/nome, fonte, posição, rotação, espaçamento; SVG personalizado; borda decorativa opcional. | Letra e nome em duas peças separadas; nome rebaixado na letra para possível preenchimento com resina. | Limites/defaults, profundidades, tolerâncias/encaixe, arquivos e exportação. | Ficha; gerador não observado. |
| 63 | [Letra Grande - Borda para Resina](https://www.mafagrafos.com/models/big-letter-resin-casting) | Letra 40–280 mm de altura; nome/fonte/posição/rotação/espaçamento; SVG; borda elevada ajustável na letra, no nome ou em ambos. | Duas peças: letra e nome; bordas para receber resina; ficha afirma STL ajustado ao tamanho. | Defaults e limites das bordas e demais dimensões, encaixe/tolerâncias e número/formato de arquivos. | Ficha; gerador não observado. |
| 64 | [Letra Grande - Fundo Texturizado](https://www.mafagrafos.com/models/big-letter-textured-background) | Posição/nome/fonte/escala/rotação/espaçamento; SVG para padrão de fundo e SVG para desenho/fonte do nome. | Frente da letra e fundo texturizado separados; fundo exporta como 3MF multicolor. | Campos exatos/limites/default, peças contidas no 3MF, formato da frente e demais exportações. | Ficha; gerador não observado. |
| 65 | [Colorir com Bordas em Relevo](https://www.mafagrafos.com/models/raised-borders-coloring) | Imagem(ns); até 4 imagens em uma geração; tamanho ajustável 40–200 mm; opção de cor única ou multicolor. | Base preenchida lisa com bordas elevadas; até quatro desenhos para colorir. Não cita arquivos/exportação. | Formato da imagem, qual dimensão mede a faixa, defaults, profundidade/camadas e arquivos gerados. | Ficha; gerador não observado. |
| 66 | [Letra Grande Floral](https://www.mafagrafos.com/models/big-letter-floral-texture) | Letra, nome, fontes e tamanhos; SVG para nome; tamanho da letra, espessura da parede e posição do nome ajustáveis. | Fundo floral de duas camadas; cinco zonas de cor para AMS ou trocas manuais. Exportação não citada. | SVG aceito/limites/defaults, dimensões numéricas, correspondência de zonas a peças/arquivos. | Ficha; gerador não observado. |
| 67 | [Letra Grande - Fundo de Material](https://www.mafagrafos.com/models/big-letter-shell-eva) | Letra/nome/fonte/posição; SVG personalizado; espessura do material inserido ajustável. | Três peças: letra, nome e fundo separado para inserir EVA com glitter, feltro, papel ou material similar. | Limites/default da espessura e tamanho, dimensões/encaixe e arquivos de exportação. | Ficha; gerador não observado. |
| 68 | [Letra Grande - Brilho](https://www.mafagrafos.com/models/big-letter-sunken-sparkle) | Nome/fonte/posição/rotação/escala; SVG próprio; tamanho da letra, fonte, espessura da parede e offset ajustáveis. | Letra em duas partes com compartimento para glitter/material decorativo, a colar após enchimento; afirma montagem sem suportes. | Limites/defaults e geometria/abertura/volume do compartimento, arquivos, formatos. | Ficha; gerador não observado. |
| 69 | [Letra Grande - Nome](https://www.mafagrafos.com/models/big-letter-name) | Letra/nome/fontes/posição; SVG próprio para nome ou desenho. | Letra e nome em duas peças; ficha afirma STL pré-ajustado e tolerâncias para encaixe. | Faixa de tamanho, tolerâncias numéricas/defaults, outras dimensões e divisão/formato dos arquivos. | Ficha; gerador não observado. |
| 70 | [Marcador de Livro Floral com Nome](https://www.mafagrafos.com/models/floral-name-side-bookmark) | Nome/texto lateral; fontes Cal Sans, Bebas Neue, Arial e outras; comprimento e tamanho do texto ajustáveis. | Aba com padrão floral em ambos os lados; texto e aba em duas cores. Exportação não declarada. | Dimensões/limites/default, fontes disponíveis, peças/arquivos e formato. | Ficha; gerador não observado. |
| 71 | [Plaquinha de Pet Oval Ondulada](https://www.mafagrafos.com/models/pet-name-oval-wave) | Até 9 plaquinhas; vírgula separa entradas e `+` quebra linhas no verso; texto frontal e contato traseiro; argola ou furo; tamanho, fonte, cor e posição ajustáveis. | Plaquinhas ovais onduladas, frente/verso; geração em lote. Arquivos/formato não citados. | Faixas/defaults, nº de linhas/char permitidos, organização/arquivos do lote, exportação. | Ficha; gerador não observado. |
| 72 | [Plaquinha de Pet Oval](https://www.mafagrafos.com/models/pet-name-oval) | Mesmo contrato descrito nas fichas irmãs: até 9; vírgula separa plaquinhas, `+` quebra linhas no verso; nome frente/contato verso; argola ou furo; tamanho/fonte/cor/posição. | Plaquinha oval clássica em lote, frente e verso. Nenhum formato citado. | Campos exatos, faixas/defaults, limites de texto e organização/exportação do lote. | Ficha; gerador não observado. |
| 73 | [Plaquinha de Pet Peixinho](https://www.mafagrafos.com/models/pet-name-fish) | Até 9; vírgula separa plaquinhas, `+` separa linhas traseiras; nome frontal/contato no verso; argola ou furo; tamanho/fonte/cor/posição. | Plaquinha em formato de peixe; frente e verso; lote. Sem formato declarado. | Idem ficha (limites/defaults, texto, arquivos/exportação); formato visual não foi inspecionado no gerador. | Ficha; gerador não observado. |
| 74 | [Plaquinha de Pet Ossinho](https://www.mafagrafos.com/models/pet-name-dog-bone) | Até 9; vírgula separa plaquinhas, `+` divide linhas do verso; nome frente/contato verso; argola ou furo; tamanho/fonte/cor/posição. | Plaquinha em formato de osso; frente/verso e geração em lote. Sem exportação citada. | Idem ficha (faixas/defaults, limites textuais e arquivos/exportação). | Ficha; gerador não observado. |
| 75 | [Plaquinha de Pet Qualquer Formato](https://www.mafagrafos.com/models/generic-pet-name-tag) | SVG próprio para contorno; até 9 entradas; vírgula separa plaquinhas e `+` quebra linhas no verso; frente/verso; argola ou furo; tamanho/fonte/cor/posição. | Plaquinhas de contorno SVG, em lote, frente e verso. Nenhum formato de saída citado. | Restrições do SVG, limites/defaults, regras de texto, arquivos/exports. | Ficha; gerador não observado. |
| 76 | [Carimbo de Molde a partir de Texto](https://www.mafagrafos.com/models/mold-stamp-text) | Texto; fontes Cal Sans, Bebas Neue, Arial e outras; tamanho 50–300 mm; offset para conectar letras; inversão; apoio de polegar com posição/tamanho ajustáveis. | Molde/carimbo para massinha EVA; pode produzir desenho invertido/negativo. Não cita formato/exportação. | Qual eixo corresponde ao tamanho, limites/defaults das opções, superfície/detalhes e arquivos. | Ficha; gerador não observado. |
| 77 | [Carimbo de Molde a partir de Imagem](https://www.mafagrafos.com/models/mold-stamp-image) | SVG próprio; lado maior 40–300 mm; inversão; offset para conectar formas desconectadas; apoio de polegar com posição/tamanho ajustáveis. | Molde/carimbo para massinha EVA; possibilidade de desenho negativo. Formato de exportação não citado. | Regras de SVG, detalhes/limites/defaults de offset e apoio, arquivos gerados. | Ficha; gerador não observado. |
| 78 | [Letreiro de Palavra - 2 Linhas com Imagem - 3 Cores](https://www.mafagrafos.com/models/word-offset-3color-2lines-image) | Duas linhas com controle independente de fonte/tamanho; imagem SVG à esquerda ou direita; fontes por linha; opção de preencher buracos em letras. | Camadas base, intermediária e superior (três cores); impressão multicolor ou troca de cor; sem suportes. Não declara formato de exportação. | Campos/limites/defaults, formato/dimensões da imagem, preenchimento de buracos e arquivos gerados. | Ficha; gerador não observado. |

## Lacunas comuns observadas

- As fichas são descrições, não especificações completas dos controles. Salvo faixas explicitamente listadas acima, limites, defaults, unidades e validações de cada entrada não foram confirmados.
- Nenhum editor/gerador pôde ser identificado como link distinto nas fichas consultadas; o link de ação visível em uma ficha de pet apontou de volta à própria ficha. Não foi possível confirmar a experiência interativa.
- Nenhuma geração ou exportação foi executada. Formato citado apenas para os modelos 55 e 56 (3MF) e declarações pontuais de STL nos modelos 61, 63 e 69; isso não confirma conteúdo/validade dos arquivos.
- Os QR PIX (58–60), encaixes/tolerâncias, peças/colorização e resultados de lote permanecem declarações de ficha, não resultados verificados.

## Fichas 79–116

# Mafagrafos — fichas públicas 79–116

Consulta em 2026-10-01. Fonte de cada linha: ficha oficial vinculada. **Evidência: descrição pública, não formulário interativo.** As fichas não confirmam nomes exatos dos campos, valores padrão, limites não citados, algoritmos, nem todos os formatos de download. Não usar esta tabela como alegação de paridade ou autorização para copiar arquivos/identidade.

| # | Modelo | Entradas e opções explicitamente descritas | Saídas/variações explicitamente descritas |
|---:|---|---|---|
| 79 | [Letreiro 2 linhas, imagem, 2 cores](https://www.mafagrafos.com/models/word-offset-2lines-image) | Dois textos com fontes e tamanhos independentes; ajuste de tamanho; escolha de fontes; SVG opcional. | Base e topo em offset, duas cores; impressão multicolor ou troca de filamento. |
| 80 | [Placa multipart SVG, 3 camadas](https://www.mafagrafos.com/models/logo-offset-3colors) | Upload SVG; base retangular opcional; tamanho, espessura e offset por camada; cores por camada. | Base, camada intermediária e topo em três cores. |
| 81 | [Placa multipart SVG, 2 camadas](https://www.mafagrafos.com/models/logo-offset-2colors) | Upload SVG; base retangular opcional; tamanho, espessura, offset e cores. | Base e topo em offset, duas cores. |
| 82 | [Marcador com nome e imagem](https://www.mafagrafos.com/models/name-side-bookmark) | Nome/texto lateral, duas imagens (frente e verso), comprimento, tamanho do texto, espaçamento e fonte. | Opção multicolor AMS. |
| 83 | [Chaveiro de nome, 3 cores](https://www.mafagrafos.com/models/text-offset-keychain-3colors) | Até nove nomes; prefixo **ou** sufixo; duas linhas por nome com separador `+`; emoji no começo/fim; escolha entre 14 estilos de fonte. | Camadas base, meio e topo em três cores; lote de até nove. |
| 84 | [Chaveiro de nome, 2 cores](https://www.mafagrafos.com/models/text-offset-keychain-2colors) | Até nove nomes; prefixo **ou** sufixo; duas linhas por nome com `+`; emoji no começo/fim; 14 estilos de fonte. | Camadas base e topo em duas cores; lote de até nove. |
| 85 | [Cumbuca a partir de imagem](https://www.mafagrafos.com/models/bowl-anything) | SVG de forma fechada; relevo da imagem no fundo opcional; tamanho, espessura da casca, altura e arredondamento. | Compatibilidade declarada com modos vaso/normal/fuzzy; duas cores opcionais para cumbuca e fundo. |
| 86 | [Palavra e coração, 2 camadas](https://www.mafagrafos.com/models/word-heart-2colors) | Palavra/nome; fonte; tamanho do texto, espaçamento, cores e posição do coração. | Multipart em duas cores ou arquivo 3MF para AMS. |
| 87 | [Colorir em 2 partes](https://www.mafagrafos.com/models/2part-coloring-generator) | SVG; dimensão declarada de 40–300 mm; espessuras da base e das linhas; tolerância de encaixe. | Base para pintar + topo que encaixa e delimita as linhas. Requer borda externa; linhas desconectadas podem virar peças soltas. |
| 88 | [Texto com guia de posicionamento](https://www.mafagrafos.com/models/text-placement-helper) | Texto, tamanho final, fonte, espaçamento entre letras e espessura. | Letras e guia alinhador; divisão automática em peças com junção tipo quebra-cabeça para caber na impressora. |
| 89 | [Imagem 3D com borda para resina](https://www.mafagrafos.com/models/image-to3d-resin-border) | Até duas imagens; offset ajustável; borda externa, interna ao SVG ou ambas; altura da borda; argola opcional. | Duas peças/desenhos em um trabalho; cavidades com bordas altas para resina. |
| 90 | [Imagem multipartes](https://www.mafagrafos.com/models/image-multipart) | Imagem/SVG; tamanho final; quantidade de cores/peças conforme regiões da imagem; tolerância aplicada. | Base a partir das linhas pretas e peças internas a partir das áreas brancas. Não redimensionar o STL após gerar, para preservar folga. |
| 91 | [Chaveiro cenoura](https://www.mafagrafos.com/models/carrot-name-keychain) | Até nove nomes e escolha de fonte. | Lote de chaveiros temáticos; troca de cor AMS por camadas. |
| 92 | [Chaveiro coelho](https://www.mafagrafos.com/models/bunny-name-keychain) | Até nove nomes distintos. | Lote temático multicolor otimizado para menos trocas AMS. |
| 93 | [Chaveiro retangular com nome](https://www.mafagrafos.com/models/rectangle-name-keychain) | Até nove nomes; largura padrão 75 mm ajustável; texto se adapta automaticamente. | Até nove chaveiros numa impressão. |
| 94 | [Carimbo de brigadeiro com imagem](https://www.mafagrafos.com/models/image-brigadeiro-stamp) | Upload SVG; tamanho e profundidade da impressão ajustáveis. | Carimbo de doce com imagem própria. |
| 95 | [Quebra-cabeça de imagem](https://www.mafagrafos.com/models/image-puzzle) | SVG; 2–16 peças quadradas por linha; verso colorido opcional ou sem fundo. | Exportações FaceDown, FaceUp, Sunken, Frame e Stand; moldura e suporte opcionais. |
| 96 | [Ejetor arredondado de brigadeiro](https://www.mafagrafos.com/models/candy-mold-rounded) | SVG e quantidade de arredondamento da borda. | Molde/ejetor com marca arredondada. |
| 97 | [Ejetor plano de brigadeiro](https://www.mafagrafos.com/models/candy-mold) | SVG. | Molde/ejetor com marca plana. |
| 98 | [Chaveiro NFC](https://www.mafagrafos.com/models/square-nfc-keychain) | Forma: círculo, quadrado, coração, hexágono, estrela ou dodecágono; SVG; borda elevada opcional para resina. | Rebaixo para adesivo NFC de 25 mm; base, borda e arte em cores separadas. |
| 99 | [@social, 2 cores + QR](https://www.mafagrafos.com/models/social-handle-offset-2color-qr-code) | Identificador social e URL do QR. | Letreiro de duas cores/offset, QR lateral; AMS ou troca manual de cor. |
| 100 | [Cortador de biscoito](https://www.mafagrafos.com/models/cookie-cutter-generator) | SVG, altura do cortador e espessura da parede. | Cortador com contorno da imagem. |
| 101 | [Colorir afundado, offset](https://www.mafagrafos.com/models/sunken-image-coloring-offset) | SVG. | Canais rebaixados para pintura; fundo acompanha o contorno da imagem em offset. |
| 102 | [Colorir afundado, forma](https://www.mafagrafos.com/models/sunken-image-coloring) | A ficha não enumera controles. | Imagem rebaixada e bordas elevadas para delimitar pintura; forma de fundo não especificada. |
| 103 | [Contador raspadinha](https://www.mafagrafos.com/models/scratch-off-counter) | Número-alvo, título, caracteres antes/depois do número, passo de incremento e modo regressivo. | Sequência física de números para raspar. |
| 104 | [Porta-canetas paramétrico](https://www.mafagrafos.com/models/sized-pen-holder) | Grade horizontal/vertical de 3–20 células cada; lado da célula (padrão 14 mm); altura (padrão 130 mm); paredes interna/externa independentes; furos de drenagem opcionais. | Recipiente em grade de células quadradas. |
| 105 | [String art, coração](https://www.mafagrafos.com/models/string-art-heart-name-vertical-floating) | Uma ou duas linhas de texto vertical. | Coração com fios/efeito flutuante; base destacável, capa para envio, multicolor. |
| 106 | [String art, retângulo](https://www.mafagrafos.com/models/string-art-rectangle-name-radial) | Nome personalizado em arranjo radial. | Moldura retangular, efeito string art, impressão multicolor recomendada. |
| 107 | [@social string art](https://www.mafagrafos.com/models/social-handle-string-art-floating) | Identificador social; largura final; troca de cor opcional. | Moldura retangular com texto suspenso; impressão em peça única. |
| 108 | [Letras separadas, 2 cores](https://www.mafagrafos.com/models/separate-letters-offset-2color) | Palavra, largura-alvo do conjunto montado e fonte. | Cada letra individual com base e topo offset; impressão em lotes, duas cores. |
| 109 | [Letras separadas, 3 cores](https://www.mafagrafos.com/models/separate-letters-offset-3color) | Texto, tamanho-alvo e fonte. | Cada letra com base, meio e topo; opção multipart encaixada ou peça única por letra com AMS. |
| 110 | [@social, 3 cores](https://www.mafagrafos.com/models/social-handle-offset-3color) | Identificador social. | Base, intermediária e topo; multipart com encaixe ou peça única AMS. |
| 111 | [@social, 2 cores](https://www.mafagrafos.com/models/social-handle-offset-2color) | Identificador social. | Base e relevo; multipart com encaixe ou peça única AMS. |
| 112 | [Chaveiro com nome completo](https://www.mafagrafos.com/models/full-name-keychain) | Nome completo; largura padrão de 75 mm, ajustável. | Chaveiro com texto autoajustado; a ficha recomenda bico 0,2 mm em tamanhos pequenos. |
| 113 | [@social retângulo, 3 cores](https://www.mafagrafos.com/models/social-handle-rectangle-3color) | Identificador social. | AMS face para cima ou multipart encaixado preservando textura da base. |
| 114 | [@social retângulo, 2 cores](https://www.mafagrafos.com/models/social-handle-rectangle-2color) | Identificador social; parâmetros de texto não detalhados. | AMS/troca de cor face para cima ou multipart encaixado preservando textura da base. |
| 115 | [Palavra, 3 camadas](https://www.mafagrafos.com/models/word-offset-3color) | Palavra, tamanho e fonte. | Base, meio e topo offset em cores separadas. |
| 116 | [Palavra, 2 camadas](https://www.mafagrafos.com/models/word-offset-2color) | Palavra, tamanho e fonte. | Base e topo offset em duas cores; AMS ou troca manual de filamento. |

## Limites comuns não confirmados

- Nenhuma dessas fichas expõe o formulário interativo, nomes exatos dos campos, seus limites/valores padrão (além dos explicitamente citados), validação, geometria real ou download.
- Termos como “encaixe preciso”, “sem suporte” e “otimizado para AMS” são alegações das fichas; exigem reprodução e teste próprios antes de prometer equivalência.
- Arte temática, fontes, imagens de demonstração e arquivos originais não devem ser copiados para o Formma3D.

## Agrupamento funcional para o Formma3D

| Núcleo reutilizável | Famílias atendidas | Verificações de paridade necessárias |
|---|---|---|
| Texto e editor por caractere | letreiros, letras grandes, nomes, marcadores, placas | fontes disponíveis/licenciadas; kerning, espaçamento, camadas, duas linhas, lotes de nomes, emojis e encaixes |
| Vetores e composição | SVG, logos, line art, placas multipartes, chaveiros | união/offset/recorte, regiões por cor, furos, tolerância, paredes mínimas |
| Placa e layout | placas, QR/PIX, letreiros, bases | dimensões, bordas, alinhamento, arranjo automático com edição manual preservada |
| Geometria paramétrica | estojos, porta-canetas, suportes, molduras, potes | roscas, encaixes, padrões, texturas, espessuras, suporte de impressão |
| Ferramentas de culinária/artesanato | cortadores, carimbos, ejetores, rolos | lâminas, empunhaduras, offsets, baixo/alto-relevo, peças complementares |
| Metadados e exportação | NFC, QR, PIX, múltiplas peças/camadas | orientação, STL/3MF/DXF quando aplicável, partição por cor, instruções de montagem |

A prioridade de implementação mais segura é criar essas operações comuns uma vez e registrar cada família como receita parametrizada. Isso preserva o editor universal e evita 117 páginas isoladas com lógica duplicada. A tabela é uma proposta de arquitetura, não uma alegação de que os 117 resultados já existam no Formma3D.

## Próxima evidência necessária para equivalência exata

Para confirmar os controles e testar equivalência, preciso de acesso legítimo aos geradores (por exemplo, sessão aberta pelo usuário), capturas dos formulários de cada família e arquivos de exemplo que o usuário tenha direito de usar. A partir daí, podemos registrar campos/defaults/faixas, gerar casos de teste e comparar dimensão, encaixe, número de peças, colorização e exportação. Até isso acontecer, os detalhes ausentes estão marcados “não confirmado”, sem inventar opções.


## Controles observados nos geradores (sessão logada, 2026-10-01, Claude)

Fonte: personalizador público de cada modelo (`/customize/<slug>`), aberto logado, **sem download** (o
crédito só é cobrado no download). Registro com nossas palavras: campo, padrão e faixa. Nenhum código,
arquivo ou arte foi copiado. A prévia é gerada no servidor deles (OpenSCAD); levou cerca de 20 s.

**Comum aos letreiros de palavra (word-offset, @social, 2 linhas, letras separadas):**
- Texto e fonte (seletor com busca e prévia; Google Fonts por categoria: sem serifa — Montserrat, Open
  Sans, Plus Jakarta Sans, Google Sans Flex, Cal Sans, Sofia; display — Bebas Neue, Chicle, Cinzel,
  Elsie, Emilys Candy, Lobster, Luckiest Guy, Matemasie, Mouse Memoirs, Noto Emoji, Playfair Display;
  manuscrita — Cookie, Damion, Dancing Script, Great Vibes, Kaushan Script, Molle, Pacifico, Permanent
  Marker, Praise, Sacramento; mono — Roboto Mono; internacionais — hebraico, japonês, devanágari).
- Largura-alvo do letreiro, mm: 40–360 (palavra 2 camadas, padrão 166); 40–280 nos demais (padrão
  160–200); letras separadas 40–500 (padrão 450).
- Espaçamento entre letras em **%** (50–200, padrão 100–105) e distância entre linhas (−20 a 20 mm).
- Retângulo na base (liga/desliga, padrão desligado): largura 40–320, altura 10–320, arredondamento 0–10,
  deslocamento X/Y −100 a 100.
- Imagem opcional ao lado do texto (SVG/PNG/JPG até 8 MB, ou banco de ícones): largura 20–200,
  posição esquerda/direita, deslocamentos X/Y.
- Cor de cada camada (seletor de cor; só para a prévia/3MF).
- Espessuras: **base 8–30 mm (padrão 16–18; letras separadas 10; palavra+coração 10)**, meio 2–5
  (padrão 3,4), topo 2–5 (padrão 2,2). É peça de ficar em pé, por isso a base é grossa.
- Contornos (offset): base 0–20 (padrão 5–8), meio 2–5/20 (padrão 4–5,7), **topo 0–2 (engrossa o
  texto; padrão 0–0,8)**.
- Tolerância do encaixe 0,1–0,5 mm (padrão 0,18–0,24).
- Preencher buracos: base e meio separados (padrão: base **não**, meio varia).
- 2 linhas: texto da linha 2, "mesmo tamanho de fonte nas duas linhas" (padrão sim), largura-alvo de
  cada linha, mover cada linha para a direita (−100 a 100).
- @social retângulo: em vez do contorno, a base é um retângulo com margem vertical (0–20, padrão 8) e
  lateral (padrão 12).
- Palavra + coração: borda da base 0–20 (5,2), borda do topo 0–2 (0,4), imagem (coração) com largura e
  deslocamentos, tolerância 0,01–1 (0,18).
- Saída (ficha): STL da base, STL do topo e um 3MF completo.

**Chaveiro de nome 2/3 cores (text-offset-keychain):**
- 9 campos de nome; "+" divide em duas linhas; emoji no começo/fim (fonte de emoji).
- Tamanho do chaveiro 18–50 (padrão 20); anel: diâmetro 6–12 (6), furo 2–10 (2,5).
- Espaçamento entre letras % e distância entre linhas.
- Contornos: base 1–10 (2,8), meio 1–10 (1,8), topo 0–0,5 (0).
- Espessuras: base 1–6 (2,8), meio 1–6 (1,2), topo 1–6 (1,2).
- Prévia: lote em grade de 3 colunas; anel pequeno no meio da lateral esquerda.

**Chaveiro retangular / nome completo:**
- 9 campos de nome ("+" = segunda linha; cada linha se ajusta à largura sozinha, a primeira sai maior).
- Placa: largura 20–120 (75), altura 20–120 (30), cantos 2–10 (5), margens horizontal e vertical 0–20 (6).
- Borda elevada em volta da placa: largura 0–3 (1,2).
- Nome em 3 cores: placa, contorno do nome (offset 0–3, padrão 1,4 / 1,1) e nome; espessuras placa 1–10
  (3), texto 0–2 (0,8), contorno 0–2 (0,4).
- Argola (liga/desliga, padrão sim): aba no canto de cima, por fora da placa; diâmetro interno 0–10
  (2,5), externo 0–10 (5).

### Onda 1 — controles observados (sessão logada, 2026-10-01, Claude)

Padrão (faixa). Sem download.

- **Plaquinhas pet (oval, ondulada, peixe, osso, qualquer formato por arquivo):**
  - Textos da frente separados por vírgula (lote); textos de baixo (verso) por vírgula, com "+"
    quebrando linha.
  - Tamanho 53 (10–200); espessura 5 (1–10).
  - Borda: espessura 0,8 (0,2–2), largura 1 (0–5).
  - Escala do texto da frente 52–68%, do verso 79%.
  - Verso: espessura 0,4 (0,1–1), entrelinha 4.
  - Suporte argola ou furo: espessura 2, diâmetro 4, furo 3, posição Y.
  - Opção de tag NFC.
  - "Qualquer formato": arquivo obrigatório e direção do tamanho (largura/altura).
- **Pingente da família:**
  - Título, listas de nomes, cachorros, gatos e outros; texto no topo.
  - Tamanho 60 (40–100); negrito do texto 0,4; espessura 3; furo 4.
  - Texto 0,6; design 0,2; escala por categoria (nome 100, gato 130, cachorro 100).
- **Marcadores de página "nome na lateral" (castelo, geométrico, elegante, floral, com imagem):**
  - O que é: aba fina (1,4 mm) que entra no livro; o nome (2 mm) fica para fora, na borda das
    páginas.
  - Texto; comprimento da aba 50–70; largura 0 = automática.
  - Largura máx. 160, altura máx. 16; espaçamento %.
  - Imagens frente/verso com escala (padrão da aba: grade, geométrico, floral ou imagem).
- **Gerador de chaveiro (design próprio):**
  - Modo face para cima / face para baixo / uma cor por camada.
  - Base 2,6 (0–8); design 1 (0–2); argola 2 (0–4); borda (largura 1, 0–1,6); verso 0,2.
- **Chaveiro com sobreposição:**
  - Modo face cima / baixo / multipartes.
  - Base 4; sobreposição 2; rebaixo 0,8; argola 3.
- **Chaveiro com nome e logo:**
  - Logo opcional; até 9 nomes.
  - Altura do chaveiro 20 (10–50); altura do logo 13; logo à esquerda/direita.
  - Borda: largura 1, offset 0,8. Anel 7 (6–12), furo 2,75.
  - Espessuras: base 2,8, logo 1,2, borda 1, texto 1.
  - Margem 5; distância entre elementos 2; offset da base 2,8.
- **Placa multipart a partir de imagem (2/3 cores):**
  - Imagem; tamanho 180 (40–320) por largura ou altura.
  - Retângulo da base opcional; tolerância 0,16.
  - Espessuras base 18, meio 3,4, topo 2,2; offsets base 6, meio 3, topo 0.
  - Preencher buracos: base sim, meio não.
- **Letreiro com palavras sobrepostas:** editor de design.
  - Espessura da letra grande 22 (8–40); nome 5 (2–20).
  - Rebaixo 2 (0–10); tolerância 0,2.
- **Floco de neve:** nomes; espessura 3 (2–5); nome 3; cor face superior / inferior / total; fundo 0,6;
  cor da face 1.
- **Topo de bolo:** editor de design.
  - Modo cima / baixo / multipeça.
  - Base 2,2; meio 0,8; topo 1,2; rebaixo 0,6; tolerância 0,12.
- **Topo de bolo circular com glitter:**
  - Círculo 140 (100–200); número e nome (tamanhos 50 e 120).
  - Base do nome 2; rebaixo 0,4.
  - Borda 9 (5–15); parede 1; altura 5 (3–10); base 1; anel interno 4.
  - Desenho do glitter 9; tolerância 0,16.
- **Suporte de foto com texto:**
  - Nome; tamanho 35,6 por altura/largura; texto 1,8; espaçamento 104%.
  - Base 21 (espessura); texto da base deslocado 4.
  - Fenda da foto 1 de largura e 14 de profundidade; tolerância 0,2.
- **Suporte de palitos:**
  - Palito 6 (2–10); base 80 × 2; altura 40; parede 1.
  - 3–10 apoios, altura 30.
- **Porta-canetas paramétrico:**
  - Célula 14 (8–50); 3–20 × 3–20; altura 130.
  - Furo no fundo; paredes interna e externa 1; fundo 1.
- **Contador raspadinha:**
  - Título; contador 100; passo 1–100; 10 quadrados por linha (5–20).
  - Largura máx. 180, altura máx. 256.
  - Caractere antes/depois; regressivo; borda 1.
- **Texto com guia de posicionamento:**
  - Texto; tamanho total 700 (100–3000) por largura/altura; base (mesa) 230 (150–360).
  - Espelhar na exportação; texto 16; base 1,8; espaçamento 105%.
  - Folga de espaçamento 0,3; tolerância do encaixe 0,2.

### Onda 2: cortadores, carimbos e ejetores (sessão logada, 2026-10-02, Claude)

Faixas lidas dos formulários (padrão entre parênteses). Sem gerar prévia paga nem baixar nada.

- **Cortador de biscoito (100):**
  - Desenho SVG/PNG/JPG ou banco de ícones; distância desenho → cortador 0–20 (5).
  - Forma pronta opcional: círculo, quadrado, hexágono, 12 lados, estrela.
  - Tamanho 30–260 (70) por largura ou altura; lâmina fina (ligada).
  - Reforço opcional na base (5–30 mm).
  - Carimbo: espelhar (ligado), tirar borda 0–10, escala 1–150%.
  - Pegador: furo (ligado), diâmetro 10–20 (10), altura 10–40 (15), posição X/Y.
  - Espessuras: relevo 4–10 (5), altura do cortador 10–20 (12), parede 0,5–3 (1,6),
    folga 0,5–3 (0,5), aba 2–6 (3,4) × 1–3 (2).
  - Forma personalizada opcional; marca (texto + ângulo, ou logo com altura e posição); 2 cores.
- **Cortadores de retângulos em grade (41):**
  - Retângulo 10–200 (66 × 33); linhas e colunas 1–10 (4 × 3); cantos 0–6 (0,4).
  - Altura 10–30 (17); parede interna 0,1–2 (1,2); base 1–3 (2); saia 0,1–10 (4).
  - Abas laterais 40–100 × 10–20 (40 × 12) com a marca; fonte; 2 cores.
- **Carimbo de molde, texto e imagem (76, 77):**
  - Texto + fonte, ou imagem; lado maior 50–300 (90; imagem 40–300).
  - Offset para unir formas 0–10 (2 no texto, 0 na imagem); inverter.
  - Polegar: posição X/Y, diâmetro 8–20 (10); base 1, borda 7, desenho 2,5.
- **Carimbo circular de imagem (20):**
  - Imagem 2–60 (46), posição X/Y; borda opcional 0–10 (1,2); furo de chaveiro.
  - Desenho 2–10 (3), espelhar; corpo 10–42 (28), diâmetro na mesa 10–60 (40),
    diâmetro do topo 10–60 (60).
  - Embaixo: letra da marca (fonte, 2–30) ou logo (colorido ou não); 3 cores.
- **Carimbos de doce:**
  - Letras/números (22): até 9 separados por vírgula; fonte; tamanho 2–40 (18);
    profundidade 2–10 (4); topo 18–30 (22); corpo 25; base 18; haste 10; marca embaixo.
  - Com imagem (94): até 6 imagens, cada uma com tamanho 2–40 (16), "preencher" e
    posição; topo 10–60 (22), cabo 5–20 (10), base 10–60 (18), corpo 10–42 (40).
- **Ejetores de brigadeiro, plano e arredondado (97, 96):**
  - Tamanho 25–150 (33) por altura; offset da borda 0–10 (0); folga 0,2–3 (0,28).
  - Arredondamento 2–6 (3,3), só no arredondado.
  - Relevo 1–10 (3), espelhar; altura 10–30 (30); parede 0,5–3 (1,6); base 2–6 (4) × 1–3 (2).
  - Tirar borda; logo da marca embaixo ou na lateral.
- **Ejetores de cúpula (25, 26):**
  - Molde + ejetor com o fundo em cúpula: tamanho 10–50, profundidade 5–30, folga 0,2–3.
  - Suavização do ápice; casca externa com suavização e espessura; pegador.
  - Ficam para a onda 3, que traz os sólidos que não são prismas.

### Onda 2, parte 2 (sessão logada, 2026-10-02, Claude)

- **Colorir:**
  - Bordas em relevo (65): editor de arte; base 1–10 (1,6), topo 0,2–2 (0,6).
  - Em 2 partes (87): imagem com linhas fechadas e borda externa; lado maior 40–340 (160).
    Base 1,8, linhas 1, tolerância 0,2.
  - Afundado com offset (101): tamanho 40–200 (90); espessura 1,4–10 (2);
    rebaixo 0,4–2 (0,6); offset X/Y.
  - Afundado em forma (102): círculo, quadrado ou hexágono; tamanho 40–200 (100);
    escala da imagem 0,5–2 (0,92); espessura 1–4 (2); rebaixo 0,2–1,2 (0,6).
- **Resina (89):**
  - Até 2 imagens; tamanho 2–200 (65); offset 0–10 (4).
  - Borda externa (desligada) e interna (ligada); largura 0,6, altura 1,4.
  - Argola: raio do furo 1,8, aro 1,4. Base 1,8, desenho 0,6. 4 cores.
- **Imagem multipartes (90):**
  - Tamanho 40–300 (200); inverter; espelhar as peças.
  - Base 1, linhas 2, peças 1,6; tolerância 0,1–0,5 (0,22).
- **Line art (17):**
  - Desenho 0–320 (180) por altura; posição do corte 0–20 (10).
  - Texto da base (Chicle, 23, espaçamento 200%, engrossar 0,4); desenho 3.
  - Base 180 × 30 × 26, chanfro 8; tolerâncias 0,24/0,2. Ferramenta de pincel para ligar linhas.
- **Listras (16):**
  - Editor de arte; corte 0–40 (20); 5–15 listras (12), vão 0–2,5 (1,2).
  - Placa 2, listra 1,6, desenho 3,6; base como a do line art (chanfro 5).
- **Troféu (19):**
  - Imagem + palavra (Cal Sans); largura 100–320 (235); imagem 60.
  - Base 38 × 40, chanfro nos cantos; imagem 22 de profundidade, fundo opcional 3; palavra 18.
  - Texto da base na frente ou atrás (20, 1,6, corte 0,3).
  - Placa atrás 90 × 30 × 1,6 com desenho; margens 12/8; extensão 9; tolerâncias 0,21/0,16.
- **Quebra-cabeça (95):**
  - Editor de arte; 2–16 peças por lado (8); folga 0,1–0,3 (0,18); espessura 2,4–5 (3,2).
  - Moldura 8–30 (10), cantos 0–10 (4); imagem afundada 0,2–1,2 (0,6); fundo e verso coloridos.
- **NFC:**
  - Gerador (5): editor de arte; base 2,8, NFC 0,6–1,5 (0,74), desenho 1, argola 2; borda 1.
  - Quadrado (98):
    - 20–50 (30 × 30), espessura 3–6 (4), cantos 3–10 (5).
    - NFC 25–40 (26) × 0,6–1,5 (0,6); anel em um dos 4 cantos (furo 1,8, aro 1,8, espessura 2).
    - Borda 1 × 0,8; desenho 10–60 (20) com giro e posição.
    - Indicador NFC ou SVG embaixo (22); QR no fundo ou no topo.
  - Carretel (8): furo 3,4; NFC 25 × 0,8; base 1,6; tolerância 0,14; fio 1,2; filamento 10; encaixe 3.
- **Abridor de latas (4, 49):**
  - Editor de arte; retângulo do abridor (sem ele precisa suporte).
  - Espessura 6,4 (7 com NFC); caixa 5,8 (5); altura inicial 0,8; furo do abridor 2,6;
    alívio circular na entrada.
- **Texto em arco:**
  - Espelho (51): disco 10–100 (50), espelho 10–50 (30), fonte 1–20 (5), início 270°.
    Furo 3 a 90°; texto 0,6, chaveiro 3, fundo sob o espelho 1; emoji ou imagem embaixo.
  - Rosa chaveiro (52): tamanho 10–200 (50); fonte 3–10 (4,5); base 2,8, rosa 0,6,
    folhas 0,4, texto 0,4; furo 3; início 240°; raio 48%.
  - Rosa scrunchie (53): igual, com base 1 e furo 0–50 (20).
