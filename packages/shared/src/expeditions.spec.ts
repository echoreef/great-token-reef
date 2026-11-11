import { describe, expect, it } from 'vitest';
import { SPECIES_COUNT, setsContaining, speciesRarity, type Rarity } from './fish.ts';
import { LEGENDARY_ID_BASE } from './legendaries.ts';
import {
  DEFAULT_TYPICAL_DAY, fishStrength, levelForXp, partyProblem, partyStrength, tripLength, tripPayout, typicalDay, xpToReach,
} from './expeditions.ts';

const M = 1_000_000;
const firstOf = (r: Rarity) => Array.from({ length: SPECIES_COUNT }, (_, i) => i).find((i) => speciesRarity(i) === r)!;
const COMMON = firstOf('common');
const RARE = firstOf('rare');
const EPIC = firstOf('epic');
const LEGEND_A = LEGENDARY_ID_BASE;
const LEGEND_B = LEGENDARY_ID_BASE + 1;
const NONE = new Set<string>();

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

describe('strength', () => {
  it('adds the rarity head start to the level', () => {
    expect(fishStrength(COMMON, 0, NONE)).toBe(1);
    expect(fishStrength(RARE, 0, NONE)).toBe(7);
    expect(fishStrength(EPIC, 3, NONE)).toBe(13);
    expect(fishStrength(LEGEND_A, 0, NONE)).toBe(16);
  });
  it('adds 6, 4 and 2 for completed species, family and water sets', () => {
    const sets = setsContaining(COMMON);
    const byLevel = (l: string) => sets.find((s) => s.level === l)!.id;
    expect(fishStrength(COMMON, 0, new Set([byLevel('water')]))).toBe(3);
    expect(fishStrength(COMMON, 0, new Set([byLevel('family'), byLevel('water')]))).toBe(7);
    expect(fishStrength(COMMON, 0, new Set(sets.map((s) => s.id)))).toBe(13);
  });
  it('totals a party', () => {
    expect(partyStrength([{ species: COMMON, xp: 0 }, { species: RARE, xp: 1 }, { species: EPIC, xp: 3 }], NONE)).toBe(1 + 8 + 13);
  });
});

describe('trip payout', () => {
  it('pays full experience and a find chance at or above the recommended strength', () => {
    expect(tripPayout('shallows', 0)).toEqual({ xp: 1, full: true, findChance: 0.2 });
    expect(tripPayout('reef', 27)).toEqual({ xp: 4, full: true, findChance: 0.3 });
    expect(tripPayout('reef', 30).findChance).toBeCloseTo(0.33);
    expect(tripPayout('abyss', 93)).toEqual({ xp: 20, full: true, findChance: 0.5 });
    expect(tripPayout('abyss', 400).findChance).toBe(0.8);
  });
  it('pays a share of the experience and no find below it', () => {
    expect(tripPayout('reef', 13)).toEqual({ xp: 1, full: false, findChance: 0 });
    expect(tripPayout('abyss', 60)).toEqual({ xp: 12, full: false, findChance: 0 });
  });
});

describe('party rules', () => {
  const released = new Set([COMMON, RARE, EPIC, LEGEND_A, LEGEND_B]);
  it('accepts three released fish with at most one legendary', () => {
    expect(partyProblem([COMMON, RARE, LEGEND_A], released)).toBeNull();
  });
  it('names the first broken rule', () => {
    expect(partyProblem([COMMON, RARE], released)).toBe('size');
    expect(partyProblem([COMMON, COMMON, RARE], released)).toBe('duplicate');
    expect(partyProblem([COMMON, RARE, 9999], released)).toBe('not-released');
    expect(partyProblem([COMMON, LEGEND_A, LEGEND_B], released)).toBe('legendaries');
  });
});
