import { useRef, useState } from 'react'
import { useDraggable } from '../hooks/useDraggable.js'

function AddMultipleItemsOverlay({ itemLabel, onConfirm, onClose }) {
  const [quantity, setQuantity] = useState('')
  const inputRef = useRef(null)
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()

  const handleConfirm = () => {
    const parsed = Number.parseInt(quantity, 10)
    if (!Number.isNaN(parsed) && parsed > 0) {
      onConfirm?.({ quantity: parsed, itemLabel })
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleConfirm()
    } else if (event.key === 'Escape') {
      onClose?.()
    }
  }

  return (
    <div className="cad-multi-overlay-backdrop" role="dialog" aria-modal="true" aria-label="Adicionar múltiplos itens">
      <section className="cad-multi-overlay" ref={panelRef} style={panelStyle}>
        <header className="cad-multi-overlay__header" onPointerDown={onHandlePointerDown}>
          <span>Adicionar múltiplos itens</span>
          <button
            type="button"
            className="cad-multi-overlay__close"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="cad-multi-overlay__title-bar">
          ADICIONAR MÚLTIPLOS ITENS
        </div>

        <div className="cad-multi-overlay__body">
          <div className="cad-multi-overlay__row">
            <label className="cad-multi-overlay__label" htmlFor="multi-qty-input">
              Quantidade:
            </label>
            <input
              id="multi-qty-input"
              ref={inputRef}
              type="number"
              min="1"
              className="cad-multi-overlay__input"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              onKeyDown={handleKeyDown}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>

          <div className="cad-multi-overlay__actions">
            <button
              type="button"
              className="cad-scale-overlay__start-btn"
              onClick={handleConfirm}
            >
              Ok
            </button>
            <button
              type="button"
              className="cad-scale-overlay__start-btn"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AddMultipleItemsOverlay
