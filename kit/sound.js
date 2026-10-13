/*
 * kit/sound.js - diseno de sonido estereo por eventos, sin muestras. Reemplaza los "thock/ping" genericos de kit/audio.js.
 *  - impact: sintesis MODAL por material (vidrio, aluminio, acero, plastico, placa, ceramica, bolsa de bateria): la altura sale del tamano de la pieza
 *    (pieza chica = aguda, pieza grande = grave) y cada material tiene sus parciales y su caida.
 *  - click, whoosh (ruido filtrado con barrido y paneo), servo (motor de enfoque), charge (carga electrica), blip (digital), tone (nota de una escala),
 *    boom. Cada evento lleva pan (-1..1) y se manda a una reverberacion estereo.
 *  - bed: base musical generativa (acordes, arpegio, bajo) con tonalidad y tempo propios de cada figura.
 * Todo es determinista (semilla). Salida: { L, R } Float32Array; kit/core.js la escribe como WAV estereo.
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {}), TAU = Math.PI * 2, S = (MX.sound = {});
  const MAT = {
    glass:    { r: [1, 2.32, 4.25, 6.63, 9.38], a: [1, 0.6, 0.42, 0.26, 0.16], tau: 0.36, click: 0.35, noise: 0.25, k: 3400 },
    aluminum: { r: [1, 2.76, 5.4, 8.93, 13.3], a: [1, 0.7, 0.45, 0.3, 0.2], tau: 0.5, click: 0.3, noise: 0.18, k: 3000 },
    steel:    { r: [1, 2.76, 5.4, 8.93, 12.7], a: [1, 0.85, 0.6, 0.42, 0.3], tau: 0.95, click: 0.4, noise: 0.15, k: 3600 },
    plastic:  { r: [1, 1.9, 3.4], a: [1, 0.5, 0.25], tau: 0.075, click: 0.5, noise: 0.35, k: 2200 },
    pcb:      { r: [1, 2.1, 3.6, 5.2], a: [1, 0.55, 0.35, 0.2], tau: 0.11, click: 0.6, noise: 0.4, k: 2600 },
    ceramic:  { r: [1, 2.5, 4.8, 7.1], a: [1, 0.5, 0.3, 0.15], tau: 0.26, click: 0.4, noise: 0.2, k: 3300 },
    pouch:    { r: [1, 1.6], a: [1, 0.25], tau: 0.05, click: 0.15, noise: 0.6, k: 900 },
    rubber:   { r: [1, 1.45], a: [1, 0.2], tau: 0.04, click: 0.1, noise: 0.5, k: 700 },
  };
  S.MAT = MAT;
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  S.SCALES = { major: [0, 2, 4, 5, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], pent: [0, 2, 4, 7, 9] };
  // nota de una escala por indice (puede ser negativo o mayor que el largo): cuantiza cualquier valor a la tonalidad de la figura
  S.note = (root, scale, idx) => { const sc = S.SCALES[scale] || scale, n = sc.length, o = Math.floor(idx / n), i = ((idx % n) + n) % n; return midi(root + sc[i] + 12 * o); };

  /* ------------------------------------------------------------ voces (devuelven un Float32Array mono) */
  function modal(sr, o, R) {
    const m = MAT[o.mat] || MAT.plastic, size = Math.max(1.5, o.size || 20), vel = o.vel == null ? 1 : o.vel;
    const f0 = (o.f0 || m.k / Math.pow(size, 0.52)) * (o.pitch || 1), len = Math.min(3.5, m.tau * 6 * (o.ring || 1) + 0.05), n = Math.floor(len * sr), out = new Float32Array(n);
    const detune = m.r.map(() => 1 + (R() - 0.5) * 0.012);
    for (let k = 0; k < m.r.length; k++) {
      const f = f0 * m.r[k] * detune[k]; if (f > sr * 0.45) continue; const tau = m.tau * (o.ring || 1) / (1 + k * 0.55), a = m.a[k] * vel * 0.5, ph = R() * TAU;
      for (let i = 0; i < n; i++) { const t = i / sr; out[i] += Math.sin(TAU * f * t + ph) * a * Math.exp(-t / tau) * Math.min(1, t / 0.0006); }
    }
    // transitorio de contacto: ruido con filtro pasa-banda segun dureza
    const cn = Math.floor(0.012 * sr), hard = o.hard == null ? 0.5 : o.hard; let lp = 0, lp2 = 0;
    for (let i = 0; i < cn && i < n; i++) { const x = (R() * 2 - 1) * Math.exp(-i / (cn * 0.25)); lp += (x - lp) * (0.15 + hard * 0.6); lp2 += (lp - lp2) * 0.5; out[i] += (lp - lp2) * m.click * vel * 1.4 + x * m.noise * 0.2 * vel; }
    if (o.thump) { const f = o.thump, tn = Math.min(n, Math.floor(0.2 * sr)); for (let i = 0; i < tn; i++) { const t = i / sr; out[i] += Math.sin(TAU * f * (1 - 0.3 * t * 5) * t) * Math.exp(-t / 0.06) * 0.5 * vel; } }
    return out;
  }
  function click(sr, o, R) {
    const n = Math.floor(0.09 * sr), out = new Float32Array(n), f = o.f || 2400, q = o.sharp == null ? 0.7 : o.sharp; let lp = 0;
    [0, 0.018].forEach((d, j) => { const i0 = Math.floor(d * sr); for (let i = 0; i + i0 < n; i++) { const t = i / sr, x = (R() * 2 - 1) * Math.exp(-t / 0.0014); lp += (x - lp) * 0.4; out[i + i0] += (x - lp) * (j ? 0.5 : 1) * q + Math.sin(TAU * f * (j ? 0.82 : 1) * t) * Math.exp(-t / 0.006) * 0.4 * (j ? 0.6 : 1); } });
    return out;
  }
  function noiseSweep(sr, o, R) {                       // whoosh: ruido por un filtro resonante cuya frecuencia barre de f0 a f1
    const dur = o.d || 0.8, n = Math.floor(dur * sr), out = new Float32Array(n), f0 = o.f0 || 300, f1 = o.f1 || 2400, Q = o.q || 1.4; let low = 0, band = 0;
    for (let i = 0; i < n; i++) { const u = i / n, e = Math.sin(Math.PI * Math.pow(u, o.skew || 1)), f = f0 * Math.pow(f1 / f0, u), c = 2 * Math.sin(Math.PI * Math.min(0.45, f / sr)), x = R() * 2 - 1; low += c * band; const high = x - low - band / Q; band += c * high; out[i] = band * e * (o.gain || 0.9) * 0.5; }
    return out;
  }
  function servo(sr, o, R) {                            // motor de enfoque/OIS: tren de pasos con frecuencia que sube y baja
    const dur = o.d || 0.9, n = Math.floor(dur * sr), out = new Float32Array(n); let ph = 0, lp = 0;
    for (let i = 0; i < n; i++) { const u = i / n, f = (o.f0 || 90) * (1 + (o.span || 1.4) * Math.sin(Math.PI * u)), e = Math.pow(Math.sin(Math.PI * u), 0.7); ph += TAU * f / sr; const sq = Math.sign(Math.sin(ph)) * 0.5 + Math.sin(ph * 2.01) * 0.3; lp += (sq - lp) * 0.12; out[i] = (lp * 0.5 + (R() * 2 - 1) * 0.05) * e * 0.55 * (o.gain || 1); }
    for (let k = 0; k < (o.ticks || 6); k++) { const i0 = Math.floor((k + 0.5) / (o.ticks || 6) * n); for (let i = 0; i < 400 && i0 + i < n; i++) out[i0 + i] += (R() * 2 - 1) * Math.exp(-i / 60) * 0.25; }
    return out;
  }
  function charge(sr, o) {                              // carga electrica: silbido que sube con armonicos
    const dur = o.d || 1.2, n = Math.floor(dur * sr), out = new Float32Array(n), f0 = o.f0 || 220, f1 = o.f1 || 1760; let ph = 0;
    for (let i = 0; i < n; i++) { const u = i / n, f = f0 * Math.pow(f1 / f0, u * u), e = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05) * 0.5 + 0.0001), 1.4) * Math.min(1, (1 - u) * 14 + 0.25); ph += TAU * f / sr; out[i] = (Math.sin(ph) + 0.35 * Math.sin(ph * 2) + 0.15 * Math.sin(ph * 3.01)) * e * 0.24 * (o.gain || 1); }
    return out;
  }
  function blip(sr, o) {                                // microtono digital con FM y envolvente cortisima
    const dur = o.d || 0.09, n = Math.floor(dur * sr), out = new Float32Array(n), f = o.f || 1200, ratio = o.ratio || 2;
    for (let i = 0; i < n; i++) { const t = i / sr, e = Math.exp(-t / (dur * 0.35)) * Math.min(1, t / 0.0008); out[i] = Math.sin(TAU * f * t + Math.sin(TAU * f * ratio * t) * (o.fm == null ? 0.9 : o.fm) * e) * e * 0.3 * (o.gain || 1); }
    return out;
  }
  function tone(sr, o) {                                // nota suave de campana / marimba / pluck segun timbre
    const f = o.f || 440, dur = o.d || 1.2, n = Math.floor(dur * sr), out = new Float32Array(n), kind = o.timbre || 'bell';
    const parts = kind === 'bell' ? [[1, 1, 0.9], [2.76, 0.5, 0.5], [5.4, 0.3, 0.3], [8.93, 0.15, 0.2]] : kind === 'marimba' ? [[1, 1, 0.45], [4, 0.35, 0.12], [10, 0.12, 0.05]] : [[1, 1, 0.6], [2, 0.5, 0.35], [3, 0.25, 0.2], [4, 0.12, 0.15]];
    parts.forEach(([r, a, tau]) => { const ff = f * r; if (ff > sr * 0.45) return; for (let i = 0; i < n; i++) { const t = i / sr; out[i] += Math.sin(TAU * ff * t) * a * Math.exp(-t / (tau * (o.ring || 1))) * Math.min(1, t / 0.002) * 0.22; } });
    return out;
  }
  function boom(sr, o, R) {                             // golpe grave con cola: para cortes de camara y remates
    const dur = o.d || 1.1, n = Math.floor(dur * sr), out = new Float32Array(n); let lp = 0;
    for (let i = 0; i < n; i++) { const t = i / sr, f = 52 * (1 + 1.6 * Math.exp(-t / 0.05)); out[i] = Math.sin(TAU * f * t) * Math.exp(-t / 0.32) * 0.8 * (o.gain || 1); lp += ((R() * 2 - 1) - lp) * 0.06; out[i] += lp * Math.exp(-t / 0.15) * 0.4; }
    return out;
  }
  // ---- voces mecanicas (cada una mezcla un cuerpo grave, un golpe metalico y un poco de ruido de contacto, con variacion por semilla)
  function clack(sr, o, R) {                      // tecla de maquina de escribir: golpe de la tecla + golpe de la barra + tintineo del resorte
    const n = Math.floor(0.4 * sr), out = new Float32Array(n), v = o.vel == null ? 1 : o.vel, d = Math.floor(0.011 * sr); let lp = 0;
    for (let i = 0; i < n; i++) { const t = i / sr; out[i] += Math.sin(TAU * 150 * (1 - 0.45 * Math.min(1, t / 0.05)) * t) * Math.exp(-t / 0.03) * 0.75 * v; }
    [2600, 4100, 6300].forEach((f, k) => { const ff = f * (1 + (R() - 0.5) * 0.06); for (let i = d; i < n; i++) { const t = (i - d) / sr; out[i] += Math.sin(TAU * ff * t) * Math.exp(-t / (0.016 / (1 + k * 0.6))) * 0.34 * v / (1 + k * 0.7); } });
    for (let i = 0; i < Math.floor(0.02 * sr); i++) { const x = (R() * 2 - 1) * Math.exp(-i / (0.004 * sr)); lp += (x - lp) * 0.5; out[i] += (x - lp) * 0.5 * v; }
    for (let i = Math.floor(0.05 * sr); i < n; i++) { const t = (i - 0.05 * sr) / sr; out[i] += Math.sin(TAU * 1900 * t) * Math.exp(-t / 0.05) * 0.05 * v; }
    return out;
  }
  function detent(sr, o, R) {                     // trinquete: un clic seco y dos rebotes del resorte
    const n = Math.floor(0.09 * sr), out = new Float32Array(n), f = (o.f || 1100) * (1 + (R() - 0.5) * 0.08), v = o.vel == null ? 1 : o.vel; let lp = 0;
    [[0, 1], [0.008, 0.45], [0.015, 0.22]].forEach(([dl, a]) => { const d = Math.floor(dl * sr); for (let i = 0; i + d < n; i++) { const t = i / sr, x = (R() * 2 - 1) * Math.exp(-t / 0.0016); lp += (x - lp) * 0.35; out[i + d] += ((x - lp) * 0.9 + Math.sin(TAU * f * t) * Math.exp(-t / 0.007) * 0.6) * a * v * 0.6; } });
    return out;
  }
  function thock(sr, o, R) {                      // fondo de un interruptor de teclado: golpe grave y sordo + un tintineo corto del resorte
    const n = Math.floor(0.3 * sr), out = new Float32Array(n), v = o.vel == null ? 1 : o.vel; let lp = 0;
    for (let i = 0; i < n; i++) { const t = i / sr; out[i] += Math.sin(TAU * (230 - 70 * Math.min(1, t / 0.06)) * t) * Math.exp(-t / 0.05) * 0.9 * v + Math.sin(TAU * 3100 * t) * Math.exp(-t / 0.03) * 0.07 * v; }
    for (let i = 0; i < Math.floor(0.015 * sr); i++) { const x = (R() * 2 - 1) * Math.exp(-i / (0.003 * sr)); lp += (x - lp) * 0.18; out[i] += lp * 0.8 * v; }
    return out;
  }
  function tick(sr, o, R) {                       // relé / contacto electrico: un chasquido finito
    const n = Math.floor(0.05 * sr), out = new Float32Array(n), f = (o.f || 2400) * (1 + (R() - 0.5) * 0.06), v = o.vel == null ? 1 : o.vel; let lp = 0;
    for (let i = 0; i < n; i++) { const t = i / sr, x = (R() * 2 - 1) * Math.exp(-t / 0.0012); lp += (x - lp) * 0.5; out[i] = ((x - lp) * 0.8 + Math.sin(TAU * f * t) * Math.exp(-t / 0.006) * 0.5) * v * 0.5; }
    return out;
  }
  const VOICES = { impact: modal, click, whoosh: noiseSweep, servo, charge, blip, tone, boom, clack, detent, thock, tick };

  /* ------------------------------------------------------------ base musical generativa */
  function bed(sr, N, c, R) {
    const L = new Float32Array(N), Rr = new Float32Array(N); if (!c) return [L, Rr];
    const bpm = c.bpm || 100, beat = 60 / bpm, root = c.root || 50, sc = S.SCALES[c.mode || 'major'], lvl = c.level == null ? 0.5 : c.level, prog = c.prog || [0, 5, 3, 4];
    const lev = (t) => { const k = c.curve || [[0, 0.4], [N / sr, 0.4]]; for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return k[k.length - 1][1]; };
    const add = (arr, t0, dur, amp, fn) => { const i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr); for (let i = 0; i < n && i0 + i < N; i++) arr[i0 + i] += fn(i / sr, i / n) * amp; };
    for (let bar = 0; bar * beat * 4 < N / sr; bar++) {
      const t0 = bar * beat * 4, deg = prog[bar % prog.length], a = lev(t0 + 2) * lvl;
      const chord = [0, 2, 4].map((k) => root + 12 + sc[(deg + k) % 7] + 12 * Math.floor((deg + k) / 7));
      chord.forEach((m, j) => { const f = midi(m), pan = (j - 1) * 0.35; add(pan < 0 ? L : Rr, t0, beat * 4.2, a * 0.1, (t, u) => (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * 2.003 * t) + 0.25 * Math.sin(TAU * f * 0.5 * t)) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.6)); add(pan < 0 ? Rr : L, t0, beat * 4.2, a * 0.05, (t, u) => Math.sin(TAU * f * 1.004 * t) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.6)); });
      const bf = midi(root + sc[deg % 7] - 12); add(L, t0, beat * 1.8, a * 0.5, (t) => Math.sin(TAU * bf * t) * Math.exp(-t / 0.7)); add(Rr, t0, beat * 1.8, a * 0.5, (t) => Math.sin(TAU * bf * t) * Math.exp(-t / 0.7));
      if (c.arp !== false) for (let s = 0; s < 8; s++) { const idx = (s * 3 + bar * 2 + Math.floor(R() * 2)) % chord.length, m = chord[idx] + 12 * (1 + (s % 3 === 2 ? 1 : 0)), f = midi(m), ts = t0 + s * beat / 2, arr = s % 2 ? L : Rr; if (R() < 0.82) add(arr, ts, 0.5, a * 0.16, (t) => (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 3 * t)) * Math.exp(-t / 0.16) * Math.min(1, t / 0.003)); }
    }
    return [L, Rr];
  }

  /* ------------------------------------------------------------ reverberacion estereo (peines + primeras reflexiones) */
  function reverb(sr, inL, inR, o) {
    const N = inL.length, size = o.size || 1, wet = o.wet == null ? 0.25 : o.wet, outL = new Float32Array(N), outR = new Float32Array(N), fb = o.fb || 0.78;
    const comb = (src, d, gn, damp) => { const w = new Float32Array(N); let lp = 0; for (let i = 0; i < N; i++) { const x = src[i] + (i >= d ? gn * w[i - d] : 0); lp += (x - lp) * damp; w[i] = lp; } return w; };
    [0.0297, 0.0371, 0.0411, 0.0437].map((x) => Math.floor(x * size * sr)).forEach((d) => { const w = comb(inL, d, fb, 0.45); for (let i = 0; i < N; i++) outL[i] += w[i] * 0.25; });
    [0.0313, 0.0389, 0.0427, 0.0449].map((x) => Math.floor(x * size * sr)).forEach((d) => { const w = comb(inR, d, fb, 0.45); for (let i = 0; i < N; i++) outR[i] += w[i] * 0.25; });
    [[0.011, 0.4], [0.019, 0.3], [0.027, 0.22]].forEach(([d, a]) => { const i0 = Math.floor(d * sr * size); for (let i = i0; i < N; i++) { outL[i] += inR[i - i0] * a * 0.8; outR[i] += inL[i - i0] * a * 0.8; } });
    for (let i = 0; i < N; i++) { outL[i] *= wet; outR[i] *= wet; }
    return [outL, outR];
  }

  /* ------------------------------------------------------------ render */
  // cfg: { duration, sr, seed, events: [{t, v: 'impact'|..., pan, gain, send, ...params}], bed: {...}, room: {size, wet, fb} }
  S.render = (cfg) => {
    const sr = cfg.sr || 44100, N = Math.floor(cfg.duration * sr), L = new Float32Array(N), Rr = new Float32Array(N), sL = new Float32Array(N), sR = new Float32Array(N), R = MX.rng(cfg.seed || 17);
    const b = bed(sr, N, cfg.bed, MX.rng((cfg.seed || 17) + 5)); for (let i = 0; i < N; i++) { L[i] += b[0][i]; Rr[i] += b[1][i]; sL[i] += b[0][i] * 0.5; sR[i] += b[1][i] * 0.5; }
    if (cfg.tone) { const lvl = cfg.tone; let a = 0, b = 0; for (let i = 0; i < N; i++) { const x = R() * 2 - 1; a += (x - a) * 0.02; b += (a - b) * 0.05; L[i] += b * lvl * 8; Rr[i] += b * lvl * 8; } }       // ruido de sala: casi inaudible, pero evita el silencio digital
    (cfg.events || []).forEach((e) => {
      const f = VOICES[e.v]; if (!f) return; const seg = f(sr, e, R), pan = Math.max(-1, Math.min(1, e.pan || 0)), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4), gain = e.gain == null ? 1 : e.gain, send = e.send == null ? 0.5 : e.send, i0 = Math.floor(e.t * sr);
      for (let i = 0; i < seg.length && i0 + i < N; i++) { if (i0 + i < 0) continue; const v = seg[i] * gain; L[i0 + i] += v * gl; Rr[i0 + i] += v * gr; sL[i0 + i] += v * gl * send; sR[i0 + i] += v * gr * send; }
    });
    const rv = reverb(sr, sL, sR, cfg.room || {}); let pk = 0;
    for (let i = 0; i < N; i++) { L[i] += rv[0][i]; Rr[i] += rv[1][i]; pk = Math.max(pk, Math.abs(L[i]), Math.abs(Rr[i])); }
    const gn = pk > 0 ? 0.85 / pk : 1, fo = Math.floor(1.2 * sr);
    for (let i = 0; i < N; i++) { const fade = i > N - fo ? (N - i) / fo : 1; L[i] = Math.tanh(L[i] * gn * 1.2) * 0.92 * fade; Rr[i] = Math.tanh(Rr[i] * gn * 1.2) * 0.92 * fade; }
    return { L, R: Rr, sr };
  };
})(typeof window !== 'undefined' ? window : globalThis);
