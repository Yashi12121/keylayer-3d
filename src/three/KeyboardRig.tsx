import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import gsap from 'gsap';
import { KEYBOARD_KEYS, KEY_CODE_TO_INDEX } from '../data/keyboardLayout';
import { soundEngine } from '../audio/soundEngine';
import { useKeyboardStore } from '../store/useKeyboardStore';
import { InstancedKeycaps } from './InstancedKeycaps';
import { InstancedSwitches } from './InstancedSwitches';
import {
  BottomCaseLayer,
  FoamDampenerLayer,
  PcbLayer,
  SwitchPlateLayer,
} from './KeyboardLayers';

function getIdealCameraPose(explode: number, aspect: number, customizerOpen: boolean) {
  // Zoom out gracefully on narrow portrait viewports so the full 65% width fits
  const mobileScale = aspect < 0.65 ? 2.45 : aspect < 1.05 ? 1.55 : 1.18;
  // Offset slightly right when desktop customizer panel is open so keyboard centers in open area
  const targetX = aspect >= 1.15 && customizerOpen ? 1.55 : 0;
  const targetY = 0.65 + explode * 2.55;
  const basePos = new THREE.Vector3(
    7.6 + targetX + explode * 1.5,
    8.5 + explode * 4.5,
    12.8 + explode * 3.8
  );
  basePos.multiplyScalar(mobileScale);
  return {
    position: basePos,
    target: new THREE.Vector3(targetX, targetY, 0),
  };
}

export const KeyboardRig: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera, size } = useThree();
  const cameraResetCount = useKeyboardStore((s) => s.cameraResetCount);
  const explode = useKeyboardStore((s) => s.explode);

  const prevExplodeRef = useRef(explode);
  const isUserDraggingRef = useRef(false);
  const initializedRef = useRef(false);

  // Set responsive initial 3/4 camera framing once on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const aspect = size.width / Math.max(1, size.height);
    const s = useKeyboardStore.getState();
    const pose = getIdealCameraPose(s.explode, aspect, s.customizerOpen);
    camera.position.copy(pose.position);
    if (controlsRef.current) {
      controlsRef.current.target.copy(pose.target);
      controlsRef.current.update();
    }
  }, [camera, size.width, size.height]);

  // Smooth GSAP camera reset when user clicks "Reset view"
  useEffect(() => {
    if (cameraResetCount === 0) return;
    const aspect = size.width / Math.max(1, size.height);
    const s = useKeyboardStore.getState();
    const pose = getIdealCameraPose(s.explode, aspect, s.customizerOpen);

    gsap.killTweensOf(camera.position);
    gsap.to(camera.position, {
      x: pose.position.x,
      y: pose.position.y,
      z: pose.position.z,
      duration: 0.75,
      ease: 'power3.out',
    });

    if (controlsRef.current) {
      gsap.killTweensOf(controlsRef.current.target);
      gsap.to(controlsRef.current.target, {
        x: pose.target.x,
        y: pose.target.y,
        z: pose.target.z,
        duration: 0.75,
        ease: 'power3.out',
        onUpdate: () => controlsRef.current?.update(),
      });
    }
  }, [cameraResetCount, camera, size.width, size.height]);

  // Subtly track vertical center as user drags Explode slider from 0% -> 100%
  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const currentExplode = useKeyboardStore.getState().explode;
    const explodeDelta = currentExplode - prevExplodeRef.current;
    prevExplodeRef.current = currentExplode;

    if (!isUserDraggingRef.current && Math.abs(explodeDelta) > 0.0001) {
      const desiredTargetY = 0.65 + currentExplode * 2.45;
      const dy = desiredTargetY - controls.target.y;
      controls.target.y += dy * Math.min(1, delta * 10);
      camera.position.y += dy * Math.min(1, delta * 10) + explodeDelta * 1.65;
      camera.position.z += explodeDelta * 3.2;
      camera.position.x += explodeDelta * 1.1;
      controls.update();
    }
  });

  // Real physical keyboard listener -> depresses matching 3D keycap + switch + PCB LED + sound
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const activeTag = document.activeElement?.tagName;
      const isSliderFocused =
        activeTag === 'INPUT' && (document.activeElement as HTMLInputElement)?.type === 'range';

      if (e.code === 'Escape') {
        const state = useKeyboardStore.getState();
        if (state.isolatedLayer !== null || state.pinnedSwitchIndex !== null) {
          state.setIsolatedLayer(null);
          state.setPinnedSwitchIndex(null);
        }
      }

      const keyIndex = KEY_CODE_TO_INDEX[e.code];
      if (keyIndex === undefined) return;

      if (
        !isSliderFocused &&
        (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow'))
      ) {
        e.preventDefault();
      }

      // If slider is focused and user taps Left/Right arrow, let slider handle range nudge cleanly
      if (isSliderFocused && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
        return;
      }

      const keyDef = KEYBOARD_KEYS[keyIndex];
      const state = useKeyboardStore.getState();
      soundEngine.unlock();
      state.pressKey(keyIndex);
      soundEngine.playKeyDown(state.soundProfile, keyDef.uWidth, state.soundEnabled);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keyIndex = KEY_CODE_TO_INDEX[e.code];
      if (keyIndex === undefined) return;
      const keyDef = KEYBOARD_KEYS[keyIndex];
      const state = useKeyboardStore.getState();
      if (state.pressedKeys[keyIndex]) {
        state.releaseKey(keyIndex);
        soundEngine.playKeyUp(state.soundProfile, keyDef.uWidth, state.soundEnabled);
      }
    };

    const handleBlur = () => {
      useKeyboardStore.getState().clearPressedKeys();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={6.5}
        maxDistance={48}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI / 2 - 0.05}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        onStart={() => {
          isUserDraggingRef.current = true;
        }}
        onEnd={() => {
          isUserDraggingRef.current = false;
        }}
      />

      {/* Keyboard sitting flush on the pastel desk mat (top surface y = 0.03) */}
      <group position={[0, 0.03, 0]}>
        <BottomCaseLayer />
        <PcbLayer />
        <FoamDampenerLayer />
        <SwitchPlateLayer />
        <InstancedSwitches />
        <InstancedKeycaps />
      </group>
    </>
  );
};
