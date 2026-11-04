import { describe, expect, it } from 'vitest';
import { ENTRIES, LEGENDARY_DEFS, LEGENDARY_ID_BASE, SPECIES_DEFS } from '@gtr/shared';
import { depthFor, habitFor, habitForSpecies, huntsFor, type Anchors, type Habit } from './tankHabits';
import { rocksFor } from '../components/TankRocks';
import { weedSway } from './tankHabitSteer';
import { hold, mouthOf, spawn, step, type Bounds, type Swimmer, type SwimmerSpec, type World } from './tankSim';

// Deterministic rng (mulberry32) so failures reproduce.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EXPECTED: Record<string, Habit> = {
  eel: 'crevice',
  flatfish: 'sand',
  seahorse: 'weed',
  puffer: 'puffer',
  catfish: 'bottom',
  sturgeon: 'bottom',
  carp: 'bottom',
  pike: 'ambush',
  gar: 'ambush',
  shark: 'pelagic',
  billfish: 'pelagic',
  pelagic: 'pelagic',
  mahi: 'pelagic',
  reef: 'reef',
  wrasse: 'reef',
  lionfish: 'hoverReef',
  ray: 'glide',
  salmonid: 'holdCurrent',
  bass: 'default',
  panfish: 'nibble',
  heavy: 'default',
};
const def = (name: string) => SPECIES_DEFS.find((d) => d.name === name)!;

const bounds: Bounds = { width: 1200, height: 224 };
// Weeds about 110px apart, like decorFor at this width.
const anchors: Anchors = {
  rocks: [{ x: 230, y: 170 }, { x: 290, y: 160 }, { x: 870, y: 170 }, { x: 930, y: 160 }],
  weeds: Array.from({ length: 11 }, (_, i) => ({ x: 40 + i * 110, y: 150 })),
  decor: [{ x: 400, y: 190 }, { x: 760, y: 190 }],
};

function fishOf(habit: Habit, seed: number, depth: [number, number] = [0.3, 0.6]): { s: Swimmer; r: () => number } {
  const spec: SwimmerSpec = { id: habit, width: 110, cruise: 55, depth: depthFor(habit, depth), hoverBias: 0.3, dartBias: 0.5, habit };
  const r = rng(seed);
  const [s] = spawn([spec], bounds, r, 0, anchors);
  return { s: s!, r };
}

function simulate(s: Swimmer, r: () => number, seconds: number, world: World, onStep: (now: number) => void) {
  let now = 0;
  for (let i = 0; i < seconds * 60; i++) {
    now += 1 / 60;
    step([s], bounds, 1 / 60, r, now, world);
    onStep(now);
  }
}

describe('habitFor', () => {
  it('maps every body plan in the catalog; groupers lurk', () => {
    const plans = new Set(SPECIES_DEFS.map((d) => d.plan));
    expect(plans.size).toBe(21);
    for (const d of SPECIES_DEFS) expect(habitFor(d), d.name).toBe(d.planOpts?.grouper ? 'lurk' : EXPECTED[d.plan]);
  });

  it('maps the named species from the spec table', () => {
    expect(habitFor(def('Red Lionfish'))).toBe('hoverReef');
    expect(habitFor(def('Bluegill'))).toBe('nibble');
    expect(habitFor(def('Goliath Grouper'))).toBe('lurk');
    expect(habitFor(def('Red Drum'))).toBe('default');
  });

  it('falls back to default for an unknown plan', () => {
    expect(habitFor({ plan: 'narwhal' })).toBe('default');
  });
});

describe('habitForSpecies', () => {
  it('gives every legendary a defined habit: turtle and sunfish glide, octopus crawls, the rest swim like sharks', () => {
    LEGENDARY_DEFS.forEach((d, i) => {
      const expected = d.plan === 'turtle' || d.plan === 'sunfish' ? 'glide' : d.plan === 'octopus' ? 'bottom' : 'pelagic';
      expect(habitForSpecies(LEGENDARY_ID_BASE + i), d.name).toBe(expected);
    });
  });

  it('matches habitFor for a catalog entry and defaults for an unknown id', () => {
    expect(habitForSpecies(0)).toBe(habitFor(SPECIES_DEFS[ENTRIES[0]!.s]!));
    expect(habitForSpecies(999)).toBe('default');
  });
});

describe('huntsFor', () => {
  it('lets the hunting legendaries hunt and spares the filter feeders', () => {
    const hunters = LEGENDARY_DEFS.filter((_, i) => huntsFor(LEGENDARY_ID_BASE + i)).map((d) => d.name);
    expect(hunters).toEqual(['Tiger Shark', 'Great White Shark', 'Killer Whale', 'Greenland Shark']);
  });

  it('lets every catalog shark hunt and nothing else in the catalog', () => {
    ENTRIES.forEach((e, i) => {
      const def = SPECIES_DEFS[e.s]!;
      expect(huntsFor(i), def.name).toBe(def.plan === 'shark');
    });
    expect(ENTRIES.some((e) => SPECIES_DEFS[e.s]!.plan === 'shark')).toBe(true);
  });

  it('is false for an unknown id', () => {
    expect(huntsFor(999)).toBe(false);
  });
});

describe('depthFor', () => {
  it('puts pelagic fish in the upper water and floor fish near the sand', () => {
    expect(depthFor('pelagic', [0.5, 0.7])).toEqual([0.08, 0.35]);
    for (const h of ['bottom', 'sand', 'glide'] as const) expect(depthFor(h, [0.1, 0.3])[0]).toBeGreaterThanOrEqual(0.6);
    expect(depthFor('default', [0.2, 0.4])).toEqual([0.2, 0.4]);
    expect(depthFor('ambush', [0.2, 0.4])).toEqual([0.2, 0.4]);
  });
});

describe('habits in the sim', () => {
  const still = (): World => ({ current: 0, flakes: [], anchors });

  // At a crevice = the crevice mouth lies within the eel's body length and close to its body line.
  const atCrevice = (s: Swimmer, rocks: { x: number; y: number }[]) =>
    rocks.some((a) => Math.abs(a.x - s.x) <= s.width / 2 && Math.abs(a.y - s.y) <= 30);

  it('a crevice fish spends most of a minute at a rock crevice', () => {
    const { s, r } = fishOf('crevice', 3);
    let near = 0;
    let away = 0;
    simulate(s, r, 60, still(), () => {
      if (atCrevice(s, anchors.rocks)) near++;
      else away++;
    });
    expect(near / (near + away)).toBeGreaterThan(0.6);
    // It does leave now and then for a loop.
    expect(away).toBeGreaterThan(0);
  });

  it('a sand fish keeps its belly in the bottom 15% of the tank', () => {
    const { s, r } = fishOf('sand', 5);
    let moved = 0;
    const x0 = s.x;
    simulate(s, r, 60, still(), () => {
      expect(s.y + s.height / 2).toBeGreaterThanOrEqual(bounds.height * 0.85);
      moved = Math.max(moved, Math.abs(s.x - x0));
    });
    expect(moved).toBeGreaterThan(5);
  });

  it('a bottom feeder cruises nose-down just above the sand, even in a tall tank', () => {
    const tall: Bounds = { width: 1600, height: 900 };
    const spec: SwimmerSpec = { id: 'cat', width: 200, cruise: 50, depth: depthFor('bottom', [0.2, 0.4]), hoverBias: 0.3, dartBias: 0.5, habit: 'bottom' };
    const r = rng(17);
    const [s] = spawn([spec], tall, r, 0, anchors);
    let low = 0;
    let nosedDown = 0;
    let n = 0;
    let now = 0;
    for (let i = 0; i < 40 * 60; i++) {
      step([s!], tall, 1 / 60, r, (now += 1 / 60), { current: 0, flakes: [], anchors });
      if (now < 5) continue;
      n++;
      if (s!.y + s!.height / 2 >= tall.height - 20 - s!.height * 0.3) low++;
      if (s!.mode === 'cruise' && s!.pitch > 3) nosedDown++;
    }
    expect(low / n).toBeGreaterThan(0.8);
    expect(nosedDown).toBeGreaterThan(0);
  });

  it('a weed fish stays by the weeds', () => {
    const { s, r } = fishOf('weed', 7);
    let near = 0;
    let n = 0;
    const visited = new Set<number>();
    simulate(s, r, 90, still(), () => {
      n++;
      const dists = anchors.weeds.map((w) => Math.abs(w.x - s.x));
      const d = Math.min(...dists);
      if (d <= 40) {
        near++;
        visited.add(dists.indexOf(d));
      }
    });
    expect(near / n).toBeGreaterThan(0.9);
    // Drifts weed to weed rather than sitting on one forever.
    expect(visited.size).toBeGreaterThan(1);
  });

  it('an ambush fish is near-still, then dashes', () => {
    const { s, r } = fishOf('ambush', 9);
    let dashes = 0;
    let wasFast = false;
    let still_ = 0;
    let n = 0;
    simulate(s, r, 30, still(), () => {
      n++;
      const fast = Math.abs(s.vx) >= s.cruise * 2;
      if (fast && !wasFast) dashes++;
      wasFast = fast;
      if (Math.abs(s.vx) <= s.cruise * 0.25) still_++;
    });
    expect(dashes).toBeGreaterThanOrEqual(1);
    expect(still_ / n).toBeGreaterThan(0.6);
  });

  it('a pelagic fish never hovers', () => {
    for (const seed of [11, 12, 13]) {
      const { s, r } = fishOf('pelagic', seed);
      simulate(s, r, 60, still(), () => expect(s.mode).not.toBe('hover'));
    }
  });

  const trout = (heading: 1 | -1) => {
    const { s, r } = fishOf('holdCurrent', 15);
    s.x = 600;
    s.heading = heading;
    s.flip = -heading;
    s.vx = s.cruise * heading;
    s.mode = 'cruise';
    s.modeUntil = 999;
    return { s, r };
  };

  it('a holdCurrent fish facing into a strong current holds station', () => {
    const { s, r } = trout(-1);
    let drift = 0;
    simulate(s, r, 5, { current: 18, flakes: [], anchors }, () => {
      drift = Math.max(drift, Math.abs(s.x - 600));
      expect(s.heading).toBe(-1);
    });
    expect(drift).toBeLessThan(20);
  });

  it('a holdCurrent fish facing downstream turns into the current and returns to station', () => {
    const { s, r } = trout(1);
    let facedAt: number | null = null;
    simulate(s, r, 5, { current: 18, flakes: [], anchors }, (now) => {
      if (facedAt === null && s.heading === -1) facedAt = now;
    });
    expect(facedAt).not.toBeNull();
    expect(facedAt!).toBeLessThan(1);
    expect(s.heading).toBe(-1);
    expect(Math.abs(s.x - 600)).toBeLessThan(20);
  });

  it('a holdCurrent fish swims normally in slack water', () => {
    const { s, r } = trout(1);
    let rested = false;
    simulate(s, r, 20, still(), () => {
      if (s.mode === 'rest') rested = true;
    });
    expect(rested).toBe(false);
  });

  it('every habit fish still chases food in range', () => {
    const habits: Habit[] = ['crevice', 'sand', 'weed', 'puffer', 'bottom', 'ambush', 'pelagic', 'reef', 'glide', 'holdCurrent'];
    for (const habit of habits) {
      const { s, r } = fishOf(habit, 21);
      const flake = { id: 1, x: s.x + 120, y: s.y - 30, phase: 0, bornAt: -10, landedAt: null };
      const world: World = { current: 0, flakes: [flake], anchors };
      let fed = false;
      simulate(s, r, 3, world, () => {
        if (s.mode === 'feed') fed = true;
      });
      expect(fed, habit).toBe(true);
    }
  });

  it('places anchored fish at their anchors on spawn, so reduced motion still shows the habit', () => {
    const eel = fishOf('crevice', 1).s;
    expect(atCrevice(eel, anchors.rocks)).toBe(true);
    const horse = fishOf('weed', 1).s;
    // The wall clamp may hold a fish a little off the outermost weed.
    expect(Math.min(...anchors.weeds.map((w) => Math.abs(w.x - horse.x)))).toBeLessThanOrEqual(20);
    const flat = fishOf('sand', 1).s;
    expect(flat.y + flat.height / 2).toBeGreaterThanOrEqual(bounds.height * 0.85);
  });
});

describe('fix round 1 habits', () => {
  const still = (): World => ({ current: 0, flakes: [], anchors });

  it('a lionfish hovers most of the time', () => {
    const { s, r } = fishOf('hoverReef', 31);
    let hover = 0;
    let n = 0;
    simulate(s, r, 60, still(), () => {
      n++;
      if (s.mode === 'hover') hover++;
    });
    expect(hover / n).toBeGreaterThanOrEqual(0.6);
  });

  it('a panfish nibbles at weeds some of the time, not all of it', () => {
    const { s, r } = fishOf('nibble', 33);
    let near = 0;
    let n = 0;
    simulate(s, r, 60, still(), () => {
      n++;
      const m = mouthOf(s);
      if (anchors.weeds.some((w) => Math.hypot(w.x - m.x, w.y - m.y) <= 40)) near++;
    });
    expect(near / n).toBeGreaterThanOrEqual(0.25);
    expect(near / n).toBeLessThan(0.9);
  });

  it('a grouper lurks by the rocks, and by decor once there is any', () => {
    const rocksOnly: Anchors = { ...anchors, decor: [] };
    const spec: SwimmerSpec = { id: 'g', width: 110, cruise: 55, depth: [0.3, 0.6], hoverBias: 0.3, dartBias: 0.5, habit: 'lurk' };
    const share = (a: Anchors, homes: { x: number; y: number }[]) => {
      const r = rng(35);
      const [s] = spawn([spec], bounds, r, 0, a);
      let near = 0;
      let n = 0;
      simulate(s!, r, 60, { current: 0, flakes: [], anchors: a }, () => {
        n++;
        if (homes.some((h) => Math.hypot(h.x - s!.x, h.y - s!.y) <= 80)) near++;
      });
      return near / n;
    };
    expect(share(rocksOnly, rocksOnly.rocks)).toBeGreaterThanOrEqual(0.6);
    expect(share(anchors, [...anchors.rocks, ...anchors.decor])).toBeGreaterThanOrEqual(0.6);
  });

  it('a resting eel lies with its body behind a rock lip, facing out', () => {
    const tank: Bounds = { width: 1200, height: 224, floor: 24 };
    const rocks = rocksFor(tank.width, tank.height, 24, false);
    const real: typeof anchors = { rocks: rocks.flatMap((k) => k.crevices), weeds: anchors.weeds, decor: [] };
    const lips = rocks.flatMap((k) => k.lips);
    expect(lips).toHaveLength(real.rocks.length);
    const spec: SwimmerSpec = { id: 'eel', width: 120, cruise: 50, depth: [0.5, 0.8], hoverBias: 0.3, dartBias: 0.3, habit: 'crevice' };
    const r = rng(41);
    const [s] = spawn([spec], tank, r, 0, real);
    let now = 0;
    let checked = 0;
    let settled = 0;
    for (let i = 0; i < 60 * 60; i++) {
      step([s!], tank, 1 / 60, r, (now += 1 / 60), { current: 0, flakes: [], anchors: real });
      const a = real.rocks[s!.anchor];
      const restX = a ? a.x - a.face! * s!.width * 0.25 : NaN;
      settled = s!.mode === 'rest' && Math.abs(s!.vx) <= 2 && Math.abs(s!.x - restX) < 15 ? settled + 1 : 0;
      // Settled for a second: the arrival turn is done.
      if (settled < 60 || !a) continue;
      checked++;
      const lip = lips[s!.anchor]!;
      // Body: the thin middle band of the art box, behind the head.
      const body = { l: s!.x - s!.width / 2, r: s!.x + s!.width / 2, t: s!.y - s!.height * 0.2, b: s!.y + s!.height * 0.2 };
      expect(body.l < lip.x + lip.w && body.r > lip.x && body.t < lip.y + lip.h && body.b > lip.y).toBe(true);
      expect(s!.heading).toBe(a.face);
      // Head out past the lip.
      const head = s!.x + s!.heading * s!.width / 2;
      expect(head < lip.x || head > lip.x + lip.w).toBe(true);
    }
    expect(checked).toBeGreaterThan(60);
  });

  it('floor fish sit on the drawn sand; a flatfish rests about 30% buried', () => {
    const tank: Bounds = { width: 1200, height: 900, floor: 44 };
    const sandTop = tank.height - 44;
    const flat: SwimmerSpec = { id: 'flat', width: 160, cruise: 40, depth: depthFor('sand', [0.2, 0.4]), hoverBias: 0.3, dartBias: 0.3, habit: 'sand' };
    const r = rng(43);
    const [s] = spawn([flat], tank, r, 0, anchors);
    expect(s!.y + s!.height / 2 - sandTop).toBeCloseTo(s!.height * 0.3, 0);
    const cat: SwimmerSpec = { ...flat, id: 'cat', habit: 'bottom', depth: depthFor('bottom', [0.2, 0.4]) };
    const [c] = spawn([cat], tank, r, 0, anchors);
    let now = 0;
    for (let i = 0; i < 20 * 60; i++) {
      step([c!], tank, 1 / 60, r, (now += 1 / 60), { current: 0, flakes: [], anchors });
      expect(c!.y + c!.height / 2).toBeLessThanOrEqual(sandTop + 0.001);
    }
    expect(sandTop - (c!.y + c!.height / 2)).toBeLessThan(c!.height * 0.3);
  });
});

describe('leaving rest', () => {
  const tank: Bounds = { width: 1200, height: 224, floor: 24 };
  const rocks = rocksFor(tank.width, tank.height, 24, false);
  const real: Anchors = { rocks: rocks.flatMap((k) => k.crevices), weeds: anchors.weeds, decor: [] };
  const maxJump = (s: Swimmer, r: () => number, leave: (now: number) => void) => {
    let now = 0;
    let worst = 0;
    for (let i = 0; i < 60; i++) step([s], tank, 1 / 60, r, (now += 1 / 60), { current: 0, flakes: [], anchors: real });
    expect(s.mode).toBe('rest');
    leave(now);
    for (let i = 0; i < 4 * 60; i++) {
      const y = s.y;
      step([s], tank, 1 / 60, r, (now += 1 / 60), { current: 0, flakes: [], anchors: real });
      worst = Math.max(worst, Math.abs(s.y - y));
    }
    return worst;
  };
  const flat: SwimmerSpec = { id: 'flat', width: 160, cruise: 40, depth: depthFor('sand', [0.2, 0.4]), hoverBias: 0.3, dartBias: 0.3, habit: 'sand' };
  const eel: SwimmerSpec = { id: 'eel', width: 120, cruise: 50, depth: [0.5, 0.8], hoverBias: 0.3, dartBias: 0.3, habit: 'crevice' };

  for (const spec of [flat, eel]) {
    it(`a resting ${spec.id} rises smoothly when its rest ends`, () => {
      const r = rng(61);
      const [s] = spawn([spec], tank, r, 0, real);
      s!.modeUntil = 1e9;
      expect(maxJump(s!, r, (now) => { s!.modeUntil = now; })).toBeLessThan(3);
    });

    it(`a resting ${spec.id} rises smoothly when the pointer holds it`, () => {
      const r = rng(62);
      const [s] = spawn([spec], tank, r, 0, real);
      s!.modeUntil = 1e9;
      expect(maxJump(s!, r, (now) => hold(s!, true, now))).toBeLessThan(3);
    });
  }
});

describe('weed sway', () => {
  it('matches the CSS keyframes: lean - amp at the start of a cycle, lean + amp half a cycle on', () => {
    const w = { x: 0, y: 0, sway: { reach: 100, delay: -1 } };
    const sw = { amp: 6, degPerCurrent: 0.5 };
    const at = (now: number, drift = 0) => weedSway(w, now, drift, sw);
    expect(at(-1).dx).toBeCloseTo(100 * Math.sin((-6 * Math.PI) / 180));
    expect(at(3).dx).toBeCloseTo(100 * Math.sin((6 * Math.PI) / 180));
    expect(at(7).dx).toBeCloseTo(at(-1).dx);
    expect(at(1).dx).toBeCloseTo(0);
    // A rightward current leans the weed right.
    expect(at(1, 10).dx).toBeCloseTo(100 * Math.sin((5 * Math.PI) / 180));
    expect(weedSway({ x: 0, y: 0 }, 3, 0, sw)).toEqual({ dx: 0, dy: 0 });
    expect(weedSway(w, 3, 0, undefined)).toEqual({ dx: 0, dy: 0 });
  });

  it('a seahorse resting on a weed sways with it', () => {
    const swaying: Anchors = { ...anchors, weeds: anchors.weeds.map((w, i) => ({ ...w, sway: { reach: 120, delay: -i * 1.3 } })) };
    const world: World = { current: 0, flakes: [], anchors: swaying, sway: { amp: 10, degPerCurrent: 0 } };
    const spec: SwimmerSpec = { id: 'horse', width: 60, cruise: 40, depth: [0.3, 0.6], hoverBias: 0.3, dartBias: 0.3, habit: 'weed' };
    const r = rng(21);
    const [s] = spawn([spec], bounds, r, 0, swaying);
    let now = 0;
    let err = 0;
    let n = 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < 40 * 60; i++) {
      step([s!], bounds, 1 / 60, r, (now += 1 / 60), world);
      if (now < 4 || s!.mode !== 'rest' || s!.anchor < 0) continue;
      const w = swaying.weeds[s!.anchor]!;
      const goal = w.x + weedSway(w, now, 0, world.sway).dx;
      if (Math.abs(goal - s!.x) > 40) continue; // still swimming over from the last weed
      err += Math.abs(goal - s!.x);
      n++;
      lo = Math.min(lo, s!.x - w.x);
      hi = Math.max(hi, s!.x - w.x);
    }
    expect(n).toBeGreaterThan(600);
    expect(err / n).toBeLessThan(5);
    expect(hi - lo).toBeGreaterThan(25);
  });
});
