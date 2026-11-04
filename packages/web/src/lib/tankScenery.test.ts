import { describe, expect, it } from 'vitest';
import { ENTRIES, LEGENDARY_DEFS, LEGENDARY_ID_BASE, SPECIES_DEFS } from '@gtr/shared';
import { PREY_MAX_RATIO } from './tankHunt';
import type { RosterFish } from './tankPicks';
import { anchorsFor, bubblesFor, decorFor, planktonFor, populationFor, rosterId, specFor } from './tankScenery';

const fish = (species: number, rarity: RosterFish['rarity'] = 'common', shiny = false): RosterFish => ({
  species, shiny, name: 'Fish', rarity, bestSize: 20, count: 1, firstCaught: 0, firstProject: '/p',
});

describe('populationFor', () => {
  it('scales with tank area between 6 and 28 fish', () => {
    expect(populationFor({ width: 1200, height: 224 })).toBe(8);
    expect(populationFor({ width: 300, height: 100 })).toBe(6);
    expect(populationFor({ width: 4000, height: 2000 })).toBe(28);
  });
});

describe('decorFor', () => {
  it('is deterministic for a width', () => {
    expect(decorFor(1200, false)).toEqual(decorFor(1200, false));
  });

  it('keeps between 7 and 24 weeds whatever the width', () => {
    expect(decorFor(200, false).weeds).toHaveLength(7);
    expect(decorFor(10_000, false).weeds).toHaveLength(24);
  });

  it('gives fullscreen a deeper floor, taller weeds and more coral', () => {
    const strip = decorFor(1200, false);
    const full = decorFor(1200, true);
    expect([strip.floor, full.floor]).toEqual([24, 44]);
    expect([strip.corals.length, full.corals.length]).toEqual([2, 4]);
    expect(full.weeds[0]!.height).toBeCloseTo(strip.weeds[0]!.height * 2.2);
  });
});

describe('bubblesFor and planktonFor', () => {
  it('draws exactly the requested bubbles', () => {
    expect(bubblesFor(0)).toEqual([]);
    expect(bubblesFor(9)).toHaveLength(9);
  });

  it('keeps plankton between 10 and 28 specks', () => {
    expect(planktonFor(200, false)).toHaveLength(10);
    expect(planktonFor(10_000, true)).toHaveLength(28);
  });
});

describe('specFor', () => {
  const blacktip = ENTRIES.findIndex((e) => SPECIES_DEFS[e.s]!.name === 'Blacktip Reef Shark');
  const tiger = LEGENDARY_ID_BASE + LEGENDARY_DEFS.findIndex((d) => d.name === 'Tiger Shark');

  it('makes sharks hunters in the full tank only', () => {
    expect(specFor(fish(blacktip), true, 1).hunter).toBe(true);
    expect(specFor(fish(tiger, 'legendary'), true, 1).hunter).toBe(true);
    expect(specFor(fish(blacktip), false, 1).hunter).toBe(false);
    expect(specFor(fish(tiger, 'legendary'), false, 1).hunter).toBe(false);
    expect(specFor(fish(3), true, 1).hunter).toBe(false);
  });

  it('draws every legendary too big for any hunter to eat', () => {
    const species = [...ENTRIES.keys(), ...LEGENDARY_DEFS.map((_, i) => LEGENDARY_ID_BASE + i)];
    const widths = species.flatMap((sp) => [1, 1000].map((best) => specFor({ ...fish(sp), bestSize: best }, true, 1).width));
    const smallestLegend = Math.min(...LEGENDARY_DEFS.map((_, i) => specFor(fish(LEGENDARY_ID_BASE + i, 'legendary'), true, 1).width));
    expect(Math.max(...widths) * PREY_MAX_RATIO).toBeLessThan(smallestLegend);
  });

  it('ids the swimmer by species and shininess', () => {
    expect(specFor(fish(3, 'rare', true), false, 1).id).toBe(rosterId(fish(3, 'rare', true)));
    expect(rosterId(fish(3))).not.toBe(rosterId(fish(3, 'common', true)));
  });

  it('cruises faster at a larger scale and darts more when rarer', () => {
    const slow = specFor(fish(3), false, 1);
    expect(specFor(fish(3), false, 1.3).cruise).toBeCloseTo(slow.cruise * 1.3);
    expect(specFor(fish(3, 'epic'), false, 1).dartBias).toBeLessThan(slow.dartBias);
  });
});

describe('anchorsFor', () => {
  it('places rocks, weed stems, coral and decor in tank pixels', () => {
    const b = { width: 1000, height: 200 };
    const decor = decorFor(1000, false);
    const piece = { item: 'chest', x: 400, w: 40, h: 20, left: 380, top: 150 };
    const a = anchorsFor(decor, [{ crevices: [{ x: 5, y: 6, face: 1 }] }], [piece], b);
    expect(a.rocks).toEqual([{ x: 5, y: 6, face: 1 }]);
    expect(a.weeds[0]!.x).toBeCloseTo((decor.weeds[0]!.left / 100) * 1000 + 10);
    expect(a.decor).toHaveLength(decor.corals.length + 1);
    expect(a.decor.at(-1)).toEqual({ x: 400, y: 157 });
  });
});
