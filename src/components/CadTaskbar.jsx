import colapsarSvg from '../assets/e2/botão/colapsar.svg'
import equipamentosSvg from '../assets/equipamentos.svg'
import enviarProjetoSvg from '../assets/enviar-projeto.svg'
import estruturaSvg from '../assets/estrutura.svg'
import expandirSvg from '../assets/e2/botão/expandir.svg'
import gerenciamentoDriversSvg from '../assets/gerenciamento-de-drivers.svg'
import informacoesProjetoSvg from '../assets/informações-do-projeto.svg'
import instalacaoSvg from '../assets/instalação.svg'
import modoCadSvg from '../assets/modo-cad.svg'
import programacaoSvg from '../assets/programação.svg'
import ToggleRotulo from './ToggleRotulo'

const ITEMS_START = [
  { id: 'informacoes-projeto', label: 'Informações do Projeto', shortLabel: 'Informações', icon: informacoesProjetoSvg },
]

const ITEMS_MODE = [
  { id: 'estrutura', label: 'Modo Estrutura', icon: estruturaSvg },
  { id: 'cad', label: 'Modo CAD', icon: modoCadSvg },
]

const ITEMS_END = [
  { id: 'equipamentos', label: 'Equipamentos', icon: equipamentosSvg },
  { id: 'programacao', label: 'Programação', icon: programacaoSvg },
  { id: 'instalacao', label: 'Instalação', icon: instalacaoSvg },
  { id: 'drivers', label: 'Gerenciamento de Drivers', shortLabel: 'Drivers', icon: gerenciamentoDriversSvg },
  { id: 'enviar-projeto', label: 'Enviar Projeto', icon: enviarProjetoSvg },
]

function TaskbarItem({ item, activeItem, expanded, onItemClick }) {
  return (
    <button
      type="button"
      className={`cad-taskbar__item${item.id === activeItem ? ' is-active' : ''}`}
      onClick={() => onItemClick?.(item.id)}
      title={item.label}
    >
      <img src={item.icon} alt="" className="cad-taskbar__item-icon" />
      <span className="cad-taskbar__item-label">
        {expanded ? item.label : (item.shortLabel ?? item.label)}
      </span>
    </button>
  )
}

function CadTaskbar({ activeItem = 'cad', expanded = false, onToggleExpanded, onItemClick, toggleEstado = false, onToggleEstado }) {
  const itemProps = { activeItem, expanded, onItemClick }
  return (
    <div className={`cad-taskbar${expanded ? ' is-expanded' : ''}`}>
      <nav className="cad-taskbar__items" aria-label="Barra de tarefas">
        {ITEMS_START.map((item) => (
          <TaskbarItem key={item.id} item={item} {...itemProps} />
        ))}

        <div className="cad-taskbar__mode-group">
          {ITEMS_MODE.map((item) => (
            <TaskbarItem key={item.id} item={item} {...itemProps} />
          ))}
        </div>

        {ITEMS_END.map((item) => (
          <TaskbarItem key={item.id} item={item} {...itemProps} />
        ))}
      </nav>

      <div className="cad-taskbar__side-controls">
        <ToggleRotulo
          tamanho={expanded ? 'grande' : 'pequeno'}
          estado={toggleEstado}
          onToggle={onToggleEstado}
        />
        <button
          type="button"
          className="cad-taskbar__expand-btn"
          onClick={onToggleExpanded}
          title={expanded ? 'Colapsar' : 'Expandir'}
        >
          <img
            src={expanded ? colapsarSvg : expandirSvg}
            alt=""
            className="cad-taskbar__expand-icon"
          />
        </button>
      </div>
    </div>
  )
}

export default CadTaskbar
