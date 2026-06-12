# Feature: Teclados Multi Sensores + Regra de Adjacência a Paredes

## Contexto Geral

Este documento descreve duas mudanças no sistema de canvas de plantas baixas:

1. **Alteração de regra existente:** Keypads e pulsadores agora só podem ser posicionados adjacentes às paredes de um ambiente/polígono.
2. **Nova feature:** Teclados Multi Sensores — dois subtipos: PIR e OC.

---

## 1. Alteração de Regra: Adjacência Obrigatória às Paredes

### Descrição

Todos os **keypads** e **pulsadores**, sem exceção, agora só podem ser inseridos **dentro de um ambiente/polígono** e **encostados em uma das paredes** desse polígono.

### Comportamento esperado

- Ao arrastar um keypad ou pulsador para o canvas, o sistema deve detectar o polígono mais próximo e a parede (aresta) mais próxima dentro desse polígono.
- O equipamento deve se "encostar" (snap) automaticamente na parede mais próxima, posicionando-se internamente ao polígono, com sua borda tocando a aresta da parede.
- Não deve ser possível posicionar um keypad ou pulsador:
  - Fora de qualquer polígono/ambiente.
  - Dentro de um polígono mas flutuando sem adjacência a nenhuma parede.
- Ao mover um keypad ou pulsador já posicionado, as mesmas regras se aplicam.

### Impacto

Afeta **todos** os equipamentos das categorias:
- `Ambiente > Pulsadores` (todos os subtipos)
- `Scenario > Keypads` (todos os subtipos)

---

## 2. Nova Feature: Teclados Multi Sensores

### Visão Geral

Alguns teclados possuem sensores embutidos. Quando posicionados no canvas, devem exibir visualmente o **campo de atuação do sensor**, usando a mesma identidade visual dos sensores já existentes no sistema.

A direção do campo de atuação segue uma regra fixa: **perpendicular à parede** em que o teclado foi inserido — ou seja, o campo aponta 90° em relação à parede, para o interior do ambiente.

Há dois tipos de sensores: **PIR** e **OC**.

---

### 2.1 Teclados PIR (Sensor de Movimento por Infravermelho)

#### Equipamentos

| Categoria | Modelo |
|---|---|
| Ambiente > Pulsadores > Pulsadores Virtue | AC-KPUL0-MOV, AC-KPUL1-MOV, AC-KPUL2-MOV, AC-KPUL3-MOV |
| Ambiente > Pulsadores > Pulsadores Metal | AC-KPUL0-MOV, AC-KPUL1-MOV, AC-KPUL2-MOV, AC-KPUL3-MOV |
| Ambiente > Pulsadores > Pulsadores Essence | AC-PULS3-MOV |
| Scenario > Keypads > Keypads Virtue > Keypad Virtue Standard | EB-KP0M, EB-KP0Mv2, EB-KP6M, EB-KP6Mv2, EB-KP6M-4R-WIFI |
| Scenario > Keypads > Keypads Virtue > Keypad Virtue Metal | EB-KP0M, EB-KP0Mv2, EB-KP6M, EB-KP6Mv2, EB-KP6M-4R-WIFI |
| Scenario > Keypads > Keypad Essence | ESN-KP3M-PIR, ESN-KP3M-PIR-4R-WIFI |
| Scenario > Keypads > Keypad Prestige | PST-KP6M-PIR |

**Total: 22 equipamentos.**

#### Campo de Atuação — Especificações

- **Forma:** Setor circular (cone 2D), igual aos sensores PIR já existentes no sistema.
- **Ângulo de abertura:** 90°
- **Raio de alcance:** 7 metros
- **Direção:** Perpendicular à parede onde o teclado está posicionado (apontando para o interior do ambiente, 90° em relação à aresta da parede).
- **Identidade visual:** Usar exatamente o mesmo estilo visual dos sensores de movimento já implementados (cor de preenchimento, opacidade, borda, etc.).
- **Escala:** O raio deve ser renderizado no tamanho correto em pixels, calculado com base na **escala da planta baixa** configurada pelo usuário e no **nível de zoom** atual do canvas.

#### Comportamento

- O campo de atuação é exibido automaticamente assim que o teclado é posicionado no canvas.
- Se o teclado for movido para outra parede, o campo de atuação deve rotacionar automaticamente para continuar perpendicular à nova parede.
- O campo de atuação deve seguir o teclado ao ser selecionado e arrastado.

---

### 2.2 Teclados OC (Sensor de Movimento e Ocupação)

#### Equipamentos

| Categoria | Modelo |
|---|---|
| Scenario > Keypads > Keypads Virtue > Keypad Virtue Standard | EB-KP6M-OC |
| Scenario > Keypads > Keypads Virtue > Keypad Virtue Metal | EB-KP6M-OC |
| Scenario > Keypads > Keypads Essence | ESN-KP3M-OC |
| Scenario > Keypads > Keypads Prestige | PST-KP6M-OC |

**Total: 4 equipamentos.**

#### Overlay de Configuração de Sensibilidade

- Assim que um desses 4 equipamentos for inserido no canvas, deve abrir um **overlay de configuração**.
- O overlay permite ao usuário selecionar **um dos três níveis de sensibilidade**: Baixa, Média ou Alta.
- **Referência de design do overlay:** Usar o componente do Figma: [`node-id=12023-126360`](https://www.figma.com/design/OZN66ihMbQnVq04D2kCe4T/Embrace---Desktop?node-id=12023-126360&t=CHX7BBujOVTcszr4-4)
- O usuário deve confirmar a seleção antes de o campo de atuação ser renderizado.
- Deve ser possível reabrir o overlay para alterar a sensibilidade depois (ex: clicando no teclado e acessando propriedades).

#### Campo de Atuação — Especificações por Sensibilidade

O campo de atuação é uma **elipse**, com dimensões variando conforme a sensibilidade selecionada. A elipse é orientada com o eixo maior apontando para o interior do ambiente, perpendicular à parede.

| Sensibilidade | Alcance (eixo maior / profundidade) | Abertura (eixo menor / largura) |
|---|---|---|
| **Baixa** | 1 metro | 0,667 metro (~2/3 m) |
| **Média** | 6 metros | 6 metros (elipse circular) |
| **Alta** | 12 metros | 8 metros |

- **Forma:** Elipse 2D.
- **Direção:** Perpendicular à parede onde o teclado está posicionado (eixo maior apontando 90° em relação à aresta da parede, para o interior do ambiente).
- **Identidade visual:** Usar o mesmo estilo visual dos sensores de ocupação/OC já existentes no sistema (cor, opacidade, borda).
- **Escala:** As dimensões da elipse devem ser renderizadas no tamanho correto em pixels, calculado com base na **escala da planta baixa** configurada pelo usuário e no **nível de zoom** atual do canvas.

#### Comportamento

- O campo de atuação é exibido após o usuário confirmar a sensibilidade no overlay.
- Se o teclado for movido para outra parede, o campo de atuação deve rotacionar automaticamente para continuar perpendicular à nova parede.
- Alterar a sensibilidade atualiza o campo de atuação em tempo real (ou ao confirmar no overlay).

---

## 3. Regras Gerais de Renderização do Campo de Atuação

Válidas para **PIR e OC**:

1. **Escala:** `tamanho_em_pixels = tamanho_em_metros × (pixels_por_metro_na_escala_da_planta) × zoom_atual`
2. **Direção:** Sempre perpendicular à parede (normal interna ao polígono na aresta onde o teclado está encostado).
3. **Origem:** O campo parte da posição do teclado no canvas (centro ou borda voltada para o interior — manter consistência com os sensores existentes).
4. **Atualização dinâmica:** Recalcular posição, rotação e tamanho ao mover o teclado, alterar zoom ou alterar escala da planta.
5. **Seleção:** Ao selecionar o teclado, o campo de atuação deve ficar visível e destacado (mesmo comportamento dos sensores atuais).
6. **Z-order:** O campo de atuação deve ficar abaixo do ícone do teclado, mas acima do polígono do ambiente.

---

## 4. Resumo dos Equipamentos por Tipo de Sensor

| Tipo | Forma do Campo | Qtd. Equipamentos |
|---|---|---|
| PIR | Setor circular (cone 2D) — 90°, raio 7m | 22 |
| OC | Elipse — dimensões por sensibilidade (Baixa/Média/Alta) | 4 |
| Sem sensor | Sem campo de atuação | Demais keypads/pulsadores |
