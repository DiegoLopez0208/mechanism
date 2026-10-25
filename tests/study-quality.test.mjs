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
  // three films, 34 seeks and 11 more paints each through software WebGL: several minutes on a small machine, so it gets the same
  // 15 min as the other browser tests
  skip: !findBrowser() && !process.env.CI ? 'no Chromium browser found' : false, timeout: 900000,
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
    // one browser call per painted frame: the watchdog times each call, and 64 software-WebGL paints in a single call outlasted any
    // sensible limit on the CI runner (main was red on this test since it was added)
    const failures = [];
    for (const t of [4, ...Array.from({ length: 32 }, (_, i) => i), 4]) {
      const [min, max] = await browser.ev(`(() => {
        __paint(${t},1,.5);const data=document.getElementById('c').getContext('2d').getImageData(44,151,960,617).data;
        let min=255,max=0;for(let i=0;i<data.length;i+=40){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}
        return [min,max];
      })()`);
      if (max - min < 10) failures.push({ t, min, max });
    }
    const { studio, size } = await browser.ev(`(() => { const native=document.getElementById('native-canvas');
      return { studio: __studyDiagnostics().renderer==='original-studio-compositor', size: [native.width, native.height] }; })()`);
    if (size[0] !== (studio ? 1600 : 1080) || size[1] !== (studio ? 900 : 1350)) failures.push({ nativeSize: size });
    const key = JSON.stringify(studio ? 'native' : 'study'), textures = `__studyDiagnostics().resources?.[${key}]?.textures`;
    const before = await browser.ev(`(() => { __paint(4,1,.5); return ${textures} ?? null; })()`);
    if (before != null) {
      // each repaint reads one pixel back, so its GPU work finishes inside its own call instead of piling up for the next one;
      // a texture leak shows from the first repeat, ten are plenty
      for (let i = 0; i < 10; i++) await browser.ev(`(__paint(4,1,.5), document.getElementById('c').getContext('2d').getImageData(0,0,1,1), 0)`);
      const after = await browser.ev(textures);
      if (after !== before) failures.push({ textureGrowth: { before, after } });
    }
    assert.deepEqual(failures, [], id + ': ' + JSON.stringify(failures));
  }, { timeout: 90000, retries: 0 });
});
