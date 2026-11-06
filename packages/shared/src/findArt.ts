// Expedition find drawings, in the fish art's style: a 320×180 viewBox, a vertical body gradient from
// grad(), flat shapes layered back to front, and every id prefixed with the instance uid.

import { findById } from './expeditionFinds.ts';
import { grad } from './fishArt.ts';

export type FindBuilder = (uid: string) => string;

const shadow = '<ellipse cx="160" cy="156" rx="96" ry="9" fill="#000" opacity="0.12"/>';

// A closed, roughly elliptical outline with a bumpy (shell-like) edge, rotated by `rot` degrees.
function scallop(cx: number, cy: number, rx: number, ry: number, n: number, amp: number, rot = 0): string {
  const r = (rot * Math.PI) / 180;
  const pt = (a: number, k: number) => {
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    return `${(cx + x * Math.cos(r) - y * Math.sin(r)).toFixed(1)} ${(cy + x * Math.sin(r) + y * Math.cos(r)).toFixed(1)}`;
  };
  let d = `M${pt(0, 1)}`;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 1) / n) * 2 * Math.PI;
    const k = 1 + amp * (0.6 + (0.4 * ((i * 7) % 5)) / 4);
    d += ` Q${pt((a0 + a1) / 2, k)} ${pt(a1, i === n - 1 ? 1 : 1 - amp * 0.3 * (i % 2))}`;
  }
  return `${d} Z`;
}

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
  'reef-coral-coin': (uid) => `<defs>${grad(uid, '#e3c25e', '#d8b04a', '#f3dc8e')}</defs>
  ${shadow}
  <g transform="rotate(-14 160 88)">
    <rect x="160" y="26" width="11" height="124" fill="#a8842f"/>
    <ellipse cx="171" cy="88" rx="58" ry="62" fill="#a8842f"/>
    <ellipse cx="160" cy="88" rx="58" ry="62" fill="url(#${uid}-b)"/>
    <ellipse cx="160" cy="88" rx="55" ry="59" fill="none" stroke="#c49a3a" stroke-width="5" opacity="0.75"/>
    <ellipse cx="160" cy="88" rx="44" ry="48" fill="none" stroke="#c49a3a" stroke-width="2" opacity="0.7"/>
    <path d="M160 64 L166 80 L183 80 L169 90 L174 106 L160 96 L146 106 L151 90 L137 80 L154 80 Z" fill="#c9a03e" opacity="0.75"/>
    <path d="M160 68 L164 80 L160 78 Z" fill="#f3dc8e" opacity="0.7"/>
    <path d="M104 74 L109 78 L104 82 Z M196 38 L199 44 L193 43 Z M214 104 L208 106 L211 99 Z" fill="#9b7c2e"/>
    <path d="M118 46 C130 34 150 28 168 30" fill="none" stroke="#fff" stroke-width="3" opacity="0.5" stroke-linecap="round"/>
    <path d="M196 120 C206 110 212 98 213 86" fill="none" stroke="#f3dc8e" stroke-width="3" opacity="0.6" stroke-linecap="round"/>
  </g>
  <g transform="translate(20 -4)">
  <path d="M100 112 C98 96 112 90 122 96 C128 86 142 88 144 100 C156 98 162 110 156 120 C166 126 160 142 148 144 C140 152 124 152 116 144 C104 146 96 136 100 126 C94 122 94 114 100 112 Z" fill="#c95c6c"/>
  <circle cx="112" cy="106" r="10" fill="#e47c8a"/><circle cx="132" cy="100" r="9" fill="#e47c8a"/>
  <circle cx="124" cy="120" r="12" fill="#e47c8a"/><circle cx="146" cy="118" r="8" fill="#e47c8a"/>
  <circle cx="108" cy="128" r="8" fill="#e47c8a"/><circle cx="132" cy="138" r="9" fill="#e47c8a"/>
  <circle cx="150" cy="134" r="7" fill="#e47c8a"/>
  <g fill="#c95c6c"><circle cx="112" cy="107" r="1.8"/><circle cx="132" cy="101" r="1.8"/><circle cx="124" cy="121" r="2"/><circle cx="146" cy="119" r="1.6"/><circle cx="108" cy="129" r="1.6"/><circle cx="132" cy="139" r="1.8"/><circle cx="150" cy="135" r="1.5"/></g>
  <g fill="#f8c1c8" opacity="0.7"><circle cx="108" cy="102" r="2.5"/><circle cx="128" cy="96" r="2.2"/><circle cx="119" cy="115" r="3"/><circle cx="143" cy="114" r="2"/></g>
  </g>`,
  'reef-diver-mask': (uid) => `<defs>${grad(uid, '#7fd3e0', '#4fb3c4', '#c4eef4')}</defs>
  ${shadow}
  <path d="M228 96 C252 88 262 70 246 56 C234 46 212 46 196 54" fill="none" stroke="#3a3f45" stroke-width="10" stroke-linecap="round"/>
  <path d="M232 92 C250 84 256 70 244 60" fill="none" stroke="#4d535a" stroke-width="2" stroke-dasharray="4 5"/>
  <path d="M92 98 C72 100 62 112 63 128 C64 136 66 141 68 146" fill="none" stroke="#3a3f45" stroke-width="10"/>
  <path d="M62 145 L65 152 L68 147 L71 153 L74 146 Z" fill="#3a3f45"/>
  <path d="M88 102 C74 106 68 116 68 128" fill="none" stroke="#4d535a" stroke-width="2" stroke-dasharray="4 5"/>
  <rect x="84" y="88" width="14" height="20" rx="4" fill="#2b2f33"/><rect x="222" y="86" width="14" height="20" rx="4" fill="#2b2f33"/>
  <path d="M92 86 C92 68 112 62 160 62 C208 62 228 68 228 86 L228 116 C228 132 214 140 198 140 L182 140 C178 150 142 150 138 140 L122 140 C106 140 92 132 92 116 Z" fill="#2b2f33"/>
  <path d="M100 70 C124 64 196 64 220 70" fill="none" stroke="#535a62" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M102 84 C102 74 116 72 154 72 L154 128 C150 132 138 132 126 132 C110 132 102 126 102 114 Z" fill="url(#${uid}-b)" fill-opacity="0.8"/>
  <path d="M218 84 C218 74 204 72 166 72 L166 128 C170 132 182 132 194 132 C210 132 218 126 218 114 Z" fill="url(#${uid}-b)" fill-opacity="0.8"/>
  <path d="M112 112 L134 76 L146 76 L122 118 Z M176 112 L198 76 L206 76 L184 116 Z" fill="#fff" opacity="0.3"/>
  <path d="M108 86 C110 80 116 78 124 78" fill="none" stroke="#fff" stroke-width="3" opacity="0.6" stroke-linecap="round"/>
  <path d="M146 140 C150 146 170 146 174 140" fill="none" stroke="#454b52" stroke-width="2.5" stroke-linecap="round"/>`,
  'reef-empty-oyster': (uid) => `<defs>${grad(uid, '#8d8f86', '#6f7169', '#b4b6ad')}</defs>
  ${shadow}
  <path d="${scallop(176, 76, 66, 32, 18, 0.12, -24)}" fill="url(#${uid}-b)"/>
  <path d="${scallop(178, 77, 52, 22, 14, 0.05, -24)}" fill="#e9e6f0"/>
  <path d="M150 92 C166 80 196 66 216 62" fill="none" stroke="#d5d0e3" stroke-width="7" stroke-linecap="round" opacity="0.9"/>
  <path d="M160 70 C176 62 196 56 208 56" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
  <path d="M96 118 C98 106 110 100 122 104 L118 122 Z" fill="#6f7169"/>
  <path d="${scallop(164, 126, 74, 26, 22, 0.1)}" fill="url(#${uid}-b)"/>
  <path d="M100 136 C130 150 196 152 232 134 M108 142 C140 152 190 152 224 140" fill="none" stroke="#5d5f58" stroke-width="2" opacity="0.6"/>
  <ellipse cx="166" cy="121" rx="58" ry="17" fill="#e9e6f0"/>
  <path d="M116 124 C140 136 196 136 218 120 C200 130 140 130 116 124 Z" fill="#d5d0e3"/>
  <ellipse cx="174" cy="122" rx="12" ry="5.5" fill="#d5d0e3"/>
  <ellipse cx="174" cy="121" rx="8" ry="3" fill="#c4bed6"/>
  <path d="M128 114 C144 108 168 107 190 110" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
  <circle cx="108" cy="112" r="5" fill="#5d5f58"/>`,
  'reef-amphora': (uid) => `<defs>${grad(uid, '#c47a4f', '#b8683f', '#d99b74')}</defs>
  ${shadow}
  <g transform="translate(0 10) rotate(12 160 100)">
    <path d="M90 93 C86 70 112 64 128 76 M90 107 C86 130 112 136 128 124" fill="none" stroke="#a85e38" stroke-width="7" stroke-linecap="round"/>
    <path d="M236 93 L262 100 L236 107 Z" fill="#a85e38"/>
    <path d="M112 92 C124 80 136 64 166 62 C206 60 232 82 240 96 L240 104 C232 118 206 140 166 138 C136 136 124 120 112 108 Z" fill="url(#${uid}-b)"/>
    <path d="M76 93 L114 91 L114 109 L76 107 Z" fill="url(#${uid}-b)"/>
    <rect x="66" y="86" width="13" height="28" rx="4" fill="#b8683f"/>
    <rect x="68" y="88" width="4" height="24" rx="2" fill="#d99b74" opacity="0.7"/>
    <path d="M148 64 C155 84 155 116 148 136 L161 138 C168 116 168 84 161 62 Z" fill="#7a3b20"/>
    <path d="M172 62 C178 84 178 116 172 138" fill="none" stroke="#7a3b20" stroke-width="2.5" opacity="0.8"/>
    <path d="M136 74 C158 64 196 64 222 80" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.4"/>
  </g>
  <path d="M196 156 C204 140 228 136 246 144 C258 148 264 154 262 158 Z" fill="#d8c39a"/>
  <path d="M208 148 C220 144 236 145 248 150" fill="none" stroke="#efe0bd" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`,
  'reef-trident-tine': (uid) => `<defs>${grad(uid, '#e2c46e', '#d4b257', '#f2e2a8')}</defs>
  ${shadow}
  <g transform="translate(0 6)">
    <path d="M84 127 L172 119.7 L220.5 59.6 L231.5 68.4 L179.7 132.7 L84 141 L80 138 L85 135 L79 132 L84 129.5 Z" fill="url(#${uid}-b)"/>
    <path d="M84 141 L179.7 132.7 L231.5 68.4 L227.5 65.2 L176.5 128 L84 136 Z" fill="#b8963e" opacity="0.55"/>
    <path d="M84 126 L76 129.5 L82 132.5 L75 136 L81 139 L84 142 L91 138.5 L87 134 L91 129.5 Z" fill="#9b7c2e"/>
    <g transform="translate(226 64) rotate(-51.1)">
      <path d="M-4 -7 L-14 -17 L-1 -15 L32 0 L-1 15 L-14 17 L-4 7 Z" fill="url(#${uid}-b)"/>
      <path d="M-1 -12 L28 -1" stroke="#fff" stroke-width="2" opacity="0.5" stroke-linecap="round"/>
    </g>
    <path d="M172 119.7 L179.7 132.7" stroke="#b8963e" stroke-width="2" opacity="0.8"/>
    <path d="M92 130 L170 123.5 L214 69" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.5"/>
  </g>`,
  'reef-camera': (uid) => `<defs>${grad(uid, '#f6cf45', '#f2c230', '#fbe58f')}</defs>
  ${shadow}
  <path d="M98 124 C72 124 62 144 78 150 C92 154 104 144 100 130" fill="none" stroke="#2b2f33" stroke-width="4" stroke-linecap="round"/>
  <rect x="108" y="54" width="24" height="12" rx="4" fill="#2b2f33"/>
  <rect x="112" y="52" width="16" height="4" rx="2" fill="#535a62"/>
  <rect x="92" y="64" width="138" height="78" rx="18" fill="url(#${uid}-b)"/>
  <path d="M94 86 L228 86" stroke="#d9a920" stroke-width="2.5"/>
  <rect x="94" y="96" width="8" height="24" rx="3" fill="#d9a920"/>
  <rect x="196" y="70" width="22" height="12" rx="3" fill="#1f2a33"/>
  <rect x="199" y="72" width="7" height="4" rx="1.5" fill="#7fb3e0" opacity="0.6"/>
  <circle cx="164" cy="108" r="33" fill="#d9a920"/>
  <circle cx="164" cy="108" r="27" fill="#1f2a33"/>
  <circle cx="164" cy="108" r="18" fill="none" stroke="#33434f" stroke-width="3"/>
  <circle cx="164" cy="108" r="8" fill="#2c3a46"/>
  <ellipse cx="154" cy="97" rx="8" ry="5" fill="#7fb3e0" transform="rotate(-35 154 97)" opacity="0.9"/>
  <circle cx="174" cy="119" r="2.5" fill="#7fb3e0" opacity="0.7"/>
  <path d="M104 74 C112 68 124 67 134 68" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.55"/>`,
  'reef-toy-anchor': (uid) => `<defs>${grad(uid, '#d4574c', '#c9473d', '#e8857c')}</defs>
  ${shadow}
  <circle cx="160" cy="36" r="12" fill="none" stroke="url(#${uid}-b)" stroke-width="7"/>
  <rect x="152" y="46" width="16" height="96" rx="4" fill="url(#${uid}-b)"/>
  <path d="M104 100 C108 130 132 144 160 144 C188 144 212 130 216 100" fill="none" stroke="url(#${uid}-b)" stroke-width="13" stroke-linecap="round"/>
  <path d="M92 110 L102 82 L118 104 Z M228 110 L218 82 L202 104 Z" fill="url(#${uid}-b)"/>
  <rect x="120" y="58" width="80" height="11" rx="5.5" fill="url(#${uid}-b)"/>
  <circle cx="120" cy="63.5" r="7" fill="#c9473d"/><circle cx="200" cy="63.5" r="7" fill="#c9473d"/>
  <circle cx="160" cy="142" r="9" fill="#c9473d"/>
  <path d="M155 88 L163 84 L167 93 L161 101 L154 97 Z" fill="#c49a6c"/>
  <path d="M157 89 L158 98 M162 87 L164 97" stroke="#a87d50" stroke-width="1.2"/>
  <path d="M190 132 L200 126 L205 134 L196 140 Z" fill="#c49a6c"/>
  <path d="M134 60 L142 59 L144 66 L135 68 Z" fill="#c49a6c"/>
  <path d="M206 92 L212 88 L214 96 Z" fill="#c49a6c"/>
  <path d="M110 120 L117 117 L119 124 L112 127 Z" fill="#c49a6c"/>
  <path d="M156 50 L156 82 M156 104 L156 132" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/>
  <path d="M110 108 C116 126 130 134 146 137" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.35"/>`,
  'reef-brass-key': (uid) => `<defs>${grad(uid, '#d6ad4e', '#c49a3a', '#ebcf86')}</defs>
  ${shadow}
  <g transform="translate(160 86) rotate(28) scale(1.15)">
    <circle cx="-56" cy="-21" r="7" fill="none" stroke="url(#${uid}-b)" stroke-width="5"/>
    <circle cx="-56" cy="21" r="7" fill="none" stroke="url(#${uid}-b)" stroke-width="5"/>
    <circle cx="-77" cy="0" r="7" fill="none" stroke="url(#${uid}-b)" stroke-width="5"/>
    <circle cx="-56" cy="0" r="15" fill="none" stroke="url(#${uid}-b)" stroke-width="8"/>
    <rect x="-40" y="-4.5" width="114" height="9" rx="4" fill="url(#${uid}-b)"/>
    <rect x="-40" y="-8" width="7" height="16" rx="2" fill="#c49a3a"/>
    <rect x="-29" y="-7" width="5" height="14" rx="2" fill="#c49a3a"/>
    <path d="M44 4 L44 26 L50 26 L50 18 L56 18 L56 28 L63 28 L63 19 L70 19 L70 4 Z" fill="url(#${uid}-b)"/>
    <path d="M-22 -2 L68 -2" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
    <path d="M-66 -8 C-62 -13 -56 -14 -50 -12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    <g fill="#5f9e83" opacity="0.85"><ellipse cx="-44" cy="8" rx="3.5" ry="2.5"/><ellipse cx="8" cy="1.5" rx="5" ry="2.5"/><ellipse cx="22" cy="-1" rx="2.5" ry="2"/><ellipse cx="58" cy="22" rx="3" ry="2.5"/><ellipse cx="-80" cy="-4" rx="2.5" ry="2"/></g>
  </g>`,
};

/** SVG for a find (viewBox 0 0 320 180). `idPrefix` must be unique per rendered instance: gradient ids are global in HTML. */
export function findSvg(id: string, idPrefix: string): string {
  const def = findById(id);
  const build = FIND_ART[id];
  if (!def || !build) throw new Error(`no drawing for find ${id}`);
  return `<svg viewBox="0 0 320 180" role="img" aria-label="${def.name}" xmlns="http://www.w3.org/2000/svg">${build(`nbx-${idPrefix}`)}</svg>`;
}
