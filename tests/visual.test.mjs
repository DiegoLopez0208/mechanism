import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { findBrowser } from '../scripts/lib/browser.mjs';
import { comparePixels } from '../scripts/lib/ssim.mjs';
import { root, examples, width, height, withExample, capture, compareFrame } from '../scripts/lib/visual.mjs';

const opts = { skip: !findBrowser() && !process.env.CI ? 'no Chromium browser found' : false, timeout: 900000 };
test('AO noise is repeatable across sessions; repeated frames have only bounded raster rounding', opts, async () => {
  for (const name of ['lock', 'winrar']) {
    const sessions = [];
    for (let run = 0; run < 2; run++) await withExample(name, async (b, info) => {
      const texture = Buffer.from(await b.ev('Array.from(__testFigure.st.ao.pdNoiseTexture.image.data)'));
      const noise = createHash('sha256').update(texture).digest('hex');
      const t = info.shots.find(s => s.label.startsWith('mode ')).t;
      const frame = await capture(b, t); sessions.push({ noise, frame });
      const residual = await b.ev(`(() => {
        const out=[]; for(const t of [${info.duration}*.1,${info.duration}*.35,${info.duration}*.6,${info.duration}*.85]) {
          const pixels=()=>{__paint(t,4,.5);const c=document.createElement('canvas');c.width=MX.ctx.canvas.width;c.height=MX.ctx.canvas.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(MX.ctx.canvas,0,0);return x.getImageData(0,0,c.width,c.height).data;};
          const a=pixels();__paint(t+2,4,.5);const c=pixels();let max=0,abs=0,changed=0;
          for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-c[i]);max=Math.max(max,d);abs+=d;if(d)changed++;}
          out.push({t,max,meanAbs:abs/a.length,changedFraction:changed/a.length});
        } return out;
      })()`);
      // GPUs can round a few edge samples by one or two levels. This is an
      // explicit bound, not a claim that every PNG is byte-identical.
      for (const r of residual) { assert.ok(r.max <= 2, JSON.stringify(r)); assert.ok(r.meanAbs <= 0.0002, JSON.stringify(r)); assert.ok(r.changedFraction <= 0.0002, JSON.stringify(r)); }
    });
    assert.equal(sessions[0].noise, sessions[1].noise, name + ' denoise texture');
    const metric = compareFrame(sessions[0].frame, sessions[1].frame);
    assert.ok(metric.ssim >= 0.99999, name + ' across sessions: ' + JSON.stringify(metric));
  }
});
test('local SSIM detects small displaced geometry as well as large text changes', () => {
  const a = Buffer.alloc(32 * 32 * 3, 60), b = Buffer.from(a);
  assert.equal(comparePixels(a, b, 32, 32, 3).ssim, 1);
  for (let y = 4; y < 10; y++) for (let x = 4; x < 10; x++) b.fill(220, (y * 32 + x) * 3, (y * 32 + x) * 3 + 3);
  const r = comparePixels(a, b, 32, 32, 3);
  assert.ok(r.min < 0.1); assert.ok(r.ssim < 1);
});
test('four compact golden frames per example match the renderer', opts, async () => {
  for (const name of examples) await withExample(name, async b => {
    const dir = path.join(root, 'tests/goldens', process.platform), meta = JSON.parse(fs.readFileSync(path.join(dir, name + '.json')));
    const pixels = inflateSync(fs.readFileSync(path.join(dir, name + '.rgb.deflate'))), size = width * height * 3;
    assert.equal(pixels.length, meta.frames.length * size);
    for (const [i, frame] of meta.frames.entries()) {
      const r = compareFrame(await capture(b, frame.t), pixels.subarray(i * size, (i + 1) * size));
      assert.ok(r.ok, `${name} ${frame.label}: ${JSON.stringify(r)}`);
    }
  });
});
test('the actual renderer catches injected text overflow and a floating decor part', opts, async () => {
  await withExample('lock', async (b, info) => {
    const t = info.shots.find(s => s.label.startsWith('mode ')).t, baseline = await capture(b, t);
    await b.ev(`window.__originalPaint=window.__paint;window.__paint=(...args)=>{const c=__originalPaint(...args),x=MX.ctx;x.save();x.globalAlpha=1;x.font='64px sans-serif';x.fillStyle='#fff';x.fillText('OVERFLOW-THIS-TEXT-RUNS-OUTSIDE-THE-FRAME',650,450);x.restore();return c;};true`);
    assert.ok(!compareFrame(await capture(b, t), baseline).ok, 'overflow must fail');
    await b.ev(`window.__paint=window.__originalPaint;const p=__testFigure.parts.find(p=>p.spec.decor);window.__originalPose=p.pose;p.pose=(s,p)=>{__originalPose(s,p);p.group.position.y+=35;};true`);
    assert.ok(!compareFrame(await capture(b, t), baseline).ok, 'floating decor must fail');
  });
});
