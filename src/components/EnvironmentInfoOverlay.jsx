import { useEffect, useMemo, useRef, useState } from 'react'
import { useDraggable } from '../hooks/useDraggable.js'

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
}) {
  const classes = useMemo(
    () => (classOptions?.length ? classOptions : ['Nao definida']),
    [classOptions],
  )

  const [name, setName] = useState(suggestedName)
  const [environmentClass, setEnvironmentClass] = useState(initialClass || classes[0])
  const [ceilingHeight, setCeilingHeight] = useState(defaultCeilingHeight || '3')
  const [isNameMenuOpen, setIsNameMenuOpen] = useState(false)
  const nameMenuRef = useRef(null)
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

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!nameMenuRef.current?.contains(event.target)) {
        setIsNameMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const canSubmit = name.trim().length > 0

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    onConclude({
      name: name.trim(),
      environmentClass,
      ceilingHeight,
    })
  }

  return (
    <div className="cad-environment-overlay-backdrop" role="dialog" aria-modal="true" aria-label="Informações do Ambiente">
      <form className="cad-environment-overlay" ref={panelRef} style={panelStyle} onSubmit={handleSubmit}>
        <header className="cad-environment-overlay__header" onPointerDown={onHandlePointerDown}>Informações do Ambiente</header>

        <div className="cad-environment-overlay__body">
          <label className="cad-environment-overlay__row">
            <span className="cad-environment-overlay__label">Nome:</span>
            <div className="cad-environment-overlay__name-field" ref={nameMenuRef}>
              <input
                className="cad-environment-overlay__input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onFocus={() => setIsNameMenuOpen(false)}
              />
              <button
                type="button"
                className={`cad-environment-overlay__name-toggle${isNameMenuOpen ? ' is-open' : ''}`}
                onClick={() => setIsNameMenuOpen((current) => !current)}
                aria-label="Abrir nomes predefinidos"
              >
                <span className="cad-environment-overlay__name-toggle-icon" aria-hidden="true" />
              </button>

              {isNameMenuOpen ? (
                <div className="cad-environment-overlay__name-menu" role="listbox" aria-label="Nomes de ambientes predefinidos">
                  {PRESET_ENVIRONMENTS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      className="cad-environment-overlay__name-option"
                      onClick={() => {
                        setName(preset.name)
                        if (classes.includes(preset.type)) {
                          setEnvironmentClass(preset.type)
                        }
                        setIsNameMenuOpen(false)
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </label>

          <label className="cad-environment-overlay__row">
            <span className="cad-environment-overlay__label">Classe:</span>
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
    </div>
  )
}

export default EnvironmentInfoOverlay
