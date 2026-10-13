/*
 * spec.js - Fig 7: la maquina Enigma I (Wehrmacht), su bloque de rotores, como SPEC declarativo con un mecanismo de CIFRADO.
 *
 * SPEC       cableado de los rotores I, II, III y del reflector B, letras de salto, casos de prueba publicados (AAAAA -> BDZGO, anillos BBB -> EWTYX,
 *            doble paso ADU -> ADV -> AEW -> BFX).
 * DERIVED    la maquina simulada con esas tablas REPRODUCE los casos publicados letra por letra: si una letra del cableado estuviera mal, no pasaria.
 * ESTIMATED  tamanos (diametro del rotor ~ 100 mm segun una fuente secundaria), trinquetes, unas, ejes y bastidor; no se modelan el tablero de
 *            conexiones, la palanca del teclado ni la caja.
 */
window.SPEC = (() => {
  const EN = { rotors: ['I', 'II', 'III'], reflector: 'B', rings: 'AAA', start: 'AAA' };
  const T = (id, o) => Object.assign({ id }, EN, o);
  return {
    brand: { accent: '#c9a227' }, id: 'enigma', orient: [0, 90, 0], fig: 'Fig 7', kicker: 'ROTOR CIPHER MACHINE', title: 'Enigma I', sub: 'Three rotors, a reflector, 26 wires each. It has to reproduce the published tests.',
    stage: { floorY: -66, shadow: 0.14 },
    research: {
      sources: [
        { id: 'wiki-rotors', title: 'Wikipedia, Enigma rotor details', url: 'https://en.wikipedia.org/wiki/Enigma_rotor_details', fetched: '2026-10-13', note: 'Opened. Wiring tables, notches, the double-stepping sequence and the AAAAA > BDZGO test (the page marks that one "citation needed"; the simulation reproduces it).' },
        { id: 'cryptomuseum', title: 'Crypto Museum, Enigma I and wiring pages', url: 'https://www.cryptomuseum.com/crypto/enigma/wiring.htm', fetched: '2026-10-13', note: 'Only the search-result snippets were read, not the full pages: ring markings (numbers 01-26 on Army rotors, letters on Navy ones).' },
        { id: 'codes-ciphers', title: 'Codes and Ciphers, the components of the Enigma machine', url: 'https://codesandciphers.org.uk/enigma/enigma2.htm', fetched: '2026-10-13', note: 'Only the search-result snippet was read: rotors described as round disks about 4 inches across.' },
      ],
      claims: [
        { id: 'wiring', conf: 'spec', text: 'Rotor I EKMFLGDQVZNTOWYHXUSPAIBRCJ, rotor II AJDKSIRUXBLHWTMCQGZNPYFVOE, rotor III BDFHJLCPRTXVZNYEIWGAKMUSQO; reflector B YRUHQSLDPXNGOKMIEBFZCWVJAT.', src: ['wiki-rotors'] },
        { id: 'notch', conf: 'spec', text: 'Turnover notches: rotor I at Q, rotor II at E, rotor III at V.', src: ['wiki-rotors'] },
        { id: 'vectors', conf: 'spec', text: 'Rotors I-II-III, reflector B, rings AAA, start AAA: AAAAA becomes BDZGO. With rings BBB it becomes EWTYX.', src: ['wiki-rotors'] },
        { id: 'tests', conf: 'derived', text: 'The model reproduces both published vectors and the double step, letter by letter.', src: ['wiki-rotors'], cross: 'The simulation of the published wiring and stepping rules gives exactly BDZGO and EWTYX; one wrong letter in a wiring table would change them.' },
        { id: 'doublestep', conf: 'spec', text: 'From ADU the windows read ADV, AEW, BFX: the middle rotor steps twice in a row.', src: ['wiki-rotors'] },
        { id: 'recip', conf: 'derived', text: 'The machine is reciprocal: the same settings turn the cipher text back into the plain text.', src: ['wiki-rotors'], cross: 'The reflector wires the letters in pairs; the simulation confirms it on 10 letters with two plug pairs, and in the film on HELLO.' },
        { id: 'ring', conf: 'spec', text: 'The film shows letters A-Z on the rotor rings. Army and Air Force rotors carried numbers 01-26; the Navy used letters.', src: ['cryptomuseum'] },
        { id: 'dims', conf: 'estimated', text: 'Rotor diameter 100 mm (a secondary source says about 4 inches), thickness 12 mm, contact circle 64 mm, ratchets, pawls, axle and end plates.', why: 'No source gives the parts in millimetres; sizes follow the rough rotor proportions.' },
        { id: 'scope', conf: 'estimated', text: 'Not modelled: plugboard, keyboard linkage, lampboard housing, ring locking and the case. The film plugs nothing in.', why: 'The rotor stack alone decides these tests; the plugboard is covered only by the reciprocity check.' },
      ],
    },
    parts: [
      { id: 'wallL', name: 'End plate (left)', kind: 'plate', p: { w: 132, h: 132, r: 12, t: 4, holes: [[0, 0, 4.7]] }, mat: 'glass', at: [0, 0, -48], explode: [0, 0, -50], conf: 'estimated', claims: ['dims'], cutaway: true, tour: false },
      { id: 'ukw', name: 'Reflector B', role: 'UKW', kind: 'rotor', p: { r: 48, w: 10, rc: 32 }, mat: 'black', at: [0, 0, -40], explode: [0, 0, -34], conf: 'derived', claims: ['wiring', 'tests'], info: { title: 'Reflector B', lines: ['wires the 26 letters in 13 pairs', 'so a letter never becomes itself', 'YRUHQSLDPXNGOKMIEBFZCWVJAT'], conf: ['spec', 'derived'] } },
      { id: 'ratchetL', name: 'Ratchet wheel (left)', kind: 'gear', p: { m: 1.6, z: 26, width: 2.4, bore: 4.8 }, mat: 'steel', body: 'rotorL', at: [0, 0, -29], explode: [0, 0, -24], conf: 'estimated', claims: ['dims'], tour: false },
      { id: 'rotorL', name: 'Left rotor (I)', role: 'L', kind: 'rotor', p: { r: 50, w: 12, rc: 32 }, mat: 'black', body: 'rotorL', at: [0, 0, -18], explode: [0, 0, -16], conf: 'derived', claims: ['wiring', 'notch', 'tests', 'ring'], info: { title: 'Left rotor (I)', lines: ['26 wires inside, notch at Q', 'moves only when the middle one pushes', 'EKMFLGDQVZNTOWYHXUSPAIBRCJ'], conf: ['spec', 'derived'] } },
      { id: 'ratchetM', name: 'Ratchet wheel (middle)', kind: 'gear', p: { m: 1.6, z: 26, width: 2.4, bore: 4.8 }, mat: 'steel', body: 'rotorM', at: [0, 0, -7], explode: [0, 0, -8], conf: 'estimated', claims: ['dims'], tour: false },
      { id: 'rotorM', name: 'Middle rotor (II)', role: 'M', kind: 'rotor', p: { r: 50, w: 12, rc: 32 }, mat: 'black', body: 'rotorM', at: [0, 0, 2], explode: [0, 0, 0], conf: 'derived', claims: ['wiring', 'notch', 'doublestep', 'ring'], info: { title: 'Middle rotor (II)', lines: ['notch at E: it can step twice in a row', 'the double step: ADU, ADV, AEW, BFX', 'AJDKSIRUXBLHWTMCQGZNPYFVOE'], conf: ['spec', 'derived'] } },
      { id: 'ratchetR', name: 'Ratchet wheel (right)', kind: 'gear', p: { m: 1.6, z: 26, width: 2.4, bore: 4.8 }, mat: 'steel', body: 'rotorR', at: [0, 0, 13], explode: [0, 0, 8], conf: 'estimated', claims: ['dims'], info: { title: 'Ratchet wheel', lines: ['26 teeth, one per letter', 'the pawl pushes it at every key', 'tooth shape: estimated'], conf: ['estimated'] } },
      { id: 'rotorR', name: 'Right rotor (III)', role: 'R', kind: 'rotor', p: { r: 50, w: 12, rc: 32 }, mat: 'black', body: 'rotorR', at: [0, 0, 22], explode: [0, 0, 18], conf: 'derived', claims: ['wiring', 'notch', 'tests', 'ring'], info: { title: 'Right rotor (III)', lines: ['steps at every key, before the letter is enciphered', 'notch at V pushes the middle rotor', 'BDFHJLCPRTXVZNYEIWGAKMUSQO'], conf: ['spec', 'derived'] } },
      { id: 'etw', name: 'Entry wheel', role: 'ETW', kind: 'rotor', p: { r: 44, w: 8, rc: 32 }, mat: 'black', at: [0, 0, 40], explode: [0, 0, 34], conf: 'derived', claims: ['wiring'], info: { title: 'Entry wheel', lines: ['straight wiring: A to A, B to B', 'the keyboard connects to it'], conf: ['spec'] } },
      { id: 'pawlL', name: 'Pawl (left)', kind: 'block', p: { w: 3.4, d: 7, h: 2.4, r: 0.4 }, mat: 'steel', at: [0, 23.2, -29], slide: { axis: 'y', k: -1.4 }, explode: [0, 0, -24], conf: 'estimated', claims: ['dims'], tour: false },
      { id: 'pawlM', name: 'Pawl (middle)', kind: 'block', p: { w: 3.4, d: 7, h: 2.4, r: 0.4 }, mat: 'steel', at: [0, 23.2, -7], slide: { axis: 'y', k: -1.4 }, explode: [0, 0, -8], conf: 'estimated', claims: ['dims'], tour: false },
      { id: 'pawlR', name: 'Pawl (right)', kind: 'block', p: { w: 3.4, d: 7, h: 2.4, r: 0.4 }, mat: 'steel', at: [0, 23.2, 13], slide: { axis: 'y', k: -1.4 }, explode: [0, 0, 8], conf: 'estimated', claims: ['dims'], info: { title: 'Pawls', lines: ['three, one per rotor', 'each key press pushes the ratchets', 'the notches decide which ones move'], conf: ['estimated'] } },
      { id: 'axle', name: 'Axle', kind: 'shaft', p: { r: 4, len: 104 }, mat: 'chrome', at: [0, 0, 1], explode: [0, 0, 0], conf: 'estimated', claims: ['dims'], tour: false },
      { id: 'wallR', name: 'End plate (right)', kind: 'plate', p: { w: 132, h: 132, r: 12, t: 4, holes: [[0, 0, 4.7]] }, mat: 'glass', at: [0, 0, 50], explode: [0, 0, 50], conf: 'estimated', claims: ['dims'], cutaway: true, tour: false },
    ],
    mechanism: {
      enigma: Object.assign({}, EN, {
        tests: [
          T('AAAAA, rings AAA', { plain: 'AAAAA', expect: 'BDZGO' }),
          T('AAAAA, rings BBB', { rings: 'BBB', plain: 'AAAAA', expect: 'EWTYX' }),
          T('double step from ADU', { start: 'ADU', plain: 'AAA', windows: ['ADV', 'AEW', 'BFX'] }),
          T('reciprocal with plugs', { rotors: ['II', 'IV', 'V'], start: 'QWE', plugs: ['AB', 'CD'], plain: 'HELLOWORLD', decrypt: true }),
        ],
      }),
      drive: {
        modes: [
          { id: 't1', label: 'Test vector', start: 'AAA', text: 'AAAAA', publish: { text: 'BDZGO', claim: 'vectors' }, formula: 'rotors I II III, reflector B, rings AAA, start AAA' },
          { id: 'ds', label: 'Double step', start: 'ADU', text: 'AAA', publish: { text: 'ADV AEW BFX', windows: true, claim: 'doublestep' }, formula: 'from ADU the middle rotor steps twice in a row' },
          { id: 'msg', label: 'A message', start: 'MCK', text: 'HELLO', formula: 'start MCK: the cipher text is made letter by letter' },
          { id: 'dec', label: 'And back', start: 'MCK', text: '@prev', publish: { text: 'HELLO', claim: 'recip' }, formula: 'the same settings turn the cipher text back into HELLO' },
        ],
      },
    },
    director: { cold: { dur: 9, question: 'Does a model built only from the published wiring give what a real Enigma gave?' }, sound: { bed: { bpm: 54, root: 38, mode: 'minor', level: 0.36, prog: [0, 3, 5, 4], arp: false }, room: { size: 0.8, wet: 0.14, fb: 0.7 } }, keyDur: 1.2, tourDur: 3.4, tour: ['etw', 'rotorR', 'ratchetR', 'rotorM', 'rotorL', 'ukw', 'pawlR'], views: { iso: { yaw: -30, pitch: 28 }, front: { yaw: -14, pitch: 12 }, side: { yaw: -62, pitch: 22 }, three: { yaw: -22, pitch: 58 } } },
  };
})();
