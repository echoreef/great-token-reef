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
  'shallows-bottle-message': (uid) => `<defs>${grad(uid, '#6fae8f', '#4f8f72', '#a7d3bd')}</defs>
  ${shadow}
  <g transform="translate(0 -4) rotate(-13 170 120)">
    <path d="M92 112 C92 104 98 100 106 100 L186 100 C200 100 206 106 214 111 L244 112 L244 128 L214 129 C206 134 200 140 186 140 L106 140 C98 140 92 136 92 128 Z" fill="url(#${uid}-b)" opacity="0.92"/>
    <rect x="242" y="110" width="8" height="20" rx="3" fill="#8cc2a6"/>
    <rect x="248" y="113" width="16" height="14" rx="3" fill="#a7743f"/>
    <path d="M252 114 L252 126 M258 114 L258 126" stroke="#7a522b" stroke-width="1.5" opacity="0.6"/>
    <rect x="112" y="109" width="74" height="22" rx="10" fill="#efe6cc" opacity="0.85"/>
    <ellipse cx="117" cy="120" rx="5" ry="11" fill="#d9cfae" opacity="0.9"/>
    <path d="M148 109 L148 131" stroke="#c8463c" stroke-width="2.5" opacity="0.8"/>
    <path d="M126 116 L140 116 M156 116 L178 116 M126 123 L140 123 M156 123 L172 123" stroke="#9c8f6c" stroke-width="1.2" opacity="0.6"/>
    <path d="M92 112 C92 104 98 100 106 100 L186 100 C200 100 206 106 214 111 L244 112 L244 128 L214 129 C206 134 200 140 186 140 L106 140 C98 140 92 136 92 128 Z" fill="#4f8f72" opacity="0.18"/>
    <path d="M104 106 L184 106 C194 106 200 109 206 113" fill="none" stroke="#fff" stroke-width="3" opacity="0.5" stroke-linecap="round"/>
    <path d="M216 115 L238 115" stroke="#fff" stroke-width="2" opacity="0.4" stroke-linecap="round"/>
    <path d="M100 134 L180 134" stroke="#2f6a50" stroke-width="2" opacity="0.35" stroke-linecap="round"/>
  </g>
  <path d="M56 158 C74 134 120 130 154 158 Z" fill="#e3cf9c"/>
  <path d="M80 144 C94 137 116 137 130 144" fill="none" stroke="#f3e6c2" stroke-width="2.5" opacity="0.7" stroke-linecap="round"/>
  <circle cx="150" cy="154" r="1.6" fill="#e3cf9c"/><circle cx="158" cy="156" r="1.2" fill="#e3cf9c"/><circle cx="56" cy="155" r="1.4" fill="#e3cf9c"/>`,
  'shallows-fishing-lure': (uid) => `<defs>${grad(uid, '#d9dde0', '#b8bec4', '#f1f3f4')}</defs>
  ${shadow}
  <g transform="translate(158 98) rotate(22)">
    <path d="M-104 1 C-96 -2 -88 2 -77 0" fill="none" stroke="#d8d4c4" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M-104 1 L-112 -4 M-104 1 L-113 2 M-104 1 L-110 7" stroke="#d8d4c4" stroke-width="1" stroke-linecap="round" opacity="0.8"/>
    <circle cx="-70" cy="0" r="7" fill="none" stroke="#9aa1a7" stroke-width="2.5"/>
    <circle cx="-69" cy="0" r="5" fill="none" stroke="#c9ced2" stroke-width="1.2"/>
    <path d="M-62 0 C-50 -12 -10 -26 22 -26 C42 -26 54 -14 54 0 C54 14 42 26 22 26 C-10 26 -50 12 -62 0 Z" fill="url(#${uid}-b)"/>
    <path d="M-50 4 C-20 16 20 24 44 14 C40 22 30 26 22 26 C-10 26 -40 14 -50 4 Z" fill="#8f979e" opacity="0.45"/>
    <path d="M-48 -2 C-20 -10 20 -12 50 -5 L50 5 C20 12 -20 10 -48 2 Z" fill="#c8463c"/>
    <path d="M-30 -14 C-10 -22 16 -24 34 -20" fill="none" stroke="#fff" stroke-width="3.5" opacity="0.6" stroke-linecap="round"/>
    <circle cx="-56" cy="0" r="2" fill="#8f979e"/>
    <circle cx="59" cy="0" r="4.5" fill="none" stroke="#9aa1a7" stroke-width="2"/>
    <path d="M63 0 L88 0" stroke="#6b7177" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M88 0 C98 0 102 12 96 18 C91 22 85 19 85 12 M85 12 L89 14" fill="none" stroke="#6b7177" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M88 0 C98 0 102 -12 96 -18 C91 -22 85 -19 85 -12 M85 -12 L89 -14" fill="none" stroke="#6b7177" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M88 0 C100 0 106 4 104 9 C102 13 96 11 96 7" fill="none" stroke="#565c62" stroke-width="2.2" stroke-linecap="round"/>
  </g>`,
  'shallows-sand-dollar': (uid) => `<defs>${grad(uid, '#f3e8cc', '#e9dbb7', '#f8f1df')}</defs>
  ${shadow}
  <ellipse cx="160" cy="112" rx="76" ry="42" fill="#d6c394"/>
  <ellipse cx="160" cy="107" rx="76" ry="42" fill="url(#${uid}-b)"/>
  <g transform="translate(160 106) scale(1 0.55)">
    ${[0, 72, 144, 216, 288].map((a) => `<g transform="rotate(${a})"><ellipse cx="0" cy="-30" rx="9" ry="24" fill="#d8c79f"/><path d="M0 -50 L0 -10" stroke="#f3e8cc" stroke-width="2" opacity="0.8"/></g>`).join('')}
    ${[36, 108, 180, 252, 324].map((a) => `<g transform="rotate(${a})"><ellipse cx="0" cy="-56" rx="3" ry="9" fill="#d8c79f" opacity="0.7"/></g>`).join('')}
  </g>
  <ellipse cx="160" cy="106" rx="4" ry="2.6" fill="#9c8758"/>
  <path d="M100 92 C116 76 140 70 162 69" fill="none" stroke="#fff" stroke-width="3" opacity="0.5" stroke-linecap="round"/>
  <circle cx="112" cy="118" r="1.3" fill="#d8c79f"/><circle cx="206" cy="96" r="1.3" fill="#d8c79f"/><circle cx="198" cy="124" r="1.3" fill="#d8c79f"/><circle cx="124" cy="100" r="1.1" fill="#d8c79f"/>`,
};

/** SVG for a find (viewBox 0 0 320 180). `idPrefix` must be unique per rendered instance: gradient ids are global in HTML. */
export function findSvg(id: string, idPrefix: string): string {
  const def = findById(id);
  const build = FIND_ART[id];
  if (!def || !build) throw new Error(`no drawing for find ${id}`);
  return `<svg viewBox="0 0 320 180" role="img" aria-label="${def.name}" xmlns="http://www.w3.org/2000/svg">${build(`nbx-${idPrefix}`)}</svg>`;
}
