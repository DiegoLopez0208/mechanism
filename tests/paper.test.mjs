// Paper: the vector scene (lock), the generic mesh projection (hub) and the data the mesh adapter hands to the vector engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { withBrowser, findBrowser } from '../scripts/lib/browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const opts = { skip: !findBrowser() && !process.env.CI ? 'no Chromium browser found' : false, timeout: 300000 };
// recorded in every page: texts drawn on the frame canvas, WebGL requests, the figure the compiler makes and how often the mesh adapter builds a view set
// (the MX accessor is the same pattern as scripts/lib/visual.mjs)
const HOOKS = `
  window.__drawn=[];window.__webgl=0;window.__viewSets=0;
  const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){if(t==='webgl2'||t==='webgl')window.__webgl++;return get.call(this,t,...a);};
  const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(s,x,y,...r){if(window.MX?.ctx===this){const w=this.measureText(s).width,l=this.textAlign==='right'?x-w:this.textAlign==='center'?x-w/2:x;__drawn.push({s:String(s),x:l,y,w});}return fill.call(this,s,x,y,...r);};
  let mx={};Object.defineProperty(window,'MX',{get:()=>mx,set:v=>{mx=v;
   if(!Object.getOwnPropertyDescriptor(mx,'figure')?.get){let figure;Object.defineProperty(mx,'figure',{configurable:true,get:()=>figure,set:fn=>{figure=(...a)=>(window.__fig=fn(...a));}});}
   if(!Object.getOwnPropertyDescriptor(mx,'paperMesh')?.get){let pm;Object.defineProperty(mx,'paperMesh',{configurable:true,get:()=>pm,set:v=>{pm=v;let vs;Object.defineProperty(v,'viewSet',{configurable:true,get:()=>vs&&((...a)=>{window.__viewSets++;return vs(...a);}),set:f=>{vs=f;}});}});}
  }});window.MX=mx;`;
const testPlate = { id: 'testplate', name: 'Test plate', kind: 'plate', p: { w: 20, h: 20, r: 1, t: 2, holes: [[9, 0, 12, 12]] }, mat: 'steel', at: [0, 0, 0], explode: [0, 0, 0], conf: 'estimated', why: 'a part of the test', tour: false };
const open = async (b, name, query, extraPart) => {
  await b.send('Page.enable');
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOKS + (extraPart ? `let spec;Object.defineProperty(window,'SPEC',{configurable:true,get:()=>spec,set:v=>{v.parts.push(${JSON.stringify(extraPart)});spec=v;}});` : '') });
  await b.send('Page.navigate', { url: pathToFileURL(path.join(root, 'examples', name, 'index.html')).href + '?render=1&length=short&aspect=9:16&' + query });
  for (let i = 0; i < 300; i++) { if (await b.ev('typeof __frame === "function"')) return; await sleep(50); }
  throw new Error(name + ' did not initialize: ' + await b.ev('document.title'));
};
const texts = (b, t) => b.ev(`(()=>{__drawn=[];__paint(${t},1,.5);return __drawn;})()`);
const hash = (b, t) => b.ev(`(async()=>{__paint(${t},1,.5);const d=MX.ctx.getImageData(0,0,MX.ctx.canvas.width,MX.ctx.canvas.height).data;const h=await crypto.subtle.digest('SHA-256',d);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');})()`);

test('Paper generic path (hub, no paperScene): orthographic sheet from the model meshes, deterministic, no WebGL', opts, async () => {
  await withBrowser(async (b) => {
    await open(b, 'hub', 'method=paper&background=ivory');
    const info = await b.ev('__specInfo()');
    assert.equal(info.method, 'paper'); assert.deepEqual(info.errors, []);
    assert.equal(await b.ev('!!SPEC.paperScene'), false, 'hub must stay an example without a vector scene, or this test no longer covers the mesh path');
    const drawn = await texts(b, 9);
    assert.ok(drawn.some((d) => d.s.startsWith('ORTHOGRAPHIC STUDY')), 'the generic sheet is drawn');
    assert.ok(drawn.some((d) => /^PART 0\d \//.test(d.s)), 'a tour part detail is drawn');
    for (const d of drawn) assert.ok(d.x >= -2 && d.x + d.w <= 1082 && d.y <= 1922, 'text off the frame: ' + d.s);
    assert.equal(await b.ev('__webgl'), 0, 'Paper must not create a WebGL context');
    for (const t of [3.5, 9, 20]) assert.equal(await hash(b, t), await hash(b, t), 'repeated frame at ' + t + ' s');
    assert.notEqual(await hash(b, 3.5), await hash(b, 20), 'the sheet changes over time');
  }, { timeout: 90000, retries: 0 });
});

test('Paper vector scene (lock, paperScene): the section is drawn with no three.js, no figure, no mesh adapter, and the area check says NOT RUN', opts, async () => {
  await withBrowser(async (b) => {
    await open(b, 'lock', 'method=paper&background=ivory');
    const drawn = await texts(b, 9);
    assert.ok(drawn.some((d) => d.s.startsWith('SECTION VIEW')), 'the section scene is drawn');
    assert.ok(!drawn.some((d) => d.s.startsWith('ORTHOGRAPHIC STUDY')), 'not the generic sheet');
    assert.equal(await b.ev('__webgl'), 0);
    const r = await b.ev('({ three: typeof THREE, mesh: typeof (MX.paperMesh), figure: typeof window.__fig, viewSets: window.__viewSets, checks: window.__checks, shape: __shapeCheck(), errors: __specInfo().errors })');
    assert.equal(r.three, 'undefined', 'three.js is not loaded'); assert.equal(r.mesh, 'undefined', 'the mesh adapter is not loaded');
    assert.equal(r.figure, 'undefined', 'no 3D figure is built'); assert.equal(r.viewSets, 0, 'no view set is built');
    assert.deepEqual(r.checks, { geometryArea: { run: false, reason: 'vector_scene_without_mesh_projection', expected: true } });
    assert.deepEqual(r.shape, [], 'old callers of __shapeCheck still get an array'); assert.deepEqual(r.errors, []);
  }, { timeout: 90000, retries: 0 });
});

test('Paper fails loudly with neither a view set nor a vector scene it can draw', opts, async () => {
  await withBrowser(async (b) => {
    await open(b, 'hub', 'method=paper&background=ivory');
    const message = await b.ev(`(()=>{const q=new URLSearchParams(location.search),c=document.getElementById('c');
      try{MX.paperEngine.run({spec:Object.assign({},SPEC,{paperScene:{kind:'bogus'}}),validation:MX.spec.validate(SPEC),config:MX.presentation.resolve(q,SPEC),views:null,W:c.width,H:c.height,length:'short'});return 'no error';}catch(e){return e.message;}})()`);
    assert.match(message, /^Paper: no view set and no vector scene it can draw \(paperScene\.kind: "bogus"\)$/);
  }, { timeout: 90000, retries: 0 });
});

test('Paper keeps feeding the area check: a plate with a hole outside its outline is reported, a clean model is not', opts, async () => {
  await withBrowser(async (b) => {
    await open(b, 'hub', 'method=paper&background=ivory');
    assert.deepEqual(await b.ev('__shapeCheck()'), []);
  }, { timeout: 90000, retries: 0 });
  await withBrowser(async (b) => {
    await open(b, 'hub', 'method=paper&background=ivory', testPlate);
    const bad = await b.ev('__shapeCheck()');
    const plate = bad.find((q) => q.id === 'testplate');
    assert.ok(plate && Math.abs(plate.ratio - 1) > 0.05, JSON.stringify(bad));
  }, { timeout: 90000, retries: 0 });
});

test('legacy contract: run({ F }) still accepts the figure and draws the same frames as the view-set path, with one adapter build', opts, async () => {
  await withBrowser(async (b) => {
    await open(b, 'hub', 'method=paper&background=ivory');
    const times = [0, 3.5, 9, 20, 28.5], fresh = [];
    for (const t of times) fresh.push(await hash(b, t));
    // the same call kit/spec.js made before PV-1: the figure, no view set; it re-mounts the timeline on the same canvas
    const builds = await b.ev(`(()=>{const before=window.__viewSets,q=new URLSearchParams(location.search),c=document.getElementById('c');
      MX.paperEngine.run({spec:SPEC,validation:MX.spec.validate(SPEC),config:MX.presentation.resolve(q,SPEC),F:window.__fig,W:c.width,H:c.height,length:q.get('length')});
      return window.__viewSets-before;})()`);
    assert.equal(builds, 1, 'the legacy call builds the view set exactly once, through the adapter');
    for (const [i, t] of times.entries()) assert.equal(await hash(b, t), fresh[i], 'frame at ' + t + ' s differs between run({ F }) and run({ views })');
  }, { timeout: 90000, retries: 0 });
});

test('mesh adapter contract: one plain view set per part, built once from the compiled meshes', opts, async () => {
  await withBrowser(async (b) => {
    await open(b, 'hub', 'method=paper&background=ivory');
    const r = await b.ev(`(()=>{
      const builtAtLoad=window.__viewSets, F=window.__fig, set=MX.paperMesh.viewSet(F), meshes=F.parts.reduce((n,p)=>{let k=0;p.group.traverse(m=>{if(m.isMesh&&m.geometry)k++;});return n+k;},0);
      const plain=JSON.parse(JSON.stringify(set.entries,(k,v)=>v instanceof Float32Array?Array.from(v):v));
      let cloneable=true;try{structuredClone(set.entries);}catch(e){cloneable=false;}
      return {ids:set.entries.map(e=>e.id), partIds:F.parts.map(p=>p.id), confs:set.entries.map(e=>e.conf), partConfs:F.parts.map(p=>p.spec.conf), plain, cloneable,
        builtAtLoad, meshes, details:Object.keys(set.parts), engineHasThree:/THREE/.test(MX.paperEngine.run.toString())};
    })()`);
    assert.deepEqual(r.ids, r.partIds, 'one entry per part, in the figure order');
    assert.deepEqual(r.confs, r.partConfs, 'confidence carried from the spec');
    assert.ok(r.cloneable, 'the view set is plain data (structured clone)');
    for (const e of r.plain) for (const v of ['front', 'top', 'side']) {
      const w = e.views[v];
      assert.equal(w.points.length % 4, 0, e.id + ' ' + v + ': points come in segments');
      assert.equal(w.bounds.length, 4); assert.ok(w.bounds.every(Number.isFinite) || w.points.length === 0);
      assert.equal(w.offset.length, 2);
    }
    assert.equal(r.builtAtLoad, 1, 'the view set is built once at load (no second compilation)');
    assert.ok(r.meshes > 0);
    assert.deepEqual(r.details.sort(), [...r.partIds].sort(), 'detail data for every part');
    assert.equal(r.engineHasThree, false, 'the vector engine does not touch three.js');
  }, { timeout: 90000, retries: 0 });
});
