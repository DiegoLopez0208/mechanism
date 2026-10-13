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
  const KINDS = ['gear', 'ring', 'sprocket', 'shaft', 'pin', 'disc', 'flange', 'tube', 'plate', 'bearing', 'spring', 'nut', 'bolt', 'box', 'block', 'cross', 'rotor'];
  const CONFS = ['spec', 'measured', 'derived', 'estimated'];
  S.KINDS = KINDS; S.CONFS = CONFS;
  const teethOf = (d) => (d.kind === 'gear' || d.kind === 'ring' ? d.p.z : d.kind === 'sprocket' ? d.p.teeth : null);
  const startPos = (d) => (d.orbit ? [d.orbit.center[0] + d.orbit.r * Math.cos(d.orbit.a0 * Math.PI / 180), d.orbit.center[1] + d.orbit.r * Math.sin(d.orbit.a0 * Math.PI / 180), d.at ? d.at[2] : 0] : d.at);
  S.startPos = startPos; S.teethOf = teethOf;

  // mecanismo de presion (switch, pulsador, palanca): un solo recorrido x entre 0 y travel; la fuerza sale de los puntos publicados
  // y se cruza con lo que daria un resorte lineal por los dos primeros: si no cierra, el spec tiene que decirlo (press.note)
  function analyzePress(M, out) {
    const pr = M.press, pts = pr.force || [], pk = { travel: pr.travel, actuation: pr.actuation };
    if (pts.length >= 3) { const k = (pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0]), last = pts[pts.length - 1], pred = pts[0][1] + k * (last[0] - pts[0][0]); pk.slope = k; pk.predictedFinal = pred; pk.publishedFinal = last[1]; pk.off = (last[1] - pred) / pred; pk.consistent = Math.abs(pk.off) <= 0.05; if (!pk.consistent && !pr.note) out.problems.push('los puntos de fuerza publicados no cierran con un resorte lineal (' + pred.toFixed(1) + ' esperado, ' + last[1] + ' publicado) y el spec no lo explica (press.note)'); }
    out.press = pk; out.modes = [];
    ((M.drive && M.drive.modes) || []).forEach((m) => { const pub = m.publish, ok = pub ? Math.abs(m.to - pub.value) <= (pub.tol == null ? 0.01 : pub.tol) : null; out.modes.push({ id: m.id, label: m.label, ratio: m.to, publish: pub || null, ok }); if (ok === false) out.problems.push('fase ' + m.label + ': el modelo llega a ' + m.to + ' y lo publicado es ' + pub.value); });
  }

  // Enigma: cada prueba publicada (rotores, anillos, posicion inicial, texto -> cifrado, o la secuencia de ventanas) se SIMULA con kit/enigma.js;
  // si no da lo publicado, el cableado o las reglas estan mal y el spec no pasa. Las fases del video se simulan igual y dejan sus eventos listos.
  function analyzeEnigma(M, out) {
    const en = M.enigma, E = MX.enigma; if (!E) { out.problems.push('falta kit/enigma.js'); return; }
    out.enigmaTests = [];
    (en.tests || []).forEach((t) => {
      const m = E.create(t), evs = [...t.plain].map((ch) => m.press(ch)), got = evs.map((e) => e.out).join(''), win = evs.map((e) => e.window), r = { id: t.id, got, expect: t.expect, ok: true };
      if (t.expect && got !== t.expect) { r.ok = false; out.problems.push('prueba ' + t.id + ': la maquina da ' + got + ' y lo publicado es ' + t.expect); }
      if (t.windows && win.join(' ') !== t.windows.join(' ')) { r.ok = false; r.win = win.join(' '); out.problems.push('prueba ' + t.id + ': ventanas ' + win.join(' ') + ' contra lo publicado ' + t.windows.join(' ')); }
      if (t.decrypt) { const back = E.create(t).encipher(got); if (back !== t.plain) { r.ok = false; out.problems.push('prueba ' + t.id + ': la maquina no es reciproca (' + got + ' -> ' + back + ')'); } }
      out.enigmaTests.push(r);
    });
    out.enigmaRuns = []; let prev = '';
    ((M.drive && M.drive.modes) || []).forEach((m) => {
      const m2 = E.create(Object.assign({}, en, { start: m.start || en.start })), text = m.text === '@prev' ? prev : m.text, start = m2.pos.slice(), events = [...text].map((ch) => Object.assign({ ch }, m2.press(ch))), outS = events.map((e) => e.out).join(''), wins = events.map((e) => e.window);
      prev = outS; out.enigmaRuns.push({ start, events, text, out: outS });
      let ok = null; if (m.publish && m.publish.text) { ok = (m.publish.windows ? wins.join(' ') : outS) === m.publish.text; if (!ok) out.problems.push('fase ' + m.label + ': ' + (m.publish.windows ? wins.join(' ') : outS) + ' y lo publicado es ' + m.publish.text); }
      out.modes.push({ id: m.id, label: m.label, ratio: null, text: m.publish && m.publish.windows ? wins.join(' ') : outS, publish: m.publish || null, ok });
    });
  }

  // analisis del mecanismo: cinematica, fases de dientes, distancias entre centros, relaciones por modo
  S.analyze = (spec) => {
    const out = { problems: [], K: null, modes: [], phi: {}, meshes: [], centers: [] }, M = spec.mechanism;
    if (!M || !MX.kin) return out;
    if (M.press) analyzePress(M, out);
    if (M.enigma) { analyzeEnigma(M, out); return out; }
    if (!M.links || !M.links.length) return out;
    const byBody = {}; spec.parts.forEach((d) => { const b = d.body || d.id; (byBody[b] = byBody[b] || []).push(d); });
    const gearOf = (b) => (byBody[b] || []).find((d) => teethOf(d)) || (byBody[b] || [])[0];
    const teeth = {}; Object.keys(byBody).forEach((b) => { const d = (byBody[b] || []).find((q) => teethOf(q)); if (d) teeth[b] = teethOf(d); });
    const bodies = Array.from(new Set([].concat(M.bodies || [], M.links.flatMap((l) => [l.a, l.b, l.carrier].filter(Boolean)), M.free)));
    bodies.forEach((b) => { if (!(b in teeth)) teeth[b] = 1; });
    const K = (out.K = MX.kin({ bodies, teeth, free: M.free, links: M.links }));
    if (K.residual > 1e-6) out.problems.push('el tren esta sobredeterminado o trabado (residuo ' + K.residual.toExponential(1) + ')');
    M.links.filter((l) => l.t === 'ext' || l.t === 'int').forEach((l) => {
      const da = gearOf(l.a), db = gearOf(l.b); if (!da || !db) { out.problems.push('el engrane ' + l.a + '-' + l.b + ' no tiene piezas con dientes'); return; }
      const pa = startPos(da), pb = startPos(db), beta = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), dist = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
      out.meshes.push({ a: l.a, b: l.b, t: l.t, beta });
      const need = MX.kin.center(l.t, da.p.m, teethOf(da), teethOf(db));
      out.centers.push({ a: l.a, b: l.b, dist, need, ok: Math.abs(dist - need) < 0.02 && Math.abs(da.p.m - db.p.m) < 1e-9 });
    });
    out.centers.filter((c) => !c.ok).forEach((c) => out.problems.push('distancia entre centros ' + c.a + '-' + c.b + ': ' + c.dist.toFixed(3) + ' mm, la geometria exige ' + c.need.toFixed(3) + ' mm (y el mismo modulo)'));
    if (out.meshes.length) {
      const ph = K.phases(out.meshes, out.meshes[0].a); out.phi = ph.phi;
      ph.checks.filter((c) => !c.ok).forEach((c) => out.problems.push('los dientes de ' + c.a + '-' + c.b + ' no encajan (residuo ' + (c.residual == null ? 'n/d' : c.residual.toExponential(1)) + ')'));
    }
    if (M.press) return out;
    ((M.drive && M.drive.modes) || []).forEach((m) => {
      const ratio = m.shell === 'driver' ? 1 : K.rates[m.shell] / K.rates[m.driver], pub = m.publish, ok = pub ? Math.abs(ratio - pub.value) <= (pub.tol == null ? 0.005 : pub.tol) : null;
      out.modes.push({ id: m.id, label: m.label, ratio, publish: pub || null, ok });
      if (ok === false) out.problems.push('modo ' + m.label + ': el modelo da ' + ratio.toFixed(4) + ' y lo publicado es ' + pub.value);
    });
    return out;
  };

  // validacion de evidencia + mecanismo; devuelve { errors, warnings, lines }
  S.validate = (spec) => {
    const errors = [], warnings = [], R = spec.research || { sources: [], claims: [] }, src = {}, cl = {}, ids = new Set();
    (R.sources || []).forEach((s) => { if (!s.id || !s.title || !/^https?:\/\//.test(s.url || '')) errors.push('fuente incompleta: ' + JSON.stringify(s).slice(0, 80)); if (!s.fetched) warnings.push('fuente ' + s.id + ' sin fecha de consulta'); src[s.id] = s; });
    (R.claims || []).forEach((c) => {
      cl[c.id] = c; if (!CONFS.includes(c.conf)) errors.push('afirmacion ' + c.id + ': conf invalida (' + c.conf + ')');
      if (!c.text) errors.push('afirmacion ' + c.id + ' sin texto');
      if (c.conf !== 'estimated') { if (!c.src || !c.src.length) errors.push('afirmacion ' + c.id + ' (' + c.conf + ') no nombra ninguna fuente'); (c.src || []).forEach((s) => { if (!src[s]) errors.push('afirmacion ' + c.id + ' cita la fuente inexistente ' + s); }); }
      if (c.conf === 'derived' && !c.cross) errors.push('afirmacion ' + c.id + ' es DERIVED y no trae el cruce con un segundo dato publicado');
      if (c.conf === 'measured' && !c.error) errors.push('afirmacion ' + c.id + ' es MEASURED y no declara su error');
      if (c.conf === 'estimated' && !c.why) errors.push('afirmacion ' + c.id + ' es ESTIMATED y no dice por que nadie lo publica');
    });
    spec.parts.forEach((d) => {
      if (ids.has(d.id)) errors.push('pieza repetida: ' + d.id); ids.add(d.id);
      if (!KINDS.includes(d.kind)) errors.push('pieza ' + d.id + ': tipo desconocido ' + d.kind);
      if (!CONFS.includes(d.conf)) errors.push('pieza ' + d.id + ': falta conf (spec | measured | derived | estimated)');
      if (!d.at && !d.orbit) errors.push('pieza ' + d.id + ': falta at u orbit');
      if (d.conf && d.conf !== 'estimated' && !d.decor) { if (!d.claims || !d.claims.length) errors.push('pieza ' + d.id + ' es ' + d.conf.toUpperCase() + ' y no cita ninguna afirmacion'); (d.claims || []).forEach((c) => { if (!cl[c]) errors.push('pieza ' + d.id + ' cita la afirmacion inexistente ' + c); }); }
      if (d.conf === 'estimated' && !(d.claims || []).length && !d.why) warnings.push('pieza ' + d.id + ' es ESTIMATED sin explicar por que');
    });
    const an = S.analyze(spec); an.problems.forEach((p) => errors.push(p));
    ((spec.mechanism && spec.mechanism.drive && spec.mechanism.drive.modes) || []).forEach((m) => { if (m.publish && m.publish.claim && !cl[m.publish.claim]) errors.push('modo ' + m.label + ' cita la afirmacion inexistente ' + m.publish.claim); });
    const lines = []; lines.push('piezas: ' + spec.parts.length + '   afirmaciones: ' + (R.claims || []).length + '   fuentes: ' + (R.sources || []).length);
    CONFS.forEach((k) => lines.push('  ' + k.toUpperCase().padEnd(10) + ' piezas ' + spec.parts.filter((d) => d.conf === k).length + '   afirmaciones ' + (R.claims || []).filter((c) => c.conf === k).length));
    if (an.enigmaTests) { lines.push('enigma: pruebas publicadas'); an.enigmaTests.forEach((t) => lines.push('  ' + t.id + ': ' + t.got + (t.expect ? ' (publicado ' + t.expect + ')' : '') + (t.win ? ' ventanas ' + t.win : '') + (t.ok ? '  ok' : '  MAL'))); an.modes.forEach((m) => lines.push('  fase ' + m.label + ': ' + m.text + (m.publish ? '  publicado ' + m.publish.text + (m.ok ? '  ok' : '  MAL') : ''))); }
    if (an.press) { lines.push('presion: recorrido ' + an.press.travel + ' mm, actuacion ' + an.press.actuation + ' mm' + (an.press.predictedFinal ? '; resorte lineal daria ' + an.press.predictedFinal.toFixed(1) + ' al final, publicado ' + an.press.publishedFinal + (an.press.consistent ? '  ok' : '  NO CIERRA (explicado)') : '')); an.modes.forEach((m) => lines.push('  fase ' + m.label + ': ' + m.ratio + (m.publish ? '  publicado ' + m.publish.value + (m.ok ? '  ok' : '  MAL') : ''))); }
    if (an.K) { lines.push('mecanismo: residuo ' + an.K.residual.toExponential(1)); an.centers.forEach((c) => lines.push('  centros ' + c.a + '-' + c.b + ': ' + c.dist.toFixed(3) + ' mm (exigido ' + c.need.toFixed(3) + ')  ' + (c.ok ? 'ok' : 'MAL'))); an.modes.forEach((m) => lines.push('  modo ' + m.label + ': ' + m.ratio.toFixed(4) + (m.publish ? '  publicado ' + m.publish.value + (m.ok ? '  ok' : '  MAL') : ''))); }
    return { errors, warnings, lines, analysis: an };
  };
})(typeof window !== 'undefined' ? window : globalThis);
