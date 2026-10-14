/*
 * spec.js - Fig 4: buje de 3 velocidades (tipo Sturmey-Archer AW) como SPEC declarativo. No hay codigo de escena: kit/spec.js compila esto a piezas,
 * cinematica, camara, sonido y video. Todo lo que sale en pantalla viene de aca.
 *
 * Que es evidencia y que no (ver research.claims):
 *   SPEC      relaciones publicadas 75 % / 100 % / 133 %.
 *   DERIVED   dientes de la corona (60) y del sol (20), del foro CycleChat, cruzados con (60+20)/60 = 1,333 y con zr = zs + 2 zp.
 *   ESTIMATED modulo, anchos, diametros de caja, brida, rodamientos, numero de satelites y pinon: nadie los publica, van punteados.
 * No modelado: trinquetes, embrague y palanca de cambios. La trayectoria de potencia por modo esta simplificada y lo dice el video.
 */
window.SPEC = (() => {
  const M = 0.8, ZS = 20, ZP = 20, ZR = 60, ORBIT = M * (ZS + ZP) / 2, PL = [0, 90, 180, 270];
  const planets = PL.map((a, i) => ({ id: 'planet' + (i + 1), name: 'Planet gear ' + (i + 1), kind: 'gear', p: { m: M, z: ZP, width: 8, bore: 2.6 }, mat: 'steel', orbit: { center: [0, 0], r: ORBIT, a0: a, around: 'carrier' }, at: [0, 0, 0], body: 'p' + (i + 1), explode: [0, 0, 10], conf: i === 0 ? 'derived' : 'estimated', claims: i === 0 ? ['teeth'] : [], why: i === 0 ? '' : 'Same planet as planet 1; the count of four planets is not published.', info: i === 0 ? { title: 'Planet gears x4', lines: ['20 teeth, module 0.8 mm', 'zr = zs + 2 zp  ->  60 = 20 + 40', 'four planets: ESTIMATED'], conf: ['derived', 'estimated'] } : undefined, tour: i === 0 }));
  const pins = PL.map((a, i) => ({ id: 'pin' + (i + 1), name: 'Planet pin ' + (i + 1), kind: 'pin', p: { r: 2.5, len: 17 }, mat: 'chrome', orbit: { center: [0, 0], r: ORBIT, a0: a, around: 'carrier' }, at: [0, 0, 0], body: 'carrier', explode: [0, 0, 16], conf: 'estimated', why: 'Pin size is not published.', tour: false }));
  return {
    brand: { accent: '#2f9bff' }, id: 'hub', fig: 'Fig 4', kicker: 'EPICYCLIC HUB', title: 'Three-speed hub', sub: 'One planetary stage, three ratios. Sun fixed on the axle.',
    recognize: {"object":"Three-speed bicycle hub (planetary gear hub)","iconic":[{"text":"hub shell with two spoke flanges","parts":["shell","flangeL","flangeR"]},{"text":"chain sprocket","parts":["sprocket"]},{"text":"sun gear, four planets and a ring gear","parts":["sun","planet1","planet2","planet3","planet4","ring"]},{"text":"axle with lock nuts","parts":["axle","nutL","nutR"]}],"blind":{"answer":"A spoked wheel with a large cylindrical hub (confidence 50); before the spokes and rim were added the same judge said: chain-driven drum or hub with sprocket (confidence 25)","judge":"a fresh Haiku with no context, shown a label-free still (scripts/stranger.mjs)","date":"2026-10-13","ok":true}},
    research: {
      sources: [
        { id: 'sa-aw', title: 'Sturmey-Archer AW, product page', url: 'https://www.sturmey-archer.com/en/products/detail/aw', fetched: '2026-10-12', note: 'The page refuses automated fetch (HTTP 403); the ratios were read from the search result that quotes it.' },
        { id: 'cyclechat', title: 'CycleChat, "Sturmey Archer 3 speed gear ratios?"', url: 'https://www.cyclechat.net/threads/sturmey-archer-3-speed-gear-ratios.302348/', fetched: '2026-10-12', note: 'A forum post, not a manual: used only for the tooth counts, and cross-checked.' },
        { id: 'princeton', title: 'Princeton, human-powered transmission: planetary constraints', url: 'https://www.princeton.edu/~humcomp/bikes/design/desi_88.htm', fetched: '2026-10-12', note: 'Gives NR = NS + 2 NP and the assembly condition (NR + NS) / planets = integer.' },
      ],
      claims: [
        { id: 'ratios', conf: 'spec', text: 'Gear 1 is 75 %, gear 2 is 100 % (direct drive) and gear 3 is 133 %; overall range 177 %.', src: ['sa-aw'] },
        { id: 'formula', conf: 'derived', text: 'With the sun fixed, ring speed = carrier speed x (zr + zs) / zr. The planet teeth do not enter.', src: ['cyclechat', 'princeton'], cross: '(60 + 20) / 60 = 1.3333, equal to the published 133 %.' },
        { id: 'teeth', conf: 'derived', text: 'Ring 60 teeth, sun 20 teeth, so each planet has (60 - 20) / 2 = 20.', src: ['cyclechat', 'princeton'], cross: 'zr = zs + 2 zp holds (60 = 20 + 40) and 4 planets fit: (60 + 20) / 4 = 20 is an integer.' },
        { id: 'dims', conf: 'estimated', text: 'Module 0.8 mm, gear width 8 mm, shell 60 mm, axle 9.5 mm, flange and bearing sizes.', why: 'Sturmey-Archer publishes no internal drawing; sizes are chosen so the published tooth counts fit.' },
        { id: 'planets4', conf: 'estimated', text: 'Four planets.', why: 'The tooth counts allow 4 (and 5 or 2); the real number was not found in any source.' },
        { id: 'scope', conf: 'estimated', text: 'Pawls, clutch and shifter are not modelled; which member the driver and the shell lock to in each gear is simplified.', why: 'The planetary stage alone sets the ratio, so that is what is checked against the published numbers; the locking mechanism is not published in enough detail.' },
        { id: 'cog', conf: 'estimated', text: 'Chain sprocket of 18 teeth at 12.7 mm pitch, 36-hole flanges.', why: 'The cog size and spoke count vary by model; the pitch is the standard 1/2 inch bicycle chain.' },
      ],
    },
    parts: [
      { id: 'axle', name: 'Axle', kind: 'shaft', p: { r: 4.76, len: 124 }, mat: 'chrome', at: [0, 0, 0], explode: [0, 0, 0], conf: 'estimated', claims: ['dims'], info: { title: 'Axle', lines: ['fixed to the frame', 'carries the sun gear'], conf: ['estimated'] } },
      { id: 'sun', name: 'Sun gear', kind: 'gear', p: { m: M, z: ZS, width: 8, bore: 4.8 }, mat: 'steel', at: [0, 0, 0], body: 'sun', explode: [0, 0, 0], conf: 'derived', claims: ['teeth', 'formula'], info: { title: 'Sun gear', lines: ['20 teeth, fixed on the axle', 'never turns: that is the whole trick'], conf: ['derived'] } },
    ].concat(planets, pins, [
      { id: 'plateB', name: 'Carrier plate (back)', kind: 'disc', p: { r: 21, w: 2, bore: 5.1, holes: PL.map((a) => [ORBIT * Math.cos(a * Math.PI / 180), ORBIT * Math.sin(a * Math.PI / 180), 2.5]) }, mat: 'bronze', at: [0, 0, -6.5], body: 'carrier', explode: [0, 0, -20], conf: 'estimated', claims: ['dims'], tour: false },
      { id: 'plateF', cutaway: true, name: 'Carrier plate (front)', kind: 'disc', p: { r: 21, w: 2, bore: 5.1, holes: PL.map((a) => [ORBIT * Math.cos(a * Math.PI / 180), ORBIT * Math.sin(a * Math.PI / 180), 2.5]) }, mat: 'bronze', at: [0, 0, 6.5], body: 'carrier', explode: [0, 0, 22], conf: 'estimated', claims: ['dims'], info: { title: 'Planet carrier', lines: ['holds the four planets', 'its speed is the free variable'], conf: ['estimated'] } },
      { id: 'ring', name: 'Ring gear', kind: 'ring', p: { m: M, z: ZR, ro: 27.4, width: 8 }, mat: 'steel-dark', at: [0, 0, 0], body: 'ring', explode: [0, 0, -12], conf: 'derived', claims: ['teeth', 'formula'], info: { title: 'Ring gear', lines: ['60 teeth, internal', 'turns 1.333x the carrier'], conf: ['derived'] } },
      { id: 'shell', cutaway: true, name: 'Hub shell', kind: 'tube', p: { ro: 30, ri: 27.5, len: 60 }, mat: 'aluminum', at: [0, 0, 0], body: 'shell', explode: [0, 78, 0], conf: 'estimated', claims: ['dims'], info: { title: 'Hub shell', lines: ['turns with the wheel', 'its speed is the output'], conf: ['estimated'] } },
      { id: 'flangeL', name: 'Flange (left)', kind: 'flange', p: { r: 37, bore: 12.5, w: 3, n: 36, hr: 33, hd: 2.6 }, mat: 'aluminum', at: [0, 0, -30], body: 'shell', explode: [0, 0, -30], conf: 'estimated', claims: ['cog'], tour: false },
      { id: 'flangeR', cutaway: true, name: 'Flange (right)', kind: 'flange', p: { r: 37, bore: 12.5, w: 3, n: 36, hr: 33, hd: 2.6 }, mat: 'aluminum', at: [0, 0, 30], body: 'shell', explode: [0, 0, 34], conf: 'estimated', claims: ['cog'], info: { title: 'Spoke flanges', lines: ['36 holes each (ESTIMATED)', 'the wheel hangs from these'], conf: ['estimated'] } },
      { id: 'bearingL', name: 'Ball bearing (left)', kind: 'bearing', p: { ri: 5.2, ro: 12, w: 7, balls: 9 }, mat: 'chrome', at: [0, 0, -37.5], body: 'shell', explode: [0, 0, -40], conf: 'estimated', claims: ['dims'], tour: false },
      { id: 'bearingR', cutaway: true, name: 'Ball bearing (right)', kind: 'bearing', p: { ri: 5.2, ro: 12, w: 7, balls: 9 }, mat: 'chrome', at: [0, 0, 37.5], body: 'shell', explode: [0, 0, 44], conf: 'estimated', claims: ['dims'], info: { title: 'Ball bearings', lines: ['let the shell spin on the axle', 'balls and cage modelled'], conf: ['estimated'] } },
      { id: 'sprocket', name: 'Chain sprocket', kind: 'sprocket', p: { teeth: 18, pitch: 12.7, roller: 7.75, width: 2.5, bore: 7 }, mat: 'steel-dark', at: [0, 0, -50], body: 'driver', explode: [0, 0, -52], conf: 'estimated', claims: ['cog'], info: { title: 'Chain sprocket', lines: ['18 teeth, 12.7 mm pitch', 'pitch radius 36.5 mm from p / (2 sin(pi/n))'], conf: ['estimated'] } },
      { id: 'nutL', name: 'Lock nut (left)', kind: 'nut', p: { af: 17, h: 6, bore: 4.8 }, mat: 'steel', at: [0, 0, -57], explode: [0, 0, -64], conf: 'estimated', claims: ['dims'], tour: false },
      { id: 'nutR', cutaway: true, name: 'Lock nut (right)', kind: 'nut', p: { af: 17, h: 6, bore: 4.8 }, mat: 'steel', at: [0, 0, 57], explode: [0, 0, 56], conf: 'estimated', claims: ['dims'], info: { title: 'Lock nuts', lines: ['clamp the axle to the dropouts'], conf: ['estimated'] } },
    ]),
    mechanism: {
      free: 'carrier',
      links: [{ t: 'fixed', a: 'sun' }].concat(PL.flatMap((a, i) => [{ t: 'ext', a: 'sun', b: 'p' + (i + 1), carrier: 'carrier' }, { t: 'int', a: 'ring', b: 'p' + (i + 1), carrier: 'carrier' }])),
      drive: { outLabel: 'HUB SHELL',
        rpm: 36,
        modes: [
          { id: '2', label: 'Gear 2', driver: 'ring', shell: 'driver', publish: { value: 1, text: '100 %', claim: 'ratios' }, formula: 'direct drive: shell = driver', note: 'Direct drive. The planetary stage idles.' },
          { id: '3', label: 'Gear 3', driver: 'carrier', shell: 'ring', publish: { value: 4 / 3, text: '133 %', claim: 'ratios', tol: 0.005 }, formula: '(zr + zs) / zr = (60 + 20) / 60', note: 'Driver turns the carrier; the ring drives the shell.' },
          { id: '1', label: 'Gear 1', driver: 'ring', shell: 'carrier', publish: { value: 0.75, text: '75 %', claim: 'ratios', tol: 0.005 }, formula: 'zr / (zr + zs) = 60 / 80', note: 'Driver turns the ring; the carrier drives the shell.' },
        ],
      },
    },
    director: { outro: { url: 'github.com/DiegoLopez0208/mechanism', line: 'a skill for Claude Code and other coding agents' },  what: "A bicycle wheel hub with a gearbox inside. One planetary gear set gives three speeds; watch which part turns the wheel.", modeDur: 4.8, tourDur: 3.4, tour: ['sprocket', 'ring', 'axle', 'sun', 'shell', 'plateF', 'flangeR', 'bearingR', 'nutR'] },      // no planet stop: the planets orbit, and a tour shot aims at where a part was assembled (found by scripts/lint-film.mjs)
  };
})();
  // what makes it read as a bicycle wheel hub: spokes from the flanges to a (shortened) rim. Decoration, not data: the real wheel has 32-36 spokes and a rim near 300 mm radius.
  (function () {
    const R0 = 33, R1 = 72, ZF = 30, ZR = 5, why = 'Drawn so the hub reads as a wheel hub: the real wheel has 32 to 36 spokes and a rim of about 300 mm radius, shortened here so the hub stays the subject.';
    const eul = (a, dir) => { const L = Math.hypot(dir[0], dir[1], dir[2]), d = dir.map((v) => v / L), th = Math.acos(d[2]), ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(th), st = Math.sin(th);
      // R = Rz(a) * Ry(th): the matrix that takes z onto the spoke direction; three.js Euler XYZ from its elements
      const m11 = ca * ct, m12 = -sa, m13 = ca * st, m23 = sa * st, m33 = ct, y = Math.asin(Math.max(-1, Math.min(1, m13))), x = Math.atan2(-m23, m33), z = Math.atan2(-m12, m11); return [x * 180 / Math.PI, y * 180 / Math.PI, z * 180 / Math.PI]; };
    [['L', -ZF, -ZR], ['R', ZF, ZR]].forEach(([side, z0, z1]) => { for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + (side === 'R' ? Math.PI / 18 : 0), p0 = [R0 * Math.cos(a), R0 * Math.sin(a), z0], p1 = [R1 * Math.cos(a), R1 * Math.sin(a), z1], dir = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], len = Math.hypot(dir[0], dir[1], dir[2]);
      window.SPEC.parts.push({ id: 'spoke' + i + side, name: 'Spoke ' + (i + 1) + ' (' + side + ')', kind: 'pin', p: { r: 0.8, len }, mat: 'steel', at: [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2], rot: eul(a, dir), body: 'shell', explode: [0, 0, side === 'L' ? -14 : 14], conf: 'estimated', why, decor: true, tour: false }); } });
    window.SPEC.parts.push({ id: 'rim', name: 'Rim (shortened)', kind: 'tube', p: { ro: R1 + 4, ri: R1 - 1, len: 12 }, mat: 'aluminum-dark', at: [0, 0, 0], body: 'shell', explode: [0, 0, 0], conf: 'estimated', why, decor: true, tour: false });
    window.SPEC.recognize.iconic.push({ text: 'spokes to a rim, like a bicycle wheel', partsPrefix: 'spoke' });
  })();
