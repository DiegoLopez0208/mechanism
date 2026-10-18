// Mechanism Draft as a standalone skill: built into a clean folder outside this repository and run from there, with no path back
// into the repository. The committed plugins/mechanism-draft must equal a fresh build (its runtime is a generated copy of kit/).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { withBrowser, findBrowser } from '../scripts/lib/browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), committed = path.join(root, 'plugins', 'mechanism-draft');
const browserOpts = { skip: !findBrowser() && !process.env.CI ? 'no Chromium browser found' : false, timeout: 400000 };
let tmp, core, mesh, work;
const node = (cwd, ...args) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 300000 });
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mx-draft-')); core = path.join(tmp, 'mechanism-draft'); mesh = path.join(tmp, 'draft-mesh'); work = path.join(tmp, 'work');
  fs.mkdirSync(work);
  for (const [out, extra] of [[core, []], [mesh, ['--with', 'mesh']]]) { const r = node(root, 'scripts/build-skill.mjs', 'draft', '--out', out, ...extra); assert.equal(r.status, 0, r.stderr); }
});
after(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* a browser may still hold a file */ } });

// a copy of the lock example in the work folder, its page pointing at an install's kit by URL, optionally without its vector scene
const lockCopy = (install, name, dropScene) => {
  const d = path.join(work, name); fs.cpSync(path.join(install, 'examples', 'lock'), d, { recursive: true });
  const html = path.join(d, 'index.html'); fs.writeFileSync(html, fs.readFileSync(html, 'utf8').split('../../kit/').join(pathToFileURL(path.join(install, 'kit') + path.sep).href));
  if (dropScene) fs.appendFileSync(path.join(d, 'spec.js'), '\ndelete window.SPEC.paperScene;      // a spec with no vector scene (kit/boot.js reads the spec before the compiler, so the change has to be in spec.js)\n');
  return html;
};

test('the committed skill equals a fresh build: its runtime is an exact copy of kit/ and scripts/', () => {
  const a = JSON.parse(fs.readFileSync(path.join(committed, 'files.json'), 'utf8')), b = JSON.parse(fs.readFileSync(path.join(core, 'files.json'), 'utf8'));
  assert.deepEqual(a, b, 'plugins/mechanism-draft is stale: run node scripts/build-skill.mjs draft');
  for (const f of Object.keys(a.files)) assert.equal(sha(path.join(committed, f)), a.files[f], 'changed after the build: ' + f);
});

test('a clean install holds every file it lists, nothing from Workflow or the 3D stack, and no path back into the repository', () => {
  const doctor = node(core, 'scripts/skill-doctor.mjs', '--json'), r = JSON.parse(doctor.stdout);
  assert.equal(doctor.status, 0, doctor.stdout); assert.equal(r.ok, true); assert.deepEqual([r.missing, r.changed, r.undeclared], [[], [], []]);
  assert.equal(r.optional.mesh, 'not installed');
  for (const f of ['workflow-engine.js', 'vendor/three.bundle.js', 'gl.js', 'figure.js', 'parts.js', 'paper-mesh.js']) assert.ok(!fs.existsSync(path.join(core, 'kit', f)), 'Draft must not carry kit/' + f);
  const needle = [root, root.split(path.sep).join('/'), pathToFileURL(root).href].map((s) => s.toLowerCase());
  for (const f of Object.keys(JSON.parse(fs.readFileSync(path.join(core, 'files.json'), 'utf8')).files)) {
    if (!/\.(js|mjs|json|md|html)$/.test(f)) continue;
    const text = fs.readFileSync(path.join(core, f), 'utf8').toLowerCase(); for (const n of needle) assert.ok(!text.includes(n), f + ' refers to the repository path');
  }
  const meshDoctor = JSON.parse(node(mesh, 'scripts/skill-doctor.mjs', '--json').stdout); assert.equal(meshDoctor.optional.mesh, 'installed'); assert.equal(meshDoctor.ok, true);
});

test('the gate gives the same verdict in the install as in the repository', () => {
  const inside = node(core, 'scripts/check-spec.mjs', 'examples/lock/spec.js'), repo = node(root, 'scripts/check-spec.mjs', 'examples/lock/spec.js');
  assert.equal(inside.status, 0, inside.stdout + inside.stderr);
  const lines = (s) => s.split('\n').filter((l) => /^(verdict|PASSES|FAILS|provenance)/.test(l.trim()));
  assert.deepEqual(lines(inside.stdout), lines(repo.stdout)); assert.ok(lines(inside.stdout).length >= 2);
});

test('new.mjs in the install writes an object page that uses the install', () => {
  const r = node(core, 'scripts/new.mjs', 'gizmo', '--dir', work, '--title', 'Gizmo'); assert.equal(r.status, 0, r.stderr);
  const html = fs.readFileSync(path.join(work, 'gizmo', 'index.html'), 'utf8'), href = pathToFileURL(path.join(core, 'kit') + path.sep).href;
  assert.ok(html.includes(href + 'boot.js'), 'the page loads the install\'s kit'); assert.ok(!html.includes(pathToFileURL(root).href + '/kit'));
  const gate = node(core, 'scripts/check-spec.mjs', path.join(work, 'gizmo', 'spec.js')); assert.equal(gate.status, 1, 'a new spec is a draft that fails until researched');
});

test('the install renders the lock: same frames as the repository, no three.js, only its own files, and the area check NOT RUN', browserOpts, async () => {
  const pageOf = (dir) => pathToFileURL(path.join(dir, 'examples', 'lock', 'index.html')).href + '?render=1&length=short&aspect=9:16&method=paper&background=ivory';
  const look = (url) => withBrowser(async (b) => {
    await b.send('Page.enable'); const t0 = Date.now(); await b.send('Page.navigate', { url });
    for (let i = 0; i < 300 && !(await b.ev('typeof __frame === "function"')); i++) await sleep(20);
    const ready = Date.now() - t0;
    return { ready, ...(await b.ev(`(async()=>{const h=async t=>{__paint(t,1,.5);const d=MX.ctx.getImageData(0,0,MX.ctx.canvas.width,MX.ctx.canvas.height).data;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',d))].map(x=>x.toString(16).padStart(2,'0')).join('');};
      return {three:typeof THREE,scripts:[...document.scripts].map(s=>s.src).filter(Boolean),checks:window.__checks,method:__specInfo().method,frames:[await h(0),await h(9),await h(20),await h(28.5)]};})()`)) };
  }, { timeout: 60000, retries: 0 });
  const inside = await look(pageOf(core)), repo = await look(pageOf(root));
  assert.equal(inside.method, 'paper'); assert.equal(inside.three, 'undefined');
  const own = pathToFileURL(core).href; for (const s of inside.scripts) assert.ok(s.startsWith(own), 'a script from outside the install: ' + s);
  assert.deepEqual(inside.checks, { geometryArea: { run: false, reason: 'vector_scene_without_mesh_projection', expected: true } });
  assert.deepEqual(inside.frames, repo.frames, 'the install draws the same frames as the repository');
  console.log(`draft install: time to __frame ${inside.ready} ms (repository page: ${repo.ready} ms)`);
});

test('the install exports what it declares: a PNG still and an MP4 clip, the same pictures as the repository', browserOpts, () => {
  const out = path.join(work, 'clip.mp4'), repoOut = path.join(work, 'repo-clip.mp4'), args = ['examples/lock/index.html', '--method', 'paper', '--background', 'ivory', '--length', 'short', '--aspect', '9:16'];
  const still = node(core, 'scripts/render.mjs', ...args, '--still', '9', '--out', out); assert.equal(still.status, 0, still.stderr);
  assert.ok(fs.statSync(path.join(work, 'clip-still-9.png')).size > 10000);
  for (const [cwd, file] of [[core, out], [root, repoOut]]) { const r = node(cwd, 'scripts/render.mjs', ...args, '--from', '8', '--to', '10', '--out', file); assert.equal(r.status, 0, r.stderr); }
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_frames', '-of', 'csv=p=0', out], { encoding: 'utf8' }).stdout.trim();
  assert.equal(probe, 'h264,1080,1920,30/1,60');
  const md5 = (f) => spawnSync('ffmpeg', ['-loglevel', 'error', '-i', f, '-map', '0:v', '-f', 'md5', '-'], { encoding: 'utf8' }).stdout.trim();
  assert.equal(md5(out), md5(repoOut), 'the clip decodes to the same frames as the repository render');
});

test('the preflight in the install reports the vector path honestly', browserOpts, () => {
  const r = node(core, 'scripts/preflight.mjs', 'examples/lock/index.html', '--method', 'paper', '--background', 'ivory', '--length', 'short', '--aspect', '9:16', '--step', '1', '--json');
  const j = JSON.parse(r.stdout); assert.equal(j.fail, 0); assert.deepEqual(j.notRun, [{ check: 'GEOMETRY_AREA', reason: 'vector_scene_without_mesh_projection' }]);
});

test('without the optional mesh pack a spec with no vector scene stops with an error naming the missing file; with it, the mesh sheet renders', browserOpts, () => {
  const args = ['--method', 'paper', '--background', 'ivory', '--length', 'short', '--aspect', '9:16', '--still', '9'];
  const bare = node(core, 'scripts/render.mjs', lockCopy(core, 'no-scene-core', true), ...args, '--out', path.join(work, 'bare.mp4'));
  assert.notEqual(bare.status, 0); assert.match(bare.stderr + bare.stdout, /three\.bundle\.js/, 'the error names the missing module');
  const full = node(mesh, 'scripts/render.mjs', lockCopy(mesh, 'no-scene-mesh', true), ...args, '--out', path.join(work, 'full.mp4'));
  assert.equal(full.status, 0, full.stderr); assert.ok(fs.statSync(path.join(work, 'full-still-9.png')).size > 10000);
  const pre = JSON.parse(node(mesh, 'scripts/preflight.mjs', lockCopy(mesh, 'no-scene-mesh-pre', true), '--method', 'paper', '--background', 'ivory', '--length', 'short', '--step', '2', '--json').stdout);
  assert.deepEqual(pre.notRun, [], 'with meshes compiled the area check runs');
});

test('Workflow is not part of Draft: asking for it fails with an error naming the missing engine', browserOpts, () => {
  const r = node(core, 'scripts/render.mjs', 'examples/lock/index.html', '--method', 'workflow', '--still', '9', '--out', path.join(work, 'wf.mp4'));
  assert.notEqual(r.status, 0); assert.match(r.stderr + r.stdout, /workflow-engine\.js/);
});
