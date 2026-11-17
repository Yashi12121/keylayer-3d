import { create } from 'zustand';
import { LayerId } from '../data/themes';
import { SoundProfile } from '../audio/soundEngine';

export interface KeyboardStore {
  /** Explode slider progress from 0 (assembled) to 1 (fully exploded) */
  explode: number;
  setExplode: (value: number) => void;

  /** Active isolated layer, or null when all layers are visible */
  isolatedLayer: LayerId | null;
  setIsolatedLayer: (layer: LayerId | null) => void;
  toggleIsolateLayer: (layer: LayerId) => void;

  /** Hovered switch index (0..66) for mini-exploded switch view */
  hoveredSwitchIndex: number | null;
  setHoveredSwitchIndex: (index: number | null) => void;

  /** Pinned switch index for touch/mobile devices */
  pinnedSwitchIndex: number | null;
  setPinnedSwitchIndex: (index: number | null) => void;

  /** Currently hovered keycap index for subtle hover lift & key readout */
  hoveredKeyIndex: number | null;
  setHoveredKeyIndex: (index: number | null) => void;

  /** Set of currently pressed key indices (0..66) */
  pressedKeys: Record<number, boolean>;
  lastPressedKeyIndex: number | null;
  pressKey: (index: number) => void;
  releaseKey: (index: number) => void;
  clearPressedKeys: () => void;

  /** Live customization selections */
  keycapThemeId: string;
  setKeycapThemeId: (id: string) => void;

  caseFinishId: string;
  setCaseFinishId: (id: string) => void;

  switchStyleId: string;
  setSwitchStyleId: (id: string) => void;

  /** Audio controls */
  soundEnabled: boolean;
  toggleSound: () => void;
  soundProfile: SoundProfile;
  setSoundProfile: (profile: SoundProfile) => void;

  /** Camera reset trigger counter */
  cameraResetCount: number;
  triggerCameraReset: () => void;

  /** Customizer drawer open state (responsive) */
  customizerOpen: boolean;
  setCustomizerOpen: (open: boolean) => void;
}

export const useKeyboardStore = create<KeyboardStore>((set) => ({
  explode: 0,
  setExplode: (value) => set({ explode: Math.max(0, Math.min(1, value)) }),

  isolatedLayer: null,
  setIsolatedLayer: (layer) =>
    set((state) => ({
      isolatedLayer: layer,
      // Clear switch pin if isolating away from switches
      pinnedSwitchIndex: layer && layer !== 'switches' ? null : state.pinnedSwitchIndex,
    })),
  toggleIsolateLayer: (layer) =>
    set((state) => ({
      isolatedLayer: state.isolatedLayer === layer ? null : layer,
      pinnedSwitchIndex: state.isolatedLayer === layer ? null : state.pinnedSwitchIndex,
    })),

  hoveredSwitchIndex: null,
  setHoveredSwitchIndex: (index) => set({ hoveredSwitchIndex: index }),

  pinnedSwitchIndex: null,
  setPinnedSwitchIndex: (index) => set({ pinnedSwitchIndex: index }),

  hoveredKeyIndex: null,
  setHoveredKeyIndex: (index) => set({ hoveredKeyIndex: index }),

  pressedKeys: {},
  lastPressedKeyIndex: null,
  pressKey: (index) =>
    set((state) => {
      if (state.pressedKeys[index]) return state;
      return {
        pressedKeys: { ...state.pressedKeys, [index]: true },
        lastPressedKeyIndex: index,
      };
    }),
  releaseKey: (index) =>
    set((state) => {
      if (!state.pressedKeys[index]) return state;
      const next = { ...state.pressedKeys };
      delete next[index];
      return { pressedKeys: next };
    }),
  clearPressedKeys: () => set({ pressedKeys: {} }),

  keycapThemeId: 'matcha-milk',
  setKeycapThemeId: (id) => set({ keycapThemeId: id }),

  caseFinishId: 'cream-puff',
  setCaseFinishId: (id) => set({ caseFinishId: id }),

  switchStyleId: 'peach-linear',
  setSwitchStyleId: (id) => set({ switchStyleId: id }),

  soundEnabled: true,
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  soundProfile: 'thock',
  setSoundProfile: (profile) => set({ soundProfile: profile }),

  cameraResetCount: 0,
  triggerCameraReset: () => set((state) => ({ cameraResetCount: state.cameraResetCount + 1 })),

  customizerOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  setCustomizerOpen: (open) => set({ customizerOpen: open }),
}));
