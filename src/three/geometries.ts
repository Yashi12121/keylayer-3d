import * as THREE from 'three';
import { KEYBOARD_KEYS, KEY_UNIT, MATRIX_ROWS, MATRIX_WIDTH_U } from '../data/keyboardLayout';

/**
 * Helper to create a 2D rounded rectangle THREE.Shape centered at (cx, cy).
 */
export function createRoundedRectShape(
  width: number,
  height: number,
  radius: number,
  cx = 0,
  cy = 0
): THREE.Shape {
  const shape = new THREE.Shape();
  const x = cx - width / 2;
  const y = cy - height / 2;
  const r = Math.min(radius, width / 2, height / 2);

  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  return shape;
}

/**
 * Helper to create a rounded rectangle THREE.Path (for holes inside Shapes).
 * Note: Three.js ShapeUtils expects holes to wind opposite to outer shapes;
 * ExtrudeGeometry automatically handles winding, and CCW/CW works cleanly.
 */
function createRoundedRectPath(
  width: number,
  height: number,
  radius: number,
  cx = 0,
  cy = 0
): THREE.Path {
  const path = new THREE.Path();
  const x = cx - width / 2;
  const y = cy - height / 2;
  const r = Math.min(radius, width / 2, height / 2);

  path.moveTo(x + r, y);
  path.lineTo(x, y + r);
  path.lineTo(x, y + height - r);
  path.quadraticCurveTo(x, y + height, x + r, y + height);
  path.lineTo(x + width - r, y + height);
  path.quadraticCurveTo(x + width, y + height, x + width, y + height - r);
  path.lineTo(x + width, y + r);
  path.quadraticCurveTo(x + width, y, x + width - r, y);
  path.lineTo(x + r, y);

  return path;
}

function sampleRoundedRectPerimeter(
  halfW: number,
  halfD: number,
  radius: number,
  cornerSegments = 4
): Array<[number, number]> {
  const r = Math.min(radius, halfW * 0.9, halfD * 0.9);
  const pts: Array<[number, number]> = [];
  const corners: Array<{ cx: number; cz: number; startAngle: number }> = [
    { cx: halfW - r, cz: halfD - r, startAngle: 0 },
    { cx: -(halfW - r), cz: halfD - r, startAngle: Math.PI / 2 },
    { cx: -(halfW - r), cz: -(halfD - r), startAngle: Math.PI },
    { cx: halfW - r, cz: -(halfD - r), startAngle: (Math.PI * 3) / 2 },
  ];

  for (const c of corners) {
    for (let s = 0; s <= cornerSegments; s += 1) {
      const a = c.startAngle + (s / cornerSegments) * (Math.PI / 2);
      pts.push([c.cx + Math.cos(a) * r, c.cz + Math.sin(a) * r]);
    }
  }
  return pts;
}

/**
 * Generates a sculpted rounded PBT-style keycap BufferGeometry for a given uWidth.
 * Includes tapered skirt, beveled shoulders, and a concave top finger dish.
 */
export function createKeycapGeometry(uWidth: number): THREE.BufferGeometry {
  const baseW = uWidth * KEY_UNIT - 0.065;
  const baseD = KEY_UNIT - 0.065;
  const topW = baseW - 0.165;
  const topD = baseD - 0.175;
  const height = 0.35;

  const isSpace = uWidth >= 6;

  // Profile rings from bottom skirt (y=0) to inner top dish edge
  const rings = [
    { hw: baseW / 2, hd: baseD / 2, r: 0.088, y: 0.0 },
    { hw: baseW / 2 - 0.015, hd: baseD / 2 - 0.015, r: 0.085, y: 0.12 },
    { hw: baseW / 2 - 0.055, hd: baseD / 2 - 0.058, r: 0.082, y: 0.25 },
    { hw: topW / 2 + 0.022, hd: topD / 2 + 0.024, r: 0.078, y: 0.328 },
    { hw: topW / 2, hd: topD / 2, r: 0.072, y: height },
    { hw: topW / 2 - 0.032, hd: topD / 2 - 0.032, r: 0.058, y: height - 0.012 },
  ];

  const cornerSegments = 4;
  const ringPts = rings.map((ring) =>
    sampleRoundedRectPerimeter(ring.hw, ring.hd, ring.r, cornerSegments)
  );
  const perimCount = ringPts[0].length;

  const positions: number[] = [];
  const indices: number[] = [];

  // Helper for top concave dish height offset
  const dishYOffset = (x: number, z: number): number => {
    const nx = x / Math.max(0.1, topW / 2);
    const nz = z / Math.max(0.1, topD / 2);
    if (isSpace) {
      // Gentle convex ergonomic pillow on spacebar
      return 0.012 * (1 - nz * nz);
    }
    const radial = Math.min(1, nx * nx * 0.65 + nz * nz * 0.35);
    return -0.022 * (1 - radial);
  };

  // Push outer skirt + shoulder rings
  for (let r = 0; r < rings.length; r += 1) {
    const baseY = rings[r].y;
    for (let i = 0; i < perimCount; i += 1) {
      const [px, pz] = ringPts[r][i];
      const y = r >= rings.length - 1 ? baseY + dishYOffset(px, pz) * 0.45 : baseY;
      positions.push(px, y, pz);
    }
  }

  // Side quads between rings
  for (let r = 0; r < rings.length - 1; r += 1) {
    const rowA = r * perimCount;
    const rowB = (r + 1) * perimCount;
    for (let i = 0; i < perimCount; i += 1) {
      const next = (i + 1) % perimCount;
      const a = rowA + i;
      const b = rowA + next;
      const c = rowB + next;
      const d = rowB + i;
      indices.push(a, c, b);
      indices.push(a, d, c);
    }
  }

  // Sculpted top dish center + mid-ring for smooth curved shading
  const innerRingIdx = positions.length / 3;
  const innerScale = 0.55;
  const lastRing = ringPts[rings.length - 1];
  for (let i = 0; i < perimCount; i += 1) {
    const px = lastRing[i][0] * innerScale;
    const pz = lastRing[i][1] * innerScale;
    const y = height - 0.01 + dishYOffset(px, pz);
    positions.push(px, y, pz);
  }

  const lastOuterRow = (rings.length - 1) * perimCount;
  for (let i = 0; i < perimCount; i += 1) {
    const next = (i + 1) % perimCount;
    const a = lastOuterRow + i;
    const b = lastOuterRow + next;
    const c = innerRingIdx + next;
    const d = innerRingIdx + i;
    indices.push(a, c, b);
    indices.push(a, d, c);
  }

  const centerIdx = positions.length / 3;
  positions.push(0, height - 0.01 + dishYOffset(0, 0), 0);
  for (let i = 0; i < perimCount; i += 1) {
    const next = (i + 1) % perimCount;
    indices.push(innerRingIdx + i, centerIdx, innerRingIdx + next);
  }

  // Bottom skirt cap (slightly recessed so bottom underside reads cleanly when exploded)
  const bottomCenterIdx = positions.length / 3;
  positions.push(0, 0.045, 0);
  for (let i = 0; i < perimCount; i += 1) {
    const next = (i + 1) % perimCount;
    indices.push(i, next, bottomCenterIdx);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Generates a subtly curved quad matching the top finger dish of a keycap
 * so instanced legends sit flush without clipping.
 */
export function createLegendQuadGeometry(): THREE.BufferGeometry {
  const geom = new THREE.PlaneGeometry(0.45, 0.45, 4, 4);
  geom.rotateX(-Math.PI / 2);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const nx = x / 0.24;
    const nz = z / 0.24;
    const radial = Math.min(1, nx * nx * 0.65 + nz * nz * 0.35);
    pos.setY(i, -0.022 * (1 - radial));
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

/**
 * Switch Part 1: MX Bottom Housing (flange + tapered base + center PCB pin).
 */
export function createSwitchBottomGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Main upper collar that sits on plate
  const collarShape = createRoundedRectShape(0.55, 0.55, 0.05);
  const collar = new THREE.ExtrudeGeometry(collarShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  collar.rotateX(-Math.PI / 2);
  collar.translate(0, 0.0, 0);
  parts.push(collar);

  // Lower housing cavity block extending below plate
  const bodyShape = createRoundedRectShape(0.49, 0.49, 0.045);
  const body = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 0.13,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 1,
  });
  body.rotateX(-Math.PI / 2);
  body.translate(0, -0.13, 0);
  parts.push(body);

  // Central PCB alignment post
  const peg = new THREE.CylinderGeometry(0.062, 0.054, 0.095, 12);
  peg.translate(0, -0.175, 0);
  parts.push(peg);

  return mergeGeometriesSimple(parts);
}

/**
 * Switch Part 1b: Dual gold PCB contact pins per switch.
 */
export function createSwitchPinsGeometry(): THREE.BufferGeometry {
  const pinA = new THREE.BoxGeometry(0.022, 0.11, 0.028);
  pinA.translate(-0.1, -0.185, -0.11);
  const pinB = new THREE.BoxGeometry(0.022, 0.11, 0.028);
  pinB.translate(0.08, -0.185, -0.15);
  return mergeGeometriesSimple([pinA, pinB]);
}

/**
 * Switch Part 2: 3D Helical Coil Spring.
 */
export function createSwitchSpringGeometry(): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const turns = 7.5;
  const totalSteps = 68;
  const radius = 0.078;
  const height = 0.24;

  for (let i = 0; i <= totalSteps; i += 1) {
    const t = i / totalSteps;
    const angle = t * turns * Math.PI * 2;
    const y = t * height;
    pts.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
  }

  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, 64, 0.011, 6, false);
}

/**
 * Switch Part 3: Cherry MX Cruciform (+) Stem + slider block.
 */
export function createSwitchStemGeometry(): THREE.BufferGeometry {
  // Lower slider box
  const slider = new THREE.BoxGeometry(0.24, 0.13, 0.24);
  slider.translate(0, 0.065, 0);

  // Side rails
  const railL = new THREE.BoxGeometry(0.04, 0.15, 0.14);
  railL.translate(-0.13, 0.075, 0);
  const railR = new THREE.BoxGeometry(0.04, 0.15, 0.14);
  railR.translate(0.13, 0.075, 0);

  // Center guide pole descending inside spring
  const pole = new THREE.CylinderGeometry(0.032, 0.028, 0.15, 10);
  pole.translate(0, -0.055, 0);

  // Classic MX + stem post
  const crossH = new THREE.BoxGeometry(0.155, 0.115, 0.042);
  crossH.translate(0, 0.185, 0);
  const crossV = new THREE.BoxGeometry(0.042, 0.115, 0.155);
  crossV.translate(0, 0.185, 0);

  return mergeGeometriesSimple([slider, railL, railR, pole, crossH, crossV]);
}

/**
 * Switch Part 4: Tapered Frosted Top Housing with top chimney rim.
 */
export function createSwitchTopHousingGeometry(): THREE.BufferGeometry {
  // Lower stepped base collar
  const lower = new THREE.BoxGeometry(0.52, 0.075, 0.52);
  lower.translate(0, 0.038, 0);

  // Tapered frustum top shell (4-sided pyramid frustum rotated 45 deg)
  const frustum = new THREE.CylinderGeometry(0.275, 0.355, 0.125, 4, 1);
  frustum.rotateY(Math.PI / 4);
  frustum.translate(0, 0.135, 0);

  // Top chimney rim where stem emerges
  const chimney = new THREE.BoxGeometry(0.29, 0.035, 0.29);
  chimney.translate(0, 0.205, 0);

  return mergeGeometriesSimple([lower, frustum, chimney]);
}

/**
 * CNC Switch Plate with 67 real extruded square cutouts & gasket mounting tabs.
 */
export function createPlateGeometry(): THREE.BufferGeometry {
  const width = MATRIX_WIDTH_U * KEY_UNIT + 0.22;
  const depth = MATRIX_ROWS * KEY_UNIT + 0.2;

  const shape = createRoundedRectShape(width, depth, 0.2);

  // Add 6 gasket mounting tabs protruding along top & bottom edges
  // (drawn via overlapping small shapes or simply built cleanly as separate tabs in component;
  // keeping the plate contour crisp ensures clean cutout holes!)
  for (const key of KEYBOARD_KEYS) {
    // Note: Shape coordinates map X -> X, Y -> -Z after rotateX(-PI/2)
    shape.holes.push(createRoundedRectPath(0.54, 0.54, 0.04, key.x, -key.z));
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.072,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geom.rotateX(-Math.PI / 2);
  return geom;
}

/**
 * Poron Acoustic Foam Dampener with 67 rounded switch pin cutouts.
 */
export function createFoamGeometry(): THREE.BufferGeometry {
  const width = MATRIX_WIDTH_U * KEY_UNIT + 0.16;
  const depth = MATRIX_ROWS * KEY_UNIT + 0.16;

  const shape = createRoundedRectShape(width, depth, 0.16);
  for (const key of KEYBOARD_KEYS) {
    shape.holes.push(createRoundedRectPath(0.42, 0.42, 0.08, key.x, -key.z));
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.095,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 1,
    curveSegments: 5,
  });
  geom.rotateX(-Math.PI / 2);
  return geom;
}

/**
 * Hot-Swap PCB Slab with rounded corners & UV normalization for detailed silkscreen texture.
 */
export function createPcbGeometry(): THREE.BufferGeometry {
  const width = MATRIX_WIDTH_U * KEY_UNIT + 0.16;
  const depth = MATRIX_ROWS * KEY_UNIT + 0.16;

  const shape = createRoundedRectShape(width, depth, 0.16);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.082,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geom.rotateX(-Math.PI / 2);

  // Normalize UVs onto [0..1] across X and Z so our high-res PCB texture aligns 1:1 with every key!
  const pos = geom.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    uvs[i * 2] = (x + width / 2) / width;
    uvs[i * 2 + 1] = 1 - (z + depth / 2) / depth;
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geom;
}

/**
 * Bottom Case Floor + Raised Perimeter Frame with machined inner cavity.
 */
export function createBottomCaseGeometries(): {
  floor: THREE.BufferGeometry;
  walls: THREE.BufferGeometry;
} {
  const outerW = MATRIX_WIDTH_U * KEY_UNIT + 0.88;
  const outerD = MATRIX_ROWS * KEY_UNIT + 0.84;
  const innerW = MATRIX_WIDTH_U * KEY_UNIT + 0.28;
  const innerD = MATRIX_ROWS * KEY_UNIT + 0.26;

  // Solid base floor with soft chamfer
  const floorShape = createRoundedRectShape(outerW, outerD, 0.34);
  const floor = new THREE.ExtrudeGeometry(floorShape, {
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 10,
  });
  floor.rotateX(-Math.PI / 2);
  floor.translate(0, 0.08, 0);

  // Raised bezel wall ring surrounding the internal cavity
  const wallShape = createRoundedRectShape(outerW, outerD, 0.34);
  wallShape.holes.push(createRoundedRectPath(innerW, innerD, 0.2));
  const walls = new THREE.ExtrudeGeometry(wallShape, {
    depth: 0.39,
    bevelEnabled: true,
    bevelThickness: 0.028,
    bevelSize: 0.024,
    bevelSegments: 3,
    curveSegments: 10,
  });
  walls.rotateX(-Math.PI / 2);
  walls.translate(0, 0.27, 0);

  return { floor, walls };
}

/**
 * Generates a high-resolution procedural PCB silkscreen, ENIG gold pads,
 * diode footprints, and copper traces texture aligned 1:1 with the 67 keys.
 */
export function createPcbTexture(pcbBaseColor: string): THREE.CanvasTexture {
  const w = 2048;
  const h = 768;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const pcbWorldW = MATRIX_WIDTH_U * KEY_UNIT + 0.16;
  const pcbWorldD = MATRIX_ROWS * KEY_UNIT + 0.16;

  const toPx = (wx: number, wz: number): [number, number] => [
    ((wx + pcbWorldW / 2) / pcbWorldW) * w,
    ((wz + pcbWorldD / 2) / pcbWorldD) * h,
  ];

  // Matte solder mask background
  ctx.fillStyle = pcbBaseColor;
  ctx.fillRect(0, 0, w, h);

  // Subtle fiberglass weave grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x < w; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Gold edge border trace
  ctx.strokeStyle = 'rgba(232, 200, 126, 0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  // Draw row traces connecting keys horizontally
  ctx.strokeStyle = 'rgba(235, 207, 140, 0.36)';
  ctx.lineWidth = 3.5;
  for (let r = 0; r < 5; r += 1) {
    const rowKeys = KEYBOARD_KEYS.filter((k) => k.row === r);
    ctx.beginPath();
    rowKeys.forEach((k, idx) => {
      const [px, py] = toPx(k.x, k.z);
      if (idx === 0) ctx.moveTo(px - 15, py + 24);
      else ctx.lineTo(px - 15, py + 24);
    });
    ctx.stroke();
  }

  // Draw switch footprints (gold ENIG pads + silkscreen square + diode)
  KEYBOARD_KEYS.forEach((k) => {
    const [px, py] = toPx(k.x, k.z);

    // Subtle silkscreen box
    ctx.strokeStyle = 'rgba(255, 252, 245, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 36, py - 36, 72, 72);

    // Center mounting hole (dark brown/gold ring)
    ctx.fillStyle = '#1D2220';
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E6C27A';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Two hot-swap gold pads
    const pads: Array<[number, number]> = [
      [px - 18, py - 20],
      [px + 14, py - 26],
    ];
    pads.forEach(([gx, gy]) => {
      ctx.fillStyle = '#E8C57B';
      ctx.beginPath();
      ctx.arc(gx, gy, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1D2220';
      ctx.beginPath();
      ctx.arc(gx, gy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // SMD LED pad below center
    ctx.fillStyle = '#E8C57B';
    ctx.fillRect(px - 11, py + 15, 22, 10);

    // Tiny key designator silkscreen
    ctx.fillStyle = 'rgba(255, 250, 240, 0.55)';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`SW${k.index + 1}`, px, py - 42);
  });

  // Silkscreen branding badge in empty bottom-right / blocker zone
  const [bx, by] = toPx(3.6, 1.62);
  ctx.fillStyle = 'rgba(246, 228, 178, 0.8)';
  ctx.font = '700 18px "Nunito", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PEBBLE-65 HS · REV 2.4', bx - 70, by + 40);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a fine micro-cell Poron bump texture for the acoustic foam dampener.
 */
export function createFoamBumpTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 75);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 3);
  return tex;
}

/**
 * Simple non-indexed/indexed geometry merger that converts inputs to non-indexed
 * so any combination of primitive + extruded geometries merges cleanly.
 */
function mergeGeometriesSimple(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = geometries.map((g) => (g.index ? g.toNonIndexed() : g));

  let totalVerts = 0;
  for (const g of nonIndexed) {
    totalVerts += g.attributes.position.count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);

  let offset = 0;
  for (const g of nonIndexed) {
    if (!g.attributes.normal) {
      g.computeVertexNormals();
    }
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    positions.set(pos.array as Float32Array, offset * 3);
    normals.set(norm.array as Float32Array, offset * 3);
    offset += pos.count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return merged;
}
