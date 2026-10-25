/*
 * scene3d.js - Fig 2: Raspberry Pi 4 Model B in real 3D (three.js). Sizes ONLY from model.js (datasheet RP-008341-DS, Fig. 1); pinout from Fig. 3.
 * Scripted film (assembly, explosion, tour, dimensioned plan, elevations, pinout) and ?explore mode (orbit, explode, measure).
 */
(function () {
  'use strict';
  const M = MODEL, TH = THREE, G = MX.gl, T = MX.THEME, E = MX.E, clamp = MX.clamp, lerp = MX.lerp, ramp = MX.ramp;
  const W = 1080, H = 1350, FPS = 30, DUR = 35.5, BW = M.board.w, BD = M.board.d, PT = M.board.thick;
  const st = G.stage({ w: W, h: H, shadow: 0.16, floorY: -7, bloom: 0.03, envIntensity: 0.45 });
  MX.P = (x, y, z) => st.project(x, y, z);

  /* ------------------------------------------------------------ presentation data */
  const NAME = { pcb: 'PCB', gpio: 'GPIO header 2x20', soc: 'SoC BCM2711', ram: 'LPDDR4 RAM', wifi: 'Wi-Fi / BT module', dsi: 'DSI display port', csi: 'CSI camera port', usbc: 'USB-C power', hdmi0: 'micro-HDMI 0', hdmi1: 'micro-HDMI 1', audio: '3.5 mm jack', eth: 'Gigabit Ethernet', usb3: 'USB 3.0 x2', usb2: 'USB 2.0 x2', ic1: 'IC', ic2: 'IC', ic3: 'IC', ic4: 'IC' };
  const NOTE = { pcb: '4 mounting holes, 58 x 49 mm', gpio: '40 pins, 2.54 mm pitch', soc: '4x Cortex-A72 at 1.5 GHz', ram: '1, 2, 4 or 8 GB', wifi: '802.11ac, Bluetooth 5.0', dsi: '2-lane MIPI', csi: '2-lane MIPI', usbc: 'power input, 5 V', hdmi0: 'up to 4Kp60', hdmi1: 'up to 4Kp60', audio: 'audio + composite video', eth: 'overhangs the edge 2.95 mm', usb3: 'next to the Ethernet', usb2: 'the pair nearest the corner', ic1: 'not named in the datasheet', ic2: 'not named in the datasheet', ic3: 'not named in the datasheet', ic4: 'not named in the datasheet' };
  const HSRC = { 'z-plano': 'height: drawing label', estimado: 'height: estimated' };
  const parts = [{ id: 'pcb', x: 0, y: 0, w: BW, d: BD, h: PT, hConf: 'estimado', conf: 'cota', color: '#3a9455' }].concat(M.parts);
  const byId = Object.fromEntries(parts.map((p) => [p.id, p]));
  const fmt = (v) => (Math.round(v * 100) / 100).toFixed(v % 1 === 0 ? 1 : v * 10 % 1 === 0 ? 1 : 2);
  const dimText = (p) => fmt(p.w) + ' x ' + fmt(p.d) + ' x ' + fmt(p.h) + ' mm';
  const OFF = { gpio: [0, 0, 26], soc: [0, 0, 17], ram: [0, 0, 17], wifi: [0, 0, 17], ic1: [0, 0, 10], ic2: [0, 0, 10], ic3: [0, 0, 10], ic4: [0, 0, 10], dsi: [-15, 0, 7], csi: [0, 0, 11], usbc: [0, -15, 7], hdmi0: [0, -15, 7], hdmi1: [0, -15, 7], audio: [0, -15, 7], eth: [14, 0, 7], usb3: [14, 0, 7], usb2: [14, 0, 7], pcb: [0, 0, 0] };
  const SPAWN = {}; parts.forEach((p, i) => { SPAWN[p.id] = i === 0 ? 0.2 : 0.7 + (i - 1) * 0.16; });
  const center = (id, e) => { const p = byId[id], o = OFF[id]; return [p.x + p.w / 2 + o[0] * e, p.y + p.d / 2 + o[1] * e, (id === 'pcb' ? 0 : p.h / 2) + o[2] * e]; };
  // pinout of connector J8 (datasheet Fig. 3): pin -> name
  const PIN = { 1: '3V3', 2: '5V', 3: 'GPIO2', 4: '5V', 5: 'GPIO3', 6: 'GND', 7: 'GPIO4', 8: 'GPIO14', 9: 'GND', 10: 'GPIO15', 11: 'GPIO17', 12: 'GPIO18', 13: 'GPIO27', 14: 'GND', 15: 'GPIO22', 16: 'GPIO23', 17: '3V3', 18: 'GPIO24', 19: 'GPIO10', 20: 'GND', 21: 'GPIO9', 22: 'GPIO25', 23: 'GPIO11', 24: 'GPIO8', 25: 'GND', 26: 'GPIO7', 27: 'ID_SD', 28: 'ID_SC', 29: 'GPIO5', 30: 'GND', 31: 'GPIO6', 32: 'GPIO12', 33: 'GPIO13', 34: 'GND', 35: 'GPIO19', 36: 'GPIO16', 37: 'GPIO26', 38: 'GPIO20', 39: 'GND', 40: 'GPIO21' };
  const pinKind = (n) => { const s = PIN[n]; return s === '3V3' ? '3v3' : s === '5V' ? '5v' : s === 'GND' ? 'gnd' : s[0] === 'I' ? 'id' : 'gpio'; };
  const PINCOL = { '3v3': '#e8590c', '5v': '#d62f2f', gnd: '#2a2925', gpio: '#0a7c8c', id: '#8a877c' };

  /* ------------------------------------------------------------ board texture (green mask, traces, footprints, silkscreen) */
  function pcbTexture() {
    const S = 32;
    return G.canvasTex(BW * S, BD * S, (c, w, h) => {
      const R = MX.rng(11), px = (x) => x * S, py = (y) => (BD - y) * S;
      c.fillStyle = '#2f8049'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) { const x = R() * w, y = R() * h, r = 80 + R() * 260, gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.03)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
      const ctr = (id) => { const p = byId[id]; return [p.x + p.w / 2, p.y + p.d / 2]; };
      // trace buses between parts (L-shaped routing)
      const bus = (a, b, n, gap) => {
        const A = ctr(a), B = ctr(b);
        for (let k = 0; k < n; k++) {
          const o = (k - n / 2) * gap, mx = lerp(A[0], B[0], 0.55) + o, pts = [[A[0], A[1] + o], [mx, A[1] + o], [mx, B[1] + o], [B[0], B[1] + o]];
          [[0.9, '#256b3b', 0.22], [0, '#55b574', 0.15]].forEach(([sh, col, wd]) => { c.strokeStyle = col; c.lineWidth = wd * S; c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(px(q[0]) + sh, py(q[1]) + sh) : c.moveTo(px(q[0]) + sh, py(q[1]) + sh))); c.stroke(); });
        }
      };
      bus('soc', 'ram', 16, 0.42); bus('soc', 'gpio', 14, 0.4); bus('soc', 'wifi', 8, 0.4); bus('soc', 'usb3', 10, 0.4); bus('soc', 'eth', 8, 0.4); bus('soc', 'ic1', 10, 0.4); bus('soc', 'csi', 8, 0.4); bus('soc', 'dsi', 8, 0.4); bus('ic1', 'usb2', 8, 0.4); bus('ic2', 'eth', 6, 0.4); bus('soc', 'hdmi0', 6, 0.4); bus('soc', 'hdmi1', 6, 0.4); bus('soc', 'usbc', 6, 0.4); bus('ic3', 'gpio', 6, 0.4);
      // footprints: silkscreen outline and gold pads per part
      parts.slice(1).forEach((p) => {
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.14 * S; c.strokeRect(px(p.x) - 0.3 * S, py(p.y + p.d) - 0.3 * S, p.w * S + 0.6 * S, p.d * S + 0.6 * S);
        c.fillStyle = '#d9b54d';
        const pad = (x, y, w2, d2) => c.fillRect(px(x), py(y + d2), w2 * S, d2 * S);
        if (p.id === 'gpio') { for (let i = 0; i < 20; i++) for (let j = 0; j < 2; j++) { const x = p.x + 1.27 + i * 2.54, y = p.y + p.d / 2 + (j ? 1.27 : -1.27); c.beginPath(); c.arc(px(x), py(y), 0.6 * S, 0, 6.2832); c.fill(); } }
        else if (p.id.startsWith('ic') || p.id === 'ram' || p.id === 'soc' || p.id === 'wifi') { const step = 0.8; for (let x = p.x + 0.4; x < p.x + p.w - 0.3; x += step) { pad(x, p.y - 0.28, 0.3, 0.5); pad(x, p.y + p.d - 0.22, 0.3, 0.5); } for (let y = p.y + 0.4; y < p.y + p.d - 0.3; y += step) { pad(p.x - 0.28, y, 0.5, 0.3); pad(p.x + p.w - 0.22, y, 0.5, 0.3); } }
        else { for (let k = 0; k < 5; k++) { pad(p.x + 0.6 + k * (p.w - 1.6) / 4, p.y + 0.2, 0.6, 1.0); pad(p.x + 0.6 + k * (p.w - 1.6) / 4, p.y + p.d - 1.2, 0.6, 1.0); } }
      });
      // vias
      for (let i = 0; i < 260; i++) { const x = 2 + R() * 81, y = 2 + R() * 52; c.fillStyle = '#d9b54d'; c.beginPath(); c.arc(px(x), py(y), 0.22 * S, 0, 6.2832); c.fill(); c.fillStyle = '#1e5d33'; c.beginPath(); c.arc(px(x), py(y), 0.08 * S, 0, 6.2832); c.fill(); }
      // copper rings of the mounting holes (diameter measured on the drawing: 6.2 mm)
      const hs = M.holes; c.fillStyle = '#e1c05a';
      [[hs.inset, hs.inset], [hs.inset + hs.pitchX, hs.inset], [hs.inset, hs.inset + hs.pitchY], [hs.inset + hs.pitchX, hs.inset + hs.pitchY]].forEach(([x, y]) => { c.beginPath(); c.arc(px(x), py(y), hs.padDia / 2 * S, 0, 6.2832); c.fill(); });
      // serigrafia
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = '700 ' + 2.6 * S + 'px ' + MX.MONO; c.fillText('Raspberry Pi 4 Model B', px(14), py(15.2));
      c.font = '400 ' + 1.5 * S + 'px ' + MX.MONO; c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillText('datasheet RP-008341-DS', px(14), py(11.8));
      c.font = '700 ' + 1.2 * S + 'px ' + MX.MONO; c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillText('J8', px(6.6), py(47.4));
    });
  }

  /* ------------------------------------------------------------ materials and parts */
  const metal = (c = '#d6d6d2') => G.mat(c, { metalness: 0.95, roughness: 0.32 });
  const plastic = (c, r = 0.55) => G.mat(c, { roughness: r });
  function stadium(c, w, h, r) { c.beginPath(); c.moveTo(r, 0); c.lineTo(w - r, 0); c.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2); c.lineTo(r, h); c.arc(r, r, r, Math.PI / 2, 1.5 * Math.PI); c.closePath(); }
  const portTex = (w, h, fn) => G.flatMat(G.canvasTex(Math.round(w * 40), Math.round(h * 40), (c, cw, ch) => fn(c, cw, ch)));
  const textTex = (w, h, text, color, size) => G.flatMat(G.canvasTex(Math.round(w * 40), Math.round(h * 40), (c, cw, ch) => { c.fillStyle = color; c.font = '700 ' + size * 40 + 'px ' + MX.MONO; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, cw / 2, ch / 2); }));
  let pinMesh = null;

  function buildPart(p) {
    const g = new TH.Group(); g.userData.id = p.id; const w = p.w, d = p.d, h = p.h;
    const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new TH.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
    if (p.id === 'pcb') {
      const hs = M.holes, r = M.board.radius, s = new TH.Shape();
      s.moveTo(r, 0); s.lineTo(BW - r, 0); s.quadraticCurveTo(BW, 0, BW, r); s.lineTo(BW, BD - r); s.quadraticCurveTo(BW, BD, BW - r, BD); s.lineTo(r, BD); s.quadraticCurveTo(0, BD, 0, BD - r); s.lineTo(0, r); s.quadraticCurveTo(0, 0, r, 0);
      [[hs.inset, hs.inset], [hs.inset + hs.pitchX, hs.inset], [hs.inset, hs.inset + hs.pitchY], [hs.inset + hs.pitchX, hs.inset + hs.pitchY]].forEach(([x, y]) => { const hole = new TH.Path(); hole.absarc(x, y, hs.dia / 2, 0, Math.PI * 2, true); s.holes.push(hole); });
      const geo = new TH.ExtrudeGeometry(s, { depth: PT, bevelEnabled: false, curveSegments: 10 }); geo.rotateX(-Math.PI / 2);
      const tex = pcbTexture(); tex.repeat.set(1 / BW, 1 / BD); tex.wrapS = tex.wrapT = TH.ClampToEdgeWrapping;
      const top = G.mat('#ffffff', { map: tex, roughness: 0.42, metalness: 0.05 }), side = G.mat('#27693d', { roughness: 0.7 });
      const m = add(geo, [top, side]); m.position.set(0, -PT, 0); return g;
    }
    const hh = p.id === 'gpio' ? 2.5 : h;
    if (p.id === 'gpio') {
      add(G.rbox(w, d, hh, 0.2), plastic('#1d1c1a', 0.5), 0, 0, 0);
      pinMesh = new TH.InstancedMesh(new TH.BoxGeometry(0.64, h - hh, 0.64), G.mat('#ffffff', { metalness: 1, roughness: 0.28 }), 40); pinMesh.castShadow = true; pinMesh.receiveShadow = true;
      const mx = new TH.Matrix4();
      for (let i = 0; i < 20; i++) for (let j = 0; j < 2; j++) { const n = j ? 2 * i + 2 : 2 * i + 1; mx.setPosition(-w / 2 + 1.27 + i * 2.54, hh + (h - hh) / 2, j ? -1.27 : 1.27); pinMesh.setMatrixAt(n - 1, mx); pinMesh.setColorAt(n - 1, new TH.Color('#d9b54d')); }
      g.add(pinMesh); return g;
    }
    const bodyMat = { soc: metal('#c4c3bd'), ram: plastic('#1b1b1b', 0.42), wifi: G.mat('#c3c3bf', { metalness: 0.8, roughness: 0.42 }), dsi: plastic('#ebe8de'), csi: plastic('#ebe8de'), usbc: metal(), hdmi0: metal(), hdmi1: metal(), audio: plastic('#262626'), eth: metal('#cfcfcb'), usb3: metal(), usb2: metal() }[p.id] || plastic('#1e1e1e', 0.4);
    add(G.rbox(w, d, h, p.id.startsWith('ic') ? 0.15 : 0.3), bodyMat);
    const top = (mat, ww, dd, y = h + 0.02) => g.add(G.decal('top', ww, dd, mat, [0, y, 0])), face = (f, mat, ww, hh2, pos) => g.add(G.decal(f, ww, hh2, mat, pos));
    if (p.id === 'soc') top(textTex(11, 4, 'BCM2711', 'rgba(60,58,52,0.75)', 1.9), 11, 4);
    else if (p.id === 'ram') top(textTex(9, 3, 'LPDDR4', 'rgba(210,210,205,0.6)', 1.7), 9, 3);
    else if (p.id === 'wifi') top(portTex(w - 1, d - 1, (c, cw, ch) => { c.fillStyle = 'rgba(40,40,36,0.5)'; for (let i = 0; i < 9; i++) for (let j = 0; j < 11; j++) { c.beginPath(); c.arc((i + 0.5) / 9 * cw, (j + 0.5) / 11 * ch, 5, 0, 6.2832); c.fill(); } }), w - 1, d - 1);
    else if (p.id === 'dsi' || p.id === 'csi') top(portTex(w - 1.2, d - 2, (c, cw, ch) => { c.fillStyle = '#1b1a18'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#c9a94a'; for (let i = 0; i < 15; i++) c.fillRect(cw * 0.3, ch * (0.06 + i * 0.062), cw * 0.4, 5); }), w - 1.2, d - 2);
    else if (p.id === 'usbc') face('pz', portTex(w * 0.8, h * 0.62, (c, cw, ch) => { c.fillStyle = '#121110'; stadium(c, cw, ch, ch / 2); c.fill(); c.fillStyle = '#6b6a63'; c.fillRect(cw * 0.16, ch * 0.4, cw * 0.68, ch * 0.2); }), w * 0.8, h * 0.62, [0, h / 2, d / 2 + 0.02]);
    else if (p.id === 'hdmi0' || p.id === 'hdmi1') face('pz', portTex(w * 0.86, h * 0.62, (c, cw, ch) => { c.fillStyle = '#121110'; c.beginPath(); c.moveTo(0, 0); c.lineTo(cw, 0); c.lineTo(cw, ch * 0.55); c.lineTo(cw * 0.86, ch); c.lineTo(cw * 0.14, ch); c.lineTo(0, ch * 0.55); c.closePath(); c.fill(); c.fillStyle = '#c9a94a'; for (let i = 0; i < 9; i++) c.fillRect(cw * (0.12 + i * 0.09), ch * 0.22, 4, ch * 0.3); }), w * 0.86, h * 0.62, [0, h / 2, d / 2 + 0.02]);
    else if (p.id === 'audio') face('pz', portTex(4.2, 4.2, (c, cw, ch) => { c.fillStyle = '#0d0d0c'; c.beginPath(); c.arc(cw / 2, ch / 2, cw * 0.48, 0, 6.2832); c.fill(); c.strokeStyle = '#a4a39b'; c.lineWidth = 6; c.beginPath(); c.arc(cw / 2, ch / 2, cw * 0.48, 0, 6.2832); c.stroke(); c.fillStyle = '#3a3a37'; c.beginPath(); c.arc(cw / 2, ch / 2, cw * 0.22, 0, 6.2832); c.fill(); }), 4.2, 4.2, [0, h / 2, d / 2 + 0.02]);
    else if (p.id === 'eth') face('px', portTex(d * 0.82, h * 0.62, (c, cw, ch) => { c.fillStyle = '#111'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#d9b54d'; for (let i = 0; i < 8; i++) c.fillRect(cw * (0.12 + i * 0.105), ch * 0.1, cw * 0.04, ch * 0.34); c.fillStyle = '#222'; c.fillRect(cw * 0.36, ch * 0.86, cw * 0.28, ch * 0.14); }), d * 0.82, h * 0.62, [w / 2 + 0.02, h * 0.42, 0]);
    else if (p.id === 'usb3' || p.id === 'usb2') { const tone = p.id === 'usb3' ? '#2f6fd6' : '#1b1b1b'; [0.27, 0.73].forEach((v) => face('px', portTex(d * 0.78, h * 0.34, (c, cw, ch) => { c.fillStyle = '#0d0d0c'; c.fillRect(0, 0, cw, ch); c.fillStyle = tone; c.fillRect(cw * 0.06, ch * 0.42, cw * 0.88, ch * 0.2); c.fillStyle = '#c9a94a'; for (let i = 0; i < 4; i++) c.fillRect(cw * (0.14 + i * 0.07), ch * 0.7, 4, ch * 0.14); }), d * 0.78, h * 0.34, [w / 2 + 0.02, h * v, 0])); }
    else if (p.id.startsWith('ic')) top(portTex(1, 1, (c, cw, ch) => { c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.arc(cw * 0.22, ch * 0.22, 4, 0, 6.2832); c.fill(); }), 1.5, 1.5, h + 0.02);
    return g;
  }

  const groups = {}, hitMeshes = [];
  parts.forEach((p) => { const g = buildPart(p); G.shadows(g, true, true); g.userData.p = p; groups[p.id] = g; st.scene.add(g); g.traverse((m) => { if (m.isMesh) { m.userData.pid = p.id; hitMeshes.push(m); } }); });
  // highlight outline (ember) per part
  const outlines = {};
  parts.forEach((p) => { if (p.id === 'pcb') return; const l = new TH.LineSegments(new TH.EdgesGeometry(new TH.BoxGeometry(p.w + 0.5, p.h + 0.5, p.d + 0.5)), new TH.LineBasicMaterial({ color: '#e8590c' })); l.position.y = p.h / 2; l.visible = false; groups[p.id].add(l); outlines[p.id] = l; });
  // opacity per part: transparency is switched on only when needed
  const fadeState = {};
  function setFade(id, f) {
    const key = f < 0.995; if (fadeState[id] === key && !key) return;
    const ms = []; groups[id].traverse((m) => { if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach((q) => ms.push(q)); });
    ms.forEach((q) => { if (q.userData.bt == null) { q.userData.bt = q.transparent; q.userData.bo = q.opacity; q.userData.bw = q.depthWrite; } const on = key || q.userData.bt; if (q.transparent !== on) { q.transparent = on; q.needsUpdate = true; } q.opacity = q.userData.bo * f; q.depthWrite = key ? false : q.userData.bw; });
    fadeState[id] = key;
  }
  let pinFlag = -1;
  function setPinColors(a) {                                      // a: 0 dorado, 1 color por funcion (Fig. 3)
    const q = Math.round(a * 20); if (q === pinFlag || !pinMesh) return; pinFlag = q;
    const gold = new TH.Color('#d9b54d'), c = new TH.Color();
    for (let n = 1; n <= 40; n++) { c.set(PINCOL[pinKind(n)]); pinMesh.setColorAt(n - 1, gold.clone().lerp(c, q / 20)); }
    pinMesh.instanceColor.needsUpdate = true;
  }

  /* ------------------------------------------------------------ estado -> escena */
  function applyState(s) {
    parts.forEach((p) => {
      const o = OFF[p.id], e = p.id === 'pcb' ? 0 : s.e, sp = s.assemble(p.id), g = groups[p.id];
      const x = p.x + p.w / 2 + o[0] * e, y = p.y + p.d / 2 + o[1] * e, z = o[2] * e + sp.dz;
      g.position.copy(G.v(x, y, z));
      if (p.id === 'pcb') g.position.copy(G.v(0, 0, sp.dz));
      let f = sp.alpha; if (s.focus && s.focus !== 'pcb' && s.focus !== p.id) f *= lerp(1, 0.16, s.focusA);
      setFade(p.id, f); if (outlines[p.id]) outlines[p.id].visible = s.focus === p.id && s.focusA > 0.2;
      g.visible = s.vis ? s.vis(p.id) : true;
    });
    setPinColors(s.pins || 0);
    st.setView(s.view); st.render();
  }

  /* ------------------------------------------------------------ superposicion 2D: cotas, etiquetas, tablas */
  function arrow(a, b, s) { const c = MX.ctx, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + ux * s - uy * s * 0.35, a[1] + uy * s + ux * s * 0.35); c.lineTo(a[0] + ux * s + uy * s * 0.35, a[1] + uy * s - ux * s * 0.35); c.closePath(); c.fill(); }
  function dim(A, B, off, label, a, col) {
    if (a <= 0.01) return; col = col || T.teal;
    const c = MX.ctx, pa = MX.P(A[0], A[1], A[2]), pb = MX.P(B[0], B[1], B[2]), a1 = [pa[0] + off[0], pa[1] + off[1]], b1 = [pb[0] + off[0], pb[1] + off[1]], L = Math.hypot(off[0], off[1]) || 1;
    c.save(); c.globalAlpha = a; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(pa[0], pa[1]); c.lineTo(a1[0] + off[0] / L * 9, a1[1] + off[1] / L * 9); c.moveTo(pb[0], pb[1]); c.lineTo(b1[0] + off[0] / L * 9, b1[1] + off[1] / L * 9); c.stroke();
    c.beginPath(); c.moveTo(a1[0], a1[1]); c.lineTo(b1[0], b1[1]); c.stroke(); arrow(a1, b1, 13); arrow(b1, a1, 13);
    const mx = (a1[0] + b1[0]) / 2, my = (a1[1] + b1[1]) / 2; c.font = '600 27px ' + MX.MONO; const tw = c.measureText(label).width;
    c.fillStyle = T.paper; c.fillRect(mx - tw / 2 - 7, my - 18, tw + 14, 33); c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, mx, my + 1); c.restore();
  }
  const ORDER = ['gpio', 'soc', 'ram', 'wifi', 'dsi', 'csi', 'usbc', 'hdmi0', 'hdmi1', 'audio', 'eth', 'usb3', 'usb2', 'ic1'];
  const SHORT = { gpio: 'GPIO header', soc: 'SoC BCM2711', ram: 'LPDDR4 RAM', wifi: 'Wi-Fi / BT', dsi: 'DSI port', csi: 'CSI port', usbc: 'USB-C', hdmi0: 'micro-HDMI 0', hdmi1: 'micro-HDMI 1', audio: '3.5 mm jack', eth: 'Ethernet', usb3: 'USB 3.0 x2', usb2: 'USB 2.0 x2', ic1: 'ICs x4' };
  function planOverlay(a, dimT, balloonA) {
    const hs = M.holes;
    dim([0, 0, 0], [BW, 0, 0], [0, 84], '85', a * dimT(0));
    dim([BW, 0, 0], [BW, BD, 0], [72, 0], '56', a * dimT(1));
    dim([hs.inset, hs.inset + hs.pitchY, 0], [hs.inset + hs.pitchX, hs.inset + hs.pitchY, 0], [0, -70], '58', a * dimT(2));
    dim([hs.inset, hs.inset, 0], [hs.inset, hs.inset + hs.pitchY, 0], [-72, 0], '49', a * dimT(3));
    dim([0, 0, 0], [hs.inset, 0, 0], [0, 38], '3.5', a * dimT(4));
    const c = MX.ctx; c.save(); c.globalAlpha = a * balloonA; c.textAlign = 'center'; c.textBaseline = 'middle';
    const bal = (id, n) => { const p = byId[id], big = p.w > 7 && p.d > 7, q = big ? MX.P(p.x + 2.4, p.y + p.d - 2.4, p.h) : MX.P(p.x + p.w / 2, p.y + p.d / 2, p.h); c.beginPath(); c.arc(q[0], q[1], 13, 0, 6.2832); c.fillStyle = T.ink; c.fill(); c.fillStyle = T.paper; c.font = '700 15px ' + MX.MONO; c.fillText(String(n), q[0], q[1] + 1); };
    ORDER.forEach((id, i) => bal(id, i + 1)); ['ic2', 'ic3', 'ic4'].forEach((id) => bal(id, 14));
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    ORDER.forEach((id, i) => { const q = byId[id], col = i < 7 ? 0 : 1, row = i % 7, x0 = 78 + col * 480, y0 = 1062 + row * 29; c.font = '700 21px ' + MX.MONO; c.fillStyle = T.ink; c.fillText(String(i + 1).padStart(2, '0'), x0, y0); c.font = '400 21px ' + MX.MONO; c.fillText(SHORT[id], x0 + 40, y0); c.fillStyle = q.hConf === 'estimado' ? T.ember : T.mute; c.fillText(id === 'ic1' ? '~1.0 high' : fmt(q.w) + 'x' + fmt(q.d) + 'x' + fmt(q.h), x0 + 252, y0); });
    c.restore();
  }
  // height ladder (front elevation): ticks on the ruler and labels spread out with leader lines
  function heightLadder(a) {
    if (a <= 0.01) return; const c = MX.ctx, X = 92, rows = [[16.0, 'USB'], [13.5, 'Ethernet'], [8.5, 'GPIO'], [6.0, 'audio jack'], [5.5, 'DSI / CSI'], [3.2, 'USB-C'], [3.0, 'HDMI'], [2.4, 'SoC']];
    const p0 = MX.P(X, 0, 0), p1 = MX.P(X, 0, 16);
    c.save(); c.globalAlpha = a; c.strokeStyle = T.teal; c.lineWidth = 1.8; c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
    const lab = rows.map(([z, n]) => ({ z, n, y: MX.P(X, 0, z)[1] })); let prev = null;
    lab.forEach((l) => { l.ly = prev == null ? l.y : Math.max(l.y, prev + 34); prev = l.ly; });
    c.font = '600 22px ' + MX.MONO; c.textBaseline = 'middle';
    lab.forEach((l) => { const x = p0[0]; c.beginPath(); c.moveTo(x - 8, l.y); c.lineTo(x + 8, l.y); c.lineTo(x + 36, l.ly); c.lineTo(x + 46, l.ly); c.stroke(); c.textAlign = 'left'; c.fillStyle = T.ink; c.fillText(fmt(l.z) + '  ' + l.n, x + 52, l.ly); });
    c.restore();
  }
  function pinoutPanel(a) {
    if (a <= 0.01) return; const c = MX.ctx; c.save(); c.globalAlpha = a; c.fillStyle = T.paper; c.fillRect(34, 216, W - 68, H - 250);
    MX.A = a; MX.text('Fig 2 - J8 header, datasheet Fig. 3', 86, 290, { size: 24, color: T.mute, spacing: 1 }); MX.text('40 pins, 28 usable GPIO.', 86, 360, { size: 46, font: MX.SANS, w: 600 });
    // drawn header: outer row = even pins (as on the board), inner row = odd
    const x0 = 106, dx = 43.5, y0 = 430; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 20; i++) for (let j = 0; j < 2; j++) { const n = j ? 2 * i + 2 : 2 * i + 1, x = x0 + i * dx, y = y0 + (j ? 0 : 50); c.fillStyle = PINCOL[pinKind(n)]; c.fillRect(x - 15, y - 15, 30, 30); c.fillStyle = '#fff'; c.font = '700 14px ' + MX.MONO; c.fillText(String(n), x, y + 1); }
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const L = [['3V3', '3v3'], ['5V', '5v'], ['GND', 'gnd'], ['GPIO', 'gpio'], ['ID EEPROM (HAT)', 'id']]; let lx = 86; L.forEach(([n, k]) => { c.fillStyle = PINCOL[k]; c.fillRect(lx, 552, 20, 20); c.fillStyle = T.ink; c.font = '400 22px ' + MX.MONO; c.fillText(n, lx + 30, 570); lx += 40 + n.length * 14 + 28; });
    c.font = '700 21px ' + MX.MONO; c.fillStyle = T.mute; c.fillText('ODD (inner row)', 86, 640); c.fillText('EVEN (outer row)', 580, 640);
    for (let i = 0; i < 20; i++) { const y = 676 + i * 29; [[2 * i + 1, 86], [2 * i + 2, 580]].forEach(([n, x]) => { c.fillStyle = PINCOL[pinKind(n)]; c.fillRect(x, y - 17, 16, 16); c.fillStyle = T.ink; c.font = '700 21px ' + MX.MONO; c.fillText(String(n).padStart(2, '0'), x + 28, y); c.font = '400 21px ' + MX.MONO; c.fillText(PIN[n], x + 78, y); }); }
    MX.A = 1; c.restore();
  }
  function infoBox(s) {
    const p = byId[s.focus]; if (!p || s.focusA < 0.02) return; const lines = [NAME[p.id], dimText(p), NOTE[p.id], HSRC[p.hConf]];
    const o = OFF[p.id], e = p.id === 'pcb' ? 0 : s.e, c3 = [p.x + p.w / 2 + o[0] * e, p.y + p.d / 2 + o[1] * e, (p.id === 'pcb' ? 0 : p.h) + o[2] * e];
    MX.callout(c3, s.infoAt || [90, 1070], lines, { alpha: s.focusA, size: 27, color: T.ink });
  }
  function outro(a) {
    if (a <= 0.01) return; const c = MX.ctx; c.save(); c.globalAlpha = a; c.fillStyle = T.paper; c.fillRect(34, 216, W - 68, H - 250);
    MX.A = a; MX.text('Fig 2 - what the model proves', 86, 290, { size: 24, color: T.mute, spacing: 1 }); MX.text('No guessed numbers.', 86, 380, { size: 52, font: MX.SANS, w: 600 }); MX.text('Each part carries its source:', 86, 440, { size: 28, color: T.mute, font: MX.SANS });
    [['85 x 56 mm, holes 58 x 49', 'dimension written on the drawing', T.teal], ['connector and chip outlines', 'measured from the drawing vectors, +/-0.1 mm', T.ink], ['heights Z (header, SoC, ports)', 'labels on the drawing', T.ink], ['GPIO pin names', 'datasheet Fig. 3', T.ink], ['PCB thickness, chip heights', 'not in the datasheet: estimated', T.ember]].forEach((r, i) => { MX.text(r[0], 86, 550 + i * 104, { size: 30, color: r[2], w: 600 }); MX.text(r[1], 86, 586 + i * 104, { size: 24, color: T.mute }); });
    MX.text('Raspberry Pi 4 Model B Datasheet, RP-008341-DS, Release 1.1', 86, 1130, { size: 22, color: T.mute }); MX.text('Built with mechanism', 86, 1210, { size: 34, w: 600, font: MX.SANS }); MX.A = 1; c.restore();
  }

  /* ------------------------------------------------------------ frame */
  function frame(ctx, s) {
    applyState(s);
    MX.card(W, H, { fig: 'Fig 2', kicker: 'DATASHEET RP-008341-DS', title: 'Raspberry Pi 4 Model B', sub: s.sub || 'Every size traced to the official datasheet drawing.', hint: s.hint || '', readout: s.readout || '85 x 56 mm  -  17 parts' });
    st.blit(ctx);
    if (s.plan > 0.01) planOverlay(s.plan, s.dimT || (() => 1), s.balloon == null ? 1 : s.balloon);
    heightLadder(s.ladder || 0);
    if (s.sideDims) { dim([0, 0, 0], [0, BD, 0], [0, 90], '56', s.sideDims); dim([BW + 4, 0, 0], [BW + 4, 0, 16], [-70, 0], '16.0', s.sideDims, T.ember); }
    infoBox(s); pinoutPanel(s.pinout || 0); outro(s.outro || 0);
    if (s.ui) s.ui(ctx);
  }

  /* ------------------------------------------------------------ film script: keyed camera */
  const BASE = { yaw: 40, pitch: 33, zoom: 8.4, tx: 42.5, ty: 28, tz: 2, cx: 540, cy: 700 };
  const shot = (id, yaw, pitch, zoom, e = 1) => { const c = center(id, e); return { yaw, pitch, zoom, tx: c[0], ty: c[1], tz: c[2], cx: 540, cy: 620 }; };
  const TOUR = [['soc', 9.6, 40, 44, 24], ['usb3', 11.7, 62, 22, 16], ['eth', 13.8, 68, 20, 15], ['gpio', 15.9, 28, 40, 11]], TL = 2.1;
  const KEYS = [
    [0, Object.assign({}, BASE, { yaw: 68, zoom: 8.0 })], [5.6, Object.assign({}, BASE, { yaw: 44 })], [9.0, Object.assign({}, BASE, { yaw: 38, pitch: 34, zoom: 7.0, tz: 8, cy: 690 })],
    ...TOUR.flatMap(([id, ts, yaw, pitch, zoom]) => [[ts - 0.05, shot(id, yaw, pitch, zoom)], [ts + TL - 0.2, shot(id, yaw + 6, pitch, zoom * 1.04)]]),
    [18.4, Object.assign({}, BASE, { yaw: 38, pitch: 34, zoom: 7.0, tz: 8, cy: 690 })], [20.8, Object.assign({}, BASE, { yaw: 40 })],
    [23.8, { yaw: 0, pitch: 90, zoom: 9.5, tx: 42.5, ty: 28, tz: 0, cx: 540, cy: 640 }], [25.2, { yaw: 0, pitch: 90, zoom: 9.5, tx: 42.5, ty: 28, tz: 0, cx: 540, cy: 640 }],
    [26.4, { yaw: 0, pitch: 0, zoom: 8.0, tx: 42.5, ty: 28, tz: 7, cx: 400, cy: 660 }], [27.7, { yaw: 0, pitch: 0, zoom: 8.0, tx: 42.5, ty: 28, tz: 7, cx: 400, cy: 660 }],
    [28.7, { yaw: 90, pitch: 0, zoom: 11, tx: 42.5, ty: 28, tz: 7, cx: 540, cy: 700 }], [30.0, { yaw: 90, pitch: 0, zoom: 11, tx: 42.5, ty: 28, tz: 7, cx: 540, cy: 700 }],
    [32.0, Object.assign({}, BASE, { yaw: 52 })], [DUR, Object.assign({}, BASE, { yaw: 58 })],
  ];
  function camAt(t) {
    let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
    const [t0, a] = KEYS[i], [t1, b] = KEYS[i + 1], u = E.io3(clamp((t - t0) / (t1 - t0), 0, 1)), L = (k) => lerp(a[k], b[k], u);
    return { yaw: L('yaw'), pitch: L('pitch'), zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), u)), tx: L('tx'), ty: L('ty'), tz: L('tz'), cx: L('cx'), cy: L('cy') };
  }
  const fadeIO = (t, a, b, f = 0.25) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
  const dimTimes = [21.7, 22.3, 22.9, 23.5, 24.1];
  const assembleFn = (t) => (id) => { const u1 = t - SPAWN[id]; if (u1 < 0) return { dz: 30, alpha: 0 }; return { dz: id === 'pcb' ? 18 * (1 - E.out5(ramp(u1, 0, 0.9))) : 28 * (1 - MX.spring(u1, 2.2, 0.5)), alpha: ramp(u1, 0, 0.14) }; };
  function scripted(t) {
    const e = E.io3(ramp(t, 5.6, 9.0)) * (1 - E.io3(ramp(t, 18.4, 20.8)));
    let focus = null, focusA = 0; TOUR.forEach(([id, ts]) => { const f = fadeIO(t, ts, ts + TL); if (f > 0) { focus = id; focusA = f; } });
    const planA = ramp(t, 22.8, 23.6) * (1 - ramp(t, 25.4, 26.0));
    return {
      e, focus, focusA, view: camAt(t), assemble: assembleFn(t), pins: focus === 'gpio' ? focusA : 0, plan: planA, dimT: (i) => ramp(t, dimTimes[i], dimTimes[i] + 0.35), balloon: ramp(t, 24.2, 24.8),
      ladder: ramp(t, 26.5, 27.0) * (1 - ramp(t, 28.0, 28.5)), sideDims: ramp(t, 28.8, 29.3) * (1 - ramp(t, 30.0, 30.4)), pinout: ramp(t, 30.4, 31.0) * (1 - ramp(t, 32.4, 33.0)), outro: ramp(t, 32.9, 33.7),
      sub: t > 20.8 && t < 26.2 ? 'Top view, dimensions in mm, taken from the datasheet drawing.' : t > 26.2 && t < 30.4 ? 'Elevations: heights above the board, from the drawing labels.' : undefined,
      hint: t < 5.6 ? 'ASSEMBLING' : t < 20.8 ? (e > 0.5 ? 'EXPLODED VIEW' : '') : t < 26.2 ? 'TOP VIEW  -  mm' : t < 28.5 ? 'FRONT ELEVATION' : t < 30.4 ? 'SIDE ELEVATION' : '',
    };
  }
  function cues() {
    const q = [];
    parts.forEach((p, i) => q.push({ t: SPAWN[p.id] + (p.id === 'pcb' ? 0.7 : 0.17), kind: 'drop', f: 330 + i * 41, v: i === 0 ? 1 : 0.7 }));
    q.push({ t: 5.6, kind: 'whoosh', d: 1.1, v: 0.8 }, { t: 8.85, kind: 'clack', v: 0.9 }, { t: 18.4, kind: 'whoosh', d: 1.2, v: 0.8 }, { t: 20.6, kind: 'clunk', v: 0.7 }, { t: 20.8, kind: 'whoosh', d: 1.5, v: 0.7 }, { t: 26.2, kind: 'whoosh', d: 0.7, v: 0.6 }, { t: 28.2, kind: 'whoosh', d: 0.9, v: 0.6 });
    TOUR.forEach(([id, ts], i) => q.push({ t: ts, kind: 'ping', f: 520 + i * 110, v: 0.9 }));
    dimTimes.forEach((ts, i) => q.push({ t: ts + 0.1, kind: 'ping', f: 900 + i * 60, v: 0.55 }));
    for (let k = 0; k < 8; k++) q.push({ t: 26.6 + k * 0.1, kind: 'beep', f: 700 + k * 90, v: 0.5 });
    for (let k = 0; k < 5; k++) q.push({ t: 30.5 + k * 0.5, kind: 'ping', f: 760 + k * 70, v: 0.45 });
    q.push({ t: 33.0, kind: 'pad', d: 3, v: 1 });
    return q;
  }

  /* ------------------------------------------------------------ modo ?explore: orbitar, explosionar, medir */
  function explore() {
    const cv = document.getElementById('c'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d'); MX.ctx = ctx;
    const S = { e: 0, eT: 0, view: Object.assign({}, BASE), goal: null, sel: null, hov: null, t0: performance.now(), drag: null, measure: false, pts: [], vis: { chips: true, ports: true, gpio: true } };
    const PORTS = ['dsi', 'csi', 'usbc', 'hdmi0', 'hdmi1', 'audio', 'eth', 'usb3', 'usb2'], CHIPS = ['soc', 'ram', 'wifi', 'ic1', 'ic2', 'ic3', 'ic4'];
    const SL = { x0: 230, x1: 520, y: 1152 }, VB = [['ISO', { yaw: 40, pitch: 33, zoom: 8.4, tx: 42.5, ty: 28, tz: 2, cy: 700 }], ['TOP', { yaw: 0, pitch: 90, zoom: 9.5, tx: 42.5, ty: 28, tz: 0, cy: 640 }], ['FRONT', { yaw: 0, pitch: 0, zoom: 9, tx: 42.5, ty: 28, tz: 7, cy: 700 }], ['SIDE', { yaw: 90, pitch: 0, zoom: 11, tx: 42.5, ty: 28, tz: 7, cy: 700 }]];
    const btn = (x, y, w, label, on) => ({ x, y, w, h: 44, label, on });
    const btns = () => [...VB.map(([n], i) => btn(560 + i * 110, 1130, 100, n, false)), btn(78, 1196, 130, 'CHIPS', S.vis.chips), btn(218, 1196, 130, 'PORTS', S.vis.ports), btn(358, 1196, 130, 'GPIO', S.vis.gpio), btn(560, 1196, 210, S.measure ? 'MEASURING' : 'MEASURE', S.measure), btn(780, 1196, 210, 'RESET', false)];
    const pos = (ev) => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * W, (ev.clientY - r.top) / r.height * H]; };
    const rc = new TH.Raycaster();
    const visible = (m) => { let o = m; while (o) { if (o.visible === false) return false; o = o.parent; } return true; };
    const pick = (p) => { rc.setFromCamera(new TH.Vector2(p[0] / W * 2 - 1, -(p[1] / H) * 2 + 1), st.camera); const hit = rc.intersectObjects(hitMeshes.filter(visible), false)[0]; return hit ? { id: hit.object.userData.pid, pt: [hit.point.x, -hit.point.z, hit.point.y] } : null; };
    const hitBtn = (p) => btns().find((b) => p[0] > b.x && p[0] < b.x + b.w && p[1] > b.y && p[1] < b.y + b.h);
    cv.addEventListener('pointerdown', (ev) => {
      const p = pos(ev); cv.setPointerCapture(ev.pointerId); const b = hitBtn(p);
      if (Math.abs(p[1] - SL.y) < 30 && p[0] > SL.x0 - 20 && p[0] < SL.x1 + 20) { S.drag = { slider: true }; S.eT = clamp((p[0] - SL.x0) / (SL.x1 - SL.x0), 0, 1); return; }
      if (b) { const vi = VB.findIndex(([n]) => n === b.label); if (vi >= 0) S.goal = Object.assign({ cx: 540 }, VB[vi][1]); else if (b.label === 'CHIPS') S.vis.chips = !S.vis.chips; else if (b.label === 'PORTS') S.vis.ports = !S.vis.ports; else if (b.label === 'GPIO') S.vis.gpio = !S.vis.gpio; else if (b.label.startsWith('MEAS')) { S.measure = !S.measure; S.pts = []; } else if (b.label === 'RESET') { S.eT = 0; S.sel = null; S.pts = []; S.goal = Object.assign({ cx: 540 }, VB[0][1]); } return; }
      S.drag = { x: p[0], y: p[1], moved: 0 };
    });
    cv.addEventListener('pointermove', (ev) => {
      const p = pos(ev);
      if (S.drag && S.drag.slider) { S.eT = clamp((p[0] - SL.x0) / (SL.x1 - SL.x0), 0, 1); return; }
      if (S.drag) { const dx = p[0] - S.drag.x, dy = p[1] - S.drag.y; S.drag.x = p[0]; S.drag.y = p[1]; S.drag.moved += Math.abs(dx) + Math.abs(dy); S.view.yaw -= dx * 0.35; S.view.pitch = clamp(S.view.pitch + dy * 0.3, 0, 90); S.goal = null; return; }
      const h = pick(p); S.hov = h ? h.id : null;
    });
    cv.addEventListener('pointerup', (ev) => { const d = S.drag; S.drag = null; if (d && !d.slider && d.moved < 6) { const h = pick(pos(ev)); if (S.measure) { if (h) { S.pts.push(h.pt); if (S.pts.length > 2) S.pts = [h.pt]; } } else S.sel = h && h.id !== S.sel ? h.id : null; } });
    cv.addEventListener('wheel', (ev) => { ev.preventDefault(); S.view.zoom = clamp(S.view.zoom * Math.exp(-ev.deltaY * 0.0012), 4, 60); S.goal = null; }, { passive: false });
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const k = 1 - Math.exp(-dt * 7), t = (now - S.t0) / 1000;
      S.e += (S.eT - S.e) * k;
      if (S.goal) ['yaw', 'pitch', 'zoom', 'tx', 'ty', 'tz', 'cx', 'cy'].forEach((q) => { if (S.goal[q] != null) S.view[q] = S.view[q] + (S.goal[q] - S.view[q]) * k; });
      const focus = S.sel || S.hov, e = E.sm(S.e);
      const vis = (id) => (id === 'pcb' ? true : PORTS.includes(id) ? S.vis.ports : CHIPS.includes(id) ? S.vis.chips : id === 'gpio' ? S.vis.gpio : true);
      const s = { e, focus, focusA: focus ? 1 : 0, view: S.view, assemble: assembleFn(t), pins: S.sel === 'gpio' ? 1 : 0, vis, infoAt: [90, 250], hint: S.measure ? 'MEASURE: TAP TWO POINTS ON THE MODEL' : 'DRAG TO ORBIT  -  WHEEL TO ZOOM  -  TAP A PART', readout: 'EXPLODE ' + Math.round(S.e * 100) + '%',
        ui: (c) => {
          MX.text('EXPLODE', 78, SL.y + 8, { size: 22, color: T.mute, spacing: 1.5 });
          c.save(); c.strokeStyle = 'rgba(42,41,37,0.4)'; c.lineWidth = 3; c.beginPath(); c.moveTo(SL.x0, SL.y); c.lineTo(SL.x1, SL.y); c.stroke(); c.strokeStyle = T.ember; c.beginPath(); c.moveTo(SL.x0, SL.y); c.lineTo(SL.x0 + (SL.x1 - SL.x0) * S.eT, SL.y); c.stroke();
          c.beginPath(); c.arc(SL.x0 + (SL.x1 - SL.x0) * S.eT, SL.y, 13, 0, 6.2832); c.fillStyle = T.paper; c.fill(); c.stroke();
          btns().forEach((b) => { c.fillStyle = b.on ? T.ink : T.paper; c.fillRect(b.x, b.y, b.w, b.h); c.strokeStyle = T.ink; c.lineWidth = 1.5; c.strokeRect(b.x, b.y, b.w, b.h); MX.text(b.label, b.x + b.w / 2, b.y + 29, { size: 20, align: 'center', w: 600, spacing: 1, color: b.on ? T.paper : T.ink }); });
          if (S.pts.length) { const P = S.pts.map((q) => MX.P(q[0], q[1], q[2])); c.strokeStyle = T.ember; c.fillStyle = T.ember; c.lineWidth = 2.5; P.forEach((q) => { c.beginPath(); c.arc(q[0], q[1], 7, 0, 6.2832); c.fill(); }); if (P.length === 2) { c.beginPath(); c.moveTo(P[0][0], P[0][1]); c.lineTo(P[1][0], P[1][1]); c.stroke(); const d = Math.hypot(S.pts[0][0] - S.pts[1][0], S.pts[0][1] - S.pts[1][1], S.pts[0][2] - S.pts[1][2]), mx = (P[0][0] + P[1][0]) / 2, my = (P[0][1] + P[1][1]) / 2, lbl = d.toFixed(2) + ' mm'; c.font = '700 28px ' + MX.MONO; const tw = c.measureText(lbl).width; c.fillStyle = T.paper; c.fillRect(mx - tw / 2 - 8, my - 22, tw + 16, 38); c.fillStyle = T.ember; c.textAlign = 'center'; c.fillText(lbl, mx, my + 7); } }
        } };
      frame(ctx, s); requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  if (new URLSearchParams(location.search).has('explore')) explore();
  else MX.run({ w: W, h: H, fps: FPS, duration: DUR, poster: 12, draw: (ctx, t) => frame(ctx, scripted(t)), audio: () => MX.audio.render({ duration: DUR, cues: cues(), reverb: 0.2 }) });
})();
