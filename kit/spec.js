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
    { const want = q.get('style') || q.get('theme') || spec.style || MX.THEME.name; MX.setStyle(want, spec.brand && spec.brand.accent); }      // el estilo por URL manda; si no, el del spec; la marca da el acento de los estilos que lo usan
    const presentation = MX.presentation && MX.presentation.resolve(q, spec);
    if (presentation && presentation.enabled) MX.presentation.apply(presentation);
    V.errors.forEach((e) => console.error('SPEC: ' + e)); V.warnings.forEach((w) => console.warn('SPEC: ' + w));
    if (V.errors.length && (!explore || (presentation?.enabled && presentation.method !== 'studio'))) { document.title = 'SPEC ERROR'; throw new Error('el spec no pasa la validacion:\n' + V.errors.join('\n')); }
    const M = spec.mechanism || null, drive = (M && M.drive) || { modes: [], rpm: 30 }, modes = drive.modes || [], dir = spec.director || {}, LEN = q.get('length') || dir.length || 'normal', SHORT = LEN === 'short', LONG = LEN === 'extended', PRESS = !!(M && M.press), ENIG = !!(M && M.enigma), ENGN = !!(M && M.engine), CUBE = !!(M && M.cube), CALC = !!(M && M.calc), STEPS = !!(M && M.steps), RAD = Math.PI / 180, UP = spec.up === 'z', ORI = spec.orient || (UP ? [-90, 0, 0] : null);
    const claimsOf = (k) => ((spec.research && spec.research.claims) || []).filter((c) => c.conf === k).length;
    const claims = (spec.research && spec.research.claims) || [], sources = (spec.research && spec.research.sources) || [], claimBy = Object.fromEntries(claims.map((c) => [c.id, c]));
    if (presentation?.enabled && presentation.method === 'workflow') {
      return MX.workflowEngine.run({ spec, validation: V, config: presentation, W, H, length: LEN });
    }

    /* ---------------------------------------------------------- figura y piezas */
    let beforeHook = null;
    const vectorOnly = presentation?.enabled && presentation.method === 'paper';
    const F = MX.figure({ beforeRender: (s) => { if (beforeHook) beforeHook(s); }, w: W, h: H, axes: 'three', fps: FPS, stage: Object.assign({ shadow: 0.14, floorY: spec.up === 'z' ? -0.3 : -70 }, presentation?.enabled ? { renderScale: 1.5 } : {}, spec.stage || {}, { vectorOnly }),
      card: (s) => ({ fig: spec.fig || 'Fig 1', kicker: spec.kicker, title: spec.title, sub: s.sub || spec.sub, hint: s.hint || '', readout: s.readout || (F.parts.length + ' parts'), blocks: [['parts', F.parts.length], ['spec', claimsOf('spec'), T.teal], ['derived', claimsOf('derived')], ['estimated', claimsOf('estimated'), T.ember]] }) });
    const st = F.st, H2 = F.hud, byBodyPhi = an.phi || {};
    // Enigma: el cableado que se dibuja en cada rotor sale de la MISMA tabla que usa la simulacion
    const ENC = ENIG ? M.enigma : null, EN = ENIG ? MX.enigma : null;
    function roleCfg(role) {
      if (!ENIG || !role) return {};
      if (role === 'R' || role === 'M' || role === 'L') { const nm = ENC.rotors[{ L: 0, M: 1, R: 2 }[role]]; return { kind: 'rotor', wiring: EN.WIRING[nm], notch: EN.NOTCH[nm] }; }
      if (role === 'UKW') return { kind: 'reflector', wiring: EN.REFLECTOR[ENC.reflector] };
      return { kind: 'etw' };
    }
    // Motor: cinematica exacta de biela-manivela (kit/spec-core.js) y levas cuyas puntas quedan calculadas desde la ventana de cada valvula
    const EGN = ENGN ? M.engine : null, AE = ENGN ? an.engine : null, EGE = S.eng;
    function camCfg(d) {
      if (!ENGN || !d.engine || d.engine.role !== 'cam') return {};
      const v = EGN.valves[d.engine.valve], mid = (v.open + (v.close < v.open ? v.close + 720 : v.close)) / 2;
      return { lobes: d.p.lobes.map((l) => { const psi = ((((AE.ign[l.cyl - 1] + mid) / 2) % 360) + 360) % 360; return Object.assign({}, l, { a: (((180 - psi) % 360) + 360) % 360, lift: v.lift }); }) };
    }
    function engPose(d, p, e) {
      const g = d.engine, k = (g.cyl || 1) - 1, r = EGN.stroke / 2, l = EGN.rod, a0 = (EGN.throws[k] || 0) * RAD, a = e.theta + a0;
      if (g.role === 'crank') p.group.rotation.z += -e.theta;
      else if (g.role === 'cam') p.group.rotation.z += -e.theta / 2;
      else if (g.role === 'piston') p.group.position.y += EGE.pinY(r, l, a) - EGE.pinY(r, l, a0);
      else if (g.role === 'rod') { const y1 = EGE.pinY(r, l, a), y0 = EGE.pinY(r, l, a0); p.group.position.x += r * (Math.sin(a) - Math.sin(a0)) / 2; p.group.position.y += (r * Math.cos(a) + y1 - r * Math.cos(a0) - y0) / 2; p.group.rotation.z += EGE.rodAng(r, l, a) - EGE.rodAng(r, l, a0); }
      else if (g.role === 'valve') { const v = EGN.valves[g.valve]; p.group.position.y -= EGE.lift(EGE.phase(e.theta / RAD, AE.ign[k]), v.open, v.close, v.lift); }
    }
    // Cubo de Rubik: cada cubito toma su posicion y su giro de kit/cube.js; durante un giro, la capa gira de verdad un angulo parcial
    const CB = CUBE ? MX.cube : null, CPITCH = CUBE ? (M.cube.pitch || 18.67) : 0, CIDX = {}, cubeQ = new TH.Quaternion(), cubeM = new TH.Matrix4();
    if (CUBE) CB.create().forEach((c, i) => { CIDX[c.home.join()] = i; });
    function cubePose(d, p, frame) {
      const c = frame[CIDX[d.cubie.join()]], h = d.cubie, R = c.R; p.group.position.x += (c.pos[0] - h[0]) * CPITCH; p.group.position.y += (c.pos[1] - h[1]) * CPITCH; p.group.position.z += (c.pos[2] - h[2]) * CPITCH;
      cubeM.set(R[0], R[1], R[2], 0, R[3], R[4], R[5], 0, R[6], R[7], R[8], 0, 0, 0, 0, 1); cubeQ.setFromRotationMatrix(cubeM); p.group.quaternion.premultiply(cubeQ);
    }
    // Marca: letras, filetes y formas impresas sobre una cara de la pieza. decal = { face: '+z' | '-z' | '+x' | '-x' | '+y' | '-y', at: [x, y, z] locales, w, h (mm),
    //   rot (grados sobre la normal), px (pixeles por mm), glow (color emisivo), items: [{ t: 'text' | 'rect' | 'circle' | 'line', ... en mm, y hacia arriba }] }.
    // Solo tipografia y color de marca: nada de logos copiados; lo que el objeto lleva impreso se declara como cualquier otro dato (y si no esta en la fuente, ESTIMATED).
    const DFACE = { '+z': [0, 0, 0], '-z': [0, Math.PI, 0], '+x': [0, Math.PI / 2, 0], '-x': [0, -Math.PI / 2, 0], '+y': [-Math.PI / 2, 0, 0], '-y': [Math.PI / 2, 0, 0] };
    const FONTS = { sans: MX.SANS, serif: MX.SERIF, mono: MX.MONO };
    function makeDecal(dc) {
      const PX = dc.px || 14, tex = G.canvasTex(Math.max(8, Math.round(dc.w * PX)), Math.max(8, Math.round(dc.h * PX)), (c, cw, ch) => {
        c.translate(cw / 2, ch / 2); c.scale(PX, PX); c.textBaseline = 'middle'; c.lineJoin = 'round';
        (dc.items || []).forEach((it) => {
          c.save(); c.globalAlpha = it.a == null ? 1 : it.a;
          if (it.t === 'text') { c.font = (it.weight || 700) + ' ' + it.size + 'px ' + (FONTS[it.font] || it.font || MX.SANS); c.fillStyle = it.color || '#fff'; c.textAlign = it.align || 'center'; if ('letterSpacing' in c) c.letterSpacing = (it.spacing || 0) + 'px'; if (it.skew) c.transform(1, 0, -it.skew, 1, 0, 0); c.fillText(it.s, it.x || 0, -(it.y || 0)); }
          else if (it.t === 'rect') { const x = (it.x || 0) - it.w / 2, y = -(it.y || 0) - it.h / 2, r = it.r || 0; c.beginPath(); if (c.roundRect) c.roundRect(x, y, it.w, it.h, r); else c.rect(x, y, it.w, it.h); if (it.color) { c.fillStyle = it.color; c.fill(); } if (it.stroke) { c.strokeStyle = it.stroke; c.lineWidth = it.lw || 0.2; c.stroke(); } }
          else if (it.t === 'circle') { c.beginPath(); c.arc(it.x || 0, -(it.y || 0), it.r, 0, TAU); if (it.color) { c.fillStyle = it.color; c.fill(); } if (it.stroke) { c.strokeStyle = it.stroke; c.lineWidth = it.lw || 0.2; c.stroke(); } }
          else if (it.t === 'line') { c.beginPath(); c.moveTo(it.x1, -it.y1); c.lineTo(it.x2, -it.y2); c.strokeStyle = it.color || '#fff'; c.lineWidth = it.lw || 0.3; c.lineCap = 'round'; c.stroke(); }
          c.restore();
        });
      }), mat = G.flatMat(tex), grpD = new TH.Group(), m = new TH.Mesh(new TH.PlaneGeometry(dc.w, dc.h), mat);
      if (dc.glow) { mat.emissive = new TH.Color(dc.glow); mat.emissiveMap = tex; mat.emissiveIntensity = dc.glowK || 1.4; }
      m.rotation.z = (dc.rot || 0) * Math.PI / 180; m.renderOrder = 2; grpD.add(m); const f = DFACE[dc.face || '+z']; grpD.rotation.set(f[0], f[1], f[2]); grpD.position.set(dc.at[0], dc.at[1], dc.at[2]); return grpD;
    }
    const root = new TH.Group(); if (ORI) root.rotation.set(ORI[0] * Math.PI / 180, ORI[1] * Math.PI / 180, ORI[2] * Math.PI / 180); st.scene.add(root);          // up: 'z' -> el eje z del spec queda vertical
    spec.parts.forEach((d, i) => {
      const grp = P[d.kind](Object.assign({}, d.p, { mat: d.mat }, roleCfg(d.role), camCfg(d))), base = v3(S.startPos(d)); grp.userData.spec = d;
      grp.traverse((m) => { if (m.isMesh || m.isLine) m.material = Array.isArray(m.material) ? m.material.map((q) => q.clone()) : m.material.clone(); });      // material propio por pieza: la atenuacion de una no puede tocar a las demas
      (d.decals || []).forEach((dc) => grp.add(makeDecal(dc)));
      const srcLine = () => { const ids = []; (d.claims || []).forEach((cid) => ((claimBy[cid] || {}).src || []).forEach((sid) => { if (!ids.includes(sid)) ids.push(sid); })); const hosts = ids.slice(0, 2).map((sid) => { const sr = sources.find((q) => q.id === sid); if (!sr) return sid; let h = sr.url; try { h = new URL(sr.url).hostname; } catch (e) { /* url rara */ } return h.replace('www.', '') + ' ' + (sr.fetched || ''); }); return hosts.length ? 'SOURCE  ' + hosts.join('  +  ') : (d.conf === 'estimated' ? 'NO SOURCE: ESTIMATED' : ''); };
      const part = F.add({ id: d.id, group: grp, base, explode: v3(d.explode || [0, 0, 0]), from: new TH.Vector3(0, 0, 90), conf: d.conf, est: d.conf === 'estimated' && d.kind !== 'pin', info: ((base0) => Object.assign({}, base0, { src: srcLine(), sizeEvidence: S.sizeEvidence(d) }, d.params ? { lines: (base0.lines || []).concat(Object.keys(d.params).slice(0, 5).map((k) => k + ' ' + (d.params[k].value != null ? d.params[k].value : d.p[k]) + (d.params[k].unit ? ' ' + d.params[k].unit : '') + '   ' + String(d.params[k].conf || '').toUpperCase())) } : {}))(d.info || autoInfo(d, grp.userData)), spec: d, body: d.body || null });
      part.arc = new TH.Vector3(0, 14, 0); part.spin = new TH.Vector3(0, 0, (MX.hash(i, 7) - 0.5) * 3.2); part.name = d.name || d.id;
      const phi = d.body && byBodyPhi[d.body] != null && S.teethOf(d) ? byBodyPhi[d.body] : 0;
      part.pose = (s, p) => {
        const m = s.mech, pr = m && m.press ? m.press : 0;
        if (d.rot) { p.group.rotation.x += d.rot[0] * RAD; p.group.rotation.y += d.rot[1] * RAD; p.group.rotation.z += d.rot[2] * RAD; }
        if (d.spin) p.group.rotation.z += d.spin * (s.t == null ? performance.now() / 1000 : Math.max(0, s.t));
        if (d.motion && m) {      // movimiento declarado por la pieza como funcion del paso actual: { pos: [dx, dy, dz], scale: k | [kx, ky, kz], rot: [rx, ry, rz] }
          const mo = d.motion(m.step || 0, s.t == null ? 0 : s.t, m.phase || 0);
          p.group.scale.set(1, 1, 1);      // a part that was hidden (scale ~0) or pulsed must come back when its motion stops asking for a scale
          if (mo) { if (mo.pos) { p.group.position.x += mo.pos[0]; p.group.position.y += mo.pos[1]; p.group.position.z += mo.pos[2]; } if (mo.scale != null) { const sc = Array.isArray(mo.scale) ? mo.scale : [mo.scale, mo.scale, mo.scale]; p.group.scale.set(sc[0], sc[1], sc[2]); } if (mo.rot) { p.group.rotation.x += mo.rot[0]; p.group.rotation.y += mo.rot[1]; p.group.rotation.z += mo.rot[2]; } }
        }
        if (d.engine && m && m.eng) { engPose(d, p, m.eng); return; }
        if (d.cubie && m && m.cube) { cubePose(d, p, m.cube); return; }
        if (d.slide) p.group.position[d.slide.axis || 'z'] += d.slide.k * pr;
        if (d.compress) p.group.scale.z = Math.max(0.12, 1 - pr / d.compress.free);
        if (!m) { p.group.rotation.z += phi; return; }
        if (d.orbit) { const c = m.ang(d.orbit.around || 'carrier'), a = d.orbit.a0 * Math.PI / 180 + c; p.group.position.x += d.orbit.center[0] + d.orbit.r * Math.cos(a) - p.base.x; p.group.position.y += d.orbit.center[1] + d.orbit.r * Math.sin(a) - p.base.y; }
        p.group.rotation.z += phi + (d.body ? m.ang(d.body) : 0);
      };
      root.add(grp);
    });
    F.finish();
    if (vectorOnly) return MX.paperEngine.run({ spec, validation: V, config: presentation, F, W, H, length: LEN });
    const parts = F.parts, key = st.key;
    st.scene.updateMatrixWorld(true); const wbox = new TH.Box3(); parts.forEach((p) => wbox.expandByObject(p.group)); const ctr = wbox.getCenter(new TH.Vector3());      // centro del objeto armado, en ejes del mundo

    /* ---------------------------------------------------------- vistas */
    let rxy = 10, zMin = 1e9, zMax = -1e9, zMinA = 1e9, zMaxA = -1e9, yMin = 1e9, yMax = -1e9;
    parts.forEach((p) => { yMin = Math.min(yMin, p.base.y - p.size.y / 2 + Math.min(0, p.explode.y)); yMax = Math.max(yMax, p.base.y + p.size.y / 2 + Math.max(0, p.explode.y)); rxy = Math.max(rxy, Math.hypot(p.base.x, p.base.y) + Math.max(p.size.x, p.size.y) / 2); zMin = Math.min(zMin, p.base.z - p.size.z / 2 + Math.min(0, p.explode.z)); zMax = Math.max(zMax, p.base.z + p.size.z / 2 + Math.max(0, p.explode.z)); zMinA = Math.min(zMinA, p.base.z - p.size.z / 2); zMaxA = Math.max(zMaxA, p.base.z + p.size.z / 2); });
    const D = rxy * 2, zExt = Math.max(1, zMax - zMin), zf = W * 0.7 / (ORI ? Math.max(D, (zMaxA - zMinA) * 0.9) : D) * (asp === '9:16' ? 1.22 : 1) * (dir.zoom || 1), cy = H * (asp === '9:16' ? 0.5 : 0.48), zc = (zMin + zMax) / 2, shExt = Math.max(rxy * 2.5, zExt * 0.9);
    ['left', 'bottom'].forEach((k) => { key.shadow.camera[k] = -shExt; }); ['right', 'top'].forEach((k) => { key.shadow.camera[k] = shExt; }); key.shadow.camera.updateProjectionMatrix();
    st.floor.scale.setScalar(Math.max(0.1, Math.max(D, zExt) * 5 / 1200));      // el plano de sombra sigue el tamano del objeto (si no, su borde lejano sale de la luz y se ve una franja gris)
    st.ao.updateGtaoMaterial({ radius: D * 0.088, thickness: D * 0.05 }); parts.forEach((p) => { p.from.set(0, 0, D * 1.1); p.arc.set(0, D * 0.18, 0); });      // todo escala con el objeto: un switch de 16 mm y un buje de 80 mm
    const mk = (yaw, pitch, zoom, o) => Object.assign({ yaw, pitch, zoom, tx: ctr.x, ty: ctr.y, tz: ctr.z, cx: W / 2, cy, dof: 0 }, o || {});
    const VW = { front: mk(0, 0, zf * 0.92), iso: mk(-34, 22, zf * (ORI ? 0.85 : 0.7)), side: mk(-72, 14, zf * (ORI ? 0.95 : 0.6)), expl: mk(-50, 18, W * 0.8 / (ORI ? Math.max(D, zExt, yMax - yMin) * 1.2 : D * 0.62 + zExt * 0.8)), three: mk(-18, 40, zf * (ORI ? 0.85 : 0.72)) };
    Object.keys(dir.views || {}).forEach((k) => { VW[k] = Object.assign({}, VW[k] || VW.iso, dir.views[k]); });      // las vistas del spec se mezclan sobre las de fabrica
    // Autofit: project the box of the assembled object with the real camera and set each view's zoom so it fills the stage (about 78 % of the width or 46 % of the height).
    // The old fit used a circle around the origin, which leaves tall, flat or off-centre objects small. A spec that sets director.zoom keeps its own zoom.
    if ((!dir.zoom || q.has('fit')) && dir.fit !== false && !q.has('nofit')) {
      const FW = W * 0.8, FH = H * (asp === '9:16' ? 0.42 : 0.48), cs = [];
      [wbox.min.x, wbox.max.x].forEach((x) => [wbox.min.y, wbox.max.y].forEach((y) => [wbox.min.z, wbox.max.z].forEach((z) => cs.push([x, y, z]))));
      ['iso', 'three', 'front', 'side'].forEach((k) => {
        F.setView(VW[k]); const pts = cs.map((q) => st.project(q[0], q[1], q[2])), xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), w = Math.max(1, Math.max(...xs) - Math.min(...xs)), h = Math.max(1, Math.max(...ys) - Math.min(...ys));
        VW[k].zoom *= Math.max(1, Math.min(2.4, Math.min(FW / w, FH / h)));      /* only ever enlarge: an object that already fills the stage keeps its view */
      });
    }
    const shot = (id, o) => { const p = parts.find((x) => x.id === id), dim = Math.max(p.size.x, p.size.y, p.size.z * 0.6) * (p.spec.tourDim || 1); /* part.tourDim widens the shot of a part whose motion carries it away from where the camera aims */ const ta = p.spec.tourAt || [0, 0, 0]; return Object.assign(F.shot(id, { dx: ta[0], dy: ta[1], dz: ta[2], yaw: o.yaw, pitch: o.pitch, zoom: clamp(W * 0.5 / dim, 1.2, 140), e: 1, cy: cy - 40 }), { dof: o.dof == null ? 0.5 : o.dof }); };

    /* ---------------------------------------------------------- plan del video */
    const order = parts.slice().sort((a, b) => (a.spec.late ? 1 : 0) - (b.spec.late ? 1 : 0) || a.base.z - b.base.z || parts.indexOf(a) - parts.indexOf(b)), N = order.length, step = Math.min(SHORT ? 0.12 : 0.3, (SHORT ? 2.4 : 6.2) / N), arrive = {};
    const COLD = dir.cold && !SHORT ? (dir.cold.dur || 8) : 0;      // apertura: la pregunta y las respuestas publicadas, antes de armar nada
    order.forEach((p, i) => { arrive[p.id] = 0.9 + COLD + i * step; });
    const ASM_END = 0.9 + COLD + (N - 1) * step + 1.1, MD = SHORT ? Math.min(dir.modeDur || 4.6, 2.6) : (dir.modeDur || 4.6) * (LONG ? 1.3 : 1), TD = SHORT ? 2.2 : (dir.tourDur || 3.3) * (LONG ? 1.2 : 1), HOLD = SHORT ? 0 : dir.hold || 0, tM0 = ASM_END + 0.3 + HOLD, KD = (dir.keyDur || 1.35) * (SHORT ? 0.6 : 1), runs = an.enigmaRuns || [];
    // lo que el gate comparo: valor publicado y valor del modelo, una fila por comprobacion (sirve a la apertura y al recibo)
    const VROWS = (() => {
      const r = [];
      (an.enigmaTests || []).forEach((t, i) => { const T0 = (M && M.enigma && M.enigma.tests[i]) || {}; r.push({ label: t.id, pub: t.expect || (T0.windows || []).join(' '), got: t.expect ? t.got : (T0.windows || []).join(' '), ok: t.ok }); });
      if (!r.length) an.modes.forEach((m) => { if (m.publish) r.push({ conv: !!m.conv, label: m.label, pub: String(m.publish.text != null ? m.publish.text : m.publish.value != null ? m.publish.value : m.publish.length + ' moves'), got: m.text != null && m.text !== '' ? String(m.text) : m.ratio != null ? String(Math.round(m.ratio * 10000) / 10000) : '', ok: m.ok }); });
      return r;
    })(), VOK = VROWS.every((r) => r.ok !== false), VPEND = VROWS.filter((r) => r.ok == null).length, VSTAMP = !VOK ? 'DOES NOT PASS' : !VROWS.length ? 'NOTHING CHECKED' : VPEND ? 'INCOMPLETE' : VROWS.every((q) => q.conv) ? 'ONLY CONVERSIONS' : 'VERIFIED';
    const MQ = ((CUBE && M.cube.quarter) || 0.34) * (SHORT ? 0.5 : 1), MH = ((CUBE && M.cube.half) || 0.5) * (SHORT ? 0.5 : 1), MG = SHORT ? 0.03 : 0.05, cubeDur = (r) => r.moves.reduce((s2, mv) => s2 + (mv.q === 2 ? MH : MQ) + MG, 0);
    const SR = STEPS ? M.steps.rate * (SHORT ? 2.6 : 1) : 1, keepSet = (() => {
      if (!SHORT || modes.length <= 3 || CUBE || ENIG) return null; const pick = dir.short && dir.short.modes, set = new Set();
      if (pick) pick.forEach((id) => { const i = modes.findIndex((m) => m.id === id); if (i >= 0) set.add(i); });
      else { modes.forEach((m, i) => { if (m.steps) set.add(i); }); modes.forEach((m, i) => { if (set.size < 3 && m.publish && !set.has(i)) set.add(i); }); modes.forEach((m, i) => { if (set.size < 3) set.add(i); }); }
      return set;
    })(), keepMode = (k) => !keepSet || keepSet.has(k);      // a mode that is not kept lasts 0 s: the clock skips it
    const mD = modes.map((m, k) => (!keepMode(k) ? 0 : STEPS && m.steps ? Math.max(SHORT ? 3 : 4.5, 1.2 + M.steps.count / SR + 1.6) : CUBE ? Math.max(4.5, 1.0 + cubeDur(an.cubeRuns[k]) + 1.5) : ENIG ? 1.1 + (runs[k] ? runs[k].events.length : 1) * KD + 0.6 : MD)), mS = []; { let acc = tM0; mD.forEach((d) => { mS.push(acc); acc += d; }); }
    // pasos: el reloj de un proceso que ocurre ficha por ficha; vale 0 antes de la fase y count despues
    const sMode = STEPS ? modes.findIndex((m) => m.steps) : -1, stepIdx = (t) => (sMode < 0 ? 0 : clamp((t - mS[sMode] - 1.0) * SR, 0, M.steps.count));
    // cubo: la lista de giros con su tiempo, y el estado entero del cubo antes de cada uno
    const CEV = [], CST = [];
    if (CUBE) { const cur = CB.create(); an.cubeRuns.forEach((run, k) => { let t = mS[k] + 1.0; run.moves.forEach((mv) => { const d = mv.q === 2 ? MH : MQ; CST.push(CB.clone(cur)); CEV.push({ t0: t, t1: t + d, mv, k }); CB.turn(cur, mv); t += d + MG; }); }); CST.push(CB.clone(cur)); }
    const cubeDone = (t) => { let i = 0; while (i < CEV.length && CEV[i].t1 <= t) i++; return i; };
    const cubeFrame = (t) => {
      let i = -1; for (let j = 0; j < CEV.length && CEV[j].t0 <= t; j++) i = j;
      if (i < 0) return CST.length ? CST[0] : CB.create(); const ev = CEV[i]; if (t >= ev.t1) return CST[i + 1];
      const u = E.sm((t - ev.t0) / (ev.t1 - ev.t0)), a = -ev.mv.q * Math.PI / 2 * u, cs = Math.cos(a), sn = Math.sin(a), nn = CB.FACES[ev.mv.face], x = nn[0], y = nn[1], z = nn[2];
      const Rm = [cs + (1 - cs) * x * x, (1 - cs) * x * y - sn * z, (1 - cs) * x * z + sn * y, (1 - cs) * y * x + sn * z, cs + (1 - cs) * y * y, (1 - cs) * y * z - sn * x, (1 - cs) * z * x - sn * y, (1 - cs) * z * y + sn * x, cs + (1 - cs) * z * z];
      const mulv = (m, v) => [0, 1, 2].map((r) => m[r * 3] * v[0] + m[r * 3 + 1] * v[1] + m[r * 3 + 2] * v[2]);
      return CST[i].map((c) => (CB.inLayer(c, ev.mv.face) ? { pos: mulv(Rm, c.pos), R: [0, 1, 2].flatMap((r) => [0, 1, 2].map((q) => Rm[r * 3] * c.R[q] + Rm[r * 3 + 1] * c.R[3 + q] + Rm[r * 3 + 2] * c.R[6 + q])) } : c));
    };
    const tMend = tM0 + mD.reduce((s2, d) => s2 + d, 0), tE0 = tMend + (modes.length ? 0.2 : 0.4), ED = SHORT ? 1.8 : 2.8, tT0 = tE0 + ED + 0.4;
    const tourAll = parts.filter((p) => p.spec.tour !== false && p.info && !p.spec.decor).sort((a, b) => (a.base.z + a.explode.z) - (b.base.z + b.explode.z)).map((p) => p.id);
    const tourIds = SHORT ? (((dir.short && dir.short.tour) || dir.tour || tourAll).slice(0, 2)) : LONG ? tourAll.slice(0, 12) : (dir.tour || tourAll);
    const tR0 = tT0 + tourIds.length * TD, RD = SHORT ? 1.4 : 2.6, tP0 = tR0 + RD + 0.3, PD = 5.4;
    // paginado de la tabla de evidencia (se mide con la misma tipografia con que se dibuja)
    const CW = W - 86 * 2 - 188, FONT = '400 23px ' + MX.SANS, pages = [];
    { let cur = [], used = 0; const room = H - 216 - 34 - 290;
      claims.forEach((c) => { const lines = wrap(c.text + (c.cross ? '  Cross-check: ' + c.cross : c.why ? '  ' + c.why : ''), FONT, CW), h = lines.length * 29 + 54; if (used + h > room && cur.length) { pages.push(cur); cur = []; used = 0; } cur.push({ c, lines, h }); used += h; });
      if (cur.length) pages.push(cur); }
    const panels = []; let tp = tP0;
    if (modes.length && !SHORT) { panels.push({ kind: 'ratios', t0: tp, t1: tp + PD }); tp += PD; }
    if (PRESS && M.press.force && !SHORT) { panels.push({ kind: 'curve', t0: tp, t1: tp + PD + 1.6 }); tp += PD + 1.6; }
    if (!SHORT) pages.forEach((pg, i) => { panels.push({ kind: 'claims', page: i, rows: pg, t0: tp, t1: tp + PD + 0.6 }); tp += PD + 0.6; });
    if (!SHORT || !VROWS.length) { panels.push({ kind: 'sources', t0: tp, t1: tp + (SHORT ? 3 : 5) }); tp += SHORT ? 3 : 5; }
    if (VROWS.length) { const vd = SHORT ? 4.5 : 6.5; panels.push({ kind: 'verdict', t0: tp, t1: tp + vd }); tp += vd; }
    if (dir.outro !== false) { const od = SHORT ? 2.8 : 3.4; panels.push({ kind: 'outro', t0: tp, t1: tp + od }); tp += od; }      /* the cut is shared out of context: say what it is and where it lives */
    const DUR = Math.ceil(tp * 2) / 2;

    // velocidad del conductor: parado mientras se arma, vivo en los modos (con un bache en cada cambio), lento en el recorrido
    const sk = [[0, 0], [tM0, 0], [tM0 + 0.9, 1]];
    modes.forEach((m, k) => { if (k && mD[k]) { const tb = mS[k]; sk.push([tb - 0.45, 1], [tb, 0.08], [tb + 0.55, 1]); } });
    sk.push([tE0 - 0.3, 1], [tE0 + 0.8, 0.4], [tR0, 0.4], [tR0 + 1.2, 0.7], [DUR, 0.3]);
    const speedAt = (t) => { let i = 0; while (i < sk.length - 2 && t >= sk[i + 1][0]) i++; const [t0, a] = sk[i], [t1, b] = sk[i + 1]; return lerp(a, b, E.sm(clamp((t - t0) / Math.max(1e-6, t1 - t0), 0, 1))); };
    const modeIdx = (t) => { if (!modes.length) return -1; let k = 0; while (k < modes.length - 1 && t >= mS[k + 1] - 1e-6) k++; return k; };
    const modeAt = (t) => (modes.length ? modes[modeIdx(t)] : null);
    const TL = an.K ? new Timeline(an, drive.rpm, DUR, modeAt, speedAt) : null;
    // mecanismo de presion: el recorrido x (mm) de cada fase va de from a to con arranque y frenado suaves
    const pressAt = (t) => { if (!PRESS || !modes.length) return 0; if (t < tM0) return modes[0].from; const k = modeIdx(t), m = modes[k]; return lerp(m.from, m.to, E.sm(ramp(t - mS[k], 0.15, mD[k] - 0.35))); };
    // motor: el angulo del ciguenal es la integral de la velocidad del conductor (parado mientras se arma, vivo en las fases, lento en el despiece)
    const EGT = ENGN ? (() => { const m2 = Math.ceil(DUR * 60) + 2, arr = new Float32Array(m2), rate = (drive.rpm || 40) * 6 * RAD; let th = 0; for (let i = 1; i < m2; i++) { th += rate * speedAt(i / 60) / 60; arr[i] = th; } return arr; })() : null;
    const thetaAt = (t) => { const x = clamp(t * 60, 0, EGT.length - 2), i = Math.floor(x); return lerp(EGT[i], EGT[i + 1], x - i); };
    const crankDeg = (th) => ((th / RAD) % 720 + 720) % 720;
    const enig = ENIG ? makeEnigma() : null;
    const mechAt = (t) => (ENIG ? enig.mech(t) : CUBE ? { ang: () => 0, press: 0, cube: cubeFrame(t) } : ENGN ? { ang: () => 0, press: 0, eng: { theta: thetaAt(t) } } : TL ? Object.assign(TL.view(t), { press: pressAt(t) }) : { ang: () => 0, press: pressAt(t), step: stepIdx(t), phase: Math.max(0, modeIdx(t)) });

    // camara por claves
    const keys = [[0, Object.assign({}, VW.iso, { zoom: VW.iso.zoom * 0.5, yaw: -62, pitch: 30 })], [ASM_END, VW.iso, [0.3, 0, 0.2, 1]]];
    if (HOLD) keys.push([ASM_END + HOLD * 0.5, Object.assign({}, VW.iso, { yaw: VW.iso.yaw + 22, pitch: VW.iso.pitch + 4, zoom: VW.iso.zoom * 1.06 })], [ASM_END + HOLD, Object.assign({}, VW.iso, { yaw: VW.iso.yaw - 6, pitch: VW.iso.pitch + 8 })]);      // toma de presentacion: el objeto entero, con su marca, antes de abrirlo
    const cyc = [VW.front, VW.iso, VW.side, VW.three];
    modes.forEach((m, k) => { if (!mD[k]) return; const t = mS[k]; keys.push([t + 0.5, Object.assign({}, k % 2 ? cyc[k % 4] : cyc[(k + 1) % 4]), [0.45, 0, 0.2, 1]]); keys.push([t + mD[k] - 0.2, Object.assign({}, cyc[(k + 2) % 4], { yaw: cyc[(k + 2) % 4].yaw + 8 })]); });
    keys.push([tE0 + ED, VW.expl, [0.4, 0, 0.15, 1]]);
    const YP = dir.tourAngles || [[-38, 20], [-20, 12], [-58, 26], [-30, 8], [-48, 30]];      // director.tourAngles: [[yaw, pitch], ...] for objects whose natural view is not the default one
    tourIds.forEach((id, j) => { const ts = tT0 + j * TD, [y, p] = YP[j % YP.length]; keys.push([ts + 0.3, shot(id, { yaw: y, pitch: p }), [0.5, 0, 0.15, 1]]); keys.push([ts + TD - 0.1, shot(id, { yaw: y + 9, pitch: p - 3, dof: 0.8 }), [0.2, 0, 0.8, 1]]); });
    keys.push([tR0 + RD, Object.assign({}, VW.iso, { zoom: VW.iso.zoom * 0.88 }), [0.4, 0, 0.2, 1]], [DUR, Object.assign({}, VW.iso, { zoom: VW.iso.zoom * 0.8, yaw: -26 })]);
    keys.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < keys.length; i++) if (keys[i][0] <= keys[i - 1][0]) keys[i][0] = keys[i - 1][0] + 0.01;

    const stag = {}; order.slice().sort((a, b) => (a.explode.length() - b.explode.length())).forEach((p, i) => { stag[p.id] = i / Math.max(1, N - 1); });
    const tourAt = (t) => { const n = tourIds.length, jj = Math.floor((t - tT0) / TD); if (jj < 0 || !n || t >= tR0 + RD) return null; if (jj >= n) return { id: tourIds[n - 1], a: 1 - ramp(t, tR0 + RD * 0.55, tR0 + RD), j: n - 1 }; const ts = tT0 + jj * TD; return { id: tourIds[jj], a: jj === 0 ? ramp(t, ts - 0.35, ts + 0.15) : 1, j: jj }; };      // the rest stays dimmed between two stops and until the camera has flown back out: through the shell the frame would go white
    const cutSet = Object.fromEntries(parts.filter((p) => p.spec.cutaway).map((p) => [p.id, typeof p.spec.cutaway === 'number' ? p.spec.cutaway : 0.9]));   // piezas que se vuelven casi transparentes mientras corre el mecanismo (vista de corte)
    const script = (t) => {
      const cut = ramp(t, tM0 - 0.3, tM0 + 0.5) * (1 - ramp(t, tE0 - 0.6, tE0 - 0.1)), ex = ramp(t, tE0, tE0 + ED), re = ramp(t, tR0, tR0 + RD), eg = ex * (1 - re), tr = tourAt(t), md = modeAt(t);
      const s = { t, e: eg, explodeK: (id) => { const dl = stag[id] * 0.35, a = E.sm(ramp(ex, dl, dl + 0.65)), b = E.sm(ramp(re, (1 - stag[id]) * 0.35, (1 - stag[id]) * 0.35 + 0.65)); return a * (1 - b); },
        assemble: (id) => { const k = E.outBack(ramp(t, arrive[id], arrive[id] + 0.95), 1.1); return { k: Math.min(1.04, k) > 1 ? 1 : k, alpha: ramp(t, arrive[id], arrive[id] + 0.3) * (cutSet[id] ? 1 - cutSet[id] * cut : 1) }; },
        focus: tr ? tr.id : null, focusA: tr ? tr.a : 0, dimTo: 0.012, light: { az: -38 + 26 * Math.sin(t * 0.23), el: 54 },
        mech: mechAt(t), hint: t < COLD ? 'THE QUESTION' : t < ASM_END ? 'ASSEMBLY' : t < tE0 ? (PRESS ? 'KEY PRESS' : ENIG ? 'ENCIPHERING' : CALC ? 'THE NUMBERS' : CUBE ? 'FACE TURNS' : ENGN ? 'FOUR-STROKE CYCLE' : 'POWER PATH') : t < tT0 ? 'EXPLODED VIEW' : t < tR0 ? 'PART ' + ((tr ? tr.j : tourIds.length - 1) + 1) + ' OF ' + tourIds.length : t < tP0 ? 'RE-ASSEMBLY' : 'EVIDENCE',
        readout: md && t >= tM0 && t < tR0 ? md.label + '  -  ' + (PRESS ? pressAt(t).toFixed(2) + ' mm' : ENIG ? ((mechAt(t).enigma || {}).window || '') : CALC ? an.modes[modeIdx(t)].text + (md.unit ? ' ' + md.unit : '') : CUBE ? cubeDone(t) + ' turns' : ENGN ? Math.round(crankDeg(mechAt(t).eng.theta)) + ' / 720 deg' : an.modes[modeIdx(t)].ratio.toFixed(3) + ' : 1') : parts.length + ' parts', infoAt: [64, H - 360] };
      s.modeA = md && t >= tM0 && t < tE0 ? Math.min(ramp(t, tM0, tM0 + 0.6), 1 - ramp(t, tE0 - 0.5, tE0 - 0.1)) : 0; s.mode = md; s.modeI = modeIdx(t); s.speed = speedAt(t); s.step = stepIdx(t);
      if (CALC && md && md.show && s.modeA > 0.01) { s.focusSet = md.show; s.focusA = s.modeA * 0.9; s.dimTo = md.dim == null ? 0.55 : md.dim; }
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
      MX.A = 1; MX.text(m.label, X0, y, { size: lblFit(m.label), font: MX.SERIF, w: 500, color: T.ink }); MX.text(m.formula || '', X0, y + 42, { size: 21, font: MX.SANS, color: T.mute });
      MX.text(x.toFixed(2) + ' ' + u, W - X0, y - 2, { size: 64, font: MX.SERIF, w: 500, color: T.ink, align: 'right' });
      tagPill(c, W - X0 - 150, y + 44, act ? 'spec' : 'estimated', act ? 'ACTUATED' : 'OPEN');
      if (m.publish) { const cl = claimBy[m.publish.claim]; tagPill(c, W - X0 - 340, y + 44, cl ? cl.conf : 'spec', (cl ? CONFNAME[cl.conf] : 'SPEC') + ' ' + m.publish.text); }
      const bar = (yy, label, v, mx, col, txt) => { MX.text(label, X0, yy + 5, { size: 15, font: MX.SANS, color: T.mute, spacing: 2.2, w: 600 }); c.fillStyle = MX.rgba(T.ink, 0.12); c.fillRect(X0 + 150, yy - 8, 430, 12); c.fillStyle = col; c.fillRect(X0 + 150, yy - 8, 430 * clamp(v / mx, 0, 1), 12); MX.text(txt, X0 + 600, yy + 5, { size: 18, font: MX.SANS, color: T.ink, w: 500 }); };
      bar(y + 92, 'TRAVEL', x, pr.travel, T.teal, x.toFixed(2) + ' ' + u); bar(y + 124, 'FORCE', Fv, fmax, T.ember, Math.round(Fv) + ' ' + fu);
      c.restore();
    };
    // motor: la cifra de la fase a la derecha y, abajo, el ciclo de 720 grados de cada cilindro con la posicion actual del ciguenal
    const STK = ['POWER', 'EXHAUST', 'INTAKE', 'COMPRESSION'];
    const drawEngine = (c, s) => {
      const a = s.modeA; if (!(a > 0.01)) return; const mi = s.modeI, m = modes[mi], r = an.modes[mi], x = 78, y = H - 318, th = crankDeg(s.mech.eng.theta), bw = 430, col = [T.ember, T.mute, T.teal, T.ink];
      c.save(); c.globalAlpha = a; c.fillStyle = MX.rgba(T.paper, T.dark ? 0.86 : 0.9); c.fillRect(x - 24, y - 70, W - 2 * x + 48, 262); c.fillStyle = T.teal; c.fillRect(x - 24, y - 70, 4, 262);
      MX.A = 1; MX.text(m.label, x, y, { size: lblFit(m.label), font: MX.SERIF, w: 500, color: T.ink }); MX.text(m.formula || '', x, y + 42, { size: fmlFit(m.formula, m.publish, x), font: MX.SANS, color: T.mute });
      MX.text(r.text + (m.unit ? ' ' + m.unit : ''), W - x, y - 2, { size: valFit(r.text + (m.unit ? ' ' + m.unit : ''), m.label), font: MX.SERIF, w: 500, color: T.ink, align: 'right' });
      if (m.publish) { const cl = claimBy[m.publish.claim], w = 190; tagPill(c, W - x - w - 4, y + 44, cl ? cl.conf : 'spec', (cl ? CONFNAME[cl.conf] : 'SPEC') + ' ' + (m.publish.text || m.publish.value)); MX.text(r.ok ? 'matches the model' : 'MISMATCH', W - x - w - 18, y + 44, { size: 19, font: MX.SANS, color: r.ok ? T.teal : T.ember, align: 'right', w: 500 }); }
      for (let k = 0; k < AE.n; k++) {
        const yy = y + 92 + k * 28, ph = EGE.phase(th, AE.ign[k]), name = EGE.stroke(ph); MX.text('CYL ' + (k + 1), x, yy + 5, { size: 15, font: MX.SANS, color: T.mute, spacing: 2.2, w: 600 });
        STK.forEach((nm, q) => { c.fillStyle = MX.rgba(col[q], nm === name ? 0.9 : 0.2); c.fillRect(x + 150 + q * bw / 4 + 1, yy - 8, bw / 4 - 2, 12); });
        c.fillStyle = T.ink; c.fillRect(x + 150 + bw * ph / 720 - 1.5, yy - 13, 3, 22); MX.text(name, x + 600, yy + 5, { size: 18, font: MX.SANS, color: ph < 30 ? T.ember : T.ink, w: 500 });
      }
      c.restore();
    };
    // cubo: la secuencia de la fase con el giro actual resaltado, y el estado real del cubo (aristas dadas vuelta, esquinas en su sitio)
    const drawCube = (c, s) => {
      const a = s.modeA; if (!(a > 0.01)) return; const mi = s.modeI, m = modes[mi], r = an.modes[mi], run = an.cubeRuns[mi], x = 78, y = H - 318, t = s.t, nDone = cubeDone(t);
      c.save(); c.globalAlpha = a; c.fillStyle = MX.rgba(T.paper, T.dark ? 0.86 : 0.9); c.fillRect(x - 24, y - 70, W - 2 * x + 48, 262); c.fillStyle = T.teal; c.fillRect(x - 24, y - 70, 4, 262);
      MX.A = 1; MX.text(m.label, x, y, { size: lblFit(m.label), font: MX.SERIF, w: 500, color: T.ink }); MX.text(m.formula || '', x, y + 42, { size: fmlFit(m.formula, m.publish, x), font: MX.SANS, color: T.mute });
      MX.text(r.text + (m.unit ? ' ' + m.unit : ''), W - x, y - 2, { size: valFit(r.text + (m.unit ? ' ' + m.unit : ''), m.label), font: MX.SERIF, w: 500, color: T.ink, align: 'right' });
      if (m.publish) { const cl = claimBy[m.publish.claim], w = 190; const pt = String(m.publish.text || m.publish.value || m.publish.length + ' MOVES'); tagPill(c, W - x - w - 4, y + 44, cl ? cl.conf : 'spec', (cl ? CONFNAME[cl.conf] : 'SPEC') + (pt.length > 14 ? '' : ' ' + pt)); MX.text(r.ok ? 'matches the model' : 'MISMATCH', W - x - w - 18, y + 44, { size: 19, font: MX.SANS, color: r.ok ? T.teal : T.ember, align: 'right', w: 500 }); }
      const first = CEV.findIndex((q) => q.k === mi), cur = first < 0 ? 0 : clamp(nDone - first, 0, run.moves.length), per = 15, st0 = clamp(cur - 6, 0, Math.max(0, run.moves.length - per));
      run.moves.slice(st0, st0 + per).forEach((mv, j) => { const gi = st0 + j, col = gi < cur ? T.mute : gi === cur ? T.ember : T.ink; MX.text(mv.text, x + j * 62, y + 112, { size: 32, font: MX.MONO, w: gi === cur ? 700 : 500, color: col }); });
      if (run.moves.length) MX.text(cur + ' of ' + run.moves.length + ' turns', W - x, y + 170, { size: 20, font: MX.SANS, color: T.mute, align: 'right' });
      const cl2 = CB.classify(CST[Math.min(nDone, CST.length - 1)] || CB.create());
      MX.text('EDGES IN PLACE ' + cl2.edgesInPlace + '/12   FLIPPED ' + cl2.edgesFlipped + '      CORNERS IN PLACE ' + cl2.cornersInPlace + '/8   TWISTED ' + cl2.cornersTwisted, x, y + 170, { size: 17, font: MX.SANS, w: 600, color: cl2.solved ? T.teal : T.ink, spacing: 1.4 });
      c.restore();
    };
    // cuentas: la cifra de la fase, su formula, y las variables que usa con la confianza de cada una
    const drawCalc = (c, s) => {
      const a = s.modeA; if (!(a > 0.01)) return; const mi = s.modeI, m0 = modes[mi], SL = m0.steps ? M.steps.label(Math.min(M.steps.count - 1, Math.floor(s.step || 0))) : null, m = SL ? Object.assign({}, m0, { label: SL.title, formula: SL.formula, publish: null, unit: '' }) : m0, r = SL ? Object.assign({}, an.modes[mi], { text: SL.value }) : an.modes[mi], x = 78, y = H - 318, V = M.calc.vars, big = (r.text + (m.unit ? ' ' + m.unit : '')).length > 11;
      c.save(); c.globalAlpha = a; c.fillStyle = MX.rgba(T.paper, T.dark ? 0.86 : 0.9); c.fillRect(x - 24, y - 70, W - 2 * x + 48, 262); c.fillStyle = T.teal; c.fillRect(x - 24, y - 70, 4, 262);
      MX.A = 1; const fit = (str, size, wfont, maxW) => { c.save(); c.font = wfont + ' ' + size + 'px ' + MX.SERIF; const w0 = c.measureText(str).width; c.restore(); return w0 > maxW ? size * maxW / w0 : size; }, valTxt = r.text + (m.unit ? ' ' + m.unit : ''), vs = fit(valTxt, big ? 46 : 64, 500, (W - 2 * x) * 0.5), ls = fit(m.label, 56, 500, (W - 2 * x) - vs * 0.62 * valTxt.length - 40);
      MX.text(m.label, x, y, { size: Math.max(26, ls), font: MX.SERIF, w: 500, color: T.ink }); MX.text(m.formula || '', x, y + 42, { size: fmlFit(m.formula, m.publish, x), font: MX.SANS, color: T.mute });
      MX.text(valTxt, W - x, y - 2, { size: vs, font: MX.SERIF, w: 500, color: T.ink, align: 'right' });
      if (m.publish) { const cl = claimBy[m.publish.claim], w = 190, pt = String(m.publish.text || m.publish.value); tagPill(c, W - x - w - 4, y + 44, cl ? cl.conf : 'spec', (cl ? CONFNAME[cl.conf] : 'SPEC') + (pt.length > 14 ? '' : ' ' + pt)); MX.text(r.ok ? 'matches the model' : 'MISMATCH', W - x - w - 18, y + 44, { size: 19, font: MX.SANS, color: r.ok ? T.teal : T.ember, align: 'right', w: 500 }); }
      if (SL) {      // fase por pasos: las fichas del paso actual y una barra de avance
        let cx = x, cy = y + 112; c.font = '600 17px ' + MX.MONO;
        (SL.chips || []).forEach((q) => { const txt = typeof q === 'string' ? q : q.text, col = (q && q.color) || T.teal, w = c.measureText(txt).width + 28; if (cx + w > W - x) { cx = x; cy += 42; } c.fillStyle = MX.rgba(col, 0.1); c.fillRect(cx, cy - 22, w, 32); c.strokeStyle = MX.rgba(col, 0.5); c.lineWidth = 1; c.strokeRect(cx + 0.5, cy - 21.5, w - 1, 31); MX.text(txt, cx + 14, cy, { size: 17, font: MX.MONO, w: 600, color: col }); cx += w + 12; });
        const pw = W - 2 * x; c.fillStyle = MX.rgba(T.ink, 0.12); c.fillRect(x, y + 168, pw, 5); c.fillStyle = T.teal; c.fillRect(x, y + 168, pw * clamp((s.step || 0) / M.steps.count, 0, 1), 5); c.restore(); return;
      }
      let cx = x, cy = y + 112; c.font = '600 17px ' + MX.SANS;
      r.used.forEach((k) => {
        const v = V[k], isO = v !== null && typeof v === 'object', val = isO ? v.v : v, cl = isO && v.claim ? claimBy[v.claim] : null, col = !cl ? T.ink : cl.conf === 'estimated' ? T.ember : cl.conf === 'derived' ? T.ink : T.teal;
        const txt = (isO && v.label ? v.label : k) + '  ' + val.toLocaleString('en-US') + (isO && v.unit ? ' ' + v.unit : ''), w = c.measureText(txt).width + 28;
        if (cx + w > W - x) { cx = x; cy += 42; }
        c.fillStyle = MX.rgba(col, 0.1); c.fillRect(cx, cy - 22, w, 32); c.strokeStyle = MX.rgba(col, 0.5); c.lineWidth = 1; c.strokeRect(cx + 0.5, cy - 21.5, w - 1, 31); MX.text(txt, cx + 14, cy, { size: 17, font: MX.SANS, w: 600, color: col }); cx += w + 12;
      });
      c.restore();
    };
    // the two texts of a row (title left, value right) shrink together until they do not touch
    const pairFit = (label, val, ls0, vs0, maxW) => { const c2 = MX.ctx; c2.save(); c2.font = '500 ' + ls0 + 'px ' + MX.SERIF; const wl = c2.measureText(String(label)).width; c2.font = '500 ' + vs0 + 'px ' + MX.SERIF; const wv = c2.measureText(String(val)).width; c2.restore(); const k = Math.min(1, maxW / (wl + wv + 40)); return [Math.max(24, ls0 * k), Math.max(24, vs0 * k)]; };
    // the formula line of a mode panel stops before the "matches the model" label that sits on its right when the mode publishes a figure
    const fmlFit = (str, pub, x) => { if (!str || !pub) return 21; const c2 = MX.ctx; c2.save(); c2.font = '500 19px ' + MX.SANS; const wc = c2.measureText('matches the model').width; c2.font = '21px ' + MX.SANS; const w0 = c2.measureText(String(str)).width; c2.restore(); const avail = W - x - 190 - 18 - wc - 16 - x; return w0 > avail ? Math.max(15, 21 * avail / w0) : 21; };
    const valFit = (str, label) => { const c2 = MX.ctx; c2.save(); c2.font = '500 ' + lblFit(label) + 'px ' + MX.SERIF; const wl = c2.measureText(String(label)).width; c2.font = '500 64px ' + MX.SERIF; const wv = c2.measureText(String(str)).width; c2.restore(); const avail = W - 2 * 78 - wl - 40; return Math.max(26, wv > avail ? 64 * avail / wv : 64); };
    const lblFit = (str) => { const c2 = MX.ctx; c2.save(); c2.font = '500 64px ' + MX.SERIF; const w0 = c2.measureText(String(str)).width; c2.restore(); return Math.max(34, w0 > 470 ? 64 * 470 / w0 : 64); };      // a phase label shrinks instead of running into its value
    const drawMode = (c, s) => {
      if (PRESS) return drawPress(c, s);
      if (ENIG) return drawEnigma(c, s);
      if (ENGN) return drawEngine(c, s);
      if (CUBE) return drawCube(c, s);
      if (CALC) return drawCalc(c, s);
      const a = s.modeA; if (!(a > 0.01)) return; const mi = s.modeI, m = modes[mi], r = an.modes[mi], x = 78, y = H - 318, ratio = r.ratio, drpm = drive.rpm * s.speed, hrpm = drpm * ratio;
      c.save(); c.globalAlpha = a; c.fillStyle = MX.rgba(T.paper, T.dark ? 0.86 : 0.9); c.fillRect(x - 24, y - 70, W - 2 * x + 48, 232); c.fillStyle = T.teal; c.fillRect(x - 24, y - 70, 4, 232);
      MX.A = 1; MX.text(m.label, x, y, { size: lblFit(m.label), font: MX.SERIF, w: 500, color: T.ink });
      MX.text(m.formula || '', x, y + 42, { size: fmlFit(m.formula, m.publish, x), font: MX.SANS, color: T.mute });
      MX.text(ratio.toFixed(3) + ' : 1', W - x, y - 2, { size: 64, font: MX.SERIF, w: 500, color: T.ink, align: 'right' });
      if (m.publish) { const cl = claimBy[m.publish.claim], w = 190; tagPill(c, W - x - w - 4, y + 44, cl ? cl.conf : 'spec', (cl ? CONFNAME[cl.conf] : 'SPEC') + ' ' + m.publish.text); MX.text(r.ok ? 'matches the model' : 'MISMATCH', W - x - w - 18, y + 44, { size: 19, font: MX.SANS, color: r.ok ? T.teal : T.ember, align: 'right', w: 500 }); }
      const bar = (yy, label, v, mx, col) => { MX.text(label, x, yy + 5, { size: 15, font: MX.SANS, color: T.mute, spacing: 2.2, w: 600 }); c.fillStyle = MX.rgba(T.ink, 0.12); c.fillRect(x + 150, yy - 8, 430, 12); c.fillStyle = col; c.fillRect(x + 150, yy - 8, 430 * clamp(v / mx, 0, 1), 12); MX.text((Math.abs(v) < 10 ? v.toFixed(2) : Math.round(v)) + ' rpm', x + 600, yy + 5, { size: 18, font: MX.SANS, color: T.ink, w: 500 }); };
      bar(y + 92, m.inLabel || drive.inLabel || 'DRIVER', drpm, drive.rpm * 1.6, T.teal); bar(y + 124, m.outLabel || drive.outLabel || 'OUTPUT', hrpm, drive.rpm * 1.6, T.ember);      /* labels per mode or per drive: a watch train is not a hub */
      c.restore();
    };
    const drawPanel = (c, pn, t) => {
      const a = Math.min(ramp(t, pn.t0, pn.t0 + 0.5), 1 - ramp(t, pn.t1 - 0.4, pn.t1)); if (a < 0.01) return;
      if (pn.kind === 'ratios') {
        if (!H2.panel(a, spec.fig || 'Fig', ENIG ? 'Run against the published tests' : ENGN || CUBE || CALC ? 'Computed from the geometry' : 'Measured against published', (CALC ? 'Every figure is computed from the numbers on the card and compared with what is published.' : CUBE ? 'The cube is 26 pieces that really turn; every figure below is read off them and compared with what is published.' : ENGN ? 'Every figure is computed from the drawn dimensions and compared with what the maker publishes.' : PRESS ? 'Each phase is read off the running model, then compared with the number the maker publishes.' : ENIG ? 'The machine is run on every published test and compared letter by letter.' : 'Each ratio is read off the running model, then compared with the number the maker publishes.'))) return;
        an.modes.forEach((r, i) => {
          const dns = an.modes.length > 7, cmp = an.modes.length > 5, m = modes[i], y = 540 + i * (cmp ? Math.min(168, 700 / (an.modes.length - 1)) : 168), ai = a * ramp(t, pn.t0 + 0.4 + i * 0.35, pn.t0 + 0.9 + i * 0.35), vtxt = ENIG ? r.text : ENGN || CUBE || CALC ? r.text + (m.unit ? ' ' + m.unit : '') : PRESS ? r.ratio.toFixed(2) + ' ' + (M.press.unit || 'mm') : r.ratio.toFixed(4), rf = pairFit(m.label, vtxt, dns ? 38 : cmp ? 44 : 54, dns ? 42 : cmp ? 48 : 58, W - 172 - (dns ? 200 : 0)), sy = dns ? 40 : cmp ? 52 : 74;      // more than five rows: tighter rows and no note line; more than seven: no formula line either and the tag sits beside the title, so they all fit in the frame
          const wl = dns ? (() => { c.save(); c.font = '500 ' + rf[0] + 'px ' + MX.SERIF; const w0 = c.measureText(String(m.label)).width; c.restore(); return w0; })() : 0;
          c.save(); c.globalAlpha = ai; c.strokeStyle = T.line; c.beginPath(); c.moveTo(86, y - sy); c.lineTo(W - 86, y - sy); c.stroke(); c.restore();
          MX.A = ai; MX.text(m.label, 86, y, { size: rf[0], font: MX.SERIF, w: 500 }); MX.text(dns ? '' : m.formula || '', 86, y + (cmp ? 28 : 36), { size: cmp ? 19 : 21, font: MX.SANS, color: T.mute }); MX.text(cmp ? '' : m.note || '', 86, y + 66, { size: 19, font: MX.SANS, color: T.mute });
          MX.text(vtxt, W - 86, y, { size: rf[1], font: MX.SERIF, w: 500, align: 'right' });
          if (m.publish) { const cl = claimBy[m.publish.claim]; c.save(); c.globalAlpha = ai; tagPill(c, dns ? 86 + wl + 18 : W - 86 - 330, dns ? y - 6 : y + (cmp ? 36 : 52), cl ? cl.conf : 'spec', (cl ? CONFNAME[cl.conf] : 'SPEC') + (dns && String(m.publish.text != null ? m.publish.text : m.publish.value).length > 12 ? '' : ' ' + (m.publish.text != null ? m.publish.text : m.publish.value != null ? m.publish.value : m.publish.length + ' moves')) + (r.ok ? '  OK' : '  MISMATCH')); c.restore(); }      // a long published figure (a byte string, a bit string) would run into the value: the tag then says only that it matches
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
      if (pn.kind === 'outro') {      // director.outro: { title, sub, line, url } to sign the film; nothing about the toolkit is drawn unless the spec asks for it
        const oc = dir.outro && typeof dir.outro === 'object' ? dir.outro : {};
        if (!H2.panel(a, spec.fig || 'Fig', oc.title || spec.title || '', oc.sub || spec.sub || '')) return;
        const o1 = ramp(t, pn.t0 + 0.5, pn.t0 + 1.0), o2 = ramp(t, pn.t0 + 0.9, pn.t0 + 1.4);
        MX.A = a * o1; MX.text((V.verdict ? V.verdict.state : '') + (V.verdict && oc.what ? '   -   ' : '') + (oc.what || ''), 86, 520, { size: 24, font: MX.MONO, w: 600, color: T.ink });
        MX.A = a * o2; if (oc.url) MX.text(oc.url, 86, 600, { size: 30, font: MX.MONO, w: 700, color: T.teal }); if (oc.line) MX.text(oc.line, 86, 646, { size: 20, font: MX.SANS, color: T.mute }); MX.A = a;
        H2.endPanel(); return;
      }
      if (pn.kind === 'verdict') {
        if (!H2.panel(a, spec.fig || 'Fig', 'Receipt', 'What was checked against what is published, and what was not.')) return;
        const rows = VROWS.slice(0, 7), nSpec = claims.filter((cc) => cc.conf === 'spec').length, nEst = claims.filter((cc) => cc.conf === 'estimated').length;
        rows.forEach((r, i) => {
          const y = 520 + i * 70, ai = a * ramp(t, pn.t0 + 0.4 + i * 0.28, pn.t0 + 0.8 + i * 0.28), col = r.ok === false ? T.ember : T.teal;
          c.save(); c.globalAlpha = ai; c.strokeStyle = T.line; c.beginPath(); c.moveTo(86, y - 44); c.lineTo(W - 86, y - 44); c.stroke(); c.restore();
          MX.A = ai; MX.text(String(r.label).slice(0, 34), 86, y, { size: 22, font: MX.MONO, color: T.mute }); MX.text(r.pub, W - 380, y, { size: (r.pub.length > 16 ? 15 : r.pub.length > 8 ? 22 : 28), font: MX.MONO, w: 600, color: T.ink, align: 'right' }); MX.text(r.got, W - 130, y, { size: (r.got.length > 16 ? 15 : r.got.length > 8 ? 22 : 28), font: MX.MONO, w: 600, color: col, align: 'right' }); MX.text(r.ok === false ? 'X' : 'OK', W - 86, y, { size: 22, font: MX.MONO, w: 700, color: col, align: 'right' }); MX.A = a;
        });
        MX.A = a * ramp(t, pn.t0 + 0.3, pn.t0 + 0.7); MX.text('PUBLISHED', W - 380, 470, { size: 13, font: MX.MONO, color: T.mute, align: 'right', spacing: 2.4 }); MX.text('MODEL', W - 130, 470, { size: 13, font: MX.MONO, color: T.mute, align: 'right', spacing: 2.4 }); MX.A = a;
        const sy = 520 + rows.length * 70 + 60, as = a * ramp(t, pn.t0 + 0.8 + rows.length * 0.28, pn.t0 + 1.4 + rows.length * 0.28), sc = 1 + 0.35 * (1 - ramp(t, pn.t0 + 0.8 + rows.length * 0.28, pn.t0 + 1.3 + rows.length * 0.28)), stamp = VSTAMP === 'VERIFIED' && V.verdict && V.verdict.state === 'CONSISTENT' ? 'CONSISTENT' : VSTAMP, scol = stamp === 'VERIFIED' ? T.teal : stamp === 'DOES NOT PASS' ? T.ember : T.gold || T.mute;
        c.save(); c.globalAlpha = as; c.translate(W / 2, sy + 30); c.rotate(-0.07); c.scale(sc, sc); c.strokeStyle = scol; c.lineWidth = 5; c.strokeRect(-250, -52, 500, 104); c.lineWidth = 1.5; c.strokeRect(-258, -60, 516, 120); c.restore();
        MX.A = as; c.save(); c.translate(W / 2, sy + 30); c.rotate(-0.07); c.scale(sc, sc); MX.text(stamp, 0, 20, { size: stamp.length > 12 ? 42 : 64, font: MX.MONO, w: 800, color: scol, align: 'center', spacing: 4 }); c.restore();
        MX.A = a * ramp(t, pn.t0 + 2.4, pn.t0 + 3.2); MX.text(rows.filter((r) => r.ok === true).length + ' of ' + rows.length + ' published figures reproduced' + (VPEND ? ', ' + VPEND + ' unchecked' : '') + '   -   ' + nSpec + ' published claims', 86, sy + 140, { size: 18, font: MX.MONO, color: T.mute }); MX.text(nEst + ' estimated, drawn dashed   -   ' + sources.length + ' sources opened', 86, sy + 174, { size: 18, font: MX.MONO, color: T.mute }); MX.A = a;
        H2.endPanel(); return;
      }
      if (pn.kind === 'claims') {
        if (!H2.panel(a, spec.fig || 'Fig', 'What the numbers stand on', 'Page ' + (pn.page + 1) + ' of ' + pages.length + '. Every claim names its source, its cross-check or why it is a guess.')) return;
        let y = 500;
        pn.rows.forEach((row, i) => {
          const ai = a * ramp(t, pn.t0 + 0.3 + i * 0.3, pn.t0 + 0.8 + i * 0.3); c.save(); c.globalAlpha = ai; c.strokeStyle = T.line; c.beginPath(); c.moveTo(86, y - 36); c.lineTo(W - 86, y - 36); c.stroke(); tagPill(c, 86, y, row.c.conf); c.restore();
          MX.A = ai; row.lines.forEach((ln, k) => MX.text(ln, 86 + 188, y + k * 29 - 2, { size: 23, font: MX.SANS, color: T.ink }));
          const srcs = (row.c.src || []).map((id) => (sources.find((qq) => qq.id === id) || { title: id }).title).join('  -  ');
          if (srcs) { c.save(); c.font = '16px ' + MX.SANS; let s2 = srcs; while (s2.length > 8 && c.measureText(s2).width > W - 86 - 274) s2 = s2.slice(0, -2); c.restore(); if (s2 !== srcs) s2 = s2.replace(/[\s-]+$/, '') + '...'; MX.text(s2, 86 + 188, y + row.lines.length * 29 + 4, { size: 16, font: MX.SANS, color: T.mute }); }      // the sources of a claim stop at the edge of the panel; the whole list is on the sources page
          MX.A = a; y += row.h;
        });
        H2.endPanel(); return;
      }
      if (!H2.panel(a, spec.fig || 'Fig', 'Sources', 'Opened ' + ((sources[0] && sources[0].fetched) || '') + '. Where a page refused us, it says so.')) return;
      let y = 500; const nls = sources.map((sr) => wrap(sr.note || '', '400 18px ' + MX.SANS, W - 172)), shr = Math.max(0, Math.min(28, (nls.reduce((q, l) => q + 98 + l.length * 24, 0) - (H - 110 - 500)) / Math.max(1, sources.length)));      // many sources: the rows come closer together so the last one ends above the footer
      sources.forEach((sr, i) => {
        const ai = a * ramp(t, pn.t0 + 0.3 + i * 0.3, pn.t0 + 0.8 + i * 0.3); MX.A = ai; c.save(); c.globalAlpha = ai; c.strokeStyle = T.line; c.beginPath(); c.moveTo(86, y - 36); c.lineTo(W - 86, y - 36); c.stroke(); c.restore();
        let stl = String(sr.title), tsz = 27; c.save(); c.font = '500 27px ' + MX.SERIF; const tw = c.measureText(stl).width; if (tw > W - 172) { tsz = Math.max(17, 27 * (W - 172) / tw); c.font = '500 ' + tsz + 'px ' + MX.SERIF; while (stl.length > 12 && c.measureText(stl).width > W - 172) stl = stl.slice(0, -2); if (stl !== String(sr.title)) stl = stl.replace(/\s+$/, '') + '...'; } c.restore();      // a long title shrinks to the width of the panel, and is cut with dots if it still does not fit
        MX.text(stl, 86, y, { size: tsz, font: MX.SERIF, w: 500 }); MX.text(sr.url.replace(/^https?:\/\//, '').slice(0, 78), 86, y + 30, { size: 16, font: MX.MONO, color: T.teal });
        const nl = nls[i]; nl.forEach((ln, k) => MX.text(ln, 86, y + 58 + k * 24, { size: 18, font: MX.SANS, color: T.mute })); MX.A = a; y += 98 - shr + nl.length * 24;
      });
      H2.endPanel();
    };
    // apertura: la pregunta, las respuestas publicadas y el modelo que las alcanza fila por fila
    const drawCold = (c, s) => {
      if (!COLD || s.t >= COLD + 0.5) return; const t = s.t, fade = 1 - ramp(t, COLD - 0.5, COLD + 0.4); if (fade < 0.01) return;
      c.save(); c.globalAlpha = fade; c.fillStyle = T.paper; c.fillRect(34, 216, W - 68, H - 250); MX.A = fade;
      const q = dir.cold.question || 'Does the model reproduce what is published?', rows = VROWS.slice(0, 5), lines = wrap(q, '500 50px ' + MX.SERIF, W - 172), qa = ramp(t, 0.7, 1.3);
      MX.A = fade * ramp(t, 0.3, 0.7); MX.text('THE QUESTION', 86, 292, { size: 14, font: MX.MONO, color: T.teal, spacing: 3, w: 700 });
      MX.A = fade * qa; lines.forEach((ln, i) => MX.text(ln, 86, 366 + i * 62, { size: 50, font: MX.SERIF, w: 500, color: T.ink }));
      const y0 = 366 + lines.length * 62 + 60; MX.A = fade * ramp(t, 2.0, 2.5); MX.text('PUBLISHED', W - 360, y0, { size: 13, font: MX.MONO, color: T.mute, align: 'right', spacing: 2.4 }); MX.text('MODEL', W - 86, y0, { size: 13, font: MX.MONO, color: T.mute, align: 'right', spacing: 2.4 });
      rows.forEach((r, i) => {
        const y = y0 + 60 + i * 78, t1 = 2.3 + i * 0.4, t2 = COLD - 3.0 + i * 0.4, done = t >= t2, col = r.ok === false ? T.ember : T.teal;
        c.save(); c.globalAlpha = fade * ramp(t, t1, t1 + 0.4); c.strokeStyle = T.line; c.beginPath(); c.moveTo(86, y - 46); c.lineTo(W - 86, y - 46); c.stroke(); c.restore();
        MX.A = fade * ramp(t, t1, t1 + 0.4); MX.text(String(r.label).slice(0, 26), 86, y, { size: 21, font: MX.MONO, color: T.mute }); MX.text(r.pub, W - 360, y, { size: (r.pub.length > 16 ? 15 : r.pub.length > 8 ? 22 : 32), font: MX.MONO, w: 700, color: T.ink, align: 'right' });
        MX.A = fade * (done ? ramp(t, t2, t2 + 0.3) : 0.5 + 0.4 * Math.sin(t * 7 + i)); MX.text(done ? r.got + '  ' + (r.ok === false ? 'X' : 'OK') : 'checking...', W - 86, y, { size: done ? (r.got.length > 16 ? 15 : r.got.length > 8 ? 22 : 32) : 20, font: MX.MONO, w: 700, color: done ? col : T.mute, align: 'right' });
      });
      MX.A = fade * ramp(t, COLD - 1.2, COLD - 0.6); MX.text(rows.filter((r) => r.ok === true).length + ' of ' + rows.length + ' reproduced by a model built from the published numbers. Now, how it is built.', 86, y0 + 60 + rows.length * 78 + 24, { size: 19, font: MX.SANS, color: T.mute });
      MX.A = 1; c.restore();
    };
    // a plain sentence while the object assembles, and what the colours mean while the numbers run: for someone who knows nothing about it
    const drawWhat = (c, s) => {
      if (s.t == null || (!dir.what && !dir.legend)) return; const t = s.t;
      if (dir.what) { const a = ramp(t, COLD + 0.6, COLD + 1.2) * (1 - ramp(t, ASM_END - 0.7, ASM_END - 0.1)); if (a > 0.01) { c.save(); MX.A = a; let wsz = 32, ln = wrap(dir.what, '500 32px ' + MX.SERIF, W - 172); while (wsz > 22 && 66 + ln.length * wsz * 1.375 > 205) { wsz -= 2; ln = wrap(dir.what, '500 ' + wsz + 'px ' + MX.SERIF, W - 172); }      // a long text shrinks until the box ends above the frame
          const wlh = wsz * 1.375; c.fillStyle = MX.rgba(T.paper, 0.78 * a); c.fillRect(34, H - 300, W - 68, 66 + ln.length * wlh); MX.text('WHAT YOU ARE LOOKING AT', 86, H - 268, { size: 14, font: MX.MONO, color: T.teal, spacing: 3, w: 700 }); ln.forEach((l, i) => MX.text(l, 86, H - 224 + i * wlh, { size: wsz, font: MX.SERIF, w: 500, color: T.ink })); MX.A = 1; c.restore(); } }
      if (dir.legend) { const a = ramp(t, tM0 - 0.2, tM0 + 0.4) * (1 - ramp(t, tE0 - 0.6, tE0 - 0.1)); if (a > 0.01) { c.save(); let x = 78; dir.legend.forEach((q) => { c.font = '600 15px ' + MX.MONO; const w = c.measureText(q.text).width; c.globalAlpha = a; c.fillStyle = q.color; c.fillRect(x, 236, 14, 14); MX.A = a; MX.text(q.text, x + 22, 249, { size: 15, font: MX.MONO, w: 600, color: T.ink }); x += w + 56; }); MX.A = 1; c.restore(); } }
    };
    F.overlay((ctx, s) => { if (s.t == null) return; drawWhat(ctx, s); drawMode(ctx, s); drawCold(ctx, s); panels.forEach((pn) => { if (s.t >= pn.t0 - 0.01 && s.t <= pn.t1 + 0.01) drawPanel(ctx, pn, s.t); }); });

    /* ---------------------------------------------------------- sonido */
    function audio() {
      const ev = [], note = (id, idx) => SND.note(60, 'dorian', idx), pan = (p) => clamp(p.base.x / 45, -0.6, 0.6);
      order.forEach((p) => {
        const sm = P.soundMat(p.spec.mat), size = clamp(Math.max(p.size.x, p.size.y) * 0.9, 4, 90), t0 = arrive[p.id];
        ev.push({ t: t0 + 0.04, v: 'whoosh', d: 0.55, f0: 500, f1: 2600, pan: pan(p), gain: 0.16, q: 2 }, { t: t0 + 0.78, v: 'impact', mat: sm, size, vel: sm === 'rubber' ? 0.5 : 0.58, hard: 0.55, pan: pan(p), ring: 0.8, thump: size > 40 ? 90 : 0 });
      });
      if (modes.length) {
        modes.forEach((m, k) => { if (!mD[k]) return; const tb = mS[k]; ev.push({ t: tb + 0.02, v: 'click', f: 1500, gain: 0.55, sharp: 0.8 }, { t: tb + 0.1, v: 'tone', f: note(0, Math.round((an.modes[k].ratio || 3) * 6)), timbre: 'bell', d: 1.6, gain: 0.5, pan: 0.1 }, { t: tb + 0.1, v: 'whoosh', d: 0.7, f0: 300, f1: 1800, gain: 0.3 }); });
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
          if (prev < M.press.actuation && x >= M.press.actuation) ev.push({ t, v: 'tick', f: 2600, vel: 0.9 }, { t, v: 'blip', f: 2100, gain: 0.35, fm: 0.3 });
          if (prev >= M.press.actuation && x < M.press.actuation) ev.push({ t, v: 'click', f: 1700, gain: 0.3, sharp: 0.6 });
          if (!bottom && x >= M.press.travel - 0.02) { bottom = true; ev.push({ t, v: 'thock', vel: 1 }); }
          if (x < M.press.travel - 0.3) bottom = false; prev = x;
        }
      }
      if (CUBE) CEV.forEach((e2, i) => { ev.push({ t: e2.t0 + 0.02, v: 'tick', f: 1900 + MX.hash(i, 5) * 500, vel: 0.5, pan: -0.2 }, { t: e2.t1 - 0.01, v: 'detent', f: 820 + MX.hash(i, 9) * 260, vel: 0.85, pan: 0.1, send: 0.2 }); });
      if (ENGN) {
        let prevD = crankDeg(thetaAt(tM0 - 0.01)), prevR = thetaAt(tM0 - 0.01);
        for (let t = tM0; t < tE0 + 2; t += 1 / 120) {
          const th = thetaAt(t), d = crankDeg(th); AE.ign.forEach((ig, k) => { const before = (((prevD - ig) % 720) + 720) % 720, now = (((d - ig) % 720) + 720) % 720; if (th > prevR && now < before) ev.push({ t, v: 'impact', mat: 'steel', size: 70, vel: 0.5, hard: 0.4, pan: (k - 1.5) * 0.3, thump: 80 }); });
          prevD = d; prevR = th;
        }
      }
      if (ENIG) runs.forEach((run) => run.events.forEach((e) => {
        const jit = (MX.hash(e.ch.charCodeAt(0), Math.round(e.te * 10)) - 0.5) * 0.012;
        ev.push({ t: e.te + jit, v: 'clack', vel: 0.85 + MX.hash(e.ch.charCodeAt(0), 3) * 0.3, pan: -0.1, send: 0.35 });
        e.stepped.forEach((sp, rr) => { if (sp) ev.push({ t: e.te + 0.07 + rr * 0.035, v: 'detent', f: 800 + rr * 360, vel: 0.9, pan: (rr - 1) * 0.5, send: 0.3 }); });
        for (let i = 0; i < 8; i++) ev.push({ t: e.te + 0.15 + i * 0.07, v: 'tick', f: 1800 + i * 160, vel: 0.28, pan: -0.5 + i * 0.14, send: 0.2 });
        ev.push({ t: e.te + 0.64, v: 'tone', f: SND.note(57, 'major', (e.out.charCodeAt(0) - 65) % 14), timbre: 'bell', d: 0.9, gain: 0.22, pan: 0.15 }, { t: e.te + 0.64, v: 'tick', f: 3200, vel: 0.5, pan: 0.15 });
      }));
      if (STEPS && sMode >= 0) for (let i = 0; i < M.steps.count; i++) { const tt = mS[sMode] + 1.0 + i / SR; ev.push({ t: tt, v: 'tick', f: 1500 + (i % 7) * 140, vel: 0.5, pan: -0.15 }); if (M.steps.kind && M.steps.kind(i) === 'match') ev.push({ t: tt + 0.05, v: 'detent', f: 700, vel: 0.8, pan: 0.2, send: 0.2 }); }
      if (COLD) { VROWS.slice(0, 5).forEach((r, i) => { ev.push({ t: 2.3 + i * 0.4, v: 'tick', f: 1800 + i * 150, vel: 0.6, pan: -0.2 }, { t: COLD - 3.0 + i * 0.4, v: 'detent', f: 700 + i * 90, vel: 0.85, pan: 0.2, send: 0.2 }); }); ev.push({ t: COLD - 0.5, v: 'boom', gain: 0.5 }); }
      panels.forEach((pn) => { if (pn.kind === 'verdict') ev.push({ t: pn.t0 + 0.9 + Math.min(7, VROWS.length) * 0.28, v: 'boom', gain: 0.8 }, { t: pn.t0 + 0.9 + Math.min(7, VROWS.length) * 0.28, v: 'impact', mat: 'steel', size: 60, vel: 0.9, hard: 0.9 }); });
      ev.push({ t: tE0 - 0.1, v: 'whoosh', d: 1.5, f0: 220, f1: 3400, gain: 0.8, skew: 0.8 }, { t: tE0 + ED - 0.5, v: 'boom', gain: 0.7 });
      tourIds.forEach((id, j) => { const p = parts.find((x) => x.id === id), ts = tT0 + j * TD; ev.push({ t: ts + 0.3, v: 'tone', f: note(0, j * 2), timbre: 'bell', d: 1.3, gain: 0.42, pan: pan(p) }, { t: ts + 0.32, v: 'impact', mat: P.soundMat(p.spec.mat), size: clamp(Math.max(p.size.x, p.size.y), 4, 80), vel: 0.32, pan: pan(p), ring: 0.6 }); });
      ev.push({ t: tR0 - 0.1, v: 'whoosh', d: 1.6, f0: 3400, f1: 240, gain: 0.8 }, { t: tR0 + RD - 0.3, v: 'boom', gain: 0.8 });
      panels.forEach((pn) => { ev.push({ t: pn.t0 + 0.1, v: 'blip', f: 900, gain: 0.5 }); (pn.rows || an.modes).forEach((r, i) => ev.push({ t: pn.t0 + 0.5 + i * 0.3, v: 'blip', f: 1100 + i * 90, gain: 0.35, pan: 0.2 })); });
      ev.push({ t: DUR - 3.2, v: 'tone', f: note(0, 4), timbre: 'bell', d: 3.4, ring: 2, gain: 0.6 }, { t: DUR - 3.0, v: 'tone', f: note(0, 9), timbre: 'bell', d: 3, ring: 2, gain: 0.45 });
      return SND.render({ duration: DUR, seed: 61, events: ev, bed: (dir.sound && 'bed' in dir.sound) ? dir.sound.bed : { bpm: 92, root: 48, mode: 'dorian', level: 0.55, prog: [0, 5, 3, 4], curve: [[0, 0.2], [tM0, 0.4], [tE0, 0.6], [tT0, 0.5], [tP0, 0.3], [DUR, 0.15]] }, room: (dir.sound && dir.sound.room) || { size: 1.1, wet: 0.22, fb: 0.78 }, tone: 0.002 });
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
    g.__geom = (t) => {      // camera and parts as they are in the scene right now (call after __frame(t)); read by scripts/preflight.mjs
      st.scene.updateMatrixWorld(true); const cam = st.camera, out = [], tr = tourAt(t);
      parts.forEach((p) => {
        if (!p.group.visible) return; const b = new TH.Box3().setFromObject(p.group); if (b.isEmpty()) return;
        let al = 0; p.group.traverse((m) => { if (m.isMesh && m.visible && m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((q) => { al = Math.max(al, q.opacity / (q.userData.bo || 1)); }); });
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, behind = false;
        for (let i = 0; i < 8; i++) { const v = new TH.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(cam); if (v.z > 1) behind = true; const px = (v.x * 0.5 + 0.5) * W, py = (-v.y * 0.5 + 0.5) * H; x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); }
        out.push({ id: p.id, alpha: al, min: b.min.toArray(), max: b.max.toArray(), rect: [x0, y0, x1, y1], behind });
      });
      return { t, cam: cam.position.toArray(), near: cam.near, focus: tr ? tr.id : null, parts: out };
    };
    g.__shapeCheck = () => parts.map((p) => { let r = 1; p.group.traverse((m) => { const u = m.isMesh && m.geometry && m.geometry.userData; if (u && u.areaRatio != null && Math.abs(u.areaRatio - 1) > Math.abs(r - 1)) r = u.areaRatio; }); return { id: p.id, ratio: r }; }).filter((q) => Math.abs(q.ratio - 1) > 0.01);      // flat shapes whose triangulated area is not their outline minus the holes (read by scripts/preflight.mjs)
    g.__specInfo = () => ({ duration: DUR, parts: parts.length, validation: V.lines, warnings: V.warnings, errors: V.errors, panels: panels.map((p) => ({ kind: p.kind, page: p.page, from: p.t0, to: p.t1 })), phases: { assembled: ASM_END, modes: tM0, explode: tE0, tour: tT0, reassemble: tR0, panels: tP0 }, shots: [{ label: 'assembled', t: ASM_END + 0.4 }].concat(modes.map((m, k) => (mD[k] ? { label: 'mode ' + (m.id || k), t: mS[k] + mD[k] * 0.62 } : null)).filter(Boolean), [{ label: 'exploded', t: tE0 + ED + 0.2 }], tourIds.map((id, j) => ({ label: 'tour ' + id, t: tT0 + j * TD + TD * 0.62 })), [{ label: 'reassembled', t: tR0 + RD - 0.2 }]) });

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
    if (presentation?.enabled) {
      const info = g.__specInfo;
      g.__specInfo = () => Object.assign({}, info(), { method: presentation.method, background: presentation.background });
    }
    if (explore && ENIG) startEnigmaExplore();
    else if (explore) {
      const it = new Integrator(an, drive.rpm), live = { mode: modes[0] || null, spin: true, last: performance.now(), est: q.has('est'), on: q.has('break') };      // ?est and ?break open the viewer with those tools on
      // questioning the model: what is only estimated, and what the gate says when a published number is wrong
      const estIds = parts.filter((p) => p.spec.conf === 'estimated').map((p) => p.id), mi0 = ((M && M.drive && M.drive.modes) || []).findIndex((m) => m.publish && (m.publish.value != null || m.publish.text != null));
      const breakIt = () => {
        if (live.brk) return live.brk; const m0 = M.drive.modes[mi0], pub = m0.publish, was = pub.value != null ? pub.value : pub.text, now = pub.value != null ? Math.round(pub.value * 105) / 100 + (pub.value === 0 ? 1 : 0) : String(pub.text).slice(0, -1) + (String(pub.text).slice(-1) === '0' ? '1' : '0');
        const mut = Object.assign({}, spec, { mechanism: Object.assign({}, M, { drive: Object.assign({}, M.drive, { modes: M.drive.modes.map((m, i) => (i === mi0 ? Object.assign({}, m, { publish: Object.assign({}, pub, pub.value != null ? { value: now } : { text: now }) }) : m)) }) }) }), r = S.validate(mut);
        return (live.brk = { label: m0.label, was, now, msg: r.errors[0] || 'the gate did not notice', state: r.verdict ? r.verdict.state : 'DOES NOT PASS' });
      };
      const tg = [{ label: PRESS ? 'PRESS' : 'SPIN', get: () => live.spin, set: (v) => { live.spin = v; } }].concat(estIds.length ? [{ label: 'GUESSES', get: () => !!live.est, set: (v) => { live.est = v; } }] : [], mi0 >= 0 ? [{ label: 'BREAK IT', get: () => !!live.on, set: (v) => { live.on = v; } }] : [], PRESS || ENGN || CUBE || CALC ? [] : modes.map((m) => ({ label: m.label.toUpperCase().replace('GEAR ', 'G'), get: () => live.mode === m, set: () => { live.mode = m; } })));
      const HOME = UP ? Object.assign({}, VW.iso, { zoom: VW.expl.zoom * 1.3 }) : VW.iso;
      F.explore({ views: [['FRONT', VW.front], ['ISO', HOME], ['SIDE', VW.side]], home: HOME, start: HOME, toggleW: 100, toggles: tg, minZoom: 3, maxZoom: 400,
        reset: () => { live.mode = modes[0] || null; live.spin = true; },
        extra: (Sx) => {
          const now = performance.now(), dt = Math.min(0.05, (now - live.last) / 1000); live.last = now; if (an.K) it.step(dt, live.mode, live.spin ? 1 : 0); if (live.spin) live.t = (live.t || 0) + dt; const r = live.mode ? an.modes[modes.indexOf(live.mode)].ratio : null, px = PRESS ? (1 - Math.cos((live.t || 0) * 2.2)) / 2 * M.press.travel : 0;
          const eth = ENGN ? (live.t || 0) * (drive.rpm || 40) * 6 * RAD : 0;
          return { mech: { ang: (b) => (an.K ? it.ang(b) : 0), press: px, eng: ENGN ? { theta: eth } : undefined, cube: CUBE ? cubeFrame(tM0 + (live.t || 0) % (tMend - tM0)) : undefined, step: STEPS ? ((live.t || 0) * M.steps.rate) % (M.steps.count + 6) : undefined, phase: Math.max(0, modes.indexOf(live.mode)) }, light: { az: -38, el: 54 }, dimTo: live.est ? 0.16 : 0.1, ...(live.est ? { focusSet: estIds, focusA: 0.9 } : {}), ...(live.on ? { ui: (c) => {
            const b = breakIt(), x = 64, w = W - 128, ln = wrap(b.msg, '500 22px ' + MX.SANS, w - 48); c.save(); c.fillStyle = MX.rgba(T.paper, 0.92); c.fillRect(x - 14, 232, w + 28, 152 + ln.length * 30); c.strokeStyle = T.ember; c.lineWidth = 2; c.strokeRect(x - 14, 232, w + 28, 152 + ln.length * 30);
            MX.text('WHAT IF A PUBLISHED NUMBER WERE WRONG?', x, 262, { size: 14, font: MX.MONO, color: T.ember, spacing: 2.4, w: 700 }); MX.text('we changed "' + b.label + '" from ' + b.was + ' to ' + b.now, x, 300, { size: 24, font: MX.MONO, color: T.ink, w: 600 });
            ln.forEach((l, i) => MX.text(l, x, 336 + i * 30, { size: 22, font: MX.SANS, color: T.mute })); MX.text(b.state, x, 360 + ln.length * 30, { size: 30, font: MX.MONO, w: 800, color: T.ember, spacing: 3 }); c.restore(); } } : {}), readout: (CUBE ? 'FACE TURNS  -  ' : ENGN ? Math.round(crankDeg(eth)) + ' / 720 deg  -  ' : PRESS ? px.toFixed(2) + ' mm  ' + Math.round(forceAt(px)) + ' ' + (M.press.forceUnit || 'cN') + '  -  ' : live.mode && !ENGN && !CUBE && !CALC ? live.mode.label + '  ' + r.toFixed(3) + ' : 1  -  ' : '') + 'EXPLODE ' + Math.round(Sx.e * 100) + '%' };
        } });
    } else F.run({ duration: DUR, keys, script, audio, poster: tM0 + MD * 0.5, blurAt: (t) => (t >= tP0 - 0.2 ? 1 : 99) });      // las paginas de evidencia no se mueven: un solo render por frame
    return { F, an, DUR };
  };
})(typeof window !== 'undefined' ? window : globalThis);
