import { ENTRIES, LEGENDARY_DEFS, SPECIES_DEFS, isLegendary, legendaryIndex, type FishSpeciesDef, type LegendaryPlan } from '@gtr/shared';

// Species habits by body plan (reef-living-tank spec §2); the steering lives in tankSim.ts.

export type Habit =
  | 'crevice' | 'sand' | 'weed' | 'puffer' | 'bottom' | 'ambush' | 'pelagic' | 'reef'
  | 'hoverReef' | 'nibble' | 'lurk' | 'glide' | 'holdCurrent' | 'default';

/** Points fish home on, in tank px. `face` is the way a resting eel looks out of a crevice. */
export interface Anchors {
  rocks: { x: number; y: number; face?: 1 | -1 }[];
  weeds: WeedAnchor[];
  decor: { x: number; y: number }[];
}

/** `sway`: px from the weed's foot to this point, and the weed's CSS animation-delay in seconds. */
export interface WeedAnchor {
  x: number;
  y: number;
  sway?: { reach: number; delay: number };
}

const BY_PLAN: Record<string, Habit> = {
  eel: 'crevice',
  flatfish: 'sand',
  seahorse: 'weed',
  puffer: 'puffer',
  catfish: 'bottom',
  sturgeon: 'bottom',
  carp: 'bottom',
  pike: 'ambush',
  gar: 'ambush',
  shark: 'pelagic',
  billfish: 'pelagic',
  pelagic: 'pelagic',
  mahi: 'pelagic',
  reef: 'reef',
  wrasse: 'reef',
  lionfish: 'hoverReef',
  panfish: 'nibble',
  ray: 'glide',
  salmonid: 'holdCurrent',
};

/** Groupers share the 'heavy' plan, so they are told apart by planOpts. */
export function habitFor(def: Pick<FishSpeciesDef, 'plan' | 'planOpts'>): Habit {
  if (def.planOpts?.grouper) return 'lurk';
  return BY_PLAN[def.plan] ?? 'default';
}

const LEGENDARY_HABIT: Partial<Record<LegendaryPlan, Habit>> = { turtle: 'glide', sunfish: 'glide', octopus: 'bottom' };

/** A catalog entry's or legendary's habit; 'default' for an id that is neither. */
export function habitForSpecies(species: number): Habit {
  if (isLegendary(species)) return LEGENDARY_HABIT[LEGENDARY_DEFS[legendaryIndex(species)]!.plan] ?? 'pelagic';
  const e = ENTRIES[species];
  const def = e ? SPECIES_DEFS[e.s] : undefined;
  return def ? habitFor(def) : 'default';
}

/** Sharks and the killer whale hunt smaller fish; plankton-eating sharks never do. */
export function huntsFor(species: number): boolean {
  if (isLegendary(species)) {
    const def = LEGENDARY_DEFS[legendaryIndex(species)]!;
    return def.plan === 'orca' || (def.plan === 'shark' && !def.filterFeeder);
  }
  const e = ENTRIES[species];
  return e ? SPECIES_DEFS[e.s]?.plan === 'shark' : false;
}

const BANDS: Partial<Record<Habit, [number, number]>> = {
  pelagic: [0.08, 0.35],
  bottom: [0.74, 0.9],
  sand: [0.85, 0.95],
  glide: [0.62, 0.85],
};

export function depthFor(habit: Habit, widthDepth: [number, number]): [number, number] {
  return BANDS[habit] ?? widthDepth;
}

/** Cruise multiplier: puffers and groupers are slow, open-ocean fish fast, rays glide. */
export function speedFor(habit: Habit): number {
  return habit === 'puffer' ? 0.6 : habit === 'lurk' ? 0.5 : habit === 'pelagic' ? 1.3 : habit === 'glide' ? 0.8 : 1;
}
