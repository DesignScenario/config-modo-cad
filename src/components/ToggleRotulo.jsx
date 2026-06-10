import grandeOffSvg from '../assets/e2/toggle/grande-off.svg'
import grandeOnSvg from '../assets/e2/toggle/grande-on.svg'
import pequenoOffSvg from '../assets/e2/toggle/pequeno-off.svg'
import pequenoOnSvg from '../assets/e2/toggle/pequeno-on.svg'

function ToggleRotulo({ tamanho = 'grande', estado = false, onToggle }) {
  const isGrande = tamanho === 'grande'
  const imgSrc = isGrande
    ? (estado ? grandeOnSvg : grandeOffSvg)
    : (estado ? pequenoOnSvg : pequenoOffSvg)

  return (
    <div className={`cad-toggle-rotulo${isGrande ? ' is-grande' : ''}`}>
      <span className="cad-toggle-rotulo__label">
        {isGrande ? <><span>EMBRACE</span><br /><span>ASSISTANT</span></> : 'ASSISTANT'}
      </span>
      <button
        type="button"
        className="cad-toggle-rotulo__btn"
        onClick={onToggle}
        aria-pressed={estado}
        title={estado ? 'Desativar Embrace Assistant' : 'Ativar Embrace Assistant'}
      >
        <img
          src={imgSrc}
          alt={estado ? 'ON' : 'OFF'}
          className="cad-toggle-rotulo__img"
        />
      </button>
    </div>
  )
}

export default ToggleRotulo
