/*
 * scene.js - Fig 6: Galaxy S25 Ultra and Galaxy S26 Ultra at the same scale (a fork of examples/phones, scripts/derive-phones.mjs --compare),
 * on kit/figure.js and kit/sound.js.
 * The geometry comes from MEASUREMENTS on official photos (phones.json -> layout): camera island / pill, each lens's diameter, lights, buttons,
 * corner radius and, on the POCO, the real interior (battery bay, board, SoC pad, motor) measured on Xiaomi's spare-part photos.
 * Every number carries its provenance: SPEC (published), MEASURED (measured on an official photo, +/-1.5 mm), DERIVED (formula + cross-check) or
 * ESTIMATED (dashed).
 */
(function () {
  'use strict';
  const D = PHONES.devices, TH = THREE, G = MX.gl, T = MX.THEME, E = MX.E, ramp = MX.ramp, lerp = MX.lerp, SND = MX.sound;
  const W = 1080, H = 1350, DUR = 62.5, OFK = 1.45, X0 = { s25: -46, s26: 46 };
  const assemblies = {}, rgbMats = []; window.__specInfo = () => ({ duration: DUR });      // render.mjs toma la duracion de aca
  const F = MX.figure({ w: W, h: H, axes: 'three', stage: { shadow: 0.14, floorY: -90, key: [-60, 170, 110] },
    beforeRender: (s) => { D.forEach((d) => { assemblies[d.id].rotation.y = (s.flip || 0) * Math.PI; assemblies[d.id].position.x = X0[d.id] * (1 + 0.55 * (s.e || 0)); }); const t = s.t == null ? performance.now() / 1000 : s.t; rgbMats.forEach((m, i) => m.emissive.setHSL((t * 0.07 + i * 0.5) % 1, 1, 0.5)); },
    card: (s) => ({ fig: 'Fig 6', kicker: 'SPEC SHEETS + OFFICIAL PHOTOS', title: 'Galaxy S25 Ultra vs S26 Ultra', sub: s.sub || 'Every number is SPEC, MEASURED, DERIVED or ESTIMATED (dashed).', hint: s.hint || '', readout: s.readout || '2 phones - ' + F.parts.length + ' parts' }) });
  const st = F.st; ['left', 'bottom'].forEach((k) => { st.key.shadow.camera[k] = -170; }); ['right', 'top'].forEach((k) => { st.key.shadow.camera[k] = 170; }); st.key.shadow.camera.updateProjectionMatrix();
  const H2 = F.hud, f1 = (v) => (+v).toFixed(1), f2 = (v) => (+v).toFixed(2);
  const LX = (d, cxBack) => d.body.w / 2 - cxBack, LY = (d, cyTop) => d.body.h / 2 - cyTop;          // view from the back (x from the left, y from the top) -> the model's centred local frame

  /* ------------------------------------------------------------ geometria y texturas */
  function rr(w, h, r) { const s = new TH.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2 - 0.01, h / 2 - 0.01); s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
  function plate(shape, thick, bv = 0.25) { const dep = Math.max(0.01, thick - 2 * bv), g = new TH.ExtrudeGeometry(shape, { depth: dep, bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: 3, curveSegments: 10 }); g.translate(0, 0, bv); return g; }
  const tex = (w, h, fn) => G.canvasTex(w, h, fn);
  function wallpaper(wmm, hmm, punch) {
    const S = 8;
    return tex(Math.round(wmm * S), Math.round(hmm * S), (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0f2a6b'); g.addColorStop(0.45, '#6a1fa0'); g.addColorStop(1, '#ff5a1f'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      [[0.25, 0.3, 0.5, 'rgba(255,255,255,0.10)'], [0.8, 0.7, 0.6, 'rgba(10,124,140,0.35)'], [0.3, 0.85, 0.45, 'rgba(232,89,12,0.25)']].forEach(([x, y, r, col]) => { const gr = c.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
      c.fillStyle = 'rgba(255,255,255,0.92)'; c.textAlign = 'center'; c.font = '300 ' + w * 0.2 + 'px ' + MX.SANS; c.fillText('12:00', w / 2, h * 0.2);
      c.font = '400 ' + w * 0.05 + 'px ' + MX.SANS; c.fillText('mechanism demo', w / 2, h * 0.245);
      c.fillStyle = '#000'; c.beginPath(); c.arc(w / 2, punch.cyTop * S - 0.3 * S, (punch.d / 2) * S, 0, 6.2832); c.fill();
    });
  }
  const labelTex = (w, h, a, b) => tex(Math.round(w * 12), Math.round(h * 12), (c, cw, ch) => { c.fillStyle = '#b4b1a6'; c.fillRect(0, 0, cw, ch); c.strokeStyle = '#bdbab0'; c.lineWidth = 3; c.strokeRect(6, 6, cw - 12, ch - 12); c.fillStyle = '#2a2925'; c.textAlign = 'center'; c.font = '700 ' + cw * 0.17 + 'px ' + MX.MONO; c.fillText(a, cw / 2, ch * 0.5); c.font = '400 ' + cw * 0.07 + 'px ' + MX.MONO; c.fillText(b, cw / 2, ch * 0.62); });
  const boardTex = (w, h, base) => tex(Math.round(w * 14), Math.round(h * 14), (c, cw, ch) => { c.fillStyle = base; c.fillRect(0, 0, cw, ch); const R = MX.rng(3); c.strokeStyle = 'rgba(160,200,170,0.22)'; c.lineWidth = 2; for (let i = 0; i < 110; i++) { const x = R() * cw, y = R() * ch; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 120, y); c.lineTo(x + (R() - 0.5) * 120, y + (R() - 0.5) * 120); c.stroke(); } c.fillStyle = '#d9b54d'; for (let i = 0; i < 160; i++) c.fillRect(R() * cw, R() * ch, 5, 5); });
  const chipTex = (w, h, a, b) => G.flatMat(tex(Math.round(w * 40), Math.round(h * 40), (c, cw, ch) => { c.fillStyle = 'rgba(235,235,235,0.9)'; c.textAlign = 'center'; c.font = '700 ' + ch * 0.18 + 'px ' + MX.MONO; c.fillText(a, cw / 2, ch * 0.46); c.font = '400 ' + ch * 0.12 + 'px ' + MX.MONO; c.fillText(b, cw / 2, ch * 0.64); }));
  const weaveBump = () => { const t = tex(256, 256, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); const R = MX.rng(9); for (let i = 0; i < 2600; i++) { const x = R() * w, y = R() * h, l = 6 + R() * 18, a = 0.3 + R() * 0.7; c.strokeStyle = 'rgba(' + (R() > 0.5 ? '255,255,255' : '0,0,0') + ',' + a * 0.2 + ')'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y + (R() - 0.5) * 3); c.stroke(); } }); t.colorSpace = TH.NoColorSpace; t.wrapS = t.wrapT = TH.RepeatWrapping; t.repeat.set(8, 16); return t; };
  const gridTex = (kind) => { const t = tex(256, 256, (c, w, h) => { c.fillStyle = kind === 'privacy' ? '#0a0a0e' : '#0d0f16'; c.fillRect(0, 0, w, h); c.strokeStyle = kind === 'privacy' ? 'rgba(120,160,255,0.55)' : 'rgba(110,130,200,0.45)'; c.lineWidth = 1; if (kind === 'privacy') { for (let i = -h; i < w + h; i += 6) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); } } else { for (let i = 0; i < w; i += 8) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } c.fillStyle = 'rgba(255,170,60,0.55)'; for (let i = 4; i < w; i += 16) for (let j = 4; j < h; j += 16) c.fillRect(i, j, 2, 2); } }); t.wrapS = t.wrapT = TH.RepeatWrapping; t.repeat.set(10, 20); return t; };
  const textDecal = (txt, wmm, hmm, size, color, weight) => G.flatMat(tex(Math.round(wmm * 40), Math.round(hmm * 40), (c, cw, ch) => { c.fillStyle = color; c.font = (weight || 600) + ' ' + size * 40 + 'px ' + MX.SANS; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, cw / 2, ch / 2); }));
  const gradDecal = (top, bottom, w, h) => G.flatMat(tex(64, 512, (c, cw, ch) => { const g = c.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, top); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, bottom); c.fillStyle = g; c.fillRect(0, 0, cw, ch); }));

  const V = (x, y, z) => new TH.Vector3(x, y, z);
  const OA = (m, o) => { if (o.position) m.position.copy(o.position); if (o.rotation) m.rotation.copy(o.rotation); return m; };
  function part(dev, kind, name, z0, off, est, g, info) {
    assemblies[dev.id].add(g); const id = dev.id + '.' + kind; let hh = 7; for (const ch of id) hh = (hh * 31 + ch.charCodeAt(0)) | 0; const r = (n) => MX.hash(hh, n) * 2 - 1;
    return F.add({ id, dev, kind, name, group: g, base: V(g.position.x, g.position.y, z0), explode: V(0, 0, off * OFK), from: V(r(1) * 26, r(2) * 16 + 6, 78), arc: V(r(3) * 16, 14 + r(4) * 6, 0), spin: V(r(5) * 0.55, r(6) * 0.8, r(7) * 0.45), tilt: V(r(8) * 0.045, r(9) * 0.06, r(10) * 0.03), est, info });
  }
  const SIZE = {};
  const lensOf = (d) => d.layout.lenses.map((l) => Object.assign({ c: d.cameras[l.cam] }, l));

  /* ------------------------------------------------------------ building a phone (centred local coordinates: x width, y height, z thickness, front = +z) */
  function buildDevice(d) {
    const A = (assemblies[d.id] = new TH.Group()); A.position.x = X0[d.id]; F.st.scene.add(A);
    const L = d.layout, IN = L.interior, DS = d.design, DT = d.displayTech, w = d.body.w, h = d.body.h, t = d.body.t, r = d.body.corner, zc = (z) => z - t / 2, C = d.colors, act = d.display.active, isP = false;
    const sunk = DS.frame.sunken, sink = sunk ? 0.35 : 0, inset = sunk ? 0.9 : 0.1, backT = 0.7, glassT = 0.7, wall = 1.5, zTop = t - sink, mat = (c, o) => G.mat(c, o);
    const isl = L.island, lenses = lensOf(d);
    // ---- back cover: its own material, a cut-out for the island / pill, texts and gradient
    const sb = rr(w - 2 * inset, h - 2 * inset, Math.max(r - inset, 2)), rings = isl.shape === 'rings';
    if (rings) lenses.forEach((l) => { const p = new TH.Path(); p.absarc(LX(d, l.cx), LY(d, l.cyTop), l.glassD / 2 + isl.ringW + 0.25, 0, Math.PI * 2, true); sb.holes.push(p); });
    else { const ih = rr(isl.w + 0.5, isl.h + 0.5, (isl.w + 0.5) / 2), ihp = new TH.Path(ih.getPoints(16).reverse().map((q) => new TH.Vector2(q.x + LX(d, isl.cx), q.y + LY(d, isl.top + isl.h / 2)))); sb.holes.push(ihp); }
    L.extras.forEach((e) => { if (e.k === 'laser' || e.k === 'flash' || e.k === 'led') { const p = new TH.Path(); p.absarc(LX(d, e.cx), LY(d, e.cyTop), e.d / 2 + 0.25, 0, Math.PI * 2, true); sb.holes.push(p); } });
    const backMat = isP ? mat(C.back, { roughness: 0.66, bumpMap: weaveBump(), bumpScale: 0.25, clearcoat: 0.08 }) : mat(C.back, { roughness: 0.3, metalness: 0.18, clearcoat: 0.35, clearcoatRoughness: 0.32 });
    const back = new TH.Group(); back.add(new TH.Mesh(plate(sb, backT, 0.3), backMat));
    const decal = (txt, o) => { const m = new TH.Mesh(new TH.PlaneGeometry(o.w, o.h), textDecal(txt, o.w, o.h, o.size, o.color, o.weight)); m.rotation.y = Math.PI; m.rotation.z = (o.rot || 0) * Math.PI / 180; m.position.set(LX(d, o.cx), LY(d, o.cy), -0.01); m.renderOrder = 3; back.add(m); };
    L.texts.forEach((q) => decal(q.s, { w: Math.max(6, q.s.length * q.size * 0.85), h: q.size * 1.6, size: q.size, cx: q.cx, cy: q.cyTop != null ? q.cyTop : h - q.cyBottom, color: isP ? 'rgba(60,90,120,' + q.alpha + ')' : 'rgba(255,255,255,' + q.alpha * 0.8 + ')', weight: q.w, rot: q.rot }));
    if (!isP) { const gd = new TH.Mesh(new TH.PlaneGeometry(w - 2 * inset, h - 2 * inset), gradDecal(C.gradTop || 'rgba(150,148,210,0.55)', C.gradBottom || 'rgba(20,20,60,0.5)', w, h)); gd.rotation.y = Math.PI; gd.position.z = -0.012; gd.renderOrder = 2; back.add(gd); }
    SIZE[d.id + '.back'] = h;
    part(d, 'back', 'Back cover', zc(sink), -26, false, back, { title: d.name + ' back', lines: [DS.back.material + ' (spec)', 'outline ' + w + ' x ' + h + ' mm (spec), corner radius ' + r + ' mm (measured)', 'thickness 0.7 mm: estimated'], conf: ['spec', 'measured', 'estimated'] });
    // ---- camera island / pill: sizes from the official photos
    const lens = new TH.Group(), rimMat = mat(isP ? '#d6cfc0' : (C.ring || '#c4c3e6'), { metalness: 1, roughness: isP ? 0.22 : 0.3, envMapIntensity: 1.8 }), darkMat = mat('#0e0f12', { roughness: 0.4, metalness: 0.6 });
    let islMesh; if (!rings) { islMesh = new TH.Mesh(plate(rr(isl.w, isl.h, isl.w / 2), isl.raise + backT, 0.35), isP ? rimMat : mat(C.frame, { metalness: 0.6, roughness: 0.28, clearcoat: 0.4 })); islMesh.rotation.y = Math.PI; islMesh.position.set(LX(d, isl.cx), LY(d, isl.top + isl.h / 2), backT); lens.add(islMesh); }
    lenses.forEach((l) => {
      const c = l.c, X = LX(d, l.cx), Y = LY(d, l.cyTop), R = l.glassD / 2, pup = Math.min(R * 0.8, c.pupilMm || 1.5), zf = rings ? -isl.raise + 0.35 : -isl.raise - (isP || l.small ? 0 : isl.barrel || 0), rim = l.small ? 0.35 : isP ? 0.55 : 0.6;
      lens.add(OA(new TH.Mesh(new TH.BoxGeometry(c.sensor.w, c.sensor.h, 0.5), mat('#1a2540', { roughness: 0.4, metalness: 0.3 })), { position: V(X, Y, 4.6) }));
      lens.add(OA(new TH.Mesh(new TH.CylinderGeometry(R, R, 3.6 + (isP || l.small ? 0 : isl.barrel || 0), 56), darkMat), { rotation: new TH.Euler(Math.PI / 2, 0, 0), position: V(X, Y, 1.4 + zf / 2) }));
      const prof = [[R, 0.55], [R + rim * 0.6, 0.5], [R + rim, 0.3], [R + rim, 0], [R, 0]].map((q) => new TH.Vector2(q[0], q[1])), lg = new TH.LatheGeometry(prof, 72); lg.rotateX(-Math.PI / 2);
      lens.add(OA(new TH.Mesh(lg, rimMat), { position: V(X, Y, zf) }));
      if (rings) { const Ro = R + isl.ringW, pr2 = [[R + 0.05, -0.3], [R + 0.05, isl.raise - 0.3], [R + 0.25, isl.raise - 0.05], [Ro - 0.25, isl.raise], [Ro, isl.raise - 0.3], [Ro, -0.3]].map((q) => new TH.Vector2(q[0], q[1])), tg = new TH.LatheGeometry(pr2, 80); tg.rotateX(-Math.PI / 2); lens.add(OA(new TH.Mesh(tg, rimMat), { position: V(X, Y, 0) })); }
      const coat = mat('#05060a', { roughness: 0.03, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 1, iridescenceIOR: 1.38, iridescenceThicknessRange: [140, 420], envMapIntensity: 1.5 });
      lens.add(OA(new TH.Mesh(new TH.CircleGeometry(R, 72), coat), { position: V(X, Y, zf + 0.2), rotation: new TH.Euler(0, Math.PI, 0) }));
      lens.add(OA(new TH.Mesh(new TH.CircleGeometry(pup, 48), mat('#2f55a8', { roughness: 0.05, metalness: 0.5, iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessRange: [200, 600], emissive: '#10224a', emissiveIntensity: 0.6 })), { position: V(X, Y, zf + 0.21), rotation: new TH.Euler(0, Math.PI, 0) }));
      lens.add(OA(new TH.Mesh(new TH.RingGeometry(pup + 0.5, Math.min(R - 0.4, pup + 1.3), 48), mat('#1b1c22', { roughness: 0.2, metalness: 0.8 })), { position: V(X, Y, zf + 0.22), rotation: new TH.Euler(0, Math.PI, 0) }));
      if (isP) for (let k = 0; k < 4; k++) { const m = new TH.MeshStandardMaterial({ color: '#111', emissive: '#31d0ff', emissiveIntensity: 1.6, roughness: 0.3 }); rgbMats.push(m); const seg = new TH.Mesh(new TH.TorusGeometry(R - 0.2, 0.1, 6, 20, Math.PI / 2 - 0.4), m); seg.rotation.set(0, Math.PI, k * Math.PI / 2 + 0.2); seg.position.set(X, Y, zf + 0.1); lens.add(seg); }
    });
    L.extras.forEach((e) => {
      const X = LX(d, e.cx), Y = LY(d, e.cyTop), rad = e.d / 2;
      if (e.k === 'flash') lens.add(OA(new TH.Mesh(new TH.CircleGeometry(rad, 40), mat('#ffe9b8', { roughness: 0.25, emissive: '#ffd88a', emissiveIntensity: 0.35 })), { position: V(X, Y, -0.1), rotation: new TH.Euler(0, Math.PI, 0) }));
      else if (e.k === 'led') lens.add(OA(new TH.Mesh(new TH.CircleGeometry(rad, 40), mat('#cfd1d6', { metalness: 0.9, roughness: 0.25 })), { position: V(X, Y, -0.1), rotation: new TH.Euler(0, Math.PI, 0) }));
      else { lens.add(OA(new TH.Mesh(new TH.CircleGeometry(rad, 40), mat('#06060a', { roughness: 0.05, metalness: 0.4, clearcoat: 1 })), { position: V(X, Y, -0.1), rotation: new TH.Euler(0, Math.PI, 0) })); const pr = [[rad, 0.2], [rad + 0.4, 0.15], [rad + 0.4, 0], [rad, 0]].map((q) => new TH.Vector2(q[0], q[1])), lg2 = new TH.LatheGeometry(pr, 40); lg2.rotateX(-Math.PI / 2); lens.add(OA(new TH.Mesh(lg2, rimMat), { position: V(X, Y, -0.1) })); }
    });
    SIZE[d.id + '.island'] = isl.h;
    part(d, 'island', 'Rear cameras', zc(sink), -16, isP ? false : false, lens, { title: d.name + ' rear cameras', lines: [(rings ? 'five separate rings, ' + isl.raise + ' mm tall, ' : (isP ? 'stadium island ' : 'raised pill ') + isl.w + ' x ' + isl.h + ' mm, ') + lenses.length + ' lenses (measured on official photos)', 'glass diameters: ' + lenses.map((l) => f1(l.glassD)).join(' / ') + ' mm (measured)', 'sensors and pupils derived from published specs', 'which opening is which: ' + (isP ? 'spec order' : 'estimated')], conf: ['measured', 'derived', 'spec'] });
    // ---- battery: bay MEASURED on the POCO, estimated on the S26
    const bt = IN.battery, bat = new TH.Group(); bat.add(new TH.Mesh(plate(rr(bt.w, bt.h, 3), bt.t, 0.3), mat(isP ? '#9b9ca2' : '#8d8f96', { roughness: 0.6, metalness: 0.1 })));
    const bl = new TH.Mesh(new TH.PlaneGeometry(bt.w * 0.7, bt.h * 0.14), G.flatMat(labelTex(bt.w * 0.7, bt.h * 0.14, d.battery.mAh + ' mAh', d.battery.chem))); bl.position.set(0, 0, bt.t + 0.04); bat.add(bl);
    if (isP) { const sp = new TH.Mesh(new TH.BoxGeometry(bt.w, 0.5, bt.t + 0.1), mat('#6b6c72', { roughness: 0.7 })); sp.position.set(0, 0, bt.t / 2); bat.add(sp); }   // dos celdas
    bat.position.set(LX(d, bt.cx), LY(d, bt.cyTop), 0); SIZE[d.id + '.battery'] = bt.h;
    part(d, 'battery', 'Battery', zc(sink + backT + 0.2), -9, true, bat, { title: d.name + ' battery', lines: [d.battery.mAh + ' mAh (spec)' + (isP ? ', dual cell ATL + COSMX (Xiaomi FAQ)' : ''), d.battery.charge.replace(', 4.5 W reverse', '').replace(', 27 W reverse', '') + ' (spec)', isP ? 'bay ' + bt.bayW + ' x ' + bt.bayH + ' mm (measured); implies ' + d.battery.impliedWhPerL + ' Wh/L' : 'size and position: estimated (' + d.battery.impliedWhPerL + ' Wh/L implied)'], conf: isP ? ['spec', 'measured', 'estimated'] : ['spec', 'estimated'] });
    // ---- frame: its own profile, measured buttons, openings in the edges
    const frameH = sunk ? t : t - 2 * glassT * 0.8, fz0 = sunk ? 0 : glassT * 0.8;
    const sf = rr(w, h, r), hole = rr(w - 2 * wall, h - 2 * wall, Math.max(r - wall, 1)); sf.holes.push(new TH.Path(hole.getPoints(14).reverse()));
    const frame = new TH.Group(), fm = mat(C.frame, isP ? { metalness: 1, roughness: 0.16, envMapIntensity: 1.9, clearcoat: 0.3 } : { metalness: 1, roughness: 0.36, envMapIntensity: 1.5 }); frame.add(new TH.Mesh(plate(sf, frameH, isP ? 0.55 : 0.3), fm));
    const box = (x, y, bw, bh, bd, m2, zc2) => { const b = new TH.Mesh(new TH.BoxGeometry(bw, bh, bd), m2); b.position.set(x, y, zc2 == null ? frameH / 2 : zc2); frame.add(b); return b; };
    L.buttons.forEach((b) => { const m2 = b.accent ? mat(b.accent, { metalness: 0.6, roughness: 0.4 }) : fm; box(w / 2 + 0.28, LY(d, b.yTop), 0.7, b.len, 1.7, m2); });
    const ant = mat('#17171a', { roughness: 0.5 }), antPos = [[-w / 2, h / 2 - 24], [-w / 2, -h / 2 + 24], [w / 2, h / 2 - 24], [w / 2, -h / 2 + 24]];
    antPos.forEach(([x, y]) => box(x, y, 0.34, 1.1, frameH * 0.96, ant)); [[w / 2 - 20, h / 2], [-w / 2 + 20, h / 2], [w / 2 - 20, -h / 2], [-w / 2 + 20, -h / 2]].forEach(([x, y]) => box(x, y, 1.1, 0.34, frameH * 0.96, ant));
    const dark = mat('#0b0b0d', { roughness: 0.5 }), dots = (n, x0, y0, side) => { for (let i = 0; i < n; i++) { const dd = new TH.Mesh(new TH.CircleGeometry(0.42, 16), mat('#0a0a0c', { roughness: 0.6 })); dd.rotation.x = -side * Math.PI / 2; dd.position.set(x0 + i * 1.5, y0 + side * 0.03, frameH / 2); frame.add(dd); } };
    const ed = L.edges, usbX = ed.bottom.usbFront - w / 2; box(usbX, -h / 2 + 0.05, 8.4, 0.5, 2.6, dark);
    if (isP) { dots(ed.bottom.speakerHoles, ed.bottom.speakerFront - w / 2 - 3, -h / 2, -1); box(ed.bottom.simFront - w / 2, -h / 2 + 0.05, 12, 0.4, 0.9, mat('#303034', { metalness: 0.8, roughness: 0.4 })); dots(ed.top.grille.holes, (w - ed.top.grille.cxBack) - w / 2 - 3, h / 2, 1); box((w - ed.top.mic.cxBack) - w / 2, h / 2 - 0.05, 1.2, 0.5, 1.2, dark); }
    else { dots(ed.bottom.speakerHoles, ed.bottom.speakerFront - w / 2 - 5, -h / 2, -1); box(ed.bottom.simFront - w / 2, -h / 2 + 0.05, 10, 0.4, 0.9, mat('#303034', { metalness: 0.8, roughness: 0.4 })); const pc = new TH.Mesh(new TH.CircleGeometry(ed.bottom.penHole / 2, 32), dark); pc.rotation.x = Math.PI / 2; pc.position.set(ed.bottom.penFront - w / 2, -h / 2 - 0.03, frameH / 2); frame.add(pc); box(ed.top.earpieceFront - w / 2, h / 2 - 0.05, 9, 0.5, 1.2, dark); box((w - ed.top.micCxBack) - w / 2, h / 2 - 0.05, 1.2, 0.5, 1.2, dark); }
    SIZE[d.id + '.frame'] = h;
    part(d, 'frame', (d.build.frame.indexOf('titan') === 0 ? 'Titanium' : 'Aluminum') + ' frame', zc(fz0), 0, false, frame, { title: d.name + ' frame', lines: [DS.frame.kind, 'corner radius ' + r + ' mm (measured)', 'buttons measured: ' + L.buttons.map((b) => b.k + ' ' + b.len + ' mm at ' + b.yTop).join(', '), 'wall thickness: estimated'], conf: ['spec', 'measured', 'estimated'] });
    // ---- mainboard, SoC and components (POCO: measured on the spare-part photo; S26: estimated)
    const bd = IN.board, board = new TH.Group(), bmat = mat('#ffffff', { roughness: 0.5 }); bmat.map = boardTex(bd.w, bd.h, isP ? '#15171b' : '#2c6e47'); const bth = 1.1;
    board.add(new TH.Mesh(plate(rr(bd.w, bd.h, 5), bth, 0.1), bmat)); board.position.set(LX(d, bd.cx), LY(d, bd.cyTop), 0);
    { const R = MX.rng(11), n = 160, cap = new TH.InstancedMesh(new TH.BoxGeometry(1, 0.6, 0.5), mat('#b79a6a', { roughness: 0.5, metalness: 0.2 }), n), m4 = new TH.Matrix4(); for (let i = 0; i < n; i++) { const px = (R() - 0.5) * (bd.w - 5), py = (R() - 0.5) * (bd.h - 4), sx = 0.6 + R() * 1.2; m4.makeScale(sx, 1, 1); if (R() > 0.5) m4.makeRotationZ(Math.PI / 2).scale(V(sx, 1, 1)); m4.setPosition(px, py, bth + 0.25); cap.setMatrixAt(i, m4); } board.add(cap); }
    if (isP) { const cn = IN.can; board.add(OA(new TH.Mesh(new TH.BoxGeometry(cn.w, cn.h, 1.6), mat('#b9bcc2', { metalness: 0.85, roughness: 0.4 })), { position: V(LX(d, cn.cx) - board.position.x, LY(d, cn.cyTop) - board.position.y, bth + 0.8) })); }
    else board.add(OA(new TH.Mesh(new TH.BoxGeometry(bd.w * 0.35, bd.h * 0.5, 0.5), mat('#9a9ea6', { metalness: 0.7, roughness: 0.55 })), { position: V(-bd.w * 0.28, 0, bth + 0.25) }));
    SIZE[d.id + '.board'] = bd.h;
    part(d, 'board', 'Main board', zc(sink + backT + 0.3), 6, !isP, board, { title: d.name + ' main board', lines: isP ? ['board ' + bd.w + ' x ' + bd.h + ' mm, top (measured)', 'shield can ' + IN.can.w + ' x ' + IN.can.h + ' mm (measured)'] : ['layout and size: estimated', 'no ' + d.name + ' interior photo was available'], conf: isP ? ['measured'] : ['estimated'] });
    const sp = IN.socPad, soc = new TH.Group(), pk = sp.pkg;
    if (isP) soc.add(OA(new TH.Mesh(plate(rr(sp.w, sp.h, 2), 0.35, 0.05), mat('#d6c06a', { roughness: 0.6, metalness: 0.2, transparent: true, opacity: 0.9 })), { position: V(0, 0, 0) }));
    const pkm = new TH.Mesh(new TH.BoxGeometry(pk, pk, 1.0), mat('#2a2a2c', { roughness: 0.45, metalness: 0.3 })); pkm.position.z = isP ? 0.85 : 0.5; soc.add(pkm);
    const stp = new TH.Mesh(new TH.PlaneGeometry(pk * 0.9, pk * 0.9), chipTex(pk, pk, isP ? 'D9500s' : (d.soc.chip || 'SM8850'), d.soc.node)); stp.position.z = pkm.position.z + 0.52; soc.add(stp);
    soc.position.set(LX(d, sp.cx), LY(d, sp.cyTop), 0); SIZE[d.id + '.soc'] = pk;
    const cores = d.soc.cpu.reduce((s2, q) => s2 + q.n, 0);
    part(d, 'soc', d.soc.name, zc(sink + backT + 0.3 + bth), 9, true, soc, { title: d.soc.name, lines: [d.soc.node + ', ' + cores + ' cores, ' + d.soc.gpu, d.soc.ram, d.soc.storage, isP ? 'thermal pad ' + sp.w + ' x ' + sp.h + ' mm (measured)' : 'package size and position: estimated'], conf: isP ? ['spec', 'measured', 'estimated'] : ['spec', 'estimated'] });
    // ---- extras: POCO = motor, speaker and USB-C board measured; S26 = vapour chamber and S Pen
    if (isP) {
      const mo = IN.motor, hp = new TH.Group(); hp.add(OA(new TH.Mesh(new TH.BoxGeometry(mo.w, mo.h, 3.4), mat('#c4c7cd', { metalness: 0.85, roughness: 0.4 })), { position: V(0, 0, 1.7) })); hp.add(OA(new TH.Mesh(new TH.CylinderGeometry(1.2, 1.2, 0.2, 20), mat('#3d7be0', { metalness: 0.6, roughness: 0.3 })), { position: V(-mo.w * 0.2, 0, 3.5), rotation: new TH.Euler(Math.PI / 2, 0, 0) })); hp.position.set(LX(d, mo.cx), LY(d, mo.cyTop), 0); SIZE['s25.vapor'] = mo.w;
      part(d, 'haptic', 'Vibration motor', zc(sink + backT + 0.3), 7, false, hp, { title: d.name + ' vibration motor', lines: ['X-axis linear motor (spec)', 'box ' + mo.w + ' x ' + mo.h + ' mm at the top (measured on the official photo)'], conf: ['spec', 'measured'] });
      const sk = IN.speaker, aud = new TH.Group(); aud.add(OA(new TH.Mesh(new TH.BoxGeometry(sk.w, sk.h, sk.t), mat('#1c1d21', { roughness: 0.5 })), { position: V(0, 0, sk.t / 2) })); aud.add(OA(new TH.Mesh(new TH.BoxGeometry(sk.w * 0.9, 1.4, sk.t * 0.5), mat('#c4402b', { roughness: 0.7 })), { position: V(0, sk.h / 2 + 0.7, sk.t * 0.3) })); aud.position.set(LX(d, sk.cx), LY(d, sk.cyTop), 0); SIZE['s25.audio'] = sk.w;
      part(d, 'audio', 'Bottom speaker', zc(sink + backT + 0.2), 4, false, aud, { title: d.name + ' bottom speaker', lines: ['symmetrical stereo: top-firing + bottom speaker (GSMArena)', 'speaker module with red gasket ~' + sk.w + ' x ' + sk.h + ' mm (official part photo)'], conf: ['spec', 'measured'] });
      const sb2 = IN.subboard, sub = new TH.Group(); sub.add(new TH.Mesh(plate(rr(sb2.w, sb2.h, 2), sb2.t, 0.1), mat('#14161b', { roughness: 0.5 }))); sub.add(OA(new TH.Mesh(new TH.BoxGeometry(8.4, 2.6, 2.6), mat('#b9bcc2', { metalness: 0.85, roughness: 0.4 })), { position: V(0, -sb2.h / 2 + 1.3, sb2.t + 1.3) })); sub.position.set(LX(d, sb2.cx), LY(d, sb2.cyTop), 0); SIZE['s25.sub'] = sb2.w;
      part(d, 'sub', 'USB-C sub-board', zc(sink + backT + 0.2), 3, true, sub, { title: d.name + ' USB-C sub-board', lines: ['separate small board with the USB-C port and SIM reader (Xiaomi part list: sub board assy)', 'position approximate'], conf: ['spec', 'estimated'] });
    } else {
      const vp = IN.vapor, vc = new TH.Group(); vc.add(new TH.Mesh(new TH.BoxGeometry(vp.w, vp.h, 0.5), mat('#cfd2d6', { metalness: 0.9, roughness: 0.3 }))); vc.position.set(LX(d, vp.cx), LY(d, vp.cyTop), 0); SIZE[d.id + '.vapor'] = vp.h;
      part(d, 'vapor', 'Vapor chamber', zc(sink + backT + 0.3 + bth + 1.2), 11, true, vc, { title: d.name + ' vapor chamber', lines: [d.id === 's26' ? '"largest vapor chamber yet", ~15% larger than S25 Ultra (teardown)' : '40% larger than the S24 Ultra (Samsung claim)', 'stack: paste, pads and graphite (PBKreviews)', 'size and position: estimated'], conf: ['spec', 'estimated'] });
      const pn = IN.pen, spg = new TH.Group(), pen = new TH.Mesh(new TH.CylinderGeometry(pn.dia / 2, pn.dia / 2, pn.len, 28), mat('#707478', { roughness: 0.4, metalness: 0.5 })); pen.position.set(0, 0, 0); spg.add(pen);
      const tip = new TH.Mesh(new TH.CylinderGeometry(0.4, pn.dia / 2, 7, 28), mat('#d0d3d8', { metalness: 1, roughness: 0.2 })); tip.position.set(0, -pn.len / 2 - 3, 0); spg.add(tip); const btnp = new TH.Mesh(new TH.BoxGeometry(0.5, 12, pn.dia * 0.9), mat('#2c2e33', { roughness: 0.4 })); btnp.position.set(0, 8, 0); spg.add(btnp);
      spg.position.set(pn.cxFront - w / 2, -h / 2 + pn.len / 2 + 10, 0); SIZE[d.id + '.spen'] = pn.len;
      part(d, 'spen', 'S Pen', zc(sink + backT + 0.3 + pn.dia / 2), -4, true, spg, { title: 'S Pen', lines: ['pops out of a slot in the bottom edge, near the front-left corner (official photos)', d.id === 's26' ? 'slot is a sealed chamber; slightly wider than the S25 Ultra pen (teardown)' : 'sealed chamber; this pen has no Bluetooth (teardown coverage)', 'length ' + pn.len + ' mm and diameter ' + pn.dia + ' mm: estimated'], conf: ['spec', 'estimated'] });
      const sk = new TH.Group(); sk.add(OA(new TH.Mesh(new TH.BoxGeometry(18, 7, 2.6), mat('#303034', { roughness: 0.5 })), { position: V(0, 0, 1.3) })); sk.position.set(ed.bottom.speakerFront - w / 2, -h / 2 + 8, 0); SIZE[d.id + '.audio'] = 18;
      part(d, 'audio', 'Speakers', zc(sink + backT + 0.2), 4, true, sk, { title: d.name + ' speakers', lines: ['down-firing speaker + earpiece tweeter (Stuff)', 'balls inside the modules reduce tinny sound (teardown)', 'size and position: estimated'], conf: ['spec', 'estimated'] });
    }
    // ---- display stack: every layer is a part
    const pc = L.punch, fp = new TH.Group(); fp.add(new TH.Mesh(new TH.BoxGeometry(8, 8, 0.3), mat('#6b6d73', { metalness: 0.5, roughness: 0.4 }))); fp.position.set(0, 40 - h / 2, 0); SIZE[d.id + '.fp'] = 8;
    part(d, 'fp', 'Ultrasonic fingerprint', zTop - 1.75 - t / 2, 14, true, fp, { title: d.name + ' fingerprint sensor', lines: ['ultrasonic, under the display (spec)', 'size and position: estimated'], conf: ['spec', 'estimated'] });
    const sf2 = new TH.Group(), sc = d.selfie; sf2.add(new TH.Mesh(new TH.BoxGeometry(sc.sensor.w, sc.sensor.h, 0.4), mat('#1a2540', { roughness: 0.4 }))); sf2.position.set(0, LY(d, pc.cyTop), 0); SIZE[d.id + '.selfie'] = 4;
    part(d, 'selfie', 'Selfie camera', zTop - 1.35 - t / 2, 25, true, sf2, { title: d.name + ' selfie camera', lines: [sc.name + ', f/' + sc.f + ' (spec)', 'punch hole d ' + pc.d + ' mm at ' + pc.cyTop + ' mm from the top (measured)', 'sensor ' + f2(sc.sensor.w) + ' x ' + f2(sc.sensor.h) + ' mm' + (sc.sensor.byFormatOnly ? ' (from the format only)' : ' (derived)')], conf: ['spec', 'measured', 'derived'] });
    const gl = new TH.Mesh(plate(rr(w - 2 * inset, h - 2 * inset, Math.max(r - inset, 2)), glassT, 0.2), G.glass('#ffffff', { thickness: 0.7, roughness: 0.03, ior: 1.5, attenuationDistance: 200, envMapIntensity: 1.2 })), glassG = new TH.Group(); glassG.add(gl); SIZE[d.id + '.glass'] = h;
    part(d, 'glass', 'Cover glass', zTop - glassT - t / 2 + t / 2 - t / 2, 42, false, glassG, { title: d.name + ' cover glass', lines: [d.display.glass + ' (spec)', 'flat, ' + (sunk ? 'sunken into the frame' : 'edge to edge') + ' (reviews)', 'thickness 0.7 mm: estimated'], conf: ['spec', 'estimated'] }).noShadow = true;
    const lyr = (kind, name, zb, th, off, matr, info, est) => { const g = new TH.Group(); g.add(new TH.Mesh(plate(rr(act.w + 0.6, act.h + 0.6, Math.max(r - d.display.bezelSide, 2)), th, 0.03), matr)); SIZE[d.id + '.' + kind] = h; part(d, kind, name, zb - t / 2, off, est, g, info); return g; };
    lyr('optics', 'Adhesive + touch + polarizer', zTop - glassT - 0.2, 0.2, 35, mat('#aab0bd', { roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.55 }), { title: d.name + ' optics layers', lines: ['optically clear adhesive, touch sensor, polarizer / colour filter', 'typical OLED stack; exact layers not published'], conf: ['estimated'] }, true);
    const dm = mat('#030304', { roughness: 0.2, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.08, envMapIntensity: 0.25 }), wp = wallpaper(act.w, act.h, pc); wp.repeat.set(1 / act.w, 1 / act.h); wp.offset.set(0.5, 0.5); dm.emissive = new TH.Color('#ffffff'); dm.emissiveMap = wp; dm.emissiveIntensity = 1.0;
    const oled = new TH.Group(), act2 = rr(act.w, act.h, Math.max(r - d.display.bezelSide, 2)); oled.add(new TH.Mesh(plate(rr(w - 2 * inset - 0.8, h - 2 * inset - 0.8, Math.max(r - inset - 0.4, 2)), 0.1, 0.03), mat('#07070a', { roughness: 0.2, metalness: 0.2 })));
    const face = new TH.Mesh(plate(act2, 0.15, 0.03), [dm, mat('#111114')]); face.position.z = 0.1; oled.add(face); SIZE[d.id + '.oled'] = h;
    const ck = d.display.check;
    part(d, 'oled', DT.family, zTop - glassT - 0.2 - 0.15, 29, false, oled, { title: d.name + ' ' + DT.family, lines: ['active ' + act.w + ' x ' + act.h + ' mm (derived)', d.display.diagIn + ' in, ' + d.display.resolution.join(' x ') + ', ' + d.display.ppi + ' ppi (spec)', 'check: pixel ' + ck.pixelPitchUm + ' um -> ' + ck.ppi + ' ppi; area ' + ck.areaCm2 + ' vs ' + ck.areaPublished + ' cm2', 'self-emissive subpixels: black pixels are off'], conf: ['derived', 'spec'] });
    if (d.id === 's26') lyr('privacy', 'Privacy Display layer', zTop - glassT - 0.2 - 0.15 - 0.1, 0.1, 23, mat('#0a0a0e', { roughness: 0.4, metalness: 0.3, map: gridTex('privacy') }), { title: 'Galaxy S26 Ultra Privacy Display', lines: ['Flex Magic Pixel: wide- and narrow-angle subpixels', 'multilayer black matrix steers light toward the user', 'resolution drops while it is on (Stuff)'], conf: ['spec', 'estimated'] }, true);
    lyr('tft', 'Backplane + substrate', zTop - glassT - 0.2 - 0.15 - 0.1 - (d.id === 's26' ? 0.1 : 0) - 0.2, 0.2, d.id === 's26' ? 17 : 20, mat('#14161d', { roughness: 0.45, metalness: 0.3, map: gridTex('tft') }), { title: d.name + ' backplane', lines: [DT.backplane, DT.refresh, 'flexible plastic substrate under the emissive layer', 'thickness: estimated'], conf: ['spec', 'estimated'] }, true);
    lyr('sheet', 'Graphite sheet + foam', zTop - 1.5 - 0.25 + 0.25 - 0.25, 0.25, 11, mat(isP ? '#a8905a' : '#3a3b40', { roughness: 0.7, metalness: 0.2 }), { title: d.name + ' graphite sheet', lines: [isP ? 'graphite / copper sheet covers the battery bay (official display-module photo)' : 'graphite pads and thermal paste (teardown)', 'thickness: estimated'], conf: isP ? ['measured', 'estimated'] : ['spec', 'estimated'] }, true);
  }
  D.forEach(buildDevice); F.finish();
  const ORDER = ['back', 'island', 'battery', 'frame', 'board', 'soc', 'extra', 'sheet', 'tft', 'privacy', 'oled', 'optics', 'glass'], SP = {};
  F.parts.forEach((p) => { SP[p.id] = 0.25 + (p.dev.id === 's25' ? 0 : 0.12) + Math.max(0, ORDER.indexOf(['audio', 'fp', 'haptic', 'vapor', 'spen', 'selfie', 'sub'].includes(p.kind) ? 'extra' : p.kind)) * 0.19; });
  const assembleFn = (t) => (id) => { const u = t - SP[id]; if (u < 0) return { k: 0, alpha: 0 }; return { k: E.outBack(ramp(u, 0, 1.15), 0.9), alpha: ramp(u, 0, 0.18) }; };
  const RANK = {}; F.parts.slice().sort((a, b) => Math.abs(a.explode.z) - Math.abs(b.explode.z)).forEach((p, i, arr) => { RANK[p.id] = i / (arr.length - 1); });
  const T_EXP = 5.2, T_IMP = 27.4;
  const explodeFn = (t) => (id) => { const r = RANK[id], up = ramp(t, T_EXP + r * 0.7, T_EXP + r * 0.7 + 1.9), dn = ramp(t, T_IMP + (1 - r) * 0.6, T_IMP + (1 - r) * 0.6 + 1.7); return E.outBack(up, 0.8) * (1 - E.smooth(dn)); };

  /* ------------------------------------------------------------ superposiciones 2D */
  function multi(s) {
    if (!s.multi || (s.focusA || 0) < 0.02) return; const c = MX.ctx;
    s.multi.forEach((m) => { const p = F.byId[m.id], i = p.info, lines = [i.title].concat(i.lines.slice(0, m.maxLines || 4)); MX.callout(F.anchor(m.id), m.at, lines, { alpha: s.focusA, size: 21, color: T.ink }); c.save(); c.globalAlpha = s.focusA; let x = m.at[0] + 10; const y = m.at[1] + lines.length * 25 + 16; [].concat(i.conf).forEach((k) => { x += H2.tag(c, x, y, k) + 6; }); c.restore(); });
  }
  function lensLabels(s) {
    if (!s.lens || (s.focusA || 0) < 0.02) return; const c = MX.ctx, d = D.find((q) => q.id === s.lens), p = F.byId[d.id + '.island']; st.scene.updateMatrixWorld(true);
    const pts = lensOf(d).map((l) => { const loc = new TH.Vector3(LX(d, l.cx), LY(d, l.cyTop), -d.layout.island.raise).applyMatrix4(p.group.matrixWorld); return { l, sx: MX.P(loc.x, loc.y, loc.z) }; }).sort((a, b) => a.sx[1] - b.sx[1] || a.sx[0] - b.sx[0]);
    pts.forEach(({ l, sx }, k) => {
      const cam = l.c, y = 290 + k * 128, x = 500;
      c.save(); c.globalAlpha = s.focusA; c.strokeStyle = T.ink; c.lineWidth = 1.4; c.beginPath(); c.moveTo(sx[0], sx[1]); c.lineTo(x - 16, y); c.lineTo(x, y); c.stroke(); c.beginPath(); c.arc(sx[0], sx[1], 6, 0, 6.2832); c.fillStyle = T.paper; c.fill(); c.stroke();
      c.fillStyle = 'rgba(248,247,242,0.95)'; c.fillRect(x, y - 30, 520, 110); c.strokeStyle = 'rgba(42,41,37,0.35)'; c.strokeRect(x, y - 30, 520, 110);
      MX.A = s.focusA; MX.text((l.small ? '(' + (l.cam + 1) + ') ' : '(' + (l.cam + 1) + ') ') + cam.name + '  f/' + cam.f, x + 12, y - 4, { size: 22, w: 700 }); MX.text('glass dia ' + f1(l.glassD) + ' mm (measured)', x + 12, y + 22, { size: 18, color: T.teal });
      MX.text('sensor ' + f2(cam.sensor.w) + ' x ' + f2(cam.sensor.h) + ' mm (derived)', x + 12, y + 44, { size: 18, color: T.ink }); MX.text('pupil dia ' + f2(cam.pupilMm) + ' mm' + (cam.equivDerived ? ' (focal from FOV)' : '') + ' (derived)', x + 12, y + 66, { size: 18, color: T.mute }); MX.A = 1; c.restore();
    });
    c.save(); c.globalAlpha = s.focusA; let x = 520; x += H2.tag(c, x, 252, 'measured') + 8; x += H2.tag(c, x, 252, 'derived') + 8; H2.tag(c, x, 252, 'spec'); c.restore();
  }
  // back structure of each device (seen from the back, to scale) with the measured dimensions
  function layoutPanel(a) {
    if (!H2.panel(a, 'Fig 6 - rear camera structure', 'Measured on official photos.', 'Seen from the back, same scale, +/-1.5 mm.')) return; const c = MX.ctx, S = 3.5;
    D.forEach((d, col) => {
      const L = d.layout, cxp = col ? 770 : 270, top = 490, w = d.body.w * S, h = d.body.h * S, x0 = cxp - w / 2, y0 = top;
      c.strokeStyle = T.ink; c.lineWidth = 2; const R = d.body.corner * S; c.beginPath(); c.moveTo(x0 + R, y0); c.arcTo(x0 + w, y0, x0 + w, y0 + h, R); c.arcTo(x0 + w, y0 + h, x0, y0 + h, R); c.arcTo(x0, y0 + h, x0, y0, R); c.arcTo(x0, y0, x0 + w, y0, R); c.closePath(); c.stroke();
      const isl = L.island, ix = x0 + (isl.cx - isl.w / 2) * S, iy = y0 + isl.top * S, iw = isl.w * S, ih = isl.h * S, ir = iw / 2;
      if (isl.shape !== 'rings') { c.fillStyle = col ? 'rgba(138,136,204,0.55)' : 'rgba(217,211,198,0.7)'; c.strokeStyle = T.teal; c.lineWidth = 2; c.beginPath(); c.moveTo(ix + ir, iy); c.arcTo(ix + iw, iy, ix + iw, iy + ih, ir); c.arcTo(ix + iw, iy + ih, ix, iy + ih, ir); c.arcTo(ix, iy + ih, ix, iy, ir); c.arcTo(ix, iy, ix + iw, iy, ir); c.closePath(); c.fill(); c.stroke(); }
      lensOf(d).forEach((l) => { const px = x0 + l.cx * S, py = y0 + l.cyTop * S, rr2 = l.glassD / 2 * S; if (isl.shape === 'rings') { c.beginPath(); c.arc(px, py, (l.glassD / 2 + isl.ringW) * S, 0, 6.2832); c.fillStyle = 'rgba(201,203,209,0.55)'; c.fill(); c.strokeStyle = T.teal; c.lineWidth = 2; c.stroke(); } c.beginPath(); c.arc(px, py, rr2, 0, 6.2832); c.fillStyle = '#0e0f12'; c.fill(); c.strokeStyle = '#c9ccd2'; c.lineWidth = 2.5; c.stroke(); c.beginPath(); c.arc(px, py, (l.c.pupilMm || 1.5) / 2 * S, 0, 6.2832); c.fillStyle = '#2f55a8'; c.fill(); c.fillStyle = T.paper; c.font = '700 14px ' + MX.MONO; c.textAlign = 'center'; c.fillText(String(l.cam + 1), px, py + 5); c.fillStyle = T.teal; c.font = '600 13px ' + MX.MONO; c.textAlign = l.small ? 'left' : 'right'; c.fillText('Ø' + f1(l.glassD), l.small ? px + rr2 + 4 : px - rr2 - 5, py - rr2 * 0.1); });
      L.extras.forEach((e) => { const px = x0 + e.cx * S, py = y0 + e.cyTop * S; c.fillStyle = e.k === 'flash' ? '#ffe9b8' : e.k === 'led' ? '#cfd1d6' : '#06060a'; c.strokeStyle = T.ink; c.lineWidth = 1.5; c.beginPath(); c.arc(px, py, e.d / 2 * S, 0, 6.2832); c.fill(); c.stroke(); c.fillStyle = T.ink; c.font = '400 13px ' + MX.MONO; c.textAlign = 'left'; c.fillText(e.k === 'laser' ? 'laser AF' : e.k, px + e.d / 2 * S + 5, py + 4); });
      c.fillStyle = T.teal; c.font = '600 13px ' + MX.MONO; c.textAlign = 'left'; if (isl.shape === 'rings') c.fillText('rings +' + isl.raise + ' mm', ix + iw + 6, iy + 12); else { c.fillText(isl.w + ' x ' + isl.h + ' mm', ix + iw + 6, iy + 12); c.fillText(isl.top + ' mm from top', ix + iw + 6, iy + 28); }
      c.fillStyle = T.ink; c.font = '700 22px ' + MX.MONO; c.textAlign = 'center'; c.fillText(d.name, cxp, y0 - 28);
      c.font = '400 15px ' + MX.MONO; c.fillStyle = T.mute; (col ? ['pill +' + isl.raise + ' mm, barrels +' + isl.barrel + ' mm more', '3 big lenses, 1 small, laser AF, flash', 'matte glass, SAMSUNG below'] : ['5 rings +' + isl.raise + ' mm, titanium', '3 big lenses, 2 small, flash between', 'glass, SAMSUNG below']).forEach((q, i) => c.fillText(q, cxp, y0 + h + 26 + i * 22));
    });
    c.fillStyle = T.mute; c.font = '400 16px ' + MX.MONO; c.textAlign = 'left'; c.fillText('Photos: GSMArena renders. Numbers in circles = camera list order; which opening is which is estimated.', 86, 1296); H2.endPanel();
  }
  // interior: there is no legible photo of either one, so no boards or cells are drawn: only what is published, with its tag
  function interiorPanel(a) {
    if (!H2.panel(a, 'Fig 6 - inside', 'What changed inside.', 'Only what is published. No interior photo of either phone was readable, so nothing is drawn.')) return; const c = MX.ctx;
    const rows = [
      ['Vapor chamber', '40% larger than the S24 Ultra (Samsung claim)', '"largest yet": about 15% larger than the S25 Ultra (teardown)', 'spec'],
      ['Battery', '5000 mAh, 45 W wired, 15 W wireless', '5000 mAh, 60 W wired, 25 W wireless', 'spec'],
      ['S Pen', 'no Bluetooth (teardown coverage)', 'sealed slot at the bottom, front-left (official photos)', 'spec'],
      ['Battery fixing', 'four pull tabs (iFixit); another teardown disagrees', 'not published', 'spec'],
      ['Cameras', 'modular: one lens can be replaced alone (iFixit coverage)', 'not published', 'spec'],
      ['Repairability', '5 of 10 (iFixit)', 'not scored', 'spec'],
      ['Board and cell layout', 'not drawn', 'not drawn', 'estimated'],
    ];
    const X = [86, 330, 690], WW = 330, y0 = 500;
    MX.A = a; MX.text('S25 Ultra', X[1], y0 - 64, { size: 22, w: 700, font: MX.SANS, color: T.ember }); MX.text('S26 Ultra', X[2], y0 - 64, { size: 22, w: 700, font: MX.SANS, color: T.teal });
    let y = y0;
    rows.forEach((r) => {
      c.save(); c.globalAlpha = a; c.strokeStyle = T.line; c.beginPath(); c.moveTo(86, y - 34); c.lineTo(1000, y - 34); c.stroke();
      c.font = '700 19px ' + MX.SANS; c.fillStyle = T.ink; c.textAlign = 'left'; c.fillText(r[0], X[0], y); c.restore();
      let hmax = 0;
      [1, 2].forEach((k) => { c.save(); c.globalAlpha = a; c.font = '400 19px ' + MX.SANS; c.fillStyle = r[k] === 'not drawn' || r[k] === 'not published' || r[k] === 'not scored' ? T.mute : T.ink; c.textAlign = 'left'; const n0 = wrapLines(c, r[k], WW); n0.forEach((ln, j) => c.fillText(ln, X[k], y + j * 24)); hmax = Math.max(hmax, n0.length); c.restore(); });
      c.save(); c.globalAlpha = a; H2.tag(c, X[0], y + 30, r[3]); c.restore();
      y += Math.max(2, hmax) * 24 + 42;
    });
    MX.A = a; MX.text('Sources: Android Central (iFixit teardown), GSMArena teardown coverage, Samsung.', 86, 1296, { size: 16, color: T.mute }); H2.endPanel();
  }
  function wrapLines(c, text, wmax) { const words = String(text).split(' '), out = []; let line = ''; words.forEach((w2) => { const t2 = line ? line + ' ' + w2 : w2; if (c.measureText(t2).width > wmax && line) { out.push(line); line = w2; } else line = t2; }); out.push(line); return out; }
  function displayPanel(a) {
    if (!H2.panel(a, 'Fig 6 - display technology', 'Same panel family. One new layer.', 'Each subpixel emits its own light, so a black pixel is simply off.')) return; const c = MX.ctx;
    D.forEach((d, col) => {
      const x0 = col ? 560 : 70, DT = d.displayTech; c.fillStyle = T.ink; c.font = '700 23px ' + MX.MONO; c.textAlign = 'left'; c.fillText(d.name, x0, 470);
      const layers = [['cover glass', '#cfe3e8'], ['adhesive + touch + polarizer', '#aab0bd'], d.id === 's26' ? ['Privacy layer', '#4a5a90'] : null, ['OLED emissive layer', '#e8590c'], [DT.backplane.split(' ')[0] + ' backplane + substrate', '#2b3556'], ['graphite sheet + foam', '#55565c']].filter(Boolean);
      layers.forEach((q, i) => { const y = 490 + i * 34; c.fillStyle = q[1]; c.fillRect(x0, y, 150, 26); c.strokeStyle = T.ink; c.lineWidth = 1; c.strokeRect(x0, y, 150, 26); c.fillStyle = T.ink; c.font = '400 15px ' + MX.MONO; c.fillText(q[0], x0 + 162, y + 18); });
      const rows = d.id === 's25' ? [['panel', 'Dynamic LTPO AMOLED 2X, 6.9", 1440 x 3120, ~498 ppi'], ['backplane', 'LTPO: variable refresh, 120 Hz max (spec type)'], ['privacy', 'none: the Privacy layer is new in the S26 Ultra'], ['coating', 'DX anti-reflective (GSMArena)'], ['HDR', 'HDR10+'], ['brightness', '2600 nits peak'], ['glass', 'Gorilla Armor 2, flat']] : [['panel', 'Dynamic LTPO AMOLED 2X, 6.9", 1440 x 3120, ~500 ppi'], ['backplane', 'LTPO: variable refresh, 120 Hz max (spec type)'], ['privacy', 'Flex Magic Pixel: wide + narrow-angle subpixels, multilayer black matrix'], ['coating', 'DX anti-reflective (GSMArena)'], ['HDR', 'HDR10+'], ['brightness', '2600 nits peak'], ['glass', 'Gorilla Armor 2, flat']];
      rows.forEach((r, i) => { const y = 770 + i * 74; c.fillStyle = T.mute; c.font = '400 16px ' + MX.MONO; c.fillText(r[0], x0, y); c.fillStyle = T.ink; c.font = '600 18px ' + MX.MONO; wrap(c, r[1], x0, y + 22, 440, 21); });
    });
    c.fillStyle = T.mute; c.font = '400 16px ' + MX.MONO; c.textAlign = 'left'; c.fillText('Layer thicknesses and order are not published: typical OLED stack (estimated).', 86, 1296); H2.endPanel();
  }
  function sensorsPanel(a) {
    if (!H2.panel(a, 'Fig 6 - cameras to scale', 'Sensors and pupils, same scale.', 'Sensor = MP x pixel size (cross-checked with the optical format). Pupil = focal / f-number.')) return; const c = MX.ctx, S = 19;
    D.forEach((d, col) => {
      const x0 = col ? 560 : 70; c.fillStyle = T.ink; c.font = '700 24px ' + MX.MONO; c.textAlign = 'left'; c.fillText(d.name, x0, 470); let y = 500;
      [...d.cameras, d.selfie].forEach((cam) => {
        const sw = cam.sensor.w * S, sh = cam.sensor.h * S, pr = cam.pupilMm ? cam.pupilMm * S / 2 : 0, rowH = Math.max(sh, 2 * pr);
        c.fillStyle = '#1a2540'; c.fillRect(x0, y, sw, sh); c.strokeStyle = T.teal; c.lineWidth = 2; c.strokeRect(x0, y, sw, sh);
        if (pr) { c.beginPath(); c.arc(x0 + 285, y + rowH / 2, pr, 0, 6.2832); c.fillStyle = '#2f4f8f'; c.fill(); c.strokeStyle = T.ink; c.lineWidth = 1.5; c.stroke(); }
        c.fillStyle = T.ink; c.font = '700 18px ' + MX.MONO; c.fillText(cam.name, x0, y + rowH + 20); c.font = '400 16px ' + MX.MONO; c.fillStyle = T.mute;
        c.fillText(f2(cam.sensor.w) + ' x ' + f2(cam.sensor.h) + ' mm' + (cam.pupilMm ? '  pupil ' + f2(cam.pupilMm) : '  (no focal published)'), x0, y + rowH + 40); y += rowH + 62;
      });
    });
    c.fillStyle = T.mute; c.font = '400 17px ' + MX.MONO; c.fillText('scale: 19 px per mm. dark rectangle = sensor, blue circle = entrance pupil (mm).', 86, 1296); H2.endPanel();
  }
  function wrap(c, text, x, y, wmax, lh) { const words = String(text).split(' '); let line = '', yy = y; words.forEach((w2) => { const t2 = line ? line + ' ' + w2 : w2; if (c.measureText(t2).width > wmax && line) { c.fillText(line, x, yy); line = w2; yy += lh; } else line = t2; }); c.fillText(line, x, yy); }
  function cpuBars(c, x0, y0, cpu, ghzMax, hpx) {
    const col = [T.ember, T.teal, T.mute]; let x = x0; cpu.forEach((cl, i) => { for (let k = 0; k < cl.n; k++) { const h = cl.ghz / ghzMax * hpx; c.fillStyle = col[i % 3]; c.fillRect(x, y0 - h, 22, h); x += 26; } x += 14; });
    cpu.forEach((cl, i) => { const y = y0 + 28 + i * 24; c.fillStyle = col[i % 3]; c.fillRect(x0, y - 13, 14, 14); c.fillStyle = T.ink; c.font = '600 17px ' + MX.MONO; c.textAlign = 'left'; c.fillText(cl.n + 'x ' + cl.core.replace(/Oryon V\d /, '') + '  ' + cl.ghz.toFixed(2) + ' GHz', x0 + 22, y); });
  }
  function processorPanel(a) {
    if (!H2.panel(a, 'Fig 6 - processors', 'Same 8 cores, one generation apart.', 'Each bar is one CPU core; height = max clock (spec).')) return; const c = MX.ctx;
    D.forEach((d, col) => {
      const x0 = col ? 560 : 70, s = d.soc; c.fillStyle = T.ink; c.font = '700 25px ' + MX.MONO; c.textAlign = 'left'; c.fillText(s.name.replace(' for Galaxy', ''), x0, 470); c.fillStyle = T.mute; c.font = '400 20px ' + MX.MONO; c.fillText(s.node + ', ' + s.cpu.reduce((q, z) => q + z.n, 0) + ' cores', x0, 500);
      cpuBars(c, x0, 740, s.cpu, 4.8, 200);
      const rows = [['GPU', s.gpu], ['NPU', s.npu], ['RAM', s.ram], ['storage', s.storage], ['radio', d.id === 's25' ? 'Wi-Fi 7, BT 5.4, UWB, NFC' : 'Wi-Fi 7, BT 6.0, UWB, NFC'], ['port', d.extras.find((e) => e.startsWith('USB')).replace(', DisplayPort 1.2', ' + DP 1.2')]];
      rows.forEach((r, i) => { const y = 872 + i * 64; c.fillStyle = T.mute; c.font = '400 17px ' + MX.MONO; c.fillText(r[0], x0, y); c.fillStyle = T.ink; c.font = '600 19px ' + MX.MONO; wrap(c, r[1], x0, y + 24, 440, 22); });
    });
    c.fillStyle = T.mute; c.font = '400 17px ' + MX.MONO; c.textAlign = 'left'; c.fillText('Package sizes are estimated: no photo gives them.', 86, 1296); H2.endPanel();
  }
  function comparePanel(a) {
    if (!H2.panel(a, 'Fig 6 - same scale, side by side', 'Same box. Different details.')) return; const c = MX.ctx, S = 3.6, cx2 = 230, cy2 = 760;
    D.forEach((d, i) => { const w = d.body.w * S, h = d.body.h * S, x = cx2 - w / 2, y = cy2 - h / 2, r = d.body.corner * S; c.strokeStyle = i ? T.teal : T.ember; c.lineWidth = 3; c.setLineDash(i ? [] : [10, 6]); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.stroke(); c.setLineDash([]); });
    c.fillStyle = T.ember; c.font = '700 20px ' + MX.MONO; c.textAlign = 'center'; c.fillText('Galaxy S25 Ultra  (corner ' + D[0].body.corner + ' mm)', cx2, cy2 + 82 * S + 34); c.fillStyle = T.teal; c.fillText('Galaxy S26 Ultra  (corner ' + D[1].body.corner + ' mm)', cx2, cy2 + 82 * S + 60);
    const [p, g] = D, rows = [['', 'S25 Ultra', 'S26 Ultra'], ['height x width', p.body.h + ' x ' + p.body.w, g.body.h + ' x ' + g.body.w], ['thickness', p.body.t + ' mm', g.body.t + ' mm'], ['weight', p.body.weightG + ' g', g.body.weightG + ' g'], ['frame', 'titanium', 'aluminum'], ['corner radius', p.body.corner + ' mm', g.body.corner + ' mm'], ['display', p.display.diagIn + '" ' + p.display.ppi + ' ppi', g.display.diagIn + '" ' + g.display.ppi + ' ppi'], ['peak nits', p.display.peakNits, g.display.peakNits], ['privacy layer', 'no', 'yes'], ['SoC', 'SD 8 Elite', 'SD 8 Elite Gen 5'], ['main lens', 'f/' + p.cameras[0].f, 'f/' + g.cameras[0].f], ['periscope pupil', f1(p.cameras[3].pupilMm) + ' mm f/' + p.cameras[3].f, f1(g.cameras[3].pupilMm) + ' mm f/' + g.cameras[3].f], ['rear cameras', '5 rings +' + p.layout.island.raise + ' mm', 'pill +' + g.layout.island.raise + ' mm'], ['charging', '45 W', '60 W'], ['wireless', '15 W', '25 W']];
    rows.forEach((r, i) => { const y = 470 + i * 50; if (i) { c.strokeStyle = 'rgba(42,41,37,0.15)'; c.beginPath(); c.moveTo(430, y - 28); c.lineTo(1000, y - 28); c.stroke(); } c.textAlign = 'left'; c.fillStyle = T.mute; c.font = (i ? '400 19px ' : '700 19px ') + MX.MONO; if (i) c.fillText(r[0], 430, y); c.fillStyle = i ? T.ember : T.mute; c.font = '700 20px ' + MX.MONO; c.fillText(String(r[1]), 640, y); c.fillStyle = i ? T.teal : T.mute; c.fillText(String(r[2]), 830, y); });
    c.font = '400 18px ' + MX.MONO; c.fillStyle = T.mute; c.textAlign = 'left'; c.fillText('S26 Ultra is ' + (g.body.h - p.body.h).toFixed(1) + ' mm taller, ' + (g.body.w - p.body.w).toFixed(1) + ' mm wider, ' + (p.body.t - g.body.t).toFixed(1) + ' mm thinner and ' + (p.body.weightG - g.body.weightG) + ' g lighter (spec).', 86, 1262); H2.endPanel();
  }
  function outro(a) {
    if (!H2.panel(a, 'Fig 6 - what the model proves', 'Four kinds of number.')) return; const c = MX.ctx;
    [['spec', 'size, weight, display, battery, SoC, memory, sensors, apertures', 'published by the makers and reviewed hands-on'], ['measured', 'lens glass, lens rings / pill, flash, buttons, corners', 'measured on official photos, +/-1.5 mm (scale from the published body size)'], ['derived', 'screen area, sensor sizes, entrance pupils', 'formula + cross-check: ppi ' + D.map((d) => d.display.check.ppi + ' vs ' + d.display.ppi).join(', ') + '; sensors within 0.8%'], ['estimated', 'both interiors, thicknesses, chip packages, which opening is which', 'nobody publishes it: dashed in the model']].forEach((r, i) => { const y = 480 + i * 140; c.save(); H2.tag(c, 86, y - 24, r[0]); c.restore(); MX.text(r[1], 86, y + 28, { size: 22, w: 600, color: r[0] === 'estimated' ? T.ember : T.ink }); MX.text(r[2], 86, y + 64, { size: 19, color: T.mute }); });
    MX.text('Sources: gsmarena.com (specs, renders), techradar.com, androidcentral.com,', 86, 1100, { size: 19, color: T.mute }); MX.text('samsung.com/uk, sammobile.com, phonearena.com', 86, 1128, { size: 19, color: T.mute }); MX.text('Built with mechanism', 86, 1210, { size: 34, w: 600, font: MX.SANS }); H2.endPanel();
  }
  F.overlay((ctx, s) => { lensLabels(s); multi(s); layoutPanel(s.pLay || 0); interiorPanel(s.pInt || 0); sensorsPanel(s.pCam || 0); displayPanel(s.pDisp || 0); processorPanel(s.pCpu || 0); comparePanel(s.pCmp || 0); outro(s.pOut || 0); });

  /* ------------------------------------------------------------ guion */
  const BASE = { yaw: 24, pitch: 8, zoom: 4.7, tx: 0, ty: 0, tz: 0, cx: 540, cy: 690 }, EXPL = Object.assign({}, BASE, { yaw: 48, pitch: 14, zoom: 2.9 });
  D.forEach((d) => { assemblies[d.id].position.x = X0[d.id] * 1.55; }); st.scene.updateMatrixWorld(true);
  const TOUR = [
    { ts: 7.6, tl: 3.2, set: ['s25.oled', 's26.oled'], view: Object.assign(F.shot(['s25.oled', 's26.oled'], { yaw: 40, pitch: 14, zoom: 4.4, cy: 520 }), { dof: 1.0 }), multi: [{ id: 's25.oled', at: [40, 900], maxLines: 4 }, { id: 's26.oled', at: [560, 900], maxLines: 4 }], snd: 'display' },
    { ts: 11.0, tl: 2.9, focus: 's26.privacy', view: Object.assign(F.shot('s26.privacy', { yaw: 34, pitch: 16, zoom: 6.2, cy: 640 }), { dof: 1.4 }), snd: 'privacy' },
    { ts: 14.1, tl: 3.4, set: ['s25.soc', 's25.board', 's25.haptic'], view: Object.assign(F.shot(['s25.soc', 's25.board'], { yaw: 38, pitch: 28, zoom: 6.0, cy: 560 }), { dof: 1.0 }), multi: [{ id: 's25.soc', at: [40, 900], maxLines: 5 }, { id: 's25.board', at: [560, 960], maxLines: 3 }], snd: 'soc' },
    { ts: 17.7, tl: 2.9, set: ['s26.soc', 's26.vapor', 's26.board'], view: Object.assign(F.shot(['s26.soc', 's26.vapor'], { yaw: 38, pitch: 28, zoom: 5.6, cy: 560 }), { dof: 1.0 }), multi: [{ id: 's26.soc', at: [40, 900], maxLines: 4 }, { id: 's26.vapor', at: [560, 960], maxLines: 3 }], snd: 'soc2' },
    { ts: 20.8, tl: 2.7, set: ['s25.island'], lens: 's25', view: Object.assign(F.shot('s25.island', { yaw: 150, pitch: 8, zoom: 7.6, cx: 300, cy: 560 }), { dof: 2.0 }), snd: 'lens' },
    { ts: 23.7, tl: 3.2, set: ['s26.island'], lens: 's26', view: Object.assign(F.shot('s26.island', { yaw: 152, pitch: 8, zoom: 6.4, cx: 300, cy: 560 }), { dof: 2.2 }), snd: 'lens' },
  ];
  D.forEach((d) => { assemblies[d.id].position.x = X0[d.id]; }); st.scene.updateMatrixWorld(true);
  const KEYS = [[0, Object.assign({}, BASE, { yaw: 30 })], [4.6, Object.assign({}, BASE, { yaw: 22 })], [T_EXP + 2.2, EXPL],
    ...TOUR.flatMap((q) => [[q.ts - 0.05, q.view, [0.7, 0, 0.15, 1]], [q.ts + q.tl - 0.25, Object.assign({}, q.view, { yaw: q.view.yaw + (q.view.yaw > 90 ? -9 : 9), zoom: q.view.zoom * 1.06 }), [0.25, 0.1, 0.5, 1]]]),
    [T_IMP, EXPL], [T_IMP + 2.4, Object.assign({}, BASE, { yaw: 14, pitch: 4 })], [T_IMP + 5.0, Object.assign({}, BASE, { yaw: 0, pitch: 0, zoom: 5.0 })], [DUR, Object.assign({}, BASE, { yaw: 0, pitch: 0, zoom: 5.0 })]];
  const fadeIO = (t, a, b, f = 0.25) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
  const P_ = { lay: [33.0, 38.0], int: [38.2, 43.6], cam: [43.8, 48.6], disp: [48.8, 54.4], cpu: [54.6, 59.4], cmp: [59.6, 63.2], out: [63.0, DUR] };
  function scripted(t) {
    let tour = null, focusA = 0; TOUR.forEach((q) => { const f = fadeIO(t, q.ts - 0.35, q.ts + q.tl, 0.45); if (f > 0) { tour = q; focusA = f; } });
    const flip = E.io3(ramp(t, T_IMP + 2.0, T_IMP + 4.6)) * (1 - E.io3(ramp(t, 38.2, 39.2)));
    const pan = (k) => ramp(t, P_[k][0], P_[k][0] + 0.3) * (1 - ramp(t, P_[k][1] - 0.3, P_[k][1]));
    const e = E.io3(ramp(t, T_EXP, T_EXP + 3)) * (1 - E.io3(ramp(t, T_IMP, T_IMP + 2)));
    return { e, dimTo: 0.012, explodeK: explodeFn(t), light: { az: -34 + 26 * Math.sin(t * 0.42), el: 56 + 6 * Math.sin(t * 0.31 + 1) }, flip, focus: tour && tour.focus ? tour.focus : null, focusSet: tour && tour.set ? tour.set : null, focusA, lens: tour && tour.lens, multi: tour && tour.multi, assemble: assembleFn(t), infoAt: [64, 1010],
      pLay: pan('lay'), pInt: pan('int'), pCam: pan('cam'), pDisp: pan('disp'), pCpu: pan('cpu'), pCmp: pan('cmp'), pOut: ramp(t, P_.out[0], P_.out[0] + 0.8),
      hint: t < 4.6 ? 'ASSEMBLING' : t < T_IMP ? (e > 0.5 ? 'EXPLODED VIEW' : '') : t < 33 ? 'BACK' : '' };
  }

  /* ------------------------------------------------------------ sound: material, size and position of each part; each device with its own palette */
  const MATOF = { s25: { back: 'glass', island: 'steel', battery: 'pouch', frame: 'steel', board: 'pcb', soc: 'ceramic', audio: 'plastic', vapor: 'aluminum', spen: 'steel', fp: 'ceramic', selfie: 'ceramic', glass: 'glass', optics: 'plastic', oled: 'glass', tft: 'pcb', sheet: 'rubber' }, s26: { back: 'glass', island: 'steel', battery: 'pouch', frame: 'aluminum', board: 'pcb', soc: 'ceramic', audio: 'plastic', vapor: 'aluminum', spen: 'steel', fp: 'ceramic', selfie: 'ceramic', glass: 'glass', optics: 'plastic', oled: 'glass', privacy: 'plastic', tft: 'pcb', sheet: 'rubber' } };
  const PAN = { s25: -0.62, s26: 0.62 }, SCALE = { s25: { root: 50, mode: 'mixolydian' }, s26: { root: 54, mode: 'lydian' } };
  function audio() {
    const ev = [], S_note = (id, idx) => SND.note(SCALE[id].root + 12, SCALE[id].mode, idx);
    F.parts.forEach((p) => {
      const m = MATOF[p.dev.id][p.kind] || 'plastic', size = SIZE[p.id] || 20, big = size > 60, pan = PAN[p.dev.id] + (MX.hash(p.id.length, p.id.charCodeAt(5) || 3) - 0.5) * 0.25;
      ev.push({ t: SP[p.id] + 0.62, v: 'impact', mat: m, size: Math.max(3, size * (m === 'glass' || m === 'aluminum' ? 0.5 : 1)), vel: p.kind === 'frame' ? 0.9 : 0.6, hard: m === 'glass' ? 0.3 : 0.6, pan, ring: big ? 1 : 0.8, thump: big ? 80 : 0, send: 0.5 });
      if (p.kind === 'soc') ev.push({ t: SP[p.id] + 0.7, v: 'blip', f: S_note(p.dev.id, 7), pan, gain: 0.8 });
      if (p.kind === 'island') ev.push({ t: SP[p.id] + 0.78, v: 'click', f: 3200, pan, gain: 0.6 });
    });
    ev.push({ t: T_EXP - 0.15, v: 'whoosh', d: 1.5, f0: 220, f1: 3400, pan: -0.3, gain: 0.8, skew: 0.8 }, { t: T_EXP + 1.9, v: 'boom', gain: 0.8 });
    F.parts.forEach((p) => { const r = RANK[p.id]; ev.push({ t: T_EXP + 0.7 + r * 0.7, v: 'click', f: 1800 + r * 2200, pan: PAN[p.dev.id], gain: 0.28, sharp: 0.5 }); });
    ev.push({ t: T_IMP - 0.15, v: 'whoosh', d: 1.5, f0: 3400, f1: 240, pan: 0.3, gain: 0.8 }, { t: T_IMP + 2.0, v: 'boom', gain: 0.9 }, { t: T_IMP + 2.1, v: 'whoosh', d: 2.0, f0: 300, f1: 2600, pan: 0, gain: 0.7 });
    TOUR.forEach((q, qi) => {
      const t0 = q.ts;
      if (q.snd === 'display') { for (let k = 0; k < 6; k++) ev.push({ t: t0 + 0.2 + k * 0.1, v: 'tone', f: SND.note(62, 'major', k * 2), timbre: 'bell', d: 1.3, gain: 0.5, pan: -0.5 + k * 0.2 }); ev.push({ t: t0 + 0.1, v: 'charge', d: 1.0, f0: 300, f1: 1400, gain: 0.5 }); }
      if (q.snd === 'privacy') { for (let k = 0; k < 8; k++) ev.push({ t: t0 + 0.3 + k * 0.07, v: 'blip', f: 1800 - k * 90, gain: 0.8, pan: 0.5, fm: 0.4 }); ev.push({ t: t0 + 0.2, v: 'whoosh', d: 0.6, f0: 2400, f1: 500, pan: 0.5, gain: 0.5, q: 3 }); }
      if (q.snd === 'soc' || q.snd === 'soc2') { const id = q.snd === 'soc' ? 's25' : 's26'; D.find((x) => x.id === id).soc.cpu.forEach((cl, i) => { for (let n = 0; n < Math.min(cl.n, 4); n++) ev.push({ t: t0 + 0.4 + i * 0.3 + n * 0.06, v: 'tone', f: SND.note(SCALE[id].root + 12, SCALE[id].mode, Math.round(cl.ghz * 3.2) + n), timbre: 'marimba', d: 0.5, gain: 0.55, pan: PAN[id] }); }); ev.push({ t: t0 + 0.1, v: 'blip', f: 900, gain: 0.9, pan: PAN[id] }); }
      if (q.snd === 'lens') { const pn = q.lens === 's25' ? -0.4 : 0.4; ev.push({ t: t0 + 0.2, v: 'servo', d: 0.95, f0: 85, ticks: 7, pan: pn, gain: 0.9 }, { t: t0 + 1.4, v: 'servo', d: 0.7, f0: 130, ticks: 5, pan: pn, gain: 0.8 }); lensOf(D.find((x) => x.id === q.lens)).forEach((l, k) => ev.push({ t: t0 + 0.3 + k * 0.4, v: 'impact', mat: 'steel', size: l.glassD, vel: 0.4, pan: pn, ring: 0.6 })); if (q.lens === 's25') for (let k = 0; k < 4; k++) ev.push({ t: t0 + 1.9 + k * 0.1, v: 'blip', f: 900 * Math.pow(1.19, k * 3), gain: 0.5, pan: -0.4, fm: 1.4 }); }
      ev.push({ t: t0, v: 'tone', f: SND.note(57, 'major', qi * 2), timbre: 'bell', d: 1.4, gain: 0.5, pan: 0 });
    });
    ev.push({ t: P_.lay[0] + 0.1, v: 'whoosh', d: 0.8, f0: 400, f1: 2800, pan: -0.5, gain: 0.5 });
    D.forEach((d) => lensOf(d).forEach((l, k) => ev.push({ t: P_.lay[0] + 0.9 + (d.id === 's26' ? 1.9 : 0) + k * 0.28, v: 'impact', mat: 'steel', size: l.glassD, vel: 0.45, pan: PAN[d.id], hard: 0.4, ring: 0.7 })));
    ['battery', 'board', 'socPad', 'can', 'motor', 'speaker', 'subboard'].forEach((k, i) => ev.push({ t: P_.int[0] + 0.6 + i * 0.32, v: 'impact', mat: ['pouch', 'pcb', 'ceramic', 'aluminum', 'aluminum', 'plastic', 'pcb'][i], size: [60, 40, 18, 14, 15, 18, 20][i], vel: 0.5, pan: -0.5, send: 0.6 }));
    [...D[0].cameras, D[0].selfie].forEach((c, k) => ev.push({ t: P_.cam[0] + 0.5 + k * 0.45, v: 'tone', f: SND.note(62, 'pent', Math.round(14 - c.sensor.diagMm)), timbre: 'bell', d: 0.9, gain: 0.5, pan: -0.6 }));
    [...D[1].cameras, D[1].selfie].forEach((c, k) => ev.push({ t: P_.cam[0] + 1.4 + k * 0.4, v: 'tone', f: SND.note(66, 'pent', Math.round(14 - c.sensor.diagMm)), timbre: 'bell', d: 0.9, gain: 0.5, pan: 0.6 }));
    for (let k = 0; k < 7; k++) ev.push({ t: P_.disp[0] + 0.8 + k * 0.5, v: 'blip', f: 700 + k * 110, gain: 0.5, pan: k % 2 ? 0.4 : -0.4, fm: 0.5 });
    ev.push({ t: P_.cpu[0] + 0.5, v: 'charge', d: 1.4, f0: 200, f1: 1500, gain: 0.6 });
    for (let k = 0; k < 8; k++) ev.push({ t: P_.cmp[0] + 0.7 + k * 0.28, v: 'click', f: 2000 + k * 160, gain: 0.35, pan: (k - 3.5) * 0.12 });
    ev.push({ t: P_.out[0] + 0.1, v: 'boom', gain: 0.8 }, { t: P_.out[0] + 0.2, v: 'tone', f: SND.note(62, 'lydian', 4), timbre: 'bell', d: 3.5, ring: 2, gain: 0.7 }, { t: P_.out[0] + 0.5, v: 'tone', f: SND.note(62, 'lydian', 9), timbre: 'bell', d: 3, ring: 2, gain: 0.5 });
    return SND.render({ duration: DUR, seed: 41, events: ev, bed: { bpm: 100, root: 50, mode: 'lydian', level: 0.7, prog: [0, 4, 5, 3], curve: [[0, 0.25], [7, 0.4], [33, 0.7], [39, 0.45], [58, 0.7], [DUR, 0.3]] }, room: { size: 1.25, wet: 0.24, fb: 0.8 } });
  }

  if (F.isExplore()) {
    const ex = { only: null, flip: 0, flipT: 0 };
    F.explore({ views: [['ISO', BASE], ['FRONT', Object.assign({}, BASE, { yaw: 0, pitch: 0, zoom: 5 })], ['SIDE', Object.assign({}, BASE, { yaw: 90, pitch: 0, zoom: 5 })]], home: BASE, assemble: assembleFn,
      toggles: [{ label: 'S25', get: () => ex.only === 's25', set: (v) => { ex.only = v ? 's25' : null; } }, { label: 'S26', get: () => ex.only === 's26', set: (v) => { ex.only = v ? 's26' : null; } }, { label: 'FLIP', get: () => ex.flipT === 1, set: (v) => { ex.flipT = v ? 1 : 0; } }],
      reset: () => { ex.only = null; ex.flipT = 0; }, extra: () => { ex.flip += (ex.flipT - ex.flip) * 0.1; return { flip: E.sm(ex.flip), vis: (p) => !ex.only || p.dev.id === ex.only }; } });
  } else F.run({ duration: DUR, keys: KEYS, script: scripted, audio, poster: 14 });
})();
