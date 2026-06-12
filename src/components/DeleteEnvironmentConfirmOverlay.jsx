import avisoIcon from '../assets/aviso-44px.svg'
import { useDraggable } from '../hooks/useDraggable.js'

function DeleteEnvironmentConfirmOverlay({ onConfirm, onCancel, message = 'Deseja realmente apagar o ambiente?' }) {
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()

  return (
    <div className="cad-delete-confirm-backdrop" role="dialog" aria-modal="true" aria-label="Confirmar exclusão">
      <section className="cad-delete-confirm-overlay" ref={panelRef} style={panelStyle}>
        <header className="cad-delete-confirm-overlay__header" onPointerDown={onHandlePointerDown}>
          <span>Aviso</span>
          <button
            type="button"
            className="cad-delete-confirm-overlay__close"
            aria-label="Fechar"
            onClick={onCancel}
          >
            ×
          </button>
        </header>

        <div className="cad-delete-confirm-overlay__content">
          <p className="cad-delete-confirm-overlay__text">
            {message}
          </p>
          <img
            src={avisoIcon}
            alt="Aviso"
            className="cad-delete-confirm-overlay__icon"
          />
        </div>

        <div className="cad-delete-confirm-overlay__footer">
          <div className="cad-delete-confirm-overlay__actions">
            <button
              type="button"
              className="cad-delete-confirm-overlay__btn"
              onClick={onConfirm}
            >
              Sim
            </button>
            <button
              type="button"
              className="cad-delete-confirm-overlay__btn"
              onClick={onCancel}
            >
              Não
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default DeleteEnvironmentConfirmOverlay
