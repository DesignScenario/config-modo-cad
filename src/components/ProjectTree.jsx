import { useMemo, useState } from 'react'
import conexaoHardware from '../assets/conexão-hardware.svg'
import conexaoSoftware from '../assets/conexão-software.svg'
import ambientes from '../assets/ambientes.svg'
import drivers from '../assets/drivers.svg'
import limpar from '../assets/limpar.svg'
import macros from '../assets/macros.svg'
import mais from '../assets/mais.svg'
import menos from '../assets/menos.svg'
import pasta from '../assets/pasta.svg'
import moduloDiaNoite from '../assets/módulo-dia-noite.svg'
import projeto from '../assets/projeto.svg'
import setaMenuSuspenso from '../assets/seta-menu-suspenso-16px.svg'

function TreeIcon({ item }) {
  if (item.iconSrc) {
    return <img src={item.iconSrc} alt="" className="cad-tree-item__icon-image" />
  }

  if (item.icon === 'project') {
    return <img src={projeto} alt="" className="cad-tree-item__icon-image" />
  }

  if (item.icon === 'folder') {
    return <img src={pasta} alt="" className="cad-tree-item__icon-image" />
  }

  if (item.icon === 'day-night') {
    return <img src={moduloDiaNoite} alt="" className="cad-tree-item__icon-image" />
  }

  if (item.icon === 'ambientes') {
    return <img src={ambientes} alt="" className="cad-tree-item__icon-image" />
  }

  return null
}

function TreeNode({
  item,
  level = 0,
  expandedIds,
  onToggleItem,
  selectedNodeId,
  renamingNodeId,
  onSelectNode,
  onRenameRequest,
  onRenameCommit,
  onRenameCancel,
}) {
  const expanded = expandedIds.has(item.id)
  const hasChildren = Boolean(item.children?.length)
  const isRoot = level === 0
  const isEnvironment = item.source === 'created-environment'
  const isEquipmentItem = item.source === 'equipment-item'
  const isRenaming = item.id === renamingNodeId
  const isSelected = item.id === selectedNodeId
  const handleRowClick = () => {
    if (isEquipmentItem) {
      onSelectNode?.(item)
      return
    }

    if (isEnvironment) {
      onSelectNode?.(item)
      if (hasChildren) {
        onToggleItem(item.id)
      }
    } else if (hasChildren) {
      onToggleItem(item.id)
    }
  }

  return (
    <div className="cad-tree-node" style={{ '--tree-level': level }}>
      {isRenaming ? (
        <div className={`cad-tree-row${isRoot ? ' cad-tree-row--root' : ''}${isSelected ? ' cad-tree-row--selected' : ''}`}>
          <span className="cad-tree-row__toggle" />
          <span className="cad-tree-row__icon">
            <TreeIcon item={item} />
          </span>
          <input
            className="cad-tree-rename-input"
            key={item.id}
            defaultValue={item.label}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onRenameCommit?.(item.id, event.currentTarget.value)
              } else if (event.key === 'Escape') {
                onRenameCancel?.()
              }
              event.stopPropagation()
            }}
            onBlur={(event) => onRenameCommit?.(item.id, event.currentTarget.value)}
            onClick={(event) => event.stopPropagation()}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </div>
      ) : (
        <button
          type="button"
          className={`cad-tree-row${isRoot ? ' cad-tree-row--root' : ''}${isSelected ? ' cad-tree-row--selected' : ''}`}
          onClick={handleRowClick}
          onDoubleClick={isEnvironment || isEquipmentItem ? () => onRenameRequest?.(item) : undefined}
        >
          <span className="cad-tree-row__toggle">
            {hasChildren ? (
              <img
                src={setaMenuSuspenso}
                alt=""
                className={`cad-tree-row__toggle-icon${expanded ? '' : ' is-collapsed'}`}
              />
            ) : null}
          </span>
          <span className="cad-tree-row__icon">
            <TreeIcon item={item} />
          </span>
          <span className="cad-tree-row__label">{item.label}</span>
        </button>
      )}

      {hasChildren && expanded ? (
        <div className="cad-tree-children">
          {item.children.map((child) => (
            <TreeNode
              key={child.id}
              item={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggleItem={onToggleItem}
              selectedNodeId={selectedNodeId}
              renamingNodeId={renamingNodeId}
              onSelectNode={onSelectNode}
              onRenameRequest={onRenameRequest}
              onRenameCommit={onRenameCommit}
              onRenameCancel={onRenameCancel}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ProjectTree({ project, selectedNodeId, renamingNodeId, onSelectNode, onRenameRequest, onRenameCommit, onRenameCancel }) {
  const [query, setQuery] = useState('')
  const [expandedIds, setExpandedIds] = useState(() =>
    new Set([project.id, 'sala-de-automacao']),
  )

  const expandAll = () => {
    const ids = new Set()

    const visit = (item) => {
      ids.add(item.id)
      item.children?.forEach(visit)
    }

    visit(project)
    setExpandedIds(ids)
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  const onToggleItem = (itemId) => {
    setExpandedIds((current) => {
      const next = new Set(current)

      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }

      return next
    })
  }

  const tree = useMemo(() => project, [project])

  return (
    <section className="cad-panel cad-panel--tree" aria-label="Projeto">
      <div className="cad-section-header">PROJETO</div>

      <div className="cad-tree-controls">
        <div className="cad-tree-controls__expand">
          <button type="button" className="cad-tree-control-button" onClick={expandAll} aria-label="Expandir árvore">
            <img src={mais} alt="" />
          </button>
          <button type="button" className="cad-tree-control-button" onClick={collapseAll} aria-label="Contrair árvore">
            <img src={menos} alt="" />
          </button>
        </div>

        <div className="cad-tree-controls__line">
          <div className="cad-tree-controls__filters">
            <button type="button" className="cad-tree-control-button" title="Conexão hardware">
              <img src={conexaoHardware} alt="" />
            </button>
            <button type="button" className="cad-tree-control-button" title="Conexão software">
              <img src={conexaoSoftware} alt="" />
            </button>
            <button type="button" className="cad-tree-control-button" title="Drivers">
              <img src={drivers} alt="" />
            </button>
            <button type="button" className="cad-tree-control-button" title="Macros">
              <img src={macros} alt="" />
            </button>
          </div>

          <div className="cad-tree-controls__search">
            <label className="cad-tree-search" htmlFor="project-search">
              <input
                id="project-search"
                type="search"
                placeholder=""
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="cad-tree-control-button"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
            >
              <img src={limpar} alt="" />
            </button>
          </div>
        </div>
      </div>

      <div className="cad-tree-view">
        <TreeNode
          item={tree}
          expandedIds={expandedIds}
          onToggleItem={onToggleItem}
          selectedNodeId={selectedNodeId}
          renamingNodeId={renamingNodeId}
          onSelectNode={onSelectNode}
          onRenameRequest={onRenameRequest}
          onRenameCommit={onRenameCommit}
          onRenameCancel={onRenameCancel}
        />
      </div>
    </section>
  )
}

export default ProjectTree