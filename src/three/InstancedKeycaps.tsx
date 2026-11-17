import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { KEYBOARD_KEYS, KeyDef } from '../data/keyboardLayout';
import { KEYCAP_THEMES, LAYER_META } from '../data/themes';
import { useKeyboardStore } from '../store/useKeyboardStore';
import { soundEngine } from '../audio/soundEngine';
import { computeLayerExplodeFactor, SpringState, stepSpring } from './springMath';
import { createKeycapGeometry, createLegendQuadGeometry } from './geometries';
import { createInstancedLegendMaterial, createLegendAtlas } from './legendAtlas';

const KEYCAP_META = LAYER_META.find((l) => l.id === 'keycaps')!;
const BASE_Y = 0.78;
const LEGEND_SURFACE_Y = 0.344;
const noopRaycast: THREE.Object3D['raycast'] = () => {};

interface WidthBucket {
  uWidth: number;
  keys: KeyDef[];
  geometry: THREE.BufferGeometry;
}

export const InstancedKeycaps: React.FC = () => {
  const explode = useKeyboardStore((s) => s.explode);
  const isolatedLayer = useKeyboardStore((s) => s.isolatedLayer);
  const keycapThemeId = useKeyboardStore((s) => s.keycapThemeId);
  const toggleIsolateLayer = useKeyboardStore((s) => s.toggleIsolateLayer);
  const pressKey = useKeyboardStore((s) => s.pressKey);
  const releaseKey = useKeyboardStore((s) => s.releaseKey);
  const setHoveredKeyIndex = useKeyboardStore((s) => s.setHoveredKeyIndex);

  const isFaded = isolatedLayer !== null && isolatedLayer !== 'keycaps';

  const theme = useMemo(
    () => KEYCAP_THEMES.find((t) => t.id === keycapThemeId) ?? KEYCAP_THEMES[0],
    [keycapThemeId]
  );

  // Group 67 keys by exact uWidth so bevel proportions never stretch
  const buckets = useMemo<WidthBucket[]>(() => {
    const grouped = new Map<number, KeyDef[]>();
    for (const key of KEYBOARD_KEYS) {
      const list = grouped.get(key.uWidth) ?? [];
      list.push(key);
      grouped.set(key.uWidth, list);
    }
    return Array.from(grouped.entries()).map(([uWidth, keys]) => ({
      uWidth,
      keys,
      geometry: createKeycapGeometry(uWidth),
    }));
  }, []);

  const meshRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const legendMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);

  const keycapMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.48,
        metalness: 0.03,
        transparent: true,
        opacity: 1,
        depthWrite: true,
      }),
    []
  );

  const legendAtlas = useMemo(() => createLegendAtlas(), []);
  const legendQuadGeom = useMemo(() => {
    const g = createLegendQuadGeometry();
    g.setAttribute('aUvRect', new THREE.InstancedBufferAttribute(legendAtlas.uvRects, 4));
    return g;
  }, [legendAtlas]);

  const legendMaterial = useMemo(() => {
    const mat = createInstancedLegendMaterial(legendAtlas.texture);
    mat.alphaTest = 0.01;
    return mat;
  }, [legendAtlas]);

  // Clean up procedural GPU resources on unmount
  useEffect(() => {
    return () => {
      buckets.forEach((b) => b.geometry.dispose());
      keycapMaterial.dispose();
      legendQuadGeom.dispose();
      legendAtlas.texture.dispose();
      legendMaterial.dispose();
    };
  }, [buckets, keycapMaterial, legendQuadGeom, legendAtlas, legendMaterial]);

  // Spring states for layer elevation, opacity, and per-key press travel
  const layerLiftSpring = useRef<SpringState>({ value: 0, velocity: 0 });
  const opacitySpring = useRef<SpringState>({ value: 1, velocity: 0 });
  const keySprings = useRef<SpringState[]>(
    KEYBOARD_KEYS.map(() => ({ value: 0, velocity: 0 }))
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Apply theme colors to all keycaps & legends immediately on mount and theme change
  useLayoutEffect(() => {
    buckets.forEach((bucket, bIdx) => {
      const mesh = meshRefs.current[bIdx];
      if (!mesh) return;
      bucket.keys.forEach((k, localIdx) => {
        const hex =
          k.role === 'accent'
            ? theme.accent
            : k.role === 'mod'
              ? theme.mod
              : theme.alpha;
        tempColor.set(hex);
        mesh.setColorAt(localIdx, tempColor);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });

    const legMesh = legendMeshRef.current;
    if (legMesh) {
      KEYBOARD_KEYS.forEach((k) => {
        const hex = k.role === 'accent' ? theme.accentLegend : theme.legend;
        tempColor.set(hex);
        legMesh.setColorAt(k.index, tempColor);
      });
      if (legMesh.instanceColor) legMesh.instanceColor.needsUpdate = true;
    }
  }, [buckets, theme, tempColor]);

  // Initialize legend & keycap matrices before first frame
  useLayoutEffect(() => {
    buckets.forEach((bucket, bIdx) => {
      const mesh = meshRefs.current[bIdx];
      if (!mesh) return;
      bucket.keys.forEach((k, localIdx) => {
        dummy.position.set(k.x, 0, k.z);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(localIdx, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
    });

    const legMesh = legendMeshRef.current;
    if (legMesh) {
      KEYBOARD_KEYS.forEach((k) => {
        dummy.position.set(k.x, LEGEND_SURFACE_Y, k.z);
        const legendScale = k.uWidth >= 6 ? 1.8 : Math.min(1.2, 0.96 + (k.uWidth - 1) * 0.14);
        dummy.scale.set(legendScale, 1, 0.98);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        legMesh.setMatrixAt(k.index, dummy.matrix);
      });
      legMesh.instanceMatrix.needsUpdate = true;
      legMesh.computeBoundingSphere();
    }
  }, [buckets, dummy]);

  useFrame((_, delta) => {
    const state = useKeyboardStore.getState();

    // 1. Layer elevation spring (with subtle floating lift when isolated)
    const targetLift =
      computeLayerExplodeFactor(state.explode, KEYCAP_META.startAt, KEYCAP_META.endAt) *
        KEYCAP_META.maxLift +
      (state.isolatedLayer === 'keycaps' ? 0.32 : 0);
    const currentLift = stepSpring(layerLiftSpring.current, targetLift, delta, 210, 17);

    if (groupRef.current) {
      groupRef.current.position.y = BASE_Y + currentLift;
    }

    // 2. Opacity spring (15% when another layer is isolated)
    const targetOpacity =
      state.isolatedLayer !== null && state.isolatedLayer !== 'keycaps' ? 0.15 : 1.0;
    const currentOpacity = stepSpring(opacitySpring.current, targetOpacity, delta, 240, 24);
    const clampedOpacity = Math.max(0.05, Math.min(1, currentOpacity));
    keycapMaterial.opacity = clampedOpacity;
    keycapMaterial.depthWrite = clampedOpacity > 0.92;
    legendMaterial.opacity = clampedOpacity;

    // 3. Per-key press & hover spring transforms
    const legMesh = legendMeshRef.current;
    let anyLegendDirty = false;

    buckets.forEach((bucket, bIdx) => {
      const mesh = meshRefs.current[bIdx];
      if (!mesh) return;
      let bucketDirty = false;

      bucket.keys.forEach((k, localIdx) => {
        const isPressed = Boolean(state.pressedKeys[k.index]);
        const isHovered =
          state.hoveredKeyIndex === k.index &&
          (state.isolatedLayer === null || state.isolatedLayer === 'keycaps');
        const targetTravel = isPressed ? -0.145 : isHovered ? 0.032 : 0;

        const spring = keySprings.current[k.index];
        const prev = spring.value;
        const next = stepSpring(spring, targetTravel, delta, 380, 19);

        if (Math.abs(next - prev) > 0.0001 || Math.abs(spring.velocity) > 0.001) {
          bucketDirty = true;
          anyLegendDirty = true;
          dummy.position.set(k.x, next, k.z);
          dummy.scale.set(1, 1, 1);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(localIdx, dummy.matrix);

          if (legMesh) {
            dummy.position.set(k.x, LEGEND_SURFACE_Y + next, k.z);
            const legendScale =
              k.uWidth >= 6 ? 1.8 : Math.min(1.2, 0.96 + (k.uWidth - 1) * 0.14);
            dummy.scale.set(legendScale, 1, 0.98);
            dummy.updateMatrix();
            legMesh.setMatrixAt(k.index, dummy.matrix);
          }
        }
      });

      if (bucketDirty) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    });

    if (anyLegendDirty && legMesh) {
      legMesh.instanceMatrix.needsUpdate = true;
    }
  });

  const handleBucketPointerDown = (bucket: WidthBucket, e: ThreeEvent<PointerEvent>) => {
    if (isFaded || e.instanceId === undefined) return;
    e.stopPropagation();
    const key = bucket.keys[e.instanceId];
    if (!key) return;

    const { soundEnabled, soundProfile } = useKeyboardStore.getState();
    soundEngine.unlock();
    pressKey(key.index);
    soundEngine.playKeyDown(soundProfile, key.uWidth, soundEnabled);

    const releaseOnce = () => {
      const curr = useKeyboardStore.getState();
      if (curr.pressedKeys[key.index]) {
        releaseKey(key.index);
        soundEngine.playKeyUp(curr.soundProfile, key.uWidth, curr.soundEnabled);
      }
      window.removeEventListener('pointerup', releaseOnce);
      window.removeEventListener('pointercancel', releaseOnce);
    };
    window.addEventListener('pointerup', releaseOnce);
    window.addEventListener('pointercancel', releaseOnce);
  };

  const handleBucketClick = (e: ThreeEvent<MouseEvent>) => {
    if (isFaded) return;
    e.stopPropagation();
    // When exploded (layers separated), clicking the keycaps layer isolates/un-isolates it
    if (explode > 0.06 || isolatedLayer === 'keycaps') {
      const { soundEnabled } = useKeyboardStore.getState();
      soundEngine.playUiPop(soundEnabled, isolatedLayer !== 'keycaps');
      toggleIsolateLayer('keycaps');
    }
  };

  const handleBucketDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    if (isFaded) return;
    e.stopPropagation();
    const { soundEnabled } = useKeyboardStore.getState();
    soundEngine.playUiPop(soundEnabled, isolatedLayer !== 'keycaps');
    toggleIsolateLayer('keycaps');
  };

  const handleBucketPointerMove = (bucket: WidthBucket, e: ThreeEvent<PointerEvent>) => {
    if (isFaded || e.instanceId === undefined) return;
    e.stopPropagation();
    const key = bucket.keys[e.instanceId];
    if (key) {
      setHoveredKeyIndex(key.index);
      document.body.style.cursor = 'pointer';
    }
  };

  const handleBucketPointerOut = () => {
    setHoveredKeyIndex(null);
    document.body.style.cursor = 'auto';
  };

  return (
    <group ref={groupRef} position={[0, BASE_Y, 0]}>
      {buckets.map((bucket, bIdx) => (
        <instancedMesh
          key={bucket.uWidth}
          ref={(el) => {
            meshRefs.current[bIdx] = el;
          }}
          args={[bucket.geometry, keycapMaterial, bucket.keys.length]}
          frustumCulled={false}
          castShadow={!isFaded}
          receiveShadow
          renderOrder={6}
          raycast={isFaded ? noopRaycast : THREE.InstancedMesh.prototype.raycast}
          onPointerDown={(e) => handleBucketPointerDown(bucket, e)}
          onClick={handleBucketClick}
          onDoubleClick={handleBucketDoubleClick}
          onPointerMove={(e) => handleBucketPointerMove(bucket, e)}
          onPointerOut={handleBucketPointerOut}
        />
      ))}

      {/* Single InstancedMesh draw call for all 67 sculpted top-dish key legends */}
      <instancedMesh
        ref={legendMeshRef}
        args={[legendQuadGeom, legendMaterial, KEYBOARD_KEYS.length]}
        frustumCulled={false}
        renderOrder={7}
        raycast={noopRaycast}
      />
    </group>
  );
};
