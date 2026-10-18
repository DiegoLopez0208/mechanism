// Paper's visual contract (no lighting, shadows, gradients or filters: strokes, hatching and flat fills only) and Paper on a page
// that loads its scripts directly, without kit/boot.js (so without kit/manifest.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { withBrowser, findBrowser } from '../scripts/lib/browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const opts = { skip: !findBrowser() && !process.env.CI ? 'no Chromium browser found' : false, timeout: 300000 };
// Records, on every 2D context, what Paper must never use. The draw calls go through unchanged.
const STYLE_HOOK = `
  window.__style=[];const C=CanvasRenderingContext2D.prototype,note=(k,v)=>__style.push(k+'='+v);
  for(const f of ['createLinearGradient','createRadialGradient','createConicGradient']){const o=C[f];C[f]=function(...a){note(f,'called');return o.apply(this,a);};}
  const watch=(k,bad)=>{const d=Object.getOwnPropertyDescriptor(C,k);Object.defineProperty(C,k,{configurable:true,get(){return d.get.call(this);},set(v){if(bad(v))note(k,v);d.set.call(this,v);}});};
  watch('shadowBlur',v=>+v>0);watch('shadowOffsetX',v=>+v!==0);watch('shadowOffsetY',v=>+v!==0);
  watch('filter',v=>String(v)!=='none');
  watch('globalCompositeOperation',v=>['lighter','screen','overlay','color-dodge','hard-light','soft-light','plus-lighter'].includes(String(v)));`;
const ready = async (b, what) => {
  for (let i = 0; i < 300; i++) { if (await b.ev('typeof __frame === "function"')) return; await sleep(50); }
  throw new Error(what + ' did not initialize: ' + await b.ev('document.title'));
};
const TIMES = Array.from({ length: 21 }, (_, i) => +(i * 1.45).toFixed(2));      // 0 .. 29 s: intro, every stage, the closing card
const paintAll = (b) => b.ev(`(()=>{__style=[];for(const t of ${JSON.stringify(TIMES)})__paint(t,1,.5);return __style;})()`);

for (const [name, label] of [['lock', 'vector scene'], ['hub', 'generic mesh projection']]) test(`Paper visual contract (${name}, ${label}): no gradient, shadow, filter or lighting blend in any frame`, opts, async () => {
  await withBrowser(async (b) => {
    await b.send('Page.enable'); await b.send('Page.addScriptToEvaluateOnNewDocument', { source: STYLE_HOOK });
    await b.send('Page.navigate', { url: pathToFileURL(path.join(root, 'examples', name, 'index.html')).href + '?render=1&length=short&aspect=9:16&method=paper&background=ivory' });
    await ready(b, name);
    assert.deepEqual(await paintAll(b), [], name + ': Paper used a lighting or shading feature');
    // the detector itself: a shadow slipped into every stroke must be caught
    await b.ev(`(()=>{const s=CanvasRenderingContext2D.prototype.stroke;window.__origStroke=s;CanvasRenderingContext2D.prototype.stroke=function(...a){this.shadowBlur=6;return s.apply(this,a);};})()`);
    assert.ok((await paintAll(b)).some((v) => v.startsWith('shadowBlur=')), 'the contract test must catch an injected shadow');
  }, { timeout: 120000, retries: 0 });
});

// A page that lists its scripts itself (no boot.js, so no MX_MANIFEST): the compiler falls back to MX.paperEngine.scenes to pick the path.
const kitUrl = pathToFileURL(path.join(root, 'kit') + path.sep).href;
const directPage = (dir, example, kit) => {
  const ex = pathToFileURL(path.join(root, 'examples', example) + path.sep).href;
  const own = fs.readFileSync(path.join(root, 'examples', example, 'index.html'), 'utf8'), list = /data-scripts="([^"]*)"/.exec(own)[1].split(',').filter((s) => !s.includes('/kit/'));
  const src = kit.map((f) => kitUrl + f).concat(list.filter((s) => s !== 'run.js').map((s) => ex + s), [kitUrl + 'spec.js', ex + 'run.js']);
  const file = path.join(dir, example + '-direct.html');
  fs.writeFileSync(file, '<!doctype html><html><head><meta charset="utf-8"></head><body><canvas id="c"></canvas>\n' + src.map((s) => `<script src="${s}"></script>`).join('\n') + '\n</body></html>');
  return file;
};
test('Paper without boot.js: a vector scene still runs with no three.js; a spec without one still uses the meshes', opts, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mx-direct-'));
  try {
    const base = ['iso.js', 'core.js', 'presentation.js', 'samples.js', 'sound.js', 'kin.js', 'spec-core.js'];
    const lock = directPage(dir, 'lock', base.concat('paper-engine.js'));
    const hub = directPage(dir, 'hub', ['vendor/three.bundle.js', 'iso.js', 'core.js', 'presentation.js', 'samples.js', 'sound.js', 'gl.js', 'figure.js', 'parts.js', 'kin.js', 'spec-core.js', 'paper-engine.js', 'paper-mesh.js']);
    for (const [file, vector] of [[lock, true], [hub, false]]) await withBrowser(async (b) => {
      await b.send('Page.enable');
      await b.send('Page.navigate', { url: pathToFileURL(file).href + '?render=1&length=short&aspect=9:16&method=paper&background=ivory' });
      await ready(b, path.basename(file));
      const r = await b.ev(`({ manifest: typeof window.MX_MANIFEST, three: typeof THREE, mesh: typeof MX.paperMesh, method: __specInfo().method, errors: __specInfo().errors, checks: window.__checks,
        texts: (()=>{const out=[];const f=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(s,...a){out.push(String(s));return f.call(this,s,...a);};__paint(9,1,.5);CanvasRenderingContext2D.prototype.fillText=f;return out;})() })`);
      assert.equal(r.manifest, 'undefined', 'this page must not have the manifest, or it does not test the fallback');
      assert.equal(r.method, 'paper'); assert.deepEqual(r.errors, []);
      if (vector) {
        assert.equal(r.three, 'undefined'); assert.equal(r.mesh, 'undefined');
        assert.deepEqual(r.checks, { geometryArea: { run: false, reason: 'vector_scene_without_mesh_projection', expected: true } });
        assert.ok(r.texts.some((s) => s.startsWith('SECTION VIEW')), 'the section scene is drawn');
      } else {
        assert.equal(r.three, 'object'); assert.equal(r.mesh, 'object');
        assert.deepEqual(r.checks, { geometryArea: { run: true } });
        assert.ok(r.texts.some((s) => s.startsWith('ORTHOGRAPHIC STUDY')), 'the generic sheet is drawn');
      }
    }, { timeout: 90000, retries: 0 });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
