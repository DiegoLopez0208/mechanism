/*
 * docs/hero.js - the 3D hero of the landing page.
 * Not a render of a video: the real parts of the toolkit (kit/parts.js) running live. The planetary gear set is the three-speed hub from
 * examples/hub/spec.js with its real tooth phases and Willis rates; the cube is the 26 cubies of kit/cube.js turning one layer at a time.
 * Move the mouse to orbit, scroll to take it apart, click to turn a layer.
 */
(function () {
  'use strict';
  const cv = document.getElementById('hero3d'), host = cv && cv.parentElement;
  if (!cv || !window.THREE || !window.MX || !window.MX.parts || !window.SPEC) return;
  const TH = window.THREE, MX = window.MX, P = MX.parts, CB = MX.cube, S = MX.spec;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new TH.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { host.classList.add('nogl'); return; }
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t, ease = (t) => t * t * (3 - 2 * t);
  const outBack = (t, k = 1.5) => { const u = t - 1; return 1 + (k + 1) * u * u * u + k * u * u; };
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = TH.NeutralToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = TH.PCFSoftShadowMap;
  const scene = new TH.Scene(), pm = new TH.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new TH.RoomEnvironment(), 0.04).texture; pm.dispose();
  const camera = new TH.PerspectiveCamera(24, 1, 10, 3000);
  const hemi = new TH.HemisphereLight('#ffffff', '#d8d3c4', 0.3), key = new TH.DirectionalLight('#fff1e0', 2.4), fill = new TH.DirectionalLight('#cfe0ff', 0.35);
  key.position.set(-90, 190, 150); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.05;
  Object.assign(key.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 10, far: 700 });
  fill.position.set(110, 40, -80); scene.add(hemi, key, fill);
  const root = new TH.Group(); scene.add(root);

  /* ---------------------------------------------------------- planetary gear set: the hub of examples/hub */
  const an = S.analyze(window.SPEC), K = an.K, startPos = S.startPos, ids = ['sun', 'planet1', 'planet2', 'planet3', 'planet4', 'pin1', 'pin2', 'pin3', 'pin4', 'plateB', 'plateF', 'ring'];
  const gearG = new TH.Group(); root.add(gearG); gearG.position.set(-30, 22, 0); gearG.rotation.set(-0.95, -0.35, 0); gearG.scale.setScalar(1.5);
  const gears = [];
  window.SPEC.parts.filter((d) => ids.includes(d.id)).forEach((d, i) => {
    const grp = P[d.kind](Object.assign({}, d.p, { mat: d.mat })), base = startPos(d);
    grp.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    grp.position.set(base[0], base[1], base[2]); gearG.add(grp);
    gears.push({ d, grp, base, phi: d.body && S.teethOf(d) ? (an.phi[d.body] || 0) : 0, delay: 0.1 + i * 0.05, from: new TH.Vector3((Math.random() - 0.5) * 90, 80 + Math.random() * 60, 120) });
  });

  /* ---------------------------------------------------------- the cube: 26 cubies of kit/cube.js */
  const PITCH = 18.67, COLOR = { '+y': '#f4f4ef', '-y': '#f2c40f', '+z': '#1a9a4a', '-z': '#1f5fbf', '+x': '#c8281e', '-x': '#f07a12' };
  const cubeG = new TH.Group(); root.add(cubeG); cubeG.position.set(34, -30, 0); cubeG.rotation.set(0.5, -0.62, 0.02); cubeG.scale.setScalar(0.9);
  const state = CB.create(), cubies = state.map((c, i) => {
    const st = {}; [['x', c.home[0]], ['y', c.home[1]], ['z', c.home[2]]].forEach(([ax, v]) => { if (v) st[(v > 0 ? '+' : '-') + ax] = COLOR[(v > 0 ? '+' : '-') + ax]; });
    const grp = P.cubie({ s: PITCH, stickers: st }); grp.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); cubeG.add(grp);
    return { grp, home: c.home, delay: 0.5 + i * 0.03, from: new TH.Vector3((Math.random() - 0.5) * 140, -60 - Math.random() * 60, 100) };
  });
  const faces = ['U', 'D', 'R', 'L', 'F', 'B'], rm = new TH.Matrix4(), rq = new TH.Quaternion(), mulv = (m, v) => [0, 1, 2].map((r) => m[r * 3] * v[0] + m[r * 3 + 1] * v[1] + m[r * 3 + 2] * v[2]);
  let move = null, nextAt = 2.6, lastFace = '';
  const startMove = (t) => { let f; do { f = faces[Math.floor(Math.random() * 6)]; } while (f === lastFace); lastFace = f; const q = [1, 1, 3, 2][Math.floor(Math.random() * 4)]; move = { face: f, q, t0: t, dur: q === 2 ? 0.7 : 0.5 }; };
  const cubeFrame = (t) => {
    if (!move) return state;
    const u = (t - move.t0) / move.dur; if (u >= 1) { CB.turn(state, { face: move.face, q: move.q }); move = null; nextAt = t + 0.55; return state; }
    const a = -move.q * Math.PI / 2 * ease(clamp(u, 0, 1)), cs = Math.cos(a), sn = Math.sin(a), n = CB.FACES[move.face], x = n[0], y = n[1], z = n[2];
    const Rm = [cs + (1 - cs) * x * x, (1 - cs) * x * y - sn * z, (1 - cs) * x * z + sn * y, (1 - cs) * y * x + sn * z, cs + (1 - cs) * y * y, (1 - cs) * y * z - sn * x, (1 - cs) * z * x - sn * y, (1 - cs) * z * y + sn * x, cs + (1 - cs) * z * z];
    return state.map((c) => (CB.inLayer(c, move.face) ? { pos: mulv(Rm, c.pos), R: [0, 1, 2].flatMap((r) => [0, 1, 2].map((q) => Rm[r * 3] * c.R[q] + Rm[r * 3 + 1] * c.R[3 + q] + Rm[r * 3 + 2] * c.R[6 + q])) } : c));
  };

  /* ---------------------------------------------------------- sizing, input, theme */
  let W = 1, H = 1; const resize = () => { const r = host.getBoundingClientRect(); W = Math.max(280, r.width); H = Math.max(280, r.height); renderer.setSize(W, H, false); camera.aspect = W / H; camera.position.set(4, 14, W / H < 0.9 ? 470 : 390); camera.lookAt(4, 0, 0); camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(host); resize();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 }; let scrollK = 0, seen = true, last = performance.now() / 1000, T = 0;
  host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 2; });
  host.addEventListener('pointerleave', () => { mouse.tx = 0; mouse.ty = 0; });
  host.addEventListener('click', () => { if (!move) startMove(T); });
  const onScroll = () => { const r = host.getBoundingClientRect(); scrollK = clamp(1 - (r.bottom - 120) / (r.height + 160), 0, 1); }; addEventListener('scroll', onScroll, { passive: true }); onScroll();
  new IntersectionObserver((en) => { seen = en[0].isIntersecting; }, { threshold: 0 }).observe(host);
  const setTheme = (t) => { const n = t === 'night'; renderer.toneMappingExposure = n ? 1.05 : 1; scene.environmentIntensity = n ? 0.5 : 0.75; hemi.intensity = n ? 0.2 : 0.3; key.intensity = n ? 2.2 : 2.4; hemi.groundColor.set(n ? '#1a1c24' : '#d8d3c4'); };
  window.heroTheme = setTheme; setTheme(document.documentElement.dataset.theme);

  /* ---------------------------------------------------------- frame */
  let ang = 0, ex = 0;
  const draw = (now) => {
    requestAnimationFrame(draw); if (!seen || document.hidden) { last = now / 1000; return; }
    const t = now / 1000, dt = Math.min(0.05, t - last); last = t; T += dt; mouse.x = lerp(mouse.x, mouse.tx, 0.06); mouse.y = lerp(mouse.y, mouse.ty, 0.06);
    ex = lerp(ex, scrollK, 0.12); const E = ex * 3.2;
    ang += dt * (reduce ? 0 : 0.55) * (1 - 0.8 * ex);
    root.rotation.y = mouse.x * 0.28 + Math.sin(T * 0.25) * 0.05; root.rotation.x = mouse.y * 0.14;
    // gears: carrier turns at ang, every other body at its Willis rate; the planets orbit with the carrier
    gears.forEach((g) => {
      const d = g.d, k = outBack(clamp((T - g.delay) / 1.0, 0, 1)), body = d.body, p = g.grp;
      let x = g.base[0], y = g.base[1]; const z = g.base[2] + (d.explode ? d.explode[2] : 0) * E;
      if (d.orbit) { const a = d.orbit.a0 * Math.PI / 180 + (K.rates.carrier || 1) * ang; x = d.orbit.center[0] + d.orbit.r * Math.cos(a); y = d.orbit.center[1] + d.orbit.r * Math.sin(a); }
      p.position.set(x + g.from.x * (1 - k), y + g.from.y * (1 - k), z + g.from.z * (1 - k));
      p.rotation.z = g.phi + (body ? (K.rates[body] || 0) * ang : 0); p.visible = T > g.delay;
    });
    // cube: turn a layer now and then, and open the cubies outward with the scroll
    if (!reduce && !move && T > nextAt) startMove(T);
    const fr = cubeFrame(T); fr.forEach((c, i) => {
      const cu = cubies[i], k = outBack(clamp((T - cu.delay) / 1.0, 0, 1)), R = c.R, o = E * 2.4;
      rm.set(R[0], R[1], R[2], 0, R[3], R[4], R[5], 0, R[6], R[7], R[8], 0, 0, 0, 0, 1); rq.setFromRotationMatrix(rm);
      cu.grp.quaternion.copy(rq); cu.grp.position.set(c.pos[0] * PITCH + c.pos[0] * o + cu.from.x * (1 - k), c.pos[1] * PITCH + c.pos[1] * o + cu.from.y * (1 - k), c.pos[2] * PITCH + c.pos[2] * o + cu.from.z * (1 - k)); cu.grp.visible = T > cu.delay;
    });
    gearG.rotation.z = Math.sin(T * 0.2) * 0.06; cubeG.rotation.y = -0.62 + Math.sin(T * 0.3) * 0.08 + ex * 0.5;
    renderer.render(scene, camera);
  };
  host.classList.add('live'); requestAnimationFrame(draw);
})();
