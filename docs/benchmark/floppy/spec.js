/*
 * spec.js - the 3.5-inch (90 mm) 1.44 MB high-density floppy disk, taken apart from its published standard (ECMA-125 = ISO/IEC 9529-1, ISO type 302).
 *
 * SPEC       every cartridge dimension (94 x 90 x 3.3 mm, hub window, head windows, locating and write-inhibit holes, hub, media, tracks), 300 rpm,
 *            MFM at 15,916 flux transitions per radian, 80 tracks per side, 18 sectors of 512 bytes. Source: ECMA-125 1st edition, Dec 1987, read page
 *            by page from the scanned PDF (it has no text layer), plus Wikipedia for the marketing and legacy numbers.
 * DERIVED    capacity (2 x 80 x 18 x 512), raw capacity, bit rate, bit cell, hub height, window centre, recorded bands.
 * ESTIMATED  everything the standard leaves to the maker: wall thickness, liner, shutter size, spring, write tab, hub hole placement, livery.
 *
 * Frame: the cartridge lies on the xy plane, origin at the hub centre, x runs from the shutter edge (x = -48.5) to the back (x = +45.5),
 * y across the 90 mm width, z is thickness (Side 0, with the hub window, is +z). All sizes in mm.
 */
(function () {
  const TAU = Math.PI * 2;
  // ---- polygon helpers (the kit's `profile` part extrudes one closed polygon; holes are joined to the outline by a zero-width bridge) ----
  const fillet = (corners, n = 6) => {
    const out = [];
    corners.forEach((c, i) => {
      const a = corners[(i + corners.length - 1) % corners.length], b = corners[(i + 1) % corners.length], r = c.r || 0;
      if (!r) { out.push([c.x, c.y]); return; }
      const v1 = [a.x - c.x, a.y - c.y], v2 = [b.x - c.x, b.y - c.y], l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
      const u1 = [v1[0] / l1, v1[1] / l1], u2 = [v2[0] / l2, v2[1] / l2], ang = Math.acos(u1[0] * u2[0] + u1[1] * u2[1]), t = r / Math.tan(ang / 2);
      const p1 = [c.x + u1[0] * t, c.y + u1[1] * t], p2 = [c.x + u2[0] * t, c.y + u2[1] * t], bis = [u1[0] + u2[0], u1[1] + u2[1]], bl = Math.hypot(...bis), d = r / Math.sin(ang / 2);
      const cc = [c.x + bis[0] / bl * d, c.y + bis[1] / bl * d], s = Math.atan2(p1[1] - cc[1], p1[0] - cc[0]);
      let e = Math.atan2(p2[1] - cc[1], p2[0] - cc[0]), da = e - s; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      for (let k = 0; k <= n; k++) { const q = s + da * k / n; out.push([cc[0] + r * Math.cos(q), cc[1] + r * Math.sin(q)]); }
    });
    return out;
  };
  const onSeg = (a, b, p) => Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) < 1e-6 && p[0] >= Math.min(a[0], b[0]) - 1e-9 && p[0] <= Math.max(a[0], b[0]) + 1e-9 && p[1] >= Math.min(a[1], b[1]) - 1e-9 && p[1] <= Math.max(a[1], b[1]) + 1e-9;
  const insertOnEdge = (poly, p) => { for (let i = 0; i < poly.length; i++) { if (Math.hypot(poly[i][0] - p[0], poly[i][1] - p[1]) < 1e-3) { p[0] = poly[i][0]; p[1] = poly[i][1]; return; } } for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; if (onSeg(a, b, p)) { poly.splice(i + 1, 0, p); return; } } throw new Error('bridge point is not on the outline: ' + p); };
  const circle = (cx, cy, r, n = 48) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(-i / n * TAU + Math.PI / 2), cy + r * Math.sin(-i / n * TAU + Math.PI / 2)]);   // clockwise, starts at the top
  const rect = (cx, cy, w, h, rot = 0) => { const co = Math.cos(rot), si = Math.sin(rot); return [[-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]].map(([x, y]) => [cx + x * co - y * si, cy + x * si + y * co]); };   // clockwise
  const withHoles = (outer, holes) => {       // holes: [{ pts (clockwise), bridge: [x, y] a point of the outline to join to, from: index of the hole vertex }]
    let poly = outer.map((p) => p.slice());
    holes.forEach((h) => { insertOnEdge(poly, h.bridge); const i = poly.findIndex((p) => p[0] === h.bridge[0] && p[1] === h.bridge[1]), k = h.from || 0, hp = h.pts.slice(k).concat(h.pts.slice(0, k)); poly = poly.slice(0, i + 1).concat(hp, [hp[0]], [poly[i]], poly.slice(i + 1)); });
    return poly;
  };
  // ---- the numbers of ECMA-125 section 6 (frame: hub centre at the origin) ----
  const XE = -48.5, XB = 45.5, YW = 45, XA = -31;      // shutter edge, back edge, half width, Reference Axis X (L29 = 17.5 from the edge, L4 = 31 to the hub)
  const YY = -40;                                      // Reference Axis Y: 5 mm in from the side edge (hub is 40 mm from it: L3)
  const WIN = { x0: XA - 12.3, x1: XA + 11.5, y0: -4.5, y1: 4.5 };      // head window: L15 + L16 along the line of access, L18 = 9 across, centred on the hub
  const outline = () => fillet([{ x: XE, y: -YW, r: 2 }, { x: XB, y: -YW, r: 2 }, { x: XB, y: YW, r: 2 }, { x: XE + 5, y: YW }, { x: XE, y: YW - 5 }]);   // three corners R2, the fourth cut at 45 degrees
  const caseHoles = (hub) => [
    ...(hub ? [{ pts: circle(0, 0, 13.25, 64), bridge: [0, -YW], from: 32 }] : []),
    { pts: rect((WIN.x0 + WIN.x1) / 2, 0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0), bridge: [XE, -4.5], from: 3 },
    { pts: circle(XA, YY, 1.8, 24), bridge: [XA, -YW], from: 12 },
    { pts: rect(XA, -YY, 3.6, 4.4), bridge: [XA, YW], from: 0 },
    { pts: rect(XA + 67.75, YY, 3.5, 4.0), bridge: [XA + 67.75, -YW], from: 3 },
    { pts: rect(XA + 67.75, -YY, 3.5, 4.0), bridge: [XA + 67.75, YW], from: 0 },
  ];
  const caseShell = (hub) => withHoles(outline(), caseHoles(hub));
  const linerPts = () => {      // a round pad of polyester fabric, notched at the head windows, with a hole for the hub
    const R = 43, a = Math.asin(4.5 / R), pts = [];
    for (let i = 0; i <= 72; i++) { const ang = Math.PI + a + (TAU - 2 * a) * i / 72; pts.push([R * Math.cos(ang), R * Math.sin(ang)]); }
    pts.push([WIN.x1, 4.5], [WIN.x1, -4.5]);
    const br = pts.reduce((m, q) => (Math.hypot(q[0], q[1] - R) < Math.hypot(m[0], m[1] - R) ? q : m), pts[0]);
    return withHoles(pts, [{ pts: circle(0, 0, 14, 48), bridge: br, from: 0 }]);
  };
  const hubPts = () => {        // the central part of the hub: D5 = 25 mm, with its two orientation holes (square centre hole, off-centre rectangle)
    const outer = Array.from({ length: 72 }, (_, i) => [12.5 * Math.cos(i / 72 * TAU), 12.5 * Math.sin(i / 72 * TAU)]), g = -15 * Math.PI / 180;
    const sq = rect(0, 0, 4.0, 4.0), cx = 7.2 * Math.cos(g), cy = 7.2 * Math.sin(g), second = rect(cx, cy, 8.0, 4.5, g);
    return withHoles(outer, [{ pts: sq, bridge: [0, 12.5], from: 0 }, { pts: second, bridge: [12.5 * Math.cos(-30 * Math.PI / 180), 12.5 * Math.sin(-30 * Math.PI / 180)], from: 1 }]);
  };
  const shutter = (z) => { const o = [[XE, -14], [-17, -14], [-17, 14], [XE, 14]], sx0 = -44.2, sx1 = -18.8; return withHoles(o, [{ pts: rect((sx0 + sx1) / 2, 0, sx1 - sx0, 12.0), bridge: [XE, -6], from: 3 }]); };

  const info = (title, lines, conf) => ({ title, lines, conf });
  const NOTE = 'ECMA-125 leaves this to the maker';
  const parts = [
    { id: 'caseTop', name: 'Case, Side 0', kind: 'profile', p: { pts: caseShell(true), len: 1.0 }, mat: 'wr-blue', at: [0, 0, 1.15], explode: [0, 0, 26], conf: 'spec', claims: ['case', 'hubwin', 'loc', 'window', 'wp', 'livery', 'wall'],
      decals: [{ face: '+z', at: [26, 31, 0.505], w: 20, h: 8, px: 30, items: [{ t: 'text', s: 'HD', x: 0, y: 0, size: 5, weight: 800, spacing: 1, color: '#e8ebf2' }] }],
      info: info('Case, Side 0 (top half)', ['94 x 90 mm, 3.3 mm thick with both halves', '26.5 mm hub window, head window 9 mm wide', 'Second open hole = high density (1.44 MB)', 'Wall thickness is an estimate'], ['spec', 'spec', 'spec', 'estimated']) },
    { id: 'caseBot', name: 'Case, Side 1', kind: 'profile', p: { pts: caseShell(false), len: 1.0 }, mat: 'wr-blue', at: [0, 0, -1.15], explode: [0, 0, -26], conf: 'spec', claims: ['case', 'loc', 'window', 'wp', 'livery', 'wall', 'label'],
      decals: [{ face: '-z', at: [20, 0, -0.505], w: 64, h: 30, px: 22, rot: 90, items: [{ t: 'rect', x: 0, y: 0, w: 64, h: 30, color: '#f1f1ec' }, { t: 'text', s: '3.5" DS HD', x: 0, y: 7, size: 6.4, weight: 800, spacing: 0.6, color: '#1b2a63' }, { t: 'text', s: '1.44 MB', x: 0, y: -4, size: 8.4, weight: 800, spacing: 0.6, color: '#1b2a63' }] }],
      info: info('Case, Side 1 (label side)', ['Same outline, solid centre', 'Label area: 20 mm minimum deep, 76.5 mm max wide', 'Label text is an estimate'], ['spec', 'spec', 'estimated']) },
    { id: 'linerTop', name: 'Liner, Side 0', kind: 'profile', p: { pts: linerPts(), len: 0.12 }, mat: 'nylon', at: [0, 0, 0.58], explode: [0, 0, 13], conf: 'estimated', claims: ['liner'], why: 'The standard asks for a liner that keeps dust without harming the disk and sets only how far it may reach into the windows (0.2 mm); size and fabric are the maker\'s.', tour: false, info: info('Liner', ['Polyester fabric pad that wipes the disk', 'Size is estimated; it may not protrude over 0.2 mm into the windows'], ['estimated', 'spec']) },
    { id: 'linerBot', name: 'Liner, Side 1', kind: 'profile', p: { pts: linerPts(), len: 0.12 }, mat: 'nylon', at: [0, 0, -0.58], explode: [0, 0, -13], conf: 'estimated', claims: ['liner'], why: 'Same as the other liner: a fabric pad, size not given by the standard.', tour: false },
    { id: 'disc', name: 'Magnetic disk', kind: 'disc', p: { r: 42.9, bore: 12.5, w: 0.08 }, mat: 'bronze', at: [0, 0, 0], explode: [0, 0, 0], spin: 31.4159, conf: 'spec', claims: ['disc', 'media'],
      params: { r: { value: 42.9, unit: 'mm', conf: 'spec', claim: 'disc', tol: 0.001 }, w: { value: 0.08, unit: 'mm', conf: 'spec', claim: 'disc', tol: 0.0005 }, bore: { conf: 'estimated', why: 'The standard fixes the hub (D5 = 25 mm) the disk is bonded to, not the size of the disk\'s own hole; it is drawn at the hub radius.' } },
      info: info('Magnetic disk', ['85.8 mm across, 0.080 mm thick', 'Polyester coated both sides; 1.2 um Co-iron oxide', 'Turns at 300 rpm'], ['spec', 'spec', 'spec']) },
    { id: 'band0', name: 'Recorded tracks, Side 0', kind: 'tube', p: { ro: 39.5575, ri: 24.63, len: 0.02 }, mat: 'brass', at: [0, 0, 0.05], explode: [0, 0, 3], spin: 31.4159, conf: 'derived', claims: ['band'],
      params: { ro: { value: 39.5575, unit: 'mm', conf: 'derived', claim: 'band', tol: 0.0005 }, ri: { value: 24.63, unit: 'mm', conf: 'derived', claim: 'band', tol: 0.0005 } },
      info: info('80 tracks, Side 0', ['Track 00 at radius 39.5 mm, track 79 at 24.6875 mm', '0.1875 mm apart, 0.115 mm wide', 'The 160 tracks hold 1,474,560 bytes'], ['spec', 'spec', 'derived']) },
    { id: 'band1', name: 'Recorded tracks, Side 1', kind: 'tube', p: { ro: 38.0575, ri: 23.13, len: 0.02 }, mat: 'brass', at: [0, 0, -0.05], explode: [0, 0, -3], spin: 31.4159, conf: 'derived', claims: ['band'], tour: false,
      params: { ro: { value: 38.0575, unit: 'mm', conf: 'derived', claim: 'band', tol: 0.0005 }, ri: { value: 23.13, unit: 'mm', conf: 'derived', claim: 'band', tol: 0.0005 } } },
    { id: 'hubC', name: 'Hub', kind: 'profile', p: { pts: hubPts(), len: 1.44 }, mat: 'steel', at: [0, 0, 0.68], explode: [0, 0, 22], spin: 31.4159, conf: 'spec', claims: ['hub', 'hubholes', 'lz'],
      info: info('Metal hub', ['25.00 mm central part, steel', 'Square centre hole 4 mm, off-centre slot 8.0 x 4.5 mm', 'The drive spindle grabs it by magnetism', 'Hole placement is estimated'], ['spec', 'spec', 'spec', 'estimated']) },
    { id: 'hubF', name: 'Hub flange', kind: 'disc', p: { r: 15.575, w: 0.36 }, mat: 'steel', at: [0, 0, -0.22], explode: [0, 0, -22], spin: 31.4159, conf: 'spec', claims: ['hub'], tour: false,
      params: { r: { value: 15.575, unit: 'mm', conf: 'spec', claim: 'hub', tol: 0.0005 }, w: { conf: 'estimated', why: 'The standard gives the flange diameter (31.15 mm max) but not its thickness.' } } },
    { id: 'shutTop', name: 'Shutter, top', kind: 'profile', p: { pts: shutter(), len: 0.3 }, mat: 'chrome', at: [0, 0, 1.8], explode: [0, 0, 44], conf: 'estimated', claims: ['shutter'], why: 'The standard sets the window (12.0 mm) and the open position (leading edge 53.75 mm from axis Y); the overall size and the material are the maker\'s.',
      info: info('Metal shutter (open, as in a drive)', ['Window 12.0 mm wide, shown aligned with the head window', 'Spring-loaded, pushed aside on entry', 'Size and thickness are estimated'], ['spec', 'spec', 'estimated']) },
    { id: 'shutBot', name: 'Shutter, bottom', kind: 'profile', p: { pts: shutter(), len: 0.3 }, mat: 'chrome', at: [0, 0, -1.8], explode: [0, 0, -44], conf: 'estimated', claims: ['shutter'], why: 'Same as the top plate.', tour: false },
    { id: 'shutEdge', name: 'Shutter, edge', kind: 'block', p: { w: 0.3, d: 28, h: 3.9, r: 0.1 }, mat: 'chrome', at: [XE - 0.15, 0, 0], explode: [-30, 0, 0], conf: 'estimated', claims: ['shutter'], why: 'The two plates are joined around the case edge; its form is not given by the standard.', tour: false },
    { id: 'spring', name: 'Shutter spring', kind: 'spring', p: { r: 1.0, wire: 0.3, turns: 8, len: 9 }, mat: 'steel', rot: [90, 0, 0], at: [-45, -30, 0], explode: [-12, 0, 10], conf: 'estimated', claims: ['spring'], why: 'Wikipedia says the shutter is spring-loaded; the standard gives only the force (0.2 N min closed, 1 N max open). Wire, turns and place are drawn.', tour: false,
      info: info('Shutter spring', ['Closes the shutter when the disk is pulled out', 'Force: 0.2 N min closed, 1 N max open (published)', 'The coil itself is drawn'], ['spec', 'spec', 'estimated']) },
    { id: 'tab', name: 'Write-protect tab', kind: 'block', p: { w: 3.0, d: 5.0, h: 1.0, r: 0.3 }, mat: 'plastic', at: [XA + 67.75, YY, 0], explode: [0, 0, 20], conf: 'estimated', claims: ['wp'], why: 'The standard defines the hole (3.5 x 4.0 mm min) and the 1 % light limit when it is covered, not the slide that covers it.', tour: false,
      info: info('Write-protect tab', ['Open hole = protected, covered = writable', 'Hole is 3.5 x 4.0 mm min (published)', 'The slide is drawn'], ['spec', 'spec', 'estimated']) },
  ];

  window.SPEC = {
    brand: { accent: '#3b6bd9' }, id: 'floppy', fig: 'Fig 1', kicker: 'REAL STORAGE MEDIUM', title: '3.5-inch floppy disk, 1.44 MB', sub: 'It is 90 mm wide, and its capacity comes out of the track format. Each number is checked.',
    recognize: { object: '3.5-inch (90 mm) floppy disk', iconic: [{ text: 'metal shutter with a window', parts: ['shutTop', 'shutEdge'] }, { text: 'steel hub with a square hole', parts: ['hubC', 'hubF'] }, { text: 'square plastic case with a cut corner', parts: ['caseTop', 'caseBot'] }, { text: 'label and HD marking', parts: ['caseBot'] }], blind: { answer: 'A 3.5-inch high-density (HD, 1.44 MB) floppy disk, blue shell; about 95% confident; recognised from the shape (square shell with a clipped corner, sliding metal shutter with a window, central hub, write-protect holes) and also from the HD text', judge: 'a fresh Sonnet subagent with no context, shown only the label-free still from scripts/stranger.mjs', date: '2026-10-16', ok: true } },
    research: {
      sources: [
        { id: 'ecma125', title: 'ECMA-125, Data interchange on 90 mm flexible disk cartridges using MFM recording at 15 916 ftprad on 80 tracks on each side - ISO type 302 (1st edition, December 1987; technically identical to ISO/DIS 9529)', url: 'https://ecma-international.org/wp-content/uploads/ECMA-125_1st_edition_december_1987.pdf', fetched: '2026-10-16', note: 'Maker-neutral primary source. The PDF is 80 scanned pages with no text layer (pdftotext returns nothing, no OCR on the machine): every number was read by eye from page images rendered with PyMuPDF (pp. 10-16, 17, 21, 27-30 and Fig. 1 and 3). A first guess at the file name (june_1987) was a 404. It gives no figure for wall thickness, liner, shutter plate size, spring or the write-protect slide.' },
        { id: 'ecma-page', title: 'ECMA-125 standard page (Ecma International)', url: 'https://ecma-international.org/publications-and-standards/standards/ecma-125/', fetched: '2026-10-16', note: 'Abstract only: 90 mm cartridges, MFM at 15,916 flux transitions per radian, 80 tracks per side, ISO Type 302.' },
        { id: 'wiki-floppy', title: 'Floppy disk - Wikipedia', url: 'https://en.wikipedia.org/wiki/Floppy_disk', fetched: '2026-10-16', note: 'Secondary. Gives 1,474,560 bytes (1,440 KiB, "1.44 MB" marketed, 2.0 MB unformatted), HD media 1.2 um cobalt-doped iron oxide, plastic housing, polyester liner, spring-loaded shutter, metal hub, HD hole, write-protect hole, "500Kbps MFM" for HD and the 135 tpi ANSI X3.137 reference. The page is long: the first 100,000 characters answered the questions and the rest was read only for the 135 tpi and 500 kbit/s notes. It gives no hub, shutter or case dimensions and no rpm.' },
        { id: 'wiki-format', title: 'Floppy disk format - Wikipedia', url: 'https://en.wikipedia.org/wiki/Floppy_disk_format', fetched: '2026-10-16', note: 'Secondary. 3.5-inch HD: 2 sides, 80 tracks, 18 sectors, 512 bytes, "1,440 kB", 300 rpm, MFM. It says nothing about bit rate.' },
        { id: 'jdebp', title: 'Floppy discs are 90 mm, not 3 and a half inches - J. de Boyne Pollard', url: 'https://jdebp.uk/FGA/floppy-discs-are-90mm-not-3-and-a-half-inches.html', fetched: '2026-10-16', note: 'A commentary, third party: used only because it quotes ANSI X3.171-1989 (90.0 x 94.0 x 3.3 mm, disc 85.80 mm), a second standard body that agrees with ECMA.' },
      ],
      claims: [
        { id: 'case', conf: 'spec', text: 'Case 94.0 mm (+/- 0.3) by 90.0 mm (+0.4 / -0.1); three corners R 2.0 mm, the fourth cut at 45 degrees; thickness 3.3 mm +/- 0.2 in the area 8.5 mm from two edges. ANSI X3.171 quotes the same 90.0 x 94.0 x 3.3.', src: ['ecma125', 'jdebp'] },
        { id: 'hubwin', conf: 'spec', text: 'Hub access hole on Side 0: diameter 26.50 mm min, centre 40.00 mm from axis Y and 31.00 mm from axis X (L3, L4).', src: ['ecma125'] },
        { id: 'loc', conf: 'spec', text: 'Primary locating hole 3.6 mm diameter at the crossing of axes X and Y; secondary hole 3.6 x 4.4 mm, 80.0 mm from axis Y along X.', src: ['ecma125'] },
        { id: 'window', conf: 'spec', text: 'Head windows (both sides): L15 = 12.3 mm min and L16 = 11.5 mm min either side of axis X along the line of access, L17 = 35.5 mm from axis Y to the window, L18 = 9.00 mm wide.', src: ['ecma125'] },
        { id: 'wp', conf: 'spec', text: 'Write-inhibit hole on axis Y, 67.75 mm from axis X, 3.5 x 4.0 mm min; the identification hole (what makes it a 1.44 MB disk, not ECMA-100) sits at 80.0 mm across, same distance, same size.', src: ['ecma125', 'wiki-floppy'] },
        { id: 'shutter', conf: 'spec', text: 'Shutter slides open on insertion and closes on removal, force 1 N max open, 0.2 N min closed; leading edge 53.75 mm +/- 1.25 from axis Y when open; shutter window 12.0 mm +/- 0.2 wide.', src: ['ecma125'] },
        { id: 'disc', conf: 'spec', text: 'Disk diameter 85.8 mm +/- 0.2 (ANSI X3.171 says 85.80), thickness 0.080 mm +/- 0.008.', src: ['ecma125', 'jdebp'] },
        { id: 'media', conf: 'spec', text: 'Disk of biaxially oriented polyester coated on both sides; HD coating is 1.2 um cobalt-doped iron oxide; housing is plastic with a polyester liner.', src: ['ecma125', 'wiki-floppy'] },
        { id: 'hub', conf: 'spec', text: 'Hub: central part 25.00 mm (+0 / -0.15) diameter, flange 31.15 mm max, made of a stainless steel alloy; its surface is 1.36 mm +/- 0.10 above the Side 0 surface of the disk at R 14.', src: ['ecma125'] },
        { id: 'hubholes', conf: 'spec', text: 'Hub orientation holes: a square centre hole 4.00 mm min and an off-centre rectangular hole 8.0 x 4.5 mm min, corners R 1.0 and one R 2.0, 15 degrees +/- 3 from reference lines.', src: ['ecma125'] },
        { id: 'lz', conf: 'derived', text: 'Hub height: disk surface (+0.040) plus 1.36 gives 1.40 mm; the case surface (3.3 / 2 = 1.65) minus the 0.3 mm the standard keeps between hub and plane XY gives 1.35 mm.', src: ['ecma125'], cross: 'L34 + E2/2 = 1.40 against E1/2 - L46 = 1.35: two separate dimension sets of the same standard agree within the +/- 0.10 of L34.' },
        { id: 'edge', conf: 'derived', text: 'Shutter edge to axis X is 17.5 mm (L29 on Fig. 3), so the hub sits 17.5 + 31.0 = 48.5 mm from the shutter edge and 45.5 mm from the back edge.', src: ['ecma125'], cross: 'If the hub were centred in the 94 mm length it would be at 47.0 mm; L29 reads 17.5 and I follow it. The scanned Fig. 1 measures about 16 mm to the notched corner; the figure is not to scale, so I trust the printed number.' },
        { id: 'yaxis', conf: 'derived', text: 'Axis Y is 5.0 mm in from the side edge, so the hub (40.00 mm from it) is centred in the 90 mm width.', src: ['ecma125'], cross: '(90.0 - 80.0 between the locating holes) / 2 = 5.0; Fig. 1 measures about 4.8 mm from its scale (error +/- 0.5 mm).' },
        { id: 'tracks', conf: 'spec', text: '80 tracks on each side, 0.1875 mm apart, 0.115 mm wide; radius of track n is x - 0.1875 n with x = 39.5000 mm (Side 0) or 38.0000 mm (Side 1); recording area between radii 20.6 mm and 42.0 mm.', src: ['ecma125'] },
        { id: 'band', conf: 'derived', text: 'The recorded band is 24.6875 - 0.0575 = 24.63 mm to 39.5 + 0.0575 = 39.5575 mm on Side 0, and 23.13 to 38.0575 mm on Side 1.', src: ['ecma125'], cross: 'Both bands lie inside the 20.6 to 42.0 mm recording area the same standard gives, and track 79 (24.6875 mm) is 4.1 mm clear of the inner limit.' },
        { id: 'fmt', conf: 'spec', text: 'All tracks are divided into 18 sectors of 512 bytes; the data capacity of a track is 9216 bytes; 2 sides, cylinders 00 to 79.', src: ['ecma125', 'wiki-format'] },
        { id: 'rpm', conf: 'spec', text: 'Rotation speed 300 rpm +/- 3 (+/- 2 % averaged index to index while formatting).', src: ['ecma125', 'wiki-format'] },
        { id: 'density', conf: 'spec', text: 'MFM recording at 15,916 flux transitions per radian; the nominal bit cell length is 62.8 urad.', src: ['ecma125', 'ecma-page'] },
        { id: 'rate', conf: 'spec', text: 'High-density MFM data rate 500 kbit/s.', src: ['wiki-floppy'] },
        { id: 'rawcap', conf: 'spec', text: 'Unformatted capacity 2.0 MB.', src: ['wiki-floppy'] },
        { id: 'capacity', conf: 'spec', text: 'Formatted capacity 1,474,560 bytes = 1,440 KiB, sold as "1.44 MB" (1,440 x 1,024 bytes).', src: ['wiki-floppy', 'wiki-format'] },
        { id: 'tpi', conf: 'spec', text: 'Track density 135 tpi (5.3 tracks per mm) for 90 mm cartridges (ANSI X3.137, quoted).', src: ['wiki-floppy'] },
        { id: 'wall', conf: 'estimated', text: 'Each half of the case is 1.0 mm thick; the cartridge is 3.3 mm over both halves.', why: 'The standard fixes 3.3 mm over everything and the room inside, not the wall of each half; 1.0 mm leaves 1.3 mm inside, the same figure as the standard\'s E3 for the inside of the case on Side 1.' },
        { id: 'liner', conf: 'estimated', text: 'A round polyester pad 43 mm in radius and 0.12 mm thick on each side of the disk, with the head windows cut through and a 14 mm hub hole.', why: 'The standard asks only that the liner retain dust without harming the disk and not protrude more than 0.2 mm into the windows.' },
        { id: 'spring', conf: 'estimated', text: 'The shutter spring is a 9 mm coil of 8 turns, 0.3 mm wire, next to the shutter edge.', why: 'Wikipedia says spring-loaded; the standard gives only the closing force. Nobody opened here publishes the spring.' },
        { id: 'livery', conf: 'estimated', text: 'Blue case, white label "3.5" DS HD / 1.44 MB" on Side 1 and "HD" printed by the identification hole.', why: 'Colour and printing differ by brand and none of the opened sources describes them; only type and colour are drawn, no logo.' },
        { id: 'label', conf: 'estimated', text: 'The label is 64 x 30 mm, centred 20 mm behind the hub.', why: 'The standard gives limits for the label area (76.5 mm max wide, 20.0 mm min deep) and no label; a label inside those limits is drawn.' },
      ],
    },
    parts,
    mechanism: {
      calc: { vars: {
        sides: { v: 2, label: 'sides', claim: 'fmt' }, tracks: { v: 80, label: 'tracks per side', claim: 'tracks' }, sectors: { v: 18, label: 'sectors per track', claim: 'fmt' }, bytes: { v: 512, label: 'bytes per sector', unit: 'B', claim: 'fmt' },
        ftprad: { v: 15916, label: 'flux transitions per radian', claim: 'density' }, rpm: { v: 300, label: 'rotation', unit: 'rpm', claim: 'rpm' },
        pitch: { v: 0.1875, label: 'track pitch', unit: 'mm', claim: 'tracks' }, x0: { v: 39.5, label: 'track 00 radius, Side 0', unit: 'mm', claim: 'tracks' }, tw: { v: 0.115, label: 'track width', unit: 'mm', claim: 'tracks' },
        r_in: { v: 20.6, label: 'recording area, inner radius', unit: 'mm', claim: 'tracks' }, r_out: { v: 42.0, label: 'recording area, outer radius', unit: 'mm', claim: 'tracks' },
        L34: { v: 1.36, label: 'hub above the disk', unit: 'mm', claim: 'hub' }, E2: { v: 0.08, label: 'disk thickness', unit: 'mm', claim: 'disc' },
        L15: { v: 12.3, label: 'head window, outward', unit: 'mm', claim: 'window' }, L16: { v: 11.5, label: 'head window, inward', unit: 'mm', claim: 'window' }, L17: { v: 35.5, label: 'window from axis Y', unit: 'mm', claim: 'window' }, L18: { v: 9.0, label: 'head window width', unit: 'mm', claim: 'window' },
        L4: { v: 31.0, label: 'hub from axis X', unit: 'mm', claim: 'hubwin' },
      } },
      drive: { modes: [
        { id: 'cap', label: 'Formatted capacity', expr: 'sides*tracks*sectors*bytes', unit: 'bytes', digits: 0, formula: '2 sides x 80 tracks x 18 sectors x 512 bytes', publish: { value: 1474560, tol: 0.5, claim: 'capacity' }, show: ['band0', 'band1'], dim: 0.7 },
        { id: 'mb', label: 'The "1.44 MB" label', expr: 'sides*tracks*sectors*bytes/1024/1000', unit: 'MB', digits: 2, formula: 'bytes / 1,024 / 1,000: neither 1.47 MB nor 1.41 MiB', publish: { value: 1.44, tol: 0.005, claim: 'capacity' }, show: ['caseBot'], dim: 0.7 },
        { id: 'trk', label: 'One track', expr: 'sectors*bytes', unit: 'bytes', digits: 0, formula: '18 sectors x 512 bytes', publish: { value: 9216, tol: 0.5, claim: 'fmt' }, show: ['band0'], dim: 0.7 },
        { id: 'cell', label: 'Bit cell', expr: '1e6/ftprad', unit: 'urad', digits: 2, formula: '1 / 15,916 flux transitions per radian', publish: { value: 62.8, tol: 0.05, claim: 'density' }, show: ['disc'], dim: 0.7 },
        { id: 'rate', label: 'Data rate', expr: '2*PI*ftprad*rpm/60/1000', unit: 'kbit/s', digits: 1, formula: '2 pi x 15,916 per rev x 5 rev/s', publish: { value: 500, tol: 0.5, claim: 'rate' }, show: ['disc', 'hubC'], dim: 0.7 },
        { id: 'raw', label: 'Unformatted capacity', expr: '2*PI*ftprad/8*sides*tracks/1e6', unit: 'MB', digits: 2, formula: '12,500 bytes per track x 160 tracks', publish: { value: 2.0, tol: 0.01, claim: 'rawcap' }, show: ['band0', 'band1'], dim: 0.7 },
        { id: 'tpi', label: 'Track density', expr: '25.4/pitch', unit: 'tpi', digits: 1, kind: 'convert', formula: '25.4 mm per inch / 0.1875 mm', publish: { value: 135, tol: 0.6, claim: 'tpi' }, show: ['band0'], dim: 0.7 },
        { id: 'hub', label: 'Hub height', expr: 'L34+E2/2', unit: 'mm', digits: 2, formula: '1.36 above the disk + half its thickness; the case gives 1.35', publish: { value: 1.35, tol: 0.1, claim: 'lz' }, show: ['hubC'], dim: 0.7 },
        { id: 'winc', label: 'Head window centre', expr: 'L17+L18/2', unit: 'mm', digits: 2, formula: '35.5 + 9.0 / 2 across; the hub is 40.00 from axis Y', publish: { value: 40.0, tol: 0.25, claim: 'hubwin' }, show: ['caseTop', 'caseBot'], dim: 0.7 },
        { id: 'reach', label: 'Heads reach every track', expr: 'min(L4+L15-r_out, r_in-(L4-L16))', unit: 'mm to spare', digits: 2, formula: 'the head window spans radius 19.5 to 43.3 mm; the recording area 20.6 to 42.0', show: ['caseTop'], dim: 0.7 },
        { id: 'room', label: 'Room inside the recording area', expr: 'min(r_out-(x0+tw/2), (x0-(tracks-1)*pitch-tw/2)-r_in)', unit: 'mm to spare', digits: 2, formula: 'track 00 outer edge and track 79 inner edge against the area limits', show: ['band0'], dim: 0.7 },
      ] },
    },
    director: { hold: 3.0, what: 'A 3.5-inch floppy disk, the 1.44 MB kind: a 90 mm plastic cartridge around a spinning magnetic disk, a steel hub and a sliding metal shutter.', cold: { dur: 9, question: 'Does the published track format really make 1.44 MB, and does the cartridge fit the published drawing?' }, tour: ['shutTop', 'hubC', 'caseTop', 'band0', 'disc', 'tab'] },
  };
})();
