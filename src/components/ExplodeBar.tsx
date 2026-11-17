import React, { useRef } from 'react';
import gsap from 'gsap';
import { soundEngine } from '../audio/soundEngine';
import { useKeyboardStore } from '../store/useKeyboardStore';

const PRESETS = [
  { label: 'Assembled', value: 0 },
  { label: 'Half', value: 0.5 },
  { label: 'Full', value: 1 },
] as const;

export const ExplodeBar: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const explode = useKeyboardStore((s) => s.explode);
  const setExplode = useKeyboardStore((s) => s.setExplode);
  const soundEnabled = useKeyboardStore((s) => s.soundEnabled);
  const tweenProxy = useRef({ val: explode });

  const percent = Math.round(explode * 100);

  const animateExplodeTo = (target: number) => {
    soundEngine.unlock();
    soundEngine.playUiPop(soundEnabled, target > explode);
    tweenProxy.current.val = useKeyboardStore.getState().explode;
    gsap.killTweensOf(tweenProxy.current);
    gsap.to(tweenProxy.current, {
      val: target,
      duration: 0.55,
      ease: 'power3.out',
      onUpdate: () => setExplode(tweenProxy.current.val),
    });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-20 flex flex-col items-center gap-2.5 px-3 sm:bottom-5">
      {children}
      <div className="toy-panel pointer-events-auto w-full max-w-[560px] rounded-3xl px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor="explode-slider"
              className="font-display text-xs font-extrabold text-[#2d2522] sm:text-sm"
            >
              Explode layers
            </label>
            <span className="font-mono-num rounded-lg bg-[#f2e8dc] px-2 py-0.5 text-xs font-semibold text-[#2d2522]">
              {percent}%
            </span>
          </div>

          <div className="flex items-center gap-1">
            {PRESETS.map((p) => {
              const isSelected = Math.abs(explode - p.value) < 0.03;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => animateExplodeTo(p.value)}
                  className={`cursor-pointer rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e77c68] ${
                    isSelected
                      ? 'bg-[#2d2522] text-[#fffcf7]'
                      : 'bg-[#f5ede2] text-[#685c57] hover:bg-[#ebe0d1] hover:text-[#2d2522]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Large tactile horizontal slider */}
        <div className="relative flex h-10 items-center">
          <div className="pointer-events-none absolute inset-x-0 h-3.5 overflow-hidden rounded-full bg-[#ede3d5] shadow-inner">
            <div
              className="h-full rounded-full bg-[#e77c68] transition-[width] duration-75"
              style={{ width: `${percent}%` }}
            />
          </div>
          <input
            id="explode-slider"
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={explode * 100}
            aria-label="Explode keyboard layers"
            onChange={(e) => {
              gsap.killTweensOf(tweenProxy.current);
              setExplode(Number(e.target.value) / 100);
            }}
            className="explode-range relative z-10 h-10 w-full"
          />
        </div>

        <div className="mt-0.5 flex items-center justify-between text-[10.5px] font-medium text-[#80736d]">
          <span>Assembled</span>
          <span className="hidden sm:inline">Keycaps → Switches → Plate → Foam → PCB → Case</span>
          <span>100% Exploded</span>
        </div>
      </div>
    </div>
  );
};
