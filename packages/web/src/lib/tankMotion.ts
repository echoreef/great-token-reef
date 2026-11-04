// Swimmer shapes and the motion helpers both the step loop (tankSim.ts) and habit
// steering (tankHabitSteer.ts) use, so neither imports the other.

import type { Habit } from './tankHabits';

export interface Bounds {
  width: number;
  height: number;
  /** px of drawn sand at the bottom; fish bellies stop on it (default 20) */
  floor?: number;
  /** px at the top covered by the fullscreen band; open-ocean fish keep their whole body below it */
  top?: number;
}

export type SwimMode = 'cruise' | 'hover' | 'dart' | 'turn' | 'feed' | 'drop' | 'leave' | 'rest' | 'ambush' | 'hunt';

export interface SwimmerSpec {
  id: string;
  /** rendered width in px; height follows the 320×180 art */
  width: number;
  /** preferred speed, px/s */
  cruise: number;
  /** home depth band as fractions of tank height (0 = surface) */
  depth: [number, number];
  /** 0..1 — how often this fish hovers rather than cruises */
  hoverBias: number;
  /** 0..1 — how often this fish darts */
  dartBias: number;
  /** species habit from the body plan; absent = default swimming */
  habit?: Habit;
  /** chases and eats smaller fish now and then (full tank only) */
  hunter?: boolean;
}

export interface Swimmer extends SwimmerSpec {
  height: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** current speed goal, wanders around cruise */
  target: number;
  heading: 1 | -1;
  /** rendered scaleX; equals -heading except mid-turn */
  flip: number;
  mode: SwimMode;
  modeUntil: number;
  turnStart: number;
  turnFrom: 1 | -1;
  /** per-fish phase for the vertical bob */
  phase: number;
  /** tail beats per second, derived from speed */
  wag: number;
  /** degrees nose-down: dropping in, levelling out, or a bottom feeder nosing the sand */
  pitch: number;
  /** index into this habit's anchor list (rock crevice, weed, decor), -1 = none yet */
  anchor: number;
  /** a turn begun while resting or lying in ambush returns to that mode */
  resume: { mode: SwimMode; until: number } | null;
  /** station a current-holding fish keeps */
  holdX: number;
  /** vertical goal while a habit steers it; null = home band */
  goalY: number | null;
  /** px the home band is raised by (a ray's sweeping pass) */
  liftPx: number;
  /** puffed (scaled up) until this time */
  puffUntil: number;
  /** px the fish may currently sit below the sand line; eases back up so leaving rest never snaps */
  sinkPx: number;
  /** id of the fish a hunter is chasing */
  quarry: string | null;
  /** when a hunter next looks for prey; never for a fish that does not hunt */
  nextHuntAt: number;
  /** a hunter that has eaten cruises slowly until this time */
  fullUntil: number;
}

export const DART_FACTOR = 2.2;
/** px/s of current at which trout and salmon turn into it and hold station */
export const HOLD_CURRENT = 9;
/** share of its height a resting flatfish lies buried in the sand */
export const SAND_SINK = 0.3;

export type Rng = () => number;

export function rollMode(s: Swimmer, rng: Rng, now: number): void {
  const r = rng();
  const hover = 0.15 + s.hoverBias * 0.2;
  const dart = 0.1 + s.dartBias * 0.15;
  if (r < hover) {
    s.mode = 'hover';
    s.modeUntil = now + 2 + rng() * 4;
    s.target = s.cruise * 0.15;
  } else if (r < hover + dart) {
    s.mode = 'dart';
    s.modeUntil = now + 0.6;
    s.target = s.cruise * DART_FACTOR;
  } else if (r < hover + dart + 0.05) {
    beginTurn(s, now);
  } else {
    s.mode = 'cruise';
    s.modeUntil = now + 3 + rng() * 6;
    s.target = s.cruise * (0.8 + rng() * 0.4);
  }
}

export function beginTurn(s: Swimmer, now: number): void {
  s.resume =
    s.mode === 'rest' || s.mode === 'ambush'
      ? { mode: s.mode, until: s.modeUntil }
      : s.habit === 'ambush' && s.mode !== 'turn'
        ? { mode: 'ambush', until: now + 3 } // a hunter that reaches the glass settles, it does not cruise
        : s.habit === 'hoverReef' && s.mode !== 'turn'
          ? { mode: 'hover', until: now + 3 }
          : null;
  s.mode = 'turn';
  s.turnStart = now;
  s.turnFrom = s.heading;
  s.target = s.cruise * 0.2;
}

/** Where bubbles leave the fish: just inside the mouth, in tank px. */
export function mouthOf(s: Swimmer): { x: number; y: number } {
  return { x: s.x + s.heading * (s.width / 2 - s.width * 0.08), y: s.y - s.height * 0.05 };
}

// Resting flatfish lie half-buried; a resting eel's art box may dip into the sand to line up with its crevice.
export function sinkOf(s: Swimmer): number {
  if (s.mode !== 'rest') return 0;
  return s.habit === 'sand' ? s.height * SAND_SINK : s.habit === 'crevice' ? s.height * 0.4 : 0;
}

export function floorOf(b: Bounds): number {
  return b.floor ?? 20;
}

// No fish swims behind the fullscreen band; capped at half the tank so a stale band never pins fish to the sand.
export function ceilingOf(_s: { habit?: Habit }, b: Bounds): number {
  return Math.min(b.height / 2, Math.max(0, b.top ?? 0));
}

/** y for a depth-band fraction, measured in the water below the fish's ceiling (its whole body under it). */
export function depthY(s: { habit?: Habit; height?: number }, b: Bounds, frac: number): number {
  const ceiling = ceilingOf(s, b);
  const top = ceiling ? ceiling + (s.height ?? 0) / 2 : 0;
  return top + (b.height - top) * frac;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
export function clampX(x: number, w: number, b: Bounds): number {
  return clamp(x, w / 2, Math.max(w / 2, b.width - w / 2));
}
export function clampY(y: number, h: number, b: Bounds, sink = 0, top = 0): number {
  return clamp(y, top + h / 2, b.height - h / 2 - floorOf(b) + Math.min(sink, floorOf(b)));
}
