export const equipmentLibraryTabs = {
  Ambiente: [
    {
      id: 'amb-iluminacao',
      label: 'Iluminação',
      icon: 'pasta',
      children: [
        { id: 'amb-iluminacao-1', label: 'Luminária Genérica', icon: 'iluminacao' },
        { id: 'amb-iluminacao-2', label: 'LED RGB PWM', icon: 'led' },
        { id: 'amb-iluminacao-3', label: 'LED CCT/Circadiano', icon: 'circadiano' },
      ],
    },
    {
      id: 'amb-acessorios',
      label: 'Acessórios',
      icon: 'pasta',
      children: [
        { id: 'amb-acessorios-1', label: 'AC-MOV-TETO', icon: 'sensor' },
      ],
    },
    {
      id: 'amb-pulsadores',
      label: 'Pulsadores',
      icon: 'pasta',
      children: [
        {
          id: 'amb-pulsadores-virtue',
          label: 'Pulsadores Virtue',
          icon: 'pasta',
          children: [
            { id: 'amb-pulsadores-virtue-1', label: 'AC-KPUL1', icon: 'pulsadores' },
            { id: 'amb-pulsadores-virtue-2', label: 'AC-KPUL2', icon: 'pulsadores' },
            { id: 'amb-pulsadores-virtue-3', label: 'AC-KPUL3', icon: 'pulsadores' },
            { id: 'amb-pulsadores-virtue-4', label: 'AC-KPUL0-MOV', icon: 'pulsadores' },
            { id: 'amb-pulsadores-virtue-5', label: 'AC-KPUL1-MOV', icon: 'pulsadores' },
            { id: 'amb-pulsadores-virtue-6', label: 'AC-KPUL2-MOV', icon: 'pulsadores' },
            { id: 'amb-pulsadores-virtue-7', label: 'AC-KPUL3-MOV', icon: 'pulsadores' },
          ],
        },
        {
          id: 'amb-pulsadores-metal',
          label: 'Pulsadores Metal',
          icon: 'pasta',
          children: [
            { id: 'amb-pulsadores-metal-1', label: 'AC-KPUL1', icon: 'pulsadores' },
            { id: 'amb-pulsadores-metal-2', label: 'AC-KPUL2', icon: 'pulsadores' },
            { id: 'amb-pulsadores-metal-3', label: 'AC-KPUL3', icon: 'pulsadores' },
            { id: 'amb-pulsadores-metal-4', label: 'AC-KPUL0-MOV', icon: 'pulsadores' },
            { id: 'amb-pulsadores-metal-5', label: 'AC-KPUL1-MOV', icon: 'pulsadores' },
            { id: 'amb-pulsadores-metal-6', label: 'AC-KPUL2-MOV', icon: 'pulsadores' },
            { id: 'amb-pulsadores-metal-7', label: 'AC-KPUL3-MOV', icon: 'pulsadores' },
          ],
        },
        {
          id: 'amb-pulsadores-essence',
          label: 'Pulsadores Essence',
          icon: 'pasta',
          children: [
            { id: 'amb-pulsadores-essence-1', label: 'AC-PULS2', icon: 'pulsadores' },
            { id: 'amb-pulsadores-essence-2', label: 'AC-PULS3', icon: 'pulsadores' },
            { id: 'amb-pulsadores-essence-3', label: 'AC-PULS3-MOV', icon: 'pulsadores' },
          ],
        },
      ],
    },
    {
      id: 'amb-acionadores',
      label: 'Acionadores',
      icon: 'pasta',
      children: [
        { id: 'amb-acionadores-1', label: 'Ventilador', icon: 'motores' },
        { id: 'amb-acionadores-2', label: 'Carga não dimerizável', icon: 'motores' },
        { id: 'amb-acionadores-3', label: 'Carga não dimerizável (Controle por relé)', icon: 'motores' },
      ],
    },
    {
      id: 'amb-cortina',
      label: 'Cortina',
      icon: 'pasta',
      children: [
        { id: 'amb-cortina-1', label: 'Cortina/Toldo por relé (Controle por estado)', icon: 'motores' },
        { id: 'amb-cortina-2', label: 'Cortina/Toldo por relé (Controle por pulso)', icon: 'motores' },
        { id: 'amb-cortina-3', label: 'Cortina/Toldo Genérico (RF)', icon: 'motores' },
        { id: 'amb-cortina-4', label: 'Cortina/Toldo Somfy RTS II (RF)', icon: 'motores' },
      ],
    },
    {
      id: 'amb-diversos',
      label: 'Diversos',
      icon: 'pasta',
      children: [
        { id: 'amb-diversos-1', label: 'Entrada digital', icon: 'entrada-digital' },
        { id: 'amb-diversos-2', label: 'Sensor Porta/Janela', icon: 'entrada-digital' },
        { id: 'amb-diversos-3', label: '[ GENERICO ] SCENARIO - RF433', icon: 'drivers' },
        { id: 'amb-diversos-4', label: '[ DISPOSITIVO DE AUDIO SEM CONTROLE ] SCENARIO - FONTE GENERICA', icon: 'drivers' },
        { id: 'amb-diversos-5', label: 'Fechadura Yale', icon: 'drivers' },
      ],
    },
    {
      id: 'amb-cameras',
      label: 'Câmeras',
      icon: 'pasta',
      children: [
        { id: 'amb-cameras-1', label: 'DVR', icon: 'dvr' },
        { id: 'amb-cameras-2', label: 'Câmera ONVIF', icon: 'camera' },
        { id: 'amb-cameras-3', label: 'Câmera Custom', icon: 'camera' },
      ],
    },
  ],
  Scenario: [
    {
      id: 'sce-automation',
      label: 'Automation Controller',
      icon: 'pasta',
      children: [
        { id: 'sce-automation-1', label: 'AC-1', icon: 'controladoras' },
        { id: 'sce-automation-2', label: 'AC-1 v2', icon: 'controladoras' },
        { id: 'sce-automation-3', label: 'AC-2-CPT', icon: 'controladoras' },
        { id: 'sce-automation-4', label: 'AC-2-PRO', icon: 'controladoras' },
        { id: 'sce-automation-5', label: 'AC-2-FULL', icon: 'controladoras' },
        { id: 'sce-automation-6', label: 'AC-2-FULL v2', icon: 'controladoras' },
      ],
    },
    {
      id: 'sce-interfaces',
      label: 'Interfaces de Comunicação',
      icon: 'pasta',
      children: [
        { id: 'sce-interfaces-1', label: 'EB-NTL1', icon: 'interface-de-comunicacao' },
        { id: 'sce-interfaces-2', label: 'EB-IRS-WIFI', icon: 'modulos-wifi' },
        { id: 'sce-interfaces-3', label: 'EB-ZRF-HUB', icon: 'modulos-wifi' },
      ],
    },
    {
      id: 'sce-modulos',
      label: 'Módulos de Acionamento',
      icon: 'pasta',
      children: [
        { id: 'sce-modulos-1', label: 'EB-SDM8-STD', icon: 'modulos' },
        { id: 'sce-modulos-2', label: 'EB-SDM8-LED', icon: 'modulos' },
        { id: 'sce-modulos-3', label: 'EB-SDM8-MAX', icon: 'modulos' },
        { id: 'sce-modulos-4', label: 'EB-MPL3', icon: 'modulos' },
        { id: 'sce-modulos-5', label: 'EB-MPL4', icon: 'modulos' },
        { id: 'sce-modulos-6', label: 'EB-MPL4-4R', icon: 'modulos' },
        { id: 'sce-modulos-7', label: 'EB-RDM8', icon: 'modulos' },
        { id: 'sce-modulos-8', label: 'EB-RCM8', icon: 'modulos' },
        { id: 'sce-modulos-9', label: 'EB-SDM2-LED-WIFI', icon: 'modulos-wifi' },
        { id: 'sce-modulos-10', label: 'EB-RLY2-WIFI', icon: 'modulos-wifi' },
        { id: 'sce-modulos-11', label: 'EB-RLY2DC-WIFI', icon: 'modulos-wifi' },
        { id: 'sce-modulos-12', label: 'EB-PWM3-WIFI', icon: 'modulos-wifi' },
      ],
    },
    {
      id: 'sce-keypads',
      label: 'Keypads',
      icon: 'pasta',
      children: [
        {
          id: 'sce-keypads-virtue',
          label: 'Keypad Virtue',
          icon: 'pasta',
          children: [
            {
              id: 'sce-keypads-virtue-standard',
              label: 'Keypad Virtue Standard',
              icon: 'pasta',
              children: [
                { id: 'sce-keypads-virtue-standard-1', label: 'EB-KP0M', icon: 'keypads' },
                { id: 'sce-keypads-virtue-standard-2', label: 'EB-KP0Mv2', icon: 'keypads' },
                { id: 'sce-keypads-virtue-standard-3', label: 'EB-KP1', icon: 'keypads' },
                { id: 'sce-keypads-virtue-standard-4', label: 'EB-KP2', icon: 'keypads' },
                { id: 'sce-keypads-virtue-standard-5', label: 'EB-KP3', icon: 'keypads' },
                { id: 'sce-keypads-virtue-standard-6', label: 'EB-KP12', icon: 'keypads' },
                { id: 'sce-keypads-virtue-standard-7', label: 'EB-KP6M', icon: 'keypads' },
                { id: 'sce-keypads-virtue-standard-8', label: 'EB-KP6Mv2', icon: 'keypads' },
                { id: 'sce-keypads-virtue-standard-9', label: 'EB-KP6M-OC', icon: 'keypads' },
                { id: 'sce-keypads-virtue-standard-10', label: 'Espelho Duplo', icon: 'espelho-duplo' },
                { id: 'sce-keypads-virtue-standard-11', label: 'EB-CW6-WIFI', icon: 'keypad-wifi-1' },
                { id: 'sce-keypads-virtue-standard-12', label: 'EB-CW6-WIFI v2', icon: 'keypad-wifi-2' },
                { id: 'sce-keypads-virtue-standard-13', label: 'EB-KP12-4R-WIFI', icon: 'keypad-wifi-2' },
                { id: 'sce-keypads-virtue-standard-14', label: 'EB-KP6M-4R-WIFI', icon: 'keypad-wifi-3' },
              ],
            },
            {
              id: 'sce-keypads-virtue-metal',
              label: 'Keypad Virtue Metal',
              icon: 'pasta',
              children: [
                { id: 'sce-keypads-virtue-metal-1', label: 'EB-KP0M', icon: 'keypads' },
                { id: 'sce-keypads-virtue-metal-2', label: 'EB-KP0Mv2', icon: 'keypads' },
                { id: 'sce-keypads-virtue-metal-3', label: 'EB-KP1', icon: 'keypads' },
                { id: 'sce-keypads-virtue-metal-4', label: 'EB-KP2', icon: 'keypads' },
                { id: 'sce-keypads-virtue-metal-5', label: 'EB-KP3', icon: 'keypads' },
                { id: 'sce-keypads-virtue-metal-6', label: 'EB-KP12', icon: 'keypads' },
                { id: 'sce-keypads-virtue-metal-7', label: 'EB-KP6M', icon: 'keypads' },
                { id: 'sce-keypads-virtue-metal-8', label: 'EB-KP6Mv2', icon: 'keypads' },
                { id: 'sce-keypads-virtue-metal-9', label: 'EB-KP6M-OC', icon: 'keypads' },
                { id: 'sce-keypads-virtue-metal-10', label: 'Espelho Duplo', icon: 'espelho-duplo' },
                { id: 'sce-keypads-virtue-metal-11', label: 'EB-CW6-WIFI', icon: 'keypad-wifi-1' },
                { id: 'sce-keypads-virtue-metal-12', label: 'EB-CW6-WIFI v2', icon: 'keypad-wifi-1' },
                { id: 'sce-keypads-virtue-metal-13', label: 'EB-KP12-4R-WIFI', icon: 'keypad-wifi-2' },
                { id: 'sce-keypads-virtue-metal-14', label: 'EB-KP6M-4R-WIFI', icon: 'keypad-wifi-3' },
              ],
            },
          ],
        },
        {
          id: 'sce-keypads-essence',
          label: 'Keypad Essence',
          icon: 'pasta',
          children: [
            { id: 'sce-keypads-essence-1', label: 'ESN-KP2', icon: 'keypads' },
            { id: 'sce-keypads-essence-2', label: 'ESN-KP3', icon: 'keypads' },
            { id: 'sce-keypads-essence-3', label: 'ESN-KP6', icon: 'keypads' },
            { id: 'sce-keypads-essence-4', label: 'ESN-KP3M-PIR', icon: 'keypads' },
            { id: 'sce-keypads-essence-5', label: 'ESN-KP3M-OC', icon: 'keypads' },
            { id: 'sce-keypads-essence-6', label: 'ESN-KP3M-PIR-4R-WIFI', icon: 'keypads' },
            { id: 'sce-keypads-essence-7', label: 'ESN-KP6-4R-WIFI', icon: 'keypads' },
            { id: 'sce-keypads-essence-8', label: 'ESN-KP6-3DIM-WIFI', icon: 'keypads' },
            { id: 'sce-keypads-essence-9', label: 'Espelho Duplo', icon: 'espelho-duplo' },
          ],
        },
        {
          id: 'sce-keypads-prestige',
          label: 'Keypad Prestige',
          icon: 'pasta',
          children: [
            { id: 'sce-keypads-prestige-1', label: 'PST-KP1', icon: 'keypads' },
            { id: 'sce-keypads-prestige-2', label: 'PST-KP2', icon: 'keypads' },
            { id: 'sce-keypads-prestige-3', label: 'PST-KP3', icon: 'keypads' },
            { id: 'sce-keypads-prestige-4', label: 'PST-KP6', icon: 'keypads' },
            { id: 'sce-keypads-prestige-5', label: 'PST-KP12', icon: 'keypads' },
            { id: 'sce-keypads-prestige-6', label: 'PST-KP6M-PIR', icon: 'keypads' },
            { id: 'sce-keypads-prestige-7', label: 'PST-KP6M-OC', icon: 'keypads' },
            { id: 'sce-keypads-prestige-8', label: 'Espelho Duplo', icon: 'espelho-duplo' },
          ],
        },
      ],
    },
    {
      id: 'sce-touch',
      label: 'Touch Panels',
      icon: 'pasta',
      children: [
        { id: 'sce-touch-1', label: 'EB-TW4', icon: 'tw4' },
        { id: 'sce-touch-2', label: 'EB-TW10', icon: 'tw10' },
      ],
    },
    {
      id: 'sce-entrada',
      label: 'Interfaces de Entrada',
      icon: 'pasta',
      children: [
        { id: 'sce-entrada-1', label: 'EB-IPM10', icon: 'modulos' },
        { id: 'sce-entrada-2', label: 'EB-IPM36', icon: 'modulos' },
      ],
    },
    {
      id: 'sce-sensores',
      label: 'Sensores',
      icon: 'pasta',
      children: [
        { id: 'sce-sensores-1', label: 'EB-SMT', icon: 'sensores' },
        { id: 'sce-sensores-2', label: 'EB-SMTv2', icon: 'sensores' },
      ],
    },
  ],
  Drivers: [
    {
      id: 'drv-cenarios',
      label: 'SCENARIO',
      icon: 'pasta',
      children: [
        {
          id: 'drv-audio-video',
          label: 'A/V RECEIVER',
          icon: 'pasta',
          children: [
            {
              id: 'drv-aat',
              label: 'AAT',
              icon: 'pasta',
              children: [
                { id: 'drv-aat-1', label: 'STR-2 (v. 1)', icon: 'drivers' },
              ],
            },
            {
              id: 'drv-denon',
              label: 'DENON',
              icon: 'pasta',
              children: [
                { id: 'drv-denon-1', label: 'AVR X4000(IR) (v.12)', icon: 'drivers' },
                { id: 'drv-denon-2', label: 'AVR-1913 (v. 16)', icon: 'drivers' },
                { id: 'drv-denon-3', label: 'AVR-2808CI (v. 1)', icon: 'drivers' },
              ],
            },
            {
              id: 'drv-sony',
              label: 'SONY',
              icon: 'pasta',
              children: [
                { id: 'drv-sony-1', label: 'SONY A/V RECEIVER 1 (v. 7)', icon: 'drivers' },
                { id: 'drv-sony-2', label: 'SONY A/V RECEIVER 2 (v. 13)', icon: 'drivers' },
                { id: 'drv-sony-3', label: 'STR AV SERIES (v. 13)', icon: 'drivers' },
              ],
            },
          ],
        },
        {
          id: 'drv-amplificadores',
          label: 'AMPLIFICADOR',
          icon: 'pasta',
          children: [
            {
              id: 'drv-loud',
              label: 'LOUD',
              icon: 'pasta',
              children: [
                { id: 'drv-loud-1', label: '4AP100 (v. 7)', icon: 'drivers' },
                { id: 'drv-loud-2', label: 'APL420S (v. 7)', icon: 'drivers' },
                { id: 'drv-loud-3', label: 'LAC AB BT (v. 1)', icon: 'drivers' },
              ],
            },
          ],
        },
        {
          id: 'drv-ar',
          label: 'AR-CONDICIONADO',
          icon: 'pasta',
          children: [
            {
              id: 'drv-elgin',
              label: 'ELGIN',
              icon: 'pasta',
              children: [
                { id: 'drv-elgin-1', label: 'ELGIN 1 CH (v. 2)', icon: 'drivers' },
                { id: 'drv-elgin-2', label: 'PHEI-24000-2 (v. 7)', icon: 'drivers' },
              ],
            },
            {
              id: 'drv-lg',
              label: 'LG',
              icon: 'pasta',
              children: [
                { id: 'drv-lg-1', label: 'ART COOL2 (v. 9)', icon: 'drivers' },
                { id: 'drv-lg-2', label: 'LG 1 ACH (v. 2)', icon: 'drivers' },
                { id: 'drv-lg-3', label: 'LG 2 ACH (v. 2)', icon: 'drivers' },
                { id: 'drv-lg-4', label: 'LG 3 ACH (v. 1)', icon: 'drivers' },
                { id: 'drv-lg-5', label: 'LG SMART INVERTER - RC AKB', icon: 'drivers' },
                { id: 'drv-lg-6', label: 'LG - SNL124FLA (v. 6)', icon: 'drivers' },
                { id: 'drv-lg-7', label: 'TSNC2425MA0 (v. 8)', icon: 'drivers' },
                { id: 'drv-lg-8', label: 'LG - US-Q092WSG3 (v. 3)', icon: 'drivers' },
              ],
            },
            {
              id: 'drv-samsung',
              label: 'SAMSUNG',
              icon: 'pasta',
              children: [
                { id: 'drv-samsung-1', label: 'A24U SERIES E AS24U SERIES', icon: 'drivers' },
                { id: 'drv-samsung-2', label: 'ASV09PSBT (v. 7)', icon: 'drivers' },
                { id: 'drv-samsung-3', label: 'DB98 (v. 7)', icon: 'drivers' },
                { id: 'drv-samsung-4', label: 'SAMSUNG 1 ACH (v. 2)', icon: 'drivers' },
                { id: 'drv-samsung-5', label: 'SMART INVERTER (v. 6)', icon: 'drivers' },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export const EQUIPMENT_VISIBILITY_FILTER_KEYS = {
  text: 'text',
  all: 'all',
  cameras: 'cameras',
  quadros: 'quadros',
  iluminacao: 'iluminacao',
  pulsadores: 'pulsadores',
  motores: 'motores',
  cortinas: 'cortinas',
  keypads: 'keypads',
  touchPanels: 'touchPanels',
  sensores: 'sensores',
  drivers: 'drivers',
}

export function createDefaultEquipmentFilters() {
  return Object.values(EQUIPMENT_VISIBILITY_FILTER_KEYS).reduce((filters, key) => {
    filters[key] = true
    return filters
  }, {})
}

const DIVERSOS_SENSOR_ITEM_IDS = new Set(['amb-diversos-1', 'amb-diversos-2'])

function deriveSpecificFilterKeys(tabName, ancestorIds, itemId) {
  const pathIds = new Set([...ancestorIds, itemId])

  if (tabName === 'Drivers') {
    return [EQUIPMENT_VISIBILITY_FILTER_KEYS.drivers]
  }

  const filterKeys = new Set()

  if (pathIds.has('amb-iluminacao')) {
    filterKeys.add(EQUIPMENT_VISIBILITY_FILTER_KEYS.iluminacao)
  }

  if (pathIds.has('amb-pulsadores')) {
    filterKeys.add(EQUIPMENT_VISIBILITY_FILTER_KEYS.pulsadores)
  }

  if (pathIds.has('amb-acionadores')) {
    filterKeys.add(EQUIPMENT_VISIBILITY_FILTER_KEYS.motores)
  }

  if (pathIds.has('amb-cortina')) {
    filterKeys.add(EQUIPMENT_VISIBILITY_FILTER_KEYS.cortinas)
  }

  if (pathIds.has('amb-cameras')) {
    filterKeys.add(EQUIPMENT_VISIBILITY_FILTER_KEYS.cameras)
  }

  if (
    pathIds.has('sce-automation')
    || pathIds.has('sce-interfaces')
    || pathIds.has('sce-modulos')
    || pathIds.has('sce-entrada')
  ) {
    filterKeys.add(EQUIPMENT_VISIBILITY_FILTER_KEYS.quadros)
  }

  if (pathIds.has('sce-keypads')) {
    filterKeys.add(EQUIPMENT_VISIBILITY_FILTER_KEYS.keypads)
  }

  if (pathIds.has('sce-touch')) {
    filterKeys.add(EQUIPMENT_VISIBILITY_FILTER_KEYS.touchPanels)
  }

  if (
    pathIds.has('amb-acessorios')
    || pathIds.has('sce-sensores')
    || DIVERSOS_SENSOR_ITEM_IDS.has(itemId)
  ) {
    filterKeys.add(EQUIPMENT_VISIBILITY_FILTER_KEYS.sensores)
  }

  if (pathIds.has('amb-diversos') && !DIVERSOS_SENSOR_ITEM_IDS.has(itemId)) {
    filterKeys.add(EQUIPMENT_VISIBILITY_FILTER_KEYS.drivers)
  }

  return [...filterKeys]
}

function buildEquipmentFilterMap(tabs) {
  const itemMap = {}

  const visitNode = (tabName, node, ancestorIds = []) => {
    if (node.children?.length) {
      node.children.forEach((child) => visitNode(tabName, child, [...ancestorIds, node.id]))
      return
    }

    itemMap[node.id] = {
      id: node.id,
      label: node.label,
      filterKeys: deriveSpecificFilterKeys(tabName, ancestorIds, node.id),
    }
  }

  Object.entries(tabs).forEach(([tabName, nodes]) => {
    nodes.forEach((node) => visitNode(tabName, node))
  })

  return itemMap
}

export const equipmentLibraryFilterMap = buildEquipmentFilterMap(equipmentLibraryTabs)

export function getEquipmentFilterKeys(itemId) {
  return equipmentLibraryFilterMap[itemId]?.filterKeys ?? []
}
