# Categorias da loja

As categorias são o menu do topo da loja. Cada peça tem **uma** categoria (`secao` em `data/produtos.json`) e um **tipo**, que é a subcategoria e aparece como filtro na página da categoria. O código está em `lib/marketplace/tipos.ts` (`SECOES`, `ORDEM_SECOES`).

Regra para peça nova: ela vai para a categoria do **uso** dela, não do material nem da origem. Se servir para duas, vale onde a pessoa procuraria primeiro.

## Menu do topo

★ Natal · Todas as peças · Nossos geradores · Decoração · Cozinha e mesa · Organização · Escritório e games · Bebê e infantil · Presentes e festas · Para sua empresa

- **Nossos geradores** (`/geradores`) não é categoria do banco. É a lista de toda peça pública com gerador (dá para personalizar ao vivo, vendo em 3D). Essas peças continuam também na categoria do assunto delas.
- **Natal** mora em `/natal`, a página da campanha. Toda peça de Natal tem `campanha: natal` e vice-versa (o banco recusa o contrário), então some fora da época.
- **Sensoriais** fica "em breve": as peças estão ocultas e a categoria só entra no menu quando tiver peça pública.
- **Endereços antigos:** `/secao/casa` vai para Decoração, e `/secao/colecionaveis` vai para Todas as peças.

## O que entra em cada uma

| Categoria | Entra | Não entra | Tipos |
|---|---|---|---|
| Natal (`natal`) | tudo que é de Natal: enfeites, presépios, quebra-nozes, renas e cervos, anjos, árvores, luzes, mesa da ceia, cartões, caixas de presente de Natal | peça religiosa que não é de Natal (vai para Decoração) | Presépio, Quebra-nozes, Enfeite de Natal, Árvore de Natal, Figura de Natal, Luz de Natal, Mesa de Natal, Globo de neve, Caixa de presente, Calendário do Advento, Cartão de Natal |
| Decoração (`decoracao`) | peças para enfeitar a casa: estatuetas e figuras, esculturas, vasos, arte e letras de parede, luminárias, porta-retratos, porta-velas, bandejas decorativas, arte sacra, peças de exposição, jogos de tabuleiro decorativos | o que serve para guardar coisas (Organização) | Estatueta, Escultura, Vaso, Arte de parede, Letras de parede, Luminária, Porta-retrato, Porta-velas, Bandeja decorativa, Objeto decorativo, Arte sacra, Peça de exposição, Jogo de tabuleiro |
| Cozinha e mesa (`cozinha`) | o que se usa na cozinha e na mesa: utensílios e seus suportes, café, porta-copos, pia, fruteiras, petisqueiras, organização da cozinha e da geladeira | organizador de outros cômodos (Organização) | Utensílios, Café, Porta-copos, Pia, Fruteira, Tigela e petisqueira, Organizador de cozinha, Mesa posta |
| Organização (`organizacao`) | guardar e arrumar fora da cozinha: organizadores de mesa, banheiro, maquiagem, joias e gavetas, caixas, prateleiras, ganchos, porta-canetas | suporte de eletrônico (Escritório e games) | Organizador, Organizador de mesa, Maquiagem, Joias e acessórios, Banheiro, Gaveta, Caixa organizadora, Prateleira, Gancho, Porta-canetas, Utilidade |
| Escritório e games (`escritorio`) | mesa de trabalho e setup: suportes de celular, notebook, tablet, fone e controle, cabos, acessórios da impressora 3D | — | Suporte de celular, Suporte de controle, Suporte de fone, Suporte de notebook e tablet, Cabos, Impressora 3D, Mesa de trabalho |
| Bebê e infantil (`infantil`) | nascimento, mesversário, quarto da criança, luminária infantil | lembrancinha de festa infantil (Presentes e festas) | Lembrança de nascimento, Mesversário, Quarto infantil, Luminária infantil, Porta-retrato infantil |
| Presentes e festas (`presentes`) | presentes personalizados e festa: chaveiros, letreiros com nome, topos de bolo, lembrancinhas, confeitaria, carimbos, papelaria, datas comemorativas (Páscoa, Dia dos Pais), ímãs, cofrinhos | — | Chaveiro, Letreiro com nome, Topo de bolo, Festa, Lembrancinha, Confeitaria, Carimbo, Papelaria, Presente, Ímã, Cofrinho, Páscoa, Dia dos Pais, Família, Pet, Beleza, Jardim |
| Para sua empresa (`empresa`) | para o negócio: letreiros, placas, QR code, Pix, cartões, displays | — | QR e Pix, Placa, Letreiro, Display, Cartão, Luminária, Beleza |

## Ordem das peças

A ordem está em `lib/marketplace/ordem.ts`. O padrão ("Relevância") é:
1. destaques primeiro;
2. depois as que entraram na loja mais recentemente (`adicionadoEm`);
3. no mesmo dia, a última cadastrada.

Na lista, o seletor também oferece "Mais recentes", "Nome (A–Z)" e "Personalizáveis primeiro". Peça nova entra com a data do dia (`npm run banco:sincronizar`).
