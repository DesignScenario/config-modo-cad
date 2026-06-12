# Relatório Técnico de Avaliação
## Scenario Config Embrace
**Aplicativo de Configuração CAD para Automação Predial**

> Data: Junho de 2026 · Analisado por: Claude (Anthropic)

---

## 1. Visão Geral do Projeto

O **Scenario Config Embrace** é uma aplicação web front-end de configuração CAD voltada para o planejamento e especificação de sistemas de automação predial residencial. A ferramenta permite que projetistas importem a planta baixa de uma edificação, definam ambientes, posicionem equipamentos de automação e organizem toda a estrutura do projeto em uma árvore hierárquica.

A aplicação é construída com **React (JSX)** utilizando **Konva** para o canvas 2D interativo e organiza seu código em um único módulo principal (`App.jsx`) que concentra todo o estado da aplicação, complementado por uma série de componentes de UI especializados.

### 1.1 Stack Tecnológica

| Tecnologia | Uso no Projeto |
|---|---|
| React (JSX) | Framework principal, gestão de estado com hooks (useState, useEffect, useMemo, useRef) |
| react-konva / Konva.js | Canvas 2D interativo — renderização de polígonos, imagens, equipamentos, régua de escala |
| JavaScript (ES Modules) | Lógica de dados, biblioteca de equipamentos, wireframes |
| CSS customizado (cad.css) | Sistema de design próprio com variáveis CSS e estilos de componentes |
| Vite | Bundler (inferido pelo uso de import estático de SVGs e `__APP_VERSION__`) |
| SVG assets | Ícones e ilustrações de todos os equipamentos e controles da UI |

### 1.2 Estrutura de Arquivos-Fonte

| Arquivo / Pasta | Responsabilidade |
|---|---|
| `src/App.jsx` | Estado global e orquestração de toda a aplicação |
| `src/components/CadCanvas.jsx` | Canvas interativo (Konva) — desenho, interação e posicionamento |
| `src/styles/cad.css` | Sistema de design completo da aplicação |
| `src/components/ProjectTree.jsx` | Árvore hierárquica do projeto com renomeação e menus contextuais |
| `src/components/EquipmentLibraryOverlay.jsx` | Biblioteca de equipamentos com drag-and-drop |
| `src/components/TopToolbar.jsx` | Barra de ferramentas superior com seleção de ferramentas e filtros |
| `src/components/EnvironmentInfoOverlay.jsx` | Painel de criação/edição de ambientes |
| `src/components/EquipmentPropertiesOverlay.jsx` | Painel de propriedades de equipamentos |
| `src/components/EnvironmentLibraryOverlay.jsx` | Biblioteca de ambientes predefinidos |
| `src/components/AutomationBoardOverlay.jsx` | Configura colunas do Quadro Custom antes da criação (ou edição via Propriedades) |
| `src/components/AvOrganizerOverlay.jsx` | Configura colunas do Organizador AV antes da criação (ou edição via Propriedades) |
| `src/data/equipmentLibrary.js` | Catálogo completo de equipamentos com filtros e metadados |
| `src/data/initialProject.js` | Estrutura inicial do projeto (árvore padrão) |
| `src/data/wireframes.js` | Mapeamento de wireframes técnicos SVG por equipamento |
| `src/hooks/useDraggable.js` | Hook reutilizável para painéis flutuantes arrastáveis |

---

## 2. Funcionalidades Implementadas

### 2.1 Interface Principal e Layout

A aplicação é dividida em quatro áreas principais dispostas em layout fixo:

- **Barra lateral esquerda** (`CadTaskbar`): barra de navegação vertical com ícones de modo e funcionalidades.
- **Painel de projeto** (`ProjectTree`): árvore hierárquica redimensionável que pode ser ocultada.
- **Área de trabalho central** (`CadCanvas`): canvas interativo Konva para desenho CAD.
- **Barra de status inferior** (`StatusBar`): exibe versão da aplicação, status de conexão e nome da instalação.

O painel lateral é redimensionável via arrastar o divisor (splitter), com limites entre 300 e 1020 px. Um botão de etiqueta permite colapsar/expandir o painel.

### 2.2 Importação de Planta Baixa

- Seleção de arquivo **PNG** via input file nativo (restrito a `image/png`).
- Criação de URL de objeto temporária com revogação automática ao importar novo arquivo (gestão de memória).
- Suporte a importação por pavimento — ao clicar em "Importar" em um nó de pavimento específico na árvore, a planta é associada a esse pavimento.
- Exibição imediata do overlay de configuração de escala após importação.
- Reset completo do estado do projeto ao importar nova planta.

### 2.3 Configuração de Escala (Régua CAD)

- Ativação via botão "Definir Escala" na barra de ferramentas ou overlay inicial.
- **Ferramenta de linha**: o usuário desenha um segmento sobre a planta que representa uma distância conhecida.
- **Overlay de valor de escala**: após traçar o segmento, o usuário informa o comprimento real em metros.
- Cálculo automático de `metersPerPixel` e `pixelsPerMeter` armazenados no estado.
- Definição opcional de **altura de teto padrão** (em metros) junto com a escala.
- Exibição na barra de status da escala definida (ex.: `Escala definida: 2.50 m em 342.1 px`).
- Token de limpeza (`clearScaleReferenceToken`) para apagar segmentos de referência anteriores no canvas.

### 2.4 Ferramentas de Desenho no Canvas

| Ferramenta | Comportamento |
|---|---|
| Seleção (`select`) | Modo padrão — seleciona e interage com objetos |
| Polígono (`polygon`) | Desenha ambientes como polígonos de múltiplos vértices com fechamento automático ao aproximar do ponto inicial |
| Régua / Linha de escala | Traça segmento de referência para calibração de escala |
| Mover | Deslocamento de elementos no canvas |
| Retângulo (`rectangle`) | 2 cliques definem o bounding box; Shift → quadrado; Alt → centro no 1º ponto; Shift+Alt → quadrado centrado |
| Elipse (`elipse`) | 2 cliques definem o bounding box; gera polígono de 64 vértices; Shift → círculo; Alt → centro no 1º ponto; Shift+Alt → círculo centrado |
| Triângulo (`triangle`) | 2 cliques definem o bounding box; base inferior, ápice no centro superior; Shift → equilátero; Alt → centro no 1º ponto; Shift+Alt → equilátero centrado |

Todas as três ferramentas de forma (Retângulo, Elipse, Triângulo) geram polígonos que se comportam exatamente como ambientes — passam pelo `onPolygonCreated`, abrem o overlay de ambiente e entram na árvore do projeto.

O canvas suporta **zoom via scroll** (50% a 1000%), **ajuste de opacidade** do fundo (0 a 100%) e **rotação da planta** em incrementos de 90°.

### 2.5 Criação e Gestão de Ambientes (Polígonos)

Cada ambiente possui:

- Nome personalizável (renomeação inline no canvas ou na árvore).
- **Classe** (tipo de cômodo): Dormitório, Banheiro, Social, Serviço, Circulação, Lazer, Externo, Trabalho, Garagem, Apoio ou Não definida.
- **Altura de teto** em metros.
- Cor de preenchimento semi-transparente (`#6BC2F7`) controlada por classe.
- **Rótulo alinhado ao ponto mais alto do polígono** (âncora no canto superior-esquerdo interno), com quebra de linha inteligente e tamanho de fonte adaptativo (10–14 px); fallback para o centro visual quando não há espaço suficiente próximo ao topo.
- Seleção visual por clique com mudança de cor para azul (`#0095ff`) ao selecionar.
- **Menu contextual** por clique com botão auxiliar ou longo toque.
- **Tradução de polígono** (arrastar o ambiente inteiro), com atualização coordenada de todos os equipamentos, quadros e organizadores AV dentro dele.
- Edição de vértices individuais por arrastar.
- Exclusão com confirmação via overlay dedicado.

**Associação de ambientes**: ao criar um novo polígono, é possível associá-lo a um ambiente já existente na árvore do projeto (ainda sem polígono), em vez de criar um novo.

A aplicação inclui uma **biblioteca de 54 ambientes predefinidos** com nomes e tipos pré-configurados (Adega, Área de Serviço, Banheiro, Bar, Cozinha, etc.), acessível via overlay de biblioteca de ambientes.

### 2.6 Biblioteca de Equipamentos

A biblioteca organiza **136 itens-folha** em três abas temáticas:

- **Ambiente**: iluminação, acessórios (sensores), pulsadores (3 linhas: Virtue, Metal, Essence), acionadores, cortinas, câmeras, diverse, touch panels, keypads Wi-Fi, espelhos duplos.
- **Scenario**: controladoras (AC-1, AC-2-CPT/PRO/FULL), interfaces, módulos (SDM8, MPL3/4, RDM8, RCM8, variantes Wi-Fi), keypads Virtue/Metal, quadros de automação.
- **Drivers**: câmeras IP, DVR/NVR, integração AV, leitores, interfaces RS232/IR, drivers genéricos, organizador AV.

Funcionalidades:

- **Drag-and-drop** do item da biblioteca para o canvas — o equipamento é criado no ponto de soltura, dentro do polígono detectado.
- **Adição múltipla**: overlay permite especificar quantidade e o sistema distribui os itens uniformemente entre dois pontos clicados no canvas.
- **Busca/filtro por texto** dentro da biblioteca.
- Hierarquia em árvore **colapsável** (pasta > subcategoria > item).

### 2.7 Equipamentos Posicionados no Canvas

- Ícone SVG representativo exibido como pin.
- Rótulo editável (renomeação inline ou via árvore).
- **Arrastar para reposicionar**, incluindo mover entre ambientes — o nó na árvore do projeto é recolocado automaticamente no ambiente correto.
- **12 filtros de visibilidade** por categoria (iluminação, pulsadores, motores, cortinas, câmeras, quadros, keypads, touch panels, sensores, drivers, texto, todos).
- Menu contextual com opções de renomear, ver propriedades e excluir.
- **Painel de propriedades**: overlay flutuante arrastável com informações detalhadas do equipamento e do ambiente.
- **Wireframe técnico SVG** em escala real (quando disponível para o modelo).
- **Sensores de movimento**: renderizados com cone de visão em 50° de abertura com cor de preenchimento especial (`#F5D59D`).

### 2.8 Quadros de Automação (Automation Boards)

Três tipos de quadro, definidos pelo `catalogItemId`:

| catalogItemId | Label | Slots |
|---|---|---|
| `sce-quadros-1` | AC-QA6M | 6 fixos |
| `sce-quadros-2` | AC-QA12M | 12 fixos |
| `sce-quadros-3` | Quadro Custom | Dinâmico (até 99) |

**Quadros fixos** (`sce-quadros-1/2`): criados diretamente no canvas com grade de slots predefinida. Slots vazios exibem o número ordinal.

**Quadro Custom** (`sce-quadros-3`): ao arrastar para o canvas, abre o `AutomationBoardOverlay` que solicita apenas o número de **colunas** (1–12). O quadro é criado com comportamento dinâmico:

- Inicia com **1 slot vazio** exibindo `+`.
- Ao instalar um módulo no último slot vazio, um novo slot `+` é adicionado automaticamente.
- A grade cresce coluna por coluna até atingir o número de colunas definido; a partir daí novas linhas são criadas.
- Limite máximo de **99 módulos instalados**.
- Ao remover um módulo, slots nulos consecutivos ao final são compactados (mantém sempre exatamente um slot `+` de sobra).
- **Menu contextual**: Renomear → **Propriedades** → Excluir. "Propriedades" reabre o overlay para ajustar o número de colunas sem perda dos módulos já instalados.

Comportamentos comuns a todos os quadros:
- Toggle de **"pinned"** — expande/mantém visível a grade de slots no canvas.
- Ao mover para outro ambiente, o nó e todos os dispositivos instalados são recolocados na árvore do projeto.
- Renomeação inline no canvas ou via árvore.
- Exclusão remove o quadro e todos os dispositivos instalados da árvore.

### 2.9 Organizador AV

Análogo ao Quadro Custom, voltado para integração AV (aba Drivers):

- Ao arrastar `drv-av-organizer` para o canvas, abre o `AvOrganizerOverlay` — overlay com cabeçalho azul (`#2980b9`) que solicita o número de **colunas** (1–12).
- Comportamento de slots **idêntico ao Quadro Custom**: dinâmico, cresce até o limite de colunas, slot vazio exibido com `+`, limite de **99 dispositivos**.
- **Menu contextual**: Renomear → **Propriedades** → Excluir. "Propriedades" reabre o overlay para ajustar colunas.
- Todos os dispositivos-folha da aba Drivers (`isAvOrganizerOnlyItem`) só podem ser instalados em slots de um Organizador AV — não podem ser soltos diretamente no canvas.
- Suporte a toggle de pinned, movimentação entre ambientes, renomeação e exclusão (com remoção de todos os dispositivos instalados da árvore).
- CSS próprio: `.cad-av-organizer-placement`, `.cad-av-organizer-structure`, `.cad-av-organizer-slot` — tema azul (`#2980b9` e tonalidades).

### 2.10 Árvore Hierárquica do Projeto (ProjectTree)

Estrutura da árvore:

```
Novo Projeto
├── Projetos Locais
├── Módulo Dia/Noite
├── Atividades Globais
└── Pavimento N
    └── Ambiente X
        ├── Equipamento
        ├── Quadro de Automação
        │   └── Módulo instalado
        └── Organizador AV
            └── Dispositivo AV
```

Interações disponíveis:

- Expandir/colapsar nós com filhos.
- Seleção de nó **sincroniza seleção no canvas** (e vice-versa).
- **Renomeação inline** ao pressionar F2 ou duplo clique.
- **Menu contextual** por clique direito com ações contextuais (editar, renomear, excluir, focar, definir escala, importar planta, adicionar pavimento, adicionar ambiente).
- **Foco no canvas**: ao selecionar um ambiente na árvore, o canvas desloca-se para centralizar o polígono.
- Ícone de pavimento muda quando a planta importada está associada a ele.
- Suporte a adição de múltiplos pavimentos.

### 2.11 Barra de Tarefas (CadTaskbar)

| Item | Estado |
|---|---|
| Informações do Projeto | Declarado |
| Modo Estrutura | Declarado |
| **Modo CAD** | **Ativo / Implementado** |
| **Equipamentos** | **Implementado** (abre/fecha biblioteca) |
| Programação | Declarado (sem implementação) |
| Instalação | Declarado (sem implementação) |
| Gerenciamento de Drivers | Declarado (sem implementação) |
| Enviar Projeto | Declarado (sem implementação) |

A barra pode ser expandida (labels completos) ou colapsada (labels abreviados), e inclui um toggle de estado (`ToggleRotulo`).

### 2.12 Overlays e Painéis Flutuantes

| Overlay | Função |
|---|---|
| `ScaleSetupOverlay` | Instrui o usuário a traçar a linha de referência para escala |
| `ScaleValueOverlay` | Coleta o valor em metros do segmento e a altura de teto |
| `EnvironmentInfoOverlay` | Criação e edição de ambiente: nome, classe, altura de teto, associação |
| `EquipmentLibraryOverlay` | Catálogo de equipamentos em abas, com drag-and-drop e adição múltipla |
| `EquipmentPropertiesOverlay` | Detalhes do equipamento — identificação, ambiente, wireframe técnico |
| `AutomationBoardOverlay` | Solicita número de colunas (1–12) para Quadro Custom — usado na criação e em "Propriedades" |
| `AvOrganizerOverlay` | Solicita número de colunas (1–12) para Organizador AV — cabeçalho azul; usado na criação e em "Propriedades" |
| `DeleteEnvironmentConfirmOverlay` | Confirmação de exclusão de ambiente/polígono |
| `AddMultipleItemsOverlay` | Especifica quantidade de itens para inserção múltipla |
| `EnvironmentLibraryOverlay` | Biblioteca de 54 ambientes predefinidos com imagens de referência |

Todos os overlays flutuantes utilizam o hook `useDraggable`, que permite arrastar livremente os painéis dentro do backdrop.

---

## 3. Arquitetura e Padrões de Código

### 3.1 Gestão de Estado

O `App.jsx` concentra todo o estado global da aplicação em aproximadamente **50 variáveis de estado** (`useState`). Os principais agrupamentos são:

- **Estado de UI**: `activeTool`, `zoom`, `backgroundOpacity`, `sidebarWidth`, `isProjectPanelOpen`, `taskbarExpanded`, `toggleEstado`.
- **Planta importada**: `importedImage`, `imageRotation`, `importedPlanPavimentoId`, `pendingImportPavimentoId`.
- **Escala**: `showScaleOverlay`, `showScaleValueOverlay`, `isAwaitingScaleLine`, `pendingScaleSegment`, `scaleDefinition`, `clearScaleReferenceToken`.
- **Ambientes**: `environments`, `pendingEnvironmentPolygon`, `editingEnvironmentId`, `polygonColorById`.
- **Equipamentos**: `placedEquipments`, `selectedEquipmentId`, `equipmentPropertiesId`, `equipmentFilters`.
- **Quadros**: `automationBoards`, `selectedBoardId`, `pendingBoardPlacement`, `editingBoardId`.
- **Organizadores AV**: `avOrganizers`, `selectedAvOrganizerId`, `pendingAvOrganizerPlacement`, `editingAvOrganizerId`.
- **Árvore**: `projectTree`, renaming states (environment, equipment, board, avOrganizer, genericNode).

### 3.2 Operações na Árvore de Projeto

A árvore de projeto é uma estrutura **imutável** (manipulada via `cloneProjectTree` / `JSON.parse+stringify`). Funções puras implementadas:

- `findNodeById(node, nodeId)` — busca recursiva por ID.
- `removeNodeById(node, nodeId)` — remoção recursiva preservando imutabilidade.
- `updateNodeLabel(node, nodeId, newLabel)` — atualização de label por ID.
- `updateNodeSource(node, nodeId, newSource)` — atualização de source por ID.
- `appendEquipmentToEnvironment(node, environmentId, child)` — insere filho no nó de ambiente.
- `appendEnvironmentToFirstPavimento(root, child)` — insere ambiente no primeiro pavimento.
- `appendPavimentoToProject(root)` — insere novo pavimento na posição correta.
- `collectEnvTreeNodes(node)` — coleta todos os nós de ambiente.
- `findFirstPavimentoId(node)` — localiza o ID do primeiro pavimento.

### 3.3 Sistema de Filtros de Equipamentos

- `EQUIPMENT_VISIBILITY_FILTER_KEYS`: mapa de chave de filtro para categorias de ícones.
- `buildEquipmentFilterMap()`: constrói mapa de ID de equipamento para suas chaves de filtro.
- `createDefaultEquipmentFilters()`: gera objeto de estado inicial com todos os filtros ativos.
- `getEquipmentFilterKeys(itemId)`: retorna as chaves de filtro de um item específico.
- `isEquipmentVisibleByFilters(equipment, filters)`: avalia se um equipamento deve ser exibido.
- Efeito colateral: ao mudar filtros, equipamentos invisíveis são **deselecionados automaticamente**.

### 3.4 Canvas Konva — CadCanvas

O `CadCanvas.jsx` implementa o motor gráfico completo. Capacidades internas:

- `useElementSize(ref)`: hook com `ResizeObserver` que mantém o canvas dimensionado ao container.
- `useLoadedImage(imageSrc)`: hook que carrega a imagem de fundo de forma assíncrona.
- **Coordenadas normalizadas**: `stageToNorm` / `normToStage` convertem entre espaço de stage e coordenadas `[0..1]` relativas à imagem, mantendo posição correta após rotação e zoom.
- `isPointInsidePolygon()`: algoritmo de **ray casting** para detecção ponto-polígono.
- `rotatePoint` / `rotateVector()`: operações de rotação para suporte ao `imageRotation`.
- `getPolygonLabelPlacement()`: posiciona o rótulo no canto superior-esquerdo interno do polígono (ponto mais alto), testando candidatos com `canPlaceLabelBox`; fallback para `getPolygonVisualCenter` se não houver espaço. Usa `wrapLabelText` e tamanho adaptativo (10–14 px).
- `EQUIPMENT_HOLD_TO_DRAG_MS` (180ms): tempo mínimo de pressão para iniciar arrastar (diferencia tap de drag).
- `distributePointsBetween()`: distribui N pontos uniformemente entre dois pontos para adição múltipla.
- Zoom via wheel com fator de **1.1× por delta**, limitado a 10–1000%.

### 3.5 Estrutura de Dados — Quadro Custom e Organizador AV

Com a introdução de slots dinâmicos, a estrutura de dados dessas entidades foi atualizada:

```js
// Quadro Custom (sce-quadros-3) — slotCount === null indica modo dinâmico
{
  id, catalogItemId, polygonId, point, label, iconSrc, iconKey, filterKeys,
  environmentId,
  slotCount: null,          // null = dinâmico; número = fixo (QA6M/QA12M)
  columnCount: number,      // colunas definidas pelo usuário (1–12)
  pinned: boolean,
  slots: Array<device | null>  // cresce conforme instalações; sempre termina com null
}

// Organizador AV — sempre dinâmico
{
  id, catalogItemId, polygonId, point, label, iconSrc, iconKey, filterKeys,
  environmentId,
  columnCount: number,      // colunas definidas pelo usuário (1–12)
  pinned: boolean,
  slots: Array<device | null>
}
```

**Regras de crescimento:**
- Ao instalar no último slot vazio: se `occupiedCount < 99`, adiciona `null` ao final.
- Ao remover: nulos consecutivos ao final são compactados para manter exatamente um slot vazio de sobra.
- O número de colunas exibidas na grade é `Math.min(slots.length, columnCount)` — a grade cresce visualmente coluna por coluna até atingir o máximo.

### 3.6 Padrões de Design

| Padrão | Aplicação |
|---|---|
| Estado Controlado | Todos os overlays, seleções e renomeações controlados por estado no `App.jsx` |
| Prop Drilling | Estado e handlers descem via props de `App.jsx` para componentes filhos (sem Context API) |
| Imutabilidade | Árvore de projeto manipulada com funções puras que retornam novas estruturas |
| Token/Request Pattern | `clearScaleReferenceToken`, `polygonDeleteRequestId`, `polygonFocusRequest` usam tokens numéricos para disparar efeitos pontuais |
| Ref para DOM/Canvas | `fileInputRef`, `importedImageUrlRef`, `dragStateRef` para interações imperativas sem re-render |
| useMemo para derivações | `menuItems`, `unassociatedEnvironments`, `polygonLabelById`, `polygonCeilingHeightById` |
| Custom Hooks | `useDraggable` (painéis), `useElementSize` (resize), `useLoadedImage` (imagem async) |
| Source Typing | Nós da árvore têm campo `source` para tipagem runtime (`created-environment`, `equipment-item`, `automation-board`, `av-organizer`, `board-device`, `av-device`, `pavimento`, `project`) |

---

## 4. Catálogo de Equipamentos — Detalhamento

### 4.1 Aba Ambiente

| Categoria | Itens |
|---|---|
| Iluminação | Luminária Genérica, LED RGB PWM, LED CCT/Circadiano |
| Acessórios | AC-MOV-TETO (sensor de movimento) |
| Pulsadores Virtue | AC-KPUL1/2/3, AC-KPUL0/1/2/3-MOV (7 itens) |
| Pulsadores Metal | AC-KPUL1/2/3, AC-KPUL0/1/2/3-MOV (7 itens) |
| Pulsadores Essence | AC-PULS2/3, AC-PULS3-MOV (3 itens) |
| Acionadores | Ventilador, Carga não dimerizável, Carga não dimerizável por relé |
| Cortina | Cortina/Toldo por relé (2 modos), Cortina Genérica RF, Cortina Somfy RTS II |
| Diversos | Entrada digital, Sensor Porta/Janela, RF433, Fonte Genérica, Fechadura Yale |
| Câmeras | Câmeras de ambiente |
| Touch Panels | Painéis touch para controle local |
| Keypads Wi-Fi | Teclados Wi-Fi de ambiente |
| Espelhos Duplos | Controladores embutidos em caixas 4×2 |

### 4.2 Aba Scenario (Hardware de Automação)

| Categoria | Itens |
|---|---|
| Controladoras | AC-1, AC-1 v2, AC-2-CPT, AC-2-PRO, AC-2-FULL, AC-2-FULL v2 |
| Interfaces | EB-NTL1, EB-IRS-WIFI, EB-ZRF-HUB |
| Módulos | EB-SDM8-STD/LED/MAX, EB-MPL3/4/4-4R, EB-RDM8, EB-RCM8 |
| Módulos Wi-Fi | EB-SDM2-LED-WIFI, EB-RLY2-WIFI, EB-RLY2DC-WIFI, EB-PWM3-WIFI |
| Keypads Virtue | EB-KP0M, EB-KP0Mv2, EB-KP1, variantes Standard e Prestige |
| Keypads Metal | Linha Metal correspondente |
| Sensores | `sce-sensores-1`, `sce-sensores-2` |
| Quadros | `sce-quadros-1/2` (fixos), Quadro Custom (colunas configuráveis, slots dinâmicos) |

### 4.3 Aba Drivers

| Categoria | Descrição |
|---|---|
| Câmeras IP / DVR | Integrações com sistemas de CFTV |
| AV | Receivers, amplificadores, equipamentos de áudio e vídeo |
| Organizador AV | `drv-av-organizer` — rack AV com colunas configuráveis e slots dinâmicos (até 99) |
| Interfaces de comunicação | RS232, IR, protocolos de integração |
| Drivers genéricos | Integrações com dispositivos de terceiros não categorizados |

### 4.4 Wireframes Técnicos

O sistema suporta wireframes SVG em escala real exibidos nas propriedades do equipamento. Atualmente implementado:

- **`sce-keypads-prestige-3`**: SVG `pst-kp3.svg`, dimensões **85,27 mm × 122,50 mm**.

A estrutura do arquivo `wireframes.js` está preparada para receber novos wireframes de outros modelos.

---

## 5. Histórico de Atualizações

### v1.0.12 — Wireframe Técnico em Escala Real (Junho de 2026)

Quando o zoom atinge **200% ou mais**, equipamentos com desenho técnico cadastrado passam a ser renderizados com seu SVG em escala real no lugar do ícone.

#### 5.1 Comportamento

| Condição | Renderização |
|---|---|
| `zoom < 200` | Ícone SVG + rótulo à direita (padrão) |
| `zoom >= 200` e wireframe cadastrado | SVG técnico em escala real + rótulo abaixo e centralizado |
| `zoom >= 200` sem wireframe cadastrado | Fallback para ícone padrão |

#### 5.2 Dimensionamento

Tamanho em pixels calculado a partir das dimensões reais (mm) e da escala definida:

```js
width  = (widthMm  / 1000) * scaleDefinition.pixelsPerMeter * zoomScale
height = (heightMm / 1000) * scaleDefinition.pixelsPerMeter * zoomScale
```

#### 5.3 Arquivos Criados / Modificados

| Arquivo | Mudança |
|---|---|
| `src/data/wireframes.js` | Novo arquivo — mapa `EQUIPMENT_WIREFRAMES` com dimensões (mm) por `catalogItemId` |
| `src/components/CadCanvas.jsx` | Lógica de seleção ícone × wireframe no loop de renderização; rótulo abaixo/centralizado no modo wireframe |
| `src/styles/cad.css` | Classe `.cad-equipment-placement--wireframe` para posicionamento alternativo do rótulo |

### v1.0.13 — Slots Dinâmicos e Configuração de Colunas (Junho de 2026)

Esta versão introduziu uma revisão completa do modelo de slots para o **Quadro Custom** e o **Organizador AV**, substituindo as grades de tamanho fixo por um sistema dinâmico e configurável por colunas.

#### 6.1 Quadro Custom — Mudanças

| Aspecto | Antes (v1.0.12) | Depois (v1.0.13) |
|---|---|---|
| Overlay de criação | Pedia "Quantidade de Módulos" (1–24) e "Colunas" (1–6) | Pede apenas "Colunas" (1–12) |
| Slots iniciais | `Array(slotCount).fill(null)` — grade completa vazia | `[null]` — um único slot `+` de abertura |
| Indicador de slot vazio | Número ordinal (1, 2, 3…) | `+` |
| Crescimento da grade | Fixo (definido na criação) | Dinâmico: cresce coluna a coluna até o limite; depois adiciona linhas |
| Limite de itens | Definido na criação (máx. 24) | 99 módulos |
| Remoção de módulo | Slot vira nulo permanentemente | Nulos consecutivos ao final são compactados (mantém 1 slot `+`) |
| Menu contextual | Renomear / Excluir | Renomear / **Propriedades** / Excluir |
| "Propriedades" | — | Reabre o overlay para ajustar o número de colunas sem perda de dados |

#### 6.2 Organizador AV — Mudanças

| Aspecto | Antes (v1.0.12) | Depois (v1.0.13) |
|---|---|---|
| Overlay de criação | Nenhum — criado diretamente no canvas | `AvOrganizerOverlay` (novo) — pede "Colunas" (1–12); cabeçalho azul `#2980b9` |
| Slots iniciais | `Array(9).fill(null)` — 9 slots fixos | `[null]` — um único slot `+` de abertura |
| Indicador de slot vazio | Número ordinal (1…9) | `+` |
| Crescimento da grade | Fixo em 3 colunas | Dinâmico: `Math.min(slots.length, columnCount)` colunas |
| Limite de itens | 9 (fixo) | 99 dispositivos |
| Remoção de dispositivo | Slot vira nulo permanentemente | Nulos consecutivos ao final são compactados |
| Menu contextual | Renomear / Excluir | Renomear / **Propriedades** / Excluir |
| "Propriedades" | — | Reabre o overlay para ajustar o número de colunas |

#### 6.3 Novos Arquivos

| Arquivo | Descrição |
|---|---|
| `src/components/AvOrganizerOverlay.jsx` | Overlay de configuração de colunas do Organizador AV |

#### 6.4 Arquivos Modificados

| Arquivo | Mudanças |
|---|---|
| `src/components/AutomationBoardOverlay.jsx` | Removido input "Quantidade"; renomeado título para "QUANTIDADE DE COLUNAS"; aceita prop `initialColumns` para pré-preencher ao editar |
| `src/components/AvOrganizerOverlay.jsx` | Novo; prop `initialColumns` para edição via "Propriedades" |
| `src/App.jsx` | Novos estados `pendingAvOrganizerPlacement`, `editingBoardId`, `editingAvOrganizerId`; handlers `handleBoardEditRequest/Confirm`, `handleAvOrganizerEditRequest/Confirm`; lógica dinâmica em `handleBoardSlotInstall/Remove` e `handleAvOrganizerSlotInstall/Remove`; `handleCreateAvOrganizer` passa a exibir overlay antes de criar |
| `src/components/CadCanvas.jsx` | Cálculo de colunas dinâmico (`Math.min(slots.length, columnCount)`); slot vazio renderiza `+`; props `onBoardEdit`, `onAvOrganizerEdit`; menu contextual atualizado; `openBoardContextMenu` detecta `isDynamic` para exibir "Propriedades" condicionalmente |
| `src/styles/cad.css` | Adicionado `.cad-multi-overlay__title-bar--av` com `background: #2980b9` |

### v1.0.14 — Ferramentas de Forma, Seleção Múltipla e Alinhamento (Junho de 2026)

Esta versão unifica num único commit: novas ferramentas de criação de formas geométricas com modificadores de teclado, seleção múltipla de itens no canvas (com exclusão em lote) e um conjunto completo de operações de alinhamento e distribuição.

#### 7.1 Ferramentas de Forma

| Ferramenta | Descrição |
|---|---|
| **Elipse** | Renomeada de "Círculo"; gera polígono de 64 segmentos a partir de bounding box de 2 cliques |
| **Triângulo** | Nova ferramenta; gera triângulo isósceles (ou equilátero com Shift) a partir de bounding box de 2 cliques |

Todas as três ferramentas de forma (Retângulo, Elipse, Triângulo) geram polígonos que se comportam como ambientes — passam pelo `onPolygonCreated`, abrem o overlay de ambiente e entram na árvore do projeto.

#### 7.2 Modificadores de Teclado (Shift / Alt)

| Combinação | Comportamento |
|---|---|
| **Shift** | Retângulo → quadrado; Elipse → círculo; Triângulo → equilátero (height = width × √3/2) |
| **Alt** | Centro da forma no 1º ponto clicado; forma expande simetricamente |
| **Shift + Alt** | Forma proporcional e centrada no 1º ponto |

#### 7.3 Seleção Múltipla

**Rubber band (arrastar para selecionar):**

| Aspecto | Comportamento |
|---|---|
| Ativação | Arrastar o mouse na área vazia do canvas com a ferramenta `select` ativa (só quando há planta importada) |
| Limiar | `RUBBER_BAND_MIN_DRAG = 4 px` — cliques simples não ativam o rubber band |
| Feedback visual | Retângulo tracejado na cor de seleção com fill a 8% de opacidade |
| Seleção de polígonos | AABB do rubber band intersecta o bounding box do polígono (`getPolygonBounds`) |
| Seleção de equipamentos | Ponto central do equipamento dentro do rect do rubber band |
| Finalização | Ao soltar o mouse (`window.addEventListener('mouseup')`) |

**Shift+click:** faz toggle individual do item em `multiSelectedPolygonIds` / `multiSelectedEquipmentIds`.

#### 7.4 Exclusão em Lote

Com itens multi-selecionados, `Delete`/`Backspace` dispara `onMultiDeleteRequest`. O `DeleteEnvironmentConfirmOverlay` exibe mensagem adaptada:

| Conteúdo da seleção | Mensagem |
|---|---|
| Apenas equipamentos (N > 1) | "Deseja realmente apagar os N equipamentos selecionados?" |
| Apenas ambientes (N > 1) | "Deseja realmente apagar os N ambientes selecionados?" |
| Apenas 1 equipamento | "Deseja realmente apagar o equipamento selecionado?" |
| Apenas 1 ambiente | "Deseja realmente apagar o ambiente selecionado?" |
| Equipamentos + ambientes | "Deseja realmente apagar os N itens selecionados?" |

#### 7.5 Alinhamento de Itens

Seis botões de alinhamento operam sobre a seleção múltipla:

| Botão | direction | Referência |
|---|---|---|
| Alinhar à esquerda | `'left'` | `min(minX)` de todos os itens |
| Alinhar verticalmente (centro) | `'center-x'` | `(min(minX) + max(maxX)) / 2` |
| Alinhar à direita | `'right'` | `max(maxX)` de todos os itens |
| Alinhar acima | `'top'` | `min(minY)` de todos os itens |
| Alinhar horizontalmente (centro) | `'center-y'` | `(min(minY) + max(maxY)) / 2` |
| Alinhar abaixo | `'bottom'` | `max(maxY)` de todos os itens |

#### 7.6 Distribuição de Itens

Dois botões de distribuição equidistante (requerem 3+ itens; extremidades fixas):

| Botão | direction | Comportamento |
|---|---|---|
| Espaçar verticalmente | `'distribute-y'` | Espaço igual entre bordas no eixo Y |
| Espaçar horizontalmente | `'distribute-x'` | Espaço igual entre bordas no eixo X |

```
gap = (leading_extremo_dir - trailing_extremo_esq - soma_tamanhos_do_meio) / (n - 1)
```

#### 7.7 Ordem dos Botões na Toolbar

| # | Botão | direction |
|---|---|---|
| 1 | Alinhar à esquerda | `'left'` |
| 2 | Alinhar verticalmente (centro) | `'center-x'` |
| 3 | Alinhar à direita | `'right'` |
| 4 | Alinhar acima | `'top'` |
| 5 | Alinhar horizontalmente (centro) | `'center-y'` |
| 6 | Alinhar abaixo | `'bottom'` |
| 7 | Espaçar verticalmente | `'distribute-y'` |
| 8 | Espaçar horizontalmente | `'distribute-x'` |

#### 7.8 Arquivos Criados / Modificados

| Arquivo | Mudanças |
|---|---|
| `src/assets/alinhar-horizontalmente.svg` | Novo ícone — seta dupla horizontal centralizada |
| `src/assets/alinhar-verticalmente.svg` | Novo ícone — seta dupla vertical centralizada |
| `src/assets/espaçar-horizontalmente.svg` | Novo ícone — seta dupla horizontal com linhas âncora |
| `src/assets/espaçar-verticalmente.svg` | Novo ícone — seta dupla vertical com linhas âncora |
| `src/components/TopToolbar.jsx` | Renomeado "Círculo" → "Elipse"; adicionados botões para `center-x`, `center-y`, `distribute-x`, `distribute-y` |
| `src/App.jsx` | Estados `alignRequest`, `alignTokenRef`, `pendingMultiDelete`, `multiDeletePolygonIds`; handlers `handleAlignItems`, `handleEquipmentPointsUpdate`, `handleMultiDeleteRequest`, `handleConfirmMultiDelete` |
| `src/components/CadCanvas.jsx` | Lógica de rubber band; multi-seleção; exclusão em lote; `useEffect` de alinhamento com suporte completo a 8 direções |
| `src/components/DeleteEnvironmentConfirmOverlay.jsx` | Prop `message` com valor padrão; texto dinâmico para exclusão em lote |

---

### v1.0.16 — Cortinas Completas, Zoom e Visibilidade de Textos (Junho de 2026)

Esta versão finaliza o suporte completo às cortinas como elementos retangulares interativos e implementa o sistema de visibilidade progressiva de rótulos por nível de zoom, incluindo posicionamento inteligente para evitar sobreposições.

#### 8.1 Cortinas — Rendering e Interações Completas

As cortinas passaram a ser tratadas como equipamentos de primeira classe, com renderização e interações equivalentes aos demais elementos do canvas.

**Estrutura de dados:**
```js
{ id, catalogItemId, polygonId,
  rectStart: {x, y}, rectEnd: {x, y},  // coordenadas normalizadas [0..1]
  label, iconSrc, iconKey, filterKeys, environmentId,
  motorSide: 'left' | 'right' }
```

**Rendering:**

| Elemento | Comportamento |
|---|---|
| Retângulo | HTML div absolutamente posicionado com `left/top/width/height` em pixels |
| Ícone | Centralizado no retângulo via `.cad-curtain-icon-center` |
| Rótulo | `font-size: 11px` — idêntico aos demais equipamentos; posicionado via `equipmentLabelOffsets` |
| Seleção | Borda azul (`.is-selected`) ao clicar |

**Interações:**

| Ação | Comportamento |
|---|---|
| Clique | Seleciona |
| Duplo clique no rótulo | Renomeio inline (input segue posição atual do rótulo) |
| Botão direito | Menu de contexto: Renomear / Editar tamanho / Trocar lado do motor / Excluir |
| Editar tamanho | Handles nos 4 cantos — arrastar move o canto correspondente com pointer capture |
| Trocar lado do motor | Alterna `motorSide` (`'left'` ↔ `'right'`) |
| `Delete`/`Backspace` | Exclui quando selecionada |

**Movimento com polígono:** ambos os pontos (`rectStart` e `rectEnd`) são rastreados nas 3 fases do arraste de polígono — setup (`initialCurtainRects`), live rendering (aplica `stageDelta` a ambos) e commit (`curtainRects` no payload de `onPolygonTranslated`).

#### 8.2 Sistema de Visibilidade Progressiva por Zoom

Todos os rótulos passam por três estágios baseados no nível de zoom atual:

**Equipamentos** (constantes `EQUIP_TEXT_ZOOM_FULL = 120`, `EQUIP_TEXT_ZOOM_TRUNCATED = 100`):

| Estágio | Faixa | Comportamento |
|---|---|---|
| Completo | ≥ 120% | Rótulo exibido integralmente |
| Truncado | 100%–119% | Rótulo truncado com `…`; `maxWidth` interpolado |
| Oculto | < 100% | Rótulo não renderizado |

**Ambientes** (constantes `ENV_TEXT_ZOOM_FULL = 40`, `ENV_TEXT_ZOOM_TRUNCATED = 20`):

| Estágio | Faixa | Comportamento |
|---|---|---|
| Completo | ≥ 40% | Rótulo + pé-direito exibidos |
| Truncado | 20%–39% | Apenas primeira linha do rótulo; pé-direito oculto |
| Oculto | < 20% | Apenas o polígono renderizado |

`MIN_ZOOM` reduzido de **50% para 10%** nos três arquivos que definem o clamp (`CadCanvas.jsx`, `App.jsx`, `TopToolbar.jsx`), tornando os limiares de ambiente atingíveis.

#### 8.3 Posicionamento Inteligente de Rótulos de Equipamentos

O `useMemo` `equipmentLabelOffsets` calcula `{ left, top, maxWidth }` para cada equipamento visível usando um algoritmo greedy por polígono:

1. Agrupa equipamentos por ambiente
2. Para cada equipamento: testa 8 posições candidatas (abaixo, acima, direita, esquerda + 4 diagonais)
3. Candidato válido: todos os 4 cantos da bounding box do rótulo estão **dentro do polígono** (`isPointInsidePolygon`)
4. Escolhe o candidato com **menor área de sobreposição** com rótulos e ícones já posicionados (`computeOverlapArea`)
5. Fallback para direita se nenhum candidato for válido

O input de renomeio inline aplica o mesmo offset do label calculado, para que o campo apareça na posição atual do rótulo.

#### 8.4 Pulsadores e Teclados com Sensor Embutido (Wall Snap)

Pulsadores com sensor de movimento e teclados com sensor PIR ou OC passaram a ter comportamento especializado no canvas: ao serem soltos no polígono, encostam automaticamente na parede mais próxima e exibem sua área de detecção orientada para o interior do ambiente.

**Tipos de sensor e seus equipamentos:**

| Tipo | Equipamentos |
|---|---|
| **PIR** (cone) | AC-KPUL0/1/2/3-MOV (Virtue e Metal), AC-PULS3-MOV (Essence), EB-KP0M, EB-KP0Mv2, EB-KP6M, EB-KP6Mv2, EB-KP6M-4R-WIFI, ESN-KP3M-PIR, ESN-KP3M-PIR-4R-WIFI, PST-KP6M-PIR |
| **OC** (elipse) | EB-KP6M-OC, ESN-KP3M-OC, PST-KP6M-OC |

**Wall Snap:** ao soltar qualquer item de `WALL_SNAP_CATALOG_IDS` no canvas, a função `snapToNearestWall()` projeta o ponto sobre a aresta mais próxima do polígono e calcula o vetor normal **inward**. O `wallNormal` é salvo no objeto do equipamento e reutilizado para orientar a área de detecção.

**Áreas de detecção:**

| Sensor | Shape | Dimensões | Orientação |
|---|---|---|---|
| PIR | `Wedge` (cone) Konva | Raio 7 m, ângulo 90° fixo | `wallNormal` do equipamento |
| OC | `Ellipse` Konva | Variável por `ocSensitivity` | `wallNormal` do equipamento |

**Sensibilidade OC** (configurável via menu de contexto):

| Nível | Profundidade | Largura |
|---|---|---|
| Baixa | 1 m | 0,667 m |
| Média | 6 m | 6 m |
| Alta | 12 m | 8 m |

Ambas as áreas são recortadas pelo polígono (`clipFunc`) e acompanham o equipamento em tempo real durante arraste e translação de polígono.

**Novos exports em `src/data/equipmentLibrary.js`:** `WALL_SNAP_CATALOG_IDS`, `PIR_SENSOR_CATALOG_IDS`, `OC_SENSOR_CATALOG_IDS`.

#### 8.5 Circuitos de Lâmpadas

Ao inserir múltiplas luminárias via **Adição Múltipla**, um checkbox aparece no overlay: **"As luminárias farão parte do mesmo circuito"** (exclusivo para itens de iluminação: Luminária Genérica, LED RGB PWM, LED CCT/Circadiano).

**Estrutura de dados:** todos os membros do circuito compartilham um `circuitId` único (`'circuit-${Date.now()}'`). O primeiro item recebe `isCircuitLeader: true` e é o **único inserido na árvore do projeto** — os demais existem apenas em `placedEquipments`.

**Representação visual:** uma Konva `Line` azul semitransparente (`rgba(120, 180, 255, 0.6)`, 2px) conecta todos os membros na ordem, atualizada em tempo real durante arraste.

**Comportamento de interação:**

| Ação | Resultado |
|---|---|
| Clique simples | Seleciona todo o circuito; foca o líder na árvore |
| Duplo clique | Isola aquela lâmpada para arraste individual |
| Arraste | Move todo o circuito junto |
| Arraste após isolamento | Move só a lâmpada duplo-clicada |
| Excluir | Remove todos os membros do circuito |

**Painel de propriedades:** exibe contador `lampCount` com o total de lâmpadas do circuito.

#### 8.6 Arquivos Criados / Modificados

| Arquivo | Mudanças |
|---|---|
| `src/components/CadCanvas.jsx` | Seções de cortina (rendering, context menu, resize handles, rename inline, movement); `equipmentLabelOffsets` useMemo; `equipLabelStage`/`envLabelStage`; `MIN_ZOOM = 10`; renderização PIR (Wedge) e OC (Ellipse); `snapToNearestWall`; constantes `PIR_RADIUS_METERS`, `PIR_CONE_ANGLE_DEG`, `OC_DIMENSIONS` |
| `src/data/equipmentLibrary.js` | Exports `WALL_SNAP_CATALOG_IDS`, `PIR_SENSOR_CATALOG_IDS`, `OC_SENSOR_CATALOG_IDS`, `LIGHTING_CATALOG_IDS` |
| `src/components/AddMultipleItemsOverlay.jsx` | Checkbox "mesmo circuito" (visível só para luminárias); prop `isLighting` |
| `src/components/EquipmentPropertiesOverlay.jsx` | Exibe `lampCount` para equipamentos em circuito |
| `src/App.jsx` | `renamingCurtainId`, `selectedCurtainId`; handlers de cortina (rename, delete, select, translate); `MIN_ZOOM = 10` |
| `src/components/TopToolbar.jsx` | `MIN_ZOOM = 10` |
| `src/styles/cad.css` | `.cad-curtain-icon-center` (ícone centralizado); `.cad-curtain-resize-handle` (handle de canto 10×10px) |
| `md/feature-zoom-e-textos.md` | Atualização das tabelas de limiares para refletir constantes reais |

---

*Relatório atualizado em Junho de 2026 — v1.0.16*
