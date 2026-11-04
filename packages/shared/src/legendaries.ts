// Named legendary ladder: 12 creatures, each earned once as a regular and once
// as a shiny. Ids start at 1000 so they never collide with catalog entries.

export const LEGENDARY_ID_BASE = 1000;

export type LegendaryPlan =
  | 'shark' | 'turtle' | 'octopus' | 'sunfish' | 'coelacanth' | 'orca' | 'oarfish' | 'squid';

export interface LegendaryDef {
  name: string; sci: string; lengthCm: number; fact: string; plan: LegendaryPlan;
  /** eats plankton, so never hunts another fish in the tank */
  filterFeeder?: true;
}

export const LEGENDARY_DEFS: readonly LegendaryDef[] = [
  { name: 'Tiger Shark', sci: 'Galeocerdo cuvier', lengthCm: 400, plan: 'shark',
    fact: 'Tiger sharks eat almost anything, and their stomachs have held tires, license plates and sea turtles.' },
  { name: 'Leatherback Sea Turtle', sci: 'Dermochelys coriacea', lengthCm: 180, plan: 'turtle',
    fact: 'The leatherback has no hard shell and can dive deeper than 1,000 meters.' },
  { name: 'Giant Pacific Octopus', sci: 'Enteroctopus dofleini', lengthCm: 300, plan: 'octopus',
    fact: 'This octopus has three hearts and blue, copper-based blood.' },
  { name: 'Ocean Sunfish', sci: 'Mola mola', lengthCm: 250, plan: 'sunfish',
    fact: 'The ocean sunfish is the heaviest bony fish in the world, at over two tonnes.' },
  { name: 'Coelacanth', sci: 'Latimeria chalumnae', lengthCm: 200, plan: 'coelacanth',
    fact: 'Thought extinct for 66 million years, the coelacanth was found alive off South Africa in 1938.' },
  { name: 'Great White Shark', sci: 'Carcharodon carcharias', lengthCm: 500, plan: 'shark',
    fact: 'A great white can sense a single drop of blood in about 100 liters of water.' },
  { name: 'Killer Whale', sci: 'Orcinus orca', lengthCm: 800, plan: 'orca',
    fact: 'Killer whales are the largest members of the dolphin family and hunt in family pods.' },
  { name: 'Whale Shark', sci: 'Rhincodon typus', lengthCm: 1200, plan: 'shark', filterFeeder: true,
    fact: 'The whale shark is the largest fish alive and feeds mainly on plankton.' },
  { name: 'Oarfish', sci: 'Regalecus glesne', lengthCm: 800, plan: 'oarfish',
    fact: 'The oarfish is the longest bony fish known, and it is rarely seen alive.' },
  { name: 'Megamouth Shark', sci: 'Megachasma pelagios', lengthCm: 550, plan: 'shark', filterFeeder: true,
    fact: 'The megamouth was first discovered in 1976 when one tangled in a ship\'s anchor off Hawaii.' },
  { name: 'Greenland Shark', sci: 'Somniosus microcephalus', lengthCm: 500, plan: 'shark',
    fact: 'Greenland sharks may live more than 270 years, the longest of any vertebrate.' },
  { name: 'Giant Squid', sci: 'Architeuthis dux', lengthCm: 1300, plan: 'squid',
    fact: 'The giant squid has the largest eyes in the animal kingdom, about the size of a dinner plate.' },
];

export interface LegendaryAward {
  index: number; shiny: boolean; threshold: number; seed: string; species: number;
}

const REGULAR_BASE = 100_000_000;
const SHINY_BASE = 200_000_000;
const LAST_REGULAR = REGULAR_BASE * 2 ** (LEGENDARY_DEFS.length - 1);

// Shinies begin only once every regular is caught: shiny i comes SHINY_BASE * 2^i past the last regular.
export function legendaryThreshold(index: number, shiny: boolean): number {
  return shiny ? LAST_REGULAR + SHINY_BASE * 2 ** index : REGULAR_BASE * 2 ** index;
}

/** Every legendary earned at this lifetime ladder total, in award order (all regulars, then the shinies). */
export function legendaryAwards(ladderTokens: number): LegendaryAward[] {
  return allAwards().filter((a) => a.threshold <= ladderTokens);
}

/** The next award still to come, or null once the shiny Giant Squid is earned. */
export function nextLegendary(ladderTokens: number): LegendaryAward | null {
  return allAwards().find((a) => a.threshold > ladderTokens) ?? null;
}

export function isLegendary(species: number): boolean {
  return species >= LEGENDARY_ID_BASE && species < LEGENDARY_ID_BASE + LEGENDARY_DEFS.length;
}

export function legendaryIndex(species: number): number {
  if (!isLegendary(species)) throw new Error(`not a legendary species id: ${species}`);
  return species - LEGENDARY_ID_BASE;
}

function allAwards(): LegendaryAward[] {
  const out: LegendaryAward[] = [];
  for (let index = 0; index < LEGENDARY_DEFS.length; index++) {
    for (const shiny of [false, true]) {
      out.push({
        index, shiny, threshold: legendaryThreshold(index, shiny),
        seed: `${shiny ? 'legend-shiny' : 'legend'}#${index}`,
        species: LEGENDARY_ID_BASE + index,
      });
    }
  }
  return out.sort((a, b) => a.threshold - b.threshold || Number(a.shiny) - Number(b.shiny));
}
