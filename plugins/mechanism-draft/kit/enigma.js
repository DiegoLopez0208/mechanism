/*
 * kit/enigma.js - the logic of the Enigma I (Wehrmacht), pure (no three.js): it runs in the browser and in Node, so scripts/check-spec.mjs checks it
 * against published cases before anything is rendered.
 *
 *   const M = MX.enigma.create({ rotors: ['I', 'II', 'III'], reflector: 'B', rings: 'AAA', start: 'AAA', plugs: ['AB'] });
 *   M.press('A')  -> { out: 'B', path: [i0..i8], stepped: [bool, bool, bool], pos: [l, m, r], window: 'AAB' }
 *
 * Rules (Wikipedia "Enigma rotor details", Crypto Museum): the right rotor steps on every key; the middle one steps if the right one is at its notch
 * or if it is at its own (the "double step"); the left one steps if the middle one is at its notch. They step BEFORE enciphering. The notch is on the
 * alphabet ring: the step depends on the letter in the window, the wiring on the core position = window - ring.
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {}), A = 65, mod = (n) => ((n % 26) + 26) % 26;
  const E = (MX.enigma = {});
  E.WIRING = { I: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', II: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', III: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', IV: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', V: 'VZBRGITYUPSDNHLXAWMJQOFECK' };
  E.NOTCH = { I: 'Q', II: 'E', III: 'V', IV: 'J', V: 'Z' };
  E.REFLECTOR = { B: 'YRUHQSLDPXNGOKMIEBFZCWVJAT', C: 'FVPJIAOYEDRZXWGCTKUQSBNMHL' };
  const idx = (ch) => ch.charCodeAt(0) - A, letter = (i) => String.fromCharCode(A + mod(i));

  E.create = (cfg) => {
    const names = cfg.rotors, ref = E.REFLECTOR[cfg.reflector], rings = [...(cfg.rings || 'AAA')].map(idx), pos = [...(cfg.start || 'AAA')].map(idx);
    const fw = names.map((n) => [...E.WIRING[n]].map(idx)), bw = fw.map((w) => { const b = new Array(26); w.forEach((o, i) => { b[o] = i; }); return b; }), notch = names.map((n) => idx(E.NOTCH[n])), rf = [...ref].map(idx);
    const plug = Array.from({ length: 26 }, (_, i) => i); (cfg.plugs || []).forEach((p) => { const a = idx(p[0]), b = idx(p[1]); plug[a] = b; plug[b] = a; });
    const M = { names, pos, rings, notch };
    M.window = () => pos.map(letter).join('');
    // mechanical stepping: returns which rotors moved
    M.step = () => {
      const st = [false, false, false], mid = pos[1] === notch[1], rgt = pos[2] === notch[2];
      if (mid) { pos[0] = mod(pos[0] + 1); st[0] = true; }
      if (mid || rgt) { pos[1] = mod(pos[1] + 1); st[1] = true; }
      pos[2] = mod(pos[2] + 1); st[2] = true; return st;
    };
    M.press = (ch) => {
      const stepped = M.step(), path = []; let c = plug[idx(ch)]; path.push(c);
      const off = (k) => mod(pos[k] - rings[k]);
      for (let k = 2; k >= 0; k--) { c = mod(fw[k][mod(c + off(k))] - off(k)); path.push(c); }        // derecha -> izquierda
      c = rf[c]; path.push(c);                                                                         // reflector
      for (let k = 0; k <= 2; k++) { c = mod(bw[k][mod(c + off(k))] - off(k)); path.push(c); }        // izquierda -> derecha
      c = plug[c]; path.push(c);
      return { out: letter(c), path, stepped, pos: pos.slice(), window: M.window() };
    };
    M.encipher = (text) => [...text.toUpperCase().replace(/[^A-Z]/g, '')].map((ch) => M.press(ch).out).join('');
    return M;
  };
  E.letter = letter; E.index = idx;
})(typeof window !== 'undefined' ? window : globalThis);
