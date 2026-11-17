export type LayerId =
  | 'keycaps'
  | 'switches'
  | 'plate'
  | 'foam'
  | 'pcb'
  | 'bottomCase';

export interface LayerMeta {
  id: LayerId;
  label: string;
  shortLabel: string;
  materialTag: string;
  description: string;
  maxLift: number;
  startAt: number;
  endAt: number;
  swatchColor: string;
}

/**
 * Ordered from top to bottom matching the visual separation sequence:
 * keycaps float up -> switches lift out -> plate -> foam dampener -> PCB -> bottom case
 */
export const LAYER_META: LayerMeta[] = [
  {
    id: 'keycaps',
    label: 'Keycaps',
    shortLabel: 'Keycaps',
    materialTag: 'PBT Double-Shot',
    description: '67 sculpted Cherry-profile keycaps with crisp pastel legends.',
    maxLift: 5.55,
    startAt: 0.0,
    endAt: 0.74,
    swatchColor: '#F4A896',
  },
  {
    id: 'switches',
    label: 'Switches',
    shortLabel: 'Switches',
    materialTag: '67× MX Mechanical',
    description: 'Hover or tap any switch to split stem, spring, and housing.',
    maxLift: 3.95,
    startAt: 0.1,
    endAt: 0.82,
    swatchColor: '#F5B89E',
  },
  {
    id: 'plate',
    label: 'Switch Plate',
    shortLabel: 'Plate',
    materialTag: 'CNC Sandblasted Alu',
    description: 'Precision 65% gasket plate holding every switch steady.',
    maxLift: 2.8,
    startAt: 0.22,
    endAt: 0.89,
    swatchColor: '#D6D9DF',
  },
  {
    id: 'foam',
    label: 'Foam Dampener',
    shortLabel: 'Foam',
    materialTag: 'Poron Acoustic 3.5mm',
    description: 'Absorbs hollow ping for a deeper, rounder marbly thock.',
    maxLift: 1.9,
    startAt: 0.34,
    endAt: 0.94,
    swatchColor: '#F2E7D8',
  },
  {
    id: 'pcb',
    label: 'Hot-Swap PCB',
    shortLabel: 'PCB',
    materialTag: '1.6mm Gold ENIG',
    description: 'Hot-swap sockets, SMD RGB pads, ARM MCU, and USB-C port.',
    maxLift: 1.0,
    startAt: 0.44,
    endAt: 1.0,
    swatchColor: '#5B7C73',
  },
  {
    id: 'bottomCase',
    label: 'Bottom Case',
    shortLabel: 'Case',
    materialTag: '6063 Anodized Body',
    description: 'Unibody gasket-mount tray with recessed weight bar and feet.',
    maxLift: 0.0,
    startAt: 0.0,
    endAt: 1.0,
    swatchColor: '#F0E6D8',
  },
];

export interface KeycapTheme {
  id: string;
  name: string;
  alpha: string;
  mod: string;
  accent: string;
  legend: string;
  accentLegend: string;
  ledGlow: string;
  previewSwatches: [string, string, string];
}

export const KEYCAP_THEMES: KeycapTheme[] = [
  {
    id: 'matcha-milk',
    name: 'Matcha Milk',
    alpha: '#F8F4EA',
    mod: '#BDD8C1',
    accent: '#E98D79',
    legend: '#2D3E33',
    accentLegend: '#FFFFFF',
    ledGlow: '#A4DEC0',
    previewSwatches: ['#F8F4EA', '#BDD8C1', '#E98D79'],
  },
  {
    id: 'strawberry-mochi',
    name: 'Strawberry Mochi',
    alpha: '#FFF7F6',
    mod: '#F7C7CE',
    accent: '#E97C93',
    legend: '#4F2B34',
    accentLegend: '#FFFDFD',
    ledGlow: '#FFAEC0',
    previewSwatches: ['#FFF7F6', '#F7C7CE', '#E97C93'],
  },
  {
    id: 'cloud-lavender',
    name: 'Cloud Lavender',
    alpha: '#F7F5FC',
    mod: '#D4C7F0',
    accent: '#F6DC88',
    legend: '#372E4E',
    accentLegend: '#372E4E',
    ledGlow: '#D6BFFF',
    previewSwatches: ['#F7F5FC', '#D4C7F0', '#F6DC88'],
  },
  {
    id: 'sky-soda',
    name: 'Sky Soda',
    alpha: '#F3F8FC',
    mod: '#B9D6F2',
    accent: '#F59A7C',
    legend: '#24374C',
    accentLegend: '#FFFFFF',
    ledGlow: '#9FD4FF',
    previewSwatches: ['#F3F8FC', '#B9D6F2', '#F59A7C'],
  },
  {
    id: 'honey-butter',
    name: 'Honey Butter',
    alpha: '#FDF7E8',
    mod: '#F4D492',
    accent: '#9BD6C8',
    legend: '#493725',
    accentLegend: '#243C36',
    ledGlow: '#FFE29C',
    previewSwatches: ['#FDF7E8', '#F4D492', '#9BD6C8'],
  },
];

export interface CaseFinish {
  id: string;
  name: string;
  color: string;
  innerColor: string;
  weightColor: string;
  pcbColor: string;
  deskMatColor: string;
  frosted?: boolean;
}

export const CASE_FINISHES: CaseFinish[] = [
  {
    id: 'cream-puff',
    name: 'Cream Puff',
    color: '#EFE6D8',
    innerColor: '#E5DAC8',
    weightColor: '#E7C896',
    pcbColor: '#4E6F68',
    deskMatColor: '#DCE8DE',
  },
  {
    id: 'mint-sorbet',
    name: 'Mint Sorbet',
    color: '#C7E4D4',
    innerColor: '#B8D9C7',
    weightColor: '#E7C896',
    pcbColor: '#3E5E59',
    deskMatColor: '#F3E5D8',
  },
  {
    id: 'blush-quartz',
    name: 'Blush Quartz',
    color: '#F3CCD2',
    innerColor: '#E8BCC3',
    weightColor: '#E7B9AE',
    pcbColor: '#694959',
    deskMatColor: '#F2EBE4',
  },
  {
    id: 'periwinkle-mist',
    name: 'Periwinkle Mist',
    color: '#C4D6F2',
    innerColor: '#B5C9E8',
    weightColor: '#DCE2EC',
    pcbColor: '#3E5170',
    deskMatColor: '#EDE8E2',
  },
  {
    id: 'lavender-milk',
    name: 'Lavender Milk',
    color: '#DAD0F0',
    innerColor: '#CBC0E5',
    weightColor: '#ECD39D',
    pcbColor: '#50466D',
    deskMatColor: '#E7ECE6',
  },
  {
    id: 'frosted-pc',
    name: 'Frosted Jelly',
    color: '#EAF0F6',
    innerColor: '#DFE7F0',
    weightColor: '#F0C0AF',
    pcbColor: '#4E6F68',
    deskMatColor: '#E6DFD6',
    frosted: true,
  },
];

export interface SwitchStyle {
  id: string;
  name: string;
  type: string;
  stemColor: string;
  bottomColor: string;
  topColor: string;
  forceLabel: string;
}

export const SWITCH_STYLES: SwitchStyle[] = [
  {
    id: 'peach-linear',
    name: 'Peach Milk',
    type: 'Linear',
    stemColor: '#F3947E',
    bottomColor: '#F5E7DC',
    topColor: '#FAF4EE',
    forceLabel: '45g Linear',
  },
  {
    id: 'mint-tactile',
    name: 'Mint Kiwi',
    type: 'Tactile',
    stemColor: '#75C3A2',
    bottomColor: '#E6F2EB',
    topColor: '#F2FAF6',
    forceLabel: '55g Tactile',
  },
  {
    id: 'taro-cream',
    name: 'Taro Cream',
    type: 'Silent Linear',
    stemColor: '#AE97E2',
    bottomColor: '#EFEAF8',
    topColor: '#F7F4FD',
    forceLabel: '42g Creamy',
  },
];
