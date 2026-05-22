import { useDraggable } from '../hooks/useDraggable.js'

function ScaleSetupOverlay({ onStart }) {
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()

  return (
    <div className="cad-scale-overlay-backdrop" role="dialog" aria-modal="true" aria-label="Definir escala">
      <section className="cad-scale-overlay" ref={panelRef} style={panelStyle}>
        <header className="cad-scale-overlay__header" onPointerDown={onHandlePointerDown}>Definir escala</header>

        <div className="cad-scale-overlay__content">
          <p className="cad-scale-overlay__text">
            Desenhe uma linha na planta baixa e informe a distância real correspondente para definir a escala.
          </p>

          <button type="button" className="cad-scale-overlay__start-btn" onClick={onStart}>
            Iniciar
          </button>
        </div>
      </section>
    </div>
  )
}

export default ScaleSetupOverlay
