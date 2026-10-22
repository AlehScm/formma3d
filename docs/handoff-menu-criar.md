# Handoff: menu "Criar" na barra de categorias

Design aprovado em 2026-10-22, opção B do canvas "Menu do topo Scarprint" (https://claude.ai/artifact/3aVq15RQRyjsY2FT75RKz1). Pranchas de referência:
- `OpcaoB.dc.html` (computador);
- `OpcaoBCelular.dc.html` (celular).

Tokens: Design System Scarprint (https://claude.ai/artifact/CU63Mw7PUnZ1qF3LAh76dn), que no código são `styles/marca.css`.

## Visão geral

A barra de categorias tinha dois links quase iguais no canto direito, "Monte seu letreiro" e "Monte a sua peça". No celular, os dois ficavam fora da tela, no fim da rolagem. Agora há um item só, **Criar**, que abre as duas opções, cada uma com ícone e uma linha de explicação:

| Opção | Destino | Explicação |
|---|---|---|
| Personalize em 3D | `/criar` | Chaveiros, placas e presentes com o seu nome, vistos em 3D antes de pedir. |
| Letreiro de fachada | `/editor` | Letra caixa com chapa de ACM, do tamanho da sua fachada. Você monta e vê em 3D no editor. |

A frase do letreiro dizia "O orçamento sai do editor.". Ela mudou porque a aba Orçamento do /editor está desligada pela flag `FLAGS.orcamentoNoEditor` (`lib/flags.ts`). Quando a flag for ligada, a frase antiga pode voltar.

O letreiro de fachada não é peça do carrinho: o orçamento dele sai do editor. Por isso ele fica fora das categorias, junto com "Personalize em 3D".

## Layout

| Onde | Posição do "Criar" | Como as opções abrem |
|---|---|---|
| Computador (`md`, a partir de 768px) | Último item da barra, empurrado para a direita (`ml-auto`) | Menu suspenso (Radix Popover) alinhado à direita do botão, 4px abaixo |
| Celular (abaixo de 768px) | **Primeiro** item da barra, antes de "Natal" | Folha que sobe do rodapé (Radix Dialog), com fundo escurecido |

**Por que muda de lugar no celular:** a barra rola de lado, e o fim dela fica fora da tela. Como o primeiro item da barra, o "Criar" fica sempre à vista, ao alcance do polegar.

## Tokens usados

| Token | Valor | Uso |
|---|---|---|
| `marca-azul` | #2760a2 | Texto do botão "Criar", ícones das opções |
| `marca-gelo` | #f7f8fa | Fundo do botão no hover e quando aberto; hover das opções |
| `marca-branco` | #ffffff | Fundo do menu e da folha |
| `marca-linha` | #c2c3c4 | Borda do menu; alça da folha |
| `marca-navy` | #18212e | Título das opções; escurecimento da folha (`/40`) |
| `marca-texto-2` | #5e6061 | Linha de explicação (6,3:1 sobre branco) |
| `sombra-2` (`shadow-marca-2`) | `0 18px 40px -14px #18212e30` | Menu suspenso e folha |
| `sombra-foco` (`shadow-marca-foco`) | anel branco + azul | Foco do teclado no botão e nas opções |
| `raio-sm` (8px) | | Botão "Criar" e cada opção |
| `raio-md` (12px) | | Menu suspenso |
| `raio-lg` (18px) | | Cantos de cima da folha |
| `alvo-toque` (44px) | | Altura mínima do botão e de cada opção |
| `item` (15px/1.35) | | Botão "Criar" (600) e título das opções (600) |
| `apoio` (13px/1.45) | | Linha de explicação |
| `modulo` (Manrope 700) | | Título "Criar" da folha |

## Componentes

| Componente | Onde | Notas |
|---|---|---|
| `MenuCriar` (novo, em `components/loja/MenuCriar.tsx`) | `modo="menu"` no computador, `modo="folha"` no celular | Os dois modos usam a mesma lista `OPCOES_CRIAR` |
| Botão "Criar" | `<button>` em pílula com `borda-viva`: `IconeTridimensional` (18px) + texto + `IconeAbaixo` (16px) | `min-h-11 px-3.5 text-item font-semibold rounded-marca-pilula`. Ver Movimento. |
| Opção | `<Link>` com ícone de 20px, título e explicação | Ícones: `IconeTridimensional` (Box) e `IconeFachada` (Store), ambos Lucide |

## Estados e interações

| Elemento | Estado | Comportamento |
|---|---|---|
| Botão "Criar" | Repouso | Texto `marca-azul`, sem fundo |
| | Hover | Fundo `marca-gelo` |
| | Aberto | Fundo `marca-gelo`, seta girada 180° |
| | Foco do teclado | `shadow-marca-foco` |
| Opção | Hover / foco | Fundo `marca-gelo`; foco também com `shadow-marca-foco` |
| | Clique | Navega e fecha o menu ou a folha |
| Menu (computador) | Fecha com | Esc, clique fora, clicar no botão de novo ou escolher uma opção. O foco volta ao botão. |
| Folha (celular) | Fecha com | Toque no fundo escurecido, Esc, botão "Fechar" (X, 44px) ou escolher uma opção |

## Responsivo

| Largura | O que muda |
|---|---|
| ≥ 768px | Botão no fim da barra; menu suspenso de 360px de largura no máximo (`w-[min(360px,calc(100vw-32px))]`) |
| < 768px | Botão no início da barra; folha com a largura toda, `pb` somando `env(safe-area-inset-bottom)` |

## Casos de borda

- **Natal desligado:** o "Criar" continua o primeiro item no celular e o último no computador; só some o item "Natal".
- **Faixa do topo sem Natal:** o link passa a se chamar "Personalize em 3D", o mesmo nome da opção.
- **Texto mais longo:** a explicação quebra linha. Nunca cortar com reticências.
- **Sem JavaScript ou antes de hidratar:** o botão aparece fechado. As duas páginas continuam acessíveis pelo rodapé.

## Movimento

**Borda viva** (opção D3 do canvas, aprovada em 2026-10-22): o "Criar" é uma pílula (`raio-pilula`) com o ícone de cubo, e a própria borda de 2px é animada.

| Elemento | Gatilho | Animação | Duração | Curva |
|---|---|---|---|---|
| Borda do "Criar" | Sempre | Contorno em `marca-azul`; um brilho (`marca-azul-brilho` → `marca-branco` → `marca-azul-brilho`) dá a volta | 2,6s por volta, sem parar | linear |
| Borda do "Criar" | Hover ou menu aberto | O brilho acelera e o fundo passa de `marca-gelo` para `marca-gelo-azul` | 1,4s por volta | linear |
| Seta | Abrir / fechar | Gira 180° | 150ms | padrão |

- **Como é feito:** utilitário `borda-viva` em `styles/marca.css`. Usa `@property --angulo-borda` e `conic-gradient` em `border-box`, e anima só esse ângulo.
- **Menos movimento:** com `prefers-reduced-motion`, a borda fica azul e parada.
- **Por que não para sozinha:** foi pedido do usuário. A skill recomenda parar animação decorativa depois de algumas voltas; se incomodar, basta trocar `infinite` por `3`.

## Acessibilidade

- **Botão:**
  - computador: `aria-expanded` e `aria-controls`, que o Radix Popover já entrega;
  - celular: `aria-haspopup="dialog"`.
- **Folha:** `Dialog.Title` com o texto "Criar". Ao abrir, o foco vai para o primeiro elemento focável da folha, o botão "Fechar". Ao fechar, volta ao "Criar" (Radix).
- **Ordem do Tab no computador:** as categorias, depois "Criar", depois as duas opções dentro do menu aberto.
- **Ícones:** só decorativos (`aria-hidden`). O nome acessível vem do texto.
- **Contraste:** a explicação fica em 6,3:1 sobre o branco e o botão azul em 6,4:1.

## Termos (ux-copy)

Os mesmos nomes no site inteiro, para não voltar a confusão dos dois "Monte…":
- A barra de categorias, a faixa do topo, o rodapé, a página 404 e o botão de voltar do /design usam "Personalize em 3D" para `/criar` e "Letreiro de fachada" para `/editor`.
- No rodapé, a coluna "Monte a sua" passa a se chamar "Criar".
