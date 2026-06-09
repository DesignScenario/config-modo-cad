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

Todo o estado da aplicação está em `src/App.jsx` (~1200 linhas). Não há store global (sem Redux, Zustand ou Context). Props e callbacks são passados explicitamente.

Grupos de estado principais em `App.jsx`:
- **Canvas/viewport** – `activeTool`, `zoom`, `backgroundOpacity`, `imageRotation`
- **Estrutura do projeto** – `projectTree` (árvore hierárquica de nós), `environments`, `placedEquipments`
- **Escala** – `scaleDefinition` (conversão pixel-para-metro), `pendingScaleSegment`
- **Overlays de UI** – flags booleanas (`showEnvironmentOverlay`, `showEquipmentLibrary`, etc.) mais IDs de edição
- **Estado de renomeação** – estado separado por tipo de entidade (`renamingEnvironmentId`, `renamingEquipmentId`, `renamingGenericNodeId`), cada um com um `*Source` correspondente (canvas vs árvore)

### Camada de canvas

`src/components/CadCanvas.jsx` é o maior componente (~74 KB). Renderiza um `Stage` Konva com:
- Imagem de fundo (planta importada)
- Formas de polígono para cada ambiente
- Marcadores de ícone de equipamento
- Overlay da régua
- Edição de rótulo diretamente no canvas

Ambientes são desenhados como polígonos Konva. Cada polígono é mapeado a um objeto `Environment` via `polygonId`. Os mapas `polygonColorById` e `polygonLabelById` em `App.jsx` são mantidos sincronizados com o array `environments`.

### Estruturas de dados

```js
// Nó da árvore de projeto
{ id, label, icon, source, children: [], expanded }
// valores de source: 'pavimento' | 'project' | 'created-environment' | 'equipment-item'

// Ambiente
{ id, polygonId, name, environmentClass, ceilingHeight, color }

// Instância de equipamento posicionado
{ id, catalogItemId, polygonId, point: {x, y}, label, iconSrc, iconKey, environmentId, filterKeys }

// Escala
{ meters, pixels, metersPerPixel, pixelsPerMeter, referenceSegment }
```

A manipulação da árvore usa funções utilitárias recursivas dentro de `App.jsx` (`removeNodeById`, `updateNodeLabel`, `appendEquipmentToEnvironment`, etc.) e sempre clona via `JSON.parse(JSON.stringify())`.

### Catálogo de equipamentos

`src/data/equipmentLibrary.js` define o catálogo hierárquico completo (categorias: iluminacao, pulsadores, motores, persianas, sensores, …). A visibilidade dos equipamentos no canvas é controlada pelo objeto de estado `equipmentFilters` e pela função `isEquipmentVisibleByFilters()`.

### Wireframes técnicos

Quando `zoom >= 300`, os equipamentos são renderizados com seu desenho técnico em escala real em vez do ícone. A lógica vive inteiramente em `CadCanvas.jsx` (no loop de renderização dos equipamentos) e no mapa `src/data/wireframes.js`.

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
| `sce-quadros-3` | Quadro Custom | 1–20 (configurável via overlay) |

**Estado dos boards** (em `automationBoards` no App.jsx):
```js
{ id, catalogItemId, polygonId, point, label, iconSrc, iconKey, filterKeys,
  environmentId, slotCount, pinned: boolean,
  slots: Array<{ id, catalogItemId, label, iconSrc, iconKey } | null> }
```

**Helpers** em `src/data/equipmentLibrary.js`:
- `BOARD_CATALOG_IDS` — Set com os 3 IDs de catálogo de quadros
- `isBoardOnlyItem(catalogItemId)` — true para itens que só existem em slots (sce-automation-*, sce-interfaces-*, sce-modulos-*, sce-entrada-*)
- `getBoardSlotCount(catalogItemId)` — retorna 6, 12 ou null (Custom)

**Fluxo de criação** (em App.jsx `handleEquipmentDropped`):
1. Se `isBoardOnlyItem` → rejeitado (só aceito em slots de quadros)
2. Se `BOARD_CATALOG_IDS`: AC-QA6M/AC-QA12M → `handleCreateBoard` imediato; Quadro Custom → abre `AutomationBoardOverlay` para escolha de slots

**Renderização** em `CadCanvas.jsx`:
- Estado **Padrão**: pin + ícone + rótulo
- Estado **Hover / Pinado**: expande grade de slots (CSS `:hover` + classe `is-pinned`)
- Slot vazio: drop target; slot ocupado: direito → menu "Remover dispositivo"
- Pin: clique alterna `board.pinned`

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

### Padrão de overlays

Os overlays modais são componentes `<div>` posicionados renderizados condicionalmente. São arrastáveis via `src/hooks/useDraggable.js`. Cada overlay recebe callbacks `onConclude` / `onCancel`. O estado dos overlays é gerenciado em `App.jsx`.

### Ferramentas ativas

`activeTool` alterna entre: `select` | `polygon` | `ruler`. O estado da ferramenta determina o comportamento dos eventos de clique/arraste no canvas e quais botões da toolbar ficam ativos.

### Convenções de nomenclatura

- Strings de UI e nomes de variáveis estão em **português** (ex.: `pavimento`, `pé direito`, `rótulo`, `régua`)
- Arquivos de componentes usam PascalCase; hooks usam camelCase com prefixo `use`
- CSS usa nomes de classe estilo BEM definidos em `src/styles/cad.css` com propriedades customizadas para o tema escuro
