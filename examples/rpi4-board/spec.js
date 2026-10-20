/*
 * spec.js - Raspberry Pi 4 Model B: the board outline and its four mounting holes, as Mechanism Draft geometry (kit/geom2d.js), from
 * Raspberry Pi's own mechanical drawing. A REFERENCE drawing, not a manufacturing one: Raspberry Pi gives the size as approximate
 * ("approximately 85 mm x 56 mm") and publishes no tolerances.
 *
 * Sources, opened 2026-10-19 (the files are not copied into this repository; only the numbers, cited):
 *   PDF  RP-008343-DS-1 "raspberry-pi-4-mechanical-drawing.pdf" (the same file, byte for byte, is also published as
 *        RP-001185-MD-1; sha256 a5c88057...; PDF metadata: created 2019-05-20, printed from Allegro). One page, top view, mm:
 *        85 overall width (top), 56 overall height (right), "CORNER RADIUS = 3.0mm" (top right), 58 = 29 + 29 between the hole
 *        centres (top), 3.5 from the left edge to the left hole centres (top left and bottom left), 3.5 from the top edge and 3.5
 *        from the bottom edge to the hole centres (left), 49 between the top and bottom hole centres (left), "2.7" and "6" at the
 *        lower right hole (the drill and the copper pad around it).
 *   DXF  RP-008342-DS-1 "raspberry-pi-4-mechanical-drawing.dxf" (sha256 390b8a40...), units mm, origin at the bottom left corner:
 *        layer BOARD_OUTLINE, a closed polyline (3,0)-(82,0)-arc-(85,3)-(85,53)-arc-(82,56)-(3,56)-arc-(0,53)-(0,3)-arc, every arc
 *        90 degrees of radius 3; layer 0, circles of radius 1.35 and 3 at (3.5,3.5), (61.5,3.5), (3.5,52.5), (61.5,52.5).
 *   Both are Raspberry Pi's, from the same board design: the DXF is a cross-check of the PDF, not independent evidence. The gate
 *   compares the hole pitch from the DXF coordinates with the pitch printed on the PDF; declared as the same source, that makes the
 *   verdict CONSISTENT, not VERIFIED.
 * Model coordinates are the DXF's: origin at the bottom left corner of the board, x right, y up, mm.
 * OMITTED (not geometry of the board outline, or not dimensioned for it): the 6 mm copper pads (no material is removed), every
 * connector, component and Z height, the PCB thickness (not on this drawing), and any tolerance (none is published).
 */
(function () {
  const PDF = 'rpi-md-pdf', DXF = 'rpi-md-dxf';
  const HOLES = [['h-bl', 3.5, 3.5], ['h-br', 61.5, 3.5], ['h-tl', 3.5, 52.5], ['h-tr', 61.5, 52.5]];      // DXF centres, mm
  // which claim gives each hole position: the PDF prints 3.5 from the left, bottom and top edges; 61.5 and 52.5 are 3.5 + 58 and 3.5 + 49
  const posClaim = (v) => (v === 3.5 ? 'datums' : 'datums-far');
  window.SPEC = {
    id: 'rpi4-board', fig: 'Draft / RPi 4B', kicker: 'Mechanism Draft 0.4 / a real board', title: 'Raspberry Pi 4 Model B: PCB outline',
    sub: 'The PCB outline and its four mounting holes, from Raspberry Pi\'s mechanical drawing. A reference drawing: the size is approximate and no tolerance is published.',
    presentation: { method: 'paper', background: 'ivory' },
    research: {
      sources: [
        { id: PDF, title: 'Raspberry Pi 4 Model B mechanical drawing (PDF), RP-008343-DS-1', url: 'https://pip-assets.raspberrypi.com/categories/545-raspberry-pi-4-model-b/documents/RP-008343-DS-1-raspberry-pi-4-mechanical-drawing.pdf', fetched: '2026-10-19',
          note: 'one page, top view, dimensions in mm, no tolerances; byte-identical to RP-001185-MD-1 (pip-assets.raspberrypi.com/categories/559-mechanical/documents/RP-001185-MD-1-Mechanical Drawing.pdf); PDF created 2019-05-20' },
        { id: DXF, title: 'Raspberry Pi 4 Model B mechanical drawing (DXF), RP-008342-DS-1', url: 'https://pip-assets.raspberrypi.com/categories/545-raspberry-pi-4-model-b/documents/RP-008342-DS-1-raspberry-pi-4-mechanical-drawing.dxf', fetched: '2026-10-19',
          note: 'units mm, origin at the bottom left corner of the board; layers BOARD_OUTLINE and 0', derives: [PDF] },
        { id: 'rpi-docs', title: 'Raspberry Pi documentation: Raspberry Pi 4 Model B (Classic single-board computers)', url: 'https://www.raspberrypi.com/documentation/computers/sbcs.html', fetched: '2026-10-19',
          note: 'links RP-008343-DS (PDF) and RP-008342-DS (DXF) as the mechanical drawings of the Raspberry Pi 4B' },
      ],
      claims: [
        { id: 'size', conf: 'spec', text: 'The board is 85 mm wide and 56 mm high (overall dimensions 85 and 56 on the mechanical drawing).', src: [PDF] },
        { id: 'approx', conf: 'spec', text: 'Raspberry Pi gives the size as approximate: "The dimensions of Raspberry Pi 4B are approximately 85 mm x 56 mm."', src: ['rpi-docs'] },
        { id: 'corner', conf: 'spec', text: 'CORNER RADIUS = 3.0mm (the four corners of the board).', src: [PDF] },
        { id: 'drill', conf: 'spec', text: 'The mounting holes are 2.7 mm in diameter (dimension 2.7 at the lower right hole; the 6 mm dimension there is the copper pad around it).', src: [PDF] },
        { id: 'datums', conf: 'spec', text: 'The hole centres are 3.5 mm from the left edge, 3.5 mm from the bottom edge and 3.5 mm from the top edge; 58 mm apart horizontally (29 + 29) and 49 mm vertically.', src: [PDF] },
        { id: 'datums-far', conf: 'derived', text: 'The right hole centres are 3.5 + 58 = 61.5 mm from the left edge; the top ones 3.5 + 49 = 52.5 mm from the bottom edge.', src: [PDF], cross: 'the DXF has its hole circles at x = 61.5 mm and y = 52.5 mm (same maker, not independent)' },
        { id: 'pitch-x', conf: 'spec', text: 'The left and right hole centres are 58 mm apart.', src: [PDF] },
        { id: 'pitch-y', conf: 'spec', text: 'The bottom and top hole centres are 49 mm apart.', src: [PDF] },
        { id: 'dxf-holes', conf: 'spec', text: 'In the DXF the mounting holes are circles of radius 1.35 mm centred at (3.5, 3.5), (61.5, 3.5), (3.5, 52.5) and (61.5, 52.5) mm.', src: [DXF] },
        { id: 'dxf-outline', conf: 'spec', text: 'In the DXF the board outline runs from (0, 0) to (85, 56) mm with 90 degree corner arcs of radius 3 mm.', src: [DXF] },
      ],
    },
    // the hole pitch from the DXF coordinates, compared with the pitch printed on the PDF (same maker, same design: a cross-check)
    mechanism: {
      calc: { vars: {
        xl: { v: 3.5, claim: 'dxf-holes', label: 'left hole centre x (DXF)' }, xr: { v: 61.5, claim: 'dxf-holes', label: 'right hole centre x (DXF)' },
        yb: { v: 3.5, claim: 'dxf-holes', label: 'bottom hole centre y (DXF)' }, yt: { v: 52.5, claim: 'dxf-holes', label: 'top hole centre y (DXF)' },
      } },
      drive: { modes: [
        { id: 'pitch-x', label: 'Horizontal hole pitch', expr: 'xr - xl', digits: 2, publish: { value: 58, claim: 'pitch-x', tol: 0.005 }, formula: 'right centre x - left centre x (DXF) against 58 on the PDF' },
        { id: 'pitch-y', label: 'Vertical hole pitch', expr: 'yt - yb', digits: 2, publish: { value: 49, claim: 'pitch-y', tol: 0.005 }, formula: 'top centre y - bottom centre y (DXF) against 49 on the PDF' },
      ] },
    },
    parts: [{
      id: 'pcb', name: 'Raspberry Pi 4 Model B PCB', kind: 'drawing', conf: 'spec', claims: ['size', 'corner', 'drill', 'datums', 'dxf-outline', 'dxf-holes'],
      info: { title: 'Raspberry Pi 4 Model B: board outline', lines: ['85 x 56 mm, corners R3, four holes of 2.7 mm on a 58 x 49 mm pattern', 'reference only: approximate size, no published tolerance'] },
      p: {
        unit: 'mm',
        outline: { type: 'rect', w: 85, h: 56, r: 3, at: [42.5, 28] },      // the DXF's coordinates: the board spans (0, 0) to (85, 56)
        holes: HOLES.map(([id, x, y]) => ({ id, type: 'circle', d: 2.7, at: [x, y] })),
        lines: HOLES.flatMap(([id, x, y]) => [{ id: id + '-cx', type: 'segment', a: [x - 2.5, y], b: [x + 2.5, y], style: 'center' }, { id: id + '-cy', type: 'segment', a: [x, y - 2.5], b: [x, y + 2.5], style: 'center' }]),
      },
      // every drawn dimension, compared with what the PDF prints (positions are measured from the left and the bottom edge)
      params: Object.assign({
        'outline.w': { value: 85, unit: 'mm', conf: 'spec', claim: 'size' }, 'outline.h': { value: 56, unit: 'mm', conf: 'spec', claim: 'size' },
        'outline.r': { value: 3, unit: 'mm', conf: 'spec', claim: 'corner' },
      }, Object.fromEntries(HOLES.flatMap(([id, x, y]) => [
        [id + '.d', { value: 2.7, unit: 'mm', conf: 'spec', claim: 'drill' }],
        [id + '.x', { value: x, unit: 'mm', conf: x === 3.5 ? 'spec' : 'derived', claim: posClaim(x), tol: 0.001 }],
        [id + '.y', { value: y, unit: 'mm', conf: y === 3.5 ? 'spec' : 'derived', claim: posClaim(y), tol: 0.001 }]]))),
    }],
    paperScene: { kind: 'geometry' },
  };
})();
