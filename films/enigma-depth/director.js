/* A separate visual proposal. Uses the original Studio compositor and geometry.
 * No shared engine, published page, source spec or accepted audit is changed. */
(function (g) {
  'use strict';
  const MX = g.MX, W = 1600, H = 900, duration = 12;
  let F;
  const factory = MX.figure;
  MX.figure = cfg => (F = factory({ ...cfg, w: W, h: H, stage: { ...cfg.stage, ssr: true, renderScale: 1 } }));
  try { MX.spec.run(g.SPEC); } finally { MX.figure = factory; }
  const pose = g.__pose, nativeInfo = g.__specInfo(), cv = document.getElementById('c');
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { value = clamp(value); return value * value * (3 - 2 * value); };
  const modeTime = id => nativeInfo.shots.find(shot => shot.label === 'mode ' + id).t;
  const ink = '#e3eff9', accent = '#64d7ff', mute = '#9db6cb', amber = '#ffd166';
  const label = (str, x, y, size, color = ink, weight = 500, mono = false) => {
    ctx.font = weight + ' ' + size + 'px ' + (mono ? MX.MONO : MX.SANS);
    ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(str, x, y);
  };
  const rule = (x0, y0, x1, y1, color = '#41617b') => {
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  };
  const caption = (id, title, sub, x, y) => {
    const a = F.anchor(id), point = F.P(...a);
    rule(x + 12, y + 14, point[0], point[1], '#6b9fbe');
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(point[0], point[1], 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(5,18,30,.88)'; ctx.fillRect(x, y - 34, 318, 85);
    label(title, x + 14, y - 3, 25, ink, 650); label(sub, x + 14, y + 29, 19, mute);
  };
  let diagnostics;
  function paint(time) {
    const t = Math.max(0, Math.min(duration - 1e-6, time)), chapter = Math.floor(t / 4), u = (t % 4) / 4;
    let state;
    if (chapter === 0) {
      state = pose(modeTime('t1') - 2.1 + u * 3.2);
      state.e = 0;
      state.view = { yaw: -39 + 14 * smooth(u), pitch: 24 + 5 * smooth(u), zoom: 4.7, cx: 910, cy: 435 };
    } else if (chapter === 1) {
      state = pose(modeTime('t1'));
      state.e = .65 * smooth(u * 2);
      state.mech.enigma.pathA = 0;
      state.view = { yaw: -28 - 16 * smooth(u), pitch: 29 + 8 * smooth(u), zoom: 4.1, cx: 900, cy: 425 };
    } else {
      state = pose(modeTime('ds') - 1.8 + u * 3.1);
      state.e = 0;
      state.view = { yaw: -38 + 12 * smooth(u), pitch: 19, zoom: 4.8, cx: 895, cy: 430 };
    }
    // Geometry, rotor states and the active circuit still come from the original
    // evidence-backed mechanism; the camera and callouts are the new direction.
    state.focus = null; state.focusSet = null; state.focusA = 0; state.assemble = null; state.explodeK = null;
    state.vis = p => p.id !== 'wallL' && p.id !== 'wallR';
    F.apply(state, false); F.st.render(); F.st.blit(ctx);
    const shade = ctx.createLinearGradient(0, 0, 490, 0); shade.addColorStop(0, 'rgba(3,12,22,.66)'); shade.addColorStop(1, 'rgba(3,12,22,0)');
    ctx.fillStyle = shade; ctx.fillRect(0, 115, 490, 635);
    label('MECHANISM  /  STUDIO', 48, 49, 19, accent, 700, true);
    label('ENIGMA I', 48, 108, 51, ink, 700, true);
    label(['01  /  FOLLOW THE SIGNAL', '02  /  SEPARATE THE STACK', '03  /  WATCH THE DOUBLE STEP'][chapter], 850, 50, 19, accent, 650, true);
    rule(48, 130, 1552, 130);
    if (chapter === 0) caption('rotorM', 'Three wired rotors', 'One changing electrical path', 62, 315);
    else if (chapter === 1) caption('ukw', 'Reflector B', 'The circuit returns through the rotors', 62, 315);
    else caption('rotorM', 'Middle rotor / II', 'Two steps on consecutive keypresses', 62, 315);
    ctx.fillStyle = 'rgba(4,17,29,.92)'; ctx.fillRect(0, 755, W, 145); rule(48, 755, 1552, 755);
    const enigma = state.mech.enigma;
    label(chapter === 1 ? 'EXPLODED CONSTRUCTION' : 'ROTOR WINDOWS', 48, 791, 16, mute, 650, true);
    if (chapter === 1) {
      label('Entry wheel → III → II → I → reflector', 48, 836, 26, ink, 600);
    } else {
      [...enigma.window].forEach((letter, i) => {
        ctx.fillStyle = 'rgba(76,145,185,.12)'; ctx.fillRect(48 + i * 57, 802, 46, 47);
        label(letter, 59 + i * 57, 836, 31, ink, 650, true);
      });
      label('IN  ' + (enigma.typed || '—'), 286, 835, 29, accent, 650, true);
      label('OUT  ' + (enigma.out || '—'), 610, 835, 29, amber, 650, true);
    }
    label('CONSISTENT / published wiring and tests', 1055, 791, 17, mute, 500);
    label('Housing dimensions remain estimated.', 1055, 823, 17, mute, 500);
    label('VISUAL PROPOSAL · 3D GEOMETRY · NOT FINAL', 48, 882, 14, mute, 500, true);
    ctx.fillStyle = accent; ctx.fillRect(0, H - 3, W * t / duration, 3);
    if (F.st.renderer.getContext().isContextLost()) throw new Error('Studio context lost');
    // Check real mesh vertices, not box corners around circular rotors: those
    // corners enclose empty space far beyond the visible circular silhouette.
    const projected = [], point = new g.THREE.Vector3();
    F.parts.filter(p => p.group.visible).forEach(p => p.group.traverse(mesh => {
      if (!mesh.isMesh || !mesh.visible || !mesh.geometry?.attributes.position) return;
      let parent = mesh.parent;
      while (parent && parent !== F.st.scene) { if (!parent.visible) return; parent = parent.parent; }
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(F.st.camera);
        projected.push([point.x, point.y]);
      }
    }));
    diagnostics = { t, chapter, window: enigma.window, textures: F.st.renderer.info.memory.textures,
      screenBounds: projected.reduce((box, p) => [Math.min(box[0], (p[0] + 1) * W / 2), Math.min(box[1], (1 - p[1]) * H / 2),
        Math.max(box[2], (p[0] + 1) * W / 2), Math.max(box[3], (1 - p[1]) * H / 2)], [Infinity, Infinity, -Infinity, -Infinity]),
      renderer: 'original-studio-compositor', threeDimensional: true, evidence: nativeInfo.evidence || 'CONSISTENT' };
  }
  // The visual pilot is silent. Sound design is deferred until its look is accepted.
  g.__audioWav = () => {
    const count = 48000 * duration, buffer = new ArrayBuffer(44 + count * 4), view = new DataView(buffer);
    const str = (at, s) => [...s].forEach((char, i) => view.setUint8(at + i, char.charCodeAt(0)));
    str(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); str(8, 'WAVEfmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
    view.setUint32(24, 48000, true); view.setUint32(28, 192000, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true);
    str(36, 'data'); view.setUint32(40, count * 4, true);
    const bytes = new Uint8Array(buffer); let raw = '';
    for (let i = 0; i < bytes.length; i += 32768) raw += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(raw);
  };
  g.__paint = paint;
  g.__frame = (t, n, shutter, format) => { paint(t); return cv.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', .98); };
  g.__frameInfo = { width: W, height: H, fps: Number(new URLSearchParams(location.search).get('fps') || 30) };
  g.__specInfo = () => ({ ...nativeInfo, duration, engine: 'studio-depth-proposal', audio: 'Silent visual pilot',
    shots: [{ label: 'signal', t: 2 }, { label: 'exploded stack', t: 6 }, { label: 'double step', t: 10 }] });
  g.__depthDiagnostics = () => diagnostics;
  paint(2);
})(window);
