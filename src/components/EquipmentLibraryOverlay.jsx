import { useMemo, useRef, useState } from 'react'
import AddMultipleItemsOverlay from './AddMultipleItemsOverlay.jsx'
import camera from '../assets/câmera.svg'
import circadiano from '../assets/circadiano.svg'
import conexaoHardware from '../assets/conexão-hardware.svg'
import conexaoSoftware from '../assets/conexão-software.svg'
import controladoras from '../assets/controladoras.svg'
import drivers from '../assets/drivers.svg'
import dvr from '../assets/dvr.svg'
import entradaDigital from '../assets/entrada-digital.svg'
import espelhoDuplo from '../assets/espelho-duplo.svg'
import iluminacao from '../assets/iluminação.svg'
import interfaceComunicacao from '../assets/interface-de-comunicação.svg'
import interfaces from '../assets/interfaces.svg'
import keypadWifi1 from '../assets/keypad-wifi-1.svg'
import keypadWifi2 from '../assets/keypad-wifi-2.svg'
import keypadWifi3 from '../assets/keypad-wifi-3.svg'
import keypads from '../assets/keypads.svg'
import led from '../assets/led.svg'
import limpar from '../assets/limpar.svg'
import mais from '../assets/mais.svg'
import menos from '../assets/menos.svg'
import moduloDiaNoite from '../assets/módulo-dia-noite.svg'
import modulos from '../assets/módulos.svg'
import modulosWifi from '../assets/módulos-wifi.svg'
import motores from '../assets/motores.svg'
import pasta from '../assets/pasta.svg'
import pulsadores from '../assets/pulsadores.svg'
import setaMenuSuspenso from '../assets/seta-menu-suspenso-16px.svg'
import sensor from '../assets/sensor.svg'
import sensores from '../assets/sensores.svg'
import tw10 from '../assets/tw10.svg'
import tw4 from '../assets/tw4.svg'
import { equipmentLibraryTabs, getEquipmentFilterKeys } from '../data/equipmentLibrary.js'
import { useDraggable } from '../hooks/useDraggable.js'

const TAB_NAMES = ['Ambiente', 'Scenario', 'Drivers']
const MULTI_ADD_CONTEXT_LABEL = 'Adicionar múltiplos itens'
const CONTEXT_MENU_EXCLUDED_LABELS = new Set([
  '[ GENERICO ] SCENARIO - RF433',
  '[ DISPOSITIVO DE AUDIO SEM CONTROLE ]',
])

const ICON_MAP = {
  camera,
  circadiano,
  'conexao-hardware': conexaoHardware,
  'conexao-software': conexaoSoftware,
  controladoras,
  dvr,
  drivers,
  'entrada-digital': entradaDigital,
  'espelho-duplo': espelhoDuplo,
  iluminacao,
  'interface-de-comunicacao': interfaceComunicacao,
  interfaces,
  'keypad-wifi-1': keypadWifi1,
  'keypad-wifi-2': keypadWifi2,
  'keypad-wifi-3': keypadWifi3,
  keypads,
  led,
  'modulo-dia-noite': moduloDiaNoite,
  modulos,
  'modulos-wifi': modulosWifi,
  motores,
  pasta,
  pulsadores,
  sensor,
  sensores,
  tw10,
  tw4,
}

function collectIds(nodes, ids = []) {
  nodes.forEach((node) => {
    ids.push(node.id)
    if (node.children?.length) {
      collectIds(node.children, ids)
    }
  })
  return ids
}

function filterTree(nodes, query) {
  if (!query) return nodes
  const normalizedQuery = query.toLowerCase()

  return nodes
    .map((node) => {
      const selfMatches = node.label.toLowerCase().includes(normalizedQuery)
      const children = node.children?.length ? filterTree(node.children, query) : []
      if (!selfMatches && children.length === 0) return null
      return {
        ...node,
        children,
      }
    })
    .filter(Boolean)
}

function findItemById(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children?.length) {
      const found = findItemById(node.children, id)
      if (found) return found
    }
  }
  return null
}

function shouldOpenMultiAddMenu(item) {
  if (!item) {
    return false
  }

  if (item.id === 'drv-automation' || item.id.startsWith('drv-automation-')) {
    return false
  }

  if (CONTEXT_MENU_EXCLUDED_LABELS.has(item.label)) {
    return false
  }

  return true
}

function EquipmentTreeNode({
  item,
  level,
  expandedIds,
  selectedItemId,
  onToggle,
  onSelect,
  onItemContextMenu,
}) {
  const hasChildren = Boolean(item.children?.length)
  const isExpanded = expandedIds.has(item.id)
  const isSelected = selectedItemId === item.id
  const iconSrc = ICON_MAP[item.icon] ?? pasta
  const filterKeys = hasChildren ? [] : getEquipmentFilterKeys(item.id)

  const handleDragStart = (event) => {
    if (hasChildren) {
      return
    }

    event.dataTransfer.setData(
      'application/x-equipment-item',
      JSON.stringify({
        id: item.id,
        catalogItemId: item.id,
        label: item.label,
        iconKey: item.icon,
        iconSrc,
        filterKeys,
      }),
    )
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="cad-equip-tree-node" style={{ '--equip-level': level }}>
      <button
        type="button"
        className={`cad-equip-tree-row${isSelected ? ' is-selected' : ''}${!hasChildren ? ' is-draggable' : ''}`}
        onClick={() => {
          onSelect(item)
          if (hasChildren) {
            onToggle(item.id)
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onItemContextMenu(event, item)
        }}
        draggable={!hasChildren}
        onDragStart={handleDragStart}
      >
        <span className="cad-equip-tree-row__toggle">
          {hasChildren ? (
            <img
              src={setaMenuSuspenso}
              alt=""
              className={`cad-equip-tree-row__toggle-icon${isExpanded ? '' : ' is-collapsed'}`}
            />
          ) : null}
        </span>
        <span className="cad-equip-tree-row__icon">
          <img src={iconSrc} alt="" className="cad-equip-tree-row__icon-image" />
        </span>
        <span className="cad-equip-tree-row__label">{item.label}</span>
      </button>

      {hasChildren && isExpanded ? (
        <div className="cad-equip-tree-children">
          {item.children.map((child) => (
            <EquipmentTreeNode
              key={child.id}
              item={child}
              level={level + 1}
              expandedIds={expandedIds}
              selectedItemId={selectedItemId}
              onToggle={onToggle}
              onSelect={onSelect}
              onItemContextMenu={onItemContextMenu}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function EquipmentLibraryOverlay({ onClose, onStartMultiAddPlacement }) {
  const [activeTab, setActiveTab] = useState('Ambiente')
  const [query, setQuery] = useState('')
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [multiAddItem, setMultiAddItem] = useState(null)
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()
  const treeViewRef = useRef(null)
  const [expandedByTab, setExpandedByTab] = useState(() => ({
    Ambiente: new Set(collectIds(equipmentLibraryTabs.Ambiente)),
    Scenario: new Set(collectIds(equipmentLibraryTabs.Scenario)),
    Drivers: new Set(collectIds(equipmentLibraryTabs.Drivers)),
  }))

  const tree = useMemo(
    () => filterTree(equipmentLibraryTabs[activeTab] ?? [], query.trim()),
    [activeTab, query],
  )

  const toggleNode = (nodeId) => {
    setExpandedByTab((current) => {
      const next = new Set(current[activeTab])
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return {
        ...current,
        [activeTab]: next,
      }
    })
  }

  const expandAll = () => {
    setExpandedByTab((current) => ({
      ...current,
      [activeTab]: new Set(collectIds(equipmentLibraryTabs[activeTab] ?? [])),
    }))
  }

  const collapseAll = () => {
    setExpandedByTab((current) => ({
      ...current,
      [activeTab]: new Set(),
    }))
  }

  const handleItemContextMenu = (event, item) => {
    setSelectedItemId(item.id)

    if (!shouldOpenMultiAddMenu(item)) {
      setContextMenu(null)
      return
    }

    const container = treeViewRef.current
    if (!container) {
      return
    }

    const bounds = container.getBoundingClientRect()
    const menuWidth = 190
    const menuHeight = 36
    const rawX = event.clientX - bounds.left + container.scrollLeft
    const rawY = event.clientY - bounds.top + container.scrollTop
    const maxX = container.scrollLeft + container.clientWidth - menuWidth - 4
    const maxY = container.scrollTop + container.clientHeight - menuHeight - 4
    const x = Math.min(rawX, maxX)
    const y = Math.min(rawY, maxY)

    setContextMenu({
      x: Math.max(container.scrollLeft + 4, x),
      y: Math.max(container.scrollTop + 4, y),
      itemId: item.id,
    })
  }

  return (
    <>
    <section
      className="cad-equipment-overlay"
      role="dialog"
      aria-modal="false"
      aria-label="Biblioteca de equipamentos"
      ref={panelRef}
      style={panelStyle}
      onPointerDown={() => setContextMenu(null)}
    >
      <header className="cad-equipment-overlay__header" onPointerDown={onHandlePointerDown}>
        <h3 className="cad-equipment-overlay__title">Equipamentos</h3>
        <button type="button" className="cad-equipment-overlay__close" onClick={onClose} aria-label="Fechar biblioteca">
          ×
        </button>
      </header>

      <nav className="cad-equipment-overlay__tabs" aria-label="Menus da biblioteca">
        {TAB_NAMES.map((tabName) => (
          <button
            key={tabName}
            type="button"
            className={`cad-equipment-overlay__tab${tabName === activeTab ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tabName)}
          >
            {tabName}
          </button>
        ))}
      </nav>

      <div className="cad-equipment-overlay__controls">
        <div className="cad-equipment-overlay__expand-controls">
          <button type="button" className="cad-tree-control-button" onClick={expandAll} aria-label="Expandir todos">
            <img src={mais} alt="" />
          </button>
          <button type="button" className="cad-tree-control-button" onClick={collapseAll} aria-label="Contrair todos">
            <img src={menos} alt="" />
          </button>
        </div>

        <label className="cad-equipment-overlay__search" htmlFor="equipment-search">
          <input
            id="equipment-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar equipamento"
          />
        </label>
        <button type="button" className="cad-tree-control-button" onClick={() => setQuery('')} aria-label="Limpar busca">
          <img src={limpar} alt="" />
        </button>
      </div>

      <div className="cad-equipment-overlay__tree" ref={treeViewRef}>
        {tree.map((item) => (
          <EquipmentTreeNode
            key={item.id}
            item={item}
            level={0}
            expandedIds={expandedByTab[activeTab]}
            selectedItemId={selectedItemId}
            onToggle={toggleNode}
            onSelect={(selectedItem) => {
              setSelectedItemId(selectedItem.id)
              setContextMenu(null)
            }}
            onItemContextMenu={handleItemContextMenu}
          />
        ))}

        {contextMenu ? (
          <div
            className="cad-tree-context-menu"
            style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="cad-tree-context-menu__item"
              onClick={() => {
                const item = contextMenu.itemId
                  ? findItemById(equipmentLibraryTabs[activeTab] ?? [], contextMenu.itemId)
                  : null
                setMultiAddItem(item)
                setContextMenu(null)
              }}
            >
              <span className="cad-tree-context-menu__label">{MULTI_ADD_CONTEXT_LABEL}</span>
            </button>
          </div>
        ) : null}
      </div>
    </section>

    {multiAddItem ? (
      <AddMultipleItemsOverlay
        itemLabel={multiAddItem.label}
        onConfirm={({ quantity }) => {
          onStartMultiAddPlacement?.({
            quantity,
            equipment: {
              id: multiAddItem.id,
              catalogItemId: multiAddItem.id,
              label: multiAddItem.label,
              iconKey: multiAddItem.icon,
              iconSrc: ICON_MAP[multiAddItem.icon] ?? pasta,
              filterKeys: getEquipmentFilterKeys(multiAddItem.id),
            },
          })
          setMultiAddItem(null)
        }}
        onClose={() => setMultiAddItem(null)}
      />
    ) : null}
  </>
  )
}

export default EquipmentLibraryOverlay
