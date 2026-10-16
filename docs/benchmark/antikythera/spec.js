/*
 * spec.js - Fig 1: the Antikythera mechanism (Greek bronze astronomical calculator, 2nd-1st century BC) as a declarative SPEC.
 *
 * WHAT IS MODELLED: the surviving + reconstructed fixed-axis gear trains behind the front and back dials, with the tooth counts in the
 * literature (Freeth et al. 2006/2008 as tabulated by Tsigkros 2015, who quotes Efstathiou et al.):
 *   year axis (b1+b2) -> mean Moon (b3), Metonic pointer (n1) and Olympiad pointer (o1), lunar-orbit precession (e3/e4), Saros (g), Exeligmos (i).
 * WHAT IS NOT MODELLED (and the film says so): the pin-and-slot lunar anomaly (k1/k2 are joined as a 1:1 stand-in: mean motion only), the crank
 * gears a1/b1 contrate, the 63-tooth r1 of fragment D (unaccounted for), the Callippic dial (p1/p2/q1 hypothetical), and every planet display
 * (no gearing survives; Freeth et al. 2021 reconstruction could not be opened: the nature.com page redirects to a login, UCL Discovery answered 403).
 *
 * BLOCKED / FAILED SOURCES (not cited anywhere below): nature.com/articles/s41598-021-84310-w (303 redirect to idp.nature.com), discovery.ucl.ac.uk/id/eprint/10124374
 * (HTTP 403), antikythera-mechanism.gr (empty page for the fetcher). The Freeth 2006 Nature supplement was never opened (only found through citations).
 *
 * KNOWN SIMPLIFICATION: the gate demands one module per mesh. The published average circular pitch is 1.6 mm (module 0.509 mm) and every gear is drawn at
 * that module, so the pitch radius of a gear is z x 0.2546 mm. The measured tip radii in the table differ by up to 14 % (b1: 56.8 mm drawn, 65 mm
 * measured tip radius and 13 cm published diameter), because the real teeth were cut at different pitches (1.31 to 1.81 mm).
 */
window.SPEC = (() => {
  const M = 1.6 / Math.PI, YEAR = 365.2425, SID = 27.321661, SYN = 29.530589, rp = (z) => M * z / 2, D2R = Math.PI / 180;
  // axis centres from mesh geometry: centre distance = module x (za + zb) / 2 for an external pair
  const away = (c, deg, za, zb) => [c[0] + M * (za + zb) / 2 * Math.cos(deg * D2R), c[1] + M * (za + zb) / 2 * Math.sin(deg * D2R)];
  const X = [0, 0], C = away(X, 100, 64, 38), L = away(X, 215, 64, 38), D = away(C, 40, 48, 24), E25 = away(D, 0, 127, 32), K1 = away(E25, 75, 50, 50),
    K2 = away(K1, 165, 50, 50), E16 = away(K2, 120, 50, 50), B3 = away(E16, 100, 32, 32),
    Mx = away(L, -85, 53, 96), N = away(Mx, 205, 15, 53), O = away(N, 250, 57, 60), ES = away(Mx, -20, 27, 223), F = away(ES, -80, 188, 53),
    G = away(F, 200, 30, 54), H = away(G, 250, 20, 60), I = away(H, 150, 15, 60);
  // z layers (mm). Real axial positions are not tabulated in any source opened: ESTIMATED, spaced so that rigid gears of one axis never touch.
  const T = 1.4, g = (id, name, z, at, zl, body, conf, claims, extra) => Object.assign({ id, name: 'Gear ' + name, kind: 'gear', p: { m: M, z, width: T, bore: 1.2 }, mat: 'bronze', at: [at[0], at[1], zl], body: id, conf, claims, explode: [0, 0, zl * 3] }, extra || {});
  const DEF = ['teeth_definite'], ACC = ['teeth_accepted'], HYP = ['teeth_hyp'];
  const parts = [
    g('b1', 'b1 (223 teeth, year axis, four-spoked)', 223, X, 0, 'year', 'measured', ['b1count'], { p: { m: M, z: 223, width: T, bore: 3, web: { n: 4, r: rp(223) * 0.55, d: rp(223) * 0.62 } }, info: { title: 'b1: the main drive wheel', lines: ['223 teeth counted (223-224, other counts 216-231)', 'turns once per tropical year', 'four spokes; drawn at 1.6 mm pitch'], conf: ['measured'] } }),
    g('b2', 'b2 (64 teeth)', 64, X, 4, 'year', 'spec', ['teeth_definite_b2'], { info: { title: 'b2: year-axis pinion', lines: ['64 teeth on the same axis as b1', 'drives the Moon (via c1) and the Metonic train (via l1)'], conf: ['spec'] } }),
    // Moon
    g('c1', 'c1 (38)', 38, C, 8, 'c', 'derived', ACC), g('c2', 'c2 (48)', 48, C, 11, 'c', 'derived', ACC),
    g('d1', 'd1 (24)', 24, D, 14, 'd', 'spec', DEF), g('d2', 'd2 (127)', 127, D, 17, 'd', 'spec', DEF, { info: { title: 'd2: the 127-tooth wheel', lines: ['127 teeth, a prime: it gives the 254 sidereal months', 'in the 19 years of the Metonic cycle'], conf: ['spec'] } }),
    g('e2', 'e2 (32)', 32, E25, 20, 'e25', 'derived', ACC), g('e5', 'e5 (50)', 50, E25, 23, 'e25', 'derived', ACC),
    g('k1', 'k1 (50)', 50, K1, 26, 'k1', 'derived', ACC, { why: '' }), g('k2', 'k2 (50)', 50, K2, 29, 'k2', 'derived', ACC),
    g('e6', 'e6 (50)', 50, E16, 32, 'e16', 'derived', ACC), g('e1', 'e1 (32)', 32, E16, 35, 'e16', 'derived', ACC),
    g('b3', 'b3 (32)', 32, B3, 38, 'b3', 'spec', DEF, { info: { title: 'b3: the Moon pointer axis', lines: ['32 teeth, definite count', 'turns 13.37 times per year (sidereal month)', 'k1/k2 pin-and-slot (anomaly) not modelled'], conf: ['spec'] } }),
    // Metonic, Olympiad
    g('l1', 'l1 (38)', 38, L, 8, 'l', 'spec', DEF), g('l2', 'l2 (53)', 53, L, 11, 'l', 'spec', DEF),
    g('m1', 'm1 (96)', 96, Mx, 14, 'm', 'derived', ACC), g('m2', 'm2 (15)', 15, Mx, 17, 'm', 'derived', ACC), g('m3', 'm3 (27, lost)', 27, Mx, 20, 'm', 'estimated', HYP, { why: 'Did not survive; count chosen by the reconstructors so the Saros cycle closes.' }),
    g('n1', 'n1 (53, lost)', 53, N, 17, 'n', 'estimated', HYP, { why: 'Did not survive; count chosen by the reconstructors so the Metonic 5/19 closes.' }),
    g('n3', 'n3 (57, lost)', 57, N, 20, 'n', 'estimated', HYP, { why: 'Did not survive; Freeth 2008 adds it to drive o1 at 4 years.' }),
    g('o1', 'o1 (60, Olympiad)', 60, O, 23, 'o', 'spec', ['o1count'], { info: { title: 'o1: the Olympiad gear', lines: ['60 teeth, surviving in fragment B', 'with n3 (57) turns once in four years'], conf: ['spec'] } }),
    // Saros, Exeligmos
    g('e3', 'e3 (223, Saros)', 223, ES, 23, 'es', 'derived', ACC, { p: { m: M, z: 223, width: T, bore: 3, web: { n: 5, r: rp(223) * 0.55, d: rp(223) * 0.55 } }, info: { title: 'e3: the Saros wheel', lines: ['223 teeth = 223 synodic months', 'the Saros eclipse cycle of 18 years 11 days'], conf: ['derived'] } }),
    g('e4', 'e4 (188)', 188, ES, 26, 'es', 'derived', ACC),
    g('f1', 'f1 (53)', 53, F, 26, 'f', 'derived', ACC), g('f2', 'f2 (30)', 30, F, 29, 'f', 'spec', DEF),
    g('g1', 'g1 (54)', 54, G, 29, 'g', 'derived', ACC), g('g2', 'g2 (20)', 20, G, 32, 'g', 'spec', DEF),
    g('h1', 'h1 (60)', 60, H, 32, 'h', 'derived', ACC), g('h2', 'h2 (15)', 15, H, 35, 'h', 'derived', ACC),
    g('i1', 'i1 (60)', 60, I, 35, 'i', 'derived', ACC, { info: { title: 'i1: the Exeligmos axis', lines: ['turns once per triple Saros, 54 years 33 days', 'back lower dial'], conf: ['derived'] } }),
  ];
  // axles (decor, one per axis) so the gears of an axis read as rigid: ESTIMATED
  const axle = (id, at, z0, z1, body) => ({ id: 'ax_' + id, name: 'Arbor ' + id, kind: 'shaft', p: { r: 0.6, len: z1 - z0 + 6 }, mat: 'bronze', at: [at[0], at[1], (z0 + z1) / 2], body, explode: [0, 0, 30], conf: 'estimated', why: 'Arbor diameters and lengths are not tabulated in any source opened.', decor: true, tour: false });
  [['x', X, 0, 4, 'b1'], ['c', C, 8, 11, 'c1'], ['d', D, 14, 17, 'd1'], ['e25', E25, 20, 23, 'e2'], ['k1', K1, 26, 26, 'k1'], ['k2', K2, 29, 29, 'k2'], ['e16', E16, 32, 35, 'e6'], ['b3', B3, 38, 38, 'b3'],
    ['l', L, 8, 11, 'l1'], ['m', Mx, 14, 20, 'm1'], ['n', N, 17, 20, 'n1'], ['o', O, 23, 23, 'o1'], ['es', ES, 23, 26, 'e3'], ['f', F, 26, 29, 'f1'], ['g', G, 29, 32, 'g1'], ['h', H, 32, 35, 'h1'], ['i', I, 35, 35, 'i1']]
    .forEach((a) => parts.push(axle(a[0], a[1], a[2], a[3], a[4])));
  // case frame + dials (decor for recognisability): ESTIMATED. Outer size 34 x 18 x 9 cm is published (uncertain); the frame is drawn open so the gearing stays visible.
  const CX = 20, CY = -31, FW = 180, FH = 340, BAR = 9, fwhy = 'Outer size 34 x 18 cm is published (uncertain, Wikipedia); bar width, thickness, position and the dial rings are drawn for recognisability, not measured.';
  [['F', -6], ['B', 46]].forEach(([side, zz]) => {
    [['top', FW, BAR, 0, FH / 2 - BAR / 2], ['bot', FW, BAR, 0, -FH / 2 + BAR / 2], ['left', BAR, FH - 2 * BAR, -FW / 2 + BAR / 2, 0], ['right', BAR, FH - 2 * BAR, FW / 2 - BAR / 2, 0]].forEach(([n, w, h, dx, dy]) =>
      parts.push({ id: 'frame' + side + n, name: (side === 'F' ? 'Front' : 'Back') + ' case frame (' + n + ')', kind: 'plate', p: { w, h, r: 1, t: 3 }, mat: 'aluminum-dark', at: [CX + dx, CY + dy, zz], body: 'case', explode: [0, 0, side === 'F' ? -30 : 34], conf: 'estimated', why: fwhy, decor: true, tour: false }));
  });
  const ring = (id, name, at, ro, ri, zz, side, text) => parts.push({ id, name, kind: 'tube', p: { ro, ri, len: 1.6 }, mat: 'bronze', at: [at[0], at[1], zz], body: 'case', explode: [0, 0, side * 30], conf: 'estimated', why: 'Dial rings are drawn centred on the pointer arbor they belong to, for recognisability; no source I opened gives their radii.', tour: false,
    info: { title: name, lines: [text, 'radii drawn, not measured'], conf: ['estimated'] } });
  ring('dialZodiac', 'Front dial: zodiac ring', X, 70, 58, -3, -1, 'zodiac and Egyptian calendar on the front');
  ring('dialSun', 'Front dial: inner calendar ring', X, 54, 46, -3, -1, 'inner ring of the front dial');
  ring('dialMetonic', 'Back dial: Metonic spiral', N, 40, 32, 44, 1, 'Metonic spiral, 235 months in 5 turns');
  ring('dialSaros', 'Back dial: Saros spiral', G, 34, 26, 44, 1, 'Saros spiral, 223 months in 4 turns');
  return {
    id: 'antikythera', fig: 'Fig 1', kicker: 'ANTIKYTHERA MECHANISM', title: 'Antikythera mechanism', sub: 'A Greek bronze calculator of the Sun, Moon and eclipses. Teeth counted from X-ray scans.',
    brand: { accent: '#b6803a' },
    recognize: { object: 'Antikythera mechanism (ancient Greek geared astronomical calculator)', iconic: [
      { text: 'the large four-spoked bronze wheel b1 with 223 teeth', parts: ['b1', 'b2'] },
      { text: 'a dense stack of small bronze gears with triangular teeth, meshed in trains', partsPrefix: ['d2', 'e3', 'm1'] },
      { text: 'a tall rectangular case frame with a large circular zodiac dial on the front and spiral dials on the back', parts: ['frameFtop', 'dialZodiac', 'dialMetonic'] } ],
      blind: { answer: 'a mechanical gear train, most likely a clock or watch movement between two plates (confidence 70). A first judge that saw the file name antikythera-assembled.png said Antikythera at 55 but admitted it came from the file name, so that run is void.', judge: 'a fresh Haiku with no context, neutral file name img1.png (stranger-local.mjs still)', date: '2026-10-15', ok: false } },
    research: {
      sources: [
        { id: 'wiki', title: 'Wikipedia, "Antikythera mechanism" (wikitext and rendered page)', url: 'https://en.wikipedia.org/wiki/Antikythera_mechanism', fetched: '2026-10-15', note: 'Read via WebFetch and curl of action=raw. Its gear table lists formulas and periods, NOT tooth counts (the summarising fetch invented none). Source of: 64 teeth for b2, 223 for the largest gear, circular pitch 1.6 mm, case 34x18x9 cm, the periods and the clockwise/anticlockwise directions, sidereal and synodic month. Itself a secondary source (cites Freeth 2006, 2008, 2012).' },
        { id: 'tsig', title: 'Tsigkros, "Mathematical aspects of the Antikythera Mechanism", bachelor thesis, FU Berlin, 2015, Tables 1-4', url: 'http://dynamics.mi.fu-berlin.de/preprints/TsigkrosBachelorarbeit%202015-02-04.pdf', fetched: '2026-10-15', note: 'Downloaded and read with pdftotext. Secondary: the tooth counts and tip/root radii are quoted from Efstathiou et al. (AMRP), which I did not open. Table 1 = definite counts, Table 2 = accepted counts for indefinite gears, Table 4 = hypothesised lost gears.' },
        { id: 'koet', title: 'Koetsier, "Phases in the unraveling of the secrets of the gear system of the Antikythera mechanism" (VU Amsterdam)', url: 'https://few.vu.nl/~teun/AntikytheraGearSystem.pdf', fetched: '2026-10-15', note: 'Read with pdftotext. Independent statement of Price\'s train: b2 64, c1 38, c2 48, d1 24, d2 127, B4 32 giving 254/19. Price used 225 teeth for b1 and a 45-tooth crown wheel: not followed.' },
        { id: 'freeth08', title: 'Freeth, Jones, Steele, Bitsakis, "Calendars with Olympiad display and eclipse prediction on the Antikythera Mechanism", Nature 454, 2008, Supplementary Information', url: 'https://archive.nyu.edu/bitstream/2451/60882/2/Freeth_Jones_Steele_Bitsakis_2008_supplementary.pdf', fetched: '2026-10-15', note: 'WebFetch returned only binary; the PDF was saved and read with pdftotext. Used for o1 = 60 teeth (statistics "beyond reasonable doubt"), the hypothetical 57-tooth n3, the Metonic pointer at 5/19 turns per year and the Olympiad pointer at 1/4. It contains no complete tooth table.' },
        { id: 'anast', title: 'Anastasiou et al., "The Draconic gearing of the Antikythera Mechanism: Assembling the Fragment D" (arXiv:2104.06181)', url: 'https://arxiv.org/pdf/2104.06181', fetched: '2026-10-15', note: 'Used ONLY for its review of how many teeth b1 has been measured with (Karakalos 223-226, Price 225, Wright 216-231, Freeth 2006 223-224) and for a1 = 48 (not modelled). Its own Draconic gearing is a proposal that is not used here.' },
      ],
      claims: [
        { id: 'teeth_definite_b2', conf: 'spec', text: 'b2 has 64 teeth and drives the year-axis trains (Price 1974 and later reconstructions agree).', src: ['wiki', 'koet'] },
        { id: 'teeth_definite', conf: 'spec', text: 'Definite tooth counts from the CT scans: b3 32, d1 24, d2 127, f2 30, g2 20, l1 38, l2 53.', src: ['tsig'] },
        { id: 'o1count', conf: 'spec', text: 'Gear o1 has 60 teeth (statistically established), pitch radius about 12.5 mm.', src: ['freeth08'] },
        { id: 'teeth_accepted', conf: 'derived', text: 'Accepted counts for the damaged gears: c1 38, c2 48, e1 32, e2 32, e3 223, e4 188, e5 50, e6 50, f1 53, g1 54, h1 60, h2 15, i1 60, k1 50, k2 50, m1 96, m2 15.', src: ['tsig'], cross: 'With the definite and hypothesised counts they reproduce, to better than 0.01 %, the sidereal month (254/19), the Metonic 5/19, the Saros 223-month pointer and the Exeligmos: see the mode checks. A wrong count in any of these would break at least one of those ratios.' },
        { id: 'b1count', conf: 'measured', text: 'b1 has 223 teeth (counted 223-224 by Freeth et al. 2006; other counts 216-231; Price used 225).', src: ['anast'], error: '+-1 tooth (223-224); the other published counts disagree by up to +-8, caused by corrosion and shrinkage. 223 is followed because it equals the 223-month Saros; b1 cancels in every ratio checked (b1 and b2 are on one axis), so its count is NOT verified by the gate.' },
        { id: 'pitch', conf: 'spec', text: 'Teeth are equilateral triangles with an average circular pitch of 1.6 mm, wheel thickness 1.4 mm.', src: ['wiki'] },
        { id: 'module', conf: 'derived', text: 'Module 0.509 mm = circular pitch 1.6 mm / pi, used for every gear.', src: ['wiki', 'tsig'], cross: 'Mean pitch recomputed as 2 pi x (mean of tip and root radius) / teeth over the 27 gears of the Tsigkros table is 1.55 mm (range 1.31 to 1.81 mm), 3 % under the published 1.6 mm. Per gear the drawn pitch radius differs from the measured one by up to 14 % (b1).' },
        { id: 'year', conf: 'spec', text: 'Tropical year 365.2425 days, sidereal month 27.321661 days, synodic month 29.530589 days.', src: ['wiki'] },
        { id: 'r_moon', conf: 'derived', text: 'Mean Moon pointer b3 turns once per sidereal month: 365.2425 / 27.321661 = 13.3687 turns per year (published model value 27.321 days).', src: ['wiki'], cross: 'Independent of the teeth: 254 sidereal months = 19 tropical years (Metonic) gives 254/19 = 13.3684.' },
        { id: 'r_metonic', conf: 'derived', text: 'Metonic pointer: 5 turns = 235 synodic months = 6939.69 days, 1387.94 days per turn, anticlockwise on the back.', src: ['wiki', 'freeth08'], cross: '235 x 29.530589 = 6939.69 days / 5 = 1387.94 days; Freeth 2008 states 5/19 turns per year.' },
        { id: 'r_olymp', conf: 'derived', text: 'Olympiad pointer: one turn per 4 years, clockwise.', src: ['wiki', 'freeth08'], cross: 'Freeth 2008: 5/19 x 57/60 = 1/4 turns per year; Wikipedia: 4 years (5551.8 days).' },
        { id: 'r_saros', conf: 'derived', text: 'Saros pointer g: 4 turns = 223 synodic months, 1646.33 days per turn, anticlockwise.', src: ['wiki'], cross: '223 x 29.530589 / 4 = 1646.33 days.' },
        { id: 'r_exel', conf: 'derived', text: 'Exeligmos pointer i: one turn = 3 Saros = 669 synodic months = 19756 days, anticlockwise.', src: ['wiki'], cross: '669 x 29.530589 = 19755.8 days, the Wikipedia table value.' },
        { id: 'r_prec', conf: 'derived', text: 'Lunar-orbit precession wheel e: 8.88 years per turn.', src: ['wiki'], cross: 'WEAK: 8.8826 years is the Wikipedia table "computed interval" column (the reconstruction own output), the expected value in the same table is 8.88 years (3244.37 days). It is a consistency check of the quoted table, not an independent astronomical figure; it feeds the Saros pointer.' },
        { id: 'teeth_hyp', conf: 'estimated', text: 'Lost gears: m3 27, n1 53, n3 57 teeth.', why: 'These gears did not survive; their counts are the reconstructors\' choice (Tsigkros Table 4; n3 from Freeth 2008). The Metonic, Olympiad and Saros ratios pass through them, so those checks test the self-consistency of the reconstruction, not the original object.' },
        { id: 'layout', conf: 'estimated', text: 'Axis positions, directions and the axial layers of every gear.', why: 'No source opened tabulates axis coordinates. Centres are derived from the module and tooth counts (centre distance = m(za+zb)/2), the directions and the axial order are chosen freely.' },
        { id: 'anomaly', conf: 'estimated', text: 'The pin-and-slot lunar anomaly between k1 and k2 is replaced by a rigid 1:1 link (mean motion only).', why: 'The mean ratio is exactly 1 (50/50), so the checks are unaffected; the offset-axes epicyclic geometry (pin position, slot length) is not given by any source I opened.' },
        { id: 'decor', conf: 'estimated', text: 'Front and back plates, arbors, bore sizes and gear widths of 1.4 mm.', why: 'Drawn for recognisability from the published 34 x 18 x 9 cm case; their thickness and details are not measured. Plate positions are estimates.' },
      ],
    },
    parts,
    mechanism: {
      free: 'b1',
      links: [
        { t: 'same', a: 'b1', b: 'b2' },
        { t: 'same', a: 'c1', b: 'c2' },
        { t: 'same', a: 'd1', b: 'd2' },
        { t: 'same', a: 'e2', b: 'e5' },
        { t: 'same', a: 'k1', b: 'k2' },
        { t: 'same', a: 'e6', b: 'e1' },
        { t: 'same', a: 'l1', b: 'l2' },
        { t: 'same', a: 'm1', b: 'm2' },
        { t: 'same', a: 'm2', b: 'm3' },
        { t: 'same', a: 'n1', b: 'n3' },
        { t: 'same', a: 'e3', b: 'e4' },
        { t: 'same', a: 'f1', b: 'f2' },
        { t: 'same', a: 'g1', b: 'g2' },
        { t: 'same', a: 'h1', b: 'h2' },
        { t: 'ext', a: 'b2', b: 'c1' },
        { t: 'ext', a: 'c2', b: 'd1' },
        { t: 'ext', a: 'd2', b: 'e2' },
        { t: 'ext', a: 'e5', b: 'k1' },
        { t: 'ext', a: 'k2', b: 'e6' },
        { t: 'ext', a: 'e1', b: 'b3' },
        { t: 'ext', a: 'b2', b: 'l1' },
        { t: 'ext', a: 'l2', b: 'm1' },
        { t: 'ext', a: 'm2', b: 'n1' },
        { t: 'ext', a: 'n3', b: 'o1' },
        { t: 'ext', a: 'm3', b: 'e3' },
        { t: 'ext', a: 'e4', b: 'f1' },
        { t: 'ext', a: 'f2', b: 'g1' },
        { t: 'ext', a: 'g2', b: 'h1' },
        { t: 'ext', a: 'h2', b: 'i1' },
      ],
      drive: { outLabel: 'POINTER', rpm: 12,
        modes: [
          { id: 'moon', label: 'Mean Moon (b3)', driver: 'b1', shell: 'b3', publish: { value: YEAR / SID, text: '13.3687 turns/year', claim: 'r_moon', tol: 0.002 }, formula: '(c1/b2)(d1/c2)(e2/d2)(k1/e5)(e6/k2)(b3/e1)', note: 'One sidereal month per turn.' },
          { id: 'metonic', label: 'Metonic pointer (n)', driver: 'b1', shell: 'n1', publish: { value: -(YEAR / (235 * SYN / 5)), text: '1387.94 d/turn', claim: 'r_metonic', tol: 0.0005 }, formula: '(b2/l1)(l2/m1)(m2/n1) = 5/19', note: '235 months in 5 turns of a spiral dial.' },
          { id: 'olympiad', label: 'Olympiad dial (o)', driver: 'b1', shell: 'o1', publish: { value: 0.25, text: '4 years/turn', claim: 'r_olymp', tol: 0.0005 }, formula: '5/19 x 57/60 = 1/4', note: 'Games every 4 years.' },
          { id: 'prec', label: 'Lunar-orbit wheel (e3/e4)', driver: 'b1', shell: 'e3', publish: { value: -(1 / 8.8826), text: '8.88 years/turn', claim: 'r_prec', tol: 0.0005 }, formula: '(b2/l1)(l2/m1)(m3/e3)', note: 'Feeds the Saros train.' },
          { id: 'saros', label: 'Saros pointer (g)', driver: 'b1', shell: 'g1', publish: { value: -(YEAR / (223 * SYN / 4)), text: '1646.33 d/turn', claim: 'r_saros', tol: 0.0005 }, formula: '... (e4/f1)(f2/g1): 4 turns = 223 months', note: 'Eclipse prediction.' },
          { id: 'exel', label: 'Exeligmos pointer (i)', driver: 'b1', shell: 'i1', publish: { value: -(YEAR / (669 * SYN)), text: '19756 days/turn', claim: 'r_exel', tol: 0.00005 }, formula: '(g2/h1)(h2/i1) after the Saros wheel', note: 'Three Saros: whole days.' },
        ] },
    },
    director: { what: 'The Antikythera mechanism: a Greek bronze gearbox of about 30 wheels that predicted the Moon, the calendar and eclipses. Watch one turn of the year wheel drive every pointer.', modeDur: 4.5, tourDur: 3.4,
      tour: ['b1', 'b2', 'd2', 'o1', 'e3', 'i1'], outro: { title: 'Antikythera mechanism', sub: 'tooth counts from published CT work', line: '' } },
  };
})();
