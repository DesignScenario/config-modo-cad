import { useMemo, useState } from 'react'
import { useDraggable } from '../hooks/useDraggable.js'

const COLOR_OPTIONS = [
  '#FFFFFF', '#F0F1DF', '#FFD65B', '#FF8740', '#FC4242',
  '#3BE296', '#00EDFF', '#6BC2F7', '#D380FF', '#FC8DCA',
  '#B3B3B3', '#D8C5AD', '#DDA72F', '#FFB685', '#FF9292',
  '#8CBEB2', '#9AD6D8', '#89BAD3', '#B1A1BF', '#CCA6BE',
]

function EnvironmentInfoOverlay({
  suggestedName,
  classOptions,
  defaultCeilingHeight,
  onConclude,
}) {
  const classes = useMemo(
    () => (classOptions?.length ? classOptions : ['Nao definida']),
    [classOptions],
  )

  const [name, setName] = useState(suggestedName)
  const [environmentClass, setEnvironmentClass] = useState(classes[0])
  const [ceilingHeight, setCeilingHeight] = useState(defaultCeilingHeight || '3')
  const [color, setColor] = useState('#FFD65B')
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()

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
      color,
    })
  }

  return (
    <div className="cad-scale-overlay-backdrop" role="dialog" aria-modal="true" aria-label="Informações do Ambiente">
      <form className="cad-environment-overlay" ref={panelRef} style={panelStyle} onSubmit={handleSubmit}>
        <header className="cad-environment-overlay__header" onPointerDown={onHandlePointerDown}>Informações do Ambiente</header>

        <div className="cad-environment-overlay__body">
          <label className="cad-environment-overlay__row">
            <span className="cad-environment-overlay__label">Nome:</span>
            <input
              className="cad-environment-overlay__input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="cad-environment-overlay__row">
            <span className="cad-environment-overlay__label">Classe:</span>
            <select
              className="cad-environment-overlay__input"
              value={environmentClass}
              onChange={(event) => setEnvironmentClass(event.target.value)}
            >
              {classes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="cad-environment-overlay__row">
            <span className="cad-environment-overlay__label">Pé direito:</span>
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              className="cad-environment-overlay__input"
              value={ceilingHeight}
              onChange={(event) => setCeilingHeight(event.target.value)}
            />
          </label>

          <div className="cad-environment-overlay__row cad-environment-overlay__row--top">
            <span className="cad-environment-overlay__label">Cor:</span>
            <div className="cad-environment-overlay__colors" role="group" aria-label="Escolher cor do poligono">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`cad-environment-overlay__color${color === option ? ' is-selected' : ''}`}
                  style={{ '--environment-color': option }}
                  onClick={() => setColor(option)}
                  aria-label={`Selecionar cor ${option}`}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="cad-scale-overlay__start-btn" disabled={!canSubmit}>
            Concluir
          </button>
        </div>
      </form>
    </div>
  )
}

export default EnvironmentInfoOverlay
