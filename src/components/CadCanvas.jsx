import { Circle, Ellipse, Group, Layer, Line, Rect, Stage, Text, Wedge, Image as KonvaImage } from 'react-konva'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import apagarProjeto from '../assets/apagar-projeto.svg'
import motorIcon from '../assets/motores.svg'
import pinPadrao from '../assets/pin-padrão.svg'
import pinSelecionado from '../assets/pin-selecionado.svg'
import { EQUIPMENT_WIREFRAMES } from '../data/wireframes'
import { isBoardOnlyItem, isAvOrganizerOnlyItem, WALL_SNAP_CATALOG_IDS, PIR_SENSOR_CATALOG_IDS, OC_SENSOR_CATALOG_IDS } from '../data/equipmentLibrary.js'

const POLYGON_COLOR = '#6BC2F7'
const RULER_COLOR = '#FC4242'
const SELECTED_POLYGON_COLOR = '#0095ff'
const POLYGON_POINT_RADIUS = 4
const POLYGON_POINT_STROKE = 2
const POLYGON_LINE_STROKE = 2
const CLOSE_POLYGON_HIT_DISTANCE = 10
const START_POINT_HIGHLIGHT_RADIUS = 10
const POLYGON_LABEL_MARGIN = 4
const POLYGON_LABEL_MAX_FONT_SIZE = 14
const POLYGON_LABEL_MIN_FONT_SIZE = 10
const POLYGON_LABEL_LINE_HEIGHT_RATIO = 1.2
const EQUIPMENT_HOLD_TO_DRAG_MS = 180
const MIN_ZOOM = 10
const MAX_ZOOM = 1000
const MULTI_ADD_PREVIEW_COLOR = '#0095ff'
const SENSOR_CATALOG_IDS = new Set(['amb-acessorios-1', 'sce-sensores-1', 'sce-sensores-2'])
const SENSOR_FILL_COLOR = '#F5D59D'
const SENSOR_OPENING_ANGLE_HALF_RAD = (50 * Math.PI) / 180
const PIR_RADIUS_METERS = 7
const PIR_CONE_ANGLE_DEG = 90
const OC_DIMENSIONS = {
  baixa:  { depthM: 1,  widthM: 0.667 },
  media:  { depthM: 6,  widthM: 6     },
  alta:   { depthM: 12, widthM: 8     },
}

// Returns { point: {x,y} on wall in norm coords, normal: inward unit vector {x,y} }
function snapToNearestWall(normPoint, polygonNormPoints) {
  const n = polygonNormPoints.length
  let minDist = Infinity
  let bestPoint = normPoint
  let bestNormal = { x: 0, y: -1 }
  const cx = polygonNormPoints.reduce((s, p) => s + p.x, 0) / n
  const cy = polygonNormPoints.reduce((s, p) => s + p.y, 0) / n
  for (let i = 0; i < n; i++) {
    const a = polygonNormPoints[i]
    const b = polygonNormPoints[(i + 1) % n]
    const edgeDx = b.x - a.x
    const edgeDy = b.y - a.y
    const edgeLen2 = edgeDx * edgeDx + edgeDy * edgeDy
    if (edgeLen2 < 1e-12) continue
    const t = Math.max(0, Math.min(1, ((normPoint.x - a.x) * edgeDx + (normPoint.y - a.y) * edgeDy) / edgeLen2))
    const px = a.x + t * edgeDx
    const py = a.y + t * edgeDy
    const dist = Math.hypot(normPoint.x - px, normPoint.y - py)
    if (dist < minDist) {
      minDist = dist
      bestPoint = { x: px, y: py }
      const edgeLen = Math.sqrt(edgeLen2)
      const nx = -edgeDy / edgeLen
      const ny = edgeDx / edgeLen
      bestNormal = (nx * (cx - px) + ny * (cy - py)) >= 0 ? { x: nx, y: ny } : { x: -nx, y: -ny }
    }
  }
  return { point: bestPoint, normal: bestNormal }
}
const ELLIPSE_SEGMENTS = 64
const SHAPE_DRAW_TOOLS = new Set(['rectangle', 'elipse', 'triangle'])
const RUBBER_BAND_MIN_DRAG = 4

// Zoom thresholds for progressive text visibility (in %)
const EQUIP_TEXT_ZOOM_FULL       = 120
const EQUIP_TEXT_ZOOM_TRUNCATED  = 100
const ENV_TEXT_ZOOM_FULL         = 40
const ENV_TEXT_ZOOM_TRUNCATED    = 20

// Equipment label layout constants (px)
const EQUIP_ICON_SIZE = 13
const EQUIP_LABEL_H   = 14
const EQUIP_LABEL_GAP = 3

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

function rectsIntersect(a, b) {
  return a.x1 <= b.x2 && a.x2 >= b.x1 && a.y1 <= b.y2 && a.y2 >= b.y1
}

function computeOverlapArea(a, b) {
  const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  return ox * oy
}

function computeShapeBox(start, cursor, shiftKey, altKey, tool) {
  let dx = cursor.x - start.x
  let dy = cursor.y - start.y

  if (shiftKey) {
    if (tool === 'triangle') {
      dy = Math.abs(dx) * (Math.sqrt(3) / 2) * Math.sign(dy || 1)
    } else {
      const size = Math.min(Math.abs(dx), Math.abs(dy))
      dx = size * Math.sign(dx || 1)
      dy = size * Math.sign(dy || 1)
    }
  }

  if (altKey) {
    return {
      x1: Math.min(start.x - dx, start.x + dx),
      y1: Math.min(start.y - dy, start.y + dy),
      x2: Math.max(start.x - dx, start.x + dx),
      y2: Math.max(start.y - dy, start.y + dy),
    }
  }
  return {
    x1: Math.min(start.x, start.x + dx),
    y1: Math.min(start.y, start.y + dy),
    x2: Math.max(start.x, start.x + dx),
    y2: Math.max(start.y, start.y + dy),
  }
}

function pointsFromShapeBox(box, tool) {
  const { x1, y1, x2, y2 } = box
  if (tool === 'triangle') {
    return [
      { x: x1, y: y2 },
      { x: x2, y: y2 },
      { x: (x1 + x2) / 2, y: y1 },
    ]
  }
  if (tool === 'elipse') {
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    const rx = (x2 - x1) / 2
    const ry = (y2 - y1) / 2
    return Array.from({ length: ELLIPSE_SEGMENTS }, (_, i) => {
      const angle = (2 * Math.PI * i) / ELLIPSE_SEGMENTS
      return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) }
    })
  }
  return [
    { x: x1, y: y1 },
    { x: x2, y: y1 },
    { x: x2, y: y2 },
    { x: x1, y: y2 },
  ]
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
  deletePolygonIds,
  onMultiDeleteRequest,
  alignRequest,
  onEquipmentPointsUpdate,
  onAlignConsumed,
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
  onEquipmentOcSensitivityRequest,
  onEquipmentLabelRenameCommit,
  onCancelRename,
  onPolygonTranslated,
  syncPolygons,
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
  onBoardEdit,
  onBoardLabelDoubleClick,
  onBoardLabelRenameCommit,
  avOrganizers,
  selectedAvOrganizerId,
  renamingAvOrganizerId,
  onAvOrganizerSelect,
  onAvOrganizerPinToggle,
  onAvOrganizerSlotInstall,
  onAvOrganizerSlotRemove,
  onAvOrganizerMove,
  onAvOrganizerRename,
  onAvOrganizerDelete,
  onAvOrganizerEdit,
  onAvOrganizerLabelDoubleClick,
  onAvOrganizerLabelRenameCommit,
  pendingCurtainEquipment,
  placedCurtains,
  selectedCurtainId,
  onCurtainRectDrawn,
  onCurtainCancel,
  onCurtainMotorFlip,
  onCurtainMove,
  onCurtainSelect,
  renamingCurtainId,
  onCurtainRenameRequest,
  onCurtainLabelDoubleClick,
  onCurtainLabelRenameCommit,
  onCurtainDelete,
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
  const [shapeDraftStart, setShapeDraftStart] = useState(null)
  const [shapeDraftCursor, setShapeDraftCursor] = useState(null)
  const [shapeDraftModifiers, setShapeDraftModifiers] = useState({ shiftKey: false, altKey: false })
  const [rubberBand, setRubberBand] = useState(null)
  const [multiSelectedPolygonIds, setMultiSelectedPolygonIds] = useState(new Set())
  const [multiSelectedEquipmentIds, setMultiSelectedEquipmentIds] = useState(new Set())
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
  const [avOrganizerSlotContextMenu, setAvOrganizerSlotContextMenu] = useState(null)
  const [avOrganizerContextMenu, setAvOrganizerContextMenu] = useState(null)
  const [draggingAvOrganizer, setDraggingAvOrganizer] = useState(null)
  const [dragOverAvOrganizerSlot, setDragOverAvOrganizerSlot] = useState(null)
  const avOrganizerHoldTimerRef = useRef(null)
  const [curtainDraftStart, setCurtainDraftStart] = useState(null)
  const [curtainDraftCursor, setCurtainDraftCursor] = useState(null)
  const [draggingCurtain, setDraggingCurtain] = useState(null)
  const curtainHoldTimerRef = useRef(null)
  const [curtainContextMenu, setCurtainContextMenu] = useState(null)
  const [curtainRenameDraft, setCurtainRenameDraft] = useState('')
  const curtainRenameInputRef = useRef(null)
  const curtainRenameOpenedAtRef = useRef(0)
  const [resizingCurtain, setResizingCurtain] = useState(null)
  const avOrganizerRenameInputRef = useRef(null)
  const avOrganizerRenameOpenedAtRef = useRef(0)
  const [avOrganizerRenameDraft, setAvOrganizerRenameDraft] = useState('')
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
    if (!SHAPE_DRAW_TOOLS.has(activeTool)) {
      setShapeDraftStart(null)
      setShapeDraftCursor(null)
      setShapeDraftModifiers({ shiftKey: false, altKey: false })
    }
    if (activeTool !== 'select') {
      setRubberBand(null)
      setMultiSelectedPolygonIds(new Set())
      setMultiSelectedEquipmentIds(new Set())
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
    if (!pendingCurtainEquipment) return undefined
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return
      setCurtainDraftStart(null)
      setCurtainDraftCursor(null)
      onCurtainCancel?.()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [pendingCurtainEquipment, onCurtainCancel])

  useEffect(() => {
    if (!curtainDraftStart || !pendingCurtainEquipment) return undefined
    const handleMouseMove = (event) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      setCurtainDraftCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [curtainDraftStart, pendingCurtainEquipment])

  useEffect(() => {
    if (!renamingCurtainId) return
    curtainRenameOpenedAtRef.current = Date.now()
    const curtain = (placedCurtains ?? []).find((c) => c.id === renamingCurtainId)
    setCurtainRenameDraft(curtain?.label ?? '')
    window.setTimeout(() => curtainRenameInputRef.current?.focus(), 0)
  }, [placedCurtains, renamingCurtainId])

  useEffect(() => {
    if (!resizingCurtain || !fittedBackgroundImage) return undefined
    const handleMove = (event) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      const dx = px - resizingCurtain.startPointerStage.x
      const dy = py - resizingCurtain.startPointerStage.y
      const irs = normToStage(resizingCurtain.initialRectStart, fittedBackgroundImage)
      const ire = normToStage(resizingCurtain.initialRectEnd, fittedBackgroundImage)
      const MIN_PX = 10
      let newSs = { ...irs }
      let newSe = { ...ire }
      const corner = resizingCurtain.corner
      if (corner === 'tl' || corner === 'bl') newSs.x = Math.min(irs.x + dx, ire.x - MIN_PX)
      if (corner === 'tr' || corner === 'br') newSe.x = Math.max(ire.x + dx, irs.x + MIN_PX)
      if (corner === 'tl' || corner === 'tr') newSs.y = Math.min(irs.y + dy, ire.y - MIN_PX)
      if (corner === 'bl' || corner === 'br') newSe.y = Math.max(ire.y + dy, irs.y + MIN_PX)
      setResizingCurtain((r) => ({
        ...r,
        currentRectStart: stageToNorm(newSs, fittedBackgroundImage),
        currentRectEnd:   stageToNorm(newSe, fittedBackgroundImage),
      }))
    }
    const handleUp = () => {
      setResizingCurtain((r) => {
        if (r?.currentRectStart && r?.currentRectEnd) {
          onCurtainMove?.({ curtainId: r.id, rectStart: r.currentRectStart, rectEnd: r.currentRectEnd })
        }
        return null
      })
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [resizingCurtain, fittedBackgroundImage, onCurtainMove])

  useEffect(() => {
    if (!draggingCurtain || !fittedBackgroundImage) return undefined

    const handlePointerMove = (event) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const mouseStage = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      setDraggingCurtain((d) => {
        if (!d) return null
        const origStartStage = normToStage(d.initialRectStart, fittedBackgroundImage)
        const origEndStage = normToStage(d.initialRectEnd, fittedBackgroundImage)
        const newStartX = mouseStage.x - d.dragOffset.x
        const newStartY = mouseStage.y - d.dragOffset.y
        const dx = newStartX - origStartStage.x
        const dy = newStartY - origStartStage.y
        return {
          ...d,
          currentStart: stageToNorm({ x: origStartStage.x + dx, y: origStartStage.y + dy }, fittedBackgroundImage),
          currentEnd:   stageToNorm({ x: origEndStage.x   + dx, y: origEndStage.y   + dy }, fittedBackgroundImage),
        }
      })
    }

    const handlePointerUp = () => {
      setDraggingCurtain((d) => {
        if (!d?.currentStart || !d?.currentEnd) return null
        onCurtainMove?.({ curtainId: d.id, rectStart: d.currentStart, rectEnd: d.currentEnd })
        return null
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [draggingCurtain, fittedBackgroundImage, onCurtainMove])

  useEffect(() => {
    const cancelCurtainHoldOnRelease = () => {
      if (curtainHoldTimerRef.current) {
        window.clearTimeout(curtainHoldTimerRef.current)
        curtainHoldTimerRef.current = null
      }
    }
    window.addEventListener('pointerup', cancelCurtainHoldOnRelease)
    return () => window.removeEventListener('pointerup', cancelCurtainHoldOnRelease)
  }, [])

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

  useEffect(() => {
    if (!renamingAvOrganizerId) {
      setAvOrganizerRenameDraft('')
      return
    }
    avOrganizerRenameOpenedAtRef.current = Date.now()
    const org = avOrganizers?.find((o) => o.id === renamingAvOrganizerId)
    setAvOrganizerRenameDraft(org?.label ?? '')
    const input = avOrganizerRenameInputRef.current
    if (input) {
      input.focus()
      input.select()
    }
  }, [avOrganizers, renamingAvOrganizerId])

  // Sync editing value when rename starts from outside (tree click).
  // Delete selected polygon on Delete/Backspace key (select tool only).
  useEffect(() => {
    if (activeTool !== 'select') return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const hasMultiSelection = multiSelectedPolygonIds.size > 0 || multiSelectedEquipmentIds.size > 0
        if (hasMultiSelection) {
          onMultiDeleteRequest?.([...multiSelectedPolygonIds], [...multiSelectedEquipmentIds])
          setMultiSelectedPolygonIds(new Set())
          setMultiSelectedEquipmentIds(new Set())
          return
        }

        if (selectedEquipmentId && !renamingEquipmentId) {
          onEquipmentDelete?.(selectedEquipmentId)
          return
        }

        if (selectedCurtainId && !renamingCurtainId) {
          onCurtainDelete?.(selectedCurtainId)
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
    multiSelectedPolygonIds,
    multiSelectedEquipmentIds,
    onMultiDeleteRequest,
    selectedEquipmentId,
    renamingEquipmentId,
    selectedCurtainId,
    renamingCurtainId,
    onCurtainDelete,
    selectedPolygonId,
    renamingPolygonId,
    onEquipmentDelete,
    onPolygonDeleteRequest,
  ])

  useEffect(() => {
    if (!rubberBand || !fittedBackgroundImage) return undefined

    const handleMouseUp = () => {
      const { startStage, endStage } = rubberBand
      const dragDist = Math.hypot(endStage.x - startStage.x, endStage.y - startStage.y)

      if (dragDist >= RUBBER_BAND_MIN_DRAG) {
        const rb = {
          x1: Math.min(startStage.x, endStage.x),
          y1: Math.min(startStage.y, endStage.y),
          x2: Math.max(startStage.x, endStage.x),
          y2: Math.max(startStage.y, endStage.y),
        }

        const newPolygonIds = new Set()
        for (const polygon of polygons) {
          const stagePoints = polygon.points.map((p) => normToStage(p, fittedBackgroundImage))
          const b = getPolygonBounds(stagePoints)
          if (rectsIntersect(rb, { x1: b.minX, y1: b.minY, x2: b.maxX, y2: b.maxY })) {
            newPolygonIds.add(polygon.id)
          }
        }
        setMultiSelectedPolygonIds(newPolygonIds)

        const newEquipmentIds = new Set()
        for (const eq of (placedEquipments ?? [])) {
          const pt = normToStage(eq.point, fittedBackgroundImage)
          if (pt.x >= rb.x1 && pt.x <= rb.x2 && pt.y >= rb.y1 && pt.y <= rb.y2) {
            newEquipmentIds.add(eq.id)
          }
        }
        setMultiSelectedEquipmentIds(newEquipmentIds)
      }

      setRubberBand(null)
    }

    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [rubberBand, polygons, fittedBackgroundImage, placedEquipments])

  useEffect(() => {
    if (activeTool !== 'polygon' && !SHAPE_DRAW_TOOLS.has(activeTool)) {
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
      setShapeDraftStart(null)
      setShapeDraftCursor(null)
      setShapeDraftModifiers({ shiftKey: false, altKey: false })
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
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const stagePoint = {
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top,
      }
      const newNorm = stageToNorm(stagePoint, fittedBackgroundImage)

      setDraggingEquipment((currentDrag) => {
        if (!currentDrag) return null

        // Circuit drag: just update anchor position, all members follow via delta
        if (currentDrag.circuitMembers) {
          return { ...currentDrag, point: newNorm }
        }

        const targetPolygon = [...polygons]
          .reverse()
          .find((polygon) => {
            const stagePoints = polygon.points.map((point) => normToStage(point, fittedBackgroundImage))
            return isPointInsidePolygon(stagePoint, stagePoints)
          })

        if (WALL_SNAP_CATALOG_IDS.has(currentDrag.catalogItemId) && targetPolygon?.points?.length >= 2) {
          const snap = snapToNearestWall(newNorm, targetPolygon.points)
          return { ...currentDrag, point: snap.point, polygonId: targetPolygon.id, wallNormal: snap.normal }
        }

        return {
          ...currentDrag,
          point: newNorm,
          polygonId: targetPolygon?.id ?? null,
        }
      })
    }

    const handlePointerUp = () => {
      setDraggingEquipment((currentDrag) => {
        if (!currentDrag) return null

        if (currentDrag.circuitMembers) {
          const dx = currentDrag.point.x - currentDrag.initialAnchorPoint.x
          const dy = currentDrag.point.y - currentDrag.initialAnchorPoint.y
          onEquipmentPointsUpdate?.(
            currentDrag.circuitMembers.map((m) => ({
              id: m.id,
              point: { x: m.initialPoint.x + dx, y: m.initialPoint.y + dy },
            }))
          )
          return null
        }

        if (currentDrag.polygonId) {
          onEquipmentMove?.({
            equipmentId: currentDrag.id,
            point: currentDrag.point,
            polygonId: currentDrag.polygonId,
            wallNormal: currentDrag.wallNormal ?? undefined,
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
  }, [draggingEquipment, fittedBackgroundImage, onEquipmentMove, onEquipmentPointsUpdate, polygons])

  useEffect(() => {
    const cancelBoardHoldOnRelease = () => {
      if (boardHoldTimerRef.current) {
        window.clearTimeout(boardHoldTimerRef.current)
        boardHoldTimerRef.current = null
      }
    }
    window.addEventListener('pointerup', cancelBoardHoldOnRelease)
    return () => window.removeEventListener('pointerup', cancelBoardHoldOnRelease)
  }, [])

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
    const cancel = () => {
      if (avOrganizerHoldTimerRef.current) {
        window.clearTimeout(avOrganizerHoldTimerRef.current)
        avOrganizerHoldTimerRef.current = null
      }
    }
    window.addEventListener('pointerup', cancel)
    return () => window.removeEventListener('pointerup', cancel)
  }, [])

  useEffect(() => {
    if (!draggingAvOrganizer) return undefined
    const handlePointerMove = (event) => {
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!containerRect) return
      const stagePoint = { x: event.clientX - containerRect.left, y: event.clientY - containerRect.top }
      const targetPolygon = [...polygons].reverse().find((polygon) => {
        const stagePoints = polygon.points.map((point) => normToStage(point, fittedBackgroundImage))
        return isPointInsidePolygon(stagePoint, stagePoints)
      })
      setDraggingAvOrganizer((curr) => {
        if (!curr) return null
        return {
          ...curr,
          point: stageToNorm(stagePoint, fittedBackgroundImage),
          polygonId: targetPolygon?.id ?? null,
        }
      })
    }
    const handlePointerUp = () => {
      setDraggingAvOrganizer((curr) => {
        if (curr?.polygonId) {
          onAvOrganizerMove?.({ organizerId: curr.id, point: curr.point, polygonId: curr.polygonId })
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
  }, [draggingAvOrganizer, fittedBackgroundImage, onAvOrganizerMove, polygons])

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
        const shiftPoint = (normPoint) => stageToNorm(
          {
            x: normToStage(normPoint, fittedBackgroundImage).x + draggingPolygon.stageDelta.x,
            y: normToStage(normPoint, fittedBackgroundImage).y + draggingPolygon.stageDelta.y,
          },
          fittedBackgroundImage,
        )
        onPolygonTranslated?.({
          polygonId: draggingPolygon.polygonId,
          newPolygonPoints: draggingPolygon.initialPolygonPoints.map(shiftPoint),
          equipmentPoints: draggingPolygon.initialEquipmentPoints.map((equipment) => ({
            equipmentId: equipment.id,
            point: shiftPoint(equipment.point),
          })),
          boardPoints: (draggingPolygon.initialBoardPoints ?? []).map((board) => ({
            boardId: board.id,
            point: shiftPoint(board.point),
          })),
          avOrganizerPoints: (draggingPolygon.initialAvOrganizerPoints ?? []).map((org) => ({
            avOrganizerId: org.id,
            point: shiftPoint(org.point),
          })),
          curtainRects: (draggingPolygon.initialCurtainRects ?? []).map((c) => ({
            curtainId: c.id,
            rectStart: shiftPoint(c.rectStart),
            rectEnd: shiftPoint(c.rectEnd),
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
    if (!deletePolygonIds?.length) return
    setPolygons((currentPolygons) =>
      currentPolygons.filter((polygon) => !deletePolygonIds.includes(polygon.id)),
    )
  }, [deletePolygonIds])

  useEffect(() => {
    if (!syncPolygons) return
    setPolygons(syncPolygons.polygons)
  }, [syncPolygons])

  useEffect(() => {
    if (!alignRequest) return
    const { direction } = alignRequest

    const hasMultiSelection = multiSelectedPolygonIds.size > 0 || multiSelectedEquipmentIds.size > 0
    if (!hasMultiSelection) return

    // Compute bounds for each selected polygon (normalized coords)
    const selectedPolygonItems = [...multiSelectedPolygonIds].flatMap((polygonId) => {
      const polygon = polygons.find((p) => p.id === polygonId)
      if (!polygon?.points?.length) return []
      return [{ polygonId, polygon, bounds: getPolygonBounds(polygon.points) }]
    })

    // Equipment that is NOT contained in a selected polygon
    const selectedPolygonIdSet = new Set(selectedPolygonItems.map((p) => p.polygonId))
    const selectedEquipmentItems = [...multiSelectedEquipmentIds].flatMap((equipmentId) => {
      const eq = placedEquipments.find((e) => e.id === equipmentId)
      if (!eq) return []
      if (eq.polygonId && selectedPolygonIdSet.has(eq.polygonId)) return []
      return [eq]
    })

    if (!selectedPolygonItems.length && !selectedEquipmentItems.length) return

    // Distribution (espaçar): equal gaps between items along one axis
    if (direction === 'distribute-x' || direction === 'distribute-y') {
      const isX = direction === 'distribute-x'
      const allItems = [
        ...selectedPolygonItems.map(({ polygonId, polygon, bounds }) => ({
          type: 'polygon', id: polygonId, polygon,
          leading: isX ? bounds.minX : bounds.minY,
          trailing: isX ? bounds.maxX : bounds.maxY,
          dx: 0, dy: 0,
        })),
        ...selectedEquipmentItems.map((eq) => ({
          type: 'equipment', id: eq.id, eq,
          leading: isX ? eq.point.x : eq.point.y,
          trailing: isX ? eq.point.x : eq.point.y,
          dx: 0, dy: 0,
        })),
      ]
      if (allItems.length >= 3) {
        allItems.sort((a, b) => a.leading - b.leading)
        const first = allItems[0]
        const last = allItems[allItems.length - 1]
        const middle = allItems.slice(1, -1)
        const totalMiddleSize = middle.reduce((sum, item) => sum + (item.trailing - item.leading), 0)
        const gap = (last.leading - first.trailing - totalMiddleSize) / (middle.length + 1)
        let cursor = first.trailing + gap
        for (const item of middle) {
          const delta = cursor - item.leading
          if (isX) item.dx = delta
          else item.dy = delta
          cursor += (item.trailing - item.leading) + gap
        }
        const polygonUpdates = allItems.filter((item) => item.type === 'polygon' && (item.dx || item.dy))
        if (polygonUpdates.length) {
          setPolygons((current) => current.map((polygon) => {
            const upd = polygonUpdates.find((u) => u.id === polygon.id)
            if (!upd) return polygon
            return { ...polygon, points: polygon.points.map((p) => ({ x: p.x + upd.dx, y: p.y + upd.dy })) }
          }))
          for (const { id: polygonId, dx, dy } of polygonUpdates) {
            const polyRef = polygons.find((p) => p.id === polygonId)
            const eqInPoly = placedEquipments.filter((e) => e.polygonId === polygonId)
            const boardsInPoly = automationBoards.filter((b) => b.polygonId === polygonId)
            const orgsInPoly = avOrganizers.filter((o) => o.polygonId === polygonId)
            onPolygonTranslated?.({
              polygonId,
              newPolygonPoints: polyRef ? polyRef.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) : undefined,
              equipmentPoints: eqInPoly.map((e) => ({ equipmentId: e.id, point: { x: e.point.x + dx, y: e.point.y + dy } })),
              boardPoints: boardsInPoly.map((b) => ({ boardId: b.id, point: { x: b.point.x + dx, y: b.point.y + dy } })),
              avOrganizerPoints: orgsInPoly.map((o) => ({ avOrganizerId: o.id, point: { x: o.point.x + dx, y: o.point.y + dy } })),
            })
          }
        }
        const eqUpdates = allItems.filter((item) => item.type === 'equipment' && (item.dx || item.dy))
        if (eqUpdates.length) {
          onEquipmentPointsUpdate?.(eqUpdates.map(({ id, eq, dx, dy }) => ({
            id, point: { x: eq.point.x + dx, y: eq.point.y + dy },
          })))
        }
      }
      onAlignConsumed?.()
      return
    }

    // Collect all bounds to find reference edge
    const allBounds = [
      ...selectedPolygonItems.map(({ bounds }) => bounds),
      ...selectedEquipmentItems.map((eq) => ({
        minX: eq.point.x, maxX: eq.point.x, minY: eq.point.y, maxY: eq.point.y,
      })),
    ]

    let refValue
    if (direction === 'left') refValue = Math.min(...allBounds.map((b) => b.minX))
    else if (direction === 'right') refValue = Math.max(...allBounds.map((b) => b.maxX))
    else if (direction === 'top') refValue = Math.min(...allBounds.map((b) => b.minY))
    else if (direction === 'bottom') refValue = Math.max(...allBounds.map((b) => b.maxY))
    else if (direction === 'center-x') refValue = (Math.min(...allBounds.map((b) => b.minX)) + Math.max(...allBounds.map((b) => b.maxX))) / 2
    else refValue = (Math.min(...allBounds.map((b) => b.minY)) + Math.max(...allBounds.map((b) => b.maxY))) / 2

    // Translate polygons
    if (selectedPolygonItems.length) {
      const polygonDeltas = selectedPolygonItems.map(({ polygonId, bounds }) => {
        let dx = 0
        let dy = 0
        if (direction === 'left') dx = refValue - bounds.minX
        else if (direction === 'right') dx = refValue - bounds.maxX
        else if (direction === 'top') dy = refValue - bounds.minY
        else if (direction === 'bottom') dy = refValue - bounds.maxY
        else if (direction === 'center-x') dx = refValue - (bounds.minX + bounds.maxX) / 2
        else dy = refValue - (bounds.minY + bounds.maxY) / 2
        return { polygonId, dx, dy }
      })

      setPolygons((current) => current.map((polygon) => {
        const delta = polygonDeltas.find((d) => d.polygonId === polygon.id)
        if (!delta || (!delta.dx && !delta.dy)) return polygon
        return {
          ...polygon,
          points: polygon.points.map((p) => ({ x: p.x + delta.dx, y: p.y + delta.dy })),
        }
      }))

      for (const { polygonId, dx, dy } of polygonDeltas) {
        if (!dx && !dy) continue
        const polyRef = polygons.find((p) => p.id === polygonId)
        const eqInPoly = placedEquipments.filter((e) => e.polygonId === polygonId)
        const boardsInPoly = automationBoards.filter((b) => b.polygonId === polygonId)
        const orgsInPoly = avOrganizers.filter((o) => o.polygonId === polygonId)
        onPolygonTranslated?.({
          polygonId,
          newPolygonPoints: polyRef ? polyRef.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) : undefined,
          equipmentPoints: eqInPoly.map((e) => ({ equipmentId: e.id, point: { x: e.point.x + dx, y: e.point.y + dy } })),
          boardPoints: boardsInPoly.map((b) => ({ boardId: b.id, point: { x: b.point.x + dx, y: b.point.y + dy } })),
          avOrganizerPoints: orgsInPoly.map((o) => ({ avOrganizerId: o.id, point: { x: o.point.x + dx, y: o.point.y + dy } })),
        })
      }
    }

    // Translate standalone equipment
    if (selectedEquipmentItems.length) {
      const updates = selectedEquipmentItems.map((eq) => {
        const movesX = direction === 'left' || direction === 'right' || direction === 'center-x'
        const newPoint = movesX
          ? { x: refValue, y: eq.point.y }
          : { x: eq.point.x, y: refValue }
        return { id: eq.id, point: newPoint }
      })
      onEquipmentPointsUpdate?.(updates)
    }

    onAlignConsumed?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alignRequest])

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

  const handleStageMouseDown = (e) => {
    if (tryHandleMultiAddClick()) {
      return
    }

    if (activeTool === 'select') {
      if (e?.evt?.shiftKey) {
        // Shift+click on empty canvas: preserve existing multi-selection
        onEquipmentSelect?.(null)
        onCanvasBackgroundClick?.()
        return
      }

      // Clear multi-selection and start rubber band
      setMultiSelectedPolygonIds(new Set())
      setMultiSelectedEquipmentIds(new Set())
      onEquipmentSelect?.(null)
      onCanvasBackgroundClick?.()

      if (fittedBackgroundImage) {
        const stage = stageRef.current
        const rawPoint = toStagePoint(stage)
        if (rawPoint) {
          setRubberBand({ startStage: rawPoint, endStage: rawPoint })
        }
      }
      return
    }

    const stage = stageRef.current
    const rawPoint = toStagePoint(stage)

    if (!rawPoint) {
      return
    }

    const normPoint = stageToNorm(rawPoint, fittedBackgroundImage)

    if (SHAPE_DRAW_TOOLS.has(activeTool)) {
      if (!hasScaleDefinition) {
        return
      }

      const mods = { shiftKey: e?.evt?.shiftKey ?? false, altKey: e?.evt?.altKey ?? false }

      if (!shapeDraftStart) {
        setShapeDraftStart(normPoint)
        setShapeDraftCursor(normPoint)
        setShapeDraftModifiers(mods)
        return
      }

      // Second click — compute in stage space so the Shift constraint is visually consistent
      // with the preview (which also runs in stage space). Then convert back to normalized.
      const startStage = normToStage(shapeDraftStart, fittedBackgroundImage)
      const cursorStage = normToStage(normPoint, fittedBackgroundImage)
      const box = computeShapeBox(startStage, cursorStage, mods.shiftKey, mods.altKey, activeTool)
      const shapePoints = pointsFromShapeBox(box, activeTool)
        .map((p) => stageToNorm(p, fittedBackgroundImage))
      const polygonId = `polygon-${Date.now()}-${Math.round(startStage.x)}-${Math.round(startStage.y)}`
      const completedPolygon = {
        id: polygonId,
        points: shapePoints,
        color: POLYGON_COLOR,
        label: '',
      }
      setPolygons((current) => [...current, completedPolygon])
      onPolygonCreated?.(completedPolygon)
      setShapeDraftStart(null)
      setShapeDraftCursor(null)
      setShapeDraftModifiers({ shiftKey: false, altKey: false })
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

    // Shift+click: toggle polygon in multi-selection
    if (event.evt.shiftKey) {
      setMultiSelectedPolygonIds((prev) => {
        const next = new Set(prev)
        if (next.has(polygonId)) next.delete(polygonId)
        else next.add(polygonId)
        return next
      })
      return
    }

    // Regular click: clear multi-selection, proceed with single select
    setMultiSelectedPolygonIds(new Set())
    setMultiSelectedEquipmentIds(new Set())
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
          initialBoardPoints: (automationBoards ?? [])
            .filter((board) => board.polygonId === polygonId)
            .map((board) => ({ id: board.id, point: board.point })),
          initialAvOrganizerPoints: (avOrganizers ?? [])
            .filter((org) => org.polygonId === polygonId)
            .map((org) => ({ id: org.id, point: org.point })),
          initialCurtainRects: (placedCurtains ?? [])
            .filter((c) => c.polygonId === polygonId)
            .map((c) => ({ id: c.id, rectStart: c.rectStart, rectEnd: c.rectEnd })),
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

  const getEquipmentDragPoint = (eq) => {
    if (draggingEquipment?.id === eq.id) return draggingEquipment.point
    if (draggingEquipment?.circuitMembers) {
      const member = draggingEquipment.circuitMembers.find((m) => m.id === eq.id)
      if (member) {
        return {
          x: member.initialPoint.x + (draggingEquipment.point.x - draggingEquipment.initialAnchorPoint.x),
          y: member.initialPoint.y + (draggingEquipment.point.y - draggingEquipment.initialAnchorPoint.y),
        }
      }
    }
    return eq.point
  }

  const handleEquipmentMouseDown = (event, equipment) => {
    if (activeTool !== 'select') return
    if (event.button !== 0) return
    event.stopPropagation()

    // Always cancel pending hold timer on new mousedown
    if (equipmentHoldTimerRef.current) {
      window.clearTimeout(equipmentHoldTimerRef.current)
      equipmentHoldTimerRef.current = null
    }

    // Circuit double-click: isolate this lamp for individual drag
    if (equipment.circuitId && event.detail >= 2) {
      setMultiSelectedPolygonIds(new Set())
      setMultiSelectedEquipmentIds(new Set())
      onEquipmentSelect?.(equipment.id)
      return
    }

    // Circuit single click: select all members + start circuit drag hold timer
    // Exception: lamp was isolated by double-click (selectedEquipmentId === this lamp, no multi-selection)
    // → treat as regular individual equipment so hold-drag moves only this one
    const isCircuitSolo = equipment.circuitId
      && selectedEquipmentId === equipment.id
      && multiSelectedEquipmentIds.size === 0

    if (equipment.circuitId && !isCircuitSolo) {
      const circuitMembers = (placedEquipments ?? []).filter((eq) => eq.circuitId === equipment.circuitId)
      const leader = circuitMembers.find((eq) => eq.isCircuitLeader) ?? circuitMembers[0]
      setMultiSelectedPolygonIds(new Set())
      setMultiSelectedEquipmentIds(new Set(circuitMembers.map((eq) => eq.id)))
      onEquipmentSelect?.(leader?.id ?? equipment.id)

      const container = containerRef.current
      if (!container) return
      const containerRect = container.getBoundingClientRect()
      const stagePoint = { x: event.clientX - containerRect.left, y: event.clientY - containerRect.top }
      const anchorNormPoint = stageToNorm(stagePoint, fittedBackgroundImage)

      equipmentHoldTimerRef.current = window.setTimeout(() => {
        setDraggingEquipment({
          id: equipment.id,
          point: anchorNormPoint,
          polygonId: equipment.polygonId,
          catalogItemId: equipment.catalogItemId,
          wallNormal: equipment.wallNormal ?? null,
          circuitMembers: circuitMembers.map((eq) => ({ id: eq.id, initialPoint: { ...eq.point }, polygonId: eq.polygonId })),
          initialAnchorPoint: anchorNormPoint,
        })
        equipmentHoldTimerRef.current = null
      }, EQUIPMENT_HOLD_TO_DRAG_MS)
      return
    }

    // Shift+click: toggle equipment in multi-selection
    if (event.shiftKey) {
      setMultiSelectedEquipmentIds((prev) => {
        const next = new Set(prev)
        if (next.has(equipment.id)) next.delete(equipment.id)
        else next.add(equipment.id)
        return next
      })
      return
    }

    // Regular click: clear multi-selection, proceed with single select
    setMultiSelectedPolygonIds(new Set())
    setMultiSelectedEquipmentIds(new Set())

    if (selectedEquipmentId !== equipment.id) {
      onEquipmentSelect?.(equipment.id)
      return
    }

    if (event.detail >= 2) return

    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const stagePoint = {
      x: event.clientX - containerRect.left,
      y: event.clientY - containerRect.top,
    }

    equipmentHoldTimerRef.current = window.setTimeout(() => {
      setDraggingEquipment({
        id: equipment.id,
        point: stageToNorm(stagePoint, fittedBackgroundImage),
        polygonId: equipment.polygonId,
        catalogItemId: equipment.catalogItemId,
        wallNormal: equipment.wallNormal ?? null,
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
    const isDynamic = (automationBoards ?? []).find((b) => b.id === boardId)?.slotCount === null
    const bounds = container.getBoundingClientRect()
    const menuWidth = 172
    const menuHeight = isDynamic ? 90 : 60
    const x = Math.min(event.clientX - bounds.left, bounds.width - menuWidth - 4)
    const y = Math.min(event.clientY - bounds.top, bounds.height - menuHeight - 4)
    setEquipmentContextMenu(null)
    setPolygonContextMenu(null)
    setBoardSlotContextMenu(null)
    setBoardContextMenu({
      boardId,
      isDynamic,
      x: Math.max(4, x),
      y: Math.max(4, y),
    })
  }

  const handleAvOrganizerMouseDown = (event, org) => {
    if (activeTool !== 'select') return
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()

    if (selectedAvOrganizerId !== org.id) {
      onAvOrganizerSelect?.(org.id)
      return
    }

    if (event.detail >= 2) return

    const container = containerRef.current
    if (!container) return
    const bounds = container.getBoundingClientRect()
    const stagePoint = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }

    if (avOrganizerHoldTimerRef.current) window.clearTimeout(avOrganizerHoldTimerRef.current)

    avOrganizerHoldTimerRef.current = window.setTimeout(() => {
      setDraggingAvOrganizer({
        id: org.id,
        point: stageToNorm(stagePoint, fittedBackgroundImage),
        polygonId: org.polygonId,
      })
      avOrganizerHoldTimerRef.current = null
    }, EQUIPMENT_HOLD_TO_DRAG_MS)
  }

  const openAvOrganizerContextMenu = (event, organizerId) => {
    if (activeTool !== 'select') return
    const container = containerRef.current
    if (!container) return
    event.preventDefault()
    event.stopPropagation()
    const bounds = container.getBoundingClientRect()
    const menuWidth = 172
    const menuHeight = 90
    const x = Math.min(event.clientX - bounds.left, bounds.width - menuWidth - 4)
    const y = Math.min(event.clientY - bounds.top, bounds.height - menuHeight - 4)
    setEquipmentContextMenu(null)
    setPolygonContextMenu(null)
    setAvOrganizerSlotContextMenu(null)
    setAvOrganizerContextMenu({
      organizerId,
      x: Math.max(4, x),
      y: Math.max(4, y),
    })
  }

  const openCurtainContextMenu = (event, curtainId) => {
    if (activeTool !== 'select') return
    const container = containerRef.current
    if (!container) return
    event.preventDefault()
    event.stopPropagation()
    const bounds = container.getBoundingClientRect()
    const menuWidth = 172
    const menuHeight = 126
    const x = Math.min(event.clientX - bounds.left, bounds.width - menuWidth - 4)
    const y = Math.min(event.clientY - bounds.top, bounds.height - menuHeight - 4)
    setEquipmentContextMenu(null)
    setPolygonContextMenu(null)
    setAvOrganizerContextMenu(null)
    setCurtainContextMenu({ curtainId, x: Math.max(4, x), y: Math.max(4, y) })
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

  const handleStageMouseMove = (e) => {
    if (rubberBand) {
      const stage = stageRef.current
      const rawPoint = toStagePoint(stage)
      if (rawPoint) {
        setRubberBand((prev) => prev ? { ...prev, endStage: rawPoint } : null)
      }
      return
    }

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

    if (SHAPE_DRAW_TOOLS.has(activeTool)) {
      if (!hasScaleDefinition || !shapeDraftStart) return
      const stage = stageRef.current
      const rawPoint = toStagePoint(stage)
      if (!rawPoint) return
      setShapeDraftCursor(stageToNorm(rawPoint, fittedBackgroundImage))
      setShapeDraftModifiers({ shiftKey: e?.evt?.shiftKey ?? false, altKey: e?.evt?.altKey ?? false })
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
    if (pendingCurtainEquipment && fittedBackgroundImage && event.button === 0) {
      const container = containerRef.current
      if (container) {
        const rect = container.getBoundingClientRect()
        const stagePoint = { x: event.clientX - rect.left, y: event.clientY - rect.top }
        if (!curtainDraftStart) {
          setCurtainDraftStart(stagePoint)
          setCurtainDraftCursor(stagePoint)
        } else {
          const stageW = Math.abs(stagePoint.x - curtainDraftStart.x)
          const stageH = Math.abs(stagePoint.y - curtainDraftStart.y)
          if (stageW > 4 && stageH > 4) {
            const normStart = stageToNorm(curtainDraftStart, fittedBackgroundImage)
            const normEnd = stageToNorm(stagePoint, fittedBackgroundImage)
            onCurtainRectDrawn?.({
              rectStart: { x: Math.min(normStart.x, normEnd.x), y: Math.min(normStart.y, normEnd.y) },
              rectEnd:   { x: Math.max(normStart.x, normEnd.x), y: Math.max(normStart.y, normEnd.y) },
            })
          }
          setCurtainDraftStart(null)
          setCurtainDraftCursor(null)
        }
      }
      event.preventDefault()
      event.stopPropagation()
      return
    }

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

    const catalogItemId = equipment.catalogItemId ?? equipment.id
    let normPoint = stageToNorm(droppedStagePoint, fittedBackgroundImage)
    let wallNormal = null

    if (WALL_SNAP_CATALOG_IDS.has(catalogItemId) && targetPolygon.points.length >= 2) {
      const snap = snapToNearestWall(normPoint, targetPolygon.points)
      normPoint = snap.point
      wallNormal = snap.normal
    }

    onEquipmentDrop?.({
      polygonId: targetPolygon.id,
      point: normPoint,
      wallNormal,
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
  const curtainRenameInputWidth = useMemo(
    () => Math.max(16, Math.ceil(measureLabelText(curtainRenameDraft || ' ', 11)) + 10),
    [curtainRenameDraft],
  )

  const equipLabelStage = zoom >= EQUIP_TEXT_ZOOM_FULL ? 'full'
    : zoom >= EQUIP_TEXT_ZOOM_TRUNCATED ? 'truncated' : 'hidden'

  const envLabelStage = zoom >= ENV_TEXT_ZOOM_FULL ? 'full'
    : zoom >= ENV_TEXT_ZOOM_TRUNCATED ? 'truncated' : 'hidden'

  // Computes optimal label position (relative to the 13×13 equipment div) for each visible equipment.
  // Tries 8 candidate positions (spec order: below, above, right, left, br, bl, tr, tl),
  // picks the first that fits inside the polygon without colliding with already-placed labels.
  const equipmentLabelOffsets = useMemo(() => {
    if (!fittedBackgroundImage || equipLabelStage === 'hidden' || equipmentFilters?.text === false) return {}
    const HALF = EQUIP_ICON_SIZE / 2  // 6.5
    const result = {}

    // Group by polygonId so collision detection is per-environment
    const byPolygon = new Map()
    for (const eq of (placedEquipments ?? [])) {
      if (!isEquipmentIconVisible(eq, equipmentFilters)) continue
      const key = eq.polygonId ?? '__none__'
      if (!byPolygon.has(key)) byPolygon.set(key, [])
      byPolygon.get(key).push(eq)
    }

    for (const [polygonId, eqs] of byPolygon) {
      const polygon = polygons.find((p) => p.id === polygonId)
      const polyPts = polygon ? polygon.points.map((p) => normToStage(p, fittedBackgroundImage)) : null

      // Pre-compute stage positions to avoid repeated conversions in inner loops
      const stagePts = eqs.map((eq) => normToStage(eq.point, fittedBackgroundImage))

      const placedBoxes = []  // bboxes of already-committed labels

      eqs.forEach((eq, idx) => {
        const cx = stagePts[idx].x
        const cy = stagePts[idx].y
        const rawW = Math.ceil(measureLabelText(eq.label, 11))

        // In truncated mode, scale the label width proportionally to zoom
        const truncRatio = equipLabelStage === 'truncated'
          ? (zoom - EQUIP_TEXT_ZOOM_TRUNCATED) / (EQUIP_TEXT_ZOOM_FULL - EQUIP_TEXT_ZOOM_TRUNCATED)
          : 1
        const maxW = Math.max(20, Math.round(rawW * truncRatio))
        const w = Math.min(rawW, maxW)

        // 8 candidate positions: { left, top } relative to icon div top-left, + stage bbox
        const candidates = [
          // 1. Below
          { left: HALF - w / 2,             top: EQUIP_ICON_SIZE + EQUIP_LABEL_GAP,
            bbox: { x: cx - w / 2,           y: cy + HALF + EQUIP_LABEL_GAP, w, h: EQUIP_LABEL_H } },
          // 2. Above
          { left: HALF - w / 2,             top: -EQUIP_LABEL_H - EQUIP_LABEL_GAP,
            bbox: { x: cx - w / 2,           y: cy - HALF - EQUIP_LABEL_GAP - EQUIP_LABEL_H, w, h: EQUIP_LABEL_H } },
          // 3. Right (current default)
          { left: EQUIP_ICON_SIZE + EQUIP_LABEL_GAP, top: HALF - EQUIP_LABEL_H / 2,
            bbox: { x: cx + HALF + EQUIP_LABEL_GAP, y: cy - EQUIP_LABEL_H / 2, w, h: EQUIP_LABEL_H } },
          // 4. Left
          { left: -w - EQUIP_LABEL_GAP,     top: HALF - EQUIP_LABEL_H / 2,
            bbox: { x: cx - HALF - EQUIP_LABEL_GAP - w, y: cy - EQUIP_LABEL_H / 2, w, h: EQUIP_LABEL_H } },
          // 5. Bottom-right
          { left: EQUIP_ICON_SIZE + EQUIP_LABEL_GAP, top: EQUIP_ICON_SIZE + EQUIP_LABEL_GAP,
            bbox: { x: cx + HALF + EQUIP_LABEL_GAP, y: cy + HALF + EQUIP_LABEL_GAP, w, h: EQUIP_LABEL_H } },
          // 6. Bottom-left
          { left: -w - EQUIP_LABEL_GAP,     top: EQUIP_ICON_SIZE + EQUIP_LABEL_GAP,
            bbox: { x: cx - HALF - EQUIP_LABEL_GAP - w, y: cy + HALF + EQUIP_LABEL_GAP, w, h: EQUIP_LABEL_H } },
          // 7. Top-right
          { left: EQUIP_ICON_SIZE + EQUIP_LABEL_GAP, top: -EQUIP_LABEL_H - EQUIP_LABEL_GAP,
            bbox: { x: cx + HALF + EQUIP_LABEL_GAP, y: cy - HALF - EQUIP_LABEL_GAP - EQUIP_LABEL_H, w, h: EQUIP_LABEL_H } },
          // 8. Top-left
          { left: -w - EQUIP_LABEL_GAP,     top: -EQUIP_LABEL_H - EQUIP_LABEL_GAP,
            bbox: { x: cx - HALF - EQUIP_LABEL_GAP - w, y: cy - HALF - EQUIP_LABEL_GAP - EQUIP_LABEL_H, w, h: EQUIP_LABEL_H } },
        ]

        let best = candidates[2]   // fallback: right
        let bestOverlap = Infinity

        for (const cand of candidates) {
          // Polygon containment: all 4 bbox corners must be inside the polygon
          if (polyPts) {
            const b = cand.bbox
            const corners = [
              { x: b.x, y: b.y }, { x: b.x + b.w, y: b.y },
              { x: b.x, y: b.y + b.h }, { x: b.x + b.w, y: b.y + b.h },
            ]
            if (!corners.every((c) => isPointInsidePolygon(c, polyPts))) continue
          }

          // Overlap against already-placed labels
          let overlap = 0
          for (const box of placedBoxes) overlap += computeOverlapArea(cand.bbox, box)

          // Overlap against sibling icon bboxes
          for (let j = 0; j < eqs.length; j++) {
            if (j === idx) continue
            overlap += computeOverlapArea(cand.bbox, {
              x: stagePts[j].x - HALF, y: stagePts[j].y - HALF, w: EQUIP_ICON_SIZE, h: EQUIP_ICON_SIZE,
            })
          }

          if (overlap === 0) { best = cand; break }
          if (overlap < bestOverlap) { bestOverlap = overlap; best = cand }
        }

        result[eq.id] = { left: best.left, top: best.top, maxWidth: maxW }
        placedBoxes.push(best.bbox)
      })
    }

    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedEquipments, polygons, fittedBackgroundImage, equipLabelStage, zoom, equipmentFilters])
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
      className={`cad-canvas-shell${activeTool === 'move' ? ' is-pan-tool' : ''}${SHAPE_DRAW_TOOLS.has(activeTool) || activeTool === 'polygon' || activeTool === 'ruler' ? ' is-draw-tool' : ''}${isMiddlePanning ? ' is-panning' : ''}${multiAddDraft ? ' is-multi-add' : ''}${pendingCurtainEquipment ? ' is-curtain-draw' : ''}`}
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
              const isSelected = activeTool === 'select' && (polygon.id === selectedPolygonId || multiSelectedPolygonIds.has(polygon.id))
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

            {fittedBackgroundImage ? (() => {
              const circuits = new Map()
              for (const equipment of (placedEquipments ?? [])) {
                if (!equipment.circuitId || !isEquipmentIconVisible(equipment, equipmentFilters)) continue
                if (!circuits.has(equipment.circuitId)) circuits.set(equipment.circuitId, [])
                circuits.get(equipment.circuitId).push(equipment)
              }
              return [...circuits.entries()].map(([cid, members]) => {
                const points = members.flatMap((eq) => {
                  const normPoint = getEquipmentDragPoint(eq)
                  const base = normToStage(normPoint, fittedBackgroundImage)
                  const stagePoint = draggingPolygon?.polygonId === eq.polygonId
                    ? { x: base.x + (draggingPolygon.stageDelta?.x ?? 0), y: base.y + (draggingPolygon.stageDelta?.y ?? 0) }
                    : base
                  return [stagePoint.x, stagePoint.y]
                })
                return (
                  <Line
                    key={cid}
                    points={points}
                    stroke="rgba(120, 180, 255, 0.6)"
                    strokeWidth={2}
                    listening={false}
                  />
                )
              })
            })() : null}

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
                const sensorNormPoint = getEquipmentDragPoint(equipment)
                const sensorBaseStage = normToStage(sensorNormPoint, fittedBackgroundImage)
                const sensorStage = draggingPolygon?.polygonId === equipment.polygonId
                  ? {
                      x: sensorBaseStage.x + (draggingPolygon.stageDelta?.x ?? 0),
                      y: sensorBaseStage.y + (draggingPolygon.stageDelta?.y ?? 0),
                    }
                  : sensorBaseStage
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
                      strokeWidth={2}
                      listening={false}
                    />
                  </Group>
                )
              }) : null}

            {scaleDefinition ? (placedEquipments ?? [])
              .filter((equipment) =>
                PIR_SENSOR_CATALOG_IDS.has(equipment.catalogItemId) &&
                isEquipmentIconVisible(equipment, equipmentFilters)
              )
              .map((equipment) => {
                const polygon = polygons.find((p) => p.id === equipment.polygonId)
                if (!polygon?.points?.length) return null
                const wn = draggingEquipment?.id === equipment.id && draggingEquipment?.wallNormal
                  ? draggingEquipment.wallNormal
                  : equipment.wallNormal
                if (!wn) return null
                const imageNaturalWidth = loadedBackgroundImage?.naturalWidth || loadedBackgroundImage?.width || 1
                const stagePixelsPerMeter = scaleDefinition.pixelsPerMeter * (fittedBackgroundImage.width / imageNaturalWidth)
                const radiusPixels = PIR_RADIUS_METERS * stagePixelsPerMeter
                const normPoint = getEquipmentDragPoint(equipment)
                const baseStage = normToStage(normPoint, fittedBackgroundImage)
                const stagePoint = draggingPolygon?.polygonId === equipment.polygonId
                  ? { x: baseStage.x + (draggingPolygon.stageDelta?.x ?? 0), y: baseStage.y + (draggingPolygon.stageDelta?.y ?? 0) }
                  : baseStage
                const wallAngleDeg = Math.atan2(wn.y, wn.x) * (180 / Math.PI)
                const polyStagePoints = polygon.points.map((p) => {
                  const sp = normToStage(p, fittedBackgroundImage)
                  return draggingPolygon?.polygonId === polygon.id
                    ? { x: sp.x + (draggingPolygon.stageDelta?.x ?? 0), y: sp.y + (draggingPolygon.stageDelta?.y ?? 0) }
                    : sp
                })
                return (
                  <Group
                    key={`pir-${equipment.id}`}
                    clipFunc={(ctx) => {
                      ctx.beginPath()
                      polyStagePoints.forEach(({ x, y }, i) => { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y) })
                      ctx.closePath()
                    }}
                    listening={false}
                  >
                    <Wedge
                      x={stagePoint.x}
                      y={stagePoint.y}
                      radius={radiusPixels}
                      angle={PIR_CONE_ANGLE_DEG}
                      rotation={wallAngleDeg - PIR_CONE_ANGLE_DEG / 2}
                      fill={hexToRgba(SENSOR_FILL_COLOR, 0.25)}
                      stroke={SENSOR_FILL_COLOR}
                      strokeWidth={2}
                      listening={false}
                    />
                  </Group>
                )
              }) : null}

            {scaleDefinition ? (placedEquipments ?? [])
              .filter((equipment) =>
                OC_SENSOR_CATALOG_IDS.has(equipment.catalogItemId) &&
                isEquipmentIconVisible(equipment, equipmentFilters) &&
                equipment.ocSensitivity
              )
              .map((equipment) => {
                const polygon = polygons.find((p) => p.id === equipment.polygonId)
                if (!polygon?.points?.length) return null
                const wn = draggingEquipment?.id === equipment.id && draggingEquipment?.wallNormal
                  ? draggingEquipment.wallNormal
                  : equipment.wallNormal
                if (!wn) return null
                const dims = OC_DIMENSIONS[equipment.ocSensitivity] ?? OC_DIMENSIONS.media
                const imageNaturalWidth = loadedBackgroundImage?.naturalWidth || loadedBackgroundImage?.width || 1
                const stagePixelsPerMeter = scaleDefinition.pixelsPerMeter * (fittedBackgroundImage.width / imageNaturalWidth)
                const radiusXPx = (dims.widthM / 2) * stagePixelsPerMeter
                const radiusYPx = (dims.depthM / 2) * stagePixelsPerMeter
                const normPoint = getEquipmentDragPoint(equipment)
                const baseStage = normToStage(normPoint, fittedBackgroundImage)
                const stagePoint = draggingPolygon?.polygonId === equipment.polygonId
                  ? { x: baseStage.x + (draggingPolygon.stageDelta?.x ?? 0), y: baseStage.y + (draggingPolygon.stageDelta?.y ?? 0) }
                  : baseStage
                const wallAngleDeg = Math.atan2(wn.y, wn.x) * (180 / Math.PI)
                const polyStagePoints = polygon.points.map((p) => {
                  const sp = normToStage(p, fittedBackgroundImage)
                  return draggingPolygon?.polygonId === polygon.id
                    ? { x: sp.x + (draggingPolygon.stageDelta?.x ?? 0), y: sp.y + (draggingPolygon.stageDelta?.y ?? 0) }
                    : sp
                })
                return (
                  <Group
                    key={`oc-${equipment.id}`}
                    clipFunc={(ctx) => {
                      ctx.beginPath()
                      polyStagePoints.forEach(({ x, y }, i) => { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y) })
                      ctx.closePath()
                    }}
                    listening={false}
                  >
                    <Ellipse
                      x={stagePoint.x + wn.x * radiusYPx}
                      y={stagePoint.y + wn.y * radiusYPx}
                      radiusX={radiusXPx}
                      radiusY={radiusYPx}
                      rotation={wallAngleDeg - 90}
                      fill={hexToRgba(SENSOR_FILL_COLOR, 0.25)}
                      stroke={SENSOR_FILL_COLOR}
                      strokeWidth={2}
                      listening={false}
                    />
                  </Group>
                )
              }) : null}

            {rubberBand ? (() => {
              const { startStage, endStage } = rubberBand
              const rbW = Math.abs(endStage.x - startStage.x)
              const rbH = Math.abs(endStage.y - startStage.y)
              if (Math.hypot(rbW, rbH) < RUBBER_BAND_MIN_DRAG) return null
              return (
                <Rect
                  x={Math.min(startStage.x, endStage.x)}
                  y={Math.min(startStage.y, endStage.y)}
                  width={rbW}
                  height={rbH}
                  stroke={SELECTED_POLYGON_COLOR}
                  strokeWidth={1}
                  fill={hexToRgba(SELECTED_POLYGON_COLOR, 0.08)}
                  dash={[4, 3]}
                  listening={false}
                />
              )
            })() : null}

            {shapeDraftStart && shapeDraftCursor ? (() => {
              const startStage = normToStage(shapeDraftStart, fittedBackgroundImage)
              const cursorStage = normToStage(shapeDraftCursor, fittedBackgroundImage)
              const box = computeShapeBox(startStage, cursorStage, shapeDraftModifiers.shiftKey, shapeDraftModifiers.altKey, activeTool)
              const previewPoints = pointsFromShapeBox(box, activeTool)
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
                    x={startStage.x}
                    y={startStage.y}
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

            {curtainDraftStart && curtainDraftCursor && pendingCurtainEquipment ? (
              <Rect
                x={Math.min(curtainDraftStart.x, curtainDraftCursor.x)}
                y={Math.min(curtainDraftStart.y, curtainDraftCursor.y)}
                width={Math.abs(curtainDraftCursor.x - curtainDraftStart.x)}
                height={Math.abs(curtainDraftCursor.y - curtainDraftStart.y)}
                stroke="#888888"
                strokeWidth={2}
                dash={[6, 4]}
                fill={hexToRgba('#888888', 0.08)}
                listening={false}
              />
            ) : null}
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
        const visiblePoint = (() => {
          const _dragPoint = getEquipmentDragPoint(equipment)
          if (_dragPoint !== equipment.point) return _dragPoint
          if (draggingPolygon?.polygonId === equipment.polygonId) {
            const initial = draggingPolygon.initialEquipmentPoints?.find((e) => e.id === equipment.id)
            if (initial) {
              return stageToNorm(
                {
                  x: normToStage(initial.point, fittedBackgroundImage).x + draggingPolygon.stageDelta.x,
                  y: normToStage(initial.point, fittedBackgroundImage).y + draggingPolygon.stageDelta.y,
                },
                fittedBackgroundImage,
              )
            }
          }
          return equipment.point
        })()
        const stagePoint = normToStage(visiblePoint, fittedBackgroundImage)
        const pixelX = stagePoint.x
        const pixelY = stagePoint.y
        const isSelected = selectedEquipmentId === equipment.id || multiSelectedEquipmentIds.has(equipment.id)

        const wireframeEntry = zoom >= 200 ? (EQUIPMENT_WIREFRAMES[equipment.catalogItemId] ?? null) : null
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
            {equipmentFilters?.text === false || equipLabelStage === 'hidden' ? null : renamingEquipmentId === equipment.id ? (
              <input
                ref={equipmentRenameInputRef}
                className="cad-equipment-placement__input"
                style={(() => { const lo = equipmentLabelOffsets[equipment.id]; return { width: `${equipmentRenameInputWidth}px`, ...(lo ? { left: `${lo.left}px`, top: `${lo.top}px`, transform: 'none' } : {}) } })()}
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
            ) : (() => {
              const lo = equipmentLabelOffsets[equipment.id]
              return (
                <span
                  className="cad-equipment-placement__label"
                  style={lo ? { left: `${lo.left}px`, top: `${lo.top}px`, transform: 'none', maxWidth: `${lo.maxWidth}px` } : undefined}
                  onDoubleClick={(event) => {
                    event.stopPropagation()
                    onEquipmentLabelDoubleClick?.(equipment.id)
                  }}
                >
                  {equipment.label}
                </span>
              )
            })()}
          </div>
        )
      })}

      {(automationBoards ?? []).map((board) => {
        if (!isEquipmentIconVisible(board, equipmentFilters)) return null
        const visiblePoint = (() => {
          if (draggingBoard?.id === board.id) return draggingBoard.point
          if (draggingPolygon?.polygonId === board.polygonId) {
            const initial = draggingPolygon.initialBoardPoints?.find((b) => b.id === board.id)
            if (initial) {
              return stageToNorm(
                {
                  x: normToStage(initial.point, fittedBackgroundImage).x + draggingPolygon.stageDelta.x,
                  y: normToStage(initial.point, fittedBackgroundImage).y + draggingPolygon.stageDelta.y,
                },
                fittedBackgroundImage,
              )
            }
          }
          return board.point
        })()
        const stagePoint = normToStage(visiblePoint, fittedBackgroundImage)
        const isDynamic = board.slotCount === null
        const cols = isDynamic
          ? Math.min(board.slots.length, board.columnCount ?? 12)
          : (board.columnCount ?? (board.slotCount <= 8 ? 2 : 3))

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
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => { event.stopPropagation(); onBoardPinToggle?.(board.id) }}
            >
              <img src={board.pinned ? pinSelecionado : pinPadrao} alt="" draggable={false} />
            </button>
            <img src={board.iconSrc} alt="" className="cad-board-placement__icon" draggable={false} />
            {equipmentFilters?.text === false || equipLabelStage === 'hidden' ? null : renamingBoardId === board.id ? (
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
              onMouseDown={(event) => event.stopPropagation()}
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
                    ) : isDynamic ? (
                      <span className="cad-board-slot__number">+</span>
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

      {(avOrganizers ?? []).map((org) => {
        if (!isEquipmentIconVisible(org, equipmentFilters)) return null
        const visiblePoint = (() => {
          if (draggingAvOrganizer?.id === org.id) return draggingAvOrganizer.point
          if (draggingPolygon?.polygonId === org.polygonId) {
            const initial = draggingPolygon.initialAvOrganizerPoints?.find((o) => o.id === org.id)
            if (initial) {
              return stageToNorm(
                {
                  x: normToStage(initial.point, fittedBackgroundImage).x + draggingPolygon.stageDelta.x,
                  y: normToStage(initial.point, fittedBackgroundImage).y + draggingPolygon.stageDelta.y,
                },
                fittedBackgroundImage,
              )
            }
          }
          return org.point
        })()
        const stagePoint = normToStage(visiblePoint, fittedBackgroundImage)
        return (
          <div
            key={org.id}
            className={`cad-av-organizer-placement${selectedAvOrganizerId === org.id ? ' is-selected' : ''}`}
            style={{ left: stagePoint.x, top: stagePoint.y }}
            onMouseDown={(event) => handleAvOrganizerMouseDown(event, org)}
            onContextMenu={(event) => openAvOrganizerContextMenu(event, org.id)}
          >
            <button
              type="button"
              className={`cad-board-pin${org.pinned ? ' is-pinned' : ''}`}
              title={org.pinned ? 'Desafixar' : 'Fixar'}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => { event.stopPropagation(); onAvOrganizerPinToggle?.(org.id) }}
            >
              <img src={org.pinned ? pinSelecionado : pinPadrao} alt="" draggable={false} />
            </button>
            <img src={org.iconSrc} alt="" className="cad-av-organizer-placement__icon" draggable={false} />
            {equipmentFilters?.text === false || equipLabelStage === 'hidden' ? null : renamingAvOrganizerId === org.id ? (
              <input
                ref={avOrganizerRenameInputRef}
                className="cad-equipment-placement__input"
                style={{ width: '90px' }}
                value={avOrganizerRenameDraft}
                onChange={(event) => setAvOrganizerRenameDraft(event.currentTarget.value)}
                onMouseDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onAvOrganizerLabelRenameCommit?.(org.id, event.currentTarget.value)
                  } else if (event.key === 'Escape') {
                    onAvOrganizerLabelRenameCommit?.(org.id, org.label)
                  }
                  event.stopPropagation()
                }}
                onBlur={(event) => {
                  if (Date.now() - avOrganizerRenameOpenedAtRef.current < 120) return
                  onAvOrganizerLabelRenameCommit?.(org.id, event.currentTarget.value)
                }}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            ) : (
              <span
                className="cad-av-organizer-placement__label"
                onDoubleClick={(event) => {
                  event.stopPropagation()
                  onAvOrganizerLabelDoubleClick?.(org.id)
                }}
              >
                {org.label}
              </span>
            )}
            <div
              className={`cad-av-organizer-structure${org.pinned ? ' is-pinned' : ''}`}
              style={{ gridTemplateColumns: `repeat(${Math.min(org.slots.length, org.columnCount ?? 3)}, 24px)` }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              {org.slots.map((slot, slotIndex) => {
                const isOver = dragOverAvOrganizerSlot?.organizerId === org.id && dragOverAvOrganizerSlot?.slotIndex === slotIndex
                return (
                  <div
                    key={slotIndex}
                    className={`cad-av-organizer-slot${slot ? ' is-occupied' : ''}${isOver ? ' is-drag-over' : ''}`}
                    title={slot ? slot.label : `Slot ${slotIndex + 1}`}
                    onDragOver={(event) => {
                      if (slot) return
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'copy'
                      setDragOverAvOrganizerSlot({ organizerId: org.id, slotIndex })
                    }}
                    onDragLeave={() => setDragOverAvOrganizerSlot(null)}
                    onDrop={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setDragOverAvOrganizerSlot(null)
                      if (slot) return
                      try {
                        const itemData = JSON.parse(event.dataTransfer.getData('application/x-equipment-item'))
                        const catalogItemId = itemData?.catalogItemId ?? itemData?.id
                        if (!itemData?.label || !isAvOrganizerOnlyItem(catalogItemId)) return
                        onAvOrganizerSlotInstall?.({
                          organizerId: org.id,
                          slotIndex,
                          device: {
                            id: `av-slot-${org.id}-${slotIndex}-${Date.now()}`,
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
                      setAvOrganizerSlotContextMenu({
                        organizerId: org.id,
                        slotIndex,
                        x: Math.max(4, Math.min(rawX, (bounds?.width ?? 400) - menuWidth - 4)),
                        y: Math.max(4, Math.min(rawY, (bounds?.height ?? 400) - menuHeight - 4)),
                      })
                    }}
                  >
                    {slot ? (
                      <img src={slot.iconSrc} alt={slot.label} className="cad-av-organizer-slot__icon" draggable={false} />
                    ) : (
                      <span className="cad-av-organizer-slot__number">+</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {fittedBackgroundImage ? (placedCurtains ?? []).filter((c) => isEquipmentIconVisible(c, equipmentFilters)).map((curtain) => {
        const isDragging = draggingCurtain?.id === curtain.id
        const isPolygonDragging = draggingPolygon?.polygonId === curtain.polygonId

        let rectStart = curtain.rectStart
        let rectEnd = curtain.rectEnd

        if (isDragging && draggingCurtain.currentStart) {
          rectStart = draggingCurtain.currentStart
          rectEnd = draggingCurtain.currentEnd
        } else if (isPolygonDragging) {
          const initial = draggingPolygon.initialCurtainRects?.find((c) => c.id === curtain.id)
          if (initial) {
            const delta = draggingPolygon.stageDelta
            rectStart = stageToNorm(
              { x: normToStage(initial.rectStart, fittedBackgroundImage).x + delta.x, y: normToStage(initial.rectStart, fittedBackgroundImage).y + delta.y },
              fittedBackgroundImage,
            )
            rectEnd = stageToNorm(
              { x: normToStage(initial.rectEnd, fittedBackgroundImage).x + delta.x, y: normToStage(initial.rectEnd, fittedBackgroundImage).y + delta.y },
              fittedBackgroundImage,
            )
          }
        }

        const ss = normToStage(rectStart, fittedBackgroundImage)
        const se = normToStage(rectEnd,   fittedBackgroundImage)
        const w = Math.max(4, se.x - ss.x)
        const h = Math.max(4, se.y - ss.y)
        const isLandscape = w >= h
        const MOTOR_GAP = 3

        let motorLeft, motorTop
        if (isLandscape) {
          const motorY = h / 2 - 12
          motorLeft = curtain.motorSide === 'a' ? -24 - MOTOR_GAP : w + MOTOR_GAP
          motorTop = motorY
        } else {
          const motorX = w / 2 - 12
          motorLeft = motorX
          motorTop = curtain.motorSide === 'a' ? -24 - MOTOR_GAP : h + MOTOR_GAP
        }

        const isResizing = resizingCurtain?.id === curtain.id
        const displayRectStart = isResizing && resizingCurtain.currentRectStart ? resizingCurtain.currentRectStart : rectStart
        const displayRectEnd   = isResizing && resizingCurtain.currentRectEnd   ? resizingCurtain.currentRectEnd   : rectEnd
        const dss = isResizing ? normToStage(displayRectStart, fittedBackgroundImage) : ss
        const dse = isResizing ? normToStage(displayRectEnd,   fittedBackgroundImage) : se
        const dw = Math.max(4, dse.x - dss.x)
        const dh = Math.max(4, dse.y - dss.y)

        return (
          <div
            key={curtain.id}
            className={`cad-curtain-placement${selectedCurtainId === curtain.id ? ' is-selected' : ''}${isResizing ? ' is-resizing' : ''}`}
            style={{ left: dss.x, top: dss.y, width: dw, height: dh }}
            onMouseDown={(event) => {
              if (activeTool !== 'select') return
              if (isResizing) return
              event.stopPropagation()
              onCurtainSelect?.(curtain.id)
              const container = containerRef.current
              if (!container) return
              const rect = container.getBoundingClientRect()
              const dragOffset = {
                x: event.clientX - rect.left - ss.x,
                y: event.clientY - rect.top  - ss.y,
              }
              curtainHoldTimerRef.current = window.setTimeout(() => {
                curtainHoldTimerRef.current = null
                setDraggingCurtain({
                  id: curtain.id,
                  initialRectStart: curtain.rectStart,
                  initialRectEnd: curtain.rectEnd,
                  dragOffset,
                  currentStart: null,
                  currentEnd: null,
                })
              }, 180)
            }}
            onContextMenu={(event) => openCurtainContextMenu(event, curtain.id)}
          >
            <div className="cad-curtain-icon-center" style={{ left: dw / 2, top: dh / 2 }}>
              <img src={curtain.iconSrc} alt="" className="cad-equipment-placement__icon" draggable={false} />
              {equipmentFilters?.text !== false && equipLabelStage !== 'hidden' ? (
                renamingCurtainId === curtain.id ? (
                  <input
                    ref={curtainRenameInputRef}
                    className="cad-equipment-placement__input"
                    style={{ width: `${curtainRenameInputWidth}px`, pointerEvents: 'auto' }}
                    value={curtainRenameDraft}
                    onChange={(event) => setCurtainRenameDraft(event.currentTarget.value)}
                    onMouseDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        onCurtainLabelRenameCommit?.(curtain.id, event.currentTarget.value)
                      } else if (event.key === 'Escape') {
                        onCurtainLabelRenameCommit?.(curtain.id, curtain.label)
                      }
                      event.stopPropagation()
                    }}
                    onBlur={(event) => {
                      if (Date.now() - curtainRenameOpenedAtRef.current < 120) return
                      onCurtainLabelRenameCommit?.(curtain.id, event.currentTarget.value)
                    }}
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                  />
                ) : (
                  <span
                    className="cad-equipment-placement__label"
                    style={{ pointerEvents: 'auto' }}
                    onDoubleClick={(event) => {
                      event.stopPropagation()
                      onCurtainLabelDoubleClick?.(curtain.id)
                    }}
                  >
                    {curtain.label}
                  </span>
                )
              ) : null}
            </div>

            {isResizing ? (
              <>
                {['tl','tr','bl','br'].map((corner) => (
                  <div
                    key={corner}
                    className="cad-curtain-resize-handle"
                    style={{
                      left: corner === 'tl' || corner === 'bl' ? -5 : dw - 5,
                      top:  corner === 'tl' || corner === 'tr' ? -5 : dh - 5,
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation()
                      event.currentTarget.setPointerCapture(event.pointerId)
                      setResizingCurtain({
                        id: curtain.id,
                        corner,
                        initialRectStart: curtain.rectStart,
                        initialRectEnd:   curtain.rectEnd,
                        startPointerStage: {
                          x: event.clientX - containerRef.current.getBoundingClientRect().left,
                          y: event.clientY - containerRef.current.getBoundingClientRect().top,
                        },
                        currentRectStart: null,
                        currentRectEnd: null,
                      })
                    }}
                  />
                ))}
              </>
            ) : null}

            <div
              className="cad-curtain-motor"
              style={{ left: motorLeft, top: motorTop }}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => { event.stopPropagation(); onCurtainMotorFlip?.(curtain.id) }}
              title="Ponto elétrico"
            >
              <img src={motorIcon} alt="" className="cad-curtain-motor-icon" draggable={false} />
            </div>
          </div>
        )
      }) : null}

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

      {pendingCurtainEquipment ? (
        <div className="cad-canvas-top-message">Desenhe um retângulo para definir as dimensões da cortina</div>
      ) : null}

      {polygons.map((polygon) => {
        if (!polygon.label || envLabelStage === 'hidden') {
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

        // In truncated mode: show only the first line, with limited max-width
        const displayLines = envLabelStage === 'truncated' ? [placement.lines[0]] : placement.lines
        const labelMaxWidth = envLabelStage === 'truncated' ? `${Math.round(80 * (zoom - ENV_TEXT_ZOOM_TRUNCATED) / (ENV_TEXT_ZOOM_FULL - ENV_TEXT_ZOOM_TRUNCATED) + 40)}px` : undefined

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
              ...(labelMaxWidth ? { maxWidth: labelMaxWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : {}),
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
            {displayLines.join('\n')}
          </div>
          {polygonCeilingHeightById?.[polygon.id] != null && envLabelStage === 'full' ? (
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

          {OC_SENSOR_CATALOG_IDS.has(
            (placedEquipments ?? []).find((e) => e.id === equipmentContextMenu.equipmentId)?.catalogItemId
          ) ? (
            <button
              type="button"
              className="cad-tree-context-menu__item"
              onClick={() => {
                const eq = (placedEquipments ?? []).find((e) => e.id === equipmentContextMenu.equipmentId)
                onEquipmentOcSensitivityRequest?.(equipmentContextMenu.equipmentId, eq?.ocSensitivity)
                setEquipmentContextMenu(null)
              }}
            >
              <span className="cad-tree-context-menu__label">Configurar sensibilidade</span>
            </button>
          ) : null}

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
          {boardContextMenu.isDynamic ? (
            <button
              type="button"
              className="cad-tree-context-menu__item"
              onClick={() => {
                onBoardEdit?.(boardContextMenu.boardId)
                setBoardContextMenu(null)
              }}
            >
              <span className="cad-tree-context-menu__label">Propriedades</span>
            </button>
          ) : null}
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

      {avOrganizerSlotContextMenu ? (
        <div
          className="cad-tree-context-menu"
          style={{ left: `${avOrganizerSlotContextMenu.x}px`, top: `${avOrganizerSlotContextMenu.y}px` }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="cad-tree-context-menu__item"
            onClick={() => {
              onAvOrganizerSlotRemove?.({ organizerId: avOrganizerSlotContextMenu.organizerId, slotIndex: avOrganizerSlotContextMenu.slotIndex })
              setAvOrganizerSlotContextMenu(null)
            }}
          >
            <span className="cad-tree-context-menu__label">Remover dispositivo</span>
          </button>
        </div>
      ) : null}

      {avOrganizerContextMenu ? (
        <div
          className="cad-tree-context-menu"
          style={{ left: `${avOrganizerContextMenu.x}px`, top: `${avOrganizerContextMenu.y}px` }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="cad-tree-context-menu__item"
            onClick={() => {
              onAvOrganizerRename?.(avOrganizerContextMenu.organizerId)
              setAvOrganizerContextMenu(null)
            }}
          >
            <span className="cad-tree-context-menu__label">Renomear</span>
          </button>
          <button
            type="button"
            className="cad-tree-context-menu__item"
            onClick={() => {
              onAvOrganizerEdit?.(avOrganizerContextMenu.organizerId)
              setAvOrganizerContextMenu(null)
            }}
          >
            <span className="cad-tree-context-menu__label">Propriedades</span>
          </button>
          <button
            type="button"
            className="cad-tree-context-menu__item cad-tree-context-menu__item--danger"
            onClick={() => {
              onAvOrganizerDelete?.(avOrganizerContextMenu.organizerId)
              setAvOrganizerContextMenu(null)
            }}
          >
            <img src={apagarProjeto} alt="" className="cad-tree-context-menu__icon" />
            <span className="cad-tree-context-menu__label">Excluir</span>
          </button>
        </div>
      ) : null}

      {curtainContextMenu ? (
        <div
          className="cad-tree-context-menu"
          style={{ left: `${curtainContextMenu.x}px`, top: `${curtainContextMenu.y}px` }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="cad-tree-context-menu__item"
            onClick={() => {
              onCurtainRenameRequest?.(curtainContextMenu.curtainId)
              setCurtainContextMenu(null)
            }}
          >
            <span className="cad-tree-context-menu__label">Renomear</span>
          </button>
          <button
            type="button"
            className="cad-tree-context-menu__item"
            onClick={() => {
              onCurtainSelect?.(curtainContextMenu.curtainId)
              setResizingCurtain({
                id: curtainContextMenu.curtainId,
                corner: null,
                initialRectStart: null,
                initialRectEnd: null,
                startPointerStage: null,
                currentRectStart: null,
                currentRectEnd: null,
              })
              setCurtainContextMenu(null)
            }}
          >
            <span className="cad-tree-context-menu__label">Editar tamanho</span>
          </button>
          <button
            type="button"
            className="cad-tree-context-menu__item cad-tree-context-menu__item--danger"
            onClick={() => {
              onCurtainDelete?.(curtainContextMenu.curtainId)
              setCurtainContextMenu(null)
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