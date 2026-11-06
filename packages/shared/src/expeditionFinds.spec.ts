import { describe, expect, it } from 'vitest';
import { DEPTHS } from './expeditions.ts';
import { FINDS, FINDS_PER_DEPTH, findById, findsAt, rollFind } from './expeditionFinds.ts';

const seq = (...xs: number[]) => () => xs.shift()!;

describe('finds', () => {
  it('has eight uniquely named finds per depth', () => {
    expect(FINDS).toHaveLength(32);
    expect(new Set(FINDS.map((f) => f.id)).size).toBe(32);
    for (const d of DEPTHS) {
      expect(findsAt(d)).toHaveLength(FINDS_PER_DEPTH);
      for (const f of findsAt(d)) expect(f.id.startsWith(`${d}-`)).toBe(true);
    }
    expect(findById('abyss-whale-bone')?.name).toBe('Whale Bone');
    expect(findById('nope')).toBeUndefined();
  });
  it('finds nothing when the first draw misses the chance', () => {
    expect(rollFind('reef', new Set(), 0.3, seq(0.3, 0))).toBeNull();
  });
  it('draws only from finds the log still lacks', () => {
    const open = findsAt('reef').slice(6);
    const found = new Set(findsAt('reef').slice(0, 6).map((f) => f.id));
    expect(rollFind('reef', found, 0.3, seq(0.1, 0.99))?.id).toBe(open[1]!.id);
    expect(rollFind('reef', found, 0.3, seq(0.1, 0))?.id).toBe(open[0]!.id);
  });
  it('finds nothing once the log is full', () => {
    expect(rollFind('reef', new Set(findsAt('reef').map((f) => f.id)), 1, seq(0, 0))).toBeNull();
  });
});
