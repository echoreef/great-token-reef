import { bigness, tankWidth } from './fishSize';
import { decorAnchor, type DecorPlacement } from './tankDecor';
import { depthFor, habitForSpecies, huntsFor, speedFor, type Anchors } from './tankHabits';
import { RARITY_RANK, type RosterFish } from './tankPicks';
import { fishKey } from './tankRelease';
import type { Bounds, SwimmerSpec } from './tankSim';

// Deterministic tank scenery and swimmer specs: pure, so the same width always draws the same reef.

export const rosterId = (r: RosterFish) => fishKey(r.species, r.shiny);

// Population scales with tank area: ~8 in the strip, 28 in fullscreen.
export function populationFor(b: Bounds): number {
  return Math.max(6, Math.min(28, Math.floor((b.width * b.height) / 30_000)));
}

// Size, depth and speed from real relative size, then the species habit overrides band and speed.
export function specFor(r: RosterFish, fullscreen: boolean, scale: number): SwimmerSpec {
  const width = tankWidth(r.species, r.bestSize, fullscreen);
  const big = Math.min(1, bigness(width, fullscreen));
  const centre = 0.12 + big * 0.55 + (((r.species * 13) % 7) / 7) * 0.2;
  const tier = Math.max(0, RARITY_RANK[r.rarity] ?? 3);
  const habit = habitForSpecies(r.species);
  return {
    id: rosterId(r),
    width,
    cruise: (68 - big * 36 + ((r.species * 5) % 9)) * scale * speedFor(habit),
    depth: depthFor(habit, [Math.max(0.05, centre - 0.14), Math.min(0.88, centre + 0.14)]),
    hoverBias: 1 - tier / 3,
    dartBias: tier / 3,
    habit,
    // The strip is too small for a chase.
    hunter: fullscreen && huntsFor(r.species),
  };
}

// Deterministic decor, scaled by width so a fullscreen tank is not sparse.
const PEBBLE_FILLS = ['#8c7350', '#a08a63', '#6e5a3e', '#b39b70'];
const CORAL_FILLS = ['#d9573c', '#e08a3c', '#c74f7a', '#e0b23c'];
export function decorFor(width: number, fullscreen: boolean) {
  const w = Math.max(width, 600);
  const weedCount = Math.min(24, Math.max(7, Math.round(w / 110)));
  const tall = fullscreen ? 2.2 : 1;
  return {
    floor: fullscreen ? 44 : 24,
    weeds: Array.from({ length: weedCount }, (_, i) => ({
      left: 2 + (i / weedCount) * 96 + ((i * 37) % 5),
      height: (42 + ((i * 53) % 55)) * tall,
      delay: -((i * 1.3) % 4),
    })),
    pebbles: Array.from({ length: 14 }, (_, i) => ({
      x: 30 + ((i * 173) % 940),
      dy: (i * 7) % 6,
      r: 8 + ((i * 11) % 12),
      fill: PEBBLE_FILLS[i % PEBBLE_FILLS.length]!,
    })),
    corals: Array.from({ length: fullscreen ? 4 : 2 }, (_, i) => ({
      x: 120 + ((i * 331) % 800),
      fill: CORAL_FILLS[i % CORAL_FILLS.length]!,
    })),
  };
}
export type Scenery = ReturnType<typeof decorFor>;

// Habit anchors in tank px: rock crevices, weed stems (about half-way up), coral and earned decor.
export function anchorsFor(decor: Scenery, rocks: readonly { crevices: Anchors['rocks'] }[], pieces: DecorPlacement[], b: Bounds): Anchors {
  const weedFoot = b.height - (decor.floor - 6);
  const coralY = b.height - (decor.floor + 30) / 2;
  return {
    rocks: rocks.flatMap((r) => r.crevices),
    // w-5 weeds are 20px wide; the stem is their centre.
    weeds: decor.weeds.map((w) => ({
      x: (w.left / 100) * b.width + 10,
      y: weedFoot - w.height * 0.55,
      sway: { reach: w.height * 0.55, delay: w.delay },
    })),
    decor: [...decor.corals.map((c) => ({ x: (c.x / 1000) * b.width, y: coralY })), ...pieces.map(decorAnchor)],
  };
}

// Bubble rate 1 keeps the original count (bubbleCount); still water thins it, a strong current fills it.
export function bubblesFor(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    left: 6 + ((i * 41) % 88),
    size: 4 + ((i * 29) % 8),
    duration: 5 + ((i * 17) % 6),
    delay: -((i * 2.1) % 9),
  }));
}

// A handful of drifting night plankton specks, deterministic like the decor.
export function planktonFor(width: number, fullscreen: boolean) {
  const n = Math.min(28, Math.max(10, Math.round(Math.max(width, 600) / (fullscreen ? 70 : 90))));
  return Array.from({ length: n }, (_, i) => ({
    left: 3 + ((i * 37) % 94),
    top: 8 + ((i * 31) % 72),
    size: 1.5 + ((i * 7) % 3) * 0.75,
    duration: 9 + ((i * 13) % 9),
    delay: -((i * 3.7) % 12),
  }));
}
