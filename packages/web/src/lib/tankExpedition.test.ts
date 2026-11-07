import { DEFAULT_TYPICAL_DAY, speciesName, type ReefExpeditionFish, type ReefExpeditions } from '@gtr/shared';
import { describe, expect, it } from 'vitest';
import { awaySpecies, awaySwimmerIds, hoverLine, minimapView, parseMinimapHidden, tripStep, welcomeLines } from './tankExpedition';

const set = (...xs: string[]) => new Set(xs);
const fish = (species: number, over: Partial<ReefExpeditionFish> = {}): ReefExpeditionFish => ({
  species, xp: 0, level: 1, trips: 0, strength: 1, titles: [], chosenTitle: null, shownTitle: null, ...over,
});
const state = (over: Partial<ReefExpeditions> = {}): ReefExpeditions => ({
  typicalDayTokens: DEFAULT_TYPICAL_DAY, trip: null, fish: [], finds: [], ...over,
});
const trip = { id: 1, depth: 'dropoff' as const, party: [1, 2, 3], strength: 60, lengthTokens: 576_000_000, progressTokens: 207_000_000, startedAt: 0, returned: false };

describe('tank expedition', () => {
  it('reads the minimap preference', () => {
    expect(parseMinimapHidden('hidden')).toBe(true);
    expect(parseMinimapHidden(null)).toBe(false);
  });
  it('lists away species while a party is out or waiting', () => {
    expect(awaySpecies(undefined)).toEqual(new Set());
    expect(awaySpecies(state({ trip }))).toEqual(new Set([1, 2, 3]));
  });
  it('maps away species to their swimmer ids', () => {
    expect(awaySwimmerIds([4, 9, 12], ['4-0', '9-1', '12-0'], new Set([9, 12, 77]))).toEqual(set('9-1', '12-0'));
  });
  it('swims newly away fish out', () => {
    expect(tripStep(set('a', 'b'), set(), set('b'), false)).toEqual({ leave: ['a'], goneNow: [], back: [] });
  });
  it('removes them at once on first load or with reduced motion', () => {
    expect(tripStep(set('a'), set(), set(), true)).toEqual({ leave: [], goneNow: ['a'], back: [] });
  });
  it('brings welcomed fish back', () => {
    expect(tripStep(set(), set('a', 'b'), set(), false)).toEqual({ leave: [], goneNow: [], back: ['a', 'b'] });
  });
  it('shows level and title only once a fish has travelled', () => {
    expect(hoverLine(fish(1))).toBeNull();
    expect(hoverLine(fish(1, { trips: 3, level: 12 }))).toBe('Lv 12');
    expect(hoverLine(fish(1, { trips: 3, level: 30, shownTitle: 'leviathan' }))).toBe('Lv 30 · Leviathan');
  });
  it('describes the minimap', () => {
    expect(minimapView(state())).toEqual({ kind: 'rest' });
    expect(minimapView(state({ trip }))).toEqual({ kind: 'out', depth: 'Drop-off', party: [1, 2, 3], percent: 35, progress: '207M of 576M' });
    expect(minimapView(state({ trip: { ...trip, returned: true } }))).toEqual({ kind: 'returned', party: [1, 2, 3] });
  });
  it('summarises a homecoming', () => {
    const lines = welcomeLines({
      tripId: 4, depth: 'shallows', party: [1, 2, 3], xp: 1, find: 'shallows-rubber-duck',
      titles: [{ species: 2, title: 'treasure-hunter' }],
      state: state({ fish: [fish(1, { xp: 1, level: 2 }), fish(2, { xp: 2, level: 2 }), fish(3, { xp: 3, level: 3 })] }),
    });
    expect(lines).toEqual([
      '+1 experience each',
      `${speciesName(1)} reached level 2`,
      `${speciesName(3)} reached level 3`,
      'Found: Rubber Duck',
      `${speciesName(2)} earned Treasure Hunter`,
    ]);
  });
});
