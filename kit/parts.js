/*
 * kit/parts.js - biblioteca de piezas parametricas sobre three.js. Cada funcion recibe medidas REALES (mm) y devuelve un THREE.Group con el eje en z
 * (la cara mira al espectador), centrado en el origen. Nada es una caja decorativa: un engranaje tiene perfil de evolvente con su modulo, numero de
 * dientes, angulo de presion y holgura; un rodamiento tiene bolas; un resorte es una helice con paso y diametro de alambre.
 *
 *   MX.parts.gear({ m, z, width, bore, hub, web, mat })           engranaje exterior (evolvente, 20 grados)
 *   MX.parts.ring({ m, z, ro, width, mat })                       corona (dentado interior)
 *   MX.parts.sprocket({ pitch, teeth, roller, width, mat })       pinon de cadena (paso en mm, diametro de rodillo)
 *   MX.parts.shaft / tube / disc / flange / plate / bearing / spring / bolt / nut / pin
 *   MX.parts.mat('steel' | 'brass' | ...)                         materiales fisicos con nombre
 * Los datos que cada pieza deja en group.userData (rp, ra, rf, z, m) los usa la cinematica para ubicar y engranar.
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {}), TH = g.THREE, G = MX.gl, P = (MX.parts = {}), TAU = Math.PI * 2, rad = Math.PI / 180;

  /* ------------------------------------------------------------ materiales con nombre */
  const MATS = {
    steel: ['#b9bcc2', { metalness: 1, roughness: 0.3 }], 'steel-dark': ['#9a9ea6', { metalness: 1, roughness: 0.4 }], chrome: ['#e6e8ec', { metalness: 1, roughness: 0.1 }],
    brass: ['#cda34a', { metalness: 1, roughness: 0.3 }], bronze: ['#a9743a', { metalness: 1, roughness: 0.36 }], copper: ['#c4693d', { metalness: 1, roughness: 0.3 }],
    aluminum: ['#d4d7dc', { metalness: 0.95, roughness: 0.34 }], 'aluminum-dark': ['#8e939b', { metalness: 0.95, roughness: 0.4 }],
    black: ['#1c1d20', { metalness: 0.2, roughness: 0.5 }], rubber: ['#222222', { roughness: 0.88 }], plastic: ['#ece9de', { roughness: 0.5 }], nylon: ['#e8e2cf', { roughness: 0.55 }],
    oxide: ['#3a3d44', { metalness: 0.7, roughness: 0.5 }], 'pom-red': ['#c9302c', { roughness: 0.42 }], 'pom-black': ['#1e1f22', { roughness: 0.42 }], gold: ['#e0b94f', { metalness: 1, roughness: 0.22 }], ruby: ['#c2243b', { metalness: 0, roughness: 0.08, clearcoat: 1 }],
  };
  const cache = {};
  P.mat = (name) => { if (name && name.isMaterial) return name; if (name === 'glass') return cache.glass || (cache.glass = G.glass('#ffffff', { thickness: 1.0, roughness: 0.12, attenuationDistance: 30 })); const k = MATS[name] ? name : 'steel'; return cache[k] || (cache[k] = G.mat(MATS[k][0], MATS[k][1])); };
  P.materials = Object.keys(MATS);
  // material de sonido (kit/sound.js) que corresponde a cada material fisico
  P.soundMat = (name) => ({ steel: 'steel', 'steel-dark': 'steel', chrome: 'steel', brass: 'aluminum', bronze: 'aluminum', copper: 'aluminum', aluminum: 'aluminum', 'aluminum-dark': 'aluminum', black: 'plastic', rubber: 'rubber', plastic: 'plastic', nylon: 'plastic', oxide: 'steel', gold: 'aluminum', ruby: 'ceramic', 'pom-red': 'plastic', 'pom-black': 'plastic', glass: 'glass' }[name] || 'steel');

  /* ------------------------------------------------------------ perfil de evolvente */
  // o: { rp (radio primitivo), z, ra (radio de cabeza), rf (radio de pie), ht (semiancho angular del diente en el primitivo), alpha (grados) }
  // Devuelve puntos [x, y] antihorarios; el diente 0 esta centrado en el angulo 0.
  P.involuteOutline = (o) => {
    const { rp, z, ra, rf, ht } = o, a = (o.alpha == null ? 20 : o.alpha) * rad, rb = rp * Math.cos(a), invA = Math.tan(a) - a;
    const th = (r) => { const p = Math.acos(Math.min(1, rb / r)); return ht - (Math.tan(p) - p - invA); };
    const r0 = Math.max(rb, rf), N = 6, pts = []; let rt = ra; while (th(rt) < 0.012 && rt > rp * 1.001) rt *= 0.996;
    const at = (r, ang) => pts.push([r * Math.cos(ang), r * Math.sin(ang)]);
    for (let i = 0; i < z; i++) {
      const c = (i / z) * TAU;
      if (rf < rb) at(rf, c - th(rb));
      for (let k = 0; k <= N; k++) { const r = r0 + (rt - r0) * k / N; at(r, c - th(r)); }
      for (let k = 1; k < 3; k++) at(rt, c - th(rt) + 2 * th(rt) * k / 3);
      for (let k = N; k >= 0; k--) { const r = r0 + (rt - r0) * k / N; at(r, c + th(r)); }
      if (rf < rb) at(rf, c + th(rb));
      const a0 = c + th(rf < rb ? rb : r0), a1 = c + TAU / z - th(rf < rb ? rb : r0);
      for (let k = 1; k <= 2; k++) at(rf, a0 + (a1 - a0) * k / 3);
    }
    return pts;
  };
  const toShape = (pts) => new TH.Shape(pts.map((p) => new TH.Vector2(p[0], p[1])));
  const circlePath = (r, x = 0, y = 0) => { const h = new TH.Path(); h.absarc(x, y, r, 0, TAU, true); return h; };
  // normales suavizadas por angulo: las curvas se ven lisas y las aristas de los dientes quedan vivas (ExtrudeGeometry da una normal plana por triangulo)
  const creased = (geo, deg) => {
    const pos = geo.attributes.position, n = pos.count / 3, cosT = Math.cos((deg || 38) * rad), fn = new Float32Array(n * 3), key = (i) => Math.round(pos.getX(i) * 400) + ',' + Math.round(pos.getY(i) * 400) + ',' + Math.round(pos.getZ(i) * 400), map = new Map();
    for (let f = 0; f < n; f++) {
      const i = f * 3, ax = pos.getX(i + 1) - pos.getX(i), ay = pos.getY(i + 1) - pos.getY(i), az = pos.getZ(i + 1) - pos.getZ(i), bx = pos.getX(i + 2) - pos.getX(i), by = pos.getY(i + 2) - pos.getY(i), bz = pos.getZ(i + 2) - pos.getZ(i);
      let x = ay * bz - az * by, y = az * bx - ax * bz, z = ax * by - ay * bx; const l = Math.hypot(x, y, z) || 1; fn[f * 3] = x / l; fn[f * 3 + 1] = y / l; fn[f * 3 + 2] = z / l;
      for (let k = 0; k < 3; k++) { const kk = key(i + k); (map.get(kk) || map.set(kk, []).get(kk)).push(f); }
    }
    const out = new Float32Array(pos.count * 3);
    for (let f = 0; f < n; f++) for (let k = 0; k < 3; k++) {
      let sx = 0, sy = 0, sz = 0; const fx = fn[f * 3], fy = fn[f * 3 + 1], fz = fn[f * 3 + 2];
      map.get(key(f * 3 + k)).forEach((h) => { const hx = fn[h * 3], hy = fn[h * 3 + 1], hz = fn[h * 3 + 2]; if (hx * fx + hy * fy + hz * fz > cosT) { sx += hx; sy += hy; sz += hz; } });
      const l = Math.hypot(sx, sy, sz) || 1; out.set([sx / l, sy / l, sz / l], (f * 3 + k) * 3);
    }
    geo.setAttribute('normal', new TH.BufferAttribute(out, 3)); return geo;
  };
  const extrude = (shape, depth, bv) => { const d = Math.max(0.01, depth - 2 * bv), geo = new TH.ExtrudeGeometry(shape, { depth: d, bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv * 0.7, bevelSegments: 1, curveSegments: 120 }); geo.translate(0, 0, -d / 2); return creased(geo); };
  const grp = (mesh, data) => { const gr = new TH.Group(); gr.add(mesh); Object.assign(gr.userData, data || {}); return gr; };

  /* ------------------------------------------------------------ engranajes */
  // o: { m (modulo), z (dientes), width, bore (radio del agujero), alpha, backlash, web: { n, r, d } (agujeros de aligeramiento), hub: { r, w } (cubo), mat }
  P.gear = (o) => {
    const rp = o.m * o.z / 2, ra = rp + o.m, rf = rp - 1.25 * o.m, bl = o.backlash == null ? 0.03 : o.backlash, alpha = o.alpha == null ? 20 : o.alpha;
    const sh = toShape(P.involuteOutline({ rp, z: o.z, ra, rf, ht: Math.PI / (2 * o.z) * (1 - bl), alpha }));
    if (o.bore) sh.holes.push(circlePath(o.bore));
    if (o.web) for (let i = 0; i < o.web.n; i++) { const a = (i + 0.5) / o.web.n * TAU; sh.holes.push(circlePath(o.web.d / 2, o.web.r * Math.cos(a), o.web.r * Math.sin(a))); }
    const m = new TH.Mesh(extrude(sh, o.width, Math.min(0.16, o.m * 0.18)), P.mat(o.mat || 'steel')), gr = grp(m, { kind: 'gear', m: o.m, z: o.z, rp, ra, rf, width: o.width });
    if (o.hub) { const h = new TH.Mesh(new TH.CylinderGeometry(o.hub.r, o.hub.r, o.hub.w, 40, 1), P.mat(o.mat || 'steel')); h.rotation.x = Math.PI / 2; gr.add(h); }
    return gr;
  };
  P.ring = (o) => {
    const rp = o.m * o.z / 2, bl = o.backlash == null ? 0.03 : o.backlash, alpha = o.alpha == null ? 20 : o.alpha;
    const sh = new TH.Shape(); sh.absarc(0, 0, o.ro, 0, TAU, false);
    sh.holes.push(new TH.Path(P.involuteOutline({ rp, z: o.z, ra: rp + 1.25 * o.m, rf: rp - o.m, ht: Math.PI / (2 * o.z) * (1 + bl), alpha }).map((p) => new TH.Vector2(p[0], p[1]))));
    return grp(new TH.Mesh(extrude(sh, o.width, Math.min(0.16, o.m * 0.18)), P.mat(o.mat || 'steel')), { kind: 'ring', m: o.m, z: o.z, rp, ra: rp - o.m, rf: rp + 1.25 * o.m, width: o.width });
  };
  // pinon de cadena: el radio primitivo sale del paso (R = p / (2 sin(pi/n))); las muescas tienen el diametro del rodillo
  P.sprocket = (o) => {
    const n = o.teeth, p = o.pitch, R = p / (2 * Math.sin(Math.PI / n)), rr = (o.roller || p * 0.6) / 2 + 0.08, Rt = R + p * 0.28, pts = [];
    for (let i = 0; i < n; i++) {
      const c = i / n * TAU, nx = R * Math.cos(c), ny = R * Math.sin(c);
      for (let k = 0; k <= 8; k++) { const s = (70 - 140 * k / 8) * rad, d = c + Math.PI + s; pts.push([nx + rr * Math.cos(d), ny + rr * Math.sin(d)]); }
      const tm = c + Math.PI / n; pts.push([Rt * Math.cos(tm - 0.02), Rt * Math.sin(tm - 0.02)], [Rt * Math.cos(tm + 0.02), Rt * Math.sin(tm + 0.02)]);
    }
    const sh = toShape(pts); if (o.bore) sh.holes.push(circlePath(o.bore));
    return grp(new TH.Mesh(extrude(sh, o.width, 0.2), P.mat(o.mat || 'steel')), { kind: 'sprocket', teeth: n, pitch: p, rp: R, ra: Rt, width: o.width });
  };

  /* ------------------------------------------------------------ cuerpos de revolucion y placas */
  const cyl = (rt, rb, len, mat, seg = 48) => { const m = new TH.Mesh(new TH.CylinderGeometry(rt, rb, len, seg, 1), P.mat(mat)); m.rotation.x = Math.PI / 2; return m; };
  P.shaft = (o) => grp(cyl(o.r, o.r, o.len, o.mat || 'steel'), { kind: 'shaft', r: o.r, len: o.len });
  P.pin = P.shaft;
  P.disc = (o) => { const sh = new TH.Shape(); sh.absarc(0, 0, o.r, 0, TAU, false); if (o.bore) sh.holes.push(circlePath(o.bore)); (o.holes || []).forEach(([x, y, r]) => sh.holes.push(circlePath(r, x, y))); return grp(new TH.Mesh(extrude(sh, o.w, Math.min(0.18, o.w * 0.2)), P.mat(o.mat || 'steel')), { kind: 'disc', r: o.r, w: o.w }); };
  // brida con n agujeros para radios sobre un circulo de radio hr
  P.flange = (o) => P.disc({ r: o.r, bore: o.bore, w: o.w, mat: o.mat, holes: Array.from({ length: o.n || 0 }, (_, i) => { const a = i / o.n * TAU; return [o.hr * Math.cos(a), o.hr * Math.sin(a), o.hd / 2]; }) });
  P.tube = (o) => { const sh = new TH.Shape(); sh.absarc(0, 0, o.ro, 0, TAU, false); sh.holes.push(circlePath(o.ri)); return grp(new TH.Mesh(extrude(sh, o.len, Math.min(0.25, (o.ro - o.ri) * 0.2)), P.mat(o.mat || 'aluminum')), { kind: 'tube', ro: o.ro, ri: o.ri, len: o.len }); };
  // placa con esquinas redondeadas y agujeros [x, y, r]
  P.plate = (o) => {
    const w = o.w, h = o.h, r = Math.min(o.r || 1, w / 2, h / 2), s = new TH.Shape();
    s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false); s.lineTo(w / 2, h / 2 - r); s.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
    s.lineTo(-w / 2 + r, h / 2); s.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false); s.lineTo(-w / 2, -h / 2 + r); s.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, 1.5 * Math.PI, false);
    (o.holes || []).forEach(([x, y, hr]) => s.holes.push(circlePath(hr, x, y)));
    return grp(new TH.Mesh(extrude(s, o.t, Math.min(0.2, o.t * 0.25)), P.mat(o.mat || 'steel')), { kind: 'plate', w, h, t: o.t });
  };

  /* ------------------------------------------------------------ rodamiento, resorte, tornilleria */
  P.bearing = (o) => {
    const ri = o.ri, ro = o.ro, w = o.w, t = Math.min((ro - ri) * 0.28, 1.6), balls = o.balls || 9, gr = new TH.Group(), rb = (ro - ri - 2 * t) / 2 * 0.98, rm = (ri + ro) / 2;
    const ring = (a, b) => { const s = new TH.Shape(); s.absarc(0, 0, b, 0, TAU, false); s.holes.push(circlePath(a)); return new TH.Mesh(extrude(s, w, 0.15), P.mat(o.mat || 'chrome')); };
    gr.add(ring(ri, ri + t), ring(ro - t, ro));
    const bm = P.mat('chrome'); for (let i = 0; i < balls; i++) { const a = i / balls * TAU, b = new TH.Mesh(new TH.SphereGeometry(rb, 20, 14), bm); b.position.set(rm * Math.cos(a), rm * Math.sin(a), 0); gr.add(b); }
    const cage = new TH.Mesh(new TH.TorusGeometry(rm, rb * 0.16, 8, 48), P.mat('brass')); cage.position.z = w * 0.02; gr.add(cage);
    gr.userData = { kind: 'bearing', ri, ro, w }; return gr;
  };
  // resorte helicoidal: r (radio medio), wire (diametro del alambre), turns (espiras activas), len (largo)
  P.spring = (o) => {
    const pts = [], n = Math.max(24, Math.round(o.turns * 28));
    for (let i = 0; i <= n; i++) { const u = i / n, a = u * o.turns * TAU; pts.push(new TH.Vector3(o.r * Math.cos(a), o.r * Math.sin(a), (u - 0.5) * o.len)); }
    return grp(new TH.Mesh(new TH.TubeGeometry(new TH.CatmullRomCurve3(pts), n * 2, o.wire / 2, 10, false), P.mat(o.mat || 'steel')), { kind: 'spring', r: o.r, wire: o.wire, turns: o.turns, len: o.len });
  };
  P.nut = (o) => {
    const gr = new TH.Group(), s = new TH.Shape(), r = o.af / Math.sqrt(3);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; if (i) s.lineTo(r * Math.cos(a), r * Math.sin(a)); else s.moveTo(r * Math.cos(a), r * Math.sin(a)); }
    s.closePath(); if (o.bore) s.holes.push(circlePath(o.bore));
    gr.add(new TH.Mesh(extrude(s, o.h, 0.15), P.mat(o.mat || 'steel'))); gr.userData = { kind: 'nut', af: o.af, h: o.h }; return gr;
  };
  P.bolt = (o) => { const gr = new TH.Group(), head = P.nut({ af: o.head || o.d * 1.6, h: o.d * 0.65, mat: o.mat }); head.position.z = o.len / 2 + o.d * 0.325; gr.add(head); gr.add(cyl(o.d / 2, o.d / 2, o.len, o.mat || 'steel', 24)); gr.userData = { kind: 'bolt', d: o.d, len: o.len }; return gr; };

  /* ------------------------------------------------------------ carcasas, bloques y vastagos en cruz */
  const rrect = (w, h, r) => { r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001); const s = new TH.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false); s.lineTo(w / 2, h / 2 - r); s.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false); s.lineTo(-w / 2 + r, h / 2); s.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false); s.lineTo(-w / 2, -h / 2 + r); s.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, 1.5 * Math.PI, false); return s; };
  const rrectPath = (w, h, r) => new TH.Path(rrect(w, h, r).getPoints(12));
  // carcasa de seccion rectangular: w x d de afuera, pared wall, alto h (en z); floor > 0 le suma un piso cerrado; opening: [w, d] abre una ventana en el piso
  P.box = (o) => {
    const gr = new TH.Group(), r = o.r == null ? 0.6 : o.r, sh = rrect(o.w, o.d, r); sh.holes.push(rrectPath(o.w - 2 * o.wall, o.d - 2 * o.wall, Math.max(0.1, r - o.wall)));
    const wallH = o.h - (o.floor || 0), m = new TH.Mesh(extrude(sh, wallH, Math.min(0.12, o.wall * 0.2)), P.mat(o.mat || 'plastic')); m.position.z = (o.floor || 0) / 2; gr.add(m);
    if (o.floor) { const fs = rrect(o.w, o.d, r); if (o.opening) fs.holes.push(rrectPath(o.opening[0], o.opening[1], 0.4)); const f = new TH.Mesh(extrude(fs, o.floor, 0.1), P.mat(o.mat || 'plastic')); f.position.z = -o.h / 2 + o.floor / 2; gr.add(f); m.position.z = -o.h / 2 + o.floor + wallH / 2; }
    gr.userData = { kind: 'box', w: o.w, d: o.d, h: o.h }; return gr;
  };
  P.block = (o) => grp(new TH.Mesh(extrude(rrect(o.w, o.d, o.r == null ? 0.4 : o.r), o.h, Math.min(0.1, o.h * 0.1)), P.mat(o.mat || 'plastic')), { kind: 'block', w: o.w, d: o.d, h: o.h });
  // cruz (+) extruida: brazos de largo "arm" y espesor "thick", altura len en z (la interfaz del vastago de un switch MX)
  P.cross = (o) => { const a = o.arm / 2, t = o.thick / 2, s = new TH.Shape(); [[-a, -t], [-t, -t], [-t, -a], [t, -a], [t, -t], [a, -t], [a, t], [t, t], [t, a], [-t, a], [-t, t], [-a, t]].forEach((q, i) => (i ? s.lineTo(q[0], q[1]) : s.moveTo(q[0], q[1]))); s.closePath(); return grp(new TH.Mesh(extrude(s, o.len, 0.05), P.mat(o.mat || 'pom-red')), { kind: 'cross', arm: o.arm, thick: o.thick, len: o.len }); };

  /* ------------------------------------------------------------ rotores de cifrado (Enigma): rueda de entrada, rotor, reflector */
  const letterMats = {};
  const letterMat = (ch) => letterMats[ch] || (letterMats[ch] = G.flatMat(G.canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#17181a'; c.font = '700 46px ' + MX.SANS; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, w / 2, h / 2 + 2); })));
  // o: { kind: 'rotor' | 'etw' | 'reflector', r, w, rc (radio del circulo de contactos), wiring (26 letras: entrada A..Z -> salida), notch (letra), mat, ringMat, xray }
  // El cableado interno se dibuja desde los DATOS (el mismo que usa la simulacion): lo que se ve es lo que se calcula.
  P.rotor = (o) => {
    const kind = o.kind || 'rotor', r = o.r || 50, w = o.w || 12, rc = o.rc || 30, gr = new TH.Group(), phi = (k) => Math.PI / 2 - k * TAU / 26, wire = [...(o.wiring || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')].map((ch) => ch.charCodeAt(0) - 65);
    const coreMat = P.mat(o.mat || 'black').clone(); if (o.xray !== false) { coreMat.transparent = true; coreMat.opacity = 0.55; coreMat.depthWrite = false; }
    const core = new TH.Mesh(new TH.CylinderGeometry(r - 4, r - 4, w, 72), coreMat); core.rotation.x = Math.PI / 2; gr.add(core);
    if (kind === 'rotor') {
      gr.add(P.tube({ ro: r, ri: r - 4.4, len: w * 0.66, mat: o.ringMat || 'aluminum' }));
      for (let k = 0; k < 26; k++) {
        const m = new TH.Mesh(new TH.PlaneGeometry(4.4, 6.0), letterMat(String.fromCharCode(65 + k))), ph = phi(k), n = new TH.Vector3(Math.cos(ph), Math.sin(ph), 0), u = new TH.Vector3(0, 0, 1), x = new TH.Vector3().crossVectors(u, n);
        m.quaternion.setFromRotationMatrix(new TH.Matrix4().makeBasis(x, u, n)); m.position.set((r + 0.06) * n.x, (r + 0.06) * n.y, 0); m.renderOrder = 2; gr.add(m);
      }
      if (o.notch) { const ph = phi(o.notch.charCodeAt(0) - 65), nb = new TH.Mesh(new TH.BoxGeometry(3.4, 2.6, 1.8), P.mat('black')); nb.position.set((r - 2.4) * Math.cos(ph), (r - 2.4) * Math.sin(ph), -w / 2 + 0.9); nb.rotation.z = ph; gr.add(nb); }
    }
    // contactos: clavijas con resorte del lado derecho (entrada) y placas del lado izquierdo; el reflector solo tiene placas del lado derecho
    const pinGeo = new TH.CylinderGeometry(0.8, 0.8, 2.2, 10); pinGeo.rotateX(Math.PI / 2); const padGeo = new TH.CylinderGeometry(1.7, 1.7, 0.7, 14); padGeo.rotateX(Math.PI / 2); const bm = P.mat('brass');
    const pins = new TH.InstancedMesh(pinGeo, bm, 26), pads = new TH.InstancedMesh(padGeo, bm, 26), m4 = new TH.Matrix4();
    for (let k = 0; k < 26; k++) {
      m4.makeTranslation(rc * Math.cos(phi(k)), rc * Math.sin(phi(k)), kind === 'reflector' ? w / 2 + 0.2 : w / 2 + 1.1); (kind === 'reflector' ? pads : pins).setMatrixAt(k, m4);
      m4.makeTranslation(rc * Math.cos(phi(k)), rc * Math.sin(phi(k)), -w / 2 - 0.3); if (kind !== 'reflector') pads.setMatrixAt(k, m4);
    }
    gr.add(pads); if (kind !== 'reflector') gr.add(pins);
    const pts = [];
    for (let k = 0; k < 26; k++) {
      const a = phi(k), b = phi(wire[k]);
      if (kind === 'reflector') { if (k < wire[k]) pts.push(rc * Math.cos(a), rc * Math.sin(a), w / 2 - 1.2, rc * Math.cos(b), rc * Math.sin(b), w / 2 - 1.2); }
      else pts.push(rc * Math.cos(a), rc * Math.sin(a), w / 2 - 0.3, rc * Math.cos(b), rc * Math.sin(b), -w / 2 + 0.3);
    }
    const lg = new TH.BufferGeometry(); lg.setAttribute('position', new TH.Float32BufferAttribute(pts, 3)); gr.add(new TH.LineSegments(lg, new TH.LineBasicMaterial({ color: '#d9b25a', transparent: true, opacity: 0.85 })));
    gr.userData = { kind: 'rotor', r, w, rc }; return gr;
  };
})(typeof window !== 'undefined' ? window : globalThis);
