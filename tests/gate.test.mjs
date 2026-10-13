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

test('params: a drawn dimension is compared with its source', () => {
  const withP = (p) => mutate((s) => { s.parts[0].params = p; });
  const ok = withP({ w: { value: 10, unit: 'mm', conf: 'spec', claim: 'c1', tol: 0.01 } });
  assert.equal(ok.errors.length, 0, ok.errors.join('; '));
  assert.equal(ok.verdict.dimensions, 1);
  assert.equal(ok.verdict.checked, 2);      // the published mode plus the dimension
  assert.ok(withP({ w: { value: 9.5, unit: 'mm', conf: 'spec', claim: 'c1', tol: 0.01 } }).errors.some((e) => /drawn at 10 but the source says 9.5/.test(e)));
  assert.ok(withP({ nope: { value: 1, conf: 'spec', claim: 'c1' } }).errors.some((e) => /not a dimension/.test(e)));
  assert.ok(withP({ w: { value: 10, conf: 'spec' } }).errors.some((e) => /cites no claim/.test(e)));
  assert.ok(withP({ w: { conf: 'estimated' } }).errors.some((e) => /ESTIMATED without saying why/.test(e)));
  assert.ok(withP({ w: { value: 10, conf: 'spec', claim: 'c1', tol: -1 } }).errors.some((e) => /invalid tolerance/.test(e)));
});

test('params: a part stronger than its weakest dimension is reported as mixed', () => {
  const r = mutate((s) => { s.parts[0].params = { w: { value: 10, conf: 'spec', claim: 'c1' }, h: { conf: 'estimated', why: 'no drawing' } }; });
  assert.equal(r.errors.length, 0, r.errors.join('; '));
  assert.equal(r.verdict.mixed, 1);
  assert.ok(r.warnings.some((w) => /dimension h is ESTIMATED/.test(w)));
});

test('recognize: features must be built from parts that exist', () => {
  const ok = mutate((s) => { s.recognize = { object: 'A plate', iconic: [{ text: 'a flat plate', parts: ['a'] }, { text: 'its corner radius', partsPrefix: 'a' }] }; });
  assert.equal(ok.errors.length, 0, ok.errors.join('; '));
  assert.equal(ok.verdict.recognition.features, 2);
  assert.ok(mutate((s) => { s.recognize = { object: 'A plate', iconic: [{ text: 'a flat plate', parts: ['a'] }, { text: 'a ghost', parts: ['nope'] }] }; }).errors.some((e) => /part that does not exist/.test(e)));
  assert.ok(mutate((s) => { s.recognize = { object: 'A plate', iconic: [{ text: 'only one', parts: ['a'] }] }; }).errors.some((e) => /at least 2 features/.test(e)));
  assert.ok(mutate((s) => { s.recognize = { object: 'TODO', iconic: [{ text: 'x', parts: ['a'] }, { text: 'y', parts: ['a'] }] }; }).errors.some((e) => /placeholder/.test(e)));
});

test('recognize: a failed blind test is reported, not hidden', () => {
  const r = mutate((s) => { s.recognize = { object: 'A plate', iconic: [{ text: 'p', parts: ['a'] }, { text: 'q', parts: ['a'] }], blind: { answer: 'a coaster', judge: 'a fresh model', date: '2026-10-13', ok: false } }; });
  assert.equal(r.verdict.recognition.blind, 'not recognised');
  assert.ok(r.warnings.some((w) => /not recognisable yet/.test(w)));
});

test('the shipped examples keep passing with an honest verdict', () => {
  for (const name of ['hub', 'switch', 'enigma', 'k20a', 'rubik', 'rtx4090', 'mos6502', 'rar5', 'winrar', 'lock']) {
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

test('lock: changing one published key pin height breaks the stack check', () => {
  const dir = path.join(root, 'examples', 'lock'), src = fs.readFileSync(path.join(dir, 'spec.js'), 'utf8');
  assert.ok(src.includes('0.241'), 'the key pin table is in the spec');
  const tmp = path.join(root, 'tests', '.tampered-lock.js'); fs.writeFileSync(tmp, src.replace('0.241', '0.250'));
  try {
    const ctx = load([tmp]), r = ctx.MX.spec.validate(ctx.SPEC);
    assert.ok(r.errors.length > 0, 'a pin 0.009 in off must not pass');
    assert.ok(r.errors.some((e) => /Pin plus cut|The right key|Key pin step/.test(e)), r.errors.join('; '));
  } finally { fs.rmSync(tmp, { force: true }); }
});
