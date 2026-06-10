import { useEffect, useMemo, useRef, useState } from 'react'
import AppMenu from './components/AppMenu.jsx'
import CadTaskbar from './components/CadTaskbar.jsx'
import TopToolbar from './components/TopToolbar.jsx'
import ProjectTree from './components/ProjectTree.jsx'
import CadCanvas from './components/CadCanvas.jsx'
import EquipmentLibraryOverlay from './components/EquipmentLibraryOverlay.jsx'
import StatusBar from './components/StatusBar.jsx'
import ScaleSetupOverlay from './components/ScaleSetupOverlay.jsx'
import ScaleValueOverlay from './components/ScaleValueOverlay.jsx'
import DeleteEnvironmentConfirmOverlay from './components/DeleteEnvironmentConfirmOverlay.jsx'
import EnvironmentInfoOverlay from './components/EnvironmentInfoOverlay.jsx'
import EquipmentPropertiesOverlay from './components/EquipmentPropertiesOverlay.jsx'
import AutomationBoardOverlay from './components/AutomationBoardOverlay.jsx'
import etiquetaDeAbasAbrir from './assets/etiqueta-de-abas-abrir.svg'
import etiquetaDeAbasFechar from './assets/etiqueta-de-abas-fechar.svg'
import { createDefaultEquipmentFilters, BOARD_CATALOG_IDS, isBoardOnlyItem, getBoardSlotCount, AV_ORGANIZER_CATALOG_IDS, isAvOrganizerOnlyItem } from './data/equipmentLibrary.js'
import { initialProject } from './data/initialProject.js'
import './styles/cad.css'

const AUTOMATION_ROOM_ID = 'sala-de-automacao'
const PROJECT_ROOT_ID = 'novo-projeto'
const MIN_ZOOM = 50
const MAX_ZOOM = 1000
const MIN_OPACITY = 0
const MAX_OPACITY = 100
const ENVIRONMENT_CLASS_OPTIONS = [
  'Não definida',
  'Dormitório',
  'Banheiro',
  'Social',
  'Serviço',
  'Circulação',
  'Lazer',
  'Externo',
  'Trabalho',
  'Garagem',
  'Apoio',
]
const ENVIRONMENT_CLASS_COLOR_MAP = {
  'Não definida': '#6BC2F7',
  'Dormitório': '#6BC2F7',
  'Banheiro': '#6BC2F7',
  'Social': '#6BC2F7',
  'Serviço': '#6BC2F7',
  'Circulação': '#6BC2F7',
  'Lazer': '#6BC2F7',
  'Externo': '#6BC2F7',
  'Trabalho': '#6BC2F7',
  'Garagem': '#6BC2F7',
  'Apoio': '#6BC2F7',
}

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function clampOpacity(value) {
  return Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, value))
}

function cloneProjectTree(project) {
  return JSON.parse(JSON.stringify(project))
}

function findNodeById(node, nodeId) {
  if (node.id === nodeId) return node
  if (!node.children?.length) return null
  for (const child of node.children) {
    const found = findNodeById(child, nodeId)
    if (found) return found
  }
  return null
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

function updateNodeSource(node, nodeId, newSource) {
  if (node.id === nodeId) return { ...node, source: newSource }
  if (!node.children?.length) return node
  return { ...node, children: node.children.map((child) => updateNodeSource(child, nodeId, newSource)) }
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

function appendEnvironmentToFirstPavimento(root, child) {
  if (root.id !== PROJECT_ROOT_ID) {
    return root
  }

  const currentChildren = root.children ?? []
  const firstPavimentoIndex = currentChildren.findIndex((node) => node.source === 'pavimento')

  if (firstPavimentoIndex === -1) {
    return { ...root, children: [...currentChildren, child] }
  }

  const pavimento = currentChildren[firstPavimentoIndex]
  const updatedPavimento = {
    ...pavimento,
    children: [...(pavimento.children ?? []), child],
  }

  return {
    ...root,
    children: [
      ...currentChildren.slice(0, firstPavimentoIndex),
      updatedPavimento,
      ...currentChildren.slice(firstPavimentoIndex + 1),
    ],
  }
}

function collectEnvTreeNodes(node, result = []) {
  if (node.icon === 'ambientes') {
    result.push({ id: node.id, label: node.label })
  }
  node.children?.forEach((child) => collectEnvTreeNodes(child, result))
  return result
}

function appendPavimentoToProject(root) {
  const newPavimento = {
    id: `pavimento-${Date.now()}`,
    label: 'Novo Pavimento',
    icon: 'pavimento',
    source: 'pavimento',
    children: [],
  }

  const currentChildren = root.children ?? []

  let insertIndex = currentChildren.length
  for (let i = currentChildren.length - 1; i >= 0; i--) {
    if (currentChildren[i].source === 'pavimento' || currentChildren[i].id === 'atividades-globais') {
      insertIndex = i + 1
      break
    }
  }

  return {
    ...root,
    children: [
      ...currentChildren.slice(0, insertIndex),
      newPavimento,
      ...currentChildren.slice(insertIndex),
    ],
  }
}

function findFirstPavimentoId(node) {
  if (!node) {
    return null
  }

  if (node.source === 'pavimento') {
    return node.id
  }

  for (const child of node.children ?? []) {
    const found = findFirstPavimentoId(child)
    if (found) {
      return found
    }
  }

  return null
}

function isEquipmentVisibleByFilters(equipment, filters) {
  if (!filters.all) {
    return false
  }

  const filterKeys = equipment?.filterKeys ?? []

  if (filterKeys.length === 0) {
    return true
  }

  return filterKeys.some((filterKey) => filters[filterKey])
}

function App() {
  const [activeTool, setActiveTool] = useState('select')
  const [zoom, setZoom] = useState(100)
  const [backgroundOpacity, setBackgroundOpacity] = useState(100)
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(true)
  const [importedImage, setImportedImage] = useState(null)
  const [imageRotation, setImageRotation] = useState(0)
  const [showScaleOverlay, setShowScaleOverlay] = useState(false)
  const [showScaleValueOverlay, setShowScaleValueOverlay] = useState(false)
  const [showEquipmentLibrary, setShowEquipmentLibrary] = useState(false)
  const [multiAddPlacementRequest, setMultiAddPlacementRequest] = useState(null)
  const [automationBoards, setAutomationBoards] = useState([])
  const [pendingBoardPlacement, setPendingBoardPlacement] = useState(null)
  const [avOrganizers, setAvOrganizers] = useState([])
  const [selectedAvOrganizerId, setSelectedAvOrganizerId] = useState(null)
  const [renamingAvOrganizerId, setRenamingAvOrganizerId] = useState(null)
  const [renamingAvOrganizerSource, setRenamingAvOrganizerSource] = useState(null)
  const [isAwaitingScaleLine, setIsAwaitingScaleLine] = useState(false)
  const [pendingScaleSegment, setPendingScaleSegment] = useState(null)
  const [scaleDefinition, setScaleDefinition] = useState(null)
  const [clearScaleReferenceToken, setClearScaleReferenceToken] = useState(0)
  const [projectTree, setProjectTree] = useState(() => cloneProjectTree(initialProject))
  const [showEnvironmentOverlay, setShowEnvironmentOverlay] = useState(false)
  const [pendingEnvironmentPolygon, setPendingEnvironmentPolygon] = useState(null)
  const [editingEnvironmentId, setEditingEnvironmentId] = useState(null)
  const [environmentClassOptions] = useState(ENVIRONMENT_CLASS_OPTIONS)
  const [polygonColorById, setPolygonColorById] = useState({})
  const [environments, setEnvironments] = useState([])
  const [placedEquipments, setPlacedEquipments] = useState([])
  const [defaultCeilingHeight, setDefaultCeilingHeight] = useState('3')
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState(null)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null)
  const [selectedBoardId, setSelectedBoardId] = useState(null)
  const [equipmentFilters, setEquipmentFilters] = useState(() => createDefaultEquipmentFilters())
  const [equipmentPropertiesId, setEquipmentPropertiesId] = useState(null)
  const [renamingEnvironmentId, setRenamingEnvironmentId] = useState(null)
  const [renamingSource, setRenamingSource] = useState(null)
  const [renamingEquipmentId, setRenamingEquipmentId] = useState(null)
  const [renamingEquipmentSource, setRenamingEquipmentSource] = useState(null)
  const [renamingBoardId, setRenamingBoardId] = useState(null)
  const [renamingBoardSource, setRenamingBoardSource] = useState(null)
  const [renamingGenericNodeId, setRenamingGenericNodeId] = useState(null)
  const [polygonDeleteRequestId, setPolygonDeleteRequestId] = useState(null)
  const [pendingDeletePolygonId, setPendingDeletePolygonId] = useState(null)
  const [polygonFocusRequest, setPolygonFocusRequest] = useState(null)
  const [pendingImportPavimentoId, setPendingImportPavimentoId] = useState(null)
  const [importedPlanPavimentoId, setImportedPlanPavimentoId] = useState(null)
  const dragStateRef = useRef({ dragging: false })
  const importedImageUrlRef = useRef(null)
  const fileInputRef = useRef(null)

  const menuItems = useMemo(() => ['Arquivo', 'Preferências', 'Sistema'], [])

  const [taskbarExpanded, setTaskbarExpanded] = useState(false)
  const [toggleEstado, setToggleEstado] = useState(false)

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

  const handleImportImage = (file, targetPavimentoId = null) => {
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
    setEditingEnvironmentId(null)
    setPolygonColorById({})
    setEnvironments([])
    setPlacedEquipments([])
    setDefaultCeilingHeight('3')
    setSelectedEnvironmentId(null)
    setSelectedEquipmentId(null)
    setSelectedBoardId(null)
    setRenamingEnvironmentId(null)
    setRenamingSource(null)
    setRenamingEquipmentId(null)
    setRenamingEquipmentSource(null)
    setRenamingBoardId(null)
    setRenamingBoardSource(null)
    setShowEquipmentLibrary(false)
    setMultiAddPlacementRequest(null)
    setAutomationBoards([])
    setPendingBoardPlacement(null)

    const fallbackPavimentoId = findFirstPavimentoId(initialProject)
    setImportedPlanPavimentoId(targetPavimentoId ?? fallbackPavimentoId)
    setPendingImportPavimentoId(null)
  }

  const toggleProjectPanel = () => {
    setIsProjectPanelOpen((current) => !current)
  }

  const handleZoomChange = (nextZoom) => {
    setZoom(clampZoom(nextZoom))
  }

  const handleBackgroundOpacityChange = (nextOpacity) => {
    setBackgroundOpacity(clampOpacity(nextOpacity))
  }

  const handleRotateImage = () => {
    setImageRotation((currentRotation) => (currentRotation + 90) % 360)
  }

  const handleToggleEquipmentFilter = (filterKey) => {
    setEquipmentFilters((currentFilters) => ({
      ...currentFilters,
      [filterKey]: !currentFilters[filterKey],
    }))
  }

  const handleStartScaleSetup = () => {
    setShowScaleOverlay(false)
    setActiveTool('polygon')
    setIsAwaitingScaleLine(true)
  }

  const handleOpenScaleProperties = () => {
    if (!importedImage) {
      return
    }

    setShowScaleOverlay(true)
    setShowScaleValueOverlay(false)
    setIsAwaitingScaleLine(false)
    setPendingScaleSegment(null)
    setActiveTool('select')
    setClearScaleReferenceToken((currentToken) => currentToken + 1)
  }

  const handlePolygonSegmentCreated = (segment) => {
    if (!isAwaitingScaleLine || !segment?.lengthPixels) {
      return
    }

    setPendingScaleSegment(segment)
    setShowScaleValueOverlay(true)
    setIsAwaitingScaleLine(false)
  }

  const handleConcludeScale = ({ metersValue, ceilingHeight }) => {
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
    if (ceilingHeight) {
      setDefaultCeilingHeight(ceilingHeight)
    }
    setActiveTool('select')
    setClearScaleReferenceToken((currentToken) => currentToken + 1)
  }

  const handleCancelScaleValueOverlay = () => {
    setShowScaleValueOverlay(false)
    setPendingScaleSegment(null)
    setActiveTool('select')
    setClearScaleReferenceToken((currentToken) => currentToken + 1)
  }

  const handlePolygonCreated = (polygon) => {
    setPendingEnvironmentPolygon(polygon)
    setEditingEnvironmentId(null)
    setShowEnvironmentOverlay(true)
    setActiveTool('select')
  }

  const handlePolygonDeleted = (polygonId) => {
    const env = environments.find((e) => e.polygonId === polygonId)
    const isDeletedEditingEnvironment = env?.id === editingEnvironmentId
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
    setAutomationBoards((curr) => curr.filter((b) => b.polygonId !== polygonId))
    setEditingEnvironmentId((currentEditingId) => (env?.id === currentEditingId ? null : currentEditingId))
    setShowEnvironmentOverlay((currentVisible) => (isDeletedEditingEnvironment ? false : currentVisible))
    setSelectedEnvironmentId((currentSelectedId) => (env?.id === currentSelectedId ? null : currentSelectedId))
    setSelectedEquipmentId((currentSelectedId) =>
      removedEquipmentIds.includes(currentSelectedId) ? null : currentSelectedId,
    )
  }

  const handleCreateBoard = ({ polygonId, point, equipment, slotCount }) => {
    const environment = environments.find((e) => e.polygonId === polygonId)
    if (!environment) return
    const boardId = `board-${Date.now()}-${Math.round(Math.random() * 1000)}`
    const newBoard = {
      id: boardId,
      catalogItemId: equipment.catalogItemId ?? equipment.id,
      polygonId,
      point,
      label: equipment.label,
      iconSrc: equipment.iconSrc,
      iconKey: equipment.iconKey ?? 'quadros',
      filterKeys: equipment.filterKeys ?? [],
      environmentId: environment.id,
      slotCount,
      pinned: false,
      slots: Array(slotCount).fill(null),
    }
    setAutomationBoards((curr) => [...curr, newBoard])
    setProjectTree((curr) =>
      appendEquipmentToEnvironment(curr, environment.id, {
        id: boardId,
        label: equipment.label,
        icon: equipment.iconKey ?? 'quadros',
        iconSrc: equipment.iconSrc,
        source: 'automation-board',
        children: [],
        expanded: true,
      }),
    )
  }

  const handleBoardPinToggle = (boardId) => {
    setAutomationBoards((curr) =>
      curr.map((b) => (b.id === boardId ? { ...b, pinned: !b.pinned } : b)),
    )
  }

  const handleBoardSlotInstall = ({ boardId, slotIndex, device }) => {
    setAutomationBoards((curr) =>
      curr.map((b) => {
        if (b.id !== boardId) return b
        const slots = [...b.slots]
        slots[slotIndex] = device
        return { ...b, slots }
      }),
    )
    setProjectTree((curr) =>
      appendEquipmentToEnvironment(curr, boardId, {
        id: device.id,
        label: device.label,
        icon: device.iconKey ?? 'drivers',
        iconSrc: device.iconSrc,
        source: 'board-device',
      }),
    )
  }

  const handleBoardSlotRemove = ({ boardId, slotIndex }) => {
    const board = automationBoards.find((b) => b.id === boardId)
    const deviceId = board?.slots[slotIndex]?.id ?? null
    setAutomationBoards((curr) =>
      curr.map((b) => {
        if (b.id !== boardId) return b
        const slots = [...b.slots]
        slots[slotIndex] = null
        return { ...b, slots }
      }),
    )
    if (deviceId) {
      setProjectTree((curr) => removeNodeById(curr, deviceId))
    }
  }

  const handleDeleteBoard = (boardId) => {
    setAutomationBoards((curr) => curr.filter((b) => b.id !== boardId))
    setProjectTree((curr) => removeNodeById(curr, boardId))
  }

  const handleBoardMoved = ({ boardId, point, polygonId }) => {
    const nextEnvironment = environments.find((e) => e.polygonId === polygonId)
    if (!nextEnvironment) return
    const board = automationBoards.find((b) => b.id === boardId)
    if (!board) return
    const prevEnvironmentId = board.environmentId
    setAutomationBoards((curr) =>
      curr.map((b) => (b.id === boardId ? { ...b, point, polygonId, environmentId: nextEnvironment.id } : b)),
    )
    if (prevEnvironmentId !== nextEnvironment.id) {
      setProjectTree((curr) => {
        const boardNode = findNodeById(curr, boardId)
        if (!boardNode) return curr
        return appendEquipmentToEnvironment(removeNodeById(curr, boardId), nextEnvironment.id, boardNode)
      })
    }
  }

  const handleBoardRenameRequest = (boardId) => {
    setRenamingBoardId(boardId)
    setRenamingBoardSource('canvas')
  }

  const handleBoardLabelDoubleClick = (boardId) => {
    setRenamingBoardId(boardId)
    setRenamingBoardSource('canvas')
  }

  const handleCommitBoardLabelRename = (boardId, newName) => {
    const trimmed = (newName ?? '').trim()
    if (trimmed) {
      setAutomationBoards((curr) => curr.map((b) => (b.id === boardId ? { ...b, label: trimmed } : b)))
      setProjectTree((curr) => updateNodeLabel(curr, boardId, trimmed))
    }
    setRenamingBoardId(null)
    setRenamingBoardSource(null)
  }

  const handleCreateAvOrganizer = ({ polygonId, point, equipment }) => {
    const environment = environments.find((e) => e.polygonId === polygonId)
    if (!environment) return
    const id = `av-org-${Date.now()}-${Math.round(Math.random() * 1000)}`
    setAvOrganizers((curr) => [...curr, {
      id,
      catalogItemId: equipment.catalogItemId ?? equipment.id,
      polygonId,
      point,
      label: equipment.label,
      iconSrc: equipment.iconSrc,
      iconKey: equipment.iconKey ?? 'quadros',
      filterKeys: equipment.filterKeys ?? [],
      environmentId: environment.id,
      slotCount: 9,
      pinned: false,
      slots: Array(9).fill(null),
    }])
    setProjectTree((curr) =>
      appendEquipmentToEnvironment(curr, environment.id, {
        id,
        label: equipment.label,
        icon: equipment.iconKey ?? 'quadros',
        iconSrc: equipment.iconSrc,
        source: 'av-organizer',
        children: [],
        expanded: true,
      }),
    )
  }

  const handleDeleteAvOrganizer = (id) => {
    setAvOrganizers((curr) => curr.filter((o) => o.id !== id))
    setProjectTree((curr) => removeNodeById(curr, id))
  }

  const handleAvOrganizerPinToggle = (id) => {
    setAvOrganizers((curr) => curr.map((o) => (o.id === id ? { ...o, pinned: !o.pinned } : o)))
  }

  const handleAvOrganizerSlotInstall = ({ organizerId, slotIndex, device }) => {
    setAvOrganizers((curr) =>
      curr.map((o) => {
        if (o.id !== organizerId) return o
        const slots = [...o.slots]
        slots[slotIndex] = device
        return { ...o, slots }
      }),
    )
    setProjectTree((curr) =>
      appendEquipmentToEnvironment(curr, organizerId, {
        id: device.id,
        label: device.label,
        icon: device.iconKey ?? 'drivers',
        iconSrc: device.iconSrc,
        source: 'av-device',
      }),
    )
  }

  const handleAvOrganizerSlotRemove = ({ organizerId, slotIndex }) => {
    const organizer = avOrganizers.find((o) => o.id === organizerId)
    const deviceId = organizer?.slots[slotIndex]?.id ?? null
    setAvOrganizers((curr) =>
      curr.map((o) => {
        if (o.id !== organizerId) return o
        const slots = [...o.slots]
        slots[slotIndex] = null
        return { ...o, slots }
      }),
    )
    if (deviceId) setProjectTree((curr) => removeNodeById(curr, deviceId))
  }

  const handleAvOrganizerMoved = ({ organizerId, point, polygonId }) => {
    const nextEnvironment = environments.find((e) => e.polygonId === polygonId)
    if (!nextEnvironment) return
    const organizer = avOrganizers.find((o) => o.id === organizerId)
    if (!organizer) return
    const prevEnvironmentId = organizer.environmentId
    setAvOrganizers((curr) =>
      curr.map((o) => (o.id === organizerId ? { ...o, point, polygonId, environmentId: nextEnvironment.id } : o)),
    )
    if (prevEnvironmentId !== nextEnvironment.id) {
      setProjectTree((curr) => {
        const orgNode = findNodeById(curr, organizerId)
        if (!orgNode) return curr
        return appendEquipmentToEnvironment(removeNodeById(curr, organizerId), nextEnvironment.id, orgNode)
      })
    }
  }

  const handleAvOrganizerRenameRequest = (id) => {
    setRenamingAvOrganizerId(id)
    setRenamingAvOrganizerSource('canvas')
  }

  const handleAvOrganizerLabelDoubleClick = (id) => {
    setRenamingAvOrganizerId(id)
    setRenamingAvOrganizerSource('canvas')
  }

  const handleCommitAvOrganizerLabelRename = (id, newName) => {
    const trimmed = (newName ?? '').trim()
    if (trimmed) {
      setAvOrganizers((curr) => curr.map((o) => (o.id === id ? { ...o, label: trimmed } : o)))
      setProjectTree((curr) => updateNodeLabel(curr, id, trimmed))
    }
    setRenamingAvOrganizerId(null)
    setRenamingAvOrganizerSource(null)
  }

  const handleSelectAvOrganizer = (id) => {
    setSelectedAvOrganizerId(id)
    setSelectedEquipmentId(null)
    setSelectedBoardId(null)
  }

  const handleEquipmentDropped = ({ polygonId, point, equipment }) => {
    const catalogItemId = equipment.catalogItemId ?? equipment.id

    if (isBoardOnlyItem(catalogItemId)) {
      return
    }

    if (isAvOrganizerOnlyItem(catalogItemId)) {
      return
    }

    if (AV_ORGANIZER_CATALOG_IDS.has(catalogItemId)) {
      handleCreateAvOrganizer({ polygonId, point, equipment })
      return
    }

    if (BOARD_CATALOG_IDS.has(catalogItemId)) {
      const slotCount = getBoardSlotCount(catalogItemId)
      if (slotCount === null) {
        const env = environments.find((e) => e.polygonId === polygonId)
        if (env) setPendingBoardPlacement({ polygonId, point, equipment })
        return
      }
      handleCreateBoard({ polygonId, point, equipment, slotCount })
      return
    }

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
      catalogItemId: equipment.catalogItemId ?? equipment.id,
      filterKeys: equipment.filterKeys ?? [],
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

  const handleStartMultiAddPlacement = ({ quantity, equipment }) => {
    const parsedQuantity = Number.parseInt(quantity, 10)

    if (!equipment?.label || !equipment?.iconSrc || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return
    }

    setActiveTool('select')
    setMultiAddPlacementRequest({
      token: Date.now(),
      quantity: parsedQuantity,
      equipment,
    })
  }

  const handleMultiAddPlacementCommit = ({ polygonId, points, equipment }) => {
    const environment = environments.find((currentEnvironment) => currentEnvironment.polygonId === polygonId)

    if (!environment || !Array.isArray(points) || points.length === 0 || !equipment?.label || !equipment?.iconSrc) {
      setMultiAddPlacementRequest(null)
      return
    }

    const equipmentsToInsert = points.map((point, index) => ({
      id: `equip-${Date.now()}-${index}-${Math.round(Math.random() * 1000)}`,
      polygonId,
      point,
      label: equipment.label,
      iconSrc: equipment.iconSrc,
      iconKey: equipment.iconKey,
      catalogItemId: equipment.catalogItemId ?? equipment.id,
      filterKeys: equipment.filterKeys ?? [],
      environmentId: environment.id,
    }))

    setPlacedEquipments((currentEquipments) => [...currentEquipments, ...equipmentsToInsert])

    setProjectTree((currentTree) =>
      equipmentsToInsert.reduce(
        (tree, currentEquipment) =>
          appendEquipmentToEnvironment(tree, environment.id, {
            id: currentEquipment.id,
            label: currentEquipment.label,
            icon: currentEquipment.iconKey ?? 'drivers',
            iconSrc: currentEquipment.iconSrc,
            source: 'equipment-item',
          }),
        currentTree,
      ),
    )

    setMultiAddPlacementRequest(null)
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

  const handlePolygonTranslated = ({ polygonId, equipmentPoints, boardPoints, avOrganizerPoints }) => {
    if (!polygonId) return

    if (equipmentPoints?.length) {
      const translatedPointByEquipmentId = Object.fromEntries(
        equipmentPoints.map(({ equipmentId, point }) => [equipmentId, point]),
      )
      setPlacedEquipments((currentEquipments) =>
        currentEquipments.map((equipment) => {
          const nextPoint = translatedPointByEquipmentId[equipment.id]
          if (!nextPoint || equipment.polygonId !== polygonId) return equipment
          return { ...equipment, point: nextPoint }
        }),
      )
    }

    if (boardPoints?.length) {
      const translatedPointByBoardId = Object.fromEntries(
        boardPoints.map(({ boardId, point }) => [boardId, point]),
      )
      setAutomationBoards((current) =>
        current.map((board) => {
          const nextPoint = translatedPointByBoardId[board.id]
          if (!nextPoint || board.polygonId !== polygonId) return board
          return { ...board, point: nextPoint }
        }),
      )
    }

    if (avOrganizerPoints?.length) {
      const translatedPointByOrganizerId = Object.fromEntries(
        avOrganizerPoints.map(({ avOrganizerId, point }) => [avOrganizerId, point]),
      )
      setAvOrganizers((current) =>
        current.map((org) => {
          const nextPoint = translatedPointByOrganizerId[org.id]
          if (!nextPoint || org.polygonId !== polygonId) return org
          return { ...org, point: nextPoint }
        }),
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
    setEquipmentPropertiesId((currentEquipmentId) =>
      currentEquipmentId === equipmentId ? null : currentEquipmentId,
    )
  }

  const handleOpenEquipmentProperties = (equipmentId) => {
    const equipment = placedEquipments.find((currentEquipment) => currentEquipment.id === equipmentId)
    if (!equipment) {
      return
    }

    setSelectedEquipmentId(equipmentId)
    if (equipment.environmentId) {
      setSelectedEnvironmentId(equipment.environmentId)
    }
    setEquipmentPropertiesId(equipmentId)
  }

  const handleDeleteNodeFromTree = (node) => {
    if (node?.source === 'equipment-item') {
      handleDeleteEquipment(node.id)
      return
    }

    if (node?.source === 'automation-board') {
      handleDeleteBoard(node.id)
      return
    }

    if (node?.source === 'board-device') {
      const board = automationBoards.find((b) => b.slots.some((s) => s?.id === node.id))
      if (board) {
        const slotIndex = board.slots.findIndex((s) => s?.id === node.id)
        handleBoardSlotRemove({ boardId: board.id, slotIndex })
      }
      return
    }

    if (node?.source === 'av-organizer') {
      handleDeleteAvOrganizer(node.id)
      return
    }

    if (node?.source === 'av-device') {
      const organizer = avOrganizers.find((o) => o.slots.some((s) => s?.id === node.id))
      if (organizer) {
        const slotIndex = organizer.slots.findIndex((s) => s?.id === node.id)
        handleAvOrganizerSlotRemove({ organizerId: organizer.id, slotIndex })
      }
      return
    }

    if (node?.source !== 'created-environment') {
      return
    }

    const environment = environments.find((currentEnvironment) => currentEnvironment.id === node.id)

    if (!environment?.polygonId) {
      return
    }

    setPendingDeletePolygonId(environment.polygonId)
  }

  const handleConfirmDeletePolygon = () => {
    if (!pendingDeletePolygonId) return
    setPolygonDeleteRequestId(pendingDeletePolygonId)
    handlePolygonDeleted(pendingDeletePolygonId)
    setPendingDeletePolygonId(null)
  }

  const handleCancelDeletePolygon = () => {
    setPendingDeletePolygonId(null)
  }

  const handleEditEnvironmentRequest = (environmentId) => {
    const environment = environments.find((currentEnvironment) => currentEnvironment.id === environmentId)

    if (!environment) {
      return
    }

    handleSelectEnvironment(environment.id)
    setPendingEnvironmentPolygon(null)
    setEditingEnvironmentId(environment.id)
    setShowEnvironmentOverlay(true)
  }

  const handleEditNodeRequest = (node) => {
    if (node?.source !== 'created-environment') {
      return
    }

    handleEditEnvironmentRequest(node.id)
  }

  const handleFocusNodeFromTree = (node) => {
    if (node?.source !== 'created-environment' && node?.icon !== 'ambientes') {
      return
    }

    const environment = environments.find((currentEnvironment) => currentEnvironment.id === node.id)

    if (!environment?.polygonId) {
      return
    }

    handleSelectEnvironment(environment.id)
    setPolygonFocusRequest({
      polygonId: environment.polygonId,
      token: Date.now(),
    })
  }

  const handleSelectEnvironment = (environmentId) => {
    setSelectedEnvironmentId(environmentId)
    setSelectedEquipmentId(null)
    setSelectedBoardId(null)
  }

  const handleSelectEquipment = (equipmentId) => {
    setSelectedEquipmentId(equipmentId)
    setSelectedBoardId(null)
    const equipment = placedEquipments.find((currentEquipment) => currentEquipment.id === equipmentId)
    if (equipment?.environmentId) {
      setSelectedEnvironmentId(equipment.environmentId)
    }
  }

  const handleSelectBoard = (boardId) => {
    setSelectedBoardId(boardId)
    setSelectedEquipmentId(null)
    const board = automationBoards.find((b) => b.id === boardId)
    if (board?.environmentId) {
      setSelectedEnvironmentId(board.environmentId)
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
    setRenamingBoardId(null)
    setRenamingBoardSource(null)
    setRenamingGenericNodeId(null)
  }

  const handleSelectTreeNode = (node) => {
    if (node?.source === 'created-environment') {
      handleSelectEnvironment(node.id)
      return
    }

    if (node?.source === 'equipment-item') {
      handleSelectEquipment(node.id)
      return
    }

    if (node?.source === 'automation-board') {
      handleSelectBoard(node.id)
      return
    }

    if (node?.source === 'av-organizer') {
      handleSelectAvOrganizer(node.id)
    }
  }

  const handleRenameRequestFromTree = (node) => {
    if (node?.source === 'created-environment') {
      handleStartRename(node.id, 'tree')
      return
    }

    if (node?.source === 'equipment-item') {
      handleStartEquipmentRename(node.id, 'tree')
      return
    }

    if (
      node?.source === 'automation-board'
      || node?.source === 'av-organizer'
      || node?.source === 'project'
      || node?.source === 'pavimento'
    ) {
      setRenamingGenericNodeId(node.id)
    }
  }

  const handleRenameCommitFromTree = (nodeId, newName) => {
    if (environments.some((environment) => environment.id === nodeId)) {
      handleCommitRename(nodeId, newName)
      return
    }

    if (placedEquipments.some((equipment) => equipment.id === nodeId)) {
      handleCommitEquipmentRename(nodeId, newName)
      return
    }

    if (automationBoards.some((b) => b.id === nodeId)) {
      const trimmed = (newName ?? '').trim()
      if (trimmed) {
        setAutomationBoards((curr) => curr.map((b) => (b.id === nodeId ? { ...b, label: trimmed } : b)))
        setProjectTree((curr) => updateNodeLabel(curr, nodeId, trimmed))
      }
      setRenamingGenericNodeId(null)
      return
    }

    if (avOrganizers.some((o) => o.id === nodeId)) {
      const trimmed = (newName ?? '').trim()
      if (trimmed) {
        setAvOrganizers((curr) => curr.map((o) => (o.id === nodeId ? { ...o, label: trimmed } : o)))
        setProjectTree((curr) => updateNodeLabel(curr, nodeId, trimmed))
      }
      setRenamingGenericNodeId(null)
      return
    }

    const trimmed = (newName ?? '').trim()
    if (trimmed) {
      setProjectTree((curr) => updateNodeLabel(curr, nodeId, trimmed))
    }
    setRenamingGenericNodeId(null)
  }

  const handleConcludeEnvironment = ({ name, environmentClass, ceilingHeight, associateEnvId, associateEnvName }) => {
    if (editingEnvironmentId) {
      const color = ENVIRONMENT_CLASS_COLOR_MAP[environmentClass] ?? ENVIRONMENT_CLASS_COLOR_MAP['Não definida']

      setEnvironments((currentEnvironments) =>
        currentEnvironments.map((environment) =>
          environment.id === editingEnvironmentId
            ? {
                ...environment,
                name,
                environmentClass,
                ceilingHeight,
                color,
              }
            : environment,
        ),
      )

      const editedEnvironment = environments.find((environment) => environment.id === editingEnvironmentId)
      if (editedEnvironment?.polygonId) {
        setPolygonColorById((currentColors) => ({
          ...currentColors,
          [editedEnvironment.polygonId]: color,
        }))
      }

      setDefaultCeilingHeight(ceilingHeight)
      setProjectTree((currentTree) => updateNodeLabel(currentTree, editingEnvironmentId, name))
      setEditingEnvironmentId(null)
      setShowEnvironmentOverlay(false)
      return
    }

    if (!pendingEnvironmentPolygon?.id) {
      return
    }

    // Associate an existing (unassociated) environment to the new polygon
    if (associateEnvId) {
      const color = ENVIRONMENT_CLASS_COLOR_MAP[environmentClass] ?? ENVIRONMENT_CLASS_COLOR_MAP['Não definida']

      setEnvironments((currentEnvironments) => [
        ...currentEnvironments,
        {
          id: associateEnvId,
          polygonId: pendingEnvironmentPolygon.id,
          name: associateEnvName,
          environmentClass,
          ceilingHeight,
          color,
        },
      ])
      setDefaultCeilingHeight(ceilingHeight)
      setPolygonColorById((currentColors) => ({
        ...currentColors,
        [pendingEnvironmentPolygon.id]: color,
      }))
      setProjectTree((curr) => updateNodeSource(curr, associateEnvId, 'created-environment'))
      setPendingEnvironmentPolygon(null)
      setEditingEnvironmentId(null)
      setShowEnvironmentOverlay(false)
      return
    }

    const color = ENVIRONMENT_CLASS_COLOR_MAP[environmentClass] ?? ENVIRONMENT_CLASS_COLOR_MAP['Não definida']

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
      appendEnvironmentToFirstPavimento(currentTree, {
        id: nextEnvironment.id,
        label: name,
        icon: 'ambientes',
        source: 'created-environment',
      }),
    )
    setPendingEnvironmentPolygon(null)
    setEditingEnvironmentId(null)
    setShowEnvironmentOverlay(false)
  }

  const handleAddPavimento = () => {
    setProjectTree((curr) => appendPavimentoToProject(curr))
  }

  const handleAddEnvironmentFromMenu = () => {
    setActiveTool('polygon')
  }

  const handleImportFileRequest = (node) => {
    setPendingImportPavimentoId(node?.source === 'pavimento' ? node.id : null)
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== 'image/png') {
      event.target.value = ''
      return
    }
    handleImportImage(file, pendingImportPavimentoId)
    event.target.value = ''
  }

  const scaleStatusLabel = scaleDefinition
    ? `Escala definida: ${scaleDefinition.meters.toFixed(2)} m em ${scaleDefinition.pixels.toFixed(1)} px`
    : 'Escala nao definida'

  const nextEnvironmentName = `Ambiente ${environments.length + 1}`
  const editingEnvironment = environments.find((environment) => environment.id === editingEnvironmentId) ?? null

  const unassociatedEnvironments = useMemo(() => {
    const envIds = new Set(environments.map((e) => e.id))
    return collectEnvTreeNodes(projectTree).filter((node) => !envIds.has(node.id))
  }, [environments, projectTree])
  const polygonLabelById = environments.reduce((accumulator, environment) => {
    accumulator[environment.polygonId] = environment.name
    return accumulator
  }, {})

  const polygonCeilingHeightById = environments.reduce((accumulator, environment) => {
    if (environment.ceilingHeight != null) {
      accumulator[environment.polygonId] = environment.ceilingHeight
    }
    return accumulator
  }, {})

  const renamingEnvironment = environments.find((e) => e.id === renamingEnvironmentId)
  const renamingPolygonId = renamingSource === 'canvas'
    ? (renamingEnvironment?.polygonId ?? null)
    : null
  const renamingEquipmentNodeId = renamingEquipmentSource === 'tree' ? renamingEquipmentId : null
  const renamingNodeId = renamingGenericNodeId ?? (renamingSource === 'tree' ? renamingEnvironmentId : renamingEquipmentNodeId)
  const renamingEquipmentCanvasId = renamingEquipmentSource === 'canvas' ? renamingEquipmentId : null
  const renamingBoardCanvasId = renamingBoardSource === 'canvas' ? renamingBoardId : null
  const renamingAvOrganizerCanvasId = renamingAvOrganizerSource === 'canvas' ? renamingAvOrganizerId : null
  const selectedEnvironment = environments.find((environment) => environment.id === selectedEnvironmentId)
  const selectedPolygonId = selectedEnvironment?.polygonId ?? null
  const selectedNodeId = selectedBoardId ?? selectedEquipmentId ?? selectedEnvironmentId
  const equipmentPropertiesEquipment = placedEquipments.find((equipment) => equipment.id === equipmentPropertiesId) ?? null
  const equipmentPropertiesEnvironment = environments.find(
    (environment) => environment.id === equipmentPropertiesEquipment?.environmentId,
  )

  useEffect(() => {
    if (!selectedEquipmentId) {
      return
    }

    const selectedEquipment = placedEquipments.find((equipment) => equipment.id === selectedEquipmentId)

    if (!selectedEquipment || isEquipmentVisibleByFilters(selectedEquipment, equipmentFilters)) {
      return
    }

    setSelectedEquipmentId(null)
    setRenamingEquipmentId(null)
    setRenamingEquipmentSource(null)
  }, [equipmentFilters, placedEquipments, selectedEquipmentId])

  useEffect(() => {
    if (equipmentFilters.text || !renamingEquipmentId) {
      return
    }

    setRenamingEquipmentId(null)
    setRenamingEquipmentSource(null)
  }, [equipmentFilters.text, renamingEquipmentId])

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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        className="cad-toolbar-file-input"
        onChange={handleFileChange}
      />
      <AppMenu
        title="Scenario Config Embrace"
        items={menuItems}
        userLabel="Login desigscenario1@gmail.com:design01@scenario.ind.br"
      />

      <CadTaskbar
        activeItem={showEquipmentLibrary ? 'equipamentos' : 'cad'}
        expanded={taskbarExpanded}
        onToggleExpanded={() => setTaskbarExpanded((prev) => !prev)}
        onItemClick={(id) => {
          if (id === 'equipamentos') {
            setShowEquipmentLibrary((current) => !current)
          }
        }}
        toggleEstado={toggleEstado}
        onToggleEstado={() => setToggleEstado((prev) => !prev)}
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
              importedPlanPavimentoId={importedImage ? importedPlanPavimentoId : null}
              selectedNodeId={selectedNodeId}
              renamingNodeId={renamingNodeId}
              onSelectNode={handleSelectTreeNode}
              onRenameRequest={handleRenameRequestFromTree}
              onRenameCommit={handleRenameCommitFromTree}
              onRenameCancel={handleCancelRename}
              onDeleteNode={handleDeleteNodeFromTree}
              onEditNode={handleEditNodeRequest}
              onFocusNode={handleFocusNodeFromTree}
              onAddPavimento={handleAddPavimento}
              onAddEnvironment={handleAddEnvironmentFromMenu}
              onImportFileRequest={handleImportFileRequest}
              onDefineScale={handleOpenScaleProperties}
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
              opacity={backgroundOpacity}
              onOpacityChange={handleBackgroundOpacityChange}
              onToggleEquipmentLibrary={() => setShowEquipmentLibrary((current) => !current)}
              onRotateImage={handleRotateImage}
              equipmentFilters={equipmentFilters}
              onToggleEquipmentFilter={handleToggleEquipmentFilter}
            />
            <div className="cad-canvas-area">
              <CadCanvas
                activeTool={activeTool}
                zoom={zoom}
                imageRotation={imageRotation}
                backgroundImage={importedImage}
                backgroundOpacity={backgroundOpacity}
                onZoomChange={handleZoomChange}
                hasScaleDefinition={Boolean(scaleDefinition)}
                scaleDefinition={scaleDefinition}
                onPolygonSegmentCreated={handlePolygonSegmentCreated}
                onPolygonCreated={handlePolygonCreated}
                onPolygonDeleted={handlePolygonDeleted}
                deletePolygonId={polygonDeleteRequestId}
                focusPolygonRequest={polygonFocusRequest}
                polygonColorById={polygonColorById}
                polygonLabelById={polygonLabelById}
                polygonCeilingHeightById={polygonCeilingHeightById}
                placedEquipments={placedEquipments}
                equipmentFilters={equipmentFilters}
                isAwaitingScaleLine={isAwaitingScaleLine}
                clearScaleReferenceToken={clearScaleReferenceToken}
                onEquipmentDrop={handleEquipmentDropped}
                onEquipmentMove={handleEquipmentMoved}
                multiAddPlacementRequest={multiAddPlacementRequest}
                onMultiAddPlacementCommit={handleMultiAddPlacementCommit}
                onMultiAddPlacementCancel={() => setMultiAddPlacementRequest(null)}
                onPolygonTranslated={handlePolygonTranslated}
                automationBoards={automationBoards}
                selectedBoardId={selectedBoardId}
                renamingBoardId={renamingBoardCanvasId}
                onBoardSelect={handleSelectBoard}
                onBoardPinToggle={handleBoardPinToggle}
                onBoardSlotInstall={handleBoardSlotInstall}
                onBoardSlotRemove={handleBoardSlotRemove}
                onBoardMove={handleBoardMoved}
                onBoardRename={handleBoardRenameRequest}
                onBoardDelete={handleDeleteBoard}
                onBoardLabelDoubleClick={handleBoardLabelDoubleClick}
                onBoardLabelRenameCommit={handleCommitBoardLabelRename}
                avOrganizers={avOrganizers}
                selectedAvOrganizerId={selectedAvOrganizerId}
                renamingAvOrganizerId={renamingAvOrganizerCanvasId}
                onAvOrganizerSelect={handleSelectAvOrganizer}
                onAvOrganizerPinToggle={handleAvOrganizerPinToggle}
                onAvOrganizerSlotInstall={handleAvOrganizerSlotInstall}
                onAvOrganizerSlotRemove={handleAvOrganizerSlotRemove}
                onAvOrganizerMove={handleAvOrganizerMoved}
                onAvOrganizerRename={handleAvOrganizerRenameRequest}
                onAvOrganizerDelete={handleDeleteAvOrganizer}
                onAvOrganizerLabelDoubleClick={handleAvOrganizerLabelDoubleClick}
                onAvOrganizerLabelRenameCommit={handleCommitAvOrganizerLabelRename}
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
                onPolygonContextMenu={(polygonId) => {
                  const environment = environments.find((currentEnvironment) => currentEnvironment.polygonId === polygonId)
                  if (environment) {
                    handleSelectEnvironment(environment.id)
                  }
                }}
                onPolygonEditRequest={(polygonId) => {
                  const environment = environments.find((currentEnvironment) => currentEnvironment.polygonId === polygonId)
                  if (environment) {
                    handleEditEnvironmentRequest(environment.id)
                  }
                }}
                onPolygonRenameRequest={(polygonId) => {
                  const environment = environments.find((currentEnvironment) => currentEnvironment.polygonId === polygonId)
                  if (environment) {
                    handleStartRename(environment.id, 'canvas')
                  }
                }}
                onPolygonDeleteRequest={(polygonId) => {
                  setPendingDeletePolygonId(polygonId)
                }}
                onCanvasBackgroundClick={() => {
                  setSelectedEnvironmentId(null)
                  setSelectedEquipmentId(null)
                  setSelectedBoardId(null)
                  setSelectedAvOrganizerId(null)
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
                onEquipmentRenameRequest={(equipmentId) => handleStartEquipmentRename(equipmentId, 'canvas')}
                onEquipmentPropertiesRequest={handleOpenEquipmentProperties}
                onEquipmentLabelRenameCommit={handleCommitEquipmentRename}
                onCancelRename={handleCancelRename}
              />
              {showScaleOverlay ? <ScaleSetupOverlay onStart={handleStartScaleSetup} /> : null}
              {showScaleValueOverlay ? (
                <ScaleValueOverlay
                  defaultMetersValue={scaleDefinition?.meters}
                  defaultCeilingHeight={defaultCeilingHeight}
                  onConclude={handleConcludeScale}
                  onCancel={handleCancelScaleValueOverlay}
                />
              ) : null}
              {showEnvironmentOverlay ? (
                <EnvironmentInfoOverlay
                  suggestedName={editingEnvironment?.name ?? nextEnvironmentName}
                  classOptions={environmentClassOptions}
                  defaultCeilingHeight={editingEnvironment?.ceilingHeight ?? defaultCeilingHeight}
                  initialClass={editingEnvironment?.environmentClass}
                  onConclude={handleConcludeEnvironment}
                  unassociatedEnvironments={editingEnvironmentId == null ? unassociatedEnvironments : []}
                />
              ) : null}
              {showEquipmentLibrary ? (
                <EquipmentLibraryOverlay
                  onClose={() => setShowEquipmentLibrary(false)}
                  onStartMultiAddPlacement={handleStartMultiAddPlacement}
                />
              ) : null}
              {pendingBoardPlacement ? (
                <AutomationBoardOverlay
                  onConfirm={({ slotCount }) => {
                    handleCreateBoard({ ...pendingBoardPlacement, slotCount })
                    setPendingBoardPlacement(null)
                  }}
                  onClose={() => setPendingBoardPlacement(null)}
                />
              ) : null}
              {pendingDeletePolygonId ? (
                <DeleteEnvironmentConfirmOverlay
                  onConfirm={handleConfirmDeletePolygon}
                  onCancel={handleCancelDeletePolygon}
                />
              ) : null}
              {equipmentPropertiesEquipment ? (
                <EquipmentPropertiesOverlay
                  equipment={equipmentPropertiesEquipment}
                  environmentName={equipmentPropertiesEnvironment?.name ?? 'Ambiente'}
                  onClose={() => setEquipmentPropertiesId(null)}
                />
              ) : null}
            </div>
          </section>
        </main>
      </div>

      <StatusBar
        version={__APP_VERSION__}
        connectionStatus="Local"
        installationName="Nome do projeto"
      />
    </div>
  )
}

export default App
