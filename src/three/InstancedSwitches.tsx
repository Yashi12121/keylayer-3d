import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { KEYBOARD_KEYS } from '../data/keyboardLayout';
import { LAYER_META, SWITCH_STYLES } from '../data/themes';
import { useKeyboardStore } from '../store/useKeyboardStore';
import { soundEngine } from '../audio/soundEngine';
import { computeLayerExplodeFactor, SpringState, stepSpring } from './springMath';
import {
  createSwitchBottomGeometry,
  createSwitchPinsGeometry,
  createSwitchSpringGeometry,
  createSwitchStemGeometry,
  createSwitchTopHousingGeometry,
} from './geometries';

const SWITCH_META = LAYER_META.find((l) => l.id === 'switches')!;
const BASE_Y = 0.61; // Sits directly on top of the CNC switch plate
const noopRaycast: THREE.Object3D['raycast'] = () => {};

export const InstancedSwitches: React.FC = () => {
  const explode = useKeyboardStore((s) => s.explode);
  const isolatedLayer = useKeyboardStore((s) => s.isolatedLayer);
  const switchStyleId = useKeyboardStore((s) => s.switchStyleId);
  const hoveredSwitchIndex = useKeyboardStore((s) => s.hoveredSwitchIndex);
  const pinnedSwitchIndex = useKeyboardStore((s) => s.pinnedSwitchIndex);
  const setHoveredSwitchIndex = useKeyboardStore((s) => s.setHoveredSwitchIndex);
  const setPinnedSwitchIndex = useKeyboardStore((s) => s.setPinnedSwitchIndex);
  const toggleIsolateLayer = useKeyboardStore((s) => s.toggleIsolateLayer);

  const isFaded = isolatedLayer !== null && isolatedLayer !== 'switches';
  const canInspectSwitch = !isFaded && (explode > 0.1 || isolatedLayer === 'switches');
  const activeInspectIndex = canInspectSwitch
    ? hoveredSwitchIndex ?? pinnedSwitchIndex
    : null;

  const switchStyle = useMemo(
    () => SWITCH_STYLES.find((s) => s.id === switchStyleId) ?? SWITCH_STYLES[0],
    [switchStyleId]
  );

  const groupRef = useRef<THREE.Group | null>(null);
  const hitProxyRef = useRef<THREE.InstancedMesh | null>(null);
  const bottomRef = useRef<THREE.InstancedMesh | null>(null);
  const pinsRef = useRef<THREE.InstancedMesh | null>(null);
  const springRef = useRef<THREE.InstancedMesh | null>(null);
  const stemRef = useRef<THREE.InstancedMesh | null>(null);
  const topRef = useRef<THREE.InstancedMesh | null>(null);

  const geometries = useMemo(
    () => ({
      hitProxy: new THREE.BoxGeometry(0.74, 0.48, 0.74),
      bottom: createSwitchBottomGeometry(),
      pins: createSwitchPinsGeometry(),
      spring: createSwitchSpringGeometry(),
      stem: createSwitchStemGeometry(),
      top: createSwitchTopHousingGeometry(),
    }),
    []
  );

  const materials = useMemo(
    () => ({
      hitProxy: new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      }),
      bottom: new THREE.MeshStandardMaterial({
        color: switchStyle.bottomColor,
        roughness: 0.45,
        metalness: 0.04,
        transparent: true,
        opacity: 1,
        depthWrite: true,
      }),
      pins: new THREE.MeshStandardMaterial({
        color: '#E7BF72',
        roughness: 0.22,
        metalness: 0.88,
        transparent: true,
        opacity: 1,
        depthWrite: true,
      }),
      spring: new THREE.MeshStandardMaterial({
        color: '#F1C97A',
        roughness: 0.24,
        metalness: 0.86,
        transparent: true,
        opacity: 1,
        depthWrite: true,
      }),
      stem: new THREE.MeshStandardMaterial({
        color: switchStyle.stemColor,
        roughness: 0.34,
        metalness: 0.06,
        transparent: true,
        opacity: 1,
        depthWrite: true,
      }),
      top: new THREE.MeshStandardMaterial({
        color: '#E6EDF5',
        roughness: 0.24,
        metalness: 0.14,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    }),
    [] // Created once; colors updated reactively via effect
  );

  useEffect(() => {
    materials.bottom.color.set(switchStyle.bottomColor);
    materials.stem.color.set(switchStyle.stemColor);
    materials.top.color.set(switchStyle.topColor).lerp(new THREE.Color('#CFD9E6'), 0.35);
  }, [switchStyle, materials]);

  useEffect(() => {
    return () => {
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    };
  }, [geometries, materials]);

  const layerLiftSpring = useRef<SpringState>({ value: 0, velocity: 0 });
  const opacitySpring = useRef<SpringState>({ value: 1, velocity: 0 });
  const pressSprings = useRef<SpringState[]>(
    KEYBOARD_KEYS.map(() => ({ value: 0, velocity: 0 }))
  );
  const splitSprings = useRef<SpringState[]>(
    KEYBOARD_KEYS.map(() => ({ value: 0, velocity: 0 }))
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initial instance matrices for all 67 switches + recompute bounding spheres for raycasting
  useLayoutEffect(() => {
    KEYBOARD_KEYS.forEach((k) => {
      dummy.position.set(k.x, 0.14, k.z);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      hitProxyRef.current?.setMatrixAt(k.index, dummy.matrix);

      dummy.position.set(k.x, 0, k.z);
      dummy.updateMatrix();

      bottomRef.current?.setMatrixAt(k.index, dummy.matrix);
      pinsRef.current?.setMatrixAt(k.index, dummy.matrix);
      topRef.current?.setMatrixAt(k.index, dummy.matrix);

      dummy.position.set(k.x, -0.05, k.z);
      dummy.updateMatrix();
      springRef.current?.setMatrixAt(k.index, dummy.matrix);

      dummy.position.set(k.x, 0.14, k.z);
      dummy.updateMatrix();
      stemRef.current?.setMatrixAt(k.index, dummy.matrix);
    });

    [hitProxyRef, bottomRef, pinsRef, springRef, stemRef, topRef].forEach((ref) => {
      if (ref.current) {
        ref.current.instanceMatrix.needsUpdate = true;
        ref.current.computeBoundingSphere();
        ref.current.computeBoundingBox();
      }
    });
  }, [dummy]);

  useFrame((_, delta) => {
    const state = useKeyboardStore.getState();

    // 1. Layer Y position spring
    const targetLift =
      computeLayerExplodeFactor(state.explode, SWITCH_META.startAt, SWITCH_META.endAt) *
        SWITCH_META.maxLift +
      (state.isolatedLayer === 'switches' ? 0.25 : 0);
    const currentLift = stepSpring(layerLiftSpring.current, targetLift, delta, 200, 16.5);
    if (groupRef.current) {
      groupRef.current.position.y = BASE_Y + currentLift;
    }

    // 2. Opacity spring
    const faded = state.isolatedLayer !== null && state.isolatedLayer !== 'switches';
    const targetOpacity = faded ? 0.15 : 1.0;
    const op = Math.max(0.05, Math.min(1, stepSpring(opacitySpring.current, targetOpacity, delta, 240, 24)));

    materials.bottom.opacity = op;
    materials.bottom.depthWrite = op > 0.92;
    materials.pins.opacity = op;
    materials.pins.depthWrite = op > 0.92;
    materials.spring.opacity = op;
    materials.spring.depthWrite = op > 0.92;
    materials.stem.opacity = op;
    materials.stem.depthWrite = op > 0.92;
    materials.top.opacity = op * 0.8;

    // 3. Per-switch key press compression & hover mini-exploded view!
    const inspectAllowed = !faded && (state.explode > 0.1 || state.isolatedLayer === 'switches');
    const inspectIdx = inspectAllowed
      ? state.hoveredSwitchIndex ?? state.pinnedSwitchIndex
      : null;

    let anyDirty = false;
    KEYBOARD_KEYS.forEach((k) => {
      const i = k.index;
      const targetPress = state.pressedKeys[i] ? 1 : 0;
      const targetSplit = inspectIdx === i ? 1 : 0;

      const pSpring = pressSprings.current[i];
      const sSpring = splitSprings.current[i];

      const prevP = pSpring.value;
      const prevS = sSpring.value;
      const p = stepSpring(pSpring, targetPress, delta, 380, 19);
      const s = stepSpring(sSpring, targetSplit, delta, 260, 16);

      if (
        Math.abs(p - prevP) > 0.0002 ||
        Math.abs(s - prevS) > 0.0002 ||
        Math.abs(pSpring.velocity) > 0.002 ||
        Math.abs(sSpring.velocity) > 0.002
      ) {
        anyDirty = true;

        // Bottom housing + pins drop slightly during mini-explode
        const bottomY = -0.18 * s;
        dummy.position.set(k.x, bottomY, k.z);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        bottomRef.current?.setMatrixAt(i, dummy.matrix);
        pinsRef.current?.setMatrixAt(i, dummy.matrix);

        // Helical coil spring: compresses when pressed, floats & stretches slightly when split!
        const springY = -0.05 + 0.18 * s;
        const springScaleY = Math.max(0.45, 1 - 0.36 * p + 0.22 * s);
        dummy.position.set(k.x, springY, k.z);
        dummy.scale.set(1 + 0.08 * s, springScaleY, 1 + 0.08 * s);
        dummy.updateMatrix();
        springRef.current?.setMatrixAt(i, dummy.matrix);

        // MX Cross Stem: plunges -0.14 on key press, floats +0.52 when hovered/split!
        const stemY = 0.14 - 0.14 * p + 0.48 * s;
        dummy.position.set(k.x, stemY, k.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        stemRef.current?.setMatrixAt(i, dummy.matrix);

        // Frosted Top Housing: lifts +0.88 above stem during mini-explode!
        const topY = 0.88 * s;
        dummy.position.set(k.x, topY, k.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        topRef.current?.setMatrixAt(i, dummy.matrix);
      }
    });

    if (anyDirty) {
      if (bottomRef.current) bottomRef.current.instanceMatrix.needsUpdate = true;
      if (pinsRef.current) pinsRef.current.instanceMatrix.needsUpdate = true;
      if (springRef.current) springRef.current.instanceMatrix.needsUpdate = true;
      if (stemRef.current) stemRef.current.instanceMatrix.needsUpdate = true;
      if (topRef.current) topRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (isFaded || e.instanceId === undefined) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    if (canInspectSwitch) {
      if (useKeyboardStore.getState().hoveredSwitchIndex !== e.instanceId) {
        setHoveredSwitchIndex(e.instanceId);
      }
    }
  };

  const handlePointerOut = () => {
    setHoveredSwitchIndex(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (isFaded || e.instanceId === undefined) return;
    e.stopPropagation();
    const { soundEnabled } = useKeyboardStore.getState();

    // On touch devices (or if no hover occurred), tapping a visible switch pins its mini-explode
    const isTouchLike = (e.nativeEvent as PointerEvent).pointerType === 'touch';
    if (isTouchLike && canInspectSwitch) {
      soundEngine.playUiPop(soundEnabled, true);
      setPinnedSwitchIndex(pinnedSwitchIndex === e.instanceId ? null : e.instanceId);
      return;
    }

    soundEngine.playUiPop(soundEnabled, isolatedLayer !== 'switches');
    toggleIsolateLayer('switches');
  };

  const inspectedKey = activeInspectIndex !== null ? KEYBOARD_KEYS[activeInspectIndex] : null;

  return (
    <group ref={groupRef} position={[0, BASE_Y, 0]}>
      {/* Stationary per-switch hit volume prevents hover flicker when switch parts split upward */}
      <instancedMesh
        ref={hitProxyRef}
        args={[geometries.hitProxy, materials.hitProxy, KEYBOARD_KEYS.length]}
        frustumCulled={false}
        renderOrder={5}
        raycast={isFaded ? noopRaycast : THREE.InstancedMesh.prototype.raycast}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
      <instancedMesh
        ref={bottomRef}
        args={[geometries.bottom, materials.bottom, KEYBOARD_KEYS.length]}
        frustumCulled={false}
        castShadow={!isFaded}
        receiveShadow
        renderOrder={5}
        raycast={noopRaycast}
      />
      <instancedMesh
        ref={pinsRef}
        args={[geometries.pins, materials.pins, KEYBOARD_KEYS.length]}
        frustumCulled={false}
        renderOrder={5}
        raycast={noopRaycast}
      />
      <instancedMesh
        ref={springRef}
        args={[geometries.spring, materials.spring, KEYBOARD_KEYS.length]}
        frustumCulled={false}
        renderOrder={5}
        raycast={noopRaycast}
      />
      <instancedMesh
        ref={stemRef}
        args={[geometries.stem, materials.stem, KEYBOARD_KEYS.length]}
        frustumCulled={false}
        castShadow={!isFaded}
        renderOrder={5}
        raycast={noopRaycast}
      />
      <instancedMesh
        ref={topRef}
        args={[geometries.top, materials.top, KEYBOARD_KEYS.length]}
        frustumCulled={false}
        renderOrder={5}
        raycast={noopRaycast}
      />

      {/* Crisp floating anatomy callout when a switch is mini-exploded */}
      {inspectedKey && (
        <Html
          position={[inspectedKey.x + 0.55, 0.56, inspectedKey.z]}
          center={false}
          style={{ pointerEvents: 'none' }}
        >
          <div className="toy-panel pointer-events-none w-44 rounded-2xl px-3 py-2.5 text-left text-[11px] leading-tight">
            <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-[rgba(74,58,49,0.1)] pb-1">
              <span className="font-display font-bold text-[#2d2522]">
                {inspectedKey.label} Switch
              </span>
              <span className="font-mono-num rounded-md bg-[#f2e8dc] px-1.5 py-0.5 text-[10px] font-semibold text-[#685c57]">
                {switchStyle.forceLabel}
              </span>
            </div>
            <ul className="space-y-1 text-[10.5px] text-[#5c504b]">
              <li className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full border border-black/15"
                  style={{ background: switchStyle.topColor }}
                />
                <span>Top housing</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: switchStyle.stemColor }}
                />
                <span>MX cross stem</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#e8bf6a]" />
                <span>Helical coil spring</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full border border-black/15"
                  style={{ background: switchStyle.bottomColor }}
                />
                <span>Bottom housing + pins</span>
              </li>
            </ul>
          </div>
        </Html>
      )}
    </group>
  );
};
