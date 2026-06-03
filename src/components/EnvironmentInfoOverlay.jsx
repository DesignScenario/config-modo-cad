import { useEffect, useMemo, useRef, useState } from 'react'
import { useDraggable } from '../hooks/useDraggable.js'
import EnvironmentLibraryOverlay from './EnvironmentLibraryOverlay.jsx'
import ambientesIcon from '../assets/ambientes.svg'

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
  allowAssociate = false,
}) {
  const classes = useMemo(
    () => (classOptions?.length ? classOptions : ['Nao definida']),
    [classOptions],
  )

  const [mode, setMode] = useState('novo') // 'novo' | 'associar'
  const [name, setName] = useState(suggestedName)
  const [environmentClass, setEnvironmentClass] = useState(initialClass || classes[0])
  const [ceilingHeight, setCeilingHeight] = useState(defaultCeilingHeight || '3')
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [selectedAssocEnv, setSelectedAssocEnv] = useState(null)
  const [isAssocMenuOpen, setIsAssocMenuOpen] = useState(false)
  const assocMenuRef = useRef(null)
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()

  useEffect(() => {
    setName(suggestedName)
  }, [suggestedName])

  useEffect(() => {
    setEnvironmentClass(initialClass || classes[0])
  }, [classes, initialClass])

  useEffect(() => {
    setCeilingHeight(defaultCeilingHeight || '3')
  }, [defaultCeilingHeight])

  // Reset mode when overlay opens with a different allowAssociate state
  useEffect(() => {
    if (!allowAssociate) {
      setMode('novo')
    }
  }, [allowAssociate])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!assocMenuRef.current?.contains(event.target)) {
        setIsAssocMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const canSubmit =
    mode === 'novo'
      ? name.trim().length > 0
      : selectedAssocEnv !== null

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    if (mode === 'associar' && selectedAssocEnv) {
      onConclude({
        associateEnvId: selectedAssocEnv.id,
        associateEnvName: selectedAssocEnv.label,
        environmentClass,
        ceilingHeight,
      })
    } else {
      onConclude({
        name: name.trim(),
        environmentClass,
        ceilingHeight,
      })
    }
  }

  const handleLibrarySelect = (preset) => {
    setName(preset.name)
    if (classes.includes(preset.type)) {
      setEnvironmentClass(preset.type)
    }
    setIsLibraryOpen(false)
  }

  return (
    <div className="cad-environment-overlay-backdrop" role="dialog" aria-modal="true" aria-label="Informações do Ambiente">
      <form className="cad-environment-overlay" ref={panelRef} style={panelStyle} onSubmit={handleSubmit}>
        <header className="cad-environment-overlay__header" onPointerDown={onHandlePointerDown}>
          Informações do Ambiente
        </header>

        <div className="cad-environment-overlay__body">
          {/* Radio buttons */}
          <div className="cad-environment-overlay__radio-group">
            <button
              type="button"
              className={`cad-environment-overlay__radio-btn${mode === 'novo' ? ' is-selected' : ''}`}
              onClick={() => setMode('novo')}
            >
              <span className="cad-environment-overlay__radio-icon" aria-hidden="true" />
              Novo ambiente
            </button>
            <button
              type="button"
              className={`cad-environment-overlay__radio-btn${mode === 'associar' ? ' is-selected' : ''}${!allowAssociate || unassociatedEnvironments.length === 0 ? ' is-disabled' : ''}`}
              onClick={() => {
                if (allowAssociate && unassociatedEnvironments.length > 0) {
                  setMode('associar')
                }
              }}
              disabled={!allowAssociate || unassociatedEnvironments.length === 0}
              aria-disabled={!allowAssociate || unassociatedEnvironments.length === 0}
            >
              <span className="cad-environment-overlay__radio-icon" aria-hidden="true" />
              Associar ambiente
            </button>
          </div>

          {/* Mode: Novo ambiente */}
          {mode === 'novo' && (
            <label className="cad-environment-overlay__row">
              <span className="cad-environment-overlay__label">Nome:</span>
              <div className="cad-environment-overlay__name-field">
                <input
                  className="cad-environment-overlay__input cad-environment-overlay__input--with-lib-btn"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <button
                  type="button"
                  className="cad-environment-overlay__lib-btn"
                  onClick={() => setIsLibraryOpen((open) => !open)}
                  aria-label="Abrir biblioteca de ambientes"
                  title="Biblioteca de Ambientes"
                >
                  <img
                    src={ambientesIcon}
                    alt=""
                    className="cad-environment-overlay__lib-btn-icon"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </label>
          )}

          {/* Mode: Associar ambiente */}
          {mode === 'associar' && (
            <label className="cad-environment-overlay__row">
              <span className="cad-environment-overlay__label">Ambiente:</span>
              <div className="cad-environment-overlay__name-field" ref={assocMenuRef}>
                <button
                  type="button"
                  className="cad-environment-overlay__assoc-field"
                  onClick={() => setIsAssocMenuOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={isAssocMenuOpen}
                >
                  <span className="cad-environment-overlay__assoc-value">
                    {selectedAssocEnv ? selectedAssocEnv.label : ''}
                  </span>
                  <span className="cad-environment-overlay__name-toggle-icon" aria-hidden="true" />
                </button>

                {isAssocMenuOpen && (
                  <div
                    className="cad-environment-overlay__name-menu"
                    role="listbox"
                    aria-label="Ambientes não associados"
                  >
                    {unassociatedEnvironments.map((env) => (
                      <button
                        key={env.id}
                        type="button"
                        className="cad-environment-overlay__name-option"
                        onClick={() => {
                          setSelectedAssocEnv(env)
                          setIsAssocMenuOpen(false)
                        }}
                      >
                        {env.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          )}

          <label className="cad-environment-overlay__row">
            <span className="cad-environment-overlay__label">Função:</span>
            <div className="cad-environment-overlay__class-field">
              <select
                className="cad-environment-overlay__input cad-environment-overlay__input--class"
                value={environmentClass}
                onChange={(event) => setEnvironmentClass(event.target.value)}
              >
                {classes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="cad-environment-overlay__class-indicator" aria-hidden="true">
                <span className="cad-environment-overlay__name-toggle-icon" />
              </span>
            </div>
          </label>

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

          <button type="submit" className="cad-scale-overlay__start-btn" disabled={!canSubmit}>
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
