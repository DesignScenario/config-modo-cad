/**
 * Mapa de wireframes técnicos por ID de equipamento.
 *
 * Cada entrada define:
 *   - svgUrl   : URL do arquivo SVG importado via Vite (import estático)
 *   - widthMm  : largura real do equipamento em milímetros
 *   - heightMm : altura (profundidade) real do equipamento em milímetros
 *
 * Para adicionar um novo wireframe, importe o SVG abaixo e acrescente
 * uma entrada com o ID do equipamento correspondente em EQUIPMENT_WIREFRAMES.
 *
 * O ID deve coincidir com o campo `id` do equipamento em equipmentLibrary.js.
 */

// Scenario > Quadros de Automação
import acQa6mSvg from '../assets/wireframes/ac-qa-6m.svg'
import acQa12mSvg from '../assets/wireframes/ac-qa-12m.svg'

// Ambiente > Acessórios / Scenario > Sensores (sensor de teto)
import ebSmtSvg from '../assets/wireframes/eb-smt.svg'

// Ambiente > Acessórios
import acTmdSvg from '../assets/wireframes/ac-tmd-4x2.svg'

// Ambiente > Pulsadores Essence
import acPuls2Svg from '../assets/wireframes/ac-puls2-4x2.svg'
import acPuls3Svg from '../assets/wireframes/ac-puls3-4x2.svg'

// Scenario > Keypads Essence
import esnKp2Svg from '../assets/wireframes/esn-kp2-4x2.svg'
import esnKp3Svg from '../assets/wireframes/esn-kp3-4x2.svg'
import esnKp3mPirSvg from '../assets/wireframes/esn-kp3m-pir-4x2.svg'
import esnKp3mPir4rWifiSvg from '../assets/wireframes/esn-kp3m-pir-4r-wifi.svg'
import esnKp3mOcSvg from '../assets/wireframes/esn-kp3m-oc-4x2.svg'
import esnKp6Svg from '../assets/wireframes/esn-kp6-4x2.svg'
import esnKp64rWifiSvg from '../assets/wireframes/esn-kp6-4R-wifi.svg'
import esnKp63dimWifiSvg from '../assets/wireframes/esn-kp6-3dim-wifi.svg'

// Scenario > Keypads Virtue (Standard e Metal compartilham os mesmos SVGs)
import ebKp0mSvg  from '../assets/wireframes/EB-KP0M_4x2.svg'
import ebKp1Svg   from '../assets/wireframes/EB-KP1_4x2.svg'
import ebKp2Svg   from '../assets/wireframes/EB-KP2_4x2.svg'
import ebKp3Svg   from '../assets/wireframes/EB-KP3_4x2.svg'
import ebKp12Svg  from '../assets/wireframes/EB-KP12_4x2.svg'
import ebKp6mSvg  from '../assets/wireframes/EB-KP6M_4x2.svg'

// Scenario > Touchscreens
import ebTw4pSvg  from '../assets/wireframes/eb-tw4p.svg'
import ebTw10pSvg from '../assets/wireframes/eb-tw10p.svg'

// Scenario > Keypads Prestige
import pstKp1Svg from '../assets/wireframes/pst-kp1-4x2.svg'
import pstKp2Svg from '../assets/wireframes/pst-kp2-4x2.svg'
import pstKp3Svg from '../assets/wireframes/pst-kp3-4x2.svg'
import pstKp6Svg from '../assets/wireframes/pst-kp6-4x2.svg'
import pstKp12Svg from '../assets/wireframes/pst-kp12-4x2.svg'
import pstKp6mPirSvg from '../assets/wireframes/pst-kp6m-pir-4x2.svg'
import pstKp6mOcSvg from '../assets/wireframes/pst-kp6m-oc-4x2.svg'

// widthMm = largura (L), heightMm = profundidade (A) visto de cima
export const EQUIPMENT_WIREFRAMES = {
  // Scenario > Quadros de Automação (vista de cima: 500 mm × 110 mm)
  'sce-quadros-1': { svgUrl: acQa6mSvg,  widthMm: 500, heightMm: 110 },
  'sce-quadros-2': { svgUrl: acQa12mSvg, widthMm: 500, heightMm: 110 },

  // Sensores de teto (AC-MOV-TETO, EB-SMT, EB-SMTv2) — 60 mm × 60 mm
  'amb-acessorios-1': { svgUrl: ebSmtSvg, widthMm: 60, heightMm: 60 },
  'sce-sensores-1':   { svgUrl: ebSmtSvg, widthMm: 60, heightMm: 60 },
  'sce-sensores-2':   { svgUrl: ebSmtSvg, widthMm: 60, heightMm: 60 },

  // Ambiente > Acessórios
  'amb-acessorios-2':        { svgUrl: acTmdSvg,       widthMm: 85, heightMm: 122 },

  // Ambiente > Pulsadores Essence
  'amb-pulsadores-essence-1': { svgUrl: acPuls2Svg,    widthMm: 85, heightMm: 122 },
  'amb-pulsadores-essence-2': { svgUrl: acPuls3Svg,    widthMm: 85, heightMm: 122 },

  // Scenario > Keypads Essence
  'sce-keypads-essence-1':   { svgUrl: esnKp2Svg,           widthMm: 85, heightMm: 122 },
  'sce-keypads-essence-2':   { svgUrl: esnKp3Svg,           widthMm: 85, heightMm: 122 },
  'sce-keypads-essence-3':   { svgUrl: esnKp6Svg,           widthMm: 85, heightMm: 122 },
  'sce-keypads-essence-4':   { svgUrl: esnKp3mPirSvg,       widthMm: 85, heightMm: 122 },
  'sce-keypads-essence-5':   { svgUrl: esnKp3mOcSvg,        widthMm: 85, heightMm: 122 },
  'sce-keypads-essence-6':   { svgUrl: esnKp3mPir4rWifiSvg, widthMm: 85, heightMm: 122 },
  'sce-keypads-essence-7':   { svgUrl: esnKp64rWifiSvg,     widthMm: 85, heightMm: 122 },
  'sce-keypads-essence-8':   { svgUrl: esnKp63dimWifiSvg,   widthMm: 85, heightMm: 122 },

  // Scenario > Keypads Virtue Standard
  'sce-keypads-virtue-standard-1': { svgUrl: ebKp0mSvg,  widthMm: 85, heightMm: 122 },
  'sce-keypads-virtue-standard-2': { svgUrl: ebKp0mSvg,  widthMm: 85, heightMm: 122 }, // EB-KP0Mv2
  'sce-keypads-virtue-standard-3': { svgUrl: ebKp1Svg,   widthMm: 85, heightMm: 122 },
  'sce-keypads-virtue-standard-4': { svgUrl: ebKp2Svg,   widthMm: 85, heightMm: 122 },
  'sce-keypads-virtue-standard-5': { svgUrl: ebKp3Svg,   widthMm: 85, heightMm: 122 },
  'sce-keypads-virtue-standard-6': { svgUrl: ebKp12Svg,  widthMm: 85, heightMm: 122 },
  'sce-keypads-virtue-standard-7': { svgUrl: ebKp6mSvg,  widthMm: 85, heightMm: 122 },
  'sce-keypads-virtue-standard-8': { svgUrl: ebKp6mSvg,  widthMm: 85, heightMm: 122 }, // EB-KP6Mv2

  // Scenario > Keypads Virtue Metal (mesmo SVG que Standard)
  'sce-keypads-virtue-metal-1': { svgUrl: ebKp0mSvg,  widthMm: 85, heightMm: 122 },
  'sce-keypads-virtue-metal-2': { svgUrl: ebKp0mSvg,  widthMm: 85, heightMm: 122 }, // EB-KP0Mv2
  'sce-keypads-virtue-metal-3': { svgUrl: ebKp1Svg,   widthMm: 85, heightMm: 122 },
  'sce-keypads-virtue-metal-4': { svgUrl: ebKp2Svg,   widthMm: 85, heightMm: 122 },
  'sce-keypads-virtue-metal-5': { svgUrl: ebKp3Svg,   widthMm: 85, heightMm: 122 },
  'sce-keypads-virtue-metal-6': { svgUrl: ebKp12Svg,  widthMm: 85, heightMm: 122 },
  'sce-keypads-virtue-metal-7': { svgUrl: ebKp6mSvg,  widthMm: 85, heightMm: 122 },
  'sce-keypads-virtue-metal-8': { svgUrl: ebKp6mSvg,  widthMm: 85, heightMm: 122 }, // EB-KP6Mv2

  // Scenario > Touchscreens
  'sce-touch-1': { svgUrl: ebTw4pSvg,  widthMm: 85,  heightMm: 85  }, // EB-TW4
  'sce-touch-2': { svgUrl: ebTw10pSvg, widthMm: 240, heightMm: 170 }, // EB-TW10

  // Scenario > Keypads Prestige
  'sce-keypads-prestige-1':  { svgUrl: pstKp1Svg,      widthMm: 85, heightMm: 122 },
  'sce-keypads-prestige-2':  { svgUrl: pstKp2Svg,      widthMm: 85, heightMm: 122 },
  'sce-keypads-prestige-3':  { svgUrl: pstKp3Svg,      widthMm: 85, heightMm: 122 },
  'sce-keypads-prestige-4':  { svgUrl: pstKp6Svg,      widthMm: 85, heightMm: 122 },
  'sce-keypads-prestige-5':  { svgUrl: pstKp12Svg,     widthMm: 85, heightMm: 122 },
  'sce-keypads-prestige-6':  { svgUrl: pstKp6mPirSvg,  widthMm: 85, heightMm: 122 },
  'sce-keypads-prestige-7':  { svgUrl: pstKp6mOcSvg,   widthMm: 85, heightMm: 122 },
}
