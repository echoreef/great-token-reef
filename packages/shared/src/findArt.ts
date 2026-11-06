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
  'shallows-flip-flop': (uid) => `<defs>${grad(uid, '#3c86c9', '#2f6fa8', '#7fb3e0')}</defs>
  ${shadow}
  <g transform="translate(160 121) rotate(-10) scale(1 0.62)">
    <path d="M-90 0 C-90 -30 -66 -34 -40 -30 C-10 -26 20 -22 50 -24 C78 -26 92 -14 92 0 C92 14 78 26 50 24 C20 22 -10 26 -40 30 C-66 34 -90 30 -90 0 Z" fill="#245a8a"/>
  </g>
  <g transform="translate(160 116) rotate(-10) scale(1 0.62)">
    <path d="M-90 0 C-90 -30 -66 -34 -40 -30 C-10 -26 20 -22 50 -24 C78 -26 92 -14 92 0 C92 14 78 26 50 24 C20 22 -10 26 -40 30 C-66 34 -90 30 -90 0 Z" fill="url(#${uid}-b)"/>
    <ellipse cx="60" cy="0" rx="22" ry="16" fill="#9cc4e8" opacity="0.55"/>
    <ellipse cx="-58" cy="-2" rx="18" ry="14" fill="#2a6399" opacity="0.35"/>
    <path d="M-80 -18 C-60 -30 -30 -26 0 -22" fill="none" stroke="#fff" stroke-width="3" opacity="0.35" stroke-linecap="round"/>
  </g>
  <path d="M104 126 L110 112 M110 112 C124 94 146 92 156 100 M110 112 C132 106 158 112 164 132" fill="none" stroke="#1f4f7a" stroke-width="10" stroke-linecap="round" opacity="0.35" transform="translate(2 4)"/>
  <path d="M104 126 L110 112 M110 112 C124 94 146 92 156 100 M110 112 C132 106 158 112 164 132" fill="none" stroke="#f0f0f0" stroke-width="8" stroke-linecap="round"/>
  <path d="M118 104 C128 96 140 94 150 96" fill="none" stroke="#fff" stroke-width="2.5" opacity="0.8" stroke-linecap="round"/>
  <ellipse cx="104" cy="126" rx="6" ry="4" fill="#d9d9d9"/>
  <path d="M150 106 C154 112 158 118 168 118 C180 118 186 110 198 112 C210 114 212 124 224 126" fill="none" stroke="#3f7d4a" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="184" cy="113" rx="7" ry="3" transform="rotate(-20 184 113)" fill="#4f9159"/>
  <ellipse cx="212" cy="119" rx="7" ry="3" transform="rotate(30 212 119)" fill="#4f9159"/>
  <path d="M152 108 C156 114 160 116 166 116" fill="none" stroke="#6fae74" stroke-width="1.5" opacity="0.7" stroke-linecap="round"/>`,
  'shallows-sea-glass-jar': (uid) => `<defs>${grad(uid, '#9cc9a8', '#7fb592', '#cfe6d5')}</defs>
  ${shadow}
  <ellipse cx="160" cy="54" rx="33" ry="6" fill="#5e9673" opacity="0.7"/>
  <path d="M130 66 C112 70 108 84 108 100 L108 132 C108 146 120 152 160 152 C200 152 212 146 212 132 L212 100 C212 84 208 70 190 66 Z" fill="url(#${uid}-b)" opacity="0.85"/>
  <rect x="132" y="58" width="56" height="12" rx="3" fill="url(#${uid}-b)" opacity="0.85"/>
  <rect x="124" y="48" width="72" height="13" rx="6.5" fill="#b3d6bd" opacity="0.9"/>
  <ellipse cx="160" cy="51" rx="30" ry="3.5" fill="#5e9673" opacity="0.6"/>
  <path d="M110 128 C140 136 180 136 210 128" fill="none" stroke="#5e9673" stroke-width="2" opacity="0.35"/>
  <path d="M124 86 C118 98 118 118 122 132" fill="none" stroke="#fff" stroke-width="5" opacity="0.45" stroke-linecap="round"/>
  <path d="M136 80 C133 88 132 96 132 104" fill="none" stroke="#fff" stroke-width="3" opacity="0.35" stroke-linecap="round"/>
  <path d="M134 52 L178 52" stroke="#fff" stroke-width="2" opacity="0.5" stroke-linecap="round"/>
  ${[[150, 92], [176, 84], [192, 104], [166, 112], [146, 126], [184, 128], [198, 90], [158, 100], [176, 140], [140, 106]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#fff" opacity="0.35"/>`).join('')}
  <path d="M70 158 C92 140 130 144 160 146 C190 144 228 140 250 158 Z" fill="#e3cf9c"/>
  <path d="M96 148 C110 144 124 144 136 146 M184 146 C198 144 212 144 226 149" fill="none" stroke="#f3e6c2" stroke-width="2.5" opacity="0.7" stroke-linecap="round"/>`,
  'shallows-kite-string': (uid) => `<defs>${grad(uid, '#c08a52', '#a7743f', '#d4a46e')}</defs>
  ${shadow}
  <g fill="none" stroke="#cfc6ae" stroke-width="2" stroke-linecap="round">
    <ellipse cx="150" cy="118" rx="58" ry="22" transform="rotate(18 150 118)"/>
    <ellipse cx="146" cy="122" rx="50" ry="26" transform="rotate(-28 146 122)"/>
    <ellipse cx="156" cy="116" rx="40" ry="30" transform="rotate(64 156 116)"/>
  </g>
  <g transform="rotate(-10 150 124)">
    <rect x="94" y="114" width="112" height="18" rx="4" fill="url(#${uid}-b)"/>
    <rect x="122" y="108" width="56" height="30" rx="9" fill="#e9e2cf"/>
    <path d="M128 110 L128 136 M136 109 L136 137 M144 108 L144 138 M152 108 L152 138 M160 108 L160 138 M168 109 L168 137" stroke="#cfc6ae" stroke-width="1.5"/>
    <path d="M126 112 L174 112" stroke="#fff" stroke-width="2.5" opacity="0.6" stroke-linecap="round"/>
    <ellipse cx="94" cy="123" rx="6" ry="11" fill="#7a522b"/>
    <ellipse cx="206" cy="123" rx="6" ry="11" fill="#7a522b"/>
    <path d="M100 117 L118 117 M182 117 L200 117" stroke="#fff" stroke-width="2" opacity="0.4" stroke-linecap="round"/>
  </g>
  <g fill="none" stroke="#e9e2cf" stroke-width="2.2" stroke-linecap="round">
    <path d="M98 96 C120 88 150 100 176 132 C186 144 200 146 212 138"/>
    <path d="M118 146 C130 130 160 100 196 96 C214 94 222 104 214 116"/>
    <path d="M176 108 C200 96 214 120 236 112 C258 104 268 124 290 118 C306 114 314 104 330 108"/>
  </g>`,
  'shallows-hermit-shell': (uid) => `<defs>${grad(uid, '#f6e2c4', '#eab98a', '#fbf1e1')}</defs>
  ${shadow}
  <path d="M78 98 C94 86 120 78 150 74 C190 68 230 78 244 104 C252 120 250 134 262 148 C238 150 220 152 196 151 C150 152 118 138 100 122 C90 112 80 106 78 98 Z" fill="url(#${uid}-b)"/>
  ${[[150, 74], [172, 70], [196, 70], [220, 76]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="5" fill="#f3d6b0"/>`).join('')}
  <g fill="none" stroke="#c98f5e" stroke-width="2" stroke-linecap="round" opacity="0.75">
    <path d="M100 86 C106 96 106 108 100 118"/>
    <path d="M124 79 C134 94 134 116 124 132"/>
    <path d="M154 74 C168 96 166 124 152 144"/>
  </g>
  <path d="M176 98 C204 88 236 100 242 120 C246 136 238 146 222 147 C196 147 170 136 164 120 C160 108 166 102 176 98 Z" fill="#f4c9b0"/>
  <path d="M184 108 C204 102 226 110 228 124 C230 134 220 138 208 136 C192 134 178 126 176 118 C175 112 178 110 184 108 Z" fill="#d99c84"/>
  <path d="M196 116 C206 114 216 118 216 125 C214 130 204 130 198 127 C192 124 190 118 196 116 Z" fill="#b8735f" opacity="0.7"/>
  <path d="M176 98 C204 88 236 100 242 120 C246 136 238 146 222 147" fill="none" stroke="#fbf1e1" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M98 92 C116 82 138 78 158 77" fill="none" stroke="#fff" stroke-width="3" opacity="0.5" stroke-linecap="round"/>`,
};

/** SVG for a find (viewBox 0 0 320 180). `idPrefix` must be unique per rendered instance: gradient ids are global in HTML. */
export function findSvg(id: string, idPrefix: string): string {
  const def = findById(id);
  const build = FIND_ART[id];
  if (!def || !build) throw new Error(`no drawing for find ${id}`);
  return `<svg viewBox="0 0 320 180" role="img" aria-label="${def.name}" xmlns="http://www.w3.org/2000/svg">${build(`nbx-${idPrefix}`)}</svg>`;
}
