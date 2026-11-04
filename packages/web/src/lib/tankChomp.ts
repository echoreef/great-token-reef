import type { Rng } from './tankMotion';

// The flecks a bitten fish leaves in the water. Pure; useSwimLoop draws them.

/** Used when a fish's art has no solid fill to borrow. */
export const FLECK_FALLBACK = ['#c9d6df', '#9fb3c2'];

export interface Fleck {
  /** px the fleck is thrown from the bite */
  dx: number;
  dy: number;
  /** px it then sinks */
  sink: number;
  size: number;
  color: string;
  ms: number;
}

/** The three solid fills the art uses most, most used first. */
export function fleckColors(fills: readonly (string | null | undefined)[]): string[] {
  const counts = new Map<string, number>();
  for (const f of fills) {
    if (!f || f === 'none' || f === 'transparent' || f.startsWith('url(')) continue;
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
  return top.length ? top : FLECK_FALLBACK;
}

/** Flecks thrown all round the bite, faster ones further, each then sinking as it fades. */
export function flecksFor(colors: readonly string[], rng: Rng, n: number): Fleck[] {
  return Array.from({ length: n }, (_, i) => {
    // Spread evenly round the circle with a little jitter, so none clump.
    const a = ((i + rng() * 0.8) / n) * Math.PI * 2;
    const r = 14 + rng() * 26;
    return {
      dx: Math.cos(a) * r,
      dy: Math.sin(a) * r * 0.7,
      sink: 20 + rng() * 30,
      size: 2 + rng() * 4,
      color: colors[Math.floor(rng() * colors.length)]!,
      ms: 1000 + rng() * 1000,
    };
  });
}
