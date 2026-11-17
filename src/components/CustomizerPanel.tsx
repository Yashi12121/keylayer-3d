import React from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { CASE_FINISHES, KEYCAP_THEMES, SWITCH_STYLES } from '../data/themes';
import { soundEngine } from '../audio/soundEngine';
import { useKeyboardStore } from '../store/useKeyboardStore';

export const CustomizerPanel: React.FC = () => {
  const customizerOpen = useKeyboardStore((s) => s.customizerOpen);
  const setCustomizerOpen = useKeyboardStore((s) => s.setCustomizerOpen);
  const keycapThemeId = useKeyboardStore((s) => s.keycapThemeId);
  const setKeycapThemeId = useKeyboardStore((s) => s.setKeycapThemeId);
  const caseFinishId = useKeyboardStore((s) => s.caseFinishId);
  const setCaseFinishId = useKeyboardStore((s) => s.setCaseFinishId);
  const switchStyleId = useKeyboardStore((s) => s.switchStyleId);
  const setSwitchStyleId = useKeyboardStore((s) => s.setSwitchStyleId);
  const soundEnabled = useKeyboardStore((s) => s.soundEnabled);

  return (
    <AnimatePresence>
      {customizerOpen && (
        <motion.aside
          aria-label="Keyboard customizer"
          initial={{ opacity: 0, x: 24, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 24, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="toy-panel fixed right-2.5 top-[106px] z-30 max-h-[calc(100vh-236px)] w-[min(288px,calc(100vw-20px))] overflow-y-auto rounded-3xl p-4 sm:right-5 sm:top-20 sm:z-20 sm:max-h-[calc(100vh-205px)]"
        >
          <div className="mb-3.5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-extrabold text-[#2d2522]">
                Studio Customizer
              </h2>
              <p className="text-[11px] text-[#685c57]">Live colors & switch feel</p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiPop(soundEnabled, false);
                setCustomizerOpen(false);
              }}
              aria-label="Close customizer"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-[#f2e8dc] text-[#2d2522] transition-colors hover:bg-[#e7dac8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e77c68]"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* Section 1: Keycap Color Theme */}
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-bold text-[#2d2522]">Keycap theme</h3>
            <div className="space-y-1.5">
              {KEYCAP_THEMES.map((theme) => {
                const selected = theme.id === keycapThemeId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      soundEngine.unlock();
                      soundEngine.playUiPop(soundEnabled, true);
                      setKeycapThemeId(theme.id);
                    }}
                    aria-pressed={selected}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e77c68] ${
                      selected
                        ? 'border-[#e77c68] bg-[#fff5f2] text-[#2d2522]'
                        : 'border-transparent bg-[#f6efe6]/80 text-[#5c504b] hover:bg-[#efe6da]'
                    }`}
                  >
                    <span>{theme.name}</span>
                    <span className="flex items-center gap-1">
                      {theme.previewSwatches.map((hex, i) => (
                        <span
                          key={i}
                          className="h-4 w-4 rounded-full border border-black/15"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Case Color */}
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-bold text-[#2d2522]">Case finish</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {CASE_FINISHES.map((finish) => {
                const selected = finish.id === caseFinishId;
                return (
                  <button
                    key={finish.id}
                    type="button"
                    onClick={() => {
                      soundEngine.unlock();
                      soundEngine.playUiPop(soundEnabled, true);
                      setCaseFinishId(finish.id);
                    }}
                    aria-pressed={selected}
                    className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e77c68] ${
                      selected
                        ? 'border-[#e77c68] bg-[#fff5f2]'
                        : 'border-transparent bg-[#f6efe6]/80 hover:bg-[#efe6da]'
                    }`}
                  >
                    <span
                      className="h-6 w-6 rounded-full border border-black/15 shadow-sm"
                      style={{
                        backgroundColor: finish.color,
                        opacity: finish.frosted ? 0.78 : 1,
                      }}
                    />
                    <span className="text-[10.5px] font-semibold leading-tight text-[#2d2522]">
                      {finish.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Switch Style */}
          <div>
            <h3 className="mb-2 text-xs font-bold text-[#2d2522]">Switch stem</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {SWITCH_STYLES.map((sw) => {
                const selected = sw.id === switchStyleId;
                return (
                  <button
                    key={sw.id}
                    type="button"
                    onClick={() => {
                      soundEngine.unlock();
                      soundEngine.playUiPop(soundEnabled, true);
                      setSwitchStyleId(sw.id);
                    }}
                    aria-pressed={selected}
                    className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border p-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e77c68] ${
                      selected
                        ? 'border-[#e77c68] bg-[#fff5f2]'
                        : 'border-transparent bg-[#f6efe6]/80 hover:bg-[#efe6da]'
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-md border border-black/15"
                      style={{ backgroundColor: sw.stemColor }}
                    />
                    <span className="text-[10.5px] font-semibold leading-tight text-[#2d2522]">
                      {sw.name}
                    </span>
                    <span className="text-[9.5px] font-medium text-[#685c57]">{sw.type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
