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

// Quadro de Automação (fixo — AC-QA6M / AC-QA12M)
{ id, catalogItemId, polygonId, point, label, iconSrc, iconKey, filterKeys,
  environmentId,
  slotCount: number,  // 6 ou 12
  slots: Array<{ id, catalogItemId, label, iconSrc, iconKey } | null> }
// Renderizado como wireframe técnico em escala real (ponto único, clampado no polígono) — ver seção "Quadros de Automação"

// Quadro Custom (entidade própria — sce-quadros-3, não faz mais parte de automationBoards)
{ id, catalogItemId, polygonId, rectStart: {x,y}, rectEnd: {x,y},
  label, iconSrc, iconKey, filterKeys, environmentId,
  slots: Array<{ id, catalogItemId, label, iconSrc, iconKey } | null> }

// Organizador AV
{ id, catalogItemId, polygonId, rectStart: {x,y}, rectEnd: {x,y},
  label, iconSrc, iconKey, filterKeys, environmentId,
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
- `BOARD_CATALOG_IDS` — `Set` com `'sce-quadros-1'`, `'sce-quadros-2'` (quadros fixos, 6/12 slots)
- `CUSTOM_BOARD_CATALOG_IDS` — `Set` com `'sce-quadros-3'` (Quadro Custom — entidade própria `customBoards`, ver seção dedicada)
- `AV_ORGANIZER_CATALOG_IDS` — `Set` com `'drv-av-organizer'`
- `isBoardOnlyItem(catalogItemId)` — true para itens que só existem em slots de quadros (prefixos: `sce-automation-*`, `sce-interfaces-*`, `sce-modulos-*`, `sce-entrada-*`)
- `isAvOrganizerOnlyItem(catalogItemId)` — true para todos os itens folha da aba Drivers (exceto o próprio `drv-av-organizer`)
- `getBoardSlotCount(catalogItemId)` — retorna `6` ou `12`

### Wireframes técnicos

Equipamentos com entrada em `EQUIPMENT_WIREFRAMES` são renderizados com seu desenho técnico em escala real em vez do ícone, **em qualquer nível de zoom** — basta `scaleDefinition` já estar definida. Não há mais limiar de zoom para esse comportamento (versões anteriores exigiam `zoom >= 200`). A lógica vive inteiramente em `CadCanvas.jsx` (no loop de renderização dos equipamentos) e no mapa `src/data/wireframes.js`.

O catálogo cobre hoje: Quadros de Automação fixos (AC-QA6M/AC-QA12M), sensores de teto (AC-MOV-TETO, EB-SMT/v2), AC-TMD, pulsadores Essence (AC-PULS2/3), todos os Keypads Virtue (Standard e Metal)/Essence/Prestige, e os Touch Panels (EB-TW4, EB-TW10).

Equipamentos com `wallNormal` (itens de `WALL_SNAP_CATALOG_IDS`) têm a posição do wireframe deslocada para que a borda externa do desenho fique encostada na parede, em vez de centralizar o desenho sobre o ponto de ancoragem.

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

### Quadros de Automação (fixos)

Quadros de Automação fixos são equipamentos Scenario com número de slots imutável, definidos pelo `catalogItemId`:

| catalogItemId | Label | Slots |
|---|---|---|
| `sce-quadros-1` | AC-QA6M | 6 (fixo) |
| `sce-quadros-2` | AC-QA12M | 12 (fixo) |

Vivem em `automationBoards` (`App.jsx`). O Quadro Custom (`sce-quadros-3`) **não** faz mais parte desse grupo — é uma entidade própria (`customBoards`), ver seção seguinte.

**Fluxo de criação** (em App.jsx `handleEquipmentDropped`):
1. Se `isBoardOnlyItem` → rejeitado (só aceito em slots de quadros)
2. Se `AV_ORGANIZER_CATALOG_IDS` → fluxo do Organizador AV (ver seção própria)
3. Se `CUSTOM_BOARD_CATALOG_IDS` → fluxo do Quadro Custom (ver seção própria)
4. Se `BOARD_CATALOG_IDS` (AC-QA6M/AC-QA12M) → `handleCreateBoard` imediato, com `slotCount` de `getBoardSlotCount(catalogItemId)`

**Renderização** em `CadCanvas.jsx`: ambos têm entrada em `EQUIPMENT_WIREFRAMES` (`ac-qa-6m.svg` / `ac-qa-12m.svg`, 500×110 mm) e por isso são renderizados como **wireframe técnico em escala real** (classe `cad-board-placement--wireframe`), não mais como ícone + grade de slots:
- Ponto único (não retângulo), sempre restrito (clamp) para permanecer dentro do polígono do ambiente — tanto durante o arraste quanto na renderização estática.
- **Trigger**: botão seta (`cad-board-trigger`, `▸`/`◂`) ao lado do wireframe; inverte de lado automaticamente se não houver espaço dentro do polígono. Clique abre/fecha um dropdown (`cad-board-dropdown`) listando os módulos instalados, cada um com botão de remover (`×`, chama `onBoardSlotRemove`). Clique fora fecha o dropdown.
- **Instalação de módulo**: continua via drag-and-drop nativo — arrastar um item da biblioteca e soltar sobre o retângulo do wireframe (não mais sobre células de slot individuais). `onDragOver`/`onDrop` checam `application/x-board-only-item` para dar feedback visual (`is-drop-target` se há espaço, `is-invalid-target` se o quadro está cheio); arrastar um item de quadro sobre o wireframe abre o dropdown automaticamente como preview. O payload real instalado ainda vem de `application/x-equipment-item`.
- Pin (`board.pinned`) e a grade expansível por hover foram **removidos** para este tipo — a lista de módulos só aparece via dropdown do trigger.
- Rótulo obedece ao filtro `equipmentFilters.text`, usando o padrão `.cad-board-wf-label` (abaixo do wireframe).

### Quadro Custom

O Quadro Custom (`sce-quadros-3`, label "Quadro Custom") deixou de fazer parte de `automationBoards` e agora é uma entidade própria em `App.jsx`:

```js
// Quadro Custom
{ id, catalogItemId, polygonId, rectStart: {x,y}, rectEnd: {x,y},
  label, iconSrc, iconKey, filterKeys, environmentId,
  slots: Array<{ id, catalogItemId, label, iconSrc, iconKey } | null> }
// rectStart / rectEnd: coordenadas normalizadas [0..1], mesmo formato de Cortina
```

- `CUSTOM_BOARD_CATALOG_IDS` (`src/data/equipmentLibrary.js`) — `Set` com `'sce-quadros-3'`, separado de `BOARD_CATALOG_IDS`.
- **Fluxo de criação**: ao soltar no canvas, `App.jsx` define `pendingCustomBoardEquipment` (`{ polygonId, environmentId, equipment }`) e o canvas entra em modo de desenho retangular por 2 cliques — **idêntico ao fluxo de Cortinas**, sem overlay de configuração de colunas. Ao concluir, `onCustomBoardRectDrawn` → `handleCreateCustomBoard` cria o registro com `slots: [null]` (um slot `+` de abertura).
- **Renderização**: `cad-custom-board-rect`, retângulo com 4 handles de canto para redimensionar (reaproveita `.cad-curtain-resize-handle`), sempre restrito a permanecer dentro do polígono (`clampRectCornerToPolygon`, ver "Contenção de Retângulos no Polígono").
- **Slots**: mesmo comportamento dinâmico de antes — cresce até 99 módulos, compacta nulos consecutivos ao remover, sempre com 1 slot vazio de sobra.
- **Trigger/dropdown**: mesmo padrão dos quadros fixos (`cad-board-trigger` + `cad-board-dropdown`), instalação por drag-and-drop sobre o retângulo.
- **Menu de contexto**: Renomear / **Editar tamanho** / Excluir — "Propriedades" (edição de colunas) foi removida, já que o tamanho agora é definido pelo desenho do retângulo, não por um número de colunas.

### Organizador AV

Organizador AV é o equivalente do Quadro Custom para a aba **Drivers** — mesmo modelo de retângulo redimensionável. Um único tipo:

| catalogItemId | Label | Slots |
|---|---|---|
| `drv-av-organizer` | Organizador AV | dinâmico, até 99 dispositivos |

**Regra de negócio:** todos os itens folha da aba Drivers (`isAvOrganizerOnlyItem`) só podem ser instalados em slots de um Organizador AV — não podem ser soltos diretamente no canvas.

**Estado** em `App.jsx` (`avOrganizers`):
```js
// Organizador AV
{ id, catalogItemId, polygonId, rectStart: {x,y}, rectEnd: {x,y},
  label, iconSrc, iconKey, filterKeys, environmentId,
  slots: Array<{ id, catalogItemId, label, iconSrc, iconKey } | null> }
```
`columnCount` e `pinned` foram **removidos** do modelo — o tamanho visual é definido pelo retângulo (`rectStart`/`rectEnd`), não por colunas.

**Fluxo de criação** (em `handleEquipmentDropped`):
1. Se `isAvOrganizerOnlyItem` → rejeitado
2. Se `AV_ORGANIZER_CATALOG_IDS` → `App.jsx` define `pendingAvOrganizerEquipment` (`{ polygonId, environmentId, equipment }`) e o canvas entra em modo de desenho retangular por 2 cliques (igual Cortinas/Quadro Custom) — **não abre mais overlay de colunas** (`AvOrganizerOverlay` deixou de ser usado). Ao concluir, `onAvOrganizerRectDrawn` → `handleCreateAvOrganizer`.

**Renderização** em `CadCanvas.jsx`:
- `cad-av-organizer-rect`, mesmo padrão visual e de interação do Quadro Custom: 4 handles de canto para redimensionar (`clampRectCornerToPolygon`), trigger (`cad-board-trigger`) + dropdown (`cad-board-dropdown`) para ver/remover dispositivos instalados, instalação por drag-and-drop sobre o retângulo
- Slot vazio não é mais exibido em grade própria — a lista só aparece no dropdown do trigger
- **Menu de contexto**: Renomear / **Editar tamanho** / Excluir — "Propriedades" (colunas) foi removida
- Pré-visualização do retângulo durante o desenho: `Rect` Konva tracejado azul (`#2980b9`)
- Pin e grade expansível por hover foram **removidos**
- Rótulo usa o padrão compartilhado `.cad-rect-outside-label` (ver Cortinas)

**Movimento com polígono:** `draggingPolygon.initialAvOrganizerRects` (antes `initialAvOrganizerPoints`) rastreia `{ id, rectStart, rectEnd }` dos organizadores do polígono; `onPolygonTranslated` recebe `avOrganizerRects: [{ avOrganizerId, rectStart, rectEnd }]`.

**Mover para outro ambiente:** `handleAvOrganizerMoved` agora só atualiza `rectStart`/`rectEnd` — **não reatribui mais `environmentId`/`polygonId`** automaticamente quando o retângulo é arrastado para dentro de outro ambiente (comportamento antigo removido).

### Cortinas

Cortinas são equipamentos especiais que ocupam uma **área retangular** no canvas (em vez de um ponto). Cada cortina tem dois pontos normalizados: `rectStart` e `rectEnd` (cantos opostos do retângulo).

**Fluxo de criação:** ao soltar um item de cortina no canvas, `pendingCurtainEquipment` é definido e o canvas entra em modo de desenho retangular por dois cliques:
1. Clique 1 → define `curtainDraftStart` (coordenada normalizada)
2. Mouse move → atualiza `curtainDraftCursor` (preview do retângulo)
3. Clique 2 → chama `onCurtainRectDrawn` com `{ rectStart, rectEnd, equipment }` e limpa o estado de rascunho

O início do retângulo é capturado em `handleCanvasMouseDownCapture` (fase de captura DOM) para não ser bloqueado pelo `event.cancelBubble` dos polígonos.

**Renderização** em `CadCanvas.jsx` (HTML overlay sobre o Stage Konva):
- `<div class="cad-curtain-placement">` posicionado com `left/top/width/height` calculados dos dois pontos normalizados
- `<div class="cad-curtain-icon-center">` é hoje apenas um div de ancoragem vazio (marca o centro do retângulo); ícone e rótulo migraram para o padrão compartilhado `.cad-rect-outside-label` (mesmo usado por Organizador AV e Quadro Custom)
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

**Contenção no polígono:** arraste e redimensionamento de canto são restritos a manter a cortina inteiramente dentro do polígono do ambiente (mesmos helpers `rectFitsInPolygon`/`clampRectCornerToPolygon` usados por Organizador AV e Quadro Custom — ver seção seguinte). Ao arrastar, a ordem de tentativa é: movimento livre → só eixo X → só eixo Y → não move.

### Contenção de Retângulos no Polígono

Cortinas, Organizador AV e Quadro Custom compartilham dois helpers de módulo em `CadCanvas.jsx` para impedir que seus retângulos saiam do polígono do ambiente:

- `rectFitsInPolygon(rectStartNorm, rectEndNorm, polygonNormPoints)` — true se os 4 cantos do retângulo (coords normalizadas) estão dentro do polígono (via `isPointInsidePolygon`).
- `clampRectCornerToPolygon(fixedCornerNorm, movingCornerNorm, polygonNormPoints)` — busca binária (16 iterações) ao longo do segmento entre o canto fixo e o canto em movimento, retornando o ponto mais distante ainda válido dentro do polígono.

Usados tanto no desenho inicial por 2 cliques (o segundo clique é clampado enquanto o cursor se move) quanto no arraste dos handles de redimensionamento de canto.

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

`MIN_ZOOM = 10` (em `CadCanvas.jsx`, `App.jsx` e `TopToolbar.jsx`) — zoom mínimo de 10% para que os limiares de ambiente (40%/20%) sejam atingíveis. `MAX_ZOOM = 3000` (era `1000`) nos mesmos três arquivos.

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
- `WALL_SNAP_CATALOG_IDS` — todos os pulsadores e teclados (com e sem sensor), mais o AC-TMD (`amb-acessorios-2`, sem sensor PIR/OC); ao soltar no canvas, o ponto é projetado sobre a aresta mais próxima do polígono
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

**`isBatchingRef`** — flag `useRef` que suprime snapshots durante operações que disparam múltiplos callbacks (alinhamento de N polígonos, exclusão em lote, arraste de seleção múltipla). Padrão usado nos três contextos:
- `handleAlignItems` — empurra snapshot, liga o flag, seta `alignRequest`; `handleAlignConsumed` desliga
- `handleConfirmMultiDelete` — empurra snapshot, liga o flag, itera exclusões, desliga
- `handleMultiTranslated` — empurra snapshot, liga o flag, itera `handlePolygonTranslated` + `handleEquipmentPointsUpdate`, desliga

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

A versão da aplicação é injetada em tempo de build pelo Vite a partir de um arquivo versionado, **não** de comando `git` algum:

```js
// vite.config.js
__APP_VERSION__ = JSON.parse(readFileSync('./src/version.json')).version
```

`src/version.json` — `{ "version": "1.0.X" }` — é commitado junto com o código. O valor é exibido no footer/statusbar. `__APP_VERSION__` está declarado como global `readonly` no `eslint.config.js`.

**Atualização automática via hook `pre-commit`:** `.githooks/pre-commit` roda `node scripts/write-version.js` antes de cada commit, que calcula `git rev-list --count HEAD + 1` (a contagem do commit prestes a ser criado), grava em `src/version.json` e o inclui automaticamente no commit via `git add`. Isso mantém a regra "**incrementa exclusivamente ao fazer um novo commit**" sem exigir nenhuma ação manual.

O hook fica em `.githooks/` (não em `.git/hooks/`, que não é versionado) e é ativado via `git config core.hooksPath .githooks`. O script `postinstall` do `package.json` roda esse comando automaticamente após `npm install`, então qualquer clone novo do repositório já sai com o hook ativo.

O histórico de versões em `md/relatorio-modo-cad.md` deve registrar exatamente uma entrada por commit, com o número da versão correspondendo ao total de commits no momento do commit.

**Por que não usar `git rev-list --count HEAD` direto no build (histórico até v1.0.22):** o ambiente de build do Vercel **não é um `git clone` tradicional** — ele materializa um clone raso (shallow) dos arquivos sem configurar nenhum remote git utilizável (`git remote -v` retorna vazio). Isso significa que `git fetch`/`--unshallow`/`--depth=N` executados no `buildCommand` **nunca conseguem** aprofundar o histórico ali, mesmo terminando com exit code 0 — o clone raso fica permanentemente travado na profundidade que o Vercel decidiu buscar, e `git rev-list --count HEAD` retorna sempre o mesmo número errado (constatado via `vercel.json` de diagnóstico: profundidade fixa, `git fetch` sem remote configurado, contagem invariável antes/depois do fetch). Por isso o cálculo foi movido para fora do build, para um arquivo estático gerado localmente (onde o histórico completo sempre existe).

`vercel.json` voltou a ser trivial, sem nenhuma manipulação de git:
```json
{ "buildCommand": "npm run build" }
```

### Padrão de overlays

Os overlays modais são componentes `<div>` posicionados renderizados condicionalmente. São arrastáveis via `src/hooks/useDraggable.js`. Cada overlay recebe callbacks `onConclude` / `onCancel`. O estado dos overlays é gerenciado em `App.jsx`.

### Ferramentas ativas

`activeTool` alterna entre: `select` | `polygon` | `ruler` | `rectangle` | `elipse` | `triangle` | `move`. O estado da ferramenta determina o comportamento dos eventos de clique/arraste no canvas e quais botões da toolbar ficam ativos.

**Botão "Excluir" da toolbar:** chama `onDeleteSelected` → `handleDeleteSelected` em `App.jsx`, que incrementa `deleteTokenRef` e seta `deleteRequest = { token }`. `CadCanvas` tem um `useEffect` em `[deleteRequest]` que chama `triggerDelete()`. Isso permite que o botão da toolbar dispare a exclusão mesmo quando o foco não está no canvas. A mesma `triggerDelete` (`useCallback`) é usada pelo atalho de teclado `Delete`. O mesmo padrão de token é usado para `alignRequest`.

**Cancelar overlay de valor de escala (`handleCancelScaleValueOverlay`):** retorna à ferramenta `polygon` com `setIsAwaitingScaleLine(true)`, para que o usuário possa desenhar uma nova linha de referência imediatamente sem reiniciar o fluxo. Antes, voltava para `select`, interrompendo o processo.

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

### Modo Ortho (Shift + 15°)

Com as ferramentas **Polígono**, **Régua** ou **Definição de Escala** ativas, segurar **Shift** enquanto posiciona o próximo ponto restringe a direção da linha (do último ponto já colocado até o cursor) ao múltiplo de 15° mais próximo, medido a partir da horizontal absoluta — soltar o Shift volta ao posicionamento livre.

- **Polígono**: o snap vale em **todos os segmentos**, não só o primeiro — sempre relativo ao último ponto colocado, mesmo que esse ponto já tenha sido resultado de um snap anterior.
- **Régua** e **Definição de Escala**: têm um único segmento; o snap se aplica entre o primeiro clique e o cursor.
- `snapPointToOrthoAngle`/`applyOrthoSnap` (`CadCanvas.jsx`) fazem o cálculo em coordenadas de **stage**, convertendo de/para normalizado via `normToStage`/`stageToNorm` — mesmo motivo do Shift nas ferramentas de forma (proporção da imagem).
- A mesma função de snap é usada tanto no preview (`mousemove`, linha tracejada) quanto no clique que efetivamente registra o ponto (`mousedown`), garantindo que o clique sempre acerte exatamente onde a prévia mostrou.

### Seleção múltipla (ferramenta `select`)

Estado local em `CadCanvas.jsx` (não em `App.jsx`):
```js
const [rubberBand, setRubberBand] = useState(null)
// { startStage: {x,y}, endStage: {x,y} }

const [multiSelectedPolygonIds, setMultiSelectedPolygonIds] = useState(new Set())
const [multiSelectedEquipmentIds, setMultiSelectedEquipmentIds] = useState(new Set())
const [multiSelectedBoardIds, setMultiSelectedBoardIds] = useState(new Set())
const [multiSelectedCustomBoardIds, setMultiSelectedCustomBoardIds] = useState(new Set())
const [multiSelectedAvOrganizerIds, setMultiSelectedAvOrganizerIds] = useState(new Set())
const [multiSelectedCurtainIds, setMultiSelectedCurtainIds] = useState(new Set())
```

Seis tipos de entidade participam da seleção múltipla (rubber band, shift+click, exclusão em lote e arraste em conjunto): **polígonos**, **equipamentos avulsos**, **Quadros de Automação fixos** (`automationBoards`), **Quadro Custom** (`customBoards`), **Organizador AV** (`avOrganizers`) e **Cortinas** (`placedCurtains`).

**Rubber band (arrastar para selecionar) — Window / Crossing Selection:**
- Arrastar no Stage com a ferramenta `select` ativa inicia o rubber band — só quando `fittedBackgroundImage` está definida (sem imagem importada, rubber band não é criado). Como polígonos com preenchimento capturam o mousedown, o ponto inicial do arraste precisa estar em área vazia do canvas (fora de qualquer polígono) para o rubber band iniciar — arrastar a partir de dentro de um polígono é tratado como clique/drag do próprio polígono.
- O `<Rect>` Konva tracejado só é renderizado quando a distância de arraste ≥ `RUBBER_BAND_MIN_DRAG = 4 px` — cliques simples não exibem o retângulo
- A direção horizontal do arraste (`endStage.x >= startStage.x`) determina o modo, recalculado em tempo real a cada `handleStageMouseMove` — a cor do retângulo já reflete o modo atual antes de soltar o mouse:
  - **Esquerda → Direita = Window** (`WINDOW_SELECTION_COLOR`, `#0095ff` azul) — seleciona apenas objetos **totalmente contidos** no retângulo
  - **Direita → Esquerda = Crossing** (`CROSSING_SELECTION_COLOR`, `#2ecc71` verde) — seleciona objetos **contidos ou tocados** (interseção) pelo retângulo
  - `endStage.x === startStage.x` (arraste puramente vertical) cai no modo Window
- Ao soltar o mouse (`window.addEventListener('mouseup')`): calcula AABB do rubber band em coords de stage e aplica o teste conforme o modo, via helper comum `matchesRubberBand(bounds)`:
  - **Polígonos, Organizador AV, Quadro Custom e Cortinas**: bounding box real (`getPolygonBounds` para polígonos; `rectStart`/`rectEnd` convertidos para stage para os demais) — Window exige bounding box inteiro dentro do rubber band; Crossing usa `rectsIntersect` (interseção de bounding boxes)
  - **Equipamentos avulsos**: teste é sempre "ponto dentro do rect" — como um equipamento avulso é um ponto sem extensão, Window e Crossing são equivalentes para esse tipo
  - **Quadros de Automação fixos**: também point-based no estado (`point: {x,y}`), mas renderizam como wireframe em tamanho real — a bounding box usada no teste é aproximada centrando `point` e aplicando `widthMm`/`heightMm` de `EQUIPMENT_WIREFRAMES[board.catalogItemId]` convertidos para pixels de stage (mesma fórmula do render, sem o clamp de polígono aplicado no desenho — diferença irrelevante na prática já que o board raramente fica encostado na borda)
  - O resultado substitui todos os seis `multiSelected*Ids`

**Shift+click:** cada handler de mousedown por tipo (`handlePolygonMouseDown`, `handleEquipmentMouseDown`, `handleBoardMouseDown`, `handleAvOrganizerMouseDown`, `handleCustomBoardMouseDown`, e o `onMouseDown` inline da Cortina) checa `shiftKey` (via `event.evt.shiftKey` nos handlers Konva, `event.shiftKey` nos handlers DOM nativos dos quatro últimos tipos) e faz toggle do próprio id no respectivo `multiSelected*Ids`. Um clique normal (sem Shift) limpa os **seis** sets antes de prosseguir com a seleção única.

**Rendering — `isSelected` em cada tipo:**
- Polígono: `polygon.id === selectedPolygonId || multiSelectedPolygonIds.has(polygon.id)`
- Equipamento: `selectedEquipmentId === equipment.id || multiSelectedEquipmentIds.has(equipment.id)`
- Board / Custom Board / Organizador AV / Cortina: mesmo padrão, `OR`-ando `selected<Tipo>Id === id` com `multiSelected<Tipo>Ids.has(id)` na className (`is-selected`)
- A seleção múltipla é zerada ao mudar de ferramenta ou ao clicar em área vazia sem Shift

**Arrastar seleção múltipla (ver também "Arrastar Seleção Múltipla" abaixo):** ao segurar e arrastar qualquer item que já esteja na seleção múltipla (após o hold-timer de `EQUIPMENT_HOLD_TO_DRAG_MS`/180ms para os tipos que já usam esse padrão), `buildMultiDragState` monta `loose<Tipo>s` para os itens do tipo cujo `polygonId` **não** está em `multiSelectedPolygonIds` — itens cujo polígono pai também está selecionado continuam movendo via `initialBoardPoints`/`initialAvOrganizerRects`/`initialCustomBoardRects`/`initialCurtainRects` dentro de `draggingMulti.polygons` (mesmo caminho do drag de polígono). No commit (`pointerup`), `onMultiTranslated` inclui `looseBoardUpdates`/`looseCustomBoardUpdates`/`looseAvOrganizerUpdates`/`looseCurtainUpdates` além de `looseEquipmentUpdates`.

**Exclusão em lote (tecla `Delete` ou botão da toolbar):**
- Quando há multi-seleção ativa em qualquer um dos seis sets, `Delete` (ou o botão "Excluir" via `deleteRequest`) dispara `onMultiDeleteRequest({ polygonIds, equipmentIds, boardIds, customBoardIds, avOrganizerIds, curtainIds })` (payload como objeto, não posicional) em vez da exclusão individual
- CadCanvas limpa imediatamente os seis `multiSelected*Ids` após disparar o request
- App.jsx armazena em `pendingMultiDelete` e exibe `DeleteEnvironmentConfirmOverlay` com mensagem contextual construída a partir de uma lista de categorias (`{ ids, singular, plural, gender }`, `gender: 'f'` só para cortina): mais de uma categoria não-vazia → "Deseja realmente apagar os N itens selecionados?"; uma categoria com 1 item → singular com artigo/gênero corretos; uma categoria com N itens → plural com artigo/gênero corretos
- Ao confirmar (`handleConfirmMultiDelete`): itera cada array chamando o handler de exclusão individual correspondente (`handlePolygonDeleted`, `handleDeleteEquipment`, `handleDeleteBoard`, `handleDeleteCustomBoard`, `handleDeleteAvOrganizer`, `handleDeleteCurtain`); seta `multiDeletePolygonIds` para CadCanvas remover os shapes Konva dos polígonos excluídos
- CadCanvas tem `useEffect` para `deletePolygonIds` (array) que filtra todos os polígonos de uma vez (análogo ao `deletePolygonId` singular)
- `triggerDelete` também ganhou os ramos de exclusão por `Delete` para **seleção única** de Board/Custom Board/Organizador AV (a Cortina já tinha; Board/Custom Board/Organizador AV não respondiam à tecla Delete antes desta correção)

**Observação:** o estado de seleção única em `App.jsx` (`selectedEquipmentId`, `selectedEnvironmentId`, etc.) não é alterado pela seleção múltipla — continua controlando rename/delete/properties de item único.

### Alinhamento e distribuição de itens selecionados

Os botões de alinhamento/distribuição da toolbar operam sobre a seleção múltipla ativa, nos **seis** tipos selecionáveis (`multiSelectedPolygonIds`, `multiSelectedEquipmentIds`, `multiSelectedBoardIds`, `multiSelectedCustomBoardIds`, `multiSelectedAvOrganizerIds`, `multiSelectedCurtainIds`). São 8 botões no total, em ordem:

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

**Cálculo em coordenadas de stage (pixels), não normalizadas:** todo bounding box é convertido para stage via `normToStage` antes de medir/comparar, e o resultado final é convertido de volta com `stageToNorm` (nunca soma um delta bruto em coordenadas normalizadas) — assim o cálculo continua correto mesmo com a planta rotacionada.

**Bounding box considera o tamanho real do wireframe, não só o ponto de ancoragem:**
- **Equipamentos avulsos e Quadros de Automação** (`pointItemStageBounds` em `CadCanvas.jsx`): quando o `catalogItemId` tem entrada em `EQUIPMENT_WIREFRAMES` e a escala está definida, os limites usados são o **centro do wireframe ± metade da largura/altura real** convertida para pixels de stage — não mais o ponto de ancoragem isolado. Sem wireframe ou sem escala definida, cai de volta para um ponto de tamanho zero.
- **Equipamentos com `wallNormal`** (pulsadores/teclados encostados na parede): o centro usado é o centro **renderizado** do wireframe — já deslocado para fora da parede, mesmo cálculo do render — então a borda alinhada é a borda visível do desenho, não o ponto de ancoragem na parede. O delta calculado a partir desse centro ainda é aplicado sobre o ponto de ancoragem bruto (`item.point`), já que o offset é constante sob translação.
- **Organizador AV / Quadro Custom / Cortina** (`rectItemStageBounds`): bounding box a partir de `rectStart`/`rectEnd` convertidos para stage — sem mudança de comportamento, já eram tratados como retângulo.
- **Polígono** (`polygonStageBounds`): `getPolygonBounds` sobre os pontos do polígono já convertidos para stage.

**Referência de alinhamento:**
- `left`: `min(todos os x1)` — alinha borda esquerda ao item mais à esquerda
- `right`: `max(todos os x2)` — alinha borda direita ao item mais à direita
- `top`: `min(todos os y1)` — alinha borda superior ao item mais acima
- `bottom`: `max(todos os y2)` — alinha borda inferior ao item mais abaixo
- `center-x`: `(min(x1) + max(x2)) / 2` — centraliza horizontalmente no meio do conjunto
- `center-y`: `(min(y1) + max(y2)) / 2` — centraliza verticalmente no meio do conjunto

**Distribuição (`distribute-x` / `distribute-y`):**
- Requer 3+ itens selecionados; com menos, não faz nada
- Os dois itens das extremidades ficam fixos; os do meio são redistribuídos com o mesmo **espaço entre as bordas** (`gap`):
  ```
  gap = (leading_extremo_dir - trailing_extremo_esq - soma_tamanhos_do_meio) / (n - 1)
  ```
- Tamanho de cada item = largura (`distribute-x`) ou altura (`distribute-y`) do seu bounding box em stage-pixels (ver acima) — para um equipamento sem wireframe, isso equivale a `tamanho = 0` (espaçamento igual entre os pontos), igual antes

**Por tipo de item:**
- **Polígono selecionado**: todo equipamento/board/organizador AV/quadro custom/cortina que pertence a ele (mesmo `polygonId`) move junto como passageiro, via `buildPolygonTranslation(polygonId, dxStage, dyStage)` — a mesma função monta o payload completo (`newPolygonPoints`, `equipmentPoints`, `boardPoints`, `avOrganizerRects`, `customBoardRects`, `curtainRects`).
- **Item de qualquer um dos outros 5 tipos selecionado diretamente** (não pertence a um polígono também selecionado): tratado como "solto" (loose) e movido individualmente.

**Canal de commit único:** Align e Distribute emitem um único `onMultiTranslated({ polygonTranslations, looseEquipmentUpdates, looseBoardUpdates, looseAvOrganizerUpdates, looseCustomBoardUpdates, looseCurtainUpdates })` — o mesmo canal usado pelo arraste de seleção múltipla (ver seção seguinte), em vez de chamadas separadas de `onPolygonTranslated`/`onEquipmentPointsUpdate`. Como consequência, um Align/Distribute inteiro gera **um único passo de undo**, mesmo movendo vários itens de tipos diferentes.

### Arrastar Seleção Múltipla

Quando há uma seleção múltipla ativa e o usuário arrasta qualquer item selecionado, todos os itens da seleção se movem juntos.

**Estado** em `CadCanvas.jsx`:
```js
const [draggingMulti, setDraggingMulti] = useState(null)
```

**Estrutura `draggingMulti`:**
```js
{
  startStagePoint: {x, y},     // ponto de início em coords de stage
  stageDelta: {x, y},          // deslocamento acumulado (atualizado a cada pointermove)
  polygons: [{                 // dados iniciais de cada polígono selecionado
    polygonId,
    initialPolygonPoints,
    initialEquipmentPoints:     [{id, point}],
    initialBoardPoints:         [{id, point}],
    initialAvOrganizerRects:    [{id, rectStart, rectEnd}],
    initialCustomBoardRects:    [{id, rectStart, rectEnd}],
    initialCurtainRects:        [{id, rectStart, rectEnd}],
  }],
  // itens selecionados diretamente cujo polygonId NÃO está em multiSelectedPolygonIds
  looseEquipments:   [{id, initialPoint}],
  looseBoards:       [{id, initialPoint}],
  looseCustomBoards: [{id, initialRectStart, initialRectEnd}],
  looseAvOrganizers: [{id, initialRectStart, initialRectEnd}],
  looseCurtains:     [{id, initialRectStart, initialRectEnd}],
}
```

**Ativação:**
- **Polígono em `multiSelectedPolygonIds`**: `handlePolygonMouseDown` ativa `draggingMulti` imediatamente (sem hold timer)
- **Equipamento em `multiSelectedEquipmentIds`**: `handleEquipmentMouseDown` ativa `draggingMulti` após `EQUIPMENT_HOLD_TO_DRAG_MS` via hold timer
- **Board/Organizador AV/Quadro Custom/Cortina** em seus respectivos `multiSelected*Ids`: `handleBoardMouseDown`/`handleAvOrganizerMouseDown`/`handleCustomBoardMouseDown`/o `onMouseDown` inline da Cortina ativam `draggingMulti` após o mesmo hold timer de 180ms

**`buildMultiDragState(stagePoint)`** — helper em `CadCanvas.jsx` que captura o estado inicial de todos os itens selecionados (dos seis tipos) e retorna o objeto `draggingMulti`.

**Live rendering:** `useEffect([draggingMulti])` atualiza `stageDelta` e chama `setPolygons` com as novas posições de todos os polígonos selecionados a cada `pointermove` — mesmo padrão do drag individual. Os itens "soltos" (loose) dos outros tipos leem `draggingMulti.loose*` diretamente no ponto de renderização (`getEquipmentDragPoint`-equivalente para cada tipo) para preview em tempo real.

**Commit (`pointerup`):** chama `onMultiTranslated({ polygonTranslations, looseEquipmentUpdates, looseBoardUpdates, looseAvOrganizerUpdates, looseCustomBoardUpdates, looseCurtainUpdates })` e limpa `draggingMulti`.

**`handleMultiTranslated` em `App.jsx`:** usa o padrão `isBatchingRef` — empurra **um único snapshot** antes, itera sobre `polygonTranslations` chamando `handlePolygonTranslated`, aplica cada `loose*Updates` via seu batch-updater dedicado (`handleEquipmentPointsUpdate`, `handleBoardPointsUpdate`, `handleAvOrganizerRectsUpdate`, `handleCustomBoardRectsUpdate`, `handleCurtainRectsUpdate` — cada um faz um único `setState` percorrendo a lista de updates), desliga o batching.

**`getPolygonDragData(polygonId)`** — helper em `CadCanvas.jsx` que unifica a verificação de drag single e multi:
```js
const getPolygonDragData = (polygonId) => {
  if (draggingPolygon?.polygonId === polygonId) return draggingPolygon
  if (draggingMulti) {
    const pd = draggingMulti.polygons.find((p) => p.polygonId === polygonId)
    if (pd) return { ...pd, stageDelta: draggingMulti.stageDelta }
  }
  return null
}
```
Substituiu todas as verificações `draggingPolygon?.polygonId === x.polygonId` em 8+ paths de rendering (circuit line, sensores, equipamentos, boards, organizadores AV, cortinas).

**Importante — `polyStagePoints` em sensores PIR/OC:** como `polygon.points` já é atualizado em tempo real via `setPolygons` durante qualquer drag de polígono, a região de clip **não deve** receber delta adicional. O correto é:
```js
const polyStagePoints = polygon.points.map((p) => normToStage(p, fittedBackgroundImage))
```
Aplicar `stageDelta` aqui causaria duplo deslocamento (double-delta bug).

### Convenções de nomenclatura

- Strings de UI e nomes de variáveis estão em **português** (ex.: `pavimento`, `pé direito`, `rótulo`, `régua`)
- Arquivos de componentes usam PascalCase; hooks usam camelCase com prefixo `use`
- CSS usa nomes de classe estilo BEM definidos em `src/styles/cad.css` com propriedades customizadas para o tema escuro
