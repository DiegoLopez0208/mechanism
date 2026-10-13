/*
 * kit/enigma.js - la logica de la Enigma I (Wehrmacht), pura (sin three.js): corre en el navegador y en Node, asi scripts/check-spec.mjs la verifica
 * contra casos publicados antes de que se renderice nada.
 *
 *   const M = MX.enigma.create({ rotors: ['I', 'II', 'III'], reflector: 'B', rings: 'AAA', start: 'AAA', plugs: ['AB'] });
 *   M.press('A')  -> { out: 'B', path: [i0..i8], stepped: [bool, bool, bool], pos: [l, m, r], window: 'AAB' }
 *
 * Reglas (Wikipedia "Enigma rotor details", Crypto Museum): el rotor derecho avanza en cada tecla; el medio avanza si el derecho esta en su muesca o
 * si el mismo esta en la suya (el "doble paso"); el izquierdo avanza si el medio esta en su muesca. Avanzan ANTES de cifrar. La muesca va en el anillo
 * del alfabeto: el salto depende de la letra de la ventana, el cableado depende de la posicion del nucleo = ventana - anillo.
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
    // avance mecanico: devuelve que rotores se movieron
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
