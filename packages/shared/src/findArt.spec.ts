import { describe, expect, it } from 'vitest';
import { findById } from './expeditionFinds.ts';
import { FIND_ART, findSvg } from './findArt.ts';

const drawn = Object.keys(FIND_ART);

describe('find art', () => {
  it('draws every find as clean SVG with instance-unique ids', () => {
    for (const id of drawn) {
      const svg = findSvg(id, 'p1');
      expect(svg.startsWith('<svg'), id).toBe(true);
      expect(svg.endsWith('</svg>'), id).toBe(true);
      expect(svg).toContain('viewBox="0 0 320 180"');
      expect(svg).not.toMatch(/undefined|NaN/);
      for (const m of svg.matchAll(/\bid="([^"]*)"/g)) expect(m[1]!.startsWith('nbx-p1-'), `${id}: ${m[1]}`).toBe(true);
      expect(svg).toContain(`aria-label="${findById(id)!.name}"`);
    }
  });
  it('gives each find its own drawing', () => {
    const svgs = drawn.map((id) => findSvg(id, 'same'));
    expect(new Set(svgs).size).toBe(svgs.length);
  });
  it('refuses an unknown find', () => {
    expect(() => findSvg('nope', 'p')).toThrow('no drawing for find nope');
  });
});
