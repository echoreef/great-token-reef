// A hunter now and then chases a smaller fish and eats it, or the fish gets
// away. Pure like tankSim.ts; the swim loop removes eaten fish and brings them back.

import type { Bounds, Rng, Swimmer } from './tankMotion';

/** seconds between one hunt and the next: 2 to 5 minutes */
export const HUNT_GAP_MIN = 120;
export const HUNT_GAP_SPAN = 180;
/** prey is at most this share of the hunter's width, which also keeps every legendary safe */
export const PREY_MAX_RATIO = 0.5;
/** a hunter only looks this share of the tank's width away */
export const HUNT_RADIUS_FRAC = 0.6;
/** no hunting in a tank this sparse, so it never looks empty */
export const MIN_TANK = 4;

/** When a hunter next looks for prey. */
export function nextHuntTime(rng: Rng, now: number): number {
  return now + HUNT_GAP_MIN + rng() * HUNT_GAP_SPAN;
}

/** The nearest fish a hunter may chase, or null. */
export function pickPrey(hunter: Swimmer, swimmers: readonly Swimmer[], bounds: Bounds): Swimmer | null {
  if (swimmers.length < MIN_TANK) return null;
  const taken = new Set(swimmers.map((s) => s.quarry));
  let best: Swimmer | null = null;
  let bestD = HUNT_RADIUS_FRAC * bounds.width;
  for (const s of swimmers) {
    if (s === hunter || s.hunter || taken.has(s.id) || s.width > hunter.width * PREY_MAX_RATIO) continue;
    // A hovered or plaqued fish holds an endless mode, as does one swimming out.
    if (s.mode === 'drop' || s.mode === 'leave' || !Number.isFinite(s.modeUntil)) continue;
    const d = Math.hypot(s.x - hunter.x, s.y - hunter.y);
    if (d <= bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}
