// paper-geometry.test.mjs - Draft 0.2 in the browser: the three demonstration parts drawn by Paper from their declared 2D geometry.
// No three.js, no mesh adapter, no WebGL context at all; Paper's visual contract; repeatable frames; the drawn numbers are the
// geometry's; Studio refuses a flat part instead of inventing a 3D one; the preflight reports the mesh area check as NOT RUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { withBrowser, findBrowser } from '../scripts/lib/browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const opts = { skip: !findBrowser() && !process.env.CI ? 'no Chromium browser found' : false, timeout: 400000 };
const DEMOS = { 'demo-plate': ['160', '100', 'R6', '4× Ø6.6', 'Ø12', '44 x 22', '5× Ø5 AT 11 PITCH', '01 / PLAN'], 'demo-flange': ['Ø140', 'Ø50', '6× Ø11 ON PCD 110', '01 / PLAN'], 'demo-section': ['120', '80', 'Ø12', 'Ø10', '50 x 8', '01 / SECTION A-A'] };
// records every 2D context feature Paper must not use and every context type any canvas asks for
const HOOK = `window.__style=[];window.__contexts=[];const C=CanvasRenderingContext2D.prototype,note=(k,v)=>__style.push(k+'='+v);
  for(const f of ['createLinearGradient','createRadialGradient','createConicGradient']){const o=C[f];C[f]=function(...a){note(f,'called');return o.apply(this,a);};}
  const watch=(k,bad)=>{const d=Object.getOwnPropertyDescriptor(C,k);Object.defineProperty(C,k,{configurable:true,get(){return d.get.call(this);},set(v){if(bad(v))note(k,v);d.set.call(this,v);}});};
  watch('shadowBlur',v=>+v>0);watch('filter',v=>String(v)!=='none');
  const gc=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){__contexts.push(String(t));return gc.call(this,t,...a);};
  const oc=globalThis.OffscreenCanvas&&OffscreenCanvas.prototype.getContext;if(oc)OffscreenCanvas.prototype.getContext=function(t,...a){__contexts.push('offscreen:'+t);return oc.call(this,t,...a);};`;
const page = (name, query = '') => pathToFileURL(path.join(root, 'examples', name, 'index.html')).href + '?render=1&length=short' + query;
const TIMES = [0, 2.5, 6, 12, 20, 25.5, 29];

for (const [name, expected] of Object.entries(DEMOS)) test(`${name}: drawn by Paper from its declared geometry, with no three.js and no WebGL, repeatably`, opts, async () => {
  await withBrowser(async (b) => {
    await b.send('Page.enable'); await b.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK }); await b.send('Page.navigate', { url: page(name) });
    let ready = false; for (let i = 0; i < 300 && !ready; i++) { ready = await b.ev('typeof __frame === "function"'); if (!ready) await sleep(50); }
    assert.ok(ready, name + ' did not initialize: ' + await b.ev('document.title'));
    const r = await b.ev(`(async()=>{
      const hash=async t=>{__paint(t,1,.5);const d=MX.ctx.getImageData(0,0,MX.ctx.canvas.width,MX.ctx.canvas.height).data;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',d))].map(x=>x.toString(16).padStart(2,'0')).join('');};
      const texts=[];const f=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(s,...a){texts.push(String(s));return f.call(this,s,...a);};__paint(12,1,.5);CanvasRenderingContext2D.prototype.fillText=f;
      __style=[];const first=[];for(const t of ${JSON.stringify(TIMES)})first.push(await hash(t));const style=__style.slice();const second=[];for(const t of ${JSON.stringify(TIMES)}.slice().reverse())second.unshift(await hash(t));
      return {three:typeof THREE,mesh:typeof MX.paperMesh,geom:typeof MX.geom2d,contexts:[...new Set(__contexts)],scripts:[...document.scripts].map(s=>s.src.split('/').pop()).filter(Boolean),
        info:__specInfo(),checks:window.__checks,texts,style,first,second};})()`);
    assert.equal(r.info.method, 'paper', 'the spec asks for Paper itself'); assert.deepEqual(r.info.errors, []);
    assert.equal(r.three, 'undefined'); assert.equal(r.mesh, 'undefined'); assert.equal(r.geom, 'object');
    for (const f of ['three.bundle.js', 'gl.js', 'figure.js', 'parts.js', 'paper-mesh.js']) assert.ok(!r.scripts.includes(f), name + ' loaded ' + f);
    assert.ok(r.contexts.every((t) => t === '2d'), name + ' asked for a context other than 2d: ' + r.contexts.join(', '));
    assert.deepEqual(r.checks, { geometryArea: { run: false, reason: 'vector_scene_without_mesh_projection', expected: true } }, 'the mesh area check does not run here and says so');
    assert.deepEqual(r.style, [], name + ': Paper used a lighting or shading feature');
    assert.deepEqual(r.first, r.second, name + ': the same time gives the same frame, in any order');
    assert.equal(new Set(r.first).size > 1, true, name + ': the frames are not all the same');
    for (const s of expected) assert.ok(r.texts.includes(s), name + ': "' + s + '" is not drawn (drawn: ' + r.texts.join(' | ').slice(0, 400) + ')');
    const all = r.texts.join(' ');      // the caption rises word by word: one fillText per word
    assert.match(all, /NET AREA \d+\.\d mm² = OUTLINE/, name + ': the net area is printed'); assert.match(all, /\d+ DECLARED, NOT VERIFIED/, name + ': unverified dimensions are said to be unverified');
  }, { timeout: 90000, retries: 0 });
});

test('Studio refuses a flat part instead of inventing a 3D model for it', opts, async () => {
  await withBrowser(async (b) => {
    await b.send('Page.enable'); await b.send('Page.navigate', { url: page('demo-plate', '&method=studio') });
    let title = ''; for (let i = 0; i < 200 && title !== 'SPEC ERROR'; i++) { title = await b.ev('document.title'); if (title !== 'SPEC ERROR') await sleep(50); }
    assert.equal(title, 'SPEC ERROR'); assert.equal(await b.ev('typeof __frame'), 'undefined', 'no film is mounted');
  }, { timeout: 60000, retries: 0 });
});

test('the preflight on the three parts: nothing fails, the mesh area check is reported NOT RUN with its reason', opts, () => {
  for (const name of Object.keys(DEMOS)) {
    const r = spawnSync(process.execPath, ['scripts/preflight.mjs', 'examples/' + name + '/index.html', '--length', 'short', '--step', '1', '--json'], { cwd: root, encoding: 'utf8', timeout: 300000 });
    const j = JSON.parse(r.stdout); assert.equal(j.fail, 0, name + ': ' + JSON.stringify(j.findings)); assert.deepEqual(j.notRun, [{ check: 'GEOMETRY_AREA', reason: 'vector_scene_without_mesh_projection' }]);
  }
});
