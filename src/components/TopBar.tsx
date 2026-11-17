import React from 'react';
import { Palette, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { KEYBOARD_KEYS } from '../data/keyboardLayout';
import { soundEngine } from '../audio/soundEngine';
import { useKeyboardStore } from '../store/useKeyboardStore';

export const TopBar: React.FC = () => {
  const soundEnabled = useKeyboardStore((s) => s.soundEnabled);
  const toggleSound = useKeyboardStore((s) => s.toggleSound);
  const soundProfile = useKeyboardStore((s) => s.soundProfile);
  const setSoundProfile = useKeyboardStore((s) => s.setSoundProfile);
  const triggerCameraReset = useKeyboardStore((s) => s.triggerCameraReset);
  const customizerOpen = useKeyboardStore((s) => s.customizerOpen);
  const setCustomizerOpen = useKeyboardStore((s) => s.setCustomizerOpen);
  const pressedKeys = useKeyboardStore((s) => s.pressedKeys);
  const hoveredKeyIndex = useKeyboardStore((s) => s.hoveredKeyIndex);
  const lastPressedKeyIndex = useKeyboardStore((s) => s.lastPressedKeyIndex);

  const activePressedIndices = Object.keys(pressedKeys).map(Number);
  const displayKeyIdx =
    activePressedIndices.length > 0
      ? activePressedIndices[activePressedIndices.length - 1]
      : hoveredKeyIndex ?? lastPressedKeyIndex;
  const displayKey = displayKeyIdx !== null ? KEYBOARD_KEYS[displayKeyIdx] : null;
  const isCurrentlyPressed = activePressedIndices.length > 0;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-2.5 sm:items-start sm:gap-3 sm:p-5">
      {/* Brand mark & live keystroke badge */}
      <div className="pointer-events-auto flex items-center gap-2.5">
        <div className="toy-panel flex items-center gap-2 rounded-2xl px-2.5 py-1.5 sm:gap-2.5 sm:px-3.5 sm:py-2">
          {/* Simple sculpted keycap icon */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0 sm:h-6 sm:w-6"
          >
            <rect
              x="2.5"
              y="3.5"
              width="19"
              height="17"
              rx="5"
              fill="#F4A896"
              stroke="#2D2522"
              strokeWidth="1.6"
            />
            <rect
              x="5.5"
              y="5.5"
              width="13"
              height="10.5"
              rx="3"
              fill="#FFFDF9"
              stroke="#2D2522"
              strokeWidth="1.3"
            />
          </svg>
          <div>
            <h1 className="font-display text-sm leading-none font-extrabold tracking-tight text-[#2d2522] sm:text-base">
              Pebble 65
            </h1>
            <p className="mt-0.5 hidden text-[11px] font-medium text-[#685c57] sm:block">
              Interactive 3D Teardown
            </p>
          </div>
        </div>

        <AnimatePresence>
          {displayKey && (
            <motion.div
              key={displayKey.id}
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.16 }}
              className="toy-pill hidden items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-[#2d2522] sm:flex"
            >
              <span
                className={`inline-block h-2 w-2 rounded-full transition-colors ${
                  isCurrentlyPressed ? 'bg-[#e77c68]' : 'bg-[#8ec5a3]'
                }`}
              />
              <span className="text-[#685c57]">{isCurrentlyPressed ? 'Pressed' : 'Key'}</span>
              <kbd className="font-mono-num rounded-md border border-[rgba(74,58,49,0.16)] bg-[#f7efe6] px-1.5 py-0.5 text-[11px] font-semibold text-[#2d2522]">
                {displayKey.label}
              </kbd>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right toolbar: Thock/Clack + Sound + Reset View + Customize */}
      <div className="pointer-events-auto flex items-center justify-end gap-1.5 sm:gap-2">
        {/* Sound profile segmented pill */}
        <div
          className="toy-panel flex items-center rounded-2xl p-0.5 sm:p-1"
          role="group"
          aria-label="Key sound profile"
        >
          {(['thock', 'clack'] as const).map((profile) => {
            const active = soundProfile === profile;
            return (
              <button
                key={profile}
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  setSoundProfile(profile);
                  soundEngine.playKeyDown(profile, 1, soundEnabled);
                }}
                className={`cursor-pointer rounded-xl px-2 py-1 text-[11px] font-semibold capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e77c68] sm:px-3 sm:py-1.5 sm:text-xs ${
                  active
                    ? 'bg-[#2d2522] text-[#fffcf7]'
                    : 'text-[#685c57] hover:bg-[#f2e8dc] hover:text-[#2d2522]'
                }`}
              >
                {profile}
              </button>
            );
          })}
        </div>

        {/* Sound Mute/Unmute */}
        <button
          type="button"
          onClick={() => {
            soundEngine.unlock();
            toggleSound();
            if (!soundEnabled) {
              soundEngine.playUiPop(true, true);
            }
          }}
          aria-label={soundEnabled ? 'Mute keyboard sound' : 'Unmute keyboard sound'}
          aria-pressed={soundEnabled}
          className={`toy-panel flex h-9 w-9 cursor-pointer items-center justify-center rounded-2xl text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e77c68] sm:h-10 sm:w-auto sm:gap-1.5 sm:px-3 ${
            soundEnabled
              ? 'text-[#2d2522] hover:bg-[#fffcf7]'
              : 'bg-[#efe6da] text-[#685c57]'
          }`}
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4 text-[#cf5e4a]" strokeWidth={1.75} />
          ) : (
            <VolumeX className="h-4 w-4 text-[#685c57]" strokeWidth={1.75} />
          )}
          <span className="hidden sm:inline">{soundEnabled ? 'Sound on' : 'Muted'}</span>
        </button>

        {/* Camera Reset */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiPop(soundEnabled, false);
            triggerCameraReset();
          }}
          aria-label="Reset camera view"
          className="toy-panel flex h-9 w-9 cursor-pointer items-center justify-center rounded-2xl text-[#2d2522] transition-colors hover:bg-[#fffcf7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e77c68] sm:h-10 sm:w-auto sm:gap-1.5 sm:px-3"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden text-xs font-semibold md:inline">Reset view</span>
        </button>

        {/* Customizer Drawer Toggle */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiPop(soundEnabled, !customizerOpen);
            setCustomizerOpen(!customizerOpen);
          }}
          aria-expanded={customizerOpen}
          aria-label="Toggle customizer panel"
          className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-2xl text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e77c68] sm:h-10 sm:w-auto sm:gap-1.5 sm:px-3.5 ${
            customizerOpen
              ? 'border border-[#cf5e4a] bg-[#e77c68] text-white shadow-[0_2px_0_rgba(176,68,48,0.28),0_10px_22px_-8px_rgba(207,94,74,0.45)]'
              : 'toy-panel text-[#2d2522] hover:bg-[#fffcf7]'
          }`}
        >
          <Palette className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">Customize</span>
        </button>
      </div>
    </header>
  );
};
