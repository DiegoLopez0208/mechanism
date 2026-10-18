import test from 'node:test';
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
const ctx = vm.createContext({ URLSearchParams });
for (const f of ['kit/manifest.js', 'kit/presentation.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
const M = ctx.MX_MANIFEST, P = ctx.MX.presentation, plain = (x) => JSON.parse(JSON.stringify(x));
const pageList = (file) => (/data-scripts="([^"]*)"/.exec(fs.readFileSync(file, 'utf8')) || [])[1]?.split(',').map((s) => s.trim()).filter(Boolean) || [];
const examples = fs.readdirSync(path.join(root, 'examples')).filter((n) => fs.existsSync(path.join(root, 'examples', n, 'index.html')));

test('manifest: every module exists and every engine names its own modules', () => {
  for (const f of M.order) assert.ok(fs.existsSync(path.join(root, 'kit', f)), 'kit/' + f + ' is in the manifest but not on disk');
  for (const [name, e] of Object.entries(M.engines)) {
    for (const m of e.modules) assert.ok(M.order.includes(m), name + ': ' + m + ' not in order');
    assert.equal(typeof e.stack3d, 'boolean');
  }
  assert.deepEqual(Object.keys(M.engines).sort(), [...P.methods].sort(), 'one manifest entry per presentation method');
  assert.ok(M.engines[M.legacy], 'the legacy engine exists');
  for (const f of M.stack3d.concat(M.injected, M.specPage, M.domain)) assert.ok(M.order.includes(f), f + ' not in order');
});

test('manifest: example pages name only declared kit modules, in manifest order', () => {
  for (const name of examples) {
    const kit = pageList(path.join(root, 'examples', name, 'index.html')).map((s) => [s, M.kitName(s)]).filter(([s]) => /(^|\/)kit\//.test(s));
    for (const [s, k] of kit) assert.ok(k, name + ': ' + s + ' is not declared in kit/manifest.js');
    const names = kit.map(([, k]) => k), sorted = plain(M.order.filter((f) => names.includes(f)));
    assert.deepEqual(names, sorted, name + ': kit modules out of manifest order');
    if (names.includes(M.compiler)) {      // a declarative spec page: exactly the spec-page modules plus its own object models
      const domain = names.filter((f) => M.domain.includes(f));
      assert.deepEqual(names.filter((f) => f !== M.compiler), plain(M.pageModules(domain)), name + ': not the manifest spec-page list');
    }
  }
});

test('manifest: engine resolution follows the URL first, then spec.presentation, else the legacy film', () => {
  const Q = (s) => new URLSearchParams(s);
  assert.equal(M.engineFor(Q(''), {}, P), 'studio');
  assert.equal(M.engineFor(Q('method=workflow'), {}, P), 'workflow');
  assert.equal(M.engineFor(Q(''), { presentation: { method: 'workflow' } }, P), 'workflow');
  assert.equal(M.engineFor(Q('method=paper'), { presentation: { method: 'workflow' } }, P), 'paper');
  assert.equal(M.engineFor(Q('method=bogus'), {}, P), 'studio', 'an invalid method is left for the compiler to report');
  const lock = pageList(path.join(root, 'examples/lock/index.html')).map(M.kitName).filter(Boolean);
  assert.ok(!plain(M.modulesFor('workflow', lock)).some((f) => M.stack3d.includes(f)));
  assert.ok(plain(M.modulesFor('paper', lock)).includes('paper-engine.js'));
  assert.ok(!plain(M.modulesFor('studio', lock)).includes('workflow-engine.js'));
});

test('new.mjs writes the manifest script list', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'mx-new-'));
  try {
    const r = spawnSync(process.execPath, ['scripts/new.mjs', 'probe-obj', '--dir', work], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const names = pageList(path.join(work, 'probe-obj', 'index.html'));
    assert.deepEqual(names.map(M.kitName).filter(Boolean), plain(M.pageModules([])).concat(M.compiler));
    assert.deepEqual(names.filter((s) => !M.kitName(s)), ['spec.js', 'run.js']);
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
});

test('real browser: each engine loads exactly the modules the manifest gives it', {
  skip: !findBrowser() && !process.env.CI ? 'no Chromium browser found' : false, timeout: 300000,
}, async () => {
  // [example, query, spec.presentation injected before the page's spec.js runs, expected engine]
  const cases = [
    ['lock', 'method=studio&background=porcelain', null, 'studio'],
    ['lock', '', null, 'studio'],
    ['lock', 'method=paper&background=ivory', null, 'paper'],
    ['react', 'method=workflow&background=graphite', null, 'workflow'],
    ['react', '', { method: 'workflow', background: 'graphite' }, 'workflow'],      // the method only in the spec
    ['react', 'method=studio', { method: 'workflow' }, 'studio'],                    // the URL wins over the spec
  ];
  for (const [name, query, inject, engine] of cases) await withBrowser(async (b) => {
    await b.send('Page.enable');
    if (inject) await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window,'SPEC',{configurable:true,get(){return this.__spec;},set(v){v.presentation=${JSON.stringify(inject)};this.__spec=v;}});` });
    await b.send('Page.navigate', { url: pathToFileURL(path.join(root, 'examples', name, 'index.html')).href + '?render=1&length=short&aspect=9:16' + (query ? '&' + query : '') });
    let ready = false;
    for (let i = 0; i < 200; i++) { if (await b.ev('typeof __frame === "function"')) { ready = true; break; } await sleep(100); }
    assert.ok(ready, name + '?' + query + ' did not initialize: ' + await b.ev('document.title'));
    const r = await b.ev(`({ profile: window.MX_PROFILE, three: typeof THREE, scripts: [...document.scripts].map((s) => s.src).filter(Boolean), method: window.__specInfo ? __specInfo().method : null })`);
    const listed = pageList(path.join(root, 'examples', name, 'index.html')).map(M.kitName).filter(Boolean);
    const loaded = r.scripts.map(M.kitName).filter(Boolean);
    assert.equal(r.profile, engine, name + '?' + query);
    assert.equal(new Set(loaded).size, loaded.length, name + ': a module loaded twice');
    assert.deepEqual(plain(M.order.filter((f) => loaded.includes(f))), plain(M.modulesFor(engine, listed)), name + '?' + query + ': loaded modules');
    assert.equal(r.three, M.engines[engine].stack3d ? 'object' : 'undefined');
    if (engine !== 'studio' || query.includes('method')) assert.equal(r.method, engine);
  }, { timeout: 60000, retries: 0 });
});
