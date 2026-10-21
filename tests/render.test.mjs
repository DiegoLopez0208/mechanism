import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findBrowser } from '../scripts/lib/browser.mjs';
import { comparePixels } from '../scripts/lib/ssim.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ffmpeg = process.env.FFMPEG || 'ffmpeg', ffprobe = process.env.FFPROBE || (path.dirname(ffmpeg) === '.' ? 'ffprobe' : path.join(path.dirname(ffmpeg), process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'));
const available = findBrowser() && spawnSync(ffmpeg, ['-version'], { stdio: 'ignore' }).status === 0;
const opts = { skip: !available && !process.env.CI ? 'Chromium/ffmpeg unavailable' : false, timeout: 900000 };
function run(args) {
  const r = spawnSync(process.execPath, ['scripts/render.mjs', ...args], { cwd: root, encoding: 'utf8', timeout: 600000 });
  assert.equal(r.status, 0, r.stdout + '\n' + r.stderr); return r.stdout + r.stderr;
}
test('both encoders produce timed, colour-managed MP4 with stereo; still/export/remux remain usable', opts, () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'mx-render-test-')), page = 'examples/switch/index.html';
  try {
    const reference = path.join(dir, 'reference.png');
    run([page, '--length', 'short', '--draft', '--still', '1.5', '--out', reference]);
    const raw = (input, filter = '') => {
      const r = spawnSync(ffmpeg, ['-v', 'error', '-i', input, '-vf', (filter ? filter + ',' : '') + 'scale=flags=accurate_rnd+full_chroma_int,format=rgb24', '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 16 * 1024 * 1024 });
      assert.equal(r.status, 0, r.stderr?.toString()); return r.stdout;
    };
    const expected = raw(reference);
    for (const encoder of ['jpeg', 'browser']) {
      const out = path.join(dir, encoder + '.mp4');
      run([page, '--length', 'short', '--draft', '--encoder', encoder, '--from', '1', '--to', '2', '--out', out]);
      const p = spawnSync(ffprobe, ['-v', 'error', '-show_streams', '-of', 'json', out], { encoding: 'utf8' });
      assert.equal(p.status, 0, p.stderr); const streams = JSON.parse(p.stdout).streams;
      const v = streams.find(s => s.codec_type === 'video'), a = streams.find(s => s.codec_type === 'audio');
      assert.equal(v.r_frame_rate, '30/1'); assert.equal(Number(v.nb_frames), 30); assert.equal(Number(v.duration), 1);
      assert.equal(v.pix_fmt, 'yuv420p'); assert.equal(v.color_range, 'tv'); assert.equal(v.color_space, 'bt709');
      assert.equal(v.color_primaries, 'bt709'); assert.equal(v.color_transfer, 'iec61966-2-1'); assert.equal(a.channels, 2);
      assert.equal(Number(a.sample_rate), 48000, 'loudnorm resamples to 192 kHz; the mux must bring it back to a rate platforms keep');
      const pixels = raw(out, 'select=eq(n\\,15)'), metric = comparePixels(pixels, expected, v.width, v.height, 3);
      assert.ok(metric.meanAbs < 3 && metric.ssim >= 0.93, encoder + ': ' + JSON.stringify(metric));
      const audio = spawnSync(ffmpeg, ['-v', 'error', '-i', out, '-vn', '-f', 's16le', '-'], { maxBuffer: 1024 * 1024 });
      assert.equal(audio.status, 0, audio.stderr?.toString());
      assert.ok(audio.stdout.some(byte => byte !== 0), 'decoded sound must not be silence');
    }
    run([page, '--length', 'short', '--remux', path.join(dir, 'jpeg.mp4'), '--out', path.join(dir, 'work.mp4')]);
    run([page, '--length', 'short', '--still', '5', '--out', path.join(dir, 'still.png')]);
    assert.equal(readFileSync(path.join(dir, 'still.png')).subarray(1, 4).toString(), 'PNG');
    for (const format of ['glb', 'stl']) {
      run([page, '--export', format, '--out', path.join(dir, 'model.mp4')]);
      assert.ok(readFileSync(path.join(dir, 'model.' + format)).length > 100);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('an actual page without VideoEncoder automatically falls back to JPEG', opts, () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'mx-fallback-test-'));
  try {
    const example = path.join(root, 'examples/switch');
    let html = readFileSync(path.join(example, 'index.html'), 'utf8');
    html = html.replace('<script ', '<script>window.VideoEncoder=undefined;</script><script ')
      .replace(/src="([^"]*boot.js)"/, (_, src) => `src="${pathToFileURL(path.resolve(example, src)).href}"`)
      .replace(/data-scripts="([^"]*)"/, (_, list) => `data-scripts="${list.split(',').map(f => pathToFileURL(path.resolve(example, f)).href).join(',')}"`);
    const page = path.join(dir, 'index.html'); writeFileSync(page, html);
    const log = run([page, '--length', 'short', '--draft', '--encoder', 'browser', '--from', '1', '--to', '2', '--out', path.join(dir, 'fallback.mp4')]);
    assert.match(log, /falling back to JPEG/); assert.match(log, /encoder: jpeg/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('CPU vector frames retain their colour through browser H.264 encoding', opts, () => {
  const dir=mkdtempSync(path.join(os.tmpdir(),'mx-cpu-colour-'));
  try {
    const flags=['examples/react/index.html','--method','workflow','--background','graphite','--length','short','--aspect','4:5','--blur','1'];
    const reference=path.join(dir,'ref.png'),video=path.join(dir,'cpu.mp4');
    run([...flags,'--still','9','--out',reference]);
    run([...flags,'--from','9','--to','10','--encoder','browser','--out',video]);
    const raw=file=>{
      const result=spawnSync(ffmpeg,['-v','error','-i',file,'-vf','scale=flags=accurate_rnd+full_chroma_int,format=rgb24','-frames:v','1','-f','rawvideo','-'],{maxBuffer:16*1024*1024});
      assert.equal(result.status,0,result.stderr?.toString());return result.stdout;
    };
    const metric=comparePixels(raw(video),raw(reference),1080,1350,3);
    assert.ok(metric.meanAbs<=2&&metric.ssim>=.98&&metric.bias.every(v=>Math.abs(v)<1),JSON.stringify(metric));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
