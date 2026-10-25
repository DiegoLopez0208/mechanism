// probe.mjs - tries an interactive mode in Edge/Chrome with no window: opens the page, runs mouse actions over CDP and saves screenshots.
//   node scripts/probe.mjs examples/rpi4/index.html?explore out/probe
import { withBrowser } from './lib/browser.mjs'; import { mkdirSync, writeFileSync } from 'node:fs'; import { pathToFileURL } from 'node:url'; import path from 'node:path';
const [page, outDir = 'out/probe'] = process.argv.slice(2); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errs = [];
await withBrowser(async ({ send }) => {
mkdirSync(outDir, { recursive: true });
await send('Runtime.enable'); await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1350, deviceScaleFactor: 1, mobile: false });
const [p, q] = page.split('?'); await send('Page.navigate', { url: pathToFileURL(path.resolve(p)).href + (q ? '?' + q : '') }); await sleep(3500);
const shot = async (n) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path.join(outDir, n + '.png'), Buffer.from(r.data, 'base64')); console.log('shot', n); };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', Object.assign({ type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'mouse' }, extra));
const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await sleep(500); };
const drag = async (x0, y0, x1, y1) => { await mouse('mouseMoved', x0, y0, { buttons: 0 }); await mouse('mousePressed', x0, y0); for (let i = 1; i <= 8; i++) await mouse('mouseMoved', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await mouse('mouseReleased', x1, y1); await sleep(700); };
await shot('0-inicial');
await drag(560, 620, 400, 560); await shot('1-orbita');
await drag(230, 1152, 520, 1152); await sleep(1200); await shot('2-explosion');
await click(670, 1152); await sleep(1500); await shot('3-top');
await click(660, 1218); await click(540, 640); await click(700, 760); await sleep(400); await shot('4-medir');
console.log('errors:', errs.length ? errs.slice(0, 5) : 'none');
}, { onEvent(d) {
  if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('console.error: ' + d.params.args.map((a) => a.value || a.description).join(' '));
} });
