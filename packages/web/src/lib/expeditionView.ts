import { DEPTH_RULES, PARTY_SIZE, isLegendary, tripPayout, type Depth, type ReefExpeditionFish } from '@gtr/shared';
import { compactNumber } from './format';

// Pure helpers behind the Expeditions tab.

/** Adds or removes a fish; a full party or a second legendary leaves it unchanged. */
export function toggleMember(party: readonly number[], species: number): number[] {
  if (party.includes(species)) return party.filter((s) => s !== species);
  if (party.length >= PARTY_SIZE) return [...party];
  if (isLegendary(species) && party.some(isLegendary)) return [...party];
  return [...party, species];
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
