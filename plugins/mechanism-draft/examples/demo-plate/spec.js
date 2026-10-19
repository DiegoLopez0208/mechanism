/*
 * spec.js - Demo A: a mounting plate drawn by Mechanism Draft 0.2 from declared 2D geometry (kit/geom2d.js -> Paper).
 * SYNTHETIC: this is not a product and no number here is published by anyone. Every dimension is an ESTIMATED demonstration value
 * chosen to exercise the drawing and the checks (holes inside the material, no overlap, net area). There is no drawing code here.
 * Run "node scripts/check-spec.mjs examples/demo-plate/spec.js" and "node scripts/render.mjs examples/demo-plate/index.html".
 */
(function () {
  window.SPEC = {
    id: 'demo-plate', fig: 'Demo A', kicker: 'Draft 0.2 / declared geometry', title: 'Mounting plate (demonstration)',
    sub: 'A synthetic part: four fixing holes, a cable window, a pilot hole and a row of vents, drawn from data alone.',
    presentation: { method: 'paper', background: 'ivory' },
    research: {
      sources: [{ id: 'draft-geometry', title: 'Mechanism Draft 0.2: parametric vector geometry (the data model of these demonstration parts)', url: 'https://github.com/DiegoLopez0208/mechanism', fetched: '2026-10-19', note: 'docs/draft-geometry.md in this repository: a design document that publishes no product dimensions' }],
      claims: [{ id: 'synthetic', conf: 'estimated', text: 'Every dimension of this plate is a synthetic value chosen to exercise the geometry checks.', why: 'A demonstration part, not a product: nobody publishes these numbers.' }],
    },
    parts: [{
      id: 'plate', name: 'Mounting plate', kind: 'drawing', mat: 'aluminum', conf: 'estimated', claims: ['synthetic'],
      info: { title: 'Mounting plate', lines: ['four fixing holes on a rectangle', 'a rounded cable window, a pilot hole and five vents in a row'] },
      p: {
        unit: 'mm', thickness: 4,
        outline: { type: 'rect', w: 160, h: 100, r: 6 },
        holes: [
          { id: 'fix1', type: 'circle', d: 6.6, at: [-68, -38] }, { id: 'fix2', type: 'circle', d: 6.6, at: [68, -38] },
          { id: 'fix3', type: 'circle', d: 6.6, at: [68, 38] }, { id: 'fix4', type: 'circle', d: 6.6, at: [-68, 38] },
          { id: 'window', type: 'rect', w: 44, h: 22, r: 4, at: [-20, 8] },
          { id: 'pilot', type: 'circle', d: 12, at: [38, 8] },
        ],
        patterns: [{ id: 'vent', type: 'linear', of: { type: 'circle', d: 5 }, n: 5, step: [11, 0], at: [-22, -30] }],
      },
    }],
    paperScene: { kind: 'geometry' },
  };
})();
