/*
 * kit/spec-core.js - la parte pura del spec declarativo (sin three.js): analiza el mecanismo (cinematica, fases de dientes, distancias entre centros,
 * relacion de cada modo) y VALIDA la evidencia. Corre en el navegador (kit/spec.js) y en Node (scripts/check-spec.mjs), asi un objeto que no cumple
 * sus propias reglas no llega a renderizarse.
 *
 * Forma del spec (ver examples/hub/spec.js):
 *   { id, fig, kicker, title, sub, aspect,
 *     research: { sources: [{ id, title, url, fetched, note }],
 *                 claims:  [{ id, text, conf: 'spec'|'measured'|'derived'|'estimated', value, unit, src: [ids], cross, error, why }] },
 *     parts: [{ id, name, kind, p: { ...medidas en mm... }, mat, at: [x, y, z], explode: [x, y, z], body, orbit: { center, r, a0, around },
 *               conf, claims: [ids], info: { title, lines, conf } }],
 *     mechanism: { free, links: [{ t: 'fixed'|'same'|'ext'|'int', a, b, carrier }],
 *                  drive: { rpm, modes: [{ id, label, driver, shell, publish: { value, text, claim, tol }, formula }] } },
 *     director: { modeDur, tourDur, tour: [ids], views: {...} } }
 * Reglas: todo numero SPEC/MEASURED/DERIVED nombra su fuente; DERIVED trae su cruce; MEASURED trae su error; ESTIMATED trae su porque.
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {}), S = (MX.spec = MX.spec || {});
  const KINDS = ['gear', 'ring', 'sprocket', 'shaft', 'pin', 'disc', 'flange', 'tube', 'plate', 'bearing', 'spring', 'nut', 'bolt', 'box', 'block', 'cross', 'rotor', 'crankshaft', 'conrod', 'piston', 'engblock', 'camshaft', 'valve', 'cubie', 'fan', 'fins'];
  const CONFS = ['spec', 'measured', 'derived', 'estimated'];
  S.KINDS = KINDS; S.CONFS = CONFS;
  const teethOf = (d) => (d.kind === 'gear' || d.kind === 'ring' ? d.p.z : d.kind === 'sprocket' ? d.p.teeth : null);
  const startPos = (d) => (d.orbit ? [d.orbit.center[0] + d.orbit.r * Math.cos(d.orbit.a0 * Math.PI / 180), d.orbit.center[1] + d.orbit.r * Math.sin(d.orbit.a0 * Math.PI / 180), d.at ? d.at[2] : 0] : d.at);
  S.startPos = startPos; S.teethOf = teethOf;

  // mecanismo de presion (switch, pulsador, palanca): un solo recorrido x entre 0 y travel; la fuerza sale de los puntos publicados
  // y se cruza con lo que daria un resorte lineal por los dos primeros: si no cierra, el spec tiene que decirlo (press.note)
  function analyzePress(M, out) {
    const pr = M.press, pts = pr.force || [], pk = { travel: pr.travel, actuation: pr.actuation };
    if (pts.length >= 3) { const k = (pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0]), last = pts[pts.length - 1], pred = pts[0][1] + k * (last[0] - pts[0][0]); pk.slope = k; pk.predictedFinal = pred; pk.publishedFinal = last[1]; pk.off = (last[1] - pred) / pred; pk.consistent = Math.abs(pk.off) <= 0.05; if (!pk.consistent && !pr.note) out.problems.push('the published force points do not add up with a linear spring (' + pred.toFixed(1) + ' expected, ' + last[1] + ' published) and the spec does not explain it (press.note)'); }
    out.press = pk; out.modes = [];
    ((M.drive && M.drive.modes) || []).forEach((m) => { const pub = m.publish, ok = pub ? Math.abs(m.to - pub.value) <= (pub.tol == null ? 0.01 : pub.tol) : null; out.modes.push({ id: m.id, label: m.label, ratio: m.to, publish: pub || null, ok }); if (ok === false) out.problems.push('phase ' + m.label + ': the model reaches ' + m.to + ' and the published one is ' + pub.value); });
  }

  // Enigma: cada prueba publicada (rotores, anillos, posicion inicial, texto -> cifrado, o la secuencia de ventanas) se SIMULA con kit/enigma.js;
  // si no da lo publicado, el cableado o las reglas estan mal y el spec no pasa. Las fases del video se simulan igual y dejan sus eventos listos.
  function analyzeEnigma(M, out) {
    const en = M.enigma, E = MX.enigma; if (!E) { out.problems.push('kit/enigma.js is missing'); return; }
    out.enigmaTests = [];
    (en.tests || []).forEach((t) => {
      const m = E.create(t), evs = [...t.plain].map((ch) => m.press(ch)), got = evs.map((e) => e.out).join(''), win = evs.map((e) => e.window), r = { id: t.id, got, expect: t.expect, ok: true };
      if (t.expect && got !== t.expect) { r.ok = false; out.problems.push('test ' + t.id + ': the machine gives ' + got + ' and the published one is ' + t.expect); }
      if (t.windows && win.join(' ') !== t.windows.join(' ')) { r.ok = false; r.win = win.join(' '); out.problems.push('test ' + t.id + ': windows ' + win.join(' ') + ' against the published ' + t.windows.join(' ')); }
      if (t.decrypt) { const back = E.create(t).encipher(got); if (back !== t.plain) { r.ok = false; out.problems.push('test ' + t.id + ': the machine is not reciprocal (' + got + ' -> ' + back + ')'); } }
      out.enigmaTests.push(r);
    });
    out.enigmaRuns = []; let prev = '';
    ((M.drive && M.drive.modes) || []).forEach((m) => {
      const m2 = E.create(Object.assign({}, en, { start: m.start || en.start })), text = m.text === '@prev' ? prev : m.text, start = m2.pos.slice(), events = [...text].map((ch) => Object.assign({ ch }, m2.press(ch))), outS = events.map((e) => e.out).join(''), wins = events.map((e) => e.window);
      prev = outS; out.enigmaRuns.push({ start, events, text, out: outS });
      let ok = null; if (m.publish && m.publish.text) { ok = (m.publish.windows ? wins.join(' ') : outS) === m.publish.text; if (!ok) out.problems.push('phase ' + m.label + ': ' + (m.publish.windows ? wins.join(' ') : outS) + ' and the published one is ' + m.publish.text); }
      out.modes.push({ id: m.id, label: m.label, ratio: null, text: m.publish && m.publish.windows ? wins.join(' ') : outS, publish: m.publish || null, ok });
    });
  }

  // Motor de piston (biela-manivela). Con radio de manivela r = carrera / 2, biela l y angulo a (0 = punto muerto superior) el perno del piston esta en
  // y = r cos a + sqrt(l^2 - r^2 sin^2 a) y la biela se inclina atan2(r sin a, sqrt(l^2 - r^2 sin^2 a)). Es la cinematica exacta, no un seno aproximado.
  S.eng = {
    pinY: (r, l, a) => r * Math.cos(a) + Math.sqrt(l * l - r * r * Math.sin(a) * Math.sin(a)),
    rodAng: (r, l, a) => Math.atan2(r * Math.sin(a), Math.sqrt(l * l - r * r * Math.sin(a) * Math.sin(a))),
    // fase de un cilindro en su ciclo de 720 grados (0 = encendido): 0-180 fuerza, 180-360 escape, 360-540 admision, 540-720 compresion
    phase: (theta, ign) => (((theta - ign) % 720) + 720) % 720,
    stroke: (phi) => (phi < 180 ? 'POWER' : phi < 360 ? 'EXHAUST' : phi < 540 ? 'INTAKE' : 'COMPRESSION'),
    lift: (phi, open, close, max) => { const L = (((close - open) % 720) + 720) % 720, u = (((phi - open) % 720) + 720) % 720; return u >= L ? 0 : max * Math.pow(Math.sin(Math.PI * u / L), 2); },
  };
  // El orden de encendido publicado tiene que ser posible con el cigueñal: el cilindro que enciende en el lugar i del orden lo hace a i * 720 / n grados
  // y esa posicion solo existe si coincide (modulo 360) con el angulo de su munequilla; la leva se encarga de la vuelta que sobra (cam = 0 o 1).
  function analyzeEngine(M, out) {
    const en = M.engine, n = en.cylinders, r = en.stroke / 2, ign = [], cam = [];
    if ((en.throws || []).length !== n) out.problems.push('the crankshaft declares ' + (en.throws || []).length + ' crank throws and the engine has ' + n + ' cylinders');
    if ((en.firing || []).length !== n || new Set(en.firing).size !== n) out.problems.push('the firing order must name each cylinder once');
    else en.firing.forEach((cyl, i) => { const need = i * 720 / n, th = en.throws[cyl - 1], d = need - th; if (Math.abs(((d % 360) + 360) % 360) > 1e-6 && Math.abs((((d % 360) + 360) % 360) - 360) > 1e-6) out.problems.push('firing order ' + en.firing.join('-') + ': cylinder ' + cyl + ' would have to fire at ' + need + ' degrees and its crank throw is at ' + th + ' (not possible with that crankshaft)'); ign[cyl - 1] = need; cam[cyl - 1] = Math.round((((d % 720) + 720) % 720) / 360) % 2; });
    const disp = n * Math.PI / 4 * en.bore * en.bore * en.stroke / 1000, chImplied = en.deck != null ? en.deck - r - en.rod : null;
    if (en.deck != null && en.ch != null && Math.abs(chImplied - en.ch) > 0.05) out.problems.push('the piston does not reach the deck: deck ' + en.deck + ' - crank radius ' + r + ' - rod ' + en.rod + ' = ' + chImplied.toFixed(2) + ' mm and the declared compression height is ' + en.ch);
    if (en.pitch < en.bore + 2) out.problems.push('the cylinder spacing (' + en.pitch + ' mm) leaves less than 2 mm of wall between liners of ' + en.bore + ' mm');
    out.engine = { n, r, ign, cam, displacement: disp, rodRatio: en.rod / r, ch: chImplied, firing: (en.firing || []).join('-') };
    ((M.drive && M.drive.modes) || []).forEach((m) => {
      const pub = m.publish, val = m.metric === 'displacement' ? disp : null, text = m.metric === 'firing' ? out.engine.firing : val != null ? val.toFixed(1) : '';
      const ok = !pub ? null : m.metric === 'displacement' ? Math.abs(val - pub.value) <= (pub.tol == null ? 1 : pub.tol) : text === pub.text;
      out.modes.push({ id: m.id, label: m.label, ratio: val, text, publish: pub || null, ok });
      if (ok === false) out.problems.push('phase ' + m.label + ': the model gives ' + text + ' and the published one is ' + (pub.text || pub.value));
    });
  }

  // Cubo de Rubik: cada fase corre su secuencia sobre kit/cube.js (la geometria de 26 cubitos, sin tablas) y se compara con lo publicado:
  // el periodo de una secuencia, el superflip (20 giros que dejan las 12 aristas dadas vuelta y las 8 esquinas en su sitio) y el numero de posiciones.
  function analyzeCube(M, out) {
    const cb = M.cube, C = MX.cube; if (!C) { out.problems.push('kit/cube.js is missing'); return; }
    const st = C.create(); out.cubeRuns = []; out.cube = { pieces: st.length };
    if (cb.pieces != null && cb.pieces !== st.length) out.problems.push('the model has ' + st.length + ' cubies and the published count is ' + cb.pieces);
    ((M.drive && M.drive.modes) || []).forEach((m) => {
      let moves = [], one = m.alg ? C.parse(m.alg) : []; for (let i = 0; i < (m.repeat || 1); i++) moves = moves.concat(one); if (m.back) moves = moves.concat(C.invert(moves));
      C.run(st, moves); const cl = C.classify(st), pub = m.publish; let text = '', val = null, ok = null;
      if (m.metric === 'order') { val = C.order(one, 5000); text = String(val); if (pub) ok = val === pub.value; }
      else if (m.metric === 'superflip') { text = moves.length + ' moves'; if (pub) ok = cl.edgesInPlace === 12 && cl.edgesFlipped === 12 && cl.cornersInPlace === 8 && cl.cornersTwisted === 0 && moves.length === pub.length; }
      else if (m.metric === 'positions') { text = C.positions().toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); if (pub) ok = text === pub.text; }
      if (m.ends === 'solved' && !cl.solved) out.problems.push('phase ' + m.label + ': the sequence had to leave the cube solved and does not');
      out.cubeRuns.push({ moves, state: cl }); out.modes.push({ id: m.id, label: m.label, ratio: val, text, publish: pub || null, ok });
      if (ok === false) out.problems.push('phase ' + m.label + ': the model gives ' + text + (m.metric === 'superflip' ? ' (' + cl.edgesFlipped + ' flipped edges, ' + cl.cornersTwisted + ' twisted corners)' : '') + ' and the published one is ' + (pub.text || pub.value || pub.length + ' moves'));
    });
  }

  // Cuentas: cada fase evalua una expresion sobre variables declaradas (cada una con su afirmacion) y la compara con el numero publicado.
  // Sirve para cualquier producto cuya ficha publique una cifra que sale de otras (TFLOPS = nucleos x 2 x reloj, ancho de banda = bus x velocidad / 8).
  function analyzeCalc(M, out) {
    const cc = M.calc, V = cc.vars || {}, names = Object.keys(V), vals = names.map((k) => (V[k] !== null && typeof V[k] === 'object' ? V[k].v : V[k]));
    out.calc = { vars: V };
    ((M.drive && M.drive.modes) || []).forEach((m) => {
      let val = null; try { val = new Function(...names, 'return (' + m.expr + ');')(...vals); } catch (e) { out.problems.push('phase ' + m.label + ': cannot evaluate ' + m.expr + ' (' + e.message + ')'); }
      const d = m.digits == null ? 2 : m.digits, pub = m.publish, isS = typeof val === 'string', text = val == null ? '' : isS ? val : val.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
      const ok = !pub || val == null ? null : isS ? val === pub.text : Math.abs(val - pub.value) <= (pub.tol == null ? Math.abs(pub.value) * 0.005 : pub.tol);
      out.modes.push({ id: m.id, label: m.label, ratio: val, text, publish: pub || null, ok, used: (m.expr.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter((k, i, a) => k in V && a.indexOf(k) === i) });
      if (ok === false) out.problems.push('phase ' + m.label + ': the model gives ' + text + ' and the published one is ' + (pub.text != null ? pub.text : pub.value));
    });
  }

  // analisis del mecanismo: cinematica, fases de dientes, distancias entre centros, relaciones por modo
  S.analyze = (spec) => {
    const out = { problems: [], K: null, modes: [], phi: {}, meshes: [], centers: [] }, M = spec.mechanism;
    if (!M || !MX.kin) return out;
    if (M.press) analyzePress(M, out);
    if (M.enigma) { analyzeEnigma(M, out); return out; }
    if (M.engine) { analyzeEngine(M, out); return out; }
    if (M.cube) { analyzeCube(M, out); return out; }
    if (M.calc) { analyzeCalc(M, out); return out; }
    if (!M.links || !M.links.length) return out;
    const byBody = {}; spec.parts.forEach((d) => { const b = d.body || d.id; (byBody[b] = byBody[b] || []).push(d); });
    const gearOf = (b) => (byBody[b] || []).find((d) => teethOf(d)) || (byBody[b] || [])[0];
    const teeth = {}; Object.keys(byBody).forEach((b) => { const d = (byBody[b] || []).find((q) => teethOf(q)); if (d) teeth[b] = teethOf(d); });
    const bodies = Array.from(new Set([].concat(M.bodies || [], M.links.flatMap((l) => [l.a, l.b, l.carrier].filter(Boolean)), M.free)));
    bodies.forEach((b) => { if (!(b in teeth)) teeth[b] = 1; });
    const K = (out.K = MX.kin({ bodies, teeth, free: M.free, links: M.links }));
    if (K.residual > 1e-6) out.problems.push('the gear train is over-constrained or jammed (residual ' + K.residual.toExponential(1) + ')');
    M.links.filter((l) => l.t === 'ext' || l.t === 'int').forEach((l) => {
      const da = gearOf(l.a), db = gearOf(l.b); if (!da || !db) { out.problems.push('the gear pair ' + l.a + '-' + l.b + ' has no parts with teeth'); return; }
      const pa = startPos(da), pb = startPos(db), beta = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), dist = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
      out.meshes.push({ a: l.a, b: l.b, t: l.t, beta });
      const need = MX.kin.center(l.t, da.p.m, teethOf(da), teethOf(db));
      out.centers.push({ a: l.a, b: l.b, dist, need, ok: Math.abs(dist - need) < 0.02 && Math.abs(da.p.m - db.p.m) < 1e-9 });
    });
    out.centers.filter((c) => !c.ok).forEach((c) => out.problems.push('centre distance ' + c.a + '-' + c.b + ': ' + c.dist.toFixed(3) + ' mm, the geometry needs ' + c.need.toFixed(3) + ' mm (and the same module)'));
    if (out.meshes.length) {
      const ph = K.phases(out.meshes, out.meshes[0].a); out.phi = ph.phi;
      ph.checks.filter((c) => !c.ok).forEach((c) => out.problems.push('the teeth of ' + c.a + '-' + c.b + ' do not mesh (residual ' + (c.residual == null ? 'n/d' : c.residual.toExponential(1)) + ')'));
    }
    if (M.press) return out;
    ((M.drive && M.drive.modes) || []).forEach((m) => {
      const ratio = m.shell === 'driver' ? 1 : K.rates[m.shell] / K.rates[m.driver], pub = m.publish, ok = pub ? Math.abs(ratio - pub.value) <= (pub.tol == null ? 0.005 : pub.tol) : null;
      out.modes.push({ id: m.id, label: m.label, ratio, publish: pub || null, ok });
      if (ok === false) out.problems.push('mode ' + m.label + ': the model gives ' + ratio.toFixed(4) + ' and the published one is ' + pub.value);
    });
    return out;
  };

  // validacion de evidencia + mecanismo; devuelve { errors, warnings, lines }
  S.validate = (spec) => {
    const errors = [], warnings = [], R = spec.research || { sources: [], claims: [] }, src = {}, cl = {}, ids = new Set();
    (R.sources || []).forEach((s) => { if (!s.id || !s.title || !/^https?:\/\//.test(s.url || '')) errors.push('incomplete source: ' + JSON.stringify(s).slice(0, 80)); if (!s.fetched) warnings.push('source ' + s.id + ' has no fetch date'); src[s.id] = s; });
    (R.claims || []).forEach((c) => {
      cl[c.id] = c; if (!CONFS.includes(c.conf)) errors.push('claim ' + c.id + ': invalid conf (' + c.conf + ')');
      if (!c.text) errors.push('claim ' + c.id + ' has no text');
      if (c.conf !== 'estimated') { if (!c.src || !c.src.length) errors.push('claim ' + c.id + ' (' + c.conf + ') names no source'); (c.src || []).forEach((s) => { if (!src[s]) errors.push('claim ' + c.id + ' cites a source that does not exist: ' + s); }); }
      if (c.conf === 'derived' && !c.cross) errors.push('claim ' + c.id + ' is DERIVED and has no cross-check against a second published number');
      if (c.conf === 'measured' && !c.error) errors.push('claim ' + c.id + ' is MEASURED and does not state its error');
      if (c.conf === 'estimated' && !c.why) errors.push('claim ' + c.id + ' is ESTIMATED and does not say why nobody publishes it');
    });
    spec.parts.forEach((d) => {
      if (ids.has(d.id)) errors.push('duplicate part: ' + d.id); ids.add(d.id);
      if (!KINDS.includes(d.kind)) errors.push('part ' + d.id + ': unknown kind ' + d.kind);
      if (!CONFS.includes(d.conf)) errors.push('part ' + d.id + ': missing conf (spec | measured | derived | estimated)');
      if (!d.at && !d.orbit) errors.push('part ' + d.id + ': missing at or orbit');
      if (d.conf && d.conf !== 'estimated' && !d.decor) { if (!d.claims || !d.claims.length) errors.push('part ' + d.id + ' es ' + d.conf.toUpperCase() + ' and cites no claim'); (d.claims || []).forEach((c) => { if (!cl[c]) errors.push('part ' + d.id + ' cites a claim that does not exist: ' + c); }); }
      if (d.conf === 'estimated' && !(d.claims || []).length && !d.why) warnings.push('part ' + d.id + ' is ESTIMATED without saying why');
    });
    const an = S.analyze(spec); an.problems.forEach((p) => errors.push(p));
    ((spec.mechanism && spec.mechanism.drive && spec.mechanism.drive.modes) || []).forEach((m) => { if (m.publish && m.publish.claim && !cl[m.publish.claim]) errors.push('mode ' + m.label + ' cites a claim that does not exist: ' + m.publish.claim); });
    const lines = []; lines.push('parts: ' + spec.parts.length + '   claims: ' + (R.claims || []).length + '   sources: ' + (R.sources || []).length);
    CONFS.forEach((k) => lines.push('  ' + k.toUpperCase().padEnd(10) + ' parts ' + spec.parts.filter((d) => d.conf === k).length + '   claims ' + (R.claims || []).filter((c) => c.conf === k).length));
    if (an.enigmaTests) { lines.push('enigma: published tests'); an.enigmaTests.forEach((t) => lines.push('  ' + t.id + ': ' + t.got + (t.expect ? ' (published ' + t.expect + ')' : '') + (t.win ? ' windows ' + t.win : '') + (t.ok ? '  ok' : '  MISMATCH'))); an.modes.forEach((m) => lines.push('  phase ' + m.label + ': ' + m.text + (m.publish ? '  published ' + m.publish.text + (m.ok ? '  ok' : '  MISMATCH') : ''))); }
    if (an.engine) { const e = an.engine; lines.push('engine: ' + e.n + ' cylinders, displacement ' + e.displacement.toFixed(1) + ' cc, relacion biela/radio ' + e.rodRatio.toFixed(2) + (e.ch != null ? ', implied compression height ' + e.ch.toFixed(2) + ' mm' : '') + ', order ' + e.firing); an.modes.forEach((m) => lines.push('  phase ' + m.label + ': ' + m.text + (m.publish ? '  published ' + (m.publish.text || m.publish.value) + (m.ok ? '  ok' : '  MISMATCH') : ''))); }
    if (an.cube) { lines.push('cube: ' + an.cube.pieces + ' cubies'); an.modes.forEach((m, i) => lines.push('  phase ' + m.label + ': ' + m.text + ' (' + an.cubeRuns[i].moves.length + ' turns)' + (m.publish ? '  published ' + (m.publish.text || m.publish.value || m.publish.length + ' moves') + (m.ok ? '  ok' : '  MISMATCH') : ''))); }
    if (an.calc) { lines.push('calc: ' + Object.keys(an.calc.vars).length + ' variables'); an.modes.forEach((m) => lines.push('  phase ' + m.label + ': ' + m.text + (m.publish ? '  published ' + (m.publish.text != null ? m.publish.text : m.publish.value) + (m.ok ? '  ok' : '  MISMATCH') : ''))); }
    if (an.press) { lines.push('press: travel ' + an.press.travel + ' mm, actuation ' + an.press.actuation + ' mm' + (an.press.predictedFinal ? '; a linear spring would give ' + an.press.predictedFinal.toFixed(1) + ' at the end, published ' + an.press.publishedFinal + (an.press.consistent ? '  ok' : '  DOES NOT ADD UP (explained)') : '')); an.modes.forEach((m) => lines.push('  phase ' + m.label + ': ' + m.ratio + (m.publish ? '  published ' + m.publish.value + (m.ok ? '  ok' : '  MISMATCH') : ''))); }
    if (an.K) { lines.push('mechanism: residual ' + an.K.residual.toExponential(1)); an.centers.forEach((c) => lines.push('  centres ' + c.a + '-' + c.b + ': ' + c.dist.toFixed(3) + ' mm (required ' + c.need.toFixed(3) + ')  ' + (c.ok ? 'ok' : 'MISMATCH'))); an.modes.forEach((m) => lines.push('  mode ' + m.label + ': ' + m.ratio.toFixed(4) + (m.publish ? '  published ' + m.publish.value + (m.ok ? '  ok' : '  MISMATCH') : ''))); }
    return { errors, warnings, lines, analysis: an };
  };
})(typeof window !== 'undefined' ? window : globalThis);
