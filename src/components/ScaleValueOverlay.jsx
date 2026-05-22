import { useState } from 'react'
import { useDraggable } from '../hooks/useDraggable.js'

function ScaleValueOverlay({ onConclude }) {
  const [metersValue, setMetersValue] = useState('')
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()

  const handleSubmit = (event) => {
    event.preventDefault()

    const numericValue = Number.parseFloat(metersValue)

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return
    }

    onConclude(numericValue)
  }

  return (
    <div
      className="cad-scale-overlay-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Definir escala em metros"
    >
      <section className="cad-scale-overlay cad-scale-overlay--value" ref={panelRef} style={panelStyle}>
        <header className="cad-scale-overlay__header" onPointerDown={onHandlePointerDown}>Definir escala</header>

        <form className="cad-scale-overlay__content cad-scale-overlay__content--value" onSubmit={handleSubmit}>
          <p className="cad-scale-overlay__text cad-scale-overlay__text--center">
            Informe a distância real correspondente em metros
          </p>

          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            className="cad-scale-overlay__input"
            value={metersValue}
            onChange={(event) => setMetersValue(event.target.value)}
            aria-label="Distancia em metros"
          />

          <button type="submit" className="cad-scale-overlay__start-btn" disabled={!metersValue.trim()}>
            Concluir
          </button>
        </form>
      </section>
    </div>
  )
}

export default ScaleValueOverlay
