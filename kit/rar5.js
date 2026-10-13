/*
 * kit/rar5.js - the RAR 5.0 archive container, pure (Node and browser): CRC-32, variable-length integers, a parser that reports every field with its byte span,
 * and a builder. Written from the published format description (https://www.rarlab.com/technote.htm) and checked against files the real RAR writes:
 * the builder has to reproduce, byte for byte, an archive made by Rar.exe, and the real UnRAR has to extract what it builds.
 *
 * What the technote does not say, and this module assumes and then proves against real archives: the CRC is CRC-32/ISO-HDLC (polynomial 0xEDB88320 reflected,
 * init and final xor 0xFFFFFFFF), the one in the reveng catalogue whose check value for "123456789" is 0xCBF43926.
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {}), R = (MX.rar5 = {});
  R.SIGNATURE = [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00];
  const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  R.crc32 = (bytes) => { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  R.ascii = (s) => Array.from(s, (ch) => ch.charCodeAt(0) & 0xFF);
  R.utf8 = (s) => Array.from(new TextEncoder().encode(s));
  R.hex = (bytes, sep) => Array.from(bytes, (b) => b.toString(16).toUpperCase().padStart(2, '0')).join(sep == null ? ' ' : sep);
  R.hex32 = (n) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
  R.u32le = (n) => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];
  // vint: 7 data bits per byte, least significant first, high bit = more bytes follow. pad: write at least that many bytes (the writer reserves space, so 0x80 0x00 is a valid 0)
  R.vint = (n, pad) => { const out = []; let v = BigInt(n); do { let b = Number(v & 0x7Fn); v >>= 7n; if (v > 0n) b |= 0x80; out.push(b); } while (v > 0n); while (pad && out.length < pad) { out[out.length - 1] |= 0x80; out.push(0); } return out; };
  R.readVint = (b, pos) => { let v = 0n, shift = 0n, len = 0; for (;;) { const x = b[pos + len]; if (x === undefined) throw new Error('vint truncado en ' + pos); v |= BigInt(x & 0x7F) << shift; shift += 7n; len++; if (!(x & 0x80)) break; if (len > 10) throw new Error('vint de mas de 10 bytes'); } return { v: Number(v), len }; };

  // a block: header CRC32 | header size (vint) | body (type, flags, [extra size], [data size], specific fields, extra area) | data area
  R.block = (body, data) => { const size = R.vint(body.length), crc = R.crc32(size.concat(body)); return R.u32le(crc).concat(size, body, data || []); };

  // opts: name, data (bytes), mtime (8 bytes FILETIME, little endian), attrs, locator (bytes of the quick-open record) - the same choices Rar.exe made
  R.build = (o) => {
    const data = o.data, name = R.utf8(o.name), out = R.SIGNATURE.slice();
    const mainExtra = o.locator || [0x05, 0x01, 0x01, 0x80, 0x80, 0x00];
    out.push(...R.block([0x01].concat(R.vint(0x05), R.vint(mainExtra.length), R.vint(0), mainExtra)));
    const fileExtra = [0x0A, 0x03, 0x02].concat(o.mtime);
    const fileBody = [0x02].concat(R.vint(0x03), R.vint(fileExtra.length), R.vint(data.length, 2), R.vint(0x04), R.vint(data.length, 2), R.vint(o.attrs == null ? 0x20 : o.attrs), R.u32le(R.crc32(data)), R.vint(0, 2), R.vint(0), R.vint(name.length), name, fileExtra);
    out.push(...R.block(fileBody, data));
    out.push(...R.block([0x05].concat(R.vint(0x04), R.vint(0))));
    return Uint8Array.from(out);
  };

  const TYPES = { 1: 'main archive header', 2: 'file header', 3: 'service header', 4: 'encryption header', 5: 'end of archive' };
  // parser: { ok, problems, blocks: [{ kind, type, start, end, crc: { stored, calc, ok }, fields: [{ name, start, len, value, text }] }] }
  R.parse = (bytes) => {
    const out = { ok: true, problems: [], blocks: [] }, b = bytes; let pos = 0;
    const sig = Array.from(b.slice(0, 8)); if (sig.join() !== R.SIGNATURE.join()) { out.ok = false; out.problems.push('no es RAR 5.0: firma ' + R.hex(sig)); return out; }
    out.blocks.push({ kind: 'signature', type: 0, start: 0, end: 8, fields: [{ name: 'signature', start: 0, len: 8, value: R.hex(sig), text: 'RAR 5.0 signature' }] }); pos = 8;
    while (pos < b.length) {
      const blk = { start: pos, fields: [] }, F = (name, start, len, value, text) => blk.fields.push({ name, start, len, value, text: text || '' });
      const stored = (b[pos] | (b[pos + 1] << 8) | (b[pos + 2] << 16) | (b[pos + 3] << 24)) >>> 0; F('header CRC32', pos, 4, R.hex32(stored), 'over header size .. extra area'); pos += 4;
      const hs = R.readVint(b, pos), hsStart = pos; F('header size', pos, hs.len, hs.v, 'bytes from type to the end of the extra area'); pos += hs.len;
      const bodyStart = pos, bodyEnd = pos + hs.v, ty = R.readVint(b, pos); F('header type', pos, ty.len, ty.v, TYPES[ty.v] || 'unknown'); pos += ty.len; blk.type = ty.v; blk.kind = TYPES[ty.v] || 'unknown';
      const fl = R.readVint(b, pos); F('header flags', pos, fl.len, fl.v, [(fl.v & 1) ? 'extra area' : '', (fl.v & 2) ? 'data area' : '', (fl.v & 4) ? 'skip if unknown' : ''].filter(Boolean).join(', ')); pos += fl.len;
      let extraSize = 0, dataSize = 0;
      if (fl.v & 1) { const e = R.readVint(b, pos); F('extra area size', pos, e.len, e.v); pos += e.len; extraSize = e.v; }
      if (fl.v & 2) { const d = R.readVint(b, pos); F('data size', pos, d.len, d.v, 'bytes of packed data after the header'); pos += d.len; dataSize = d.v; }
      if (ty.v === 1) { const a = R.readVint(b, pos); F('archive flags', pos, a.len, a.v); pos += a.len; }
      else if (ty.v === 2) {
        const ff = R.readVint(b, pos); F('file flags', pos, ff.len, ff.v, [(ff.v & 1) ? 'directory' : '', (ff.v & 2) ? 'unix mtime' : '', (ff.v & 4) ? 'CRC32 present' : ''].filter(Boolean).join(', ')); pos += ff.len;
        const us = R.readVint(b, pos); F('unpacked size', pos, us.len, us.v, 'bytes once extracted'); blk.unpacked = us.v; pos += us.len;
        const at = R.readVint(b, pos); F('attributes', pos, at.len, at.v, 'OS specific'); pos += at.len;
        if (ff.v & 2) { F('mtime', pos, 4, 'unix'); pos += 4; }
        if (ff.v & 4) { const dc = (b[pos] | (b[pos + 1] << 8) | (b[pos + 2] << 16) | (b[pos + 3] << 24)) >>> 0; F('data CRC32', pos, 4, R.hex32(dc), 'CRC32 of the unpacked data'); blk.dataCrc = dc; pos += 4; }
        const ci = R.readVint(b, pos); F('compression info', pos, ci.len, ci.v, 'method ' + ((ci.v >> 7) & 7) + (((ci.v >> 7) & 7) === 0 ? ' (stored)' : '') + ', version ' + (ci.v & 0x3F)); pos += ci.len;
        const ho = R.readVint(b, pos); F('host OS', pos, ho.len, ho.v, ho.v === 0 ? 'Windows' : 'Unix'); pos += ho.len;
        const nl = R.readVint(b, pos); F('name length', pos, nl.len, nl.v); pos += nl.len;
        F('name', pos, nl.v, new TextDecoder().decode(b.slice(pos, pos + nl.v)), 'UTF-8, no trailing zero'); pos += nl.v;
      }
      else if (ty.v === 5) { const ef = R.readVint(b, pos); F('end flags', pos, ef.len, ef.v); pos += ef.len; }
      if (extraSize) {
        const eStart = bodyEnd - extraSize; if (pos < eStart) pos = eStart;
        let p = eStart; while (p < bodyEnd) { const rs = R.readVint(b, p), rt = R.readVint(b, p + rs.len); F('extra record', p, rs.len + rs.v, 'type ' + rt.v, ({ 1: 'locator (quick open)', 2: 'metadata' }[rt.v] || (blk.type === 2 ? { 1: 'encryption', 2: 'file hash', 3: 'file time', 4: 'file version' }[rt.v] : '') || 'record')); p += rs.len + rs.v; }
        pos = bodyEnd;
      }
      if (pos !== bodyEnd) out.problems.push('el bloque en ' + blk.start + ' declara ' + hs.v + ' bytes de cabecera y los campos leen ' + (pos - bodyStart));
      pos = bodyEnd; const calc = R.crc32(Array.from(b.slice(hsStart, bodyEnd)));
      blk.crc = { stored, calc, ok: stored === calc }; if (!blk.crc.ok) out.problems.push('CRC de cabecera mal en ' + blk.start);
      blk.headerEnd = bodyEnd; blk.headerSize = hs.v; blk.dataStart = bodyEnd; blk.dataSize = dataSize;
      if (dataSize) { blk.fields.push({ name: 'data', start: pos, len: dataSize, value: R.hex(b.slice(pos, pos + dataSize)), text: 'the stored file data' }); blk.data = Array.from(b.slice(pos, pos + dataSize)); pos += dataSize; }
      blk.end = pos; out.blocks.push(blk);
    }
    out.ok = out.problems.length === 0; return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
