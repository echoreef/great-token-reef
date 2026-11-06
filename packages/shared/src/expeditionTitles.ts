// Titles a fish earns on expeditions. Log titles are awarded by the trip that completes a log; the rest follow from a fish's record.

import { DEPTHS, levelForXp, type Depth } from './expeditions.ts';

export const TITLES = {
  'reef-runner': 'Reef Runner',
  'dropoff-diver': 'Drop-off Diver',
  'abyss-walker': 'Abyss Walker',
  seasoned: 'Seasoned',
  veteran: 'Veteran',
  'old-salt': 'Old Salt',
  'tide-eternal': 'Tide Eternal',
  riptide: 'Riptide',
  elder: 'Elder',
  leviathan: 'Leviathan',
  beachcomber: 'Beachcomber',
  'reef-curator': 'Reef Curator',
  salvager: 'Salvager',
  'abyss-curator': 'Abyss Curator',
  'treasure-hunter': 'Treasure Hunter',
} as const;
export type TitleId = keyof typeof TITLES;

export const LOG_TITLE: Record<Depth, TitleId> = {
  shallows: 'beachcomber',
  reef: 'reef-curator',
  dropoff: 'salvager',
  abyss: 'abyss-curator',
};

// No shallows title: every fish's first trip would earn it.
const FIRST_FULL_TITLE: Partial<Record<Depth, TitleId>> = { reef: 'reef-runner', dropoff: 'dropoff-diver', abyss: 'abyss-walker' };
const TRIP_TITLES: readonly [number, TitleId][] = [[10, 'seasoned'], [25, 'veteran'], [50, 'old-salt'], [100, 'tide-eternal']];
const LEVEL_TITLES: readonly [number, TitleId][] = [[10, 'riptide'], [20, 'elder'], [30, 'leviathan']];

export interface FishRecord {
  xp: number;
  trips: number;
  /** depths this fish has visited at full strength */
  fullDepths: ReadonlySet<Depth>;
  finds: number;
}

export function isTitleId(s: string): s is TitleId {
  return Object.hasOwn(TITLES, s);
}

/** Display name for a stored title id; an id this version does not know shows as itself. */
export function titleName(id: string): string {
  return isTitleId(id) ? TITLES[id] : id;
}

export function milestoneTitles(r: FishRecord): TitleId[] {
  const out: TitleId[] = [];
  for (const d of DEPTHS) {
    const t = FIRST_FULL_TITLE[d];
    if (t && r.fullDepths.has(d)) out.push(t);
  }
  for (const [n, t] of TRIP_TITLES) if (r.trips >= n) out.push(t);
  const level = levelForXp(r.xp);
  for (const [n, t] of LEVEL_TITLES) if (level >= n) out.push(t);
  if (r.finds > 0) out.push('treasure-hunter');
  return out;
}

/** The chosen title while the fish still holds it, otherwise its newest. `earnedNewestFirst` is newest first. */
export function shownTitle(earnedNewestFirst: readonly TitleId[], chosen: TitleId | null): TitleId | null {
  if (chosen && earnedNewestFirst.includes(chosen)) return chosen;
  return earnedNewestFirst[0] ?? null;
}
