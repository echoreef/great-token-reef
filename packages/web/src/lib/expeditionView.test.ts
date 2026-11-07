import { LEGENDARY_ID_BASE, type ReefExpeditionFish } from '@gtr/shared';
import { describe, expect, it } from 'vitest';
import { depthPreview, memberBlock, pickerOrder, toggleMember, tripProgress } from './expeditionView';

const fish = (species: number, strength: number): ReefExpeditionFish => ({
  species, xp: 0, level: 1, trips: 0, strength, titles: [], chosenTitle: null, shownTitle: null,
});

describe('expedition view', () => {
  it('builds a party of three with at most one legendary', () => {
    expect(toggleMember([1, 2], 3)).toEqual([1, 2, 3]);
    expect(toggleMember([1, 2, 3], 4)).toEqual([1, 2, 3]);
    expect(toggleMember([1, 2, 3], 2)).toEqual([1, 3]);
    expect(toggleMember([LEGENDARY_ID_BASE], LEGENDARY_ID_BASE + 1)).toEqual([LEGENDARY_ID_BASE]);
  });
  it('says why a fish cannot join', () => {
    expect(memberBlock([1, 2], 3)).toBeNull();
    expect(memberBlock([1, 2, 3], 3)).toBeNull();
    expect(memberBlock([1, 2, 3], 4)).toBe('The party is full');
    expect(memberBlock([LEGENDARY_ID_BASE], LEGENDARY_ID_BASE + 1)).toBe('A party can take only one legendary');
  });
  it('previews a depth for a party strength', () => {
    expect(depthPreview('reef', 30, 192_000_000)).toEqual({ depth: 'reef', label: 'Reef', recommended: 27, full: true, xp: 4, findPercent: 33, tokens: '192M' });
    expect(depthPreview('abyss', 60, 192_000_000)).toMatchObject({ full: false, xp: 12, findPercent: 0, tokens: '960M' });
  });
  it('reports trip progress as a whole percent and compact tokens', () => {
    const trip = { id: 1, depth: 'dropoff' as const, party: [1, 2, 3], strength: 60, lengthTokens: 576_000_000, progressTokens: 207_000_000, startedAt: 0, returned: false };
    expect(tripProgress(trip)).toEqual({ percent: 35, tokens: '207M of 576M' });
    expect(tripProgress({ ...trip, progressTokens: 576_000_000, returned: true }).percent).toBe(100);
  });
  it('orders the picker strongest first', () => {
    expect(pickerOrder([fish(5, 3), fish(2, 9), fish(1, 3)]).map((f) => f.species)).toEqual([2, 1, 5]);
  });
});
