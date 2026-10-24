// geom2d.test.mjs - Draft 0.2's declared 2D geometry (kit/geom2d.js) in Node, with no browser and no three.js: construction, exact
// values, rejection of invalid geometry, the dimensions it gives the gate, the view set Paper draws, and the gate's semantics
// (a valid drawing is not a verified one).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// the modules scripts/check-spec.mjs loads, in a context with no THREE and no document: the geometry must not need either
const load = () => { const ctx = vm.createContext({ console }); ctx.window = ctx; for (const f of ['kit/kin.js', 'kit/geom2d.js', 'kit/spec-core.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: path.join(root, f) }); return ctx; };
const ctx = load(), G = ctx.MX.geom2d, S = ctx.MX.spec;
const plain = (v) => JSON.parse(JSON.stringify(v));
const specOf = (name) => { const c = load(); vm.runInContext(fs.readFileSync(path.join(root, 'examples', name, 'spec.js'), 'utf8'), c); return { spec: c.SPEC, ctx: c }; };
const close = (a, b, msg, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${msg}: ${a} vs ${b}`);
const build = (p) => G.build(Object.assign({ unit: 'mm' }, p));
const errs = (p) => build(p).errors.join(' | ');

test('construction: exact areas, normalised contours, expanded patterns', () => {
  const r = build({ outline: { type: 'rect', w: 160, h: 100, r: 6 } });
  assert.deepEqual(plain(r.errors), []); close(r.facts.outlineArea, 160 * 100 - (4 - Math.PI) * 36, 'rounded rect area');
  close(build({ outline: { type: 'circle', d: 140 } }).facts.outlineArea, Math.PI * 70 * 70, 'circle area');
  // a clockwise polygon is accepted and normalised; its area is positive
  const cw = build({ outline: { type: 'polygon', points: [[0, 0], [0, 10], [10, 10], [10, 0]] } });
  assert.deepEqual(plain(cw.errors), []); close(cw.facts.outlineArea, 100, 'clockwise square');
  // polar pattern: ids 1..n, exact positions on the pitch circle
  const f = build({ outline: { type: 'circle', d: 140 }, patterns: [{ id: 'b', type: 'polar', of: { type: 'circle', d: 11 }, n: 6, pcd: 110, start: 90 }] });
  assert.deepEqual(plain(f.holes.map((h) => h.id)), ['b.1', 'b.2', 'b.3', 'b.4', 'b.5', 'b.6']);
  f.holes.forEach((h, k) => { close(h.cx, 55 * Math.cos((90 + 60 * k) * Math.PI / 180), 'x of ' + h.id, 1e-12); close(h.cy, 55 * Math.sin((90 + 60 * k) * Math.PI / 180), 'y of ' + h.id, 1e-12); close(Math.hypot(h.cx, h.cy), 55, 'on the pitch circle'); });
  const l = build({ outline: { type: 'rect', w: 100, h: 40 }, patterns: [{ id: 'v', type: 'linear', of: { type: 'circle', d: 5 }, n: 5, step: [11, 0], at: [-22, 0] }] });
  assert.deepEqual(plain(l.holes.map((h) => [h.id, h.cx, h.cy])), [['v.1', -22, 0], ['v.2', -11, 0], ['v.3', 0, 0], ['v.4', 11, 0], ['v.5', 22, 0]]);
  // lines and a section are kept as declared
  const s = build({ outline: { type: 'rect', w: 10, h: 10 }, lines: [{ type: 'segment', a: [0, 0], b: [5, 0], style: 'center' }, { type: 'arc', at: [0, 0], r: 3, from: 0, to: 90 }, { type: 'polyline', points: [[0, 0], [1, 1], [2, 0]] }], section: { name: 'B-B' } });
  assert.deepEqual(plain(s.errors), []); assert.equal(s.lines.length, 3); assert.deepEqual(plain(s.section), { name: 'B-B', angle: 45, pitch: 3 });
});

test('the three demonstration parts: net areas and named dimensions, computed by hand', () => {
  const pi = Math.PI, t = (4 - pi);
  const want = {
    'demo-plate': { outline: 160 * 100 - t * 36, holes: 4 * pi * 3.3 * 3.3 + (44 * 22 - t * 16) + pi * 36 + 5 * pi * 6.25, n: 11 },
    'demo-flange': { outline: pi * 70 * 70, holes: pi * 25 * 25 + 6 * pi * 5.5 * 5.5, n: 7 },
    'demo-section': { outline: 120 * 30 + 85 * 25 + 40 * 25, holes: pi * 36 + pi * 25 + 50 * 8, n: 3 },
  };
  for (const [name, w] of Object.entries(want)) {
    const { spec } = specOf(name), m = G.build(spec.parts[0].p);
    assert.deepEqual(plain(m.errors), [], name); close(m.facts.outlineArea, w.outline, name + ' outline'); close(m.facts.holeArea, w.holes, name + ' holes'); close(m.facts.netArea, w.outline - w.holes, name + ' net'); assert.equal(m.facts.holes, w.n);
  }
  // the plate's cable window is declared with corner radius R4 and its area is the rounded one, not 44 x 22
  const pm = G.build(specOf('demo-plate').spec.parts[0].p), win = pm.holes.find((h) => h.id === 'window');
  assert.equal(specOf('demo-plate').spec.parts[0].p.holes.find((h) => h.id === 'window').r, 4, 'R4 is declared in the spec');
  assert.equal(win.r, 4); close(G.area(win), 44 * 22 - (4 - Math.PI) * 16, 'window area with R4 corners'); assert.ok(G.area(win) < 44 * 22); assert.equal(pm.dims['window.r'], 4);
  // every area is positive: holes lie inside the material and do not overlap, so the net area cannot go negative
  for (const name of ['demo-plate', 'demo-flange', 'demo-section']) { const m = G.build(specOf(name).spec.parts[0].p); assert.ok(m.holes.every((h) => G.area(h) > 0) && m.facts.netArea > 0 && m.facts.netArea < m.facts.outlineArea, name); }
  // datums: the left and bottom edge of the outline's box
  const plate = G.build(specOf('demo-plate').spec.parts[0].p).dims;
  assert.deepEqual(plain({ w: plate['outline.w'], h: plate['outline.h'], r: plate['outline.r'], fx: plate['fix1.x'], fy: plate['fix1.y'], px: plate['pilot.x'], py: plate['pilot.y'], ww: plate['window.w'], vent: plate['vent.step'], n: plate['vent.n'], t: plate.thickness }),
    { w: 160, h: 100, r: 6, fx: 12, fy: 12, px: 118, py: 58, ww: 44, vent: 11, n: 5, t: 4 });
  const flange = G.build(specOf('demo-flange').spec.parts[0].p).dims;
  assert.deepEqual(plain({ d: flange['outline.d'], bore: flange['bore.d'], pcd: flange['bolts.pcd'], n: flange['bolts.n'], b: flange['bolts.d'] }), { d: 140, bore: 50, pcd: 110, n: 6, b: 11 });
  const bracket = G.build(specOf('demo-section').spec.parts[0].p).dims;
  assert.deepEqual(plain({ w: bracket['outline.w'], h: bracket['outline.h'], px: bracket['pin.x'], py: bracket['pin.y'], cw: bracket['channel.w'], ch: bracket['channel.h'] }), { w: 120, h: 80, px: 20, py: 60, cw: 50, ch: 8 });
});

test('invalid geometry is refused with a message that names the problem', () => {
  const box = { type: 'rect', w: 100, h: 60 };
  const cases = [
    [{ unit: 'in', outline: box }, /unit "in" is not supported/],
    [{ outline: { type: 'rect', w: 100, h: NaN } }, /finite numbers/],
    [{ outline: { type: 'rect', w: -5, h: 10 } }, /must be positive/],
    [{ outline: { type: 'circle', d: 0 } }, /diameter must be positive/],
    [{ outline: { type: 'rect', w: 10, h: 10, r: 6 } }, /corner radius 6/],
    [{ outline: { type: 'polygon', points: [[0, 0], [1, 1]] } }, /at least 3 points/],
    [{ outline: { type: 'polygon', points: [[0, 0], [5, 5], [10, 10]] } }, /no area/],
    [{ outline: { type: 'polygon', points: [[0, 0], [10, 10], [10, 0], [0, 10]] } }, /cross or touch/],      // a bow tie
    [{ outline: { type: 'polygon', points: [[0, 0], [10, 0], [10, 0], [10, 10]] } }, /same point/],
    [{ outline: { type: 'hexagon', s: 4 } }, /unknown shape type/],
    [{ outline: box, holes: [{ type: 'circle', d: 4 }] }, /has no id/],
    [{ outline: box, holes: [{ id: 'a', type: 'circle', d: 4 }, { id: 'a', type: 'circle', d: 4, at: [20, 0] }] }, /used twice/],
    [{ outline: box, holes: [{ id: 'out', type: 'circle', d: 10, at: [60, 0] }] }, /hole out is not inside/],
    [{ outline: box, holes: [{ id: 'edge', type: 'circle', d: 10, at: [45, 0] }] }, /hole edge is not inside/],      // exactly tangent to the right edge
    [{ outline: box, holes: [{ id: 'a', type: 'circle', d: 10 }, { id: 'b', type: 'circle', d: 10, at: [8, 0] }] }, /overlap or touch/],
    [{ outline: box, holes: [{ id: 'a', type: 'circle', d: 10 }, { id: 'b', type: 'circle', d: 10, at: [10, 0] }] }, /overlap or touch/],      // exactly touching
    [{ outline: box, holes: [{ id: 'a', type: 'rect', w: 20, h: 10 }, { id: 'b', type: 'circle', d: 6, at: [12, 0] }] }, /overlap or touch/],
    [{ outline: box, patterns: [{ id: 'p', type: 'polar', of: { type: 'circle', d: 4 }, n: 2.5, pcd: 30 }] }, /integer of at least 2/],
    [{ outline: box, patterns: [{ id: 'p', type: 'polar', of: { type: 'circle', d: 4 }, n: 1, pcd: 30 }] }, /a single hole goes in holes/],
    [{ outline: box, patterns: [{ id: 'p', type: 'polar', of: { type: 'circle', d: 4 }, n: 4, pcd: 0 }] }, /pcd must be a positive/],
    [{ outline: box, holes: [{ id: 'a', type: 'circle', d: 6 }, { id: 'b', type: 'circle', d: 6 }] }, /holes a and b overlap or touch/],      // same place, two ids
    [{ outline: box, holes: [{ id: 'a', type: 'circle', d: 6, at: [10, 0] }], patterns: [{ id: 'p', type: 'linear', of: { type: 'circle', d: 4 }, n: 3, step: [10, 0], at: [-10, 0] }] }, /holes a and p\.3 overlap/],
    [{ outline: { type: 'circle', d: 10 }, holes: [{ id: 'h', type: 'circle', d: 20 }] }, /hole h is not inside/],      // a hole larger than the part
    [{ outline: box, patterns: [{ id: 'p', type: 'polar', of: { type: 'rect', w: 4, h: 2 }, n: 4, pcd: 30 }] }, /repeats a circle/],
    [{ outline: box, patterns: [{ id: 'p', type: 'polar', of: { type: 'circle', d: 12 }, n: 8, pcd: 30 }] }, /overlap or touch/],      // chord 11.5 < 12
    [{ outline: box, patterns: [{ id: 'p', type: 'linear', of: { type: 'circle', d: 2 }, n: 3, step: [0, 0] }] }, /not zero/],
    [{ outline: box, lines: [{ type: 'arc', at: [0, 0], r: 0, from: 0, to: 90 }] }, /positive r/],
    [{ outline: box, lines: [{ type: 'segment', a: [1, 1], b: [1, 1] }] }, /zero length/],
    [{ outline: box, section: { hatch: { pitch: 0 } } }, /pitch a positive/],
    [{ outline: box, thickness: -2 }, /thickness must be a positive/],
  ];
  for (const [p, re] of cases) assert.match(errs(p), re, JSON.stringify(p).slice(0, 120));
  // a polygonal hole whose vertices are all inside an L-shaped outline but whose edge crosses the notch: refused (the edges are tested too)
  const L = { type: 'polygon', points: [[0, 0], [100, 0], [100, 40], [40, 40], [40, 100], [0, 100]] };
  assert.deepEqual(plain(build({ outline: L, holes: [{ id: 'ok', type: 'rect', w: 20, h: 20, at: [20, 20] }] }).errors), []);
  assert.match(errs({ outline: L, holes: [{ id: 'notch', type: 'polygon', points: [[30, 30], [90, 30], [35, 90]] }] }), /hole notch is not inside/);
  // nothing invalid leaks a fact or a dimension
  const bad = build({ outline: box, holes: [{ id: 'out', type: 'circle', d: 10, at: [60, 0] }] }); assert.equal(bad.facts, null); assert.deepEqual(plain(bad.dims), {});
});

test('the view set: exact arcs, one region with every contour, dimension lines that say what they measure; the same input gives the same output', () => {
  for (const name of ['demo-plate', 'demo-flange', 'demo-section']) {
    const { spec, ctx: c } = specOf(name), vs = c.MX.geom2d.viewSet(spec, c.MX.spec), again = c.MX.geom2d.viewSet(spec, c.MX.spec);
    assert.equal(vs.layout, 'piece'); assert.equal(vs.entries.length, 1);
    const v = vs.entries[0].views.front, m = c.MX.geom2d.build(spec.parts[0].p);
    assert.deepEqual(Object.keys(vs.entries[0].views), ['front'], name + ': only the view the geometry gives (no invented side view)');
    const ser = (x) => JSON.stringify({ ...x, entries: x.entries.map((e) => ({ ...e, views: { front: { ...e.views.front, points: Array.from(e.views.front.points) } } })) });
    assert.equal(ser(vs), ser(again), name + ': deterministic');
    // every circle of the geometry is an exact arc of its own radius, at its centre (view y is model y flipped)
    m.holes.filter((h) => h.type === 'circle').concat(m.outline.type === 'circle' ? [m.outline] : []).forEach((h) => assert.ok(v.arcs.some((a) => a[0] === h.cx && a[1] === -h.cy && a[2] === h.r && a[4] - a[3] === Math.PI * 2), name + ': circle ' + (h.id || 'outline')));
    // the region holds the outline and every hole (an even-odd fill leaves the holes empty)
    const contours = v.region.filter((op) => op[0] === 'M' || op[0] === 'C').length; assert.equal(contours, 1 + m.holes.length, name + ': contours in the region');
    assert.equal(!!v.section, name === 'demo-section', name + ': hatched only when declared a section');
    // a linear dimension's text is the distance between its two ends along its axis; a diameter's is twice its radius
    for (const d of v.dims) {
      if (d.kind === 'linear') close(Math.abs(d.dir === 'h' ? d.b[0] - d.a[0] : d.b[1] - d.a[1]), d.value, name + ' ' + d.key + ' line length');
      if (d.kind === 'dia') close(d.value, 2 * d.r, name + ' ' + d.key + ' diameter');
      if (d.key) { assert.ok(d.key in m.dims, name + ': ' + d.key + ' is a named dimension'); close(m.dims[d.key], d.value, name + ' ' + d.key + ' value'); }
      assert.equal(d.status, 'declared', name + ': nothing in the demonstration specs is compared with a source');
    }
  }
});

test('the gate: geometry checks are consistency, not evidence; a dimension is compared only against a claimed value', () => {
  const { spec } = specOf('demo-plate');
  const base = S.validate(spec); assert.deepEqual(plain(base.errors), []); assert.equal(base.verdict.state, 'NOTHING CHECKED', 'a valid synthetic drawing is not verified');
  assert.ok(base.lines.some((l) => /^geometry plate: 160\.00 x 100\.00 mm, net area 14666\.71 mm2/.test(l)), base.lines.join('\n'));
  // the same plate with its width published by a (test) source: one dimension compared, the rest declared
  const withSource = (value, conf = 'spec') => { const s = JSON.parse(JSON.stringify(spec)); s.research.sources.push({ id: 'drawing', title: 'Test drawing sheet', url: 'https://github.com/DiegoLopez0208/mechanism', fetched: '2026-10-19' });
    s.research.claims.push({ id: 'width', conf, text: 'The plate is ' + value + ' mm wide.', src: ['drawing'], why: 'test' }); s.parts[0].params = { 'outline.w': { value, unit: 'mm', conf, claim: 'width' } }; return s; };
  const ok = S.validate(withSource(160)); assert.deepEqual(plain(ok.errors), []); assert.equal(ok.verdict.dimensions, 1); assert.deepEqual(plain(S.sizeEvidence(withSource(160).parts[0]).compared), ['outline.w']);
  const vs = G.viewSet(withSource(160), S); const w = vs.entries[0].views.front.dims.find((d) => d.key === 'outline.w'); assert.equal(w.status, 'compared'); assert.equal(vs.parts.plate.dimCount.compared, 1);
  assert.match(S.validate(withSource(150)).errors.join(' '), /outline\.w is drawn at 160 but the source says 150/);
  const est = withSource(160, 'estimated'); assert.equal(S.validate(est).verdict.dimensions, 0, 'an estimated value is not a comparison'); assert.equal(G.viewSet(est, S).entries[0].views.front.dims.find((d) => d.key === 'outline.w').status, 'estimated');
  const wrongKey = JSON.parse(JSON.stringify(spec)); wrongKey.parts[0].params = { 'outline.width': { value: 160, conf: 'estimated', why: 'test' } };
  assert.match(S.validate(wrongKey).errors.join(' '), /params\.outline\.width is not a dimension of this part \(a drawing has: .*outline\.w/);
  const inch = withSource(160); inch.parts[0].params['outline.w'].unit = 'in'; assert.match(S.validate(inch).errors.join(' '), /the number matches and the unit does not/);
  // a geometry error fails the gate; a drawing needs no 3D position
  const broken = JSON.parse(JSON.stringify(spec)); broken.parts[0].p.holes.push({ id: 'off', type: 'circle', d: 20, at: [80, 0] });
  assert.match(S.validate(broken).errors.join(' '), /part plate: geometry: hole off is not inside the material/);
  assert.ok(!S.validate(spec).errors.some((e) => /missing at/.test(e)));
  // without kit/geom2d.js a drawing is an error, not a silent pass
  const bare = vm.createContext({ console }); bare.window = bare; vm.runInContext(fs.readFileSync(path.join(root, 'kit', 'spec-core.js'), 'utf8'), bare, { filename: path.join(root, 'kit', 'spec-core.js') });
  assert.match(bare.MX.spec.validate(spec).errors.join(' '), /kit\/geom2d\.js is not loaded/);
});

test('check-spec (the gate in Node) passes the three demonstrations and prints their geometry', async () => {
  const { spawnSync } = await import('node:child_process');
  for (const name of ['demo-plate', 'demo-flange', 'demo-section']) {
    const r = spawnSync(process.execPath, ['scripts/check-spec.mjs', 'examples/' + name + '/spec.js'], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /^geometry \w+: .* \(internal consistency, not evidence\)$/m); assert.match(r.stdout, /verdict: NOTHING CHECKED/);
  }
});
