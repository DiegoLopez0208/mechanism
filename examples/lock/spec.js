/*
 * spec.js - Fig 14: a pin tumbler lock, cut open, with a Kwikset KW1 key. The numbers are the published ones (the KW1 keying table: spacing, cut depths, key pin heights,
 * depth increment, plug diameter, MACS). The gate asks the model what the table implies and compares it with the table itself:
 *   key pin + cut depth is the same .501 in for all six heights, and it agrees with the .498 in plug diameter within .003 in,
 *   with the right key all five splits land on the shear line, one cut off by three steps leaves a pin across it (the plug is blocked),
 *   the code obeys the maximum adjacent cut specification, the drawn spacing and increments are the published ones.
 * Run "node scripts/check-spec.mjs examples/lock/spec.js".
 *
 * Frame: a side section (x along the key, y up). The key is a real polygon with V cuts; the pins ride on the cut roots, so every drawn height is a published number.
 */
(function () {
  const IN = 25.4;
  // the published table, in inches (lockwiki.com/index.php/Kwikset_Classic)
  const FIRST = 0.247, PITCH = 0.150, CUTW = 0.080, INC = 0.023, MACS = 4, PLUGD = 0.498, DEPTH = [0.329, 0.306, 0.283, 0.260, 0.237, 0.214], PIN = [0.172, 0.195, 0.218, 0.241, 0.264, 0.287];
  const CODE = [3, 1, 5, 2, 4], WRONG = [3, 1, 2, 2, 4];      // cut numbers from the shoulder; the wrong key differs in the third cut by three steps
  // drawn geometry, in mm (x along the key from its shoulder, y up from the bottom edge of the key)
  const X0 = 14, S = PLUGD * IN, YTOP = 8.51, TIP = 35, DRV = 8.6, YCAP = 24.5, YKW = 8.9, PR = 1.2, CH = 3.0, WZ = 8, KZ = 2.2;
  const cx = (i) => (FIRST + i * PITCH) * IN, dmm = (c) => DEPTH[c - 1] * IN, hmm = (c) => PIN[c - 1] * IN;
  const profile = (code) => (xk) => { if (xk >= TIP) return 0; let y = Math.min(YTOP, TIP - xk); code.forEach((c, i) => { y = Math.min(y, dmm(c) + Math.max(0, Math.abs(xk - cx(i)) - CUTW * IN / 2)); }); return Math.max(0, y); };      // V cuts at 45 degrees, flat roots
  const profOk = profile(CODE), profBad = profile(WRONG);
  const polygon = (prof) => { const pts = [[0, 0], [TIP, 0]]; for (let x = TIP; x >= 0; x -= 0.05) pts.push([x, prof(x)]); pts.push([0, prof(0)]); return pts; };
  const info = (title, lines, conf) => ({ title, lines, conf });
  const NS = 6;      // steps: five pins, then the key home
  // key position while it goes in: the tip passes pin i at step i + 0.3, then the key slides home
  const dxOf = (s) => { if (s >= NS) return 0; const d1 = cx(4) - TIP; if (s <= 4.3) return cx(0) - TIP + (cx(1) - cx(0)) * (s - 0.3); return Math.min(0, d1 * (1 - (s - 4.3) / (NS - 0.3 - 4.3))); };
  const lift = (i, s, phase) => (phase === 1 ? profBad(cx(i)) : profOk(cx(i) - dxOf(s)));
  const parts = [];
  const wall = (id, name, a, b, y0, y1, mat, ex, conf, claims) => parts.push({ id, name, kind: 'block', p: { w: b - a, d: y1 - y0, h: WZ, r: 0.3 }, mat, at: [(a + b) / 2 - X0, (y0 + y1) / 2, 0], explode: ex, conf, claims, tour: false });
  // plug: base under the keyway and a wall between each pair of chambers above it; housing: the same above the shear line
  parts.push({ id: 'plugBase', name: 'Plug (below the keyway)', kind: 'block', p: { w: 29, d: 1.5, h: WZ, r: 0.3 }, mat: 'aluminum', at: [14.5 - X0, -0.75, 0], explode: [0, -10, 0], conf: 'estimated', claims: ['est'], info: info('Plug', ['the part the key turns', 'its top is the shear line: .498 in above the key bottom'], ['estimated']) });
  for (let k = 0; k <= 5; k++) {
    const a = k === 0 ? 0 : cx(k - 1) + CH / 2, b = k === 5 ? 29 : cx(k) - CH / 2;
    wall('plugW' + k, 'Plug wall ' + (k + 1), a, b, YKW, S, 'aluminum', [0, -6, 0], 'estimated', ['est']);
    wall('houseW' + k, 'Housing wall ' + (k + 1), a, b, S, YCAP, 'steel-dark', [0, 8, 0], 'estimated', ['est']);
  }
  parts.push({ id: 'houseCap', name: 'Housing (top)', kind: 'block', p: { w: 33, d: 3, h: WZ, r: 0.4 }, mat: 'steel-dark', at: [14.5 - X0, YCAP + 1.5, 0], explode: [0, 14, 0], conf: 'estimated', claims: ['est'], info: info('Housing', ['holds the five spring chambers', 'the plug turns inside it'], ['estimated']) });
  parts.push({ id: 'houseBase', name: 'Housing (bottom)', kind: 'block', p: { w: 33, d: 3, h: WZ, r: 0.4 }, mat: 'steel-dark', at: [14.5 - X0, -3, 0], explode: [0, -16, 0], conf: 'estimated', claims: ['est'], tour: false });
  parts.push({ id: 'shear', name: 'Shear line', kind: 'block', p: { w: 33, d: 0.14, h: WZ + 0.4, r: 0.05 }, mat: 'copper', at: [14.5 - X0, S, 0], explode: [0, 0, 0], conf: 'estimated', why: 'The gap between plug and housing is drawn as a line: its height is the published plug diameter, the line itself is only a marker.', decor: true, tour: false });
  // pins, drivers and springs
  CODE.forEach((c, i) => {
    const h = hmm(c), x = cx(i) - X0, len0 = YCAP - (h + DRV), mv = (L) => ({ pos: [0, L, 0] });
    parts.push({ id: 'kp' + i, name: 'Key pin ' + (i + 1), kind: 'pin', p: { r: PR, len: h }, mat: 'brass', at: [x, h / 2, 0], rot: [-90, 0, 0], explode: [0, -6, 10], conf: 'spec', claims: ['pins'], tourAt: [0, dmm(c), 0], tourDim: 1.5, params: { len: { value: Math.round(h * 1000) / 1000, unit: 'mm', conf: 'spec', claim: 'pins', tol: 0.01 }, r: { unit: 'mm', conf: 'estimated', why: 'The table gives pin heights, not their diameter.' } }, tour: i === 2,
      motion: (s, t, ph) => mv(lift(i, s, ph)), info: info('Key pin ' + (i + 1) + ': height ' + PIN[c - 1].toFixed(3) + ' in', ['for cut ' + c + ' (root at ' + DEPTH[c - 1].toFixed(3) + ' in)', 'key pin + cut = ' + (PIN[c - 1] + DEPTH[c - 1]).toFixed(3) + ' in'], ['spec', 'estimated']) });
    parts.push({ id: 'dp' + i, name: 'Driver pin ' + (i + 1), kind: 'pin', p: { r: PR, len: DRV }, mat: 'steel', at: [x, h + DRV / 2, 0], rot: [-90, 0, 0], explode: [0, 4, 10], conf: 'estimated', claims: ['est'], tour: false, motion: (s, t, ph) => mv(lift(i, s, ph)) });
    parts.push({ id: 'sp' + i, name: 'Spring ' + (i + 1), kind: 'spring', p: { r: 1.3, wire: 0.35, turns: 8, len: len0 }, mat: 'steel-dark', at: [x, h + DRV + len0 / 2, 0], rot: [-90, 0, 0], explode: [0, 10, 10], conf: 'estimated', claims: ['est'], tour: false,
      motion: (s, t, ph) => { const L = lift(i, s, ph); return { pos: [0, L / 2, 0], scale: [1, 1, Math.max(0.05, (YCAP - (L + h + DRV)) / len0)] }; } });
  });
  // keys: the right one, and a copy with the third cut off by three steps (it appears in the "wrong key" phase)
  const keyPart = (id, name, prof, show) => ({ id, name, kind: 'profile', p: { pts: polygon(prof), len: KZ, bevel: 0.05 }, mat: 'brass', at: [-X0, 0, 0], explode: [0, 0, 7], conf: 'spec', claims: ['keyspec', 'depths'],
    motion: (s, t, ph) => (show(ph) ? { pos: [ph === 1 ? 0 : dxOf(s), 0, 0] } : { scale: 0.001 }) });
  parts.push(Object.assign(keyPart('key', 'Key KW1 (cuts ' + CODE.join('-') + ')', profOk, (ph) => ph !== 1), { tour: true, info: info('Key: cuts ' + CODE.join('-'), ['five V cuts, .150 in apart, first at .247 in', 'depths ' + CODE.map((c) => DEPTH[c - 1].toFixed(3)).join(' ') + ' in', 'flank angle and length: estimates'], ['spec', 'estimated']) }));
  parts.push(Object.assign(keyPart('keyW', 'Wrong key (cuts ' + WRONG.join('-') + ')', profBad, (ph) => ph === 1), { tour: false, conf: 'spec', info: info('Wrong key: cuts ' + WRONG.join('-'), ['the third cut is 2 instead of 5', 'three steps of .023 in too shallow'], ['spec']) }));
  parts.push({ id: 'keyBow', name: 'Key bow', kind: 'block', p: { w: 22, d: 22, h: 2.6, r: 6 }, mat: 'brass', at: [-12 - X0, 7, 0], explode: [0, 0, 7], conf: 'estimated', claims: ['est'], tour: false,
    decals: [{ face: '+z', at: [0, 0, 1.35], w: 14, h: 6, px: 30, items: [{ t: 'text', s: 'KW1', x: 0, y: 0, size: 3.6, weight: 800, font: 'mono', color: '#4a3a16' }] }],
    motion: (s, t, ph) => (ph === 1 ? { scale: 0.001 } : { pos: [dxOf(s), 0, 0] }) });
  parts.push({ id: 'keyBowW', name: 'Wrong key bow', kind: 'block', p: { w: 22, d: 22, h: 2.6, r: 6 }, mat: 'brass', at: [-12 - X0, 7, 0], explode: [0, 0, 7], conf: 'estimated', claims: ['est'], tour: false, motion: (s, t, ph) => (ph === 1 ? { pos: [0, 0, 0] } : { scale: 0.001 }) });

  // what the model computes, to be compared with the published table
  const inch = (mm) => mm / IN, tol = 0.005, maxAdj = Math.max(...CODE.slice(1).map((c, i) => Math.abs(c - CODE[i])));
  const topErr = (key) => Math.max(...CODE.map((c, i) => Math.abs(profile(key)(cx(i)) + hmm(c) - S))),      // the pins in the lock are always the ones for the right code; the key under test changes where they are lifted to
     stack = (c) => inch(profile([c, c, c, c, c])(cx(2)) + hmm(c));
  let combos = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) for (let d = 1; d <= 6; d++) for (let e = 1; e <= 6; e++) { const q = [a, b, c, d, e]; if (q.slice(1).every((v, i) => Math.abs(v - q[i]) <= MACS)) combos++; }
  const spread = Math.max(...[1, 2, 3, 4, 5, 6].map(stack)) - Math.min(...[1, 2, 3, 4, 5, 6].map(stack));
  const ok = topErr(CODE), bad = topErr(WRONG), ids = (p, n) => Array.from({ length: n }, (_, i) => p + i), r4 = (v) => Math.round(v * 10000) / 10000;

  window.SPEC = {
    id: 'lock', brand: { accent: '#d9a441' }, fig: 'Fig 14', kicker: 'REAL OBJECT', title: 'Pin tumbler lock', sub: 'Five stacks, one key: the split has to land on the shear line.',
    recognize: {
      object: 'A pin tumbler lock with its key (Kwikset KW1)',
      iconic: [{ text: 'a key with V cuts', parts: ['key', 'keyBow'] }, { text: 'five stacks: key pin, driver pin, spring', partsPrefix: ['kp', 'dp', 'sp'] }, { text: 'the plug turning inside the housing, with the shear line between them', parts: ['plugBase', 'houseCap', 'shear'] }],
      blind: { answer: 'A mechanical pin-tumbler lock cylinder in cutaway with a brass key pushed in: five spring-loaded pin stacks, an orange shear line plate (confidence 85 from a Haiku judge, 90 from a Sonnet judge)', judge: 'two fresh models (Haiku and Sonnet) with no context, shown a label-free still (scripts/stranger.mjs)', date: '2026-10-13', ok: true },
    },
    research: {
      sources: [
        { id: 'kw', title: 'Kwikset Classic - Lockwiki (keying specifications for the KW1 / 1176 blank)', url: 'https://www.lockwiki.com/index.php/Kwikset_Classic', fetched: '2026-10-13', note: 'The table of cuts: spacing .247 / .397 / .547 / ... in, depths .329 .306 .283 .260 .237 .214 in, key pins .172 .195 .218 .241 .264 .287 in, driver .180 in; plug diameter ~.498 in, shoulder to first cut .247 in, root to root .150 in, depth increment .023 in, cut width .080 in, MACS 4; six key pin heights and seven depths (the seventh only with master pins).' },
        { id: 'pt', title: 'Pin-tumbler - Lockwiki', url: 'https://lockwiki.com/index.php/Pin-tumbler', fetched: '2026-10-13', note: 'How it works: springs push the stacks down, the correct key aligns all key pins at the shear line and the plug rotates, a wrong key blocks it at the shear line. It gives no pin sizes.' },
        { id: 'clk', title: 'Kwikset KW1 Space & Depth Keys - CLK Supplies', url: 'https://clksupplies.com/products/kwikset-kw1-space-depth-keys', fetched: '2026-10-13', note: 'Spaces: 5, depths: 1-7 for the KW1 keyway (a vendor listing).' },
      ],
      claims: [
        { id: 'keyspec', conf: 'spec', text: 'The KW1 key has five cuts: the first .247 in from the shoulder, then every .150 in (root to root), each .080 in wide, with depth steps of .023 in and a maximum adjacent cut specification of 4.', src: ['kw', 'clk'] },
        { id: 'depths', conf: 'spec', text: 'Cut depths 1 to 6 are .329, .306, .283, .260, .237 and .214 in; a seventh, .191 in, exists only for master pins.', src: ['kw'] },
        { id: 'pins', conf: 'spec', text: 'The key pin heights for cuts 1 to 6 are .172, .195, .218, .241, .264 and .287 in: six heights, .023 in apart.', src: ['kw'] },
        { id: 'plug', conf: 'spec', text: 'The plug diameter is about .498 in.', src: ['kw'] },
        { id: 'principle', conf: 'spec', text: 'Each chamber holds a spring, a driver pin and a key pin. With the right key every key pin top is at the shear line and the plug turns; with a wrong key a pin crosses the shear line and blocks the plug.', src: ['pt'] },
        { id: 'stack', conf: 'derived', text: 'Key pin plus cut depth is .501 in for every height (.172+.329, .195+.306, ... .287+.214), within .003 in of the .498 in plug diameter: one stack height for all six, so any code lines up on the same shear line.', src: ['kw'], cross: 'The depth column and the key pin column are two columns of the same table; their sum is constant and within .003 in of the plug diameter listed beside them (listed as about .498 in).' },
        { id: 'est', conf: 'estimated', text: 'Pin diameter, chamber width, driver pin length, spring, walls, blade width (.335 in, read from a catalogue snippet), the 45 degree flanks of the cuts, the key length and the bow.', why: 'The table lists a driver of .180 in, but a driver that short cannot reach the shear line when the key pin rests on the keyway floor (.172 + .180 = .352 in against a stack of .501 in), so the drawing uses a longer one; flank angle, blade length and bow are not published.' },
      ],
    },
    parts,
    mechanism: {
      steps: {
        rate: 1.1, count: NS,
        kind: (i) => (i < 5 ? 'lit' : 'match'),
        label: (i) => {
          if (i < 5) { const c = CODE[i]; return { title: 'Pin ' + (i + 1) + ': cut ' + c + ', key pin ' + PIN[c - 1].toFixed(3) + ' in', formula: 'the key lifts the stack until the split between the pins is on the shear line', value: (PIN[c - 1] + DEPTH[c - 1]).toFixed(3) + ' in', chips: [{ text: 'cut ' + DEPTH[c - 1].toFixed(3), color: '#d9a441' }, { text: 'pin ' + PIN[c - 1].toFixed(3), color: '#c9ccd2' }, { text: '= ' + (PIN[c - 1] + DEPTH[c - 1]).toFixed(3) + ' in', color: '#7ed321' }] }; }
          return { title: 'All five splits are on the shear line', formula: 'nothing crosses it: the plug is free to turn', value: 'OPEN', chips: [{ text: 'five of five', color: '#7ed321' }, { text: 'plug free', color: '#7ed321' }] };
        },
      },
      calc: { vars: {
        ntok: { v: NS, label: 'steps', claim: 'principle' },
        spacing: { v: r4(inch(cx(1) - cx(0))), label: 'pin spacing', unit: 'in', claim: 'keyspec' }, first: { v: r4(inch(cx(0))), label: 'shoulder to first cut', unit: 'in', claim: 'keyspec' },
        dstep: { v: r4(inch(profile([1, 1, 1, 1, 1])(cx(0)) - profile([2, 2, 2, 2, 2])(cx(0)))), label: 'depth step (from the drawn key)', unit: 'in', claim: 'depths' },
        pstep: { v: r4(inch(hmm(2) - hmm(1))), label: 'key pin step (from the drawn pins)', unit: 'in', claim: 'pins' },
        spread: { v: r4(spread), label: 'spread of pin + depth over the six heights', unit: 'in', claim: 'stack' }, stackIn: { v: Math.round(stack(1) * 1000) / 1000, label: 'pin + depth', unit: 'in', claim: 'stack' },
        okErr: { v: r4(inch(ok)), label: 'worst split vs the shear line, right key', unit: 'in', claim: 'principle' }, blocked: { v: inch(bad) > tol ? 1 : 0, label: 'wrong key blocks the plug', claim: 'principle' },
        macsOk: { v: maxAdj <= MACS ? 1 : 0, label: 'adjacent cuts within MACS', claim: 'keyspec' }, combos: { v: combos, label: 'codes under MACS 4', claim: 'depths' },
      } },
      drive: { modes: [
        { id: 'unlock', label: 'The key goes in', steps: true, expr: 'ntok', unit: 'steps', digits: 0, formula: 'one stack at a time', dim: 0.6 },
        { id: 'wrong', label: 'A wrong key', expr: 'blocked', unit: 'blocked', digits: 0, formula: 'third cut three steps too shallow: its pin crosses the line', publish: { value: 1, claim: 'principle' }, show: ['keyW', 'keyBowW', 'kp2', 'dp2', 'sp2'], dim: 0.4 },
        { id: 'stack', label: 'Pin plus cut', expr: 'spread', unit: 'in', digits: 4, formula: 'key pin + cut depth is the same for all six heights', publish: { value: 0, tol: 0.0005, claim: 'stack' }, show: ids('kp', 5), dim: 0.5 },
        { id: 'plug', label: 'Stack against the plug', expr: 'stackIn', unit: 'in', digits: 3, formula: 'the stack height against the published plug diameter', publish: { value: PLUGD, tol: 0.005, claim: 'plug' }, show: ['plugBase', 'shear'].concat(ids('plugW', 6)), dim: 0.5 },
        { id: 'aligned', label: 'The right key', expr: 'okErr', unit: 'in', digits: 4, formula: 'worst distance between a split and the shear line, all five stacks', publish: { value: 0, tol: 0.005, claim: 'principle' }, show: ['shear'].concat(ids('kp', 5), ids('dp', 5)), dim: 0.4 },
        { id: 'spacing', label: 'Pin spacing', expr: 'spacing', unit: 'in', digits: 3, formula: 'root to root, from the drawn pins', publish: { value: PITCH, tol: 0.0005, claim: 'keyspec' }, show: ids('kp', 5), dim: 0.5 },
        { id: 'first', label: 'Shoulder to first cut', expr: 'first', unit: 'in', digits: 3, formula: 'from the drawn first pin', publish: { value: FIRST, tol: 0.0005, claim: 'keyspec' }, show: ['kp0', 'key'], dim: 0.5 },
        { id: 'dstep', label: 'Depth step', expr: 'dstep', unit: 'in', digits: 3, formula: 'measured on the drawn key, cut 1 against cut 2', publish: { value: INC, tol: 0.0005, claim: 'depths' }, show: ['key'], dim: 0.5 },
        { id: 'pstep', label: 'Key pin step', expr: 'pstep', unit: 'in', digits: 3, formula: 'measured on the drawn pins', publish: { value: INC, tol: 0.0005, claim: 'pins' }, show: ids('kp', 5), dim: 0.5 },
        { id: 'macs', label: 'Adjacent cuts', expr: 'macsOk', unit: 'within MACS 4', digits: 0, formula: 'the code ' + CODE.join('-') + ' has a largest step of ' + maxAdj + ' between neighbours', publish: { value: 1, claim: 'keyspec' }, show: ['key'], dim: 0.5 },
        { id: 'codes', label: 'How many keys', expr: 'combos', unit: 'codes', digits: 0, formula: 'six depths, five cuts, adjacent cuts within 4 steps (7776 before the rule)', show: ['key'], dim: 0.5 },
      ] },
    },
    paperScene: { kind: 'pin-section', inch: IN, first: FIRST, pitch: PITCH, depth: DEPTH, pin: PIN, plug: PLUGD, code: CODE, wrong: WRONG, driver: DRV, cap: YCAP, keyway: YKW, keyTop: YTOP, tip: TIP, pinR: PR, chamber: CH, profile },
    director: { outro: { url: 'github.com/DiegoLopez0208/mechanism', line: 'a skill for Claude Code and other coding agents' },  cold: { dur: 8, question: 'Does the key that lines the pins up open the lock, and a key with one cut wrong not?' }, what: 'A pin tumbler lock, cut open. Each of the five stacks has a spring, a driver pin and a key pin. The right key lifts them until every split sits on the shear line.', legend: [{ color: '#b08d57', text: 'key and key pins' }, { color: '#9aa3ad', text: 'driver pins' }, { color: '#d98a4a', text: 'shear line' }], views: { iso: { yaw: -14, pitch: 26 }, front: { yaw: 0, pitch: 10 }, side: { yaw: 20, pitch: 22 }, three: { yaw: -8, pitch: 32 } }, modeDur: 3.6, tourAngles: [[-14, 22], [10, 16], [-22, 26], [14, 12]], tour: ['key', 'kp2', 'plugBase', 'houseCap'], short: { modes: ['unlock', 'wrong', 'aligned'], tour: ['key', 'kp2'] } },
  };
})();
