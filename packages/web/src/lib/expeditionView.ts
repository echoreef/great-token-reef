import { DEPTH_RULES, PARTY_SIZE, isLegendary, tripPayout, type Depth, type ReefExpeditionFish, type ReefExpeditionTrip } from '@gtr/shared';
import { compactNumber } from './format';

// Pure helpers behind the Expeditions tab.

/** Why a fish cannot join the party right now, or null; a fish already in it can always leave. */
export function memberBlock(party: readonly number[], species: number): string | null {
  if (party.includes(species)) return null;
  if (party.length >= PARTY_SIZE) return 'The party is full';
  if (isLegendary(species) && party.some(isLegendary)) return 'A party can take only one legendary';
  return null;
}

/** Adds or removes a fish; a fish that cannot join leaves the party unchanged. */
export function toggleMember(party: readonly number[], species: number): number[] {
  if (party.includes(species)) return party.filter((s) => s !== species);
  return memberBlock(party, species) ? [...party] : [...party, species];
}

export interface DepthPreview {
  depth: Depth;
  label: string;
  recommended: number;
  full: boolean;
  xp: number;
  findPercent: number;
  tokens: string;
}

export function depthPreview(depth: Depth, strength: number, typicalDayTokens: number): DepthPreview {
  const rule = DEPTH_RULES[depth];
  const pay = tripPayout(depth, strength);
  return {
    depth, label: rule.label, recommended: rule.recommended, full: pay.full, xp: pay.xp,
    findPercent: Math.round(pay.findChance * 100), tokens: compactNumber(Math.round(rule.dayShare * typicalDayTokens)),
  };
}

/** Strongest first, then by species id, so the picker is stable. */
export function pickerOrder(fish: readonly ReefExpeditionFish[]): ReefExpeditionFish[] {
  return [...fish].sort((a, b) => b.strength - a.strength || a.species - b.species);
}

/** How far a trip is: a whole percent for bars, and "207M of 576M" for labels. */
export function tripProgress(trip: ReefExpeditionTrip): { percent: number; tokens: string } {
  return {
    percent: Math.floor((100 * trip.progressTokens) / trip.lengthTokens),
    tokens: `${compactNumber(trip.progressTokens)} of ${compactNumber(trip.lengthTokens)}`,
  };
}
