/*
 * kit/audio.js - diseno de sonido por eventos. La escena entrega una lista de cues {t, kind, ...} que salen de la MISMA
 * simulacion que mueve los dibujos; aqui cada cue se sintetiza (golpes, campanas, compuertas, agua, engranajes) y todo
 * pasa por una reverberacion corta y un limitador. Sin muestras: todo es sintesis, determinista.
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {});
  const TAU = Math.PI * 2;
  const env = (t, a, d) => Math.min(1, t / a) * Math.exp(-t / d);

  const KINDS = {
    // caja que sale del shell o cae sobre la cinta: golpe seco
    thock: (o, t0, c, R) => add(o, t0, 0.12, (t) => Math.sin(TAU * (150 - 70 * t * 8) * t) * env(t, 0.002, 0.035) * 0.5 * c.v + R() * 0.0 + noise(R) * env(t, 0.0005, 0.004) * 0.25 * c.v),
    // pieza que aterriza al armarse la maquina: golpe + campanita metalica de tono c.f
    drop: (o, t0, c, R) => { const f = c.f || 520; add(o, t0, 0.5, (t) => Math.sin(TAU * 95 * t) * env(t, 0.003, 0.06) * 0.45 * c.v + noise(R) * env(t, 0.0005, 0.005) * 0.2 + (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * 2.41 * t)) * env(t, 0.001, 0.12) * 0.07 * c.v); },
    // caja que cae al tanque
    splash: (o, t0, c, R) => add(o, t0, 0.35, (t) => noise(R) * env(t, 0.004, 0.05) * 0.28 * c.v + Math.sin(TAU * (300 + 1500 * t) * t) * env(t, 0.002, 0.045) * 0.18 * c.v),
    // compuerta que se cierra: golpe pesado con parciales metalicos
    clunk: (o, t0, c, R) => add(o, t0, 0.9, (t) => Math.sin(TAU * (66 - 20 * t) * t) * env(t, 0.003, 0.14) * 0.85 + noise(R) * env(t, 0.0005, 0.012) * 0.4 + [310, 517, 893, 1311].reduce((s, f, i) => s + Math.sin(TAU * f * t) * env(t, 0.001, 0.16 - i * 0.025) * 0.1, 0)),
    // compuerta que se abre: servo + chasquido mas liviano
    clack: (o, t0, c, R) => add(o, t0, 0.5, (t) => Math.sin(TAU * 112 * t) * env(t, 0.002, 0.06) * 0.4 + noise(R) * env(t, 0.0005, 0.006) * 0.3 + Math.sin(TAU * (260 + 520 * Math.min(1, t / 0.25)) * t) * env(t, 0.03, 0.12) * 0.06),
    // credito que vuelve: campana FM, el tono sube con la altura c.f
    ping: (o, t0, c, R) => { const f = c.f || 660; add(o, t0, 1.1, (t) => { const m = Math.sin(TAU * f * 2.76 * t) * env(t, 0.001, 0.09) * 1.8; return Math.sin(TAU * f * t + m) * env(t, 0.001, 0.32) * 0.16 * c.v + Math.sin(TAU * f * 2 * t) * env(t, 0.001, 0.12) * 0.03; }); },
    // el parser masticando una caja: ruido filtrado con ritmo de engranajes
    grind: (o, t0, c, R) => { let lp = 0; add(o, t0, c.d || 0.5, (t) => { lp += (noise(R) - lp) * 0.12; const e = Math.min(1, t / 0.03) * Math.min(1, ((c.d || 0.5) - t) / 0.06); return (lp * 0.5 + Math.sin(TAU * 58 * t) * 0.1) * e * (0.6 + 0.4 * Math.sin(TAU * 22 * t)) * 0.4 * c.v; }); },
    whoosh: (o, t0, c, R) => { let lp = 0; add(o, t0, c.d || 0.7, (t) => { const u = t / (c.d || 0.7), k = 0.03 + 0.5 * Math.sin(Math.PI * u); lp += (noise(R) - lp) * k; return lp * Math.sin(Math.PI * u) * 0.9 * c.v; }); },
    // alarma suave del shell bloqueado
    beep: (o, t0, c, R) => add(o, t0, 0.3, (t) => Math.sin(TAU * (c.f || 880) * t) * env(t, 0.004, 0.07) * 0.12 * c.v),
    // colchon armonico lento
    pad: (o, t0, c, R) => { const d = c.d || 3; (c.notes || [57, 64, 69]).forEach((m) => { const f = 440 * Math.pow(2, (m - 69) / 12); add(o, t0, d + 1.5, (t) => { const a = Math.min(1, t / 1.2) * Math.min(1, Math.max(0, (d + 1.5 - t) / 1.4)); return (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.004 * t) + 0.2 * Math.sin(TAU * f * 2 * t)) * a * 0.04 * c.v; }); }); },
  };
  function noise(R) { return R() * 2 - 1; }
  let OUT = null, SR = 44100;
  function add(o, t0, len, fn) { const i0 = Math.floor(t0 * SR), n = Math.floor(len * SR); for (let j = 0; j < n && i0 + j < o.length; j++) { if (i0 + j >= 0) o[i0 + j] += fn(j / SR); } }

  // cfg: { duration, sr, cues: [{t, kind, v, f, d, notes}], bed: [{t, a}] (zumbido de fondo por tramos), reverb }
  MX.audio = {
    render(cfg) {
      SR = cfg.sr || 44100; const N = Math.floor(cfg.duration * SR), out = new Float32Array(N), R = MX.rng(cfg.seed || 7);
      // cama: zumbido grave + aire, con envolvente por puntos
      if (cfg.bed) { let lp = 0; for (let i = 0; i < N; i++) { const t = i / SR; let a = 0; for (let k = 1; k < cfg.bed.length; k++) if (t <= cfg.bed[k].t) { const u = (t - cfg.bed[k - 1].t) / (cfg.bed[k].t - cfg.bed[k - 1].t); a = cfg.bed[k - 1].a + (cfg.bed[k].a - cfg.bed[k - 1].a) * u; break; } lp += (noise(R) - lp) * 0.02; out[i] += (Math.sin(TAU * 55 * t) * 0.5 + Math.sin(TAU * 110.3 * t) * 0.25 + lp * 1.4) * a * 0.1; } }
      for (const c of cfg.cues) { const f = KINDS[c.kind]; if (f) f(out, c.t, Object.assign({ v: 1 }, c), R); }
      // reverberacion corta: tres peines con filtro
      const wet = cfg.reverb == null ? 0.22 : cfg.reverb;
      if (wet > 0) { const comb = (d, gn) => { const w = new Float32Array(N); let lp = 0; for (let i = 0; i < N; i++) { const x = out[i] + (i >= d ? gn * w[i - d] : 0); lp += (x - lp) * 0.4; w[i] = lp; } return w; };
        const a = comb(Math.floor(0.047 * SR), 0.62), b = comb(Math.floor(0.073 * SR), 0.58), cc = comb(Math.floor(0.113 * SR), 0.5);
        for (let i = 0; i < N; i++) out[i] += wet * (a[i] + b[i] + cc[i]) / 3; }
      let pk = 0; for (let i = 0; i < N; i++) { const a = Math.abs(out[i]); if (a > pk) pk = a; }
      const gn = pk > 0 ? 0.8 / pk : 1; for (let i = 0; i < N; i++) out[i] = Math.tanh(out[i] * gn * 1.15) * 0.9;
      const fo = Math.floor(0.8 * SR); for (let i = 0; i < fo && i < N; i++) out[N - 1 - i] *= i / fo;
      return out;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
