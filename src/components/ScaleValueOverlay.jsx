import { useState } from 'react'
import { useDraggable } from '../hooks/useDraggable.js'

function ScaleValueOverlay({ onConclude }) {
  const [metersValue, setMetersValue] = useState('')
  const [ceilingHeightValue, setCeilingHeightValue] = useState('')
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()

  const handleSubmit = (event) => {
    event.preventDefault()

    const numericValue = Number.parseFloat(metersValue)
    const numericCeilingHeight = Number.parseFloat(ceilingHeightValue)

    if (
      !Number.isFinite(numericValue)
      || numericValue <= 0
      || !Number.isFinite(numericCeilingHeight)
      || numericCeilingHeight <= 0
    ) {
      return
    }

    onConclude({
      metersValue: numericValue,
      ceilingHeight: String(ceilingHeightValue).trim(),
    })
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
          <div className="cad-scale-overlay__field-row">
            <label className="cad-scale-overlay__text" htmlFor="scale-real-distance-input">
              Distância real em metros:
            </label>
            <input
              id="scale-real-distance-input"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              className="cad-scale-overlay__input cad-scale-overlay__input--no-stepper"
              value={metersValue}
              onChange={(event) => setMetersValue(event.target.value)}
              aria-label="Distância real em metros"
            />
          </div>

          <div className="cad-scale-overlay__field-row">
            <label className="cad-scale-overlay__text" htmlFor="scale-ceiling-height-input">
              Pé direito:
            </label>
            <input
              id="scale-ceiling-height-input"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              className="cad-scale-overlay__input cad-scale-overlay__input--no-stepper"
              value={ceilingHeightValue}
              onChange={(event) => setCeilingHeightValue(event.target.value)}
              aria-label="Pé direito"
            />
          </div>

          <button
            type="submit"
            className="cad-scale-overlay__start-btn"
            disabled={!metersValue.trim() || !ceilingHeightValue.trim()}
          >
            Concluir
          </button>
        </form>
      </section>
    </div>
  )
}

export default ScaleValueOverlay
