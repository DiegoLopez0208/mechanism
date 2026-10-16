#!/usr/bin/env node
// preflight.mjs - looks at the film BEFORE it is rendered, in geometry and text instead of pixels (lint-film.mjs does the pixels).
// It steps through the whole timeline in a headless browser, asks the page where the camera, every part and every drawn label are at that
// instant, and reports what is wrong:
//   CAMERA_INSIDE_PART   FAIL  the camera sits inside the box of a visible part (the frame goes white or shows the inside of the shell)
//   MAIN_PART_OFFSCREEN  WARN  the part a tour stop is about is mostly outside the frame
//   OBJECT_OFFSCREEN     WARN  the assembled or exploded object is mostly outside the frame
//   LABEL_OVERLAP        WARN  two visible texts overlap
//   LABEL_CLIPPED        WARN  a visible text runs past the edge of the frame
// A WARN can be a deliberate choice (a close-up, a part that flies out): it never stops anything. FAIL is for what is wrong in every case.
// Diagnostic only: the exit code is 0 unless you pass --strict.
//
//   node scripts/preflight.mjs <work>/<name>/index.html [--length short] [--step 0.25] [--skip camera,labels,frame] [--json] [--strict]
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2), flags = new Set(['json', 'strict']), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const page = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !flags.has(args[i - 1].slice(2))));
if (!page) { console.error('usage: node scripts/preflight.mjs <page.html> [--length short] [--step 0.25] [--skip camera,labels,frame] [--json] [--strict]'); process.exit(1); }
const skip = new Set((opt('skip', '') || '').split(',').filter(Boolean)), STEP = Number(opt('step', 0.25)), JSON_OUT = args.includes('--json'), STRICT = args.includes('--strict');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), PORT = 9550 + Math.floor(Math.random() * 40), profile = path.join(os.tmpdir(), 'mx-preflight-' + Date.now());
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

// every fillText on the frame canvas is recorded with its box on screen (the camera does not move them, so the transform is only a translate/scale)
const RECORDER = `(() => { const o = CanvasRenderingContext2D.prototype.fillText; window.__rec = null;
  CanvasRenderingContext2D.prototype.fillText = function (s, x, y, ...rest) {
    if (window.__rec && this.canvas === MX.ctx.canvas) { const m = this.getTransform(); if (!m.b && !m.c) {
      const w = this.measureText(String(s)).width * m.a, size = (parseFloat((/(\\d+(?:\\.\\d+)?)px/.exec(this.font) || [0, 20])[1])) * m.d, px = m.a * x + m.e, py = m.d * y + m.f, al = this.textAlign, bl = this.textBaseline;
      const x0 = al === 'right' || al === 'end' ? px - w : al === 'center' ? px - w / 2 : px, y0 = bl === 'top' || bl === 'hanging' ? py : bl === 'middle' ? py - size / 2 : bl === 'bottom' ? py - size : py - size * 0.8;
      window.__rec.push({ s: String(s), x0, y0, x1: x0 + w, y1: y0 + size, alpha: this.globalAlpha }); } }
    return o.call(this, s, x, y, ...rest); }; return true; })()`;

const found = new Map();   // key -> { sev, code, subject, detail, first, last, n }
const note = (sev, code, subject, t, detail) => { const k = sev + '|' + code + '|' + subject, f = found.get(k); if (f) { f.last = t; f.n++; } else found.set(k, { sev, code, subject, detail, first: t, last: t, n: 1 }); };
const area = (r) => Math.max(0, r[2] - r[0]) * Math.max(0, r[3] - r[1]), inter = (a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];

try {
  await send('Page.enable');
  await send('Page.navigate', { url: pathToFileURL(path.resolve(page)).href + '?render=1&t=0' + (opt('length', '') ? '&length=' + opt('length', '') : '') });
  for (let i = 0; i < 100; i++) { await sleep(150); if (await ev('typeof window.__frame === "function" && typeof window.__geom === "function"')) break; if (i === 99) throw new Error('the page did not expose __frame/__geom: does the spec pass the gate? run check-spec.mjs'); }
  const info = JSON.parse(await ev('JSON.stringify(window.__specInfo ? window.__specInfo() : null)'));
  if (!info) throw new Error('this page has no __specInfo() (declarative specs only)');
  if (info.errors && info.errors.length) { console.log('spec errors:\n  ' + info.errors.join('\n  ')); done(1); }
  await ev(RECORDER);
  const cv = JSON.parse(await ev('JSON.stringify([MX.ctx.canvas.width, MX.ctx.canvas.height])')), FW = cv[0], FH = cv[1], frame = [0, 0, FW, FH], ph = info.phases;
  let samples = 0, prevText = new Map();
  for (let t = 0; t < info.duration; t += STEP) {
    const r = JSON.parse(await ev(`(() => { window.__rec = []; window.__frame(${t}, 1, 0, 'jpg'); const g = window.__geom(${t}); const l = window.__rec; window.__rec = null; return JSON.stringify({ g, l }); })()`));
    samples++; const g = r.g, vis = g.parts.filter((p) => p.alpha > 0.3 && !p.behind);
    if (!skip.has('camera')) for (const p of g.parts) {
      if (p.alpha <= 0.5) continue; const c = g.cam, m = 1;
      if (c[0] > p.min[0] + m && c[0] < p.max[0] - m && c[1] > p.min[1] + m && c[1] < p.max[1] - m && c[2] > p.min[2] + m && c[2] < p.max[2] - m) note('FAIL', 'CAMERA_INSIDE_PART', p.id, t, 'the camera is inside the box of "' + p.id + '". Raise the distance of the shot, move its target (part.tourAt) or give the part tourDim.');
      else { const dx = Math.max(p.min[0] - c[0], 0, c[0] - p.max[0]), dy = Math.max(p.min[1] - c[1], 0, c[1] - p.max[1]), dz = Math.max(p.min[2] - c[2], 0, c[2] - p.max[2]), d = Math.hypot(dx, dy, dz);
        if (d < g.near) note('WARN', 'CAMERA_NEAR_CLIP', p.id, t, '"' + p.id + '" comes within ' + Math.round(d) + ' of the camera, inside its near plane (' + Math.round(g.near) + '): the part is cut away or the frame fills with its inside.'); }
    }
    if (!skip.has('frame') && t < ph.panels) {
      if (g.focus) { const p = g.parts.find((q) => q.id === g.focus); if (p && !p.behind && area(p.rect) > 1) { const f = area(inter(p.rect, frame)) / area(p.rect); if (f < 0.6) note('WARN', 'MAIN_PART_OFFSCREEN', g.focus, t, 'only ' + Math.round(f * 100) + '% of "' + g.focus + '" is in the frame. Aim the shot at it (part.tourAt) or widen it (part.tourDim).'); else if ((p.rect[0] < 0 && p.rect[2] > FW) || (p.rect[1] < 0 && p.rect[3] > FH)) note('WARN', 'MAIN_PART_NO_CONTEXT', g.focus, t, '"' + g.focus + '" spills past both sides of the frame: the viewer sees no edge of it and loses what object it belongs to. Widen the shot (part.tourDim) unless it is a deliberate macro.'); } }
      else if (t >= ph.assembled + 0.4 && t < ph.tour && vis.length) { const u = vis.reduce((a, p) => [Math.min(a[0], p.rect[0]), Math.min(a[1], p.rect[1]), Math.max(a[2], p.rect[2]), Math.max(a[3], p.rect[3])], [1e9, 1e9, -1e9, -1e9]), f = area(inter(u, frame)) / area(u); if (f < 0.85) note('WARN', 'OBJECT_OFFSCREEN', 'object', t, 'only ' + Math.round(f * 100) + '% of the object is in the frame. Lower director.zoom or the explode distances.'); }
    }
    if (!skip.has('labels')) {
      // a text that is sliding in or out (the evidence panels) is moving on purpose: only texts that stayed where they were since the last sample count
      const seen = new Map(r.l.map((q) => [q.s, q])), L = r.l.filter((q) => q.alpha > 0.25 && q.y1 - q.y0 > 6 && q.s.trim() && prevText.has(q.s) && Math.abs(prevText.get(q.s).x0 - q.x0) < 1.5 && Math.abs(prevText.get(q.s).y0 - q.y0) < 1.5); prevText = seen;
      for (let i = 0; i < L.length; i++) {
        const a = L[i], ra = [a.x0, a.y0, a.x1, a.y1];
        if (a.x0 < -2 || a.x1 > FW + 2 || a.y0 < -2 || a.y1 > FH + 2) note('WARN', 'LABEL_CLIPPED', a.s.slice(0, 40), t, 'the text "' + a.s.slice(0, 40) + '" runs past the edge of the frame. Shorten it or lower its size.');
        for (let j = i + 1; j < L.length; j++) { const b = L[j]; if (a.s === b.s) continue; const rb = [b.x0, b.y0, b.x1, b.y1], o = area(inter(ra, rb)), small = Math.min(area(ra), area(rb)); if (small > 0 && o / small > 0.25) note('WARN', 'LABEL_OVERLAP', [a.s.slice(0, 28), b.s.slice(0, 28)].sort().join(' / '), t, '"' + a.s.slice(0, 28) + '" and "' + b.s.slice(0, 28) + '" overlap (' + Math.round(o / small * 100) + '%). Move one or shorten the text.'); }
      }
    }
  }
  const rows = [...found.values()].sort((a, b) => (a.sev === b.sev ? a.first - b.first : a.sev === 'FAIL' ? -1 : 1)), fails = rows.filter((x) => x.sev === 'FAIL').length, warns = rows.length - fails;
  if (JSON_OUT) console.log(JSON.stringify({ page, length: opt('length', 'normal'), duration: info.duration, samples, step: STEP, fail: fails, warn: warns, findings: rows.map((x) => ({ severity: x.sev, code: x.code, subject: x.subject, from: +x.first.toFixed(2), to: +x.last.toFixed(2), samples: x.n, suggestion: x.detail })) }, null, 2));
  else {
    console.log('VISUAL PREFLIGHT  ' + path.basename(path.dirname(path.resolve(page))) + '  (' + opt('length', 'normal') + ' cut, ' + info.duration + ' s, ' + samples + ' samples every ' + STEP + ' s)');
    for (const x of rows) console.log('\n' + x.sev + '  ' + x.code + '  ' + x.subject + '\n  t = ' + x.first.toFixed(2) + (x.last > x.first ? ' .. ' + x.last.toFixed(2) : '') + ' s  (' + x.n + ' samples)\n  ' + x.detail);
    console.log('\n' + (fails ? 'FAILED: ' + fails + ' error(s), ' + warns + ' warning(s).' : warns ? 'PASS with ' + warns + ' warning(s): look at them, a close-up or a part that flies out can be deliberate.' : 'PASS: nothing found.'));
  }
  done(STRICT && fails ? 1 : 0);
} catch (e) { console.error(e.message); done(1); }
