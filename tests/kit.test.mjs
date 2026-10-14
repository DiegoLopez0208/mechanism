// Tests for the pure models in kit/: the DEFLATE decoder against Node's zlib (stored, fixed and dynamic Huffman blocks), CRC-32, and the RAR5 reader and writer.
// Run: node --test tests/kit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({ console, TextEncoder, TextDecoder }); ctx.window = ctx;
for (const f of ['kit/kin.js', 'kit/enigma.js', 'kit/cube.js', 'kit/rar5.js', 'kit/deflate.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const D = ctx.MX.deflate, R = ctx.MX.rar5;

// deterministic pseudo random bytes (no Math.random: a failure must be reproducible)
const prng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const words = (n, seed) => { const r = prng(seed), w = ['pack', 'unpack', 'archive', 'bytes', 'stream', 'token', 'literal', 'distance', 'length', 'huffman', 'RFC 1951', 'WinRAR']; let s = ''; for (let i = 0; i < n; i++) s += w[Math.floor(r() * w.length)] + (r() < 0.2 ? '. ' : ' '); return Buffer.from(s); };
const noise = (n, seed) => { const r = prng(seed), b = Buffer.alloc(n); for (let i = 0; i < n; i++) b[i] = Math.floor(r() * 256); return b; };
const inflates = (input, opts) => { const comp = zlib.deflateRawSync(input, opts), r = D.inflate(Uint8Array.from(comp), 0); return { r, comp }; };

test('inflate: matches zlib on text, with the block type zlib chose', () => {
  for (const [label, input] of [['empty', Buffer.alloc(0)], ['one byte', Buffer.from('a')], ['short text', Buffer.from('WinRAR packs, WinRAR packs')], ['4 KB of words', words(600, 1)], ['40 KB of words', words(6000, 2)]]) {
    for (const level of [1, 6, 9]) {
      const { r, comp } = inflates(input, { level });
      assert.ok(r.ok, label + ' level ' + level + ': ' + r.problems.join('; '));
      assert.equal(Buffer.from(r.out).toString('latin1'), input.toString('latin1'), label + ' level ' + level);
      assert.equal(r.bytesUsed, comp.length, label + ' level ' + level + ': bytes read');
    }
  }
});

test('inflate: reads dynamic Huffman blocks (the path the WinRAR sample does not use)', () => {
  const { r } = inflates(words(6000, 3), { level: 9 });
  assert.ok(r.ok, r.problems.join('; '));
  assert.ok(r.blocks.some((b) => b.dynamic), 'expected at least one dynamic block');
  assert.ok(r.tokens.some((t) => t.kind === 'match' && t.dist > 1000), 'expected far matches');
});

test('inflate: stored blocks (level 0) and incompressible data', () => {
  for (const input of [noise(1000, 4), noise(70000, 5)]) {
    const { r } = inflates(input, { level: 0 });
    assert.ok(r.ok, r.problems.join('; '));
    assert.ok(r.blocks.every((b) => b.btype === 0));
    assert.equal(Buffer.compare(Buffer.from(r.out), input), 0);
  }
  const { r } = inflates(noise(5000, 6), { level: 9 });
  assert.equal(Buffer.compare(Buffer.from(r.out), noise(5000, 6)), 0);
});

test('inflate: highly repetitive data (matches that overlap their own output)', () => {
  const input = Buffer.from('ab'.repeat(5000));
  const { r } = inflates(input, { level: 9 });
  assert.ok(r.ok, r.problems.join('; '));
  assert.equal(Buffer.compare(Buffer.from(r.out), input), 0);
  assert.ok(r.tokens.some((t) => t.kind === 'match' && t.dist < t.len), 'a match that reads bytes it is still writing');
});

test('inflate: reports a truncated or corrupt stream instead of returning text', () => {
  const comp = zlib.deflateRawSync(words(600, 7), { level: 9 });
  const cut = D.inflate(Uint8Array.from(comp.subarray(0, comp.length >> 1)), 0);
  assert.equal(cut.ok, false);
  const bad = Uint8Array.from(comp); bad[0] |= 0x06;      // BTYPE 11 is reserved
  assert.equal(D.inflate(bad, 0).ok, false);
});

test('inflate: every token says exactly which bits it used', () => {
  const comp = zlib.deflateRawSync(words(300, 8), { level: 9 }), r = D.inflate(Uint8Array.from(comp), 0);
  let last = r.tokens[0].bitStart;
  r.tokens.forEach((t) => { assert.equal(t.bitStart, last, 'tokens are contiguous'); assert.ok(t.bitEnd > t.bitStart); assert.equal(t.bits.length, t.bitEnd - t.bitStart); last = t.bitEnd; });
});

test('crc32: matches the standard check value and zlib', () => {
  assert.equal(D.crc32(Buffer.from('123456789')), 0xCBF43926);
  for (const input of [Buffer.alloc(0), Buffer.from('a'), words(500, 9), noise(3000, 10)]) assert.equal(D.crc32(input), zlib.crc32(input));
  assert.equal(R.crc32(Buffer.from('123456789')), 0xCBF43926);
});

test('canonical codes: the fixed Huffman code is the one RFC 1951 prints', () => {
  const f = D.fixedLengths(), c = D.assign(f.lit);
  assert.equal(c[0], '00110000'); assert.equal(c[143], '10111111'); assert.equal(c[144], '110010000'); assert.equal(c[255], '111111111');
  assert.equal(c[256], '0000000'); assert.equal(c[279], '0010111'); assert.equal(c[280], '11000000'); assert.equal(c[287], '11000111');
  assert.equal(D.assign([3, 3, 3, 3, 3, 2, 4, 4]).join(' '), '010 011 100 101 110 00 1110 1111');      // the worked example in RFC 1951 section 3.2.2
});

test('RAR5 vint: encode and decode round trip, with padding', () => {
  for (const n of [0, 1, 127, 128, 255, 16383, 16384, 2 ** 31, 2 ** 40]) { const b = R.vint(n), d = R.readVint(Uint8Array.from(b), 0); assert.equal(d.v, n); assert.equal(d.len, b.length); }
  assert.equal(R.readVint(Uint8Array.from([0x8E, 0x00]), 0).v, 14);      // the padded form WinRAR writes
  assert.throws(() => R.readVint(Uint8Array.from([0x80]), 0));
});

test('RAR5: build then parse gives back the file, and the CRCs check', () => {
  const data = R.ascii('hello, tests'), arc = R.build({ name: 'a.txt', data, mtime: [0, 0, 0, 0, 0, 0, 0, 0] }), p = R.parse(arc);
  const file = p.blocks.find((b) => b.type === 2);
  assert.ok(file); assert.equal(Buffer.from(file.data).toString(), 'hello, tests');
  assert.ok(p.blocks.every((b) => !b.crc || b.crc.calc === b.crc.stored), 'every header CRC32 matches');
  const bad = Uint8Array.from(arc); bad[bad.length - 5] ^= 1;      // inside the end of archive header
  const q = R.parse(bad); assert.ok(q.blocks.some((b) => b.crc && b.crc.calc !== b.crc.stored), 'a changed byte breaks a CRC');
});

test('kin: a compound train (two meshes joined by a shaft, so two mesh components) gets tooth phases for every gear', () => {
  const K = ctx.MX.kin({ bodies: ['A', 'B', 'C', 'D'], teeth: { A: 20, B: 10, C: 30, D: 10 }, free: 'A', links: [{ t: 'ext', a: 'A', b: 'B' }, { t: 'same', a: 'B', b: 'C' }, { t: 'ext', a: 'C', b: 'D' }] });
  const meshes = [{ a: 'A', b: 'B', t: 'ext', beta: 0 }, { a: 'C', b: 'D', t: 'ext', beta: 0.7 }], ph = K.phases(meshes, 'A');
  assert.deepEqual(Object.keys(ph.phi).sort(), ['A', 'B', 'C', 'D']);
  assert.ok(ph.checks.length === 2 && ph.checks.every((c) => c.ok), JSON.stringify(ph.checks));
  assert.ok(!ph.checks.some((c) => /sin conexion/.test(c.note || '')), 'no "no connection to the root" for the second stage');
});

test('react-reconcile: the model predicts what the real React DOM did in every recorded scenario', () => {
  const rctx = vm.createContext({ console }); rctx.window = rctx;
  vm.runInContext(fs.readFileSync(path.join(root, 'kit/react-reconcile.js'), 'utf8'), rctx); vm.runInContext(fs.readFileSync(path.join(root, 'examples/react/data.js'), 'utf8'), rctx);
  const S = rctx.REACT_SAMPLE, j = (a) => Array.from(a).sort().join('');
  assert.ok(S.scenarios.length >= 8);
  for (const s of S.scenarios) {
    const m = rctx.MX.react.reconcile(s.old, s.next, { keyed: s.keyed });
    assert.equal(j(m.moves), j(s.moves), s.id + ': moves'); assert.equal(j(m.inserts), j(s.inserts), s.id + ': inserts'); assert.equal(j(m.deletes), j(s.deletes), s.id + ': deletes');
    assert.equal(m.textUpdates, s.textUpdates, s.id + ': text updates'); assert.equal(m.finalOrder.join(''), s.finalOrder.join(''), s.id + ': final order');
  }
  const last = S.scenarios.find((s) => s.id === 'last-to-front'), first = S.scenarios.find((s) => s.id === 'first-to-end');
  assert.equal(last.moves.length, 3); assert.equal(first.moves.length, 1);      // the famous asymmetry, in the real React
});

test('react-reconcile: diff of what a component returns touches the same node as the real React DOM', () => {
  const rctx = vm.createContext({ console }); rctx.window = rctx;
  vm.runInContext(fs.readFileSync(path.join(root, 'kit/react-reconcile.js'), 'utf8'), rctx); vm.runInContext(fs.readFileSync(path.join(root, 'examples/react/data.js'), 'utf8'), rctx);
  const C = rctx.REACT_SAMPLE.counter, li = (t) => ({ type: 'li', text: t }), tree = (n) => ({ type: 'div', children: [{ type: 'h1', text: 'Counter' }, { type: 'p', text: 'count: ' + n }, { type: 'button', text: '+1' }, { type: 'ul', children: [li('a'), li('b'), li('c')] }] });
  const d = rctx.MX.react.diff(tree(0), tree(1));
  assert.equal(C.total, 8); assert.deepEqual(Array.from(d.updated), Array.from(C.touched)); assert.equal(d.created, C.added); assert.equal(d.removed, C.removed); assert.equal(d.kept, 8);
  const r = rctx.MX.react.diff({ type: 'div', children: [{ type: 'p', text: 'x' }] }, { type: 'span', children: [{ type: 'p', text: 'x' }] });      // a different type at the root: everything is rebuilt
  assert.equal(r.kept, 0); assert.equal(r.created, 2); assert.equal(r.removed, 2);
});
