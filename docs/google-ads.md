# Google Ads da Scarprint: o que está no ar e por quê

Registro da campanha de pesquisa: o que está configurado, por que foi feito assim e como vamos analisar. Atualize este arquivo a cada mudança na conta, na seção **Histórico**, para a análise saber o que valia em cada período.

## Onde fica

| O quê | Valor |
|---|---|
| Conta | 676-667-0962 (login 3dscar.print@gmail.com, `authuser=3`) |
| Campanha | **Scarprint letras 3D (Campinas 30 km)**, ID 24412480212, tipo Pesquisa |
| No ar desde | 31/10/2026 |
| Página de destino | https://scarprint.com.br/letra-caixa (`app/letra-caixa/page.tsx`) |
| Medição no site | `lib/medicao.ts` (IDs) e `components/Medicao.tsx` (tag e clique no WhatsApp) |

## O que a loja vende (base de tudo)

Confirmado pelo dono em 31/10/2026:
- Letra caixa **só interna ou pequena**: recepção, loja, vitrine, balcão, parede. **Sem instalação e sem fachada externa.**
- Atende **só Campinas e região** (raio de 30 km).
- Preço médio das peças de decoração: ainda não conhecido. Ver a seção **Regra de decisão**.
- Dois públicos, **medidos separados**: empresa (letreiro e logo) e decoração (nome, quarto, presente).

Qualquer palavra, anúncio ou texto do site que prometa fachada, instalação ou atendimento fora da região contraria isso.

**Só quem quer comprar** (dono, 05/11/2026): editor, prévia em 3D e "monte você mesmo" são extras do site e não entram no anúncio. Quem quer fazer, converter ou editar no digital não é o público.

## Configuração da campanha

| Item | Valor | Por quê |
|---|---|---|
| Rede | Só Pesquisa do Google (sem parceiros e sem Display) | Gente que procura letra; Display traz clique barato e sem intenção |
| Região | 30 km em volta de Campinas, só **Presença** | A loja só atende a região; "Presença" evita quem só pesquisa sobre Campinas de longe |
| Idioma | Português | |
| Orçamento | R$ 50/dia (médio) | Objetivo do dono: aproveitar o orçamento para gerar clientes. O gasto diário pode variar; não há garantia de consumir exatamente R$ 50 por dia |
| Lances | **CPC manual**: empresa R$ 4,00, decoração R$ 1,50 (CPC máx. padrão do grupo) | Aumentados com autorização em 03/11 para superar as estimativas de primeira página; mantido o controle por público |
| Metas de conversão | **Contatos** (clique no WhatsApp do site) e **Leads de mensagens** (botão de WhatsApp do anúncio) | Antes contava "ligações e mensagens" e ignorava o clique no site |
| Correspondência ampla | Desligada; palavras em **frase** | Ampla com orçamento pequeno traz busca sem relação |
| Recursos automáticos e AI Max | Desligados | Só texto escrito por nós (nada de "fachada" gerado pelo Google) |
| Declaração UE (anúncio político) | "Não" | Obrigatória para salvar mudanças |

### Recursos do anúncio (nível da conta)

- **WhatsApp:** 19 99784-8348, mensagem "Olá, Scarprint! Quero um orçamento de letra caixa em 3D.", botão "Solicite uma cotação".
- **Sitelinks:**

| Sitelink | Texto | Destino |
|---|---|---|
| Editor de letreiro | Monte a letra caixa em 3D · Veja as medidas de cada letra | /editor |
| Placas para empresa | QR code, Pix e avaliação Google · Com a marca da sua loja | /secao/empresa |
| Todas as letras | Nome, camadas e luminárias · Prontas para personalizar | /letras |
| Presentes com nome | Letras, chaveiros e luminárias · Personalize e veja em 3D | /secao/presentes |

## Grupos de anúncio

### 1. Letreiro e logo para empresa (CPC máx. R$ 4,00)

**Ativas** (frase): letreiro 3d, letra caixa 3d, letra caixa personalizada, letreiro personalizado, logo em 3d, logo 3d para parede, letreiro para recepção, letreiro para escritório, logo para parede, letreiro 3d parede.
- "letreiro de parede para empresa" também foi adicionada, mas o Google marca "baixo volume" e ela não roda.

**Pausadas e por quê:**
- **letra caixa**: quem busca quer fachada em ACM, inox, PVC ou luminosa, de comunicação visual. Clique de R$ 1,82 a R$ 8,28.
- **letra caixa para fachada**, **letreiro para fachada**, **letras 3d para fachada**: a loja não faz fachada. Clique de até R$ 10,38.
- **letreiro letra caixa**: mesma intenção de fachada.
- **As 13 de decoração**, pausadas em 31/10: foram para o grupo 2. O Google só oferecia remover de vez, então ficaram pausadas.

**Anúncio ativo** (aprovado em 31/10). URL /letra-caixa, caminho `letreiro/empresa`.
- Títulos:
  - Logo 3D Para Sua Recepção
  - Letreiro 3D Para Parede
  - Na Fonte e Cor da Sua Marca
  - Para Recepção, Loja e Vitrine
  - Orçamento Pelo WhatsApp
  - Letra Caixa 3D Para Interno
  - Logo da Empresa em 3D
  - Letreiro Para Escritório
  - Veja a Prévia em 3D
  - Atendemos Campinas e Região
  - Letreiro 3D Personalizado
  - Resposta com Preço e Prazo
  - Monte no Editor Online
  - Scarprint Letreiros em 3D
  - Impressão 3D Sob Medida
- Descrições:
  - Logo e letreiro em 3D para recepção, loja, escritório e vitrine, na fonte da sua marca.
  - Mande o logo pelo WhatsApp: mostramos a prévia em 3D e combinamos cores, preço e prazo.
  - Letra caixa impressa em 3D para ambiente interno. Atendemos Campinas e região.
  - Monte o letreiro no editor online, veja em 3D e peça orçamento sem compromisso.

**Anúncio pausado** (o primeiro, de 30/10): misturava letra caixa e decoração e tinha "Letreiro Para Sua Fachada" e "Para fachada, quarto, sala…". Não usar de novo.

### 2. Letras decorativas (CPC máx. R$ 1,50)

**Ativas** (frase):
- letras decorativas, letras decorativas personalizadas, letreiro de parede, letreiro com nome;
- letra 3d personalizada, letras 3d personalizadas;
- letras para decoração de quarto, letras de parede, nome 3d para parede;
- letra decorativa com nome, nome decorativo personalizado, letras 3d decoração;
- luminária com nome, luminária de letra.

**Pausada:** letras para festa. É quase só balão, isopor e MDF ("letras de balão" tem de 1 mil a 10 mil buscas por mês).

**De olho:**
- "letras decorativas" tem muita busca, mas clique de R$ 0,13 a R$ 1,19: a maioria procura fonte ou imagem para copiar. Conferir os termos de pesquisa na primeira semana.
- "letras de parede" pode puxar adesivo e vinil (já negativados).

**Anúncio ativo** (criado em 31/10; título e duas descrições atualizados em 04/11/2026). URL /letra-caixa, caminho `letras/decoracao`.
- Títulos:
  - Letreiro 3D Personalizado
  - Nome em 3D Para Parede
  - Letreiro com Nome em 3D
  - Letras Para Decorar o Quarto
  - Luminária de Letra com Nome
  - Letras 3D Personalizadas
  - Orçamento Pelo WhatsApp
  - Escolha Fonte, Cor e Tamanho
  - Veja a Prévia em 3D
  - Presente Personalizado
  - Letreiro em Camadas de Cor
  - Letras Para Festa e Evento
  - Scarprint Letras em 3D
  - Letras de Parede em 3D
  - Resposta com Preço e Prazo
- Descrições:
  - Inicial e nome em 3D para decorar ou presentear. Escolha cores e tamanho.
  - Peça seu orçamento pelo WhatsApp. Atendimento em Campinas e região.
  - Letreiro com nome, letra grande, luminária de letra e letras em camadas coloridas.
  - Peça pronta e montada, impressa em 3D. Resposta com preço e prazo, sem compromisso.

## Palavras negativas (88 na campanha e 3 no grupo de empresa)

Palavra solta = negativa ampla (bloqueia a busca que tiver a palavra); entre aspas = frase; entre colchetes = exata. Negativa não pega variação, por isso há versões com e sem acento.

| Bloco | Palavras | Por quê |
|---|---|---|
| Aprender e emprego | curso, cursos, aula, "como fazer", tutorial, "passo a passo", vaga, emprego | Quer aprender ou trabalhar, não comprar |
| Grátis e arquivo | molde, moldes, gratis, grátis, download, pdf, png, vetor, word | Quer arquivo, não peça |
| Tipografia | fonte, fontes, "caixa alta", "caixa baixa", maiuscula, maiúscula, maiusculas, maiúsculas, minuscula, minúscula, alfabeto, tatuagem, significado | "Letra caixa" também quer dizer letra maiúscula |
| Escola e papel | atividade, atividades, "para imprimir", colorir, pontilhada, pontilhado, copiar, "para copiar" | Atividade escolar e letra para copiar |
| Outro material | balão, balao, balões, baloes, metalizado, metalizada, isopor, eva, mdf, papel, adesivo, adesiva, adesivos, vinil, neon | Produto de outro material, que a loja não faz |
| Fachada | fachada, fachadas, externa, acm, inox, aço, aco, pvc, galvanizado, luminosa, luminoso, instalação, instalacao | Comunicação visual de fachada, que a loja não faz |
| Criação digital de logo | [converter logo em 3d], [logo 3d ia] | Buscas observadas, com intenção digital, que somaram R$ 4,81 em dois cliques; exclusões exatas aprovadas em 03/11 |
| Fazer ou converter no digital (05/11) | editor, programa, aplicativo, app, software, gerador, ia, converter, stl, blender, canva, photoshop, mockup, render, impressora, "criar logo", "fazer logo", [fazer letras em 3d] | Quer fazer sozinho no computador ou na impressora, não comprar a peça. "fazer letras em 3d" custou R$ 2,48 |
| Acrílico (05/11) | acrílico, acrilico | "letreiro acrílico personalizado" acionou o anúncio; outro material |

**Só no grupo Letreiro e logo para empresa (05/11):** led, iluminado, iluminada. "letreiro led personalizado", "placa de led personalizada" (R$ 2,49), "letra caixa com led", "logo iluminado" e "escrita em led" vinham de "letreiro personalizado", e no leilão os concorrentes eram de neon e LED. Fica só no grupo para não bloquear luminária com LED na decoração.

## Medição

- Tag do Google: **AW-18545269296**. Só carrega no site publicado (`medicaoLigada` exige `https://`), para teste local não contar.
- Conversões criadas em 31/10:

| Conversão | Categoria | Rótulo | Onde dispara | Na campanha |
|---|---|---|---|---|
| Clique no WhatsApp | Contato | `o5ALCPrsxa8dELC0iYtF` | Todo clique em link `wa.me` (`components/Medicao.tsx`) | **Sim** (meta "Contatos") |
| Peca na lista de orcamento | Adicionar ao carrinho | `TEiFCP3sxa8dELC0iYtF` | `medir('orcamento')` em CardProduto e AdicionarOrcamento | Não (só observação) |

- Contagem "Uma" por clique no anúncio e janela de 90 dias. Valor fixo de R$ 1, que serve só para contar.
- "Conversões otimizadas" ficaram **desligadas**: elas enviam ao Google dados que o cliente digita, o site não coleta nada disso e ligar exigia aceitar termos extras.
- Links de WhatsApp que não são pedido (trocas, dados pessoais) levam `data-medir="nao"` e não contam.
- **Leads de mensagens** é o botão de WhatsApp do próprio anúncio, contado pelo Google, sem passar pelo site.

## Números do Planejador de palavras-chave

Brasil inteiro, de out/2025 a set/2026, consultado em 31/10/2026. A conta ainda não gastava, então o Google só mostra faixas. Na região de Campinas o volume é uma fração disso.

| Palavra | Buscas/mês | Lance topo da página (R$) | Situação |
|---|---|---|---|
| letra caixa | 1 mil–10 mil | 1,82–8,28 | pausada (fachada) |
| letreiro para fachada | 1 mil–10 mil | 1,45–8,70 | pausada |
| letra caixa para fachada | 100–1 mil | 2,20–10,38 | pausada |
| letreiro 3d | 1 mil–10 mil (+900% no ano) | 1,03–5,71 | ativa, empresa |
| letreiro personalizado | 1 mil–10 mil | 1,10–6,11 | ativa, empresa ("neon" negativado) |
| letra caixa 3d | 100–1 mil | 0,87–6,35 | ativa, empresa |
| logo em 3d | 100–1 mil | 0,54–3,50 | ativa, empresa |
| logo 3d para parede | 10–100 | 1,20–7,47 | ativa, empresa |
| letreiro para recepção | 10–100 | 1,26–5,89 | ativa, empresa |
| letreiro para loja | 100–1 mil | 1,20–7,50 | não usada (ambígua com fachada) |
| letras decorativas | 1 mil–10 mil | 0,13–1,19 | ativa, decoração (de olho) |
| letreiro com nome | 100–1 mil | 0,30–3,40 | ativa, decoração |
| letreiro de parede | 100–1 mil | 0,43–2,99 | ativa, decoração |
| luminária com nome | 100–1 mil | 0,20–1,72 | ativa, decoração |
| luminária de letra | 10–100 | 0,13–0,65 | ativa, decoração |
| letras de parede | 10–100 | 0,14–0,47 | ativa, decoração |
| letras para festa | 10–100 | 0,15–0,63 | pausada (balão) |
| letreiro neon | 1 mil–10 mil | 0,94–4,30 | negativada |
| letras de balão | 1 mil–10 mil | 0,14–1,68 | negativada |
| letras de mdf / nome em mdf para parede | 100–1 mil | 0,11–0,86 | negativada (mdf) |
| letra caixa acm / inox / pvc / luminosa | 100–1 mil cada | 0,78–8,26 | negativadas |

## Site: o que mudou por causa do anúncio

- Landing `/letra-caixa`: hero 3D com a peça montada, botão verde de WhatsApp, esteira com as 17 peças de letra e "Como funciona".
- Em 31/10, saiu toda promessa de fachada (commit `0e85bff`):
  - a descrição da landing passou a ser "Letra caixa e letreiro 3D para recepção, loja e parede…";
  - o slide da letra caixa diz "para recepção, loja, quarto ou sala";
  - no menu "Criar" e no rodapé, "Letreiro de fachada" virou "Letreiro para parede";
  - a empresa mostra "Campinas - SP" nas políticas.
- Medição ligada no commit `cbbf048`, publicada em 31/10.

## Regra de decisão (como vamos analisar)

Sem o preço médio das peças, a referência é o custo por pedido no WhatsApp (custo ÷ conversões "Contatos" + "Leads de mensagens"):

| Grupo | Teto por pedido | Base |
|---|---|---|
| Letreiro e logo para empresa | **R$ 40** | Em `docs/orcamento.md`, "LETRA" de 15 cm sai por R$ 488, com margem de 54%. Fechando 1 em cada 4 pedidos, R$ 160 de anúncio por venda ainda deixa lucro |
| Letras decorativas | **R$ 15** | Peça mais barata e preço ainda desconhecido: teto apertado de propósito |

**Quando:** com **14 dias ou R$ 300 gastos**, o que vier primeiro. Primeira olhada nos termos de pesquisa com **7 dias**.

**O que olhar, por grupo** (Campanhas > Grupos de anúncios e Palavras-chave > Termos de pesquisa):
1. **Termos de pesquisa:** cada busca que gerou clique. Negativar o que não é venda e anotar aqui.
2. **Custo por pedido:** acima do teto, pausar o grupo ou a palavra. Bem abaixo, subir o lance em uns 20%.
3. **CTR:** abaixo de 3%, o anúncio não conversa com a busca; reescrever títulos.
4. **Parcela de impressões perdida por classificação:** avaliar lances, qualidade e estimativas atuais de primeira página. Em 03/11 os tetos foram elevados; comparar a entrega posterior ao ajuste antes de ampliar novamente.
5. **Pedidos que viraram venda:** o Ads não sabe disso. Anotar à mão quantos WhatsApps vieram do anúncio e quantos fecharam, com o valor; é o que diz se compensa.

**Depois de uns 30 pedidos no mês:** trocar o CPC manual por "Maximizar conversões" com CPA desejado igual ao teto do grupo.

## Pendências e ideias

- Concluir a verificação do anunciante exigida pelo Google para liberar nome e logotipo da empresa. Logo oficial pronto em `public/icone-512.png`; ainda não associado à conta/campanha.
- Recursos de imagem enviados em 04/11/2026 (CAFÉ no grupo de empresas, Luna + inicial L no de decoração): **Qualificados** em 05/11. O Google decide em cada leilão se mostra a imagem; com pouca impressão, ainda é cedo. Versões deitadas (1,91:1) dariam mais chance. São simulações de produto, não fotos de trabalhos entregues.
- **Para a revisão de 13–14/11** (deixado para lá de propósito, para não mexer no que zera os números):
  - Tirar "prévia" e "editor" dos anúncios. Empresa: "Veja a Prévia em 3D" → "Feito Sob Medida em 3D", "Monte no Editor Online" → "Letreiro Pronto Para Sua Loja", descrições 2 e 4 sem editor/prévia. Decoração: "Veja a Prévia em 3D" → "Peça Pronta e Montada". Editar anúncio zera os números dele e volta para análise.
  - Sitelink "Editor de letreiro" (o mais clicado) → "Peças para comprar" (/pecas). Antes, ver se os cliques nele viraram contato.
  - Pausar ou não "logo em 3d", vendo se as negativas de 05/11 limparam os termos.
  - Frases de destaque (ainda não há nenhuma): Orçamento pelo WhatsApp, Feito sob medida, Na fonte e cor da marca, Campinas e região, Peça pronta e montada, Sem compromisso.
  - "Peca na lista de orcamento" de principal para secundária.

- Descobrir o preço médio real das peças de decoração e rever o teto de R$ 15.
- Pensar em um sitelink "Logo para empresa", apontando para o editor ou para a landing.
- Se a decoração der certo, avaliar envio para fora da região (só para peça pequena), em campanha separada.
- A conversão "Peca na lista de orcamento" é principal na conta, mas fica fora das metas da campanha; não muda nada enquanto for assim.

## Histórico

| Data | Mudança | Por quê |
|---|---|---|
| 30/10/2026 | Rascunho: estado de SP, 22 palavras, 1 anúncio, sitelinks, WhatsApp, Maximizar cliques com teto de R$ 3, R$ 25/dia | Primeira versão |
| 31/10/2026 | Orçamento de R$ 50/dia; pagamento cadastrado e campanha enviada pelo dono | Decisão do dono |
| 31/10/2026 | Conversões "Clique no WhatsApp" e "Peca na lista de orcamento"; 36 negativas; grupo "Letras decorativas" separado com anúncio próprio | Medir e separar os públicos |
| 31/10/2026 | **Revisão:** raio de 30 km em Campinas; metas Contatos e Mensagens; CPC manual por grupo; grupo 1 vira "Letreiro e logo para empresa" sem fachada (anúncio novo, antigo pausado); luminária no grupo de decoração; "letras para festa" pausada; +30 negativas; campanha renomeada | A loja só faz interno e só atende Campinas; estava pagando o clique mais caro por fachada |
| 31/10/2026 | Site publicado com a medição e sem "fachada" | A tag precisa estar no ar para contar |
| 03/11/2026 | Após aprovação explícita: CPC máximo padrão de empresa R$ 2,50 → R$ 4,00 e decoração R$ 0,80 → R$ 1,50; adicionadas as duas negativas exatas de criação digital. Orçamento médio mantido em R$ 50/dia. Herança dos lances nas palavras e 68 negativas conferidas na conta | Objetivo: aumentar a entrega. Antes do ajuste, empresa perdia 62,78% das impressões por classificação; estimativas de primeira página de R$ 2,90 a R$ 3,87 superavam o teto de R$ 2,50. Avisos de lance insuficiente desapareceram após salvar; impacto em gasto e contatos ainda será medido |
| 04/11/2026 | Após autorização explícita: imagem CAFÉ (opção 2) associada ao grupo Letreiro e logo para empresa; Luna + inicial L (opção 4) ao grupo Letras decorativas, ambas quadradas 1254 × 1254 e em análise. Anúncio de decoração 830209171835: primeiro título atualizado para Letreiro 3D Personalizado e primeiras duas descrições substituídas pelos textos registrados acima; restantes preservados. Google confirmou o salvamento sem problemas de política. Logo bloqueado pela exigência de verificação do anunciante. Orçamento R$ 50/dia, CPC manual e metas Contatos + Leads de mensagens conferidos e preservados após salvar | Mostrar o produto de cada público com uma mensagem mais direta. Artes e comprovantes em `C:/Users/Administrador/.codex/visualizations/2026/11/03/01a1a37d-c87e-7d82-8e82-1c5570143fc0/scarprint-ads-final/`. Imagens sujeitas a aprovação e exibição pelo Google |
| 05/11/2026 | **Revisão** (30/10 a 04/11: 13 cliques, 165 impressões, CTR 7,9%, CPC médio R$ 3,13, R$ 40,72, 0 contatos). Após autorização explícita: +20 negativas na campanha (fazer/converter no digital e acrílico) e led, iluminado, iluminada no grupo de empresa; 91 conferidas na conta, sem conflito com as 44 palavras. Nada mais mudou: lances, orçamento, anúncios, sitelinks, imagens e conversões como estavam | Dos 4 cliques com termo visível, os 4 eram de quem não compra (LED, digital): R$ 9,78. Leilão: topo 77,7% quando aparece, mas só 21% das buscas possíveis, com 67,5% perdido por classificação no grupo de empresa. Negativa não zera nada; o resto ficou para a revisão de 13–14/11 |
