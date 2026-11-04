import { describe, expect, it } from 'vitest';
import { FLECK_FALLBACK, fleckColors, flecksFor } from './tankChomp';

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

describe('fleckColors', () => {
  it('takes the fish’s most used solid colours, most used first', () => {
    expect(fleckColors(['#aaa', '#bbb', '#aaa', '#ccc', '#bbb', '#aaa', '#ddd'])).toEqual(['#aaa', '#bbb', '#ccc']);
  });

  it('skips gradients, none and transparent', () => {
    expect(fleckColors(['url(#g1)', 'none', 'transparent', '#123456', null, ''])).toEqual(['#123456']);
  });

  it('falls back when the fish has no solid colour', () => {
    expect(fleckColors(['url(#g1)'])).toEqual(FLECK_FALLBACK);
  });
});

describe('flecksFor', () => {
  it('bursts flecks both ways from the bite, in the fish’s colours, and lets them sink', () => {
    const flecks = flecksFor(['#aaa', '#bbb'], rng(1), 14);
    expect(flecks).toHaveLength(14);
    expect(flecks.some((f) => f.dx < 0)).toBe(true);
    expect(flecks.some((f) => f.dx > 0)).toBe(true);
    for (const f of flecks) {
      expect(['#aaa', '#bbb']).toContain(f.color);
      expect(f.sink).toBeGreaterThan(0);
      expect(f.size).toBeGreaterThanOrEqual(2);
      expect(f.size).toBeLessThanOrEqual(6);
      expect(f.ms).toBeGreaterThanOrEqual(1000);
      expect(f.ms).toBeLessThanOrEqual(2000);
    }
  });
});
