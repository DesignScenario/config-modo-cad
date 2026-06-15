# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar com o código deste repositório.

## Comandos

```bash
npm run dev       # Inicia o servidor de desenvolvimento (Vite + HMR)
npm run build     # Build de produção → dist/
npm run lint      # ESLint
npm run preview   # Pré-visualiza o build de produção
```

Nenhum test runner está configurado.

## Arquitetura

Esta é uma ferramenta CAD 2D baseada em navegador para design de automação predial (residencial/comercial). Permite importar uma planta baixa, definir ambientes desenhando polígonos e posicionar equipamentos (luminárias, interruptores, sensores, etc.) no canvas.

**Stack:** React 19, Vite, Konva.js (canvas 2D), Lucide icons, CSS puro.

### Gerenciamento de estado

Todo o estado da aplicação está em `src/App.jsx`. Não há store global (sem Redux, Zustand ou Context). Props e callbacks são passados explicitamente.

Grupos de estado principais em `App.jsx`:
- **Canvas/viewport** – `activeTool`, `zoom`, `backgroundOpacity`, `imageRotation`
- **Estrutura do projeto** – `projectTree` (árvore hierárquica de nós), `environments`, `placedEquipments`, `placedCurtains`
- **Agrupadores** – `automationBoards`, `avOrganizers`
- **Escala** – `scaleDefinition` (conversão pixel-para-metro), `pendingScaleSegment`
- **Overlays de UI** – flags booleanas (`showEnvironmentOverlay`, `showEquipmentLibrary`, etc.) mais IDs de edição
- **Estado de renomeação** – estado separado por tipo de entidade com `*Id` e `*Source` correspondente (canvas vs árvore): `renamingEnvironmentId`, `renamingEquipmentId`, `renamingGenericNodeId`, `renamingBoardId`, `renamingAvOrganizerId`, `renamingCurtainId`
- **Seleção** – `selectedEquipmentId`, `selectedEnvironmentId`, `selectedBoardId`, `selectedAvOrganizerId`, `selectedCurtainId`

### Camada de canvas

`src/components/CadCanvas.jsx` é o maior componente. Renderiza um `Stage` Konva com:
- Imagem de fundo (planta importada)
- Formas de polígono para cada ambiente
- Marcadores de ícone de equipamento
- Overlay da régua
- Edição de rótulo diretamente no canvas
- Quadros de Automação e Organizadores AV (HTML overlay sobre o Stage Konva)

Ambientes são desenhados como polígonos Konva. Cada polígono é mapeado a um objeto `Environment` via `polygonId`. Os mapas `polygonColorById` e `polygonLabelById` em `App.jsx` são mantidos sincronizados com o array `environments`.

### Estruturas de dados

```js
// Nó da árvore de projeto
{ id, label, icon, source, children: [], expanded }
// valores de source:
//   'pavimento' | 'project' | 'created-environment'
//   'equipment-item' | 'automation-board' | 'board-device'
//   'av-organizer' | 'av-device'

// Ambiente
{ id, polygonId, name, environmentClass, ceilingHeight, color }

// Instância de equipamento posicionado
{ id, catalogItemId, polygonId, point: {x, y}, label, iconSrc, iconKey, environmentId, filterKeys,
  wallNormal?: {x, y},          // vetor unitário inward da parede — presente em WALL_SNAP_CATALOG_IDS
  ocSensitivity?: 'baixa' | 'media' | 'alta',  // sensibilidade do sensor OC — presente em OC_SENSOR_CATALOG_IDS
  circuitId?: string,           // ID do circuito — presente em luminárias do mesmo circuito
  isCircuitLeader?: boolean }   // true apenas no primeiro item do circuito (único na árvore do projeto)

// Quadro de Automação
{ id, catalogItemId, polygonId, point, label, iconSrc, iconKey, filterKeys,
  environmentId,
  slotCount: number | null,  // null = Quadro Custom (dinâmico); 6 ou 12 = fixo
  columnCount: number,       // 1–12, só relevante para Quadro Custom
  pinned: boolean,
  slots: Array<{ id, catalogItemId, label, iconSrc, iconKey } | null> }

// Organizador AV
{ id, catalogItemId, polygonId, point, label, iconSrc, iconKey, filterKeys,
  environmentId,
  columnCount: number,  // 1–12, definido no AvOrganizerOverlay
  pinned: boolean,
  slots: Array<{ id, catalogItemId, label, iconSrc, iconKey } | null> }

// Cortina posicionada
{ id, catalogItemId, polygonId, rectStart: {x,y}, rectEnd: {x,y},
  label, iconSrc, iconKey, filterKeys, environmentId,
  motorSide: 'left' | 'right' }
// rectStart / rectEnd: coordenadas normalizadas [0..1] dos dois cantos opostos do retângulo

// Escala
{ meters, pixels, metersPerPixel, pixelsPerMeter, referenceSegment }
```

A manipulação da árvore usa funções utilitárias recursivas dentro de `App.jsx` (`removeNodeById`, `updateNodeLabel`, `updateNodeSource`, `appendEquipmentToEnvironment`, etc.) e sempre clona via `JSON.parse(JSON.stringify())`.

### Catálogo de equipamentos

`src/data/equipmentLibrary.js` define o catálogo hierárquico completo (categorias: iluminacao, pulsadores, motores, persianas, sensores, drivers, …). A visibilidade dos equipamentos no canvas é controlada pelo objeto de estado `equipmentFilters` e pela função `isEquipmentIconVisible()` em `CadCanvas.jsx`.

**Exports relevantes:**
- `BOARD_CATALOG_IDS` — `Set` com `'sce-quadros-1'`, `'sce-quadros-2'`, `'sce-quadros-3'`
- `AV_ORGANIZER_CATALOG_IDS` — `Set` com `'drv-av-organizer'`
- `isBoardOnlyItem(catalogItemId)` — true para itens que só existem em slots de quadros (prefixos: `sce-automation-*`, `sce-interfaces-*`, `sce-modulos-*`, `sce-entrada-*`)
- `isAvOrganizerOnlyItem(catalogItemId)` — true para todos os itens folha da aba Drivers (exceto o próprio `drv-av-organizer`)
- `getBoardSlotCount(catalogItemId)` — retorna `6`, `12` ou `null` (Custom)

### Wireframes técnicos

Quando `zoom >= 200`, os equipamentos são renderizados com seu desenho técnico em escala real em vez do ícone. A lógica vive inteiramente em `CadCanvas.jsx` (no loop de renderização dos equipamentos) e no mapa `src/data/wireframes.js`.

**`src/data/wireframes.js`** — única fonte de verdade para wireframes:
```js
// Para adicionar um novo wireframe:
// 1. Salve o SVG em src/assets/wireframes/<id>.svg
// 2. Importe-o no topo do arquivo
// 3. Acrescente uma entrada em EQUIPMENT_WIREFRAMES com o catalogItemId do equipamento

export const EQUIPMENT_WIREFRAMES = {
  'sce-keypads-prestige-3': {
    svgUrl: pstKp3Svg,   // import estático do Vite
    widthMm: 85.2698,    // largura real (L) em milímetros
    heightMm: 122.502,   // altura real (A) em milímetros
  },
}
```

**Cálculo de tamanho em pixels** (em `CadCanvas.jsx`):
```js
width  = (widthMm  / 1000) * scaleDefinition.pixelsPerMeter * zoomScale
height = (heightMm / 1000) * scaleDefinition.pixelsPerMeter * zoomScale
```

Se o equipamento não tiver entrada em `EQUIPMENT_WIREFRAMES`, ou se `scaleDefinition` ainda não estiver definida, o comportamento volta ao padrão (ícone + rótulo).

O rótulo no modo wireframe é posicionado abaixo e centralizado; no modo ícone, fica à direita. A classe CSS modificadora `cad-equipment-placement--wireframe` (em `src/styles/cad.css`) controla essa diferença de layout.

### Quadros de Automação

Quadros de Automação são equipamentos Scenario especiais que possuem slots para instalação de módulos. Três tipos, definidos pelo `catalogItemId`:

| catalogItemId | Label | Slots |
|---|---|---|
| `sce-quadros-1` | AC-QA6M | 6 (fixo) |
| `sce-quadros-2` | AC-QA12M | 12 (fixo) |
| `sce-quadros-3` | Quadro Custom | dinâmico, até 99 módulos (colunas 1–12) |

**Fluxo de criação** (em App.jsx `handleEquipmentDropped`):
1. Se `isBoardOnlyItem` → rejeitado (só aceito em slots de quadros)
2. Se `BOARD_CATALOG_IDS`: AC-QA6M/AC-QA12M → `handleCreateBoard` imediato; Quadro Custom → abre `AutomationBoardOverlay` para escolha do número de colunas (1–12)

**Renderização** em `CadCanvas.jsx`:
- Estado **Padrão**: pin + ícone + rótulo
- Estado **Hover / Pinado**: expande grade de slots (CSS `:hover` + classe `is-pinned`)
- Slot vazio: drop target; slot ocupado: botão direito → menu "Remover dispositivo"
- Pin: clique alterna `board.pinned`
- Rótulo obedece ao filtro `equipmentFilters.text`

### Organizador AV

Organizador AV é o equivalente dos Quadros de Automação para a aba **Drivers**. Um único tipo:

| catalogItemId | Label | Slots |
|---|---|---|
| `drv-av-organizer` | Organizador AV | dinâmico, até 99 dispositivos (colunas 1–12) |

**Regra de negócio:** todos os itens folha da aba Drivers (`isAvOrganizerOnlyItem`) só podem ser instalados em slots de um Organizador AV — não podem ser soltos diretamente no canvas.

**Estado** em `App.jsx` (`avOrganizers`): mesma forma do `automationBoards`, com `columnCount` (1–12) e `slots` dinâmicos (sem `slotCount` fixo).

**Fluxo de criação** (em `handleEquipmentDropped`):
1. Se `isAvOrganizerOnlyItem` → rejeitado
2. Se `AV_ORGANIZER_CATALOG_IDS` → abre `AvOrganizerOverlay` para escolha do número de colunas (1–12), depois `handleCreateAvOrganizer`

**Renderização** em `CadCanvas.jsx`:
- Layout e comportamento idênticos ao Quadro de Automação
- Grade dinâmica: `Math.min(slots.length, columnCount)` colunas; slot vazio exibido com `+`
- Opção **Propriedades** no menu contextual reabre o `AvOrganizerOverlay` para reconfigurar colunas
- CSS: `.cad-av-organizer-placement`, `.cad-av-organizer-structure`, `.cad-av-organizer-slot` — tema azul (`#2980b9` e tonalidades); título do overlay via `.cad-multi-overlay__title-bar--av`
- Pin reutiliza `.cad-board-pin`
- Rótulo obedece ao filtro `equipmentFilters.text`

**Movimento com polígono:** ao arrastar um ambiente, `draggingPolygon.initialAvOrganizerPoints` rastreia as posições iniciais dos organizadores pertencentes ao polígono, e `onPolygonTranslated` recebe `avOrganizerPoints` para persistir as novas posições.

### Cortinas

Cortinas são equipamentos especiais que ocupam uma **área retangular** no canvas (em vez de um ponto). Cada cortina tem dois pontos normalizados: `rectStart` e `rectEnd` (cantos opostos do retângulo).

**Fluxo de criação:** ao soltar um item de cortina no canvas, `pendingCurtainEquipment` é definido e o canvas entra em modo de desenho retangular por dois cliques:
1. Clique 1 → define `curtainDraftStart` (coordenada normalizada)
2. Mouse move → atualiza `curtainDraftCursor` (preview do retângulo)
3. Clique 2 → chama `onCurtainRectDrawn` com `{ rectStart, rectEnd, equipment }` e limpa o estado de rascunho

O início do retângulo é capturado em `handleCanvasMouseDownCapture` (fase de captura DOM) para não ser bloqueado pelo `event.cancelBubble` dos polígonos.

**Renderização** em `CadCanvas.jsx` (HTML overlay sobre o Stage Konva):
- `<div class="cad-curtain-placement">` posicionado com `left/top/width/height` calculados dos dois pontos normalizados
- `<div class="cad-curtain-icon-center">` centralizado no retângulo (ícone + rótulo); `font-size: 11px`; `pointer-events: none` no wrapper, `pointer-events: auto` nos filhos (input/span)
- Rótulo usa `equipmentLabelOffsets` para posicionamento inteligente (igual a equipamentos avulsos)
- Input de renomeio inline aplica o mesmo offset `left/top/transform:none` do label

**Interações:**
- Clique → seleciona (`.is-selected`)
- Duplo clique no rótulo → renomeio inline
- Botão direito → menu de contexto: **Renomear**, **Editar tamanho**, **Trocar lado do motor**, **Excluir**
- **Editar tamanho**: ativa handles nos 4 cantos (`.cad-curtain-resize-handle`); arrastar um canto move o `rectStart` ou `rectEnd` correspondente com pointer capture
- **Trocar lado do motor**: alterna `motorSide` entre `'left'` e `'right'`; ícone do motor exibido no lado correspondente
- `Delete`/`Backspace` enquanto selecionada → exclui

**Movimento com polígono:** obrigatório rastrear as DUAS coordenadas normalizadas em 3 fases:
1. **Setup** (`handlePolygonMouseDown`): captura `initialCurtainRects: [{ id, rectStart, rectEnd }]`
2. **Live rendering**: aplica `stageDelta` a ambos os pontos via `normToStage` → deslocamento → `stageToNorm`
3. **Commit** (`onPolygonTranslated`): recebe `curtainRects: [{ curtainId, rectStart, rectEnd }]` → App.jsx atualiza `placedCurtains`

### Zoom e Visibilidade de Textos

O sistema controla a visibilidade de todos os rótulos baseado no nível de zoom atual, usando constantes configuráveis em `CadCanvas.jsx`:

```js
const EQUIP_TEXT_ZOOM_FULL       = 120   // ≥120%: exibe completo
const EQUIP_TEXT_ZOOM_TRUNCATED  = 100   // 100–119%: truncado com reticências
// <100%: oculto

const ENV_TEXT_ZOOM_FULL         = 40    // ≥40%: exibe completo
const ENV_TEXT_ZOOM_TRUNCATED    = 20    // 20–39%: truncado; pé-direito oculto
// <20%: oculto
```

`MIN_ZOOM = 10` (em `CadCanvas.jsx`, `App.jsx` e `TopToolbar.jsx`) — zoom mínimo de 10% para que os limiares de ambiente (40%/20%) sejam atingíveis.

**Computed values** (não hooks, recalculados a cada render):
```js
const equipLabelStage = zoom >= EQUIP_TEXT_ZOOM_FULL ? 'full'
  : zoom >= EQUIP_TEXT_ZOOM_TRUNCATED ? 'truncated' : 'hidden'
const envLabelStage = zoom >= ENV_TEXT_ZOOM_FULL ? 'full'
  : zoom >= ENV_TEXT_ZOOM_TRUNCATED ? 'truncated' : 'hidden'
```

Aplicados a todos os tipos de rótulo: equipamentos avulsos, boards, organizadores AV, cortinas, rótulos de polígono.

### Posicionamento Inteligente de Rótulos de Equipamentos

`equipmentLabelOffsets` — `useMemo` em `CadCanvas.jsx` que calcula `{ left, top, maxWidth }` para cada equipamento visível, evitando sobreposições.

```js
// deps: [placedEquipments, polygons, fittedBackgroundImage, equipLabelStage, zoom, equipmentFilters]
// retorna {} se equipLabelStage === 'hidden' ou filtro de texto está desativado
```

**Algoritmo greedy por polígono:**
1. Agrupa equipamentos por `polygonId`
2. Para cada equipamento (na ordem do array): testa 8 candidatos de posição — abaixo, acima, direita, esquerda, diagonal-BR, diagonal-BL, diagonal-TR, diagonal-TL
3. Candidato válido: todos os 4 cantos da bounding box do label estão **dentro do polígono** (via `isPointInsidePolygon`, ray-casting)
4. Entre os válidos: escolhe o de **menor área de sobreposição** com labels já posicionados e com outros ícones (`computeOverlapArea`)
5. Sem candidato válido: usa `right` (direita) como fallback
6. O label posicionado é acrescentado à lista de "caixas ocupadas" para as próximas iterações

No modo **truncado**: `maxWidth` é interpolado entre `rawLabelWidth` e um mínimo de 20px conforme o zoom se aproxima de `EQUIP_TEXT_ZOOM_TRUNCATED`.

O input de renomeio inline aplica o mesmo `{ left, top, transform: 'none' }` do `equipmentLabelOffsets`, para que o campo apareça na posição atual do rótulo.

### Circuitos de Lâmpadas

Ao inserir múltiplas luminárias via **Adição Múltipla**, o overlay `AddMultipleItemsOverlay` exibe uma checkbox **"As luminárias farão parte do mesmo circuito"** — visível apenas quando o item é do tipo `LIGHTING_CATALOG_IDS` (`amb-iluminacao-1`, `amb-iluminacao-2`, `amb-iluminacao-3`).

**Criação** (em `handleMultiAddPointsCommitted` no `App.jsx`):
- `circuitId = 'circuit-${Date.now()}'` compartilhado por todos os membros
- Primeiro item recebe `isCircuitLeader: true` → **único** a ser inserido na árvore do projeto
- Demais membros têm `circuitId` mas `isCircuitLeader` ausente/false → invisíveis na árvore

**Renderização** em `CadCanvas.jsx`:
- Konva `Line` conectando os pontos de todos os membros do circuito na ordem do array; cor `rgba(120, 180, 255, 0.6)`, `strokeWidth: 2`, `listening: false`
- Linha atualiza em tempo real durante arraste (usa `getEquipmentDragPoint`) e durante arraste de polígono (aplica `stageDelta`)

**Comportamento de clique/arraste:**

| Ação | Resultado |
|---|---|
| Clique simples em membro | Seleciona **todos** os membros (`multiSelectedEquipmentIds`); foca o líder na árvore |
| Duplo clique em membro | **Isola** aquela lâmpada (limpa multi-seleção, seleciona só ela) para arraste individual |
| Hold-drag após clique simples | Move todo o circuito junto — `draggingEquipment.circuitMembers` contém posições iniciais de cada membro |
| Hold-drag após isolamento (duplo clique) | Move só a lâmpada clicada (`isCircuitSolo = true`) |

**Exclusão:** ao excluir qualquer membro, o `App.jsx` detecta `circuitId`, remove **todos** os membros de `placedEquipments` e remove o nó do líder da árvore.

**Renomeação / Propriedades:** operações apontam para o líder; painel de propriedades exibe `lampCount` (total de membros do circuito).

### Pulsadores e Teclados com Sensor Embutido (Wall Snap)

Pulsadores com sensor de movimento (ex.: AC-KPUL*-MOV, AC-PULS3-MOV) e teclados com sensor PIR ou OC (ex.: EB-KP0M, EB-KP6M, ESN-KP3M-PIR, PST-KP6M-PIR, EB-KP6M-OC, ESN-KP3M-OC, PST-KP6M-OC) têm comportamento especial ao serem posicionados no canvas.

**Três sets exportados de `src/data/equipmentLibrary.js`:**
- `WALL_SNAP_CATALOG_IDS` — todos os pulsadores e teclados (com e sem sensor); ao soltar no canvas, o ponto é projetado sobre a aresta mais próxima do polígono
- `PIR_SENSOR_CATALOG_IDS` — subconjunto dos acima que têm sensor PIR (pulsadores-MOV + keypads com PIR)
- `OC_SENSOR_CATALOG_IDS` — subconjunto que tem sensor OC (keypads com OC)

**Wall snap — `snapToNearestWall(normPoint, polygonNormPoints)`** (função de módulo em `CadCanvas.jsx`):
- Projeta `normPoint` sobre cada aresta do polígono e retorna o ponto de projeção mais próximo
- Retorna `{ point: {x,y}, normal: {x,y} }` onde `normal` é o vetor unitário **inward** (perpendicular à aresta, apontando para o interior)
- `normal` é armazenado como `wallNormal` no objeto do equipamento e persiste no estado

**Áreas de detecção renderizadas em `CadCanvas.jsx`:**

| Tipo | Set | Shape Konva | Dimensões | Orientação |
|---|---|---|---|---|
| **PIR** | `PIR_SENSOR_CATALOG_IDS` | `Wedge` (cone) | Raio fixo 7 m, ângulo 90° | `wallNormal` do equipamento |
| **OC** | `OC_SENSOR_CATALOG_IDS` | `Ellipse` | Variável por `ocSensitivity` | `wallNormal` do equipamento |

**Dimensões OC por sensibilidade** (`OC_DIMENSIONS` em `CadCanvas.jsx`):

| `ocSensitivity` | profundidade | largura |
|---|---|---|
| `'baixa'` | 1 m | 0,667 m |
| `'media'` | 6 m | 6 m |
| `'alta'` | 12 m | 8 m |

A sensibilidade é configurável via menu de contexto (item extra em equipamentos `OC_SENSOR_CATALOG_IDS`). O default é `'media'` quando `ocSensitivity` não está definido.

Ambas as áreas são recortadas pelo polígono do ambiente (mesmo padrão `clipFunc` dos sensores de teto) e acompanham o equipamento durante arraste e movimento de polígono.

**Constantes relevantes em `CadCanvas.jsx`:**
```js
const PIR_RADIUS_METERS   = 7
const PIR_CONE_ANGLE_DEG  = 90
const OC_DIMENSIONS = {
  baixa: { depthM: 1,  widthM: 0.667 },
  media: { depthM: 6,  widthM: 6     },
  alta:  { depthM: 12, widthM: 8     },
}
```

### Área de atuação dos sensores

Sensores de movimento instalados no teto (AC-MOV-TETO, EB-SMT, EB-SMTv2) exibem sua área de detecção projetada no piso como um círculo recortado pelo polígono do ambiente.

**IDs de catálogo com detecção:** `amb-acessorios-1`, `sce-sensores-1`, `sce-sensores-2` — definidos em `SENSOR_CATALOG_IDS` em `CadCanvas.jsx`.

**Cálculo do raio** (em `CadCanvas.jsx`):
```js
// ângulo de abertura: 100° → metade = 50°
radiusPixels = ceilingHeight × tan(50°) × scaleDefinition.pixelsPerMeter × zoomScale
```

Onde `ceilingHeight` vem de `polygonCeilingHeightById[equipment.polygonId]` (string numérica, parseada com `Number.parseFloat`).

**Renderização:** Konva `Group` com `clipFunc` desenhando o polígono do ambiente → `Circle` dentro do grupo. A área visível é automaticamente a interseção círculo ∩ polígono. Estilo: fill `#F5D59D` a 0.25 de opacidade, stroke `#F5D59D` 4px. Só renderiza quando `scaleDefinition` está definida e o equipamento está visível pelos filtros ativos.

**Movimento em tempo real:** o centro do círculo usa `draggingEquipment.point` quando o sensor está sendo arrastado, e `draggingPolygon.stageDelta` quando o ambiente está sendo arrastado — assim a área acompanha o ícone instantaneamente.

### Árvore de projeto e drag-and-drop

`src/components/ProjectTree.jsx` renderiza a hierarquia de nós. Comportamentos por `source`:

| source | Arrastável | Duplo clique | Contexto |
|---|---|---|---|
| `created-environment` | Sim (para associar ao overlay de ambiente) | Foca o polígono no canvas | Renomear / Editar / Excluir |
| `equipment-item` | Não | Renomear | Renomear / Excluir |
| `automation-board` | Não | Renomear | Renomear / Excluir |
| `board-device` | Não | Renomear | Renomear / Excluir |
| `av-organizer` | Não | Renomear | Renomear / Excluir |
| `av-device` | Não | Renomear | Renomear / Excluir |

**Associação ambiente ↔ nó da árvore:**
Nós `created-environment` podem ser arrastados para o overlay de ambiente (`application/x-env-node`). Ao concluir a associação, `updateNodeSource` atualiza o `source` do nó para `'created-environment'` no `projectTree`, e `handleFocusNodeFromTree` passa a reconhecer o nó como ambiente.

### Desfazer / Refazer (Undo / Redo)

Implementado via hook `src/hooks/useUndoRedo.js` com pilha dupla (undoStack / redoStack) limitada a **50 entradas**. O estado dos polygons do canvas é rastreado em paralelo em `App.jsx` para que o sync com CadCanvas seja completo.

**Estados adicionados em `App.jsx`:**
- `polygons` — `[{ id, points, color, label }]` — espelha a geometria dos polígonos do CadCanvas para inclusão no snapshot
- `syncPolygons` — `{ polygons }` — prop passada ao CadCanvas; quando o objeto muda, um `useEffect` em CadCanvas substitui sua lista interna de polígonos

**Snapshot** — capturado antes de cada mutação estrutural via `pushSnapshotMaybe()`:
```js
{ projectTree, environments, placedEquipments, placedCurtains,
  automationBoards, avOrganizers, scaleDefinition, polygonColorById, polygons }
```

Estado **excluído** do snapshot (UI / viewport / efêmero): `activeTool`, `zoom`, `backgroundOpacity`, `importedImage`, `imageRotation`, overlays, seleção, renomeação em andamento.

**`isBatchingRef`** — flag `useRef` que suprime snapshots durante operações que disparam múltiplos callbacks (alinhamento de N polígonos, exclusão em lote). `handleAlignItems` empurra **um único snapshot** e liga o flag; `handleAlignConsumed` desliga.

**Atalhos de teclado:** `Ctrl+Z` → desfazer, `Ctrl+Y` / `Ctrl+Shift+Z` → refazer. Implementados com `useRef` para evitar closure stale.

**Escala como ponto de partida:** `handleConcludeScale` chama `clearHistory()` após definir a escala — apaga todo o histórico anterior. Não há snapshot da escala em si; ela é o "início" intransponível do histórico.

**Sincronização bidirecional com CadCanvas:**
- `handlePolygonCreated` — não modifica `polygons` (polígono ainda está pendente de confirmação)
- `handleConcludeEnvironment` — adiciona `{ id, points, color, label }` a `polygons` ao confirmar
- `handlePolygonDeleted` — remove de `polygons`
- `handlePolygonTranslated` — aceita `newPolygonPoints` e atualiza `polygons`; CadCanvas passa esse campo nos três locais que chamam `onPolygonTranslated` (drag, distribute-align, edge-align)
- `handleCommitRename` (ambiente) e edição de ambiente — mantêm `label` e `color` de `polygons` sincronizados

**Por que `color` e `label` são necessários no snapshot:** CadCanvas tem `useEffect`s que aplicam `polygonColorById` e `polygonLabelById` à sua lista interna de polígonos. Quando `syncPolygons` repõe os polígonos após undo/redo, esses efeitos já rodaram e não re-disparam. Se `color` fosse `undefined`, `hexToRgba(polygon.color, 0.25)` lançaria `TypeError`. A solução é armazenar o objeto completo no snapshot.

### Versionamento

A versão da aplicação é injetada em tempo de build pelo Vite:

```js
// vite.config.js
__APP_VERSION__ = `1.0.${git rev-list --count HEAD}`
```

O valor é exibido no footer/statusbar como `1.0.X` onde `X` é o total de commits. `__APP_VERSION__` está declarado como global `readonly` no `eslint.config.js`.

O número de versão incrementa **exclusivamente ao fazer um novo commit** — não por cada troca de mensagens no chat. O histórico de versões em `md/relatorio-modo-cad.md` deve registrar exatamente uma entrada por commit, com o número da versão correspondendo ao total de commits no momento do commit.

**Deploy no Vercel:** o Vercel faz clone raso por padrão (shallow clone), o que faz `git rev-list --count HEAD` retornar um número errado. O `vercel.json` na raiz do projeto corrige isso executando `git fetch --unshallow` antes do build:
```json
{ "buildCommand": "git fetch --unshallow 2>/dev/null || true && npm run build" }
```

### Padrão de overlays

Os overlays modais são componentes `<div>` posicionados renderizados condicionalmente. São arrastáveis via `src/hooks/useDraggable.js`. Cada overlay recebe callbacks `onConclude` / `onCancel`. O estado dos overlays é gerenciado em `App.jsx`.

### Ferramentas ativas

`activeTool` alterna entre: `select` | `polygon` | `ruler` | `rectangle` | `elipse` | `triangle` | `move`. O estado da ferramenta determina o comportamento dos eventos de clique/arraste no canvas e quais botões da toolbar ficam ativos.

As ferramentas de forma (`SHAPE_DRAW_TOOLS = new Set(['rectangle', 'elipse', 'triangle'])`) seguem o mesmo padrão de 2 cliques:
- Clique 1: define `shapeDraftStart` (ponto inicial, coords normalizadas)
- Movimento do mouse: atualiza `shapeDraftCursor` e `shapeDraftModifiers` (`shiftKey`, `altKey`)
- Clique 2: chama `computeShapeBox` + `pointsFromShapeBox` para gerar os pontos do polígono

**Modificadores (Shift / Alt)**:
- `Shift`: Retângulo → quadrado; Elipse → círculo; Triângulo → equilátero (height = width × √3/2)
- `Alt`: centro no primeiro ponto, forma expande para todos os lados
- `Shift + Alt`: forma proporcional centrada no primeiro ponto

**Triângulo**: vértices em `(x1,y2)`, `(x2,y2)`, `((x1+x2)/2, y1)` — base na base do bounding box, ápice no centro da linha superior.

**Elipse**: 64 segmentos de polígono calculados com `cos/sin` sobre o bounding box normalizado.

**Importante — espaço de coordenadas para Shift**: `computeShapeBox` é executado em coordenadas de stage (pixels), não normalizadas, pois a imagem pode ter proporção diferente de 1:1 e distorceria o cálculo do quadrado/equilátero. O resultado é convertido de volta para coords normalizadas com `stageToNorm`.

### Seleção múltipla (ferramenta `select`)

Estado local em `CadCanvas.jsx` (não em `App.jsx`):
```js
const [rubberBand, setRubberBand] = useState(null)
// { startStage: {x,y}, endStage: {x,y} }

const [multiSelectedPolygonIds, setMultiSelectedPolygonIds] = useState(new Set())
const [multiSelectedEquipmentIds, setMultiSelectedEquipmentIds] = useState(new Set())
```

**Rubber band (arrastar para selecionar):**
- Arrastar no Stage com a ferramenta `select` ativa inicia o rubber band — só quando `fittedBackgroundImage` está definida (sem imagem importada, rubber band não é criado)
- O `<Rect>` Konva tracejado só é renderizado quando a distância de arraste ≥ `RUBBER_BAND_MIN_DRAG = 4 px` — cliques simples não exibem o retângulo
- Durante o arraste, `rubberBand.endStage` é atualizado em `handleStageMouseMove` (cor `SELECTED_POLYGON_COLOR`, fill com 8% de opacidade)
- Ao soltar o mouse (`window.addEventListener('mouseup')`): calcula AABB do rubber band em coords normalizadas, testa interseção com cada polígono (`getPolygonBounds`) e cada equipamento (ponto dentro do rect); o resultado substitui `multiSelectedPolygonIds`/`multiSelectedEquipmentIds`

**Shift+click:**
- `handlePolygonMouseDown` com `event.evt.shiftKey`: faz toggle do `polygonId` em `multiSelectedPolygonIds`
- `handleEquipmentMouseDown` (HTML overlays) com `event.shiftKey`: faz toggle do `equipment.id` em `multiSelectedEquipmentIds`

**Rendering:**
- Polígono selecionado: `polygon.id === selectedPolygonId || multiSelectedPolygonIds.has(polygon.id)`
- Equipamento selecionado: `selectedEquipmentId === equipment.id || multiSelectedEquipmentIds.has(equipment.id)`
- A seleção múltipla é zerada ao mudar de ferramenta ou ao clicar em área vazia sem Shift

**Exclusão em lote (Delete/Backspace):**
- Quando há multi-seleção ativa, `Delete`/`Backspace` dispara `onMultiDeleteRequest([...polygonIds], [...equipmentIds])` em vez da exclusão individual
- CadCanvas limpa imediatamente `multiSelectedPolygonIds` e `multiSelectedEquipmentIds` após disparar o request
- App.jsx armazena em `pendingMultiDelete` e exibe `DeleteEnvironmentConfirmOverlay` com mensagem contextual:
  - Só equipamentos: "Deseja realmente apagar os N equipamentos selecionados?"
  - Só ambientes: "Deseja realmente apagar os N ambientes selecionados?"
  - Misto: "Deseja realmente apagar os N itens selecionados?"
- Ao confirmar (`handleConfirmMultiDelete`): itera sobre `polygonIds` chamando `handlePolygonDeleted` e sobre `equipmentIds` chamando `handleDeleteEquipment`; seta `multiDeletePolygonIds` para CadCanvas remover os shapes Konva
- CadCanvas tem `useEffect` para `deletePolygonIds` (array) que filtra todos os polígonos de uma vez (análogo ao `deletePolygonId` singular)

**Observação:** o estado de seleção única em `App.jsx` (`selectedEquipmentId`, `selectedEnvironmentId`, etc.) não é alterado pela seleção múltipla — continua controlando rename/delete/properties de item único.

### Alinhamento e distribuição de itens selecionados

Os botões de alinhamento/distribuição da toolbar operam sobre a seleção múltipla ativa (`multiSelectedPolygonIds` + `multiSelectedEquipmentIds`). São 8 botões no total, em ordem:

| Botão | direction | Posição na toolbar |
|---|---|---|
| Alinhar à esquerda | `'left'` | 1 |
| Alinhar verticalmente (centro-x) | `'center-x'` | 2 |
| Alinhar à direita | `'right'` | 3 |
| Alinhar acima | `'top'` | 4 |
| Alinhar horizontalmente (centro-y) | `'center-y'` | 5 |
| Alinhar abaixo | `'bottom'` | 6 |
| Espaçar verticalmente | `'distribute-y'` | 7 |
| Espaçar horizontalmente | `'distribute-x'` | 8 |

**Fluxo:**
1. Clique num botão → `TopToolbar` chama `onAlignItems(direction)`
2. App.jsx incrementa `alignTokenRef.current` e define `alignRequest = { direction, token }` (token garante que cliques repetidos na mesma direção re-disparam o efeito)
3. CadCanvas tem `useEffect` que observa **apenas** `[alignRequest]` (com `eslint-disable-next-line react-hooks/exhaustive-deps`) e executa a operação; chama `onAlignConsumed()` ao final para zerar o request

**Referência de alinhamento (coords normalizadas):**
- `left`: `min(todos os minX)` — alinha borda esquerda ao item mais à esquerda
- `right`: `max(todos os maxX)` — alinha borda direita ao item mais à direita
- `top`: `min(todos os minY)` — alinha borda superior ao item mais acima
- `bottom`: `max(todos os maxY)` — alinha borda inferior ao item mais abaixo
- `center-x`: `(min(minX) + max(maxX)) / 2` — centraliza horizontalmente no meio do conjunto
- `center-y`: `(min(minY) + max(maxY)) / 2` — centraliza verticalmente no meio do conjunto

**Distribuição (`distribute-x` / `distribute-y`):**
- Requer 3+ itens selecionados; com menos, não faz nada
- Os dois itens das extremidades ficam fixos; os do meio são redistribuídos com o mesmo **espaço entre as bordas** (`gap`):
  ```
  gap = (leading_extremo_dir - trailing_extremo_esq - soma_tamanhos_do_meio) / (n - 1)
  ```
- Para **polígonos**: tamanho = largura (`distribute-x`) ou altura (`distribute-y`) do bounding box
- Para **equipamentos** (ponto sem dimensão): `tamanho = 0` → espaçamento igual entre os pontos

**Por tipo de item:**
- **Polígono**: usa `getPolygonBounds(polygon.points)` para o bounding box; todos os vértices são traduzidos por `(dx, dy)`; `onPolygonTranslated` é chamado para persistir equipamentos, quadros e organizadores AV contidos no polígono
- **Equipamento avulso** (não pertence a polígono selecionado): ponto alinhado/redistribuído via `onEquipmentPointsUpdate`
- **Equipamento dentro de polígono selecionado**: ignorado — move com o polígono automaticamente

`onEquipmentPointsUpdate(updates)` em `App.jsx` faz um `setPlacedEquipments` direto sem alterar o `polygonId` ou a árvore.

### Convenções de nomenclatura

- Strings de UI e nomes de variáveis estão em **português** (ex.: `pavimento`, `pé direito`, `rótulo`, `régua`)
- Arquivos de componentes usam PascalCase; hooks usam camelCase com prefixo `use`
- CSS usa nomes de classe estilo BEM definidos em `src/styles/cad.css` com propriedades customizadas para o tema escuro
