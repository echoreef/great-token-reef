import { describe, expect, it } from 'vitest';
import { HUNT_GAP_MIN, HUNT_GAP_SPAN, HUNT_RADIUS_FRAC, MIN_TANK, pickPrey } from './tankHunt';
import { hold, spawn, swimOff, type Bounds, type Swimmer, type SwimmerSpec } from './tankSim';

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
