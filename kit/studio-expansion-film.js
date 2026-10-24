/* Production direction: native Studio depth, complementary process/vector films.
 * Source evidence is unchanged. This director owns composition, not model truth. */
(function (g) {
  'use strict';
  const MX = g.MX, film = g.TECHNICAL_FILM, studio = film.engine === 'studio';
  const W = 1600, H = 900, duration = 16, slot = 4;
  const query = new URLSearchParams(location.search);
  query.set('render', '1'); query.set('length', 'normal'); query.set('theme', 'dossier');
  if (studio) { query.delete('method'); query.delete('background'); }
  else { query.set('method', film.engine); query.set('background', 'blueprint'); }
  history.replaceState(null, '', location.pathname + '?' + query);
  MX.setStyle('dossier');
  let F;
  const factory = MX.figure;
  if (studio) MX.figure = cfg => (F = factory({ ...cfg, w: W, h: H, stage: { ...cfg.stage, ssr: true, renderScale: 1 } }));
  try { MX.spec.run(g.SPEC); } finally { if (studio) MX.figure = factory; }
  const pose = studio ? g.__pose : g.__paint, info = g.__specInfo(), audio = g.__audioWav;
  const native = document.getElementById('c'); native.id = 'native-canvas'; native.style.display = 'none';
  g.__studioFigure = F;
  const cv = document.createElement('canvas'); cv.id = 'c'; cv.width = W; cv.height = H; document.body.appendChild(cv);
  const ctx = cv.getContext('2d', { alpha: false, willReadFrequently: true });
  const validation = MX.spec.validate(g.SPEC);
  if (validation.errors.length) throw new Error(validation.errors.join('; '));
  // The bearing primitive owns actual 3D races, balls and cage. Animate those
  // meshes using the ideal stationary-outer-race rolling relation.
  if (g.SPEC.id === 'studio-ball-bearing') {
    const bearing = F.byId.bearing, nativePose = bearing.pose;
    const rm = 20, rb = (28 - 12 - 3.2) / 2 * .98;
    bearing.pose = (s, p) => {
      nativePose(s, p);
      const angle = (s.t || 0) * .8, cage = .5 * (1 - rb / rm) * angle;
      p.group.children[0].rotation.z = angle;
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5 + cage, ball = p.group.children[i + 2];
        ball.position.set(rm * Math.cos(a), rm * Math.sin(a), 0);
        ball.rotation.z = -(rm / (2 * rb)) * (1 - (rb / rm) ** 2) * angle;
      }
      p.group.children[12].rotation.z = cage;
    };
  }
  const verdict = validation.verdict, C = { ink: '#e3eff9', accent: '#64d7ff', mute: '#a2bfd5', bg: '#09192b', amber: '#ffd166' };
  const modeRanges = new Map();
  if (studio && info.phases?.modes != null) {
    let start = info.phases.modes;
    for (const shot of info.shots.filter(shot => shot.label.startsWith('mode '))) {
      const seconds = (shot.t - start) / .62;
      if (!(seconds > 0)) throw new Error('Invalid native mode timing: ' + shot.label);
      modeRanges.set(shot.label, { start, end: start + seconds }); start += seconds;
    }
  }
  const clamp = x => Math.max(0, Math.min(1, x)), smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const text = (str, x, y, size, width, color = C.ink, weight = 500, mono = false, maxLines = 4) => {
    ctx.font = weight + ' ' + size + 'px ' + (mono ? MX.MONO : MX.SANS); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
    const all = MX.presentation.wrap(String(str), width, s => ctx.measureText(s).width), lines = all.slice(0, maxLines);
    if (all.length > maxLines) { let tail = lines.at(-1); while (tail && ctx.measureText(tail + '…').width > width) tail = tail.slice(0, -1); lines[maxLines - 1] = tail + '…'; }
    lines.forEach((str, i) => ctx.fillText(str, x, y + i * size * 1.25)); return lines.length * size * 1.25;
  };
  const rule = (x0, y0, x1, y1, color = '#41617b') => { ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
  function shotFor(chapter) {
    const [kind, raw] = chapter.shot.split(':'), n = Number(raw || 0), shots = info.shots || [];
    if (kind === 'mode') { const m = g.SPEC.mechanism.drive.modes[n]; return shots.find(s => s.label === 'mode ' + (m.id || n)); }
    if (kind === 'item') return shots[Math.min(n, shots.length - 1)];
    if (kind === 'tour') return shots.filter(s => s.label.startsWith('tour '))[n];
    return shots.find(s => s.label === chapter.shot);
  }
  function sourceTime(chapter, u) {
    if (chapter.shot === 'cycle') return 2 + u * 8;
    const shot = shotFor(chapter); if (!shot) throw new Error('Missing shot: ' + film.id + ' / ' + chapter.shot);
    const range = modeRanges.get(shot.label);
    if (range) return range.start + .01 + u * Math.max(.01, range.end - range.start - .02);
    const span = chapter.shot.startsWith('mode:') ? 5.4 : film.engine === 'workflow' ? 3 : .4;
    return Math.max(.05, Math.min(info.duration - .1, shot.t + (u - .5) * span));
  }
  function stateAt(index, u) {
    const state = pose(sourceTime(film.chapters[index], u));
    const assembly = state.assemble;
    const clock = index * slot + u * slot;
    state.t = clock; state.e = index === 0 ? .6 * (1 - smooth(u)) : index === 3 ? .65 * smooth(u) : 0;
    // Covers appear during assembly and in the exploded view. Remove them
    // during operation so that the balls and pumping gears remain inspectable.
    if (index === 1 || index === 2) state.vis = p => !['front-seal', 'front-cover', 'pump-case', 'pressure-plate'].includes(p.id);
    const K = validation.analysis.K;
    state.mech = { ...state.mech, ang: body => K ? (K.rates[body] || 0) * clock * .8 : 0 };
    state.focus = null; state.focusSet = null; state.focusA = 0;
    // Preserve the source's cutaway/decor opacity. Forcing alpha=1 hides pistons
    // and planetary gears inside their housing even though the model is moving.
    state.assemble = id => ({ k: 1, alpha: assembly ? assembly(id).alpha : 1 }); state.explodeK = null;
    if (g.SPEC.id === 'enigma') {
      state.vis = part => part.id !== 'wallL' && part.id !== 'wallR';
      if (index === 0) state.e = .65 * (1 - smooth(u));
    }
    if (state.mech?.enigma && state.e > .01) state.mech.enigma.pathA = 0;
    return state;
  }
  function points() {
    const result = [], p = new g.THREE.Vector3();
    F.st.scene.updateMatrixWorld(true);
    F.parts.filter(part => part.group.visible).forEach(part => part.group.traverse(mesh => {
      if (!mesh.isMesh || !mesh.visible || !mesh.geometry?.attributes.position) return;
      let parent = mesh.parent;
      while (parent && parent !== F.st.scene) { if (!parent.visible) return; parent = parent.parent; }
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (!materials.some(m => m.visible && m.opacity >= .3)) return;
      const attr = mesh.geometry.attributes.position;
      for (let i = 0; i < attr.count; i++) { p.fromBufferAttribute(attr, i).applyMatrix4(mesh.matrixWorld); result.push(p.clone()); }
    }));
    return result;
  }
  const plans = new Map();
  function viewFor(plan, u) { return { ...plan.view, yaw: plan.view.yaw + (smooth(u) - .5) * 12, pitch: plan.view.pitch + (smooth(u) - .5) * 3 }; }
  function screenBounds(vertices) {
    return vertices.reduce((box, vertex) => { const p = vertex.clone().project(F.st.camera), x = (p.x + 1) * W / 2, y = (1 - p.y) * H / 2;
      return [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)]; }, [Infinity, Infinity, -Infinity, -Infinity]);
  }
  function planChapter(index) {
    const snapshots = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8, state = stateAt(index, u); F.apply(state, false); snapshots.push({ u, state, vertices: points() }); }
    const bounds = new g.THREE.Box3(); snapshots.forEach(s => s.vertices.forEach(p => bounds.expandByPoint(p)));
    const center = bounds.getCenter(new g.THREE.Vector3()), size = bounds.getSize(new g.THREE.Vector3()), original = snapshots[4].state.view;
    const enigma = g.SPEC.id === 'enigma';
    const plan = { view: { yaw: enigma ? -32 : original.yaw, pitch: enigma ? 24 : original.pitch,
      zoom: 1100 / Math.max(size.x, size.y, size.z), tx: center.x, ty: center.y, tz: center.z, cx: 990, cy: 442 } };
    // One stable fit per chapter. Refine the perspective projection against all
    // nine poses and real mesh vertices, rather than shrinking for empty box corners.
    for (let pass = 0; pass < 4; pass++) {
      let ratio = 1;
      for (const snapshot of snapshots) {
        F.setView(viewFor(plan, snapshot.u)); const b = screenBounds(snapshot.vertices);
        ratio = Math.max(ratio, (990 - b[0]) / 540, (b[2] - 990) / 540, (442 - b[1]) / 280, (b[3] - 442) / 280);
      }
      if (pass === 0) plan.view.zoom *= 1 / ratio * .94;
      else if (ratio > 1) plan.view.zoom *= .97 / ratio;
    }
    plans.set(index, plan); return plan;
  }
  let diagnostics;
  function paint(time) {
    const t = Math.max(0, Math.min(duration - 1e-6, time)), index = Math.floor(t / slot), u = (t % slot) / slot, chapter = film.chapters[index];
    if (studio) {
      const plan = plans.get(index) || planChapter(index), state = stateAt(index, u); state.view = viewFor(plan, u);
      F.apply(state, false); F.st.render(); F.st.blit(ctx);
      const bounds = screenBounds(points());
      if (F.st.renderer.getContext().isContextLost()) throw new Error('Studio context lost');
      diagnostics = { renderer: 'original-studio-compositor', screenBounds: bounds, chapter: index,
        resources: { native: { ...F.st.renderer.info.memory } }, enigma: state.mech?.enigma?.window || null };
      const shade = ctx.createLinearGradient(0, 0, 490, 0); shade.addColorStop(0, 'rgba(3,12,22,.72)'); shade.addColorStop(1, 'rgba(3,12,22,0)');
      ctx.fillStyle = shade; ctx.fillRect(0, 145, 490, 600);
      let y = 310; y += text(chapter.title, 48, y, 31, 340, C.ink, 650, false, 3) + 22;
      text(chapter.formula, 48, y, 22, 340, C.accent, 600, true, 4);
    } else {
      pose(sourceTime(chapter, u), 1, .5); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); MX.ctx = ctx;
      const rect = { x: 48, y: 146, w: 1504, h: 590 };
      diagnostics = g.__drawStudy(ctx, rect, sourceTime(chapter, u));
      // A chapter highlight follows the real drawing without obscuring its lines.
      ctx.strokeStyle = 'rgba(100,215,255,.4)'; ctx.lineWidth = 2; ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    MX.ctx = ctx;
    text('MECHANISM  /  ' + film.engine.toUpperCase(), 48, 44, 18, 900, C.accent, 700, true);
    text(film.title, 48, 105, 42, 1460, C.ink, 700, true, 1);
    text(String(index + 1).padStart(2, '0') + ' / 04', 1410, 44, 18, 145, C.mute, 600, true); rule(48, 130, 1552, 130);
    ctx.fillStyle = 'rgba(4,17,29,.95)'; ctx.fillRect(0, 752, W, 148); rule(48, 752, 1552, 752);
    const title = studio ? film.question : chapter.title;
    text(title, 48, 791, 27, 980, C.ink, 650, false, 1);
    const sentence = chapter.text.split(/(?<=\.)\s/)[0];
    text(sentence, 48, 829, 20, 980, C.mute, 500, false, 2);
    text('AUTHORED DESIGN / ESTIMATED', 1070, 790, 18, 475, C.accent, 600, true, 2);
    text('Kinematic study / no product verification', 1070, 826, 18, 475, C.mute, 500, false, 2);
    ctx.fillStyle = C.accent; ctx.fillRect(0, H - 4, W * t / duration, 4);
    return cv;
  }
  // Retiming follows the same source clock as the visible mechanism. Short
  // boundary fades avoid discontinuities. This remains illustrative sound.
  g.__audioWav = () => {
    const raw = atob(audio()), input = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) input[i] = raw.charCodeAt(i);
    const source = new DataView(input.buffer), sr = source.getUint32(24, true), channels = source.getUint16(22, true);
    if (source.getUint16(20, true) !== 1 || source.getUint16(34, true) !== 16 || channels !== 2) throw new Error('Expected stereo PCM16 source audio');
    let data = 12;
    while (data + 8 < input.length && String.fromCharCode(...input.subarray(data, data + 4)) !== 'data') data += 8 + source.getUint32(data + 4, true);
    const start = data + 8, sourceFrames = Math.floor((input.length - start) / 4), count = sr * duration;
    const bytes = new Uint8Array(44 + count * 4), out = new DataView(bytes.buffer);
    const str = (at, s) => [...s].forEach((c, i) => out.setUint8(at + i, c.charCodeAt(0)));
    str(0, 'RIFF'); out.setUint32(4, bytes.length - 8, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true);
    out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true);
    out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, count * 4, true);
    for (let i = 0; i < count; i++) {
      const t = i / sr, chapter = Math.min(3, Math.floor(t / slot)), local = t % slot, u = local / slot;
      const position = Math.max(0, Math.min(sourceFrames - 2, sourceTime(film.chapters[chapter], u) * sr));
      const frame = Math.floor(position), fraction = position - frame, gain = Math.min(1, local / .04, (slot - local) / .04);
      for (let ch = 0; ch < 2; ch++) {
        const a = source.getInt16(start + frame * 4 + ch * 2, true), b = source.getInt16(start + (frame + 1) * 4 + ch * 2, true);
        out.setInt16(44 + i * 4 + ch * 2, Math.round((a + (b - a) * fraction) * gain), true);
      }
    }
    let result = ''; for (let i = 0; i < bytes.length; i += 32768) result += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(result);
  };
  g.__paint = paint;
  g.__frame = (t, n, shutter, format) => { paint(t); return cv.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', .98); };
  g.__frameInfo = { width: W, height: H, fps: Number(query.get('fps') || 30) };
  g.__specInfo = () => ({ ...info, duration, evidence: verdict, engine: 'production/' + film.engine,
    shots: film.chapters.map((c, i) => ({ label: c.title, t: i * slot + 4 })), audio: 'Original illustrative soundtrack; editorial timing is not physical evidence' });
  g.__studyDiagnostics = () => ({ ...diagnostics, production: true });
  paint(4);
})(window);
