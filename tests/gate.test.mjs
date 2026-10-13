// Regression tests for the evidence gate (kit/spec-core.js). Run: node --test tests/
// Every case is a spec that used to pass, or should never pass. The examples must keep passing and a changed byte must still fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function load(extra) {
  const ctx = vm.createContext({ console, TextEncoder, TextDecoder }); ctx.window = ctx;
  for (const f of ['kit/kin.js', 'kit/enigma.js', 'kit/cube.js', 'kit/rar5.js', 'kit/deflate.js', 'kit/spec-core.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  (extra || []).forEach((f) => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }));
  return ctx;
}
const validateExample = (name) => {
  const dir = path.join(root, 'examples', name), data = path.join(dir, 'data.js'), ctx = load(fs.existsSync(data) ? [data, path.join(dir, 'spec.js')] : [path.join(dir, 'spec.js')]);
  return ctx.MX.spec.validate(ctx.SPEC);
};
const MX = load().MX;
const good = () => ({
  id: 't', title: 'T',
  research: {
    sources: [{ id: 's1', title: 'Data sheet', url: 'https://www.rfc-editor.org/rfc/rfc1951', fetched: '2026-10-13' }],
    claims: [{ id: 'c1', conf: 'spec', text: 'a width of 10 mm', src: ['s1'] }, { id: 'g', conf: 'estimated', text: 'the inside', why: 'nobody publishes it' }],
  },
  parts: [{ id: 'a', name: 'A', kind: 'plate', p: { w: 10, h: 10, r: 1, t: 2 }, mat: 'steel', at: [0, 0, 0], conf: 'spec', claims: ['c1'] }],
  mechanism: { calc: { vars: { x: { v: 3, claim: 'c1' } } }, drive: { modes: [{ id: 'm', label: 'three', expr: 'x', publish: { value: 3, claim: 'c1' } }] } },
});
const mutate = (fn) => { const s = good(); fn(s); return MX.spec.validate(s); };

test('the baseline spec passes and is VERIFIED', () => {
  const r = MX.spec.validate(good());
  assert.equal(r.errors.length, 0, r.errors.join('; '));
  assert.equal(r.verdict.state, 'VERIFIED');
  assert.equal(r.verdict.checked, 1);
});

test('placeholder source (example.com + TODO) fails', () => {
  const r = mutate((s) => { s.research.sources[0].url = 'https://example.com/'; s.research.sources[0].title = 'TODO: the page you opened'; });
  assert.ok(r.errors.some((e) => /placeholder/.test(e)), r.errors.join('\n'));
});

test('placeholder claim text fails', () => {
  assert.ok(mutate((s) => { s.research.claims[0].text = 'TODO: a published number, quoted.'; }).errors.some((e) => /placeholder/.test(e)));
});

test('negative or zero dimension fails', () => {
  assert.ok(mutate((s) => { s.parts[0].p.w = -5; }).errors.some((e) => /must be positive/.test(e)));
  assert.ok(mutate((s) => { s.parts[0].p.h = 0; }).errors.some((e) => /must be positive/.test(e)));
});

test('non finite numbers in a part fail', () => {
  assert.ok(mutate((s) => { s.parts[0].p.r = NaN; }).errors.some((e) => /not finite/.test(e)));
  assert.ok(mutate((s) => { s.parts[0].at = [0, Infinity, 0]; }).errors.length > 0);
});

test('a spec with no parts fails', () => {
  assert.ok(mutate((s) => { s.parts = []; }).errors.some((e) => /no parts/.test(e)));
});

test('a calc variable with no claim fails', () => {
  assert.ok(mutate((s) => { s.mechanism.calc.vars.x = { v: 3 }; }).errors.some((e) => /has no claim/.test(e)));
  assert.ok(mutate((s) => { s.mechanism.calc.vars.x = 3; }).errors.some((e) => /has no claim/.test(e)));
});

test('a calc variable citing a missing claim fails', () => {
  assert.ok(mutate((s) => { s.mechanism.calc.vars.x.claim = 'nope'; }).errors.some((e) => /does not exist/.test(e)));
});

test('an expression that gives undefined, NaN or Infinity fails', () => {
  for (const expr of ['undefined', 'x / 0', '0 / 0', 'Math.sqrt(-1)']) {
    const r = mutate((s) => { s.mechanism.drive.modes[0].expr = expr; });
    assert.ok(r.errors.some((e) => /not a finite number/.test(e)), expr + ': ' + r.errors.join('\n'));
  }
});

test('a published value that differs fails (control)', () => {
  const r = mutate((s) => { s.mechanism.drive.modes[0].publish.value = 4; });
  assert.ok(r.errors.some((e) => /published one is 4/.test(e)));
  assert.equal(r.verdict.state, 'DOES NOT PASS');
});

test('an invalid tolerance fails', () => {
  assert.ok(mutate((s) => { s.mechanism.drive.modes[0].publish.tol = -1; }).errors.some((e) => /invalid tolerance/.test(e)));
  assert.ok(mutate((s) => { s.mechanism.drive.modes[0].publish.tol = NaN; }).errors.some((e) => /invalid tolerance/.test(e)));
});

test('ESTIMATED without a reason is an error, not a warning', () => {
  assert.ok(mutate((s) => { delete s.research.claims[1].why; }).errors.some((e) => /ESTIMATED/.test(e)));
  assert.ok(mutate((s) => { s.parts[0].conf = 'estimated'; delete s.parts[0].claims; }).errors.some((e) => /ESTIMATED without saying why/.test(e)));
});

test('nothing compared is NOT verified', () => {
  const r = mutate((s) => { delete s.mechanism.drive.modes[0].publish; });
  assert.equal(r.errors.length, 0);
  assert.equal(r.verdict.state, 'NOTHING CHECKED');
  assert.ok(r.warnings.some((w) => /not a verification/.test(w)));
});

test('the shipped examples keep passing with an honest verdict', () => {
  for (const name of ['hub', 'switch', 'enigma', 'k20a', 'rubik', 'rtx4090', 'mos6502', 'rar5']) {
    const r = validateExample(name);
    assert.equal(r.errors.length, 0, name + ': ' + r.errors.join('; '));
    assert.equal(r.verdict.state, 'VERIFIED', name);
    assert.ok(r.verdict.checked >= 2, name + ' compares fewer than 2 published figures');
  }
});

test('RAR5: changing one byte of the sample makes the gate fail', () => {
  const dir = path.join(root, 'examples', 'rar5'), data = fs.readFileSync(path.join(dir, 'data.js'), 'utf8'), m = data.match(/"hex":\s*"([0-9A-F ]+)"/);
  assert.ok(m, 'data.js has no hex');
  const bytes = m[1].split(' '); bytes[70] = bytes[70] === 'AA' ? 'BB' : 'AA';
  const tampered = data.replace(m[1], bytes.join(' ')), tmp = path.join(root, 'tests', '.tampered-data.js');
  fs.writeFileSync(tmp, tampered);
  try {
    let failed = false;
    try { const ctx = load([tmp, path.join(dir, 'spec.js')]), r = ctx.MX.spec.validate(ctx.SPEC); failed = r.errors.length > 0 && r.verdict.state === 'DOES NOT PASS'; } catch (e) { failed = true; }      // a model that cannot even parse the altered file also refuses it
    assert.ok(failed, 'a changed byte must not pass');
  } finally { fs.rmSync(tmp, { force: true }); }
});
