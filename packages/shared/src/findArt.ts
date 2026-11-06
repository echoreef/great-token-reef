// Expedition find drawings, in the fish art's style: a 320×180 viewBox, a vertical body gradient from
// grad(), flat shapes layered back to front, and every id prefixed with the instance uid.

import { findById } from './expeditionFinds.ts';
import { grad } from './fishArt.ts';

export type FindBuilder = (uid: string) => string;

const shadow = '<ellipse cx="160" cy="156" rx="96" ry="9" fill="#000" opacity="0.12"/>';

export const FIND_ART: Record<string, FindBuilder> = {
  'shallows-rubber-duck': (uid) => `<defs>${grad(uid, '#f3dc6b', '#eecf55', '#f8ecb4')}</defs>
  ${shadow}
  <path d="M96 116 C94 88 128 80 166 86 C194 90 212 98 226 88 C240 80 248 100 238 118 C226 140 192 150 152 148 C116 146 98 136 96 116 Z" fill="url(#${uid}-b)"/>
  <path d="M150 108 C168 98 194 102 204 116 C186 124 164 122 150 108 Z" fill="#e2bd3c" opacity="0.8"/>
  <circle cx="120" cy="72" r="31" fill="url(#${uid}-b)"/>
  <path d="M92 74 C80 70 70 76 72 84 C80 90 92 88 98 82 Z" fill="#e58a3c"/>
  <circle cx="112" cy="64" r="5" fill="#1d1a12"/><circle cx="110" cy="62" r="1.5" fill="#fff"/>
  <path d="M128 50 C140 46 150 54 148 62" fill="none" stroke="#fff" stroke-width="3" opacity="0.5" stroke-linecap="round"/>`,
};

/** SVG for a find (viewBox 0 0 320 180). `idPrefix` must be unique per rendered instance: gradient ids are global in HTML. */
export function findSvg(id: string, idPrefix: string): string {
  const def = findById(id);
  const build = FIND_ART[id];
  if (!def || !build) throw new Error(`no drawing for find ${id}`);
  return `<svg viewBox="0 0 320 180" role="img" aria-label="${def.name}" xmlns="http://www.w3.org/2000/svg">${build(`nbx-${idPrefix}`)}</svg>`;
}
