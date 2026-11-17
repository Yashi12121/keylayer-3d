import * as THREE from 'three';
import { KEYBOARD_KEYS } from '../data/keyboardLayout';

const ATLAS_COLS = 8;
const ATLAS_ROWS = 9;
const CELL_SIZE = 128;

export interface LegendAtlasData {
  texture: THREE.CanvasTexture;
  /** Per-key UV rectangle [uOffset, vOffset, uScale, vScale] indexed by key.index */
  uvRects: Float32Array;
}

/**
 * Draws crisp high-DPI vector typography & symbols for all 67 keys into a single
 * white-on-transparent texture atlas so per-instance color tints every legend live.
 */
export function createLegendAtlas(): LegendAtlasData {
  const width = ATLAS_COLS * CELL_SIZE;
  const height = ATLAS_ROWS * CELL_SIZE;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);

  const uvRects = new Float32Array(KEYBOARD_KEYS.length * 4);

  KEYBOARD_KEYS.forEach((key, idx) => {
    const col = idx % ATLAS_COLS;
    const row = Math.floor(idx / ATLAS_COLS);
    const x0 = col * CELL_SIZE;
    const y0 = row * CELL_SIZE;

    ctx.save();
    ctx.translate(x0, y0);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';

    if (key.id === 'space') {
      // Subtle clean minimalist bar icon on spacebar
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.roundRect(CELL_SIZE * 0.25, CELL_SIZE * 0.47, CELL_SIZE * 0.5, CELL_SIZE * 0.06, 4);
      ctx.fill();
    } else if (key.subLabel) {
      // Dual legend: subLabel top-left, primary bottom-left
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = '700 28px "Nunito", "DM Sans", sans-serif';
      ctx.fillText(key.subLabel, 22, 18);

      ctx.textBaseline = 'bottom';
      ctx.font = '800 34px "Nunito", "DM Sans", sans-serif';
      ctx.fillText(key.label, 22, CELL_SIZE - 18);
    } else if (key.label.length === 1 && ['↑', '↓', '←', '→'].includes(key.label)) {
      // Crisp geometric vector arrow icons
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const cx = CELL_SIZE / 2;
      const cy = CELL_SIZE / 2;
      const arm = 22;
      ctx.beginPath();
      if (key.label === '↑') {
        ctx.moveTo(cx, cy + arm);
        ctx.lineTo(cx, cy - arm);
        ctx.moveTo(cx - 14, cy - arm + 14);
        ctx.lineTo(cx, cy - arm);
        ctx.lineTo(cx + 14, cy - arm + 14);
      } else if (key.label === '↓') {
        ctx.moveTo(cx, cy - arm);
        ctx.lineTo(cx, cy + arm);
        ctx.moveTo(cx - 14, cy + arm - 14);
        ctx.lineTo(cx, cy + arm);
        ctx.lineTo(cx + 14, cy + arm - 14);
      } else if (key.label === '←') {
        ctx.moveTo(cx + arm, cy);
        ctx.lineTo(cx - arm, cy);
        ctx.moveTo(cx - arm + 14, cy - 14);
        ctx.lineTo(cx - arm, cy);
        ctx.lineTo(cx - arm + 14, cy + 14);
      } else {
        ctx.moveTo(cx - arm, cy);
        ctx.lineTo(cx + arm, cy);
        ctx.moveTo(cx + arm - 14, cy - 14);
        ctx.lineTo(cx + arm, cy);
        ctx.lineTo(cx + arm - 14, cy + 14);
      }
      ctx.stroke();
    } else if (key.label.length > 1) {
      // Modifier text centered neatly
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = key.label.length >= 5 ? 25 : key.label.length >= 4 ? 28 : 32;
      ctx.font = `800 ${fontSize}px "Nunito", "DM Sans", sans-serif`;
      ctx.fillText(key.label, CELL_SIZE / 2, CELL_SIZE / 2);
    } else {
      // Single alpha character placed cleanly at upper-left Cherry-style
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = '800 42px "Nunito", "DM Sans", sans-serif';
      ctx.fillText(key.label, 22, 18);
    }

    ctx.restore();

    // Inset UV rectangle slightly by 2px to avoid mipmap bleeding from neighbors
    const padU = 2 / width;
    const padV = 2 / height;
    const uOffset = col / ATLAS_COLS + padU;
    const uScale = 1 / ATLAS_COLS - padU * 2;
    const vOffset = 1 - (row + 1) / ATLAS_ROWS + padV;
    const vScale = 1 / ATLAS_ROWS - padV * 2;

    uvRects[idx * 4] = uOffset;
    uvRects[idx * 4 + 1] = vOffset;
    uvRects[idx * 4 + 2] = uScale;
    uvRects[idx * 4 + 3] = vScale;
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  return { texture, uvRects };
}

/**
 * Patches a Three.js material to sample per-instance `aUvRect` atlas offsets.
 */
export function createInstancedLegendMaterial(texture: THREE.CanvasTexture): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.06,
    depthWrite: false,
    toneMapped: false,
  });

  mat.customProgramCacheKey = () => 'pebble65-instanced-legend-v1';
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nattribute vec4 aUvRect;`
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>\n#ifdef USE_MAP\n\tvMapUv = aUvRect.xy + MAP_UV * aUvRect.zw;\n#endif`
      );
  };

  return mat;
}
