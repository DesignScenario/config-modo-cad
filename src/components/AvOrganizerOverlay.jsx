import { useRef, useState } from 'react'
import { useDraggable } from '../hooks/useDraggable.js'

function AvOrganizerOverlay({ onConfirm, onClose, initialColumns }) {
  const [columns, setColumns] = useState(initialColumns != null ? String(initialColumns) : '')
  const inputRef = useRef(null)
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()

  const handleConfirm = () => {
    const parsedCols = Number.parseInt(columns, 10)
    if (!Number.isNaN(parsedCols) && parsedCols >= 1 && parsedCols <= 12) {
      onConfirm?.({ columnCount: parsedCols })
    }
  }

  return (
    <div className="cad-multi-overlay-backdrop" role="dialog" aria-modal="true" aria-label="Organizador AV">
      <section className="cad-multi-overlay" ref={panelRef} style={panelStyle}>
        <header className="cad-multi-overlay__header" onPointerDown={onHandlePointerDown}>
          <span>Organizador AV</span>
          <button type="button" className="cad-multi-overlay__close" aria-label="Fechar" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="cad-multi-overlay__title-bar cad-multi-overlay__title-bar--av">
          QUANTIDADE DE COLUNAS
        </div>

        <div className="cad-multi-overlay__body">
          <div className="cad-multi-overlay__row">
            <label className="cad-multi-overlay__label" htmlFor="av-org-cols-input">
              Colunas:
            </label>
            <input
              id="av-org-cols-input"
              ref={inputRef}
              type="number"
              min="1"
              max="12"
              className="cad-multi-overlay__input"
              value={columns}
              onChange={(event) => setColumns(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleConfirm()
                else if (event.key === 'Escape') onClose?.()
              }}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>

          <div className="cad-multi-overlay__actions">
            <button type="button" className="cad-scale-overlay__start-btn" onClick={handleConfirm}>
              Ok
            </button>
            <button type="button" className="cad-scale-overlay__start-btn" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AvOrganizerOverlay
