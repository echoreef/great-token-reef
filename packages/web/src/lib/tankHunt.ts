// A hunter now and then chases a smaller fish and eats it, or the fish gets
// away. Pure like tankSim.ts; the swim loop removes eaten fish and brings them back.

import type { Rng } from './tankMotion';

/** seconds between one hunt and the next: 2 to 5 minutes */
export const HUNT_GAP_MIN = 120;
export const HUNT_GAP_SPAN = 180;

/** When a hunter next looks for prey. */
export function nextHuntTime(rng: Rng, now: number): number {
  return now + HUNT_GAP_MIN + rng() * HUNT_GAP_SPAN;
}
