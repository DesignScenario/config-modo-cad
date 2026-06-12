import { useState } from 'react'
import { useDraggable } from '../hooks/useDraggable.js'

const OPTIONS = [
  { value: 'baixa', label: 'Baixo' },
  { value: 'media', label: 'Médio' },
  { value: 'alta',  label: 'Alto'  },
]

function RadioIcon({ checked }) {
  return (
    <span className={`cad-oc-overlay__radio-icon${checked ? ' is-checked' : ''}`} aria-hidden="true">
      {checked ? <span className="cad-oc-overlay__radio-dot" /> : null}
    </span>
  )
}

function OcSensitivityOverlay({ currentSensitivity, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(currentSensitivity ?? 'media')
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()

  return (
    <div className="cad-oc-overlay-backdrop" role="dialog" aria-modal="true" aria-label="Sensores de ocupação">
      <section className="cad-oc-overlay" ref={panelRef} style={panelStyle}>

        <header className="cad-oc-overlay__titlebar" onPointerDown={onHandlePointerDown}>
          <span className="cad-oc-overlay__titlebar-text">Sensores de ocupação</span>
          <button type="button" className="cad-oc-overlay__titlebar-close" onClick={onCancel} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="cad-oc-overlay__dark-header">
          <span className="cad-oc-overlay__dark-header-text">Sensibilidade do sensor OC</span>
        </div>

        <div className="cad-oc-overlay__body">
          <p className="cad-oc-overlay__description">
            Selecione o nível de sensibilidade do campo de atuação do sensor de ocupação:
          </p>

          <div className="cad-oc-overlay__radios">
            {OPTIONS.map((opt) => (
              <label key={opt.value} className="cad-oc-overlay__radio-item">
                <RadioIcon checked={selected === opt.value} />
                <input
                  type="radio"
                  name="oc-sensitivity"
                  value={opt.value}
                  checked={selected === opt.value}
                  onChange={() => setSelected(opt.value)}
                  className="cad-oc-overlay__radio-input"
                />
                <span className="cad-oc-overlay__radio-label">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="cad-oc-overlay__footer">
            <button
              type="button"
              className="cad-oc-overlay__btn-ok"
              onClick={() => onConfirm(selected)}
            >
              Ok
            </button>
          </div>
        </div>

      </section>
    </div>
  )
}

export default OcSensitivityOverlay
