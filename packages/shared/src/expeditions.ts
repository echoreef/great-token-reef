// Expedition rules. Pure like fish.ts: the server stores trips, everything else is derived here.

import { z } from 'zod';

export const DEPTHS = ['shallows', 'reef', 'dropoff', 'abyss'] as const;
export const DepthValue = z.enum(DEPTHS);
export type Depth = z.infer<typeof DepthValue>;

export interface DepthRule {
  label: string;
  /** trip length as a share of the player's typical active day */
  dayShare: number;
  xp: number;
  recommended: number;
  /** chance of a find at exactly the recommended strength */
  findBase: number;
}

export const DEPTH_RULES: Record<Depth, DepthRule> = {
  shallows: { label: 'Shallows', dayShare: 0.25, xp: 1, recommended: 0, findBase: 0.2 },
  reef: { label: 'Reef', dayShare: 1, xp: 4, recommended: 27, findBase: 0.3 },
  dropoff: { label: 'Drop-off', dayShare: 3, xp: 12, recommended: 57, findBase: 0.4 },
  abyss: { label: 'Abyss', dayShare: 5, xp: 20, recommended: 93, findBase: 0.5 },
};

export const PARTY_SIZE = 3;
export const MAX_LEVEL = 30;
/** the catch ladder's "light day", used until a player has MIN_ACTIVE_DAYS */
export const DEFAULT_TYPICAL_DAY = 22_000_000;
export const MIN_ACTIVE_DAYS = 3;
export const TYPICAL_WINDOW = 20;
export const FIND_CHANCE_PER_POINT = 0.01;
export const FIND_CHANCE_MAX = 0.8;

/** Median of the newest TYPICAL_WINDOW finished active days. `dayTotals` is newest first. */
export function typicalDay(dayTotals: readonly number[]): number {
  const days = dayTotals.filter((t) => t > 0).slice(0, TYPICAL_WINDOW);
  if (days.length < MIN_ACTIVE_DAYS) return DEFAULT_TYPICAL_DAY;
  const sorted = [...days].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

export function tripLength(depth: Depth, typical: number): number {
  return Math.round(DEPTH_RULES[depth].dayShare * typical);
}

/** Total experience to reach `level`: 1 to 2 costs 1, and each level after costs one more. */
export function xpToReach(level: number): number {
  const l = Math.min(Math.max(level, 1), MAX_LEVEL);
  return ((l - 1) * l) / 2;
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpToReach(level + 1)) level++;
  return level;
}
