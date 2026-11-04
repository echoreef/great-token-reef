import { describe, expect, it } from 'vitest';
import { HUNT_GAP_MIN, HUNT_GAP_SPAN } from './tankHunt';
import { spawn, type Bounds, type SwimmerSpec } from './tankSim';

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
