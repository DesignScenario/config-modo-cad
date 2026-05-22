import { useMemo, useState } from 'react'
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
import { equipmentLibraryTabs } from '../data/equipmentLibrary.js'
import { useDraggable } from '../hooks/useDraggable.js'

const TAB_NAMES = ['Ambiente', 'Scenario', 'Drivers']

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

function EquipmentTreeNode({ item, level, expandedIds, onToggle }) {
  const hasChildren = Boolean(item.children?.length)
  const isExpanded = expandedIds.has(item.id)
  const iconSrc = ICON_MAP[item.icon] ?? pasta

  const handleDragStart = (event) => {
    if (hasChildren) {
      return
    }

    event.dataTransfer.setData(
      'application/x-equipment-item',
      JSON.stringify({
        id: item.id,
        label: item.label,
        iconKey: item.icon,
        iconSrc,
      }),
    )
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="cad-equip-tree-node" style={{ '--equip-level': level }}>
      <button
        type="button"
        className={`cad-equip-tree-row${!hasChildren ? ' is-draggable' : ''}`}
        onClick={() => (hasChildren ? onToggle(item.id) : undefined)}
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
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function EquipmentLibraryOverlay({ onClose }) {
  const [activeTab, setActiveTab] = useState('Ambiente')
  const [query, setQuery] = useState('')
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()
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

  return (
    <section
      className="cad-equipment-overlay"
      role="dialog"
      aria-modal="false"
      aria-label="Biblioteca de equipamentos"
      ref={panelRef}
      style={panelStyle}
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

      <div className="cad-equipment-overlay__tree">
        {tree.map((item) => (
          <EquipmentTreeNode
            key={item.id}
            item={item}
            level={0}
            expandedIds={expandedByTab[activeTab]}
            onToggle={toggleNode}
          />
        ))}
      </div>
    </section>
  )
}

export default EquipmentLibraryOverlay
