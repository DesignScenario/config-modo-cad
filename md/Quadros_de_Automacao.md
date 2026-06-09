# Feature: Quadros de Automação

## Objetivo

Implementar uma nova feature chamada **Quadros de Automação**, permitindo agrupar equipamentos Scenario dentro de um quadro físico contendo slots para instalação dos dispositivos.

---

# Tipos de Quadros de Automação

Os componentes já estão disponíveis em:

**Equipamentos → Scenario → Quadros de Automação**

Existem três tipos de quadros:

## AC-QA6M

Quadro de automação para até **6 módulos Scenario**.

- Possui exatamente **6 slots**.
- Quantidade fixa de slots.

## AC-QA12M

Quadro de automação para até **12 módulos Scenario**.

- Possui exatamente **12 slots**.
- Quantidade fixa de slots.

## Quadro Custom

Quadro de automação configurável.

- Permite definir entre **1 e 20 slots**.
- Ao inserir esse equipamento no projeto, deve ser exibido um overlay de configuração antes da criação do quadro.

---

# Overlay: Quadro Custom

Utilizar o overlay **"Adicionar múltiplos itens"** como referência visual e estrutural.

## Estrutura

### Título do overlay

```text
Quadro Custom
```

### Cabeçalho

```text
Quantidade de módulos
```

### Rótulo do campo

```text
Quantidade
```

### Comportamento

- Permitir valores entre **1 e 20**.
- Ao clicar em **OK**, o quadro deve ser criado com a quantidade de slots informada.
- A quantidade escolhida define permanentemente a quantidade de slots exibida pelo quadro.

---

# Layout dos Componentes

Os componentes de Quadros de Automação devem seguir o layout definido no Figma.

Referência:

```text
quadro-de-automação-acqa12m
```

Estados obrigatórios:

- Padrão
- Hover
- Selecionado

---

# Estado: Padrão

Elementos visíveis:

- Pin
- Ícone
- Rótulo

Elementos ocultos:

- Estrutura visual do quadro
- Slots

Referência Figma:

https://www.figma.com/design/OZN66ihMbQnVq04D2kCe4T/Embrace---Desktop?node-id=11864-114306&t=FyyPCS9URa9QurPu-4

---

# Estado: Hover

Elementos visíveis:

- Pin (estado padrão)
- Ícone
- Rótulo
- Estrutura visual do quadro
- Slots

Referência Figma:

https://www.figma.com/design/OZN66ihMbQnVq04D2kCe4T/Embrace---Desktop?node-id=11864-113869&t=FyyPCS9URa9QurPu-4

---

# Estado: Selecionado

Elementos visíveis:

- Pin (estado selecionado)
- Ícone
- Rótulo
- Estrutura visual do quadro
- Slots

Referência Figma:

https://www.figma.com/design/OZN66ihMbQnVq04D2kCe4T/Embrace---Desktop?node-id=11864-114015&t=FyyPCS9URa9QurPu-4

---

# Interações

## Hover

Quando o cursor passar sobre o Quadro de Automação:

- Exibir a estrutura do quadro.
- Exibir todos os slots.
- Exibir os dispositivos instalados.

---

## Pin

### Estado inicial

Todos os quadros devem ser criados no estado:

```text
Padrão
```

### Ao clicar no pin

- O pin muda para o estado selecionado.
- O quadro permanece visível permanentemente.

### Ao clicar novamente no pin

- O pin retorna ao estado padrão.
- O quadro volta a ficar oculto quando não estiver em hover.

---

# Regras de Instalação de Equipamentos

A partir desta implementação, os seguintes equipamentos Scenario **não podem mais ser adicionados livremente ao projeto**:

- Automation Controller
- Interfaces de Comunicação
- Módulos de Acionamento
- Interfaces de Entrada

Esses equipamentos só poderão existir dentro de um Quadro de Automação.

---

# Slots do Quadro

Os Quadros de Automação devem possuir slots compatíveis com os equipamentos Scenario suportados.

Os dispositivos devem ser instalados exclusivamente nesses slots.

---

# Remoção de Dispositivos

## Menu de Contexto

Ao clicar com o botão direito sobre um slot ocupado:

- Exibir um menu de contexto.
- Utilizar o mesmo padrão visual já adotado pelos demais menus de contexto do projeto.

### Opção disponível

```text
Remover dispositivo
```

## Ação

Ao selecionar **Remover dispositivo**:

- O dispositivo é removido do slot.
- O slot volta ao estado vazio.
- O quadro permanece visível conforme seu estado atual (hover ou pinado).

---

# Critérios de Aceitação

## Quadros

- [ ] AC-QA6M cria exatamente 6 slots.
- [ ] AC-QA12M cria exatamente 12 slots.
- [ ] Quadro Custom permite definir entre 1 e 20 slots.
- [ ] A quantidade escolhida é refletida visualmente no quadro.

## Overlay

- [ ] Overlay segue o padrão visual de "Adicionar múltiplos itens".
- [ ] Título, cabeçalho e rótulo seguem os textos especificados.

## Estados Visuais

- [ ] Estado padrão exibe apenas pin, ícone e rótulo.
- [ ] Hover exibe quadro e slots.
- [ ] Estado selecionado mantém quadro e slots visíveis permanentemente.

## Interações

- [ ] Hover revela o quadro.
- [ ] Pin alterna entre visível permanente e visível apenas em hover.

## Regras de Equipamentos

- [ ] Não é possível adicionar equipamentos Scenario suportados fora de um quadro.
- [ ] É possível instalar equipamentos apenas em slots válidos.

## Remoção

- [ ] Clique direito em slot ocupado exibe menu de contexto.
- [ ] Opção "Remover dispositivo" remove corretamente o equipamento do slot.
