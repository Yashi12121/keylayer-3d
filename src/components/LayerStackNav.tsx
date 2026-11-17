import React from 'react';
import { Eye, Layers, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { LAYER_META } from '../data/themes';
import { soundEngine } from '../audio/soundEngine';
import { useKeyboardStore } from '../store/useKeyboardStore';

export const LayerStackNav: React.FC = () => {
  const isolatedLayer = useKeyboardStore((s) => s.isolatedLayer);
  const toggleIsolateLayer = useKeyboardStore((s) => s.toggleIsolateLayer);
  const setIsolatedLayer = useKeyboardStore((s) => s.setIsolatedLayer);
  const soundEnabled = useKeyboardStore((s) => s.soundEnabled);
  const explode = useKeyboardStore((s) => s.explode);

  const activeLayerMeta = LAYER_META.find((l) => l.id === isolatedLayer) ?? null;

  return (
    <aside
      aria-label="Keyboard layers"
      className="pointer-events-none fixed left-2.5 top-[58px] z-20 flex flex-col gap-2 sm:left-5 sm:top-24"
    >
      {/* Desktop vertical layer stack & mobile compact horizontal strip */}
      <div className="toy-panel pointer-events-auto flex max-w-[calc(100vw-24px)] flex-row items-center gap-1 overflow-x-auto rounded-2xl p-1.5 no-scrollbar sm:max-w-none sm:flex-col sm:items-stretch">
        <div className="hidden items-center justify-between gap-2 px-2 py-1 text-[11px] font-semibold text-[#685c57] sm:flex">
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" strokeWidth={1.75} />
            Layers
          </span>
          {isolatedLayer && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiPop(soundEnabled, false);
                setIsolatedLayer(null);
              }}
              className="flex cursor-pointer items-center gap-1 rounded-lg bg-[#f2e8dc] px-1.5 py-0.5 text-[10px] font-semibold text-[#2d2522] hover:bg-[#e8dac9]"
            >
              <Eye className="h-3 w-3" />
              All
            </button>
          )}
        </div>

        {LAYER_META.map((layer) => {
          const isActive = isolatedLayer === layer.id;
          const isDimmed = isolatedLayer !== null && !isActive;

          return (
            <motion.button
              key={layer.id}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playUiPop(soundEnabled, !isActive);
                toggleIsolateLayer(layer.id);
              }}
              aria-pressed={isActive}
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e77c68] sm:px-2.5 sm:py-1.5 ${
                isActive
                  ? 'bg-[#2d2522] text-[#fffcf7]'
                  : isDimmed
                    ? 'text-[#685c57]/60 hover:bg-[#f2e8dc]/70 hover:text-[#2d2522]'
                    : 'text-[#2d2522] hover:bg-[#f2e8dc]'
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/15"
                style={{ backgroundColor: layer.swatchColor }}
              />
              <span className="sm:hidden">{layer.shortLabel}</span>
              <span className="hidden sm:inline">{layer.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Isolated Layer Info Card */}
      <AnimatePresence>
        {activeLayerMeta && (
          <motion.div
            key={activeLayerMeta.id}
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="toy-panel pointer-events-auto max-w-[232px] rounded-2xl p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-xs font-extrabold text-[#2d2522]">
                  {activeLayerMeta.label}
                </p>
                <p className="text-[11px] font-semibold text-[#cf5e4a]">
                  {activeLayerMeta.materialTag}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiPop(soundEnabled, false);
                  setIsolatedLayer(null);
                }}
                aria-label="Show all layers"
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg bg-[#f2e8dc] text-[#2d2522] hover:bg-[#e7dac8]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-snug text-[#685c57]">
              {activeLayerMeta.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Switch dissection contextual badge when switches are exposed */}
      <AnimatePresence>
        {!activeLayerMeta && explode > 0.12 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="toy-pill pointer-events-none hidden max-w-[216px] rounded-xl px-3 py-2 text-[11px] font-medium leading-snug text-[#685c57] sm:block"
          >
            Hover a switch to split its top housing, stem, spring, and base.
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};
