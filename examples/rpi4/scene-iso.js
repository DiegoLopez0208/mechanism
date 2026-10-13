/*
 * scene.js - Fig 2: Raspberry Pi 4 Model B. Modelo isometrico construido SOLO con las medidas de model.js (datasheet RP-008341-DS, Fig. 1).
 * Se arma, se explosiona, recorre las piezas con su fuente y pasa a plano acotado. Mismo dibujo para el video y para el modo ?explore.
 */
(function () {
  'use strict';
  const M = MODEL, T = MX.THEME, E = MX.E, clamp = MX.clamp, lerp = MX.lerp, ramp = MX.ramp;
  const W = 1080, H = 1350, FPS = 30, DUR = 30, BD = M.board.d, BW = M.board.w, C30 = Math.cos(Math.PI / 6);
  const wyOf = (y, d) => BD - (y + (d || 0));                // el eje y del datasheet (hacia arriba) pasa a y del mundo (hacia el espectador)
  const S_ISO = 7.3, S_PLAN = 9, VC_ISO = 705, VC_PLAN = 640, CX = BW / 2, CY = BD / 2;

  /* ------------------------------------------------------------ nombres para mostrar (el JSON guarda los del datasheet) */
  const NAME = { pcb: 'PCB', gpio: 'GPIO header 2x20', soc: 'SoC BCM2711', ram: 'LPDDR4 RAM', wifi: 'Wi-Fi / BT module', dsi: 'DSI display port', csi: 'CSI camera port', usbc: 'USB-C power', hdmi0: 'micro-HDMI 0', hdmi1: 'micro-HDMI 1', audio: '3.5 mm jack', eth: 'Gigabit Ethernet', usb3: 'USB 3.0 x2', usb2: 'USB 2.0 x2', ic1: 'IC', ic2: 'IC', ic3: 'IC', ic4: 'IC' };
  const NOTE = { pcb: '4 mounting holes, 58 x 49 mm', gpio: '40 pins, 2.54 mm pitch', soc: '4x Cortex-A72 at 1.5 GHz', ram: '1, 2, 4 or 8 GB', wifi: '802.11ac, Bluetooth 5.0', dsi: '2-lane MIPI', csi: '2-lane MIPI', usbc: 'power input, 5 V', hdmi0: 'up to 4Kp60', hdmi1: 'up to 4Kp60', audio: 'audio + composite video', eth: 'overhangs the edge 2.95 mm', usb3: 'next to the Ethernet', usb2: 'the pair nearest the corner', ic1: 'not named in the datasheet', ic2: 'not named in the datasheet', ic3: 'not named in the datasheet', ic4: 'not named in the datasheet' };
  const HSRC = { 'z-plano': 'height: drawing label', estimado: 'height: estimated' };
  const parts = [{ id: 'pcb', x: 0, y: 0, w: BW, d: BD, h: M.board.thick, hConf: 'estimado', conf: 'cota', color: '#5b9a6b' }].concat(M.parts);
  const byId = Object.fromEntries(parts.map((p) => [p.id, p]));
  const fmt = (v) => (Math.round(v * 100) / 100).toFixed(v % 1 === 0 ? 1 : v * 10 % 1 === 0 ? 1 : 2);
  const dimText = (p) => fmt(p.w) + ' x ' + fmt(p.d) + ' x ' + fmt(p.h) + ' mm';

  /* ------------------------------------------------------------ desplazamientos al explosionar (mm en el mundo del dibujo) */
  const OFF = { gpio: [0, 0, 26], soc: [0, 0, 17], ram: [0, 0, 17], wifi: [0, 0, 17], ic1: [0, 0, 10], ic2: [0, 0, 10], ic3: [0, 0, 10], ic4: [0, 0, 10], dsi: [-15, 0, 7], csi: [0, 0, 11], usbc: [0, 15, 7], hdmi0: [0, 15, 7], hdmi1: [0, 15, 7], audio: [0, 15, 7], eth: [11, 0, 7], usb3: [11, 0, 7], usb2: [11, 0, 7], pcb: [0, 0, 0] };
  const SPAWN = {}; parts.forEach((p, i) => { SPAWN[p.id] = i === 0 ? 0.2 : 0.7 + (i - 1) * 0.16; });

  /* ------------------------------------------------------------ proyeccion: mezcla iso <-> vista superior (plano) */
  let VU = 0, SHX = 0;
  MX.P = (x, y, z) => {
    const dx = x - CX, dy = y - CY, zz = z || 0;
    const ix = 540 + SHX + (dx - dy) * C30 * S_ISO, iy = VC_ISO + (dx + dy) * 0.5 * S_ISO - zz * S_ISO;
    return [lerp(ix, 540 + dx * S_PLAN, VU), lerp(iy, VC_PLAN + dy * S_PLAN, VU)];
  };

  /* ------------------------------------------------------------ geometria de la placa (esquinas redondeadas) */
  function outline(x0, y0, w, d, r, n = 7) {
    const pts = [], cs = [[x0 + w - r, y0 + r, -90], [x0 + w - r, y0 + d - r, 0], [x0 + r, y0 + d - r, 90], [x0 + r, y0 + r, 180]];
    cs.forEach(([cx, cy, a0]) => { for (let i = 0; i <= n; i++) { const a = (a0 + 90 * i / n) * Math.PI / 180; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } });
    return pts;
  }
  const circle = (cx, cy, r, z, fill, o) => { const pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * 6.2832; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]); } MX.flat(pts, fill, o); };

  function plateText(s, x, y, size, color, w) {
    const o = MX.P(x, y, 0.02), ex = MX.P(x + 1, y, 0.02), ey = MX.P(x, y + 1, 0.02), c = MX.ctx;
    c.save(); c.transform(ex[0] - o[0], ex[1] - o[1], ey[0] - o[0], ey[1] - o[1], o[0], o[1]); c.globalAlpha = MX.A; c.fillStyle = color; c.font = (w || 600) + ' ' + size + 'px ' + MX.MONO; c.fillText(s, 0, 0); c.restore();
  }
  let HITS = [];
  function drawPcb(alpha, hi, dim) {
    const c = MX.ctx, z0 = -M.board.thick, ol = outline(0, 0, BW, BD, M.board.radius);
    MX.A = alpha;
    const tones = MX.tones(byId.pcb.color);
    for (let i = 0; i < ol.length; i++) {
      const a = ol[i], b = ol[(i + 1) % ol.length], nx = b[1] - a[1], ny = -(b[0] - a[0]);   // normal exterior (el contorno recorre en sentido horario en pantalla)
      if (nx + ny <= 0.001) continue;
      const k = 0.97 - 0.15 * clamp(nx / (Math.abs(nx) + Math.abs(ny) + 1e-9), 0, 1);
      MX.flat([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], 0], [a[0], a[1], 0]], MX.shade(byId.pcb.color, k), { strokeAlpha: 0.35 });
    }
    const top = ol.map((q) => MX.P(q[0], q[1], 0));
    MX.poly(top, tones.top, { strokeAlpha: 0.55 });
    HITS.push({ id: 'pcb', poly: top });
    // orificios de montaje: anillo de cobre medido (6,2 mm) y agujero
    const hs = M.holes;
    [[hs.inset, hs.inset], [hs.inset + hs.pitchX, hs.inset], [hs.inset, hs.inset + hs.pitchY], [hs.inset + hs.pitchX, hs.inset + hs.pitchY]].forEach(([hx, hy]) => { const wy = BD - hy; circle(hx, wy, hs.padDia / 2, 0.01, '#d7b45b', { strokeAlpha: 0.4 }); circle(hx, wy, hs.dia / 2, 0.02, '#2a2925', { strokeAlpha: 0.2 }); });
    plateText('Raspberry Pi 4 Model B', 14, BD - 17, 2.2, 'rgba(255,255,255,0.65)', 700);
    plateText('Raspberry Pi Ltd. 2024', 14, BD - 13.6, 1.5, 'rgba(255,255,255,0.42)', 400);
    if (hi) { c.save(); c.strokeStyle = T.ember; c.lineWidth = 3; c.beginPath(); top.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.stroke(); c.restore(); }
    MX.A = 1;
  }

  /* ------------------------------------------------------------ piezas */
  function drawPart(p, o) {
    const c = MX.ctx, x = p.x + o.dx, w = p.w, d = p.d, wy = wyOf(p.y, p.d) + o.dy, z = o.dz, h = p.h;
    MX.A = o.alpha; if (o.alpha < 0.02) { MX.A = 1; return; }
    const isHeader = p.id === 'gpio', hh = isHeader ? 2.5 : h;
    const r = MX.box(x, wy, z, w, d, hh, p.color, { hi: true });
    const box = [x, wy, z, w, d, hh], zt = z + hh;
    if (p.id === 'usb2' || p.id === 'usb3') { MX.faceQuad('rt', box, 0.14, 0.1, 0.86, 0.42, '#16150f', { stroke: false }); MX.faceQuad('rt', box, 0.14, 0.58, 0.86, 0.9, '#16150f', { stroke: false }); if (p.id === 'usb3') { MX.faceQuad('rt', box, 0.2, 0.18, 0.8, 0.3, '#2f6fd6', { stroke: false }); MX.faceQuad('rt', box, 0.2, 0.66, 0.8, 0.78, '#2f6fd6', { stroke: false }); } }
    else if (p.id === 'eth') { MX.faceQuad('rt', box, 0.1, 0.12, 0.9, 0.7, '#16150f', { stroke: false }); for (let k = 0; k < 8; k++) MX.faceQuad('rt', box, 0.16 + k * 0.088, 0.14, 0.2 + k * 0.088, 0.3, '#d7b45b', { stroke: false }); }
    else if (p.id === 'usbc') MX.faceQuad('lf', box, 0.16, 0.3, 0.84, 0.7, '#16150f', { stroke: false });
    else if (p.id === 'hdmi0' || p.id === 'hdmi1') MX.faceQuad('lf', box, 0.1, 0.25, 0.9, 0.75, '#16150f', { stroke: false });
    else if (p.id === 'audio') { MX.faceQuad('lf', box, 0.32, 0.3, 0.68, 0.7, '#16150f', { stroke: false }); }
    else if (p.id === 'soc') { MX.planeText('BCM2711', x + 2.6, wy + 8.1, zt + 0.02, 1.9, { color: 'rgba(42,41,37,0.55)', w: 700 }); }
    else if (p.id === 'ram') { MX.planeText('LPDDR4', x + 1.8, wy + 8.0, zt + 0.02, 1.7, { color: 'rgba(255,255,255,0.45)', w: 700 }); }
    else if (p.id === 'dsi' || p.id === 'csi') { MX.flat([[x + 0.8, wy + 1.2, zt + 0.01], [x + w - 0.8, wy + 1.2, zt + 0.01], [x + w - 0.8, wy + d - 1.2, zt + 0.01], [x + 0.8, wy + d - 1.2, zt + 0.01]], '#3b3a36', { strokeAlpha: 0.25 }); }
    else if (p.id === 'wifi') { for (let k = 1; k < 5; k++) MX.line3([x + 0.7, wy + k * d / 5, zt + 0.01], [x + w - 0.7, wy + k * d / 5, zt + 0.01], 'rgba(42,41,37,0.22)', 1); }
    if (isHeader) {                                        // pines: 20 x 2, paso 2,54 mm, hasta la altura Z=8,5 del plano
      for (let i = 0; i < 20; i++) for (let j = 0; j < 2; j++) { const px = x + 1.27 + i * 2.54 - 0.32, py = wy + d / 2 + (j ? 1.27 : -1.27) - 0.32; MX.box(px, py, zt, 0.64, 0.64, h - hh, '#d7b45b', { hi: false, edge: 'rgba(42,41,37,0.4)' }); }
    }
    // piezas con altura estimada: contorno punteado
    if (p.hConf === 'estimado' && o.alpha > 0.3) { c.save(); c.setLineDash([5, 4]); c.strokeStyle = T.ember; c.globalAlpha = 0.9 * o.alpha; c.lineWidth = 1.6; c.beginPath(); r.top.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.stroke(); c.restore(); }
    if (o.hi) { c.save(); c.strokeStyle = T.ember; c.lineWidth = 3.2; c.globalAlpha = 1; [r.top, r.lf, r.rt].forEach((q) => { c.beginPath(); q.forEach((pt, i) => (i ? c.lineTo(pt[0], pt[1]) : c.moveTo(pt[0], pt[1]))); c.closePath(); c.stroke(); }); c.restore(); }
    HITS.push({ id: p.id, poly: r.top }, { id: p.id, poly: r.lf }, { id: p.id, poly: r.rt });
    MX.A = 1;
  }

  /* ------------------------------------------------------------ cotas del plano */
  function arrow(a, b, s) { const c = MX.ctx, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + ux * s - uy * s * 0.35, a[1] + uy * s + ux * s * 0.35); c.lineTo(a[0] + ux * s + uy * s * 0.35, a[1] + uy * s - ux * s * 0.35); c.closePath(); c.fill(); }
  function dimension(A, B, off, label, a) {                    // A, B: [wx, wy] en el plano de la placa; off: desplazamiento de la linea de cota
    if (a <= 0.01) return;
    const c = MX.ctx, P = (q, k) => MX.P(q[0] + (k ? off[0] : 0), q[1] + (k ? off[1] : 0), 0), a0 = P(A, 0), b0 = P(B, 0), a1 = P(A, 1), b1 = P(B, 1);
    c.save(); c.globalAlpha = a; c.strokeStyle = T.teal; c.fillStyle = T.teal; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(a0[0], a0[1]); c.lineTo(a1[0] + (a1[0] - a0[0]) * 0.08, a1[1] + (a1[1] - a0[1]) * 0.08); c.moveTo(b0[0], b0[1]); c.lineTo(b1[0] + (b1[0] - b0[0]) * 0.08, b1[1] + (b1[1] - b0[1]) * 0.08); c.stroke();
    c.beginPath(); c.moveTo(a1[0], a1[1]); c.lineTo(b1[0], b1[1]); c.stroke(); arrow(a1, b1, 13); arrow(b1, a1, 13);
    const mx = (a1[0] + b1[0]) / 2, my = (a1[1] + b1[1]) / 2; c.font = '600 27px ' + MX.MONO; const tw = c.measureText(label).width;
    c.fillStyle = T.paper; c.fillRect(mx - tw / 2 - 7, my - 18, tw + 14, 33); c.fillStyle = T.teal; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, mx, my + 1); c.restore();
  }

  /* ------------------------------------------------------------ cuadro por cuadro */
  function render(st) {
    const c = MX.ctx; HITS = []; VU = st.u; SHX = -34 * st.e * (1 - st.u);
    MX.cam.S = lerp(S_ISO, S_PLAN, st.u);
    MX.card(W, H, { fig: 'Fig 2', kicker: 'DATASHEET RP-008341-DS', title: 'Raspberry Pi 4 Model B', sub: st.u > 0.5 ? 'Top view, dimensions in mm, taken from the datasheet drawing.' : 'Every size traced to the official datasheet drawing.', hint: st.hint || '', readout: st.readout || '85 x 56 mm  -  17 parts' });
    MX.shadow(0, 0, BW, BD, 0.5, 0.9); MX.flushShadows(W, H);
    // orden de pintado: de atras hacia adelante por profundidad iso
    const list = parts.map((p) => {
      const off = OFF[p.id], e = st.e * (p.id === 'pcb' ? 0 : 1), sp = st.assemble(p.id);
      const o = { dx: off[0] * e, dy: off[1] * e, dz: off[2] * e + sp.dz, alpha: sp.alpha, hi: st.focus === p.id };
      if (st.focus && st.focus !== p.id) o.alpha *= lerp(1, 0.2, st.focusA);
      if (st.focus === p.id) o.alpha = sp.alpha;
      const depth = (p.x + p.w / 2 + o.dx) + (wyOf(p.y, p.d) + p.d / 2 + o.dy) + (o.dz + p.h) * 0.015 + (p.id === 'pcb' ? -1000 : 0);
      return { p, o, depth };
    }).sort((a, b) => a.depth - b.depth);
    // guias punteadas de la posicion original (solo al explosionar)
    if (st.e > 0.02 && st.u < 0.5) {
      c.save(); c.setLineDash([3, 5]); c.strokeStyle = 'rgba(42,41,37,0.4)'; c.lineWidth = 1.2; c.globalAlpha = Math.min(1, st.e * 1.5) * (1 - st.u);
      list.forEach(({ p, o }) => { if (p.id === 'pcb' || o.alpha < 0.5) return; const cx = p.x + p.w / 2, cy = wyOf(p.y, p.d) + p.d / 2, a = MX.P(cx, cy, p.h), b = MX.P(cx + o.dx, cy + o.dy, o.dz + p.h); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); });
      c.restore();
    }
    list.forEach(({ p, o }) => { if (p.id === 'pcb') drawPcb(o.alpha, o.hi); else drawPart(p, o); });
    // plano: cotas, globos numerados y lista de piezas
    if (st.u > 0.02) drawPlan(st);
    if (st.focus && st.focusA > 0.02) drawInfo(st, list);
    if (st.outro > 0.01) drawOutro(st.outro);
    if (st.ui) st.ui(c);
  }

  function drawPlan(st) {
    const a = ramp(st.u, 0.7, 1), p = st.dimT || ((id) => 1);
    const hs = M.holes, wyy = (y) => BD - y;
    dimension([0, BD], [BW, BD], [0, 9], '85', a * p(0));
    dimension([BW, 0], [BW, BD], [10, 0], '56', a * p(1));
    dimension([hs.inset, 0], [hs.inset + hs.pitchX, 0], [0, -6], '58', a * p(2));
    dimension([0, wyy(hs.inset)], [0, wyy(hs.inset + hs.pitchY)], [-8, 0], '49', a * p(3));
    dimension([0, 0], [hs.inset, 0], [0, -14], '3.5', a * p(4));
    // globos numerados (una pieza por numero; los CI comparten el 14)
    const order = ['gpio', 'soc', 'ram', 'wifi', 'dsi', 'csi', 'usbc', 'hdmi0', 'hdmi1', 'audio', 'eth', 'usb3', 'usb2', 'ic1'];
    const c = MX.ctx; c.save(); c.globalAlpha = a * (st.balloon == null ? 1 : st.balloon);
    const bal = (cx, cy, n) => { const q = MX.P(cx, cy, 0); c.beginPath(); c.arc(q[0], q[1], 13, 0, 6.2832); c.fillStyle = T.ink; c.fill(); c.fillStyle = T.paper; c.font = '700 15px ' + MX.MONO; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), q[0], q[1] + 1); };
    order.forEach((id, i) => { const q = byId[id]; bal(q.x + q.w / 2, wyOf(q.y, q.d) + q.d / 2, i + 1); });
    ['ic2', 'ic3', 'ic4'].forEach((id) => { const q = byId[id]; bal(q.x + q.w / 2, wyOf(q.y, q.d) + q.d / 2, 14); });
    // lista
    const short = { gpio: 'GPIO header', soc: 'SoC BCM2711', ram: 'LPDDR4 RAM', wifi: 'Wi-Fi / BT', dsi: 'DSI port', csi: 'CSI port', usbc: 'USB-C', hdmi0: 'micro-HDMI 0', hdmi1: 'micro-HDMI 1', audio: '3.5 mm jack', eth: 'Ethernet', usb3: 'USB 3.0 x2', usb2: 'USB 2.0 x2', ic1: 'ICs x4' };
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    order.forEach((id, i) => { const q = byId[id], col = i < 7 ? 0 : 1, row = i % 7, x0 = 78 + col * 480, y0 = 1062 + row * 29; c.font = '700 21px ' + MX.MONO; c.fillStyle = T.ink; c.fillText(String(i + 1).padStart(2, '0'), x0, y0); c.font = '400 21px ' + MX.MONO; c.fillText(short[id], x0 + 40, y0); c.fillStyle = q.hConf === 'estimado' ? T.ember : T.mute; c.fillText(id === 'ic1' ? '~1.0 high' : fmt(q.w) + 'x' + fmt(q.d) + 'x' + fmt(q.h), x0 + 252, y0); });
    c.restore();
  }

  function drawInfo(st, list) {
    const it = list.find((q) => q.p.id === st.focus); if (!it) return; const p = it.p, o = it.o;
    const a = st.focusA, anchor = MX.P(p.x + p.w / 2 + o.dx, wyOf(p.y, p.d) + p.d / 2 + o.dy, o.dz + p.h);
    const lines = [NAME[p.id], dimText(p), NOTE[p.id], HSRC[p.hConf]];
    const lw = 560, x = clamp(anchor[0] - lw / 2, 64, W - 64 - lw), y = anchor[1] < 700 && anchor[1] > 380 ? 270 : 1120;
    MX.callout([p.x + p.w / 2 + o.dx, wyOf(p.y, p.d) + p.d / 2 + o.dy, o.dz + p.h], [x + 14, y], lines, { alpha: a, size: 27, color: T.ink });
  }
  function drawOutro(a) {
    const c = MX.ctx; c.save(); c.globalAlpha = a; c.fillStyle = T.paper; c.fillRect(34, 216, W - 68, H - 250);
    MX.A = a; MX.text('Fig 2 - what the model proves', 86, 290, { size: 24, color: T.mute, spacing: 1 });
    MX.text('No guessed numbers.', 86, 380, { size: 52, font: MX.SANS, w: 600 });
    MX.text('Each part carries its source:', 86, 440, { size: 28, color: T.mute, font: MX.SANS });
    const rows = [['85 x 56 mm, holes 58 x 49', 'dimension written on the drawing', T.teal], ['connector and chip outlines', 'measured from the drawing vectors, +/-0.1 mm', T.ink], ['heights Z (header, SoC, ports)', 'labels on the drawing', T.ink], ['PCB thickness, chip heights', 'not in the datasheet: estimated, dashed', T.ember]];
    rows.forEach((r, i) => { MX.text(r[0], 86, 560 + i * 118, { size: 30, color: r[2], w: 600 }); MX.text(r[1], 86, 598 + i * 118, { size: 24, color: T.mute }); });
    MX.text('Raspberry Pi 4 Model B Datasheet, RP-008341-DS, Release 1.1', 86, 1130, { size: 22, color: T.mute });
    MX.text('Built with mechanism', 86, 1210, { size: 34, w: 600, font: MX.SANS });
    MX.A = 1; c.restore();
  }

  /* ------------------------------------------------------------ guion del video */
  const TOUR = [['soc', 9.9], ['usb3', 12.2], ['eth', 14.5], ['gpio', 16.8]], TOUR_LEN = 2.2;
  const fadeIO = (t, a, b, f = 0.25) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
  const dimTimes = [23.9, 24.5, 25.1, 25.7, 26.3];
  function scripted(t) {
    const e = E.io3(ramp(t, 6, 9.4)) * (1 - E.io3(ramp(t, 19.4, 22.2)));
    const u = E.io3(ramp(t, 22.8, 26.2));
    let focus = null, focusA = 0; TOUR.forEach(([id, ts]) => { const f = fadeIO(t, ts, ts + TOUR_LEN); if (f > 0) { focus = id; focusA = f; } });
    return {
      e, u, focus, focusA, outro: ramp(t, 27.4, 28.2), balloon: ramp(t, 26.4, 27.0),
      assemble: (id) => { const u1 = t - SPAWN[id]; if (u1 < 0) return { dz: 30, alpha: 0 }; return { dz: id === 'pcb' ? 18 * (1 - E.out5(ramp(u1, 0, 0.9))) : 28 * (1 - MX.spring(u1, 2.2, 0.5)), alpha: ramp(u1, 0, 0.14) }; },
      dimT: (i) => ramp(t, dimTimes[i], dimTimes[i] + 0.35),
      hint: t < 6 ? 'ASSEMBLING' : t < 22.5 ? (e > 0.5 ? 'EXPLODED VIEW' : '') : 'TOP VIEW  -  mm',
    };
  }
  function cues() {
    const q = [];
    parts.forEach((p, i) => q.push({ t: SPAWN[p.id] + (p.id === 'pcb' ? 0.7 : 0.17), kind: 'drop', f: 330 + i * 41, v: i === 0 ? 1 : 0.7 }));
    q.push({ t: 6.0, kind: 'whoosh', d: 1.1, v: 0.8 }, { t: 9.25, kind: 'clack', v: 0.9 }, { t: 19.4, kind: 'whoosh', d: 1.2, v: 0.8 }, { t: 22.0, kind: 'clunk', v: 0.7 }, { t: 22.8, kind: 'whoosh', d: 1.4, v: 0.7 });
    TOUR.forEach(([id, ts], i) => q.push({ t: ts, kind: 'ping', f: 520 + i * 110, v: 0.9 }));
    dimTimes.forEach((ts, i) => q.push({ t: ts + 0.1, kind: 'ping', f: 900 + i * 60, v: 0.55 }));
    q.push({ t: 27.4, kind: 'pad', d: 3, v: 1 });
    return q;
  }

  /* ------------------------------------------------------------ modo ?explore: se maneja con el mouse o el dedo */
  function explore() {
    const cv = document.getElementById('c'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d'); MX.ctx = ctx;
    const S = { e: 0, eT: 0, u: 0, uT: 0, sel: null, hov: null, t0: performance.now(), drag: false };
    const SL = { x0: 250, x1: 640, y: 1205 }, BT = { x: 740, y: 1178, w: 260, h: 54 };
    const pos = (ev) => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * W, (ev.clientY - r.top) / r.height * H]; };
    const inPoly = (pt, poly) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
    const pick = (pt) => { for (let i = HITS.length - 1; i >= 0; i--) if (inPoly(pt, HITS[i].poly)) return HITS[i].id; return null; };
    cv.addEventListener('pointerdown', (ev) => { const p = pos(ev); if (Math.abs(p[1] - SL.y) < 30 && p[0] > SL.x0 - 20 && p[0] < SL.x1 + 20) { S.drag = true; S.eT = clamp((p[0] - SL.x0) / (SL.x1 - SL.x0), 0, 1); cv.setPointerCapture(ev.pointerId); } else if (p[0] > BT.x && p[0] < BT.x + BT.w && p[1] > BT.y && p[1] < BT.y + BT.h) { S.uT = S.uT ? 0 : 1; if (S.uT) S.eT = 0; } else S.sel = pick(p) === S.sel ? null : pick(p); });
    cv.addEventListener('pointermove', (ev) => { const p = pos(ev); if (S.drag) S.eT = clamp((p[0] - SL.x0) / (SL.x1 - SL.x0), 0, 1); else S.hov = pick(p); });
    cv.addEventListener('pointerup', () => { S.drag = false; });
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const k = 1 - Math.exp(-dt * 7), t = (now - S.t0) / 1000;
      S.e += (S.eT - S.e) * k; S.u += (S.uT - S.u) * k;
      const focus = S.sel || S.hov;
      const asm = (id) => { const u1 = t - SPAWN[id]; if (u1 < 0) return { dz: 30, alpha: 0 }; return { dz: id === 'pcb' ? 18 * (1 - E.out5(ramp(u1, 0, 0.9))) : 28 * (1 - MX.spring(u1, 2.2, 0.5)), alpha: ramp(u1, 0, 0.14) }; };
      render({ e: E.sm(S.e), u: E.sm(S.u), focus, focusA: focus ? 1 : 0, outro: 0, assemble: asm, hint: 'TAP A PART  -  DRAG THE SLIDER', readout: S.u > 0.5 ? 'TOP VIEW' : 'EXPLODE ' + Math.round(S.e * 100) + '%',
        ui: (c) => {
          MX.text('EXPLODE', 78, SL.y + 8, { size: 22, color: T.mute, spacing: 1.5 });
          c.save(); c.strokeStyle = 'rgba(42,41,37,0.4)'; c.lineWidth = 3; c.beginPath(); c.moveTo(SL.x0, SL.y); c.lineTo(SL.x1, SL.y); c.stroke(); c.strokeStyle = T.ember; c.beginPath(); c.moveTo(SL.x0, SL.y); c.lineTo(SL.x0 + (SL.x1 - SL.x0) * S.eT, SL.y); c.stroke();
          c.beginPath(); c.arc(SL.x0 + (SL.x1 - SL.x0) * S.eT, SL.y, 13, 0, 6.2832); c.fillStyle = T.paper; c.fill(); c.stroke();
          c.strokeStyle = T.ink; c.lineWidth = 1.6; c.strokeRect(BT.x, BT.y, BT.w, BT.h); c.restore(); MX.text(S.uT ? 'ISO VIEW' : 'TOP VIEW / PLAN', BT.x + BT.w / 2, BT.y + 34, { size: 22, align: 'center', w: 600, spacing: 1 });
        } });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  if (new URLSearchParams(location.search).has('explore')) explore();
  else MX.run({ w: W, h: H, fps: FPS, duration: DUR, poster: 12, draw: (ctx, t) => render(scripted(t)), audio: () => MX.audio.render({ duration: DUR, cues: cues(), reverb: 0.2 }) });
})();
