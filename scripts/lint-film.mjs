#!/usr/bin/env node
// lint-film.mjs - looks at the film BEFORE it is rendered: one draft frame per phase and per tour stop, and it says which shots are empty or too small.
// A shot is "ink" when pixels in the middle of the frame (between the title and the card at the bottom) differ from the background; a see-through part
// or a camera aimed at nothing gives almost none. Typical findings: a tour stop on a glass plate, an exploded view that left the object off frame.
//
//   node scripts/lint-film.mjs <work>/<name>/index.html [--length short] [--png-dir <folder>]
// exit code 1 if a shot is empty (so an agent fixes the spec or the tour before spending minutes on the render).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2), page = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!page) { console.error('usage: node scripts/lint-film.mjs <page.html> [--length short] [--png-dir <folder>]'); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), PORT = 9500 + Math.floor(Math.random() * 40), profile = path.join(os.tmpdir(), 'mx-lint-' + Date.now());
const B = [process.env.BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].filter(Boolean).find((b) => existsSync(b));
if (!B) { console.error('no Chromium browser found (set BROWSER=<path>)'); process.exit(1); }
const proc = spawn(B, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--force_high_performance_gpu', '--no-first-run', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
let tab; for (let i = 0; i < 80 && !tab; i++) { await sleep(250); try { tab = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* starting */ } }
if (!tab) { proc.kill(); console.error('the browser did not open its debugging port'); process.exit(1); }
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d.error); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text); return r.result && r.result.value; };
const done = (code) => { try { ws.close(); } catch { /* closed */ } proc.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch { /* busy */ } process.exit(code); };
try {
  await send('Page.enable');
  await send('Page.navigate', { url: pathToFileURL(path.resolve(page)).href + '?render=1&t=0' + (opt('length', '') ? '&length=' + opt('length', '') : '') + (opt('query', '') ? '&' + opt('query', '') : '') });
  for (let i = 0; i < 100; i++) { await sleep(150); if (await ev('typeof window.__frame === "function"')) break; if (i === 99) throw new Error('the page did not expose __frame: does the spec pass the gate? run check-spec.mjs'); }
  const info = JSON.parse(await ev('JSON.stringify(window.__specInfo ? window.__specInfo() : null)'));
  if (!info || !info.shots) throw new Error('this page has no __specInfo().shots (declarative specs only)');
  if (info.errors && info.errors.length) { console.log('spec errors:\n  ' + info.errors.join('\n  ')); done(1); }
  const dir = opt('png-dir', null); if (dir) mkdirSync(dir, { recursive: true });
  // ink: pixels in the middle band that differ from the background (the four corners of that band)
  const probe = `(async (t) => { const d = window.__frame(t, 1, 0.5, 'png'), img = new Image(); img.src = d; await img.decode(); const w = img.width, h = img.height, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const x0 = Math.round(w * 0.08), x1 = Math.round(w * 0.92), y0 = Math.round(h * 0.20), y1 = Math.round(h * 0.68), bw = x1 - x0, bh = y1 - y0, px = x.getImageData(x0, y0, bw, bh).data, at = (i, j) => { const o = (j * bw + i) * 4; return [px[o], px[o + 1], px[o + 2]]; };
    const cs = [at(6, 6), at(bw - 7, 6), at(6, bh - 7), at(bw - 7, bh - 7)], bg = [0, 1, 2].map((k) => cs.reduce((s, q) => s + q[k], 0) / 4); let ink = 0, core = 0, cn = 0, minX = bw, maxX = 0, minY = bh, maxY = 0;
    for (let j = 0; j < bh; j += 2) for (let i = 0; i < bw; i += 2) { const q = at(i, j), inCore = i > bw * 0.32 && i < bw * 0.68 && j > bh * 0.3 && j < bh * 0.7; if (inCore) cn++; if (Math.abs(q[0] - bg[0]) + Math.abs(q[1] - bg[1]) + Math.abs(q[2] - bg[2]) > 90) { if (inCore) core++; ink++; if (i < minX) minX = i; if (i > maxX) maxX = i; if (j < minY) minY = j; if (j > maxY) maxY = j; } }
    return JSON.stringify({ core: core / cn, ink: ink / ((bw / 2) * (bh / 2)), w: ink ? (maxX - minX) / bw : 0, h: ink ? (maxY - minY) / bh : 0, data: d }); })`;
  const CORE_MIN = Number(opt('core-min', 0.08)), shotDir = dir || path.join(path.dirname(path.resolve(page)), 'lint'), looks = [], rows = []; let bad = 0, warn = 0;
  for (const s of info.shots) {
    const r = JSON.parse(await ev(probe + '(' + s.t + ')'));
    if (dir && r.data) writeFileSync(path.join(dir, s.label.replace(/[^a-z0-9]+/gi, '-') + '.png'), Buffer.from(r.data.split(',')[1], 'base64'));
    const isTour = /^tour /.test(s.label), empty = r.ink < 0.012, look = !empty && isTour && (r.ink < 0.06 || r.core < CORE_MIN), tiny = !empty && !look && (r.ink < 0.03) && /^(assembled|exploded|reassembled)$/.test(s.label), flag = empty ? 'EMPTY' : look ? 'LOOK' : tiny ? 'SMALL' : 'ok';
    if (empty) bad++; else if (look) looks.push(s.label); else if (tiny) warn++;
    if (r.data && (empty || look)) { mkdirSync(shotDir, { recursive: true }); writeFileSync(path.join(shotDir, s.label.replace(/[^a-z0-9]+/gi, '-') + '.png'), Buffer.from(r.data.split(',')[1], 'base64')); }
    rows.push(s.label.padEnd(26) + ('t=' + s.t.toFixed(1)).padEnd(9) + ('ink ' + (r.ink * 100).toFixed(1) + '%').padEnd(11) + ('core ' + (r.core * 100).toFixed(0) + '%').padEnd(10) + ('spans ' + Math.round(r.w * 100) + 'x' + Math.round(r.h * 100) + '%').padEnd(14) + flag);
  }
  console.log(info.shots.length + ' shots checked (' + (opt('length', 'normal')) + ' cut, ' + info.duration + ' s)\n' + rows.join('\n'));
  if (looks.length) console.log('\nLOOK: ' + looks.length + ' tour stop(s) with little in the middle (a hollow part such as a ring is fine; a see-through plate, an off-frame or orbiting part is not). Open the frame and judge it: ' + looks.map((l) => path.join(shotDir, l.replace(/[^a-z0-9]+/gi, '-') + '.png')).join('  '));
  console.log(bad ? '\n' + bad + ' EMPTY shot(s): a see-through part, a camera aimed at nothing or an object off frame. Remove the tour stop, give the part a visible material or tourDim, or fix the view; then run again.' : warn ? '\n' + warn + ' shot(s) where the object looks small: raise director.zoom.' : '\nNo empty shots.');
  done(bad ? 1 : 0);
} catch (e) { console.error(e.message); done(1); }
