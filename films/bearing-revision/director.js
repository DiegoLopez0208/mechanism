/* Native Mechanism Studio study. NSK 6205 published envelope/ball data;
 * raceway profile, pitch circle and cage shape are illustrative estimates.
 * No manufacturer's CAD, branding, clearance or load simulation is implied. */
(function (g) {
  'use strict';
  const TH = g.THREE, MX = g.MX, W = 1600, H = 900, duration = 12;
  const rb = 7.938 / 2, R = 19.25, rg = 4.15, count = 9;
  const st = MX.gl.stage({w: W, h: H, fov: 32, renderScale: 1, environment: 'room',
    exposure: .95, envIntensity: .85, ao: .55, bloom: .015, ssr: false, toneMap: 'agx'});
  st.floor.visible = false;
  const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
  const bx = bg.getContext('2d'), grad = bx.createRadialGradient(910, 390, 40, 900, 440, 950);
  grad.addColorStop(0, '#263f53'); grad.addColorStop(.65, '#101e2f'); grad.addColorStop(1, '#060e1a');
  bx.fillStyle = grad; bx.fillRect(0, 0, W, H);
  st.scene.background = new TH.CanvasTexture(bg); st.scene.background.colorSpace = TH.SRGBColorSpace;
  st.key.position.set(-70, 100, 150); st.key.intensity = 2.1;
  st.fill.position.set(80, 15, 70); st.fill.intensity = .9;
  st.rim.position.set(20, 70, -90); st.rim.color.set('#9ecfff'); st.rim.intensity = 2;
  const steel = new TH.MeshPhysicalMaterial({color: '#bbc4ca', metalness: 1, roughness: .29});
  const cageMat = new TH.MeshPhysicalMaterial({color: '#a7acaf', metalness: .92, roughness: .4});
  const ballMat = new TH.MeshPhysicalMaterial({color: '#e3e8ed', metalness: 1, roughness: .16});
  const cutMat = new TH.MeshStandardMaterial({color: '#70a1b2', metalness: .5, roughness: .48, side: TH.DoubleSide});
  const root = new TH.Group(); st.scene.add(root);
  const mesh = (geo, mat, parent = root) => { const m = new TH.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  // A closed meridian profile with chamfered edges and a circular-arc raceway.
  function profile(outer) {
    const ps = [], at = (r, z) => ps.push(new TH.Vector2(r, z));
    if (outer) { at(25, -7.5); at(26, -6.5); at(26, 6.5); at(25, 7.5); }
    else { at(13.5, -7.5); at(12.5, -6.5); at(12.5, 6.5); at(13.5, 7.5); }
    const shoulder = outer ? R + rb - rg + Math.sqrt(rg * rg - 3.2 ** 2) : R - rb + rg - Math.sqrt(rg * rg - 3.2 ** 2);
    at(shoulder + (outer ? .3 : -.3), 7.5); at(shoulder, 7.2);
    for (let i = 0; i <= 64; i++) {
      const z = 7.2 - 14.4 * i / 64, dz = Math.min(Math.abs(z), 3.2), h = Math.sqrt(rg * rg - dz * dz);
      at(outer ? R + rb - rg + h : R - rb + rg - h, z);
    }
    at(shoulder + (outer ? .3 : -.3), -7.5); ps.push(ps[0].clone());
    return ps;
  }
  function race(outer, section) {
    const group = new TH.Group(), ps = profile(outer), start = section ? Math.PI : 0, sweep = section ? Math.PI * 1.5 : Math.PI * 2;
    const geo = new TH.LatheGeometry(ps, 256, start, sweep); geo.rotateX(Math.PI / 2); mesh(geo, steel, group);
    if (section) {
      const shape = new TH.Shape(ps.slice(0, -1)), cap = new TH.ShapeGeometry(shape);
      for (const a of [start, start + sweep]) {
        const cg = cap.clone(), pos = cg.attributes.position;
        for (let i = 0; i < pos.count; i++) { const r = pos.getX(i), z = pos.getY(i); pos.setXYZ(i, r * Math.sin(a), -r * Math.cos(a), z); }
        cg.computeVertexNormals(); mesh(cg, cutMat, group);
      }
    }
    root.add(group); return group;
  }
  const full = [race(true, false), race(false, false)], sections = [race(true, true), race(false, true)];
  const balls = new TH.Group(); root.add(balls);
  const ballGeo = new TH.SphereGeometry(rb, 64, 40);
  for (let i = 0; i < count; i++) { const a = i * Math.PI * 2 / count; mesh(ballGeo, ballMat, balls).position.set(R * Math.cos(a), R * Math.sin(a), 0); }
  function cage(side) {
    const group = new TH.Group(), shape = new TH.Shape();
    shape.absarc(0, 0, 23.25, 0, Math.PI * 2, false);
    const bore = new TH.Path(); bore.absarc(0, 0, 15.25, 0, Math.PI * 2, true); shape.holes.push(bore);
    for (let i = 0; i < count; i++) {
      const a = i * Math.PI * 2 / count, x = R * Math.cos(a), y = R * Math.sin(a), hole = new TH.Path();
      hole.absarc(x, y, 3.4, 0, Math.PI * 2, true); shape.holes.push(hole);
      const lip = mesh(new TH.TorusGeometry(3.49, .12, 8, 48), cageMat, group); lip.position.set(x, y, side * 2);
      const ra = a + Math.PI / count;
      mesh(new TH.SphereGeometry(.65, 20, 12), cageMat, group).position.set(R * Math.cos(ra), R * Math.sin(ra), side * .25);
    }
    const rawPlate = new TH.ExtrudeGeometry(shape, {depth: .4, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, steps: 1, curveSegments: 24});
    // Add interior vertices before forming the sheet: deforming only the outline
    // would create large triangular facets across otherwise smooth pockets.
    const vertices = [], source = rawPlate.attributes.position;
    const mid = (a, b) => a.map((v, i) => (v + b[i]) / 2);
    function subdivide(a, b, c, level) {
      if (!level) { vertices.push(...a, ...b, ...c); return; }
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      subdivide(a, ab, ca, level - 1); subdivide(ab, b, bc, level - 1); subdivide(ca, bc, c, level - 1); subdivide(ab, bc, ca, level - 1);
    }
    for (let j = 0; j < source.count; j += 3) subdivide([source.getX(j), source.getY(j), source.getZ(j)], [source.getX(j + 1), source.getY(j + 1), source.getZ(j + 1)], [source.getX(j + 2), source.getY(j + 2), source.getZ(j + 2)], 2);
    rawPlate.dispose(); const plate = new TH.BufferGeometry(); plate.setAttribute('position', new TH.Float32BufferAttribute(vertices, 3));
    plate.translate(0, 0, -.2);
    // Formed sheet around each pocket, rather than a flat washer with holes.
    const pv = plate.attributes.position, analytic = [];
    for (let j = 0; j < pv.count; j++) {
      const x = pv.getX(j), y = pv.getY(j), z = pv.getZ(j); let distance = Infinity, dx = 0, dy = 0;
      for (let i = 0; i < count; i++) { const a = i * Math.PI * 2 / count, vx = x - R * Math.cos(a), vy = y - R * Math.sin(a), d = Math.hypot(vx, vy); if (d < distance) { distance = d; dx = vx; dy = vy; } }
      const f = side * 2 * Math.exp(-((distance - 3.4) ** 2)), df = -2 * (distance - 3.4) * f / Math.max(distance, .001);
      pv.setZ(j, z + f);
      analytic.push(Math.abs(z) > .27 ? new TH.Vector3(-df * dx, -df * dy, 1).normalize().multiplyScalar(Math.sign(z)) : null);
    }
    plate.computeVertexNormals();
    const normals = plate.attributes.normal, summed = new Map(), keys = [];
    for (let j = 0; j < pv.count; j++) {
      const k = [pv.getX(j), pv.getY(j), pv.getZ(j)].map(v => Math.round(v * 10000)).join(','); keys.push(k);
      const n = summed.get(k) || new TH.Vector3(); n.add(new TH.Vector3().fromBufferAttribute(normals, j)); summed.set(k, n);
    }
    summed.forEach(n => n.normalize()); keys.forEach((k, j) => { const n = analytic[j] || summed.get(k); normals.setXYZ(j, n.x, n.y, n.z); });
    mesh(plate, cageMat, group); root.add(group); return group;
  }
  const cages = [cage(1), cage(-1)];
  // Subtle engraved model descriptor, never a manufacturer's logo.
  const tc = document.createElement('canvas'); tc.width = 1024; tc.height = 256;
  const tx = tc.getContext('2d'); tx.clearRect(0, 0, 1024, 256); tx.fillStyle = '#36424a'; tx.font = '500 74px Inter'; tx.textAlign = 'center'; tx.fillText('6205  /  OPEN', 512, 160);
  const tex = new TH.CanvasTexture(tc); tex.colorSpace = TH.SRGBColorSpace;
  const mark = mesh(new TH.PlaneGeometry(14, 3.5), new TH.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false})); mark.position.set(0, -24.2, 7.53);
  const clamp = x => Math.max(0, Math.min(1, x)), smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const text = (ctx, s, x, y, size, color = '#e3edf3', weight = 500) => { ctx.fillStyle = color; ctx.font = `${weight} ${size}px Inter`; ctx.fillText(s, x, y); };
  const point = p => { const q = root.localToWorld(p.clone()).project(st.camera); return [(q.x + 1) * W / 2, (1 - q.y) * H / 2]; };
  function leader(ctx, p, s, x, y) {
    const q = point(p); ctx.strokeStyle = '#8dbacb'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(x - 18, y - 8); ctx.lineTo(x + 260, y - 8); ctx.stroke();
    ctx.fillStyle = '#b3deed'; ctx.beginPath(); ctx.arc(q[0], q[1], 3, 0, Math.PI * 2); ctx.fill(); text(ctx, s, x, y - 21, 22);
  }
  function paint(ctx, t) {
    const chapter = Math.min(2, Math.floor(t / 4)), u = t % 4 / 4, e = chapter === 2 ? smooth(u * 1.8) : 0;
    full.forEach(p => p.visible = chapter !== 1); sections.forEach(p => p.visible = chapter === 1); mark.visible = chapter !== 1;
    root.rotation.set(0, 0, 0); balls.rotation.z = t * .34;
    cages.forEach((c, i) => { c.position.z = (i ? -1 : 1) * (.55 + e * 23); c.rotation.z = balls.rotation.z; });
    // In a section study the cage is removed so that the circular raceway is visible.
    cages.forEach(c => c.visible = chapter !== 1);
    if (chapter === 0) st.setView({yaw: -25 + 9 * smooth(u), pitch: 19, zoom: 11.7, cx: 955, cy: 455});
    else if (chapter === 1) st.setView({yaw: 29 - 7 * smooth(u), pitch: 24, zoom: 12.1, cx: 930, cy: 465});
    else st.setView({yaw: -34, pitch: 14, zoom: 9.8, cx: 900, cy: 465});
    st.scene.updateMatrixWorld(true); st.render(); st.blit(ctx);
    text(ctx, 'MECHANISM / STUDIO', 65, 57, 18, '#9ab7c8', 650);
    text(ctx, ['6205', 'INSIDE THE RACEWAY', 'THE CAGE'][chapter], 65, 154, chapter === 0 ? 76 : 38, '#e4eef5', 650);
    const copy = [['Deep-groove ball bearing', '25 × 52 × 15 mm', '9 balls · Ø 7.938 mm'], ['Circular-arc grooves', 'Cage removed for visibility', 'Internal profile approximated'], ['Two-piece steel retainer', 'Keeps the balls spaced', 'Cage shape approximated']][chapter];
    copy.forEach((s, i) => text(ctx, s, 68, 207 + i * 33, 22, i ? '#9eb7c6' : '#d8e8f0'));
    if (chapter === 1) leader(ctx, new TH.Vector3(0, R + rb, 0), 'Outer-ring raceway', 1240, 350);
    text(ctx, 'DIMENSIONS / BALL DATA: NSK 6205   ·   INTERNAL GEOMETRY: ILLUSTRATIVE', 65, 856, 15, '#92adbf');
    text(ctx, `0${chapter + 1} / 03`, 1440, 856, 18, '#a4c6d7');
    const fade = Math.max(0, 1 - Math.min(t % 4, 4 - t % 4) / .12);
    if (t > 3.8 && t < 8.2 && fade) { ctx.fillStyle = `rgba(7,15,27,${fade})`; ctx.fillRect(0, 0, W, H); }
  }
  g.__bearing = {stage: st, root, balls, cages, full, sections, parameters: {d: 25, D: 52, B: 15, balls: count, Dw: rb * 2, pitchDiameterEstimated: R * 2, grooveRadiusEstimated: rg}};
  g.__specInfo = () => ({duration, engine: 'original-studio', evidence: 'published envelope and ball data; internal geometry estimated', source: 'https://www.nsk.com/engineering/products/bearings/ball-bearings/deep-groove-ball-bearings/single-row-deep-groove-ball-bearings/6205-apn.html'});
  MX.run({w: W, h: H, fps: 30, duration, draw: paint});
})(window);
