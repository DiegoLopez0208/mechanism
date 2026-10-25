// svg2d.test.mjs - Draft 0.3's engineering SVG (kit/svg2d.js): the file says, in its own numbers, what geom2d.build() says. Scale 1:1 is
// real (a hole declared Ø6.6 is a circle of radius 3.3 user units = mm); sheet-fit says it is not 1:1; curves stay curves; every
// dimension's value is the geometry's; the text is escaped; the same spec gives the same bytes; invalid geometry exports nothing;
// a layout that cannot be legible stops instead of overlapping; the CLI writes only where it may. One test opens the files in Chromium.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import vm from 'node:vm';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { withBrowser, findBrowser } from '../scripts/lib/browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = () => { const c = vm.createContext({ console }); c.window = c; for (const f of ['kit/kin.js', 'kit/geom2d.js', 'kit/spec-core.js', 'kit/svg2d.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c, { filename: path.join(root, f) }); return c; };
const specOf = (name) => { const c = load(); vm.runInContext(fs.readFileSync(path.join(root, 'examples', name, 'spec.js'), 'utf8'), c); return { spec: c.SPEC, c }; };
const close = (a, b, msg, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);
const DEMOS = { 'demo-plate': 'plate', 'demo-flange': 'flange', 'demo-section': 'bracket' };
const exp = (name, mode, extra = {}) => { const { spec, c } = specOf(name); return { ...c.MX.svg2d.part(spec, DEMOS[name], { mode, ...extra }), spec, c }; };
const attr = (tag, k) => { const m = new RegExp('\\s' + k + '="([^"]*)"').exec(tag); return m ? m[1] : null; };
const tagById = (svg, id) => (new RegExp('<[a-z]+ id="' + id + '"[^>]*>').exec(svg) || [])[0];

// the area enclosed by one of the exporter's paths (M, L, A, Z): the polygon of its vertices plus each arc's circular segment
function pathArea(d) {
  const segs = d.trim().split(/(?=[MLAZ])/).map((s) => [s[0], s.slice(1).trim().split(/\s+/).filter(Boolean).map(Number)]); let area = 0, start = null, cur = null;
  for (const [c, v] of segs) {
    if (c === 'M') { cur = v; start = v; }
    else if (c === 'L') { area += (cur[0] * v[1] - v[0] * cur[1]) / 2; cur = v; }
    else if (c === 'A') { const [r, , , large, sweep, x, y] = v, p = [x, y]; area += (cur[0] * p[1] - p[0] * cur[1]) / 2;
      const th0 = 2 * Math.asin(Math.min(1, Math.hypot(p[0] - cur[0], p[1] - cur[1]) / (2 * r))), th = large ? 2 * Math.PI - th0 : th0; area += (sweep ? 1 : -1) * r * r / 2 * (th - Math.sin(th)); cur = p; }
    else if (c === 'Z') { area += (cur[0] * start[1] - start[0] * cur[1]) / 2; cur = start; }
  }
  return Math.abs(area);
}
// the box of a path's end points (enough for the axis-aligned outlines here: their extreme points are vertices or arc ends)
const pathBox = (d) => { const xs = [], ys = []; for (const s of d.trim().split(/(?=[MLA])/)) { const v = s.slice(1).trim().split(/\s+/).map(Number); if (s[0] === 'A') { xs.push(v[5]); ys.push(v[6]); } else if (s[0] === 'M' || s[0] === 'L') { xs.push(v[0]); ys.push(v[1]); } } return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
// a small well-formedness check: every tag closes in order, attributes are quoted, no stray < or >, no bare &
const TAG = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>/g;
function wellFormed(xml) {
  const body = xml.replace(/^<\?xml[^>]*\?>\s*/, '').replace(/<!--[\s\S]*?-->/g, ''), stack = [];
  for (const m of body.matchAll(TAG)) { if (m[1]) { if (stack.pop() !== m[2]) return 'unbalanced </' + m[2] + '>'; } else if (!m[4]) stack.push(m[2]); }
  if (stack.length) return 'unclosed <' + stack.join('>, <') + '>';
  if (/[<>]/.test(body.replace(TAG, ''))) return 'a stray < or > outside a tag';
  if (/&(?!amp;|lt;|gt;|quot;|#39;)/.test(body)) return 'a bare &';
  return null;
}

test('demo-plate at 1:1: 160 x 100 mm outline with R6 corners, Ø6.6 holes of radius 3.3 mm, the R4 window, the net area of Draft 0.2', () => {
  const { svg, report, spec, c } = exp('demo-plate', 'geometry-1to1'), m = c.MX.geom2d.build(spec.parts[0].p);
  const head = /<svg [^>]*>/.exec(svg)[0], vb = attr(head, 'viewBox').split(' ').map(Number);
  assert.equal(attr(head, 'width'), vb[2] + 'mm', '1 user unit = 1 mm: width in mm equals the viewBox width'); assert.equal(attr(head, 'height'), vb[3] + 'mm'); assert.equal(attr(head, 'data-scale'), '1'); assert.equal(report.scaleText, '1:1');
  const outline = attr(tagById(svg, 'plate-outline'), 'd'), b = pathBox(outline); close(b[2] - b[0], 160, 'outline width'); close(b[3] - b[1], 100, 'outline height');
  assert.equal((outline.match(/A6 6 /g) || []).length, 4, 'four exact R6 arcs, not segments');
  for (const [id, x, y] of [['fix1', -68, -38], ['fix2', 68, -38], ['fix3', 68, 38], ['fix4', -68, 38]]) {
    const t = tagById(svg, 'plate-' + id); assert.ok(t.startsWith('<circle'), id + ' is a <circle>'); assert.equal(+attr(t, 'r') * 2, 6.6, id + ': diameter 6.6 mm'); assert.equal(+attr(t, 'cx'), x); assert.equal(+attr(t, 'cy'), -y, id + ': the model y, flipped');
  }
  const win = attr(tagById(svg, 'plate-window'), 'd'), wb = pathBox(win); close(wb[2] - wb[0], 44, 'window width'); close(wb[3] - wb[1], 22, 'window height'); assert.equal((win.match(/A4 4 /g) || []).length, 4, 'four R4 arcs');
  close(pathArea(win), 44 * 22 - (4 - Math.PI) * 16, 'window area with R4', 1e-3);
  // the net area of the exported file, from its own primitives
  const holes = [...svg.matchAll(/<circle id="plate-[^"]+" class="edge hole"[^>]* r="([\d.]+)"/g)].reduce((s, q) => s + Math.PI * q[1] * q[1], 0) + pathArea(win);
  close(pathArea(outline) - holes, m.facts.netArea, 'net area of the file = net area of geom2d.build()', 1e-3); close(m.facts.netArea, 14666.712, 'the Draft 0.2 value', 1e-3);
});

test('the three demonstrations: every contour of build() is in the file at its exact size and place; every dimension value is a build() value', () => {
  for (const name of Object.keys(DEMOS)) {
    const { svg, spec, c } = exp(name, 'geometry-1to1'), m = c.MX.geom2d.build(spec.parts[0].p);
    assert.equal(wellFormed(svg), null, name + ': XML');
    for (const h of m.holes) {
      const t = tagById(svg, DEMOS[name] + '-' + c.MX.svg2d.slug(h.id)); assert.ok(t, name + ': hole ' + h.id + ' exported'); assert.equal(attr(t, 'data-geometry-id'), h.id);
      if (h.type === 'circle') { assert.ok(t.startsWith('<circle')); close(+attr(t, 'r'), h.r, name + ' ' + h.id + ' r', 1e-4); close(+attr(t, 'cx'), h.cx, h.id + ' cx', 1e-4); close(+attr(t, 'cy'), -h.cy, h.id + ' cy', 1e-4); }
    }
    if (m.outline.type === 'circle') { const t = tagById(svg, DEMOS[name] + '-outline'); assert.ok(t.startsWith('<circle')); assert.equal(+attr(t, 'r'), m.outline.r); }
    const vals = [...svg.matchAll(/<g class="dim [^"]*" data-key="([^"]*)" data-value="([^"]*)"/g)];
    assert.ok(vals.length >= 3, name + ': dimensions written');
    for (const [, key, value] of vals) if (key) { assert.ok(key in m.dims, name + ': ' + key); close(+value, m.dims[key], name + ' ' + key, 1e-4); }
    if (name === 'demo-section') assert.match(svg, /<pattern id="bracket-hatch"[^>]*patternTransform="rotate\(45\)"/, 'the section is hatched at 45 degrees');
    // a linear dimension's own line, drawn in the file, is exactly as long as the value its text gives (1:1)
    for (const g of svg.matchAll(/<g class="dim linear [^"]*" data-key="([^"]*)" data-value="([^"]*)">((?:<line [^>]*\/>){3})/g)) {
      const l = [...g[3].matchAll(/<line ([^>]*)\/>/g)][2][1], len = Math.hypot(+attr(' ' + l, 'x2') - +attr(' ' + l, 'x1'), +attr(' ' + l, 'y2') - +attr(' ' + l, 'y1'));
      close(len, +g[2], name + ' ' + g[1] + ': the dimension line measures its value', 1e-4);
    }
  }
});

test('sheet-fit is an A4 sheet that says its scale and that it is not 1:1; text and strokes keep their size in both modes', () => {
  const s = exp('demo-plate', 'sheet-fit'), o = exp('demo-plate', 'geometry-1to1'), head = /<svg [^>]*>/.exec(s.svg)[0], k = +attr(head, 'data-scale');
  assert.equal(attr(head, 'width'), '297mm'); assert.equal(attr(head, 'height'), '210mm'); assert.equal(attr(head, 'viewBox'), '0 0 297 210');
  assert.ok(k > 0 && k < 1); close(+attr(tagById(s.svg, 'plate-fix1'), 'r'), 3.3 * k, 'the geometry is scaled by k', 1e-4);
  assert.match(s.svg, /SCALE 1:[\d.]+ \(NOT 1:1/); assert.match(o.svg, /SCALE 1:1 \(geometry at its declared size\)/);
  const dimSizes = (svg) => [...new Set(/<g class="dims">([\s\S]*?)\n<\/g>/.exec(svg)[1].match(/font-size="[\d.]+"/g))];
  assert.deepEqual(dimSizes(s.svg), ['font-size="3.5"']); assert.deepEqual(dimSizes(o.svg), ['font-size="3.5"'], 'dimension text is 3.5 mm at any scale');
  assert.ok(/class="edge outline"[^>]*stroke-width="0.5"/.test(s.svg) && /class="edge outline"[^>]*stroke-width="0.5"/.test(o.svg), 'the visible edge is 0.5 mm at any scale');
});

test('what is known is written down: valid geometry, dimensions from it, evidence counts, the verdict, what did not run, not for manufacture', () => {
  for (const name of Object.keys(DEMOS)) for (const mode of ['geometry-1to1', 'sheet-fit']) {
    const { svg, report } = exp(name, mode), desc = /<desc>([\s\S]*?)<\/desc>/.exec(svg)[1];
    assert.equal(report.verdict, 'NOTHING CHECKED', 'the synthetic parts stay NOTHING CHECKED'); assert.equal(report.dimCount.compared, 0);
    for (const s of ['GEOMETRY VALID', 'DIMENSIONS FROM THE GEOMETRY: 0 compared with a source', 'GATE VERDICT: NOTHING CHECKED', 'NOT RUN: the 3D mesh area check', 'NOT A MANUFACTURING DRAWING']) assert.ok(desc.includes(s), name + ' ' + mode + ': ' + s);
    assert.ok(!/class="dim [^"]* compared"/.test(svg), 'no dimension is drawn as compared');
  }
  // a dimension with a sourced, matching value is drawn as compared, and counted
  const { spec, c } = specOf('demo-plate'); spec.research.sources.push({ id: 'sheet', title: 'Test drawing sheet', url: 'https://github.com/DiegoLopez0208/mechanism', fetched: '2026-10-19' });
  spec.research.claims.push({ id: 'w', conf: 'spec', text: 'The plate is 160 mm wide.', src: ['sheet'] }); spec.parts[0].params = { 'outline.w': { value: 160, unit: 'mm', conf: 'spec', claim: 'w' } };
  const r = c.MX.svg2d.part(spec, 'plate', { mode: 'geometry-1to1' }); assert.equal(r.report.dimCount.compared, 1); assert.match(r.svg, /<g class="dim linear compared" data-key="outline.w"/); assert.match(r.svg, /1 compared with a source/);
});

test('text from the spec is escaped and cannot add SVG; ids are safe slugs, unique', () => {
  const { spec, c } = specOf('demo-plate');
  spec.title = 'Plate <script>alert(1)</script> & "co" \'x\''; spec.parts[0].name = ']]><svg onload="x">'; spec.parts[0].p.holes[0].id = 'a"><script>b';
  const { svg } = c.MX.svg2d.part(spec, 'plate', { mode: 'sheet-fit' });
  assert.equal(wellFormed(svg), null); assert.ok(!/<script/i.test(svg), 'no script element');
  const attrNames = [...svg.matchAll(TAG)].flatMap((m) => [...m[3].matchAll(/\s([\w:-]+)=/g)].map((q) => q[1])); assert.ok(!attrNames.some((a) => /^on/i.test(a) || a === 'href' || a === 'xlink:href'), 'no event or link attribute on any element: ' + [...new Set(attrNames)].join(' '));
  assert.ok(svg.includes('Plate &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;co&quot; &#39;x&#39;'));
  const ids = [...svg.matchAll(/\sid="([^"]*)"/g)].map((q) => q[1]); assert.ok(ids.every((i) => /^[a-z0-9-]+$/.test(i)), ids.join(' ')); assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  assert.ok(svg.includes('data-geometry-id="a&quot;&gt;&lt;script&gt;b"'), 'the original id is kept, escaped, as data');
  // no element that can reach outside the file, and no url() other than the file's own hatch pattern
  assert.ok(!/<(image|use|foreignObject|a|style|iframe|link)[\s>]/i.test(svg), 'no element that loads or links anything');
  assert.deepEqual([...new Set(svg.match(/url\([^)]*\)/g) || [])].filter((u) => !/^url\(#[a-z0-9-]+\)$/.test(u)), [], 'only internal url(#...) references');
  // a spec or part id built to walk out of the folder still gives a plain file name
  const evil = JSON.parse(JSON.stringify(spec)); evil.id = '../../etc/x'; evil.parts[0].id = '..\\..\\win'; evil.parts[0].p.holes[0].id = 'fix1';
  assert.equal(c.MX.svg2d.all(evil, { mode: 'sheet-fit' })[0].file, 'etc-x-win.svg');
});

test('the same spec gives the same bytes; invalid geometry, a failing gate or a missing mode export nothing', () => {
  for (const name of Object.keys(DEMOS)) for (const mode of ['geometry-1to1', 'sheet-fit']) assert.equal(exp(name, mode).svg, exp(name, mode).svg, name + ' ' + mode);
  const { spec, c } = specOf('demo-plate'), X = c.MX.svg2d;
  assert.throws(() => X.part(spec, 'plate', {}), /mode must be geometry-1to1 or sheet-fit/);
  assert.throws(() => X.part(spec, 'nope', { mode: 'sheet-fit' }), /not a 2D drawing part/);
  const bad = JSON.parse(JSON.stringify(spec)); bad.parts[0].p.holes.push({ id: 'off', type: 'circle', d: 30, at: [70, 0] });
  assert.throws(() => X.part(bad, 'plate', { mode: 'geometry-1to1' }), /does not pass the gate; nothing is exported[\s\S]*hole off is not inside/);
  const noSource = JSON.parse(JSON.stringify(spec)); noSource.research.sources = []; assert.throws(() => X.part(noSource, 'plate', { mode: 'sheet-fit' }), /does not pass the gate/);
});

test('a sheet too dense for a legible layout stops and names the labels, instead of overlapping them', () => {
  const { spec, c } = specOf('demo-plate'), dense = JSON.parse(JSON.stringify(spec));
  dense.parts[0].p = { unit: 'mm', outline: { type: 'rect', w: 30, h: 16 }, holes: Array.from({ length: 12 }, (_, i) => ({ id: 'h' + i, type: 'circle', d: 1 + i * 0.05, at: [-12.5 + (i % 6) * 5, i < 6 ? -3.5 : 3.5] })) };
  assert.equal(c.MX.geom2d.build(dense.parts[0].p).errors.length, 0, 'the geometry itself is valid');
  assert.throws(() => c.MX.svg2d.part(dense, 'plate', { mode: 'geometry-1to1' }), (e) => /too dense for a legible layout/.test(e.message) && e.collisions.length > 0);
  const r = c.MX.svg2d.part(dense, 'plate', { mode: 'geometry-1to1', allowCollisions: true }); assert.ok(r.report.collisions.length > 0, 'allowed, and still reported');
});

// BH-1 fixtures: a narrow part (the Raspberry Pi Pico of the beta test, 21 x 51 mm) and a part whose legend is longer than any drawing is wide
const narrowSpec = () => { const { spec, c } = specOf('demo-plate'), s = JSON.parse(JSON.stringify(spec)); s.parts[0].p = { unit: 'mm', outline: { type: 'rect', w: 21, h: 51 }, holes: [[-5.7, -23.5], [5.7, -23.5], [-5.7, 23.5], [5.7, 23.5]].map(([x, y], i) => ({ id: 'm' + i, type: 'circle', d: 2.1, at: [x, y] })) }; return { spec: s, c }; };
const longSpec = () => { const { spec, c } = specOf('demo-section'), s = JSON.parse(JSON.stringify(spec)); s.parts[0].p.section.name = 'A-A THROUGH THE MOUNTING BOSS, THE SLOT AND THE WEB, LOOKING FROM THE LEFT'; return { spec: s, c }; };
const LEGEND_RE = /<text class="note" x="([-\d.]+)" y="([-\d.]+)" font-size="2.5"[^>]*>([^<]*)<\/text>/g;

test('the 1:1 legend never leaves the document: a narrow part gets several lines, a long one widens the page; the part does not move', () => {
  const plateW = exp('demo-plate', 'geometry-1to1').svg, one = [...plateW.matchAll(LEGEND_RE)];
  assert.equal(one.length, 1, 'a part wide enough keeps its one-line legend'); assert.equal(one[0][3], 'PLAN • SCALE 1:1 • mm • NOTHING CHECKED • NOT A MANUFACTURING DRAWING');
  for (const [name, make] of [['narrow', narrowSpec], ['long', longSpec]]) {
    const { spec, c } = make(), id = spec.parts[0].id, { svg, report } = c.MX.svg2d.part(spec, id, { mode: 'geometry-1to1' }), vb = report.viewBox, lines = [...svg.matchAll(LEGEND_RE)];
    const all = lines.map((m) => m[3]).join(' • ');
    assert.ok(all.includes('NOT A MANUFACTURING DRAWING') && all.includes('SCALE 1:1'), name + ': the whole legend is written: ' + all);
    for (const [, x, y, t] of lines) {      // estimated with the exporter's own (conservative) character width; the browser test measures the real one
      assert.ok(+x >= vb[0] && +x + t.length * 2.5 * 0.62 <= vb[0] + vb[2] + 1e-6, name + ': "' + t + '" fits the width');
      assert.ok(+y <= vb[1] + vb[3] && +y - 2.5 >= vb[1], name + ': "' + t + '" is inside the height');
    }
    const head = /<svg [^>]*>/.exec(svg)[0], fvb = attr(head, 'viewBox').split(' ').map(Number);
    assert.equal(attr(head, 'width'), fvb[2] + 'mm', name + ': still 1 user unit = 1 mm'); assert.equal(attr(head, 'height'), fvb[3] + 'mm');
    if (name === 'narrow') {
      assert.ok(lines.length >= 2, 'the 21 mm part writes its legend on several lines');
      const o = pathBox(attr(tagById(svg, 'plate-outline'), 'd')); assert.deepEqual(o, [-10.5, -25.5, 10.5, 25.5], 'the part is where its geometry says, at its size');
      assert.ok(svg.includes('cx="5.7" cy="23.5" r="1.05"'), 'holes unmoved, unscaled');
    } else assert.ok(vb[2] >= Math.max(...lines.map((m) => m[3].length * 2.5 * 0.62)) + 2 - 1e-6, 'a legend part longer than the drawing widens the page');
  }
});

test('a composite label ("20 x 12") carries both dimensions: data-keys and data-values, and the weaker evidence of the two', () => {
  const { svg } = exp('demo-plate', 'geometry-1to1'), g = /<g class="dim note [^"]*" data-key="window.w" data-value="([\d.]+)" data-keys="([^"]*)" data-values="([^"]*)" data-evidence="([a-z]+)">/.exec(svg);
  assert.ok(g, 'the window callout lists every key and value'); assert.equal(g[1], '44', 'data-value keeps the first value (Draft 0.3 readers)');
  assert.equal(g[2], 'window.w window.h'); assert.equal(g[3], '44 22'); assert.equal(g[4], 'declared');
  const { spec, c } = specOf('demo-plate'); spec.research.sources.push({ id: 'sheet', title: 'Test drawing sheet', url: 'https://github.com/DiegoLopez0208/mechanism', fetched: '2026-10-19' });
  spec.research.claims.push({ id: 'ww', conf: 'spec', text: 'The window is 44 mm wide.', src: ['sheet'] }); spec.parts[0].params = { 'window.w': { value: 44, unit: 'mm', conf: 'spec', claim: 'ww' } };
  const half = c.MX.svg2d.part(spec, 'plate', { mode: 'geometry-1to1' }).svg;
  assert.match(half, /data-key="window.w" data-value="44" data-keys="window.w window.h" data-values="44 22" data-evidence="declared"/, 'one of the two compared, the other not: the callout is not shown as compared');
});

test('export-svg.mjs: one file per drawing part inside --out, never over a file it did not write, nothing when the gate fails', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mx-svg-')), run = (...a) => spawnSync(process.execPath, ['scripts/export-svg.mjs', ...a], { cwd: root, encoding: 'utf8' });
  try {
    const r = run('examples/demo-flange/spec.js', '--mode', 'geometry-1to1', '--out', out, '--json'); assert.equal(r.status, 0, r.stderr);
    const j = JSON.parse(r.stdout); assert.equal(j.files.length, 1); assert.equal(path.basename(j.files[0].file), 'demo-flange-flange.svg'); assert.ok(fs.existsSync(path.join(out, 'demo-flange-flange.svg')));
    assert.equal(run('examples/demo-flange/spec.js', '--mode', 'geometry-1to1', '--out', out).status, 0, 'an earlier export may be replaced');
    fs.writeFileSync(path.join(out, 'demo-plate-plate.svg'), 'mine'); const r2 = run('examples/demo-plate/spec.js', '--mode', 'sheet-fit', '--out', out);
    assert.equal(r2.status, 1); assert.match(r2.stderr, /is not an earlier export of this tool/); assert.equal(fs.readFileSync(path.join(out, 'demo-plate-plate.svg'), 'utf8'), 'mine');
    assert.equal(run('examples/demo-plate/spec.js', '--out', out).status, 1, 'the mode is required');
    assert.equal(run('examples/lock/spec.js', '--mode', 'sheet-fit', '--out', out).status, 1, 'a spec with no drawing part has nothing to export');
    const bad = path.join(out, 'bad'); fs.mkdirSync(bad); fs.cpSync(path.join(root, 'examples', 'demo-plate'), bad, { recursive: true });
    fs.appendFileSync(path.join(bad, 'spec.js'), '\nwindow.SPEC.parts[0].p.holes.push({ id: "off", type: "circle", d: 30, at: [70, 0] });\n');
    const r3 = run(path.join(bad, 'spec.js'), '--mode', 'sheet-fit', '--out', path.join(out, 'x')); assert.equal(r3.status, 1); assert.match(r3.stderr, /does not pass the gate/); assert.ok(!fs.existsSync(path.join(out, 'x')), 'no folder, no file');
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
});

test('an independent viewer (Chromium) opens every file: no parse error, and its own measure of the 1:1 plate is 160 x 100 mm with Ø6.6 holes', { skip: !findBrowser() && !process.env.CI ? 'no Chromium browser found' : false, timeout: 120000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mx-svgview-'));
  try {
    const files = []; for (const name of Object.keys(DEMOS)) for (const mode of ['geometry-1to1', 'sheet-fit']) { const f = path.join(dir, name + '-' + mode + '.svg'); fs.writeFileSync(f, exp(name, mode).svg); files.push(f); }
    // BH-1: the narrow part and the long legend, in both modes: the browser measures every text against the viewBox
    for (const [name, make] of [['narrow', narrowSpec], ['long', longSpec]]) for (const mode of ['geometry-1to1', 'sheet-fit']) { const { spec, c } = make(), f = path.join(dir, 'bh1-' + name + '-' + mode + '.svg'); fs.writeFileSync(f, c.MX.svg2d.part(spec, spec.parts[0].id, { mode }).svg); files.push(f); }
    await withBrowser(async (b) => {
      await b.send('Page.enable');
      for (const f of files) {
        await b.send('Page.navigate', { url: pathToFileURL(f).href }); let ok = false; for (let i = 0; i < 100 && !ok; i++) { ok = await b.ev('document.readyState === "complete" && !!document.documentElement'); if (!ok) await sleep(30); }
        const r = await b.ev(`(()=>{const s=document.documentElement;const err=document.querySelector('parsererror');const o=document.getElementById('plate-outline'),h=document.getElementById('plate-fix1');
          const vb=s.viewBox.baseVal,cr=s.getBoundingClientRect(),mat=document.querySelector('.material'),P=(x,y)=>{const q=s.createSVGPoint();q.x=x;q.y=y;return q;};
          const holeIn=[...document.querySelectorAll('.edge.hole')].map(el=>{if(el.tagName==='circle')return mat.isPointInFill(P(+el.getAttribute('cx'),+el.getAttribute('cy')));const bb=el.getBBox();return mat.isPointInFill(P(bb.x+bb.width/2,bb.y+bb.height/2));});
          const again=new DOMParser().parseFromString(new XMLSerializer().serializeToString(document),'image/svg+xml'),h2=again.getElementById('plate-fix1');
          return {tag:s.tagName,err:err?err.textContent.slice(0,120):null,outline:o?(({width,height})=>({width,height}))(o.getBBox()):null,r:h?h.r.baseVal.value:null,
            mmPerUnit:[(cr.width*25.4/96)/vb.width,(cr.height*25.4/96)/vb.height],holeIn,badPaths:[...document.querySelectorAll('path')].filter(p=>!(p.getTotalLength()>0)).length,
            reparse:!again.querySelector('parsererror'),r2:h2?+h2.getAttribute('r'):null,plateMat:h?mat.isPointInFill(P(0,-45)):null,
            textsOut:[...document.querySelectorAll('text')].map(t=>{const b=t.getBBox(),m=t.getCTM(),q=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>{const p=P(x,y).matrixTransform(m);return [p.x,p.y];});
              const sm=s.getCTM().inverse(),u=q.map(([x,y])=>{const p=P(x,y).matrixTransform(sm);return [p.x,p.y];}),x0=Math.min(...u.map(p=>p[0])),x1=Math.max(...u.map(p=>p[0])),y0=Math.min(...u.map(p=>p[1])),y1=Math.max(...u.map(p=>p[1]));
              return (x0<vb.x-0.01||y0<vb.y-0.01||x1>vb.x+vb.width+0.01||y1>vb.y+vb.height+0.01)?t.textContent.slice(0,50)+' ['+[x0,y0,x1,y1].map(v=>v.toFixed(2)).join(',')+']':null;}).filter(Boolean),
            texts:document.querySelectorAll('text').length};})()`);
        assert.equal(r.err, null, path.basename(f) + ': parse error'); assert.equal(r.tag, 'svg');
        // the viewer lays the document out at its declared size: 1 user unit is 1 mm of the viewport (96 px per inch), no hidden scale
        r.mmPerUnit.forEach((v) => close(v, 1, path.basename(f) + ': mm per user unit in the viewer', 1e-3));
        assert.ok(r.holeIn.length > 0 && r.holeIn.every((v) => !v), path.basename(f) + ': every hole is empty in the even-odd material (no fill, no hatch)');
        assert.equal(r.badPaths, 0, 'every path has a finite, positive length'); assert.ok(r.reparse, 'a re-export through the viewer parses again');
        assert.ok(r.texts > 0); assert.deepEqual(r.textsOut, [], path.basename(f) + ': every text, measured by the browser, is inside the viewBox');
        if (f.endsWith('demo-plate-geometry-1to1.svg')) { close(r.outline.width, 160, 'viewer: outline width', 1e-3); close(r.outline.height, 100, 'viewer: outline height', 1e-3); close(r.r * 2, 6.6, 'viewer: hole diameter', 1e-4); assert.equal(r.r2, 3.3, 'the re-export keeps the radius'); assert.equal(r.plateMat, true, 'material between the holes is filled'); }
      }
    }, { timeout: 60000, retries: 0 });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
