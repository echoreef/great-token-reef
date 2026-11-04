import { describe, expect, it } from 'vitest';
import {
  LEGENDARY_DEFS, isLegendary, legendaryAwards, legendaryIndex, legendaryThreshold, nextLegendary,
} from './legendaries.ts';
import { SPECIES_DEFS, speciesInfo, speciesName, speciesRarity } from './fish.ts';

describe('legendary ladder', () => {
  it('awards every regular before any shiny', () => {
    expect(legendaryAwards(99_999_999)).toEqual([]);
    expect(legendaryAwards(100_000_000).map((a) => [a.index, a.shiny])).toEqual([[0, false]]);
    // The second regular arrives alone: no shiny rides along with it.
    expect(legendaryAwards(200_000_000).map((a) => [a.index, a.shiny])).toEqual([[0, false], [1, false]]);
    const at7b = legendaryAwards(7_000_000_000);
    expect(at7b.filter((a) => !a.shiny)).toHaveLength(7);
    expect(at7b.filter((a) => a.shiny)).toHaveLength(0);
    expect(legendaryAwards(204_800_000_000).map((a) => a.shiny)).toEqual(Array(12).fill(false));
    expect(legendaryAwards(614_400_000_000)).toHaveLength(24);
    expect(legendaryAwards(1e15)).toHaveLength(24);
    expect(at7b[0]).toMatchObject({ seed: 'legend#0', species: 1000, threshold: 100_000_000 });
  });

  it('marks only the plankton-eating sharks as filter feeders', () => {
    expect(LEGENDARY_DEFS.filter((d) => d.filterFeeder).map((d) => d.name)).toEqual(['Whale Shark', 'Megamouth Shark']);
  });

  it('places every shiny after the last regular', () => {
    const regulars = LEGENDARY_DEFS.map((_, i) => legendaryThreshold(i, false));
    const shinies = LEGENDARY_DEFS.map((_, i) => legendaryThreshold(i, true));
    expect(Math.min(...shinies)).toBeGreaterThan(Math.max(...regulars));
    expect(legendaryAwards(1e15).map((a) => a.shiny)).toEqual([...Array(12).fill(false), ...Array(12).fill(true)]);
  });

  it('finds the next legendary', () => {
    expect(nextLegendary(0)).toMatchObject({ index: 0, shiny: false, threshold: 100_000_000 });
    expect(nextLegendary(100_000_000)).toMatchObject({ index: 1, shiny: false });
    expect(nextLegendary(204_800_000_000)).toMatchObject({ index: 0, shiny: true, threshold: 205_000_000_000 });
    expect(nextLegendary(614_400_000_000)).toBeNull();
  });

  it('computes thresholds', () => {
    expect(legendaryThreshold(11, false)).toBe(204_800_000_000);
    // The first shiny comes the first shiny step (200M) past the last regular; steps keep doubling.
    expect(legendaryThreshold(0, true)).toBe(205_000_000_000);
    expect(legendaryThreshold(1, true)).toBe(205_200_000_000);
    expect(legendaryThreshold(11, true)).toBe(614_400_000_000);
  });

  it('identifies legendary ids', () => {
    expect(isLegendary(1011)).toBe(true);
    expect(isLegendary(1012)).toBe(false);
    expect(isLegendary(11)).toBe(false);
    expect(legendaryIndex(1006)).toBe(6);
    expect(() => legendaryIndex(11)).toThrow();
  });

  it('plugs into the species helpers', () => {
    expect(speciesInfo(1006).name).toBe('Killer Whale');
    expect(speciesInfo(1006)).toEqual({
      name: 'Killer Whale', base: 'Killer Whale', sci: 'Orcinus orca', morph: null,
      water: 'salt', rarity: 'legendary', marks: '', baseSpecies: 1006,
    });
    expect(speciesName(1000)).toBe('Tiger Shark');
    expect(speciesRarity(1000)).toBe('legendary');
  });

  it('has 12 distinct creatures that do not overlap the catalog', () => {
    expect(LEGENDARY_DEFS).toHaveLength(12);
    expect(LEGENDARY_DEFS.map((d) => d.name)).not.toContain('Narwhal');
    const catalog = new Set(SPECIES_DEFS.map((d) => d.name));
    for (const d of LEGENDARY_DEFS) expect(catalog.has(d.name)).toBe(false);
  });
});
