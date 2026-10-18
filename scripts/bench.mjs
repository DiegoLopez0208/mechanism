#!/usr/bin/env node
// bench.mjs - reproducible render benchmark. For each case and setting it renders the real film with render.mjs,
// measures wall time, size and the stream (ffprobe), then compares sampled lossless frames with the decoded film
// (validate-render.mjs --video-dir). One pass per cell: a measurement, not a statistical benchmark.
//
//   node scripts/bench.mjs --out <work-dir> [--cases workflow:react:graphite,paper:lock:ivory] [--encoders browser,jpeg]
//        [--bitrates auto,6000000] [--fps 30] [--ss 1] [--length short] [--aspect 9:16]
//
// Videos and frames stay in <work-dir> (outside the repository); the summary is <work-dir>/bench.json and a table on stdout.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const OUT = opt('out', null); if (!OUT) { console.error('usage: node scripts/bench.mjs --out <work-dir> [--cases method:example:background,...]'); process.exit(1); }
const list = (k, d) => String(opt(k, d)).split(',').map((s) => s.trim()).filter(Boolean);
const cases = list('cases', 'workflow:react:graphite,paper:lock:ivory').map((s) => { const [method, example, background = ''] = s.split(':'); return { method, example, background }; });
const encoders = list('encoders', 'browser'), bitrates = list('bitrates', 'auto'), fpsList = list('fps', '30'), ssList = list('ss', '1');
const LENGTH = opt('length', 'short'), ASPECT = opt('aspect', '9:16'), root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(OUT, { recursive: true });

const probe = (file) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames,codec_name,pix_fmt,color_range,color_space,bit_rate:format=duration', '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) return { error: r.stderr.trim() };
  const j = JSON.parse(r.stdout), s = j.streams[0] || {}, [n, d] = String(s.r_frame_rate || '0/1').split('/').map(Number);
  return { width: s.width, height: s.height, fps: d ? n / d : null, frames: Number(s.nb_frames), codec: s.codec_name, pix_fmt: s.pix_fmt, range: s.color_range, matrix: s.color_space, videoBitrate: Number(s.bit_rate), duration: Number(j.format?.duration) };
};
const rows = [];
for (const c of cases) for (const encoder of encoders) for (const bitrate of bitrates) for (const fps of fpsList) for (const ss of ssList) {
  if (encoder === 'jpeg' && bitrate !== 'auto') continue;      // the JPEG path is x264 CRF: a bitrate does not apply
  const id = [c.method, c.example, c.background, encoder, bitrate, fps + 'fps', 'ss' + ss].filter(Boolean).join('-'), dir = path.join(OUT, id); mkdirSync(dir, { recursive: true });
  const film = path.join(dir, c.example + '.mp4');
  const renderArgs = ['scripts/render.mjs', `examples/${c.example}/index.html`, '--method', c.method, '--length', LENGTH, '--aspect', ASPECT, '--fps', fps, '--ss', ss, '--encoder', encoder, '--out', film];
  if (c.background) renderArgs.push('--background', c.background);
  if (bitrate !== 'auto') renderArgs.push('--bitrate', bitrate);
  const t0 = Date.now(), r = spawnSync(process.execPath, renderArgs, { cwd: root, encoding: 'utf8' }), wall = (Date.now() - t0) / 1000;
  const log = (r.stdout || '') + (r.stderr || ''), msFrame = Number((/(\d+(?:\.\d+)?) ms\/frame/.exec(log) || [])[1]) || null, used = (/encoder: (.*)/.exec(log) || [])[1] || null;
  const row = { id, ...c, encoder, requestedBitrate: bitrate, fps: Number(fps), ss: Number(ss), ok: r.status === 0, wallSeconds: wall, msPerFrame: msFrame, encoderUsed: used };
  if (r.status === 0) {
    row.bytes = statSync(film).size; row.stream = probe(film);
    // validate-render compares at 30 fps sample times; at other rates the comparison would be misaligned, so it is skipped
    if (Number(fps) === 30) {
      const v = spawnSync(process.execPath, ['scripts/validate-render.mjs', c.example, '--out', path.join(dir, 'validate'), '--video-dir', dir, '--method', c.method, '--length', LENGTH, '--aspect', ASPECT, ...(c.background ? ['--background', c.background] : [])], { cwd: root, encoding: 'utf8' });
      try { const rep = JSON.parse(readFileSync(path.join(dir, 'validate', c.example, 'report.json'), 'utf8')); row.meanSSIM = rep.meanSSIM; row.minSSIM = Math.min(...rep.samples.map((s) => s.ssim)); row.clipColor = rep.clipColor; }
      catch { row.validateError = ((v.stderr || '') + (v.stdout || '')).trim().split('\n').slice(-3).join(' | '); }
    }
  } else row.error = log.trim().split('\n').slice(-3).join(' | ');
  rows.push(row); writeFileSync(path.join(OUT, 'bench.json'), JSON.stringify({ date: new Date().toISOString(), node: process.version, length: LENGTH, aspect: ASPECT, rows }, null, 2));
  console.log([row.id, row.ok ? 'ok' : 'FAIL', row.wallSeconds.toFixed(1) + ' s', (row.msPerFrame ?? '?') + ' ms/frame', row.bytes ? (row.bytes / 1048576).toFixed(2) + ' MiB' : '', row.meanSSIM ? 'SSIM ' + row.meanSSIM.toFixed(5) + ' min ' + row.minSSIM.toFixed(5) : row.validateError || ''].join('  '));
}
if (rows.some((r) => !r.ok)) process.exitCode = 1;
