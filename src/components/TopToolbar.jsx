import { useEffect, useRef, useState } from 'react'
import alinhamentoBase from '../assets/alinhamento-base.svg'
import alinhamentoDireita from '../assets/alinhamento-direita.svg'
import alinhamentoEsquerda from '../assets/alinhamento-esquerda.svg'
import alinhamentoTopo from '../assets/alinhamento-topo.svg'
import circulo from '../assets/círculo.svg'
import excluir from '../assets/excluir.svg'
import filtroDrivers from '../assets/filtro-drivers.svg'
import filtroIluminacao from '../assets/filtro-iluminação.svg'
import filtroKeypads from '../assets/filtro-keypads.svg'
import filtroMotores from '../assets/filtro-motores.svg'
import filtroModulos from '../assets/filtro-módulos.svg'
import filtroPulsadores from '../assets/filtro-pulsador.svg'
import filtroSensores from '../assets/filtro-sensores.svg'
import filtroTexto from '../assets/filtro-texto.svg'
import filtroTodosEquipamentos from '../assets/filtro-todos-equipamentos.svg'
import mover from '../assets/mover.svg'
import poligono from '../assets/polígono.svg'
import retangulo from '../assets/retângulo.svg'
import rotacionarPlanta from '../assets/rotacionar-planta.svg'
import selecaoPadrao from '../assets/selecao-padrao.svg'
import triangulo from '../assets/triângulo.svg'

function Divider() {
  return <div className="cad-toolbar-divider" aria-hidden="true" />
}

function IconButton({ title, active = false, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      className={`cad-toolbar-icon-btn${active ? ' is-active' : ''} ${className}`.trim()}
      title={title}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

const MIN_ZOOM = 50
const MAX_ZOOM = 1000

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function TopToolbar({ activeTool, onToolChange, zoom, onZoomChange, onImportImage, onToggleEquipmentLibrary, onRotateImage }) {
  const fileInputRef = useRef(null)
  const [zoomInput, setZoomInput] = useState(String(zoom))

  useEffect(() => {
    setZoomInput(String(zoom))
  }, [zoom])

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (file.type !== 'image/png') {
      event.target.value = ''
      return
    }

    onImportImage(file)
    event.target.value = ''
  }

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

  return (
    <section className="cad-toolbar" aria-label="Ferramentas CAD">
      <div className="cad-toolbar__row cad-toolbar__row--primary">
        <div className="cad-toolbar-main">
          <button
            type="button"
            className="cad-toolbar-menu-action"
            title="Importar arquivo PNG"
            onClick={handleImportClick}
          >
            Importar arquivo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png"
            className="cad-toolbar-file-input"
            onChange={handleFileChange}
          />
          <Divider />

          <button
            type="button"
            className={`cad-toolbar-menu-action${activeTool === 'scale' ? ' is-active' : ''}`}
            title="Definir escala"
            onClick={() => onToolChange('scale')}
          >
            Definir escala
          </button>
          <Divider />

          <IconButton title="Rotacionar planta" onClick={onRotateImage}>
            <img src={rotacionarPlanta} alt="" className="cad-icon-basic" />
          </IconButton>
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
              title="Círculo"
              active={activeTool === 'circle'}
              onClick={() => onToolChange('circle')}
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

          <IconButton
            title="Excluir Polígono"
            active={activeTool === 'delete'}
            onClick={() => onToolChange('delete')}
          >
            <img src={excluir} alt="" className="cad-icon-basic" />
          </IconButton>

          <Divider />

          <div className="cad-toolbar-group cad-toolbar-group--tight">
            <IconButton title="Alinhar à esquerda">
              <img src={alinhamentoEsquerda} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Alinhar à direita">
              <img src={alinhamentoDireita} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Alinhar acima">
              <img src={alinhamentoTopo} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Alinhar abaixo">
              <img src={alinhamentoBase} alt="" className="cad-icon-basic" />
            </IconButton>
          </div>

          <Divider />

          <div className="cad-toolbar-group cad-toolbar-group--filters">
            <IconButton title="Texto" className="is-filter-active">
              <img src={filtroTexto} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Todos os Equipamentos">
              <img src={filtroTodosEquipamentos} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Módulos">
              <img src={filtroModulos} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Iluminação">
              <img src={filtroIluminacao} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Motores">
              <img src={filtroMotores} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Keypads">
              <img src={filtroKeypads} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Sensores">
              <img src={filtroSensores} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Drivers">
              <img src={filtroDrivers} alt="" className="cad-icon-basic" />
            </IconButton>
            <IconButton title="Pulsadores">
              <img src={filtroPulsadores} alt="" className="cad-icon-basic" />
            </IconButton>
          </div>

          <button
            type="button"
            className="cad-toolbar-menu-action cad-toolbar-menu-action--library"
            onClick={onToggleEquipmentLibrary}
          >
            Biblioteca de Equipamentos
          </button>
        </div>

        <div className="cad-toolbar-zoom">
          <Divider />
          <label className="cad-toolbar-zoom-field" title="Zoom">
            <input
              type="number"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step="1"
              value={zoomInput}
              onChange={(event) => {
                setZoomInput(event.target.value)
              }}
              onBlur={() => setZoomInput(String(zoom))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitZoomValue()
                  event.currentTarget.blur()
                }
              }}
            />
            <span>%</span>
          </label>
        </div>
      </div>
    </section>
  )
}

export default TopToolbar