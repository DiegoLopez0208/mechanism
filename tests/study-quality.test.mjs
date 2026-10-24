import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { withBrowser, findBrowser } from '../scripts/lib/browser.mjs';
import { videoArgs, pngConversion } from '../scripts/lib/encoding.mjs';

test('PNG export uses the PNG decoder and RGB conversion, not the JPEG BT.601 path', () => {
  const args = videoArgs({ browser: false, fps: 60, crf: 17, preset: 'medium', out: 'test.mp4', input: 'png' });
  assert.equal(args[args.indexOf('-c:v') + 1], 'png');
  assert.equal(args[args.indexOf('-vf') + 1], pngConversion);
  assert.ok(!pngConversion.includes('in_color_matrix=bt601'));
  assert.throws(() => videoArgs({ input: 'invalid' }), /input must be/);
});

test('the shutter follows the requested output fps rather than the figure default', () => {
  const times = [];
  const context = { setTransform() {}, clearRect() {}, drawImage() {} };
  const canvas = () => ({ width: 100, height: 100, getContext: () => context });
  const ctx = vm.createContext({ console, URLSearchParams,
    location: { search: '?render=1&fps=60' },
    document: { getElementById: canvas, createElement: canvas },
    MX: { clamp: (n, a, b) => Math.min(b, Math.max(a, n)), lerp: (a, b, t) => a + (b - a) * t },
  }); ctx.window = ctx;
  vm.runInContext(fs.readFileSync(new URL('../kit/core.js', import.meta.url), 'utf8'), ctx);
  ctx.MX.run({ w: 100, h: 100, fps: 30, duration: 5, draw: (_, t) => times.push(t) });
  times.length = 0; ctx.__paint(1, 3, 1);
  assert.equal(ctx.__frameInfo.fps, 60);
  assert.ok(Math.abs(times[2] - times[0] - 1 / 60) < 1e-12);
  ctx.location.search = '?render=1&fps=0';
  assert.throws(() => ctx.MX.run({ w: 100, h: 100, draw() {} }), /fps must be/);
});

test('native study views stay populated across cuts and out-of-order seeks; the native canvas is preserved', {
  skip: !findBrowser() && !process.env.CI ? 'no Chromium browser found' : false, timeout: 180000,
}, async () => {
  for (const id of ['lock-assembly', 'react-reconcile', 'rpi4-drawing']) await withBrowser(async browser => {
    await browser.send('Page.enable');
    await browser.send('Page.navigate', { url: new URL('../films/' + id + '/index.html', import.meta.url).href + '?render=1' });
    let ready = false;
    for (let i = 0; i < 200; i++) {
      if (await browser.ev('typeof __studyDiagnostics === "function"')) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, id + ' did not initialize');
    const failures = await browser.ev(`(() => {
      const failures=[],cv=document.getElementById('c'),context=cv.getContext('2d');
      for(const t of [4,...Array.from({length:32},(_,i)=>i),4]){
        __paint(t,1,.5);const data=context.getImageData(44,151,960,617).data;
        let min=255,max=0;for(let i=0;i<data.length;i+=40){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}
        if(max-min<10)failures.push({t,min,max});
      }
      const native=document.getElementById('native-canvas');
      const studio=__studyDiagnostics().renderer==='original-studio-compositor';
      if(native.width!==(studio?1600:1080)||native.height!==(studio?900:1350))failures.push({nativeSize:[native.width,native.height]});
      __paint(4,1,.5);const resourceKey=studio?'native':'study';const before=__studyDiagnostics().resources?.[resourceKey]?.textures;
      if(before!=null){for(let i=0;i<30;i++)__paint(4,1,.5);const after=__studyDiagnostics().resources[resourceKey].textures;
        if(after!==before)failures.push({textureGrowth:{before,after}});}
      return failures;
    })()`);
    assert.deepEqual(failures, [], id + ': ' + JSON.stringify(failures));
  }, { timeout: 90000, retries: 0 });
});
