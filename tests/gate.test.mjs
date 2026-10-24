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
  for (const f of ['kit/kin.js', 'kit/enigma.js', 'kit/cube.js', 'kit/rar5.js', 'kit/deflate.js', 'kit/react-reconcile.js', 'kit/spec-core.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: path.join(root, f) });
  (extra || []).forEach((f) => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }));
  return ctx;
}
const validateExample = (name) => {
  const dir = path.join(root, 'examples', name), data = path.join(dir, 'data.js'), ctx = load(fs.existsSync(data) ? [data, path.join(dir, 'spec.js')] : [path.join(dir, 'spec.js')]);
  return ctx.MX.spec.validate(ctx.SPEC);
};
const MX = load().MX;
test('presentation configuration is validated without promoting the evidence verdict', () => {
  const example = path.join(root, 'examples/lock/spec.js'), c = load([example]);
  const baseline = c.MX.spec.validate(c.SPEC);
  for (const method of ['studio', 'workflow', 'paper']) for (const background of ['graphite', 'blueprint', 'porcelain', 'ivory']) {
    const result = c.MX.spec.validate({ ...c.SPEC, presentation: { method, background } });
    assert.deepEqual(result.errors, baseline.errors); assert.equal(result.verdict.state, baseline.verdict.state);
  }
  assert.ok(c.MX.spec.validate({ ...c.SPEC, presentation: 'paper' }).errors.some(e => e.includes('presentation must be')));
  assert.ok(c.MX.spec.validate({ ...c.SPEC, presentation: { method: 'oops' } }).errors.some(e => e.includes('unknown presentation method')));
  assert.ok(c.MX.spec.validate({ ...c.SPEC, presentation: { background: 'oops' } }).errors.some(e => e.includes('unknown presentation background')));
  assert.ok(c.MX.spec.validate({ ...c.SPEC, presentation: { backgroudn: 'ivory' } }).warnings.some(e => e.includes('unknown presentation key')));
});
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

test('unknown spec and part keys warn without changing the evidence verdict', () => {
  const r = mutate(s => { s.cutawya = 0.8; s.parts[0].cutawya = 0.8; });
  assert.equal(r.verdict.state, 'VERIFIED'); assert.equal(r.errors.length, 0);
  assert.ok(r.warnings.some(w => w === 'unknown spec key: cutawya'));
  assert.ok(r.warnings.some(w => /part a: unknown part key: cutawya/.test(w)));
  for (const name of ['hub', 'switch', 'enigma', 'k20a', 'rubik', 'rtx4090', 'mos6502', 'rar5', 'winrar', 'lock', 'react'])
    assert.ok(!validateExample(name).warnings.some(w => /unknown (spec|part) key/.test(w)), name);
});
test('displayed calculations without comparators are disclosed and do not earn checks', () => {
  const r = mutate(s => { s.mechanism.drive.modes.push({ id: 'density', label: 'Density', expr: 'x / 2' }); });
  assert.equal(r.verdict.checked, 1); assert.equal(r.verdict.state, 'VERIFIED');
  assert.equal(r.verdict.uncheckedCalculations.length, 1);
  assert.equal(r.verdict.uncheckedCalculations[0].id, 'density');
  assert.ok(r.warnings.some(w => /Density.*without a published comparator/.test(w)));
  assert.ok(r.lines.some(w => /^verdict: VERIFIED.*1 displayed without a published comparator/.test(w)));
  assert.equal(mutate(() => {}).verdict.uncheckedCalculations.length, 0);
});
test('tooth counts outside meshing links are disclosed; kinematic teeth are not', () => {
  const hub = validateExample('hub'), enigma = validateExample('enigma');
  assert.deepEqual(Array.from(hub.verdict.uncheckedTeeth), ['sprocket']);
  assert.deepEqual(Array.from(enigma.verdict.uncheckedTeeth).sort(), ['ratchetL', 'ratchetM', 'ratchetR']);
  assert.ok(hub.warnings.some(w => /sprocket: tooth count is outside/.test(w)));
});
test('unused inputs and inputs feeding only unchecked calculations are disclosed, including MOS 6502 pin count', () => {
  const r = mutate(s => {
    s.mechanism.calc.vars.unused = { v: 7, label: 'seven', claim: 'c1' };
    s.mechanism.calc.vars.densityInput = { v: 4, claim: 'c1' };
    s.mechanism.drive.modes.push({ id: 'd', label: 'Density', expr: 'densityInput / 2' });
  });
  assert.equal(r.verdict.checked, 1); assert.equal(r.verdict.state, 'VERIFIED');
  assert.deepEqual(Array.from(r.verdict.uncheckedInputs, v => v.id).sort(), ['densityInput', 'unused']);
  assert.ok(r.warnings.some(w => /calc input unused.*not used by any calculated mode/.test(w)));
  const mos = validateExample('mos6502');
  assert.ok(mos.verdict.uncheckedInputs.some(v => v.id === 'pins'));
  assert.ok(mos.warnings.some(w => /calc input pins.*no published mode comparator/.test(w)));
});
test('size confidence distinguishes no, partial and complete source comparisons', () => {
  const s = good(), part = s.parts[0];
  assert.equal(MX.spec.sizeEvidence(part).label, 'SIZE NOT COMPARED');
  assert.deepEqual(Array.from(MX.spec.sizeEvidence({ id: 'cubie', kind: 'cubie', p: { s: 18.67 } }).unchecked), ['s']);
  part.params = { w: { value: 10, conf: 'spec', claim: 'c1' }, h: { value: 10, conf: 'estimated', why: 'assumed' } };
  let row = MX.spec.validate(s).verdict.sizeEvidence[0];
  assert.equal(row.status, 'partly compared'); assert.deepEqual(Array.from(row.compared), ['w']);
  assert.ok(row.unchecked.includes('h')); assert.equal(row.label, 'SIZE 1/4 COMPARED');
  for (const key of Object.keys(part.p)) part.params[key] = { value: part.p[key], conf: 'spec', claim: 'c1' };
  assert.equal(MX.spec.validate(s).verdict.sizeEvidence[0].status, 'compared');
  part.params.w.value = 9;
  assert.ok(!MX.spec.validate(s).verdict.sizeEvidence[0].compared.includes('w'));
});

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
  assert.ok(r.lines.includes('dimensions: 1 checked against a document, 0 derived, 0 measured (with uncertainty), 0 declared by the user, 1 estimated; 0 independently verified; 1 part(s) mix confidence classes (spec, estimated)'), r.lines.join('\n'));
});

test('params: published + derived dimensions (none estimated) are not reported as estimated', () => {
  const r = mutate((s) => { s.research.claims.push({ id: 'cd', conf: 'derived', text: 'h = w, by symmetry of the sheet', src: ['s1'], cross: 'the sheet prints h = 10 on its side view' });
    s.parts[0].params = { w: { value: 10, conf: 'spec', claim: 'c1' }, h: { value: 10, conf: 'derived', claim: 'cd' } }; });
  assert.equal(r.errors.length, 0, r.errors.join('; '));
  assert.equal(r.verdict.mixed, 1);
  const line = r.lines.find((l) => l.startsWith('dimensions: '));
  assert.equal(line, 'dimensions: 1 checked against a document, 1 derived, 0 measured (with uncertainty), 0 declared by the user, 0 estimated; 0 independently verified; 1 part(s) mix confidence classes (spec, derived)');
  assert.doesNotMatch(line, /estimated dimensions|mix sourced and estimated/);
  assert.equal(r.verdict.state, mutate(() => {}).verdict.state, 'the wording does not move the verdict');
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
    // BH-1: VERIFIED needs a check whose sources are disjoint from its inputs'. The lock takes every figure from one page (Lockwiki); switch compares
    // its travel with the very claim it was drawn from; k20a and rubik compute from inputs on the same page as the published figure (not traced: the
    // gate cannot establish independence); enigma's test vectors cite no claim. All five pass as CONSISTENT, none as VERIFIED.
    assert.equal(r.verdict.state, ['lock', 'switch', 'enigma', 'k20a', 'rubik'].includes(name) ? 'CONSISTENT' : 'VERIFIED', name);
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

/* ---- BH-1: evidence classes and independence (each of these passed as VERIFIED, or could not be written honestly, before) */
const GX = load([path.join(root, 'kit/geom2d.js')]).MX;
const plate = (src, conf, extra = {}) => ({
  id: 'plate', title: 'Plate',
  research: { sources: [src], claims: [{ id: 'size', conf, text: 'The plate is 120 mm wide and 80 mm high.', src: [src.id] }] },
  parts: [{ id: 'plate', name: 'Plate', kind: 'drawing', conf, claims: ['size'], p: { unit: 'mm', outline: { type: 'rect', w: 120, h: 80 } },
    params: { 'outline.w': { value: 120, unit: 'mm', conf, claim: 'size' }, 'outline.h': { value: 80, unit: 'mm', conf, claim: 'size' } } }],
  paperScene: { kind: 'geometry' }, recognize: { object: 'a plate', iconic: [{ text: 'flat', parts: ['plate'] }, { text: 'rectangular', parts: ['plate'] }] }, ...extra,
});
const DOC = { id: 'sheet', title: 'Drawing sheet', url: 'https://github.com/DiegoLopez0208/mechanism', fetched: '2026-10-19' };
const USER = { id: 'brief', kind: 'user', title: 'The request of the person who asked', received: '2026-10-19', note: 'plate 120 x 80 mm' };

test('a drawing whose only checks are its own dimensions against the figures they were drawn from is CONSISTENT, never VERIFIED', () => {
  const r = GX.spec.validate(plate(DOC, 'spec'));
  assert.equal(r.errors.length, 0, r.errors.join('; '));
  assert.equal(r.verdict.state, 'CONSISTENT', 'two dimensions transcribed from one sheet are not independent evidence (Draft 0.4 said VERIFIED here)');
  assert.equal(r.verdict.independent, 0); assert.equal(r.verdict.transcription, 2);
  assert.ok(r.lines.some((l) => /^provenance: 0 independent, 0 same source as the inputs, 0 with no sourced inputs, 2 dimension\(s\) compared with the figure they were drawn from \(never independent\)/.test(l)), r.lines.join('\n'));
  assert.ok(r.warnings.some((w) => /^CONSISTENT, not VERIFIED: .*2 compare a drawn dimension with the figure it was drawn from/.test(w)), r.warnings.join('\n'));
});

test('numbers the person who asked gave: a user source with no url, USER claims and dimensions, never VERIFIED', () => {
  const r = GX.spec.validate(plate(USER, 'user'));
  assert.equal(r.errors.length, 0, 'no url is needed (and none invented) for a user request: ' + r.errors.join('; '));
  assert.equal(r.verdict.state, 'CONSISTENT'); assert.equal(r.verdict.userDeclared, 2); assert.equal(r.verdict.userSources, 1); assert.equal(r.verdict.independent, 0);
  assert.ok(r.warnings.some((w) => /2 of them given by the person who asked, not published/.test(w)), r.warnings.join('\n'));
  // the summary names them for what they are: declared by the user, none checked against a document, none independently verified
  const dims = r.lines.find((l) => l.startsWith('dimensions: '));
  assert.equal(dims, 'dimensions: 0 checked against a document, 0 derived, 0 measured (with uncertainty), 2 declared by the user, 0 estimated; 0 independently verified; 0 part(s) mix confidence classes');
  assert.doesNotMatch(dims, /compared with (their|a) source/, 'a number the user gave is not "compared with a source"');
  const views = GX.geom2d.viewSet(plate(USER, 'user'), GX.spec).parts.plate.dimCount;
  assert.equal(views.user, 2); assert.equal(views.compared, 0, 'a number the person gave is not "compared with a source"');
  // the request is not a publication, and a document is not the request
  const asSpec = GX.spec.validate(plate(USER, 'spec')); assert.ok(asSpec.errors.some((e) => /is SPEC but cites the request of the person who asked/.test(e)), asSpec.errors.join('\n'));
  const docAsUser = GX.spec.validate(plate(DOC, 'user')); assert.ok(docAsUser.errors.some((e) => /is USER .* but cites a document/.test(e)), docAsUser.errors.join('\n'));
  const withUrl = GX.spec.validate(plate({ ...USER, url: 'https://example.invalid/request' }, 'user')); assert.ok(withUrl.errors.some((e) => /it has no url, do not give it one/.test(e)));
  const noUrl = GX.spec.validate(plate({ id: 'sheet', title: 'A sheet', fetched: '2026-10-19' }, 'spec')); assert.ok(noUrl.errors.some((e) => /no url: if the numbers come from the person who asked, declare the source kind: "user"/.test(e)), noUrl.errors.join('\n'));
  const odd = GX.spec.validate(plate({ ...USER, kind: 'chat' }, 'user')); assert.ok(odd.errors.some((e) => /unknown kind "chat"/.test(e)));
});

test('the minimal spec in the Draft SKILL.md passes the gate as written, and the gate says what SKILL.md says it says', () => {
  const md = fs.readFileSync(path.join(root, 'plugins/mechanism-draft/SKILL.md'), 'utf8'), code = /```js\n([\s\S]*?)```/.exec(md);
  assert.ok(code, 'SKILL.md has a js example'); const src = code[1].replace(/^ {3}/gm, '');
  assert.match(src, /src: \['request'\]/, 'the example shows src as an array'); assert.doesNotMatch(src.replace(/\/\/.*$/gm, ''), /[{,]\s*source\s*:/, 'and never a "source" field');
  const c = load([path.join(root, 'kit/geom2d.js')]); vm.runInContext(src, c);
  const r = c.MX.spec.validate(c.SPEC); assert.equal(r.errors.length, 0, r.errors.join('; ')); assert.equal(r.verdict.state, 'CONSISTENT');
  const dims = r.lines.find((l) => l.startsWith('dimensions: ')); assert.ok(md.includes(dims.replace(/; \d+ part\(s\).*$/, '')), 'SKILL.md quotes the real dimensions line: ' + dims);
});

test('placeholder URLs are refused, on every reserved domain and their subdomains; real ones are not', () => {
  for (const url of ['https://example.invalid/pedido-usuario', 'https://foo.test/', 'http://docs.example/a', 'https://example.com', 'https://www.example.org/x', 'https://cdn.example.net/a.pdf', 'https://EXAMPLE.NET./', 'https://example.com:8080/x', 'https://user@example.org/', 'https://a.b.invalid', 'http://localhost:3000/', 'http://127.0.0.1/']) {
    assert.ok(GX.spec.placeholderUrl(url), url + ' should be refused');
    assert.ok(GX.spec.validate(plate({ ...DOC, url }, 'spec')).errors.some((e) => /placeholder text or an example URL/.test(e)), url);
  }
  for (const url of ['https://www.raspberrypi.com/documentation/computers/sbcs.html', 'https://pip-assets.raspberrypi.com/a.pdf', 'https://contest.com/', 'https://testing.dev/', 'https://example.co.uk/', 'https://en.wikipedia.org/wiki/Example.com'])
    assert.ok(!GX.spec.placeholderUrl(url), url + ' is a real address');
});

test('a dimension has the class of its evidence: a SPEC number its claim does not state is refused on a drawing (it is DERIVED)', () => {
  // the Pico case: 49 = 51 - 2 was declared SPEC, citing a claim that prints 2 and 51
  const s = plate(DOC, 'spec'); s.research.claims[0].text = 'The plate is 120 mm wide; the second edge is 40 mm from the first, twice.';
  const r = GX.spec.validate(s);
  assert.ok(r.errors.some((e) => /params\.outline\.h = 80 is SPEC but its claim size does not state 80: if it is computed from stated numbers it is DERIVED/.test(e)), r.errors.join('\n'));
  s.research.claims.push({ id: 'h', conf: 'derived', text: 'The height is 2 x 40 = 80 mm.', src: ['sheet'], cross: 'the sheet draws both halves 40 mm' });
  s.parts[0].params['outline.h'] = { value: 80, unit: 'mm', conf: 'derived', claim: 'h' };
  const ok = GX.spec.validate(s); assert.equal(ok.errors.length, 0, ok.errors.join('; ')); assert.equal(ok.verdict.dimensionsBy.derived, 1); assert.equal(ok.verdict.dimensionsBy.spec, 1);
  s.parts[0].params['outline.h'].conf = 'spec'; assert.ok(GX.spec.validate(s).errors.some((e) => /is SPEC but its claim h is DERIVED/.test(e)));
  // the older 3D parts get a warning, not an error (their specs predate the rule)
  const old = mutate((q) => { q.parts[0].params = { w: { value: 10, conf: 'spec', claim: 'cpub' } }; });
  assert.ok(!old.errors.some((e) => /does not state/.test(e)) && old.warnings.some((w) => /params\.w = 10 is SPEC but its claim cpub does not state 10/.test(w)), old.warnings.join('\n'));
});

test('a dimension read off a picture is MEASURED with its method and uncertainty, and is never counted as printed by the source', () => {
  const s = plate(DOC, 'spec');
  s.research.claims.push({ id: 'px', conf: 'measured', text: 'The height reads 80 mm off Figure 3.', src: ['sheet'], error: 'about 0.1 mm at a 6x render' });
  s.parts[0].params['outline.h'] = { value: 80, unit: 'mm', conf: 'measured', claim: 'px', tol: 0.1 };
  const missing = GX.spec.validate(s); assert.ok(missing.errors.some((e) => /is MEASURED but its claim px does not say how \(method/.test(e)), missing.errors.join('\n'));
  Object.assign(s.research.claims[1], { method: 'read off Figure 3 rendered at 6x, scaled by its printed 120 mm', uncertainty: 0.1 });
  const r = GX.spec.validate(s); assert.equal(r.errors.length, 0, r.errors.join('; ')); assert.equal(r.verdict.state, 'CONSISTENT'); assert.equal(r.verdict.dimensionsBy.measured, 1);
  const dc = GX.geom2d.viewSet(s, GX.spec).parts.plate.dimCount; assert.equal(dc.measured, 1); assert.equal(dc.published, 1); assert.equal(dc.compared, 1, 'a reading off a picture is not "compared with a source"');
  s.research.claims[1].uncertainty = -1; assert.ok(GX.spec.validate(s).errors.some((e) => /uncertainty must be a number/.test(e)));
});

// A spec is JavaScript: under check-spec.mjs it must not write, spawn or read outside its folder, even through a host object.
test('check-spec contains a spec that tries to leave node:vm', { skip: !process.allowedNodeEnvironmentFlags.has('--permission') && 'no permission model in this Node' }, async () => {
  const { spawnSync } = await import('node:child_process'), os = await import('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mx-evil-')), marker = path.join(dir, 'escaped.txt');
  try {
    fs.writeFileSync(path.join(dir, 'spec.js'), `const P = console.log.constructor.constructor('return process')(), seen = [];
      try { P.getBuiltinModule('fs').writeFileSync(${JSON.stringify(marker)}, 'x'); seen.push('WROTE'); } catch (e) { seen.push(e.code); }
      try { P.getBuiltinModule('child_process').execFileSync(P.execPath, ['-v']); seen.push('SPAWNED'); } catch (e) { seen.push(e.code); }
      try { P.getBuiltinModule('fs').readFileSync(${JSON.stringify(path.join(os.homedir(), '.mx-never-here'))}); seen.push('READ'); } catch (e) { seen.push(e.code); }
      console.log('ESCAPE ' + seen.join(' ')); window.SPEC = { id: 'evil', title: 'evil' };`);
    const r = spawnSync(process.execPath, [path.join(root, 'scripts/check-spec.mjs'), path.join(dir, 'spec.js')], { encoding: 'utf8' });
    const line = (/^ESCAPE .*$/m.exec(r.stdout) || [''])[0];
    assert.equal(line, 'ESCAPE ERR_ACCESS_DENIED ERR_ACCESS_DENIED ERR_ACCESS_DENIED', r.stdout + r.stderr);
    assert.ok(!fs.existsSync(marker));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
