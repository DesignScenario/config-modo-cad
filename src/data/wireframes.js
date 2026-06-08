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

import pstKp3Svg from '../assets/wireframes/pst-kp3.svg'

// widthMm = largura (L), heightMm = altura (A)
export const EQUIPMENT_WIREFRAMES = {
  'sce-keypads-prestige-3': {
    svgUrl: pstKp3Svg,
    widthMm: 85.2698,
    heightMm: 122.502,
  },
}
