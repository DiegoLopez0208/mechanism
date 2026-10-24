// Tests for the sound engines in kit/ without a browser: kit/audio.js (cue synthesis) and kit/sound.js (stereo, material-modelled).
// They are loaded the way kit.test.mjs loads the pure models, in a vm context with no samples, so every voice is synthesised.
// Run: node --test tests/sound.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = () => {
  const ctx = vm.createContext({ console, Math, Float32Array }); ctx.window = ctx;
  // kit/core.js needs a DOM; only MX.rng is wanted from it, so that one line is read from the source
  const core = fs.readFileSync(path.join(root, 'kit/core.js'), 'utf8').split('\n').find((l) => l.includes('MX.rng ='));
  assert.ok(core, 'MX.rng not found in kit/core.js');
  vm.runInContext('window.MX = window.MX || {};\nconst MX = window.MX;\n' + core, ctx);
  for (const f of ['kit/audio.js', 'kit/sound.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: path.join(root, f) });
  return ctx.MX;
};
const MX = load();

const peak = (a) => { let p = 0; for (const x of a) p = Math.max(p, Math.abs(x)); return p; };
const finite = (a) => { for (const x of a) if (!Number.isFinite(x)) return false; return true; };
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
// zero crossings in the first 0.2 s: a proxy for the pitch of a single-voice impact
const crossings = (a, sr) => { const n = Math.min(a.length, Math.floor(0.2 * sr)); let c = 0; for (let i = 1; i < n; i++) if ((a[i - 1] < 0) !== (a[i] < 0)) c++; return c; };

test('audio.render: deterministic for a seed, finite, bounded, and the length asked for', () => {
  const cfg = { duration: 2, sr: 8000, seed: 3, cues: [{ t: 0.1, kind: 'thock' }, { t: 0.5, kind: 'ping', f: 700 }, { t: 1, kind: 'clunk' }] };
  const a = MX.audio.render(cfg), b = MX.audio.render(cfg);
  assert.equal(a.length, 2 * 8000);
  assert.ok(finite(a), 'NaN or Infinity in the output');
  assert.ok(peak(a) <= 0.9 + 1e-6 && peak(a) > 0.1, 'peak ' + peak(a));
  assert.ok(same(a, b), 'the same config must give the same samples');
  assert.ok(!same(a, MX.audio.render({ ...cfg, seed: 4 })), 'a different seed must change the noise');
});

test('audio.render: unknown cue kinds are ignored, an empty list is silence, the tail fades out', () => {
  const quiet = MX.audio.render({ duration: 1, sr: 8000, cues: [{ t: 0, kind: 'no-such-kind' }] });
  assert.equal(peak(quiet), 0);
  const loud = MX.audio.render({ duration: 1, sr: 8000, cues: [{ t: 0.9, kind: 'clunk' }] });
  assert.ok(Math.abs(loud[loud.length - 1]) < 1e-3, 'the last sample should be faded to zero');
});

test('audio.render: a cue that starts before 0 or after the end does not throw or corrupt the buffer', () => {
  const o = MX.audio.render({ duration: 1, sr: 8000, cues: [{ t: -0.05, kind: 'thock' }, { t: 5, kind: 'thock' }, { t: 0.99, kind: 'clunk' }] });
  assert.equal(o.length, 8000);
  assert.ok(finite(o));
});

test('sound.note: quantises to the scale and wraps octaves up and down', () => {
  const S = MX.sound, hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  assert.ok(Math.abs(S.note(69, 'major', 0) - 440) < 1e-9, 'index 0 is the root');
  assert.ok(Math.abs(S.note(69, 'major', 7) - 880) < 1e-9, 'one scale length up is one octave');
  assert.ok(Math.abs(S.note(69, 'major', -7) - 220) < 1e-9, 'one scale length down is one octave');
  assert.ok(Math.abs(S.note(60, 'minor', 2) - hz(63)) < 1e-9, 'the third degree of a minor scale is 3 semitones up');
  assert.ok(Math.abs(S.note(60, [0, 5], 1) - hz(65)) < 1e-9, 'a custom scale array is accepted');
});

test('sound.render: stereo, deterministic, bounded, and an unknown voice is skipped', () => {
  const cfg = { duration: 1.5, sr: 8000, seed: 9, events: [
    { t: 0.1, v: 'impact', mat: 'steel', size: 1, pan: -1 }, { t: 0.4, v: 'click', pan: 1 }, { t: 0.7, v: 'no-such-voice' }] };
  const a = MX.sound.render(cfg), b = MX.sound.render(cfg);
  assert.equal(a.L.length, 12000); assert.equal(a.R.length, 12000); assert.equal(a.sr, 8000);
  assert.ok(finite(a.L) && finite(a.R));
  assert.ok(peak(a.L) <= 0.92 && peak(a.R) <= 0.92, 'limiter ceiling is 0.92');
  assert.ok(same(a.L, b.L) && same(a.R, b.R), 'the same config must give the same samples');
  const energy = (x, i0, i1) => { let e = 0; for (let i = i0; i < i1; i++) e += x[i] * x[i]; return e; };
  assert.ok(energy(a.L, 800, 3200) > energy(a.R, 800, 3200) * 1.5, 'a hard-left hit should be louder on the left');
});

test('sound.render: bigger parts ring lower (the pitch comes from the size of the part)', () => {
  const hit = (size) => MX.sound.render({ duration: 0.5, sr: 16000, seed: 1, events: [{ t: 0, v: 'impact', mat: 'steel', size, send: 0, hard: 0 }] }).L;
  const small = crossings(hit(0.2), 16000), large = crossings(hit(5), 16000);
  assert.ok(small > large, 'small ' + small + ' crossings vs large ' + large);
});

test('sound.render: with no samples loaded REAL() is false and every voice is synthesised', () => {
  assert.equal(MX.sound.REAL(), false);
});

const VOICE_NAMES = ['impact', 'click', 'whoosh', 'servo', 'charge', 'blip', 'tone', 'boom', 'clack', 'detent', 'thock', 'tick'];
const energyOf = (x) => { let e = 0; for (const v of x) e += v * v; return e; };

test('sound.render: every synthesised voice is audible, finite, bounded and repeatable', () => {
  for (const v of VOICE_NAMES) {
    const cfg = { duration: 1.6, sr: 8000, seed: 5, events: [{ t: 0.05, v, mat: 'aluminum', size: 12, timbre: 'marimba' }] };
    const a = MX.sound.render(cfg), b = MX.sound.render(cfg);
    assert.ok(finite(a.L) && finite(a.R), v + ': NaN or Infinity');
    assert.ok(peak(a.L) <= 0.92 && peak(a.R) <= 0.92, v + ': over the limiter ceiling');
    assert.ok(energyOf(a.L) > 1e-4, v + ': silent');
    assert.ok(same(a.L, b.L) && same(a.R, b.R), v + ': not repeatable for one seed');
  }
});

test('sound.render: the three tone timbres differ, and a bed with an arpeggio follows its level curve', () => {
  const t = (timbre) => MX.sound.render({ duration: 1, sr: 8000, seed: 2, events: [{ t: 0, v: 'tone', f: 440, timbre, send: 0 }] }).L;
  const bell = t('bell'), marimba = t('marimba'), pluck = t('pluck');
  assert.ok(!same(bell, marimba) && !same(marimba, pluck) && !same(bell, pluck), 'timbres must change the sound');
  const bed = (level) => MX.sound.render({ duration: 4, sr: 8000, seed: 3, bed: { bpm: 120, root: 48, mode: 'dorian', level, curve: [[0, 0.4], [4, 0.4]] } });
  const loud = bed(0.6), none = bed(0);
  assert.ok(finite(loud.L) && energyOf(loud.L) > energyOf(none.L), 'a bed with level 0.6 must be louder than level 0');
});

test('sound.render: with the recorded samples loaded, REAL() is true and the voices use them', () => {
  const ctx = vm.createContext({ console, Math, Float32Array, atob: (s) => Buffer.from(s, 'base64').toString('binary') }); ctx.window = ctx;
  const core = fs.readFileSync(path.join(root, 'kit/core.js'), 'utf8').split('\n').find((l) => l.includes('MX.rng ='));
  vm.runInContext('window.MX = window.MX || {};\nconst MX = window.MX;\n' + core, ctx);
  for (const f of ['kit/samples.js', 'kit/audio.js', 'kit/sound.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: path.join(root, f) });
  const R = ctx.MX;
  assert.equal(R.sound.REAL(), true);
  const cfg = { duration: 1.2, sr: 44100, seed: 4, events: ['impact', 'clack', 'thock', 'detent', 'tick', 'click'].map((v, i) => ({ t: 0.05 + i * 0.15, v, mat: 'steel', size: 20 })) };
  const real = R.sound.render(cfg), again = R.sound.render(cfg), synth = MX.sound.render(cfg);
  assert.ok(finite(real.L) && finite(real.R) && peak(real.L) <= 0.92);
  assert.ok(same(real.L, again.L), 'sample playback must be repeatable for one seed');
  assert.ok(!same(real.L, synth.L), 'recorded samples must replace the synthesised voices');
});

test('sound.render: a whoosh that sweeps high stays finite (the filter used to diverge and turn the whole mix into NaN)', () => {
  for (const [sr, f1, q] of [[44100, 14000, 1.4], [48000, 20000, 0.7], [8000, 3000, 1.4]]) {
    const r = MX.sound.render({ duration: 1.2, sr, seed: 1, events: [{ t: 0.05, v: 'whoosh', f1, q }, { t: 0.6, v: 'click' }] });
    assert.ok(finite(r.L) && finite(r.R), `sr ${sr}, f1 ${f1}, q ${q}`);
    assert.ok(energyOf(r.L) > 1e-3, 'the rest of the mix must survive');
  }
});
