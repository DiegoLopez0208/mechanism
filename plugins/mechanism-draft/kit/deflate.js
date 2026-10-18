/*
 * kit/deflate.js - DEFLATE (RFC 1951) decompression with a full trace, plus the ZIP container around it. Pure (Node and browser).
 * Written from the RFC: the bit order (data packed from the least significant bit, Huffman codes from the most significant), the fixed code lengths, the
 * length and distance tables, and the algorithm that assigns codes from lengths. inflate() returns every token with the exact bits it consumed, so a film
 * can show the stream turning into text one token at a time.
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {}), D = (MX.deflate = {});
  const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  D.crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = TABLE[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  D.hex32 = (n) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
  // RFC 1951, sections 3.2.5: length codes 257..285 (extra bits, base length) and distance codes 0..29 (extra bits, base distance)
  D.LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  D.LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  D.DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  D.DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  // RFC 1951, 3.2.2: assign canonical codes from code lengths. Returns codes as bit strings, MSB first (null for unused symbols)
  D.assign = (lengths) => {
    const max = Math.max(0, ...lengths), bl = new Array(max + 2).fill(0), next = new Array(max + 2).fill(0), codes = new Array(lengths.length).fill(null);
    lengths.forEach((l) => { if (l) bl[l]++; });
    let code = 0; for (let bits = 1; bits <= max; bits++) { code = (code + bl[bits - 1]) << 1; next[bits] = code; }
    lengths.forEach((l, n) => { if (l) { codes[n] = next[l].toString(2).padStart(l, '0'); next[l]++; } });
    return codes;
  };
  D.fixedLengths = () => { const l = []; for (let i = 0; i < 288; i++) l.push(i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8); return { lit: l, dist: new Array(32).fill(5) }; };
  const book = (codes) => { const m = new Map(); codes.forEach((c, sym) => { if (c) m.set(c, sym); }); return m; };

  // inflate(bytes): { ok, problems, out, tokens, blocks, bitsUsed, bytesUsed }
  // token: { kind: 'lit' | 'match' | 'end', sym, byte, len, dist, bitStart, bitEnd, bits, code, extra, outStart, outEnd }
  D.inflate = (b, start) => {
    const out = [], tokens = [], blocks = [], problems = [], s0 = (start || 0) * 8; let pos = s0;
    const bit = () => { if (pos >> 3 >= b.length) throw new Error('flujo truncado'); const v = (b[pos >> 3] >> (pos & 7)) & 1; pos++; return v; };
    const bitsLE = (n) => { let v = 0; for (let i = 0; i < n; i++) v |= bit() << i; return v; };
    const str = (a, z) => { let s = ''; for (let i = a; i < z; i++) s += (b[i >> 3] >> (i & 7)) & 1; return s; };
    const decode = (map) => { let code = '', n = 0; for (;;) { code += bit(); n++; if (map.has(code)) return { sym: map.get(code), code }; if (n > 15) throw new Error('codigo Huffman invalido'); } };
    try {
      let final = 0;
      while (!final) {
        const bStart = pos; final = bit(); const btype = bitsLE(2), blk = { bfinal: final, btype, bitStart: bStart, tokens: 0 };
        if (btype === 3) { problems.push('BTYPE 11 reservado'); break; }
        if (btype === 0) {
          pos = (pos + 7) & ~7; const len = bitsLE(16), nlen = bitsLE(16); if ((len ^ 0xFFFF) !== nlen) problems.push('LEN y NLEN no concuerdan');
          for (let i = 0; i < len; i++) { const byte = bitsLE(8); tokens.push({ kind: 'lit', sym: byte, byte, bitStart: pos - 8, bitEnd: pos, bits: str(pos - 8, pos), code: '', outStart: out.length, outEnd: out.length + 1 }); out.push(byte); blk.tokens++; }
        } else {
          let lit, dist;
          if (btype === 1) { const f = D.fixedLengths(); lit = book(D.assign(f.lit)); dist = book(D.assign(f.dist)); blk.fixed = true; }
          else {
            const hlit = bitsLE(5) + 257, hdist = bitsLE(5) + 1, hclen = bitsLE(4) + 4, order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], cl = new Array(19).fill(0);
            for (let i = 0; i < hclen; i++) cl[order[i]] = bitsLE(3);
            const clmap = book(D.assign(cl)), lens = []; while (lens.length < hlit + hdist) { const { sym } = decode(clmap); if (sym < 16) lens.push(sym); else if (sym === 16) { const r = 3 + bitsLE(2), p = lens[lens.length - 1]; for (let i = 0; i < r; i++) lens.push(p); } else if (sym === 17) { const r = 3 + bitsLE(3); for (let i = 0; i < r; i++) lens.push(0); } else { const r = 11 + bitsLE(7); for (let i = 0; i < r; i++) lens.push(0); } }
            lit = book(D.assign(lens.slice(0, hlit))); dist = book(D.assign(lens.slice(hlit, hlit + hdist))); blk.dynamic = { hlit, hdist, hclen }; blk.headerBits = pos - bStart;
          }
          for (;;) {
            const t0 = pos, { sym, code } = decode(lit);
            if (sym < 256) { tokens.push({ kind: 'lit', sym, byte: sym, bitStart: t0, bitEnd: pos, bits: str(t0, pos), code, outStart: out.length, outEnd: out.length + 1 }); out.push(sym); blk.tokens++; }
            else if (sym === 256) { tokens.push({ kind: 'end', sym, bitStart: t0, bitEnd: pos, bits: str(t0, pos), code, outStart: out.length, outEnd: out.length }); blk.tokens++; break; }
            else {
              const li = sym - 257, le = bitsLE(D.LEN_EXTRA[li]), len = D.LEN_BASE[li] + le, dd = decode(dist), di = dd.sym, de = bitsLE(D.DIST_EXTRA[di]), dst = D.DIST_BASE[di] + de, o0 = out.length;
              if (dst > out.length) { problems.push('distancia mayor que lo ya escrito'); break; }
              for (let i = 0; i < len; i++) out.push(out[out.length - dst]);
              tokens.push({ kind: 'match', sym, len, dist: dst, bitStart: t0, bitEnd: pos, bits: str(t0, pos), code, lenCode: sym, distCode: di, extra: { len: le, dist: de }, outStart: o0, outEnd: out.length }); blk.tokens++;
            }
          }
        }
        blk.bitEnd = pos; blocks.push(blk);
      }
    } catch (e) { problems.push(e.message); }
    return { ok: problems.length === 0, problems, out, tokens, blocks, bitsUsed: pos - s0, bytesUsed: Math.ceil((pos - s0) / 8) };
  };

  // ZIP: the local file headers (4 bytes signature 50 4B 03 04) and what they say about each entry. Reads sizes from the local header.
  D.parseZip = (b) => {
    const le16 = (p) => b[p] | (b[p + 1] << 8), le32 = (p) => (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0, entries = []; let p = 0;
    while (p + 30 <= b.length && le32(p) === 0x04034B50) {
      const nl = le16(p + 26), xl = le16(p + 28), e = { headerStart: p, version: le16(p + 4), flags: le16(p + 6), method: le16(p + 8), time: le16(p + 10), date: le16(p + 12), crc: le32(p + 14), compSize: le32(p + 18), size: le32(p + 22), nameLen: nl, extraLen: xl };
      e.name = new TextDecoder().decode(Uint8Array.from(Array.prototype.slice.call(b, p + 30, p + 30 + nl))); e.dataStart = p + 30 + nl + xl; e.dataEnd = e.dataStart + e.compSize; entries.push(e); p = e.dataEnd;
    }
    return entries;
  };
})(typeof window !== 'undefined' ? window : globalThis);
