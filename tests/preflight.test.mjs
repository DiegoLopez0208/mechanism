// preflight.test.mjs - the visual preflight on synthetic cases: a copy of the lock example with a zoom that breaks the camera, and texts injected on purpose.
// Needs a Chromium-based browser (the same one the renders use); the tests are skipped when there is none.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), PREFLIGHT = path.join(root, 'scripts', 'preflight.mjs');
const HAS_BROWSER = [process.env.BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].filter(Boolean).some((b) => existsSync(b));
const opts = { skip: HAS_BROWSER ? false : 'no Chromium browser found (set BROWSER=<path>)', timeout: 180000 };
const tmp = mkdtempSync(path.join(os.tmpdir(), 'mx-preflight-test-'));
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* busy */ } });

// three texts drawn in every frame at the same place: two on top of each other and one past the right edge
const INJECT = `<script>(() => { let f; Object.defineProperty(window, '__frame', { configurable: true, get: () => f, set: (v) => { f = (...a) => { const r = v(...a), c = MX.ctx; c.save(); c.font = '30px sans-serif'; c.fillStyle = '#fff'; c.globalAlpha = 1; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText('OVERLAP-AAAAAAAA', 300, 700); c.fillText('OVERLAP-BBBBBBBB', 330, 704); c.fillText('CLIPPED-TEXT-PAST-THE-EDGE', c.canvas.width - 40, 900); c.restore(); return r; }; } }); })();</script>`;
let n = 0;
const variant = ({ zoom, inject, part, script, example = 'lock' } = {}) => {      // a copy of kit/ and of one example (lock by default) with the change applied
  const dir = path.join(tmp, 'v' + n++); cpSync(path.join(root, 'kit'), path.join(dir, 'kit'), { recursive: true }); cpSync(path.join(root, 'examples', example), path.join(dir, 'examples', example), { recursive: true });
  const spec = path.join(dir, 'examples', example, 'spec.js'), html = path.join(dir, 'examples', example, 'index.html');
  if (zoom) { const s = readFileSync(spec, 'utf8'); assert.ok(/director: \{/.test(s), 'the spec has a director block'); writeFileSync(spec, s.replace('director: {', 'director: { zoom: ' + zoom + ',')); }
  if (inject) writeFileSync(html, readFileSync(html, 'utf8').replace('<canvas id="c"></canvas>', '<canvas id="c"></canvas>' + INJECT));
  if (script) writeFileSync(html, readFileSync(html, 'utf8').replace('<canvas id="c"></canvas>', '<canvas id="c"></canvas><script>' + script + '</script>'));      // runs before boot.js loads anything
  if (part) { const run = path.join(dir, 'examples', example, 'run.js'); writeFileSync(run, 'window.SPEC.parts.push(' + JSON.stringify(part) + ');\n' + readFileSync(run, 'utf8')); }      // one more part in the spec before it runs
  return path.join(dir, 'examples', example, 'index.html');
};
const run = (page, ...extra) => { const r = spawnSync(process.execPath, [PREFLIGHT, page, '--length', 'short', '--step', '1', '--json', ...extra], { encoding: 'utf8', timeout: 170000 }); let json = null; try { json = JSON.parse(r.stdout); } catch { /* not json: the assertion that follows shows stderr */ } return { status: r.status, json, stderr: r.stderr }; };
const codes = (r) => new Set(r.json.findings.map((f) => f.code));

test('an object zoomed out of the frame is reported as OBJECT_OFFSCREEN (a warning: exit code 0)', opts, () => {
  const r = run(variant({ zoom: 14 })); assert.ok(r.json, r.stderr); assert.equal(r.status, 0); assert.ok(codes(r).has('OBJECT_OFFSCREEN'));
});

test('geometry inside the near plane of the camera is reported as CAMERA_NEAR_CLIP (a warning)', opts, () => {
  const r = run(variant({ zoom: 400 }), '--skip', 'labels,frame'); assert.ok(r.json, r.stderr); assert.equal(r.json.fail, 0); assert.equal(r.status, 0); assert.ok(codes(r).has('CAMERA_NEAR_CLIP'));
});

test('a camera inside a part is a FAIL: exit code 0 as a diagnostic, 1 with --strict', opts, () => {
  const page = variant({ zoom: 1500 }), d = run(page, '--skip', 'labels,frame'), s = run(page, '--skip', 'labels,frame', '--strict');
  assert.ok(d.json, d.stderr); assert.ok(d.json.fail > 0 && codes(d).has('CAMERA_INSIDE_PART')); assert.equal(d.status, 0); assert.equal(s.status, 1);
});

test('--skip camera removes the camera findings', opts, () => {
  const r = run(variant({ zoom: 1500 }), '--skip', 'camera,labels,frame'); assert.ok(r.json, r.stderr); assert.ok(![...codes(r)].some((c) => c.startsWith('CAMERA_')));
});

test('two texts on top of each other are LABEL_OVERLAP and one past the edge is LABEL_CLIPPED', opts, () => {
  const r = run(variant({ inject: true }), '--skip', 'camera,frame'); assert.ok(r.json, r.stderr);
  const subjects = r.json.findings.map((f) => f.code + ' ' + f.subject);
  assert.ok(subjects.some((s) => s.startsWith('LABEL_OVERLAP') && s.includes('OVERLAP-AAAAAAAA') && s.includes('OVERLAP-BBBBBBBB')), subjects.join('\n'));
  assert.ok(subjects.some((s) => s.startsWith('LABEL_CLIPPED') && s.includes('CLIPPED-TEXT')), subjects.join('\n'));
});

const testPlate = (holes) => ({ id: 'testplate', name: 'Test plate', kind: 'plate', p: { w: 20, h: 20, r: 1, t: 2, holes }, mat: 'steel', at: [0, 0, 0], explode: [0, 0, 0], conf: 'estimated', why: 'a part of the test', tour: false });

test('a plate with a rectangular hole inside its outline is fine, and a round hole still works', opts, () => {
  const r = run(variant({ part: testPlate([[0, 0, 8, 4], [6, 6, 2]]) }), '--skip', 'camera,labels,frame'); assert.ok(r.json, r.stderr);
  assert.ok(![...codes(r)].includes('GEOMETRY_AREA_MISMATCH'), JSON.stringify(r.json.findings));
});

test('a hole that lies outside the outline is reported as GEOMETRY_AREA_MISMATCH, and is a FAIL when it is large', opts, () => {
  const r = run(variant({ part: testPlate([[9, 0, 12, 12]]) }), '--skip', 'camera,labels,frame'); assert.ok(r.json, r.stderr);
  const f = r.json.findings.find((x) => x.code === 'GEOMETRY_AREA_MISMATCH' && x.subject === 'testplate'); assert.ok(f, JSON.stringify(r.json.findings));
  assert.equal(f.severity, 'FAIL'); assert.ok(r.json.fail > 0);
});

// Generic Paper compiles the model meshes through its mesh adapter, so the area check runs there (hub has no vector scene).
test('with --method paper on a model without a vector scene the area check still runs on the compiled meshes', opts, () => {
  const r = run(variant({ example: 'hub', part: testPlate([[9, 0, 12, 12]]) }), '--method', 'paper', '--background', 'ivory', '--skip', 'camera,labels,frame'); assert.ok(r.json, r.stderr);
  const f = r.json.findings.find((x) => x.code === 'GEOMETRY_AREA_MISMATCH' && x.subject === 'testplate'); assert.ok(f, JSON.stringify(r.json.findings));
  assert.equal(f.severity, 'FAIL'); assert.deepEqual(r.json.notRun, []);
});

// Paper with a vector scene (lock) and Workflow compile no meshes: the area check does not run, the report says so with its
// reason, and it is neither a finding nor a pass. The same bad plate is in the spec: nothing may claim it was checked.
const NOT_RUN_CASES = [['paper', 'ivory', 'vector_scene_without_mesh_projection'], ['workflow', 'graphite', 'workflow_draws_no_model_meshes']];
for (const [method, background, reason] of NOT_RUN_CASES) test(`with --method ${method} the area check is reported as NOT RUN (${reason}), not as passed`, opts, () => {
  const page = variant({ part: testPlate([[9, 0, 12, 12]]) }), r = run(page, '--method', method, '--background', background, '--skip', 'camera,labels,frame'); assert.ok(r.json, r.stderr);
  assert.deepEqual(r.json.notRun, [{ check: 'GEOMETRY_AREA', reason }]);
  assert.ok(!r.json.findings.some((x) => x.code.startsWith('GEOMETRY_AREA')), JSON.stringify(r.json.findings));
  const text = spawnSync(process.execPath, [PREFLIGHT, page, '--length', 'short', '--step', '1', '--method', method, '--background', background, '--skip', 'camera,labels,frame'], { encoding: 'utf8', timeout: 170000 }).stdout;
  assert.match(text, new RegExp('NOT RUN  GEOMETRY_AREA  ' + reason)); assert.match(text, /not checked, not passed/); assert.doesNotMatch(text, /PASS: nothing found\.$/m);
});

test('--skip shape is reported as NOT RUN (skipped_by_option)', opts, () => {
  const r = run(variant(), '--skip', 'camera,labels,frame,shape'); assert.ok(r.json, r.stderr);
  assert.deepEqual(r.json.notRun, [{ check: 'GEOMETRY_AREA', reason: 'skipped_by_option' }]);
});

// An omission nobody explains is not acceptable: a check that throws, or an engine that says it did not run without a reason it
// declared, is a FAIL.
test('an area check that throws, or that did not run without a declared reason, is a FAIL (GEOMETRY_AREA_NOT_RUN)', opts, () => {
  const throws = run(variant({ script: `Object.defineProperty(window,'__shapeCheck',{configurable:true,get:()=>()=>{throw new Error('mesh data missing');},set:()=>{}});` }), '--skip', 'camera,labels,frame'); assert.ok(throws.json, throws.stderr);
  const a = throws.json.findings.find((x) => x.code === 'GEOMETRY_AREA_NOT_RUN'); assert.ok(a && a.severity === 'FAIL' && /mesh data missing/.test(a.suggestion), JSON.stringify(throws.json.findings));
  const silent = run(variant({ script: `Object.defineProperty(window,'__checks',{configurable:true,get:()=>({geometryArea:{run:false,reason:'no_area_check_from_the_engine',expected:false}}),set:()=>{}});` }), '--skip', 'camera,labels,frame'); assert.ok(silent.json, silent.stderr);
  const b = silent.json.findings.find((x) => x.code === 'GEOMETRY_AREA_NOT_RUN'); assert.ok(b && b.severity === 'FAIL', JSON.stringify(silent.json.findings)); assert.deepEqual(silent.json.notRun, []);
});
