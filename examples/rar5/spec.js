/*
 * spec.js - WinRAR, taken apart: not the program, the thing it writes. A RAR5 archive of one tiny file is 87 bytes, and every one of them is explained.
 * The bytes are the real ones: Rar.exe (WinRAR 7.23) wrote them (scripts/make-rar5-sample.mjs, evidence in data.js). The model is kit/rar5.js, written from the
 * published format description. The gate asks the model for the numbers WinRAR itself wrote: the four CRC-32 values, the sizes, the archive length, and it
 * asks it to rebuild the whole file: the bytes must be identical, and the real UnRAR has to accept and extract what the model built.
 * Run "node scripts/check-spec.mjs examples/rar5/spec.js".
 *
 * Frame: one cube per byte, laid out as the format's diagram does: a row per block (signature, main header, file header in two rows, data, end of archive).
 */
(function () {
  const S = window.WINRAR_SAMPLE, R = window.MX.rar5, bytes = Uint8Array.from(S.hex.split(' ').map((h) => parseInt(h, 16))), parsed = R.parse(bytes);
  const PITCH = 9.6, GAP = 4, CUM = [0, 1, 2, 2, 3, 4], info = (title, lines, conf) => ({ title, lines, conf });
  // which row each byte sits on: signature, main header, file header (two rows), data, end
  const blk = (type) => parsed.blocks.find((b) => b.type === type), main = blk(1), file = blk(2), end = blk(5);
  const rows = [[0, 8], [main.start, main.end], [file.start, file.start + 21], [file.start + 21, file.dataStart], [file.dataStart, file.end], [end.start, end.end]];
  const rowOf = (i) => rows.findIndex(([a, b]) => i >= a && i < b);
  const fieldAt = (i) => { for (const b of parsed.blocks) for (const f of b.fields) if (i >= f.start && i < f.start + f.len) return { f, b }; return { f: { name: 'byte', text: '' }, b: parsed.blocks[0] }; };
  const catOf = (f, b) => (b.type === 0 ? 'sig' : /CRC32/.test(f.name) ? 'crc' : f.name === 'data' ? 'data' : f.name === 'name' ? 'name' : f.name === 'extra record' ? 'extra' : /size|length|type|flags/.test(f.name) ? 'struct' : 'meta');
  const MAT = { sig: 'chrome', crc: 'gold', struct: 'copper', meta: 'aluminum-dark', name: 'brass', extra: 'oxide', data: 'nv-green' };
  const LIGHT = { chrome: 1, gold: 1, brass: 1, 'nv-green': 1 };
  const GROUP = { signature: 0, 'main archive header': 1, 'file header': 2, 'end of archive': 4 };
  const parts = [];
  for (let i = 0; i < bytes.length; i++) {
    const { f, b } = fieldAt(i), r = rowOf(i), [a, z] = rows[r], col = i - a, n = z - a, cat = catOf(f, b), mat = MAT[cat], isData = f.name === 'data', grp = isData ? 3 : GROUP[b.kind] || 0;
    const ch = bytes[i] >= 32 && bytes[i] < 127 ? String.fromCharCode(bytes[i]) : '', hex = bytes[i].toString(16).toUpperCase().padStart(2, '0');
    const x = (col - (n - 1) / 2) * PITCH, y = -(r * PITCH + CUM[r] * GAP) + 24;
    parts.push({ id: 'b' + i, name: 'Byte ' + i + ' ' + hex, kind: 'block', p: { w: 8.4, d: 8.4, h: 4.2, r: 1.2 }, mat, at: [x, y, 0], explode: [0, 0, grp * 16], conf: 'measured', claims: ['sample', 'technote'], tour: false,
      decals: [{ face: '+z', at: [0, 0, 2.13], w: 8, h: 6, px: 36, items: [{ t: 'text', s: hex, x: 0, y: 0.2, size: 3.6, weight: 800, font: 'mono', color: LIGHT[mat] ? '#14161a' : '#f2f2ee' }] }],
      info: info('Byte ' + i + ': ' + hex + (ch ? '  (' + ch + ')' : ''), [f.name + (f.text ? ': ' + f.text : ''), 'part of the ' + b.kind, 'value ' + (f.value !== undefined && f.len <= 8 && f.name !== 'name' ? f.value : hex)], ['measured', 'spec']) });
  }
  [0, 8, 23, 28, 37, 45, 65, 79].forEach((i) => { parts[i].tour = true; });

  // the numbers the model produces, to be compared with what WinRAR wrote
  const cc = (b0) => R.hex32(b0.crc.calc), st = (b0) => R.hex32(b0.crc.stored), ids = (a, b2) => Array.from({ length: b2 - a }, (_, i) => 'b' + (a + i));
  const timeRec = file.fields.find((q) => q.name === 'extra record' && /file time/.test(q.text)), mtime = Array.from(bytes.slice(timeRec.start + 3, timeRec.start + 11));
  const rebuilt = R.build({ name: 'hello.txt', data: R.ascii(S.content), mtime }), same = Array.from(rebuilt).filter((v, i) => v === bytes[i]).length;

  window.SPEC = {
    id: 'rar5', brand: { accent: '#3b82f6' }, fig: 'Fig 12', kicker: 'REAL SOFTWARE', title: 'RAR5 archive', sub: 'The bytes WinRAR writes, and a model that has to write the same ones.',
    recognize: {"object":"WinRAR archive file (87 bytes)","iconic":[{"text":"the Rar! signature at the start","parts":["b0","b1","b2","b3"]},{"text":"one cube per byte of the archive","partsPrefix":"b"}],"blind":{"answer":"Not a physical object: hex byte values rendered as 3D blocks","judge":"a fresh model with no context, shown a label-free still (scripts/stranger.mjs)","date":"2026-10-13","ok":false}},
    research: {
      sources: [
        { id: 'technote', title: 'RAR 5.0 archive format - rarlab.com', url: 'https://www.rarlab.com/technote.htm', fetched: '2026-10-13', note: 'Signature, vint, the generic block header (CRC32, size, type, flags, extra and data sizes), the main, file and end-of-archive headers and their flags. It does NOT give the CRC-32 variant, only that the unrar source does.' },
        { id: 'reveng', title: 'CRC RevEng catalogue of parametrised CRC algorithms (17-32 bit)', url: 'https://reveng.sourceforge.io/crc-catalogue/17plus.htm', fetched: '2026-10-13', note: 'CRC-32/ISO-HDLC: poly 0x04c11db7, init 0xffffffff, reflected in and out, xorout 0xffffffff, check 0xcbf43926 (for the ASCII string 123456789).' },
        { id: 'winrar', title: 'WinRAR 7.23: Rar.exe and UnRAR.exe, the copy installed on this machine', url: 'https://www.rarlab.com/download.htm', fetched: S.generated, note: S.version + '. Rar.exe wrote the archive and UnRAR.exe tested and extracted the one the model built. Reproduce it with node scripts/make-rar5-sample.mjs.' },
      ],
      claims: [
        { id: 'technote', conf: 'spec', text: 'A RAR5 archive is the signature followed by blocks: header CRC32, header size, type, flags, then the type\'s own fields and an optional data area. Type 1 is the main header, 2 a file, 5 the end of the archive.', src: ['technote'] },
        { id: 'signature', conf: 'spec', text: 'The signature is the 8 bytes 52 61 72 21 1A 07 01 00.', src: ['technote'] },
        { id: 'crcrule', conf: 'spec', text: 'A header CRC32 covers the bytes from the header size through the end of the extra area.', src: ['technote'] },
        { id: 'vint', conf: 'spec', text: 'A vint holds 7 bits per byte, least significant first, with the top bit meaning more bytes follow; a writer may pad with 0x80 bytes when it reserves space.', src: ['technote'] },
        { id: 'stored', conf: 'spec', text: 'Compression method 0 is stored: the data is the file as it is.', src: ['technote'] },
        { id: 'crccheck', conf: 'spec', text: 'CRC-32/ISO-HDLC gives 0xcbf43926 for the ASCII string 123456789.', src: ['reveng'] },
        { id: 'crcvariant', conf: 'derived', text: 'RAR uses CRC-32/ISO-HDLC for its header and data CRCs.', src: ['reveng', 'winrar'], cross: 'The format description does not name the variant. With ISO-HDLC the model reproduces the four CRC-32 values WinRAR wrote in the sample (three headers and the data), and its check value is the catalogue\'s 0xcbf43926.' },
        { id: 'sample', conf: 'measured', text: 'The 87 bytes are what Rar.exe 7.23 wrote for hello.txt (14 bytes, method stored).', src: ['winrar'], error: 'Exact: they are the bytes of the file. The command and the run are in data.js and reproducible with scripts/make-rar5-sample.mjs.' },
        { id: 'unrar', conf: 'measured', text: 'UnRAR.exe 7.23 tests the archive the model built, extracts it, and gives back hello.txt unchanged.', src: ['winrar'], error: 'Exit codes 0 and 0, extracted file compared byte for byte with the original, recorded in data.js.' },
      ],
    },
    parts,
    mechanism: {
      calc: { vars: {
        real_sig: { v: R.hex(bytes.slice(0, 8)), label: 'first 8 bytes', claim: 'sample' }, crc_check: { v: R.hex32(R.crc32(R.ascii('123456789'))), label: 'CRC-32 of 123456789', claim: 'crcvariant' },
        main_calc: { v: cc(main), label: 'model computes', claim: 'crcrule' }, file_calc: { v: cc(file), label: 'model computes', claim: 'crcrule' }, end_calc: { v: cc(end), label: 'model computes', claim: 'crcrule' }, data_calc: { v: R.hex32(R.crc32(file.data)), label: 'model computes', claim: 'crcvariant' },
        vint_value: { v: R.readVint([0x8E, 0x00], 0).v, label: 'vint 8E 00 decodes to', claim: 'vint' },
        total: { v: 8 + (main.end - main.start) + (file.end - file.start) + (end.end - end.start), label: 'sum of blocks', unit: 'bytes', claim: 'technote' },
        rebuilt: { v: same, label: 'bytes identical', unit: 'of 87', claim: 'sample' }, unrar_ok: { v: S.unrar.testExit === 0 && S.unrar.extractExit === 0 && S.unrar.extractedEqual ? 1 : 0, label: 'files extracted equal', claim: 'unrar' },
      } },
      drive: { modes: [
        { id: 'sig', label: 'Signature', expr: 'real_sig', unit: '', formula: 'the first 8 bytes of the file WinRAR wrote', publish: { text: '52 61 72 21 1A 07 01 00', claim: 'signature' }, show: ids(0, 8), dim: 0.7 },
        { id: 'crccheck', label: 'The CRC-32', expr: 'crc_check', unit: '', formula: 'CRC-32 of the text 123456789', publish: { text: '0xCBF43926', claim: 'crccheck' }, show: [8, 9, 10, 11, 23, 24, 25, 26, 37, 38, 39, 40, 79, 80, 81, 82].map((i) => 'b' + i), dim: 0.7 },
        { id: 'maincrc', label: 'Main header CRC32', expr: 'main_calc', unit: '', formula: 'from header size to the end of the extra area', publish: { text: st(main), claim: 'sample' }, show: ids(main.start, main.end), dim: 0.7 },
        { id: 'filecrc', label: 'File header CRC32', expr: 'file_calc', unit: '', formula: 'from header size to the end of the extra area', publish: { text: st(file), claim: 'sample' }, show: ids(file.start, file.headerEnd), dim: 0.7 },
        { id: 'datacrc', label: 'Data CRC32', expr: 'data_calc', unit: '', formula: 'CRC-32 of the 14 bytes of the file', publish: { text: R.hex32(file.dataCrc), claim: 'sample' }, show: ids(file.dataStart, file.dataStart + 14), dim: 0.7 },
        { id: 'endcrc', label: 'End header CRC32', expr: 'end_calc', unit: '', formula: 'from header size to the end of the extra area', publish: { text: st(end), claim: 'sample' }, show: ids(end.start, end.end), dim: 0.7 },
        { id: 'vint', label: 'A padded vint', expr: 'vint_value', unit: 'bytes', digits: 0, formula: '8E 00: 7 bits each, low first, the 0x80 keeps going', publish: { value: 14, claim: 'sample' }, show: ['b' + (file.start + 8), 'b' + (file.start + 9)], dim: 0.7 },
        { id: 'size', label: 'Archive size', expr: 'total', unit: 'bytes', digits: 0, formula: 'signature + main + file + end', publish: { value: S.size, claim: 'sample' }, show: ids(0, bytes.length), dim: 0.9 },
        { id: 'rebuild', label: 'Rebuilt from the format', expr: 'rebuilt', unit: 'bytes of 87', digits: 0, formula: 'the model writes the whole file; compared with WinRAR\'s', publish: { value: S.size, claim: 'sample' }, show: ids(0, bytes.length), dim: 0.9 },
        { id: 'unrar', label: 'UnRAR takes the model\'s file', expr: 'unrar_ok', unit: 'file, identical', digits: 0, formula: 'UnRAR.exe 7.23 tests and extracts the archive the model built', publish: { value: 1, claim: 'unrar' }, show: ['b' + file.dataStart], dim: 0.9 },
      ] },
    },
    director: { cold: { dur: 9, question: 'Does a model built only from the published format write the same bytes WinRAR writes?' }, zoom: 1.4, views: { iso: { yaw: -12, pitch: 50 }, front: { yaw: 0, pitch: 62 }, side: { yaw: -26, pitch: 44 }, three: { yaw: 14, pitch: 56 } }, modeDur: 4.4, tour: [0, 8, 23, 28, 37, 45, 65, 79].map((i) => 'b' + i) },
  };
})();
