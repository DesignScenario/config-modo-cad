import { useState } from 'react'
import { useDraggable } from '../hooks/useDraggable.js'
import placeholderImg from '../assets/BibliotecaScenario/Placeholder/pt.jpg'

import adegaImg from '../assets/BibliotecaScenario/Adega.jpg'
import areadeservicoImg from '../assets/BibliotecaScenario/Área-Serviço.jpg'
import banheiraImg from '../assets/BibliotecaScenario/Banheira.jpg'
import banheiroImg from '../assets/BibliotecaScenario/Banheiro.jpg'
import banheiroservicoImg from '../assets/BibliotecaScenario/Banheiro-Serviço.jpg'
import barImg from '../assets/BibliotecaScenario/Bar.jpg'
import brinquedotecaImg from '../assets/BibliotecaScenario/Brinquedoteca.jpg'
import cafeImg from '../assets/BibliotecaScenario/Café.jpg'
import churrasqueiraImg from '../assets/BibliotecaScenario/Churrasqueira.jpg'
import closetImg from '../assets/BibliotecaScenario/CloseT.jpg'
import corredorImg from '../assets/BibliotecaScenario/Corredor.jpg'
import cozinhaImg from '../assets/BibliotecaScenario/Cozinha.jpg'
import despensaImg from '../assets/BibliotecaScenario/Despensa.jpg'
import dormitórioImg from '../assets/BibliotecaScenario/Dormitório.jpg'
import duchasImg from '../assets/BibliotecaScenario/Ducha.jpg'
import entradaImg from '../assets/BibliotecaScenario/Entrada.jpg'
import escadaImg from '../assets/BibliotecaScenario/Escada.jpg'
import garagemImg from '../assets/BibliotecaScenario/Garagem.jpg'
import hallentradaImg from '../assets/BibliotecaScenario/Hall-Entrada.jpg'
import homeofficeImg from '../assets/BibliotecaScenario/Home-Office.jpg'
import homeoffice2Img from '../assets/BibliotecaScenario/Home-Office-2.jpg'
import hometheaterImg from '../assets/BibliotecaScenario/Home-Theater.jpg'
import hometheater2Img from '../assets/BibliotecaScenario/Home-Theater2.jpg'
import jantarImg from '../assets/BibliotecaScenario/Jantar.jpg'
import jardimImg from '../assets/BibliotecaScenario/Jardim.jpg'
import lareiraImg from '../assets/BibliotecaScenario/Lareira.jpg'
import lavaboImg from '../assets/BibliotecaScenario/Lavabo.jpg'
import lavatorioImg from '../assets/BibliotecaScenario/Lavatório.jpg'
import livingImg from '../assets/BibliotecaScenario/Living.jpg'
import penteadeiraImg from '../assets/BibliotecaScenario/Penteadeira.jpg'
import piscinaImg from '../assets/BibliotecaScenario/Piscina.jpg'
import quadradetenisImg from '../assets/BibliotecaScenario/Quadra-Tenis.jpg'
import quartoImg from '../assets/BibliotecaScenario/Quarto.jpg'
import salaaudiovideoImg from '../assets/BibliotecaScenario/Sala-Áudio-e-Vídeo.jpg'
import salaesperaImg from '../assets/BibliotecaScenario/Sala-Espera.jpg'
import salaestarImg from '../assets/BibliotecaScenario/Estar.jpg'
import saladeginasticaImg from '../assets/BibliotecaScenario/Sala-de-Ginástica.jpg'
import saladejogosImg from '../assets/BibliotecaScenario/Sala-de-Jogos.jpg'
import saladeleituraImg from '../assets/BibliotecaScenario/Sala-Leitura.jpg'
import salademusicaImg from '../assets/BibliotecaScenario/Sala-de-Musica-1.jpg'
import salademusica2Img from '../assets/BibliotecaScenario/Sala-de-Música-2.jpg'
import salademusica3Img from '../assets/BibliotecaScenario/Sala-de-Música-3.jpg'
import salareuniaoImg from '../assets/BibliotecaScenario/Sala-de-Reunião.jpg'
import salasinucaImg from '../assets/BibliotecaScenario/Sala-de-Sinuca.jpg'
import salatvImg from '../assets/BibliotecaScenario/Sala-TV.jpg'
import spaImg from '../assets/BibliotecaScenario/Spa.jpg'
import suiteImg from '../assets/BibliotecaScenario/Suíte-1.jpg'
import suite2Img from '../assets/BibliotecaScenario/Suíte-2.jpg'
import suite3Img from '../assets/BibliotecaScenario/Suíte-3.jpg'
import suitemasterImg from '../assets/BibliotecaScenario/Suíte-Master.jpg'
import varandaImg from '../assets/BibliotecaScenario/Varanda.jpg'
import varandagourmetImg from '../assets/BibliotecaScenario/Varanda-Gourmet.jpg'
import varandagourmet2Img from '../assets/BibliotecaScenario/Varanda-Gourmet-2.jpg'
import wcImg from '../assets/BibliotecaScenario/WC.jpg'

const ENVIRONMENT_IMAGE_MAP = {
    'Adega': adegaImg,
    'Área de Serviço': areadeservicoImg,
    'Banheira': banheiraImg,
    'Banheiro': banheiroImg,
    'Banheiro de Serviço': banheiroservicoImg,
    'Bar': barImg,
    'Brinquedoteca': brinquedotecaImg,
    'Café': cafeImg,
    'Churrasqueira': churrasqueiraImg,
    'Closet': closetImg,
    'Corredor': corredorImg,
    'Cozinha': cozinhaImg,
    'Despensa': despensaImg,
    'Dormitório': dormitórioImg,
    'Ducha': duchasImg,
    'Entrada': entradaImg,
    'Escada': escadaImg,
    'Garagem': garagemImg,
    'Hall de Entrada': hallentradaImg,
    'Home-Office': homeofficeImg,
    'Home-Office 2': homeoffice2Img,
    'Home-Theater': hometheaterImg,
    'Home-Theater 2': hometheater2Img,
    'Jantar': jantarImg,
    'Jardim': jardimImg,
    'Lareira': lareiraImg,
    'Lavabo': lavaboImg,
    'Lavatório': lavatorioImg,
    'Living': livingImg,
    'Penteadeira': penteadeiraImg,
    'Piscina': piscinaImg,
    'Quadra de Tênis': quadradetenisImg,
    'Quarto': quartoImg,
    'Sala de Áudio e Vídeo': salaaudiovideoImg,
    'Sala de Espera': salaesperaImg,
    'Sala de Estar': salaestarImg,
    'Sala de Ginástica': saladeginasticaImg,
    'Sala de Jogos': saladejogosImg,
    'Sala de Leitura': saladeleituraImg,
    'Sala de Música': salademusicaImg,
    'Sala de Música 2': salademusica2Img,
    'Sala de Música 3': salademusica3Img,
    'Sala de Reunião': salareuniaoImg,
    'Sala de Sinuca': salasinucaImg,
    'Sala-TV': salatvImg,
    'Spa': spaImg,
    'Suíte': suiteImg,
    'Suíte 2': suite2Img,
    'Suíte 3': suite3Img,
    'Suíte Master': suitemasterImg,
    'Varanda': varandaImg,
    'Varanda Gourmet': varandagourmetImg,
    'Varanda Gourmet 2': varandagourmet2Img,
    'WC': wcImg,
}

function getEnvironmentImage(name) {
  return ENVIRONMENT_IMAGE_MAP[name] ?? placeholderImg
}

function EnvironmentLibraryOverlay({ presets, onSelect, onClose }) {
  const [selectedPreset, setSelectedPreset] = useState(null)
  const { panelRef, panelStyle, onHandlePointerDown } = useDraggable()

  const handleConfirm = () => {
    if (selectedPreset) {
      onSelect(selectedPreset)
    }
  }

  return (
    <div
      className="cad-env-library-overlay"
      ref={panelRef}
      style={panelStyle}
      role="dialog"
      aria-label="Biblioteca de Ambientes"
    >
      <header
        className="cad-env-library-overlay__header"
        onPointerDown={onHandlePointerDown}
      >
        <span>Biblioteca de Ambientes</span>
        <button
          type="button"
          className="cad-env-library-overlay__close-btn"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>
      </header>

      <div className="cad-env-library-overlay__content">
        <div className="cad-env-library-overlay__list-panel">
          <div
            className="cad-env-library-overlay__list"
            role="listbox"
            aria-label="Ambientes pré-definidos"
          >
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                role="option"
                aria-selected={selectedPreset?.name === preset.name}
                className={`cad-env-library-overlay__list-item${
                  selectedPreset?.name === preset.name ? ' is-selected' : ''
                }`}
                onClick={() => setSelectedPreset(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="cad-env-library-overlay__preview">
          <img
            src={getEnvironmentImage(selectedPreset?.name)}
            alt={selectedPreset ? selectedPreset.name : 'Selecione um ambiente'}
            className="cad-env-library-overlay__preview-img"
          />
        </div>
      </div>

      <footer className="cad-env-library-overlay__footer">
        <button
          type="button"
          className="cad-scale-overlay__start-btn"
          disabled={!selectedPreset}
          onClick={handleConfirm}
        >
          Selecionar
        </button>
      </footer>
    </div>
  )
}

export default EnvironmentLibraryOverlay
