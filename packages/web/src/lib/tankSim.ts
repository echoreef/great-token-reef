// Reef tank swim simulation (docs/reef-tank-plan.md §3). Pure: no DOM, no
// React, no timers. The Tank component owns the rAF loop and writes each
// swimmer's `transform` from the state here. Fish art faces LEFT, so the
// rendered scaleX is -heading; `flip` is the tweened value during a turn.

import {
  DART_FACTOR, beginTurn, ceilingOf, clamp, clampX, clampY, depthY, floorOf, mouthOf, rollMode, sinkOf,
  type Bounds, type Rng, type Swimmer, type SwimmerSpec,
} from './tankMotion';
import { habitTick, placeHabit, rollHabit, type Sway } from './tankHabitSteer';
import { FULL_FACTOR, HUNT_FACTOR, huntTick, nextHuntTime, startHunt, strike, type Meal } from './tankHunt';
import type { Anchors, Habit } from './tankHabits';

export type { Bounds, Rng, SwimMode, Swimmer, SwimmerSpec } from './tankMotion';
export type { Sway } from './tankHabitSteer';
export { DART_FACTOR, HOLD_CURRENT, SAND_SINK, ceilingOf, depthY, mouthOf } from './tankMotion';

export const ART_RATIO = 180 / 320;
export const TURN_SECONDS = 0.45;
export const WALL_MARGIN = 60;
export const SPEED_MIN_FACTOR = 0.35;
export const SPEED_MAX_FACTOR = 1.6;
export const SEPARATION_PX = 50;
export const MAX_DT = 0.05;
export const MAX_FLAKES = 15;
export const FEED_RADIUS_FRAC = 0.35;
/** px/s */
export const FLAKE_SINK = 18;
/** seconds a flake rests on the sand before dissolving */
export const FLAKE_TTL_LANDED = 8;
/** px/s a released fish hits the water at */
export const DROP_ENTRY_SPEED = 240;
export const DROP_MAX_SPEED = 360;
export const LEAVE_FACTOR = 1.8;
export const PUFF_SECONDS = 3;
export const PUFF_SCALE = 1.35;
const ANCHORED: ReadonlySet<Habit | undefined> = new Set(['crevice', 'sand', 'weed', 'nibble', 'lurk']);
/** px/s the sink allowance shrinks at once a fish stops resting */
export const SINK_EASE = 30;

/** Slowest tail beat, in beats per second of the 1s CSS wag. */
export const WAG_MIN = 0.3;
const WAG_TAU = 0.5;
const WAG_STEP = 0.05;

/** Ease the applied tail-beat rate toward the swimmer's wag so it never jumps. */
export function easeWag(rate: number, target: number, dt: number): number {
  const goal = Math.max(WAG_MIN, target);
  return Math.max(WAG_MIN, rate + (goal - rate) * (1 - Math.exp(-dt / WAG_TAU)));
}

/** Round to coarse steps so the playback rate is only touched when it visibly changes. */
export function quantizeWag(rate: number): number {
  return Math.max(WAG_MIN, Math.round(rate / WAG_STEP) * WAG_STEP);
}

/** The tail beat among an element's animations; a shiny fish also runs its glow. */
export function wagAnimation(anims: readonly Animation[]): Animation | null {
  return anims.find((a) => (a as CSSAnimation).animationName === 'reef-wag') ?? null;
}

/** Food flake: sinks with a wobble, rests on the sand, then dissolves. */
export interface Flake {
  id: number;
  x: number;
  y: number;
  phase: number;
  bornAt: number;
  landedAt: number | null;
}

/** Shared water state. `current` is px/s added to every fish's x motion (+ = rightward). */
export interface World {
  current: number;
  flakes: Flake[];
  anchors?: Anchors;
  /** weed sway the CSS draws, so a seahorse can ride its weed */
  sway?: Sway;
}

export interface StepEvents {
  eaten: { x: number; y: number }[];
  /** fish a hunter ate this step; already gone from the swimmers */
  meals: Meal[];
}

let nextFlakeId = 1;

/** Drop a pinch of 3–5 flakes around a point, never past MAX_FLAKES. Returns how many were added. */
export function dropFood(world: World, x: number, y: number, rng: Rng, now: number): number {
  const want = 3 + Math.floor(rng() * 3);
  const added = Math.max(0, Math.min(want, MAX_FLAKES - world.flakes.length));
  for (let i = 0; i < added; i++) {
    world.flakes.push({
      id: nextFlakeId++,
      x: x + (rng() * 2 - 1) * 12,
      y: y + (rng() * 2 - 1) * 12,
      phase: rng() * Math.PI * 2,
      bornAt: now,
      landedAt: null,
    });
  }
  return added;
}

/** `anchors` puts habit fish at home straight away, so a paused (reduced-motion) tank still shows the habit. */
export function spawn(specs: SwimmerSpec[], bounds: Bounds, rng: Rng, now: number, anchors?: Anchors): Swimmer[] {
  return specs.map((spec) => {
    const height = spec.width * ART_RATIO;
    const heading: 1 | -1 = rng() < 0.5 ? 1 : -1;
    const [dMin, dMax] = spec.depth;
    const y = depthY({ habit: spec.habit, height }, bounds, dMin + rng() * (dMax - dMin));
    const s: Swimmer = {
      ...spec,
      height,
      x: spec.width / 2 + rng() * Math.max(1, bounds.width - spec.width),
      y: clampY(y, height, bounds, 0, ceilingOf(spec, bounds)),
      vx: spec.cruise * heading,
      vy: 0,
      target: spec.cruise,
      heading,
      flip: -heading,
      mode: 'cruise',
      modeUntil: now + 1 + rng() * 6,
      turnStart: 0,
      turnFrom: heading,
      phase: rng() * Math.PI * 2,
      wag: 0,
      pitch: 0,
      anchor: -1,
      resume: null,
      holdX: 0,
      goalY: null,
      liftPx: 0,
      puffUntil: 0,
      sinkPx: 0,
      quarry: null,
      nextHuntAt: Number.POSITIVE_INFINITY,
      fullUntil: 0,
    };
    placeHabit(s, bounds, rng, now, anchors);
    // Drawn last and only for hunters, so every other fish keeps its random sequence.
    if (spec.hunter) s.nextHuntAt = nextHuntTime(rng, now);
    return s;
  });
}

/** A released fish: enters above the surface at `x`, nose-down, and falls into its depth band. */
export function spawnDropIn(spec: SwimmerSpec, bounds: Bounds, x: number, rng: Rng, now: number): Swimmer {
  const [s] = spawn([spec], bounds, rng, now);
  s!.x = clampX(x, spec.width, bounds);
  s!.y = -s!.height / 2 - 2;
  s!.vx = spec.cruise * 0.3 * s!.heading;
  s!.vy = DROP_ENTRY_SPEED;
  s!.target = spec.cruise * 0.5;
  s!.pitch = 75;
  s!.mode = 'drop';
  // Safety net only: the band is normally reached well before this.
  s!.modeUntil = now + 4;
  return s!;
}

/** Send a fish out through the nearer side wall; it turns round first if it faces the other way. */
export function swimOff(s: Swimmer, bounds: Bounds, now: number): void {
  const out: 1 | -1 = s.x < bounds.width / 2 ? -1 : 1;
  // Pick up the flip tween where the visible flip is, so a fish caught mid-turn always finishes it.
  s.turnFrom = out === 1 ? -1 : 1;
  s.turnStart = now - (Math.acos(clamp(s.flip * out, -1, 1)) / Math.PI) * TURN_SECONDS;
  s.heading = out;
  s.mode = 'leave';
  s.resume = null;
  s.goalY = null;
  s.modeUntil = Number.POSITIVE_INFINITY;
  s.target = s.cruise * LEAVE_FACTOR;
}

/** Resize: positions, stations and goals scale with the tank; landed food stays on the new sand; open-ocean fish drop under a taller band. */
export function rescale(swimmers: Swimmer[], flakes: Flake[], from: Bounds, to: Bounds): void {
  const sx = from.width ? to.width / from.width : 1;
  const sy = from.height ? to.height / from.height : 1;
  if (sx !== 1 || sy !== 1) {
    for (const s of swimmers) {
      s.x *= sx;
      s.y *= sy;
      s.holdX *= sx;
      // A held fish skips habit steering, so nothing else would refresh its goal.
      if (s.goalY !== null) s.goalY *= sy;
      // Anchor lists are rebuilt for the new size; re-pick the nearest one.
      s.anchor = -1;
    }
    const floor = to.height - floorOf(to);
    for (const f of flakes) {
      f.x *= sx;
      f.y = f.landedAt !== null ? floor : Math.min(f.y * sy, floor);
    }
  }
  // After scaling, in new-tank px; a paused (reduced-motion) tank never steps, so the ceiling is applied here too.
  for (const s of swimmers) {
    const top = ceilingOf(s, to);
    if (top && s.mode !== 'drop') s.y = Math.max(s.y, top + s.height / 2);
  }
}

export function isGone(s: Swimmer, bounds: Bounds): boolean {
  return s.x + s.width / 2 < 0 || s.x - s.width / 2 > bounds.width;
}

/** Advance every swimmer by `dt` seconds (capped at MAX_DT). Mutates in place. */
export function step(swimmers: Swimmer[], bounds: Bounds, dtRaw: number, rng: Rng, now: number, world?: World): StepEvents {
  const dt = Math.min(MAX_DT, Math.max(0, dtRaw));
  const drift = world?.current ?? 0;
  const events: StepEvents = { eaten: [], meals: [] };
  if (world) stepFlakes(world.flakes, bounds, dt, now);
  for (const s of swimmers) {
    if (s.mode === 'drop') {
      stepDrop(s, bounds, dt, rng, now);
      continue;
    }
    const quarry = huntTick(s, swimmers, rng, now);
    // A hunt in progress, mid-turn included, ignores food.
    const prey = world && s.quarry === null && s.mode !== 'turn' && s.mode !== 'leave' && Number.isFinite(s.modeUntil) ? preyFor(s, world.flakes, bounds, now) : null;
    if (prey) chase(s, prey, now);
    else if (s.mode === 'feed') {
      s.mode = 'cruise';
      s.modeUntil = now + 2 + rng() * 4;
      s.target = s.cruise;
    }
    // Habits steer only outside the v3 modes; feed, hunt, drop, leave, turn and a held hover win.
    const free = s.mode !== 'turn' && s.mode !== 'feed' && s.mode !== 'leave' && s.mode !== 'hunt';
    if (free && s.habit && Number.isFinite(s.modeUntil)) habitTick(s, bounds, rng, now, drift, world?.anchors, world?.sway);
    // habitTick may have started a turn.
    if (free && s.mode !== 'turn' && now >= s.modeUntil) {
      if (!startHunt(s, swimmers, bounds, now) && !rollHabit(s, bounds, rng, now, drift, world?.anchors)) rollMode(s, rng, now);
    }
    if (s.mode === 'leave') advanceLeave(s, now);
    else if (s.mode === 'turn') advanceTurn(s, rng, now);
    // A feeding or hunting fish may chase to the glass; the clamp holds it in. A resting fish is parked.
    else if (s.mode !== 'feed' && s.mode !== 'hunt' && s.mode !== 'rest' && nearWall(s, bounds, s.habit === 'pelagic' ? WALL_MARGIN * 2 : WALL_MARGIN)) beginTurn(s, now);

    wanderSpeed(s, rng, dt);
    if (now < s.fullUntil) s.target = Math.min(s.target, s.cruise * FULL_FACTOR);
    const accel = s.mode === 'dart' || s.mode === 'feed' || s.mode === 'hunt' ? 6 : s.mode === 'ambush' ? 4 : s.mode === 'rest' ? 3 : 2.2;
    const goalVx = s.target * s.heading;
    s.vx += (goalVx - s.vx) * Math.min(1, accel * dt);

    // Vertical: slow sine bob around the home band, plus a nudge in hover.
    s.phase += dt * (s.mode === 'hover' ? 1.4 : 0.6);
    const [dMin, dMax] = s.depth;
    const home = depthY(s, bounds, (dMin + dMax) / 2 + Math.sin(s.phase) * ((dMax - dMin) / 2)) - s.liftPx;
    const ceiling = ceilingOf(s, bounds);
    const target = quarry ?? (prey && s.mode === 'feed' ? prey : null);
    if (target) {
      const reach = s.cruise * (quarry ? HUNT_FACTOR : DART_FACTOR);
      // Food or prey above the band is chased only to the ceiling (the mouth sits 0.05 of the height above centre).
      const preyY = ceiling ? Math.max(target.y, ceiling + s.height * 0.45) : target.y;
      const goalVy = clamp((preyY - mouthOf(s).y) * 3, -reach, reach);
      s.vy += (goalVy - s.vy) * Math.min(1, 4 * dt);
    } else if (s.goalY !== null && s.mode !== 'feed') {
      if (ceiling) s.goalY = Math.max(s.goalY, ceiling + s.height / 2);
      const goalVy = clamp((s.goalY - s.y) * 1.5, -s.cruise * 0.6, s.cruise * 0.6);
      s.vy += (goalVy - s.vy) * Math.min(1, 2 * dt);
    } else {
      const goalVy = (home - s.y) * 0.6 + (rng() - 0.5) * 8;
      s.vy += (goalVy - s.vy) * Math.min(1, 1.5 * dt);
    }

    // Drift moves the body, not the swim velocity, so steering and tail beat are unchanged.
    s.x += (s.vx + (s.mode === 'rest' && ANCHORED.has(s.habit) ? 0 : drift)) * dt;
    s.y += s.vy * dt;
    if (s.mode !== 'leave') s.x = clampX(s.x, s.width, bounds);
    s.sinkPx = Math.max(sinkOf(s), s.sinkPx - SINK_EASE * dt);
    s.y = clampY(s.y, s.height, bounds, s.sinkPx, ceiling);
    s.wag = (0.6 + (Math.abs(s.vx) / Math.max(1, s.cruise)) * 1.6) * (s.habit === 'glide' ? 0.5 : 1);
    const pitchGoal = s.habit === 'bottom' && s.mode === 'cruise' ? 6 : 0;
    if (pitchGoal === 0 && Math.abs(s.pitch) < 0.5) s.pitch = 0;
    else s.pitch += (pitchGoal - s.pitch) * (1 - Math.exp(-5 * dt));
  }
  separate(swimmers, dt);
  // Separation nudges x after the clamp; a current piles fish on the downstream wall.
  for (const s of swimmers) if (s.mode !== 'leave') s.x = clampX(s.x, s.width, bounds);
  if (world) eat(swimmers, world, events);
  strike(swimmers, rng, now, events.meals);
  return events;
}

// Critically damped fall toward the band centre (ζ = 1), handing over to cruise halfway into the band.
function stepDrop(s: Swimmer, bounds: Bounds, dt: number, rng: Rng, now: number): void {
  const [dMin, dMax] = s.depth;
  const top = ceilingOf(s, bounds);
  const centre = clampY(depthY(s, bounds, (dMin + dMax) / 2), s.height, bounds, 0, top);
  const bandTop = depthY(s, bounds, dMin);
  const k = 1.5;
  const goalVy = clamp((centre - s.y) * k, -DROP_MAX_SPEED, DROP_MAX_SPEED);
  s.vy += (goalVy - s.vy) * Math.min(1, 4 * k * dt);
  s.vx += (s.target * s.heading - s.vx) * Math.min(1, 2 * dt);
  s.x = clampX(s.x + s.vx * dt, s.width, bounds);
  s.y += s.vy * dt;
  // Nose follows the fall, so it levels out as the fish slows.
  s.pitch = clamp((Math.atan2(s.vy, Math.max(Math.abs(s.vx), s.cruise * 0.6)) * 180) / Math.PI, 0, 80);
  s.wag = 0.6 + (Math.abs(s.vy) / Math.max(1, s.cruise)) * 0.8;
  if (s.y >= Math.max(bandTop, (bandTop + centre) / 2) || now >= s.modeUntil) {
    s.y = clampY(s.y, s.height, bounds, 0, top);
    s.mode = 'cruise';
    s.modeUntil = now + 2 + rng() * 4;
    s.target = s.cruise;
  }
}

function stepFlakes(flakes: Flake[], bounds: Bounds, dt: number, now: number): void {
  const floor = bounds.height - floorOf(bounds);
  for (let i = flakes.length - 1; i >= 0; i--) {
    const f = flakes[i]!;
    if (f.landedAt !== null) {
      if (now - f.landedAt >= FLAKE_TTL_LANDED) flakes.splice(i, 1);
      continue;
    }
    f.phase += dt * 1.8;
    f.x = clamp(f.x + Math.sin(f.phase) * 10 * dt, 4, Math.max(4, bounds.width - 4));
    f.y += FLAKE_SINK * dt;
    if (f.y >= floor) {
      f.y = floor;
      f.landedAt = now;
    }
  }
}

// Rarer fish (higher hoverBias) notice food later, so commons usually win.
function preyFor(s: Swimmer, flakes: Flake[], bounds: Bounds, now: number): Flake | null {
  const radius = FEED_RADIUS_FRAC * bounds.width;
  // Food behind the fullscreen band is out of an open-ocean fish's water until it sinks.
  const ceiling = ceilingOf(s, bounds);
  let best: Flake | null = null;
  let bestD = radius;
  for (const f of flakes) {
    if (f.landedAt !== null || now - f.bornAt < s.hoverBias * 0.8 || f.y < ceiling) continue;
    const d = Math.hypot(f.x - s.x, f.y - s.y);
    if (d <= bestD) {
      best = f;
      bestD = d;
    }
  }
  return best;
}

function chase(s: Swimmer, f: Flake, now: number): void {
  if ((f.x - s.x) * s.heading < -s.width * 0.15) {
    beginTurn(s, now);
    return;
  }
  s.mode = 'feed';
  s.modeUntil = now + 1;
  // Ease off as the mouth lines up so the fish does not overshoot and circle.
  const ahead = Math.abs(f.x - mouthOf(s).x);
  s.target = s.cruise * DART_FACTOR * clamp(ahead / (s.width * 1.5), 0.25, 1);
}

function eat(swimmers: Swimmer[], world: World, events: StepEvents): void {
  for (const s of swimmers) {
    if (s.mode !== 'feed') continue;
    const m = mouthOf(s);
    const reach = Math.max(10, s.width * 0.12);
    const i = world.flakes.findIndex((f) => f.landedAt === null && Math.hypot(f.x - m.x, f.y - m.y) <= reach);
    if (i < 0) continue;
    const [f] = world.flakes.splice(i, 1);
    events.eaten.push({ x: f!.x, y: f!.y });
  }
}

/** Pin a fish into hover while the pointer is on it; release re-rolls soon. */
export function hold(s: Swimmer, on: boolean, now: number): void {
  if (s.mode === 'drop' || s.mode === 'leave') return;
  if (on) {
    if (s.mode === 'turn') return;
    s.mode = 'hover';
    s.modeUntil = Number.POSITIVE_INFINITY;
    s.target = s.cruise * 0.1;
  } else if (s.modeUntil === Number.POSITIVE_INFINITY) {
    s.modeUntil = now + 0.5;
  }
}

/** Transform string for a swimmer whose element is positioned at 0,0; `now` drives the puff. */
export function transformOf(s: Swimmer, now?: number): string {
  const x = s.x - s.width / 2;
  const y = s.y - s.height / 2;
  // Art faces left, so nose-down is clockwise for a right-heading fish.
  const tilt = s.pitch ? ` rotate(${(s.pitch * s.heading).toFixed(1)}deg)` : '';
  const k = now === undefined ? 1 : puffScale(s, now);
  const puffed = k !== 1 ? ` scale(${k.toFixed(3)})` : '';
  return `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)${tilt}${puffed} scaleX(${s.flip.toFixed(3)})`;
}

/** Puff up spiky for PUFF_SECONDS; the fish slows to a float while puffed. */
export function puff(s: Swimmer, now: number): void {
  s.puffUntil = now + PUFF_SECONDS;
  if (s.mode === 'drop' || s.mode === 'leave' || s.mode === 'turn' || s.mode === 'feed') return;
  if (Number.isFinite(s.modeUntil)) {
    s.mode = 'hover';
    s.modeUntil = s.puffUntil;
  }
  s.target = s.cruise * 0.1;
}

// Quick inflate, slower deflate at the end.
function puffScale(s: Swimmer, now: number): number {
  if (now >= s.puffUntil) return 1;
  const up = clamp((now - (s.puffUntil - PUFF_SECONDS)) / 0.25, 0, 1);
  const down = clamp((s.puffUntil - now) / 0.4, 0, 1);
  return 1 + (PUFF_SCALE - 1) * Math.min(up, down);
}

function wanderSpeed(s: Swimmer, rng: Rng, dt: number): void {
  if (s.mode !== 'cruise') return;
  // Ornstein–Uhlenbeck: pull toward cruise, kick with noise, clamp.
  const pull = (s.cruise - s.target) * 0.4 * dt;
  const kick = (rng() - 0.5) * s.cruise * 0.9 * Math.sqrt(dt);
  s.target = clamp(s.target + pull + kick, s.cruise * SPEED_MIN_FACTOR, s.cruise * SPEED_MAX_FACTOR);
}

function advanceTurn(s: Swimmer, rng: Rng, now: number): void {
  const t = Math.min(1, (now - s.turnStart) / TURN_SECONDS);
  // Flip passes through 0 at the midpoint, where the heading swaps.
  s.flip = -s.turnFrom * Math.cos(t * Math.PI);
  if (t >= 0.5 && s.heading === s.turnFrom) s.heading = s.turnFrom === 1 ? -1 : 1;
  if (t >= 1) {
    s.flip = -s.heading;
    if (s.resume) {
      s.mode = s.resume.mode;
      s.modeUntil = s.resume.until;
      s.target = s.mode === 'ambush' ? s.cruise * 0.03 : s.mode === 'dart' ? s.cruise * DART_FACTOR : 0;
      s.resume = null;
      return;
    }
    s.mode = 'cruise';
    s.modeUntil = now + 2 + rng() * 4;
    s.target = s.cruise;
  }
}

function advanceLeave(s: Swimmer, now: number): void {
  if (s.turnFrom === s.heading) return;
  const t = Math.min(1, (now - s.turnStart) / TURN_SECONDS);
  s.flip = -s.turnFrom * Math.cos(t * Math.PI);
  if (t >= 1) s.turnFrom = s.heading;
}

function nearWall(s: Swimmer, b: Bounds, margin: number): boolean {
  const edge = s.width / 2 + margin;
  return (s.heading === 1 && s.x > b.width - edge) || (s.heading === -1 && s.x < edge);
}

function separate(swimmers: Swimmer[], dt: number): void {
  for (let i = 0; i < swimmers.length; i++) {
    for (let j = i + 1; j < swimmers.length; j++) {
      const a = swimmers[i]!;
      const b = swimmers[j]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      // A hunter has to reach its prey.
      if (d === 0 || d > SEPARATION_PX || a.quarry === b.id || b.quarry === a.id) continue;
      const push = ((SEPARATION_PX - d) / SEPARATION_PX) * 40 * dt;
      const ux = dx / d;
      const uy = dy / d;
      a.vy -= uy * push;
      b.vy += uy * push;
      a.x -= ux * push * 0.3;
      b.x += ux * push * 0.3;
    }
  }
}
