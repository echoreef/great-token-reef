// Replays a realistic usage rhythm to hold the recommended strengths to their target weeks.

import { describe, expect, it } from 'vitest';
import { SPECIES_COUNT, speciesRarity, type Rarity } from './fish.ts';
import { DEPTHS, DEPTH_RULES, MAX_LEVEL, levelForXp, partyStrength, tripLength, tripPayout, typicalDay, type Depth } from './expeditions.ts';

// 20 real finished active days, each divided by their median, oldest first.
const DAY_SHAPE = [0.31, 0.28, 0.33, 0.54, 0.96, 0.46, 1.58, 1.86, 2.65, 2.16, 0.66, 1.12, 1.04, 1.1, 1.96, 0.9, 0.59, 1.25, 2.9, 0.64];
const DAYS_PER_WEEK = 5;
// Trip lengths round to whole tokens, so replay at a realistic scale.
const SCALE = 100_000_000;
const firstOf = (r: Rarity) => Array.from({ length: SPECIES_COUNT }, (_, i) => i).find((i) => speciesRarity(i) === r)!;
const TYPICAL_PARTY = [firstOf('rare'), firstOf('uncommon'), firstOf('common')];
const THREE_COMMONS = Array.from({ length: SPECIES_COUNT }, (_, i) => i).filter((i) => speciesRarity(i) === 'common').slice(0, 3);
const NO_SETS = new Set<string>();

/** Weeks until the party first reaches each depth's recommended strength, and until all three are level 30. */
function weeksToReach(party: number[], checkIns: number[]): Record<Depth | 'max', number> {
  const typical = typicalDay(DAY_SHAPE.map((d) => d * SCALE).reverse());
  const xp = party.map(() => 0);
  const strength = () => partyStrength(party.map((species, i) => ({ species, xp: xp[i]! })), NO_SETS);
  const reached: Partial<Record<Depth | 'max', number>> = {};
  const deepestFull = () => [...DEPTHS].reverse().find((d) => strength() >= DEPTH_RULES[d].recommended)!;
  let trip = { depth: deepestFull(), left: tripLength(deepestFull(), typical) };
  let waiting = false;
  for (let day = 1; day <= 60 * DAYS_PER_WEEK; day++) {
    const total = DAY_SHAPE[(day - 1) % DAY_SHAPE.length]! * SCALE;
    let spent = 0;
    for (const at of checkIns) {
      let chunk = total * at - spent;
      spent = total * at;
      while (chunk > 0 && !waiting) {
        const used = Math.min(chunk, trip.left);
        trip.left -= used;
        chunk -= used;
        if (trip.left <= 0) waiting = true;
      }
      if (waiting) {
        const pay = tripPayout(trip.depth, strength()).xp;
        xp.forEach((x, i) => { xp[i] = x + pay; });
        const d = deepestFull();
        trip = { depth: d, left: tripLength(d, typical) };
        waiting = false;
      }
    }
    for (const d of DEPTHS) if (reached[d] === undefined && strength() >= DEPTH_RULES[d].recommended) reached[d] = day / DAYS_PER_WEEK;
    if (reached.max === undefined && xp.every((x) => levelForXp(x) === MAX_LEVEL)) reached.max = day / DAYS_PER_WEEK;
  }
  return reached as Record<Depth | 'max', number>;
}

describe('expedition balance', () => {
  it('opens the reef around week 2, the drop-off around week 8 and the abyss around week 20', () => {
    const w = weeksToReach(TYPICAL_PARTY, [1 / 3, 2 / 3, 1]);
    expect(w.reef).toBeGreaterThan(1.5);
    expect(w.reef).toBeLessThanOrEqual(2);
    expect(w.dropoff).toBeGreaterThan(7);
    expect(w.dropoff).toBeLessThanOrEqual(8);
    expect(w.abyss).toBeGreaterThan(19);
    expect(w.abyss).toBeLessThanOrEqual(20.5);
    expect(w.max).toBeGreaterThan(20);
    expect(w.max).toBeLessThan(26);
  });
  it('keeps three commons with no sets out of the abyss', () => {
    expect(weeksToReach(THREE_COMMONS, [1 / 3, 2 / 3, 1]).abyss).toBeUndefined();
  });
});
