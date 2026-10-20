// rpi4-board.test.mjs - Draft 0.4, the first real part: the Raspberry Pi 4 Model B board outline and mounting holes, from Raspberry Pi's
// mechanical drawing (PDF RP-008343-DS-1) and DXF (RP-008342-DS-1). The published values, the relations between the holes, the
// positions from the datums, the area, spec = geom2d = SVG, determinism, the gate's verdict (CONSISTENT: both files are the maker's),
// wrong dimensions refused, Draft standalone, and Paper with no three.js.
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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SPEC = path.join(root, 'examples', 'rpi4-board', 'spec.js');
const load = () => { const c = vm.createContext({ console }); c.window = c; for (const f of ['kit/kin.js', 'kit/geom2d.js', 'kit/spec-core.js', 'kit/svg2d.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c, { filename: f }); vm.runInContext(fs.readFileSync(SPEC, 'utf8'), c); return c; };
const plain = (v) => JSON.parse(JSON.stringify(v)), close = (a, b, msg, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);
const attr = (tag, k) => { const m = new RegExp('\\s' + k + '="([^"]*)"').exec(tag); return m ? m[1] : null; };
// what the PDF prints (RP-008343-DS-1) and where the DXF puts the holes (RP-008342-DS-1), written out here independently of the spec
const PUBLISHED = { w: 85, h: 56, r: 3, d: 2.7, edge: 3.5, pitchX: 58, pitchY: 49 }, DXF_HOLES = { 'h-bl': [3.5, 3.5], 'h-br': [61.5, 3.5], 'h-tl': [3.5, 52.5], 'h-tr': [61.5, 52.5] };

test('the geometry is the published one: 85 x 56 mm, R3 corners, four Ø2.7 holes 3.5 mm from the edges on a 58 x 49 mm pattern', () => {
  const c = load(), m = c.MX.geom2d.build(c.SPEC.parts[0].p); assert.deepEqual(plain(m.errors), []);
  const o = m.outline; assert.equal(o.w, PUBLISHED.w); assert.equal(o.h, PUBLISHED.h); assert.equal(o.r, PUBLISHED.r);
  assert.deepEqual(plain(c.MX.geom2d.bbox(o)), [0, 0, 85, 56], 'the DXF origin: the board spans (0, 0) to (85, 56)');
  assert.equal(m.holes.length, 4);
  for (const h of m.holes) { assert.equal(h.d, PUBLISHED.d, h.id); assert.deepEqual([h.cx, h.cy], DXF_HOLES[h.id], h.id + ' centre'); }
  const H = Object.fromEntries(m.holes.map((h) => [h.id, [h.cx, h.cy]])), dist = (a, b) => Math.hypot(H[a][0] - H[b][0], H[a][1] - H[b][1]);
  close(dist('h-bl', 'h-br'), PUBLISHED.pitchX, 'horizontal pitch'); close(dist('h-tl', 'h-tr'), PUBLISHED.pitchX, 'horizontal pitch, top');
  close(dist('h-bl', 'h-tl'), PUBLISHED.pitchY, 'vertical pitch'); close(dist('h-br', 'h-tr'), PUBLISHED.pitchY, 'vertical pitch, right');
  close(dist('h-bl', 'h-tr'), Math.hypot(58, 49), 'diagonal'); close(dist('h-bl', 'h-tr'), 75.92759709091281, 'diagonal value', 1e-9);
  // datums: 3.5 from the left, bottom and top edges (the PDF's three 3.5 dimensions)
  for (const h of m.holes) { assert.ok([3.5, 61.5].includes(h.cx)); close(Math.min(h.cy, 56 - h.cy), PUBLISHED.edge, h.id + ' from the nearer long edge'); }
  assert.deepEqual(plain({ x: m.dims['h-bl.x'], y: m.dims['h-bl.y'], xr: m.dims['h-br.x'], yt: m.dims['h-tl.y'] }), { x: 3.5, y: 3.5, xr: 61.5, yt: 52.5 });
});

test('the area of the geometry included: outline 85 x 56 with R3 corners, minus four Ø2.7 holes (the 6 mm pads are copper, not holes)', () => {
  const c = load(), f = c.MX.geom2d.build(c.SPEC.parts[0].p).facts;
  close(f.outlineArea, 85 * 56 - (4 - Math.PI) * 9, 'outline'); close(f.holeArea, 4 * Math.PI * 1.35 * 1.35, 'holes'); close(f.netArea, 85 * 56 - (4 - Math.PI) * 9 - 4 * Math.PI * 1.35 * 1.35, 'net');
  close(f.netArea, 4729.372, 'net area, mm2', 1e-3);
});

test('spec, geom2d and the 1:1 SVG agree: four <circle r="1.35"> at the DXF centres, the outline 85 x 56 with four R3 arcs, every dimension compared', () => {
  const c = load(), { svg, report } = c.MX.svg2d.part(c.SPEC, 'pcb', { mode: 'geometry-1to1' });
  for (const [id, [x, y]] of Object.entries(DXF_HOLES)) { const t = new RegExp('<circle id="pcb-' + id + '"[^>]*>').exec(svg)[0]; assert.equal(+attr(t, 'r'), 1.35); assert.equal(+attr(t, 'cx'), x); assert.equal(+attr(t, 'cy'), -y, id + ': y flipped'); }
  const d = attr(/<path id="pcb-outline"[^>]*>/.exec(svg)[0], 'd'); assert.equal((d.match(/A3 3 /g) || []).length, 4, 'four exact R3 arcs');
  const xs = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((q) => [+q[1], +q[2]]); assert.equal(Math.max(...xs.map((p) => p[0])) - Math.min(...xs.map((p) => p[0])), 85); assert.equal(Math.max(...xs.map((p) => p[1])) - Math.min(...xs.map((p) => p[1])), 56);
  assert.equal(report.verdict, 'CONSISTENT'); assert.equal(report.dimCount.declared, 0); assert.equal(report.dimCount.compared, report.dims, 'every drawn dimension is compared with the drawing');
  assert.match(svg, /NOT A MANUFACTURING DRAWING/);
  // the short 3.5 dimensions put their text outside the span, with the dimension line run on to it (the 1:1 layout needs it)
  const g = /<g class="dim linear compared" data-key="h-bl.x"[^>]*>([\s\S]*?)<\/g>/.exec(svg)[1]; assert.equal((g.match(/<line /g) || []).length, 4, 'two extension lines, the dimension line and its run-on');
  assert.equal(c.MX.svg2d.part(c.SPEC, 'pcb', { mode: 'geometry-1to1' }).svg, svg, 'deterministic'); assert.equal(c.MX.svg2d.part(c.SPEC, 'pcb', { mode: 'sheet-fit' }).svg, c.MX.svg2d.part(c.SPEC, 'pcb', { mode: 'sheet-fit' }).svg);
});

test('the gate: every dimension compared with the PDF, the hole pitch from the DXF checked against the PDF, and CONSISTENT, not VERIFIED', () => {
  const c = load(), V = c.MX.spec.validate(c.SPEC);
  assert.deepEqual(plain(V.errors), []); assert.equal(V.verdict.state, 'CONSISTENT', 'the DXF and the PDF are the same maker\'s: no independent check');
  assert.equal(V.verdict.independent, 0); assert.equal(V.verdict.sameSource, 2); assert.equal(V.verdict.dimensions, 15); assert.equal(V.verdict.estimated, 0);
  assert.ok(V.warnings.some((w) => /CONSISTENT, not VERIFIED/.test(w)));
  // published (spec) and derived dimensions, none estimated: the summary says so, not "estimated"
  assert.ok(V.lines.includes('dimensions: 15 compared with their source (11 spec, 4 derived), 0 estimated, 1 part(s) mix confidence classes (spec, derived)'), V.lines.join('\n'));
  assert.ok(V.lines.some((l) => /phase Horizontal hole pitch: 58\.00  published 58  ok/.test(l)) && V.lines.some((l) => /phase Vertical hole pitch: 49\.00  published 49  ok/.test(l)));
  // the values the PDF does not print (61.5, 52.5) are DERIVED, with their cross-check, not passed off as printed
  const cl = Object.fromEntries(c.SPEC.research.claims.map((q) => [q.id, q])); assert.equal(cl['datums-far'].conf, 'derived'); assert.ok(cl['datums-far'].cross);
  assert.equal(c.SPEC.parts[0].params['h-br.x'].conf, 'derived'); assert.equal(c.SPEC.parts[0].params['h-bl.x'].conf, 'spec');
  assert.ok(c.SPEC.research.sources.find((s) => s.id === 'rpi-md-dxf').derives.includes('rpi-md-pdf'), 'the DXF is declared the same source as the PDF');
});

test('a wrong dimension is refused: a different board size, hole position, drill, corner, unit, or a DXF pitch that disagrees with the PDF', () => {
  const mut = (f) => { const c = load(); f(c.SPEC); return c.MX.spec.validate(c.SPEC).errors.join(' | '); };
  assert.match(mut((s) => { s.parts[0].p.outline.w = 86; }), /outline\.w is drawn at 86 but the source says 85/);
  assert.match(mut((s) => { s.parts[0].p.holes[1].at = [62, 3.5]; }), /h-br\.x is drawn at 62 but the source says 61\.5/);
  assert.match(mut((s) => { s.parts[0].p.holes.forEach((h) => { h.d = 2.5; }); }), /h-bl\.d is drawn at 2\.5 but the source says 2\.7/);
  assert.match(mut((s) => { s.parts[0].p.outline.r = 2; }), /outline\.r is drawn at 2 but the source says 3/);
  assert.match(mut((s) => { s.mechanism.calc.vars.xr.v = 61.6; }), /Horizontal hole pitch: the model gives 58\.10 and the published one is 58/);
  assert.match(mut((s) => { s.parts[0].params['outline.w'].unit = 'in'; }), /the number matches and the unit does not/);
});

test('Draft standalone: the installed copy gives the same gate result and the same SVG files, with no file of Raspberry Pi in it', () => {
  const plugin = path.join(root, 'plugins', 'mechanism-draft'), node = (cwd, ...a) => spawnSync(process.execPath, a, { cwd, encoding: 'utf8' });
  const lines = (s) => s.split('\n').filter((l) => /^(verdict|geometry |  phase|provenance)/.test(l));
  const a = node(plugin, 'scripts/check-spec.mjs', 'examples/rpi4-board/spec.js'), b = node(root, 'scripts/check-spec.mjs', 'examples/rpi4-board/spec.js');
  assert.equal(a.status, 0, a.stdout + a.stderr); assert.deepEqual(lines(a.stdout), lines(b.stdout)); assert.ok(lines(a.stdout).length >= 4);
  const files = JSON.parse(fs.readFileSync(path.join(plugin, 'files.json'), 'utf8')).files;
  assert.ok(Object.keys(files).includes('examples/rpi4-board/spec.js'));
  assert.ok(!Object.keys(files).some((f) => /\.(pdf|dxf)$/i.test(f)) && !fs.readdirSync(path.join(root, 'examples', 'rpi4-board')).some((f) => /\.(pdf|dxf|png)$/i.test(f)), 'the maker\'s documents are cited, not redistributed');
  for (const mode of ['geometry-1to1', 'sheet-fit']) {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mx-rpi4-svg-')); try {
      assert.equal(node(plugin, 'scripts/export-svg.mjs', 'examples/rpi4-board/spec.js', '--mode', mode, '--out', path.join(out, 'a')).status, 0);
      assert.equal(node(root, 'scripts/export-svg.mjs', 'examples/rpi4-board/spec.js', '--mode', mode, '--out', path.join(out, 'b')).status, 0);
      assert.equal(fs.readFileSync(path.join(out, 'a', 'rpi4-board-pcb.svg'), 'utf8'), fs.readFileSync(path.join(out, 'b', 'rpi4-board-pcb.svg'), 'utf8'), mode);
    } finally { fs.rmSync(out, { recursive: true, force: true }); }
  }
});

test('Paper draws the board from the same spec with no three.js and no WebGL; the mesh area check is NOT RUN; Studio refuses it', { skip: !findBrowser() && !process.env.CI ? 'no Chromium browser found' : false, timeout: 120000 }, async () => {
  await withBrowser(async (b) => {
    await b.send('Page.enable'); await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__ctx=[];const g=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){__ctx.push(String(t));return g.call(this,t,...a);};` });
    await b.send('Page.navigate', { url: pathToFileURL(path.join(root, 'examples', 'rpi4-board', 'index.html')).href + '?render=1&length=short' });
    let ok = false; for (let i = 0; i < 300 && !ok; i++) { ok = await b.ev('typeof __frame === "function"'); if (!ok) await sleep(50); }
    assert.ok(ok, await b.ev('document.title'));
    const r = await b.ev(`(()=>{const t=[];const f=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(s,...a){t.push(String(s));return f.call(this,s,...a);};__paint(12,1,.5);CanvasRenderingContext2D.prototype.fillText=f;
      return {three:typeof THREE,ctx:[...new Set(__ctx)],checks:window.__checks,info:__specInfo(),texts:t};})()`);
    assert.equal(r.three, 'undefined'); assert.deepEqual(r.ctx, ['2d']); assert.deepEqual(r.info.errors, []);
    assert.deepEqual(r.checks, { geometryArea: { run: false, reason: 'vector_scene_without_mesh_projection', expected: true } });
    for (const s of ['85', '56', 'R3', '4× Ø2.7', '61.5', '52.5']) assert.ok(r.texts.includes(s), s + ' is drawn');
    assert.match(r.texts.join(' '), /8 DIMENSIONS COMPARED WITH A SOURCE • 0 DECLARED, NOT VERIFIED/);
    await b.send('Page.navigate', { url: pathToFileURL(path.join(root, 'examples', 'rpi4-board', 'index.html')).href + '?render=1&method=studio' });
    let title = ''; for (let i = 0; i < 200 && title !== 'SPEC ERROR'; i++) { title = await b.ev('document.title'); if (title !== 'SPEC ERROR') await sleep(50); }
    assert.equal(title, 'SPEC ERROR', 'no 3D model is invented for a flat board drawing');
  }, { timeout: 90000, retries: 0 });
});
