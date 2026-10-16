# Como o orçamento é calculado

Explica cada parte da conta da tela **Orçamento** do editor (`/editor`, atalho `3`), com um
exemplo feito só com os valores padrão de hoje (16/10/2026).

Onde mora cada coisa no código:

| O quê | Arquivo |
|---|---|
| Valores padrão e a conta (`PADRAO`, `orcar`) | `lib/cost/calc.ts` |
| Divisão por peça, por placa e total (`custosDoTrabalho`) | `lib/cost/trabalho.ts` |
| O que é salvo no navegador | `lib/cost/salvar.ts` |
| Volume, chapa e LED de cada peça (`insumos`) | `modelo/Modelo.tsx` |
| A tela (configurações à esquerda, folha ao centro) | `features/orcamento/Orcamento.tsx` |

---

## 1. Base de cálculo: os valores padrão

São os valores que valem enquanto o usuário não mexe em nada (`PADRAO` em `lib/cost/calc.ts`).

### Material

| Campo na tela | Padrão | Para que serve |
|---|---|---|
| Filamento | PLA (1,24 g/cm³) | A densidade transforma volume em gramas |
| Preço do rolo | R$ 100,00 | Com o rendimento, dá o preço do grama |
| Gramas por rolo | 1000 g | → R$ 0,10 por grama |
| Preço do ACM | R$ 90,00/m² | Só aparece quando a peça leva chapa |
| Fita de LED | R$ 18,00/m | Só aparece com LED ligado |

Densidades da tabela de filamentos: PLA 1,24 · PLA+ 1,24 · PETG 1,27 · ABS 1,04 · ASA 1,07 · TPU 1,21 g/cm³.

### Produção

| Campo na tela | Padrão | Para que serve |
|---|---|---|
| Custo de máquina | R$ 2,50/h | Desgaste e manutenção da impressora |
| Mão de obra | R$ 0,00/h | Valor da hora de quem trabalha |
| Preparo do trabalho | 0 min | Minutos por placa impressa (limpar mesa, fatiar, tirar a peça) |
| Acabamento por peça | 0 min | Minutos por peça (lixar, colar, montar) |
| Energia | R$ 0,95/kWh | Preço da luz |
| Potência média | 120 W | Consumo médio da impressora imprimindo |

### Margem

| Campo na tela | Padrão | Para que serve |
|---|---|---|
| Margem | 120 % | Quanto se soma em cima do custo |
| Taxa de falha | 3 % | Parte dos trabalhos que dá errado e precisa ser refeita |

### Estimativa (sem campo na tela; o app aprende sozinho)

| Valor | Padrão | Para que serve |
|---|---|---|
| Vazão | 12 g/h | Quantos gramas a impressora entrega por hora: dá o tempo |
| Fator de gramas | 1,00 | Gramas reais ÷ gramas pelo volume (corrige paredes, preenchimento, suporte) |

### Sócios

3 sócios ("Sócio 1", "Sócio 2", "Sócio 3"), dono da máquina = o primeiro, e
"Dono da máquina recebe máquina + energia" **desligado** (volta desligado toda vez que o app abre).

### Peça padrão usada no exemplo

O app abre sem texto, então o exemplo usa a palavra **LETRA** com a construção padrão do editor:
fonte Anton, altura 150 mm, profundidade 40 mm, parede 2,4 mm, estilo "Moldura para chapa ACM"
(frente em chapa de ACM cortada, fundo impresso de 2 mm, batente de dentro de 2,5 mm), sem LED,
sem arranjo em placas e sem dados do fatiador.

---

## 2. A conta, passo a passo

A conta inteira está em `orcar()`. Ela recebe o que a peça consome (volume impresso, área de
chapa, comprimento de LED) e devolve custo e preço.

### Passo 1 — Volume impresso

Cada peça é uma pilha de camadas retas. O volume é **área da camada × altura da camada**, somado
para todas as camadas (corpo e partes impressas extras, como tampa ou moldura). Não é estimado
por malha: é exato, e bate com o volume do STL exportado.

> LETRA: L 82,30 + E 106,47 + T 84,28 + R 134,89 + A 131,46 = **539,41 cm³**

### Passo 2 — Gramas

```
gramas = volume (cm³) × densidade do filamento × fator de gramas
```

O volume é o do sólido modelado. O fatiador gasta um pouco a mais ou a menos que isso
(perímetros, preenchimento, suporte); o **fator de gramas** corrige essa diferença depois que você
informa dados reais (ver seção 4). No padrão o fator é 1.

> 539,41 × 1,24 × 1 = **668,9 g** (0,67 rolo)

### Passo 3 — Tempo de máquina

```
horas = gramas ÷ vazão
```

> 668,9 ÷ 12 = **55,7 h** (55 h 44 min)

### Passo 4 — Filamento

```
filamento = gramas × (preço do rolo ÷ gramas por rolo)
```

> 668,9 × (100 ÷ 1000) = **R$ 66,89**

### Passo 5 — Máquina

```
máquina = horas × custo de máquina
```

> 55,74 × 2,50 = **R$ 139,35**

### Passo 6 — Energia

```
energia = horas × (potência ÷ 1000) × preço do kWh
```

> 55,74 h × 0,120 kW = 6,69 kWh × 0,95 = **R$ 6,35**

### Passo 7 — Mão de obra

```
minutos    = preparo × número de placas + acabamento × número de peças
mão de obra = (minutos ÷ 60) × valor da hora
```

O preparo conta **uma vez por placa** impressa; o acabamento, **uma vez por peça**.

> Padrão: (0 × 1 + 0 × 5) ÷ 60 × 0 = **R$ 0,00**. Com zero, a linha nem aparece na tela.

### Passo 8 — Chapa de ACM

```
chapa = área da chapa (m²) × preço do ACM por m²
```

A área é a das peças de chapa que o app desenha para corte (uma por letra).

> 0,02896 m² × 90 = **R$ 2,61**

### Passo 9 — Fita de LED

```
LED = comprimento (m) × preço da fita por metro
comprimento = metade do contorno da letra
```

> Padrão: LED desligado = **R$ 0,00**.
> Com LED ligado, LETRA daria 1,35 m × 18 = R$ 24,23.

### Passo 10 — Custo direto

```
custo direto = filamento + máquina + energia + mão de obra + chapa + LED
```

> 66,89 + 139,35 + 6,35 + 0 + 2,61 + 0 = **R$ 215,20**

### Passo 11 — Perdas (taxa de falha)

```
perdas = custo direto × ( 1 ÷ (1 − taxa) − 1 )
```

Não é só "3 % do custo". Se 3 % dos trabalhos dão errado, para entregar 1 é preciso produzir
1 ÷ 0,97 = 1,0309. Por isso 3 % de taxa viram **3,09 %** sobre o custo direto. A taxa é limitada
a 90 % para a conta não explodir.

> 215,20 × (1 ÷ 0,97 − 1) = 215,20 × 0,0309 = **R$ 6,66**

### Passo 12 — Custo total

```
custo = custo direto + perdas
```

> 215,20 + 6,66 = **R$ 221,85**

### Passo 13 — Preço sugerido e lucro

```
preço = custo × (1 + margem ÷ 100)
lucro = preço − custo
```

A "margem" da tela é um **acréscimo sobre o custo** (markup), não a fatia do lucro no preço.
120 % sobre o custo quer dizer que o preço é 2,2 vezes o custo, e que o lucro é 54,5 % do preço.

> 221,85 × 2,2 = **R$ 488,07** · lucro **R$ 266,22**

### Passo 14 — Divisão entre sócios

```
desligado:  cada sócio = preço ÷ número de sócios
ligado:     o dono da máquina recebe antes (máquina + energia);
            o resto é dividido igual entre todos, ele incluído
```

O filamento fica no bolo que é dividido. A soma das partes é sempre o preço.

> Desligado: 488,07 ÷ 3 = **R$ 162,69** para cada um.
> Ligado: máquina + energia = R$ 145,70. Dono = 145,70 + (488,07 − 145,70) ÷ 3 = **R$ 259,83**;
> os outros dois, **R$ 114,12** cada.

---

## 3. O exemplo completo (LETRA, tudo no padrão)

### Indicadores do topo da folha

| Preço sugerido | Custo | Lucro | Filamento | Tempo de máquina | Impressões |
|---|---|---|---|---|---|
| **R$ 488,07** | R$ 221,85 (perdas 3 % incluídas) | R$ 266,22 (margem 120 %) | 669 g · 0,67 rolo | 55 h 44 min | 1 (estimada) |

### Composição do custo

| Item | Valor | Detalhe | Parte do custo |
|---|---|---|---|
| Máquina | R$ 139,35 | 55,7 h | 62,8 % |
| Filamento | R$ 66,89 | 669 g | 30,1 % |
| Perdas (3 %) | R$ 6,66 | trabalhos refeitos | 3,0 % |
| Energia | R$ 6,35 | 6,69 kWh | 2,9 % |
| Chapa ACM | R$ 2,61 | 0,029 m² | 1,2 % |
| **Custo total** | **R$ 221,85** | | |
| **Preço sugerido** | **R$ 488,07** | | |

A máquina é quase dois terços do custo, e ela depende só do tempo, que no padrão sai da vazão de
12 g/h. É o número que mais mexe no preço; daí a importância de preencher os dados do fatiador.

### Por peça

| Peça | Medida (mm) | Volume | Chapa | Filamento | Tempo | Custo | Preço |
|---|---|---|---|---|---|---|---|
| L | 60,9 × 150 | 82,30 cm³ | 0,00418 m² | 102 g | 8,5 h | R$ 33,83 | R$ 74,42 |
| E | 62,0 × 150 | 106,47 cm³ | 0,00573 m² | 132 g | 11,0 h | R$ 43,79 | R$ 96,34 |
| T | 65,6 × 150 | 84,28 cm³ | 0,00439 m² | 105 g | 8,7 h | R$ 34,65 | R$ 76,23 |
| R | 73,3 × 150 | 134,89 cm³ | 0,00765 m² | 167 g | 13,9 h | R$ 55,52 | R$ 122,14 |
| A | 79,6 × 150 | 131,46 cm³ | 0,00700 m² | 163 g | 13,6 h | R$ 54,06 | R$ 118,94 |
| **Total** | | **539,41 cm³** | **0,02896 m²** | **669 g** | **55,7 h** | **R$ 221,85** | **R$ 488,07** |

A conta é linear: a soma das peças mais um preparo por placa fecha com o total. Como o preparo
padrão é zero, aqui as peças somam exatamente o total.

---

## 4. Quando entram os dados do fatiador

Na tabela **Impressões**, cada placa tem campos de gramas e tempo (os que o Bambu Studio mostra
depois de fatiar). Sem eles a placa fica marcada como "estimado".

### O que muda na placa

Gramas e horas da placa passam a ser os reais, e o resto da conta (passos 4 a 14) segue igual.
As peças da placa dividem o real **na proporção do que se estimava para cada uma**: se o R era
25 % dos gramas estimados da placa, fica com 25 % dos gramas e 25 % das horas reais.

### O que o app aprende

Cada placa real vira uma amostra (guarda as últimas 10; redigitar a mesma placa troca a
amostra, não soma outra). Com elas:

```
vazão aprendida  = soma dos gramas reais ÷ soma das horas reais
fator de gramas  = soma dos gramas reais ÷ soma dos gramas pelo volume
```

As próximas estimativas (placas sem dado real) já saem com esses dois números. O botão
**Esquecer** volta vazão para 12 g/h e fator para 1.

### Exemplo (números inventados só para ilustrar)

Se o fatiador dissesse que a placa LETRA leva **600 g e 30 h**:

| Item | Estimado | Com o dado real |
|---|---|---|
| Filamento | R$ 66,89 | R$ 60,00 |
| Máquina | R$ 139,35 | R$ 75,00 |
| Energia | R$ 6,35 | R$ 3,42 |
| Chapa ACM | R$ 2,61 | R$ 2,61 |
| Perdas (3 %) | R$ 6,66 | R$ 4,36 |
| **Custo** | **R$ 221,85** | **R$ 145,39** |
| **Preço** | **R$ 488,07** | **R$ 319,85** |

E o app aprenderia vazão = 600 ÷ 30 = **20 g/h** e fator = 600 ÷ 668,9 = **0,90**.

---

## 5. Regras da folha

- **Sem arranjo**, o letreiro inteiro conta como uma placa só (aparece como "Letreiro").
- **Com arranjo**, cada placa é uma linha. O preparo entra uma vez por placa que tem letra.
- **Desmarcar uma placa** tira as letras dela do preço; ela continua no arranjo.
- **Peça maior que a mesa** (fora de toda placa) continua no preço do letreiro.
- **Objeto STL** entra no custo da placa em que está, mas não no preço do letreiro (marcado com `*`).
- **Placa feita fora do app** (avulsa): nome, peças, gramas e tempo direto do fatiador. Volume e
  chapa zero; conta uma impressão e o número de peças dela para o acabamento. Só entra no total
  depois de ter gramas e tempo.
- **Por peça** não inclui o preparo da máquina, que só existe por placa.
- **Copiar para o cliente** leva nome, peças, medida, profundidade, chapa/LED e o valor. Não leva
  custo, margem, perdas nem sócios.

---

## 6. O que é salvo

Só os campos que o usuário mudou vão para o navegador. Assim, quando um padrão muda no código, ele
chega a quem já usava o app. Valores iguais a padrões antigos (rolo R$ 110, mão de obra R$ 30/h,
preparo 10 min, acabamento 5 min, falha 8 %) são tratados como "não escolhidos" e voltam ao padrão
atual. O botão **Voltar tudo ao padrão** restaura os campos de custo; não mexe nos sócios nem no
que foi aprendido do fatiador.

---

## 7. Pontos de atenção encontrados ao documentar

Não foram alterados; ficam registrados para decidir depois.

1. **Trocar o filamento só muda a densidade.** A tabela tem uma vazão por material (PETG 10 g/h,
   TPU 6 g/h...), mas a conta usa a vazão do orçamento (12 g/h ou a aprendida) e só cairia na do
   material se ela fosse zero, o que não acontece na prática. Um orçamento em TPU sai com o mesmo
   tempo por grama que um em PLA.
2. **ACM conta só a área das letras.** A sobra da chapa (aproveitamento) e o serviço de corte não
   entram no custo.
3. **LED = metade do contorno da letra.** O código não explica o porquê; a leitura mais provável é
   que a fita corre pelo meio do traço, que mede mais ou menos metade do contorno.
4. **"Margem" é acréscimo sobre o custo.** 120 % na tela = lucro de 54,5 % do preço. Vale ter isso
   claro na hora de negociar desconto.
5. O `README.md` ainda manda calibrar a vazão em "Impressora"; hoje ela é aprendida sozinha pelos
   dados de cada placa na tabela Impressões.
