/* Presentation methods and backgrounds. Script-tag module; no DOM required by
 * the planner. Existing films opt in with ?method=... or spec.presentation. */
(function (g) {
  'use strict';
  const MX = g.MX = g.MX || {}, P = MX.presentation = {};
  P.methods = ['studio', 'workflow', 'paper'];
  P.backgrounds = {
    graphite: { dark: true, paper: '#14191f', plate: '#202832', plateEdge: '#3d4b59', ink: '#f1f5f8', mute: '#a7b6c4', teal: '#6dd9da', line: 'rgba(171,197,214,.22)', gl: { inner: '#303d49', outer: '#10151c', floorK: 2, floor: '#000000', bloom: 0.025 } },
    blueprint: { dark: true, paper: '#0c2035', plate: '#142f49', plateEdge: '#315774', ink: '#edf6ff', mute: '#a2bfd5', teal: '#68d9ff', line: 'rgba(137,191,231,.25)', gl: { inner: '#204665', outer: '#09192b', floorK: 2, floor: '#000000', bloom: 0.025, grid: { px: 60, every: 5, minor: 'rgba(150,200,240,.045)', major: 'rgba(150,200,240,.1)' } } },
    porcelain: { dark: false, paper: '#f2f5f7', plate: '#ffffff', plateEdge: '#c9d3dc', ink: '#172b3b', mute: '#526777', teal: '#007c86', line: 'rgba(29,63,85,.2)', gl: { inner: '#ffffff', outer: '#dce5ec', floorK: 0.8, floor: '#314654', bloom: 0.02 } },
    ivory: { dark: false, paper: '#f5f1e7', plate: '#fffdf6', plateEdge: '#d6d0bf', ink: '#292e30', mute: '#64685f', teal: '#176e78', line: 'rgba(51,62,62,.2)', gl: { inner: '#fffcf3', outer: '#e6e0d1', floorK: 0.7, floor: '#504534', bloom: 0.02 } },
  };
  P.resolve = (query, spec = {}) => {
    const data = spec.presentation || {}, method = query.get('method') || data.method || 'studio';
    const background = query.get('background') || data.background || (method === 'paper' ? 'ivory' : method === 'workflow' ? 'blueprint' : 'porcelain');
    if (!P.methods.includes(method)) throw new Error('Unknown presentation method: ' + method);
    if (!Object.hasOwn(P.backgrounds, background)) throw new Error('Unknown presentation background: ' + background);
    return { method, background, enabled: query.has('method') || query.has('background') || !!spec.presentation };
  };
  P.apply = (config) => {
    const base = MX.styles.paper, bg = P.backgrounds[config.background];
    Object.keys(MX.THEME).forEach(key => delete MX.THEME[key]);
    Object.assign(MX.THEME, base, bg, { name: config.background, card: 'studio', titleFont: 'sans', gl: Object.assign({}, bg.gl) });
    MX.INK = MX.THEME.ink; MX.SERIF = MX.SANS; MX.MONO = MX.SANS;
  };
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  // Long identifiers are split too, rather than shrinking an entire paragraph.
  P.wrap = (text, width, measure) => {
    const lines = []; let line = '';
    for (const word of String(text || '').split(/\s+/).filter(Boolean)) {
      if (line && measure(line + ' ' + word) > width) { lines.push(line); line = ''; }
      if (line) line += ' ';
      for (const ch of word) {
        if (line && measure(line + ch) > width) { lines.push(line); line = ''; }
        line += ch;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  P.plan = (spec, method, length = 'short', modeIndices = null) => {
    const m = spec.mechanism || {}, duration = length === 'extended' ? 90 : length === 'normal' ? 60 : 30;
    let items;
    if (method === 'workflow') {
      const steps = m.steps;
      if (steps && Number.isInteger(steps.count) && steps.count > 0) {
        items = Array.from({ length: steps.count }, (_, index) => Object.assign({ index }, steps.label(index)));
      } else items = ((m.drive || {}).modes || []).map((mode, index) => ({ index, title: mode.label || mode.id, formula: mode.formula || '', value: '', mode: index }))
        .filter(item => modeIndices == null || modeIndices.includes(item.mode));
    } else {
      const byId = Object.fromEntries((spec.parts || []).map(p => [p.id, p]));
      const ids = (spec.director || {}).tour || (spec.parts || []).filter(p => !p.decor && p.tour !== false).map(p => p.id);
      items = ids.slice(0, length === 'short' ? 4 : 8).map((id, index) => {
        const p = byId[id]; if (!p) throw new Error('Unknown presentation part: ' + id);
        return { index, id, title: (p.info || {}).title || p.name || id, formula: ((p.info || {}).lines || []).join('. '), conf: p.conf };
      });
    }
    if (!items.length) throw new Error(method + ' needs ' + (method === 'workflow' ? 'mechanism steps or drive modes' : 'a tour or non-decorative parts'));
    const begin = 3, end = duration - 6, slot = (end - begin) / items.length;
    return { method, duration, items, begin, end, slot };
  };
  P.at = (plan, time) => {
    const t = clamp(time, 0, plan.duration), index = clamp(Math.floor((t - plan.begin) / plan.slot), 0, plan.items.length - 1);
    return { t, index, item: plan.items[index], progress: clamp((t - plan.begin - index * plan.slot) / plan.slot), intro: t < plan.begin, closing: t >= plan.end };
  };

  function text(c, str, x, y, size, width, color, weight = 500) {
    c.font = weight + ' ' + size + 'px ' + MX.SANS; c.fillStyle = color; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const lines = P.wrap(str, width, s => c.measureText(s).width);
    lines.forEach((s, i) => c.fillText(s, x, y + i * size * 1.25));
    return lines.length * size * 1.25;
  }
  function box(c, x, y, w, h, fill, stroke, radius = 16) {
    c.beginPath(); c.roundRect(x, y, w, h, radius); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke(); }
  }
  function line(c, a, b, color, width = 2, progress = 1) {
    c.beginPath(); c.moveTo(...a); c.lineTo(a[0] + (b[0] - a[0]) * progress, a[1] + (b[1] - a[1]) * progress); c.strokeStyle = color; c.lineWidth = width; c.stroke();
  }
  // Cache actual model edges, not a decorative bounding box. Project them after
  // the figure's pose is applied, so a moving part and its drawing stay attached.
  function silhouetteEdges(geometry) {
    const pos = geometry.attributes.position, idx = geometry.index, count = idx ? idx.count : pos.count, edges = new Map(), TH = g.THREE;
    for (let i = 0; i < count; i += 3) {
      const v = [0, 1, 2].map(j => new TH.Vector3().fromBufferAttribute(pos, idx ? idx.getX(i + j) : i + j));
      const normal = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize().toArray();
      const keys = v.map(p => p.toArray().map(n => Math.round(n * 1e5)).join(','));
      for (let j = 0; j < 3; j++) {
        const next = (j + 1) % 3, key = [keys[j], keys[next]].sort().join('/');
        if (!edges.has(key)) edges.set(key, { points: [...v[j].toArray(), ...v[next].toArray()], normals: [] });
        edges.get(key).normals.push(normal);
      }
    }
    return Array.from(edges.values());
  }
  function edgeCache(parts) {
    const TH = g.THREE;
    return parts.map(part => {
      const meshes = []; part.group.traverse(mesh => {
        if (!mesh.isMesh || !mesh.geometry || mesh.userData.presentationEdge) return;
        const geo = new TH.EdgesGeometry(mesh.geometry, 35), pos = geo.attributes.position;
        meshes.push({ mesh, points: pos.array.slice(), silhouette: silhouetteEdges(mesh.geometry) }); geo.dispose();
      }); return { part, meshes };
    });
  }
  function drawEdges(c, cache, camera, W, H, fraction, color, weight = 1.25) {
    const TH = g.THREE, v = new TH.Vector3();
    for (const { part, meshes } of cache) {
      if (!part.group.visible) continue;
      c.beginPath(); c.setLineDash(part.spec.conf === 'estimated' ? [5, 4] : []);
      for (const { mesh, points, silhouette } of meshes) {
        const eye = camera.position.clone().applyMatrix4(mesh.matrixWorld.clone().invert());
        const outline = silhouette.filter(e => {
          const faces = e.normals.map(n => n[0] * (eye.x - e.points[0]) + n[1] * (eye.y - e.points[1]) + n[2] * (eye.z - e.points[2]) > 0);
          return faces.length === 1 || faces.some(f => f !== faces[0]);
        }).flatMap(e => e.points);
        const vertices = [...points, ...outline], limit = Math.floor(vertices.length / 6 * fraction) * 6;
        for (let i = 0; i < limit; i += 6) {
          const ends = [];
          for (let j = 0; j < 6; j += 3) { v.set(vertices[i + j], vertices[i + j + 1], vertices[i + j + 2]).applyMatrix4(mesh.matrixWorld).project(camera); ends.push([(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H, v.z]); }
          if (ends.some(p => p[2] > 1 || p[2] < -1)) continue;
          c.moveTo(ends[0][0], ends[0][1]); c.lineTo(ends[1][0], ends[1][1]);
        }
      }
      c.strokeStyle = part.spec.conf === 'estimated' ? MX.rgba(MX.THEME.ember, .55) : color; c.lineWidth = weight; c.stroke();
    }
    c.setLineDash([]);
  }
  P.run = ({ config, spec, F, W, H, length, validation, analysis, views, script, modeStart, modeEnd, workflowTime, modeIndices }) => {
    const plan = P.plan(spec, config.method, length, modeIndices), T = MX.THEME, st = F.st;
    const edges = config.method === 'paper' ? edgeCache(F.parts) : null;
    const title = config.method === 'paper' ? 'ASSEMBLY STUDY' : 'PROCESS ENGINEERING';
    const sources = ((spec.research || {}).sources || []), claimed = ((spec.research || {}).claims || []);
    const paperTop = H * (H < 1600 ? .60 : .66);
    const view = Object.assign({}, views.iso, { cx: W / 2, cy: config.method === 'paper' ? (265 + paperTop - 70) / 2 : H * .345, zoom: views.iso.zoom * .8, dof: 0 });
    if (config.method === 'paper') {
      F.apply({ t: 0, e: .65, mech: script(modeStart).mech, view }, false); st.scene.updateMatrixWorld(true);
      const TH = g.THREE, bounds = new TH.Box3(); F.parts.forEach(p => bounds.expandByObject(p.group));
      const center = bounds.getCenter(new TH.Vector3());
      view.tx = center.x; view.ty = center.y; view.tz = center.z; F.setView(view);
      const points = [];
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const v = new TH.Vector3(x, y, z).project(st.camera); points.push([(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]);
      }
      const xs = points.map(p => p[0]), ys = points.map(p => p[1]), left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
      const k = Math.min(1, (W - 160) / (right - left), (paperTop - 265 - 120) / (bottom - top));
      view.zoom *= k;
    }
    const inspect = (t) => P.at(plan, t);
    const draw = (c, t) => {
      const a = inspect(t), closing = smooth((t - plan.end) / 1.2), item = a.item;
      const sourceTime = config.method === 'workflow' ? workflowTime(a) : modeStart + clamp((t - plan.begin) / (plan.end - plan.begin)) * (modeEnd - modeStart - .05);
      const original = script(sourceTime), v = Object.assign({}, view, { yaw: view.yaw + (config.method === 'paper' ? 0 : 5 * Math.sin(t * .15)) });
      const state = Object.assign({}, original, { t, view: v, focus: null, focusSet: null, focusA: 0, assemble: null, explodeK: null, e: 0 });
      if (config.method === 'paper') {
        state.e = smooth((t - 2) / 3) * (1 - closing) * .65;
        state.focus = a.intro || a.closing ? null : item.id; state.focusA = state.focus ? .65 : 0; state.dimTo = .5;
        state.mech = script(modeStart).mech;
        state.assemble = id => ({ k: 1, alpha: F.byId[id].spec.cutaway && id !== item.id ? .12 : 1 });
      }
      F.apply(state); st.scene.updateMatrixWorld(true);
      c.save(); c.fillStyle = T.paper; c.fillRect(0, 0, W, H);
      if (config.method === 'paper') {
        c.strokeStyle = MX.rgba(T.ink, .045); c.lineWidth = 1;
        for (let x = 60; x < W; x += 60) line(c, [x, 260], [x, H - 370], c.strokeStyle, 1);
        c.globalAlpha = smooth((t - 1.2) / 2); st.blit(c); c.globalAlpha = 1;
        drawEdges(c, a.intro || a.closing ? edges : edges.filter(e => e.part.id === item.id), st.camera, W, H, a.intro ? smooth(t / 2) : smooth(a.progress * 4), MX.rgba(T.ink, .45));
      } else st.blit(c);
      // All typography is composed after the 3D scene, at delivery resolution.
      c.fillStyle = MX.rgba(T.paper, .97); c.fillRect(0, 0, W, 265);
      text(c, config.method.toUpperCase() + '  /  ' + title, 72, 85, 20, W - 144, T.teal, 700);
      text(c, spec.title, 72, 155, 48, W - 144, T.ink, 700);
      line(c, [72, 245], [W - 72, 245], T.line);
      if (!a.closing) {
        if (config.method === 'workflow') drawWorkflow(c, a, plan, W, H, T);
        else drawPaper(c, a, plan, F, W, H, T, edges);
      }
      if (a.closing) {
        box(c, 60, H * .52, W - 120, H * .48 - 80, T.paper, T.plateEdge);
        let y = H * .52 + 58;
        y += text(c, 'THE RESULT', 90, y, 20, W - 180, T.teal, 700) + 24;
        y += text(c, validation.verdict?.state || 'NOTHING CHECKED', 90, y, 42, W - 180, T.ink, 700) + 18;
        const checks = analysis.modes.filter(m => m.publish && m.ok === true).length;
        y += text(c, checks + ' published comparisons reproduced', 90, y, 28, W - 180, T.ink) + 18;
        const estimated = claimed.filter(c => c.conf === 'estimated').length;
        y += text(c, estimated + ' estimated claims; see the spec for limits.', 90, y, 24, W - 180, T.mute) + 18;
        const source = sources[0]; if (source) text(c, 'SOURCE  ' + source.title, 90, y, 22, W - 180, T.mute);
      }
      text(c, (spec.fig || spec.id) + '  /  ' + config.background.toUpperCase(), 72, H - 42, 17, W - 144, T.mute);
      c.restore(); MX.A = 1;
    };
    const info = g.__specInfo;
    g.__specInfo = () => Object.assign({}, info(), { duration: plan.duration, method: config.method, background: config.background,
      panels: [{ kind: 'verdict', from: plan.end, to: plan.duration }], phases: { assembled: 2, modes: plan.begin, panels: plan.end },
      shots: plan.items.map((item, i) => ({ label: item.title, t: plan.begin + (i + .6) * plan.slot })) });
    g.__presentationAt = (t) => { const a = inspect(t); return Object.assign({}, a, { sourceTime: config.method === 'workflow' ? workflowTime(a) : modeStart }); };
    const geom = g.__geom;
    g.__geom = t => { const a = inspect(t); return Object.assign({}, geom(t), { focus: config.method === 'paper' && !a.intro && !a.closing ? a.item.id : null }); };
    const audio = () => MX.sound.render({ duration: plan.duration, seed: 81, events: plan.items.map((_, i) => ({ t: plan.begin + i * plan.slot, v: 'click', f: 1100, gain: .2, sharp: .5 })), bed: { bpm: 88, root: 48, mode: 'dorian', level: .3, prog: [0, 5, 3, 4], curve: [[0, .2], [plan.begin, .35], [plan.end, .2], [plan.duration, 0]] }, room: { size: 1, wet: .15, fb: .7 }, tone: .002 });
    MX.run({ w: W, h: H, fps: 30, duration: plan.duration, draw, audio, poster: 9, blurAt: () => 1 });
    return plan;
  };
  function drawWorkflow(c, a, plan, W, H, T) {
    const cols = 3, rows = H < 1600 ? 1 : 2, capacity = cols * rows, gap = 20, x0 = 72, y0 = H * .51, cw = (W - 144 - gap * 2) / 3, ch = 115;
    const start = Math.floor(a.index / capacity) * capacity, visible = plan.items.slice(start, start + capacity);
    visible.forEach((item, j) => {
      const x = x0 + (j % cols) * (cw + gap), y = y0 + Math.floor(j / cols) * (ch + 28), index = start + j;
      if (j % cols < 2 && j < visible.length - 1) {
        line(c, [x + cw, y + ch / 2], [x + cw + gap, y + ch / 2], T.teal, 3);
        const travel = (a.t * .6) % 1;
        c.beginPath(); c.arc(x + cw + gap * travel, y + ch / 2, 4, 0, Math.PI * 2); c.fillStyle = T.teal; c.fill();
      } else if (j === 2 && visible.length > 3) {
        const yy = y + ch + 14; line(c, [x + cw / 2, y + ch], [x + cw / 2, yy], T.teal);
        line(c, [x + cw / 2, yy], [x0 + cw / 2, yy], T.teal); line(c, [x0 + cw / 2, yy], [x0 + cw / 2, yy + 14], T.teal);
      }
      box(c, x, y, cw, ch, T.plate, index === a.index ? T.teal : T.plateEdge);
      text(c, String(index + 1).padStart(2, '0') + (index < a.index ? '  /  PREVIOUS' : index === a.index ? '  /  ACTIVE' : '  /  NEXT'), x + 18, y + 28, 14, cw - 36, index === a.index ? T.teal : T.mute, 700);
      text(c, item.title, x + 18, y + 59, 19, cw - 36, T.ink, 600);
      if (index === a.index) { c.fillStyle = T.teal; c.fillRect(x + 16, y + ch - 8, (cw - 32) * a.progress, 3); }
    });
    const top = y0 + rows * (ch + 28) + 16;
    box(c, 60, top - 24, W - 120, H - top - 64, T.paper, T.plateEdge);
    let y = top + 16;
    y += text(c, a.intro ? 'FOLLOW THE PROCESS' : 'STEP ' + (a.index + 1) + ' OF ' + plan.items.length, 90, y, 18, W - 180, T.teal, 700) + 20;
    y += text(c, a.item.title, 90, y, 34, W - 180, T.ink, 700) + 14;
    y += text(c, a.item.formula || '', 90, y, 26, W - 180, T.mute) + 18;
    text(c, a.item.value || '', 90, y, 30, W - 180, T.teal, 700);
  }
  function drawPaper(c, a, plan, F, W, H, T, edges) {
    const p = F.byId[a.item.id], anchor = F.P(...F.anchor(p.id)), top = H * (H < 1600 ? .60 : .66);
    const to = [W - 100, top - 48];
    if (!a.intro && !a.closing) {
      line(c, anchor, to, T.teal, 1.5, smooth(a.progress * 4));
      c.beginPath(); c.arc(anchor[0], anchor[1], 5, 0, Math.PI * 2); c.fillStyle = T.teal; c.fill();
      text(c, String(a.index + 1).padStart(2, '0'), W - 140, top - 65, 32, 90, T.teal, 700);
    }
    box(c, 60, top, W - 120, H - top - 80, T.paper, T.plateEdge, 3);
    let y = top + 45;
    y += text(c, 'DETAIL ' + (a.index + 1) + ' / ' + plan.items.length + '  •  ' + String(a.item.conf || '').toUpperCase(), 90, y, 20, W - 180, T.teal, 700) + 20;
    y += text(c, a.item.title, 90, y, H < 1200 ? 32 : 40, W - 180, T.ink, 600) + 16;
    const details = p.info || {};
    y += text(c, a.item.formula || 'See the model and evidence for this part.', 90, y, H < 1200 ? 23 : 27, W - 180, T.mute) + 16;
    const size = details.sizeEvidence;
    y += text(c, size?.label || 'DRAWN SIZE: see spec comparisons', 90, y, 20, W - 180, T.teal, 600) + 26;
    // A magnified vector detail remains useful when the selected part is tiny
    // in the assembly. Its geometry comes from that exact part's mesh.
    const detail = edges.filter(e => e.part === p), points = [], TH = g.THREE;
    for (const entry of detail) for (const { mesh, points: vertices } of entry.meshes) {
      for (let i = 0; i < vertices.length; i += 3) {
        const v = new TH.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]).applyMatrix4(mesh.matrixWorld).project(F.st.camera);
        points.push([(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]);
      }
    }
    const room = H - 165 - y;
    if (points.length && room > 100) {
      const xs = points.map(p => p[0]), ys = points.map(p => p[1]), l = Math.min(...xs), r = Math.max(...xs), t = Math.min(...ys), b = Math.max(...ys);
      const k = Math.min((W - 280) / Math.max(1, r - l), (room - 45) / Math.max(1, b - t));
      text(c, 'PROJECTED DETAIL / NOT TO SCALE', 90, y, 15, W - 180, T.mute, 600);
      c.save(); c.translate(W / 2, y + 35 + (room - 45) / 2); c.scale(k, k); c.translate(-(l + r) / 2, -(t + b) / 2);
      drawEdges(c, detail, F.st.camera, W, H, smooth(a.progress * 3), T.ink, 1.5 / k); c.restore();
      const params = Object.entries(p.spec.params || {}).filter(([, v]) => v.conf !== 'estimated' && v.value != null);
      if (params.length) {
        const [key, value] = params[0]; text(c, key.toUpperCase() + '  ' + value.value + ' ' + (value.unit || '') + '  /  ' + value.conf.toUpperCase(), 90, H - 115, 22, W - 180, T.teal, 600);
      }
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
