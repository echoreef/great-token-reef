// A hunter now and then chases a smaller fish and eats it, or the fish gets
// away. Pure like tankSim.ts; the swim loop removes eaten fish and brings them back.

import { DART_FACTOR, beginTurn, clamp, mouthOf, type Bounds, type Rng, type Swimmer } from './tankMotion';

/** seconds between one hunt and the next: 2 to 5 minutes */
export const HUNT_GAP_MIN = 120;
export const HUNT_GAP_SPAN = 180;
/** prey is at most this share of the hunter's width, which also keeps every legendary safe */
export const PREY_MAX_RATIO = 0.5;
/** a hunter only looks this share of the tank's width away */
export const HUNT_RADIUS_FRAC = 0.6;
/** no hunting in a tank this sparse, so it never looks empty */
export const MIN_TANK = 4;
/** seconds before looking again when nothing was in reach */
export const HUNT_RETRY = 10;
/** seconds a chase lasts before the hunter gives up */
export const HUNT_GIVE_UP = 8;
/** chase burst, × cruise; a shark's cruise is slow next to a small fish's */
export const HUNT_FACTOR = 3;
export const ESCAPE_CHANCE = 0.3;
export const ESCAPE_SECONDS = 1.2;
/** a hunter that has eaten cruises at this share of its speed for FULL_SECONDS */
export const FULL_SECONDS = 10;
export const FULL_FACTOR = 0.6;
/** seconds an eaten fish is away before it drops back in */
export const DIGEST_SECONDS = 30;

export interface Meal {
  id: string;
  /** the hunter's mouth, in tank px */
  x: number;
  y: number;
}

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

/** Once its hunt time has come, a hunter whose mode ran out looks for prey; true = it is hunting now. */
export function startHunt(s: Swimmer, swimmers: readonly Swimmer[], bounds: Bounds, now: number): boolean {
  if (!s.hunter || now < s.nextHuntAt) return false;
  const prey = pickPrey(s, swimmers, bounds);
  if (!prey) {
    s.nextHuntAt = now + HUNT_RETRY;
    return false;
  }
  s.quarry = prey.id;
  s.mode = 'hunt';
  s.modeUntil = now + HUNT_GIVE_UP;
  s.resume = null;
  s.goalY = null;
  return true;
}

/** Steer a hunting fish this frame; returns the prey it is closing on, or null mid-turn or once the hunt is over. */
export function huntTick(s: Swimmer, swimmers: readonly Swimmer[], rng: Rng, now: number): Swimmer | null {
  if (s.quarry === null || s.mode === 'turn') return null;
  // Hovered, open on its plaque or swimming out: the hunter's own mode won.
  if (s.mode !== 'hunt') {
    endHunt(s, rng, now);
    return null;
  }
  // Full screen left or a release began.
  if (!s.hunter) {
    endHunt(s, rng, now);
    cruise(s, rng, now);
    return null;
  }
  const q = swimmers.find((f) => f.id === s.quarry);
  if (!q || q.mode === 'drop' || q.mode === 'leave' || !Number.isFinite(q.modeUntil) || now >= s.modeUntil) {
    endHunt(s, rng, now);
    cruise(s, rng, now);
    return null;
  }
  if ((q.x - s.x) * s.heading < -s.width * 0.15) {
    const until = s.modeUntil;
    beginTurn(s, now);
    s.resume = { mode: 'hunt', until };
    return null;
  }
  // Ease off as the mouth lines up so the hunter does not overshoot.
  const ahead = Math.abs(q.x - mouthOf(s).x);
  s.target = s.cruise * HUNT_FACTOR * clamp(ahead / (s.width * 1.5), 0.35, 1);
  return q;
}

/** A hunter whose mouth reaches its prey eats it, or the prey darts off. Eaten fish leave `swimmers`. */
export function strike(swimmers: Swimmer[], rng: Rng, now: number, meals: Meal[]): void {
  for (const s of [...swimmers]) {
    if (s.mode !== 'hunt' || s.quarry === null) continue;
    const i = swimmers.findIndex((f) => f.id === s.quarry);
    const q = swimmers[i];
    const m = mouthOf(s);
    if (!q || Math.hypot(q.x - m.x, q.y - m.y) > Math.max(12, q.width * 0.35)) continue;
    const escaped = rng() < ESCAPE_CHANCE;
    endHunt(s, rng, now);
    if (escaped) {
      flee(q, s.x, now);
      cruise(s, rng, now);
      continue;
    }
    swimmers.splice(i, 1);
    meals.push({ id: q.id, x: m.x, y: m.y });
    s.mode = 'cruise';
    s.modeUntil = now + FULL_SECONDS;
    s.target = s.cruise * FULL_FACTOR;
    s.fullUntil = now + FULL_SECONDS;
  }
}

function endHunt(s: Swimmer, rng: Rng, now: number): void {
  s.quarry = null;
  s.nextHuntAt = nextHuntTime(rng, now);
}

function cruise(s: Swimmer, rng: Rng, now: number): void {
  s.mode = 'cruise';
  s.modeUntil = now + 2 + rng() * 3;
  s.target = s.cruise;
}

// Dart away from the hunter, turning first if it faces it; a turn takes under half a second.
function flee(q: Swimmer, fromX: number, now: number): void {
  const away: 1 | -1 = q.x >= fromX ? 1 : -1;
  q.goalY = null;
  if (q.heading === away) {
    q.mode = 'dart';
    q.modeUntil = now + ESCAPE_SECONDS;
    q.target = q.cruise * DART_FACTOR;
    q.resume = null;
    return;
  }
  beginTurn(q, now);
  q.resume = { mode: 'dart', until: now + 0.5 + ESCAPE_SECONDS };
}

export type DigestEvent =
  | { kind: 'meal' | 'back'; id: string }
  | { kind: 'roster'; ids: ReadonlySet<string> }
  | { kind: 'clear' };

/** Fish a hunter has eaten and not yet given back; the same set when nothing changes. */
export function digest(eaten: ReadonlySet<string>, e: DigestEvent): ReadonlySet<string> {
  switch (e.kind) {
    case 'meal':
      return eaten.has(e.id) ? eaten : new Set([...eaten, e.id]);
    case 'back':
      return eaten.has(e.id) ? new Set([...eaten].filter((id) => id !== e.id)) : eaten;
    case 'roster':
      return [...eaten].every((id) => e.ids.has(id)) ? eaten : new Set([...eaten].filter((id) => e.ids.has(id)));
    case 'clear':
      return eaten.size ? new Set() : eaten;
  }
}

/** Turn hunting on or off; a fish that becomes a hunter first hunts 2 to 5 minutes later. */
export function setHunter(s: Swimmer, on: boolean | undefined, rng: Rng, now: number): void {
  if (on && !s.hunter) s.nextHuntAt = nextHuntTime(rng, now);
  s.hunter = on;
}
