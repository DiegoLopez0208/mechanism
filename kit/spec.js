/*
 * kit/spec.js - compila un SPEC declarativo (ver kit/spec-core.js) a una figura completa: piezas parametricas, cinematica en vivo, camara,
 * luz, paneles de evidencia, sonido y video. Agregar un objeto nuevo es escribir datos, no escena.
 *
 *   MX.spec.run(SPEC)    -> en el navegador: video guionado (?render=1 desde scripts/render.mjs) o visor interactivo (?explore)
 * Parametros de URL: ?explore  ?theme=night|paper  ?aspect=4:5|9:16|1:1
 * El director arma solo: armado escalonado, modos de marcha con su relacion medida en el modelo contra la publicada, explosionado, recorrido por
 * pieza con su ficha, plegado, tabla de relaciones, tabla de evidencia (con fuente) y cierre con las fuentes.
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {}), S = (MX.spec = MX.spec || {}), TH = g.THREE, G = MX.gl, P = MX.parts, T = MX.THEME, E = MX.E, clamp = MX.clamp, lerp = MX.lerp, ramp = MX.ramp, SND = MX.sound, TAU = Math.PI * 2;
  const SIZES = { '4:5': [1080, 1350], '9:16': [1080, 1920], '1:1': [1080, 1080] };
  const v3 = (a) => new TH.Vector3(a[0], a[1], a[2]);
  const CONFNAME = { spec: 'SPEC', measured: 'MEASURED', derived: 'DERIVED', estimated: 'ESTIMATED' };

  /* ------------------------------------------------------------ integrador: el angulo de cada cuerpo sale de integrar velocidades, no de sacar cuentas por tiempo */
  // asi un cambio de modo es continuo: lo unico que cambia es cual cuerpo recibe la velocidad del conductor
  function Integrator(an, rpm) { this.K = an.K; this.rpm = rpm || 30; this.th = { free: 0, driver: 0, shell: 0 }; }
  Integrator.prototype.step = function (dt, mode, speed) {
    const w = TAU * this.rpm / 60 * speed, X = mode ? this.K.rates[mode.driver] : 1, wf = Math.abs(X) > 1e-9 ? w / X : 0;
    this.th.free += wf * dt; this.th.driver += w * dt; this.th.shell += (!mode || mode.shell === 'driver' ? w : this.K.rates[mode.shell] * wf) * dt;
  };
  Integrator.prototype.ang = function (body) { if (body === 'driver') return this.th.driver; if (body === 'shell') return this.th.shell; const r = this.K.rates[body]; return r == null ? 0 : r * this.th.free; };

  // tabla precalculada para el video (cualquier t, cuadro por cuadro, sin acumular error)
  function Timeline(an, rpm, dur, modeAt, speedAt) {
    const dt = 1 / 120, n = Math.ceil(dur / dt) + 2, it = new Integrator(an, rpm), free = new Float64Array(n), drv = new Float64Array(n), shl = new Float64Array(n);
    for (let i = 0; i < n; i++) { free[i] = it.th.free; drv[i] = it.th.driver; shl[i] = it.th.shell; const t = i * dt; it.step(dt, modeAt(t), speedAt(t)); }
    const at = (arr, t) => { const x = clamp(t / dt, 0, n - 2), i = Math.floor(x); return lerp(arr[i], arr[i + 1], x - i); };
    this.dt = dt; this.n = n; this.free = free; this.view = (t) => ({ ang: (body) => (body === 'driver' ? at(drv, t) : body === 'shell' ? at(shl, t) : an.K.rates[body] == null ? 0 : an.K.rates[body] * at(free, t)) });
  }

  /* ------------------------------------------------------------ ficha automatica */
  function autoInfo(d, ud) {
    const L = [], u = ud || {};
    if (u.kind === 'gear' || u.kind === 'ring') L.push(u.z + ' teeth, module ' + d.p.m + ' mm', 'pitch diameter ' + (2 * u.rp).toFixed(1) + ' mm');
    else if (u.kind === 'sprocket') L.push(u.teeth + ' teeth, pitch ' + u.pitch + ' mm', 'pitch diameter ' + (2 * u.rp).toFixed(1) + ' mm');
    else if (u.kind === 'shaft') L.push('diameter ' + (2 * d.p.r).toFixed(1) + ' mm, length ' + d.p.len + ' mm');
    else if (u.kind === 'bearing') L.push('bore ' + (2 * d.p.ri).toFixed(1) + ' mm, outer ' + (2 * d.p.ro).toFixed(1) + ' mm');
    else if (u.kind === 'tube') L.push('outer ' + (2 * d.p.ro).toFixed(1) + ' mm, wall ' + (d.p.ro - d.p.ri).toFixed(1) + ' mm');
    return { title: d.name || d.id, lines: L, conf: [d.conf] };
  }

  /* ------------------------------------------------------------ texto en paneles */
  const mctx = document.createElement('canvas').getContext('2d');
  function wrap(text, font, maxW) {
    mctx.font = font; const words = String(text).split(' '), lines = []; let cur = '';
    words.forEach((w) => { const t = cur ? cur + ' ' + w : w; if (mctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }

  S.run = (spec) => {
    const q = new URLSearchParams(location.search), asp = q.get('aspect') || spec.aspect || '4:5', [W, H] = SIZES[asp] || SIZES['4:5'], FPS = 30;
    const V = S.validate(spec), an = V.analysis, explore = q.has('explore');
    V.errors.forEach((e) => console.error('SPEC: ' + e)); V.warnings.forEach((w) => console.warn('SPEC: ' + w));
    if (V.errors.length && !explore) { document.title = 'SPEC ERROR'; throw new Error('el spec no pasa la validacion:\n' + V.errors.join('\n')); }
    const M = spec.mechanism || null, drive = (M && M.drive) || { modes: [], rpm: 30 }, modes = drive.modes || [], dir = spec.director || {}, PRESS = !!(M && M.press), ENIG = !!(M && M.enigma), UP = spec.up === 'z', ORI = spec.orient || (UP ? [-90, 0, 0] : null);
    const claims = (spec.research && spec.research.claims) || [], sources = (spec.research && spec.research.sources) || [], claimBy = Object.fromEntries(claims.map((c) => [c.id, c]));

    /* ---------------------------------------------------------- figura y piezas */
    let beforeHook = null;
    const F = MX.figure({ beforeRender: (s) => { if (beforeHook) beforeHook(s); }, w: W, h: H, axes: 'three', fps: FPS, stage: Object.assign({ shadow: 0.14, floorY: spec.up === 'z' ? -0.3 : -70 }, spec.stage || {}),
      card: (s) => ({ fig: spec.fig || 'Fig 1', kicker: spec.kicker, title: spec.title, sub: s.sub || spec.sub, hint: s.hint || '', readout: s.readout || (F.parts.length + ' parts') }) });
    const st = F.st, H2 = F.hud, byBodyPhi = an.phi || {};
    // Enigma: el cableado que se dibuja en cada rotor sale de la MISMA tabla que usa la simulacion
    const ENC = ENIG ? M.enigma : null, EN = ENIG ? MX.enigma : null;
    function roleCfg(role) {
      if (!ENIG || !role) return {};
      if (role === 'R' || role === 'M' || role === 'L') { const nm = ENC.rotors[{ L: 0, M: 1, R: 2 }[role]]; return { kind: 'rotor', wiring: EN.WIRING[nm], notch: EN.NOTCH[nm] }; }
      if (role === 'UKW') return { kind: 'reflector', wiring: EN.REFLECTOR[ENC.reflector] };
      return { kind: 'etw' };
    }
    const root = new TH.Group(); if (ORI) root.rotation.set(ORI[0] * Math.PI / 180, ORI[1] * Math.PI / 180, ORI[2] * Math.PI / 180); st.scene.add(root);          // up: 'z' -> el eje z del spec queda vertical
    spec.parts.forEach((d, i) => {
      const grp = P[d.kind](Object.assign({}, d.p, { mat: d.mat }, roleCfg(d.role))), base = v3(S.startPos(d)); grp.userData.spec = d;
      grp.traverse((m) => { if (m.isMesh || m.isLine) m.material = Array.isArray(m.material) ? m.material.map((q) => q.clone()) : m.material.clone(); });      // material propio por pieza: la atenuacion de una no puede tocar a las demas
      const part = F.add({ id: d.id, group: grp, base, explode: v3(d.explode || [0, 0, 0]), from: new TH.Vector3(0, 0, 90), conf: d.conf, est: d.conf === 'estimated' && d.kind !== 'pin', info: d.info || autoInfo(d, grp.userData), spec: d, body: d.body || null });
      part.arc = new TH.Vector3(0, 14, 0); part.spin = new TH.Vector3(0, 0, (MX.hash(i, 7) - 0.5) * 3.2); part.name = d.name || d.id;
      const phi = d.body && byBodyPhi[d.body] != null && S.teethOf(d) ? byBodyPhi[d.body] : 0;
      part.pose = (s, p) => {
        const m = s.mech, pr = m && m.press ? m.press : 0;
        if (d.slide) p.group.position[d.slide.axis || 'z'] += d.slide.k * pr;
        if (d.compress) p.group.scale.z = Math.max(0.12, 1 - pr / d.compress.free);
        if (!m) { p.group.rotation.z += phi; return; }
        if (d.orbit) { const c = m.ang(d.orbit.around || 'carrier'), a = d.orbit.a0 * Math.PI / 180 + c; p.group.position.x += d.orbit.center[0] + d.orbit.r * Math.cos(a) - p.base.x; p.group.position.y += d.orbit.center[1] + d.orbit.r * Math.sin(a) - p.base.y; }
        p.group.rotation.z += phi + (d.body ? m.ang(d.body) : 0);
      };
      root.add(grp);
    });
    F.finish();
    const parts = F.parts, key = st.key;
    st.scene.updateMatrixWorld(true); const wbox = new TH.Box3(); parts.forEach((p) => wbox.expandByObject(p.group)); const ctr = wbox.getCenter(new TH.Vector3());      // centro del objeto armado, en ejes del mundo

    /* ---------------------------------------------------------- vistas */
    let rxy = 10, zMin = 1e9, zMax = -1e9, zMinA = 1e9, zMaxA = -1e9;
    parts.forEach((p) => { rxy = Math.max(rxy, Math.hypot(p.base.x, p.base.y) + Math.max(p.size.x, p.size.y) / 2); zMin = Math.min(zMin, p.base.z - p.size.z / 2 + Math.min(0, p.explode.z)); zMax = Math.max(zMax, p.base.z + p.size.z / 2 + Math.max(0, p.explode.z)); zMinA = Math.min(zMinA, p.base.z - p.size.z / 2); zMaxA = Math.max(zMaxA, p.base.z + p.size.z / 2); });
    const D = rxy * 2, zExt = Math.max(1, zMax - zMin), zf = W * 0.7 / (ORI ? Math.max(D, (zMaxA - zMinA) * 0.9) : D) * (asp === '9:16' ? 1.22 : 1), cy = H * (asp === '9:16' ? 0.5 : 0.48), zc = (zMin + zMax) / 2, shExt = Math.max(rxy * 2.5, zExt * 0.9);
    ['left', 'bottom'].forEach((k) => { key.shadow.camera[k] = -shExt; }); ['right', 'top'].forEach((k) => { key.shadow.camera[k] = shExt; }); key.shadow.camera.updateProjectionMatrix();
    st.floor.scale.setScalar(Math.max(0.1, Math.max(D, zExt) * 5 / 1200));      // el plano de sombra sigue el tamano del objeto (si no, su borde lejano sale de la luz y se ve una franja gris)
    st.ao.updateGtaoMaterial({ radius: D * 0.088, thickness: D * 0.05 }); parts.forEach((p) => { p.from.set(0, 0, D * 1.1); p.arc.set(0, D * 0.18, 0); });      // todo escala con el objeto: un switch de 16 mm y un buje de 80 mm
    const mk = (yaw, pitch, zoom, o) => Object.assign({ yaw, pitch, zoom, tx: ctr.x, ty: ctr.y, tz: ctr.z, cx: W / 2, cy, dof: 0 }, o || {});
    const VW = { front: mk(0, 0, zf * 0.92), iso: mk(-34, 22, zf * (ORI ? 0.85 : 0.7)), side: mk(-72, 14, zf * (ORI ? 0.95 : 0.6)), expl: mk(-50, 18, W * 0.8 / (ORI ? Math.max(D, zExt) * 1.2 : D * 0.62 + zExt * 0.8)), three: mk(-18, 40, zf * (ORI ? 0.85 : 0.72)) };
    Object.keys(dir.views || {}).forEach((k) => { VW[k] = Object.assign({}, VW[k] || VW.iso, dir.views[k]); });      // las vistas del spec se mezclan sobre las de fabrica
    const shot = (id, o) => { const p = parts.find((x) => x.id === id), dim = Math.max(p.size.x, p.size.y, p.size.z * 0.6); return Object.assign(F.shot(id, { yaw: o.yaw, pitch: o.pitch, zoom: clamp(W * 0.46 / dim, 3.5, 140), e: 1, cy: cy - 40 }), { dof: o.dof == null ? 0.5 : o.dof }); };

    /* ---------------------------------------------------------- plan del video */
    const order = parts.slice().sort((a, b) => a.base.z - b.base.z || parts.indexOf(a) - parts.indexOf(b)), N = order.length, step = Math.min(0.3, 6.2 / N), arrive = {};
    order.forEach((p, i) => { arrive[p.id] = 0.9 + i * step; });
    const ASM_END = 0.9 + (N - 1) * step + 1.1, MD = dir.modeDur || 4.6, TD = dir.tourDur || 3.3, tM0 = ASM_END + 0.3, KD = dir.keyDur || 1.35, runs = an.enigmaRuns || [];
    const mD = modes.map((m, k) => (ENIG ? 1.1 + (runs[k] ? runs[k].events.length : 1) * KD + 0.6 : MD)), mS = []; { let acc = tM0; mD.forEach((d) => { mS.push(acc); acc += d; }); }
    const tMend = tM0 + mD.reduce((s2, d) => s2 + d, 0), tE0 = tMend + (modes.length ? 0.2 : 0.4), ED = 2.8, tT0 = tE0 + ED + 0.4;
    const tourIds = (dir.tour || parts.filter((p) => p.spec.tour !== false && p.info && !p.spec.decor).sort((a, b) => (a.base.z + a.explode.z) - (b.base.z + b.explode.z)).map((p) => p.id));
    const tR0 = tT0 + tourIds.length * TD, RD = 2.6, tP0 = tR0 + RD + 0.3, PD = 5.4;
    // paginado de la tabla de evidencia (se mide con la misma tipografia con que se dibuja)
    const CW = W - 86 * 2 - 188, FONT = '400 23px ' + MX.SANS, pages = [];
    { let cur = [], used = 0; const room = H - 216 - 34 - 290;
      claims.forEach((c) => { const lines = wrap(c.text + (c.cross ? '  Cross-check: ' + c.cross : c.why ? '  ' + c.why : ''), FONT, CW), h = lines.length * 29 + 54; if (used + h > room && cur.length) { pages.push(cur); cur = []; used = 0; } cur.push({ c, lines, h }); used += h; });
      if (cur.length) pages.push(cur); }
    const panels = []; let tp = tP0;
    if (modes.length) { panels.push({ kind: 'ratios', t0: tp, t1: tp + PD }); tp += PD; }
    if (PRESS && M.press.force) { panels.push({ kind: 'curve', t0: tp, t1: tp + PD + 1.6 }); tp += PD + 1.6; }
    pages.forEach((pg, i) => { panels.push({ kind: 'claims', page: i, rows: pg, t0: tp, t1: tp + PD + 0.6 }); tp += PD + 0.6; });
    panels.push({ kind: 'sources', t0: tp, t1: tp + 5 }); tp += 5;
    const DUR = Math.ceil(tp * 2) / 2;

    // velocidad del conductor: parado mientras se arma, vivo en los modos (con un bache en cada cambio), lento en el recorrido
    const sk = [[0, 0], [tM0, 0], [tM0 + 0.9, 1]];
    modes.forEach((m, k) => { if (k) { const tb = mS[k]; sk.push([tb - 0.45, 1], [tb, 0.08], [tb + 0.55, 1]); } });
    sk.push([tE0 - 0.3, 1], [tE0 + 0.8, 0.4], [tR0, 0.4], [tR0 + 1.2, 0.7], [DUR, 0.3]);
    const speedAt = (t) => { let i = 0; while (i < sk.length - 2 && t >= sk[i + 1][0]) i++; const [t0, a] = sk[i], [t1, b] = sk[i + 1]; return lerp(a, b, E.sm(clamp((t - t0) / Math.max(1e-6, t1 - t0), 0, 1))); };
    const modeIdx = (t) => { if (!modes.length) return -1; let k = 0; while (k < modes.length - 1 && t >= mS[k + 1] - 1e-6) k++; return k; };
    const modeAt = (t) => (modes.length ? modes[modeIdx(t)] : null);
    const TL = an.K ? new Timeline(an, drive.rpm, DUR, modeAt, speedAt) : null;
    // mecanismo de presion: el recorrido x (mm) de cada fase va de from a to con arranque y frenado suaves
    const pressAt = (t) => { if (!PRESS || !modes.length) return 0; if (t < tM0) return modes[0].from; const k = modeIdx(t), m = modes[k]; return lerp(m.from, m.to, E.sm(ramp(t - mS[k], 0.15, mD[k] - 0.35))); };
    const enig = ENIG ? makeEnigma() : null;
    const mechAt = (t) => (ENIG ? enig.mech(t) : TL ? Object.assign(TL.view(t), { press: pressAt(t) }) : { ang: () => 0, press: pressAt(t) });

    // camara por claves
    const keys = [[0, Object.assign({}, VW.iso, { zoom: VW.iso.zoom * 0.5, yaw: -62, pitch: 30 })], [ASM_END, VW.iso, [0.3, 0, 0.2, 1]]];
    const cyc = [VW.front, VW.iso, VW.side, VW.three];
    modes.forEach((m, k) => { const t = mS[k]; keys.push([t + 0.5, Object.assign({}, k % 2 ? cyc[k % 4] : cyc[(k + 1) % 4]), [0.45, 0, 0.2, 1]]); keys.push([t + mD[k] - 0.2, Object.assign({}, cyc[(k + 2) % 4], { yaw: cyc[(k + 2) % 4].yaw + 8 })]); });
    keys.push([tE0 + ED, VW.expl, [0.4, 0, 0.15, 1]]);
    const YP = [[-38, 20], [-20, 12], [-58, 26], [-30, 8], [-48, 30]];
    tourIds.forEach((id, j) => { const ts = tT0 + j * TD, [y, p] = YP[j % YP.length]; keys.push([ts + 0.3, shot(id, { yaw: y, pitch: p }), [0.5, 0, 0.15, 1]]); keys.push([ts + TD - 0.1, shot(id, { yaw: y + 9, pitch: p - 3, dof: 0.8 }), [0.2, 0, 0.8, 1]]); });
    keys.push([tR0 + RD, Object.assign({}, VW.iso, { zoom: VW.iso.zoom * 0.88 }), [0.4, 0, 0.2, 1]], [DUR, Object.assign({}, VW.iso, { zoom: VW.iso.zoom * 0.8, yaw: -26 })]);
    keys.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < keys.length; i++) if (keys[i][0] <= keys[i - 1][0]) keys[i][0] = keys[i - 1][0] + 0.01;

    const stag = {}; order.slice().sort((a, b) => (a.explode.length() - b.explode.length())).forEach((p, i) => { stag[p.id] = i / Math.max(1, N - 1); });
    const tourAt = (t) => { const j = Math.floor((t - tT0) / TD); if (j < 0 || j >= tourIds.length) return null; const ts = tT0 + j * TD, a = Math.min(ramp(t, ts + 0.25, ts + 0.7), 1 - ramp(t, ts + TD - 0.4, ts + TD)); return { id: tourIds[j], a, j }; };
    const cutSet = Object.fromEntries(parts.filter((p) => p.spec.cutaway).map((p) => [p.id, true]));   // piezas que se vuelven casi transparentes mientras corre el mecanismo (vista de corte)
    const script = (t) => {
      const cut = ramp(t, tM0 - 0.3, tM0 + 0.5) * (1 - ramp(t, tE0 - 0.6, tE0 - 0.1)), ex = ramp(t, tE0, tE0 + ED), re = ramp(t, tR0, tR0 + RD), eg = ex * (1 - re), tr = tourAt(t), md = modeAt(t);
      const s = { t, e: eg, explodeK: (id) => { const dl = stag[id] * 0.35, a = E.sm(ramp(ex, dl, dl + 0.65)), b = E.sm(ramp(re, (1 - stag[id]) * 0.35, (1 - stag[id]) * 0.35 + 0.65)); return a * (1 - b); },
        assemble: (id) => { const k = E.outBack(ramp(t, arrive[id], arrive[id] + 0.95), 1.1); return { k: Math.min(1.04, k) > 1 ? 1 : k, alpha: ramp(t, arrive[id], arrive[id] + 0.3) * (cutSet[id] ? 1 - 0.9 * cut : 1) }; },
        focus: tr ? tr.id : null, focusA: tr ? tr.a : 0, dimTo: 0.012, light: { az: -38 + 26 * Math.sin(t * 0.23), el: 54 },
        mech: mechAt(t), hint: t < ASM_END ? 'ASSEMBLY' : t < tE0 ? (PRESS ? 'KEY PRESS' : ENIG ? 'ENCIPHERING' : 'POWER PATH') : t < tT0 ? 'EXPLODED VIEW' : t < tR0 ? 'PART ' + ((tr ? tr.j : tourIds.length - 1) + 1) + ' OF ' + tourIds.length : t < tP0 ? 'RE-ASSEMBLY' : 'EVIDENCE',
        readout: md && t >= tM0 && t < tR0 ? md.label + '  -  ' + (PRESS ? pressAt(t).toFixed(2) + ' mm' : ENIG ? ((mechAt(t).enigma || {}).window || '') : an.modes[modeIdx(t)].ratio.toFixed(3) + ' : 1') : parts.length + ' parts', infoAt: [64, H - 360] };
      s.modeA = md && t >= tM0 && t < tE0 ? Math.min(ramp(t, tM0, tM0 + 0.6), 1 - ramp(t, tE0 - 0.5, tE0 - 0.1)) : 0; s.mode = md; s.modeI = modeIdx(t); s.speed = speedAt(t);
      return s;
    };

    /* ---------------------------------------------------------- HUD: modo de marcha, tablas, fuentes */
    const tagPill = (c, x, y, conf, text) => {
      c.save(); c.font = '600 14px ' + MX.SANS; if ('letterSpacing' in c) c.letterSpacing = '1.6px'; const s2 = text || CONFNAME[conf], col = conf === 'estimated' ? T.ember : conf === 'derived' ? T.ink : T.teal, w = c.measureText(s2).width + 24, h = 28, r = 14;
      c.beginPath(); c.moveTo(x + r, y - h + 6); c.lineTo(x + w - r, y - h + 6); c.arc(x + w - r, y - h + 6 + r, r, -Math.PI / 2, Math.PI / 2); c.lineTo(x + r, y + 6); c.arc(x + r, y - h + 6 + r, r, Math.PI / 2, 1.5 * Math.PI); c.closePath(); c.fillStyle = MX.rgba(col, 0.13); c.fill(); c.strokeStyle = MX.rgba(col, 0.55); c.lineWidth = 1; c.stroke();
      c.fillStyle = col; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(s2, x + 12, y - 2); c.restore(); return w;
    };
    const forceAt = (x) => { const pts = M.press.force; if (!pts || !pts.length) return 0; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0])); return pts[pts.length - 1][1]; };
    const drawPress = (c, s) => {
      const a = s.modeA; if (!(a > 0.01)) return; const mi = s.modeI, m = modes[mi], pr = M.press, x = s.mech.press, Fv = forceAt(x), act = x >= pr.actuation - 1e-6, X0 = 78, y = H - 318, fmax = Math.max.apply(null, (pr.force || [[0, 1]]).map((q) => q[1])), u = pr.unit || 'mm', fu = pr.forceUnit || 'cN';
      c.save(); c.globalAlpha = a; c.fillStyle = MX.rgba(T.paper, T.dark ? 0.86 : 0.9); c.fillRect(X0 - 24, y - 70, W - 2 * X0 + 48, 232); c.fillStyle = T.teal; c.fillRect(X0 - 24, y - 70, 4, 232);
      MX.A = 1; MX.text(m.label, X0, y, { size: 64, font: MX.SERIF, w: 500, color: T.ink }); MX.text(m.formula || '', X0, y + 42, { size: 21, font: MX.SANS, color: T.mute });
      MX.text(x.toFixed(2) + ' ' + u, W - X0, y - 2, { size: 64, font: MX.SERIF, w: 500, color: T.ink, align: 'right' });
      tagPill(c, W - X0 - 150, y + 44, act ? 'spec' : 'estimated', act ? 'ACTUATED' : 'OPEN');
      if (m.publish) { const cl = claimBy[m.publish.claim]; tagPill(c, W - X0 - 340, y + 44, cl ? cl.conf : 'spec', (cl ? CONFNAME[cl.conf] : 'SPEC') + ' ' + m.publish.text); }
      const bar = (yy, label, v, mx, col, txt) => { MX.text(label, X0, yy + 5, { size: 15, font: MX.SANS, color: T.mute, spacing: 2.2, w: 600 }); c.fillStyle = MX.rgba(T.ink, 0.12); c.fillRect(X0 + 150, yy - 8, 430, 12); c.fillStyle = col; c.fillRect(X0 + 150, yy - 8, 430 * clamp(v / mx, 0, 1), 12); MX.text(txt, X0 + 600, yy + 5, { size: 18, font: MX.SANS, color: T.ink, w: 500 }); };
      bar(y + 92, 'TRAVEL', x, pr.travel, T.teal, x.toFixed(2) + ' ' + u); bar(y + 124, 'FORCE', Fv, fmax, T.ember, Math.round(Fv) + ' ' + fu);
      c.restore();
    };
    const drawMode = (c, s) => {
      if (PRESS) return drawPress(c, s);
      if (ENIG) return drawEnigma(c, s);
      const a = s.modeA; if (!(a > 0.01)) return; const mi = s.modeI, m = modes[mi], r = an.modes[mi], x = 78, y = H - 318, ratio = r.ratio, drpm = drive.rpm * s.speed, hrpm = drpm * ratio;
      c.save(); c.globalAlpha = a; c.fillStyle = MX.rgba(T.paper, T.dark ? 0.86 : 0.9); c.fillRect(x - 24, y - 70, W - 2 * x + 48, 232); c.fillStyle = T.teal; c.fillRect(x - 24, y - 70, 4, 232);
      MX.A = 1; MX.text(m.label, x, y, { size: 64, font: MX.SERIF, w: 500, color: T.ink });
      MX.text(m.formula || '', x, y + 42, { size: 21, font: MX.SANS, color: T.mute });
      MX.text(ratio.toFixed(3) + ' : 1', W - x, y - 2, { size: 64, font: MX.SERIF, w: 500, color: T.ink, align: 'right' });
      if (m.publish) { const cl = claimBy[m.publish.claim], w = 190; tagPill(c, W - x - w - 4, y + 44, cl ? cl.conf : 'spec', (cl ? CONFNAME[cl.conf] : 'SPEC') + ' ' + m.publish.text); MX.text(r.ok ? 'matches the model' : 'MISMATCH', W - x - w - 18, y + 44, { size: 19, font: MX.SANS, color: r.ok ? T.teal : T.ember, align: 'right', w: 500 }); }
      const bar = (yy, label, v, mx, col) => { MX.text(label, x, yy + 5, { size: 15, font: MX.SANS, color: T.mute, spacing: 2.2, w: 600 }); c.fillStyle = MX.rgba(T.ink, 0.12); c.fillRect(x + 150, yy - 8, 430, 12); c.fillStyle = col; c.fillRect(x + 150, yy - 8, 430 * clamp(v / mx, 0, 1), 12); MX.text(Math.round(v) + ' rpm', x + 600, yy + 5, { size: 18, font: MX.SANS, color: T.ink, w: 500 }); };
      bar(y + 92, 'DRIVER', drpm, drive.rpm * 1.6, T.teal); bar(y + 124, 'HUB SHELL', hrpm, drive.rpm * 1.6, T.ember);
      c.restore();
    };
    const drawPanel = (c, pn, t) => {
      const a = Math.min(ramp(t, pn.t0, pn.t0 + 0.5), 1 - ramp(t, pn.t1 - 0.4, pn.t1)); if (a < 0.01) return;
      if (pn.kind === 'ratios') {
        if (!H2.panel(a, spec.fig || 'Fig', ENIG ? 'Run against the published tests' : 'Measured against published', (PRESS ? 'Each phase is read off the running model, then compared with the number the maker publishes.' : ENIG ? 'The machine is run on every published test and compared letter by letter.' : 'Each ratio is read off the running model, then compared with the number the maker publishes.'))) return;
        an.modes.forEach((r, i) => {
          const m = modes[i], y = 540 + i * 168, ai = a * ramp(t, pn.t0 + 0.4 + i * 0.35, pn.t0 + 0.9 + i * 0.35);
          c.save(); c.globalAlpha = ai; c.strokeStyle = T.line; c.beginPath(); c.moveTo(86, y - 74); c.lineTo(W - 86, y - 74); c.stroke(); c.restore();
          MX.A = ai; MX.text(m.label, 86, y, { size: 54, font: MX.SERIF, w: 500 }); MX.text(m.formula || '', 86, y + 36, { size: 21, font: MX.SANS, color: T.mute }); MX.text(m.note || '', 86, y + 66, { size: 19, font: MX.SANS, color: T.mute });
          MX.text(ENIG ? r.text : PRESS ? r.ratio.toFixed(2) + ' ' + (M.press.unit || 'mm') : r.ratio.toFixed(4), W - 86, y, { size: 58, font: MX.SERIF, w: 500, align: 'right' });
          if (m.publish) { const cl = claimBy[m.publish.claim]; c.save(); c.globalAlpha = ai; tagPill(c, W - 86 - 330, y + 52, cl ? cl.conf : 'spec', (cl ? CONFNAME[cl.conf] : 'SPEC') + ' ' + m.publish.text + (r.ok ? '  OK' : '  MISMATCH')); c.restore(); }
          MX.A = a;
        });
        H2.endPanel(); return;
      }
      if (pn.kind === 'curve') {
        if (!H2.panel(a, spec.fig || 'Fig', 'Do the published forces add up?', 'Three published points, and what a single linear spring through the first two would give.')) return;
        const pr = M.press, pts = pr.force, x0 = 150, x1 = W - 120, yb = 1010, yt = 600, fmax = Math.ceil(Math.max.apply(null, pts.map((q) => q[1])) * 1.05 / 25) * 25, X = (v) => x0 + (x1 - x0) * v / pr.travel, Y = (v) => yb - (yb - yt) * v / fmax;
        const ai = a * ramp(t, pn.t0 + 0.3, pn.t0 + 1.0), aj = a * ramp(t, pn.t0 + 1.4, pn.t0 + 2.2), ak = a * ramp(t, pn.t0 + 2.6, pn.t0 + 3.4), fu = pr.forceUnit || 'cN';
        c.save(); c.globalAlpha = ai; c.strokeStyle = T.line; c.lineWidth = 1;
        for (let k = 0; k <= fmax / 25; k++) { const v = k * 25; c.beginPath(); c.moveTo(x0, Y(v)); c.lineTo(x1, Y(v)); c.stroke(); MX.A = ai; MX.text(Math.round(v) + '', x0 - 14, Y(v) + 6, { size: 17, font: MX.SANS, color: T.mute, align: 'right' }); }
        for (let k = 0; k <= pr.travel; k++) MX.text(k + '', X(k), yb + 32, { size: 17, font: MX.SANS, color: T.mute, align: 'center' });
        MX.text('travel (' + (pr.unit || 'mm') + ')', x1, yb + 62, { size: 17, font: MX.SANS, color: T.mute, align: 'right' }); MX.text('force (' + fu + ')', x0, yt - 30, { size: 17, font: MX.SANS, color: T.mute });
        c.setLineDash([8, 7]); c.strokeStyle = T.mute; c.beginPath(); c.moveTo(X(pr.actuation), yt - 10); c.lineTo(X(pr.actuation), yb); c.stroke(); c.setLineDash([]); MX.text('actuation', X(pr.actuation) + 8, yt + 6, { size: 17, font: MX.SANS, color: T.mute }); c.restore();
        c.save(); c.globalAlpha = aj; c.strokeStyle = T.teal; c.lineWidth = 4; c.lineJoin = 'round'; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(X(q[0]), Y(q[1])) : c.moveTo(X(q[0]), Y(q[1])))); c.stroke();
        pts.forEach((q) => { c.fillStyle = T.teal; c.beginPath(); c.arc(X(q[0]), Y(q[1]), 9, 0, 6.2832); c.fill(); MX.A = aj; MX.text(q[1] + ' ' + fu, X(q[0]) + (q[0] === 0 ? 16 : -14), Y(q[1]) - 18, { size: 22, font: MX.SANS, w: 600, color: T.teal, align: q[0] === 0 ? 'left' : 'right' }); }); c.restore();
        const k = an.press.slope, last = pts[pts.length - 1], py = pts[0][1] + k * last[0];
        c.save(); c.globalAlpha = ak; c.strokeStyle = T.ember; c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(X(0), Y(pts[0][1])); c.lineTo(X(last[0]), Y(py)); c.stroke(); c.setLineDash([]); c.fillStyle = T.ember; c.beginPath(); c.arc(X(last[0]), Y(py), 8, 0, 6.2832); c.fill();
        MX.A = ak; MX.text('a linear spring would give ' + an.press.predictedFinal.toFixed(0) + ' ' + fu, X(last[0]) - 14, Y(py) + 66, { size: 20, font: MX.SANS, w: 600, color: T.ember, align: 'right' }); c.restore();
        const nl = wrap(pr.note || '', '400 21px ' + MX.SANS, W - 172); MX.A = ak; nl.forEach((ln, i) => MX.text(ln, 86, yb + 120 + i * 28, { size: 21, font: MX.SANS, color: T.ink })); H2.endPanel(); return;
      }
      if (pn.kind === 'claims') {
        if (!H2.panel(a, spec.fig || 'Fig', 'What the numbers stand on', 'Page ' + (pn.page + 1) + ' of ' + pages.length + '. Every claim names its source, its cross-check or why it is a guess.')) return;
        let y = 500;
        pn.rows.forEach((row, i) => {
          const ai = a * ramp(t, pn.t0 + 0.3 + i * 0.3, pn.t0 + 0.8 + i * 0.3); c.save(); c.globalAlpha = ai; c.strokeStyle = T.line; c.beginPath(); c.moveTo(86, y - 36); c.lineTo(W - 86, y - 36); c.stroke(); tagPill(c, 86, y, row.c.conf); c.restore();
          MX.A = ai; row.lines.forEach((ln, k) => MX.text(ln, 86 + 188, y + k * 29 - 2, { size: 23, font: MX.SANS, color: T.ink }));
          const srcs = (row.c.src || []).map((id) => (sources.find((qq) => qq.id === id) || { title: id }).title).join('  -  ');
          if (srcs) MX.text(srcs, 86 + 188, y + row.lines.length * 29 + 4, { size: 16, font: MX.SANS, color: T.mute });
          MX.A = a; y += row.h;
        });
        H2.endPanel(); return;
      }
      if (!H2.panel(a, spec.fig || 'Fig', 'Sources', 'Opened ' + ((sources[0] && sources[0].fetched) || '') + '. Where a page refused us, it says so.')) return;
      let y = 500;
      sources.forEach((sr, i) => {
        const ai = a * ramp(t, pn.t0 + 0.3 + i * 0.3, pn.t0 + 0.8 + i * 0.3); MX.A = ai; c.save(); c.globalAlpha = ai; c.strokeStyle = T.line; c.beginPath(); c.moveTo(86, y - 36); c.lineTo(W - 86, y - 36); c.stroke(); c.restore();
        MX.text(sr.title, 86, y, { size: 27, font: MX.SERIF, w: 500 }); MX.text(sr.url.replace(/^https?:\/\//, '').slice(0, 78), 86, y + 30, { size: 16, font: MX.MONO, color: T.teal });
        const nl = wrap(sr.note || '', '400 18px ' + MX.SANS, W - 172); nl.forEach((ln, k) => MX.text(ln, 86, y + 58 + k * 24, { size: 18, font: MX.SANS, color: T.mute })); MX.A = a; y += 98 + nl.length * 24;
      });
      H2.endPanel();
    };
    F.overlay((ctx, s) => { if (s.t == null) return; drawMode(ctx, s); panels.forEach((pn) => { if (s.t >= pn.t0 - 0.01 && s.t <= pn.t1 + 0.01) drawPanel(ctx, pn, s.t); }); });

    /* ---------------------------------------------------------- sonido */
    function audio() {
      const ev = [], note = (id, idx) => SND.note(60, 'dorian', idx), pan = (p) => clamp(p.base.x / 45, -0.6, 0.6);
      order.forEach((p) => {
        const sm = P.soundMat(p.spec.mat), size = clamp(Math.max(p.size.x, p.size.y) * 0.9, 4, 90), t0 = arrive[p.id];
        ev.push({ t: t0 + 0.04, v: 'whoosh', d: 0.55, f0: 500, f1: 2600, pan: pan(p), gain: 0.16, q: 2 }, { t: t0 + 0.78, v: 'impact', mat: sm, size, vel: sm === 'rubber' ? 0.5 : 0.58, hard: 0.55, pan: pan(p), ring: 0.8, thump: size > 40 ? 90 : 0 });
      });
      if (modes.length) {
        modes.forEach((m, k) => { const tb = mS[k]; ev.push({ t: tb + 0.02, v: 'click', f: 1500, gain: 0.55, sharp: 0.8 }, { t: tb + 0.1, v: 'tone', f: note(0, Math.round((an.modes[k].ratio || 3) * 6)), timbre: 'bell', d: 1.6, gain: 0.5, pan: 0.1 }, { t: tb + 0.1, v: 'whoosh', d: 0.7, f0: 300, f1: 1800, gain: 0.3 }); });
        // los dientes que realmente pasan: una marca por cada diente del engrane de referencia que cruza el contacto
        const mesh = (M.links || []).find((l) => l.t === 'ext'), zref = mesh ? an.K.teeth[mesh.a] : 20, rel = mesh ? Math.abs(an.K.rates[mesh.a] - (mesh.carrier ? an.K.rates[mesh.carrier] : 0)) : 1; let cnt = 0, kept = 0;
        for (let i = 1; !PRESS && TL && i < TL.n; i++) {
          const t = i * TL.dt; if (t < tM0 || t > tR0 + 4) continue; const n1 = Math.floor(zref * rel * Math.abs(TL.free[i]) / TAU), n0 = Math.floor(zref * rel * Math.abs(TL.free[i - 1]) / TAU);
          if (n1 > n0) { cnt++; const dens = zref * rel * Math.abs(TL.free[i] - TL.free[i - 1]) / TAU / TL.dt; if (dens < 14 || cnt % Math.ceil(dens / 14) === 0) { kept++; ev.push({ t, v: 'click', f: 1650 + MX.hash(kept, 3) * 260, gain: 0.1, pan: -0.15, sharp: 0.45 }); } }
        }
      }
      if (PRESS) {
        let prev = pressAt(tM0 - 0.01), bottom = false;
        for (let t = tM0; t < tE0; t += 1 / 120) {
          const x = pressAt(t);
          if (prev < M.press.actuation && x >= M.press.actuation) ev.push({ t, v: 'blip', f: 2100, gain: 0.7, fm: 0.3 }, { t, v: 'click', f: 2600, gain: 0.35, sharp: 0.9 });
          if (prev >= M.press.actuation && x < M.press.actuation) ev.push({ t, v: 'click', f: 1700, gain: 0.3, sharp: 0.6 });
          if (!bottom && x >= M.press.travel - 0.02) { bottom = true; ev.push({ t, v: 'impact', mat: 'plastic', size: 14, vel: 0.9, hard: 0.7, ring: 0.7, thump: 120 }); }
          if (x < M.press.travel - 0.3) bottom = false; prev = x;
        }
      }
      if (ENIG) runs.forEach((run) => run.events.forEach((e) => {
        ev.push({ t: e.te, v: 'impact', mat: 'plastic', size: 22, vel: 0.5, hard: 0.8, ring: 0.3, pan: -0.1 }, { t: e.te + 0.01, v: 'click', f: 1600 + MX.hash(e.ch.charCodeAt(0), 5) * 500, gain: 0.5, sharp: 0.8 });
        e.stepped.forEach((sp, rr) => { if (sp) ev.push({ t: e.te + 0.05 + rr * 0.025, v: 'click', f: 700 + rr * 330, gain: 0.55, sharp: 0.55, pan: (rr - 1) * 0.45 }, { t: e.te + 0.06 + rr * 0.025, v: 'impact', mat: 'steel', size: 16, vel: 0.28, pan: (rr - 1) * 0.45, ring: 0.4 }); });
        for (let i = 0; i < 8; i++) ev.push({ t: e.te + 0.14 + i * 0.075, v: 'blip', f: 1200 + i * 90 + (i > 3 ? 160 : 0), gain: 0.13, fm: 0.3, pan: -0.5 + i * 0.14 });
        ev.push({ t: e.te + 0.64, v: 'tone', f: SND.note(57, 'major', (e.out.charCodeAt(0) - 65) % 14), timbre: 'bell', d: 1.0, gain: 0.34, pan: 0.15 });
      }));
      ev.push({ t: tE0 - 0.1, v: 'whoosh', d: 1.5, f0: 220, f1: 3400, gain: 0.8, skew: 0.8 }, { t: tE0 + ED - 0.5, v: 'boom', gain: 0.7 });
      tourIds.forEach((id, j) => { const p = parts.find((x) => x.id === id), ts = tT0 + j * TD; ev.push({ t: ts + 0.3, v: 'tone', f: note(0, j * 2), timbre: 'bell', d: 1.3, gain: 0.42, pan: pan(p) }, { t: ts + 0.32, v: 'impact', mat: P.soundMat(p.spec.mat), size: clamp(Math.max(p.size.x, p.size.y), 4, 80), vel: 0.32, pan: pan(p), ring: 0.6 }); });
      ev.push({ t: tR0 - 0.1, v: 'whoosh', d: 1.6, f0: 3400, f1: 240, gain: 0.8 }, { t: tR0 + RD - 0.3, v: 'boom', gain: 0.8 });
      panels.forEach((pn) => { ev.push({ t: pn.t0 + 0.1, v: 'blip', f: 900, gain: 0.5 }); (pn.rows || an.modes).forEach((r, i) => ev.push({ t: pn.t0 + 0.5 + i * 0.3, v: 'blip', f: 1100 + i * 90, gain: 0.35, pan: 0.2 })); });
      ev.push({ t: DUR - 3.2, v: 'tone', f: note(0, 4), timbre: 'bell', d: 3.4, ring: 2, gain: 0.6 }, { t: DUR - 3.0, v: 'tone', f: note(0, 9), timbre: 'bell', d: 3, ring: 2, gain: 0.45 });
      return SND.render({ duration: DUR, seed: 61, events: ev, bed: { bpm: 92, root: 48, mode: 'dorian', level: 0.55, prog: [0, 5, 3, 4], curve: [[0, 0.2], [tM0, 0.4], [tE0, 0.6], [tT0, 0.5], [tP0, 0.3], [DUR, 0.15]] }, room: { size: 1.1, wet: 0.22, fb: 0.78 } });
    }

    /* ---------------------------------------------------------- exportacion */
    const framePose = (e) => { F.apply({ e, mech: mechAt(0), assemble: null, view: VW.iso }); st.scene.updateMatrixWorld(true); };
    const b64 = (buf) => { const u8 = new Uint8Array(buf); let str = ''; for (let i = 0; i < u8.length; i += 0x8000) str += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(str); };
    g.__exportSTL = (e) => {
      framePose(e || 0); const tris = [];
      parts.forEach((p) => p.group.traverse((m) => {
        if (!m.isMesh || !m.geometry.attributes.position) return; const geo = m.geometry, pos = geo.attributes.position, idx = geo.index, a = new TH.Vector3(), b = new TH.Vector3(), c = new TH.Vector3(), n = idx ? idx.count : pos.count;
        for (let i = 0; i < n; i += 3) { const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2; a.fromBufferAttribute(pos, ia).applyMatrix4(m.matrixWorld); b.fromBufferAttribute(pos, ib).applyMatrix4(m.matrixWorld); c.fromBufferAttribute(pos, ic).applyMatrix4(m.matrixWorld); tris.push([a.clone(), b.clone(), c.clone()]); }
      }));
      const buf = new ArrayBuffer(84 + tris.length * 50), dv = new DataView(buf), nrm = new TH.Vector3(), e1 = new TH.Vector3(), e2 = new TH.Vector3(); dv.setUint32(80, tris.length, true);
      tris.forEach((tr, i) => { let o = 84 + i * 50; nrm.crossVectors(e1.subVectors(tr[1], tr[0]), e2.subVectors(tr[2], tr[0])).normalize(); [nrm, tr[0], tr[1], tr[2]].forEach((v) => { dv.setFloat32(o, v.x, true); dv.setFloat32(o + 4, v.y, true); dv.setFloat32(o + 8, v.z, true); o += 12; }); });
      return b64(buf);
    };
    g.__exportGLB = async (e) => {
      if (!TH.GLTFExporter) throw new Error('el bundle de three no trae GLTFExporter (reconstruir con scripts/build-vendor.mjs)'); framePose(e || 0);
      const sc = new TH.Scene(); parts.forEach((p) => { const cl = p.group.clone(true); cl.name = p.id; cl.position.copy(p.group.position); cl.rotation.copy(p.group.rotation); cl.traverse((m) => { if (m.isLine || m.isLineSegments) m.visible = false; if (m.isMesh && !m.geometry.index) { const g2 = m.geometry.clone(); g2.deleteAttribute('uv'); m.geometry = TH.mergeVertices(g2, 1e-3); } }); sc.add(cl); });      // geometria indexada: el GLB pesa una fraccion
      return b64(await new TH.GLTFExporter().parseAsync(sc, { binary: true }));
    };
    g.__specInfo = () => ({ duration: DUR, parts: parts.length, validation: V.lines, warnings: V.warnings, errors: V.errors, phases: { assembled: ASM_END, modes: tM0, explode: tE0, tour: tT0, reassemble: tR0, panels: tP0 } });

    /* ---------------------------------------------------------- Enigma: estado animado, camino de la senal y HUD */
    // Los eventos (tecla, salida, camino, rotores que avanzan) vienen de kit/enigma.js, ya validados contra los casos publicados.
    const phiOf = (j) => Math.PI / 2 - j * TAU / 26, TAUN = TAU / 26;
    function enigmaFrame(run, t, unwFrom, unw0, tStart) {
      let posF = unw0.slice(); if (unwFrom && t < tStart + 0.8) { const u = E.sm(ramp(t, tStart, tStart + 0.8)); posF = unwFrom.map((v, rr) => lerp(v, unw0[rr], u)); }
      let n = 0, last = null; run.events.forEach((ev) => { if (t >= ev.te) { n = run.events.indexOf(ev) + 1; last = ev; } ev.stepped.forEach((sp, rr) => { if (sp) posF[rr] += E.sm(ramp(t, ev.te, ev.te + 0.2)); }); });
      const tau = last ? t - last.te : -1, done = run.events.slice(0, n);
      return { run, n, posF, typed: done.map((e) => e.ch).join(''), out: done.map((e) => e.out).join(''), wins: done.map((e) => e.window), ev: last, tau,
        key: last && tau < 0.5 ? last.ch : null, keyA: last ? ramp(tau, 0, 0.1) * (1 - ramp(tau, 0.3, 0.5)) : 0,
        path: last ? last.path : null, pathP: last ? ramp(tau, 0.12, 0.72) : 0, pathA: last ? 1 - ramp(tau, 1.0, 1.25) : 0,
        lit: last && tau > 0.62 && tau < 1.3 ? last.out : null, litA: last ? ramp(tau, 0.62, 0.72) * (1 - ramp(tau, 1.05, 1.3)) : 0,
        window: posF.map((v) => EN.letter(Math.round(v))).join('') };
    }
    function enigmaMech(st2) { return { ang: (body) => { const rr = ['rotorL', 'rotorM', 'rotorR'].indexOf(body); return rr < 0 ? 0 : st2.posF[rr] * TAUN; }, press: st2.keyA, enigma: st2 }; }
    function makeEnigma() {
      const unw0 = [], unwEnd = [];
      runs.forEach((run, k) => {
        run.events.forEach((ev, j) => { ev.te = mS[k] + 0.9 + j * KD; });
        unw0.push(k ? unwEnd[k - 1].map((v, rr) => v + (((run.start[rr] - v) % 26) + 26) % 26) : run.start.slice());
        const end = unw0[k].slice(); run.events.forEach((ev) => ev.stepped.forEach((sp, rr) => { if (sp) end[rr] += 1; })); unwEnd.push(end);
      });
      return { mech: (t) => { const k = clamp(modeIdx(t), 0, runs.length - 1), tt = t < tM0 ? -1e9 : t; return enigmaMech(enigmaFrame(runs[k], tt, k ? unwEnd[k - 1] : null, unw0[k], mS[k])); } };
    }
    // camino de la senal: 15 tramos entre los contactos de la rueda de entrada, los tres rotores y el reflector (ida teal, vuelta ember)
    const roles = {}; spec.parts.forEach((d) => { if (d.role) roles[d.role] = { z: d.at[2], w: d.p.w, rc: d.p.rc || 30 }; });
    let pathSegs = null;
    if (ENIG) {
      const mkSeg = (col) => { const m = new TH.Mesh(new TH.CylinderGeometry(0.5, 0.5, 1, 8), new TH.MeshBasicMaterial({ color: col, transparent: true, depthTest: false, toneMapped: false })); m.renderOrder = 20; m.visible = false; root.add(m); return m; };
      pathSegs = Array.from({ length: 15 }, (_, i) => mkSeg(i < 8 ? T.teal : T.ember));
      beforeHook = (sx) => {
        const en2 = sx.mech && sx.mech.enigma, show = en2 && en2.path && en2.pathA > 0.01; pathSegs.forEach((m) => { m.visible = !!show; }); if (!show) return;
        const c = en2.path, R = roles.R, Mm = roles.M, L = roles.L, U = roles.UKW, Et = roles.ETW, pt = (j, z) => new TH.Vector3(R.rc * Math.cos(phiOf(j)), R.rc * Math.sin(phiOf(j)), z);
        const P2 = [pt(c[0], Et.z), pt(c[0], R.z + R.w / 2), pt(c[1], R.z - R.w / 2), pt(c[1], Mm.z + Mm.w / 2), pt(c[2], Mm.z - Mm.w / 2), pt(c[2], L.z + L.w / 2), pt(c[3], L.z - L.w / 2), pt(c[3], U.z + U.w / 2 + 0.2), pt(c[4], U.z + U.w / 2 - 1.2), pt(c[4], L.z - L.w / 2), pt(c[5], L.z + L.w / 2), pt(c[5], Mm.z - Mm.w / 2), pt(c[6], Mm.z + Mm.w / 2), pt(c[6], R.z - R.w / 2), pt(c[7], R.z + R.w / 2), pt(c[7], Et.z)];
        pathSegs.forEach((m, i) => {
          const a = P2[i], b = P2[i + 1], d = b.clone().sub(a), len = Math.max(0.01, d.length()), on = clamp(en2.pathP * 15 - i, 0, 1) * en2.pathA;
          m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new TH.Vector3(0, 1, 0), d.normalize()); m.scale.set(0.9 + 0.7 * on, len, 0.9 + 0.7 * on); m.material.opacity = on; m.visible = on > 0.02;
        });
      };
    }
    // HUD: ventanas de los rotores, entrada / salida y el tablero de lamparas (QWERTZ)
    function drawEnigma(c, s) {
      const a = s.modeA; if (!(a > 0.01)) return; const st2 = s.mech.enigma, m = modes[s.modeI], r2 = an.modes[s.modeI], X0 = 78, y = H - 318, rows = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'], pitch = 54, bx = W - X0 - 9 * pitch;
      c.save(); c.globalAlpha = a; c.fillStyle = MX.rgba(T.paper, T.dark ? 0.86 : 0.9); c.fillRect(X0 - 24, y - 70, W - 2 * X0 + 48, 232); c.fillStyle = T.teal; c.fillRect(X0 - 24, y - 70, 4, 232);
      MX.A = 1; MX.text(m.label, X0, y, { size: 52, font: MX.SERIF, w: 500, color: T.ink }); MX.text(m.formula || '', X0, y + 32, { size: 17, font: MX.SANS, color: T.mute });
      const stepped = st2.ev && st2.tau < 0.45 ? st2.ev.stepped : [false, false, false];
      for (let k = 0; k < 3; k++) { const bx2 = X0 + k * 58, by2 = y + 50, ch = st2.window[k]; c.fillStyle = MX.rgba(T.ink, 0.06); c.fillRect(bx2, by2, 50, 58); c.strokeStyle = stepped[k] ? T.ember : MX.rgba(T.ink, 0.35); c.lineWidth = stepped[k] ? 3 : 1.4; c.strokeRect(bx2, by2, 50, 58); MX.text(ch, bx2 + 25, by2 + 42, { size: 36, font: MX.SANS, w: 700, color: T.ink, align: 'center' }); }
      ['L', 'M', 'R'].forEach((q, k) => MX.text(q, X0 + k * 58 + 25, y + 124, { size: 13, font: MX.SANS, color: T.mute, spacing: 1.4, w: 600, align: 'center' }));
      MX.text('IN   ' + st2.typed, X0, y + 154, { size: 22, font: MX.MONO, w: 600, color: T.ink }); MX.text('OUT  ' + st2.out, X0 + 190, y + 154, { size: 22, font: MX.MONO, w: 600, color: T.ember });
      rows.forEach((row, ri) => [...row].forEach((ch, ci) => {
        const px = bx + ci * pitch + 27 + (ri === 1 ? pitch / 2 : 0), py = y - 22 + ri * 54, lit = st2.lit === ch ? st2.litA : 0, keyd = st2.key === ch ? st2.keyA : 0;
        c.beginPath(); c.arc(px, py, 20, 0, 6.2832); c.fillStyle = lit > 0.01 ? MX.rgba('#ffd34d', 0.25 + 0.75 * lit) : MX.rgba(T.ink, 0.05); c.fill(); c.strokeStyle = keyd > 0.01 ? T.teal : MX.rgba(T.ink, 0.3); c.lineWidth = keyd > 0.01 ? 3 : 1.3; c.stroke();
        if (lit > 0.3) { const gr = c.createRadialGradient(px, py, 4, px, py, 40); gr.addColorStop(0, 'rgba(255,211,77,' + 0.45 * lit + ')'); gr.addColorStop(1, 'rgba(255,211,77,0)'); c.fillStyle = gr; c.fillRect(px - 40, py - 40, 80, 80); }
        MX.text(ch, px, py + 6, { size: 17, font: MX.SANS, w: 700, color: lit > 0.5 ? '#3a2d00' : T.ink, align: 'center' });
      }));
      if (m.publish) { const cl = claimBy[m.publish.claim], done = st2.n >= st2.run.events.length && st2.tau > 1.1; tagPill(c, bx, y + 138, cl ? cl.conf : 'spec', (cl ? CONFNAME[cl.conf] : 'SPEC') + ' ' + m.publish.text); if (done) MX.text(r2 && r2.ok ? 'matches the model' : 'MISMATCH', bx + 230, y + 138, { size: 19, font: MX.SANS, color: r2 && r2.ok ? T.teal : T.ember, w: 500 }); }
      c.restore();
    }
    // visor interactivo: escribis con el teclado y la maquina cifra con las mismas reglas
    function startEnigmaExplore() {
      const cfg = Object.assign({}, ENC), live = { m: EN.create(cfg), run: null, unw0: null, t0: 0 };
      const reset = () => { live.m = EN.create(cfg); live.run = { start: live.m.pos.slice(), events: [] }; live.unw0 = live.m.pos.slice(); live.t0 = performance.now() / 1000; };
      reset(); window.addEventListener('keydown', (e) => { if (/^[a-z]$/i.test(e.key) && !e.ctrlKey && !e.metaKey) { const res = live.m.press(e.key.toUpperCase()); live.run.events.push(Object.assign({ ch: e.key.toUpperCase(), te: performance.now() / 1000 }, res)); } if (e.key === 'Escape') reset(); });
      const HOME = Object.assign({}, VW.iso, { zoom: VW.iso.zoom * 0.92 });
      F.explore({ views: [['FRONT', VW.front], ['ISO', HOME], ['TOP', VW.three]], home: HOME, start: HOME, toggleW: 130, minZoom: 1, maxZoom: 120, toggles: [{ label: 'CLEAR', get: () => false, set: () => reset() }], reset,
        extra: () => { const now = performance.now() / 1000, st2 = enigmaFrame(live.run, now, null, live.unw0, -1e9); return { mech: enigmaMech(st2), light: { az: -38, el: 54 }, dimTo: 0.1, hint: 'TYPE LETTERS ON YOUR KEYBOARD - ESC CLEARS', readout: st2.window + '   ' + st2.typed.slice(-10) + ' > ' + st2.out.slice(-10) }; } });
    }

    /* ---------------------------------------------------------- arranque */
    if (explore && ENIG) startEnigmaExplore();
    else if (explore) {
      const it = new Integrator(an, drive.rpm), live = { mode: modes[0] || null, spin: true, last: performance.now() };
      const tg = [{ label: PRESS ? 'PRESS' : 'SPIN', get: () => live.spin, set: (v) => { live.spin = v; } }].concat(PRESS ? [] : modes.map((m) => ({ label: m.label.toUpperCase().replace('GEAR ', 'G'), get: () => live.mode === m, set: () => { live.mode = m; } })));
      const HOME = UP ? Object.assign({}, VW.iso, { zoom: VW.expl.zoom * 1.3 }) : VW.iso;
      F.explore({ views: [['FRONT', VW.front], ['ISO', HOME], ['SIDE', VW.side]], home: HOME, start: HOME, toggleW: 100, toggles: tg, minZoom: 3, maxZoom: 400,
        reset: () => { live.mode = modes[0] || null; live.spin = true; },
        extra: (Sx) => {
          const now = performance.now(), dt = Math.min(0.05, (now - live.last) / 1000); live.last = now; if (an.K) it.step(dt, live.mode, live.spin ? 1 : 0); if (live.spin) live.t = (live.t || 0) + dt; const r = live.mode ? an.modes[modes.indexOf(live.mode)].ratio : null, px = PRESS ? (1 - Math.cos((live.t || 0) * 2.2)) / 2 * M.press.travel : 0;
          return { mech: { ang: (b) => (an.K ? it.ang(b) : 0), press: px }, light: { az: -38, el: 54 }, dimTo: 0.1, readout: (PRESS ? px.toFixed(2) + ' mm  ' + Math.round(forceAt(px)) + ' ' + (M.press.forceUnit || 'cN') + '  -  ' : live.mode ? live.mode.label + '  ' + r.toFixed(3) + ' : 1  -  ' : '') + 'EXPLODE ' + Math.round(Sx.e * 100) + '%' };
        } });
    } else F.run({ duration: DUR, keys, script, audio, poster: tM0 + MD * 0.5 });
    return { F, an, DUR };
  };
})(typeof window !== 'undefined' ? window : globalThis);
