// Serial local production. Receipts bind each export to its exact sources.
// Never deletes historical assets or uploads anything.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { edition, films } from '../films/catalog.mjs';
import { filmInputs } from './lib/film-fingerprint.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), at = args.indexOf('--out');
if (at < 0 || !args[at + 1]) throw new Error('--out <external output folder> is required');
const auditAt = args.indexOf('--audit');
if (auditAt < 0 || !args[auditAt + 1]) throw new Error('Production is stopped: --audit <completed native-audit.json> is required');
const audit = JSON.parse(fs.readFileSync(path.resolve(args[auditAt + 1]), 'utf8'));
const pilotFile = path.join(path.dirname(path.resolve(args[auditAt + 1])), 'pilot-audit.json');
if (!fs.existsSync(pilotFile)) throw new Error('Production is stopped: the three encoded pilots must be audited first');
const pilots = JSON.parse(fs.readFileSync(pilotFile, 'utf8'));
for (const engine of ['studio', 'workflow', 'paper']) {
  const pilot = pilots.results?.find(result => result.engine === engine);
  const source = films.find(film => film.id === pilot?.id);
  if (pilot?.status !== 'PASS' || !source || pilot.fingerprint !== filmInputs(root, source).hash) {
    throw new Error('Production is stopped: missing, failed or stale encoded pilot for ' + engine);
  }
}
for (const film of films) {
  const row = audit.results?.find(result => result.id === film.id);
  if (row?.status !== 'PASS' || row.fingerprint?.hash !== filmInputs(root, film).hash) {
    throw new Error('Production is stopped: missing, failed or stale audit for ' + film.id);
  }
}
const out = path.resolve(args[at + 1]); fs.mkdirSync(out, { recursive: true });
for (const sub of ['posters', 'contact-sheets', 'receipts', 'logs']) fs.mkdirSync(path.join(out, sub), { recursive: true });
const ffmpeg = process.env.FFMPEG || 'ffmpeg', ffprobe = process.env.FFPROBE || 'ffprobe';
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const gitFiles = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const runtime = [...new Set(gitFiles.filter(f => f.startsWith('kit/') && !f.includes('/vendor/')).concat([
    'kit/technical-film.js', 'kit/production-film.js', 'films/catalog.mjs', 'scripts/render.mjs', 'scripts/lib/encoding.mjs', 'scripts/lib/browser.mjs',
  'kit/vendor/three.bundle.js',
]))].sort();
const runtimeHash = crypto.createHash('sha256').update(runtime.map(f => f + ':' + sha(path.join(root, f))).join('\n')).digest('hex');
const run = (cmd, argv, log) => new Promise((resolve, reject) => {
  const child = spawn(cmd, argv, { cwd: root, env: process.env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const sink = fs.createWriteStream(log, { flags: 'w' });
  child.stdout.pipe(sink, { end: false }); child.stderr.pipe(sink, { end: false });
  child.once('error', e => { sink.end(); reject(e); });
  child.once('close', code => { sink.end(); code === 0 ? resolve() : reject(new Error(cmd + ' exit ' + code + '; see ' + log)); });
});
const command = (cmd, argv) => {
  const r = spawnSync(cmd, argv, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(cmd + ': ' + (r.stderr || r.error));
  return r.stdout;
};
const probe = file => JSON.parse(command(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]));
const records = [];
const writeManifest = () => fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ edition, runtimeHash,
  node: process.version, browser: process.env.BROWSER || 'auto', generated: new Date().toISOString(), films: records }, null, 2) + '\n');
for (const [index, film] of films.entries()) {
  const specFile = path.join(root, film.source, 'spec.js'), dataFile = path.join(root, film.source, 'data.js');
  const specHash = sha(specFile), dataHash = fs.existsSync(dataFile) ? sha(dataFile) : null;
  const receiptFile = path.join(out, 'receipts', film.id + '.json'), movie = path.join(out, film.id + '.mp4');
  const old = fs.existsSync(receiptFile) ? JSON.parse(fs.readFileSync(receiptFile, 'utf8')) : null;
  if (old?.status === 'verified' && old.fingerprint?.hash === filmInputs(root, film).hash && old.runtimeHash === runtimeHash && old.specHash === specHash
    && old.dataHash === dataHash && fs.existsSync(movie) && sha(movie) === old.sha256) {
    records.push(old); writeManifest(); console.log('REUSE ' + film.id + ' (matching receipt)'); continue;
  }
  const ctx = vm.createContext({ console, TextEncoder, TextDecoder }); ctx.window = ctx;
  for (const name of ['kin', 'enigma', 'cube', 'rar5', 'deflate', 'react-reconcile', 'geom2d', 'spec-core']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'kit', name + '.js'), 'utf8'), ctx);
  }
  if (fs.existsSync(dataFile)) vm.runInContext(fs.readFileSync(dataFile, 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(specFile, 'utf8'), ctx);
  const gate = ctx.MX.spec.validate(ctx.SPEC); if (gate.errors.length) throw new Error(gate.errors.join('; '));
  const receipt = { id: film.id, title: film.title, engine: film.engine, source: film.source,
    fingerprint: filmInputs(root, film), audit: path.resolve(args[auditAt + 1]),
    status: 'rendering', runtimeHash, specHash, dataHash, evidence: gate.verdict,
    visualReview: 'PENDING', listeningReview: 'PENDING', humanApproval: 'NOT_RECORDED' };
  fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n');
  const temporary = path.join(out, '.' + film.id + '.pending.mp4'), start = Date.now();
  console.log('RENDER ' + (index + 1) + '/' + films.length + ' ' + film.engine + ' ' + film.id);
  try {
    const matchingPilot = pilots.results.find(pilot => pilot.id === film.id && pilot.fingerprint === receipt.fingerprint.hash);
    const pilotMovie = path.join(path.dirname(pilotFile), 'pilots', film.id + '.mp4');
    if (matchingPilot && fs.existsSync(pilotMovie) && sha(pilotMovie) === matchingPilot.sha256) {
      fs.copyFileSync(pilotMovie, temporary);
      fs.writeFileSync(path.join(out, 'logs', film.id + '.log'), 'Reused the freshly audited encoded pilot with matching sources and file hash.\n');
    } else await run(process.execPath, ['scripts/render.mjs', 'films/' + film.id + '/index.html', '--fps', '30',
      '--blur', '1', '--encoder', 'png', '--out', temporary], path.join(out, 'logs', film.id + '.log'));
    const meta = probe(temporary), video = meta.streams.find(s => s.codec_type === 'video');
    const audio = meta.streams.find(s => s.codec_type === 'audio');
    if (video?.width !== 1600 || video.height !== 900 || video.avg_frame_rate !== '30/1'
      || video.codec_name !== 'h264' || audio?.codec_name !== 'aac' || audio.sample_rate !== '48000'
      || Math.abs(Number(meta.format.duration) - 32) > .1) throw new Error('Unexpected export profile for ' + film.id);
    command(ffmpeg, ['-v', 'error', '-i', temporary, '-f', 'null', '-']);
    const poster = path.join(out, 'posters', film.id + '.jpg');
    command(ffmpeg, ['-v', 'error', '-y', '-ss', '12', '-i', temporary, '-frames:v', '1', '-q:v', '2', poster]);
    const contact = path.join(out, 'contact-sheets', film.id + '.jpg');
    command(ffmpeg, ['-v', 'error', '-y', '-i', temporary, '-vf',
      'select=eq(n\\,120)+eq(n\\,360)+eq(n\\,600)+eq(n\\,840),scale=800:450,tile=2x2', '-frames:v', '1', '-q:v', '2', contact]);
    fs.renameSync(temporary, movie);
    Object.assign(receipt, { status: 'verified', sha256: sha(movie), bytes: fs.statSync(movie).size,
      renderSeconds: (Date.now() - start) / 1000, duration: Number(meta.format.duration), width: video.width,
      height: video.height, fps: video.avg_frame_rate, pixelFormat: video.pix_fmt,
      color: { range: video.color_range, space: video.color_space, transfer: video.color_transfer, primaries: video.color_primaries },
      audio: { codec: audio.codec_name, sampleRate: audio.sample_rate, channels: audio.channels },
      poster: 'posters/' + film.id + '.jpg', contactSheet: 'contact-sheets/' + film.id + '.jpg',
      decode: 'PASS', generated: new Date().toISOString() });
    fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n');
    records.push(receipt); writeManifest(); console.log('VERIFIED ' + film.id + ' ' + receipt.renderSeconds + 's');
  } catch (e) {
    receipt.status = 'failed'; receipt.error = e.message;
    fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n'); writeManifest(); throw e;
  }
}
console.log('Complete: ' + records.length + ' new films. Visual/listening/human reviews are separate states.');
