import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { withBrowser, findBrowser } from '../scripts/lib/browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({ URLSearchParams });
vm.runInContext(fs.readFileSync(path.join(root, 'kit/presentation.js'), 'utf8'), ctx);
for (const name of ['workflow-engine', 'paper-engine']) vm.runInContext(fs.readFileSync(path.join(root, 'kit/' + name + '.js'), 'utf8'), ctx);
const P = ctx.MX.presentation, plain = x => JSON.parse(JSON.stringify(x));
test('three methods and four backgrounds are independent; legacy films stay opt-in', () => {
  assert.equal(P.resolve(new URLSearchParams()).enabled, false);
  for (const method of P.methods) for (const background of Object.keys(P.backgrounds)) {
    assert.deepEqual(plain(P.resolve(new URLSearchParams({ method, background }))), { method, background, enabled: true });
  }
  assert.equal(P.resolve(new URLSearchParams(), { presentation: { method: 'paper' } }).background, 'ivory');
  assert.throws(() => P.resolve(new URLSearchParams('method=oops')), /Unknown presentation method/);
  assert.throws(() => P.resolve(new URLSearchParams('background=oops')), /Unknown presentation background/);
});
test('text wrapping preserves words and splits long identifiers without overflow', () => {
  const lines = plain(P.wrap('React updates the page', 13, s => s.length));
  assert.deepEqual(lines, ['React updates', 'the page']);
  const long = plain(P.wrap('CRC 01234567890123456789 result', 9, s => s.length));
  assert.ok(long.every(s => s.length <= 9));
  assert.equal(long.join('').replaceAll(' ', ''), 'CRC01234567890123456789result');
});
test('workflow planner preserves each real step and is a pure function of time', () => {
  const spec = { mechanism: { steps: { count: 5, label: i => ({ title: 'step ' + i, value: String(i) }) } } };
  const plan = P.plan(spec, 'workflow', 'short');
  assert.equal(plan.duration, 30); assert.equal(plan.items.length, 5);
  for (let i = 0; i < 5; i++) {
    const t = plan.begin + (i + .5) * plan.slot;
    assert.equal(P.at(plan, t).index, i); assert.equal(P.at(plan, t).item.title, 'step ' + i);
    assert.deepEqual(plain(P.at(plan, t)), plain(P.at(plan, t)));
  }
  assert.equal(P.at(plan, -10).intro, true); assert.equal(P.at(plan, 300).closing, true);
  const modes = { mechanism: { drive: { modes: [{ label: 'skip' }, { label: 'keep' }] } } };
  const selected = P.plan(modes, 'workflow', 'short', [1]);
  assert.equal(selected.items.length, 1); assert.equal(P.at(selected, 10).item.mode, 1);
  assert.throws(() => P.plan({}, 'workflow'), /needs mechanism/);
});
test('paper planner uses actual parts and confidence; invalid tours fail', () => {
  const spec = { parts: [{ id: 'shell', name: 'Shell', conf: 'estimated' }], director: { tour: ['shell'] } };
  assert.equal(P.plan(spec, 'paper').items[0].conf, 'estimated');
  assert.equal(P.plan(spec, 'paper', 'normal').duration, 60);
  assert.throws(() => P.plan({ ...spec, director: { tour: ['missing'] } }, 'paper'), /Unknown presentation part/);
});
test('independent vector projection and factory routing fit their own coordinate systems', () => {
  assert.deepEqual(plain(ctx.MX.paperEngine.project([2,3,4], 'front')), [2,-3]);
  assert.deepEqual(plain(ctx.MX.paperEngine.project([2,3,4], 'top')), [2,4]);
  const fit=ctx.MX.paperEngine.fit([[0,0],[10,20]],{x:0,y:0,w:100,h:100});
  assert.deepEqual(plain(fit([0,0])),[25,0]);assert.deepEqual(plain(fit([10,20])),[75,100]);
  const layout=plain(ctx.MX.workflowEngine.layout(5,1080,1920));
  assert.ok(layout[0].x<layout[1].x && layout[2].x>layout[3].x);
  assert.ok(layout[2].y>layout[0].y);
});

test('real renderer: all twelve combinations, stage sync, text bounds and repeatable frames', {
  skip: !findBrowser() && !process.env.CI ? 'no Chromium browser found' : false, timeout: 900000,
}, async () => {
  for (const method of P.methods) await withBrowser(async b => {
    await b.send('Page.enable');
    await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.__drawn=[];
      const get=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'){window.__webglCreates=(window.__webglCreates||0)+1;window.__stageCanvas=this;
        if(${JSON.stringify(method)}!=='studio')throw new Error('2D engines must not create WebGL');}return get.call(this,type,...args);};
      const fill=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(s,x,y,...rest){
        if(window.MX?.ctx?.canvas===this.canvas){const m=this.measureText(s),w=m.width;
          const left=this.textAlign==='right'?x-w:this.textAlign==='center'?x-w/2:x;
          __drawn.push({s:String(s),x:left,y,w,h:parseFloat(this.font.match(/[\\d.]+px/)?.[0]||'0')});}
        return fill.call(this,s,x,y,...rest);
      };` });
    const name = method === 'workflow' ? 'react' : 'lock';
    const cases = Object.keys(P.backgrounds).map(bg => [bg, '9:16']).concat([['porcelain', '4:5'], ['ivory', '1:1']]);
    for (const [background, aspect] of cases) {
      const height = aspect === '9:16' ? 1920 : aspect === '4:5' ? 1350 : 1080;
      await b.send('Page.navigate', { url: pathToFileURL(path.join(root, 'examples', name, 'index.html')).href + `?render=1&length=short&aspect=${aspect}&method=${method}&background=${background}` });
      let ready = false;
      for (let i = 0; i < 200; i++) { if (await b.ev('typeof __frame === "function"')) { ready = true; break; } await sleep(100); }
      assert.ok(ready, method + '/' + background + ' did not initialize');
      const info = await b.ev('__specInfo()');
      assert.equal(info.method, method); assert.equal(info.background, background); assert.deepEqual(info.errors, []);
      const result = await b.ev(`(() => {
        const failures=[];
        for(const t of [0,9,20,Math.min(${info.duration}-1,28)]){
          __drawn=[];__paint(t,1,.5);
          failures.push(...__drawn.filter(r=>r.x < -2 || r.x+r.w>1082 || r.y>${height}+2 || r.y-r.h < -2));
        }
        const small=()=>{__paint(9,1,.5);const c=document.createElement('canvas');c.width=180;c.height=320;
          const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(MX.ctx.canvas,0,0,180,320);return x.getImageData(0,0,180,320).data;};
        const a=small(),b=small();let changed=0,max=0,total=0;
        for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)changed++;max=Math.max(max,d);total+=d;}
        const c=document.createElement('canvas');c.width=90;c.height=60;const x=c.getContext('2d',{willReadFrequently:true});
        x.drawImage(MX.ctx.canvas,80,280,920,${height}*.20,0,0,90,60);
        const data=x.getImageData(0,0,90,60).data;let sum=0,sq=0,n=0;
        for(let i=0;i<data.length;i+=4){const l=(data[i]+data[i+1]+data[i+2])/3;sum+=l;sq+=l*l;n++;}
        return {failures,residual:{changed,max,mae:total/a.length},sceneStd:Math.sqrt(sq/n-(sum/n)**2),
          size:[MX.ctx.canvas.width,MX.ctx.canvas.height],stage:window.__stageCanvas?[__stageCanvas.width,__stageCanvas.height]:null,webgl:window.__webglCreates||0,
          three:typeof THREE,scripts:[...document.scripts].map(s=>s.src.split('/').pop()),profile:window.MX_PROFILE};
      })()`);
      assert.deepEqual(result.failures, [], method + '/' + background + ': ' + JSON.stringify(result.failures));
      // GPU raster/composite rounding is already bounded by the existing visual
      // suite. Measure it here too; do not demand byte identity of GPU edges.
      assert.ok(result.residual.max <= 2, method + '/' + background + ': ' + JSON.stringify(result.residual));
      assert.deepEqual(result.size, [1080, height]);
      if(method==='studio') assert.deepEqual(result.stage, [1620, height * 1.5]);
      else {assert.equal(result.webgl,0);assert.equal(result.stage,null);assert.equal(result.residual.max,0);}
      if (method === 'workflow') {
        // Flow runs without the 3D stack: three.js, the WebGL stage, the figure, the parts library and Paper (engine and mesh adapter) are never loaded
        assert.equal(result.profile, 'workflow'); assert.equal(result.three, 'undefined');
        assert.deepEqual(result.scripts.filter(s => /^(three\.bundle|gl|figure|parts|paper-engine|paper-mesh)\.js$/.test(s)), []);
        const states = await b.ev('[5,10,15,20,23].map(t=>__presentationAt(t))');
        assert.ok(states.every((s, i) => i === 0 || s.sourceStep >= states[i - 1].sourceStep));
      }
    }
  }, { timeout: 90000, retries: 0 });
});
