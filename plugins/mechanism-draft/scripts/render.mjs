#!/usr/bin/env node
// render.mjs - renders a kit figure to MP4 with sound. No dependencies: Node 22+ (global WebSocket), a Chromium browser
// (Edge or Chrome) and ffmpeg. Drives the browser over CDP, asks for one frame at a time (with sub-frame motion blur),
// asks for the synthesised audio and joins them with ffmpeg, normalising the loudness.
//
//   node scripts/render.mjs examples/backpressure/index.html --duration 28 --fps 30 --out out/backpressure.mp4
//   options: --aspect 4:5|9:16|1:1 (spec figures)  --from 12 --to 20 (clip)  --export stl|glb --e 1 (3D model, with --out file)
//            --length short|normal|extended  --theme night|paper  --blur 4 (sub-frames per frame, 1 = no blur)
//            --shutter 0.5 (fraction of the interval)  --crf 16  --still 12.5 (a single PNG)
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, renameSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { bitrateFor, installEncoder, videoArgs } from './lib/encoding.mjs';
import { withBrowser } from './lib/browser.mjs';

const args = process.argv.slice(2);
const page = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))) || '';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!page) { console.error('usage: node scripts/render.mjs <page.html> [--duration 28] [--fps 30] [--blur 4] [--out out/x.mp4] [--still t]'); process.exit(1); }

const DUR_ARG = opt('duration', null), FPS = Number(opt('fps', 30)), DRAFT = args.includes('--draft'), BLUR = Number(opt('blur', DRAFT ? 1 : 4)), SHUT = Number(opt('shutter', 0.5)), CRF = opt('crf', DRAFT ? '24' : '17'), PRESET = opt('preset', DRAFT ? 'veryfast' : 'medium');
const ENCODER = opt('encoder', 'jpeg');      // measured 2026-10-18 (docs/perf-quality.md): JPEG+x264 gives the smaller file and the higher SSIM; browser H.264 is 1.5-1.8x faster
const METHOD = opt('method', ''), BACKGROUND = opt('background', '');
if (METHOD && !['studio', 'workflow', 'paper'].includes(METHOD)) throw new Error('--method must be studio, workflow or paper');
if (BACKGROUND && !['graphite', 'blueprint', 'porcelain', 'ivory'].includes(BACKGROUND)) throw new Error('--background must be graphite, blueprint, porcelain or ivory');
if (opt('export', '') && METHOD && METHOD !== 'studio') throw new Error('Model exports use --method studio; Workflow and Paper are 2D engines');
if (!['jpeg', 'png', 'browser'].includes(ENCODER)) throw new Error('--encoder must be jpeg, png or browser');
if (!(FPS > 0 && Number.isFinite(FPS))) throw new Error('--fps must be positive and finite');
const OUT = path.resolve(opt('out', 'out/figure.mp4')), FFMPEG = process.env.FFMPEG || 'ffmpeg';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// two-pass loudnorm (measure, then apply linearly): in a single pass dynamic audio ends up about 4 LU below the target
const PRE = 'alimiter=limit=0.95:attack=2:release=40';      // safety limiter: the dry hits of the real recordings are peaky; no compressor, so the dynamics are not flattened
const loudAf = (file) => { const mm = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-af', PRE + ',loudnorm=I=-16:TP=-2.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }), j = /{[^}]*"input_i"[^}]*}/.exec(mm.stderr || ''); if (!j) return PRE + ',loudnorm=I=-16:TP=-2.5:LRA=11'; const d = JSON.parse(j[0]); return PRE + `,loudnorm=I=-16:TP=-2.5:LRA=11:measured_I=${d.input_i}:measured_LRA=${d.input_lra}:measured_TP=${d.input_tp}:measured_thresh=${d.input_thresh}:offset=${d.target_offset}:linear=true`; };

const png = (d) => Buffer.from(d.split(',')[1], 'base64');

await withBrowser(async ({ send, ev: evalJs, progress, stopWatchdog, onCleanup }) => {
  await send('Page.enable');
  const url = new URL(pathToFileURL(path.resolve(page)));
  for (const [key, value] of Object.entries({ render: '1', t: '0', fps: String(FPS), theme: opt('style', opt('theme', '')), length: opt('length', ''), aspect: opt('aspect', ''), method: METHOD, background: BACKGROUND, ss: opt('ss', ''), ssr: opt('ssr', ''), tonemap: opt('tonemap', ''), pathtrace: opt('pathtrace', '') })) if (value !== '') url.searchParams.set(key, value);
  await send('Page.navigate', { url: url.href });
  for (let i = 0; i < 100; i++) { await sleep(150); if (await evalJs('typeof window.__frame === "function"')) break; if (i === 99) throw new Error('the page did not expose __frame (use MX.run); page title: ' + await evalJs('document.title')); }      // kit/boot.js writes the load error (a missing module) into the title
  mkdirSync(path.dirname(OUT), { recursive: true });
  if (args.includes('--info')) { console.log(JSON.stringify(await evalJs('window.__specInfo ? window.__specInfo() : null'), null, 1)); return; }
  const ex = opt('export', null);
  if (ex && !await evalJs('typeof window.__exportSTL === "function"')) throw new Error('STL/GLB exports require Studio; this page uses a 2D engine');
  if (ex) { const b = await evalJs(ex === 'glb' ? `window.__exportGLB(${Number(opt('e', 0))})` : `window.__exportSTL(${Number(opt('e', 0))})`); const f = OUT.replace(/.mp4$/, '.' + ex); writeFileSync(f, Buffer.from(b, 'base64')); console.log('model:', f, (Buffer.from(b, 'base64').length / 1024).toFixed(0) + ' KB'); return; }
  const SPECDUR = await evalJs('window.__specInfo ? window.__specInfo().duration : null'), DUR = Number(DUR_ARG || SPECDUR || 28), FROM = Number(opt('from', 0)), TO = Number(opt('to', DUR));
  const rem = opt('remux', null);       // --remux out/x.mp4: regenerates ONLY the audio and lays it over the already rendered video (seconds, not minutes)
  if (rem) { const wav = path.join(path.dirname(OUT), '.audio-' + process.pid + '.wav'), tmp = rem.replace(/.mp4$/, '.remux.mp4'); writeFileSync(wav, Buffer.from(await evalJs('window.__audioWav()'), 'base64')); const rr = spawnSync(FFMPEG, ['-y', '-i', rem, '-i', wav, '-af', loudAf(wav), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-b:a', '160k', '-shortest', '-movflags', '+faststart', tmp], { encoding: 'utf8' }); if (rr.status !== 0) throw new Error('ffmpeg failed: ' + rr.stderr.slice(-400)); renameSync(tmp, rem); rmSync(wav, { force: true }); console.log('audio nuevo en', rem); return; }
  const still = opt('still', null);
  if (still != null) { const f = OUT.replace(/\.mp4$/, `-still-${still}.png`); writeFileSync(f, png(await evalJs(`window.__frame(${Number(still)}, ${BLUR}, ${SHUT})`))); console.log('still:', f); }
  else {
    if (!(Number.isFinite(FROM) && Number.isFinite(TO) && FROM >= 0 && TO > FROM && TO <= DUR)) throw new Error('invalid clip interval');
    const size = await evalJs('({ width: document.getElementById("c").width, height: document.getElementById("c").height, parts: window.SPEC?.parts?.length || 0 })');
    const studyBefore = await evalJs('typeof __studyDiagnostics === "function" ? __studyDiagnostics().resources || null : null');
    const bitrate = Number(opt('bitrate', bitrateFor({ ...size, fps: FPS, draft: DRAFT })));
    if (!(bitrate > 0 && Number.isFinite(bitrate))) throw new Error('--bitrate must be positive and finite');
    const browser = ENCODER === 'browser' && await evalJs(`(${installEncoder.toString()})(${JSON.stringify({ fps: FPS, bitrate, blur: BLUR, shutter: SHUT })})`);
    if (ENCODER === 'browser' && !browser) console.warn('VideoEncoder/H.264 unavailable; falling back to JPEG');
    console.log(`encoder: ${browser ? 'browser (software), bitrate ' + bitrate : ENCODER === 'png' ? 'png (RGB input)' : 'jpeg'}`);
    const vtmp = OUT.replace(/.mp4$/, '.video-' + process.pid + '.mp4');
    const input = ENCODER === 'png' ? 'png' : 'jpeg';
    const enc = spawn(FFMPEG, videoArgs({ browser, fps: FPS, crf: CRF, preset: PRESET, out: vtmp, input }), { stdio: ['pipe', 'ignore', 'inherit'] });
    let encError = null; enc.on('error', (e) => { encError = e; }); enc.stdin.on('error', (e) => { encError = e; });
    const encDone = new Promise((res) => enc.on('close', res));
    const write = async (buf) => {
      if (encError) throw encError;
      if (!enc.stdin.write(buf)) await new Promise((res, rej) => {
        const done = () => { enc.stdin.off('error', fail); res(); }, fail = (e) => { enc.stdin.off('drain', done); rej(e); };
        enc.stdin.once('drain', done); enc.stdin.once('error', fail);
      });
    };
    const detachEncoder = onCleanup(() => { enc.stdin.destroy(); enc.kill(); });
    const total = Math.round((TO - FROM) * FPS), t0 = Date.now(); progress();
    try {
      for (let i = 0; i < total; i++) {
        const t = (FROM + i / FPS).toFixed(5);
        if (browser) {
          await evalJs(`window.__video.step(${i}, ${t})`);
          if (i % 15 === 14) await write(Buffer.from(await evalJs('window.__video.drain()'), 'base64'));
        } else await write(png(await evalJs(`window.__frame(${t}, ${BLUR}, ${SHUT}, '${input === 'png' ? 'png' : 'jpg'}')`)));
        progress();
        if (i % 60 === 0) console.log(`frame ${i}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      }
      if (browser) {
        const count = await evalJs('window.__video.finish()');
        if (count !== total) throw new Error(`encoder returned ${count}/${total} frames`);
        await write(Buffer.from(await evalJs('window.__video.drain()'), 'base64'));
      }
      enc.stdin.end(); const code = await encDone;
      if (encError) throw encError;
      if (code !== 0) throw new Error('ffmpeg video encoder failed: ' + code);
    } catch (e) {
      enc.stdin.destroy(); enc.kill(); await encDone; rmSync(vtmp, { force: true }); throw e;
    }
    detachEncoder(); stopWatchdog();
    const studyAfter = await evalJs('typeof __studyDiagnostics === "function" ? __studyDiagnostics().resources || null : null');
    if (studyBefore) console.log('study resources: ' + JSON.stringify({ before: studyBefore, after: studyAfter }));
    console.log(`video: ${total} frames, ${((Date.now() - t0) / total).toFixed(2)} ms/frame`); console.log('audio...');
    const wav = path.join(path.dirname(OUT), '.audio-' + process.pid + '.wav'); writeFileSync(wav, Buffer.from(await evalJs('window.__audioWav()'), 'base64'));
    // loudnorm to -16 LUFS: it sounds even on a phone and on a desktop
    const r = spawnSync(FFMPEG, ['-y', '-i', vtmp, '-ss', String(FROM), '-t', String(TO - FROM), '-i', wav, '-af', loudAf(wav), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('ffmpeg failed: ' + r.stderr.slice(-500));
    rmSync(vtmp, { force: true }); rmSync(wav, { force: true });
    console.log('done:', OUT, `(film ${(TO - FROM).toFixed(1)} s, rendered in ${((Date.now() - t0) / 1000).toFixed(0)} s of wall time)`);
  }
}, { timeout: Number(opt('timeout', 30)) * 1000 });
