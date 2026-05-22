import { X } from 'lucide-react'

function AppMenu({ title, items, activeItem, userLabel }) {
  return (
    <header className="cad-titlebar">
      <div className="cad-titlebar__brand">
        <div className="cad-titlebar__badge" aria-hidden="true">
          E2
        </div>
        <div className="cad-titlebar__title">{title}</div>
      </div>

      <nav className="cad-menubar" aria-label="Menu principal">
        <div className="cad-menubar__items">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              className={`cad-menubar__item${item === activeItem ? ' is-active' : ''}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="cad-menubar__user">
          <span>{userLabel}</span>
          <button type="button" className="cad-window-button" aria-label="Fechar janela">
            <X size={12} strokeWidth={2.2} />
          </button>
        </div>
      </nav>
    </header>
  )
}

export default AppMenu