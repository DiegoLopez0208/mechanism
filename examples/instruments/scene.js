/*
 * scene.js - Fig 4: foto de catalogo de instrumental -> contornos medidos -> placas 3D con la foto como textura.
 * Lo que sale de UNA foto sin referencia de escala: formas, huecos (anillos), proporciones de cada pieza. NO milimetros, NO espesor, NO tamanos reales
 * entre piezas (los catalogos escalan cada pieza para llenar su lugar). El video lo dice y marca cada dato como MEASURED / DERIVED / GUESS / ESTIMATED.
 */
(function () {
  'use strict';
  const I = INSTR, TH = THREE, G = MX.gl, T = MX.THEME, E = MX.E, clamp = MX.clamp, lerp = MX.lerp, ramp = MX.ramp;
  const W = 1080, H = 1350, FPS = 30, DUR = 33, K = 0.25, IW = I.image.w * K, IH = I.image.h * K, THICK = 2.2;
  const st = G.stage({ w: W, h: H, shadow: 0.12, floorY: -9, key: [-22, 200, 40], bloom: 0.0, envIntensity: 0.4 });
  st.key.shadow.camera.left = -90; st.key.shadow.camera.right = 90; st.key.shadow.camera.top = 90; st.key.shadow.camera.bottom = -90; st.key.shadow.camera.updateProjectionMatrix();
  MX.P = (x, y, z) => st.project(x, y, z);
  const CONF = { measured: 'MEASURED', derived: 'DERIVED', guess: 'GUESS', estimated: 'ESTIMATED' }, CCOL = { measured: T.teal, derived: T.ink, guess: '#8a5cf6', estimated: T.ember };
  const P2 = (px, py) => [px * K, (I.image.h - py) * K];            // pixel de la foto -> unidades del plano (y hacia arriba)
  const LEVEL = { probe: 0, grasp: 14, cut: 28, retract: 42 }, CATN = { probe: 'probing / elevating', grasp: 'grasping / clamping', cut: 'cutting', retract: 'retracting' };

  /* ------------------------------------------------------------ placas: contorno real extruido, la foto como cara superior */
  const photo = new TH.TextureLoader().load(I.photo); photo.repeat.set(1 / IW, 1 / IH); photo.offset.set(0, 0); photo.anisotropy = 8; photo.colorSpace = TH.SRGBColorSpace;
  const shapeOf = (sh) => { const s = new TH.Shape(sh.poly.map((p) => new TH.Vector2(...P2(p[0], p[1])))); sh.holes.forEach((h) => s.holes.push(new TH.Path(h.map((p) => new TH.Vector2(...P2(p[0], p[1])))))); return s; };
  const items = I.items.map((it) => {
    const g = new TH.Group(); it.shapes.forEach((sh) => { const geo = new TH.ExtrudeGeometry(shapeOf(sh), { depth: THICK, bevelEnabled: false, curveSegments: 1 }); geo.rotateX(-Math.PI / 2); const m = new TH.Mesh(geo, [new TH.MeshBasicMaterial({ map: photo }), G.mat('#b9bcc2', { metalness: 0.9, roughness: 0.35 })]); m.userData.pid = it.id; g.add(m); });
    st.scene.add(g); G.shadows(g, true, true);
    return Object.assign({ g }, it, { ctr: [it.center[0] * K, (I.image.h - it.center[1]) * K] });
  });
  const hitMeshes = []; items.forEach((it) => it.g.traverse((m) => { if (m.isMesh) hitMeshes.push(m); }));
  const byId = Object.fromEntries(items.map((t) => [t.id, t]));
  const hiLines = {};
  items.forEach((it) => { const pts = it.shapes[0].poly.map((p) => { const q = P2(p[0], p[1]); return new TH.Vector3(q[0], THICK + 0.05, -q[1]); }); const l = new TH.LineLoop(new TH.BufferGeometry().setFromPoints(pts), new TH.LineBasicMaterial({ color: '#e8590c' })); l.visible = false; it.g.add(l); hiLines[it.id] = l; });

  /* ------------------------------------------------------------ estado -> escena */
  function applyState(s) {
    items.forEach((it) => {
      const ext = E.out3(s.extrude), z = LEVEL[it.cat] * s.e;
      it.g.scale.y = Math.max(0.001, ext); it.g.position.y = z;
      const dim = !!s.focus && s.focus !== it.id, f = dim ? lerp(1, 0.18, s.focusA) : 1;
      it.g.traverse((m) => { if (m.isMesh) m.material.forEach((q) => { const tr = f < 0.99; if (q.transparent !== tr) { q.transparent = tr; q.needsUpdate = true; } q.opacity = f; q.depthWrite = !tr; }); });
      hiLines[it.id].visible = !!(s.focus === it.id && s.focusA > 0.2);
      it.g.visible = s.vis ? s.vis(it) : true;
    });
    st.floor.material.opacity = 0.12 * clamp(s.extrude * 1.6, 0, 1);       // la primera toma debe verse igual que la foto: sin sombras
    st.setView(s.view); st.render();
  }

  /* ------------------------------------------------------------ superposicion 2D */
  const tag = (c, x, y, conf) => { c.font = '700 17px ' + MX.MONO; const s = CONF[conf], w = c.measureText(s).width + 16; c.fillStyle = CCOL[conf]; c.fillRect(x, y - 16, w, 24); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(s, x + 8, y + 1); return w; };
  function contours(a, upTo) {
    if (a <= 0.01) return; const c = MX.ctx; c.save(); c.globalAlpha = a; c.lineJoin = 'round'; c.lineWidth = 2.2; c.strokeStyle = T.ember;
    items.forEach((it, i) => {
      const k = clamp(upTo * items.length - i, 0, 1); if (k <= 0) return;
      it.shapes.forEach((sh) => {
        const pts = sh.poly.map((p) => { const q = P2(p[0], p[1]); return MX.P(q[0], q[1], 0); }), n = Math.max(2, Math.floor(pts.length * k));
        c.beginPath(); pts.slice(0, n).forEach((q, j) => (j ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); if (k >= 1) c.closePath(); c.stroke();
        sh.holes.forEach((h) => { c.beginPath(); h.forEach((p, j) => { const q = P2(p[0], p[1]), r = MX.P(q[0], q[1], 0); j ? c.lineTo(r[0], r[1]) : c.moveTo(r[0], r[1]); }); c.closePath(); c.setLineDash([4, 3]); c.stroke(); c.setLineDash([]); });
      });
      if (k >= 1) { const q = MX.P(it.ctr[0], it.ctr[1], 0); c.beginPath(); c.arc(q[0], q[1], 12, 0, 6.2832); c.fillStyle = T.ink; c.fill(); c.fillStyle = T.paper; c.font = '700 14px ' + MX.MONO; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(it.id), q[0], q[1] + 1); }
    });
    c.restore();
  }
  function catLabels(a) {
    if (a <= 0.01) return; const c = MX.ctx; c.save(); c.globalAlpha = a; c.textBaseline = 'middle';
    Object.keys(LEVEL).forEach((k) => { const p = MX.P(IW + 4, 0, LEVEL[k] + THICK), y = p[1]; c.strokeStyle = T.ink; c.lineWidth = 1.4; c.beginPath(); c.moveTo(p[0] - 10, y); c.lineTo(p[0] + 14, y); c.stroke(); c.fillStyle = T.ink; c.font = '700 21px ' + MX.MONO; c.textAlign = 'left'; c.fillText(CATN[k], p[0] + 20, y - 8); c.fillStyle = '#8a5cf6'; c.font = '400 17px ' + MX.MONO; c.fillText('GUESS: grouped by eye', p[0] + 20, y + 14); });
    c.restore();
  }
  function infoBox(s) {
    const it = byId[s.focus]; if (!it || s.focusA < 0.02) return; const c = MX.ctx, at = s.infoAt || [64, 1010], asp = (it.length_px / it.width_px).toFixed(1);
    const lines = [it.id + '  ' + it.name, 'outline: ' + it.length_px + ' x ' + it.width_px + ' px   (L/W ' + asp + ')', it.rings + ' finger ring' + (it.rings === 1 ? '' : 's') + (it.note ? '  -  ' + it.note : ''), 'no scale in the photo: no millimetres'];
    MX.callout([it.ctr[0], it.ctr[1], LEVEL[it.cat] * s.e + THICK], at, lines, { alpha: s.focusA, size: 25, color: T.ink });
    c.save(); c.globalAlpha = s.focusA; let x = at[0] + 10; const y = at[1] + lines.length * 29 + 18; x += tag(c, x, y, 'measured') + 8; x += tag(c, x, y, 'derived') + 8; tag(c, x, y, 'guess'); c.restore();
  }
  function table(a) {
    if (a <= 0.01) return; const c = MX.ctx; c.save(); c.globalAlpha = a; c.fillStyle = T.paper; c.fillRect(34, 216, W - 68, H - 250); MX.A = a;
    MX.text('Fig 4 - what one photo gives you', 86, 288, { size: 24, color: T.mute, spacing: 1 }); MX.text('Shapes yes. Millimetres no.', 86, 360, { size: 48, font: MX.SANS, w: 600 });
    const rows = [['measured', 'outline of each instrument', 'traced from the pixels'], ['measured', 'finger rings, jaws, handles', 'holes found in each outline'], ['derived', 'length / width of each shape', 'in photo pixels, not mm'], ['guess', 'what each instrument is', 'read by eye, not verified'], ['estimated', 'thickness of the 3D plates', 'one photo shows no depth']];
    rows.forEach((r, i) => { const y = 500 + i * 116; c.save(); tag(c, 86, y - 22, r[0]); c.restore(); MX.text(r[1], 86, y + 30, { size: 30, w: 600 }); MX.text(r[2], 86, y + 66, { size: 23, color: T.mute }); });
    MX.A = 1; c.restore();
  }
  function cannot(a) {
    if (a <= 0.01) return; const c = MX.ctx; c.save(); c.globalAlpha = a; c.fillStyle = T.paper; c.fillRect(34, 216, W - 68, H - 250); MX.A = a;
    MX.text('Fig 4 - what it cannot give', 86, 288, { size: 24, color: T.mute, spacing: 1 }); MX.text('No scale, no truth about size.', 86, 360, { size: 46, font: MX.SANS, w: 600 });
    MX.text('The 18 outlines span only 137 to 188 px.', 86, 450, { size: 28, w: 600, color: T.ember });
    MX.text('A catalog collage scales every piece to fill its slot,', 86, 494, { size: 24, color: T.mute }); MX.text('so even the ratios between instruments are not real.', 86, 526, { size: 24, color: T.mute });
    MX.text('To get millimetres, add one of these:', 86, 640, { size: 30, w: 600 });
    [['a coin, card or ruler in the picture', 'one known length gives mm per pixel'], ['the exact model number', 'the maker datasheet gives the real drawing'], ['one measured instrument', 'e.g. 20.0 cm tip to tip: scale = 200 mm / px length']].forEach((r, i) => { const y = 720 + i * 120; c.fillStyle = T.teal; c.fillRect(86, y - 22, 6, 62); MX.text(r[0], 108, y + 4, { size: 28, w: 600, color: T.teal }); MX.text(r[1], 108, y + 40, { size: 22, color: T.mute }); });
    MX.text('Then the same pipeline gives a measured model.', 86, 1130, { size: 26, w: 600 }); MX.text('Built with mechanism', 86, 1210, { size: 34, w: 600, font: MX.SANS }); MX.A = 1; c.restore();
  }
  function frame(ctx, s) {
    applyState(s);
    MX.card(W, H, { fig: 'Fig 4', kicker: 'ONE PHOTO - NO SCALE', title: 'Surgical instruments: photo to model', sub: s.sub || 'Outlines measured from the pixels. Sizes stay in photo pixels.', hint: s.hint || '', readout: s.readout || '18 instruments - 1 photo' });
    st.blit(ctx); contours(s.contours || 0, s.draw == null ? 1 : s.draw); catLabels(s.cats || 0); infoBox(s); table(s.table || 0); cannot(s.cannot || 0); if (s.ui) s.ui(ctx);
  }

  /* ------------------------------------------------------------ guion */
  const TOP = { yaw: 0, pitch: 90, zoom: 9.0, tx: IW / 2, ty: IH / 2, tz: 0, cx: 540, cy: 690 }, ISO = { yaw: 30, pitch: 38, zoom: 6.6, tx: IW / 2, ty: IH / 2, tz: 6, cx: 540, cy: 720 }, EXP = { yaw: 42, pitch: 24, zoom: 6.0, tx: IW / 2, ty: IH / 2, tz: 20, cx: 520, cy: 760 };
  const stop = (id, yaw, pitch, zoom) => { const it = byId[id]; return { yaw, pitch, zoom, tx: it.ctr[0], ty: it.ctr[1], tz: LEVEL[it.cat], cx: 540, cy: 560 }; };
  const TOUR = [[12, 11.4], [9, 13.7], [18, 16.0], [7, 18.3]], TL = 2.2;
  const KEYS = [[0, TOP], [5.2, TOP], [8.2, ISO], [11.2, EXP], ...TOUR.flatMap(([id, ts]) => [[ts - 0.05, stop(id, 36, 40, 17)], [ts + TL - 0.2, stop(id, 44, 40, 18)]]), [20.2, EXP], [22.6, TOP], [DUR, TOP]];
  function camAt(t) { let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++; const [t0, a] = KEYS[i], [t1, b] = KEYS[i + 1], u = E.io3(clamp((t - t0) / (t1 - t0), 0, 1)), L = (k) => lerp(a[k], b[k], u); return { yaw: L('yaw'), pitch: L('pitch'), zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), u)), tx: L('tx'), ty: L('ty'), tz: L('tz'), cx: L('cx'), cy: L('cy') }; }
  const fadeIO = (t, a, b, f = 0.25) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
  function scripted(t) {
    const e = E.io3(ramp(t, 11.0, 13.2)) * (1 - E.io3(ramp(t, 20.0, 22.2)));
    let focus = null, focusA = 0; TOUR.forEach(([id, ts]) => { const f = fadeIO(t, ts, ts + TL); if (f > 0) { focus = id; focusA = f; } });
    return { e, extrude: ramp(t, 5.4, 7.6), focus, focusA, view: camAt(t), contours: fadeIO(t, 2.2, 5.6, 0.4), draw: ramp(t, 2.4, 4.8),
      cats: ramp(t, 13.4, 14.0) * (1 - ramp(t, 19.6, 20.0)) * (focus ? 0 : 1), table: ramp(t, 23.2, 23.8) * (1 - ramp(t, 27.6, 28.2)), cannot: ramp(t, 28.0, 28.6),
      infoAt: [64, 1010], hint: t < 2.2 ? 'THE PHOTO' : t < 5.4 ? 'SEGMENTATION: 18 OBJECTS' : t < 8.2 ? 'EXTRUDING THE OUTLINES' : t < 20 ? (e > 0.5 ? 'GROUPED BY EYE' : '') : '' };
  }
  function cues() {
    const q = []; for (let i = 0; i < items.length; i++) q.push({ t: 2.4 + (i / items.length) * 2.4, kind: 'beep', f: 600 + (i % 6) * 70, v: 0.35 });
    q.push({ t: 5.4, kind: 'whoosh', d: 1.4, v: 0.8 }, { t: 7.2, kind: 'clunk', v: 0.7 }, { t: 11.0, kind: 'whoosh', d: 1.4, v: 0.8 }, { t: 12.8, kind: 'clack', v: 0.8 }, { t: 20.0, kind: 'whoosh', d: 1.4, v: 0.8 }, { t: 22.0, kind: 'clunk', v: 0.6 }, { t: 22.6, kind: 'whoosh', d: 1.2, v: 0.6 });
    TOUR.forEach(([id, ts], i) => q.push({ t: ts, kind: 'ping', f: 520 + i * 110, v: 0.9 })); for (let k = 0; k < 5; k++) q.push({ t: 23.6 + k * 0.7, kind: 'ping', f: 760 + k * 60, v: 0.45 });
    q.push({ t: 28.1, kind: 'pad', d: 4, v: 0.9 }); return q;
  }

  /* ------------------------------------------------------------ modo ?explore */
  function explore() {
    const cv = document.getElementById('c'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d'); MX.ctx = ctx;
    const S = { e: 0, eT: 0, ex: 0, view: Object.assign({}, TOP), goal: Object.assign({}, ISO), sel: null, hov: null, drag: null, outlines: false };
    const SL = { x0: 230, x1: 520, y: 1152 }, VB = [['TOP', TOP], ['ISO', ISO], ['EXPLODED', EXP]];
    const btn = (x, y, w, label, on) => ({ x, y, w, h: 44, label, on });
    const btns = () => [...VB.map(([n], i) => btn(560 + i * 150, 1130, 140, n, false)), btn(78, 1196, 200, S.outlines ? 'OUTLINES ON' : 'OUTLINES OFF', S.outlines), btn(300, 1196, 140, 'RESET', false)];
    const pos = (ev) => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * W, (ev.clientY - r.top) / r.height * H]; };
    const rc = new TH.Raycaster();
    const pick = (p) => { rc.setFromCamera(new TH.Vector2(p[0] / W * 2 - 1, -(p[1] / H) * 2 + 1), st.camera); const hit = rc.intersectObjects(hitMeshes, false)[0]; return hit ? hit.object.userData.pid : null; };
    const hitBtn = (p) => btns().find((b) => p[0] > b.x && p[0] < b.x + b.w && p[1] > b.y && p[1] < b.y + b.h);
    cv.addEventListener('pointerdown', (ev) => { const p = pos(ev); cv.setPointerCapture(ev.pointerId); const b = hitBtn(p); if (Math.abs(p[1] - SL.y) < 30 && p[0] > SL.x0 - 20 && p[0] < SL.x1 + 20) { S.drag = { slider: true }; S.eT = clamp((p[0] - SL.x0) / (SL.x1 - SL.x0), 0, 1); return; } if (b) { const vi = VB.findIndex(([n]) => n === b.label); if (vi >= 0) S.goal = Object.assign({}, VB[vi][1]); else if (b.label.startsWith('OUTL')) S.outlines = !S.outlines; else if (b.label === 'RESET') { S.eT = 0; S.sel = null; S.goal = Object.assign({}, ISO); } return; } S.drag = { x: p[0], y: p[1], moved: 0 }; });
    cv.addEventListener('pointermove', (ev) => { const p = pos(ev); if (S.drag && S.drag.slider) { S.eT = clamp((p[0] - SL.x0) / (SL.x1 - SL.x0), 0, 1); return; } if (S.drag) { const dx = p[0] - S.drag.x, dy = p[1] - S.drag.y; S.drag.x = p[0]; S.drag.y = p[1]; S.drag.moved += Math.abs(dx) + Math.abs(dy); S.view.yaw -= dx * 0.35; S.view.pitch = clamp(S.view.pitch + dy * 0.3, 5, 90); S.goal = null; return; } S.hov = pick(p); });
    cv.addEventListener('pointerup', (ev) => { const d = S.drag; S.drag = null; if (d && !d.slider && d.moved < 6) { const h = pick(pos(ev)); S.sel = h && h !== S.sel ? h : null; } });
    cv.addEventListener('wheel', (ev) => { ev.preventDefault(); S.view.zoom = clamp(S.view.zoom * Math.exp(-ev.deltaY * 0.0012), 3, 40); S.goal = null; }, { passive: false });
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const k = 1 - Math.exp(-dt * 7); S.e += (S.eT - S.e) * k; S.ex += (1 - S.ex) * (1 - Math.exp(-dt * 2.5));
      if (S.goal) ['yaw', 'pitch', 'zoom', 'tx', 'ty', 'tz', 'cx', 'cy'].forEach((q) => { if (S.goal[q] != null) S.view[q] += (S.goal[q] - S.view[q]) * k; });
      const focus = S.sel || S.hov;
      const s = { e: E.sm(S.e), extrude: S.ex, focus, focusA: focus ? 1 : 0, view: S.view, contours: S.outlines ? 1 : 0, draw: 1, cats: S.e > 0.6 ? 1 : 0, infoAt: [64, 250], hint: 'DRAG TO ORBIT - WHEEL TO ZOOM - TAP AN INSTRUMENT', readout: 'EXPLODE ' + Math.round(S.e * 100) + '%',
        ui: (c) => { MX.text('EXPLODE', 78, SL.y + 8, { size: 22, color: T.mute, spacing: 1.5 }); c.save(); c.strokeStyle = 'rgba(42,41,37,0.4)'; c.lineWidth = 3; c.beginPath(); c.moveTo(SL.x0, SL.y); c.lineTo(SL.x1, SL.y); c.stroke(); c.strokeStyle = T.ember; c.beginPath(); c.moveTo(SL.x0, SL.y); c.lineTo(SL.x0 + (SL.x1 - SL.x0) * S.eT, SL.y); c.stroke(); c.beginPath(); c.arc(SL.x0 + (SL.x1 - SL.x0) * S.eT, SL.y, 13, 0, 6.2832); c.fillStyle = T.paper; c.fill(); c.stroke();
          btns().forEach((b) => { c.fillStyle = b.on ? T.ink : T.paper; c.fillRect(b.x, b.y, b.w, b.h); c.strokeStyle = T.ink; c.lineWidth = 1.5; c.strokeRect(b.x, b.y, b.w, b.h); MX.text(b.label, b.x + b.w / 2, b.y + 29, { size: 19, align: 'center', w: 600, spacing: 1, color: b.on ? T.paper : T.ink }); }); c.restore(); } };
      frame(ctx, s); requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  if (new URLSearchParams(location.search).has('explore')) explore();
  else MX.run({ w: W, h: H, fps: FPS, duration: DUR, poster: 12, draw: (ctx, t) => frame(ctx, scripted(t)), audio: () => MX.audio.render({ duration: DUR, cues: cues(), reverb: 0.2 }) });
})();
