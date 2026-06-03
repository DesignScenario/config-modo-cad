import { useDraggable } from '../hooks/useDraggable.js'

function OverlayHeader({ onClose, onPointerDown }) {
  return (
    <header className="cad-equip-props-overlay__header" onPointerDown={onPointerDown}>
      <h3 className="cad-equip-props-overlay__title">Propriedades do Equipamento</h3>
      <button
        type="button"
        className="cad-equip-props-overlay__close"
        onClick={onClose}
        aria-label="Fechar propriedades do equipamento"
      >
        ×
      </button>
    </header>
  )
}

function Checkbox({ checked = false }) {
  return <span className={`cad-equip-props-overlay__checkbox${checked ? ' is-checked' : ''}`}>{checked ? '✓' : ''}</span>
}

function ReadOnlyInput({ value, width = '90px' }) {
  return <input className="cad-equip-props-overlay__input" style={{ width }} value={value} readOnly />
}

function ReadOnlySelect({ value, width = '138px' }) {
  return (
    <div className="cad-equip-props-overlay__select" style={{ width }}>
      <span>{value}</span>
      <span className="cad-equip-props-overlay__select-arrow" aria-hidden="true" />
    </div>
  )
}

function Card({ title, children }) {
  return (
    <section className="cad-equip-props-overlay__card">
      <div className="cad-equip-props-overlay__card-title">{title}</div>
      {children}
    </section>
  )
}

function InfoPair({ label, value }) {
  return (
    <div className="cad-equip-props-overlay__info-pair">
      <span className="cad-equip-props-overlay__field-label">{label}</span>
      <span className="cad-equip-props-overlay__field-value">{value}</span>
    </div>
  )
}

function FieldRow({ label, control, wide = false }) {
  return (
    <div className={`cad-equip-props-overlay__field-row${wide ? ' is-wide' : ''}`}>
      <span className="cad-equip-props-overlay__field-label">{label}</span>
      {control}
    </div>
  )
}

function SliderMock({ leftLabel, rightLabel, knobPosition = '18%' }) {
  return (
    <div className="cad-equip-props-overlay__slider-block">
      <div className="cad-equip-props-overlay__slider-track">
        <span className="cad-equip-props-overlay__slider-thumb" style={{ left: knobPosition }} />
      </div>
      <div className="cad-equip-props-overlay__slider-scale">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  )
}

function ColorSwatch({ label, color }) {
  return (
    <div className="cad-equip-props-overlay__swatch-group">
      <span className="cad-equip-props-overlay__swatch-label">{label}</span>
      <span className="cad-equip-props-overlay__swatch" style={{ background: color }} />
    </div>
  )
}

function LuminariaContent({ equipmentName, environmentName }) {
  return (
    <div className="cad-equip-props-overlay__panel">
      <div className="cad-equip-props-overlay__panel-header">
        {`LUMINÁRIA - PAVIMENTO\\${environmentName.toUpperCase()}\\${equipmentName.toUpperCase()}`}
      </div>
      <div className="cad-equip-props-overlay__tabs">
        <button type="button" className="cad-equip-props-overlay__tab is-active">Informações</button>
        <button type="button" className="cad-equip-props-overlay__tab">Limites</button>
      </div>
      <div className="cad-equip-props-overlay__scroll-area cad-equip-props-overlay__scroll-area--with-tabs">
        <div className="cad-equip-props-overlay__content-column cad-equip-props-overlay__content-column--luminaria">
          <h4 className="cad-equip-props-overlay__equipment-name">{equipmentName.toUpperCase()}</h4>
          <div className="cad-equip-props-overlay__section-title">Propriedades</div>
          <Card title="Configurações de dimerização">
            <div className="cad-equip-props-overlay__checkbox-row">
              <Checkbox checked />
              <span className="cad-equip-props-overlay__field-label">Dimerizável</span>
            </div>
            <FieldRow
              label="Tempo de dimerização"
              wide
              control={(
                <div className="cad-equip-props-overlay__inline-control">
                  <ReadOnlyInput value="0" width="70px" />
                  <span className="cad-equip-props-overlay__field-label">segundo(s)</span>
                </div>
              )}
            />
          </Card>
          <Card title="Informações Técnicas">
            <FieldRow label="Circuito" control={<ReadOnlyInput value="0" />} />
            <FieldRow label="Potência unitária (W)" control={<ReadOnlyInput value="1" />} />
            <FieldRow label="Número de lâmpadas" control={<ReadOnlyInput value="1" />} />
            <FieldRow label="Tensão" control={<ReadOnlySelect value="127V" width="90px" />} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function PstKp3Content({ equipmentName, environmentName }) {
  return (
    <div className="cad-equip-props-overlay__panel">
      <div className="cad-equip-props-overlay__panel-header">
        {`PST-KP3 - PAVIMENTO\\${environmentName.toUpperCase()}\\${equipmentName.toUpperCase()}`}
      </div>
      <div className="cad-equip-props-overlay__scroll-area">
        <div className="cad-equip-props-overlay__content-column cad-equip-props-overlay__content-column--keypad">
          <h4 className="cad-equip-props-overlay__equipment-name">PST-KP3</h4>

          <div className="cad-equip-props-overlay__section-block">
            <div className="cad-equip-props-overlay__section-title">Informações</div>
            <div className="cad-equip-props-overlay__info-grid">
              <InfoPair label="Endereço:" value="0" />
              <InfoPair label="Versão:" value="0.0.0.0" />
              <InfoPair label="Número de Série:" value="00000000" />
              <InfoPair label="Rede:" value="Não associado" />
            </div>
          </div>

          <div className="cad-equip-props-overlay__section-block">
            <div className="cad-equip-props-overlay__section-title">Propriedades</div>

            <Card title="Configurações do Espelho">
              <FieldRow label="Tipo de Espelho" control={<ReadOnlySelect value="4x2" />} />
              <FieldRow label="Cor do Espelho" control={<ReadOnlySelect value="Silver" />} />
              <FieldRow label="Cor das Teclas" control={<ReadOnlySelect value="Branco" />} />
              <FieldRow label="Cor da Moldura" control={<ReadOnlySelect value="Preto" />} />
            </Card>

            <Card title="Tema do Teclado">
              <FieldRow label="Tema" control={<ReadOnlySelect value="Tema do Projeto" width="150px" />} wide />
              <div className="cad-equip-props-overlay__swatches">
                <span className="cad-equip-props-overlay__field-label">Cores</span>
                <ColorSwatch label="STATUS ON" color="#0096ff" />
                <ColorSwatch label="BACKLIGHT" color="#ffffff" />
              </div>
            </Card>

            <Card title="Configuração de Sensores">
              <div className="cad-equip-props-overlay__checkbox-row">
                <Checkbox />
                <span className="cad-equip-props-overlay__field-label">Possui M-Sensor (luminosidade, temperatura e umidade)</span>
              </div>
              <div className="cad-equip-props-overlay__checkbox-row">
                <Checkbox />
                <span className="cad-equip-props-overlay__field-label">Utilizar no SmartLumi</span>
              </div>
              <div className="cad-equip-props-overlay__sensor-group">
                <span className="cad-equip-props-overlay__field-label">Ganho do sensor de Luminosidade</span>
                <FieldRow label="Valor" control={<SliderMock leftLabel="Padrão" rightLabel="Máximo" />} wide />
              </div>
            </Card>

            <Card title="LEDS das teclas">
              <div className="cad-equip-props-overlay__checkbox-row">
                <Checkbox checked />
                <span className="cad-equip-props-overlay__field-label">Desliga LEDs com intensidade 0%</span>
              </div>
              <div className="cad-equip-props-overlay__nested-block">
                <div className="cad-equip-props-overlay__checkbox-row">
                  <Checkbox />
                  <span className="cad-equip-props-overlay__field-label">Brilho fixo</span>
                </div>
                <FieldRow label="Intensidade Leds On" control={<SliderMock leftLabel="0%" rightLabel="100%" knobPosition="100%" />} wide />
              </div>
              <div className="cad-equip-props-overlay__nested-block">
                <div className="cad-equip-props-overlay__checkbox-row">
                  <Checkbox checked />
                  <span className="cad-equip-props-overlay__field-label">Brilho variável (utilizando “Entrada de sensor de luminosidade”)</span>
                </div>
                <div className="cad-equip-props-overlay__advanced-row">
                  <div className="cad-equip-props-overlay__checkbox-row cad-equip-props-overlay__checkbox-row--compact">
                    <Checkbox checked />
                    <span className="cad-equip-props-overlay__field-label">Modo Avançado</span>
                  </div>
                  <span className="cad-equip-props-overlay__info-icon">i</span>
                  <button type="button" className="cad-equip-props-overlay__action-btn">Configurar</button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function DefaultContent() {
  return (
    <div className="cad-equip-props-overlay__default-state">
      Aqui serão inseridas as Propriedades do Equipamento
    </div>
  )
}

function EquipmentPropertiesOverlay({ equipment, environmentName = 'Ambiente', onClose }) {
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()
  const equipmentName = equipment?.label ?? 'Equipamento'

  let content = <DefaultContent />

  if (equipment?.catalogItemId === 'amb-iluminacao-1') {
    content = <LuminariaContent equipmentName={equipmentName} environmentName={environmentName} />
  } else if (equipment?.catalogItemId === 'sce-keypads-prestige-3') {
    content = <PstKp3Content equipmentName={equipmentName} environmentName={environmentName} />
  }

  return (
    <div className="cad-equip-props-overlay-backdrop" role="dialog" aria-modal="true" aria-label="Propriedades do Equipamento">
      <section className="cad-equip-props-overlay" ref={panelRef} style={panelStyle}>
        <OverlayHeader onClose={onClose} onPointerDown={onHandlePointerDown} />
        <div className="cad-equip-props-overlay__frame">{content}</div>
      </section>
    </div>
  )
}

export default EquipmentPropertiesOverlay