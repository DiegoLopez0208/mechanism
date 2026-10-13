/*
 * spec.js - Rubik's Cube: 26 cubies that really turn. Nothing about the puzzle is tabulated: kit/cube.js rotates the layers in 3D and the numbers the film
 * shows are read off the pieces. The gate runs every phase and fails if the model disagrees with what is published: the 20-move superflip must flip all
 * 12 edges and leave the 8 corners alone, the longest period must be 1,260, the positions must be 43,252,003,274,489,856,000.
 * Run "node scripts/check-spec.mjs examples/rubik/spec.js".
 *
 * Frame: +x right, +y up, +z towards the viewer; the cubie at (x, y, z) in -1..1 sits at pitch * (x, y, z).
 */
(function () {
  const PITCH = 56 / 3, FACE = { y: ['U', 'D'], z: ['F', 'B'], x: ['R', 'L'] };
  const COLOR = { '+y': '#f4f4ef', '-y': '#f2c40f', '+z': '#1a9a4a', '-z': '#1f5fbf', '+x': '#c8281e', '-x': '#f07a12' };
  const parts = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (!x && !y && !z) continue;
    const name = ['y', 'z', 'x'].map((ax) => { const v = { x, y, z }[ax]; return v ? FACE[ax][v > 0 ? 0 : 1] : ''; }).join(''), n = [x, y, z].filter((v) => v).length;
    const stickers = {}; [['x', x], ['y', y], ['z', z]].forEach(([ax, v]) => { if (v) stickers[(v > 0 ? '+' : '-') + ax] = COLOR[(v > 0 ? '+' : '-') + ax]; });
    const kind = ['', 'center', 'edge', 'corner'][n], k = n === 1 ? 24 : 15;
    const decals = name === 'U' ? [{ face: '+y', at: [0, PITCH / 2 + 0.5, 0], w: 14, h: 6, px: 30, items: [{ t: 'text', s: "Rubik's", x: 0, y: 0, size: 4.8, weight: 900, spacing: 0.1, color: '#0b0c0e', font: 'serif' }] }] : undefined;
    parts.push({ id: name, decals, name: kind[0].toUpperCase() + kind.slice(1) + ' ' + name, kind: 'cubie', p: { s: PITCH, stickers }, at: [x * PITCH, y * PITCH, z * PITCH], explode: [x * k, y * k, z * k], cubie: [x, y, z], conf: 'derived', claims: ['cubie', 'pieces26'], tour: n === 3 && name === 'UFR' || n === 2 && name === 'UF' || n === 1 && name === 'U',
      info: { title: kind[0].toUpperCase() + kind.slice(1) + ' ' + name, lines: [n === 3 ? '8 corners: three stickers, can twist in place' : n === 2 ? '12 edges: two stickers, can flip in place' : '6 centres: one sticker, never leave their place', 'Each is an 18.67 mm cube (a third of 56 mm)', 'Sticker colours follow the usual scheme: not in the sources'], conf: ['spec', 'derived', 'estimated'] } });
  }

  window.SPEC = {
    id: 'rubik', fig: 'Fig 9', kicker: 'REAL PUZZLE', title: "Rubik's Cube", sub: '26 pieces that really turn. The facts come out of them.',
    research: {
      sources: [
        { id: 'wiki-rubik', title: "Rubik's Cube - Wikipedia", url: 'https://en.wikipedia.org/wiki/Rubik%27s_Cube', fetched: '2026-10-13', note: 'Size 5.6 cm per side; 26 unique miniature cubes (21 pieces counting the core and the 20 movable ones); the total number of arrangements, 43,252,003,274,489,856,000, as 8! x 3^7 x 12!/2 x 2^11; God\'s number 20; maximum period of a move sequence 1260; notation (F B U D L R, prime = anticlockwise, 2 = half turn). The first 100,000 characters were read. The page gives 5.6 cm, not 57 mm, and does not give the superflip length.' },
        { id: 'wiki-superflip', title: 'Superflip - Wikipedia', url: 'https://en.wikipedia.org/wiki/Superflip', fetched: '2026-10-13', note: 'All edge and corner pieces in the correct permutation, corners correctly oriented, every edge flipped. Shortest path from solved: 20 moves in the half-turn metric. Gives the sequence U R2 F B R B2 R U2 L B2 R U\' D\' R2 F R\' L B2 U2 F2 (20 moves HTM).' },
      ],
      claims: [
        { id: 'size', conf: 'spec', text: 'The cube is 5.6 cm on each side.', src: ['wiki-rubik'] },
        { id: 'pieces26', conf: 'spec', text: '26 unique miniature cubes (6 centres, 12 edges, 8 corners).', src: ['wiki-rubik'] },
        { id: 'cubie', conf: 'derived', text: 'Each cubie is 18.67 mm: three of them side by side make the published 56 mm.', src: ['wiki-rubik'], cross: 'Assumes no gaps between cubies. 3 x 18.67 = 56.0 mm, the published 5.6 cm.' },
        { id: 'positions', conf: 'spec', text: 'Total arrangements 43,252,003,274,489,856,000: 8! corner arrangements x 3^7 twists x 12!/2 edge arrangements x 2^11 flips.', src: ['wiki-rubik'] },
        { id: 'maxperiod', conf: 'spec', text: 'The maximum period for a move sequence is 1260.', src: ['wiki-rubik'] },
        { id: 'alg1260', conf: 'derived', text: "R U2 D' B D' brings the cube back after exactly 1,260 repeats.", src: ['wiki-rubik'], cross: 'Computed by the model in kit/cube.js by repeating the sequence until the cube is solved; it equals the published maximum period, 1,260.' },
        { id: 'superflip', conf: 'spec', text: 'The superflip (every edge flipped, everything else in place) is reached from solved in 20 moves in the half-turn metric by U R2 F B R B2 R U2 L B2 R U\' D\' R2 F R\' L B2 U2 F2.', src: ['wiki-superflip'] },
        { id: 'notation', conf: 'spec', text: 'Notation: F B U D L R name the faces; a prime is an anticlockwise turn; a 2 is a half turn.', src: ['wiki-rubik'] },
        { id: 'livery', conf: 'estimated', text: "The centre of the white face carries the Rubik's wordmark.", why: "Drawn from memory of the product. None of the opened sources describes the print; only type is used." },
        { id: 'scheme', conf: 'estimated', text: 'Sticker colours: white up, yellow down, green front, blue back, red right, orange left.', why: 'The usual scheme; none of the sources states it.' },
      ],
    },
    parts,
    mechanism: {
      cube: { pieces: 26, pitch: PITCH, quarter: 0.34, half: 0.5 },
      drive: { modes: [
        { id: 'sexy', label: "R U R' U' x 6", alg: "R U R' U'", repeat: 6, metric: 'order', unit: 'repeats', formula: "repeat R U R' U' until the cube is back", ends: 'solved' },
        { id: 'period', label: 'Longest period', alg: "R U2 D' B D'", back: true, metric: 'order', unit: 'repeats', formula: "R U2 D' B D', then undone; repeated it takes", publish: { value: 1260, text: '1,260', claim: 'maxperiod' }, ends: 'solved' },
        { id: 'superflip', label: 'Superflip', alg: "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2", metric: 'superflip', formula: '12 edges flipped, every other piece in place', publish: { length: 20, claim: 'superflip' } },
        { id: 'positions', label: 'Positions', metric: 'positions', formula: '8! x 3^7 x 12! / 2 x 2^11', publish: { text: '43,252,003,274,489,856,000', claim: 'positions' } },
      ] },
    },
    director: { hold: 2.5, zoom: 0.92, tour: ['UFR', 'UF', 'U'] },
  };
})();
