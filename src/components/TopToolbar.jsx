import { useEffect, useState } from 'react'
import alinhamentoBase from '../assets/alinhamento-base.svg'
import alinhamentoDireita from '../assets/alinhamento-direita.svg'
import alinhamentoEsquerda from '../assets/alinhamento-esquerda.svg'
import alinhamentoHorizontal from '../assets/alinhar-horizontalmente.svg'
import alinhamentoTopo from '../assets/alinhamento-topo.svg'
import alinhamentoVertical from '../assets/alinhar-verticalmente.svg'
import espacarHorizontal from '../assets/espaçar-horizontalmente.svg'
import espacarVertical from '../assets/espaçar-verticalmente.svg'
import desfazer from '../assets/desfazer.svg'
import circulo from '../assets/círculo.svg'
import excluir from '../assets/excluir.svg'
import filtroCameras from '../assets/filtro-câmeras.svg'
import filtroDrivers from '../assets/filtro-drivers.svg'
import filtroIluminacao from '../assets/filtro-iluminação.svg'
import filtroKeypads from '../assets/filtro-keypads.svg'
import filtroMotores from '../assets/filtro-motores.svg'
import filtroCortinas from '../assets/filtro-cortinas.svg'
import filtroQuadros from '../assets/filtro-quadros.svg'
import filtroPulsadores from '../assets/filtro-pulsador.svg'
import filtroSensores from '../assets/filtro-sensores.svg'
import filtroTexto from '../assets/filtro-texto.svg'
import filtroTodosEquipamentos from '../assets/filtro-todos-equipamentos.svg'
import filtroTouchPanels from '../assets/filtro-touchpanels.svg'
import mover from '../assets/mover.svg'
import poligono from '../assets/polígono.svg'
import refazer from '../assets/refazer.svg'
import regua from '../assets/regua.svg'
import retangulo from '../assets/retângulo.svg'
import rotacionarPlanta from '../assets/rotacionar-planta.svg'
import selecaoPadrao from '../assets/selecao-padrao.svg'
import triangulo from '../assets/triângulo.svg'

const FILTER_BUTTONS = [
  { key: 'text', title: 'Texto', icon: filtroTexto },
  { key: 'all', title: 'Todos os Equipamentos', icon: filtroTodosEquipamentos },
  { key: 'iluminacao', title: 'Iluminação', icon: filtroIluminacao },
  { key: 'pulsadores', title: 'Pulsadores', icon: filtroPulsadores },
  { key: 'motores', title: 'Motores', icon: filtroMotores },
  { key: 'cortinas', title: 'Cortinas', icon: filtroCortinas },
  { key: 'cameras', title: 'Câmeras', icon: filtroCameras },
  { key: 'quadros', title: 'Quadros', icon: filtroQuadros },
  { key: 'keypads', title: 'Keypads', icon: filtroKeypads },
  { key: 'touchPanels', title: 'Touch Panels', icon: filtroTouchPanels },
  { key: 'sensores', title: 'Sensores', icon: filtroSensores },
  { key: 'drivers', title: 'Drivers', icon: filtroDrivers },
]

function Divider() {
  return <div className="cad-toolbar-divider" aria-hidden="true" />
}

function IconButton({ title, active = false, pressed = active, onClick, children, className = '', disabled = false }) {
  return (
    <button
      type="button"
      className={`cad-toolbar-icon-btn${active ? ' is-active' : ''} ${className}`.trim()}
      title={title}
      onClick={onClick}
      aria-pressed={pressed}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

const MIN_ZOOM = 10
const MAX_ZOOM = 3000
const MIN_OPACITY = 0
const MAX_OPACITY = 100

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function clampOpacity(value) {
  return Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, value))
}

function TopToolbar({
  activeTool,
  onToolChange,
  zoom,
  onZoomChange,
  opacity,
  onOpacityChange,
  onRotateImage,
  equipmentFilters,
  onToggleEquipmentFilter,
  onAlignItems,
  onDeleteSelected,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) {
  const [zoomInput, setZoomInput] = useState(String(zoom))
  const [opacityInput, setOpacityInput] = useState(String(opacity))

  useEffect(() => {
    setZoomInput(String(zoom))
  }, [zoom])

  useEffect(() => {
    setOpacityInput(String(opacity))
  }, [opacity])

  const commitZoomValue = () => {
    const parsed = Number.parseInt(zoomInput, 10)

    if (Number.isNaN(parsed)) {
      setZoomInput(String(zoom))
      return
    }

    const nextZoom = clampZoom(parsed)
    setZoomInput(String(nextZoom))
    onZoomChange?.(nextZoom)
  }

  const commitOpacityValue = () => {
    const parsed = Number.parseInt(opacityInput, 10)

    if (Number.isNaN(parsed)) {
      setOpacityInput(String(opacity))
      return
    }

    const nextOpacity = clampOpacity(parsed)
    setOpacityInput(String(nextOpacity))
    onOpacityChange?.(nextOpacity)
  }

  return (
    <section className="cad-toolbar" aria-label="Ferramentas CAD">
      <div className="cad-toolbar__row cad-toolbar__row--primary">
        <div className="cad-toolbar-main">
          
          <div className="cad-toolbar-group">
            <IconButton
              title="Desfazer (Ctrl+Z)"
              disabled={!canUndo}
              onClick={onUndo}
            >
              <img src={desfazer} alt="" className="cad-icon-basic" />
            </IconButton>

            <IconButton
              title="Refazer (Ctrl+Y)"
              disabled={!canRedo}
              onClick={onRedo}
            >
              <img src={refazer} alt="" className="cad-icon-basic" />
            </IconButton>
          </div>

          <Divider />

          <div className="cad-toolbar-group">
            <IconButton title="Rotacionar planta" onClick={onRotateImage}>
            <img src={rotacionarPlanta} alt="" className="cad-icon-basic" />
            </IconButton>
          </div>

          <Divider />

          <div className="cad-toolbar-group">
            <IconButton
              title="Seleção"
              active={activeTool === 'select'}
              onClick={() => onToolChange('select')}
            >
              <img src={selecaoPadrao} alt="" className="cad-icon-basic" />
            </IconButton>

            <IconButton
              title="Mover"
              active={activeTool === 'move'}
              onClick={() => onToolChange('move')}
            >
              <img src={mover} alt="" className="cad-icon-basic" />
            </IconButton>

            <IconButton
              title="Régua"
              active={activeTool === 'ruler'}
              onClick={() => onToolChange('ruler')}
            >
              <img src={regua} alt="" className="cad-icon-basic" />
            </IconButton>
          </div>

          <Divider />

         <div className="cad-toolbar-group">
            <IconButton
              title="Polígono"
              active={activeTool === 'polygon'}
              onClick={() => onToolChange('polygon')}
            >
              <img src={poligono} alt="" className="cad-icon-basic" />
            </IconButton>

            <IconButton
              title="Retângulo"
              active={activeTool === 'rectangle'}
              onClick={() => onToolChange('rectangle')}
            >
              <img src={retangulo} alt="" className="cad-icon-basic" />
            </IconButton>

            <IconButton
              title="Elipse"
              active={activeTool === 'elipse'}
              onClick={() => onToolChange('elipse')}
            >
              <img src={circulo} alt="" className="cad-icon-basic" />
            </IconButton>

            <IconButton
              title="Triângulo"
              active={activeTool === 'triangle'}
              onClick={() => onToolChange('triangle')}
            >
              <img src={triangulo} alt="" className="cad-icon-basic" />
            </IconButton>
          </div>
          <Divider />

          <div className="cad-toolbar-group">
            <IconButton
              title="Excluir (Delete)"
              onClick={onDeleteSelected}
            >
              <img src={excluir} alt="" className="cad-icon-basic" />
            </IconButton>
          </div>

          <Divider />

          <div className="cad-toolbar-group cad-toolbar-group--tight">
            <IconButton title="Alinhar à esquerda" onClick={() => onAlignItems?.('left')}>
              <img src={alinhamentoEsquerda} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Alinhar verticalmente" onClick={() => onAlignItems?.('center-x')}>
              <img src={alinhamentoVertical} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Alinhar à direita" onClick={() => onAlignItems?.('right')}>
              <img src={alinhamentoDireita} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Alinhar acima" onClick={() => onAlignItems?.('top')}>
              <img src={alinhamentoTopo} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Alinhar horizontalmente" onClick={() => onAlignItems?.('center-y')}>
              <img src={alinhamentoHorizontal} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Alinhar abaixo" onClick={() => onAlignItems?.('bottom')}>
              <img src={alinhamentoBase} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Espaçar verticalmente" onClick={() => onAlignItems?.('distribute-y')}>
              <img src={espacarVertical} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Espaçar horizontalmente" onClick={() => onAlignItems?.('distribute-x')}>
              <img src={espacarHorizontal} alt="" className="cad-icon-basic" />
            </IconButton>
          </div>

          <Divider />

          <div className="cad-toolbar-group cad-toolbar-group--filters">
            {FILTER_BUTTONS.map((filterButton) => {
              const isEnabled = equipmentFilters?.[filterButton.key] ?? true

              return (
                <IconButton
                  key={filterButton.key}
                  title={filterButton.title}
                  pressed={isEnabled}
                  onClick={() => onToggleEquipmentFilter?.(filterButton.key)}
                  className={isEnabled ? 'is-filter-active' : 'is-filter-inactive'}
                >
                  <img src={filterButton.icon} alt="" className="cad-icon-basic" />
                </IconButton>
              )
            })}
          </div>

        </div>

        <div className="cad-toolbar-floor-controls" aria-label="Controles da planta baixa">
          <Divider />
          <div className="cad-toolbar-floor-control" title="Transparência">
            <span className="cad-toolbar-floor-control__label">Transparência:</span>
            <label className="cad-toolbar-floor-control__input">
              <input
                type="number"
                min={MIN_OPACITY}
                max={MAX_OPACITY}
                step="1"
                value={opacityInput}
                onChange={(event) => {
                  setOpacityInput(event.target.value)
                }}
                onBlur={commitOpacityValue}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    commitOpacityValue()
                    event.currentTarget.blur()
                  }
                }}
                aria-label="Valor da transparência"
              />
              <span>%</span>
            </label>
          </div>
          <Divider />
          <div className="cad-toolbar-floor-control" title="Zoom">
            <span className="cad-toolbar-floor-control__label">Zoom:</span>
            <label className="cad-toolbar-floor-control__input">
              <input
                type="number"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step="1"
                value={zoomInput}
                onChange={(event) => {
                  setZoomInput(event.target.value)
                }}
                onBlur={commitZoomValue}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    commitZoomValue()
                    event.currentTarget.blur()
                  }
                }}
                aria-label="Valor do zoom"
              />
              <span>%</span>
            </label>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TopToolbar