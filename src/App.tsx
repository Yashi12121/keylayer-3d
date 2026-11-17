import { Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { DeskScene } from './three/DeskScene';
import { KeyboardRig } from './three/KeyboardRig';
import { TopBar } from './components/TopBar';
import { LayerStackNav } from './components/LayerStackNav';
import { ExplodeBar } from './components/ExplodeBar';
import { CustomizerPanel } from './components/CustomizerPanel';
import { OnboardingHint } from './components/OnboardingHint';
import { useKeyboardStore } from './store/useKeyboardStore';

export function App() {
  const setIsolatedLayer = useKeyboardStore((s) => s.setIsolatedLayer);
  const setPinnedSwitchIndex = useKeyboardStore((s) => s.setPinnedSwitchIndex);

  return (
    <main className="relative h-full w-full select-none overflow-hidden bg-[#f6efe6]">
      {/* 3D Canvas Viewport */}
      <div className="h-full w-full touch-none">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [6.8, 7.6, 10.8], fov: 36, near: 0.1, far: 120 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.04,
          }}
          onPointerMissed={() => {
            const state = useKeyboardStore.getState();
            if (state.isolatedLayer !== null || state.pinnedSwitchIndex !== null) {
              setIsolatedLayer(null);
              setPinnedSwitchIndex(null);
            }
          }}
        >
          <Suspense fallback={null}>
            <DeskScene />
            <KeyboardRig />
          </Suspense>
        </Canvas>
      </div>

      {/* Playful Tactile HUD */}
      <TopBar />
      <LayerStackNav />
      <CustomizerPanel />
      <ExplodeBar>
        <div className="hidden sm:block">
          <OnboardingHint />
        </div>
      </ExplodeBar>
    </main>
  );
}

export default App;
