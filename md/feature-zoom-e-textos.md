# Feature: Regras de Zoom e Boa Visualização de Textos/Rótulos

## Contexto Geral

Este documento define as regras de posicionamento inteligente de textos de equipamentos e rótulos de ambientes, além de um sistema de visibilidade progressiva baseado no nível de zoom do canvas.

As regras se aplicam a dois grupos de elementos:
1. **Textos de equipamentos** (keypads, pulsadores, sensores, cortinas, etc.)
2. **Rótulos e pé-direito dos ambientes/polígonos**

---

## 1. Posicionamento Inteligente de Textos de Equipamentos

### 1.1 Problema

Os textos dos equipamentos atualmente ficam sobrepostos entre si e sobre outros elementos do canvas.

### 1.2 Regra de Posicionamento

O texto de cada equipamento deve ser posicionado no **espaço vazio mais próximo** ao ícone correspondente, seguindo esta ordem de prioridade de candidatos:

| Prioridade | Posição candidata |
|---|---|
| 1 | Abaixo do ícone |
| 2 | Acima do ícone |
| 3 | À direita do ícone |
| 4 | À esquerda do ícone |
| 5 | Diagonal inferior direita |
| 6 | Diagonal inferior esquerda |
| 7 | Diagonal superior direita |
| 8 | Diagonal superior esquerda |

Para cada candidato, verificar se a **bounding box do texto** colide com:
- Bounding boxes de outros textos de equipamentos
- Bounding boxes de outros ícones de equipamentos
- Arestas/paredes do polígono do ambiente

Usar o primeiro candidato sem colisão. Se todos colidirem, usar o de **menor área de sobreposição**.

### 1.3 Contenção dentro do Polígono

- O texto de um equipamento deve **sempre permanecer dentro dos limites do polígono** do ambiente ao qual o equipamento pertence.
- Se o posicionamento preferido levar o texto para fora do polígono, descartar esse candidato e tentar o próximo da lista.
- O texto nunca deve cruzar a aresta do polígono — se não houver posição válida dentro do polígono, o texto é **omitido** (não renderizado), sem quebrar o layout.

### 1.4 Recalculo Dinâmico

O posicionamento deve ser recalculado:
- Ao inserir um novo equipamento no canvas
- Ao mover qualquer equipamento
- Ao redimensionar o polígono do ambiente
- Ao alterar o nível de zoom (ver Seção 3)

---

## 2. Posicionamento dos Rótulos de Ambientes/Polígonos

### 2.1 Rótulo e Pé-Direito

Cada ambiente exibe dois textos: o **rótulo** (nome do ambiente) e o **pé-direito** (altura). Eles são tratados como um bloco único para fins de posicionamento.

### 2.2 Regra de Posicionamento

- O bloco de rótulo + pé-direito deve ser posicionado no **maior espaço retangular livre** dentro do polígono (espaço não ocupado por ícones de equipamentos nem por textos).
- Por padrão, centralizar o bloco no polígono. Se houver colisão, aplicar a mesma lógica de candidatos da Seção 1.2 (adaptada para o centróide do polígono como ponto de referência).
- O bloco deve sempre permanecer dentro do polígono.

### 2.3 Recalculo Dinâmico

Recalcular ao inserir/mover equipamentos dentro do ambiente e ao redimensionar o polígono.

---

## 3. Sistema de Visibilidade Progressiva por Zoom

### 3.1 Visão Geral

À medida que o usuário aplica **zoom out**, os textos passam por três estágios antes de desaparecerem completamente.

### 3.2 Estágios — Textos de Equipamentos

Definir os valores de zoom em **porcentagem do zoom base** (100% = zoom padrão/neutro):

| Estágio | Faixa de Zoom | Comportamento |
|---|---|---|
| **Completo** | ≥ 120% | Texto exibido integralmente |
| **Truncado** | 100% – 119% | Texto truncado com reticências (`…`), mantendo o máximo de caracteres que couber na largura disponível |
| **Oculto** | < 100% | Texto completamente ocultado; apenas o ícone é exibido |

> **Nota de implementação:** Os valores de limiar estão nas constantes `EQUIP_TEXT_ZOOM_FULL = 120` e `EQUIP_TEXT_ZOOM_TRUNCATED = 100` em `CadCanvas.jsx`.

### 3.3 Regra de Truncamento com Reticências

- Calcular a **largura máxima disponível** para o texto no nível de zoom atual (considerando o espaço do candidato escolhido e os limites do polígono).
- Truncar o texto progressivamente, caractere a caractere (ou por estimativa de largura em px), até que o texto + `…` caiba na largura disponível.
- Mínimo de **2 caracteres visíveis** antes das reticências. Se nem isso couber, pular direto para o estágio Oculto.

### 3.4 Estágios — Rótulos e Pé-Direito de Ambientes

Aplicar os mesmos estágios, mas com limiares distintos, pois os rótulos de ambiente são elementos de maior hierarquia visual:

| Estágio | Faixa de Zoom | Comportamento |
|---|---|---|
| **Completo** | ≥ 40% | Rótulo + pé-direito exibidos integralmente |
| **Truncado** | 20% – 39% | Rótulo truncado com reticências; pé-direito oculto |
| **Oculto** | < 20% | Ambos ocultos; apenas o polígono (preenchimento + borda) é exibido |

> **Nota de implementação:** Os valores de limiar estão nas constantes `ENV_TEXT_ZOOM_FULL = 40` e `ENV_TEXT_ZOOM_TRUNCATED = 20` em `CadCanvas.jsx`.

### 3.5 Transições

- As transições entre estágios devem ser **instantâneas** (sem animação/fade), para preservar performance no canvas.
- A transição deve ocorrer ao cruzar o limiar de zoom, não ao soltar o gesto de pinça/scroll.

---

## 4. Regras Gerais

1. **Performance:** O recalculo de posicionamento deve ser feito de forma incremental — recalcular apenas os elementos afetados pela mudança, não o canvas inteiro.
2. **Prioridade de leitura:** Em caso de conflito irresolvível, priorizar a visibilidade do **ícone** sobre o texto.
3. **Escala do texto:** O tamanho da fonte dos textos **não escala com o zoom** — o texto permanece no tamanho fixo definido no design system. O que muda é a visibilidade (estágios acima).
4. **Consistência:** As mesmas regras de visibilidade progressiva se aplicam igualmente a todos os tipos de equipamento e a todos os tipos de ambiente/polígono, sem exceções por categoria.
