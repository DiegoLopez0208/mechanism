// probe.mjs - prueba un modo interactivo en Edge/Chrome sin ventana: abre la pagina, ejecuta acciones de raton por CDP y guarda capturas.
//   node scripts/probe.mjs examples/rpi4/index.html?explore out/probe
import { spawn } from 'node:child_process'; import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'; import { pathToFileURL } from 'node:url'; import path from 'node:path'; import os from 'node:os';
const [page, outDir = 'out/probe'] = process.argv.slice(2); const PORT = 9350, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const B = [process.env.BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].filter(Boolean).find((b) => existsSync(b));
const profile = path.join(os.tmpdir(), 'mx-probe-' + Date.now()); const proc = spawn(B, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--force_high_performance_gpu', 'about:blank'], { stdio: 'ignore' });
let tab; for (let i = 0; i < 80 && !tab; i++) { await sleep(250); try { tab = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} }
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const pend = new Map(), errs = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d.error); pend.delete(d.id); } else if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('console.error: ' + d.params.args.map((a) => a.value || a.description).join(' ')); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
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
console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
try { ws.close(); } catch {} proc.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch {}
