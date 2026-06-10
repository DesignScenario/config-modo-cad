import { useEffect, useMemo, useRef, useState } from 'react'
import { useDraggable } from '../hooks/useDraggable.js'
import EnvironmentLibraryOverlay from './EnvironmentLibraryOverlay.jsx'
import ambientesIcon from '../assets/ambientes.svg'
import setaDropdownSvg from '../assets/e2/seta-dropdown.svg'

const ENV_DRAG_TYPE = 'application/x-env-node'

const PRESET_ENVIRONMENTS = [
  { name: 'Adega', type: 'Apoio' },
  { name: 'Área de Serviço', type: 'Serviço' },
  { name: 'Banheira', type: 'Banheiro' },
  { name: 'Banheiro', type: 'Banheiro' },
  { name: 'Banheiro de Serviço', type: 'Banheiro' },
  { name: 'Bar', type: 'Lazer' },
  { name: 'Brinquedoteca', type: 'Lazer' },
  { name: 'Café', type: 'Social' },
  { name: 'Churrasqueira', type: 'Lazer' },
  { name: 'Closet', type: 'Apoio' },
  { name: 'Corredor', type: 'Circulação' },
  { name: 'Cozinha', type: 'Serviço' },
  { name: 'Despensa', type: 'Serviço' },
  { name: 'Dormitório', type: 'Dormitório' },
  { name: 'Ducha', type: 'Banheiro' },
  { name: 'Entrada', type: 'Circulação' },
  { name: 'Escada', type: 'Circulação' },
  { name: 'Garagem', type: 'Garagem' },
  { name: 'Hall de Entrada', type: 'Circulação' },
  { name: 'Home-Office', type: 'Trabalho' },
  { name: 'Home-Office 2', type: 'Trabalho' },
  { name: 'Home-Theater', type: 'Lazer' },
  { name: 'Home-Theater 2', type: 'Lazer' },
  { name: 'Jantar', type: 'Social' },
  { name: 'Jardim', type: 'Externo' },
  { name: 'Lareira', type: 'Social' },
  { name: 'Lavabo', type: 'Banheiro' },
  { name: 'Lavatório', type: 'Banheiro' },
  { name: 'Living', type: 'Social' },
  { name: 'Penteadeira', type: 'Apoio' },
  { name: 'Piscina', type: 'Externo' },
  { name: 'Quadra de Tênis', type: 'Externo' },
  { name: 'Quarto', type: 'Dormitório' },
  { name: 'Sala de Áudio e Vídeo', type: 'Lazer' },
  { name: 'Sala de Espera', type: 'Social' },
  { name: 'Sala de Estar', type: 'Social' },
  { name: 'Sala de Ginástica', type: 'Lazer' },
  { name: 'Sala de Jogos', type: 'Lazer' },
  { name: 'Sala de Leitura', type: 'Trabalho' },
  { name: 'Sala de Música', type: 'Lazer' },
  { name: 'Sala de Música 2', type: 'Lazer' },
  { name: 'Sala de Música 3', type: 'Lazer' },
  { name: 'Sala de Reunião', type: 'Trabalho' },
  { name: 'Sala de Sinuca', type: 'Lazer' },
  { name: 'Sala-TV', type: 'Lazer' },
  { name: 'Spa', type: 'Lazer' },
  { name: 'Suíte', type: 'Dormitório' },
  { name: 'Suíte 2', type: 'Dormitório' },
  { name: 'Suíte 3', type: 'Dormitório' },
  { name: 'Suíte Master', type: 'Dormitório' },
  { name: 'Varanda', type: 'Externo' },
  { name: 'Varanda Gourmet', type: 'Externo' },
  { name: 'Varanda Gourmet 2', type: 'Externo' },
  { name: 'WC', type: 'Banheiro' },
]

function EnvironmentInfoOverlay({
  suggestedName,
  classOptions,
  defaultCeilingHeight,
  initialClass,
  onConclude,
  unassociatedEnvironments = [],
}) {
  const classes = useMemo(
    () => (classOptions?.length ? classOptions : ['Nao definida']),
    [classOptions],
  )

  const [name, setName] = useState(suggestedName)
  const [selectedAssocEnv, setSelectedAssocEnv] = useState(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [environmentClass, setEnvironmentClass] = useState(initialClass || classes[0])
  const [ceilingHeight, setCeilingHeight] = useState(defaultCeilingHeight || '3')
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const dropdownRef = useRef(null)
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()

  useEffect(() => { setName(suggestedName) }, [suggestedName])
  useEffect(() => { setEnvironmentClass(initialClass || classes[0]) }, [classes, initialClass])
  useEffect(() => { setCeilingHeight(defaultCeilingHeight || '3') }, [defaultCeilingHeight])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const canSubmit = name.trim().length > 0

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!canSubmit) return

    if (selectedAssocEnv) {
      onConclude({
        associateEnvId: selectedAssocEnv.id,
        associateEnvName: selectedAssocEnv.label,
        environmentClass,
        ceilingHeight,
      })
    } else {
      onConclude({ name: name.trim(), environmentClass, ceilingHeight })
    }
  }

  const handleNameChange = (event) => {
    setName(event.target.value)
    setSelectedAssocEnv(null)
  }

  const handleDropdownSelect = (env) => {
    if (env) {
      setName(env.label)
      setSelectedAssocEnv(env)
    } else {
      setName('')
      setSelectedAssocEnv(null)
    }
    setIsDropdownOpen(false)
  }

  const handleLibrarySelect = (preset) => {
    setName(preset.name)
    setSelectedAssocEnv(null)
    if (classes.includes(preset.type)) setEnvironmentClass(preset.type)
    setIsLibraryOpen(false)
  }

  const handleDragOver = (event) => {
    if (event.dataTransfer.types.includes(ENV_DRAG_TYPE)) {
      event.preventDefault()
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragOver(false)
    const raw = event.dataTransfer.getData(ENV_DRAG_TYPE)
    if (!raw) return
    const dragged = JSON.parse(raw)
    const match = unassociatedEnvironments.find((e) => e.id === dragged.id)
    if (match) {
      setName(match.label)
      setSelectedAssocEnv(match)
      setIsDropdownOpen(false)
    }
  }

  return (
    <div className="cad-environment-overlay-backdrop" role="dialog" aria-modal="true" aria-label="Informações do Ambiente">
      <form
        className={`cad-environment-overlay${isDragOver ? ' is-drag-over' : ''}`}
        ref={panelRef}
        style={panelStyle}
        onSubmit={handleSubmit}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <header className="cad-environment-overlay__header" onPointerDown={onHandlePointerDown}>
          Informações do Ambiente
        </header>

        <div className="cad-environment-overlay__body">
          {/* Ambiente */}
          <div className="cad-environment-overlay__row">
            <span className="cad-environment-overlay__label">Ambiente:</span>
            <div className="cad-environment-overlay__combo" ref={dropdownRef}>
              <input
                className={`cad-environment-overlay__combo-input${selectedAssocEnv ? ' is-readonly' : ''}`}
                value={name}
                onChange={handleNameChange}
                readOnly={selectedAssocEnv !== null}
                autoComplete="off"
              />
              <button
                type="button"
                className="cad-environment-overlay__combo-arrow"
                onClick={() => setIsDropdownOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
                tabIndex={-1}
              >
                <img src={setaDropdownSvg} alt="" className="cad-environment-overlay__arrow-icon" />
              </button>

              {isDropdownOpen && (
                <div className="cad-environment-overlay__name-menu" role="listbox">
                  <button
                    type="button"
                    className="cad-environment-overlay__name-option"
                    onClick={() => handleDropdownSelect(null)}
                  >
                    &nbsp;
                  </button>
                  {unassociatedEnvironments.map((env) => (
                    <button
                      key={env.id}
                      type="button"
                      className="cad-environment-overlay__name-option"
                      onClick={() => handleDropdownSelect(env)}
                    >
                      {env.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="cad-environment-overlay__lib-btn"
              onClick={() => setIsLibraryOpen((open) => !open)}
              aria-label="Abrir biblioteca de ambientes"
              title="Biblioteca de Ambientes"
            >
              <img src={ambientesIcon} alt="" className="cad-environment-overlay__lib-btn-icon" />
            </button>
          </div>

          {/* Função */}
          <label className="cad-environment-overlay__row">
            <span className="cad-environment-overlay__label">Função:</span>
            <div className="cad-environment-overlay__class-field">
              <select
                className="cad-environment-overlay__input cad-environment-overlay__input--class"
                value={environmentClass}
                onChange={(event) => setEnvironmentClass(event.target.value)}
              >
                {classes.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className="cad-environment-overlay__class-indicator" aria-hidden="true">
                <img src={setaDropdownSvg} alt="" className="cad-environment-overlay__arrow-icon" />
              </span>
            </div>
          </label>

          {/* Pé direito */}
          <label className="cad-environment-overlay__row">
            <span className="cad-environment-overlay__label">Pé direito:</span>
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              className="cad-environment-overlay__input cad-environment-overlay__input--numeric"
              value={ceilingHeight}
              onChange={(event) => setCeilingHeight(event.target.value)}
            />
          </label>

          <button type="submit" className="cad-environment-overlay__submit-btn" disabled={!canSubmit}>
            Concluir
          </button>
        </div>
      </form>

      {isLibraryOpen && (
        <EnvironmentLibraryOverlay
          presets={PRESET_ENVIRONMENTS}
          onSelect={handleLibrarySelect}
          onClose={() => setIsLibraryOpen(false)}
        />
      )}
    </div>
  )
}

export default EnvironmentInfoOverlay
