// The 32 collectible finds, 8 per depth. Purely collectible: no find changes strength or anything else.

import type { Depth } from './expeditions.ts';

export interface FindDef {
  id: string;
  depth: Depth;
  name: string;
  blurb: string;
}

export const FINDS_PER_DEPTH = 8;

export const FINDS: readonly FindDef[] = [
  { id: 'shallows-rubber-duck', depth: 'shallows', name: 'Rubber Duck', blurb: 'Bleached by the sun. It has heard every bug you ever explained to it.' },
  { id: 'shallows-bottle-message', depth: 'shallows', name: 'Message in a Bottle', blurb: 'The ink has run. You can just make out "it works on my machine".' },
  { id: 'shallows-fishing-lure', depth: 'shallows', name: 'Lost Fishing Lure', blurb: 'Somebody upstream is still telling the story of the one that got away.' },
  { id: 'shallows-sand-dollar', depth: 'shallows', name: 'Perfect Sand Dollar', blurb: 'Not a chip on it. Worth exactly one sand dollar.' },
  { id: 'shallows-flip-flop', depth: 'shallows', name: 'Single Flip-Flop', blurb: 'Its partner is out there somewhere. So is its owner.' },
  { id: 'shallows-sea-glass-jar', depth: 'shallows', name: 'Sea Glass Jar', blurb: 'Frosted green, worn smooth by a hundred years of waves.' },
  { id: 'shallows-kite-string', depth: 'shallows', name: 'Tangled Kite String', blurb: "It leads to nothing. The kite is a seagull's problem now." },
  { id: 'shallows-hermit-shell', depth: 'shallows', name: "Hermit Crab's Old Shell", blurb: 'Outgrown and left by the door. The new tenant wants something bigger.' },
  { id: 'reef-coral-coin', depth: 'reef', name: 'Coral-Crusted Coin', blurb: "Too overgrown to read the date. Someone's lucky penny, once." },
  { id: 'reef-diver-mask', depth: 'reef', name: "Diver's Lost Mask", blurb: 'The strap snapped. The diver made it home; the mask chose to stay.' },
  { id: 'reef-empty-oyster', depth: 'reef', name: 'Pearl-less Oyster', blurb: 'Opened with great ceremony. Empty, as is tradition.' },
  { id: 'reef-amphora', depth: 'reef', name: 'Clay Amphora', blurb: 'Two thousand years old, and it still smells faintly of olive oil.' },
  { id: 'reef-trident-tine', depth: 'reef', name: 'Bent Trident Tine', blurb: 'Snapped off something much grander. Its owner has not come back for it.' },
  { id: 'reef-camera', depth: 'reef', name: 'Waterproof Camera', blurb: 'Four hundred photos of the same parrotfish. Every one is blurry.' },
  { id: 'reef-toy-anchor', depth: 'reef', name: 'Toy Anchor', blurb: 'Fell off a model ship. Holds absolutely nothing in place.' },
  { id: 'reef-brass-key', depth: 'reef', name: 'Brass Key', blurb: 'Opens a chest that is definitely around here somewhere.' },
  { id: 'dropoff-ship-bell', depth: 'dropoff', name: "Sunken Ship's Bell", blurb: 'Green with age. It still rings if you tap it.' },
  { id: 'dropoff-anchor-chain', depth: 'dropoff', name: 'Rusted Anchor Chain', blurb: 'Forty links long, then it just stops. Ask no questions.' },
  { id: 'dropoff-porthole', depth: 'dropoff', name: 'Cracked Porthole', blurb: 'Look through it and the sea looks back.' },
  { id: 'dropoff-compass', depth: 'dropoff', name: "Captain's Compass", blurb: 'Ignores north. Always points toward deeper water.' },
  { id: 'dropoff-cargo-crate', depth: 'dropoff', name: 'Barnacled Cargo Crate', blurb: 'Stamped FRAGILE. It was not handled as such.' },
  { id: 'dropoff-last-bottle', depth: 'dropoff', name: "Captain's Last Bottle", blurb: 'Sealed and labelled "for a special occasion". The occasion never came.' },
  { id: 'dropoff-sea-chart', depth: 'dropoff', name: 'Waxed Sea Chart', blurb: 'Marks a reef that is not there any more, and one that is not there yet.' },
  { id: 'dropoff-telegraph', depth: 'dropoff', name: "Ship's Telegraph", blurb: 'The lever is jammed at FULL AHEAD. That explains a lot.' },
  { id: 'abyss-whale-bone', depth: 'abyss', name: 'Whale Bone', blurb: 'Big enough to sit inside. Something tiny already lives there.' },
  { id: 'abyss-angler-lantern', depth: 'abyss', name: "Angler's Lantern", blurb: 'Still glowing faintly. Do not follow it.' },
  { id: 'abyss-smoker-stone', depth: 'abyss', name: 'Black Smoker Stone', blurb: 'Warm to the touch, from a vent where the sea floor boils.' },
  { id: 'abyss-squid-beak', depth: 'abyss', name: 'Giant Squid Beak', blurb: 'From something that was not small and was not friendly.' },
  { id: 'abyss-sea-cable', depth: 'abyss', name: 'Severed Deep-Sea Cable', blurb: "Once carried half the world's traffic. Now it carries none." },
  { id: 'abyss-black-pearl', depth: 'abyss', name: 'Abyssal Pearl', blurb: 'Black, the size of a fist, and very, very old.' },
  { id: 'abyss-lost-probe', depth: 'abyss', name: 'Lost Probe', blurb: '"PROPERTY OF" and the rest is scraped off. Its little light still blinks.' },
  { id: 'abyss-deeper-map', depth: 'abyss', name: 'Map of Something Deeper', blurb: 'Proof that the abyss is not the bottom.' },
];

export function findsAt(depth: Depth): readonly FindDef[] {
  return FINDS.filter((f) => f.depth === depth);
}

export function findById(id: string): FindDef | undefined {
  return FINDS.find((f) => f.id === id);
}

/** One find this depth's log still lacks, or null. Two draws from the trip's seeded rng: whether, then which. */
export function rollFind(depth: Depth, found: ReadonlySet<string>, chance: number, rng: () => number): FindDef | null {
  const open = findsAt(depth).filter((f) => !found.has(f.id));
  if (open.length === 0 || rng() >= chance) return null;
  return open[Math.floor(rng() * open.length)]!;
}
