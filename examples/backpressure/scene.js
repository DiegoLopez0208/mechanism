/*
 * scene.js - Fig 1: "Backpressure". La maquina isometrica del control de flujo del PTY de NovaTerm.
 * Todo lo que se ve y se oye sale de simulate() (sim.js): posiciones de cajas, estado de la compuerta, el shell bloqueado.
 */
(function () {
  'use strict';
  const T = MX.THEME, E = MX.E, clamp = MX.clamp, lerp = MX.lerp, ramp = MX.ramp, hash = MX.hash;
  const W = 1080, H = 1350, FPS = 30, DUR = 28;
  const S = simulate(), P = SIM_P, CR = 0.62;

  /* ---------------------------------------------------------------- geometria fija */
  const SH = { x: 0, y: 2.2, w: 2.2, d: 2.6, h: 3.2 };
  const BA = { x0: 2.2, x1: 6.2, y: 3.15, w: 0.7, z: 3.0, h: 0.25 };
  const TK = { cx: 7.6, cy: 3.5, r: 1.45, h: 3.4 };
  const BB = { x0: 9.05, x1: 12.3, y: 3.15, w: 0.7, h: 0.3 };
  const GT = { x: 9.7, y0: 2.55, y1: 4.45, hz: 1.15, L: 1.9 };
  const PR = { x: 12.4, y: 2.4, w: 2.1, d: 2.2 };
  const SC = { x: 14.75, y: 1.9, w: 0.45, d: 3.2, h: 2.7 };
  const RAIL = [[13.7, 3.0, 1.6], [13.7, 3.0, 2.5], [13.7, 0.7, 2.5], [9.7, 0.7, 2.5], [9.7, 0.7, 3.05]];
  const GG = { x: 9.2, y: 0.2, w: 1.0, d: 1.0 };
  const CRATE_Z_A = BA.z + BA.h + CR / 2, CRATE_Z_B = BB.h + CR / 2;

  /* ---------------------------------------------------------------- cajas: posicion en cada etapa */
  const slotPos = (s) => {
    const a = Math.floor(s), f = s - a;
    const q = (i) => { const layer = Math.floor(i / 4), cell = ((i % 4) + 4) % 4; return [TK.cx + (cell % 2 ? 0.36 : -0.36), TK.cy + (cell < 2 ? -0.36 : 0.36), 0.16 + layer * 0.4 + CR / 2]; };
    const A = q(a), B = q(a + 1); return [lerp(A[0], B[0], f), lerp(A[1], B[1], f), lerp(A[2], B[2], f)];
  };
  S.pk.forEach((p) => { p.land = Math.max(0, S.queue(p.tTank + 0.001) - 1); });
  function crate(p, t) {
    if (p.tReady == null || t < p.tReady) return null;
    if (t < p.tRelease) return { grp: 'A', pos: [2.5, 3.5, CRATE_Z_A], sc: 1, stuck: true };
    const tFall = p.tTank - P.fall;
    if (t < tFall) return { grp: 'A', pos: [lerp(2.5, 6.0, (t - p.tRelease) / (tFall - p.tRelease)), 3.5, CRATE_Z_A], sc: 1 };
    if (t < p.tTank) { const u = (t - tFall) / P.fall, tg = slotPos(p.land), ex = E.io2(clamp(u * 1.4, 0, 1)); return { grp: 'tank', pos: [lerp(6.0, tg[0], ex), lerp(3.5, tg[1], ex), tg[2] + (CRATE_Z_A - tg[2]) * (1 - u * u)], sc: 1 }; }
    if (p.tDispatch == null || t < p.tDispatch) return { grp: 'tank', pos: slotPos(S.tankSlot(p, t)), sc: 1 };
    const tB0 = p.tDispatch + P.exit;
    if (t < tB0) { const u = E.io2((t - p.tDispatch) / P.exit), a = slotPos(0); return { grp: 'tank', pos: [lerp(a[0], 9.2, u), lerp(a[1], 3.5, u), lerp(a[2], CRATE_Z_B, u)], sc: 1 }; }
    if (p.tParseStart == null || t < p.tParseStart) {
      let sl = 0; for (let k = 0; k < 4; k++) sl += S.waitSlot(p, t - k * 0.06); sl /= 4;
      const xl = lerp(9.2, 12.2, clamp((t - tB0) / P.beltB, 0, 1)); return { grp: 'B', pos: [Math.min(xl, 12.2 - 0.78 * sl), 3.5, CRATE_Z_B], sc: 1 };
    }
    if (t < p.tParseEnd) { const u1 = ramp(t, p.tParseStart, p.tParseStart + 0.35), u2 = ramp(t, p.tParseStart + 0.35, p.tParseEnd); return { grp: 'P', pos: [lerp(12.2, 13.4, E.io2(u1)), 3.5, lerp(CRATE_Z_B, 1.75, E.io2(u1)) + 0.5 * Math.sin(Math.PI * u1) - 0.4 * u2], sc: 1 - 0.85 * u2 }; }
    return null;
  }
  function drawCrate(c, o = {}) {
    const [x, y, z] = c.pos, s = CR * c.sc, h = s / 2;
    MX.box(x - h, y - h, z - h, s, s, s, o.color || T.ember, { hi: true });
    const zt = z + h, i = 0.17 * s;                                              // franja y puntos en la tapa: parece un paquete de datos
    MX.flat([[x - h + i, y - h + i * 2.4, zt], [x + h - i, y - h + i * 2.4, zt], [x + h - i, y - h + i * 3.6, zt], [x - h + i, y - h + i * 3.6, zt]], 'rgba(255,255,255,0.55)', { stroke: false });
    for (let k = 0; k < 3; k++) MX.flat([[x - h + i * (1 + k * 1.7), y + h - i * 3.2, zt], [x - h + i * (1.9 + k * 1.7), y + h - i * 3.2, zt], [x - h + i * (1.9 + k * 1.7), y + h - i * 2.2, zt], [x - h + i * (1 + k * 1.7), y + h - i * 2.2, zt]], 'rgba(60,20,0,0.35)', { stroke: false });
  }

  /* ---------------------------------------------------------------- estaciones */
  const lamp = (x, y, z, on, col) => MX.sphere(x, y, z, 0.16, on ? col : '#9a988d', { glow: on ? 3.4 : 0 });
  function drawPlate(t, dz) {
    MX.shadow(-1, -1.2, 17.2, 8.4, 0.35, 0.9);
    MX.flushShadows(W, H);
    MX.box(-1, -1.2, -0.5 + dz, 17.2, 8.4, 0.5, T.plate);
    for (let x = 0; x <= 16; x++) MX.line3([x, -1.2, dz], [x, 7.2, dz], 'rgba(42,41,37,0.09)', 1);
    for (let y = -1; y <= 7; y++) MX.line3([-1, y, dz], [16.2, y, dz], 'rgba(42,41,37,0.09)', 1);
    for (const [x, y] of [[-0.6, -0.8], [15.8, -0.8], [-0.6, 6.8], [15.8, 6.8]]) MX.disc(x, y, 0.001 + dz, 0.16, T.steel);
    // rotulos estarcidos sobre la placa, uno por estacion
    [['SHELL', 0.2, 5.6, 0.34], ['PTY QUEUE', 5.6, 6.5, 0.3], ['CREDIT GATE', 8.5, 6.5, 0.3], ['xterm PARSER', 12.3, 6.5, 0.3]].forEach(([s, x, y, z]) => MX.planeText(s, x, y, 0.001 + dz, z, { spacing: 2 }));
    MX.planeText('FLOW  >>>', 3.4, 5.7, 0.001 + dz, 0.3, { spacing: 4, color: 'rgba(232,89,12,0.5)' });
  }
  function drawShell(t, dz) {
    MX.shadow(SH.x, SH.y, SH.w, SH.d, SH.h);
    MX.box(SH.x, SH.y, dz, SH.w, SH.d, SH.h, T.metal);
    const bx = [SH.x, SH.y, dz, SH.w, SH.d, SH.h], blocked = S.shellBlocked(t), burst = t >= 9, run = burst && !blocked;
    MX.faceQuad('rt', bx, 0.1, 0.1, 0.9, 0.56, '#2b2a26', { stroke: true, strokeAlpha: 0.7 });
    const sc = run ? (t * 5) % 1 : 0;
    for (let i = 0; i < 6; i++) {
      const v = 0.14 + (i - sc) * 0.065, w = 0.25 + 0.5 * hash(i + Math.floor(run ? t * 5 : 0), 3);
      if (v > 0.12 && v < 0.54) MX.faceQuad('rt', bx, 0.16, v, 0.16 + w * 0.6, v + 0.03, i % 3 === 0 ? '#4ad6b7' : '#e8e3d4', { stroke: false });
    }
    MX.faceQuad('rt', bx, 0.34, 0.9, 0.66, 0.97, '#1e1d1a', { stroke: false });               // boca de salida hacia la cinta
    for (const v of [0.7, 0.76, 0.82]) MX.faceQuad('lf', bx, 0.1, v, 0.9, v + 0.012, 'rgba(42,41,37,0.4)', { stroke: false });
    MX.cyl(SH.x + 1.1, SH.y + 1.3, SH.h + dz, 0.12, 0.2, T.steel);
    lamp(SH.x + 1.1, SH.y + 1.3, SH.h + dz + 0.28, true, blocked ? T.red : T.green);
  }
  function drawBeltA(t, dz) {
    for (const x of [2.9, 4.3, 5.7]) for (const y of [BA.y - 0.02, BA.y + BA.w - 0.1]) { MX.shadow(x - 0.05, y, 0.1, 0.12, 3); MX.box(x - 0.05, y, dz * 0.5, 0.1, 0.12, BA.z, T.steel, { hi: false }); }
    MX.box(BA.x0, BA.y, BA.z + dz, BA.x1 - BA.x0, BA.w, BA.h, T.steel);
    const zt = BA.z + BA.h + dz, off = (t * 2.7) % 0.5;
    for (let x = BA.x0 + off - 0.5; x < BA.x1; x += 0.5) { const a = Math.max(x, BA.x0), b = Math.min(x + 0.1, BA.x1); if (b > a) MX.flat([[a, BA.y + 0.05, zt], [b, BA.y + 0.05, zt], [b, BA.y + BA.w - 0.05, zt], [a, BA.y + BA.w - 0.05, zt]], 'rgba(42,41,37,0.18)', { stroke: false }); }
  }
  function drawTank(t, dz, crates) {
    MX.shadow(TK.cx - TK.r, TK.cy - TK.r, TK.r * 2, TK.r * 2, TK.h);
    MX.cyl(TK.cx, TK.cy, dz, TK.r + 0.14, 0.16, T.steel);
    MX.cyl(TK.cx, TK.cy, dz + 0.16, TK.r, TK.h, '#bfe0e6', { glass: true, top: false });
    // marcas de nivel (8 capas x 4 cajas = 32) en el borde derecho
    for (let k = 0; k <= 8; k++) { const zz = 0.16 + k * 0.4 + dz, a = MX.P(TK.cx + TK.r * 0.7071, TK.cy + TK.r * 0.7071, zz), long = k % 4 === 0; MX.ctx.strokeStyle = 'rgba(42,41,37,0.55)'; MX.ctx.lineWidth = long ? 2 : 1; MX.ctx.beginPath(); MX.ctx.moveTo(a[0], a[1]); MX.ctx.lineTo(a[0] + (long ? 16 : 9), a[1] + (long ? 9 : 5)); MX.ctx.stroke(); }
    crates.sort((a, b) => a.pos[2] - b.pos[2] || (a.pos[0] + a.pos[1]) - (b.pos[0] + b.pos[1]));
    for (const c of crates) drawCrate({ pos: [c.pos[0], c.pos[1], c.pos[2] + dz], sc: c.sc });
    MX.cyl(TK.cx, TK.cy, dz + 0.16, TK.r, TK.h, '#bfe0e6', { glass: true, alpha: 0.45, top: false });
    MX.disc(TK.cx, TK.cy, TK.h + 0.16 + dz, TK.r, 'rgba(255,255,255,0.28)');
    MX.disc(TK.cx, TK.cy, TK.h + 0.16 + dz, TK.r + 0.05, 'rgba(0,0,0,0)', { lw: 3 });
    MX.box(TK.cx + TK.r - 0.15, BB.y - 0.05, dz + 0.05, 0.5, BB.w + 0.1, 0.8, T.steel, { hi: false });          // salida
  }
  function drawBeltB(t, dz) {
    MX.shadow(BB.x0, BB.y, BB.x1 - BB.x0, BB.w, 0.3);
    MX.box(BB.x0 + 0.15, BB.y, dz, BB.x1 - BB.x0 - 0.15, BB.w, BB.h, T.steel);
    const zt = BB.h + dz, off = (t * 2.3) % 0.5;
    for (let x = BB.x0 + 0.15 + off - 0.5; x < BB.x1; x += 0.5) { const a = Math.max(x, BB.x0 + 0.15), b = Math.min(x + 0.1, BB.x1); if (b > a) MX.flat([[a, BB.y + 0.05, zt], [b, BB.y + 0.05, zt], [b, BB.y + BB.w - 0.05, zt], [a, BB.y + BB.w - 0.05, zt]], 'rgba(42,41,37,0.18)', { stroke: false }); }
    // portico IPC: el limite de 64 KiB por paquete
    MX.box(11.0, BB.y - 0.2, dz, 0.12, 0.1, 1.15, T.dark, { hi: false }); MX.box(11.0, BB.y + BB.w + 0.1, dz, 0.12, 0.1, 1.15, T.dark, { hi: false }); MX.box(11.0, BB.y - 0.2, 1.05 + dz, 0.12, BB.w + 0.5, 0.1, T.dark, { hi: false });
  }
  const armAngle = (t) => {
    const ev = [...S.log.close.map((x) => [x, 0]), ...S.log.open.map((x) => [x, 1])].filter((e) => e[0] <= t).sort((a, b) => a[0] - b[0]);
    if (!ev.length) return 1.35; const last = ev[ev.length - 1], prev = ev.length > 1 ? ev[ev.length - 2][1] : 1;
    return lerp(prev ? 1.35 : 0, last[1] ? 1.35 : 0, clamp(MX.spring(t - last[0], 2.6, 0.5), -0.1, 1.15));
  };
  function drawGatePost(y, dz) { MX.shadow(GT.x - 0.12, y - 0.12, 0.24, 0.24, 2.7); MX.box(GT.x - 0.12, y - 0.12, dz, 0.24, 0.24, 2.7, T.steel); }
  function drawGateArm(t, dz) {
    const th = armAngle(t), a = [GT.x, GT.y0, GT.hz + dz], b = [GT.x, GT.y0 + GT.L * Math.cos(th), GT.hz + dz + GT.L * Math.sin(th)], closed = S.gateClosed(t);
    MX.tube([a, b], 0.08, closed ? T.red : T.steel);
    for (let k = 1; k < 5; k++) { const u = k / 5; MX.sphere(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u) + 0.02, 0.05, '#ffffff'); }
    MX.sphere(a[0], a[1], a[2], 0.13, T.dark);
    lamp(GT.x, GT.y1, 2.7 + dz + 0.3, true, closed ? T.red : T.green);
  }
  function drawGauge(t, dz) {
    const out = S.outstanding(t);
    MX.shadow(GG.x, GG.y, GG.w, GG.d, 3.2);
    MX.box(GG.x, GG.y, dz, GG.w, GG.d, 0.3, T.steel);
    const col = [GG.x + 0.25, GG.y + 0.25, 0.3 + dz, 0.5, 0.5, 2.7]; MX.box(col[0], col[1], col[2], col[3], col[4], col[5], T.metal);
    for (let i = 0; i < 4; i++) {
      const v0 = 0.06 + i * 0.235, v1 = v0 + 0.19, lit = i < out, f = lit ? MX.mix(T.teal, '#ffffff', 0.15) : '#cfccc0';
      MX.faceQuad('lf', col, 0.18, v0, 0.82, v1, f, { stroke: true, strokeAlpha: 0.5 });
      MX.faceQuad('rt', col, 0.18, v0, 0.82, v1, lit ? MX.shade(f, 0.82) : '#bdbaae', { stroke: true, strokeAlpha: 0.5 });
    }
    // banderines: reanudar (1 caja = 64 KiB) y marca alta (4 cajas = 256 KiB)
    MX.box(GG.x + 0.75, GG.y + 0.35, 0.3 + dz + 2.7 * 0.275, 0.45, 0.3, 0.1, T.teal, { hi: false });
    MX.box(GG.x + 0.75, GG.y + 0.35, 0.3 + dz + 2.7 * 0.985 - 0.05, 0.45, 0.3, 0.1, T.red, { hi: false });
    MX.cyl(GG.x + 0.5, GG.y + 0.5, 3.0 + dz, 0.2, 0.18, T.steel);
  }
  function drawRail(t, dz) {
    MX.tube(RAIL.map((p) => [p[0], p[1], p[2] + dz]), 0.075, T.steel);
    for (const p of RAIL.slice(1, 4)) MX.sphere(p[0], p[1], p[2] + dz, 0.13, T.dark);
    // creditos viajando: una esfera por cada caja ya parseada que aun no llego al contador
    const len = []; let tot = 0; for (let i = 1; i < RAIL.length; i++) { const d = Math.hypot(RAIL[i][0] - RAIL[i - 1][0], RAIL[i][1] - RAIL[i - 1][1], RAIL[i][2] - RAIL[i - 1][2]); len.push(d); tot += d; }
    for (const p of S.pk) if (p.tParseEnd != null && t >= p.tParseEnd && t < p.tCredit) {
      let d = ((t - p.tParseEnd) / P.rail) * tot, i = 0; while (i < len.length - 1 && d > len[i]) { d -= len[i]; i++; }
      const u = d / len[i], a = RAIL[i], b = RAIL[i + 1];
      MX.sphere(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u) + dz, 0.2, T.teal, { glow: 3.2 });
    }
  }
  const gearPts = (cx, cy, z, r, n, ang) => { const o = []; for (let i = 0; i < n * 2; i++) { const a = ang + i * Math.PI / n, rr = i % 2 ? r * 0.8 : r; o.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z]); } return o; };
  function drawParser(t, dz, crates) {
    MX.shadow(PR.x, PR.y, PR.w, PR.d, 1.6);
    MX.box(PR.x, PR.y, dz, PR.w, PR.d, 0.8, T.metal);
    MX.box(PR.x + 0.25, PR.y + 0.25, 0.8 + dz, PR.w - 0.5, PR.d - 0.5, 0.7, T.steel);
    MX.flat([[PR.x + 0.5, PR.y + 0.5, 1.5 + dz], [PR.x + PR.w - 0.5, PR.y + 0.5, 1.5 + dz], [PR.x + PR.w - 0.5, PR.y + PR.d - 0.5, 1.5 + dz], [PR.x + 0.5, PR.y + PR.d - 0.5, 1.5 + dz]], '#34322d');
    let parsing = 0; for (const p of S.pk) if (p.tParseStart != null) parsing += clamp(t - p.tParseStart, 0, P.parse);
    const ang = parsing * 5.5;
    for (const [cx, cy, r, dir] of [[13.05, 3.15, 0.46, 1], [13.85, 3.75, 0.36, -1]]) {
      MX.flat(gearPts(cx, cy, 1.5 + dz, r, 10, dir * ang), T.dark, { stroke: false });
      MX.flat(gearPts(cx, cy, 1.62 + dz, r, 10, dir * ang), T.metal, { edge: MX.INK });
      MX.disc(cx, cy, 1.63 + dz, r * 0.28, T.dark);
    }
    for (const c of crates) drawCrate({ pos: [c.pos[0], c.pos[1], c.pos[2] + dz], sc: c.sc }, {});
    lamp(PR.x + PR.w - 0.25, PR.y + PR.d - 0.3, 0.9 + dz, S.pk.some((p) => p.tParseStart != null && t >= p.tParseStart && t < p.tParseEnd), T.green);   // luz de actividad
  }
  function drawScreen(t, dz) {
    MX.shadow(SC.x, SC.y, SC.w, SC.d, SC.h);
    const bx = [SC.x, SC.y, 0.2 + dz, SC.w, SC.d, SC.h]; MX.box(...bx, T.dark);
    MX.faceQuad('rt', bx, 0.05, 0.06, 0.95, 0.94, '#1c1b18', { stroke: false });
    const nLines = Math.floor(S.parsed(t) * 3.2), rows = 15;
    for (let r = 0; r < rows; r++) {
      const li = nLines > rows ? nLines - rows + r : r - (rows - nLines); if (li < 0 || li >= nLines) continue;
      const v = 0.9 - r * 0.052, w = 0.2 + 0.7 * hash(li, 5), c = ['#7ee0c3', '#e8e3d4', '#e2a523', '#e8e3d4'][li % 4];
      MX.faceQuad('rt', bx, 0.1, v - 0.03, 0.1 + w * 0.8, v, c, { stroke: false, alpha: 0.9 });
    }
    if (Math.floor(t * 2) % 2 === 0) MX.faceQuad('rt', bx, 0.1, 0.9 - rows * 0.052 - 0.03, 0.16, 0.9 - rows * 0.052, '#e8e3d4', { stroke: false });
  }

  /* ---------------------------------------------------------------- camara, etiquetas, HUD */
  const CAMK = [
    { t: 0, S: 40, f: [8, 3.5, 1.2], a: [540, 640] }, { t: 9, S: 42, f: [8, 3.5, 1.2], a: [540, 640] },
    { t: 11, S: 58, f: [8.7, 3.0, 1.8], a: [520, 610] }, { t: 15, S: 58, f: [8.7, 3.0, 1.8], a: [520, 610] },
    { t: 16.8, S: 56, f: [12.6, 3.0, 1.2], a: [560, 630] }, { t: 19, S: 56, f: [12.6, 3.0, 1.2], a: [560, 630] },
    { t: 21.6, S: 42, f: [8, 3.5, 1.2], a: [540, 640] }, { t: 99, S: 42, f: [8, 3.5, 1.2], a: [540, 640] },
  ];
  function setCamera(t) {
    let i = 1; while (i < CAMK.length - 1 && t > CAMK[i].t) i++;
    const A = CAMK[i - 1], B = CAMK[i], u = E.io3(clamp((t - A.t) / (B.t - A.t || 1), 0, 1)), s = lerp(A.S, B.S, u);
    const f = [0, 1, 2].map((k) => lerp(A.f[k], B.f[k], u)), a = [lerp(A.a[0], B.a[0], u), lerp(A.a[1], B.a[1], u)];
    const bre = 1 + 0.008 * Math.sin(t * 0.55), dx = 5 * Math.sin(t * 0.4), dy = 4 * Math.sin(t * 0.33 + 1), S2 = s * bre;
    const c = MX.cam; c.S = S2; c.ox = a[0] + dx - (f[0] - f[1]) * 0.8660254 * S2; c.oy = a[1] + dy - (f[0] + f[1]) * 0.5 * S2 + f[2] * S2;
  }
  // etiqueta con posicion de pantalla fija: la camara esta quieta durante cada ventana, asi no se pisan
  const co = (pt, at, lines, t, t0, t1, o = {}) => { const a = E.out3(ramp(t, t0, t0 + 0.5)) * (1 - E.out3(ramp(t, t1 - 0.5, t1))); if (a <= 0.01) return; MX.callout(pt, at, lines, Object.assign({ alpha: a }, o)); };
  function drawCallouts(t) {
    // plano general (camara 0-9 s y 21.6 s en adelante)
    co([1.1, 3.5, 3.4], [120, 330], ['shell', 'program output'], t, 4.4, 8.6);
    co([TK.cx, TK.cy, 3.56], [470, 300], ['PTY reader queue', '256 chunks x 8 KiB'], t, 5.2, 8.8);
    co([GT.x, GT.y1, 3.0], [1010, 430], ['credit gate', 'high 256 KiB / resume 64 KiB'], t, 6.6, 9.0, { side: 'l' });
    co([11.6, 3.5, 0.8], [230, 850], ['IPC packet', '<= 64 KiB'], t, 7.4, 9.0);
    co([13.6, 3.2, 1.6], [930, 860], ['xterm parser', 'acks when bytes are parsed'], t, 7.9, 9.0, { side: 'l' });
    // primer plano de la compuerta (camara 11-15 s)
    co([GT.x, GT.y1, 2.95], [640, 300], ['gate closed', 'in flight hit 256 KiB'], t, 10.0, 12.2, { color: T.red });
    co([GG.x + 0.5, GG.y + 0.5, 3.0], [1010, 420], ['credit counter', 'only the parser pays it back'], t, 12.4, 15.0, { side: 'l', color: T.teal });
    // primer plano del parser y el riel (camara 16.8-19 s)
    co([RAIL[2][0], RAIL[2][1], RAIL[2][2]], [1000, 330], ['ack', 'credit returns upstream'], t, 16.9, 19.2, { side: 'l', color: T.teal });
    co([13.6, 3.2, 1.6], [1000, 790], ['parser decides', 'the pace of the whole line'], t, 17.0, 19.2, { side: 'l' });
    co([1.1, 3.5, 3.4], [120, 330], ['shell blocked', 'queue is full, memory stays flat'], t, 19.4, 22.8, { color: T.red });
  }
  function drawHUD(t) {
    const c = MX.ctx, y0 = 985, q = S.queue(t), out = S.outstanding(t), closed = S.gateClosed(t), blk = S.shellBlocked(t);
    c.save(); c.fillStyle = '#fbfaf6'; c.fillRect(60, y0, 960, 270); c.strokeStyle = 'rgba(42,41,37,0.28)'; c.lineWidth = 1.2; c.strokeRect(60.5, y0 + 0.5, 959, 269);
    MX.text('QUEUE', 90, y0 + 58, { size: 22, color: T.mute, spacing: 2 });
    for (let i = 0; i < 32; i++) { const x = 250 + i * 18.4, on = i < q; c.fillStyle = on ? T.ember : 'rgba(42,41,37,0.08)'; c.fillRect(x, y0 + 38, 14.5, 28); c.strokeStyle = 'rgba(42,41,37,0.35)'; c.strokeRect(x + 0.5, y0 + 38.5, 14, 27); }
    MX.text(q + ' / 32', 1000, y0 + 58, { size: 26, color: T.ink, align: 'right', w: 600 });
    MX.text('IN FLIGHT', 90, y0 + 140, { size: 22, color: T.mute, spacing: 2 });
    for (let i = 0; i < 4; i++) { const x = 250 + i * 66, on = i < out; c.fillStyle = on ? T.teal : 'rgba(42,41,37,0.08)'; c.fillRect(x, y0 + 118, 60, 30); c.strokeStyle = 'rgba(42,41,37,0.35)'; c.strokeRect(x + 0.5, y0 + 118.5, 59, 29); }
    c.strokeStyle = T.teal; c.lineWidth = 2; c.beginPath(); c.moveTo(250 + 66 - 3, y0 + 108); c.lineTo(250 + 66 - 3, y0 + 160); c.stroke(); c.strokeStyle = T.red; c.beginPath(); c.moveTo(250 + 4 * 66 - 3, y0 + 108); c.lineTo(250 + 4 * 66 - 3, y0 + 160); c.stroke();
    MX.text('resume 64', 250 + 66 - 8, y0 + 178, { size: 17, color: T.teal, align: 'center' }); MX.text('high 256 KiB', 250 + 4 * 66 - 8, y0 + 178, { size: 17, color: T.red, align: 'center' });
    MX.text(MX.fmt(out * 64) + ' KiB', 1000, y0 + 140, { size: 26, color: T.ink, align: 'right', w: 600 });
    c.fillStyle = closed ? T.red : T.green; c.beginPath(); c.arc(100, y0 + 230, 9, 0, 6.2832); c.fill();
    MX.text('GATE  ' + (closed ? 'CLOSED' : 'OPEN'), 120, y0 + 238, { size: 24, color: T.ink, w: 600 });
    c.fillStyle = blk ? T.red : T.green; c.beginPath(); c.arc(430, y0 + 230, 9, 0, 6.2832); c.fill();
    MX.text('SHELL  ' + (blk ? 'BLOCKED' : 'RUNNING'), 450, y0 + 238, { size: 24, color: T.ink, w: 600 });
    MX.text('parsed ' + MX.fmt(S.parsed(t) * 64) + ' KiB', 1000, y0 + 238, { size: 24, color: T.mute, align: 'right' });
    c.restore();
  }
  function drawOutro(t) {
    const a = E.out3(ramp(t, 22.8, 23.8)); if (a <= 0) return; const c = MX.ctx;
    c.save(); c.globalAlpha = Math.min(1, a * 1.25); c.fillStyle = T.paper; c.fillRect(35, 201, W - 70, 1098); c.restore();
    MX.text('Fig 1 · what the machine proves', 90, 290, { size: 24, color: T.mute, alpha: a, spacing: 2 });
    MX.text('Memory stays bounded.', 90, 380, { size: 60, color: T.ink, font: MX.SANS, w: 650, alpha: a });
    MX.text('A flood of output can not freeze the UI.', 90, 430, { size: 30, color: T.mute, font: MX.SANS, alpha: a });
    [['queue', '256 chunks x 8 KiB, bounded'], ['gate', 'closes at 256 KiB in flight, reopens at 64 KiB'], ['credit', 'returned only when the parser has the bytes']].forEach(([k, v], i) => {
      const aa = E.out3(ramp(t, 23.4 + i * 0.35, 24.1 + i * 0.35)); MX.text(k.toUpperCase(), 90, 540 + i * 86, { size: 20, color: T.ember, alpha: aa, spacing: 3, w: 600 }); MX.text(v, 90, 574 + i * 86, { size: 30, color: T.ink, alpha: aa });
    });
    const ab = E.out3(ramp(t, 24.8, 25.6));
    c.save(); c.globalAlpha = ab; c.strokeStyle = 'rgba(42,41,37,0.3)'; c.beginPath(); c.moveTo(90, 840); c.lineTo(990, 840); c.stroke(); c.restore();
    MX.text('Measured on Windows 0.1.1 (2026-10-06)', 90, 892, { size: 22, color: T.mute, alpha: ab, spacing: 1 });
    MX.text('205.7 MiB idle · 1.48 s to a visible terminal', 90, 940, { size: 32, color: T.ink, alpha: ab, w: 600 });
    const ac = E.out3(ramp(t, 25.6, 26.4));
    MX.text('NovaTerm', 90, 1090, { size: 54, color: T.ink, font: MX.SANS, w: 650, alpha: ac });
    MX.text('github.com/DiegoLopez0208/novaterm', 90, 1140, { size: 28, color: T.teal, alpha: ac, w: 600 });
  }

  /* ---------------------------------------------------------------- escena */
  const ASM = { plate: 0.0, shell: 0.7, beltA: 1.1, tank: 1.5, gate: 2.0, beltB: 2.4, parser: 2.8, screen: 3.2, rail: 3.5 };
  const asm = (t, d) => { const s = MX.spring(t - d, 2.0, 0.72); return { dz: Math.max(-0.02, (1 - s) * 4.2), a: E.out3(ramp(t, d, d + 0.35)) }; };
  function draw(ctx, t) {
    MX.A = 1;
    const head = E.out3(ramp(t, 0, 0.8));
    MX.card(W, H, { fig: 'Fig 1', kicker: 'NOVATERM · PTY TRANSPORT', title: 'Backpressure', sub: 'How a bounded queue and a credit gate keep a flood of output from freezing the UI.', hint: '1 CRATE = 64 KiB · SLOWED DOWN', readout: 'in flight ' + MX.fmt(S.outstanding(t) * 64) + ' / 256 KiB', alpha: head });
    setCamera(t);
    const crates = { A: [], tank: [], B: [], P: [] };
    for (const p of S.pk) { const c = crate(p, t); if (c) crates[c.grp].push(Object.assign(c, { p })); }
    const items = [], add = (k, f) => items.push({ k, f });
    const a0 = asm(t, ASM.plate), aS = asm(t, ASM.shell), aA = asm(t, ASM.beltA), aT = asm(t, ASM.tank), aG = asm(t, ASM.gate), aB = asm(t, ASM.beltB), aP = asm(t, ASM.parser), aC = asm(t, ASM.screen), aR = asm(t, ASM.rail);
    add(-100, () => { MX.A = a0.a; drawPlate(t, a0.dz * 0.2); });
    add(9.9, () => { MX.A = aR.a; drawRail(t, aR.dz); });
    add(10.4, () => { MX.A = aG.a; drawGauge(t, aG.dz); });
    add(4.6, () => { MX.A = aS.a; drawShell(t, aS.dz); });
    add(7.8, () => { MX.A = aA.a; drawBeltA(t, aA.dz); for (const c of crates.A) drawCrate({ pos: [c.pos[0], c.pos[1], c.pos[2] + aA.dz], sc: c.sc }); });
    add(11.1, () => { MX.A = aT.a; drawTank(t, aT.dz, crates.tank); });
    add(12.0, () => { MX.A = aG.a; drawGatePost(GT.y0, aG.dz); });
    add(12.6, () => { MX.A = aB.a; drawBeltB(t, aB.dz); for (const c of crates.B.sort((x, y) => x.pos[0] - y.pos[0])) drawCrate({ pos: [c.pos[0], c.pos[1], c.pos[2] + aB.dz], sc: c.sc }); });
    add(13.0, () => { MX.A = aG.a; drawGateArm(t, aG.dz); });
    add(13.5, () => { MX.A = aG.a; drawGatePost(GT.y1, aG.dz); });
    add(17, () => { MX.A = aP.a; drawParser(t, aP.dz, crates.P); });
    add(19, () => { MX.A = aC.a; drawScreen(t, aC.dz); });
    items.sort((x, y) => x.k - y.k); for (const it of items) it.f();
    MX.A = 1;
    if (t >= 9 && t < 11) { const aa = E.out3(ramp(t, 9, 9.3)) * (1 - E.out3(ramp(t, 10.3, 11))), f = MX.P(1.1, 3.5, 3.9); MX.ctx.save(); MX.ctx.globalAlpha = aa; MX.ctx.fillStyle = '#2b2a26'; MX.ctx.fillRect(f[0] - 150, f[1] - 78, 300, 52); MX.text('$ cat huge.log', f[0] - 132, f[1] - 43, { size: 26, color: '#7ee0c3', w: 600 }); MX.ctx.restore(); }
    drawCallouts(t);
    if (t >= 4.0 && t < 22.9) drawHUD(t);
    drawOutro(t);
  }

  /* ---------------------------------------------------------------- audio: un cue por evento de la simulacion */
  function cues() {
    const c = [], scale = [523, 587, 659, 784, 880, 988];
    c.push({ t: 0.05, kind: 'whoosh', d: 1.0, v: 0.5 }, { t: 0.2, kind: 'pad', d: 3.2, notes: [45, 52, 57, 64], v: 1 });
    Object.values(ASM).forEach((d, i) => { if (i) c.push({ t: d + 0.42, kind: 'drop', f: 420 + i * 70, v: 0.9 }); });
    for (const p of S.pk) {
      if (p.tRelease != null) c.push({ t: p.tRelease, kind: 'thock', v: 0.7 });
      if (p.tTank != null) c.push({ t: p.tTank, kind: 'splash', v: 0.8 });
      if (p.tParseStart != null) c.push({ t: p.tParseStart, kind: 'grind', d: 0.55, v: 0.8 });
      if (p.tCredit != null) { const o = S.outstanding(p.tCredit + 0.001); c.push({ t: p.tCredit, kind: 'ping', f: scale[Math.min(5, o)], v: 0.9 }); }
    }
    S.log.close.forEach((x) => c.push({ t: x, kind: 'clunk', v: 1 })); S.log.open.forEach((x) => c.push({ t: x, kind: 'clack', v: 1 }));
    let lastB = -9; S.log.block.forEach((x) => { if (x - lastB > 1.2) c.push({ t: x, kind: 'beep', f: 740, v: 0.9 }, { t: x + 0.18, kind: 'beep', f: 740, v: 0.9 }); lastB = x; });
    [10.0, 15.4, 20.9, 22.9].forEach((x) => c.push({ t: x, kind: 'whoosh', d: 0.8, v: 0.6 }));
    c.push({ t: 23.3, kind: 'pad', d: 4.0, notes: [53, 57, 60, 65], v: 1.1 });
    return c;
  }
  const audio = () => MX.audio.render({ duration: DUR, sr: 44100, cues: cues(), bed: [{ t: 0, a: 0.15 }, { t: 4, a: 0.3 }, { t: 9, a: 0.85 }, { t: 21, a: 0.85 }, { t: 24, a: 0.25 }, { t: 28, a: 0.15 }], reverb: 0.22 });

  MX.run({ w: W, h: H, fps: FPS, duration: DUR, draw, audio, poster: 12.5 });
})();
