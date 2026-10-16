// make-brand.mjs - writes the brand files of the site into this folder: the mark (a gear drawn solid on the left and dashed on the right: what is published is
// drawn solid, what is estimated is dashed and said so), a flat version for small sizes, and the favicon.  node docs/brand/make-brand.mjs
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), r2 = (v) => Math.round(v * 100) / 100;
const N = 12, R_TIP = 26, R_ROOT = 20.6, BORE = 6.4, C = 32;      // teeth, tip radius, root radius, bore radius, centre of the 64 x 64 box
const pt = (r, deg) => [C + r * Math.sin(deg * Math.PI / 180), C - r * Math.cos(deg * Math.PI / 180)].map(r2);      // 0 deg is up, clockwise
let d = '';
for (let i = 0; i < N; i++) {
  const a = i * 360 / N, p = [pt(R_ROOT, a - 10.5), pt(R_TIP, a - 5.2), pt(R_TIP, a + 5.2), pt(R_ROOT, a + 10.5)];
  d += (i ? 'A' + R_ROOT + ' ' + R_ROOT + ' 0 0 1 ' + p[0].join(' ') : 'M' + p[0].join(' ')) + 'L' + p[1].join(' ') + 'L' + p[2].join(' ') + 'L' + p[3].join(' ');
}
d += 'A' + R_ROOT + ' ' + R_ROOT + ' 0 0 1 ' + pt(R_ROOT, -10.5).join(' ') + 'Z';
const ink = '#4fd1ff', warm = '#ffb347', paper = '#0a1828';

// the full mark: left half solid, right half dashed, a bore, and a ruler tick above the gear (the dimension that every number must be checked against)
const half = (cls, clip) => `<g clip-path="url(#${clip})"><path class="${cls}" d="${d}"/></g>`;
const mark = (colors) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="mechanism">
<title>mechanism</title>
<defs><clipPath id="L"><rect x="0" y="0" width="${C}" height="64"/></clipPath><clipPath id="R"><rect x="${C}" y="0" width="${C}" height="64"/></clipPath></defs>
<style>.s{fill:none;stroke:${colors.ink};stroke-width:2.6;stroke-linejoin:round}.e{fill:none;stroke:${colors.warm};stroke-width:2.9;stroke-linecap:round;stroke-dasharray:0.1 4.3}</style>
${half('s', 'L')}${half('e', 'R')}
<circle class="s" cx="${C}" cy="${C}" r="${BORE}"/>
</svg>
`;
writeFileSync(path.join(here, 'mark.svg'), mark({ ink, warm }));

// a flat version that stays readable at 16 px: the left half filled, the right half an outline
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="12" fill="${paper}"/>
<defs><clipPath id="L"><rect x="0" y="0" width="${C}" height="64"/></clipPath><clipPath id="R"><rect x="${C}" y="0" width="${C}" height="64"/></clipPath></defs>
<g transform="translate(5.6 5.6) scale(.825)"><g clip-path="url(#L)"><path d="${d}" fill="${ink}"/></g><g clip-path="url(#R)"><path d="${d}" fill="none" stroke="${warm}" stroke-width="4.2" stroke-linejoin="round"/></g><circle cx="${C}" cy="${C}" r="${BORE + 0.6}" fill="${paper}"/></g>
</svg>
`;
writeFileSync(path.join(here, 'favicon.svg'), favicon);

// the path itself, for the page to inline
writeFileSync(path.join(here, 'gear-path.txt'), d + '\n');
console.log('mark.svg, favicon.svg and gear-path.txt written; path length', d.length);
