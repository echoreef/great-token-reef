import {
  DEPTH_RULES, findById, levelForXp, speciesName, titleName,
  type ReefExpeditionFish, type ReefExpeditionWelcome, type ReefExpeditions,
} from '@gtr/shared';
import { compactNumber } from './format';

// Which tank fish are away on a trip, how the tank moves them, and what the minimap and hover card say.

export const MINIMAP_KEY = 'gtr-minimap';

export function parseMinimapHidden(raw: string | null): boolean {
  return raw === 'hidden';
}

/** Species out on a trip, including a party back home and waiting to be welcomed. */
export function awaySpecies(state: ReefExpeditions | undefined): ReadonlySet<number> {
  return new Set(state?.trip?.party ?? []);
}

/** Swimmer ids of roster fish whose species is away. `rosterSpecies[i]` belongs to `specIds[i]`. */
export function awaySwimmerIds(rosterSpecies: readonly number[], specIds: readonly string[], away: ReadonlySet<number>): ReadonlySet<string> {
  return new Set(specIds.filter((_, i) => away.has(rosterSpecies[i]!)));
}

export interface TripStep {
  /** start swimming out */
  leave: string[];
  /** vanish at once: the first load, or reduced motion */
  goneNow: string[];
  /** welcomed home: drop back in */
  back: string[];
}

export function tripStep(awayIds: ReadonlySet<string>, gone: ReadonlySet<string>, leaving: ReadonlySet<string>, instant: boolean): TripStep {
  const fresh = [...awayIds].filter((id) => !gone.has(id) && !leaving.has(id));
  return {
    leave: instant ? [] : fresh,
    goneNow: instant ? fresh : [],
    back: [...gone].filter((id) => !awayIds.has(id)),
  };
}

/** "Lv 12 · Leviathan" for a fish that has been on a trip, otherwise null. */
export function hoverLine(fish: ReefExpeditionFish | undefined): string | null {
  if (!fish || fish.trips === 0) return null;
  return fish.shownTitle ? `Lv ${fish.level} · ${titleName(fish.shownTitle)}` : `Lv ${fish.level}`;
}

export type MinimapView =
  | { kind: 'rest' }
  | { kind: 'out'; depth: string; party: number[]; percent: number; progress: string }
  | { kind: 'returned'; party: number[] };

export function minimapView(state: ReefExpeditions): MinimapView {
  const trip = state.trip;
  if (!trip) return { kind: 'rest' };
  if (trip.returned) return { kind: 'returned', party: trip.party };
  return {
    kind: 'out',
    depth: DEPTH_RULES[trip.depth].label,
    party: trip.party,
    percent: Math.floor((100 * trip.progressTokens) / trip.lengthTokens),
    progress: `${compactNumber(trip.progressTokens)} of ${compactNumber(trip.lengthTokens)}`,
  };
}

/** The homecoming summary, one line each. */
export function welcomeLines(w: ReefExpeditionWelcome): string[] {
  const lines = [`+${w.xp} experience each`];
  for (const species of w.party) {
    const after = w.state.fish.find((f) => f.species === species);
    if (after && levelForXp(after.xp - w.xp) < after.level) lines.push(`${speciesName(species)} reached level ${after.level}`);
  }
  const find = w.find ? findById(w.find) : undefined;
  if (find) lines.push(`Found: ${find.name}`);
  for (const t of w.titles) lines.push(`${speciesName(t.species)} earned ${titleName(t.title)}`);
  return lines;
}
