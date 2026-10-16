/*
 * spec.js - NVIDIA GeForce RTX 4090 Founders Edition, taken apart. Almost nothing about the inside of a graphics card is published, but its
 * performance numbers are, and they come out of each other: TFLOPS = cores x 2 x clock, bandwidth = bus x data rate / 8, fillrate = units x clock.
 * The gate evaluates each of them from the variables on the card and compares the result with the published figure; every variable carries its claim,
 * so an estimated assumption (the memory chips) is drawn in a different colour from a published one.
 * The livery (graphite shroud, chrome ring, white lettering with a green line) is drawn from memory of product photos: none of the opened sources
 * describes it, so it is ESTIMATED and says so. Only type and colour are used, no logo files.
 * Run "node scripts/check-spec.mjs examples/rtx4090/spec.js".
 *
 * Frame: the card lies on the xy plane (x = length 304 mm, y = width 137 mm), z is its thickness; `orient` stands it up for the camera.
 */
(function () {
  const parts = [], X0 = -22;       // x of the GPU die: the board is shifted towards the bracket end
  const info = (title, lines, conf) => ({ title, lines, conf });
  const WHITE = '#f4f5f7', GREEN = '#76b900';
  const GFX = (x, y, rot) => ({ face: '+z', at: [x, y, 1.55], w: 80, h: 22, px: 12, rot: rot || 0, glow: '#ffffff', glowK: 0.9, items: [
    { t: 'text', s: 'GEFORCE', x: 0, y: 5.2, size: 7.2, weight: 800, spacing: 1.6, color: WHITE }, { t: 'text', s: 'RTX', x: 0, y: -3.6, size: 11, weight: 800, spacing: 3, color: WHITE }, { t: 'rect', x: 0, y: -10.2, w: 62, h: 0.9, color: GREEN }] });
  parts.push(
    { id: 'backplate', name: 'Backplate', kind: 'plate', p: { w: 198, h: 112, r: 6, t: 2.5 }, mat: 'graphite', at: [-43, 0, -3.2], explode: [0, 0, -34], cutaway: 0.97, conf: 'estimated', claims: ['livery'], why: 'The size of the backplate is not published.',
      decals: [{ face: '-z', at: [45, 0, -1.28], w: 90, h: 30, px: 12, rot: 90, items: [{ t: 'text', s: 'GEFORCE RTX', x: 0, y: 5, size: 8, weight: 800, spacing: 2, color: WHITE }, { t: 'text', s: '4090', x: 0, y: -5.5, size: 11, weight: 700, spacing: 4, color: '#aab0ba' }, { t: 'rect', x: 0, y: -11.8, w: 40, h: 0.9, color: GREEN }] }],
      info: info('Backplate', ['Closes the back of the board', 'Size and lettering are estimated'], ['estimated', 'estimated']) },
    { id: 'bracket', name: 'I/O bracket', kind: 'plate', p: { w: 40, h: 112, r: 1.5, t: 1.6, holes: [[0, -34, 4.5], [0, -14, 4.5], [0, 6, 4.5], [0, 26, 4.5]] }, mat: 'chrome', rot: [0, 90, 0], at: [-152.8, 0, 14], explode: [-30, 0, 0], conf: 'estimated', why: 'The bracket and its openings are not drawn in the sources.', tour: false, info: info('I/O bracket', ['Holds the card in the case', 'Shape is estimated'], ['estimated']) },
    { id: 'pcb', name: 'Circuit board', kind: 'plate', p: { w: 193, h: 105, r: 5, t: 1.6 }, mat: 'pcb-black', at: [-40.5, 0, 0], explode: [0, 0, 0], conf: 'estimated', why: 'Nobody publishes the board outline.', info: info('Circuit board', ['Carries the GPU, the memory and the power stages', 'Outline is estimated'], ['estimated', 'estimated']) },
    { id: 'package', name: 'GPU package', kind: 'plate', p: { w: 50, h: 44, r: 1.2, t: 1.0 }, mat: 'pcb', at: [X0, 0, 1.1], explode: [0, 0, 9], conf: 'estimated', why: 'The package size is not published.', tour: false, info: info('GPU package', ['The substrate the die is bonded to', 'Size is estimated'], ['estimated']) },
    { id: 'die', name: 'AD102 GPU die', kind: 'plate', p: { w: 24.67, h: 24.67, r: 0.4, t: 1.1 }, mat: 'silicon', at: [X0, 0, 2.0], explode: [0, 0, 18], conf: 'estimated', claims: ['die'], why: 'The area is published; the aspect ratio is not, so it is drawn square.',
      info: info('AD102 GPU die', ['608.5 mm2 and 76.3 billion transistors', '16,384 CUDA cores in 128 SMs', 'Drawn square: only the area is published'], ['spec', 'spec', 'estimated']) },
    { id: 'fingers', name: 'PCIe connector', kind: 'plate', p: { w: 89, h: 8, r: 0.5, t: 1.2 }, mat: 'gold', at: [-62, -56, 0], explode: [0, 0, 6], conf: 'estimated', why: 'Position along the board edge is estimated.', tour: false, info: info('PCIe x16 connector', ['Gold fingers on the board edge', 'Position is estimated'], ['estimated']) },
    { id: 'power', name: '16-pin power connector', kind: 'block', p: { w: 24, d: 9, h: 8, r: 1 }, mat: 'black', at: [38, 56, 4.5], explode: [0, 0, 26], conf: 'estimated', claims: ['tgp'], why: 'Position and size are estimated.',
      decals: [{ face: '+z', at: [0, 0, 4.05], w: 22, h: 7, px: 20, items: [{ t: 'text', s: '12VHPWR', x: 0, y: 0, size: 3, weight: 700, spacing: 0.5, color: '#9aa0aa' }] }], info: info('Power connector', ['450 W total graphics power', 'Size and position are estimated'], ['spec', 'estimated']) },
    { id: 'base', name: 'Vapor chamber', kind: 'plate', p: { w: 130, h: 108, r: 4, t: 4 }, mat: 'copper', at: [X0, 0, 4.6], explode: [0, 0, 34], cutaway: 0.97, conf: 'estimated', why: 'The cooler is not drawn anywhere in the sources.', info: info('Vapor chamber', ['Sits on the die and the memory', 'Size is estimated'], ['estimated', 'estimated']) },
    { id: 'fins', name: 'Fin stack', kind: 'fins', p: { w: 214, d: 118, h: 26, n: 46, t: 0.6 }, mat: 'aluminum', at: [14, 0, 19.6], explode: [0, 0, 56], cutaway: 0.97, conf: 'estimated', why: 'The fin count and size are not published.', info: info('Fin stack', ['Air goes through it, front to back', 'Count and size are estimated'], ['estimated', 'estimated']) },
    { id: 'shroud', name: 'Shroud', kind: 'plate', p: { w: 304, h: 137, r: 8, t: 3, holes: [[-62, 0, 52]] }, mat: 'graphite', at: [0, 0, 34.1], explode: [0, 0, 82], cutaway: 0.97, conf: 'derived', claims: ['dims', 'livery'],
      decals: [GFX(92, 46, 0)], info: info('Shroud', ['304 mm long, 137 mm wide', '3 slots thick: 61 mm with both fans', 'The opening, the finish and the lettering are estimated'], ['spec', 'spec', 'estimated']) },
    { id: 'ring', name: 'Fan ring', kind: 'tube', p: { ro: 56, ri: 52.5, len: 3.6 }, mat: 'chrome', at: [-62, 0, 35.8], explode: [0, 0, 94], cutaway: 0.97, conf: 'estimated', claims: ['livery'], tour: false, info: info('Fan ring', ['A polished ring around the fan opening', 'Estimated'], ['estimated']) },
    { id: 'fanA', name: 'Fan, front', kind: 'fan', p: { r: 52, hub: 20, blades: 11, t: 6, sweep: 44 }, mat: 'graphite', at: [-62, 0, 41], explode: [0, 0, 106], spin: 9, cutaway: 0.97, conf: 'estimated', why: 'The fan size and blade count are not published.',
      decals: [{ face: '+z', at: [0, 0, 5.5], w: 30, h: 30, px: 16, items: [{ t: 'circle', x: 0, y: 0, r: 13.5, color: '#14151a' }, { t: 'circle', x: 0, y: 0, r: 13.5, stroke: GREEN, lw: 0.8 }, { t: 'text', s: 'RTX', x: 0, y: 0, size: 7, weight: 800, spacing: 1, color: WHITE }] }],
      info: info('Front fan', ['Axial, pulls air through the fin stack', 'Size and blade count are estimated'], ['estimated', 'estimated']) },
    { id: 'fanB', name: 'Fan, rear', kind: 'fan', p: { r: 52, hub: 20, blades: 11, t: 6, sweep: 44 }, mat: 'graphite', at: [100, 0, -10], explode: [0, 0, -56], spin: -9, cutaway: 0.97, conf: 'estimated', claims: ['fans2'], why: 'Its place comes from a review; its size and blade count are not published and are drawn like the front fan.', info: info('Rear fan', ['Past the end of the board: air goes through the fins', 'Position from a review; size is estimated'], ['spec', 'estimated']) },
  );
  // five heat pipes from the vapor chamber into the fins
  [-32, -16, 0, 16, 32].forEach((y, i) => parts.push({ id: 'pipe' + (i + 1), name: 'Heat pipe ' + (i + 1), kind: 'shaft', p: { r: 3.4, len: 186 }, mat: 'copper', rot: [0, 90, 0], at: [28, y, 9.6], explode: [0, 0, 44], cutaway: 0.97, conf: 'estimated', why: 'Number and routing of heat pipes are not published.', tour: false, info: info('Heat pipe', ['Carries heat from the vapor chamber into the fins', 'Count and routing are estimated'], ['estimated', 'estimated']) }));
  // power stages, chokes and capacitors on the right of the board
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) parts.push({ id: 'ps' + (r * 6 + c + 1), name: 'Power stage', kind: 'block', p: { w: 6, d: 6, h: 1.4, r: 0.4 }, mat: 'black', at: [24 + r * 9, -33 + c * 13, 1.2], explode: [0, 0, 10], conf: 'estimated', why: 'The power delivery of the board is not published.', tour: false, info: info('Power stage', ['Turns the 12 V input into the GPU voltage', 'Number and position are estimated'], ['estimated', 'estimated']) });
  for (let c = 0; c < 6; c++) parts.push({ id: 'choke' + (c + 1), name: 'Inductor', kind: 'block', p: { w: 9, d: 9, h: 6, r: 1 }, mat: 'steel', at: [51, -33 + c * 13, 3.6], explode: [0, 0, 18], conf: 'estimated', why: 'The power delivery of the board is not published.', tour: false, info: info('Inductor', ['Smooths the current to the GPU', 'Number and position are estimated'], ['estimated', 'estimated']) });
  for (let c = 0; c < 6; c++) parts.push({ id: 'cap' + (c + 1), name: 'Capacitor', kind: 'shaft', p: { r: 4, len: 9 }, mat: 'oxide', at: [-100, -30 + c * 12, 5], explode: [0, 0, 14], conf: 'estimated', why: 'Position is estimated.', tour: false, info: info('Capacitor', ['Position is estimated'], ['estimated']) });
  // twelve memory packages around the die: 3 above, 3 below, 3 on each side
  const memAt = [[-24, 32], [0, 32], [24, 32], [-24, -32], [0, -32], [24, -32], [-34, -20], [-34, 0], [-34, 20], [34, -20], [34, 0], [34, 20]];
  memAt.forEach(([dx, dy], i) => parts.push({ id: 'mem' + (i + 1), name: 'GDDR6X package ' + (i + 1), kind: 'block', p: { w: 14, d: 12, h: 1.1, r: 0.6 }, mat: 'black', at: [X0 + dx, dy, 1.2], explode: [0, 0, 12], conf: 'estimated', claims: ['chips'], tour: i === 0,
    decals: [{ face: '+z', at: [0, 0, 0.57], w: 12, h: 5, px: 22, items: [{ t: 'text', s: 'GDDR6X', x: 0, y: 0, size: 2.4, weight: 700, spacing: 0.3, color: '#7d8490' }] }],
    info: info('GDDR6X package', ['12 packages: a 384-bit bus in 32-bit pieces', '2 GB each, 24 GB in all', 'Package size and position are estimated'], ['derived', 'derived', 'estimated']) }));

  window.SPEC = {
    brand: { accent: '#76b900' }, id: 'rtx4090', fig: 'Fig 10', kicker: 'REAL GRAPHICS CARD', title: 'GeForce RTX 4090', sub: 'The numbers come out of each other. Each one is checked.', orient: [0, 0, 90],
    recognize: {"object":"NVIDIA GeForce RTX 4090 graphics card","iconic":[{"text":"two large fans","parts":["fanA","fanB"]},{"text":"black shroud","parts":["shroud"]},{"text":"heat pipes","parts":["pipe1","pipe2"]},{"text":"PCIe edge connector","parts":["fingers"]}],"blind":{"answer":"NVIDIA GeForce RTX graphics card","judge":"a fresh model with no context, shown a label-free still (scripts/stranger.mjs)","date":"2026-10-13","ok":true}},
    research: {
      sources: [
        { id: 'nvidia', title: 'GeForce RTX 4090 - NVIDIA', url: 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/', fetched: '2026-10-13', note: 'Founders Edition: 16,384 CUDA cores, boost 2.52 GHz, base 2.23 GHz, 24 GB GDDR6X on a 384-bit interface, 450 W total graphics power, 304 mm long, 137 mm wide, 3-slot (61 mm). It does NOT give the memory speed, the bandwidth, the unit counts or the die.' },
        { id: 'wiki-40', title: 'GeForce 40 series - Wikipedia', url: 'https://en.wikipedia.org/wiki/GeForce_40_series', fetched: '2026-10-13', note: 'RTX 4090 (AD102-300): core config 512:176:128:512 (TMU : ROP : RT : tensor), 128 SMs, FP32 73.07 (82.58) TFLOPS at base (boost), pixel fillrate 443.5 Gpx/s, texture fillrate 1,290 Gtex/s at boost, 76.3 billion transistors. Memory 24 GB at 21 Gbps on 384 bits, bandwidth 1,008 GB/s, and die 608.5 mm2 are on the AD102-250 row of the same table, the 4090 row omits them. The last 22 % of the page was not read. techpowerup.com answered 403.' },
        { id: 'lanoc', title: 'NVIDIA RTX 4090 Founders Edition review, card layout and photos - LanOC Reviews', url: 'https://lanoc.org/review/video-cards/nvidia-rtx-4090-founders-edition?start=2', fetched: '2026-10-15', note: 'Describes a dual-fan blow-through design possible because of a shorter PCB: the second fan cools the part of the cooler that sticks out past the end of the PCB, and the back is a solid backplate. It gives no fan sizes or blade counts.' },
      ],
      claims: [
        { id: 'fans2', conf: 'spec', text: 'Two fans: one on the front over the GPU and one at the far end, past the end of a shorter PCB (a dual-fan blow-through design).', src: ['lanoc'] },
        { id: 'cores', conf: 'spec', text: '16,384 CUDA cores.', src: ['nvidia'] },
        { id: 'clocks', conf: 'spec', text: 'Base clock 2.23 GHz, boost clock 2.52 GHz.', src: ['nvidia'] },
        { id: 'units', conf: 'spec', text: '512 texture units and 176 ROPs.', src: ['wiki-40'] },
        { id: 'mem', conf: 'spec', text: '24 GB of GDDR6X on a 384-bit interface.', src: ['nvidia'] },
        { id: 'rate', conf: 'spec', text: 'Memory data rate 21 Gbps (read on the AD102-250 row: same die and memory, the 4090 row omits it).', src: ['wiki-40'] },
        { id: 'fp32', conf: 'spec', text: 'FP32 73.07 TFLOPS at base clock, 82.58 TFLOPS at boost.', src: ['wiki-40'] },
        { id: 'fill', conf: 'spec', text: 'Texture fillrate 1,290 Gtex/s and pixel fillrate 443.5 Gpx/s at boost.', src: ['wiki-40'] },
        { id: 'bw', conf: 'spec', text: 'Memory bandwidth 1,008 GB/s.', src: ['wiki-40'] },
        { id: 'die', conf: 'spec', text: 'AD102: 608.5 mm2 and 76.3 billion transistors.', src: ['wiki-40'] },
        { id: 'tgp', conf: 'spec', text: 'Total graphics power 450 W.', src: ['nvidia'] },
        { id: 'dims', conf: 'spec', text: 'Founders Edition: 304 mm long, 137 mm wide, 3 slots (61 mm).', src: ['nvidia'] },
        { id: 'chips', conf: 'derived', text: 'Twelve GDDR6X packages, 2 GB each.', src: ['nvidia'], cross: '24 GB published = 12 x 2 GB, and 384 bits = 12 x 32 bits: both published totals give the same count.' },
        { id: 'chipsize', conf: 'estimated', text: 'Each GDDR6X package has a 32-bit interface and holds 2 GB (16 Gb).', why: 'The memory maker\'s datasheet was not opened; these are the usual figures for GDDR6X.' },
        { id: 'livery', conf: 'estimated', text: 'Graphite shroud with a chrome fan ring, white GEFORCE RTX lettering over a green line, and the same on the backplate.', why: 'Drawn from memory of product photos. None of the opened sources describes the finish or the lettering, and only type and colour are used.' },
      ],
    },
    parts,
    mechanism: {
      calc: { vars: {
        cores: { v: 16384, label: 'CUDA cores', claim: 'cores' }, boost: { v: 2.52, label: 'boost', unit: 'GHz', claim: 'clocks' }, base: { v: 2.23, label: 'base', unit: 'GHz', claim: 'clocks' },
        tmus: { v: 512, label: 'TMUs', claim: 'units' }, rops: { v: 176, label: 'ROPs', claim: 'units' },
        bus: { v: 384, label: 'bus', unit: 'bit', claim: 'mem' }, rate: { v: 21, label: 'data rate', unit: 'Gbps', claim: 'rate' },
        bits_per_chip: { v: 32, label: 'per package', unit: 'bit', claim: 'chipsize' }, gb_per_chip: { v: 2, label: 'per package', unit: 'GB', claim: 'chipsize' },
        transistors: { v: 76.3, label: 'transistors', unit: 'billion', claim: 'die' }, die: { v: 608.5, label: 'die', unit: 'mm2', claim: 'die' },
      } },
      drive: { modes: [
        { id: 'fp32', label: 'FP32 at boost', expr: 'cores * 2 * boost / 1000', unit: 'TFLOPS', formula: 'cores x 2 FLOPs per clock x boost clock', publish: { value: 82.58, tol: 0.01, claim: 'fp32' }, show: ['die'], dim: 0.7 },
        { id: 'fp32b', label: 'FP32 at base', expr: 'cores * 2 * base / 1000', unit: 'TFLOPS', formula: 'cores x 2 FLOPs per clock x base clock', publish: { value: 73.07, tol: 0.01, claim: 'fp32' }, show: ['die'], dim: 0.7 },
        { id: 'tex', label: 'Texture fillrate', expr: 'tmus * boost', unit: 'Gtex/s', digits: 1, formula: 'texture units x boost clock', publish: { value: 1290, tol: 1, claim: 'fill' }, show: ['die'], dim: 0.7 },
        { id: 'pix', label: 'Pixel fillrate', expr: 'rops * boost', unit: 'Gpix/s', digits: 1, formula: 'ROPs x boost clock', publish: { value: 443.5, tol: 0.1, claim: 'fill' }, show: ['die'], dim: 0.7 },
        { id: 'bw', label: 'Memory bandwidth', expr: 'bus * rate / 8', unit: 'GB/s', digits: 0, formula: 'bus width x data rate / 8 bits per byte', publish: { value: 1008, tol: 0.5, claim: 'bw' }, show: memAt.map((_, i) => 'mem' + (i + 1)), dim: 0.7 },
        { id: 'cap', label: 'Memory capacity', expr: 'bus / bits_per_chip * gb_per_chip', unit: 'GB', digits: 0, formula: 'bus / 32 bits per package x 2 GB per package', publish: { value: 24, tol: 0.01, claim: 'mem' }, show: memAt.map((_, i) => 'mem' + (i + 1)), dim: 0.7 },
        { id: 'dens', label: 'Transistor density', expr: 'transistors * 1000 / die', unit: 'M per mm2', digits: 1, formula: '76.3 billion / 608.5 mm2', show: ['die'], dim: 0.7 },
      ] },
    },
    director: { outro: { url: 'github.com/DiegoLopez0208/mechanism', line: 'a skill for Claude Code and other coding agents' },  hold: 4.5, tour: ['die', 'mem1', 'base', 'fins', 'fanA', 'shroud'] },
  };
})();
