# Feature: Cortinas — Desenho de Retângulo e Ponto de Motor

## Contexto Geral

Os quatro equipamentos da categoria **Ambientes > Cortinas** ganharão uma nova interação de inserção no canvas: o usuário desenha um retângulo que representa o tamanho físico da cortina, e o sistema exibe o ícone de motor como ponto de elétrica associado.

---

## 1. Equipamentos Afetados

Todos os equipamentos de **Ambientes > Cortinas** (4 no total). Aplicar a feature a todos eles.

---

## 2. Fluxo de Inserção

### 2.1 Arrastar para o Canvas

1. O usuário seleciona uma cortina no painel lateral e a arrasta até o canvas.
2. Ao soltar, **não** é inserido o ícone diretamente — em vez disso, entra no **modo de desenho de retângulo**.

### 2.2 Mensagem Descritiva

- Ao entrar no modo de desenho, exibir no **campo superior do canvas** uma mensagem descritiva, com a **mesma identidade visual do descritivo de escala** já existente.
- Texto da mensagem:
  > **"Desenhe um retângulo para definir o tamanho da cortina"**

### 2.3 Desenho do Retângulo

- A interação de desenho é a **mesma mecânica usada para desenhar retângulos de polígono** (clicar, arrastar, soltar para definir os dois cantos opostos).
- Porém, **não utilizar a ferramenta de polígono em si** — implementar essa interação de forma isolada, exclusiva para cortinas.
- O retângulo gerado representa a área física da cortina.
- Não há restrição de proporção, mas o sistema deve respeitar a escala da planta baixa.

---

## 3. Identidade Visual do Retângulo de Cortina

Usar como referência a identidade visual dos **Quadros de Automação** e do **Organizador AV** já implementados no sistema, mas aplicando uma **paleta de tons de cinza** no lugar das cores originais.

Isso inclui:
- Estilo de borda (espessura, estilo de linha, raio de canto — seguir o padrão dos quadros)
- Preenchimento interno (fundo levemente distinto da borda, mesma lógica dos quadros, mas em cinza)
- Sombra ou elevação, se os quadros utilizarem
- Tipografia e rótulo, seguindo o mesmo padrão

> **Regra de cor:** Substituir todas as cores de identidade dos quadros por equivalentes em escala de cinza. O resultado deve parecer a mesma família de componente, mas em versão "neutra/cinza".

---

## 4. Conteúdo Interno do Retângulo

### 4.1 Ícone de Cortina + Rótulo

- Posicionado no **centro geométrico** do retângulo desenhado.
- Usar o ícone de cortina já existente no sistema.
- Exibir o rótulo do equipamento abaixo (ou conforme padrão dos demais equipamentos no canvas).

### 4.2 Ponto de Motor (Elétrica)

- Representado por um **quadrado de 24 × 24 px**.
- Dentro do quadrado, exibir o **ícone de motor** já existente no sistema.
- Identidade visual do quadrado: seguir o mesmo padrão visual dos pontos de elétrica já implementados no canvas.

---

## 5. Posicionamento do Ponto de Motor

### 5.1 Posição Padrão

- Por padrão, o quadrado do motor é inserido **externamente ao retângulo**, centralizado em uma das **paralelas mais curtas** (lado curto do retângulo).
- O sistema deve detectar automaticamente qual dos dois lados curtos usar como padrão (ex: o lado esquerdo, ou o lado mais próximo da origem do canvas — definir convenção interna e manter consistente).

### 5.2 Alternância de Lado

- O quadrado do motor é **clicável e selecionável**.
- Ao clicar nele, ele é selecionado.
- O usuário pode **mover o motor para o lado curto oposto** do retângulo (a outra paralela mais curta).
- Apenas os dois lados curtos são posições válidas — o motor não pode ser movido para os lados longos nem para posições arbitrárias.
- A alternância pode ser implementada como:
  - Clique no motor → seleciona → botão/ação de "trocar lado" aparece, ou
  - Clique no motor → seleciona → arrastar até o outro lado curto (com snap automático).
  - *(Definir a UX mais adequada conforme padrão já adotado no sistema para interações similares.)*

### 5.3 Atualização ao Redimensionar

- Se o usuário redimensionar o retângulo da cortina após a criação, o motor deve **acompanhar automaticamente** a posição do lado curto ao qual está vinculado.

---

## 6. Comportamento Geral do Componente

- O retângulo da cortina, o ícone central e o quadrado do motor são tratados como **um único componente agrupado** no canvas.
- Ao selecionar qualquer parte, o componente inteiro é selecionado (exceto o motor, que tem seleção própria para alternância de lado).
- O componente pode ser movido, e o motor acompanha.
- O componente segue as regras gerais de z-order, snap e grade do canvas.
- Suporta rótulo editável (se o padrão do sistema permitir edição de rótulos nos demais equipamentos).

---

## 7. Resumo Visual do Componente

```
┌─────────────────────────────────┐
│                                 │
│         [ícone cortina]         │
│           "Rótulo"              │
│                                 │
└─────────────────────────────────┘
[■ motor]   ← quadrado 24×24px, externo ao lado curto
```

> O retângulo tem borda e preenchimento cinza (identidade dos Quadros de Automação/Organizador AV em escala de cinza). O quadrado do motor fica fora do retângulo, encostado na face curta.
