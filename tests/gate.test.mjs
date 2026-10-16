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
  for (const f of ['kit/kin.js', 'kit/enigma.js', 'kit/cube.js', 'kit/rar5.js', 'kit/deflate.js', 'kit/react-reconcile.js', 'kit/spec-core.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
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
    sources: [{ id: 's1', title: 'Data sheet', url: 'https://www.rfc-editor.org/rfc/rfc1951', fetched: '2026-10-13' }, { id: 's2', title: 'Second sheet', url: 'https://www.rfc-editor.org/rfc/rfc1952', fetched: '2026-10-13' }],
    claims: [{ id: 'c1', conf: 'spec', text: 'a width of 10 mm', src: ['s1'] }, { id: 'g', conf: 'estimated', text: 'the inside', why: 'nobody publishes it' }, { id: 'cpub', conf: 'spec', text: 'the published value is 3', src: ['s2'] }],
  },
  parts: [{ id: 'a', name: 'A', kind: 'plate', p: { w: 10, h: 10, r: 1, t: 2 }, mat: 'steel', at: [0, 0, 0], conf: 'spec', claims: ['c1'] }],
  mechanism: { calc: { vars: { x: { v: 3, claim: 'c1' } } }, drive: { modes: [{ id: 'm', label: 'three', expr: 'x', publish: { value: 3, claim: 'cpub' } }] } },      // the published figure comes from s2 and the input from s1: an independent check
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

test('params: the right number in the wrong unit is rejected (10 cm where the source says 10 mm)', () => {
  const withP = (p, fn) => mutate((s) => { s.parts[0].params = p; if (fn) fn(s); });
  const dim = (unit, value = 10) => ({ w: { value, unit, conf: 'spec', claim: 'c1', tol: 0.01 } });
  const bad = withP(dim('cm'));      // the claim text says "a width of 10 mm": same number, other unit
  assert.ok(bad.errors.some((e) => /params\.w says 10 cm but its claim says 10 mm \(10 mm is 1 cm\)/.test(e)), bad.errors.join('; '));
  assert.notEqual(bad.verdict.state, 'VERIFIED');
  assert.equal(withP(dim('mm')).errors.length, 0);                 // the same unit passes
  assert.equal(withP(dim('MM')).errors.length, 0);                 // case and spelling do not matter
  assert.equal(withP(dim('millimetres')).errors.length, 0);
  assert.equal(withP({ w: { value: 10, conf: 'spec', claim: 'c1', tol: 0.01 } }).errors.length, 0);   // no unit declared: nothing to compare
  const viaField = withP(dim('in'), (s) => { s.research.claims[0].unit = 'mm'; });      // the claim states its unit in a field
  assert.ok(viaField.errors.some((e) => /says 10 in but its claim says 10 mm \(10 mm is 0\.393701 in\)/.test(e)), viaField.errors.join('; '));
  const inches = withP(dim('mm', 0.5), (s) => { s.research.claims[0].text = 'a width of 0.5 in'; });
  assert.ok(inches.errors.some((e) => /says 0\.5 mm but its claim says 0\.5 in/.test(e)), inches.errors.join('; '));
  const other = withP(dim('cm'), (s) => { s.research.claims[0].text = 'a width of 25 mm and a height of 10 cm'; });      // the unit written next to this number is cm
  assert.equal(other.errors.length, 0, other.errors.join('; '));
});

test('gear train: two gears of different size on one body is an error, not a silent first-one-wins', () => {
  const dir = path.join(root, 'examples', 'hub'), data = path.join(dir, 'data.js'), ctx = load(fs.existsSync(data) ? [data, path.join(dir, 'spec.js')] : [path.join(dir, 'spec.js')]);
  const ok = ctx.MX.spec.validate(ctx.SPEC);
  assert.equal(ok.errors.length, 0, ok.errors.join('; '));
  ctx.SPEC.parts.find((p) => p.id === 'ring').body = 'sun';      // the ring (60 teeth) now shares a body with the sun gear (20 teeth)
  const bad = ctx.MX.spec.validate(ctx.SPEC);
  assert.ok(bad.errors.some((e) => /body sun carries gears with 20 and 60 teeth/.test(e) && /own body/.test(e) && /same/.test(e)), bad.errors.join('; '));
});

test('provenance: VERIFIED needs a check whose source is independent of the inputs; otherwise it is CONSISTENT', () => {
  const base = MX.spec.validate(good());                  // the published figure is from s2 and the input from s1
  assert.equal(base.verdict.state, 'VERIFIED'); assert.equal(base.verdict.independent, 1); assert.equal(base.verdict.sameSource, 0);
  assert.ok(base.lines.some((l) => /^provenance: 1 independent, 0 same source/.test(l)), base.lines.join('\n'));
  assert.ok(!base.warnings.some((w) => /same source|CONSISTENT/.test(w)), base.warnings.join('\n'));
  // the figure now comes from the source that fed the model: the numbers agree, a wrong source would agree too
  const same = mutate((s) => { s.mechanism.drive.modes[0].publish.claim = 'c1'; });
  assert.equal(same.errors.length, 0, same.errors.join('; '));
  assert.equal(same.verdict.state, 'CONSISTENT'); assert.equal(same.verdict.sameSource, 1); assert.equal(same.verdict.independent, 0);
  assert.ok(same.lines.some((l) => /^verdict: CONSISTENT/.test(l)), same.lines.join('\n'));
  assert.ok(same.warnings.some((w) => /same source that fed it/.test(w)) && same.warnings.some((w) => /CONSISTENT, not VERIFIED/.test(w)), same.warnings.join('\n'));
  // the second source says it derives from the first: it is the same source again
  const derived = mutate((s) => { s.research.sources[1].derives = ['s1']; });
  assert.equal(derived.verdict.state, 'CONSISTENT'); assert.ok(derived.warnings.some((w) => /\[s1\]/.test(w)), derived.warnings.join('\n'));
  // a claim that cites two sources, one of them the one that fed the model: the overlap is enough
  const partial = mutate((s) => { s.research.claims.find((c) => c.id === 'cpub').src = ['s2', 's1']; });
  assert.equal(partial.verdict.state, 'CONSISTENT');
  // a failing check is still DOES NOT PASS, and an incomplete one INCOMPLETE: CONSISTENT only softens a VERIFIED
  assert.equal(mutate((s) => { s.mechanism.drive.modes[0].publish = { value: 4, claim: 'c1' }; }).verdict.state, 'DOES NOT PASS');
});


test('captions: a quantity typed in a part card must be traceable to something in the spec', () => {
  const withInfo = (lines) => mutate((s) => { s.parts[0].info = { title: 'Plate', lines, conf: ['spec'] }; });
  const warn = (r) => r.warnings.filter((w) => /traceable to nothing/.test(w));
  assert.equal(warn(withInfo(['Width 10 mm, 3 steps'])).length, 0);                    // 10 is a dimension and a claim; a bare integer is not a quantity
  assert.equal(warn(withInfo(['Width 0.394 in'])).length, 0);                          // 10 mm is 0.3937 in: a unit conversion is allowed
  assert.equal(warn(withInfo(['Pin 7: SYNC', 'Byte 29: 03'])).length, 0);              // ids and byte indexes are bare integers
  const bad = withInfo(['Width 12 mm', 'Pitch radius 36.5 mm']);
  assert.equal(warn(bad).length, 1, bad.warnings.join('\n'));
  assert.ok(/12 in "Width 12 mm"/.test(warn(bad)[0]) && /36\.5/.test(warn(bad)[0]), warn(bad)[0]);
  assert.equal(bad.errors.length, 0);                                                  // a warning, never an error
  assert.equal(bad.verdict.captions.untraceable, 2);
  assert.equal(withInfo(['Width 12 mm']).verdict.state, 'VERIFIED');
  const lead = mutate((s) => { s.director = { what: 'A plate 12 mm wide.' }; });       // the lead text of the film is checked too
  assert.equal(warn(lead).length, 1, lead.warnings.join('\n'));
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
  for (const name of ['hub', 'switch', 'enigma', 'k20a', 'rubik', 'rtx4090', 'mos6502', 'rar5', 'winrar', 'lock', 'react']) {
    const r = validateExample(name);
    assert.equal(r.errors.length, 0, name + ': ' + r.errors.join('; '));
    assert.equal(r.verdict.state, name === 'lock' ? 'CONSISTENT' : 'VERIFIED', name);      // the lock takes every figure from one page (Lockwiki): consistent with it, not independently verified
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

test('a check that only converts units is reported, and is not evidence by itself', () => {
  const conv = (spec) => { spec.mechanism.calc.vars.x = { v: 10.05, claim: 'c1' }; spec.mechanism.drive.modes = [{ id: 'm', label: 'depth in mm', expr: 'x * 25.4', digits: 2, publish: { value: 255.27, tol: 0.05, claim: 'c1' } }]; };
  const r = mutate(conv);
  assert.equal(r.errors.length, 0, r.errors.join('; '));
  assert.equal(r.verdict.state, 'ONLY CONVERSIONS');
  assert.equal(r.verdict.conversions, 1);
  assert.equal(r.verdict.checked, 0);
  assert.ok(r.warnings.some((w) => /unit conversion/.test(w)));
  // declared by hand
  const r2 = mutate((s) => { s.mechanism.drive.modes[0].kind = 'convert'; });
  assert.equal(r2.verdict.state, 'ONLY CONVERSIONS');
  // one real check next to a conversion: VERIFIED, with the conversion not counted
  const r3 = mutate((s) => { conv(s); s.mechanism.drive.modes.push({ id: 'k', label: 'three', expr: 'x - x + 3', publish: { value: 3, claim: 'cpub' } }); });
  assert.equal(r3.verdict.state, 'VERIFIED');
  assert.equal(r3.verdict.checked, 1);
  assert.equal(r3.verdict.conversions, 1);
});

test('calc expressions can use sqrt, abs, min, max and PI without the Math prefix', () => {
  const r = mutate((s) => { s.mechanism.drive.modes[0].expr = 'sqrt(x * 3) + abs(-2) + max(1, 2) + min(5, 4) - 2 - 2 - 4 + PI - PI'; s.mechanism.drive.modes[0].publish = { value: 3, tol: 0.001, claim: 'cpub' }; });
  assert.equal(r.errors.length, 0, r.errors.join('; '));
  assert.equal(r.verdict.state, 'VERIFIED');
  const keep = mutate((s) => { s.mechanism.calc.vars.max = { v: 3, claim: 'c1' }; s.mechanism.drive.modes[0].expr = 'max'; });
  assert.equal(keep.errors.length, 0, 'a variable named like a Math function keeps its own meaning: ' + keep.errors.join('; '));
});
