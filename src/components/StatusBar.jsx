function StatusBar({ version, connectionStatus, installationName, notificationLabel }) {
  return (
    <footer className="cad-statusbar" aria-label="Barra de status">
      <div className="cad-statusbar__item">Versão: {version}</div>
      <div className="cad-statusbar__item">Status conexão: {connectionStatus}</div>
      <div className="cad-statusbar__item cad-statusbar__item--grow">Instalação: {installationName}</div>
      {notificationLabel ? (
        <div className="cad-statusbar__item cad-statusbar__item--right">{notificationLabel}</div>
      ) : null}
    </footer>
  )
}

export default StatusBar