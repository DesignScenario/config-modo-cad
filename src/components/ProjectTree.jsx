import { useEffect, useMemo, useRef, useState } from 'react'
import apagarProjeto from '../assets/apagar-projeto.svg'
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
import pavimentoAssociadoIcon from '../assets/pavimento-associado.svg'
import pavimentoIcon from '../assets/pavimento.svg'
import projeto from '../assets/projeto.svg'
import setaMenuSuspenso from '../assets/seta-menu-suspenso-16px.svg'

function TreeIcon({ item, importedPlanPavimentoId }) {
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

  if (item.icon === 'pavimento') {
    return (
      <img
        src={importedPlanPavimentoId === item.id ? pavimentoAssociadoIcon : pavimentoIcon}
        alt=""
        className="cad-tree-item__icon-image"
      />
    )
  }

  return null
}

function TreeNode({
  item,
  level = 0,
  importedPlanPavimentoId,
  expandedIds,
  onToggleItem,
  selectedNodeId,
  renamingNodeId,
  onSelectNode,
  onRenameRequest,
  onRenameCommit,
  onRenameCancel,
  onOpenContextMenu,
  onFocusNode,
}) {
  const expanded = expandedIds.has(item.id)
  const hasChildren = Boolean(item.children?.length)
  const isRoot = level === 0
  const isEnvironment = item.source === 'created-environment' || item.icon === 'ambientes'
  const isEquipmentItem = item.source === 'equipment-item'
  const isPavimento = item.source === 'pavimento'
  const isProject = item.source === 'project'
  const isBoard = item.source === 'automation-board'
  const isBoardDevice = item.source === 'board-device'
  const isAvOrganizer = item.source === 'av-organizer'
  const isAvDevice = item.source === 'av-device'
  const isRenaming = item.id === renamingNodeId
  const isSelected = item.id === selectedNodeId
  const handleRowClick = () => {
    if (isEquipmentItem || isBoard || isAvOrganizer) {
      onSelectNode?.(item)
      if ((isBoard || isAvOrganizer) && hasChildren) onToggleItem(item.id)
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
        <div
          className={`cad-tree-row${isRoot ? ' cad-tree-row--root' : ''}${isSelected ? ' cad-tree-row--selected' : ''}`}
          style={{ '--tree-level': level }}
        >
          <span className="cad-tree-row__toggle" />
          <span className="cad-tree-row__icon">
            <TreeIcon item={item} importedPlanPavimentoId={importedPlanPavimentoId} />
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
            autoFocus
          />
        </div>
      ) : (
        <button
          type="button"
          className={`cad-tree-row${isRoot ? ' cad-tree-row--root' : ''}${isSelected ? ' cad-tree-row--selected' : ''}`}
          style={{ '--tree-level': level }}
          onClick={handleRowClick}
          draggable={isEnvironment}
          onDragStart={isEnvironment ? (event) => {
            event.dataTransfer.setData('application/x-env-node', JSON.stringify({ id: item.id, label: item.label }))
            event.dataTransfer.effectAllowed = 'copy'
          } : undefined}
          onDoubleClick={
            isEnvironment
              ? () => onFocusNode?.(item)
              : (isEquipmentItem || isBoard || isBoardDevice || isAvOrganizer || isAvDevice)
                ? () => onRenameRequest?.(item)
                : undefined
          }
          onContextMenu={
            (isEnvironment || isProject || isPavimento || isEquipmentItem || isBoard || isBoardDevice || isAvOrganizer || isAvDevice)
              ? (event) => {
                  event.preventDefault()
                  onOpenContextMenu?.(event, item)
                }
              : undefined
          }
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
            <TreeIcon item={item} importedPlanPavimentoId={importedPlanPavimentoId} />
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
              importedPlanPavimentoId={importedPlanPavimentoId}
              expandedIds={expandedIds}
              onToggleItem={onToggleItem}
              selectedNodeId={selectedNodeId}
              renamingNodeId={renamingNodeId}
              onSelectNode={onSelectNode}
              onRenameRequest={onRenameRequest}
              onRenameCommit={onRenameCommit}
              onRenameCancel={onRenameCancel}
              onOpenContextMenu={onOpenContextMenu}
              onFocusNode={onFocusNode}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ProjectTree({
  project,
  importedPlanPavimentoId,
  selectedNodeId,
  renamingNodeId,
  onSelectNode,
  onRenameRequest,
  onRenameCommit,
  onRenameCancel,
  onDeleteNode,
  onEditNode,
  onFocusNode,
  onAddPavimento,
  onAddEnvironment,
  onImportFileRequest,
  onDefineScale,
}) {
  const [query, setQuery] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => {
    const ids = new Set([project.id])
    project.children?.forEach((child) => {
      if (child.source === 'pavimento') ids.add(child.id)
    })
    return ids
  })
  const treeViewRef = useRef(null)

  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu(null)
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }

    window.addEventListener('pointerdown', handleCloseMenu)
    window.addEventListener('resize', handleCloseMenu)
    window.addEventListener('scroll', handleCloseMenu, true)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handleCloseMenu)
      window.removeEventListener('resize', handleCloseMenu)
      window.removeEventListener('scroll', handleCloseMenu, true)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

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

  const openContextMenu = (event, node) => {
    const container = treeViewRef.current

    if (!container || !node) {
      return
    }

    onSelectNode?.(node)

    const bounds = container.getBoundingClientRect()
    const menuWidth = 172
    const menuHeight = node.source === 'pavimento'
      ? 165
      : node.source === 'project'
        ? 140
        : (node.source === 'automation-board' || node.source === 'board-device' || node.source === 'equipment-item')
          ? 92
          : 92
    const x = Math.min(event.clientX - bounds.left, bounds.width - menuWidth - 4)
    const y = Math.min(event.clientY - bounds.top, bounds.height - menuHeight - 4)

    setContextMenu({
      x: Math.max(4, x),
      y: Math.max(4, y),
      node,
    })
  }

  const treeSelectedNodeId = contextMenu ? contextMenu.node.id : selectedNodeId

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

      <div className="cad-tree-view" ref={treeViewRef}>
        <TreeNode
          item={tree}
          importedPlanPavimentoId={importedPlanPavimentoId}
          expandedIds={expandedIds}
          onToggleItem={onToggleItem}
          selectedNodeId={treeSelectedNodeId}
          renamingNodeId={renamingNodeId}
          onSelectNode={onSelectNode}
          onRenameRequest={onRenameRequest}
          onRenameCommit={onRenameCommit}
          onRenameCancel={onRenameCancel}
          onOpenContextMenu={openContextMenu}
          onFocusNode={onFocusNode}
        />

        {contextMenu ? (
          <div
            className="cad-tree-context-menu"
            style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {contextMenu.node.source === 'project' ? (
              <>
                <button
                  type="button"
                  className="cad-tree-context-menu__item"
                  onClick={() => {
                    onAddPavimento?.()
                    setContextMenu(null)
                  }}
                >
                  <span className="cad-tree-context-menu__label">Novo Pavimento</span>
                </button>

                <button
                  type="button"
                  className="cad-tree-context-menu__item"
                  onClick={() => {
                    onAddEnvironment?.()
                    setContextMenu(null)
                  }}
                >
                  <span className="cad-tree-context-menu__label">Novo Ambiente</span>
                </button>

                <div className="cad-tree-context-menu__divider" />

                <button
                  type="button"
                  className="cad-tree-context-menu__item"
                  onClick={() => {
                    onRenameRequest?.(contextMenu.node)
                    setContextMenu(null)
                  }}
                >
                  <span className="cad-tree-context-menu__label">Renomear</span>
                </button>

                <button
                  type="button"
                  className="cad-tree-context-menu__item"
                  onClick={() => setContextMenu(null)}
                >
                  <span className="cad-tree-context-menu__label">Gerar Room-Controls</span>
                </button>
              </>
            ) : contextMenu.node.source === 'pavimento' ? (
              <>
                <button
                  type="button"
                  className="cad-tree-context-menu__item"
                  onClick={() => {
                    onImportFileRequest?.(contextMenu.node)
                    setContextMenu(null)
                  }}
                >
                  <span className="cad-tree-context-menu__label">Importar arquivo</span>
                </button>

                <button
                  type="button"
                  className="cad-tree-context-menu__item"
                  onClick={() => {
                    onDefineScale?.()
                    setContextMenu(null)
                  }}
                >
                  <span className="cad-tree-context-menu__label">Propriedades</span>
                </button>

                <button
                  type="button"
                  className="cad-tree-context-menu__item"
                  onClick={() => {
                    onAddEnvironment?.()
                    setContextMenu(null)
                  }}
                >
                  <span className="cad-tree-context-menu__label">Novo Ambiente</span>
                </button>

                <div className="cad-tree-context-menu__divider" />

                <button
                  type="button"
                  className="cad-tree-context-menu__item"
                  onClick={() => {
                    onRenameRequest?.(contextMenu.node)
                    setContextMenu(null)
                  }}
                >
                  <span className="cad-tree-context-menu__label">Renomear</span>
                </button>

                <button
                  type="button"
                  className="cad-tree-context-menu__item"
                  onClick={() => setContextMenu(null)}
                >
                  <span className="cad-tree-context-menu__label">Gerar Room-Controls</span>
                </button>
              </>
            ) : (['equipment-item', 'automation-board', 'board-device', 'av-organizer', 'av-device'].includes(contextMenu.node.source)) ? (
              <>
                <button
                  type="button"
                  className="cad-tree-context-menu__item"
                  onClick={() => {
                    onRenameRequest?.(contextMenu.node)
                    setContextMenu(null)
                  }}
                >
                  <span className="cad-tree-context-menu__label">Renomear</span>
                </button>

                <button
                  type="button"
                  className="cad-tree-context-menu__item"
                  onClick={() => setContextMenu(null)}
                >
                  <span className="cad-tree-context-menu__label">Propriedades</span>
                </button>

                <button
                  type="button"
                  className="cad-tree-context-menu__item cad-tree-context-menu__item--danger"
                  onClick={() => {
                    onDeleteNode?.(contextMenu.node)
                    setContextMenu(null)
                  }}
                >
                  <img src={apagarProjeto} alt="" className="cad-tree-context-menu__icon" />
                  <span className="cad-tree-context-menu__label">Excluir</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="cad-tree-context-menu__item"
                  onClick={() => {
                    onRenameRequest?.(contextMenu.node)
                    setContextMenu(null)
                  }}
                >
                  <span className="cad-tree-context-menu__label">Renomear</span>
                </button>

                <button
                  type="button"
                  className="cad-tree-context-menu__item"
                  onClick={() => {
                    onEditNode?.(contextMenu.node)
                    setContextMenu(null)
                  }}
                >
                  <span className="cad-tree-context-menu__label">Editar</span>
                </button>

                <button
                  type="button"
                  className="cad-tree-context-menu__item cad-tree-context-menu__item--danger"
                  onClick={() => {
                    onDeleteNode?.(contextMenu.node)
                    setContextMenu(null)
                  }}
                >
                  <img src={apagarProjeto} alt="" className="cad-tree-context-menu__icon" />
                  <span className="cad-tree-context-menu__label">Excluir</span>
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default ProjectTree