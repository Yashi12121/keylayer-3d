import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { BLOCKER_POS, KEYBOARD_KEYS, KEY_UNIT, MATRIX_ROWS, MATRIX_WIDTH_U } from '../data/keyboardLayout';
import { CASE_FINISHES, KEYCAP_THEMES, LAYER_META, LayerId } from '../data/themes';
import { useKeyboardStore } from '../store/useKeyboardStore';
import { soundEngine } from '../audio/soundEngine';
import { computeLayerExplodeFactor, SpringState, stepSpring } from './springMath';
import {
  createBottomCaseGeometries,
  createFoamBumpTexture,
  createFoamGeometry,
  createPcbGeometry,
  createPcbTexture,
  createPlateGeometry,
} from './geometries';

const noopRaycast: THREE.Object3D['raycast'] = () => {};

function getLayerMeta(id: LayerId) {
  return LAYER_META.find((l) => l.id === id)!;
}

/**
 * Shared spring & fade updater for structural layers (`plate`, `foam`, `pcb`, `bottomCase`).
 */
function useLayerSpringAndFade(
  layerId: LayerId,
  baseY: number,
  groupRef: React.RefObject<THREE.Group | null>,
  materials: Array<{ mat: THREE.Material; baseOpacity?: number }>,
  extraIsolateLift = 0.24
) {
  const meta = useMemo(() => getLayerMeta(layerId), [layerId]);
  const liftSpring = useRef<SpringState>({ value: 0, velocity: 0 });
  const opacitySpring = useRef<SpringState>({ value: 1, velocity: 0 });

  useFrame((_, delta) => {
    const state = useKeyboardStore.getState();

    const targetLift =
      computeLayerExplodeFactor(state.explode, meta.startAt, meta.endAt) * meta.maxLift +
      (state.isolatedLayer === layerId ? extraIsolateLift : 0);
    const lift = stepSpring(liftSpring.current, targetLift, delta, 200, 16.5);
    if (groupRef.current) {
      groupRef.current.position.y = baseY + lift;
    }

    const faded = state.isolatedLayer !== null && state.isolatedLayer !== layerId;
    const targetOp = faded ? 0.15 : 1.0;
    const op = Math.max(0.05, Math.min(1, stepSpring(opacitySpring.current, targetOp, delta, 240, 24)));

    for (const entry of materials) {
      const baseOp = entry.baseOpacity ?? 1;
      entry.mat.opacity = baseOp * op;
      entry.mat.depthWrite = op > 0.92 && baseOp > 0.92;
    }
  });
}

function useLayerPointerHandlers(layerId: LayerId, isFaded: boolean) {
  const toggleIsolateLayer = useKeyboardStore((s) => s.toggleIsolateLayer);

  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (isFaded) return;
      e.stopPropagation();
      const { soundEnabled, isolatedLayer } = useKeyboardStore.getState();
      soundEngine.playUiPop(soundEnabled, isolatedLayer !== layerId);
      toggleIsolateLayer(layerId);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      if (isFaded) return;
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      document.body.style.cursor = 'auto';
    },
  };
}

/**
 * Layer 3: CNC Switch Plate + Gasket Tabs + Gold Stabilizer Wires
 */
export const SwitchPlateLayer: React.FC = () => {
  const isolatedLayer = useKeyboardStore((s) => s.isolatedLayer);
  const caseFinishId = useKeyboardStore((s) => s.caseFinishId);
  const isFaded = isolatedLayer !== null && isolatedLayer !== 'plate';

  const caseFinish = useMemo(
    () => CASE_FINISHES.find((c) => c.id === caseFinishId) ?? CASE_FINISHES[0],
    [caseFinishId]
  );

  const groupRef = useRef<THREE.Group | null>(null);
  const plateGeom = useMemo(() => createPlateGeometry(), []);

  const plateMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#DDE1E7',
        roughness: 0.34,
        metalness: 0.58,
        transparent: true,
        opacity: 1,
      }),
    []
  );

  const stabHousingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#F7EFE4',
        roughness: 0.42,
        metalness: 0.05,
        transparent: true,
        opacity: 1,
      }),
    []
  );

  const goldWireMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#E9C373',
        roughness: 0.22,
        metalness: 0.88,
        transparent: true,
        opacity: 1,
      }),
    []
  );

  const blockerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: caseFinish.weightColor,
        roughness: 0.28,
        metalness: 0.65,
        transparent: true,
        opacity: 1,
      }),
    []
  );

  useEffect(() => {
    blockerMat.color.set(caseFinish.weightColor);
  }, [caseFinish, blockerMat]);

  useEffect(() => {
    return () => {
      plateGeom.dispose();
      plateMat.dispose();
      stabHousingMat.dispose();
      goldWireMat.dispose();
      blockerMat.dispose();
    };
  }, [plateGeom, plateMat, stabHousingMat, goldWireMat, blockerMat]);

  const materialEntries = useMemo(
    () => [
      { mat: plateMat },
      { mat: stabHousingMat },
      { mat: goldWireMat },
      { mat: blockerMat },
    ],
    [plateMat, stabHousingMat, goldWireMat, blockerMat]
  );

  useLayerSpringAndFade('plate', 0.535, groupRef, materialEntries);
  const handlers = useLayerPointerHandlers('plate', isFaded);

  // Stabilizer positions for Space, Enter, LShift, Backspace
  const stabilizers = useMemo(
    () =>
      KEYBOARD_KEYS.filter((k) => k.hasStabilizer).map((k) => ({
        id: k.id,
        x: k.x,
        z: k.z,
        span: k.uWidth >= 6 ? 3.1 : 0.76,
      })),
    []
  );

  const gasketTabXs = [-4.6, 0, 4.6];
  const halfPlateD = (MATRIX_ROWS * KEY_UNIT + 0.2) / 2;

  return (
    <group ref={groupRef} position={[0, 0.535, 0]}>
      <mesh
        geometry={plateGeom}
        material={plateMat}
        castShadow={!isFaded}
        receiveShadow
        renderOrder={4}
        raycast={isFaded ? noopRaycast : THREE.Mesh.prototype.raycast}
        {...handlers}
      />

      {/* 6 subtle gasket mounting tabs tucked neatly inside plate perimeter */}
      {gasketTabXs.map((tx) => (
        <React.Fragment key={tx}>
          <RoundedBox
            args={[0.84, 0.055, 0.06]}
            radius={0.018}
            position={[tx, 0.032, -halfPlateD + 0.03]}
            material={plateMat}
            renderOrder={4}
            raycast={noopRaycast}
          />
          <RoundedBox
            args={[0.84, 0.055, 0.06]}
            radius={0.018}
            position={[tx, 0.032, halfPlateD - 0.03]}
            material={plateMat}
            renderOrder={4}
            raycast={noopRaycast}
          />
        </React.Fragment>
      ))}

      {/* Decorative brass/anodized 0.5u badge blocker between FN and Left Arrow */}
      <RoundedBox
        args={[BLOCKER_POS.width, 0.11, BLOCKER_POS.depth * 0.78]}
        radius={0.035}
        position={[BLOCKER_POS.x, 0.08, BLOCKER_POS.z]}
        material={blockerMat}
        renderOrder={4}
        raycast={noopRaycast}
      />

      {/* Plate-mounted stabilizer housings + gold wire bars */}
      {stabilizers.map((s) => (
        <group key={s.id} position={[s.x, 0.07, s.z]}>
          <RoundedBox
            args={[0.19, 0.14, 0.36]}
            radius={0.025}
            position={[-s.span / 2, 0.03, 0]}
            material={stabHousingMat}
            renderOrder={4}
            raycast={noopRaycast}
          />
          <RoundedBox
            args={[0.19, 0.14, 0.36]}
            radius={0.025}
            position={[s.span / 2, 0.03, 0]}
            material={stabHousingMat}
            renderOrder={4}
            raycast={noopRaycast}
          />
          <mesh
            position={[0, 0.02, -0.19]}
            rotation={[0, 0, Math.PI / 2]}
            material={goldWireMat}
            renderOrder={4}
            raycast={noopRaycast}
          >
            <cylinderGeometry args={[0.018, 0.018, s.span, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/**
 * Layer 4: Poron Acoustic Foam Dampener
 */
export const FoamDampenerLayer: React.FC = () => {
  const isolatedLayer = useKeyboardStore((s) => s.isolatedLayer);
  const isFaded = isolatedLayer !== null && isolatedLayer !== 'foam';

  const groupRef = useRef<THREE.Group | null>(null);
  const foamGeom = useMemo(() => createFoamGeometry(), []);
  const bumpTex = useMemo(() => createFoamBumpTexture(), []);

  const foamMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#EFE5D7',
        bumpMap: bumpTex,
        bumpScale: 0.015,
        roughness: 0.94,
        metalness: 0.0,
        transparent: true,
        opacity: 1,
      }),
    [bumpTex]
  );

  useEffect(() => {
    return () => {
      foamGeom.dispose();
      bumpTex.dispose();
      foamMat.dispose();
    };
  }, [foamGeom, bumpTex, foamMat]);

  const materialEntries = useMemo(() => [{ mat: foamMat }], [foamMat]);
  useLayerSpringAndFade('foam', 0.432, groupRef, materialEntries);
  const handlers = useLayerPointerHandlers('foam', isFaded);

  return (
    <group ref={groupRef} position={[0, 0.432, 0]}>
      <mesh
        geometry={foamGeom}
        material={foamMat}
        castShadow={!isFaded}
        receiveShadow
        renderOrder={3}
        raycast={isFaded ? noopRaycast : THREE.Mesh.prototype.raycast}
        {...handlers}
      />
    </group>
  );
};

/**
 * Layer 5: Hot-Swap PCB with gold pads, USB-C port, MCU, hot-swap sockets, & reactive RGB LEDs
 */
export const PcbLayer: React.FC = () => {
  const isolatedLayer = useKeyboardStore((s) => s.isolatedLayer);
  const caseFinishId = useKeyboardStore((s) => s.caseFinishId);
  const keycapThemeId = useKeyboardStore((s) => s.keycapThemeId);
  const isFaded = isolatedLayer !== null && isolatedLayer !== 'pcb';

  const caseFinish = useMemo(
    () => CASE_FINISHES.find((c) => c.id === caseFinishId) ?? CASE_FINISHES[0],
    [caseFinishId]
  );
  const theme = useMemo(
    () => KEYCAP_THEMES.find((t) => t.id === keycapThemeId) ?? KEYCAP_THEMES[0],
    [keycapThemeId]
  );

  const groupRef = useRef<THREE.Group | null>(null);
  const socketsRef = useRef<THREE.InstancedMesh | null>(null);
  const ledsRef = useRef<THREE.InstancedMesh | null>(null);

  const pcbGeom = useMemo(() => createPcbGeometry(), []);
  const socketGeom = useMemo(() => new THREE.BoxGeometry(0.32, 0.045, 0.14), []);
  const ledGeom = useMemo(() => new THREE.BoxGeometry(0.14, 0.024, 0.09), []);

  const pcbTexture = useMemo(() => createPcbTexture(caseFinish.pcbColor), [caseFinish.pcbColor]);

  useEffect(() => {
    return () => {
      pcbTexture.dispose();
    };
  }, [pcbTexture]);

  const pcbMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: pcbTexture,
        roughness: 0.55,
        metalness: 0.12,
        transparent: true,
        opacity: 1,
      }),
    []
  );

  useEffect(() => {
    pcbMat.map = pcbTexture;
    pcbMat.needsUpdate = true;
  }, [pcbTexture, pcbMat]);

  const socketMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2F3338',
        roughness: 0.5,
        metalness: 0.25,
        transparent: true,
        opacity: 1,
      }),
    []
  );

  const ledMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#ffffff',
        emissiveIntensity: 0.28,
        roughness: 0.25,
        transparent: true,
        opacity: 1,
      }),
    []
  );

  const metalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#D7DCE2',
        roughness: 0.24,
        metalness: 0.85,
        transparent: true,
        opacity: 1,
      }),
    []
  );

  const chipMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2B2F36',
        roughness: 0.42,
        metalness: 0.15,
        transparent: true,
        opacity: 1,
      }),
    []
  );

  useEffect(() => {
    return () => {
      pcbGeom.dispose();
      socketGeom.dispose();
      ledGeom.dispose();
      pcbMat.dispose();
      socketMat.dispose();
      ledMat.dispose();
      metalMat.dispose();
      chipMat.dispose();
    };
  }, [pcbGeom, socketGeom, ledGeom, pcbMat, socketMat, ledMat, metalMat, chipMat]);

  const materialEntries = useMemo(
    () => [
      { mat: pcbMat },
      { mat: socketMat },
      { mat: ledMat },
      { mat: metalMat },
      { mat: chipMat },
    ],
    [pcbMat, socketMat, ledMat, metalMat, chipMat]
  );

  useLayerSpringAndFade('pcb', 0.34, groupRef, materialEntries);
  const handlers = useLayerPointerHandlers('pcb', isFaded);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const baseLedColor = useMemo(() => new THREE.Color('#E8ECEA'), []);
  const glowColor = useMemo(() => new THREE.Color(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const ledGlowLevels = useRef<Float32Array>(new Float32Array(KEYBOARD_KEYS.length));

  useLayoutEffect(() => {
    KEYBOARD_KEYS.forEach((k) => {
      dummy.position.set(k.x - 0.02, -0.02, k.z - 0.18);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      socketsRef.current?.setMatrixAt(k.index, dummy.matrix);

      dummy.position.set(k.x, 0.095, k.z + 0.17);
      dummy.updateMatrix();
      ledsRef.current?.setMatrixAt(k.index, dummy.matrix);
      ledsRef.current?.setColorAt(k.index, baseLedColor);
    });
    if (socketsRef.current) socketsRef.current.instanceMatrix.needsUpdate = true;
    if (ledsRef.current) {
      ledsRef.current.instanceMatrix.needsUpdate = true;
      if (ledsRef.current.instanceColor) ledsRef.current.instanceColor.needsUpdate = true;
    }
  }, [dummy, baseLedColor]);

  // Smooth per-key LED glow pulse whenever matching key is pressed
  useFrame((_, delta) => {
    const leds = ledsRef.current;
    if (!leds) return;
    const state = useKeyboardStore.getState();
    glowColor.set(theme.ledGlow);

    let changed = false;
    for (let i = 0; i < KEYBOARD_KEYS.length; i += 1) {
      const target = state.pressedKeys[i] ? 1 : 0;
      const prev = ledGlowLevels.current[i];
      const next =
        target > prev
          ? Math.min(1, prev + delta * 18)
          : Math.max(0, prev - delta * 4.2);
      if (Math.abs(next - prev) > 0.002) {
        ledGlowLevels.current[i] = next;
        tempColor.copy(baseLedColor).lerp(glowColor, next);
        leds.setColorAt(i, tempColor);
        changed = true;
      }
    }
    if (changed && leds.instanceColor) {
      leds.instanceColor.needsUpdate = true;
    }
  });

  const pcbDepth = MATRIX_ROWS * KEY_UNIT + 0.16;
  const pcbWidth = MATRIX_WIDTH_U * KEY_UNIT + 0.16;

  return (
    <group ref={groupRef} position={[0, 0.34, 0]}>
      <mesh
        geometry={pcbGeom}
        material={pcbMat}
        castShadow={!isFaded}
        receiveShadow
        renderOrder={2}
        raycast={isFaded ? noopRaycast : THREE.Mesh.prototype.raycast}
        {...handlers}
      />

      {/* 67 Hot-Swap Kailh-style sockets mounted underneath PCB */}
      <instancedMesh
        ref={socketsRef}
        args={[socketGeom, socketMat, KEYBOARD_KEYS.length]}
        renderOrder={2}
        raycast={noopRaycast}
      />

      {/* 67 Reactive per-key SMD RGB LEDs */}
      <instancedMesh
        ref={ledsRef}
        args={[ledGeom, ledMat, KEYBOARD_KEYS.length]}
        renderOrder={2}
        raycast={noopRaycast}
      />

      {/* Top-left USB-C Metallic Port */}
      <group position={[-pcbWidth / 2 + 1.1, 0.12, -pcbDepth / 2 + 0.06]}>
        <RoundedBox
          args={[0.56, 0.17, 0.36]}
          radius={0.055}
          material={metalMat}
          renderOrder={2}
          raycast={noopRaycast}
        />
        <RoundedBox
          args={[0.36, 0.07, 0.08]}
          radius={0.02}
          position={[0, 0, -0.16]}
          material={chipMat}
          renderOrder={2}
          raycast={noopRaycast}
        />
      </group>

      {/* ARM MCU Controller IC + Gold Reset Button */}
      <RoundedBox
        args={[0.56, 0.045, 0.56]}
        radius={0.02}
        position={[0.8, 0.095, -0.4]}
        material={chipMat}
        renderOrder={2}
        raycast={noopRaycast}
      />
      <RoundedBox
        args={[0.24, 0.05, 0.18]}
        radius={0.02}
        position={[3.6, -0.02, 0.8]}
        material={metalMat}
        renderOrder={2}
        raycast={noopRaycast}
      />
    </group>
  );
};

/**
 * Layer 6: Sculpted Unibody Bottom Case with gasket strips, weight badge, & rubber desk feet
 */
export const BottomCaseLayer: React.FC = () => {
  const isolatedLayer = useKeyboardStore((s) => s.isolatedLayer);
  const caseFinishId = useKeyboardStore((s) => s.caseFinishId);
  const isFaded = isolatedLayer !== null && isolatedLayer !== 'bottomCase';

  const caseFinish = useMemo(
    () => CASE_FINISHES.find((c) => c.id === caseFinishId) ?? CASE_FINISHES[0],
    [caseFinishId]
  );

  const groupRef = useRef<THREE.Group | null>(null);
  const { floor, walls } = useMemo(() => createBottomCaseGeometries(), []);

  const caseMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: caseFinish.color,
        roughness: caseFinish.frosted ? 0.28 : 0.42,
        metalness: caseFinish.frosted ? 0.02 : 0.16,
        clearcoat: caseFinish.frosted ? 0.45 : 0.12,
        clearcoatRoughness: 0.3,
        transparent: true,
        opacity: caseFinish.frosted ? 0.82 : 1.0,
      }),
    []
  );

  const innerFloorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: caseFinish.innerColor,
        roughness: 0.48,
        metalness: 0.12,
        transparent: true,
        opacity: caseFinish.frosted ? 0.82 : 1.0,
      }),
    []
  );

  const weightMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: caseFinish.weightColor,
        roughness: 0.24,
        metalness: 0.72,
        transparent: true,
        opacity: 1,
      }),
    []
  );

  const gasketMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFF9F0',
        roughness: 0.82,
        metalness: 0.0,
        transparent: true,
        opacity: 1,
      }),
    []
  );

  const footMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5C4F49',
        roughness: 0.85,
        metalness: 0.0,
        transparent: true,
        opacity: 1,
      }),
    []
  );

  useEffect(() => {
    caseMat.color.set(caseFinish.color);
    caseMat.roughness = caseFinish.frosted ? 0.28 : 0.42;
    caseMat.metalness = caseFinish.frosted ? 0.02 : 0.16;
    caseMat.clearcoat = caseFinish.frosted ? 0.45 : 0.12;
    innerFloorMat.color.set(caseFinish.innerColor);
    weightMat.color.set(caseFinish.weightColor);
  }, [caseFinish, caseMat, innerFloorMat, weightMat]);

  useEffect(() => {
    return () => {
      floor.dispose();
      walls.dispose();
      caseMat.dispose();
      innerFloorMat.dispose();
      weightMat.dispose();
      gasketMat.dispose();
      footMat.dispose();
    };
  }, [floor, walls, caseMat, innerFloorMat, weightMat, gasketMat, footMat]);

  const baseCaseOpacity = caseFinish.frosted ? 0.84 : 1.0;

  const materialEntries = useMemo(
    () => [
      { mat: caseMat, baseOpacity: baseCaseOpacity },
      { mat: innerFloorMat, baseOpacity: baseCaseOpacity },
      { mat: weightMat },
      { mat: gasketMat },
      { mat: footMat },
    ],
    [caseMat, innerFloorMat, weightMat, gasketMat, footMat, baseCaseOpacity]
  );

  useLayerSpringAndFade('bottomCase', 0, groupRef, materialEntries, 0.16);
  const handlers = useLayerPointerHandlers('bottomCase', isFaded);

  const outerW = MATRIX_WIDTH_U * KEY_UNIT + 0.88;
  const outerD = MATRIX_ROWS * KEY_UNIT + 0.84;
  const gasketXs = [-4.6, 0, 4.6];
  const innerLedgeZ = (MATRIX_ROWS * KEY_UNIT + 0.26) / 2 - 0.06;

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh
        geometry={floor}
        material={innerFloorMat}
        castShadow={!isFaded}
        receiveShadow
        renderOrder={1}
        raycast={isFaded ? noopRaycast : THREE.Mesh.prototype.raycast}
        {...handlers}
      />
      <mesh
        geometry={walls}
        material={caseMat}
        castShadow={!isFaded}
        receiveShadow
        renderOrder={1}
        raycast={isFaded ? noopRaycast : THREE.Mesh.prototype.raycast}
        {...handlers}
      />

      {/* 6 soft Poron gasket foam strips lining the internal mounting ledges */}
      {gasketXs.map((gx) => (
        <React.Fragment key={gx}>
          <RoundedBox
            args={[0.92, 0.045, 0.12]}
            radius={0.015}
            position={[gx, 0.31, -innerLedgeZ]}
            material={gasketMat}
            renderOrder={1}
            raycast={noopRaycast}
          />
          <RoundedBox
            args={[0.92, 0.045, 0.12]}
            radius={0.015}
            position={[gx, 0.31, innerLedgeZ]}
            material={gasketMat}
            renderOrder={1}
            raycast={noopRaycast}
          />
        </React.Fragment>
      ))}

      {/* Internal & Bottom Brushed Brass/Champagne Weight Bar */}
      <RoundedBox
        args={[5.4, 0.05, 1.35]}
        radius={0.025}
        position={[0, 0.295, 0]}
        material={weightMat}
        renderOrder={1}
        raycast={noopRaycast}
      />
      <RoundedBox
        args={[6.2, 0.05, 1.45]}
        radius={0.025}
        position={[0, 0.048, 0.15]}
        material={weightMat}
        renderOrder={1}
        raycast={noopRaycast}
      />

      {/* USB-C Rear Port Collar Accent */}
      <RoundedBox
        args={[0.74, 0.22, 0.16]}
        radius={0.055}
        position={[-outerW / 2 + 1.48, 0.44, -outerD / 2 + 0.05]}
        material={weightMat}
        renderOrder={1}
        raycast={noopRaycast}
      />

      {/* 4 Silicone Desk Bumper Feet underneath */}
      {[
        [-outerW / 2 + 0.72, 0.025, -outerD / 2 + 0.62],
        [outerW / 2 - 0.72, 0.025, -outerD / 2 + 0.62],
        [-outerW / 2 + 0.72, 0.025, outerD / 2 - 0.62],
        [outerW / 2 - 0.72, 0.025, outerD / 2 - 0.62],
      ].map(([fx, fy, fz], i) => (
        <mesh key={i} position={[fx, fy, fz]} material={footMat} renderOrder={1} raycast={noopRaycast}>
          <cylinderGeometry args={[0.26, 0.28, 0.05, 18]} />
        </mesh>
      ))}
    </group>
  );
};
