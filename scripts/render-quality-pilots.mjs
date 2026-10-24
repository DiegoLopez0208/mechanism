// Three audited pilots only. This command cannot launch the full collection.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { films } from '../films/catalog.mjs';
import { filmInputs, sha256 } from './lib/film-fingerprint.mjs';
import { comparePixels } from './lib/ssim.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), at = args.indexOf('--audit-folder');
if (at < 0 || !args[at + 1]) throw new Error('--audit-folder <completed audit folder> is required');
const folder = path.resolve(args[at + 1]), out = path.join(folder, 'pilots');
const audit = JSON.parse(fs.readFileSync(path.join(folder, 'native-audit.json'), 'utf8'));
if (audit.results?.length !== films.length || audit.results.some(result => result.status !== 'PASS')) throw new Error('The native quality audit is incomplete or failed');
fs.mkdirSync(out, { recursive: true });
const ffmpeg = process.env.FFMPEG || 'ffmpeg', ffprobe = process.env.FFPROBE || 'ffprobe';
const run = (exe, argv, binary = false) => {
  const result = spawnSync(exe, argv, { cwd: root, windowsHide: true, encoding: binary ? undefined : 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(exe + ' exit ' + result.status + ': ' + result.stderr);
  return result.stdout;
};
const readRgb = (file, time = null) => run(ffmpeg, ['-v', 'error', ...(time == null ? [] : ['-ss', String(time)]),
  '-i', file, '-vf', 'scale=flags=accurate_rnd+full_chroma_int,format=rgb24', '-frames:v', '1', '-f', 'rawvideo', '-'], true);
const results = [];
for (const id of ['enigma-signal', 'react-reconcile', 'rpi4-drawing']) {
  const film = films.find(item => item.id === id), inputs = filmInputs(root, film);
  if (audit.results.find(item => item.id === id)?.fingerprint.hash !== inputs.hash) throw new Error('Stale audit for ' + id);
  const movie = path.join(out, id + '.mp4'), start = Date.now();
  console.log('PILOT ' + film.engine + ' ' + id);
  const log = run(process.execPath, ['scripts/render.mjs', 'films/' + id + '/index.html', '--fps', '30', '--blur', '1', '--encoder', 'png', '--out', movie]);
  fs.writeFileSync(path.join(out, id + '.log'), log);
  const seconds = (Date.now() - start) / 1000;
  const resources = /study resources: (.+)/.exec(log);
  const metadata = JSON.parse(run(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', movie]));
  const video = metadata.streams.find(stream => stream.codec_type === 'video');
  const audio = metadata.streams.find(stream => stream.codec_type === 'audio');
  const comparisons = [4, 12, 20, 28].map(time => ({ time,
    ...comparePixels(readRgb(movie, time), readRgb(path.join(folder, 'stills', id + '-' + time + '.png')), 1600, 900, 3) }));
  const gray = run(ffmpeg, ['-v', 'error', '-i', movie, '-vf', 'crop=960:616:44:152,scale=96:62,format=gray', '-f', 'rawvideo', '-'], true);
  const frameSize = 96 * 62, emptyFrames = [], frames = gray.length / frameSize;
  for (let frame = 0; frame < frames; frame++) {
    let min = 255, max = 0;
    for (let i = frame * frameSize; i < (frame + 1) * frameSize; i++) { min = Math.min(min, gray[i]); max = Math.max(max, gray[i]); }
    if (max - min < 10) emptyFrames.push(frame);
  }
  const pcm = run(ffmpeg, ['-v', 'error', '-i', movie, '-vn', '-ac', '2', '-ar', '48000', '-f', 'f32le', '-'], true);
  let sum = 0, peak = 0;
  for (let i = 0; i < pcm.length; i += 4) { const value = pcm.readFloatLE(i); sum += value * value; peak = Math.max(peak, Math.abs(value)); }
  const rms = Math.sqrt(sum / (pcm.length / 4));
  const failures = [];
  if (video.width !== 1600 || video.height !== 900 || video.avg_frame_rate !== '30/1' || frames !== 960) failures.push('VIDEO_PROFILE');
  if (audio.sample_rate !== '48000' || audio.channels !== 2 || audio.codec_name !== 'aac') failures.push('AUDIO_PROFILE');
  if (emptyFrames.length) failures.push('EMPTY_ENCODED_FRAMES');
  if (!Number.isFinite(rms) || rms <= 0 || peak >= 1) failures.push('AUDIO_SILENCE_OR_CLIPPING');
  if (comparisons.some(result => result.ssim < .98 || result.meanAbs > 2 || result.bias.some(value => Math.abs(value) > 1))) failures.push('EXPORT_FIDELITY');
  results.push({ id, engine: film.engine, status: failures.length ? 'FAIL' : 'PASS', failures, fingerprint: inputs.hash,
    sha256: sha256(movie), bytes: fs.statSync(movie).size, seconds, frames, emptyFrames, comparisons,
    resources: resources ? JSON.parse(resources[1]) : null,
    video: { width: video.width, height: video.height, fps: video.avg_frame_rate, pixelFormat: video.pix_fmt,
      range: video.color_range, space: video.color_space, transfer: video.color_transfer },
    audio: { sampleRate: audio.sample_rate, channels: audio.channels, rms, peak, listeningReview: 'NOT_PERFORMED' },
    humanApproval: 'NOT_RECORDED' });
  fs.writeFileSync(path.join(folder, 'pilot-audit.json'), JSON.stringify({ generated: new Date().toISOString(), results }, null, 2) + '\n');
  console.log(results.at(-1).status + ' ' + id + ' / ' + seconds.toFixed(1) + 's / ' + failures.join(', '));
}
if (results.some(result => result.status === 'FAIL')) process.exitCode = 1;
