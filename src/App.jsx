import { useEffect, useMemo, useRef, useState } from 'react'
import AppMenu from './components/AppMenu.jsx'
import TopToolbar from './components/TopToolbar.jsx'
import ProjectTree from './components/ProjectTree.jsx'
import CadCanvas from './components/CadCanvas.jsx'
import EquipmentLibraryOverlay from './components/EquipmentLibraryOverlay.jsx'
import StatusBar from './components/StatusBar.jsx'
import ScaleSetupOverlay from './components/ScaleSetupOverlay.jsx'
import ScaleValueOverlay from './components/ScaleValueOverlay.jsx'
import EnvironmentInfoOverlay from './components/EnvironmentInfoOverlay.jsx'
import etiquetaDeAbasAbrir from './assets/etiqueta-de-abas-abrir.svg'
import etiquetaDeAbasFechar from './assets/etiqueta-de-abas-fechar.svg'
import { initialProject } from './data/initialProject.js'
import './styles/cad.css'

const AUTOMATION_ROOM_ID = 'sala-de-automacao'
const PROJECT_ROOT_ID = 'novo-projeto'
const MIN_ZOOM = 50
const MAX_ZOOM = 1000

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function cloneProjectTree(project) {
  return JSON.parse(JSON.stringify(project))
}

function removeNodeById(node, nodeId) {
  if (!node.children?.length) return node
  return {
    ...node,
    children: node.children
      .filter((child) => child.id !== nodeId)
      .map((child) => removeNodeById(child, nodeId)),
  }
}

function updateNodeLabel(node, nodeId, newLabel) {
  if (node.id === nodeId) return { ...node, label: newLabel }
  if (!node.children?.length) return node
  return { ...node, children: node.children.map((child) => updateNodeLabel(child, nodeId, newLabel)) }
}

function appendEquipmentToEnvironment(node, environmentId, child) {
  if (node.id === environmentId) {
    return {
      ...node,
      children: [...(node.children ?? []), child],
    }
  }

  if (!node.children?.length) {
    return node
  }

  return {
    ...node,
    children: node.children.map((currentChild) =>
      appendEquipmentToEnvironment(currentChild, environmentId, child),
    ),
  }
}

function appendEnvironmentAfterAutomationRoom(root, child) {
  if (root.id !== PROJECT_ROOT_ID) {
    return root
  }

  const currentChildren = root.children ?? []
  const automationRoomIndex = currentChildren.findIndex((node) => node.id === AUTOMATION_ROOM_ID)

  if (automationRoomIndex === -1) {
    return {
      ...root,
      children: [...currentChildren, child],
    }
  }

  let insertIndex = automationRoomIndex + 1
  while (
    insertIndex < currentChildren.length
    && currentChildren[insertIndex]?.source === 'created-environment'
  ) {
    insertIndex += 1
  }

  return {
    ...root,
    children: [
      ...currentChildren.slice(0, insertIndex),
      child,
      ...currentChildren.slice(insertIndex),
    ],
  }
}

function App() {
  const [activeTool, setActiveTool] = useState('select')
  const [zoom, setZoom] = useState(100)
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(true)
  const [importedImage, setImportedImage] = useState(null)
  const [imageRotation, setImageRotation] = useState(0)
  const [showScaleOverlay, setShowScaleOverlay] = useState(false)
  const [showScaleValueOverlay, setShowScaleValueOverlay] = useState(false)
  const [showEquipmentLibrary, setShowEquipmentLibrary] = useState(false)
  const [isAwaitingScaleLine, setIsAwaitingScaleLine] = useState(false)
  const [pendingScaleSegment, setPendingScaleSegment] = useState(null)
  const [scaleDefinition, setScaleDefinition] = useState(null)
  const [clearScaleReferenceToken, setClearScaleReferenceToken] = useState(0)
  const [projectTree, setProjectTree] = useState(() => cloneProjectTree(initialProject))
  const [showEnvironmentOverlay, setShowEnvironmentOverlay] = useState(false)
  const [pendingEnvironmentPolygon, setPendingEnvironmentPolygon] = useState(null)
  const [environmentClassOptions] = useState(['Nao definida'])
  const [polygonColorById, setPolygonColorById] = useState({})
  const [environments, setEnvironments] = useState([])
  const [placedEquipments, setPlacedEquipments] = useState([])
  const [defaultCeilingHeight, setDefaultCeilingHeight] = useState('3')
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState(null)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null)
  const [renamingEnvironmentId, setRenamingEnvironmentId] = useState(null)
  const [renamingSource, setRenamingSource] = useState(null)
  const [renamingEquipmentId, setRenamingEquipmentId] = useState(null)
  const [renamingEquipmentSource, setRenamingEquipmentSource] = useState(null)
  const dragStateRef = useRef({ dragging: false })
  const importedImageUrlRef = useRef(null)

  const menuItems = useMemo(
    () => [
      'Arquivo',
      'Preferências',
      'Sistema',
      'Informações de projeto',
      'Estrutura',
      'CAD',
      'Equipamentos',
      'Programação',
      'Instalação',
      'Gerenciamento de Drivers',
      'Enviar Projeto',
    ],
    [],
  )

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragStateRef.current.dragging) {
        return
      }

      const nextWidth = Math.min(1020, Math.max(300, event.clientX))
      setSidebarWidth(nextWidth)
    }

    const stopDragging = () => {
      dragStateRef.current.dragging = false
      document.body.classList.remove('is-resizing-tree')
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
    }
  }, [])

  const startResize = (event) => {
    if (!isProjectPanelOpen) {
      return
    }

    event.preventDefault()
    dragStateRef.current.dragging = true
    document.body.classList.add('is-resizing-tree')
  }

  const handleImportImage = (file) => {
    if (importedImageUrlRef.current) {
      URL.revokeObjectURL(importedImageUrlRef.current)
    }

    const nextUrl = URL.createObjectURL(file)
    importedImageUrlRef.current = nextUrl
    setImportedImage({ src: nextUrl, name: file.name })
    setShowScaleOverlay(true)
    setShowScaleValueOverlay(false)
    setIsAwaitingScaleLine(false)
    setPendingScaleSegment(null)
    setScaleDefinition(null)
    setImageRotation(0)
    setClearScaleReferenceToken((currentToken) => currentToken + 1)
    setProjectTree(cloneProjectTree(initialProject))
    setShowEnvironmentOverlay(false)
    setPendingEnvironmentPolygon(null)
    setPolygonColorById({})
    setEnvironments([])
    setPlacedEquipments([])
    setDefaultCeilingHeight('3')
    setSelectedEnvironmentId(null)
    setSelectedEquipmentId(null)
    setRenamingEnvironmentId(null)
    setRenamingSource(null)
    setRenamingEquipmentId(null)
    setRenamingEquipmentSource(null)
    setShowEquipmentLibrary(false)
  }

  const toggleProjectPanel = () => {
    setIsProjectPanelOpen((current) => !current)
  }

  const handleZoomChange = (nextZoom) => {
    setZoom(clampZoom(nextZoom))
  }

  const handleRotateImage = () => {
    setImageRotation((currentRotation) => (currentRotation + 90) % 360)
  }

  const handleStartScaleSetup = () => {
    setShowScaleOverlay(false)
    setActiveTool('polygon')
    setIsAwaitingScaleLine(true)
  }

  const handlePolygonSegmentCreated = (segment) => {
    if (!isAwaitingScaleLine || !segment?.lengthPixels) {
      return
    }

    setPendingScaleSegment(segment)
    setShowScaleValueOverlay(true)
    setIsAwaitingScaleLine(false)
  }

  const handleConcludeScale = (metersValue) => {
    if (!pendingScaleSegment?.lengthPixels) {
      return
    }

    const pixels = pendingScaleSegment.lengthPixels
    const meters = metersValue

    setScaleDefinition({
      meters,
      pixels,
      metersPerPixel: meters / pixels,
      pixelsPerMeter: pixels / meters,
      referenceSegment: pendingScaleSegment,
    })
    setShowScaleValueOverlay(false)
    setPendingScaleSegment(null)
    setActiveTool('select')
    setClearScaleReferenceToken((currentToken) => currentToken + 1)
  }

  const handlePolygonCreated = (polygon) => {
    setPendingEnvironmentPolygon(polygon)
    setShowEnvironmentOverlay(true)
    setActiveTool('select')
  }

  const handlePolygonDeleted = (polygonId) => {
    const env = environments.find((e) => e.polygonId === polygonId)
    const removedEquipmentIds = placedEquipments
      .filter((equipment) => equipment.polygonId === polygonId)
      .map((equipment) => equipment.id)
    setEnvironments((curr) => curr.filter((e) => e.polygonId !== polygonId))
    setPlacedEquipments((curr) => curr.filter((equipment) => equipment.polygonId !== polygonId))
    setPolygonColorById((curr) => {
      const next = { ...curr }
      delete next[polygonId]
      return next
    })
    if (env) {
      setProjectTree((curr) => removeNodeById(curr, env.id))
    }
    setSelectedEnvironmentId((currentSelectedId) => (env?.id === currentSelectedId ? null : currentSelectedId))
    setSelectedEquipmentId((currentSelectedId) =>
      removedEquipmentIds.includes(currentSelectedId) ? null : currentSelectedId,
    )
  }

  const handleEquipmentDropped = ({ polygonId, point, equipment }) => {
    const environment = environments.find((currentEnvironment) => currentEnvironment.polygonId === polygonId)

    if (!environment || !equipment?.label || !equipment?.iconSrc) {
      return
    }

    const equipmentId = `equip-${Date.now()}-${Math.round(Math.random() * 1000)}`
    const nextEquipment = {
      id: equipmentId,
      polygonId,
      point,
      label: equipment.label,
      iconSrc: equipment.iconSrc,
      iconKey: equipment.iconKey,
      environmentId: environment.id,
    }

    setPlacedEquipments((curr) => [...curr, nextEquipment])
    setProjectTree((curr) =>
      appendEquipmentToEnvironment(curr, environment.id, {
        id: equipmentId,
        label: equipment.label,
        icon: equipment.iconKey ?? 'drivers',
        iconSrc: equipment.iconSrc,
        source: 'equipment-item',
      }),
    )
  }

  const handleEquipmentMoved = ({ equipmentId, polygonId, point }) => {
    const nextEnvironment = environments.find((currentEnvironment) => currentEnvironment.polygonId === polygonId)
    if (!nextEnvironment) {
      return
    }

    const movedEquipment = placedEquipments.find((equipment) => equipment.id === equipmentId)
    if (!movedEquipment) {
      return
    }

    setPlacedEquipments((currentEquipments) =>
      currentEquipments.map((equipment) => {
        if (equipment.id !== equipmentId) {
          return equipment
        }

        return {
          ...equipment,
          polygonId,
          point,
          environmentId: nextEnvironment.id,
        }
      }),
    )

    if (movedEquipment.environmentId !== nextEnvironment.id) {
      setProjectTree((currentTree) =>
        appendEquipmentToEnvironment(
          removeNodeById(currentTree, equipmentId),
          nextEnvironment.id,
          {
            id: movedEquipment.id,
            label: movedEquipment.label,
            icon: movedEquipment.iconKey ?? 'drivers',
            iconSrc: movedEquipment.iconSrc,
            source: 'equipment-item',
          },
        ),
      )
    }
  }

  const handleDeleteEquipment = (equipmentId) => {
    setPlacedEquipments((currentEquipments) =>
      currentEquipments.filter((equipment) => equipment.id !== equipmentId),
    )
    setProjectTree((currentTree) => removeNodeById(currentTree, equipmentId))
    setSelectedEquipmentId((currentSelectedId) =>
      currentSelectedId === equipmentId ? null : currentSelectedId,
    )
    setRenamingEquipmentId((currentRenamingId) =>
      currentRenamingId === equipmentId ? null : currentRenamingId,
    )
    setRenamingEquipmentSource(null)
  }

  const handleSelectEnvironment = (environmentId) => {
    setSelectedEnvironmentId(environmentId)
    setSelectedEquipmentId(null)
  }

  const handleSelectEquipment = (equipmentId) => {
    setSelectedEquipmentId(equipmentId)
    const equipment = placedEquipments.find((currentEquipment) => currentEquipment.id === equipmentId)
    if (equipment?.environmentId) {
      setSelectedEnvironmentId(equipment.environmentId)
    }
  }

  const handleCommitRename = (environmentId, newName) => {
    const trimmed = (newName ?? '').trim()
    if (trimmed) {
      setEnvironments((curr) =>
        curr.map((e) => (e.id === environmentId ? { ...e, name: trimmed } : e)),
      )
      setProjectTree((curr) => updateNodeLabel(curr, environmentId, trimmed))
    }
    setRenamingEnvironmentId(null)
    setRenamingSource(null)
  }

  const handleCommitEquipmentRename = (equipmentId, newName) => {
    const trimmed = (newName ?? '').trim()
    if (trimmed) {
      setPlacedEquipments((currentEquipments) =>
        currentEquipments.map((equipment) =>
          equipment.id === equipmentId ? { ...equipment, label: trimmed } : equipment,
        ),
      )
      setProjectTree((currentTree) => updateNodeLabel(currentTree, equipmentId, trimmed))
    }
    setRenamingEquipmentId(null)
    setRenamingEquipmentSource(null)
  }

  const handleStartRename = (environmentId, source) => {
    const env = environments.find((e) => e.id === environmentId)
    if (!env) return
    setRenamingEnvironmentId(environmentId)
    setRenamingSource(source)
  }

  const handleStartEquipmentRename = (equipmentId, source) => {
    const equipment = placedEquipments.find((currentEquipment) => currentEquipment.id === equipmentId)
    if (!equipment) return
    setRenamingEquipmentId(equipmentId)
    setRenamingEquipmentSource(source)
  }

  const handleCancelRename = () => {
    setRenamingEnvironmentId(null)
    setRenamingSource(null)
    setRenamingEquipmentId(null)
    setRenamingEquipmentSource(null)
  }

  const handleSelectTreeNode = (node) => {
    if (node?.source === 'created-environment') {
      handleSelectEnvironment(node.id)
      return
    }

    if (node?.source === 'equipment-item') {
      handleSelectEquipment(node.id)
    }
  }

  const handleRenameRequestFromTree = (node) => {
    if (node?.source === 'created-environment') {
      handleStartRename(node.id, 'tree')
      return
    }

    if (node?.source === 'equipment-item') {
      handleStartEquipmentRename(node.id, 'tree')
    }
  }

  const handleRenameCommitFromTree = (nodeId, newName) => {
    if (environments.some((environment) => environment.id === nodeId)) {
      handleCommitRename(nodeId, newName)
      return
    }

    if (placedEquipments.some((equipment) => equipment.id === nodeId)) {
      handleCommitEquipmentRename(nodeId, newName)
    }
  }

  const handleConcludeEnvironment = ({ name, environmentClass, ceilingHeight, color }) => {
    if (!pendingEnvironmentPolygon?.id) {
      return
    }

    const nextEnvironment = {
      id: `ambiente-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      polygonId: pendingEnvironmentPolygon.id,
      name,
      environmentClass,
      ceilingHeight,
      color,
    }

    setEnvironments((currentEnvironments) => [...currentEnvironments, nextEnvironment])
    setDefaultCeilingHeight(ceilingHeight)
    setPolygonColorById((currentColors) => ({
      ...currentColors,
      [pendingEnvironmentPolygon.id]: color,
    }))
    setProjectTree((currentTree) =>
      appendEnvironmentAfterAutomationRoom(currentTree, {
        id: nextEnvironment.id,
        label: name,
        icon: 'ambientes',
        source: 'created-environment',
      }),
    )
    setPendingEnvironmentPolygon(null)
    setShowEnvironmentOverlay(false)
  }

  const scaleStatusLabel = scaleDefinition
    ? `Escala definida: ${scaleDefinition.meters.toFixed(2)} m em ${scaleDefinition.pixels.toFixed(1)} px`
    : 'Escala nao definida'

  const nextEnvironmentName = `Ambiente ${environments.length + 1}`
  const polygonLabelById = environments.reduce((accumulator, environment) => {
    accumulator[environment.polygonId] = environment.name
    return accumulator
  }, {})

  const renamingEnvironment = environments.find((e) => e.id === renamingEnvironmentId)
  const renamingPolygonId = renamingSource === 'canvas'
    ? (renamingEnvironment?.polygonId ?? null)
    : null
  const renamingEquipmentNodeId = renamingEquipmentSource === 'tree' ? renamingEquipmentId : null
  const renamingNodeId = renamingSource === 'tree' ? renamingEnvironmentId : renamingEquipmentNodeId
  const renamingEquipmentCanvasId = renamingEquipmentSource === 'canvas' ? renamingEquipmentId : null
  const selectedEnvironment = environments.find((environment) => environment.id === selectedEnvironmentId)
  const selectedPolygonId = selectedEnvironment?.polygonId ?? null
  const selectedNodeId = selectedEquipmentId ?? selectedEnvironmentId

  useEffect(
    () => () => {
      if (importedImageUrlRef.current) {
        URL.revokeObjectURL(importedImageUrlRef.current)
      }
    },
    [],
  )

  return (
    <div className="cad-app-shell">
      <AppMenu
        title="E2 - TELA - ESTRUTURA - PLANTA BAIXA"
        items={menuItems}
        activeItem="CAD"
        userLabel="Login desigscenario1@gmail.com:design01@scenario.ind.br"
      />

      <div
        className="cad-app-body"
        style={{
          '--sidebar-width': isProjectPanelOpen ? `${sidebarWidth}px` : '0px',
          '--splitter-width': isProjectPanelOpen ? '4px' : '0px',
        }}
      >
        <aside className="cad-sidebar">
          {isProjectPanelOpen ? (
            <ProjectTree
              project={projectTree}
              selectedNodeId={selectedNodeId}
              renamingNodeId={renamingNodeId}
              onSelectNode={handleSelectTreeNode}
              onRenameRequest={handleRenameRequestFromTree}
              onRenameCommit={handleRenameCommitFromTree}
              onRenameCancel={handleCancelRename}
            />
          ) : null}
        </aside>

        <button
          type="button"
          className={`cad-project-tab${isProjectPanelOpen ? '' : ' is-collapsed'}`}
          aria-label={isProjectPanelOpen ? 'Fechar aba de projeto' : 'Abrir aba de projeto'}
          onClick={toggleProjectPanel}
        >
          <img
            src={isProjectPanelOpen ? etiquetaDeAbasFechar : etiquetaDeAbasAbrir}
            alt=""
            aria-hidden="true"
            className="cad-project-tab__image"
          />
        </button>

        <div
          className={`cad-splitter${isProjectPanelOpen ? '' : ' is-hidden'}`}
          onPointerDown={startResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar árvore"
          tabIndex={0}
        />

        <main className="cad-main">
          <section className="cad-workspace">
            <div className="cad-section-header">MODO CAD</div>
            <TopToolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              zoom={zoom}
              onZoomChange={handleZoomChange}
              onImportImage={handleImportImage}
              onToggleEquipmentLibrary={() => setShowEquipmentLibrary((current) => !current)}
              onRotateImage={handleRotateImage}
            />
            <div className="cad-canvas-area">
              <CadCanvas
                activeTool={activeTool}
                zoom={zoom}
                imageRotation={imageRotation}
                backgroundImage={importedImage}
                onZoomChange={handleZoomChange}
                hasScaleDefinition={Boolean(scaleDefinition)}
                onPolygonSegmentCreated={handlePolygonSegmentCreated}
                onPolygonCreated={handlePolygonCreated}
                onPolygonDeleted={handlePolygonDeleted}
                polygonColorById={polygonColorById}
                polygonLabelById={polygonLabelById}
                placedEquipments={placedEquipments}
                isAwaitingScaleLine={isAwaitingScaleLine}
                clearScaleReferenceToken={clearScaleReferenceToken}
                onEquipmentDrop={handleEquipmentDropped}
                onEquipmentMove={handleEquipmentMoved}
                onEquipmentDelete={handleDeleteEquipment}
                selectedEquipmentId={selectedEquipmentId}
                renamingEquipmentId={renamingEquipmentCanvasId}
                renamingPolygonId={renamingPolygonId}
                selectedPolygonId={selectedPolygonId}
                onEquipmentSelect={handleSelectEquipment}
                onPolygonSelect={(polygonId) => {
                  const env = environments.find((environment) => environment.polygonId === polygonId)
                  if (env) {
                    handleSelectEnvironment(env.id)
                  }
                }}
                onCanvasBackgroundClick={() => {
                  setSelectedEnvironmentId(null)
                  setSelectedEquipmentId(null)
                }}
                onLabelClick={(polygonId) => {
                  const env = environments.find((e) => e.polygonId === polygonId)
                  if (env) handleSelectEnvironment(env.id)
                }}
                onLabelDoubleClick={(polygonId) => {
                  const env = environments.find((e) => e.polygonId === polygonId)
                  if (env) handleStartRename(env.id, 'canvas')
                }}
                onLabelRenameCommit={(polygonId, newName) => {
                  const env = environments.find((e) => e.polygonId === polygonId)
                  if (env) handleCommitRename(env.id, newName)
                  else handleCancelRename()
                }}
                onEquipmentLabelDoubleClick={(equipmentId) => handleStartEquipmentRename(equipmentId, 'canvas')}
                onEquipmentLabelRenameCommit={handleCommitEquipmentRename}
                onCancelRename={handleCancelRename}
              />
              {showScaleOverlay ? <ScaleSetupOverlay onStart={handleStartScaleSetup} /> : null}
              {showScaleValueOverlay ? <ScaleValueOverlay onConclude={handleConcludeScale} /> : null}
              {showEnvironmentOverlay ? (
                <EnvironmentInfoOverlay
                  suggestedName={nextEnvironmentName}
                  classOptions={environmentClassOptions}
                  defaultCeilingHeight={defaultCeilingHeight}
                  onConclude={handleConcludeEnvironment}
                />
              ) : null}
              {showEquipmentLibrary ? (
                <EquipmentLibraryOverlay onClose={() => setShowEquipmentLibrary(false)} />
              ) : null}
            </div>
          </section>
        </main>
      </div>

      <StatusBar
        version="2.15.5 Build(6)"
        connectionStatus="Local"
        installationName="Nome do projeto"
        notificationLabel={scaleStatusLabel}
      />
    </div>
  )
}

export default App
