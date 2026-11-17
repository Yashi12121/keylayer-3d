import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { CASE_FINISHES, KEYCAP_THEMES } from '../data/themes';
import { useKeyboardStore } from '../store/useKeyboardStore';

/**
 * Creates a smooth coiled USB-C aviator cable TubeGeometry curving from the
 * keyboard's rear USB-C port onto the pastel desk mat.
 */
function createCoiledCableGeometry(): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  // Exit USB-C port at top-left rear of keyboard (-5.35, 0.48, -2.55)
  pts.push(new THREE.Vector3(-5.35, 0.46, -2.52));
  pts.push(new THREE.Vector3(-5.35, 0.36, -3.15));
  pts.push(new THREE.Vector3(-5.1, 0.16, -3.72));
  pts.push(new THREE.Vector3(-4.2, 0.14, -3.9));

  // Coiled helix section along X from x = -4.0 to x = -1.6
  const coilTurns = 15;
  const coilSteps = 180;
  const coilRadius = 0.14;
  for (let i = 0; i <= coilSteps; i += 1) {
    const t = i / coilSteps;
    const x = -4.0 + t * 2.55;
    const a = t * coilTurns * Math.PI * 2;
    const y = 0.16 + Math.sin(a) * coilRadius;
    const z = -3.92 + Math.cos(a) * coilRadius;
    pts.push(new THREE.Vector3(x, y, z));
  }

  // Tail sweeping gently off the back-right of the desk mat
  pts.push(new THREE.Vector3(-1.2, 0.12, -3.92));
  pts.push(new THREE.Vector3(-0.3, 0.08, -4.35));
  pts.push(new THREE.Vector3(0.4, 0.08, -6.2));
  pts.push(new THREE.Vector3(0.8, 0.08, -9.0));

  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, 240, 0.048, 8, false);
}

export const DeskScene: React.FC = () => {
  const caseFinishId = useKeyboardStore((s) => s.caseFinishId);
  const keycapThemeId = useKeyboardStore((s) => s.keycapThemeId);

  const caseFinish = useMemo(
    () => CASE_FINISHES.find((c) => c.id === caseFinishId) ?? CASE_FINISHES[0],
    [caseFinishId]
  );
  const theme = useMemo(
    () => KEYCAP_THEMES.find((t) => t.id === keycapThemeId) ?? KEYCAP_THEMES[0],
    [keycapThemeId]
  );

  const cableGeom = useMemo(() => createCoiledCableGeometry(), []);
  useEffect(() => {
    return () => {
      cableGeom.dispose();
    };
  }, [cableGeom]);

  return (
    <>
      <color attach="background" args={['#F6EFE6']} />
      <fog attach="fog" args={['#F6EFE6', 58, 120]} />

      {/* Warm studio pastel lighting */}
      <hemisphereLight args={['#FFFDF9', '#E6D6C6', 0.85]} />
      <directionalLight
        position={[9, 15, 10]}
        intensity={1.55}
        color="#FFF7EE"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={2}
        shadow-camera-far={38}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-10, 8, -7]} intensity={0.48} color="#DCE8FA" />

      {/* Soft procedural studio reflections */}
      <Environment resolution={256} frames={1}>
        <group rotation={[-Math.PI / 3, 0, 0]}>
          <Lightformer
            form="rect"
            intensity={1.8}
            color="#FFF8F0"
            position={[0, 8, 4]}
            scale={[16, 8, 1]}
          />
          <Lightformer
            form="circle"
            intensity={1.1}
            color="#E8F1FF"
            position={[-8, 3, -5]}
            scale={6}
          />
          <Lightformer
            form="rect"
            intensity={0.9}
            color="#FFEFE8"
            position={[8, 2, 2]}
            scale={[6, 6, 1]}
          />
        </group>
      </Environment>

      {/* Creamy warm oak-pastel tabletop */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color="#F2E8DC" roughness={0.92} metalness={0.0} />
      </mesh>

      {/* Soft rounded felt desk mat underneath the keyboard */}
      <RoundedBox
        args={[18.8, 0.08, 9.6]}
        radius={0.038}
        smoothness={4}
        position={[0.4, -0.01, -0.3]}
        receiveShadow
      >
        <meshStandardMaterial color={caseFinish.deskMatColor} roughness={0.96} metalness={0.0} />
      </RoundedBox>

      {/* Subtle stitched-edge felt border accent */}
      <RoundedBox
        args={[18.4, 0.012, 9.2]}
        radius={0.005}
        position={[0.4, 0.028, -0.3]}
        receiveShadow
      >
        <meshStandardMaterial
          color={caseFinish.deskMatColor}
          roughness={0.98}
          metalness={0.0}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </RoundedBox>

      {/* Pastel Coiled USB-C Aviator Cable */}
      <group>
        <mesh geometry={cableGeom} castShadow receiveShadow>
          <meshStandardMaterial color={theme.mod} roughness={0.62} metalness={0.05} />
        </mesh>
        {/* USB-C Plug Boot */}
        <RoundedBox
          args={[0.42, 0.18, 0.56]}
          radius={0.055}
          position={[-5.35, 0.45, -2.75]}
          castShadow
        >
          <meshStandardMaterial color={theme.accent} roughness={0.4} metalness={0.1} />
        </RoundedBox>
        {/* Metallic GX16 Aviator Connector */}
        <mesh
          position={[-1.08, 0.14, -3.96]}
          rotation={[0, 0.16, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.135, 0.135, 0.72, 18]} />
          <meshStandardMaterial color="#E5E8EE" roughness={0.22} metalness={0.82} />
        </mesh>
      </group>

      {/* Subtle pastel ceramic coaster & rounded mug on far right of desk mat */}
      <group position={[8.35, 0.03, -2.55]}>
        <mesh position={[0, 0.025, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.92, 0.95, 0.05, 32]} />
          <meshStandardMaterial color="#FBF7F0" roughness={0.75} metalness={0.0} />
        </mesh>
        <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.68, 0.62, 1.15, 32]} />
          <meshStandardMaterial color={theme.accent} roughness={0.38} metalness={0.04} />
        </mesh>
        <mesh position={[0, 1.16, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.06, 28]} />
          <meshStandardMaterial color="#C89E7A" roughness={0.22} metalness={0.05} />
        </mesh>
        <mesh position={[0.72, 0.64, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <torusGeometry args={[0.26, 0.075, 12, 24, Math.PI]} />
          <meshStandardMaterial color={theme.accent} roughness={0.38} metalness={0.04} />
        </mesh>
      </group>

      {/* Grounding soft contact shadows under the keyboard */}
      <ContactShadows
        position={[0, 0.035, 0]}
        opacity={0.34}
        scale={24}
        blur={2.1}
        far={9}
        color="#5C4438"
      />
    </>
  );
};
