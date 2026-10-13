/*
 * spec.js - Fig 5: interruptor mecanico Cherry MX2A Red como SPEC declarativo, con un mecanismo de PRESION en vez de engranajes.
 *
 * SPEC       recorrido 4 mm, pre-recorrido (actuacion) 2 mm, fuerzas 30 / 45 / 100 cN, caja 15,63 x 15,63 x 18,5 mm, materiales, corte de placa 14 mm.
 * DERIVED    lo que daria un resorte lineal por los dos primeros puntos: 60 cN al final, no los 100 cN publicados. El spec lo declara en vez de taparlo.
 * ESTIMATED  espesores, carcasas internas, resorte, contactos y pines: el datasheet no trae dibujo mecanico.
 */
window.SPEC = (() => {
  return {
    brand: { accent: '#d0102a' }, id: 'switch', up: 'z', fig: 'Fig 5', kicker: 'KEY SWITCH', title: 'Cherry MX2A Red', sub: 'A linear switch: 2 mm to actuate, 4 mm to bottom out.',
    recognize: {"object":"Cherry MX2A Red key switch","iconic":[{"text":"red stem with the cross","parts":["stemBody","stemCap"]},{"text":"clear upper housing","parts":["top"]},{"text":"coil return spring","parts":["spring"]},{"text":"two metal pins under the base","parts":["pinA","pinB"]}],"blind":{"answer":"Cherry MX-style linear switch, red stem (Cherry MX Red likely)","judge":"a fresh model with no context, shown a label-free still (scripts/stranger.mjs)","date":"2026-10-13","ok":true}},
    research: {
      sources: [
        { id: 'cherry-ds', title: 'CHERRY MX2A RED datasheet (EN)', url: 'https://cdn.sparkfun.com/assets/a/9/b/6/2/MX2A_RED-Datasheet-EN_US.pdf', fetched: '2026-10-12', note: 'A table of numbers, no mechanical drawing. Read page by page from the PDF (data/switch/ref/mx2a-red.txt).' },
        { id: 'cherry-web', title: 'CHERRY MX2A RED product page', url: 'https://www.cherry.de/en-gb/product/mx2a-red', fetched: '2026-10-12', note: 'Lists the stainless steel spring, the gold crosspoint contact and the precision upper housing; quoted from the search result.' },
        { id: 'kbd-news', title: 'kbd.news, Cherry MX Red (PCB-mount) switch', url: 'https://kbd.news/switch/Cherry-MX-Red-PCB-mount-switch-422.html', fetched: '2026-10-12', note: 'A database, third party: used only for the stem material (POM) of the classic MX Red.' },
        { id: 'deskthority', title: 'Deskthority, MX plate cutout thread', url: 'https://deskthority.net/viewtopic.php?p=429001', fetched: '2026-10-12', note: 'Cutout 14 +/- 0.05 mm square and 19.05 mm key spacing, as in Cherry’s own mounting spec.' },
      ],
      claims: [
        { id: 'travel', conf: 'spec', text: 'Total travel 4 mm, pre-travel 2 mm, linear characteristic, no click.', src: ['cherry-ds'] },
        { id: 'forces', conf: 'spec', text: 'Initial force 30 cN, actuation force 45 cN, final force 100 cN.', src: ['cherry-ds'] },
        { id: 'size', conf: 'spec', text: 'Width 15.63 mm, depth 15.63 mm, total height 18.5 mm; red plunger, transparent cover.', src: ['cherry-ds'] },
        { id: 'livery', conf: 'estimated', text: "The top of the housing carries the CHERRY wordmark.", why: "Drawn from memory of the product. The datasheet and the other opened sources do not describe the print; only type is used." },
        { id: 'cutout', conf: 'spec', text: 'Plate cutout 14.0 mm square (tolerance 0.05 mm); key pitch 19.05 mm.', src: ['deskthority'] },
        { id: 'materials', conf: 'spec', text: 'Stem in POM, spring in stainless steel, gold crosspoint contact, precision plastic upper housing.', src: ['cherry-web', 'kbd-news'] },
        { id: 'linear', conf: 'derived', text: 'F = 30 + 7.5 x gives 45 cN at 2 mm (matches) and 60 cN at 4 mm (the datasheet says 100 cN).', src: ['cherry-ds'], cross: 'Slope 7.5 cN/mm from the first two published points; the third point misses by 40 cN, so the three numbers cannot come from one linear spring.' },
        { id: 'internal', conf: 'estimated', text: 'Housing walls, stem body, contact leaves, spring wire and diameter, pins and their positions.', why: 'The datasheet has no mechanical drawing; the sizes are chosen to fit inside the published 15.63 x 15.63 x 18.5 mm envelope.' },
      ],
    },
    parts: [
      { id: 'pinA', name: 'PCB pin A', kind: 'pin', p: { r: 0.75, len: 3.3 }, mat: 'brass', at: [-3.81, 2.54, 1.65], explode: [0, 0, -16], conf: 'estimated', claims: ['internal'], tour: false },
      { id: 'pinB', name: 'PCB pin B', kind: 'pin', p: { r: 0.75, len: 3.3 }, mat: 'brass', at: [2.54, 5.08, 1.65], explode: [0, 0, -16], conf: 'estimated', claims: ['internal'], tour: false },
      { id: 'bottom', name: 'Bottom housing', kind: 'box', p: { w: 15.63, d: 15.63, h: 5.7, wall: 1.0, floor: 1.2, r: 0.8 }, mat: 'black', at: [0, 0, 6.15], explode: [0, 0, -8], params: {"w":{"value":15.63,"unit":"mm","conf":"spec","claim":"size","tol":0.005},"d":{"value":15.63,"unit":"mm","conf":"spec","claim":"size","tol":0.005},"h":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"},"wall":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"},"floor":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"}}, conf: 'spec', claims: ['size', 'materials'], info: { title: 'Bottom housing', lines: ['footprint 15.63 x 15.63 mm', 'wall and height are estimates'], conf: ['spec', 'estimated'] } },
      { id: 'leafA', name: 'Contact leaf A', kind: 'block', p: { w: 0.3, d: 4.5, h: 6.2, r: 0.1 }, mat: 'gold', at: [-4.2, 0.4, 7.7], explode: [-9, 0, 4], conf: 'estimated', claims: ['internal', 'materials'], info: { title: 'Gold crosspoint leaves', lines: ['two leaves that touch when', 'the stem passes 2.0 mm'], conf: ['estimated'] } },
      { id: 'leafB', name: 'Contact leaf B', kind: 'block', p: { w: 0.3, d: 4.5, h: 5.4, r: 0.1 }, mat: 'gold', at: [4.0, 0.4, 7.3], explode: [9, 0, 4], conf: 'estimated', claims: ['internal', 'materials'], tour: false },
      { id: 'spring', name: 'Return spring', kind: 'spring', p: { r: 3.5, wire: 0.45, turns: 9, len: 9.5 }, mat: 'steel', at: [0, 0, 9.25], explode: [0, 0, 8], slide: { k: -0.5 }, compress: { free: 9.5 }, params: {"r":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"},"wire":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"},"turns":{"unit":"","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"},"len":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"}}, conf: 'estimated', claims: ['materials', 'internal'], info: { title: 'Return spring', lines: ['stainless steel (published)', 'diameter and turns: estimates'], conf: ['spec', 'estimated'] } },
      { id: 'stemBody', name: 'Stem body', kind: 'block', p: { w: 4.4, d: 4.4, h: 5.5, r: 0.5 }, mat: 'pom-red', at: [0, 0, 11.75], explode: [0, 0, 18], slide: { k: -1 }, params: {"w":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"},"d":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"},"h":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"}}, conf: 'spec', claims: ['size', 'materials'], tour: false },
      { id: 'stemCap', name: 'Stem cross', kind: 'cross', p: { arm: 4.0, thick: 1.35, len: 4.0 }, mat: 'pom-red', at: [0, 0, 16.5], explode: [0, 0, 28], slide: { k: -1 }, params: {"arm":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"},"thick":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"},"len":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"}}, conf: 'spec', claims: ['size', 'materials'], info: { title: 'Red stem (POM)', lines: ['slides 4 mm; the top is at 18.5 mm', 'cross arms 4.0 x 1.35: estimate'], conf: ['spec', 'estimated'] } },
      { id: 'top', name: 'Top housing', kind: 'box', p: { w: 14.0, d: 14.0, h: 5.4, wall: 0.9, r: 0.7 }, mat: 'glass', at: [0, 0, 11.7], explode: [0, 0, 40], params: {"w":{"value":14,"unit":"mm","conf":"spec","claim":"cutout","tol":0.05},"d":{"value":14,"unit":"mm","conf":"spec","claim":"cutout","tol":0.05},"h":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"},"wall":{"unit":"mm","conf":"estimated","claim":"internal","why":"The datasheet has no mechanical drawing: chosen to fit inside the published envelope"}}, conf: 'spec', claims: ['cutout', 'materials', 'livery'], decals: [{ face: '+z', at: [0, -5.1, 2.72], w: 12, h: 3, px: 40, items: [{ t: 'text', s: 'CHERRY', x: 0, y: 0, size: 1.9, weight: 800, spacing: 0.4, color: '#17181b' }] }], info: { title: 'Top housing', lines: ['14.0 mm: the plate cutout', 'transparent cover (RGB)'], conf: ['spec'] } },
    ],
    mechanism: {
      press: {
        travel: 4.0, actuation: 2.0, unit: 'mm', forceUnit: 'cN', force: [[0, 30], [2, 45], [4, 100]],
        note: 'The first two points fit a straight spring (7.5 cN per mm); the last one does not. A coil spring alone cannot do that, so the published 100 cN most likely includes the stem hitting the housing. That is our inference, not Cherry’s statement.',
      },
      drive: {
        modes: [
          { id: 'pre', label: 'Pre-travel', from: 0, to: 2.0, publish: { value: 2.0, text: '2.0 mm', claim: 'travel' }, formula: 'the contact closes at the actuation point' },
          { id: 'full', label: 'Bottom out', from: 2.0, to: 4.0, publish: { value: 4.0, text: '4.0 mm', claim: 'travel' }, formula: 'the stem lands on the housing' },
          { id: 'rel', label: 'Release', from: 4.0, to: 0, formula: 'the spring pushes the stem back up' },
        ],
      },
    },
    director: { hold: 2.5, modeDur: 3.2, tourDur: 3.2 },
  };
})();
