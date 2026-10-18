/*
 * kit/cube.js - the Rubik's Cube as 26 cubies, pure (runs in Node and in the browser, no three.js).
 *
 * Each cubie keeps where it is (pos, integers in -1..1) and how it is turned (R, a 3x3 integer rotation, row-major). A face turn rotates the 9 cubies of one
 * layer by a quarter about the face normal, clockwise as seen from outside the cube (the standard notation: U D R L F B, ' = anticlockwise, 2 = half turn).
 * Nothing about the puzzle is tabulated: the permutations and the twists fall out of the geometry, so the published facts (the superflip, the
 * longest period, the number of positions) are checked against a model that has no knowledge of them.
 *
 * Axes: +x = R, +y = U, +z = F.
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {}), C = (MX.cube = {});
  const FACES = { U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1] };
  C.FACES = FACES;
  const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const mul = (a, b) => { const o = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return o; };
  const app = (m, v) => [0, 1, 2].map((i) => m[i * 3] * v[0] + m[i * 3 + 1] * v[1] + m[i * 3 + 2] * v[2]);
  const same = (a, b) => a.every((x, i) => x === b[i]);
  // rotation by q clockwise quarters (seen from outside) about the unit axis n: Rodrigues with exact integer cos / sin
  C.rot = (n, q) => {
    const k = (((q % 4) + 4) % 4), cs = [1, 0, -1, 0][k], sn = [0, -1, 0, 1][k], [x, y, z] = n;
    return [cs + (1 - cs) * x * x, (1 - cs) * x * y - sn * z, (1 - cs) * x * z + sn * y, (1 - cs) * y * x + sn * z, cs + (1 - cs) * y * y, (1 - cs) * y * z - sn * x, (1 - cs) * z * x - sn * y, (1 - cs) * z * y + sn * x, cs + (1 - cs) * z * z];
  };
  C.create = () => {
    const st = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) if (x || y || z) st.push({ home: [x, y, z], pos: [x, y, z], R: I3.slice() });
    return st;
  };
  C.clone = (st) => st.map((c) => ({ home: c.home, pos: c.pos.slice(), R: c.R.slice() }));
  const inLayer = (c, face) => c.pos[0] * FACES[face][0] + c.pos[1] * FACES[face][1] + c.pos[2] * FACES[face][2] > 0;
  C.inLayer = inLayer;
  // one move: { face, q } with q = 1 (clockwise), 2 (half) or 3 (anticlockwise); returns the same state, changed
  C.turn = (st, mv) => {
    const m = C.rot(FACES[mv.face], mv.q);
    st.forEach((c) => { if (inLayer(c, mv.face)) { c.pos = app(m, c.pos); c.R = mul(m, c.R); } });
    return st;
  };
  C.parse = (alg) => alg.trim().split(/\s+/).filter(Boolean).map((t) => { const f = t[0]; if (!FACES[f]) throw new Error('movimiento desconocido: ' + t); return { face: f, q: t[1] === "'" ? 3 : t[1] === '2' ? 2 : 1, text: t }; });
  C.invert = (moves) => moves.slice().reverse().map((m) => { const q = (4 - m.q) % 4; return { face: m.face, q, text: m.face + (q === 3 ? "'" : q === 2 ? '2' : '') }; });
  C.run = (st, moves) => { moves.forEach((m) => C.turn(st, m)); return st; };
  const kind = (c) => c.home.filter((v) => v).length;      // 1 center, 2 edge, 3 corner
  C.kind = (c) => ['', 'center', 'edge', 'corner'][kind(c)];
  // where the cube stands: pieces in place, flipped edges, twisted corners (centres are single-coloured, so their turn does not show)
  C.classify = (st) => {
    const r = { solved: true, edgesInPlace: 0, edgesFlipped: 0, cornersInPlace: 0, cornersTwisted: 0, centresInPlace: 0 };
    st.forEach((c) => {
      const k = kind(c), inPlace = same(c.pos, c.home);
      if (k === 1) { if (inPlace) r.centresInPlace++; else r.solved = false; return; }
      if (k === 2) { if (inPlace) { r.edgesInPlace++; if (!same(c.R, I3)) r.edgesFlipped++; } }
      else if (inPlace) { r.cornersInPlace++; if (!same(c.R, I3)) r.cornersTwisted++; }
      if (!inPlace || !same(c.R, I3)) r.solved = false;
    });
    return r;
  };
  // the smallest n > 0 for which repeating the sequence n times brings the cube back to where it started
  C.order = (moves, cap) => { const st = C.create(); for (let n = 1; n <= (cap || 5000); n++) { C.run(st, moves); if (C.classify(st).solved) return n; } return null; };
  // positions reachable: 8! corner arrangements x 3^7 twists x 12!/2 edge arrangements x 2^11 flips (the last twist, the last flip and the parity are forced)
  C.positions = () => { const f = (n) => { let r = 1n; for (let i = 2n; i <= BigInt(n); i++) r *= i; return r; }; return f(8) * 3n ** 7n * (f(12) / 2n) * 2n ** 11n; };
})(typeof window !== 'undefined' ? window : globalThis);
