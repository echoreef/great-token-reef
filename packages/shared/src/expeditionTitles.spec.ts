import { describe, expect, it } from 'vitest';
import { xpToReach, type Depth } from './expeditions.ts';
import { LOG_TITLE, TITLES, isTitleId, milestoneTitles, shownTitle, titleName } from './expeditionTitles.ts';

const record = (over: Partial<{ xp: number; trips: number; fullDepths: Set<Depth>; finds: number }> = {}) => ({
  xp: 0, trips: 0, fullDepths: new Set<Depth>(), finds: 0, ...over,
});

describe('titles', () => {
  it('has fifteen titles and one log title per depth', () => {
    expect(Object.keys(TITLES)).toHaveLength(15);
    expect(LOG_TITLE).toEqual({ shallows: 'beachcomber', reef: 'reef-curator', dropoff: 'salvager', abyss: 'abyss-curator' });
    expect(isTitleId('leviathan')).toBe(true);
    expect(isTitleId('toString')).toBe(false);
    expect(titleName('old-salt')).toBe('Old Salt');
    expect(titleName('retired-title')).toBe('retired-title');
  });
  it('earns nothing for a fresh fish or a shallows-only trip', () => {
    expect(milestoneTitles(record({ trips: 1, xp: 1, fullDepths: new Set(['shallows']) }))).toEqual([]);
  });
  it('earns depth, trip, level and find milestones', () => {
    expect(milestoneTitles(record({ fullDepths: new Set(['reef', 'abyss']) }))).toEqual(['reef-runner', 'abyss-walker']);
    expect(milestoneTitles(record({ trips: 25 }))).toEqual(['seasoned', 'veteran']);
    expect(milestoneTitles(record({ xp: xpToReach(20) }))).toEqual(['riptide', 'elder']);
    expect(milestoneTitles(record({ xp: xpToReach(30) }))).toEqual(['riptide', 'elder', 'leviathan']);
    expect(milestoneTitles(record({ finds: 1 }))).toEqual(['treasure-hunter']);
  });
  it('shows the chosen title while held, otherwise the newest', () => {
    expect(shownTitle([], null)).toBeNull();
    expect(shownTitle(['elder', 'riptide'], null)).toBe('elder');
    expect(shownTitle(['elder', 'riptide'], 'riptide')).toBe('riptide');
    expect(shownTitle(['elder'], 'leviathan')).toBe('elder');
  });
});
