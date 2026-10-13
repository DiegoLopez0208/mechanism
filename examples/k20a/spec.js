/*
 * spec.js - Honda K20A: inline four, 2.0 L, DOHC 16 valves. A crank-slider mechanism: the piston height comes from the exact formula
 * y = r cos a + sqrt(l^2 - r^2 sin^2 a), the firing order must be possible with the crank (the gate proves it) and the displacement is computed
 * from the drawn bore and stroke and compared with the published 1,998 cc. Run "node scripts/check-spec.mjs examples/k20a/spec.js".
 *
 * Frame: the crank axis is z, the cylinders point up (+y), cylinder k sits at z = (k - 1.5) * pitch. `orient` lays the engine on its side for the camera.
 */
(function () {
  const E = window.MX.spec.eng, RAD = Math.PI / 180;
  const BORE = 86, STROKE = 86, R = STROKE / 2, ROD = 138.98, DECK = 212, CH = DECK - R - ROD, PITCH = 96, THROWS = [0, 180, 180, 0], N = 4;
  const zk = (k) => (k - (N - 1) / 2) * PITCH, pinY = (k) => E.pinY(R, ROD, THROWS[k] * RAD), mid = (k) => (R * Math.cos(THROWS[k] * RAD) + pinY(k)) / 2;
  const VALVE_Y = DECK + 8, STEM = 90, CAM_R = 12, CAM_Y = VALVE_Y + STEM + CAM_R * 1.7, XIN = -26, XEX = 26;
  const parts = [];

  // block, head and pan wrap everything: they arrive last (late) and turn almost transparent while the engine runs (cutaway)
  parts.push(
    { id: 'block', name: 'Cylinder block', kind: 'engblock', p: { w: 112, l: N * PITCH + 6, h: DECK + 10, r: 6, holes: [0, 1, 2, 3].map((k) => [zk(k), BORE / 2, 0]) }, mat: 'aluminum-dark', at: [0, (DECK - 10) / 2, 0], explode: [0, 0, 0], late: true, cutaway: 0.8, conf: 'estimated', claims: ['bore', 'deck'],
      info: { title: 'Cylinder block', lines: ['Four bores of 86 mm', 'Deck 212 mm above the crank axis', 'Outer shape and bore pitch are estimated'], conf: ['spec', 'spec', 'estimated'] } },
    { id: 'head', name: 'Cylinder head', kind: 'engblock', p: { w: 112, l: N * PITCH + 6, h: 88, r: 6 }, mat: 'aluminum', at: [0, DECK + 44, 0], explode: [0, 215, 0], late: true, cutaway: 0.8, conf: 'estimated', claims: ['valves4'],
      info: { title: 'Cylinder head', lines: ['DOHC, four valves per cylinder', 'Pent-roof chamber not drawn'], conf: ['spec', 'estimated'] } },
    { id: 'pan', name: 'Oil pan', kind: 'engblock', p: { w: 112, l: N * PITCH + 6, h: 86, r: 6 }, mat: 'aluminum-dark', at: [0, -10 - 43, 0], explode: [0, -125, 0], late: true, cutaway: 0.8, conf: 'estimated', why: 'No source gives the pan.',
      info: { title: 'Oil pan', lines: ['Drawn only to close the crankcase', 'Shape and depth are estimated'], conf: ['estimated', 'estimated'] } },
    { id: 'crank', name: 'Crankshaft', kind: 'crankshaft', p: { n: N, pitch: PITCH, stroke: STROKE, throws: THROWS, mainR: 27.5, pinR: 22.5, pinLen: 22, webT: 11 }, mat: 'steel', at: [0, 0, 0], explode: [0, -62, 0], engine: { role: 'crank' }, conf: 'derived', claims: ['stroke', 'throws'],
      info: { title: 'Crankshaft', lines: ['Stroke 86 mm: throw radius 43 mm', 'Throws 0 / 180 / 180 / 0 degrees (cylinders 1 and 4 up together)', 'Journal diameters are estimated'], conf: ['spec', 'derived', 'estimated'] } },
    { id: 'flywheel', name: 'Flywheel', kind: 'disc', p: { r: 130, w: 26, bore: 27.5 }, mat: 'steel-dark', at: [0, 0, N * PITCH / 2 + 29], explode: [0, 0, 70], engine: { role: 'crank' }, conf: 'estimated', why: 'No source gives its size.',
      info: { title: 'Flywheel', lines: ['Turns with the crankshaft', 'Size is estimated'], conf: ['derived', 'estimated'] } },
  );
  for (let k = 0; k < N; k++) {
    const n = k + 1, z = zk(k);
    parts.push(
      { id: 'rod' + n, name: 'Connecting rod ' + n, kind: 'conrod', p: { l: ROD, bigR: 31, bigBore: 22.8, smallR: 15, smallBore: 10.1, t: 20 }, mat: 'steel', at: [R * Math.sin(THROWS[k] * RAD) / 2, mid(k), z], explode: [0, 70, 0], engine: { role: 'rod', cyl: n }, conf: 'estimated', claims: ['rod'],
        info: { title: 'Connecting rod ' + n, lines: ['Centre to centre 138.98 mm', 'Not published by Honda: the length of the replacement H-beam rods sold for the K20A2'], conf: ['estimated', 'estimated'] } },
      { id: 'piston' + n, name: 'Piston ' + n, kind: 'piston', p: { d: BORE - 0.04, h: CH + 28, ch: CH }, mat: 'aluminum', at: [0, pinY(k), z], explode: [0, 140, 0], engine: { role: 'piston', cyl: n }, conf: 'estimated', claims: ['bore', 'rod'],
        info: { title: 'Piston ' + n, lines: ['Diameter 85.96 mm (bore less an estimated clearance)', 'Compression height 30.02 mm: what is left of the 212 mm deck after crank radius and rod'], conf: ['estimated', 'estimated'] } },
      { id: 'pin' + n, name: 'Piston pin ' + n, kind: 'pin', p: { r: 10, len: 70 }, mat: 'chrome', at: [0, pinY(k), z], explode: [0, 140, 0], engine: { role: 'piston', cyl: n }, conf: 'estimated', why: 'No source gives the pin.', tour: false,
        info: { title: 'Piston pin ' + n, lines: ['20 mm, estimated'], conf: ['estimated'] } },
    );
  }
  // the red cam cover of the Type R engines, with its lettering: livery drawn from memory of product photos (ESTIMATED)
  parts.push({ id: 'cover', name: 'Cam cover', kind: 'engblock', p: { w: 112, l: N * PITCH + 6, h: 62, r: 6 }, mat: 'honda-red', at: [0, CAM_Y + 2, 0], explode: [0, 360, 0], late: true, cutaway: 0.9, conf: 'estimated', claims: ['livery'],
    decals: [{ face: '+y', at: [0, 31.2, 0], w: 340, h: 92, px: 5, rot: -90, items: [{ t: 'text', s: 'HONDA', x: 0, y: 16, size: 42, weight: 800, spacing: 12, color: '#f4f4f1' }, { t: 'text', s: 'i-VTEC', x: -52, y: -26, size: 25, weight: 700, spacing: 2, color: '#f4f4f1', skew: 0.18 }, { t: 'text', s: 'DOHC', x: 64, y: -26, size: 19, weight: 700, spacing: 6, color: '#f4f4f1' }, { t: 'rect', x: 0, y: -8, w: 270, h: 1.6, color: '#f4f4f1', a: 0.7 }] }],
    info: { title: 'Cam cover', lines: ['Red wrinkle-finish cover with HONDA and i-VTEC lettering', 'Colour and lettering are estimated: none of the opened sources describes them'], conf: ['estimated', 'estimated'] } });
  [['in', XIN, 14, 'intake'], ['ex', XEX, 12, 'exhaust']].forEach(([tag, x, hr, kind]) => {
    parts.push({ id: 'cam-' + tag, name: (kind === 'intake' ? 'Intake' : 'Exhaust') + ' camshaft', kind: 'camshaft', p: { len: N * PITCH + 20, r: CAM_R, lobes: [0, 1, 2, 3].flatMap((k) => [-16, 16].map((dz) => ({ z: zk(k) + dz, cyl: k + 1, w: 9 }))) }, mat: 'steel-dark', at: [x, CAM_Y, 0], explode: [x * 0.6, 335, 0], engine: { role: 'cam', valve: kind }, conf: 'estimated', claims: ['valvetrain'],
      info: { title: (kind === 'intake' ? 'Intake' : 'Exhaust') + ' camshaft', lines: ['Turns at half the crank speed', 'Each lobe is placed so its tip pushes the valve in the window it should be open', 'Timing and lift are estimated'], conf: ['derived', 'derived', 'estimated'] } });
    for (let k = 0; k < N; k++) [-16, 16].forEach((dz, j) => parts.push({ id: 'v-' + tag + '-' + (k + 1) + 'ab'[j], name: (kind === 'intake' ? 'Intake' : 'Exhaust') + ' valve ' + (k + 1) + 'ab'[j], kind: 'valve', p: { headR: hr, stemR: 3, len: STEM }, mat: kind === 'intake' ? 'chrome' : 'oxide', at: [x, VALVE_Y, zk(k) + dz], explode: [x * 0.4, 265, 0], engine: { role: 'valve', cyl: k + 1, valve: kind }, conf: 'estimated', claims: ['valves4', 'valvetrain'], tour: false,
      info: { title: (kind === 'intake' ? 'Intake' : 'Exhaust') + ' valve', lines: ['Two intake and two exhaust valves per cylinder: 16 in all', 'Sizes are estimated'], conf: ['spec', 'estimated'] } }));
  });

  window.SPEC = {
    id: 'k20a', fig: 'Fig 8', kicker: 'REAL ENGINE', title: 'Honda K20A', sub: 'Inline four, 2.0 L. The firing order is checked against the crank.', orient: [0, 90, 0],
    research: {
      sources: [
        { id: 'wiki-k', title: 'Honda K engine - Wikipedia', url: 'https://en.wikipedia.org/wiki/Honda_K_engine', fetched: '2026-10-13', note: 'K20A: bore 86 mm, stroke 86 mm, 1,998 cc, DOHC with 4 valves per cylinder, deck height 212 mm. It does NOT give the connecting rod length, the firing order, the journals or the bore spacing.' },
        { id: 'wiki-fo', title: 'Firing order - Wikipedia', url: 'https://en.wikipedia.org/wiki/Firing_order', fetched: '2026-10-13', note: 'Straight-four engines typically use 1-3-4-2; four-stroke firing interval is 720 degrees divided by the number of cylinders. It does not say which cylinders share a crank throw.' },
        { id: 'rerev', title: 'Honda 2.0L i-VTEC firing order - rerev', url: 'https://rerev.com/firing-orders/honda/2-0l-i-vtec/', fetched: '2026-10-13', note: 'Lists 1-3-4-2 for the Honda 2.0 L i-VTEC. Read from the search result; the page itself was not opened.' },
        { id: 'sf-rod', title: 'SpeedFactory K20A/K20Z H-beam connecting rods - Hybrid Racing', url: 'https://www.hybrid-racing.com/products/speedfactory-h-beam-connecting-rods-k20a-k20z', fetched: '2026-10-13', note: 'Aftermarket rods sold for the K20A2 / K20Z: 138.98 mm (5.472 in) centre to centre. A replacement part, not a Honda drawing.' },
      ],
      claims: [
        { id: 'bore', conf: 'spec', text: 'Bore 86 mm.', src: ['wiki-k'] },
        { id: 'stroke', conf: 'spec', text: 'Stroke 86 mm, so the crank throw radius is 43 mm.', src: ['wiki-k'] },
        { id: 'disp', conf: 'spec', text: 'Displacement 1,998 cc.', src: ['wiki-k'] },
        { id: 'deck', conf: 'spec', text: 'Deck height 212 mm (crank axis to the top of the block).', src: ['wiki-k'] },
        { id: 'valves4', conf: 'spec', text: 'DOHC, 4 valves per cylinder (16 in all).', src: ['wiki-k'] },
        { id: 'firing', conf: 'spec', text: 'Firing order 1-3-4-2.', src: ['rerev', 'wiki-fo'] },
        { id: 'throws', conf: 'derived', text: 'Crank throws at 0 / 180 / 180 / 0 degrees: cylinders 1 and 4 reach the top together, 2 and 3 together.', src: ['wiki-fo'], cross: 'A four-stroke four fires every 720 / 4 = 180 degrees (Wikipedia). The gate checks that the published order 1-3-4-2 is possible with exactly these throws, and that 1-2-3-4 would not be.' },
        { id: 'rod', conf: 'estimated', text: 'Connecting rod 138.98 mm centre to centre.', why: 'Honda does not publish it. This is the length of replacement rods sold for the K20A2; it leaves a 30.02 mm piston compression height under the 212 mm deck, a plausible number but not a published one.' },
        { id: 'livery', conf: 'estimated', text: "Red cam cover with white HONDA and i-VTEC lettering.", why: "Drawn from memory of product photos. None of the opened sources describes the finish or the lettering; only type and colour are used." },
        { id: 'valvetrain', conf: 'estimated', text: 'Valve timing (exhaust opens 140 and closes 370 degrees after firing TDC; intake opens 350 and closes 560) and a 10 mm lift.', why: 'Honda publishes neither for the base cam, and i-VTEC changes them with revs. These are textbook values so the cams and valves move in the right order.' },
      ],
    },
    parts,
    mechanism: {
      engine: { cylinders: N, bore: BORE, stroke: STROKE, rod: ROD, deck: DECK, ch: CH, pitch: PITCH, throws: THROWS, firing: [1, 3, 4, 2], valves: { exhaust: { open: 140, close: 370, lift: 10 }, intake: { open: 350, close: 560, lift: 10 } } },
      drive: { rpm: 40, modes: [
        { id: 'disp', label: 'Displacement', metric: 'displacement', unit: 'cc', formula: '4 x pi / 4 x 86 mm x 86 mm x 86 mm', publish: { value: 1998, tol: 1, text: '1,998 cc', claim: 'disp' } },
        { id: 'firing', label: 'Firing order', metric: 'firing', formula: 'one power stroke every 180 degrees of crank', publish: { text: '1-3-4-2', claim: 'firing' } },
      ] },
    },
    director: { hold: 4, zoom: 1.2, modeDur: 6.2, tourDur: 3.0, tour: ['block', 'crank', 'rod1', 'piston1', 'cam-in', 'v-in-1a', 'head', 'flywheel'] },
  };
})();
