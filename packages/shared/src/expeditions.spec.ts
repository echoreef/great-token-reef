import { describe, expect, it } from 'vitest';
import { DEFAULT_TYPICAL_DAY, levelForXp, tripLength, typicalDay, xpToReach } from './expeditions.ts';

const M = 1_000_000;

describe('typical day', () => {
  it('falls back to the light day below three active days', () => {
    expect(typicalDay([])).toBe(DEFAULT_TYPICAL_DAY);
    expect(typicalDay([50 * M, 60 * M])).toBe(DEFAULT_TYPICAL_DAY);
  });
  it('takes the median of the active days', () => {
    expect(typicalDay([10 * M, 30 * M, 20 * M])).toBe(20 * M);
    expect(typicalDay([100, 200, 300, 400])).toBe(250);
  });
  it('ignores empty days and uses only the newest twenty', () => {
    const newest = Array.from({ length: 20 }, () => 1000);
    expect(typicalDay([0, ...newest, 1, 1, 1, 1, 1])).toBe(1000);
  });
  it('sizes trips as shares of the typical day', () => {
    expect(tripLength('shallows', 192 * M)).toBe(48 * M);
    expect(tripLength('reef', 192 * M)).toBe(192 * M);
    expect(tripLength('dropoff', 192 * M)).toBe(576 * M);
    expect(tripLength('abyss', 192 * M)).toBe(960 * M);
  });
});

describe('levels', () => {
  it('costs one more experience per level, capped at 30', () => {
    expect([xpToReach(1), xpToReach(2), xpToReach(3), xpToReach(30)]).toEqual([0, 1, 3, 435]);
    expect([levelForXp(0), levelForXp(1), levelForXp(2), levelForXp(3)]).toEqual([1, 2, 2, 3]);
    expect([levelForXp(434), levelForXp(435), levelForXp(10_000)]).toEqual([29, 30, 30]);
  });
});
