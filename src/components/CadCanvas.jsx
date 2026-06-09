import { Circle, Group, Layer, Line, Rect, Stage, Text, Image as KonvaImage } from 'react-konva'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import apagarProjeto from '../assets/apagar-projeto.svg'
import pinPadrao from '../assets/pin-padrão.svg'
import pinSelecionado from '../assets/pin-selecionado.svg'
import { EQUIPMENT_WIREFRAMES } from '../data/wireframes'
import { isBoardOnlyItem } from '../data/equipmentLibrary.js'

const POLYGON_COLOR = '#6BC2F7'
const RULER_COLOR = '#FC4242'
const SELECTED_POLYGON_COLOR = '#0095ff'
const POLYGON_POINT_RADIUS = 6
const POLYGON_POINT_STROKE = 4
const POLYGON_LINE_STROKE = 4
const CLOSE_POLYGON_HIT_DISTANCE = 10
const START_POINT_HIGHLIGHT_RADIUS = 10
const POLYGON_LABEL_MARGIN = 4
const POLYGON_LABEL_MAX_FONT_SIZE = 14
const POLYGON_LABEL_MIN_FONT_SIZE = 10
const POLYGON_LABEL_LINE_HEIGHT_RATIO = 1.2
const EQUIPMENT_HOLD_TO_DRAG_MS = 180
const MIN_ZOOM = 50
const MAX_ZOOM = 1000
const MULTI_ADD_PREVIEW_COLOR = '#0095ff'
const SENSOR_CATALOG_IDS = new Set(['amb-acessorios-1', 'sce-sensores-1', 'sce-sensores-2'])
const SENSOR_FILL_COLOR = '#F5D59D'
const SENSOR_OPENING_ANGLE_HALF_RAD = (50 * Math.PI) / 180

function hexToRgba(hexColor, alpha) {
  const sanitized = hexColor.replace('#', '')
  const value = sanitized.length === 3
    ? sanitized
        .split('')
        .map((char) => `${char}${char}`)
        .join('')
    : sanitized

  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function useElementSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current

    if (!element) {
      return undefined
    }

    const updateSize = () => {
      setSize({
        width: element.clientWidth,
        height: element.clientHeight,
      })
    }

    updateSize()

    const observer = new ResizeObserver(() => updateSize())
    observer.observe(element)

    return () => observer.disconnect()
  }, [ref])

  return size
}

function toStagePoint(stage) {
  const pointerPosition = stage?.getPointerPosition()

  if (!pointerPosition) {
    return null
  }

  return {
    x: pointerPosition.x,
    y: pointerPosition.y,
  }
}

function useLoadedImage(imageSrc) {
  const [image, setImage] = useState(null)

  useEffect(() => {
    if (!imageSrc?.src) {
      setImage(null)
      return undefined
    }

    const nextImage = new window.Image()
    nextImage.onload = () => setImage(nextImage)
    nextImage.src = imageSrc.src

    return () => {
      nextImage.onload = null
    }
  }, [imageSrc])

  return image
}

function isNearPoint(sourcePoint, targetPoint, distance) {
  return Math.hypot(sourcePoint.x - targetPoint.x, sourcePoint.y - targetPoint.y) <= distance
}

function flattenPoints(points) {
  return points.flatMap((point) => [point.x, point.y])
}

function isPointInsidePolygon(point, polygonPoints) {
  let inside = false

  for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i, i += 1) {
    const xi = polygonPoints[i].x
    const yi = polygonPoints[i].y
    const xj = polygonPoints[j].x
    const yj = polygonPoints[j].y

    const intersects = ((yi > point.y) !== (yj > point.y))
      && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 0.00001) + xi)

    if (intersects) inside = !inside
  }

  return inside
}

function rotatePoint(point, center, angleDeg) {
  if (!angleDeg) {
    return point
  }

  const radians = (angleDeg * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const dx = point.x - center.x
  const dy = point.y - center.y

  return {
    x: center.x + dx * cosine - dy * sine,
    y: center.y + dx * sine + dy * cosine,
  }
}

function rotateVector(vector, angleDeg) {
  if (!angleDeg) {
    return vector
  }

  const radians = (angleDeg * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)

  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine,
  }
}

// Convert a stage-space point to image-normalized coords [0..1].
// Falls back to identity when no fitted image is available.
function stageToNorm(stagePoint, fittedImage) {
  if (!fittedImage || !fittedImage.width || !fittedImage.height) return stagePoint

  const unrotatedPoint = rotatePoint(stagePoint, fittedImage.center, -fittedImage.rotation)

  return {
    x: (unrotatedPoint.x - fittedImage.x) / fittedImage.width,
    y: (unrotatedPoint.y - fittedImage.y) / fittedImage.height,
  }
}

// Convert an image-normalized point back to stage-space.
// Falls back to identity when no fitted image is available.
function normToStage(normPoint, fittedImage) {
  if (!fittedImage || !fittedImage.width || !fittedImage.height) return normPoint

  const unrotatedPoint = {
    x: normPoint.x * fittedImage.width + fittedImage.x,
    y: normPoint.y * fittedImage.height + fittedImage.y,
  }

  return rotatePoint(unrotatedPoint, fittedImage.center, fittedImage.rotation)
}

function normToImagePixels(normPoint, image) {
  if (!image) {
    return normPoint
  }

  const imageWidth = image.naturalWidth || image.width || 0
  const imageHeight = image.naturalHeight || image.height || 0

  if (!imageWidth || !imageHeight) {
    return normPoint
  }

  return {
    x: normPoint.x * imageWidth,
    y: normPoint.y * imageHeight,
  }
}

function getImagePixelDistance(startPoint, endPoint, image) {
  const startPixels = normToImagePixels(startPoint, image)
  const endPixels = normToImagePixels(endPoint, image)

  return Math.hypot(endPixels.x - startPixels.x, endPixels.y - startPixels.y)
}

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function isEquipmentIconVisible(equipment, equipmentFilters) {
  if (!equipmentFilters?.all) {
    return false
  }

  const filterKeys = equipment?.filterKeys ?? []

  if (filterKeys.length === 0) {
    return true
  }

  return filterKeys.some((filterKey) => equipmentFilters[filterKey])
}

function distributePointsBetween(startPoint, endPoint, quantity) {
  if (!startPoint || !endPoint || quantity <= 0) {
    return []
  }

  if (quantity === 1) {
    return [startPoint]
  }

  return Array.from({ length: quantity }, (_, index) => {
    const factor = index / (quantity - 1)
    return {
      x: startPoint.x + (endPoint.x - startPoint.x) * factor,
      y: startPoint.y + (endPoint.y - startPoint.y) * factor,
    }
  })
}

function getPolygonBounds(points) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  )
}

function getPolygonVisualCenter(points) {
  if (!points?.length) {
    return { x: 0, y: 0 }
  }

  let signedArea = 0
  let centerX = 0
  let centerY = 0

  for (let index = 0; index < points.length; index += 1) {
    const currentPoint = points[index]
    const nextPoint = points[(index + 1) % points.length]
    const factor = currentPoint.x * nextPoint.y - nextPoint.x * currentPoint.y
    signedArea += factor
    centerX += (currentPoint.x + nextPoint.x) * factor
    centerY += (currentPoint.y + nextPoint.y) * factor
  }

  if (Math.abs(signedArea) < 0.00001) {
    const fallback = points.reduce(
      (accumulator, point) => ({
        x: accumulator.x + point.x,
        y: accumulator.y + point.y,
      }),
      { x: 0, y: 0 },
    )
    return {
      x: fallback.x / points.length,
      y: fallback.y / points.length,
    }
  }

  const areaFactor = 1 / (3 * signedArea)
  return {
    x: centerX * areaFactor,
    y: centerY * areaFactor,
  }
}

function measureLabelText(text, fontSize) {
  if (typeof document === 'undefined') {
    return text.length * fontSize * 0.58
  }

  const canvas = measureLabelText.canvas || document.createElement('canvas')
  measureLabelText.canvas = canvas
  const context = canvas.getContext('2d')

  if (!context) {
    return text.length * fontSize * 0.58
  }

  context.font = `${fontSize}px "Segoe UI", sans-serif`
  return context.measureText(text).width
}

function breakLongToken(token, fontSize, maxWidth) {
  if (measureLabelText(token, fontSize) <= maxWidth) {
    return [token]
  }

  const pieces = []
  let current = ''

  token.split('').forEach((char) => {
    const next = `${current}${char}`
    if (current && measureLabelText(next, fontSize) > maxWidth) {
      pieces.push(current)
      current = char
      return
    }
    current = next
  })

  if (current) {
    pieces.push(current)
  }

  return pieces
}

function wrapLabelText(text, fontSize, maxWidth) {
  const safeText = `${text ?? ''}`.trim()
  const rawTokens = safeText.split(/\s+/).filter(Boolean)

  if (!rawTokens.length) {
    return ['']
  }

  const tokens = rawTokens.flatMap((token) => breakLongToken(token, fontSize, maxWidth))
  const lines = []
  let currentLine = ''

  tokens.forEach((token) => {
    const candidateLine = currentLine ? `${currentLine} ${token}` : token

    if (!currentLine || measureLabelText(candidateLine, fontSize) <= maxWidth) {
      currentLine = candidateLine
      return
    }

    lines.push(currentLine)
    currentLine = token
  })

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

function createLabelLayout(text, maxWidth, maxHeight) {
  const safeText = (text ?? '').trim()
  const constrainedWidth = Math.max(1, maxWidth)
  const constrainedHeight = Math.max(1, maxHeight)

  for (let fontSize = POLYGON_LABEL_MAX_FONT_SIZE; fontSize >= POLYGON_LABEL_MIN_FONT_SIZE; fontSize -= 1) {
    const lineHeight = Math.ceil(fontSize * POLYGON_LABEL_LINE_HEIGHT_RATIO)
    const singleLineWidth = Math.ceil(measureLabelText(safeText, fontSize))

    if (singleLineWidth <= constrainedWidth && lineHeight <= constrainedHeight) {
      return {
        fontSize,
        lineHeight,
        lines: [safeText],
        width: singleLineWidth,
        height: lineHeight,
      }
    }

    const wrappedLines = wrapLabelText(safeText, fontSize, constrainedWidth)
    const wrappedWidth = Math.ceil(
      wrappedLines.reduce((maxWidthValue, line) =>
        Math.max(maxWidthValue, measureLabelText(line, fontSize)), 0),
    )
    const wrappedHeight = wrappedLines.length * lineHeight

    if (wrappedWidth <= constrainedWidth && wrappedHeight <= constrainedHeight) {
      return {
        fontSize,
        lineHeight,
        lines: wrappedLines,
        width: wrappedWidth,
        height: wrappedHeight,
      }
    }
  }

  return null
}

function canPlaceLabelBox(stagePoints, x, y, width, height) {
  const samplePoints = [
    { x, y },
    { x: x + width, y },
    { x, y: y + height },
    { x: x + width, y: y + height },
    { x: x + width / 2, y: y + height / 2 },
  ]

  return samplePoints.every((point) => isPointInsidePolygon(point, stagePoints))
}

function findFirstInsidePoint(stagePoints, bounds, margin) {
  const scanStartX = Math.ceil(bounds.minX + margin)
  const scanEndX = Math.floor(bounds.maxX - margin)
  const scanStartY = Math.ceil(bounds.minY + margin)
  const scanEndY = Math.floor(bounds.maxY - margin)

  for (let y = scanStartY; y <= scanEndY; y += 1) {
    for (let x = scanStartX; x <= scanEndX; x += 1) {
      if (isPointInsidePolygon({ x, y }, stagePoints)) {
        return { x, y }
      }
    }
  }

  return null
}

function findFirstPlacementForLayout(stagePoints, bounds, layout, margin) {
  const scanStartX = Math.ceil(bounds.minX + margin)
  const scanEndX = Math.floor(bounds.maxX - margin - layout.width)
  const scanStartY = Math.ceil(bounds.minY + margin)
  const scanEndY = Math.floor(bounds.maxY - margin - layout.height)

  for (let y = scanStartY; y <= scanEndY; y += 1) {
    for (let x = scanStartX; x <= scanEndX; x += 1) {
      if (canPlaceLabelBox(stagePoints, x, y, layout.width, layout.height)) {
        return { x, y }
      }
    }
  }

  return null
}

function getPolygonLabelPlacement(stagePoints, labelText, margin = POLYGON_LABEL_MARGIN) {
  const safeLabel = `${labelText ?? ''}`.trim()

  if (!stagePoints?.length) {
    return {
      x: 0,
      y: 0,
      fontSize: POLYGON_LABEL_MAX_FONT_SIZE,
      lineHeight: Math.ceil(POLYGON_LABEL_MAX_FONT_SIZE * POLYGON_LABEL_LINE_HEIGHT_RATIO),
      lines: [safeLabel],
    }
  }

  const bounds = getPolygonBounds(stagePoints)
  const boxMaxWidth = Math.max(8, Math.floor(bounds.maxX - bounds.minX - margin * 2))
  const boxMaxHeight = Math.max(8, Math.floor(bounds.maxY - bounds.minY - margin * 2))

  const topLeftCandidate = {
    x: bounds.minX + margin,
    y: bounds.minY + margin,
  }

  const firstInsidePoint = isPointInsidePolygon(topLeftCandidate, stagePoints)
    ? topLeftCandidate
    : findFirstInsidePoint(stagePoints, bounds, margin)

  const anchoredX = firstInsidePoint?.x ?? topLeftCandidate.x
  const anchoredY = firstInsidePoint?.y ?? topLeftCandidate.y
  const anchoredMaxWidth = Math.max(8, Math.floor(bounds.maxX - margin - anchoredX))
  const anchoredMaxHeight = Math.max(8, Math.floor(bounds.maxY - margin - anchoredY))
  const anchoredLayout = createLabelLayout(safeLabel, anchoredMaxWidth, anchoredMaxHeight)

  if (
    anchoredLayout
    && canPlaceLabelBox(stagePoints, anchoredX, anchoredY, anchoredLayout.width, anchoredLayout.height)
  ) {
    return {
      x: anchoredX,
      y: anchoredY,
      ...anchoredLayout,
    }
  }

  for (let fontSize = POLYGON_LABEL_MAX_FONT_SIZE; fontSize >= POLYGON_LABEL_MIN_FONT_SIZE; fontSize -= 1) {
    const lineHeight = Math.ceil(fontSize * POLYGON_LABEL_LINE_HEIGHT_RATIO)
    const fullLineWidth = Math.ceil(measureLabelText(safeLabel, fontSize))
    const singleLineLayout = {
      fontSize,
      lineHeight,
      lines: [safeLabel],
      width: fullLineWidth,
      height: lineHeight,
    }
    const wrappedLines = wrapLabelText(safeLabel, fontSize, boxMaxWidth)
    const wrappedLayout = {
      fontSize,
      lineHeight,
      lines: wrappedLines,
      width: Math.ceil(
        wrappedLines.reduce((maxWidthValue, line) =>
          Math.max(maxWidthValue, measureLabelText(line, fontSize)), 0),
      ),
      height: wrappedLines.length * lineHeight,
    }

    const layoutCandidates = [singleLineLayout, wrappedLayout]

    for (const layout of layoutCandidates) {
      if (layout.width > boxMaxWidth || layout.height > boxMaxHeight) {
        continue
      }

      const position = findFirstPlacementForLayout(stagePoints, bounds, layout, margin)
      if (position) {
        return {
          x: position.x,
          y: position.y,
          ...layout,
        }
      }
    }
  }

  const visualCenter = getPolygonVisualCenter(stagePoints)
  const centerLayout = createLabelLayout(safeLabel, boxMaxWidth, boxMaxHeight)
    ?? {
      fontSize: POLYGON_LABEL_MIN_FONT_SIZE,
      lineHeight: Math.ceil(POLYGON_LABEL_MIN_FONT_SIZE * POLYGON_LABEL_LINE_HEIGHT_RATIO),
      lines: [safeLabel],
      width: Math.ceil(measureLabelText(safeLabel, POLYGON_LABEL_MIN_FONT_SIZE)),
      height: Math.ceil(POLYGON_LABEL_MIN_FONT_SIZE * POLYGON_LABEL_LINE_HEIGHT_RATIO),
    }

  return {
    x: visualCenter.x - centerLayout.width / 2,
    y: visualCenter.y - centerLayout.height / 2,
    ...centerLayout,
  }
}

function CadCanvas({
  activeTool,
  zoom,
  imageRotation,
  backgroundImage,
  backgroundOpacity,
  onZoomChange,
  hasScaleDefinition,
  scaleDefinition,
  onPolygonSegmentCreated,
  onPolygonCreated,
  onPolygonDeleted,
  deletePolygonId,
  focusPolygonRequest,
  polygonColorById,
  polygonLabelById,
  polygonCeilingHeightById,
  placedEquipments,
  equipmentFilters,
  isAwaitingScaleLine,
  clearScaleReferenceToken,
  onEquipmentDrop,
  onEquipmentMove,
  multiAddPlacementRequest,
  onMultiAddPlacementCommit,
  onMultiAddPlacementCancel,
  onEquipmentDelete,
  selectedEquipmentId,
  renamingEquipmentId,
  renamingPolygonId,
  selectedPolygonId,
  onEquipmentSelect,
  onPolygonSelect,
  onPolygonContextMenu,
  onPolygonEditRequest,
  onPolygonRenameRequest,
  onPolygonDeleteRequest,
  onCanvasBackgroundClick,
  onLabelClick,
  onLabelDoubleClick,
  onLabelRenameCommit,
  onEquipmentLabelDoubleClick,
  onEquipmentRenameRequest,
  onEquipmentPropertiesRequest,
  onEquipmentLabelRenameCommit,
  onCancelRename,
  onPolygonTranslated,
  automationBoards,
  selectedBoardId,
  renamingBoardId,
  onBoardSelect,
  onBoardPinToggle,
  onBoardSlotInstall,
  onBoardSlotRemove,
  onBoardMove,
  onBoardRename,
  onBoardDelete,
  onBoardLabelDoubleClick,
  onBoardLabelRenameCommit,
}) {
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRenameInputRef = useRef(null)
  const equipmentRenameInputRef = useRef(null)
  const boardRenameInputRef = useRef(null)
  const equipmentHoldTimerRef = useRef(null)
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 })
  const lastFocusRequestTokenRef = useRef(null)
  const canvasRenameOpenedAtRef = useRef(0)
  const equipmentRenameOpenedAtRef = useRef(0)
  const boardRenameOpenedAtRef = useRef(0)
  const size = useElementSize(containerRef)
  const zoomScale = useMemo(() => zoom / 100, [zoom])
  const backgroundImageOpacity = useMemo(() => {
    const parsedOpacity = Number.isFinite(backgroundOpacity) ? backgroundOpacity : 100
    return Math.min(100, Math.max(0, parsedOpacity)) / 100
  }, [backgroundOpacity])
  const [polygons, setPolygons] = useState([])
  const [draftPolygonPoints, setDraftPolygonPoints] = useState([])
  const [draftPolygonCursor, setDraftPolygonCursor] = useState(null)
  const [scaleDraftStart, setScaleDraftStart] = useState(null)
  const [scaleDraftCursor, setScaleDraftCursor] = useState(null)
  const [scaleReferenceSegment, setScaleReferenceSegment] = useState(null)
  const [rulerDraftStart, setRulerDraftStart] = useState(null)
  const [rulerDraftCursor, setRulerDraftCursor] = useState(null)
  const [rectDraftStart, setRectDraftStart] = useState(null)
  const [rectDraftCursor, setRectDraftCursor] = useState(null)
  const [draggingEquipment, setDraggingEquipment] = useState(null)
  const [draggingPolygon, setDraggingPolygon] = useState(null)
  const [multiAddDraft, setMultiAddDraft] = useState(null)
  const [polygonContextMenu, setPolygonContextMenu] = useState(null)
  const [equipmentContextMenu, setEquipmentContextMenu] = useState(null)
  const [boardSlotContextMenu, setBoardSlotContextMenu] = useState(null)
  const [boardContextMenu, setBoardContextMenu] = useState(null)
  const [draggingBoard, setDraggingBoard] = useState(null)
  const [dragOverBoardSlot, setDragOverBoardSlot] = useState(null)
  const boardHoldTimerRef = useRef(null)
  const [polygonRenameDraft, setPolygonRenameDraft] = useState('')
  const [equipmentRenameDraft, setEquipmentRenameDraft] = useState('')
  const [boardRenameDraft, setBoardRenameDraft] = useState('')
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isMiddlePanning, setIsMiddlePanning] = useState(false)
  const loadedBackgroundImage = useLoadedImage(backgroundImage)
  const canvasWidth = size.width || 1
  const canvasHeight = size.height || 1
  const normalizedRotation = useMemo(
    () => ((imageRotation % 360) + 360) % 360,
    [imageRotation],
  )
  const isQuarterTurn = normalizedRotation === 90 || normalizedRotation === 270
  const baseFittedBackgroundImage = useMemo(() => {
    if (!loadedBackgroundImage) {
      return null
    }

    const imageWidth = loadedBackgroundImage.naturalWidth || loadedBackgroundImage.width
    const imageHeight = loadedBackgroundImage.naturalHeight || loadedBackgroundImage.height

    if (!imageWidth || !imageHeight) {
      return null
    }

    const layoutWidth = isQuarterTurn ? imageHeight : imageWidth
    const layoutHeight = isQuarterTurn ? imageWidth : imageHeight
    const scale = Math.min(canvasWidth / layoutWidth, canvasHeight / layoutHeight)
    const renderedWidth = imageWidth * scale
    const renderedHeight = imageHeight * scale

    return {
      width: renderedWidth,
      height: renderedHeight,
    }
  }, [canvasHeight, canvasWidth, isQuarterTurn, loadedBackgroundImage])

  const fittedBackgroundImage = useMemo(() => {
    if (!baseFittedBackgroundImage) {
      return null
    }

    const scaledWidth = baseFittedBackgroundImage.width * zoomScale
    const scaledHeight = baseFittedBackgroundImage.height * zoomScale

    const center = {
      x: canvasWidth / 2 + panOffset.x,
      y: canvasHeight / 2 + panOffset.y,
    }

    return {
      x: center.x - scaledWidth / 2,
      y: center.y - scaledHeight / 2,
      width: scaledWidth,
      height: scaledHeight,
      center,
      rotation: normalizedRotation,
    }
  }, [baseFittedBackgroundImage, canvasHeight, canvasWidth, normalizedRotation, panOffset.x, panOffset.y, zoomScale])

  useEffect(() => {
    setPanOffset({ x: 0, y: 0 })
  }, [backgroundImage?.src])

  useEffect(() => {
    if (activeTool !== 'polygon') {
      setDraftPolygonPoints([])
      setDraftPolygonCursor(null)
      setScaleDraftStart(null)
      setScaleDraftCursor(null)
    }
    if (activeTool !== 'rectangle') {
      setRectDraftStart(null)
      setRectDraftCursor(null)
    }
    if (activeTool !== 'ruler' || !hasScaleDefinition) {
      setRulerDraftStart(null)
      setRulerDraftCursor(null)
    }
  }, [activeTool, hasScaleDefinition])

  useEffect(() => {
    if (activeTool !== 'select') {
      onEquipmentSelect?.(null)
      setDraggingEquipment(null)
      if (equipmentHoldTimerRef.current) {
        window.clearTimeout(equipmentHoldTimerRef.current)
        equipmentHoldTimerRef.current = null
      }
    }
  }, [activeTool, onEquipmentSelect])

  useEffect(() => {
    if (!multiAddPlacementRequest?.equipment || !multiAddPlacementRequest?.quantity) {
      setMultiAddDraft(null)
      return
    }

    setMultiAddDraft({
      token: multiAddPlacementRequest.token,
      quantity: Math.max(1, Number.parseInt(multiAddPlacementRequest.quantity, 10) || 1),
      equipment: multiAddPlacementRequest.equipment,
      firstPoint: null,
      firstPolygonId: null,
      cursorPoint: null,
    })
  }, [multiAddPlacementRequest])

  useEffect(() => {
    if (!multiAddDraft) {
      return undefined
    }

    const handleEscape = (event) => {
      if (event.key !== 'Escape') {
        return
      }

      setMultiAddDraft(null)
      onMultiAddPlacementCancel?.()
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [multiAddDraft, onMultiAddPlacementCancel])

  useEffect(() => {
    if (!multiAddDraft || multiAddDraft.cursorPoint || !fittedBackgroundImage) {
      return
    }

    const currentStagePoint = toStagePoint(stageRef.current)
    if (!currentStagePoint) {
      return
    }

    setMultiAddDraft((currentDraft) => (currentDraft
      ? {
          ...currentDraft,
          cursorPoint: stageToNorm(currentStagePoint, fittedBackgroundImage),
        }
      : null))
  }, [multiAddDraft, fittedBackgroundImage])

  useEffect(() => {
    const handlePointerUp = () => {
      if (equipmentHoldTimerRef.current) {
        window.clearTimeout(equipmentHoldTimerRef.current)
        equipmentHoldTimerRef.current = null
      }
    }

    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
      if (equipmentHoldTimerRef.current) {
        window.clearTimeout(equipmentHoldTimerRef.current)
        equipmentHoldTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!renamingPolygonId) {
      setPolygonRenameDraft('')
      return
    }

    canvasRenameOpenedAtRef.current = Date.now()
    const polygon = polygons.find((currentPolygon) => currentPolygon.id === renamingPolygonId)
    setPolygonRenameDraft(polygon?.label ?? '')
    const input = canvasRenameInputRef.current
    if (input) {
      input.focus()
      input.select()
    }
  }, [polygons, renamingPolygonId])

  useEffect(() => {
    if (!renamingEquipmentId) {
      setEquipmentRenameDraft('')
      return
    }

    equipmentRenameOpenedAtRef.current = Date.now()
    const equipment = placedEquipments.find((currentEquipment) => currentEquipment.id === renamingEquipmentId)
    setEquipmentRenameDraft(equipment?.label ?? '')
    const input = equipmentRenameInputRef.current
    if (input) {
      input.focus()
      input.select()
    }
  }, [placedEquipments, renamingEquipmentId])

  useEffect(() => {
    if (!renamingBoardId) {
      setBoardRenameDraft('')
      return
    }
    boardRenameOpenedAtRef.current = Date.now()
    const board = automationBoards?.find((b) => b.id === renamingBoardId)
    setBoardRenameDraft(board?.label ?? '')
    const input = boardRenameInputRef.current
    if (input) {
      input.focus()
      input.select()
    }
  }, [automationBoards, renamingBoardId])

  // Sync editing value when rename starts from outside (tree click).
  // Delete selected polygon on Delete/Backspace key (select tool only).
  useEffect(() => {
    if (activeTool !== 'select') return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedEquipmentId && !renamingEquipmentId) {
          onEquipmentDelete?.(selectedEquipmentId)
          return
        }

        if (selectedPolygonId && !renamingPolygonId) {
          onPolygonDeleteRequest?.(selectedPolygonId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    activeTool,
    selectedEquipmentId,
    renamingEquipmentId,
    selectedPolygonId,
    renamingPolygonId,
    onEquipmentDelete,
    onPolygonDeleteRequest,
  ])

  useEffect(() => {
    if (activeTool !== 'polygon' && activeTool !== 'rectangle') {
      return undefined
    }

    const handleEscape = (event) => {
      if (event.key !== 'Escape') {
        return
      }

      setDraftPolygonPoints([])
      setDraftPolygonCursor(null)
      setScaleDraftStart(null)
      setScaleDraftCursor(null)
      setRectDraftStart(null)
      setRectDraftCursor(null)
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [activeTool])

  useEffect(() => {
    const handleCloseContextMenu = () => {
      setPolygonContextMenu(null)
      setEquipmentContextMenu(null)
      setBoardSlotContextMenu(null)
      setBoardContextMenu(null)
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setPolygonContextMenu(null)
        setEquipmentContextMenu(null)
        setBoardSlotContextMenu(null)
      }
    }

    window.addEventListener('pointerdown', handleCloseContextMenu)
    window.addEventListener('resize', handleCloseContextMenu)
    window.addEventListener('scroll', handleCloseContextMenu, true)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handleCloseContextMenu)
      window.removeEventListener('resize', handleCloseContextMenu)
      window.removeEventListener('scroll', handleCloseContextMenu, true)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const openEquipmentContextMenu = (event, equipmentId) => {
    if (activeTool !== 'select') {
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const bounds = container.getBoundingClientRect()
    const menuWidth = 172
    const menuHeight = 92
    const x = Math.min(event.clientX - bounds.left, bounds.width - menuWidth - 4)
    const y = Math.min(event.clientY - bounds.top, bounds.height - menuHeight - 4)

    onEquipmentSelect?.(equipmentId)
    setPolygonContextMenu(null)
    setEquipmentContextMenu({
      equipmentId,
      x: Math.max(4, x),
      y: Math.max(4, y),
    })
  }

  useEffect(() => {
    setScaleReferenceSegment(null)
    setScaleDraftStart(null)
    setScaleDraftCursor(null)
  }, [clearScaleReferenceToken])

  useEffect(() => {
    if (!draggingEquipment) {
      return undefined
    }

    const handlePointerMove = (event) => {
      const container = containerRef.current
      if (!container) {
        return
      }

      const containerRect = container.getBoundingClientRect()
      const stagePoint = {
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top,
      }

      const targetPolygon = [...polygons]
        .reverse()
        .find((polygon) => {
          const stagePoints = polygon.points.map((point) => normToStage(point, fittedBackgroundImage))
          return isPointInsidePolygon(stagePoint, stagePoints)
        })

      setDraggingEquipment((currentDrag) => {
        if (!currentDrag) {
          return null
        }

        return {
          ...currentDrag,
          point: stageToNorm(stagePoint, fittedBackgroundImage),
          polygonId: targetPolygon?.id ?? null,
        }
      })
    }

    const handlePointerUp = () => {
      setDraggingEquipment((currentDrag) => {
        if (currentDrag?.polygonId) {
          onEquipmentMove?.({
            equipmentId: currentDrag.id,
            point: currentDrag.point,
            polygonId: currentDrag.polygonId,
          })
        }

        return null
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [draggingEquipment, fittedBackgroundImage, onEquipmentMove, polygons])

  useEffect(() => {
    if (!draggingBoard) return undefined
    const handlePointerMove = (event) => {
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!containerRect) return
      const stagePoint = { x: event.clientX - containerRect.left, y: event.clientY - containerRect.top }
      const targetPolygon = [...polygons].reverse().find((polygon) => {
        const stagePoints = polygon.points.map((point) => normToStage(point, fittedBackgroundImage))
        return isPointInsidePolygon(stagePoint, stagePoints)
      })
      setDraggingBoard((curr) => {
        if (!curr) return null
        return {
          ...curr,
          point: stageToNorm(stagePoint, fittedBackgroundImage),
          polygonId: targetPolygon?.id ?? null,
        }
      })
    }
    const handlePointerUp = () => {
      setDraggingBoard((curr) => {
        if (curr?.polygonId) {
          onBoardMove?.({ boardId: curr.id, point: curr.point, polygonId: curr.polygonId })
        }
        return null
      })
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [draggingBoard, fittedBackgroundImage, onBoardMove, polygons])

  useEffect(() => {
    if (!draggingPolygon || !fittedBackgroundImage) {
      return undefined
    }

    const handlePointerMove = (event) => {
      const container = containerRef.current
      if (!container) {
        return
      }

      const containerRect = container.getBoundingClientRect()
      const currentStagePoint = {
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top,
      }
      const stageDelta = {
        x: currentStagePoint.x - draggingPolygon.startStagePoint.x,
        y: currentStagePoint.y - draggingPolygon.startStagePoint.y,
      }

      setDraggingPolygon((currentDrag) => (currentDrag
        ? {
            ...currentDrag,
            stageDelta,
          }
        : null))

      setPolygons((currentPolygons) =>
        currentPolygons.map((polygon) => {
          if (polygon.id !== draggingPolygon.polygonId) {
            return polygon
          }

          return {
            ...polygon,
            points: draggingPolygon.initialPolygonPoints.map((point) =>
              stageToNorm(
                {
                  x: normToStage(point, fittedBackgroundImage).x + stageDelta.x,
                  y: normToStage(point, fittedBackgroundImage).y + stageDelta.y,
                },
                fittedBackgroundImage,
              ),
            ),
          }
        }),
      )
    }

    const handlePointerUp = () => {
      if (draggingPolygon.stageDelta.x || draggingPolygon.stageDelta.y) {
        onPolygonTranslated?.({
          polygonId: draggingPolygon.polygonId,
          equipmentPoints: draggingPolygon.initialEquipmentPoints.map((equipment) => ({
            equipmentId: equipment.id,
            point: stageToNorm(
              {
                x: normToStage(equipment.point, fittedBackgroundImage).x + draggingPolygon.stageDelta.x,
                y: normToStage(equipment.point, fittedBackgroundImage).y + draggingPolygon.stageDelta.y,
              },
              fittedBackgroundImage,
            ),
          })),
        })
      }

      setDraggingPolygon(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [draggingPolygon, fittedBackgroundImage, onPolygonTranslated])

  useEffect(() => {
    if (!isMiddlePanning) {
      return undefined
    }

    const handlePointerMove = (event) => {
      const deltaX = event.clientX - panStartRef.current.mouseX
      const deltaY = event.clientY - panStartRef.current.mouseY

      setPanOffset({
        x: panStartRef.current.panX + deltaX,
        y: panStartRef.current.panY + deltaY,
      })
    }

    const handlePointerUp = () => {
      setIsMiddlePanning(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isMiddlePanning])

  useEffect(() => {
    if (!polygonColorById) {
      return
    }

    setPolygons((currentPolygons) =>
      currentPolygons.map((polygon) => {
        const overrideColor = polygonColorById[polygon.id]
        return overrideColor ? { ...polygon, color: overrideColor } : polygon
      }),
    )
  }, [polygonColorById])

  useEffect(() => {
    if (!polygonLabelById) {
      return
    }

    setPolygons((currentPolygons) =>
      currentPolygons.map((polygon) => {
        const nextLabel = polygonLabelById[polygon.id]
        return nextLabel ? { ...polygon, label: nextLabel } : polygon
      }),
    )
  }, [polygonLabelById])

  useEffect(() => {
    if (!deletePolygonId) {
      return
    }

    setPolygons((currentPolygons) =>
      currentPolygons.filter((polygon) => polygon.id !== deletePolygonId),
    )
  }, [deletePolygonId])

  useEffect(() => {
    const polygonId = focusPolygonRequest?.polygonId
    const requestToken = focusPolygonRequest?.token ?? polygonId

    if (!polygonId || !baseFittedBackgroundImage || !canvasWidth || !canvasHeight) {
      return
    }

    if (lastFocusRequestTokenRef.current === requestToken) {
      return
    }

    const targetPolygon = polygons.find((polygon) => polygon.id === polygonId)

    if (!targetPolygon?.points?.length) {
      return
    }

    const polygonPointsAtCurrentZoom = targetPolygon.points.map((point) =>
      normToStage(point, fittedBackgroundImage),
    )
    const currentBounds = getPolygonBounds(polygonPointsAtCurrentZoom)
    const currentWidth = Math.max(1, currentBounds.maxX - currentBounds.minX)
    const currentHeight = Math.max(1, currentBounds.maxY - currentBounds.minY)
    const framePadding = 36
    const availableWidth = Math.max(40, canvasWidth - framePadding * 2)
    const availableHeight = Math.max(40, canvasHeight - framePadding * 2)
    const fitScale = Math.min(availableWidth / currentWidth, availableHeight / currentHeight)
    const nextZoom = clampZoom(Math.round(zoom * fitScale))

    const nextZoomScale = nextZoom / 100
    const nextFrame = {
      x: canvasWidth / 2 - (baseFittedBackgroundImage.width * nextZoomScale) / 2,
      y: canvasHeight / 2 - (baseFittedBackgroundImage.height * nextZoomScale) / 2,
      width: baseFittedBackgroundImage.width * nextZoomScale,
      height: baseFittedBackgroundImage.height * nextZoomScale,
      center: { x: canvasWidth / 2, y: canvasHeight / 2 },
      rotation: normalizedRotation,
    }

    const polygonPointsNoPan = targetPolygon.points.map((point) => normToStage(point, nextFrame))
    const nextBounds = getPolygonBounds(polygonPointsNoPan)
    const polygonCenter = {
      x: (nextBounds.minX + nextBounds.maxX) / 2,
      y: (nextBounds.minY + nextBounds.maxY) / 2,
    }

    onZoomChange?.(nextZoom)
    setPanOffset({
      x: canvasWidth / 2 - polygonCenter.x,
      y: canvasHeight / 2 - polygonCenter.y,
    })
    lastFocusRequestTokenRef.current = requestToken
  }, [
    focusPolygonRequest,
    polygons,
    baseFittedBackgroundImage,
    canvasWidth,
    canvasHeight,
    fittedBackgroundImage,
    normalizedRotation,
    onZoomChange,
    zoom,
  ])

  const handleStageMouseDown = () => {
    if (tryHandleMultiAddClick()) {
      return
    }

    if (activeTool === 'select') {
      onEquipmentSelect?.(null)
      onCanvasBackgroundClick?.()
      return
    }

    const stage = stageRef.current
    const rawPoint = toStagePoint(stage)

    if (!rawPoint) {
      return
    }

    const normPoint = stageToNorm(rawPoint, fittedBackgroundImage)

    if (activeTool === 'rectangle') {
      if (!hasScaleDefinition) {
        return
      }

      if (!rectDraftStart) {
        setRectDraftStart(normPoint)
        setRectDraftCursor(normPoint)
        return
      }

      // Second click — commit rectangle as a 4-point polygon.
      const a = rectDraftStart
      const b = normPoint
      const rectPoints = [
        { x: a.x, y: a.y },
        { x: b.x, y: a.y },
        { x: b.x, y: b.y },
        { x: a.x, y: b.y },
      ]
      const startStage = normToStage(a, fittedBackgroundImage)
      const polygonId = `polygon-${Date.now()}-${Math.round(startStage.x)}-${Math.round(startStage.y)}`
      const completedPolygon = {
        id: polygonId,
        points: rectPoints,
        color: POLYGON_COLOR,
        label: '',
      }
      setPolygons((current) => [...current, completedPolygon])
      onPolygonCreated?.(completedPolygon)
      setRectDraftStart(null)
      setRectDraftCursor(null)
      return
    }

    if (activeTool === 'ruler') {
      if (!hasScaleDefinition) {
        return
      }

      if (!rulerDraftStart) {
        setRulerDraftStart(normPoint)
        setRulerDraftCursor(null)
        return
      }

      setRulerDraftStart(null)
      setRulerDraftCursor(null)
      return
    }

    if (activeTool !== 'polygon') {
      return
    }

    // Store all points in image-normalized coords so they follow the PNG on resize.

    if (isAwaitingScaleLine) {
      if (!scaleDraftStart) {
        setScaleDraftStart(normPoint)
        setScaleDraftCursor(normPoint)
        return
      }

      const scaleDraftStartStage = normToStage(scaleDraftStart, fittedBackgroundImage)
      const completedSegment = {
        start: scaleDraftStart,
        end: normPoint,
        lengthPixels: getImagePixelDistance(scaleDraftStart, normPoint, loadedBackgroundImage),
      }

      setScaleReferenceSegment(completedSegment)
      onPolygonSegmentCreated?.(completedSegment)
      setScaleDraftStart(null)
      setScaleDraftCursor(null)
      return
    }

    if (!hasScaleDefinition) {
      return
    }

    if (draftPolygonPoints.length === 0) {
      setDraftPolygonPoints([normPoint])
      setDraftPolygonCursor(normPoint)
      return
    }

    // Compare hit distance in stage-space so the threshold stays as physical pixels.
    const firstPointStage = normToStage(draftPolygonPoints[0], fittedBackgroundImage)
    if (draftPolygonPoints.length >= 3 && isNearPoint(rawPoint, firstPointStage, CLOSE_POLYGON_HIT_DISTANCE)) {
      const polygonId = `polygon-${Date.now()}-${Math.round(firstPointStage.x)}-${Math.round(firstPointStage.y)}`
      const completedPolygon = {
        id: polygonId,
        points: draftPolygonPoints,
        color: POLYGON_COLOR,
        label: '',
      }

      setPolygons((currentPolygons) => [...currentPolygons, completedPolygon])
      onPolygonCreated?.(completedPolygon)
      setDraftPolygonPoints([])
      setDraftPolygonCursor(null)
      return
    }

    setDraftPolygonPoints((currentPoints) => [...currentPoints, normPoint])
  }

  const tryHandleMultiAddClick = (forcedPolygonId = null) => {
    if (!multiAddDraft || !fittedBackgroundImage) {
      return false
    }

    const stagePoint = toStagePoint(stageRef.current)

    if (!stagePoint) {
      return false
    }

    const targetPolygon = forcedPolygonId
      ? polygons.find((polygon) => polygon.id === forcedPolygonId) ?? null
      : [...polygons]
          .reverse()
          .find((polygon) => {
            const stagePoints = polygon.points.map((point) => normToStage(point, fittedBackgroundImage))
            return isPointInsidePolygon(stagePoint, stagePoints)
          })

    if (!targetPolygon) {
      return true
    }

    const normPoint = stageToNorm(stagePoint, fittedBackgroundImage)

    if (!multiAddDraft.firstPoint) {
      setMultiAddDraft((currentDraft) => (currentDraft
        ? {
            ...currentDraft,
            firstPoint: normPoint,
            firstPolygonId: targetPolygon.id,
            cursorPoint: normPoint,
          }
        : null))
      return true
    }

    if (multiAddDraft.firstPolygonId !== targetPolygon.id) {
      return true
    }

    onMultiAddPlacementCommit?.({
      polygonId: targetPolygon.id,
      equipment: multiAddDraft.equipment,
      points: distributePointsBetween(multiAddDraft.firstPoint, normPoint, multiAddDraft.quantity),
    })
    setMultiAddDraft(null)
    return true
  }

  const handlePolygonMouseDown = (event, polygonId) => {
    if (tryHandleMultiAddClick(polygonId)) {
      event.cancelBubble = true
      return
    }

    if (activeTool !== 'select') {
      return
    }

    event.cancelBubble = true
    onEquipmentSelect?.(null)

    if (selectedPolygonId === polygonId && event.evt.button === 0) {
      const stagePoint = toStagePoint(stageRef.current)
      const polygon = polygons.find((currentPolygon) => currentPolygon.id === polygonId)

      if (stagePoint && polygon) {
        setDraggingPolygon({
          polygonId,
          startStagePoint: stagePoint,
          stageDelta: { x: 0, y: 0 },
          initialPolygonPoints: polygon.points,
          initialEquipmentPoints: (placedEquipments ?? [])
            .filter((equipment) => equipment.polygonId === polygonId)
            .map((equipment) => ({ id: equipment.id, point: equipment.point })),
        })
      }
    }

    onPolygonSelect?.(polygonId)
  }

  const openPolygonContextMenu = (event, polygonId) => {
    if (activeTool !== 'select') {
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    event.evt.preventDefault()
    event.cancelBubble = true

    const bounds = container.getBoundingClientRect()
    const menuWidth = 172
    const menuHeight = 92
    const x = Math.min(event.evt.clientX - bounds.left, bounds.width - menuWidth - 4)
    const y = Math.min(event.evt.clientY - bounds.top, bounds.height - menuHeight - 4)

    onEquipmentSelect?.(null)
    onPolygonContextMenu?.(polygonId)
    onPolygonSelect?.(polygonId)
    setPolygonContextMenu({
      polygonId,
      x: Math.max(4, x),
      y: Math.max(4, y),
    })
  }

  const handleEquipmentMouseDown = (event, equipment) => {
    if (activeTool !== 'select') {
      return
    }

    if (event.button !== 0) {
      return
    }

    event.stopPropagation()

    if (selectedEquipmentId !== equipment.id) {
      onEquipmentSelect?.(equipment.id)
      return
    }

    if (event.detail >= 2) {
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    const containerRect = container.getBoundingClientRect()
    const stagePoint = {
      x: event.clientX - containerRect.left,
      y: event.clientY - containerRect.top,
    }

    if (equipmentHoldTimerRef.current) {
      window.clearTimeout(equipmentHoldTimerRef.current)
    }

    equipmentHoldTimerRef.current = window.setTimeout(() => {
      setDraggingEquipment({
        id: equipment.id,
        point: stageToNorm(stagePoint, fittedBackgroundImage),
        polygonId: equipment.polygonId,
      })
      equipmentHoldTimerRef.current = null
    }, EQUIPMENT_HOLD_TO_DRAG_MS)
  }

  const handleBoardMouseDown = (event, board) => {
    if (activeTool !== 'select') return
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()

    if (selectedBoardId !== board.id) {
      onBoardSelect?.(board.id)
      return
    }

    if (event.detail >= 2) return

    const container = containerRef.current
    if (!container) return
    const bounds = container.getBoundingClientRect()
    const stagePoint = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }

    if (boardHoldTimerRef.current) window.clearTimeout(boardHoldTimerRef.current)

    boardHoldTimerRef.current = window.setTimeout(() => {
      setDraggingBoard({
        id: board.id,
        point: stageToNorm(stagePoint, fittedBackgroundImage),
        polygonId: board.polygonId,
      })
      boardHoldTimerRef.current = null
    }, EQUIPMENT_HOLD_TO_DRAG_MS)
  }

  const openBoardContextMenu = (event, boardId) => {
    if (activeTool !== 'select') return
    const container = containerRef.current
    if (!container) return
    event.preventDefault()
    event.stopPropagation()
    const bounds = container.getBoundingClientRect()
    const menuWidth = 172
    const menuHeight = 60
    const x = Math.min(event.clientX - bounds.left, bounds.width - menuWidth - 4)
    const y = Math.min(event.clientY - bounds.top, bounds.height - menuHeight - 4)
    setEquipmentContextMenu(null)
    setPolygonContextMenu(null)
    setBoardSlotContextMenu(null)
    setBoardContextMenu({
      boardId,
      x: Math.max(4, x),
      y: Math.max(4, y),
    })
  }

  const handleSelectedVertexDragMove = (event, polygonId, pointIndex) => {
    const draggedStagePoint = {
      x: event.target.x(),
      y: event.target.y(),
    }

    const draggedNormPoint = stageToNorm(draggedStagePoint, fittedBackgroundImage)

    setPolygons((currentPolygons) =>
      currentPolygons.map((polygon) => {
        if (polygon.id !== polygonId) {
          return polygon
        }

        const nextPoints = polygon.points.map((point, index) =>
          index === pointIndex ? draggedNormPoint : point,
        )

        return {
          ...polygon,
          points: nextPoints,
        }
      }),
    )
  }

  const handleStageMouseMove = () => {
    if (multiAddDraft) {
      const stage = stageRef.current
      const rawPoint = toStagePoint(stage)

      if (!rawPoint || !fittedBackgroundImage) {
        return
      }

      setMultiAddDraft((currentDraft) => (currentDraft
        ? {
            ...currentDraft,
            cursorPoint: stageToNorm(rawPoint, fittedBackgroundImage),
          }
        : null))
      return
    }

    if (activeTool === 'rectangle') {
      if (!hasScaleDefinition) return
      if (!rectDraftStart) return
      const stage = stageRef.current
      const rawPoint = toStagePoint(stage)
      if (!rawPoint) return
      setRectDraftCursor(stageToNorm(rawPoint, fittedBackgroundImage))
      return
    }

    if (activeTool === 'ruler') {
      if (!hasScaleDefinition || !rulerDraftStart) {
        return
      }

      const stage = stageRef.current
      const rawPoint = toStagePoint(stage)
      if (!rawPoint) return
      setRulerDraftCursor(stageToNorm(rawPoint, fittedBackgroundImage))
      return
    }

    if (activeTool !== 'polygon') {
      return
    }

    const stage = stageRef.current
    const rawPoint = toStagePoint(stage)

    if (!rawPoint) {
      return
    }

    const normPoint = stageToNorm(rawPoint, fittedBackgroundImage)

    if (isAwaitingScaleLine) {
      if (scaleDraftStart) {
        setScaleDraftCursor(normPoint)
      }
      return
    }

    if (!hasScaleDefinition) {
      return
    }

    if (draftPolygonPoints.length > 0) {
      setDraftPolygonCursor(normPoint)
    }
  }

  const handleDragOverCanvas = (event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleCanvasWheel = (event) => {
    const targetElement = event.target
    if (targetElement instanceof Element) {
      const isInsideOverlay = targetElement.closest(
        '.cad-equipment-overlay, .cad-scale-overlay, .cad-environment-overlay',
      )
      if (isInsideOverlay) {
        return
      }
    }

    event.preventDefault()

    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9
    const nextZoom = clampZoom(Math.round(zoom * zoomFactor))

    if (nextZoom === zoom) {
      return
    }

    const container = containerRef.current
    const baseImage = baseFittedBackgroundImage
    const currentImage = fittedBackgroundImage

    if (!container || !baseImage || !currentImage) {
      onZoomChange?.(nextZoom)
      return
    }

    const containerRect = container.getBoundingClientRect()
    const pointer = {
      x: event.clientX - containerRect.left,
      y: event.clientY - containerRect.top,
    }

    const pointerNorm = stageToNorm(pointer, currentImage)
    const nextScale = nextZoom / 100
    const nextWidth = baseImage.width * nextScale
    const nextHeight = baseImage.height * nextScale
    const nextCenter = {
      x: canvasWidth / 2,
      y: canvasHeight / 2,
    }
    const rotatedVector = rotateVector(
      {
        x: (pointerNorm.x - 0.5) * nextWidth,
        y: (pointerNorm.y - 0.5) * nextHeight,
      },
      normalizedRotation,
    )

    setPanOffset({
      x: pointer.x - rotatedVector.x - nextCenter.x,
      y: pointer.y - rotatedVector.y - nextCenter.y,
    })

    onZoomChange?.(nextZoom)
  }

  const handleCanvasMouseDownCapture = (event) => {
    const isMiddleButton = event.button === 1
    const isMoveToolDrag = activeTool === 'move' && event.button === 0

    if (!isMiddleButton && !isMoveToolDrag) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    panStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      panX: panOffset.x,
      panY: panOffset.y,
    }

    setIsMiddlePanning(true)
  }

  const handleCanvasAuxClick = (event) => {
    if (event.button === 1) {
      event.preventDefault()
    }
  }

  const handleDropOnCanvas = (event) => {
    event.preventDefault()

    const rawPayload = event.dataTransfer.getData('application/x-equipment-item')
    if (!rawPayload) {
      return
    }

    let equipment
    try {
      equipment = JSON.parse(rawPayload)
    } catch {
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    const containerRect = container.getBoundingClientRect()
    const droppedStagePoint = {
      x: event.clientX - containerRect.left,
      y: event.clientY - containerRect.top,
    }

    const targetPolygon = [...polygons]
      .reverse()
      .find((polygon) => {
        const stagePoints = polygon.points.map((point) => normToStage(point, fittedBackgroundImage))
        return isPointInsidePolygon(droppedStagePoint, stagePoints)
      })

    if (!targetPolygon) {
      return
    }

    onEquipmentDrop?.({
      polygonId: targetPolygon.id,
      point: stageToNorm(droppedStagePoint, fittedBackgroundImage),
      equipment,
    })
  }

  const stageWidth = size.width || 1
  const stageHeight = size.height || 1
  const polygonRenameInputWidth = useMemo(
    () => Math.max(18, Math.ceil(measureLabelText(polygonRenameDraft || ' ', 14)) + 12),
    [polygonRenameDraft],
  )
  const equipmentRenameInputWidth = useMemo(
    () => Math.max(16, Math.ceil(measureLabelText(equipmentRenameDraft || ' ', 11)) + 10),
    [equipmentRenameDraft],
  )
  const boardRenameInputWidth = useMemo(
    () => Math.max(16, Math.ceil(measureLabelText(boardRenameDraft || ' ', 11)) + 10),
    [boardRenameDraft],
  )
  const polygonLabelPlacementById = useMemo(() => {
    const placements = {}

    polygons.forEach((polygon) => {
      const stagePoints = polygon.points.map((point) => normToStage(point, fittedBackgroundImage))
      placements[polygon.id] = getPolygonLabelPlacement(stagePoints, polygon.label)
    })

    return placements
  }, [polygons, fittedBackgroundImage])

  return (
    <div
      className={`cad-canvas-shell${activeTool === 'move' ? ' is-pan-tool' : ''}${activeTool === 'rectangle' || activeTool === 'polygon' || activeTool === 'ruler' ? ' is-draw-tool' : ''}${isMiddlePanning ? ' is-panning' : ''}${multiAddDraft ? ' is-multi-add' : ''}`}
      ref={containerRef}
      onMouseDownCapture={handleCanvasMouseDownCapture}
      onAuxClick={handleCanvasAuxClick}
      onWheel={handleCanvasWheel}
      onDragOver={handleDragOverCanvas}
      onDrop={handleDropOnCanvas}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="cad-canvas-surface">
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          className="cad-konva-stage"
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              width={stageWidth}
              height={stageHeight}
              fill="#fdfdfd"
            />

            {loadedBackgroundImage ? (
              <KonvaImage
                image={loadedBackgroundImage}
                x={fittedBackgroundImage?.center?.x ?? 0}
                y={fittedBackgroundImage?.center?.y ?? 0}
                width={fittedBackgroundImage?.width ?? canvasWidth}
                height={fittedBackgroundImage?.height ?? canvasHeight}
                offsetX={(fittedBackgroundImage?.width ?? canvasWidth) / 2}
                offsetY={(fittedBackgroundImage?.height ?? canvasHeight) / 2}
                rotation={fittedBackgroundImage?.rotation ?? 0}
                opacity={backgroundImageOpacity}
              />
            ) : null}

            {polygons.map((polygon, index) => {
              const stagePoints = polygon.points.map((p) => normToStage(p, fittedBackgroundImage))
              const isSelected = activeTool === 'select' && polygon.id === selectedPolygonId
              return (
                <Group key={`polygon-${index}-${polygon.points.length}`}>
                  <Line
                    points={flattenPoints(stagePoints)}
                    stroke={isSelected ? SELECTED_POLYGON_COLOR : polygon.color}
                    fill={hexToRgba(polygon.color, 0.25)}
                    strokeWidth={POLYGON_LINE_STROKE}
                    closed
                    lineCap="round"
                    lineJoin="round"
                    onMouseDown={(event) => handlePolygonMouseDown(event, polygon.id)}
                    onContextMenu={(event) => openPolygonContextMenu(event, polygon.id)}
                  />

                  {isSelected
                    ? stagePoints.map((point, pointIndex) => (
                        <Circle
                          key={`selected-point-${polygon.id}-${pointIndex}`}
                          x={point.x}
                          y={point.y}
                          radius={POLYGON_POINT_RADIUS}
                          fill="#FFFFFF"
                          stroke={SELECTED_POLYGON_COLOR}
                          strokeWidth={POLYGON_POINT_STROKE}
                          draggable
                          onDragMove={(event) =>
                            handleSelectedVertexDragMove(event, polygon.id, pointIndex)
                          }
                          onMouseDown={(event) => {
                            event.cancelBubble = true
                          }}
                        />
                      ))
                    : null}
                </Group>
              )
            })}

            {scaleDefinition ? (placedEquipments ?? [])
              .filter((equipment) =>
                SENSOR_CATALOG_IDS.has(equipment.catalogItemId) &&
                isEquipmentIconVisible(equipment, equipmentFilters)
              )
              .map((equipment) => {
                const polygon = polygons.find((p) => p.id === equipment.polygonId)
                if (!polygon?.points?.length) return null
                const ceilingHeight = Number.parseFloat(polygonCeilingHeightById?.[equipment.polygonId])
                if (!Number.isFinite(ceilingHeight) || ceilingHeight <= 0) return null
                const imageNaturalWidth = loadedBackgroundImage?.naturalWidth || loadedBackgroundImage?.width || 1
                const stagePixelsPerMeter = scaleDefinition.pixelsPerMeter * (fittedBackgroundImage.width / imageNaturalWidth)
                const radiusPixels = ceilingHeight * Math.tan(SENSOR_OPENING_ANGLE_HALF_RAD) * stagePixelsPerMeter
                const sensorStage = normToStage(equipment.point, fittedBackgroundImage)
                const stagePoints = polygon.points.map((p) => normToStage(p, fittedBackgroundImage))
                return (
                  <Group
                    key={`sensor-area-${equipment.id}`}
                    clipFunc={(ctx) => {
                      ctx.beginPath()
                      stagePoints.forEach(({ x, y }, i) => {
                        if (i === 0) ctx.moveTo(x, y)
                        else ctx.lineTo(x, y)
                      })
                      ctx.closePath()
                    }}
                    listening={false}
                  >
                    <Circle
                      x={sensorStage.x}
                      y={sensorStage.y}
                      radius={radiusPixels}
                      fill={hexToRgba(SENSOR_FILL_COLOR, 0.25)}
                      stroke={SENSOR_FILL_COLOR}
                      strokeWidth={4}
                      listening={false}
                    />
                  </Group>
                )
              }) : null}

            {rectDraftStart && rectDraftCursor ? (() => {
              const a = normToStage(rectDraftStart, fittedBackgroundImage)
              const b = normToStage(rectDraftCursor, fittedBackgroundImage)
              const previewPoints = [
                { x: a.x, y: a.y },
                { x: b.x, y: a.y },
                { x: b.x, y: b.y },
                { x: a.x, y: b.y },
              ]
              return (
                <Group>
                  <Line
                    points={flattenPoints(previewPoints)}
                    stroke={POLYGON_COLOR}
                    strokeWidth={POLYGON_LINE_STROKE}
                    closed
                    lineCap="round"
                    lineJoin="round"
                    dash={[6, 4]}
                  />
                  <Circle
                    x={a.x}
                    y={a.y}
                    radius={POLYGON_POINT_RADIUS}
                    fill="#FFFFFF"
                    stroke={POLYGON_COLOR}
                    strokeWidth={POLYGON_POINT_STROKE}
                  />
                </Group>
              )
            })() : null}

            {scaleReferenceSegment ? (() => {
              const refStart = normToStage(scaleReferenceSegment.start, fittedBackgroundImage)
              const refEnd = normToStage(scaleReferenceSegment.end, fittedBackgroundImage)
              return (
                <Group>
                  <Line
                    points={[refStart.x, refStart.y, refEnd.x, refEnd.y]}
                    stroke={POLYGON_COLOR}
                    strokeWidth={POLYGON_LINE_STROKE}
                    lineCap="round"
                    lineJoin="round"
                  />
                  <Circle
                    x={refStart.x}
                    y={refStart.y}
                    radius={POLYGON_POINT_RADIUS}
                    fill="#FFFFFF"
                    stroke={POLYGON_COLOR}
                    strokeWidth={POLYGON_POINT_STROKE}
                  />
                  <Circle
                    x={refEnd.x}
                    y={refEnd.y}
                    radius={POLYGON_POINT_RADIUS}
                    fill="#FFFFFF"
                    stroke={POLYGON_COLOR}
                    strokeWidth={POLYGON_POINT_STROKE}
                  />
                </Group>
              )
            })() : null}

            {draftPolygonPoints.length > 1 ? (
              <Line
                points={flattenPoints(draftPolygonPoints.map((p) => normToStage(p, fittedBackgroundImage)))}
                stroke={POLYGON_COLOR}
                strokeWidth={POLYGON_LINE_STROKE}
                lineCap="round"
                lineJoin="round"
              />
            ) : null}

            {draftPolygonCursor && draftPolygonPoints.length > 0 && !isAwaitingScaleLine ? (() => {
              const lastStage = normToStage(draftPolygonPoints[draftPolygonPoints.length - 1], fittedBackgroundImage)
              const cursorStage = normToStage(draftPolygonCursor, fittedBackgroundImage)
              return (
                <Line
                  points={[lastStage.x, lastStage.y, cursorStage.x, cursorStage.y]}
                  stroke={POLYGON_COLOR}
                  strokeWidth={POLYGON_LINE_STROKE}
                  lineCap="round"
                  lineJoin="round"
                  dash={[6, 4]}
                />
              )
            })() : null}

            {draftPolygonPoints.length > 0 && !isAwaitingScaleLine
              ? draftPolygonPoints.map((point, index) => {
                  const sp = normToStage(point, fittedBackgroundImage)
                  return (
                    <Circle
                      key={`draft-point-${index}-${sp.x}-${sp.y}`}
                      x={sp.x}
                      y={sp.y}
                      radius={POLYGON_POINT_RADIUS}
                      fill="#FFFFFF"
                      stroke={POLYGON_COLOR}
                      strokeWidth={POLYGON_POINT_STROKE}
                    />
                  )
                })
              : null}

            {draftPolygonPoints.length >= 3 && !isAwaitingScaleLine ? (() => {
              const firstStage = normToStage(draftPolygonPoints[0], fittedBackgroundImage)
              return (
                <Circle
                  x={firstStage.x}
                  y={firstStage.y}
                  radius={START_POINT_HIGHLIGHT_RADIUS}
                  stroke={POLYGON_COLOR}
                  strokeWidth={2}
                  dash={[4, 4]}
                  fillEnabled={false}
                />
              )
            })() : null}

            {scaleDraftStart && isAwaitingScaleLine ? (() => {
              const sds = normToStage(scaleDraftStart, fittedBackgroundImage)
              const sdc = scaleDraftCursor ? normToStage(scaleDraftCursor, fittedBackgroundImage) : null
              return (
                <>
                  <Circle
                    x={sds.x}
                    y={sds.y}
                    radius={POLYGON_POINT_RADIUS}
                    fill="#FFFFFF"
                    stroke={POLYGON_COLOR}
                    strokeWidth={POLYGON_POINT_STROKE}
                  />
                  {sdc ? (
                    <Line
                      points={[sds.x, sds.y, sdc.x, sdc.y]}
                      stroke={POLYGON_COLOR}
                      strokeWidth={POLYGON_LINE_STROKE}
                      lineCap="round"
                      lineJoin="round"
                      dash={[6, 4]}
                    />
                  ) : null}
                </>
              )
            })() : null}

            {rulerDraftStart && rulerDraftCursor && scaleDefinition?.metersPerPixel ? (() => {
              const startStage = normToStage(rulerDraftStart, fittedBackgroundImage)
              const cursorStage = normToStage(rulerDraftCursor, fittedBackgroundImage)
              const distancePixels = getImagePixelDistance(rulerDraftStart, rulerDraftCursor, loadedBackgroundImage)
              const distanceMeters = distancePixels * scaleDefinition.metersPerPixel
              const midPoint = {
                x: (startStage.x + cursorStage.x) / 2,
                y: (startStage.y + cursorStage.y) / 2,
              }
              const labelText = `${distanceMeters.toFixed(2)} m`
              const labelWidth = Math.max(52, Math.ceil(measureLabelText(labelText, 12)) + 12)
              const labelHeight = 22

              return (
                <Group>
                  <Line
                    points={[startStage.x, startStage.y, cursorStage.x, cursorStage.y]}
                    stroke={RULER_COLOR}
                    strokeWidth={POLYGON_LINE_STROKE}
                    lineCap="round"
                    lineJoin="round"
                    dash={[6, 4]}
                  />
                  <Circle
                    x={startStage.x}
                    y={startStage.y}
                    radius={POLYGON_POINT_RADIUS}
                    fill="#FFFFFF"
                    stroke={RULER_COLOR}
                    strokeWidth={POLYGON_POINT_STROKE}
                  />
                  <Rect
                    x={midPoint.x - labelWidth / 2}
                    y={midPoint.y - 30}
                    width={labelWidth}
                    height={labelHeight}
                    fill="rgba(255, 255, 255, 0.95)"
                    stroke={RULER_COLOR}
                    strokeWidth={1}
                    cornerRadius={3}
                  />
                  <Text
                    x={midPoint.x - labelWidth / 2}
                    y={midPoint.y - 28}
                    width={labelWidth}
                    height={labelHeight - 4}
                    text={labelText}
                    fontSize={12}
                    fontFamily="Segoe UI, sans-serif"
                    fontStyle="bold"
                    fill="#38404D"
                    align="center"
                    verticalAlign="middle"
                    listening={false}
                  />
                </Group>
              )
            })() : null}

            {multiAddDraft?.firstPoint && multiAddDraft?.cursorPoint ? (() => {
              const startStage = normToStage(multiAddDraft.firstPoint, fittedBackgroundImage)
              const cursorStage = normToStage(multiAddDraft.cursorPoint, fittedBackgroundImage)

              return (
                <Line
                  points={[startStage.x, startStage.y, cursorStage.x, cursorStage.y]}
                  stroke={MULTI_ADD_PREVIEW_COLOR}
                  strokeWidth={2}
                  lineCap="round"
                  lineJoin="round"
                  dash={[6, 4]}
                />
              )
            })() : null}
          </Layer>
        </Stage>
      </div>

      {multiAddDraft?.cursorPoint ? (() => {
        const cursorStage = normToStage(multiAddDraft.cursorPoint, fittedBackgroundImage)

        return (
          <div
            className="cad-multi-add-cursor"
            style={{ left: `${cursorStage.x}px`, top: `${cursorStage.y}px` }}
          >
            <img
              src={multiAddDraft.equipment.iconSrc}
              alt=""
              className="cad-multi-add-cursor__icon"
              draggable={false}
            />
          </div>
        )
      })() : null}

      {(placedEquipments ?? []).filter((equipment) => isEquipmentIconVisible(equipment, equipmentFilters)).map((equipment) => {
        const visiblePoint = draggingEquipment?.id === equipment.id
          ? draggingEquipment.point
          : equipment.point
        const stagePoint = normToStage(visiblePoint, fittedBackgroundImage)
        const pixelX = stagePoint.x
        const pixelY = stagePoint.y
        const isSelected = selectedEquipmentId === equipment.id

        const wireframeEntry = zoom >= 300 ? (EQUIPMENT_WIREFRAMES[equipment.catalogItemId] ?? null) : null
        const showWireframe = wireframeEntry != null && scaleDefinition != null
        const wireframeDims = showWireframe ? (() => {
          const imageNaturalWidth = loadedBackgroundImage?.naturalWidth || loadedBackgroundImage?.width || 1
          const stagePixelsPerMeter = scaleDefinition.pixelsPerMeter * (fittedBackgroundImage.width / imageNaturalWidth)
          return {
            width: (wireframeEntry.widthMm / 1000) * stagePixelsPerMeter,
            height: (wireframeEntry.heightMm / 1000) * stagePixelsPerMeter,
          }
        })() : null

        return (
          <div
            key={equipment.id}
            className={`cad-equipment-placement${isSelected ? ' is-selected' : ''}${showWireframe ? ' cad-equipment-placement--wireframe' : ''}`}
            style={wireframeDims
              ? { left: pixelX, top: pixelY, width: wireframeDims.width, height: wireframeDims.height }
              : { left: pixelX, top: pixelY }
            }
            onMouseDown={(event) => handleEquipmentMouseDown(event, equipment)}
            onContextMenu={(event) => openEquipmentContextMenu(event, equipment.id)}
          >
            {showWireframe ? (
              <img src={wireframeEntry.svgUrl} alt="" className="cad-equipment-placement__wireframe" draggable={false} />
            ) : (
              <img src={equipment.iconSrc} alt="" className="cad-equipment-placement__icon" draggable={false} />
            )}
            {equipmentFilters?.text === false ? null : renamingEquipmentId === equipment.id ? (
              <input
                ref={equipmentRenameInputRef}
                className="cad-equipment-placement__input"
                style={{ width: `${equipmentRenameInputWidth}px` }}
                value={equipmentRenameDraft}
                onChange={(event) => setEquipmentRenameDraft(event.currentTarget.value)}
                onMouseDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onEquipmentLabelRenameCommit?.(equipment.id, event.currentTarget.value)
                  } else if (event.key === 'Escape') {
                    onCancelRename?.()
                  }
                  event.stopPropagation()
                }}
                onBlur={(event) => {
                  if (Date.now() - equipmentRenameOpenedAtRef.current < 120) {
                    return
                  }
                  onEquipmentLabelRenameCommit?.(equipment.id, event.currentTarget.value)
                }}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            ) : (
              <span
                className="cad-equipment-placement__label"
                onDoubleClick={(event) => {
                  event.stopPropagation()
                  onEquipmentLabelDoubleClick?.(equipment.id)
                }}
              >
                {equipment.label}
              </span>
            )}
          </div>
        )
      })}

      {(automationBoards ?? []).map((board) => {
        if (!isEquipmentIconVisible(board, equipmentFilters)) return null
        const visiblePoint = draggingBoard?.id === board.id ? draggingBoard.point : board.point
        const stagePoint = normToStage(visiblePoint, fittedBackgroundImage)
        const cols = board.slotCount <= 8 ? 2 : 3

        return (
          <div
            key={board.id}
            className={`cad-board-placement${selectedBoardId === board.id ? ' is-selected' : ''}`}
            style={{ left: stagePoint.x, top: stagePoint.y }}
            onMouseDown={(event) => handleBoardMouseDown(event, board)}
            onContextMenu={(event) => openBoardContextMenu(event, board.id)}
          >
            <button
              type="button"
              className={`cad-board-pin${board.pinned ? ' is-pinned' : ''}`}
              title={board.pinned ? 'Desafixar' : 'Fixar'}
              onClick={(event) => { event.stopPropagation(); onBoardPinToggle?.(board.id) }}
            >
              <img src={board.pinned ? pinSelecionado : pinPadrao} alt="" draggable={false} />
            </button>
            <img src={board.iconSrc} alt="" className="cad-board-placement__icon" draggable={false} />
            {renamingBoardId === board.id ? (
              <input
                ref={boardRenameInputRef}
                className="cad-equipment-placement__input"
                style={{ width: `${boardRenameInputWidth}px` }}
                value={boardRenameDraft}
                onChange={(event) => setBoardRenameDraft(event.currentTarget.value)}
                onMouseDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onBoardLabelRenameCommit?.(board.id, event.currentTarget.value)
                  } else if (event.key === 'Escape') {
                    onBoardLabelRenameCommit?.(board.id, board.label)
                  }
                  event.stopPropagation()
                }}
                onBlur={(event) => {
                  if (Date.now() - boardRenameOpenedAtRef.current < 120) return
                  onBoardLabelRenameCommit?.(board.id, event.currentTarget.value)
                }}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            ) : (
              <span
                className="cad-board-placement__label"
                onDoubleClick={(event) => {
                  event.stopPropagation()
                  onBoardLabelDoubleClick?.(board.id)
                }}
              >
                {board.label}
              </span>
            )}
            <div
              className={`cad-board-structure${board.pinned ? ' is-pinned' : ''}`}
              style={{ gridTemplateColumns: `repeat(${cols}, 24px)` }}
            >
              {board.slots.map((slot, slotIndex) => {
                const isOver = dragOverBoardSlot?.boardId === board.id && dragOverBoardSlot?.slotIndex === slotIndex
                return (
                  <div
                    key={slotIndex}
                    className={`cad-board-slot${slot ? ' is-occupied' : ''}${isOver ? ' is-drag-over' : ''}`}
                    title={slot ? slot.label : `Slot ${slotIndex + 1}`}
                    onDragOver={(event) => {
                      if (slot) return
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'copy'
                      setDragOverBoardSlot({ boardId: board.id, slotIndex })
                    }}
                    onDragLeave={() => setDragOverBoardSlot(null)}
                    onDrop={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setDragOverBoardSlot(null)
                      if (slot) return
                      try {
                        const itemData = JSON.parse(event.dataTransfer.getData('application/x-equipment-item'))
                        const catalogItemId = itemData?.catalogItemId ?? itemData?.id
                        if (!itemData?.label || !isBoardOnlyItem(catalogItemId)) return
                        onBoardSlotInstall?.({
                          boardId: board.id,
                          slotIndex,
                          device: {
                            id: `slot-${board.id}-${slotIndex}-${Date.now()}`,
                            catalogItemId,
                            label: itemData.label,
                            iconSrc: itemData.iconSrc,
                            iconKey: itemData.iconKey,
                          },
                        })
                      } catch {}
                    }}
                    onContextMenu={(event) => {
                      if (!slot) return
                      event.preventDefault()
                      event.stopPropagation()
                      const container = containerRef.current
                      const bounds = container?.getBoundingClientRect()
                      const menuWidth = 172
                      const menuHeight = 36
                      const rawX = event.clientX - (bounds?.left ?? 0)
                      const rawY = event.clientY - (bounds?.top ?? 0)
                      setBoardSlotContextMenu({
                        boardId: board.id,
                        slotIndex,
                        x: Math.max(4, Math.min(rawX, (bounds?.width ?? 400) - menuWidth - 4)),
                        y: Math.max(4, Math.min(rawY, (bounds?.height ?? 400) - menuHeight - 4)),
                      })
                    }}
                  >
                    {slot ? (
                      <img src={slot.iconSrc} alt={slot.label} className="cad-board-slot__icon" draggable={false} />
                    ) : (
                      <span className="cad-board-slot__number">{slotIndex + 1}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {renamingPolygonId ? (() => {
        const polygon = polygons.find((p) => p.id === renamingPolygonId)
        if (!polygon) return null
        const placement = polygonLabelPlacementById[polygon.id] ?? { x: 0, y: 0 }
        const pixelX = placement.x
        const pixelY = placement.y

        return (
          <input
            ref={canvasRenameInputRef}
            className="cad-canvas-label-input"
            style={{ left: pixelX, top: pixelY, width: `${polygonRenameInputWidth}px` }}
            key={renamingPolygonId}
            value={polygonRenameDraft}
            onChange={(event) => setPolygonRenameDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onLabelRenameCommit?.(renamingPolygonId, event.currentTarget.value)
              } else if (event.key === 'Escape') {
                onCancelRename?.()
              }
            }}
            onBlur={(event) => {
              // Ignore the blur generated by the same click that opened the editor.
              if (Date.now() - canvasRenameOpenedAtRef.current < 120) {
                return
              }
              onLabelRenameCommit?.(renamingPolygonId, event.currentTarget.value)
            }}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        )
      })() : null}

      {isAwaitingScaleLine ? (
        <div className="cad-canvas-top-message">Desenhe uma linha para definir a escala</div>
      ) : null}

      {polygons.map((polygon) => {
        if (!polygon.label) {
          return null
        }
        const placement = polygonLabelPlacementById[polygon.id] ?? {
          x: 0,
          y: 0,
          fontSize: POLYGON_LABEL_MAX_FONT_SIZE,
          lineHeight: Math.ceil(POLYGON_LABEL_MAX_FONT_SIZE * POLYGON_LABEL_LINE_HEIGHT_RATIO),
          lines: [polygon.label],
        }
        const pixelX = placement.x
        const pixelY = placement.y

        return (
          <React.Fragment key={`polygon-label-group-${polygon.id}`}>
          <div
            key={`polygon-label-${polygon.id}`}
            className="cad-polygon-label"
            style={{
              left: pixelX,
              top: pixelY,
              fontSize: `${placement.fontSize}px`,
              lineHeight: `${placement.lineHeight}px`,
            }}
            onMouseDown={(event) => {
              if (activeTool !== 'select') return
              event.stopPropagation()
              onLabelClick?.(polygon.id)
            }}
            onContextMenu={(event) => {
              if (activeTool !== 'select') return
              event.preventDefault()
              event.stopPropagation()

              const container = containerRef.current
              if (!container) {
                return
              }

              const bounds = container.getBoundingClientRect()
              const menuWidth = 172
              const menuHeight = 92
              const x = Math.min(event.clientX - bounds.left, bounds.width - menuWidth - 4)
              const y = Math.min(event.clientY - bounds.top, bounds.height - menuHeight - 4)

              onEquipmentSelect?.(null)
              onPolygonContextMenu?.(polygon.id)
              onLabelClick?.(polygon.id)
              setPolygonContextMenu({
                polygonId: polygon.id,
                x: Math.max(4, x),
                y: Math.max(4, y),
              })
            }}
            onDoubleClick={(event) => {
              if (activeTool !== 'select') return
              event.stopPropagation()
              onLabelDoubleClick?.(polygon.id)
            }}
          >
            {placement.lines.join('\n')}
          </div>
          {polygonCeilingHeightById?.[polygon.id] != null ? (
            <div
              key={`polygon-pd-${polygon.id}`}
              className="cad-polygon-label cad-polygon-label--sub"
              style={{
                left: pixelX,
                top: pixelY + placement.lines.length * placement.lineHeight + 2,
                fontSize: `${Math.max(10, placement.fontSize - 2)}px`,
                lineHeight: `${Math.ceil((placement.fontSize - 2) * POLYGON_LABEL_LINE_HEIGHT_RATIO)}px`,
              }}
            >
              {`PD: ${polygonCeilingHeightById[polygon.id]}`}
            </div>
          ) : null}
          </React.Fragment>
        )
      })}

      {polygonContextMenu ? (
        <div
          className="cad-tree-context-menu"
          style={{ left: `${polygonContextMenu.x}px`, top: `${polygonContextMenu.y}px` }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="cad-tree-context-menu__item"
            onClick={() => {
              onPolygonRenameRequest?.(polygonContextMenu.polygonId)
              setPolygonContextMenu(null)
            }}
          >
            <span className="cad-tree-context-menu__label">Renomear</span>
          </button>

          <button
            type="button"
            className="cad-tree-context-menu__item"
            onClick={() => {
              onPolygonEditRequest?.(polygonContextMenu.polygonId)
              setPolygonContextMenu(null)
            }}
          >
            <span className="cad-tree-context-menu__label">Editar</span>
          </button>

          <button
            type="button"
            className="cad-tree-context-menu__item cad-tree-context-menu__item--danger"
            onClick={() => {
              onPolygonDeleteRequest?.(polygonContextMenu.polygonId)
              setPolygonContextMenu(null)
            }}
          >
            <img src={apagarProjeto} alt="" className="cad-tree-context-menu__icon" />
            <span className="cad-tree-context-menu__label">Excluir</span>
          </button>
        </div>
      ) : null}

      {boardSlotContextMenu ? (
        <div
          className="cad-tree-context-menu"
          style={{ left: `${boardSlotContextMenu.x}px`, top: `${boardSlotContextMenu.y}px` }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="cad-tree-context-menu__item"
            onClick={() => {
              onBoardSlotRemove?.({ boardId: boardSlotContextMenu.boardId, slotIndex: boardSlotContextMenu.slotIndex })
              setBoardSlotContextMenu(null)
            }}
          >
            <span className="cad-tree-context-menu__label">Remover dispositivo</span>
          </button>
        </div>
      ) : null}

      {equipmentContextMenu ? (
        <div
          className="cad-tree-context-menu"
          style={{ left: `${equipmentContextMenu.x}px`, top: `${equipmentContextMenu.y}px` }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="cad-tree-context-menu__item"
            onClick={() => {
              onEquipmentRenameRequest?.(equipmentContextMenu.equipmentId)
              setEquipmentContextMenu(null)
            }}
          >
            <span className="cad-tree-context-menu__label">Renomear</span>
          </button>

          <button
            type="button"
            className="cad-tree-context-menu__item"
            onClick={() => {
              onEquipmentPropertiesRequest?.(equipmentContextMenu.equipmentId)
              setEquipmentContextMenu(null)
            }}
          >
            <span className="cad-tree-context-menu__label">Propriedades</span>
          </button>

          <button
            type="button"
            className="cad-tree-context-menu__item cad-tree-context-menu__item--danger"
            onClick={() => {
              onEquipmentDelete?.(equipmentContextMenu.equipmentId)
              setEquipmentContextMenu(null)
            }}
          >
            <img src={apagarProjeto} alt="" className="cad-tree-context-menu__icon" />
            <span className="cad-tree-context-menu__label">Excluir</span>
          </button>
        </div>
      ) : null}

      {boardContextMenu ? (
        <div
          className="cad-tree-context-menu"
          style={{ left: `${boardContextMenu.x}px`, top: `${boardContextMenu.y}px` }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="cad-tree-context-menu__item"
            onClick={() => {
              onBoardRename?.(boardContextMenu.boardId)
              setBoardContextMenu(null)
            }}
          >
            <span className="cad-tree-context-menu__label">Renomear</span>
          </button>
          <button
            type="button"
            className="cad-tree-context-menu__item cad-tree-context-menu__item--danger"
            onClick={() => {
              onBoardDelete?.(boardContextMenu.boardId)
              setBoardContextMenu(null)
            }}
          >
            <img src={apagarProjeto} alt="" className="cad-tree-context-menu__icon" />
            <span className="cad-tree-context-menu__label">Excluir</span>
          </button>
        </div>
      ) : null}

    </div>
  )
}

export default CadCanvas