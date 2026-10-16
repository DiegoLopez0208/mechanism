#!/usr/bin/env node
// stranger.mjs - the stranger test, step 1: a still of each object with NO title, labels or panels (only the 3D model, parts' own printed decals stay),
// the way someone who knows nothing would see it. Step 2 is asking a model with no context "what object is this?" (see SKILL.md) and recording the answer in
// the spec's recognize.blind. Output: out/stranger/<name>-assembled.png.
//
//   node scripts/stranger.mjs rubik enigma          (names under examples/)    node scripts/stranger.mjs --all
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// A target is an example name (examples/<name>, output in out/stranger/<name>-assembled.png) or the path of any page (<work>/<name>/index.html).
// For a page the still goes to a temporary folder with a neutral name (.../mx-stranger-<random>/still.png), so neither the file name nor its path tells the judge what the object is.
const outArg = args.includes('--out') ? args[args.indexOf('--out') + 1] : null, hex = () => Math.random().toString(16).slice(2, 10);
const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out'), picked = args.includes('--all') ? readdirSync(path.join(root, 'examples')).filter((n) => existsSync(path.join(root, 'examples', n, 'spec.js'))) : pos;
const targets = picked.map((a) => /\.html?$/i.test(a)
  ? { name: path.basename(path.dirname(path.resolve(a))), page: path.resolve(a), dir: outArg ? path.resolve(outArg) : path.join(os.tmpdir(), 'mx-stranger-' + hex()), file: 'still', neutral: true }
  : { name: a, page: path.join(root, 'examples', a, 'index.html'), dir: outArg ? path.resolve(outArg) : path.join(root, 'out', 'stranger'), file: a + '-' + (process.env.STRANGER_TAG || 'assembled'), neutral: false });
if (!targets.length) { console.error('usage: node scripts/stranger.mjs <example>... | <work>/<name>/index.html ... | --all   [--out <folder>] [--neutral]'); process.exit(1); }
if (args.includes('--neutral')) targets.forEach((t) => { if (!t.neutral) { t.neutral = true; t.dir = outArg ? path.resolve(outArg) : path.join(os.tmpdir(), 'mx-stranger-' + hex()); t.file = 'still'; } });
const B = [process.env.BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].filter(Boolean).find((b) => existsSync(b));
const PORT = 9360 + Math.floor(Math.random() * 30), profile = path.join(os.tmpdir(), 'mx-stranger-' + Date.now());
const proc = spawn(B, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--force_high_performance_gpu', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
let tab; for (let i = 0; i < 80 && !tab; i++) { await sleep(250); try { tab = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} }
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d.error); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1350, deviceScaleFactor: 1, mobile: false });
const shot = async (t) => { const r = await send('Page.captureScreenshot', { format: 'png' }); mkdirSync(t.dir, { recursive: true }); const f = path.join(t.dir, t.file + '.png'); writeFileSync(f, Buffer.from(r.data, 'base64')); console.log('still', f, t.neutral ? '   (' + t.name + ': give the judge only this path, not the name)' : ''); };
for (const t of targets) {
  await send('Page.navigate', { url: pathToFileURL(t.page).href + '?' + (process.env.STRANGER_QUERY || 'explore&bare') }); await sleep(Number(process.env.STRANGER_WAIT || 4500));
  await shot(t);
}
try { ws.close(); } catch {} proc.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch {}
