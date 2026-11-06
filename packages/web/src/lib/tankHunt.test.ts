import { describe, expect, it } from 'vitest';
import {
  ESCAPE_CHANCE, FULL_FACTOR, FULL_SECONDS, HUNT_GAP_MIN, HUNT_GAP_SPAN, HUNT_GIVE_UP, HUNT_RADIUS_FRAC, HUNT_RETRY, MIN_TANK, PREY_MAX_RATIO,
  WARY_RADIUS_FRAC, WARY_TOUCH_RATE, digest, pickPrey, setHunter, shyAway,
} from './tankHunt';
import { hold, mouthOf, spawn, step, swimOff, type Bounds, type StepEvents, type Swimmer, type SwimmerSpec } from './tankSim';

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

const bounds: Bounds = { width: 1600, height: 700 };

function spec(id: string, width: number, extra: Partial<SwimmerSpec> = {}): SwimmerSpec {
  return { id, width, cruise: 60, depth: [0.3, 0.5], hoverBias: 0, dartBias: 0, ...extra };
}

describe('spawn', () => {
  it('schedules a hunter its first hunt 2 to 5 minutes out, and never a fish that does not hunt', () => {
    const r = rng(3);
    for (let i = 0; i < 50; i++) {
      const [shark, fish] = spawn([spec('shark', 200, { hunter: true }), spec('fish', 60)], bounds, r, 10);
      expect(shark!.nextHuntAt).toBeGreaterThanOrEqual(10 + HUNT_GAP_MIN);
      expect(shark!.nextHuntAt).toBeLessThan(10 + HUNT_GAP_MIN + HUNT_GAP_SPAN);
      expect(fish!.nextHuntAt).toBe(Number.POSITIVE_INFINITY);
      expect(shark!.quarry).toBeNull();
      expect(shark!.fullUntil).toBe(0);
    }
  });

  it('draws no extra random numbers for a fish that does not hunt', () => {
    const a = rng(9);
    const b = rng(9);
    spawn([spec('fish', 60)], bounds, a, 0);
    spawn([spec('fish', 60, { hunter: false })], bounds, b, 0);
    expect(a()).toBe(b());
  });
});

// A shark at the tank's centre and small fish placed beside it, all cruising.
function tank(...prey: [string, number, number][]): Swimmer[] {
  const r = rng(1);
  const fish = spawn([spec('shark', 200, { hunter: true }), ...prey.map(([id, w]) => spec(id, w))], bounds, r, 0);
  fish[0]!.x = 800;
  fish[0]!.y = 300;
  prey.forEach(([, , dx], i) => {
    fish[i + 1]!.x = 800 + dx;
    fish[i + 1]!.y = 300;
  });
  for (const s of fish) {
    s.mode = 'cruise';
    s.modeUntil = 5;
  }
  return fish;
}
const filler: [string, number, number][] = [['a', 60, 600], ['b', 60, -620], ['c', 60, 650]];

describe('setHunter', () => {
  it('schedules the first hunt 2 to 5 minutes out for a fish that becomes a hunter', () => {
    // Kept from the strip tank, or swimming since a release began: it was never a hunter.
    const [shark] = spawn([spec('shark', 200)], bounds, rng(1), 0);
    expect(shark!.nextHuntAt).toBe(Number.POSITIVE_INFINITY);
    setHunter(shark!, true, rng(2), 50);
    expect(shark!.hunter).toBe(true);
    expect(shark!.nextHuntAt).toBeGreaterThanOrEqual(50 + HUNT_GAP_MIN);
    expect(shark!.nextHuntAt).toBeLessThan(50 + HUNT_GAP_MIN + HUNT_GAP_SPAN);
  });

  it('keeps the schedule of a fish that already hunts, and stops one that no longer does', () => {
    const [shark] = spawn([spec('shark', 200, { hunter: true })], bounds, rng(1), 0);
    const due = shark!.nextHuntAt;
    setHunter(shark!, true, rng(2), 50);
    expect(shark!.nextHuntAt).toBe(due);
    setHunter(shark!, false, rng(2), 60);
    expect(shark!.hunter).toBe(false);
  });
});

describe('pickPrey', () => {
  it('picks the nearest eligible fish', () => {
    const fish = tank(['near', 60, 150], ['far', 60, -300], ...filler);
    expect(pickPrey(fish[0]!, fish, bounds)?.id).toBe('near');
  });

  it('skips a fish wider than half the hunter', () => {
    const fish = tank(['big', 101, 100], ['ok', 100, 200], ...filler);
    expect(pickPrey(fish[0]!, fish, bounds)?.id).toBe('ok');
  });

  it('never picks another hunter', () => {
    const fish = tank(['other', 60, 100], ...filler);
    fish[1]!.hunter = true;
    expect(pickPrey(fish[0]!, fish, bounds)?.id).toBe('a');
  });

  it('skips a fish that is hovered, dropping in or swimming out', () => {
    const fish = tank(['held', 60, 100], ['dropping', 60, 120], ['leaving', 60, 140], ...filler);
    hold(fish[1]!, true, 0);
    fish[2]!.mode = 'drop';
    swimOff(fish[3]!, bounds, 0);
    expect(pickPrey(fish[0]!, fish, bounds)?.id).toBe('a');
  });

  it('skips a fish another hunter is already chasing', () => {
    const fish = tank(['taken', 60, 100], ...filler);
    const [rival] = spawn([spec('rival', 200, { hunter: true })], bounds, rng(2), 0);
    rival!.quarry = 'taken';
    expect(pickPrey(fish[0]!, [...fish, rival!], bounds)?.id).toBe('a');
  });

  it('only looks within reach of the hunter', () => {
    const reach = HUNT_RADIUS_FRAC * bounds.width;
    const inside = tank(['edge', 60, reach - 1], ['b', 60, reach + 5], ['c', 60, reach + 6]);
    expect(pickPrey(inside[0]!, inside, bounds)?.id).toBe('edge');
    const outside = tank(['x', 60, reach + 1], ['y', 60, -reach - 1], ['z', 60, reach + 2]);
    expect(pickPrey(outside[0]!, outside, bounds)).toBeNull();
  });

  it(`never hunts in a tank of fewer than ${MIN_TANK} fish`, () => {
    const fish = tank(['a', 60, 100], ['b', 60, 120]);
    expect(fish.length).toBeLessThan(MIN_TANK);
    expect(pickPrey(fish[0]!, fish, bounds)).toBeNull();
  });
});

const DT = 1 / 60;

// A hunter due to hunt now, beside four small fish.
function hunt(seed: number) {
  const r = rng(seed);
  const fish = tank(['p1', 60, 250], ['p2', 60, -300], ['p3', 50, 400], ['p4', 70, -450]);
  for (const s of fish) s.modeUntil = 0;
  fish[0]!.nextHuntAt = 0;
  let now = 0;
  const meals: StepEvents['meals'] = [];
  const tick = () => {
    now += DT;
    meals.push(...step(fish, bounds, DT, r, now).meals);
  };
  return { fish, shark: fish[0]!, r, tick, meals, get now() { return now; } };
}

// The prey sits right in the hunter's mouth, so the next step strikes.
function atStrike(roll: number) {
  const fish = tank(['prey', 60, 0], ...filler);
  const shark = fish[0]!;
  const prey = fish[1]!;
  shark.mode = 'hunt';
  shark.modeUntil = 1 + HUNT_GIVE_UP;
  shark.quarry = 'prey';
  shark.heading = 1;
  shark.flip = -1;
  const m = mouthOf(shark);
  prey.x = m.x + 4;
  prey.y = m.y;
  prey.heading = 1;
  prey.flip = -1;
  const events = step(fish, bounds, DT, () => roll, 1);
  return { fish, shark, prey, events };
}

describe('hunting', () => {
  it('starts when the hunt time comes, on the nearest prey', () => {
    const h = hunt(1);
    h.tick();
    expect(h.shark.mode === 'hunt' || h.shark.resume?.mode === 'hunt').toBe(true);
    expect(h.shark.quarry).toBe('p1');
  });

  it(`tries again in ${HUNT_RETRY}s when nothing is in reach`, () => {
    const fish = tank(['far', 60, 1500], ['far2', 60, -1500], ['far3', 60, 1400]);
    for (const s of fish) s.modeUntil = 0;
    fish[0]!.nextHuntAt = 0;
    step(fish, bounds, DT, rng(1), DT);
    expect(fish[0]!.quarry).toBeNull();
    expect(fish[0]!.nextHuntAt).toBeCloseTo(DT + HUNT_RETRY);
  });

  it('eats the prey on a strike that is not an escape', () => {
    const { fish, shark, events } = atStrike(ESCAPE_CHANCE + 0.1);
    expect(events.meals.map((m) => m.id)).toEqual(['prey']);
    expect(fish.some((s) => s.id === 'prey')).toBe(false);
    expect(shark.quarry).toBeNull();
    expect(shark.fullUntil).toBeCloseTo(1 + FULL_SECONDS);
    expect(shark.nextHuntAt).toBeGreaterThanOrEqual(1 + HUNT_GAP_MIN);
    expect(shark.nextHuntAt).toBeLessThan(1 + HUNT_GAP_MIN + HUNT_GAP_SPAN);
  });

  it('lets the prey dart away on an escape, and the hunter gives up', () => {
    const { fish, shark, prey, events } = atStrike(ESCAPE_CHANCE - 0.1);
    expect(events.meals).toEqual([]);
    expect(fish).toContain(prey);
    expect(prey.mode).toBe('dart');
    expect(prey.heading).toBe(1);
    expect(shark.quarry).toBeNull();
    expect(shark.mode).not.toBe('hunt');
    expect(shark.nextHuntAt).toBeGreaterThanOrEqual(1 + HUNT_GAP_MIN);
  });

  it('a prey facing the hunter turns before it darts off', () => {
    const fish = tank(['prey', 60, 0], ...filler);
    const shark = fish[0]!;
    const prey = fish[1]!;
    Object.assign(shark, { mode: 'hunt', modeUntil: 9, quarry: 'prey', heading: 1, flip: -1 });
    const m = mouthOf(shark);
    Object.assign(prey, { x: m.x + 4, y: m.y, heading: -1, flip: 1 });
    step(fish, bounds, DT, () => ESCAPE_CHANCE - 0.1, 1);
    expect(prey.mode).toBe('turn');
    let now = 1;
    for (let i = 0; i < 40; i++) step(fish, bounds, DT, () => 0.5, (now += DT));
    expect(prey.heading).toBe(1);
    expect(prey.mode).toBe('dart');
    expect(prey.target).toBeGreaterThan(prey.cruise);
  });

  it('cruises slowly while full', () => {
    const { fish, shark } = atStrike(0.9);
    const r = rng(4);
    let now = 1;
    let fastest = 0;
    while (now < 1 + FULL_SECONDS - 0.1) {
      step(fish, bounds, DT, r, (now += DT));
      if (shark.mode === 'cruise') fastest = Math.max(fastest, shark.target);
    }
    expect(fastest).toBeGreaterThan(0);
    expect(fastest).toBeLessThanOrEqual(shark.cruise * FULL_FACTOR + 1e-9);
  });

  it(`gives up after ${HUNT_GIVE_UP}s without a strike`, () => {
    const h = hunt(2);
    h.tick();
    const prey = h.fish.find((s) => s.id === h.shark.quarry)!;
    while (h.shark.quarry && h.now < HUNT_GIVE_UP + 2) {
      // Keep the prey out of reach, well above or below the hunter and inside the tank.
      prey.x = h.shark.x;
      prey.y = h.shark.y < bounds.height / 2 ? h.shark.y + 250 : h.shark.y - 250;
      h.tick();
    }
    expect(h.shark.quarry).toBeNull();
    expect(h.now).toBeGreaterThanOrEqual(HUNT_GIVE_UP);
    expect(h.now).toBeLessThan(HUNT_GIVE_UP + 0.5);
    expect(h.meals).toEqual([]);
  });

  it('gives up when the prey is hovered', () => {
    const h = hunt(3);
    h.tick();
    hold(h.fish.find((s) => s.id === h.shark.quarry)!, true, h.now);
    h.tick();
    expect(h.shark.quarry).toBeNull();
  });

  it('gives up when the hunter is hovered', () => {
    const h = hunt(3);
    h.tick();
    while (h.shark.mode === 'turn') h.tick();
    hold(h.shark, true, h.now);
    h.tick();
    expect(h.shark.quarry).toBeNull();
    expect(h.shark.mode).toBe('hover');
  });

  it('gives up when the hunter stops being a hunter (full screen left, or a release started)', () => {
    const h = hunt(3);
    h.tick();
    h.shark.hunter = false;
    h.tick();
    expect(h.shark.quarry).toBeNull();
    expect(h.shark.mode).not.toBe('hunt');
  });

  it('keeps hunting through a turn when the prey is behind', () => {
    const fish = tank(['behind', 60, -200], ...filler);
    const shark = fish[0]!;
    Object.assign(shark, { heading: 1, flip: -1, nextHuntAt: 0, modeUntil: 0 });
    const r = rng(5);
    let now = 0;
    // The hunt starts at the end of one step and steers from the next.
    step(fish, bounds, DT, r, (now += DT));
    step(fish, bounds, DT, r, (now += DT));
    expect(shark.mode).toBe('turn');
    expect(shark.resume?.mode).toBe('hunt');
    while (shark.mode === 'turn') step(fish, bounds, DT, r, (now += DT));
    expect(shark.mode).toBe('hunt');
    expect(shark.heading).toBe(-1);
    expect(shark.quarry).toBe('behind');
  });

  it('does not push a hunter off its prey', () => {
    const fish = tank(['prey', 60, 0], ...filler);
    const [shark, prey] = fish as [Swimmer, Swimmer];
    Object.assign(shark, { mode: 'hunt', modeUntil: 9, quarry: 'prey', heading: 1, flip: -1 });
    // Centres close enough to separate, mouth not yet on the prey.
    Object.assign(prey, { x: shark.x + 20, y: shark.y + 20 });
    const ghost = { ...prey, id: 'ghost' };
    const control = tank(['ghost', 60, 0], ...filler);
    control[1] = ghost;
    Object.assign(control[0]!, { mode: 'cruise', modeUntil: 9, heading: 1, flip: -1, x: shark.x, y: shark.y });
    step(fish, bounds, DT, () => 0.5, 1);
    step(control, bounds, DT, () => 0.5, 1);
    // Same fish, same steering: only the separation push tells them apart.
    expect(ghost.vy).toBeGreaterThan(prey.vy + 0.1);
  });

  it('ends most hunts in a strike, and about a third of strikes in an escape', () => {
    let meals = 0;
    let escapes = 0;
    let giveUps = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const h = hunt(seed);
      h.tick();
      const id = h.shark.quarry!;
      while (h.shark.quarry && h.now < HUNT_GIVE_UP + 2) h.tick();
      const prey = h.fish.find((s) => s.id === id);
      if (h.meals.length) meals++;
      else if (prey?.mode === 'dart' || prey?.mode === 'turn') escapes++;
      else giveUps++;
    }
    expect(meals + escapes).toBeGreaterThanOrEqual(45);
    expect(escapes / (meals + escapes)).toBeGreaterThan(0.1);
    expect(escapes / (meals + escapes)).toBeLessThan(0.5);
    expect(meals + escapes + giveUps).toBe(60);
  });
});

// A small fish cruising right, `gap` px of water between its nose and a resting shark's tail.
function approach(gap: number, fishWidth = 60, dy = 0) {
  const [shark, fish] = spawn([spec('shark', 200, { hunter: true }), spec('fish', fishWidth)], bounds, rng(1), 0);
  Object.assign(shark!, { x: 1200, y: 300, nextHuntAt: Number.POSITIVE_INFINITY });
  Object.assign(fish!, { x: 1200 - 100 - fishWidth / 2 - gap, y: 300 + dy, heading: 1, flip: -1, mode: 'cruise', modeUntil: 1e6 });
  return [shark!, fish!] as const;
}
const always = () => 0;

describe('shyAway', () => {
  it('turns a small fish away from a shark just ahead of it, then darts off', () => {
    const [shark, fish] = approach(20);
    expect(shyAway(fish, [shark, fish], bounds, always, DT, 1)).toBe(true);
    expect(fish.mode).toBe('turn');
    expect(fish.resume?.mode).toBe('dart');
    let now = 1;
    for (let i = 0; i < 40; i++) step([shark, fish], bounds, DT, () => 0.5, (now += DT));
    expect(fish.heading).toBe(-1);
    expect(fish.mode).toBe('dart');
    expect(fish.target).toBeGreaterThan(fish.cruise);
  });

  it('darts straight off from a shark it touches while facing away', () => {
    const [shark, fish] = approach(-40);
    Object.assign(fish, { heading: -1, flip: 1 });
    expect(shyAway(fish, [shark, fish], bounds, always, DT, 1)).toBe(true);
    expect(fish.mode).toBe('dart');
    expect(fish.heading).toBe(-1);
  });

  it('darts off a shark it touches from below, turning first to face away from it', () => {
    // Boxes overlap by a few px: shark 112.5 tall, fish 33.75.
    const [shark, fish] = approach(0, 60, 70);
    Object.assign(fish, { x: shark.x + 30, heading: -1, flip: 1 });
    expect(shyAway(fish, [shark, fish], bounds, always, DT, 1)).toBe(true);
    expect(fish.mode).toBe('turn');
    expect(fish.resume?.mode).toBe('dart');
    let now = 1;
    while (fish.mode === 'turn') step([shark, fish], bounds, DT, () => 0.5, (now += DT));
    expect(fish.heading).toBe(1);
    expect(fish.mode).toBe('dart');
  });

  it('darts off a touching shark only some of the time', () => {
    let fled = 0;
    const runs = 200;
    for (let seed = 1; seed <= runs; seed++) {
      const r = rng(seed);
      const [shark, fish] = approach(-40);
      Object.assign(fish, { heading: -1, flip: 1 });
      // One second of touching.
      for (let i = 0; i < 60 && !shyAway(fish, [shark, fish], bounds, r, DT, 1); i++);
      if (fish.mode === 'dart') fled++;
    }
    const expected = 1 - Math.exp(-WARY_TOUCH_RATE);
    expect(fled / runs).toBeGreaterThan(expected - 0.1);
    expect(fled / runs).toBeLessThan(expected + 0.1);
  });

  it('ignores a shark behind it', () => {
    const [shark, fish] = approach(20);
    Object.assign(fish, { heading: -1, flip: 1 });
    expect(shyAway(fish, [shark, fish], bounds, always, DT, 1)).toBe(false);
  });

  it('ignores a shark out of sight ahead, or well above or below', () => {
    const [shark, far] = approach(WARY_RADIUS_FRAC * bounds.width + 1);
    expect(shyAway(far, [shark, far], bounds, always, DT, 1)).toBe(false);
    const [shark2, below] = approach(20, 60, shark.height + 1);
    expect(shyAway(below, [shark2, below], bounds, always, DT, 1)).toBe(false);
  });

  it('ignores a shark it is too big to be eaten by', () => {
    const [shark, fish] = approach(20, 200 * PREY_MAX_RATIO + 1);
    expect(shyAway(fish, [shark, fish], bounds, always, DT, 1)).toBe(false);
  });

  it('leaves hunters, a fish being chased, and a feeding, resting or hovered fish alone', () => {
    const [shark, fish] = approach(20);
    fish.hunter = true;
    expect(shyAway(fish, [shark, fish], bounds, always, DT, 1)).toBe(false);
    fish.hunter = undefined;
    shark.quarry = 'fish';
    expect(shyAway(fish, [shark, fish], bounds, always, DT, 1)).toBe(false);
    shark.quarry = null;
    for (const mode of ['feed', 'rest', 'ambush'] as const) {
      fish.mode = mode;
      expect(shyAway(fish, [shark, fish], bounds, always, DT, 1)).toBe(false);
    }
    fish.mode = 'cruise';
    hold(fish, true, 1);
    expect(shyAway(fish, [shark, fish], bounds, always, DT, 1)).toBe(false);
  });

  it('draws no random numbers with no shark ahead, so tanks without one keep their sequence', () => {
    const [shark, fish] = approach(20);
    Object.assign(fish, { heading: -1, flip: 1 });
    const never = () => {
      throw new Error('rng drawn');
    };
    expect(shyAway(fish, [shark, fish], bounds, never, DT, 1)).toBe(false);
  });

  it('turns a fish heading at a shark away most of the time, not every time', () => {
    let turned = 0;
    const runs = 100;
    for (let seed = 1; seed <= runs; seed++) {
      const r = rng(seed);
      const [shark, fish] = approach(WARY_RADIUS_FRAC * bounds.width);
      const fish2 = [shark, fish];
      let now = 0;
      // The shark holds still; stop once the fish turns or its nose reaches the shark.
      while (fish.heading === 1 && fish.mode !== 'turn' && fish.x + fish.width / 2 < shark.x - shark.width / 2) {
        step(fish2, bounds, DT, r, (now += DT));
        Object.assign(shark, { x: 1200, y: 300, vx: 0, vy: 0 });
        fish.y = 300;
      }
      if (fish.mode === 'turn' || fish.heading === -1) turned++;
    }
    expect(turned / runs).toBeGreaterThan(0.5);
    expect(turned / runs).toBeLessThan(0.9);
  });
});

describe('digest', () => {
  const none: ReadonlySet<string> = new Set();

  it('holds an eaten fish until it comes back', () => {
    const eaten = digest(none, { kind: 'meal', id: 'a' });
    expect([...eaten]).toEqual(['a']);
    expect([...digest(eaten, { kind: 'back', id: 'a' })]).toEqual([]);
  });

  it('forgets a fish that left the roster while it was eaten', () => {
    const eaten = digest(digest(none, { kind: 'meal', id: 'a' }), { kind: 'meal', id: 'b' });
    expect([...digest(eaten, { kind: 'roster', ids: new Set(['b', 'c']) })]).toEqual(['b']);
  });

  it('lets every fish back at once when hunting stops', () => {
    const eaten = digest(digest(none, { kind: 'meal', id: 'a' }), { kind: 'meal', id: 'b' });
    expect(digest(eaten, { kind: 'clear' }).size).toBe(0);
  });

  it('keeps the same set when nothing changes, so the tank does not re-render', () => {
    const eaten = digest(none, { kind: 'meal', id: 'a' });
    expect(digest(eaten, { kind: 'meal', id: 'a' })).toBe(eaten);
    expect(digest(eaten, { kind: 'back', id: 'z' })).toBe(eaten);
    expect(digest(eaten, { kind: 'roster', ids: new Set(['a']) })).toBe(eaten);
    expect(digest(none, { kind: 'clear' })).toBe(none);
  });
});
