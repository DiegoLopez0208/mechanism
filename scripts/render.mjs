#!/usr/bin/env node
// render.mjs - renderiza una figura del kit a MP4 con sonido. Sin dependencias: Node 22+ (WebSocket global), un navegador
// Chromium (Edge o Chrome) y ffmpeg. Maneja el navegador por CDP, pide un frame por vez (con motion blur por subframes),
// pide el audio sintetizado y los une con ffmpeg normalizando el volumen.
//
//   node scripts/render.mjs examples/backpressure/index.html --duration 28 --fps 30 --out out/backpressure.mp4
//   opciones: --aspect 4:5|9:16|1:1 (figuras de spec)  --from 12 --to 20 (clip)  --export stl|glb --e 1 (modelo 3D, con --out archivo)  --length short|normal|extended  --theme night|paper  --blur 4 (subframes por frame, 1 = sin blur)  --shutter 0.5 (fraccion del intervalo)  --crf 16  --still 12.5 (solo un PNG)
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, renameSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const page = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))) || '';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!page) { console.error('uso: node scripts/render.mjs <pagina.html> [--duration 28] [--fps 30] [--blur 4] [--out out/x.mp4] [--still t]'); process.exit(1); }

const DUR_ARG = opt('duration', null), FPS = Number(opt('fps', 30)), DRAFT = args.includes('--draft'), BLUR = Number(opt('blur', DRAFT ? 1 : 4)), SHUT = Number(opt('shutter', 0.5)), CRF = opt('crf', DRAFT ? '24' : '17'), PRESET = opt('preset', DRAFT ? 'veryfast' : 'medium');
const OUT = path.resolve(opt('out', 'out/figure.mp4')), FFMPEG = process.env.FFMPEG || 'ffmpeg', PORT = Number(process.env.CDP_PORT || 9344);
const BROWSERS = [process.env.BROWSER, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const BROWSER = BROWSERS.find((b) => existsSync(b));
if (!BROWSER) { console.error('no encontre un navegador Chromium; define BROWSER=<ruta>'); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// loudnorm de dos pasadas (medir, luego aplicar lineal): en una sola pasada el audio dinamico queda unos 4 LU por debajo del objetivo
const PRE = 'alimiter=limit=0.95:attack=2:release=40';      // limitador de seguridad: los golpes secos de las grabaciones reales son picudos; sin compresor para no aplastar la dinamica
const loudAf = (file) => { const mm = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-af', PRE + ',loudnorm=I=-16:TP=-2.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }), j = /{[^}]*"input_i"[^}]*}/.exec(mm.stderr || ''); if (!j) return PRE + ',loudnorm=I=-16:TP=-2.5:LRA=11'; const d = JSON.parse(j[0]); return PRE + `,loudnorm=I=-16:TP=-2.5:LRA=11:measured_I=${d.input_i}:measured_LRA=${d.input_lra}:measured_TP=${d.input_tp}:measured_thresh=${d.input_thresh}:offset=${d.target_offset}:linear=true`; };

const profile = path.join(os.tmpdir(), 'mx-browser-' + Date.now());
const proc = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--force_high_performance_gpu', '--no-first-run', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
let tab = null;
for (let i = 0; i < 80 && !tab; i++) { await sleep(250); try { tab = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* arrancando */ } }
if (!tab) { proc.kill(); throw new Error('el navegador no abrio el puerto CDP'); }
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { const { res, rej } = pend.get(d.id); pend.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const cleanup = () => { try { ws.close(); } catch {} proc.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch {} };
const png = (d) => Buffer.from(d.split(',')[1], 'base64');

try {
  await send('Page.enable');
  await send('Page.navigate', { url: pathToFileURL(path.resolve(page)).href + '?render=1&t=0' + (opt('style', opt('theme', '')) ? '&theme=' + opt('style', opt('theme', '')) : '') + (opt('length', '') ? '&length=' + opt('length', '') : '') + (opt('aspect', '') ? '&aspect=' + opt('aspect', '') : '') });
  for (let i = 0; i < 100; i++) { await sleep(150); if (await evalJs('typeof window.__frame === "function"')) break; if (i === 99) throw new Error('la pagina no expuso __frame (usa MX.run)'); }
  mkdirSync(path.dirname(OUT), { recursive: true });
  if (args.includes('--info')) { console.log(JSON.stringify(await evalJs('window.__specInfo ? window.__specInfo() : null'), null, 1)); cleanup(); process.exit(0); }
  const ex = opt('export', null);
  if (ex) { const b = await evalJs(ex === 'glb' ? `window.__exportGLB(${Number(opt('e', 0))})` : `window.__exportSTL(${Number(opt('e', 0))})`); const f = OUT.replace(/.mp4$/, '.' + ex); writeFileSync(f, Buffer.from(b, 'base64')); console.log('modelo:', f, (Buffer.from(b, 'base64').length / 1024).toFixed(0) + ' KB'); cleanup(); process.exit(0); }
  const SPECDUR = await evalJs('window.__specInfo ? window.__specInfo().duration : null'), DUR = Number(DUR_ARG || SPECDUR || 28), FROM = Number(opt('from', 0)), TO = Number(opt('to', DUR));
  const rem = opt('remux', null);       // --remux out/x.mp4: regenera SOLO el audio y lo pega sobre el video ya renderizado (segundos, no minutos)
  if (rem) { const wav = path.join(path.dirname(OUT), '.audio-' + process.pid + '.wav'), tmp = rem.replace(/.mp4$/, '.remux.mp4'); writeFileSync(wav, Buffer.from(await evalJs('window.__audioWav()'), 'base64')); const rr = spawnSync(FFMPEG, ['-y', '-i', rem, '-i', wav, '-af', loudAf(wav), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', tmp], { encoding: 'utf8' }); if (rr.status !== 0) throw new Error('ffmpeg fallo: ' + rr.stderr.slice(-400)); renameSync(tmp, rem); rmSync(wav, { force: true }); console.log('audio nuevo en', rem); cleanup(); process.exit(0); }
  const still = opt('still', null);
  if (still != null) { const f = OUT.replace(/\.mp4$/, `-still-${still}.png`); writeFileSync(f, png(await evalJs(`window.__frame(${Number(still)}, ${BLUR}, ${SHUT})`))); console.log('still:', f); }
  else {
    // el video se codifica MIENTRAS se renderiza (frames JPEG al 97 % por un pipe a ffmpeg); al final solo se pega el audio
    const vtmp = OUT.replace(/.mp4$/, '.video-' + process.pid + '.mp4');
    const enc = spawn(FFMPEG, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-crf', CRF, '-preset', PRESET, '-pix_fmt', 'yuv420p', vtmp], { stdio: ['pipe', 'ignore', 'inherit'] }); let encDone = new Promise((res) => enc.on('close', res));
    const total = Math.round((TO - FROM) * FPS), t0 = Date.now();
    for (let i = 0; i < total; i++) {
      const buf = png(await evalJs(`window.__frame(${(FROM + i / FPS).toFixed(5)}, ${BLUR}, ${SHUT}, 'jpg')`)); if (!enc.stdin.write(buf)) await new Promise((res) => enc.stdin.once('drain', res));
      if (i % 60 === 0) console.log(`frame ${i}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    enc.stdin.end(); await encDone; console.log('audio...');
    const wav = path.join(path.dirname(OUT), '.audio-' + process.pid + '.wav'); writeFileSync(wav, Buffer.from(await evalJs('window.__audioWav()'), 'base64'));
    // loudnorm a -16 LUFS: suena parejo en el telefono y en el escritorio
    const r = spawnSync(FFMPEG, ['-y', '-i', vtmp, '-ss', String(FROM), '-t', String(TO - FROM), '-i', wav, '-af', loudAf(wav), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('ffmpeg fallo: ' + r.stderr.slice(-500));
    rmSync(vtmp, { force: true }); rmSync(wav, { force: true });
    console.log('listo:', OUT, `(film ${(TO - FROM).toFixed(1)} s, rendered in ${((Date.now() - t0) / 1000).toFixed(0)} s of wall time)`);
  }
} finally { cleanup(); }
