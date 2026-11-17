export interface SpringState {
  value: number;
  velocity: number;
}

/**
 * Steps a scalar damped harmonic spring toward `target`.
 * Uses sub-stepping if frame delta spikes so spring physics stays stable across tab switches.
 */
export function stepSpring(
  state: SpringState,
  target: number,
  delta: number,
  stiffness = 230,
  damping = 17.5
): number {
  const clampedDelta = Math.min(delta, 0.05);
  const subSteps = clampedDelta > 0.018 ? 2 : 1;
  const dt = clampedDelta / subSteps;

  for (let i = 0; i < subSteps; i += 1) {
    const force = (target - state.value) * stiffness;
    const accel = force - state.velocity * damping;
    state.velocity += accel * dt;
    state.value += state.velocity * dt;
  }

  return state.value;
}

export function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/**
 * Computes normalized [0..1] progress for a staggered layer window,
 * producing the sequential peel-off from keycaps down to PCB.
 */
export function computeLayerExplodeFactor(
  explode: number,
  startAt: number,
  endAt: number
): number {
  if (explode <= 0.0001) return 0;
  if (endAt <= startAt) return smoothstep01(explode);
  const local = (explode - startAt) / (endAt - startAt);
  return smoothstep01(local);
}
