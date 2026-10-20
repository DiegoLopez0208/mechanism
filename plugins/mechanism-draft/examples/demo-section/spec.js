/*
 * spec.js - Demo C: a stepped bracket cut in section, drawn by Mechanism Draft 0.2 from declared 2D geometry (kit/geom2d.js -> Paper).
 * SYNTHETIC: this is not a product and no number here is published by anyone. Every dimension is an ESTIMATED demonstration value
 * chosen to exercise the drawing and the checks (a stepped polygon, hatched material, enclosed bores and a channel, net area).
 * The drawing is the section plane only: no other view is deduced from it. No drawing code here.
 */
(function () {
  window.SPEC = {
    id: 'demo-section', fig: 'Demo C', kicker: 'Draft 0.2 / declared geometry', title: 'Stepped bracket, section A-A (demonstration)',
    sub: 'A synthetic part cut open: a stepped profile, hatched material, a pin bore, a cross hole and an internal channel.',
    presentation: { method: 'paper', background: 'ivory' },
    research: {
      sources: [{ id: 'draft-geometry', title: 'Mechanism Draft 0.2: parametric vector geometry (the data model of these demonstration parts)', url: 'https://github.com/DiegoLopez0208/mechanism', fetched: '2026-10-19', note: 'docs/draft-geometry.md in this repository: a design document that publishes no product dimensions' }],
      claims: [{ id: 'synthetic', conf: 'estimated', text: 'Every dimension of this bracket is a synthetic value chosen to exercise the geometry checks.', why: 'A demonstration part, not a product: nobody publishes these numbers.' }],
    },
    parts: [{
      id: 'bracket', name: 'Stepped bracket', kind: 'drawing', mat: 'steel', conf: 'estimated', claims: ['synthetic'],
      info: { title: 'Stepped bracket, section A-A', lines: ['three steps', 'a pin bore, a cross hole and a closed channel inside the material'] },
      p: {
        unit: 'mm',
        outline: { type: 'polygon', points: [[0, 0], [120, 0], [120, 30], [85, 30], [85, 55], [40, 55], [40, 80], [0, 80]] },
        holes: [
          { id: 'pin', type: 'circle', d: 12, at: [20, 60] },
          { id: 'cross', type: 'circle', d: 10, at: [102, 15] },
          { id: 'channel', type: 'rect', w: 50, h: 8, at: [60, 12] },
        ],
        lines: [
          { id: 'pin-h', type: 'segment', a: [8, 60], b: [32, 60], style: 'center' }, { id: 'pin-v', type: 'segment', a: [20, 48], b: [20, 72], style: 'center' },
          { id: 'cross-h', type: 'segment', a: [92, 15], b: [112, 15], style: 'center' }, { id: 'cross-v', type: 'segment', a: [102, 5], b: [102, 25], style: 'center' },
        ],
        section: { name: 'A-A', hatch: { angle: 45, pitch: 3 } },
      },
    }],
    paperScene: { kind: 'geometry' },
  };
})();
