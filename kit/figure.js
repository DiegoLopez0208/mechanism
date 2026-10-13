/*
 * kit/figure.js - motor de figuras sobre kit/gl.js (three.js). Una figura = piezas con fuente y confianza + guion de camara + paneles 2D.
 * El motor se ocupa de lo repetido: escenario, registro de piezas (armado, explosionado, atenuado por foco, contorno de resalte y punteado de
 * lo estimado), camara por claves, cotas y etiquetas SPEC/DERIVED/ESTIMATED, ficha de pieza, video guionado y modo ?explore
 * (orbitar, zoom, explosionar, vistas, capas, medir entre dos puntos, tocar piezas).
 *
 *   const F = MX.figure({ w, h, axes: 'three' | 'plan', stage: {...}, card: (s) => ({...}) });
 *   F.add({ id, group, base, explode, from, conf, est, info: { title, lines, conf } });   // base/explode/from: THREE.Vector3 en ejes de three
 *   F.overlay((ctx, s) => {...});                       // dibujo 2D encima (paneles, cotas)
 *   F.run({ duration, script: (t) => state, cues: () => [...], keys: [[t, view], ...] });
 *   F.explore({ views: [[name, view]], toggles: [{ label, get, set }], ... });
 * Ejes: 'plan' = x, y (arriba en planta), z (altura) como un plano tecnico; 'three' = x, y arriba, z hacia el espectador.
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {}), TH = g.THREE, G = MX.gl, T = MX.THEME, E = MX.E, clamp = MX.clamp, lerp = MX.lerp;
  const CONF = { spec: 'SPEC', derived: 'DERIVED', estimated: 'ESTIMATED', measured: 'MEASURED', guess: 'GUESS' };
  const CCOL = { get spec() { return T.teal; }, get derived() { return T.ink; }, get estimated() { return T.ember; }, get measured() { return T.teal; }, get guess() { return '#8a5cf6'; } };

  MX.figure = (cfg) => {
    const W = cfg.w, H = cfg.h, FPS = cfg.fps || 30, axes = cfg.axes || 'plan';
    const st = G.stage(Object.assign({ w: W, h: H }, cfg.stage || {}));
    const F = { st, W, H, parts: [], byId: {}, overlays: [], axes };
    MX.P = F.P = axes === 'three' ? (x, y, z) => st.project(x, -z, y) : (x, y, z) => st.project(x, y, z);
    const toView = (v) => (axes === 'three' ? Object.assign({}, v, { ty: -v.tz, tz: v.ty }) : v);
    F.setView = (v) => st.setView(toView(v));

    /* ---------------------------------------------------------- piezas */
    // p: { id, group, base, explode, from, est, conf, info, noShadow }  (vectores en ejes de three; base es la posicion local del grupo)
    F.add = (p) => {
      p.base = p.base || new TH.Vector3(); p.explode = p.explode || new TH.Vector3(); p.from = p.from || new TH.Vector3(0, 0, 0); p.group.position.copy(p.base);
      p.group.userData.pid = p.id; F.parts.push(p); F.byId[p.id] = p; return p;
    };
    F.finish = () => {                                       // despues de armar la escena: sombras, picking y contornos
      F.hit = [];
      F.parts.forEach((p) => { G.shadows(p.group, !p.noShadow, true); p.group.traverse((m) => { if (m.isMesh) { m.userData.pid = p.id; F.hit.push(m); } }); });
      st.scene.updateMatrixWorld(true);
      F.parts.forEach((p) => {
        const b = new TH.Box3(), inv = p.group.matrixWorld.clone().invert(), s = new TH.Vector3(), c = new TH.Vector3();   // caja en ejes de la pieza (si el padre esta girado, la del mundo no sirve)
        p.group.traverse((m) => { if (m.isMesh && m.geometry) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld))); } });
        b.getSize(s); b.getCenter(c);
        p.local = c.clone(); p.size = s.clone();
        const geo = new TH.EdgesGeometry(new TH.BoxGeometry(s.x + 0.4, s.y + 0.4, s.z + 0.4));
        p.hi = new TH.LineSegments(geo, new TH.LineBasicMaterial({ color: '#e8590c' })); p.hi.position.copy(p.local); p.hi.visible = false; p.group.add(p.hi);
        if (p.est) { p.dash = new TH.LineSegments(geo.clone(), new TH.LineDashedMaterial({ color: '#e8590c', dashSize: 2.2, gapSize: 1.6 })); p.dash.computeLineDistances(); p.dash.position.copy(p.local); p.dash.visible = false; p.group.add(p.dash); }
      });
    };
    // centro de una pieza en ejes de la figura, con el explosionado e (para apuntar la camara)
    F.center = (id, e) => {
      const p = F.byId[id]; if (!p) throw new Error('pieza desconocida: ' + id);
      const v = p.local.clone().add(p.base).add(p.explode.clone().multiplyScalar(e == null ? 1 : e));
      if (p.group.parent && p.group.parent !== st.scene) { p.group.parent.updateMatrixWorld(true); v.applyMatrix4(p.group.parent.matrixWorld); }
      return axes === 'three' ? [v.x, v.y, v.z] : [v.x, -v.z, v.y];
    };
    F.anchor = (id) => { st.scene.updateMatrixWorld(true); const p = F.byId[id], b = new TH.Box3().setFromObject(p.group), c = new TH.Vector3(); b.getCenter(c); return axes === 'three' ? [c.x, c.y, c.z] : [c.x, -c.z, c.y]; };
    const fadeKey = {};
    function setFade(p, f) {
      const key = f < 0.995; if (fadeKey[p.id] === key && !key) return; const ms = [];
      p.group.traverse((m) => { if ((m.isMesh || m.isLine) && m.material) { if (m.userData.cs == null) m.userData.cs = m.castShadow; m.castShadow = f > 0.5 ? m.userData.cs : false; (Array.isArray(m.material) ? m.material : [m.material]).forEach((q) => ms.push(q)); } });   // una pieza atenuada tampoco proyecta sombra
      ms.forEach((q) => { if (q.userData.bt == null) { q.userData.bt = q.transparent; q.userData.bo = q.opacity; q.userData.bw = q.depthWrite; } const on = key || q.userData.bt; if (q.transparent !== on) { q.transparent = on; q.needsUpdate = true; } q.opacity = q.userData.bo * f; q.depthWrite = key ? false : q.userData.bw; });
      fadeKey[p.id] = key;
    }
    // estado s: { e (explosion 0..1), assemble(id) -> { k: 0..1 llegada, alpha }, focus, focusSet, focusA, vis(p), view }
    F.apply = (s) => {
      if (cfg.beforeRender) cfg.beforeRender(s);
      st.aoSkip.length = 0;
      F.parts.forEach((p) => {
        const a = s.assemble ? s.assemble(p.id) : { k: 1, alpha: 1 }, e = s.e || 0;
        const ek = s.explodeK ? s.explodeK(p.id) : e, bulge = 4 * Math.max(0, a.k) * (1 - Math.min(1, a.k));
        p.group.position.copy(p.base).addScaledVector(p.explode, ek).addScaledVector(p.from, 1 - a.k); if (p.arc) p.group.position.addScaledVector(p.arc, bulge);
        const sp = p.spin ? 1 - Math.min(1, a.k) : 0; p.group.rotation.set((p.spin ? p.spin.x * sp : 0) + (p.tilt ? p.tilt.x * ek : 0), (p.spin ? p.spin.y * sp : 0) + (p.tilt ? p.tilt.y * ek : 0), (p.spin ? p.spin.z * sp : 0) + (p.tilt ? p.tilt.z * ek : 0));
        if (p.pose) p.pose(s, p);                                  // pieza en movimiento (cinematica): ajusta posicion y giro despues del explosionado
        const inSet = !!(s.focusSet && s.focusSet.includes(p.id)), isF = s.focus === p.id || inSet, anyF = !!(s.focus || (s.focusSet && s.focusSet.length));
        let f = a.alpha; if (anyF && !isF && s.focusA != null) f *= lerp(1, s.dimTo == null ? 0.14 : s.dimTo, s.focusA);
        setFade(p, f); if (f < 0.95) st.aoSkip.push(p.group); const on = !!(isF && (s.focusA || 0) > 0.2); p.hi.visible = on && !p.est; if (p.dash) p.dash.visible = on;
        p.group.visible = s.vis ? s.vis(p) !== false : true;
      });
      if (s.light) { const az = s.light.az * Math.PI / 180, el = s.light.el * Math.PI / 180, r = 230; st.key.position.set(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az)); }
      F.setView(s.view); st.render();
    };

    /* ---------------------------------------------------------- camara por claves */
    // claves: [t, vista, ease?]; ease = funcion o [x1,y1,x2,y2] (bezier); la curva de la clave que TERMINA el tramo manda. dof/focus tambien se interpolan.
    const EASE = (e) => (typeof e === 'function' ? e : Array.isArray(e) ? E.bezier(e[0], e[1], e[2], e[3]) : E.smooth);
    F.camera = (keys) => (t) => {
      let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
      const [t0, a] = keys[i], [t1, b, eb] = keys[i + 1], u = EASE(eb)(clamp((t - t0) / (t1 - t0), 0, 1)), L = (k, d) => lerp(a[k] == null ? d : a[k], b[k] == null ? d : b[k], u);
      return { yaw: L('yaw', 0), pitch: L('pitch', 0), zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), u)), tx: L('tx', 0), ty: L('ty', 0), tz: L('tz', 0), cx: L('cx', W / 2), cy: L('cy', H / 2), dof: L('dof', 0), focus: b.focus == null && a.focus == null ? undefined : L('focus', 0) };
    };
    // deriva de camara de mano: movimientos de menos de un grado que le dan vida a las tomas fijas
    F.drift = (v, t, k = 1) => Object.assign({}, v, { yaw: v.yaw + k * (0.45 * Math.sin(t * 0.83) + 0.2 * Math.sin(t * 2.1 + 1)), pitch: v.pitch + k * 0.3 * Math.sin(t * 0.61 + 2), tx: v.tx + k * 0.25 * Math.sin(t * 0.47), ty: v.ty + k * 0.2 * Math.sin(t * 0.71 + 1) });
    // vista centrada en una pieza (o en varias: se promedia)
    F.shot = (ids, o) => {
      ids = [].concat(ids); const cs = ids.map((id) => F.center(id, o.e == null ? 1 : o.e)), c = [0, 1, 2].map((k) => cs.reduce((s, q) => s + q[k], 0) / cs.length);
      return { yaw: o.yaw, pitch: o.pitch, zoom: o.zoom, tx: c[0] + (o.dx || 0), ty: c[1] + (o.dy || 0), tz: c[2] + (o.dz || 0), cx: o.cx == null ? W / 2 : o.cx, cy: o.cy == null ? 600 : o.cy };
    };

    /* ---------------------------------------------------------- dibujo 2D */
    const H2 = (F.hud = {});
    H2.arrow = (a, b, s) => { const c = MX.ctx, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + ux * s - uy * s * 0.35, a[1] + uy * s + ux * s * 0.35); c.lineTo(a[0] + ux * s + uy * s * 0.35, a[1] + uy * s - ux * s * 0.35); c.closePath(); c.fill(); };
    // cota entre dos puntos de la figura, con la linea desplazada off (en pixeles)
    H2.dim = (A, B, off, label, a, col) => {
      if (a <= 0.01) return; col = col || T.teal; const c = MX.ctx, pa = F.P(A[0], A[1], A[2]), pb = F.P(B[0], B[1], B[2]), a1 = [pa[0] + off[0], pa[1] + off[1]], b1 = [pb[0] + off[0], pb[1] + off[1]], L = Math.hypot(off[0], off[1]) || 1;
      c.save(); c.globalAlpha = a; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(pa[0], pa[1]); c.lineTo(a1[0] + off[0] / L * 9, a1[1] + off[1] / L * 9); c.moveTo(pb[0], pb[1]); c.lineTo(b1[0] + off[0] / L * 9, b1[1] + off[1] / L * 9); c.stroke();
      c.beginPath(); c.moveTo(a1[0], a1[1]); c.lineTo(b1[0], b1[1]); c.stroke(); H2.arrow(a1, b1, 11); H2.arrow(b1, a1, 11);
      const mx = (a1[0] + b1[0]) / 2, my = (a1[1] + b1[1]) / 2; c.font = '500 22px ' + MX.MONO; const tw = c.measureText(label).width; c.fillStyle = T.paper; c.fillRect(mx - tw / 2 - 7, my - 17, tw + 14, 31); c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, mx, my + 1); c.restore();
    };
    H2.tag = (c, x, y, conf) => {                                       // pastilla discreta: fondo tenido, borde fino y texto del color de la categoria
      c.save(); c.font = '600 12px ' + MX.SANS; if ('letterSpacing' in c) c.letterSpacing = '1.6px'; const s = CONF[conf] || String(conf).toUpperCase(), col = CCOL[conf] || T.ink, w = c.measureText(s).width + 20, r = 11;
      c.beginPath(); c.moveTo(x + r, y - 16); c.lineTo(x + w - r, y - 16); c.arc(x + w - r, y - 16 + r, r, -Math.PI / 2, Math.PI / 2); c.lineTo(x + r, y + 6); c.arc(x + r, y - 16 + r, r, Math.PI / 2, 1.5 * Math.PI); c.closePath(); c.fillStyle = MX.rgba(col, 0.13); c.fill(); c.strokeStyle = MX.rgba(col, 0.55); c.lineWidth = 1; c.stroke();
      c.fillStyle = col; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(s, x + 10, y - 0.5); c.restore(); return w;
    };
    // panel de papel a pantalla casi completa que entra y sale con alpha a; devuelve false si no se ve (llamar H2.endPanel() al terminar)
    H2.panel = (a, fig, title, sub) => {
      if (a <= 0.01) return false; const c = MX.ctx; c.save(); c.globalAlpha = a; c.fillStyle = T.paper; c.fillRect(34, 216, W - 68, H - 250); MX.A = a;
      MX.text(String(fig).toUpperCase(), 86, 292, { size: 14, color: T.teal, spacing: 3, w: 600 }); MX.text(title, 86, 366, { size: title.length > 30 ? 46 : 54, font: MX.SERIF, w: 500 }); if (sub) MX.text(sub, 86, 408, { size: 20, color: T.mute, font: MX.SANS }); return true;
    };
    H2.endPanel = () => { MX.A = 1; MX.ctx.restore(); };
    // ficha de pieza: titulo + lineas + etiquetas de confianza; la linea guia sale del centro de la pieza
    H2.info = (s) => {
      const p = F.byId[s.focus]; if (!p || !p.info || (s.focusA || 0) < 0.02) return; const c = MX.ctx, i = p.info, at = s.infoAt || [64, H - 340], lines = [i.title].concat(i.lines || []);
      MX.callout(F.anchor(p.id), at, lines, { alpha: s.focusA, size: 26, color: T.ink });
      c.save(); c.globalAlpha = s.focusA; let x = at[0] + 10; const y = at[1] + lines.length * 30 + 14; [].concat(i.conf || []).forEach((k) => { x += H2.tag(c, x, y, k) + 8; }); c.restore();
      if (i.src) MX.text(i.src, at[0] + 10, y + 46, { size: 14, font: MX.MONO, color: T.mute, alpha: s.focusA, spacing: 0.6 });      // de donde sale lo que dice la ficha
    };

    /* ---------------------------------------------------------- cuadro */
    const BARE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('bare');
    F.overlay = (fn) => { F.overlays.push(fn); };
    F.frame = (ctx, s) => {
      F.apply(s); st.blit(ctx);
      if (BARE) return;      // ?bare: only the 3D object, no title, labels or panels (the stranger test shows this to someone who knows nothing)
      MX.card(W, H, Object.assign({ overlay: true }, cfg.card(s)));
      F.overlays.forEach((fn) => fn(ctx, s)); H2.info(s); if (s.ui) s.ui(ctx);
    };
    F.run = (o) => {
      const cam = F.camera(o.keys);
      MX.run({ w: W, h: H, fps: FPS, duration: o.duration, blurAt: o.blurAt, poster: o.poster == null ? o.duration * 0.35 : o.poster,
        draw: (ctx, t) => { const s = o.script(t); s.t = t; s.view = s.view || (o.drift === false ? cam(t) : F.drift(cam(t), t, o.drift == null ? 1 : o.drift)); F.frame(ctx, s); }, audio: () => (o.audio ? o.audio() : MX.audio.render({ duration: o.duration, cues: o.cues ? o.cues() : [], reverb: 0.2 })) });
    };

    /* ---------------------------------------------------------- modo explorar */
    // o: { views: [[nombre, vista]], home, start, assemble(t), extra(S, t) -> campos del estado, toggles: [{label, get, set}], measure, infoAt, reset }
    F.explore = (o) => {
      const cv = document.getElementById('c'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d'); MX.ctx = ctx;
      const S = { e: 0, eT: 0, view: Object.assign({}, o.home || o.views[0][1]), goal: o.start ? Object.assign({}, o.start) : null, sel: null, hov: null, drag: null, measure: false, pts: [], t0: performance.now() };
      const SL = { x0: 230, x1: 520, y: H - 198 };
      const btn = (x, y, w, label, on, fn) => ({ x, y, w, h: 44, label, on, fn });
      const btns = () => {
        const out = []; o.views.forEach(([n, v], i) => out.push(btn(560 + i * 110, H - 220, 100, n, false, () => { S.goal = Object.assign({ cx: W / 2 }, v); })));
        let x = 78; const tw = o.toggleW || 130; const nT = (o.toggles || []).length, tw2 = Math.max(70, Math.min(tw, Math.floor((470 - 10 * (nT - 1)) / Math.max(1, nT))));      // many toggles share the room left of MEASURE
        (o.toggles || []).forEach((t) => { out.push(btn(x, H - 154, tw2, t.label, !!t.get(), () => t.set(!t.get()))); x += tw2 + 10; });
        if (o.measure !== false) out.push(btn(560, H - 154, 210, S.measure ? 'MEASURING' : 'MEASURE', S.measure, () => { S.measure = !S.measure; S.pts = []; }));
        out.push(btn(780, H - 154, 210, 'RESET', false, () => { S.eT = 0; S.sel = null; S.pts = []; S.measure = false; S.goal = Object.assign({ cx: W / 2 }, o.home || o.views[0][1]); if (o.reset) o.reset(); }));
        return out;
      };
      const pos = (ev) => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * W, (ev.clientY - r.top) / r.height * H]; };
      const rc = new TH.Raycaster(), visible = (m) => { let q = m; while (q) { if (q.visible === false) return false; q = q.parent; } return true; };
      const pick = (p) => { rc.setFromCamera(new TH.Vector2(p[0] / W * 2 - 1, -(p[1] / H) * 2 + 1), st.camera); const hit = rc.intersectObjects(F.hit.filter(visible), false)[0]; if (!hit) return null; const q = hit.point; return { id: hit.object.userData.pid, pt: axes === 'three' ? [q.x, q.y, q.z] : [q.x, -q.z, q.y] }; };
      cv.addEventListener('pointerdown', (ev) => {
        const p = pos(ev); cv.setPointerCapture(ev.pointerId);
        if (Math.abs(p[1] - SL.y) < 30 && p[0] > SL.x0 - 20 && p[0] < SL.x1 + 20) { S.drag = { slider: true }; S.eT = clamp((p[0] - SL.x0) / (SL.x1 - SL.x0), 0, 1); return; }
        const b = btns().find((q) => p[0] > q.x && p[0] < q.x + q.w && p[1] > q.y && p[1] < q.y + q.h); if (b) { b.fn(); return; }
        S.drag = { x: p[0], y: p[1], moved: 0 };
      });
      cv.addEventListener('pointermove', (ev) => {
        const p = pos(ev); if (S.drag && S.drag.slider) { S.eT = clamp((p[0] - SL.x0) / (SL.x1 - SL.x0), 0, 1); return; }
        if (S.drag) { const dx = p[0] - S.drag.x, dy = p[1] - S.drag.y; S.drag.x = p[0]; S.drag.y = p[1]; S.drag.moved += Math.abs(dx) + Math.abs(dy); S.view.yaw -= dx * 0.35; S.view.pitch = clamp(S.view.pitch + dy * 0.3, o.minPitch == null ? -60 : o.minPitch, 90); S.goal = null; return; }
        const h = pick(p); S.hov = h ? h.id : null;
      });
      cv.addEventListener('pointerup', (ev) => { const d = S.drag; S.drag = null; if (d && !d.slider && d.moved < 6) { const h = pick(pos(ev)); if (S.measure) { if (h) { S.pts.push(h.pt); if (S.pts.length > 2) S.pts = [h.pt]; } } else S.sel = h && h.id !== S.sel ? h.id : null; } });
      cv.addEventListener('wheel', (ev) => { ev.preventDefault(); S.view.zoom = clamp(S.view.zoom * Math.exp(-ev.deltaY * 0.0012), o.minZoom || 2, o.maxZoom || 60); S.goal = null; }, { passive: false });
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000), k = 1 - Math.exp(-dt * 7), t = (now - S.t0) / 1000; S.e += (S.eT - S.e) * k;
        if (S.goal) ['yaw', 'pitch', 'zoom', 'tx', 'ty', 'tz', 'cx', 'cy'].forEach((q) => { if (S.goal[q] != null) S.view[q] += (S.goal[q] - S.view[q]) * k; });
        const focus = S.sel || S.hov;
        const s = Object.assign({ e: E.sm(S.e), focus, focusA: focus ? 1 : 0, view: S.view, assemble: o.assemble ? o.assemble(t) : null, infoAt: o.infoAt || [64, 250], hint: S.measure ? 'MEASURE: TAP TWO POINTS ON THE MODEL' : 'DRAG TO ORBIT - WHEEL TO ZOOM - TAP A PART', readout: 'EXPLODE ' + Math.round(S.e * 100) + '%' }, o.extra ? o.extra(S, t) : {});
        const extraUi = s.ui;      // a tool from extra() (for example the BREAK IT panel) draws first
        s.ui = (c) => {
          if (extraUi) extraUi(c);
          MX.text('EXPLODE', 78, SL.y + 8, { size: 22, color: T.mute, spacing: 1.5 });
          c.save(); c.strokeStyle = 'rgba(42,41,37,0.4)'; c.lineWidth = 3; c.beginPath(); c.moveTo(SL.x0, SL.y); c.lineTo(SL.x1, SL.y); c.stroke(); c.strokeStyle = T.ember; c.beginPath(); c.moveTo(SL.x0, SL.y); c.lineTo(SL.x0 + (SL.x1 - SL.x0) * S.eT, SL.y); c.stroke(); c.beginPath(); c.arc(SL.x0 + (SL.x1 - SL.x0) * S.eT, SL.y, 13, 0, 6.2832); c.fillStyle = T.paper; c.fill(); c.stroke();
          btns().forEach((b) => { c.fillStyle = b.on ? T.ink : T.paper; c.fillRect(b.x, b.y, b.w, b.h); c.strokeStyle = T.ink; c.lineWidth = 1.5; c.strokeRect(b.x, b.y, b.w, b.h); MX.text(b.label, b.x + b.w / 2, b.y + 29, { size: b.w < 104 ? 15 : 20, align: 'center', w: 600, spacing: 1, color: b.on ? T.paper : T.ink }); });
          if (S.pts.length) { const P = S.pts.map((q) => F.P(q[0], q[1], q[2])); c.strokeStyle = T.ember; c.fillStyle = T.ember; c.lineWidth = 2.5; P.forEach((q) => { c.beginPath(); c.arc(q[0], q[1], 7, 0, 6.2832); c.fill(); }); if (P.length === 2) { c.beginPath(); c.moveTo(P[0][0], P[0][1]); c.lineTo(P[1][0], P[1][1]); c.stroke(); const dd = Math.hypot(S.pts[0][0] - S.pts[1][0], S.pts[0][1] - S.pts[1][1], S.pts[0][2] - S.pts[1][2]), mx = (P[0][0] + P[1][0]) / 2, my = (P[0][1] + P[1][1]) / 2, lbl = dd.toFixed(2) + ' mm'; c.font = '700 28px ' + MX.MONO; const tw = c.measureText(lbl).width; c.fillStyle = T.paper; c.fillRect(mx - tw / 2 - 8, my - 22, tw + 16, 38); c.fillStyle = T.ember; c.textAlign = 'center'; c.fillText(lbl, mx, my + 7); } }
          c.restore();
        };
        F.frame(ctx, s); requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    };
    F.isExplore = () => new URLSearchParams(location.search).has('explore');
    return F;
  };
})(typeof window !== 'undefined' ? window : globalThis);
