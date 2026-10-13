/*
 * spec.js - NVIDIA GeForce RTX 4090 Founders Edition, taken apart. Almost nothing about the inside of a graphics card is published, but its
 * performance numbers are, and they come out of each other: TFLOPS = cores x 2 x clock, bandwidth = bus x data rate / 8, fillrate = units x clock.
 * The gate evaluates each of them from the variables on the card and compares the result with the published figure; every variable carries its claim,
 * so an estimated assumption (the memory chips) is drawn in a different colour from a published one.
 * Run "node scripts/check-spec.mjs examples/rtx4090/spec.js".
 *
 * Frame: the card lies on the xy plane (x = length 304 mm, y = width 137 mm), z is its thickness; `orient` stands it up for the camera.
 */
(function () {
  const parts = [], X0 = -22;       // x of the GPU die: the board is shifted towards the bracket end
  const info = (title, lines, conf) => ({ title, lines, conf });
  parts.push(
    { id: 'backplate', cutaway: 0.97, name: 'Backplate', kind: 'plate', p: { w: 268, h: 112, r: 6, t: 2.5 }, mat: 'aluminum-dark', at: [-8, 0, -3.2], explode: [0, 0, -34], conf: 'estimated', why: 'The size of the backplate is not published.', info: info('Backplate', ['Closes the back of the board', 'Size is estimated'], ['estimated', 'estimated']) },
    { id: 'pcb', name: 'Circuit board', kind: 'plate', p: { w: 250, h: 105, r: 5, t: 1.6 }, mat: 'pcb', at: [-12, 0, 0], explode: [0, 0, 0], conf: 'estimated', why: 'Nobody publishes the board outline.', info: info('Circuit board', ['Carries the GPU, the memory and the power stages', 'Outline is estimated'], ['estimated', 'estimated']) },
    { id: 'die', name: 'AD102 GPU die', kind: 'plate', p: { w: 24.67, h: 24.67, r: 0.4, t: 1.1 }, mat: 'silicon', at: [X0, 0, 1.4], explode: [0, 0, 18], conf: 'estimated', claims: ['die'], why: 'The area is published; the aspect ratio is not, so it is drawn square.',
      info: info('AD102 GPU die', ['608.5 mm2 and 76.3 billion transistors', '16,384 CUDA cores in 128 SMs', 'Drawn square: only the area is published'], ['spec', 'spec', 'estimated']) },
    { id: 'fingers', name: 'PCIe connector', kind: 'plate', p: { w: 89, h: 8, r: 0.5, t: 1.2 }, mat: 'gold', at: [-62, -56, 0], explode: [0, 0, 6], conf: 'estimated', why: 'Position along the board edge is estimated.', tour: false, info: info('PCIe x16 connector', ['Gold fingers on the board edge', 'Position is estimated'], ['estimated']) },
    { id: 'power', name: '16-pin power connector', kind: 'block', p: { w: 24, d: 9, h: 8, r: 1 }, mat: 'black', at: [96, 56, 4.5], explode: [0, 0, 26], conf: 'estimated', claims: ['tgp'], why: 'Position and size are estimated.', info: info('Power connector', ['450 W total graphics power', 'Size and position are estimated'], ['spec', 'estimated']) },
    { id: 'base', cutaway: 0.97, name: 'Vapor chamber', kind: 'plate', p: { w: 130, h: 108, r: 4, t: 4 }, mat: 'copper', at: [X0, 0, 4.6], explode: [0, 0, 34], conf: 'estimated', why: 'The cooler is not drawn anywhere in the sources.', info: info('Vapor chamber', ['Sits on the die and the memory', 'Size is estimated'], ['estimated', 'estimated']) },
    { id: 'fins', cutaway: 0.97, name: 'Fin stack', kind: 'fins', p: { w: 214, d: 118, h: 26, n: 46, t: 0.6 }, mat: 'aluminum', at: [14, 0, 19.6], explode: [0, 0, 56], conf: 'estimated', why: 'The fin count and size are not published.', info: info('Fin stack', ['Air goes through it, front to back', 'Count and size are estimated'], ['estimated', 'estimated']) },
    { id: 'shroud', cutaway: 0.97, name: 'Shroud', kind: 'plate', p: { w: 304, h: 137, r: 8, t: 3, holes: [[-62, 0, 52]] }, mat: 'oxide', at: [0, 0, 34.1], explode: [0, 0, 82], conf: 'derived', claims: ['dims'], info: info('Shroud', ['304 mm long, 137 mm wide', '3 slots thick: 61 mm with both fans', 'The opening for the front fan is estimated'], ['spec', 'spec', 'estimated']) },
    { id: 'fanA', cutaway: 0.97, name: 'Fan, front', kind: 'fan', p: { r: 52, hub: 17, blades: 9, t: 6 }, mat: 'black', at: [-62, 0, 41], explode: [0, 0, 106], spin: 9, conf: 'estimated', why: 'The fan size and blade count are not published.', info: info('Front fan', ['Axial, pulls air through the fin stack', 'Size and blade count are estimated'], ['estimated', 'estimated']) },
    { id: 'fanB', cutaway: 0.97, name: 'Fan, rear', kind: 'fan', p: { r: 52, hub: 17, blades: 9, t: 6 }, mat: 'black', at: [96, 0, -10], explode: [0, 0, -56], spin: -9, conf: 'estimated', why: 'Same as the front fan.', info: info('Rear fan', ['Flow-through design: the second fan is on the other side of the card', 'Estimated'], ['estimated', 'estimated']) },
  );
  // twelve memory packages around the die: 3 above, 3 below, 3 on each side
  const memAt = [[-24, 32], [0, 32], [24, 32], [-24, -32], [0, -32], [24, -32], [-34, -20], [-34, 0], [-34, 20], [34, -20], [34, 0], [34, 20]];
  memAt.forEach(([dx, dy], i) => parts.push({ id: 'mem' + (i + 1), name: 'GDDR6X package ' + (i + 1), kind: 'block', p: { w: 14, d: 12, h: 1.1, r: 0.6 }, mat: 'black', at: [X0 + dx, dy, 1.2], explode: [0, 0, 12], conf: 'estimated', claims: ['chips'], tour: i === 0,
    info: info('GDDR6X package', ['12 packages: a 384-bit bus in 32-bit pieces', '2 GB each, 24 GB in all', 'Package size and position are estimated'], ['derived', 'derived', 'estimated']) }));

  window.SPEC = {
    id: 'rtx4090', fig: 'Fig 10', kicker: 'REAL GRAPHICS CARD', title: 'GeForce RTX 4090', sub: 'The numbers come out of each other. Each one is checked.', orient: [0, 0, 90],
    research: {
      sources: [
        { id: 'nvidia', title: 'GeForce RTX 4090 - NVIDIA', url: 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/', fetched: '2026-10-13', note: 'Founders Edition: 16,384 CUDA cores, boost 2.52 GHz, base 2.23 GHz, 24 GB GDDR6X on a 384-bit interface, 450 W total graphics power, 304 mm long, 137 mm wide, 3-slot (61 mm). It does NOT give the memory speed, the bandwidth, the unit counts or the die.' },
        { id: 'wiki-40', title: 'GeForce 40 series - Wikipedia', url: 'https://en.wikipedia.org/wiki/GeForce_40_series', fetched: '2026-10-13', note: 'RTX 4090 (AD102-300): core config 512:176:128:512 (TMU : ROP : RT : tensor), 128 SMs, FP32 73.07 (82.58) TFLOPS at base (boost), pixel fillrate 443.5 Gpx/s, texture fillrate 1,290 Gtex/s at boost, 76.3 billion transistors. Memory 24 GB at 21 Gbps on 384 bits, bandwidth 1,008 GB/s, and die 608.5 mm2 are on the AD102-250 row of the same table, the 4090 row omits them. The last 22 % of the page was not read. techpowerup.com answered 403.' },
      ],
      claims: [
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
        { id: 'fp32', label: 'FP32 at boost', expr: 'cores * 2 * boost / 1000', unit: 'TFLOPS', formula: 'cores x 2 FLOPs per clock x boost clock', publish: { value: 82.58, tol: 0.01, claim: 'fp32' }, show: ['die'] },
        { id: 'fp32b', label: 'FP32 at base', expr: 'cores * 2 * base / 1000', unit: 'TFLOPS', formula: 'cores x 2 FLOPs per clock x base clock', publish: { value: 73.07, tol: 0.01, claim: 'fp32' }, show: ['die'] },
        { id: 'tex', label: 'Texture fillrate', expr: 'tmus * boost', unit: 'Gtex/s', digits: 1, formula: 'texture units x boost clock', publish: { value: 1290, tol: 1, claim: 'fill' }, show: ['die'] },
        { id: 'pix', label: 'Pixel fillrate', expr: 'rops * boost', unit: 'Gpix/s', digits: 1, formula: 'ROPs x boost clock', publish: { value: 443.5, tol: 0.1, claim: 'fill' }, show: ['die'] },
        { id: 'bw', label: 'Memory bandwidth', expr: 'bus * rate / 8', unit: 'GB/s', digits: 0, formula: 'bus width x data rate / 8 bits per byte', publish: { value: 1008, tol: 0.5, claim: 'bw' }, show: memAt.map((_, i) => 'mem' + (i + 1)) },
        { id: 'cap', label: 'Memory capacity', expr: 'bus / bits_per_chip * gb_per_chip', unit: 'GB', digits: 0, formula: 'bus / 32 bits per package x 2 GB per package', publish: { value: 24, tol: 0.01, claim: 'mem' }, show: memAt.map((_, i) => 'mem' + (i + 1)) },
        { id: 'dens', label: 'Transistor density', expr: 'transistors * 1000 / die', unit: 'M per mm2', digits: 1, formula: '76.3 billion / 608.5 mm2', show: ['die'] },
      ] },
    },
    director: { zoom: 1.5, tour: ['die', 'mem1', 'base', 'fins', 'fanA', 'shroud'] },
  };
})();
