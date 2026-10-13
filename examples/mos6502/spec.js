/*
 * spec.js - MOS Technology 6502 in its 40-pin DIP. The numbers the gate checks are taken from the model as drawn: it counts the pins of the pinout
 * that are address lines and data lines and compares them with the published bus widths, measures the lead pitch and the row spacing between the
 * drawn leads against the published DIP standard, and computes the address space and the die area. Two independent sources have to agree.
 * Run "node scripts/check-spec.mjs examples/mos6502/spec.js".
 *
 * Frame: the chip lies on the xy plane (x = length), z up; the leads hang down. Pin 1 is at the left of the near row, numbering runs
 * left to right along the near row and back along the far row, as in any DIP seen from above.
 */
(function () {
  // pinout as listed by the source (pin number = index + 1)
  const NAMES = ['VSS', 'RDY', 'phi1', 'IRQ', 'NC', 'NMI', 'SYNC', 'VCC', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'VSS', 'A12', 'A13', 'A14', 'A15', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0', 'R/W', 'NC', 'NC', 'phi0', 'SO', 'phi2', 'RES'];
  const DIR = { VSS: 'power', VCC: 'power', NC: 'not connected', RDY: 'input', IRQ: 'input', NMI: 'input', SO: 'input', phi0: 'input', RES: 'input', phi1: 'output', phi2: 'output', SYNC: 'output', 'R/W': 'output' };
  const A = /^A[0-9]+$/, D = /^D[0-9]+$/;
  const PITCH = 2.54, ROW = 15.24, X1 = -(NAMES.length / 2 - 1) * PITCH / 2;
  const posOf = (i) => (i < 20 ? [X1 + i * PITCH, -ROW / 2] : [X1 + (39 - i) * PITCH, ROW / 2]);
  const info = (title, lines, conf) => ({ title, lines, conf });
  const parts = [
    { id: 'body', name: 'Plastic body', kind: 'block', p: { w: 52, d: 13.8, h: 4.4, r: 1 }, mat: 'black', at: [0, 0, 0], explode: [0, 0, 12], cutaway: 0.8, conf: 'estimated', why: 'The length, width and height of a DIP-40 body are not given by either source.', info: info('Plastic body', ['Holds the die and the leads', 'Size is estimated: the sources give the lead pitch and row spacing, not the body'], ['estimated', 'estimated']) },
    { id: 'die', name: 'Silicon die', kind: 'plate', p: { w: 3.886, h: 4.267, r: 0.15, t: 0.3 }, mat: 'silicon', at: [0, 0, 0.2], explode: [0, 0, 6], conf: 'measured', claims: ['die'], info: info('Silicon die', ['3.9 mm x 4.3 mm: 153 x 168 mils, 16.6 mm2', 'Made in an 8 micron process', 'Position inside the body is estimated'], ['spec', 'spec', 'estimated']) },
  ];
  NAMES.forEach((n, i) => {
    const [x, y] = posOf(i), a = A.test(n), d = D.test(n);
    parts.push({ id: 'pin' + (i + 1), name: 'Pin ' + (i + 1) + ' ' + n, kind: 'block', p: { w: 1.0, d: 0.4, h: 7.6, r: 0.1 }, mat: n === 'VSS' || n === 'VCC' ? 'copper' : a ? 'brass' : d ? 'chrome' : 'steel', at: [x, y, -1.8], explode: [0, 0, -16 - (i % 2) * 3], conf: 'derived', claims: ['pitch', 'pinout'], tour: i === 8 || i === 25,
      info: info('Pin ' + (i + 1) + ': ' + n, [a ? 'Address line, output' : d ? 'Data line, input / output' : (DIR[n] || 'signal').replace(/^./, (c) => c.toUpperCase()), 'On the 0.1 inch grid, ' + (i < 20 ? 'near' : 'far') + ' row', 'Lead shape and length are estimated'], ['spec', 'derived', 'estimated']) });
  });
  const lead = (i) => parts.find((p) => p.id === 'pin' + i).at;
  const count = (re) => NAMES.filter((n) => re.test(n)).length;
  const pinIds = (re) => NAMES.map((n, i) => (re.test(n) ? 'pin' + (i + 1) : null)).filter(Boolean);

  window.SPEC = {
    id: 'mos6502', fig: 'Fig 11', kicker: 'REAL MICROPROCESSOR', title: 'MOS 6502', sub: 'Two sources have to agree: the pinout and the datasheet numbers.',
    research: {
      sources: [
        { id: 'wiki-6502', title: 'MOS Technology 6502 - Wikipedia', url: 'https://en.wikipedia.org/wiki/MOS_Technology_6502', fetched: '2026-10-13', note: '8-bit data bus, 16-bit address bus addressing the full 64 KB, 151 of the 256 possible opcodes used (105 undefined), die 3.9 mm x 4.3 mm (153 x 168 mils) = 16.6 mm2, 8 micron process, 3,510 transistors (a second count of 3,218 is also cited), 40-pin DIP, +5 V. It does NOT give a full pinout. The last 40 % of the page was not read.' },
        { id: 'pinout', title: '6502 used in Commodore and Amiga equipment - Ronald van Dijk', url: 'https://www.amiga-stuff.com/hardware/6502.html', fetched: '2026-10-13', note: 'The full 40-pin pinout: A0-A11 on pins 9-20, A12-A15 on 22-25, D7-D0 on 26-33, power on 1, 8 and 21, clocks on 3, 37 and 39, R/W on 34. Personal page, 2005, a table of pin, direction and name with no descriptions.' },
        { id: 'wiki-dip', title: 'Dual in-line package - Wikipedia', url: 'https://en.wikipedia.org/wiki/Dual_in-line_package', fetched: '2026-10-13', note: 'Standard lead pitch 0.1 in (2.54 mm); 0.6 in (15.24 mm) row spacing for the wide DIPs with 24, 28, 32 or 40 pins. It gives no body length, height or lead size for a DIP-40.' },
      ],
      claims: [
        { id: 'addrbus', conf: 'spec', text: 'The address bus is 16 bits wide and addresses the full 64 KB of memory.', src: ['wiki-6502'] },
        { id: 'databus', conf: 'spec', text: 'The data bus is 8 bits wide.', src: ['wiki-6502'] },
        { id: 'opcodes', conf: 'spec', text: 'The original chip used 151 of the 256 possible opcodes: the other 105 are undefined.', src: ['wiki-6502'] },
        { id: 'die', conf: 'measured', text: 'The die is 3.9 mm x 4.3 mm (153 x 168 mils), 16.6 mm2.', src: ['wiki-6502'], error: 'Published in mils and in mm; the two agree to 0.1 mm2. Position of the die inside the body is not published.' },
        { id: 'pinout', conf: 'spec', text: 'Pinout: A0-A15 on pins 9-20 and 22-25, D0-D7 on pins 26-33, 3 power pins, 3 clock pins, R/W, SYNC, RDY, IRQ, NMI, SO, RES and 3 not connected.', src: ['pinout'] },
        { id: 'pitch', conf: 'derived', text: 'The leads sit on a 2.54 mm pitch in two rows 15.24 mm apart, 20 per row.', src: ['wiki-dip', 'wiki-6502'], cross: 'The 600 mil DIP standard (2.54 mm pitch, 15.24 mm rows) holds 40 pins as 2 x 20, and the 6502 is a 40-pin DIP.' },
        { id: 'transistors', conf: 'spec', text: '3,510 transistors (Wikipedia also cites 3,218).', src: ['wiki-6502'] },
      ],
    },
    parts,
    mechanism: {
      calc: { vars: {
        addr_pins: { v: count(A), label: 'address pins', claim: 'pinout' }, data_pins: { v: count(D), label: 'data pins', claim: 'pinout' },
        used: { v: 151, label: 'opcodes used', claim: 'opcodes' },
        w_mils: { v: 153, label: 'die width', unit: 'mils', claim: 'die' }, h_mils: { v: 168, label: 'die height', unit: 'mils', claim: 'die' },
        pitch: { v: Math.round((lead(2)[0] - lead(1)[0]) * 100) / 100, label: 'lead pitch', unit: 'mm', claim: 'pitch' }, row: { v: Math.round(Math.abs(lead(21)[1] - lead(1)[1]) * 100) / 100, label: 'row spacing', unit: 'mm', claim: 'pitch' },
        pins: { v: NAMES.length, label: 'pins', claim: 'pinout' }, transistors: { v: 3510, label: 'transistors', claim: 'transistors' }, area: { v: 16.6, label: 'die', unit: 'mm2', claim: 'die' },
      } },
      drive: { modes: [
        { id: 'addr', label: 'Address lines', expr: 'addr_pins', unit: 'lines', digits: 0, formula: 'A0 to A15 counted on the pinout', publish: { value: 16, tol: 0, claim: 'addrbus' }, show: pinIds(A) },
        { id: 'data', label: 'Data lines', expr: 'data_pins', unit: 'lines', digits: 0, formula: 'D0 to D7 counted on the pinout', publish: { value: 8, tol: 0, claim: 'databus' }, show: pinIds(D) },
        { id: 'space', label: 'Address space', expr: '2 ** addr_pins / 1024', unit: 'KB', digits: 0, formula: '2 to the power of the address lines, in KB', publish: { value: 64, tol: 0, claim: 'addrbus' }, show: pinIds(A) },
        { id: 'undef', label: 'Undefined opcodes', expr: '2 ** (data_pins) - used', unit: 'opcodes', digits: 0, formula: '2^8 possible opcodes less the 151 used', publish: { value: 105, tol: 0, claim: 'opcodes' }, show: ['die'] },
        { id: 'area', label: 'Die area', expr: 'w_mils * h_mils * 0.0254 * 0.0254', unit: 'mm2', formula: '153 mils x 168 mils, in mm', publish: { value: 16.6, tol: 0.05, claim: 'die' }, show: ['die'] },
        { id: 'pitch', label: 'Lead pitch', expr: 'pitch', unit: 'mm', formula: 'distance between drawn leads', publish: { value: 2.54, tol: 0.005, claim: 'pitch' }, show: ['pin1', 'pin2', 'pin3'] },
        { id: 'row', label: 'Row spacing', expr: 'row', unit: 'mm', formula: 'distance between the drawn rows of leads', publish: { value: 15.24, tol: 0.005, claim: 'pitch' }, show: ['pin1', 'pin40'] },
        { id: 'dens', label: 'Transistor density', expr: 'transistors / area', unit: 'per mm2', digits: 0, formula: '3,510 transistors / 16.6 mm2', show: ['die'] },
      ] },
    },
    director: { zoom: 1.35, tour: ['body', 'die', 'pin9', 'pin26'] },
  };
})();
