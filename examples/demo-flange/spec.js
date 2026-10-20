/*
 * spec.js - Demo B: a circular flange drawn by Mechanism Draft 0.2 from declared 2D geometry (kit/geom2d.js -> Paper).
 * SYNTHETIC: this is not a product and no number here is published by anyone. Every dimension is an ESTIMATED demonstration value
 * chosen to exercise the drawing and the checks (a polar bolt pattern inside the rim and clear of the bore, net area). No drawing code here.
 */
(function () {
  window.SPEC = {
    id: 'demo-flange', fig: 'Demo B', kicker: 'Draft 0.2 / declared geometry', title: 'Circular flange (demonstration)',
    sub: 'A synthetic part: a round flange with a centre bore and six bolt holes on a pitch circle, drawn from data alone.',
    presentation: { method: 'paper', background: 'ivory' },
    research: {
      sources: [{ id: 'draft-geometry', title: 'Mechanism Draft 0.2: parametric vector geometry (the data model of these demonstration parts)', url: 'https://github.com/DiegoLopez0208/mechanism', fetched: '2026-10-19', note: 'docs/draft-geometry.md in this repository: a design document that publishes no product dimensions' }],
      claims: [{ id: 'synthetic', conf: 'estimated', text: 'Every dimension of this flange is a synthetic value chosen to exercise the geometry checks.', why: 'A demonstration part, not a product: nobody publishes these numbers.' }],
    },
    parts: [{
      id: 'flange', name: 'Circular flange', kind: 'drawing', mat: 'steel', conf: 'estimated', claims: ['synthetic'],
      info: { title: 'Circular flange', lines: ['a centre bore', 'six bolt holes equally spaced on a pitch circle'] },
      p: {
        unit: 'mm', thickness: 16,
        outline: { type: 'circle', d: 140 },
        holes: [{ id: 'bore', type: 'circle', d: 50 }],
        patterns: [{ id: 'bolts', type: 'polar', of: { type: 'circle', d: 11 }, n: 6, pcd: 110, start: 90 }],
        lines: [{ id: 'axis-x', type: 'segment', a: [-78, 0], b: [78, 0], style: 'center' }, { id: 'axis-y', type: 'segment', a: [0, -78], b: [0, 78], style: 'center' }],
      },
    }],
    paperScene: { kind: 'geometry' },
  };
})();
