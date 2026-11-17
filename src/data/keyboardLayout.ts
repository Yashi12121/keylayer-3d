export type KeyRole = 'alpha' | 'mod' | 'accent';

export interface KeyDef {
  index: number;
  id: string;
  label: string;
  subLabel?: string;
  codes: string[];
  row: number;
  uWidth: number;
  /** X center in world units (centered around 0) */
  x: number;
  /** Z center in world units (centered around 0) */
  z: number;
  role: KeyRole;
  hasStabilizer: boolean;
}

/** 1u pitch in Three.js world units */
export const KEY_UNIT = 0.8;
/** Total matrix width = 16u */
export const MATRIX_WIDTH_U = 16;
/** Total matrix rows = 5u */
export const MATRIX_ROWS = 5;

interface RawKeySpec {
  id: string;
  label: string;
  subLabel?: string;
  codes: string[];
  uWidth: number;
  role: KeyRole;
  gapBeforeU?: number;
}

const ROW_SPECS: RawKeySpec[][] = [
  // Row 0 (16.0u)
  [
    { id: 'esc', label: 'ESC', codes: ['Escape'], uWidth: 1, role: 'accent' },
    { id: '1', label: '1', subLabel: '!', codes: ['Digit1'], uWidth: 1, role: 'alpha' },
    { id: '2', label: '2', subLabel: '@', codes: ['Digit2'], uWidth: 1, role: 'alpha' },
    { id: '3', label: '3', subLabel: '#', codes: ['Digit3'], uWidth: 1, role: 'alpha' },
    { id: '4', label: '4', subLabel: '$', codes: ['Digit4'], uWidth: 1, role: 'alpha' },
    { id: '5', label: '5', subLabel: '%', codes: ['Digit5'], uWidth: 1, role: 'alpha' },
    { id: '6', label: '6', subLabel: '^', codes: ['Digit6'], uWidth: 1, role: 'alpha' },
    { id: '7', label: '7', subLabel: '&', codes: ['Digit7'], uWidth: 1, role: 'alpha' },
    { id: '8', label: '8', subLabel: '*', codes: ['Digit8'], uWidth: 1, role: 'alpha' },
    { id: '9', label: '9', subLabel: '(', codes: ['Digit9'], uWidth: 1, role: 'alpha' },
    { id: '0', label: '0', subLabel: ')', codes: ['Digit0'], uWidth: 1, role: 'alpha' },
    { id: 'minus', label: '-', subLabel: '_', codes: ['Minus'], uWidth: 1, role: 'alpha' },
    { id: 'equal', label: '=', subLabel: '+', codes: ['Equal'], uWidth: 1, role: 'alpha' },
    { id: 'backspace', label: 'BKSP', codes: ['Backspace'], uWidth: 2, role: 'mod' },
    { id: 'del', label: 'DEL', codes: ['Delete', 'Insert'], uWidth: 1, role: 'mod' },
  ],
  // Row 1 (16.0u)
  [
    { id: 'tab', label: 'TAB', codes: ['Tab'], uWidth: 1.5, role: 'mod' },
    { id: 'q', label: 'Q', codes: ['KeyQ'], uWidth: 1, role: 'alpha' },
    { id: 'w', label: 'W', codes: ['KeyW'], uWidth: 1, role: 'alpha' },
    { id: 'e', label: 'E', codes: ['KeyE'], uWidth: 1, role: 'alpha' },
    { id: 'r', label: 'R', codes: ['KeyR'], uWidth: 1, role: 'alpha' },
    { id: 't', label: 'T', codes: ['KeyT'], uWidth: 1, role: 'alpha' },
    { id: 'y', label: 'Y', codes: ['KeyY'], uWidth: 1, role: 'alpha' },
    { id: 'u', label: 'U', codes: ['KeyU'], uWidth: 1, role: 'alpha' },
    { id: 'i', label: 'I', codes: ['KeyI'], uWidth: 1, role: 'alpha' },
    { id: 'o', label: 'O', codes: ['KeyO'], uWidth: 1, role: 'alpha' },
    { id: 'p', label: 'P', codes: ['KeyP'], uWidth: 1, role: 'alpha' },
    { id: 'lbracket', label: '[', subLabel: '{', codes: ['BracketLeft'], uWidth: 1, role: 'alpha' },
    { id: 'rbracket', label: ']', subLabel: '}', codes: ['BracketRight'], uWidth: 1, role: 'alpha' },
    { id: 'backslash', label: '\\', subLabel: '|', codes: ['Backslash'], uWidth: 1.5, role: 'mod' },
    { id: 'pgup', label: 'PGUP', codes: ['PageUp'], uWidth: 1, role: 'mod' },
  ],
  // Row 2 (16.0u)
  [
    { id: 'caps', label: 'CAPS', codes: ['CapsLock'], uWidth: 1.75, role: 'mod' },
    { id: 'a', label: 'A', codes: ['KeyA'], uWidth: 1, role: 'alpha' },
    { id: 's', label: 'S', codes: ['KeyS'], uWidth: 1, role: 'alpha' },
    { id: 'd', label: 'D', codes: ['KeyD'], uWidth: 1, role: 'alpha' },
    { id: 'f', label: 'F', codes: ['KeyF'], uWidth: 1, role: 'alpha' },
    { id: 'g', label: 'G', codes: ['KeyG'], uWidth: 1, role: 'alpha' },
    { id: 'h', label: 'H', codes: ['KeyH'], uWidth: 1, role: 'alpha' },
    { id: 'j', label: 'J', codes: ['KeyJ'], uWidth: 1, role: 'alpha' },
    { id: 'k', label: 'K', codes: ['KeyK'], uWidth: 1, role: 'alpha' },
    { id: 'l', label: 'L', codes: ['KeyL'], uWidth: 1, role: 'alpha' },
    { id: 'semicolon', label: ';', subLabel: ':', codes: ['Semicolon'], uWidth: 1, role: 'alpha' },
    { id: 'quote', label: "'", subLabel: '"', codes: ['Quote'], uWidth: 1, role: 'alpha' },
    { id: 'enter', label: 'ENTER', codes: ['Enter', 'NumpadEnter'], uWidth: 2.25, role: 'accent' },
    { id: 'pgdn', label: 'PGDN', codes: ['PageDown'], uWidth: 1, role: 'mod' },
  ],
  // Row 3 (16.0u)
  [
    { id: 'lshift', label: 'SHIFT', codes: ['ShiftLeft'], uWidth: 2.25, role: 'mod' },
    { id: 'z', label: 'Z', codes: ['KeyZ'], uWidth: 1, role: 'alpha' },
    { id: 'x', label: 'X', codes: ['KeyX'], uWidth: 1, role: 'alpha' },
    { id: 'c', label: 'C', codes: ['KeyC'], uWidth: 1, role: 'alpha' },
    { id: 'v', label: 'V', codes: ['KeyV'], uWidth: 1, role: 'alpha' },
    { id: 'b', label: 'B', codes: ['KeyB'], uWidth: 1, role: 'alpha' },
    { id: 'n', label: 'N', codes: ['KeyN'], uWidth: 1, role: 'alpha' },
    { id: 'm', label: 'M', codes: ['KeyM'], uWidth: 1, role: 'alpha' },
    { id: 'comma', label: ',', subLabel: '<', codes: ['Comma'], uWidth: 1, role: 'alpha' },
    { id: 'period', label: '.', subLabel: '>', codes: ['Period'], uWidth: 1, role: 'alpha' },
    { id: 'slash', label: '/', subLabel: '?', codes: ['Slash'], uWidth: 1, role: 'alpha' },
    { id: 'rshift', label: 'SHIFT', codes: ['ShiftRight'], uWidth: 1.75, role: 'mod' },
    { id: 'up', label: '↑', codes: ['ArrowUp'], uWidth: 1, role: 'accent' },
    { id: 'end', label: 'END', codes: ['End', 'Home'], uWidth: 1, role: 'mod' },
  ],
  // Row 4 (16.0u including 0.5u blocker before arrow cluster)
  [
    { id: 'lctrl', label: 'CTRL', codes: ['ControlLeft'], uWidth: 1.25, role: 'mod' },
    { id: 'lwin', label: 'CMD', codes: ['MetaLeft', 'OSLeft'], uWidth: 1.25, role: 'mod' },
    { id: 'lalt', label: 'ALT', codes: ['AltLeft'], uWidth: 1.25, role: 'mod' },
    { id: 'space', label: 'SPACE', codes: ['Space'], uWidth: 6.25, role: 'alpha' },
    { id: 'ralt', label: 'ALT', codes: ['AltRight', 'MetaRight'], uWidth: 1.25, role: 'mod' },
    { id: 'fn', label: 'FN', codes: ['ControlRight', 'ContextMenu'], uWidth: 1.25, role: 'mod' },
    { id: 'left', label: '←', codes: ['ArrowLeft'], uWidth: 1, role: 'accent', gapBeforeU: 0.5 },
    { id: 'down', label: '↓', codes: ['ArrowDown'], uWidth: 1, role: 'accent' },
    { id: 'right', label: '→', codes: ['ArrowRight'], uWidth: 1, role: 'accent' },
  ],
];

function buildKeyboardLayout(): KeyDef[] {
  const keys: KeyDef[] = [];
  const totalWidth = MATRIX_WIDTH_U * KEY_UNIT;
  const totalDepth = MATRIX_ROWS * KEY_UNIT;
  let index = 0;

  ROW_SPECS.forEach((rowSpecs, row) => {
    let cursorU = 0;
    const z = -totalDepth / 2 + (row + 0.5) * KEY_UNIT;

    rowSpecs.forEach((spec) => {
      if (spec.gapBeforeU) {
        cursorU += spec.gapBeforeU;
      }
      const centerU = cursorU + spec.uWidth / 2;
      const x = -totalWidth / 2 + centerU * KEY_UNIT;
      keys.push({
        index,
        id: spec.id,
        label: spec.label,
        subLabel: spec.subLabel,
        codes: spec.codes,
        row,
        uWidth: spec.uWidth,
        x,
        z,
        role: spec.role,
        hasStabilizer: spec.uWidth >= 2,
      });
      cursorU += spec.uWidth;
      index += 1;
    });
  });

  return keys;
}

export const KEYBOARD_KEYS: KeyDef[] = buildKeyboardLayout();

export const KEY_CODE_TO_INDEX: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (const k of KEYBOARD_KEYS) {
    for (const code of k.codes) {
      map[code] = k.index;
    }
  }
  return map;
})();

/** Position of the 0.5u decorative blocker between FN and ArrowLeft */
export const BLOCKER_POS = {
  x: -((MATRIX_WIDTH_U * KEY_UNIT) / 2) + (1.25 * 3 + 6.25 + 1.25 * 2 + 0.25) * KEY_UNIT,
  z: -((MATRIX_ROWS * KEY_UNIT) / 2) + 4.5 * KEY_UNIT,
  width: 0.44 * KEY_UNIT,
  depth: 0.88 * KEY_UNIT,
};
