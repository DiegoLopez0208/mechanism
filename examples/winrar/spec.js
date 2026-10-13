/*
 * spec.js - WinRAR unpacking. The program is a stack of three books with a belt; what it does is turn a few packed bytes back into the whole text.
 * The packed bytes are real: WinRAR.exe 7.23 packed a short text into a ZIP (scripts/make-winrar-sample.mjs, evidence in data.js). The model is kit/deflate.js, written
 * from RFC 1951 alone: it reads the 49 bytes of DEFLATE, token by token, and writes the 119 characters back. Two independent decoders (Node's zlib and WinRAR itself)
 * must agree with it, and the CRC-32 the model computes must be the one WinRAR stored in the ZIP header.
 * Frame: the packed bytes on top, the books in the middle (they grow as the text comes out), the unpacked text below. Run "node scripts/check-spec.mjs examples/winrar/spec.js".
 */
(function () {
  const Z = window.WINRAR_ZIP, D = window.MX.deflate, E = window.MX.E, zip = Uint8Array.from(Z.hex.split(' ').map((h) => parseInt(h, 16))), entry = D.parseZip(zip)[0];
  const stream = zip.slice(entry.dataStart, entry.dataEnd), inf = D.inflate(zip, entry.dataStart), T = inf.tokens, NT = T.length, out = inf.out, NOUT = out.length, NIN = stream.length;
  const PITCH = 9, COLS = 24, hex = (b) => b.toString(16).toUpperCase().padStart(2, '0'), ch = (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '');
  const info = (title, lines, conf) => ({ title, lines, conf }), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), smooth = (u) => u * u * (3 - 2 * u);

  // which token wrote each output byte, and which tokens read each input byte
  const tokOfOut = new Array(NOUT).fill(0), tokOfIn = Array.from({ length: NIN }, () => []);
  T.forEach((t, i) => { for (let k = t.outStart; k < t.outEnd; k++) tokOfOut[k] = i; const a = (t.bitStart >> 3) - entry.dataStart, z = ((t.bitEnd - 1) >> 3) - entry.dataStart; for (let j = a; j <= z; j++) if (j >= 0 && j < NIN) tokOfIn[j].push(i); });
  const outPos = (k) => [((k % COLS) - (COLS - 1) / 2) * PITCH, 4 - PITCH * Math.floor(k / COLS)];
  const inPos = (j) => (j < 25 ? [(j - 12) * PITCH, 126] : [(j - 25 - 11.5) * PITCH, 117]);
  const produced = (s) => { const i = Math.floor(s); if (s <= 0) return 0; if (i >= NT) return NOUT; const t = T[i]; return t.outStart + (s - i) * (t.outEnd - t.outStart); };
  const grow = (s) => 0.41 + 0.59 * (produced(s) / NOUT);       // the pile of books is as tall as the text that is out: 49 of 119 at the start, all of it at the end

  const parts = [];
  for (let j = 0; j < NIN; j++) {
    const [x, y] = inPos(j), b = stream[j], first = tokOfIn[j][0];
    parts.push({ id: 'in' + j, name: 'Packed byte ' + j + ' ' + hex(b), kind: 'block', p: { w: 8.2, d: 8.2, h: 4.2, r: 1.2 }, mat: 'chrome', at: [x, y, 0], explode: [0, 0, 0], conf: 'measured', claims: ['sample', 'rfc'], tour: false,
      decals: [{ face: '+z', at: [0, 0, 2.13], w: 8, h: 6, px: 36, items: [{ t: 'text', s: hex(b), x: 0, y: 0.2, size: 3.6, weight: 800, font: 'mono', color: '#14161a' }] }],
      motion: (s) => { const i = Math.floor(s), on = s > 0 && i < NT && tokOfIn[j].includes(i), f = s - i; return on ? { pos: [0, 0, 4 * Math.sin(Math.PI * f)], scale: 1 + 0.18 * Math.sin(Math.PI * f) } : null; },
      info: info('Packed byte ' + j + ': ' + hex(b), ['byte ' + j + ' of the 49 in the DEFLATE stream', first != null ? 'read by token ' + (first + 1) + ' of ' + NT : 'padding bits', 'WinRAR wrote it'], ['measured', 'spec']) });
  }
  for (let k = 0; k < NOUT; k++) {
    const [x, y] = outPos(k), b = out[k], ti = tokOfOut[k], t = T[ti], isM = t.kind === 'match', src = isM ? k - t.dist : -1, [sx, sy] = src >= 0 ? outPos(src) : [x, y], light = true;
    parts.push({ id: 'out' + k, name: 'Text byte ' + k + ' ' + (ch(b) || hex(b)), kind: 'block', p: { w: 8.2, d: 8.2, h: 4.2, r: 1.2 }, mat: isM ? 'nv-green' : 'gold', at: [x, y, 0], explode: [0, 0, 0], conf: 'derived', claims: ['inflate'], tour: false,
      decals: [{ face: '+z', at: [0, 0, 2.13], w: 8, h: 6, px: 36, items: [{ t: 'text', s: ch(b) || hex(b), x: 0, y: 0.2, size: 5, weight: 800, font: 'mono', color: light ? '#14161a' : '#f2f2ee' }] }],
      motion: (s) => {
        if (s < ti) return { scale: 0.001 };
        const u = clamp(s - ti, 0, 1), cur = Math.floor(s), tk = T[cur];
        let sc = E.outBack(u), pos = [0, 0, 0];
        if (isM) { const e = smooth(u); pos = [(sx - x) * (1 - e), (sy - y) * (1 - e), 12 * Math.sin(Math.PI * u)]; } else pos = [0, 0, (1 - E.outBack(u)) * 14];
        if (s < NT && tk && tk.kind === 'match' && k >= tk.outStart - tk.dist && k < tk.outStart - tk.dist + tk.len && k < tk.outStart) sc *= 1 + 0.3 * Math.sin(Math.PI * (s - cur));      // the source of the copy pulses
        return { pos, scale: Math.max(0.001, sc) };
      },
      info: info('Text byte ' + k + (ch(b) ? ': "' + ch(b) + '"' : ': ' + hex(b)), [isM ? 'copied from byte ' + src + ' (' + t.dist + ' back)' : 'a literal: the byte is in the stream', 'written by token ' + (ti + 1) + ' of ' + NT, 'the model decoded it from RFC 1951'], ['derived', 'spec']) });
  }
  // the program: three books and a belt (the livery is our reading of the logo)
  const BOOK = [['bookG', 'Green book', 'wr-green', 20], ['bookB', 'Blue book', 'wr-blue', 26], ['bookP', 'Pink book', 'wr-pink', 22]], Y0 = 38;
  let yb = Y0; const books = BOOK.map(([id, name, mat, th]) => { const yc = yb + th / 2; yb += th; return { id, name, mat, th, yc }; });
  const barH = (th) => th * 0.7;
  books.forEach((b, i) => parts.push({ id: b.id, name: b.name, kind: 'block', p: { w: 74, d: b.th, h: 44, r: 3 }, mat: b.mat, at: [0, b.yc, 0], explode: [0, (i - 1) * 12, 0], conf: 'estimated', claims: ['livery'],
    decals: [{ face: '+z', at: [0, 0, 22.2], w: 74, h: b.th, px: 12, items: [{ t: 'rect', x: -27, y: 0, w: 3.2, h: barH(b.th), color: '#e9c43b' }, { t: 'rect', x: 27, y: 0, w: 3.2, h: barH(b.th), color: '#e9c43b' }] }].concat(b.id === 'bookP' ? [{ face: '+y', at: [0, b.th / 2 + 0.1, 0], w: 74, h: 44, px: 12, items: [{ t: 'rect', x: -17, y: 6, w: 26, h: 17, color: '#c6e84a', r: 1.2 }] }] : []),
    motion: (s) => { const f = grow(s); return { pos: [0, (f - 1) * (b.yc - Y0), 0], scale: [1, f, 1] }; },
    info: info(b.name, ['one of the three books of the WinRAR icon', 'it grows as the text comes out: 41 % to 100 %', 'colours read by eye from the logo'], ['estimated']) }));
  parts.push({ id: 'strap', name: 'Belt', kind: 'block', p: { w: 7, d: 70, h: 46, r: 1 }, mat: 'wr-strap', at: [0, Y0 + 34, 0], explode: [0, 0, 8], conf: 'estimated', claims: ['livery'], motion: (s) => { const f = grow(s); return { pos: [0, (f - 1) * 34, 0], scale: [1, f, 1] }; },
    info: info('Belt', ['the brown strap that holds the books', 'it stretches with the pile'], ['estimated']) });
  parts.push({ id: 'buckle', name: 'Buckle', kind: 'block', p: { w: 11, d: 9, h: 48, r: 1.4 }, mat: 'chrome', at: [0, Y0 + 24, 0], explode: [0, 0, 14], conf: 'estimated', claims: ['livery'], motion: (s) => ({ pos: [0, (grow(s) - 1) * 24, 0] }),
    decals: [{ face: '+z', at: [0, 0, 24.1], w: 11, h: 9, px: 24, items: [{ t: 'rect', x: 0, y: 0, w: 6, h: 4, color: '#3a3d44', r: 0.8 }] }],
    info: info('Buckle', ['the grey buckle on the belt'], ['estimated']) });

  // what the model computes, to be compared with what WinRAR wrote and with the RFC
  const same = Array.from(out).filter((v, i) => v === Z.text.charCodeAt(i)).length, fx = D.fixedLengths(), fc = D.assign(fx.lit);
  const outIds = (a, z) => Array.from({ length: z - a }, (_, i) => 'out' + (a + i)), inIds = (a, z) => Array.from({ length: z - a }, (_, i) => 'in' + (a + i));
  const lit = T.filter((t) => t.kind === 'lit').length, mat = T.filter((t) => t.kind === 'match').length;

  window.SPEC = {
    id: 'winrar', brand: { accent: '#c4688a' }, fig: 'Fig 13', kicker: 'REAL SOFTWARE', title: 'WinRAR unpacking', sub: 'Forty-nine packed bytes in, a hundred and nineteen characters out, one token at a time.',
    recognize: {
      object: 'WinRAR, the three-book icon, unpacking a file',
      iconic: [{ text: 'three stacked books: pink, blue, green', parts: ['bookG', 'bookB', 'bookP'] }, { text: 'the belt and its buckle', parts: ['strap', 'buckle'] }, { text: 'the unpacked text growing out of the packed bytes', partsPrefix: 'out' }],
      blind: { answer: 'The WinRAR logo (pink, blue and green books with a brown strap and clasp), a compression animation (confidence 85). A Haiku judge said it could not tell (20) and saw only a pink slab with a strap.', judge: 'a fresh Sonnet with no context, shown a label-free still (scripts/stranger.mjs)', date: '2026-10-13', ok: true },
    },
    research: {
      sources: [
        { id: 'rfc1951', title: 'RFC 1951 - DEFLATE Compressed Data Format Specification version 1.3', url: 'https://www.rfc-editor.org/rfc/rfc1951', fetched: '2026-10-13', note: 'Block header (BFINAL, BTYPE), bit order, the fixed Huffman code, the length and distance tables and the algorithm that assigns codes from lengths.' },
        { id: 'zipfmt', title: 'ZIP (file format) - Wikipedia', url: 'https://en.wikipedia.org/wiki/ZIP_(file_format)', fetched: '2026-10-13', note: 'Local file header: signature 50 4B 03 04, method 8 = DEFLATE, CRC-32, compressed and uncompressed sizes, file name.' },
        { id: 'reveng', title: 'CRC RevEng catalogue of parametrised CRC algorithms (17-32 bit)', url: 'https://reveng.sourceforge.io/crc-catalogue/17plus.htm', fetched: '2026-10-13', note: 'CRC-32/ISO-HDLC, the variant ZIP uses: poly 0x04c11db7, init and xorout 0xffffffff, reflected, check 0xcbf43926.' },
        { id: 'winrar', title: 'WinRAR 7.23: WinRAR.exe and Rar.exe, the copy installed on this machine', url: 'https://www.rarlab.com/download.htm', fetched: Z.generated, note: Z.version + '. WinRAR.exe packed the text into a ZIP and unpacked it again. Reproduce it with node scripts/make-winrar-sample.mjs.' },
        { id: 'nodezlib', title: 'Node.js zlib documentation (zlib.inflateRawSync)', url: 'https://nodejs.org/api/zlib.html', fetched: Z.generated, note: 'A second, independent DEFLATE decoder: the zlib that ships with Node inflates the same 49 bytes.' },
        { id: 'logo', title: 'Winrar Logo - whatthelogo.com', url: 'https://whatthelogo.com/logo/winrar/270478', fetched: '2026-10-13', note: 'A catalogue description of the icon: three stacked books (pink, deep blue, dark green) bound by a vertical brown strap with a grey buckle. Colours are a pixel sample, not an official palette.' },
      ],
      claims: [
        { id: 'rfc', conf: 'spec', text: 'A DEFLATE stream is a series of blocks, each starting with BFINAL (1 bit) and BTYPE (2 bits). Data is packed starting from the least significant bit of each byte; Huffman codes are packed starting from their most significant bit.', src: ['rfc1951'] },
        { id: 'fixed', conf: 'spec', text: 'BTYPE 01 uses the fixed Huffman code: symbols 0-143 have 8-bit codes starting at 00110000, 144-255 have 9-bit codes starting at 110010000, 256-279 have 7-bit codes starting at 0000000 and 280-287 have 8-bit codes starting at 11000000.', src: ['rfc1951'] },
        { id: 'tables', conf: 'spec', text: 'Length codes 257-285 and distance codes 0-29 carry extra bits and a base value: length code 285 is the length 258 with no extra bits and distance code 29 is the distance 24577 with 13 extra bits.', src: ['rfc1951'] },
        { id: 'assign', conf: 'spec', text: 'Canonical Huffman codes are assigned from the code lengths: shorter codes first, and codes of the same length in symbol order.', src: ['rfc1951'] },
        { id: 'zipfmt', conf: 'spec', text: 'A ZIP file starts with a local file header (50 4B 03 04) that states the method (8 is DEFLATE), the CRC-32, the compressed size and the uncompressed size of the file, then the file name and the data.', src: ['zipfmt'] },
        { id: 'crccheck', conf: 'spec', text: 'CRC-32/ISO-HDLC gives 0xcbf43926 for the ASCII string 123456789.', src: ['reveng'] },
        { id: 'sample', conf: 'measured', text: 'The ZIP is what WinRAR.exe 7.23 wrote for a 119 byte text (-afzip -m5): a 199 byte file whose DEFLATE stream has 49 bytes.', src: ['winrar'], error: 'Exact: they are the bytes of the file. The command and the run are in data.js and reproducible with scripts/make-winrar-sample.mjs.' },
        { id: 'zlibx', conf: 'measured', text: 'Node zlib inflates the same 49 bytes and gives the same text.', src: ['nodezlib', 'winrar'], error: 'Exact comparison of the two texts, recorded in data.js.' },
        { id: 'extract', conf: 'measured', text: 'WinRAR.exe unpacks the ZIP and gives back the same text.', src: ['winrar'], error: 'Exit code 0, the file compared byte for byte with the original, recorded in data.js.' },
        { id: 'inflate', conf: 'derived', text: 'The model decodes the 49 bytes into the same 119 characters, with the CRC-32 WinRAR stored.', src: ['rfc1951', 'winrar', 'nodezlib'], cross: 'A decoder written only from the RFC reproduces the text, the sizes and the CRC-32 stored in the ZIP header, and two independent decoders (zlib and WinRAR) agree with it.' },
        { id: 'livery', conf: 'estimated', text: 'Three stacked books (pink, blue, green) with two yellow bars on the spines, a lime label on the top book, a brown belt and a grey buckle.', src: ['logo'], why: 'No vector source with an official palette is published: the shapes follow a catalogue description of the icon and the colours were read by eye, so they are drawn as an estimate.' },
      ],
    },
    parts,
    mechanism: {
      steps: {
        rate: 4.5, count: NT,
        kind: (i) => T[i].kind,
        label: (i) => {
          const t = T[i], text = Array.from(out.slice(0, t.outEnd), (b) => String.fromCharCode(b)).join(''), tail = text.length > 22 ? '...' + text.slice(-22) : text;
          if (t.kind === 'lit') return { title: 'Token ' + (i + 1) + ' of ' + NT + ': a literal "' + ch(t.byte) + '"', formula: 'the code ' + t.bits + ' is a literal: write the byte', value: tail, chips: [{ text: t.bits, color: '#e3b341' }, { text: '"' + ch(t.byte) + '" = ' + hex(t.byte), color: '#e3b341' }, { text: t.outEnd + ' / ' + NOUT + ' written', color: '#8b949e' }] };
          if (t.kind === 'match') return { title: 'Token ' + (i + 1) + ' of ' + NT + ': copy ' + t.len + ' bytes from ' + t.dist + ' back', formula: 'length code ' + t.lenCode + ' + ' + t.extra.len + ' extra bits = ' + t.len + ', distance code ' + t.distCode + ' + ' + t.extra.dist + ' extra bits = ' + t.dist, value: tail, chips: [{ text: t.bits.length > 24 ? t.bits.slice(0, 24) + '...' : t.bits, color: '#4ade80' }, { text: 'copy ' + t.len + ' from ' + t.dist + ' back', color: '#4ade80' }, { text: t.outEnd + ' / ' + NOUT + ' written', color: '#8b949e' }] };
          return { title: 'Token ' + NT + ' of ' + NT + ': end of block', formula: 'the code ' + t.bits + ' is symbol 256: the block is over', value: text, chips: [{ text: t.bits, color: '#8b949e' }, { text: NOUT + ' bytes unpacked', color: '#4ade80' }] };
        },
      },
      calc: { vars: {
        ntok: { v: NT, label: 'tokens', claim: 'inflate' },
        same: { v: same, label: 'characters equal', unit: 'of ' + NOUT, claim: 'inflate' }, crc_calc: { v: D.hex32(D.crc32(out)), label: 'CRC-32 of the model output', claim: 'crccheck' },
        used: { v: inf.bytesUsed, label: 'bytes the model read', unit: 'bytes', claim: 'rfc' }, produced: { v: NOUT, label: 'bytes the model wrote', unit: 'bytes', claim: 'inflate' },
        codes: { v: [fc[0], fc[144], fc[256], fc[280]].join(' '), label: 'fixed codes from the lengths', claim: 'assign' },
        tabs: { v: D.LEN_BASE[28] + ' | ' + D.DIST_BASE[29] + ' +' + D.DIST_EXTRA[29], label: 'last table entries', claim: 'tables' },
        zl: { v: Z.zlib.identical ? 1 : 0, label: 'zlib agrees', claim: 'zlibx' }, rar: { v: Z.rar.extractExit === 0 && Z.rar.extractedEqual ? 1 : 0, label: 'WinRAR extracts the same', claim: 'extract' },
        ratio: { v: Math.round((NIN / NOUT) * 1000) / 10, label: 'packed size', unit: '%', claim: 'sample' },
      } },
      drive: { modes: [
        { id: 'unpack', label: 'Unpacking', steps: true, expr: 'ntok', unit: 'tokens', digits: 0, formula: 'one token at a time', dim: 0.6 },
        { id: 'text', label: 'The text, whole again', expr: 'same', unit: 'of ' + NOUT, digits: 0, formula: 'the model output against the text WinRAR packed', publish: { value: NOUT, claim: 'sample' }, show: outIds(0, NOUT), dim: 0.5 },
        { id: 'crc', label: 'The CRC-32', expr: 'crc_calc', unit: '', formula: 'CRC-32 of the unpacked bytes, against the one in the ZIP header', publish: { text: D.hex32(entry.crc), claim: 'zipfmt' }, show: outIds(0, NOUT), dim: 0.5 },
        { id: 'packed', label: 'Packed size', expr: 'used', unit: 'bytes', digits: 0, formula: 'bytes of DEFLATE the model had to read', publish: { value: entry.compSize, claim: 'zipfmt' }, show: inIds(0, NIN), dim: 0.5 },
        { id: 'size', label: 'Unpacked size', expr: 'produced', unit: 'bytes', digits: 0, formula: 'bytes the model wrote', publish: { value: entry.size, claim: 'zipfmt' }, show: outIds(0, NOUT), dim: 0.5 },
        { id: 'fixed', label: 'The fixed Huffman code', expr: 'codes', unit: '', formula: 'codes assigned from lengths 8, 9, 7, 8 for symbols 0, 144, 256, 280', publish: { text: '00110000 110010000 0000000 11000000', claim: 'fixed' }, show: inIds(0, NIN), dim: 0.5 },
        { id: 'tables', label: 'Length and distance tables', expr: 'tabs', unit: '', formula: 'last length base | last distance base +extra bits', publish: { text: '258 | 24577 +13', claim: 'tables' }, show: inIds(0, NIN), dim: 0.5 },
        { id: 'zlib', label: 'Node zlib agrees', expr: 'zl', unit: 'same text', digits: 0, formula: 'an independent decoder inflates the same 49 bytes', publish: { value: 1, claim: 'zlibx' }, show: outIds(0, NOUT), dim: 0.5 },
        { id: 'winrar', label: 'WinRAR unpacks it back', expr: 'rar', unit: 'same text', digits: 0, formula: 'WinRAR.exe extracts the ZIP and the file is compared byte for byte', publish: { value: 1, claim: 'extract' }, show: outIds(0, NOUT), dim: 0.5 },
        { id: 'ratio', label: 'How much it packed', expr: 'ratio', unit: '% of the text', digits: 1, formula: lit + ' literals and ' + mat + ' copies turn ' + NOUT + ' bytes into ' + NIN, show: inIds(0, NIN), dim: 0.7 },
      ] },
    },
    director: { cold: { dur: 8, question: 'Can a model built only from RFC 1951 unpack what WinRAR packed?' }, what: 'WinRAR packs files so they take less room. Here it unpacks one: 49 bytes go in, 119 characters come out.', legend: [{ color: '#c9ccd2', text: 'packed bytes' }, { color: '#e3b341', text: 'a literal' }, { color: '#7ed321', text: 'copied from earlier' }], zoom: 2.0, views: { iso: { yaw: -10, pitch: 52 }, front: { yaw: 0, pitch: 64 }, side: { yaw: -26, pitch: 44 }, three: { yaw: 14, pitch: 56 } }, modeDur: 3.4, tour: ['in0', 'out25', 'bookP', 'buckle'], short: { modes: ['unpack', 'text', 'crc'], tour: ['out25', 'bookP'] } },
  };
})();
